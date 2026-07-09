/**
 * CombatMovementSystem -- click-to-move sobre el grid tactico con redireccion.
 *
 * Flujo click NORMAL (sin caminata activa):
 *   1. Valida destino (no ocupado, hay camino, dentro del presupuesto restante).
 *   2. Actualiza ocupacion (release origen, occupy destino).
 *   3. Oculta resaltado, muestra MovementBar.
 *   4. Inicia CombatWalker con onComplete: decrementar PM, mostrar highlight restante.
 *
 * Flujo click REDIRECCION (caminata activa):
 *   1. Calcula PM restantes = _movPointsRemaining - walker.elapsedCost.
 *   2. A* desde la celda logica actual hasta el nuevo destino.
 *   3. Trunca el path al presupuesto disponible (va lo maximo posible).
 *   4. Actualiza ocupacion: release destino antiguo, occupy nuevo endpoint.
 *   5. Llama a walker.redirectTo(truncatedPath): caminata continua sin corte.
 *
 * Tracking de PM a lo largo del turno:
 *   _movPointsTotal    = MP del jugador al inicio del turno.
 *   _movPointsRemaining= MP restantes. Decrementado en dos momentos:
 *     a) Al redirigir: -= walker.elapsedCost (coste gastado en el path anterior).
 *     b) Al completar: -= _currentWalkCost (coste del path completado).
 *   _currentWalkCost   = coste del path activo (actualizado en cada walk/redirect).
 *
 * MovementBar se actualiza cada frame via onBeforeRenderObservable:
 *   remaining = _movPointsRemaining - walker.elapsedCost
 *
 * Recarga de PM: SOLO al llamar reloadMovement() (boton DEV / inicio de turno).
 * NUNCA se recarga automaticamente al terminar de moverse.
 */

import { PointerEventTypes } from '@babylonjs/core';
import type { Scene, Observer, PointerInfo } from '@babylonjs/core';

import type { CombatGrid }          from '@/game/world/CombatGrid';
import type { CombatEntity }        from '@/game/combat/CombatEntity';
import type { GridCell }            from '@/game/combat/CombatPathfinder';
import type { PlayerSnapshot }      from '@/types/game.types';
import { CombatPathfinder }         from '@/game/combat/CombatPathfinder';
import { CombatReachableHighlight } from '@/game/combat/CombatReachableHighlight';
import { CombatWalker }             from '@/game/combat/CombatWalker';
import { MovementBar }              from '@/ui/MovementBar';
import { eventBus }                 from '@/core/EventBus';
import { logger }                   from '@/core/Logger';

export class CombatMovementSystem {

  private readonly _scene:        Scene;
  private readonly _grid:         CombatGrid;
  private readonly _playerEntity: CombatEntity;
  private readonly _playerId:     string;
  private readonly _highlight:    CombatReachableHighlight;
  private readonly _walker:       CombatWalker;

  // Tracking de puntos de movimiento del turno
  private _movPointsTotal:     number = 0;
  private _movPointsRemaining: number = 0;
  private _currentWalkCost:    number = 0;

  // Destino actualmente reservado en el occupancy map
  private _reservedDest: { x: number; z: number } | null = null;

  // MovementBar UI
  private _movBar:      MovementBar | null    = null;
  private _barObserver: Observer<Scene> | null = null;

  private _isActive         = false;
  private _playerTurnActive = true;   // false durante el turno del enemigo
  /**
   * Si true, los clicks del jugador son ignorados aunque sea su turno.
   * Puesto a true por CombatAttackSystem mientras el jugador selecciona objetivo
   * o durante la animación de ataque (swing).
   */
  private _inputBlocked = false;

  private _pointerObserver: Observer<PointerInfo> | null = null;
  private _statsHandler: ((snapshot: PlayerSnapshot) => void) | null = null;

  /**
   * Callbacks opcionales para un movimiento programático iniciado con walkWithCallback().
   * _pendingArrivalCb:   se invoca cuando la caminata llega al destino sin interrupción.
   * _pendingInterruptCb: se invoca si el jugador redirige la caminata a otro destino.
   * Ambos se limpian tras dispararse.
   */
  private _pendingArrivalCb:   (() => void) | null = null;
  private _pendingInterruptCb: (() => void) | null = null;

  /**
   * Tweak 4: última celda en la que se recalculó el highlight durante la caminata.
   * null = forzar recálculo en el próximo frame.
   */
  private _lastHighlightCell: { x: number; z: number } | null = null;

