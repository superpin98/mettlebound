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
  private _pointerObserver: Observer<PointerInfo> | null = null;
  private _statsHandler: ((snapshot: PlayerSnapshot) => void) | null = null;

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

    // Crear y mostrar MovementBar
    this._movBar = new MovementBar();
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

  // -- Logica interna -----------------------------------------------------------

  private _handleClick(): void {
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

    // Ocultar resaltado durante el movimiento
    this._highlight.hide();

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

    // Mostrar highlight con el movimiento restante (0 PM = sin resaltado)
    this._highlight.show(this._playerEntity, this._movPointsRemaining);

    // Actualizar barra al estado final
    this._updateBar();

    logger.info('CombatMovementSystem: caminata completada', {
      dest:      this._reservedDest,
      remaining: this._movPointsRemaining,
    });
  }

  // -- Barra de movimiento ------------------------------------------------------

  private _updateBar(): void {
    if (this._movBar === null) { return; }
    const spent     = this._walker.isWalking ? this._walker.elapsedCost : 0;
    const remaining = Math.max(0, this._movPointsRemaining - spent);
    this._movBar.setCurrent(remaining);
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
