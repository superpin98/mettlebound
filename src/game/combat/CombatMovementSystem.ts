/**
 * CombatMovementSystem -- click-to-move sobre el grid tactico.
 *
 * Al hacer clic izquierdo sobre el suelo del combate:
 *   1. Convierte el punto 3D a celda de grid (worldToCell).
 *   2. Valida que la celda no este ocupada por otra entidad.
 *   3. Ejecuta A* (CombatPathfinder) desde la celda actual.
 *   4. Comprueba que el coste no supere los puntos de movimiento.
 *   5. Teleporta la ficha a destino (placeAt) y actualiza la ocupacion.
 *   6. Recalcula el resaltado de rango (CombatReachableHighlight).
 *
 * Suscripcion a player:stats-changed:
 *   Cuando cambia la DEX (ej. via el panel DEV), actualiza la DEX de la entidad
 *   y recalcula el resaltado de rango inmediatamente.
 *
 * NO hay animacion de caminar (Pieza 3b).
 */

import { PointerEventTypes } from '@babylonjs/core';
import type { Scene, Observer, PointerInfo } from '@babylonjs/core';

import type { CombatGrid }          from '@/game/world/CombatGrid';
import type { CombatEntity }        from '@/game/combat/CombatEntity';
import type { PlayerSnapshot }      from '@/types/game.types';
import { CombatPathfinder }         from '@/game/combat/CombatPathfinder';
import { CombatReachableHighlight } from '@/game/combat/CombatReachableHighlight';
import { eventBus }                 from '@/core/EventBus';
import { logger }                   from '@/core/Logger';

export class CombatMovementSystem {

  private readonly _scene:        Scene;
  private readonly _grid:         CombatGrid;
  private readonly _playerEntity: CombatEntity;
  private readonly _playerId:     string;
  private readonly _highlight:    CombatReachableHighlight;

  private _isActive         = false;
  private _pointerObserver: Observer<PointerInfo> | null = null;
  // Handler almacenado para poder llamar eventBus.off() al desactivar.
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
  }

  // -- API publica --------------------------------------------------------------

  /**
   * Activa el sistema:
   *   - Registra el listener de click izquierdo.
   *   - Suscribe a player:stats-changed para mantener la DEX al dia.
   *   - Muestra el resaltado de rango inicial.
   * Idempotente.
   */
  activate(): void {
    if (this._isActive) { return; }
    this._isActive = true;

    // Suscripcion a cambios de stats: actualiza la DEX de la entidad y refresca
    // el resaltado de rango cuando el usuario modifica stats via el panel DEV.
    this._statsHandler = (snapshot: PlayerSnapshot) => {
      this._playerEntity.updateDex(snapshot.coreStats.DEX);
      this._highlight.show(this._playerEntity);
      logger.debug('CombatMovementSystem: DEX actualizada en caliente', {
        dex:           snapshot.coreStats.DEX,
        movementPoints: this._playerEntity.movementPoints,
      });
    };
    eventBus.on('player:stats-changed', this._statsHandler);

    // Mostrar el rango de movimiento inicial
    this._highlight.show(this._playerEntity);

    this._pointerObserver = this._scene.onPointerObservable.add(
      (info: PointerInfo) => {
        if (info.type !== PointerEventTypes.POINTERUP) { return; }
        // Solo boton izquierdo (0). CombatCamera usa boton derecho (2).
        if ((info.event as PointerEvent).button !== 0)  { return; }
        this._handleClick();
      },
    );

    logger.debug('CombatMovementSystem: activado', {
      movementPoints: this._playerEntity.movementPoints,
      cellX:          this._playerEntity.cellX,
      cellZ:          this._playerEntity.cellZ,
    });
  }

  /**
   * Desactiva el sistema:
   *   - Elimina el listener de click.
   *   - Cancela la suscripcion a player:stats-changed.
   *   - Oculta el resaltado de rango.
   * Seguro llamar aunque no este activo.
   */
  deactivate(): void {
    if (!this._isActive) { return; }
    this._isActive = false;

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

  /** Llama a deactivate() y libera el highlight. */
  dispose(): void {
    this.deactivate();
    this._highlight.dispose();
  }

  // -- Logica interna -----------------------------------------------------------

  private _handleClick(): void {
    // Raycast al suelo del combate (isPickable=true en CombatGrid).
    const pick = this._scene.pick(
      this._scene.pointerX,
      this._scene.pointerY,
      (mesh) => mesh.name === 'combatFloor',
    );

    if (!pick.hit || pick.pickedPoint === null) { return; }

    const dest = this._grid.worldToCell(pick.pickedPoint);

    // Click sobre la propia celda: ignorar
    if (dest.x === this._playerEntity.cellX && dest.z === this._playerEntity.cellZ) {
      return;
    }

    // Celda ocupada por otra entidad
    const occupant = this._grid.occupantAt(dest.x, dest.z);
    if (occupant !== null && occupant !== this._playerId) {
      logger.debug('CombatMovementSystem: destino ocupado', { dest, occupant });
      return;
    }

    // Pathfinding A*
    const start = { x: this._playerEntity.cellX, z: this._playerEntity.cellZ };
    const result = CombatPathfinder.findPath(start, dest, this._grid, this._playerId);

    if (result === null) {
      logger.debug('CombatMovementSystem: sin camino al destino', { start, dest });
      return;
    }

    const mp = this._playerEntity.movementPoints;
    if (result.cost > mp) {
      logger.debug('CombatMovementSystem: destino fuera de alcance', {
        cost: result.cost, movementPoints: mp,
      });
      return;
    }

    // Calcular angulo de giro hacia el destino
    const dx = dest.x - this._playerEntity.cellX;
    const dz = dest.z - this._playerEntity.cellZ;
    const facingRad = Math.atan2(dx, dz);

    // Actualizar ocupacion y posicion
    this._grid.release(this._playerId);
    this._playerEntity.placeAt(dest.x, dest.z, this._grid, facingRad);
    this._grid.occupy(
      this._playerId,
      dest.x,
      dest.z,
      this._playerEntity.footprintW,
      this._playerEntity.footprintH,
    );

    // Recalcular el resaltado desde la nueva posicion
    this._highlight.show(this._playerEntity);

    logger.info('CombatMovementSystem: jugador movido', {
      from: start, to: dest, cost: result.cost, movementPoints: mp,
    });
  }
}