  /**
   * Tweak 5: contenedor DOM (dentro de .cab-recursos) donde se monta MovementBar.
   * null = comportamiento anterior (se monta en document.body).
   * Debe establecerse antes de llamar a activate().
   */
  private _resourceContainer: HTMLElement | null = null;

  /**
   * @param scene        Escena Babylon activa.
   * @param grid         Grid de combate.
   * @param playerEntity Ficha del jugador.
   * @param playerId     ID en el OccupancyMap (ej. 'player').
   */
  constructor(
    scene:        Scene,
    grid:         CombatGrid,
    playerEntity: CombatEntity,
    playerId:     string,
  ) {
    this._scene        = scene;
    this._grid         = grid;
    this._playerEntity = playerEntity;
    this._playerId     = playerId;
    this._highlight    = new CombatReachableHighlight(scene, grid, playerId);
    this._walker       = new CombatWalker(scene);
  }

  // -- API publica --------------------------------------------------------------

  /** PM que le quedan al jugador en este turno (lectura externa para CombatAttackSystem). */
  get movPointsRemaining(): number { return this._movPointsRemaining; }

  /**
   * Bloquea o desbloquea el procesamiento de clicks de movimiento sin desactivar el sistema.
   * Llamado por CombatAttackSystem:
   *   - true  → mientras el jugador selecciona objetivo o durante el swing de ataque.
   *   - false → al cancelar selección o cuando el swing termina.
   */
  blockInputClicks(v: boolean): void {
    this._inputBlocked = v;
  }

  /**
   * Tweak 5: establece el contenedor DOM donde se montará MovementBar.
   * Debe llamarse antes de activate().
   * Si no se llama, MovementBar se monta en document.body (comportamiento anterior).
   */
  setResourceContainer(el: HTMLElement): void {
    this._resourceContainer = el;
  }

  /**
   * Inicia un movimiento programático hacia (destX, destZ) con callbacks de llegada/interrupción.
   *
   * A diferencia del click normal, NO trunca el camino: si el coste total no cabe en los
   * PM restantes, devuelve false sin moverse (el llamador decide qué hacer).
   *
   * @param onArrival     Llamado cuando el walker llega al destino sin interrupción.
   * @param onInterrupted Llamado si el jugador redirige el walker antes de llegar (ataque cancelado).
   * @returns true si la caminata fue iniciada; false si el destino no es alcanzable con PM actuales.
   */
  walkWithCallback(
    destX:         number,
    destZ:         number,
    onArrival:     () => void,
    onInterrupted: () => void,
  ): boolean {
    if (!this._isActive || !this._playerTurnActive) { return false; }
    if (this._walker.isWalking)                     { return false; }
    if (this._movPointsRemaining < 0.001)           { return false; }

    const dest     = { x: destX, z: destZ };
    const occupant = this._grid.occupantAt(dest.x, dest.z);
    if (occupant !== null && occupant !== this._playerId) { return false; }

    const start  = { x: this._playerEntity.cellX, z: this._playerEntity.cellZ };
    const result = CombatPathfinder.findPath(start, dest, this._grid, this._playerId);
    if (result === null) { return false; }

    // No truncar: el camino completo debe caber en los PM restantes
    if (result.cost > this._movPointsRemaining + 0.0001) { return false; }

    const path = result.path;
    if (path.length < 2) { return false; }

    const actualDest = path[path.length - 1];
    if (actualDest === undefined) { return false; }

    // Registrar callbacks ANTES de iniciar (se leen en _onWalkComplete / _handleRedirect)
    this._pendingArrivalCb   = onArrival;
    this._pendingInterruptCb = onInterrupted;

    this._currentWalkCost = result.cost;

    // Actualizar ocupación al destino
    this._grid.release(this._playerId);
    this._grid.occupy(
      this._playerId,
      actualDest.x,
      actualDest.z,
      this._playerEntity.footprintW,
      this._playerEntity.footprintH,
    );
    this._reservedDest = { x: actualDest.x, z: actualDest.z };

    // Tweak 4: no ocultar; el highlight se actualiza en _updateBar()
    this._lastHighlightCell = null;  // forzar recálculo inmediato

    logger.info('CombatMovementSystem: walkWithCallback iniciado', {
      from: start, to: actualDest, cost: result.cost,
    });

    this._walker.startWalk(path, this._playerEntity, this._grid, () => { this._onWalkComplete(); });
    return true;
  }

  /**
   * Activa el sistema: muestra highlight + barra, registra clicks, suscribe stats.
   * Equivale al inicio del primer turno del jugador.
   * Idempotente.
   */
  activate(): void {
    if (this._isActive) { return; }
    this._isActive = true;

    // Inicializar presupuesto: primer turno = PM totales
    this._movPointsTotal     = this._playerEntity.movementPoints;
    this._movPointsRemaining = this._movPointsTotal;
    this._currentWalkCost    = 0;

    // Crear y mostrar MovementBar (Tweak 5: en el container si fue inyectado)
    this._movBar = new MovementBar(this._resourceContainer ?? undefined);
    this._movBar.setMax(this._movPointsTotal);
    this._movBar.setCurrent(this._movPointsTotal);
    this._movBar.show();

    // Update loop de la barra: cada frame
    this._barObserver = this._scene.onBeforeRenderObservable.add(() => {
      this._updateBar();
    });

    // Suscripcion a cambios de stats (panel DEV)
    this._statsHandler = (snapshot: PlayerSnapshot) => {
      this._playerEntity.updateCoreStats(snapshot.coreStats);
      const newTotal = this._playerEntity.movementPoints;
      if (newTotal !== this._movPointsTotal) {
        // Cambio de stat via panel DEV = refresco de turno con nuevos stats:
        // rellenar al 100% con el nuevo maximo, no conservar el valor viejo.
        this._movPointsTotal     = newTotal;
        this._movPointsRemaining = newTotal;
        this._movBar?.setMax(newTotal);
        this._movBar?.setCurrent(newTotal);
      }
      if (!this._walker.isWalking) {
        this._highlight.show(this._playerEntity, this._movPointsRemaining);
      }
      logger.debug('CombatMovementSystem: stats actualizados en caliente', {
        coreStats: snapshot.coreStats,
        movementPoints: this._playerEntity.movementPoints,
      });
    };
    eventBus.on('player:stats-changed', this._statsHandler);

    // Mostrar el rango de movimiento inicial
    this._highlight.show(this._playerEntity, this._movPointsRemaining);

    // Registrar listener de click
    this._pointerObserver = this._scene.onPointerObservable.add(
      (info: PointerInfo) => {
        if (info.type !== PointerEventTypes.POINTERUP) { return; }
        if ((info.event as PointerEvent).button !== 0)  { return; }
        this._handleClick();
      },
    );

    logger.debug('CombatMovementSystem: activado', {
      movementPoints: this._movPointsTotal,
      cellX: this._playerEntity.cellX,
      cellZ: this._playerEntity.cellZ,
    });
  }

  /**
   * Desactiva el sistema. Seguro llamar aunque no este activo.
   */
  deactivate(): void {
    if (!this._isActive) { return; }
    this._isActive = false;

    this._walker.cancel();

    if (this._barObserver !== null) {
      this._scene.onBeforeRenderObservable.remove(this._barObserver);
      this._barObserver = null;
    }
    this._movBar?.hide();

    if (this._statsHandler !== null) {
      eventBus.off('player:stats-changed', this._statsHandler);
      this._statsHandler = null;
    }

    this._highlight.hide();

    if (this._pointerObserver !== null) {
      this._scene.onPointerObservable.remove(this._pointerObserver);
      this._pointerObserver = null;
    }

    logger.debug('CombatMovementSystem: desactivado');
  }

  /** Llama a deactivate() y libera todos los recursos. */
  dispose(): void {
    this.deactivate();
    this._highlight.dispose();
    this._walker.dispose();
    this._movBar?.dispose();
    this._movBar = null;
  }

  // -- Inicio de turno ----------------------------------------------------------

  /**
   * Recarga el presupuesto de movimiento al total actual (movementPoints del pj).
   * Debe llamarse al inicio de cada turno del jugador.
   * Lee movementPoints EN VIVO: refleja la DEX actual (incluso si cambio via panel DEV).
   *
   * TODO: la recarga (boton DEV) se sustituye por el inicio de turno real
   *       cuando exista el sistema de turnos.
   */
  reloadMovement(): void {
    // Leer movementPoints en vivo: la DEX puede haber cambiado via panel DEV
    this._movPointsTotal     = this._playerEntity.movementPoints;
    this._movPointsRemaining = this._movPointsTotal;
    this._movBar?.setMax(this._movPointsTotal);
    this._movBar?.setCurrent(this._movPointsTotal);
    if (!this._walker.isWalking) {
      this._highlight.show(this._playerEntity, this._movPointsRemaining);
    }
    logger.debug('CombatMovementSystem: movimiento recargado -- inicio de turno', {
      movPointsTotal: this._movPointsTotal,
    });
  }

  /**
   * Habilita o deshabilita el input del jugador sin desactivar el sistema.
   * Llamado por CombatTurnSystem al cambiar de turno.
   *   false → oculta highlight, ignora clicks (turno del enemigo).
   *   true  → los clicks vuelven a funcionar (reloadMovement() se llama aparte).
   */
  setPlayerTurnActive(active: boolean): void {
    this._playerTurnActive = active;
    if (!active) {
      this._highlight.hide();
    }
  }

  // -- Logica interna -----------------------------------------------------------

  private _handleClick(): void {
    if (!this._playerTurnActive) { return; } // turno del enemigo: ignorar clicks
    if (this._inputBlocked)      { return; } // bloqueado durante selección/swing de ataque
    // Raycast al suelo del combate (isPickable=true en CombatGrid)
    const pick = this._scene.pick(
      this._scene.pointerX,
      this._scene.pointerY,
      (mesh) => mesh.name === 'combatFloor',
    );
    if (!pick.hit || pick.pickedPoint === null) { return; }

    const dest = this._grid.worldToCell(pick.pickedPoint);

    if (this._walker.isWalking) {
      this._handleRedirect(dest);
    } else {
      this._handleNewWalk(dest);
    }
  }

  // -- Nueva caminata -----------------------------------------------------------

  private _handleNewWalk(dest: { x: number; z: number }): void {
    // Click sobre la propia celda: ignorar
    if (dest.x === this._playerEntity.cellX && dest.z === this._playerEntity.cellZ) {
      return;
    }

    // Sin movimiento restante
    if (this._movPointsRemaining < 0.001) { return; }

    // Celda ocupada por otra entidad
    const occupant = this._grid.occupantAt(dest.x, dest.z);
    if (occupant !== null && occupant !== this._playerId) {
      logger.debug('CombatMovementSystem: destino ocupado', { dest, occupant });
      return;
    }

    // Pathfinding A*
    const start  = { x: this._playerEntity.cellX, z: this._playerEntity.cellZ };
    const result = CombatPathfinder.findPath(start, dest, this._grid, this._playerId);
    if (result === null) {
      logger.debug('CombatMovementSystem: sin camino al destino', { start, dest });
      return;
    }

    // Truncar al presupuesto restante
    const path = CombatMovementSystem._truncatePath(result.path, this._movPointsRemaining);
    if (path.length < 2) { return; }

    const actualDest = path[path.length - 1];
    if (actualDest === undefined) { return; }
    const walkCost = CombatMovementSystem._pathCost(path);

    // Actualizar ocupacion
    this._grid.release(this._playerId);
    this._grid.occupy(
      this._playerId,
      actualDest.x,
      actualDest.z,
      this._playerEntity.footprintW,
      this._playerEntity.footprintH,
    );
    this._reservedDest    = { x: actualDest.x, z: actualDest.z };
    this._currentWalkCost = walkCost;

    // Tweak 4: mantener resaltado visible; se actualiza celda a celda en _updateBar()
    this._lastHighlightCell = null;  // forzar recálculo inmediato

    logger.info('CombatMovementSystem: iniciando caminata', {
      from: start, to: actualDest, walkCost,
      remaining: this._movPointsRemaining, steps: path.length,
    });

    this._walker.startWalk(
      path,
      this._playerEntity,
      this._grid,
      () => { this._onWalkComplete(); },
    );
  }

  // -- Redireccion en tiempo real -----------------------------------------------

  private _handleRedirect(dest: { x: number; z: number }): void {
    // PM restantes en este instante exacto
    const spentSoFar = this._walker.elapsedCost;
    const remaining  = this._movPointsRemaining - spentSoFar;

    if (remaining < 0.001) {
      logger.debug('CombatMovementSystem: redireccion ignorada -- sin PM restantes');
      return;
    }

    const currentCell = { x: this._playerEntity.cellX, z: this._playerEntity.cellZ };

    // Click en la celda logica actual: ignorar
    if (dest.x === currentCell.x && dest.z === currentCell.z) { return; }

    // Celda ocupada por otra entidad: ignorar
    const occupant = this._grid.occupantAt(dest.x, dest.z);
    if (occupant !== null && occupant !== this._playerId) {
      logger.debug('CombatMovementSystem: destino redirigido ocupado', { dest, occupant });
      return;
    }

    // A* desde la celda logica actual
    const result = CombatPathfinder.findPath(currentCell, dest, this._grid, this._playerId);
    if (result === null) { return; }

    // Truncar al presupuesto restante
    const newPath = CombatMovementSystem._truncatePath(result.path, remaining);
    if (newPath.length < 2) { return; }

    const newDest = newPath[newPath.length - 1];
    if (newDest === undefined) { return; }
    const newCost = CombatMovementSystem._pathCost(newPath);

    // Contabilizar PM gastados en el path anterior
    this._movPointsRemaining -= spentSoFar;
    this._currentWalkCost     = newCost;

    // Actualizar reserva de ocupacion
    this._grid.release(this._playerId);
    this._grid.occupy(
      this._playerId,
      newDest.x,
      newDest.z,
      this._playerEntity.footprintW,
      this._playerEntity.footprintH,
    );
    this._reservedDest = { x: newDest.x, z: newDest.z };

    // Notificar interrupción de ataque programado (si existía)
    // La caminata continúa pero el ataque se cancela: el jugador cambió de destino.
    const interruptCb = this._pendingInterruptCb;
    this._pendingArrivalCb   = null;
    this._pendingInterruptCb = null;
    interruptCb?.();

    // Tweak 4: forzar recálculo de highlight en el próximo frame
    this._lastHighlightCell = null;

    // Redirigir el walker (la caminata continua sin corte de animacion)
    this._walker.redirectTo(newPath);

    logger.info('CombatMovementSystem: redireccion aplicada', {
      from: currentCell, to: newDest, remaining, newCost, steps: newPath.length,
    });
  }

  // -- Fin de caminata ----------------------------------------------------------

  private _onWalkComplete(): void {
    // Descontar el coste del path completado.
    // NO se recarga aqui: el presupuesto solo se repone via reloadMovement()
    // (boton DEV / inicio de turno real).
    this._movPointsRemaining -= this._currentWalkCost;
    this._movPointsRemaining  = Math.max(0, this._movPointsRemaining);

    // Tweak 4: limpiar tracking de celda (ya no estamos caminando)
    this._lastHighlightCell = null;

    // Mostrar highlight con el movimiento restante (0 PM = sin resaltado)
    this._highlight.show(this._playerEntity, this._movPointsRemaining);

    // Actualizar barra al estado final
    this._updateBar();

    logger.info('CombatMovementSystem: caminata completada', {
      dest:      this._reservedDest,
      remaining: this._movPointsRemaining,
    });

    // Disparar callback de llegada si existía (auto-approach: lanzar el ataque)
    const arrivalCb = this._pendingArrivalCb;
    this._pendingArrivalCb   = null;
    this._pendingInterruptCb = null;
    arrivalCb?.();
  }

  // -- Barra de movimiento ------------------------------------------------------

  private _updateBar(): void {
    if (this._movBar === null) { return; }
    const spent     = this._walker.isWalking ? this._walker.elapsedCost : 0;
    const remaining = Math.max(0, this._movPointsRemaining - spent);
    this._movBar.setCurrent(remaining);

    // Tweak 4: actualizar highlight cuando la celda cambia durante la caminata.
    // Sólo se recalcula al entrar en una celda nueva, no cada frame.
    if (this._walker.isWalking && this._playerTurnActive) {
      const cx   = this._playerEntity.cellX;
      const cz   = this._playerEntity.cellZ;
      const last = this._lastHighlightCell;
      if (last === null || cx !== last.x || cz !== last.z) {
        this._lastHighlightCell = { x: cx, z: cz };
        this._highlight.show(this._playerEntity, remaining);
      }
    }
  }

  // -- Helpers estaticos --------------------------------------------------------

  /**
   * Trunca el path para que su coste total no supere maxCost.
   * Devuelve el path original si cabe entero, o un subarray hasta el ultimo
   * nodo alcanzable con el presupuesto dado.
   * Siempre incluye el nodo inicial (path[0]).
   */
  private static _truncatePath(path: GridCell[], maxCost: number): GridCell[] {
    let accum = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a === undefined || b === undefined) { break; }
      const dx      = Math.abs(b.x - a.x);
      const dz      = Math.abs(b.z - a.z);
      const segCost = (dx > 0 && dz > 0) ? 1.5 : 1.0;
      if (accum + segCost > maxCost + 0.0001) {
        return path.slice(0, i + 1);
      }
      accum += segCost;
    }
    return path;
  }

  /**
   * Calcula el coste total de un path (suma de costes de todos sus segmentos).
   */
  private static _pathCost(path: GridCell[]): number {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a === undefined || b === undefined) { break; }
      const dx = Math.abs(b.x - a.x);
      const dz = Math.abs(b.z - a.z);
      cost += (dx > 0 && dz > 0) ? 1.5 : 1.0;
    }
    return cost;
  }
}
