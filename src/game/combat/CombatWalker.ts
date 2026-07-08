/**
 * CombatWalker -- interpola la ficha por el camino celda a celda.
 *
 * Recibe el path completo de A* (GridCell[]) y, frame a frame, mueve el pivot
 * de la CombatEntity desde la celda origen hasta la celda destino a velocidad
 * constante. Al completar el recorrido llama a onComplete().
 *
 * Velocidad: WALK_SPEED metros/segundo (constante ajustable abajo).
 * Actualizacion: scene.onBeforeRenderObservable (independiente de fps).
 *
 * Costes de segmento (para elapsedCost):
 *   ortogonal = 1.0  (mismo que el pathfinder)
 *   diagonal  = 1.5  (mismo que el pathfinder)
 * Longitudes fisicas de segmento (para velocidad visual constante):
 *   ortogonal = 1.0 m
 *   diagonal  = sqrt(2) m
 *
 * API principal:
 *   startWalk(path, entity, grid, onComplete)  -- inicia el recorrido
 *   redirectTo(newPath)                        -- redirige sin cortar la caminata
 *   cancel()                                   -- detiene sin llamar onComplete
 *   elapsedCost (getter)                       -- coste gastado hasta este instante
 */

import type { Scene, Observer } from '@babylonjs/core';

import type { CombatGrid }   from '@/game/world/CombatGrid';
import type { CombatEntity } from '@/game/combat/CombatEntity';
import type { GridCell }     from '@/game/combat/CombatPathfinder';
import { logger }            from '@/core/Logger';

// ── Constante de velocidad de caminata ─────────────────────────────────────────
/** Velocidad de desplazamiento en metros por segundo. Ajustable sin tocar logica. */
const WALK_SPEED = 4.0;

// ── CombatWalker ───────────────────────────────────────────────────────────────

export class CombatWalker {

  private readonly _scene: Scene;

  // Estado de la caminata activa
  private _entity:     CombatEntity | null = null;
  private _grid:       CombatGrid   | null = null;
  private _path:       GridCell[]          = [];
  private _segIdx      = 0;        // indice del segmento actual en _path
  private _t           = 0;        // progreso en el segmento actual [0, 1)
  private _segLenM     = 1.0;      // longitud FISICA del segmento en metros (para vel.)
  private _segCosts:   number[]    = [];  // coste de juego por segmento (1.0 orto, 1.5 diag)
  private _costSpent   = 0;        // suma de costes de segmentos ya completados
  private _onComplete: (() => void) | null = null;
  private _observer:   Observer<Scene> | null = null;
  private _isWalking   = false;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  // -- API publica ---------------------------------------------------------------

  /** True si hay una caminata en curso. */
  get isWalking(): boolean { return this._isWalking; }

  /**
   * Coste de juego acumulado desde el inicio de la caminata actual hasta este instante.
   * ortogonal=1.0, diagonal=1.5 por segmento. Fraccion proporcional al progreso _t.
   * Devuelve 0 si no hay caminata activa.
   */
  get elapsedCost(): number {
    if (!this._isWalking) { return 0; }
    const segCost = this._segCosts[this._segIdx] ?? 0;
    return this._costSpent + segCost * this._t;
  }

  /**
   * Inicia el recorrido por el path indicado.
   * Si el path tiene menos de 2 celdas, llama a onComplete() inmediatamente.
   *
   * Ocupacion: el llamador ya ha hecho release() + occupy() del destino antes
   * de invocar startWalk(). El walker solo mueve visualmente y actualiza setCell().
   *
   * @param path       Array de GridCell desde origen (incluido) hasta destino (incluido).
   * @param entity     Ficha que camina.
   * @param grid       CombatGrid para la conversion celda<->mundo.
   * @param onComplete Callback invocado al llegar al ultimo nodo del path.
   */
  startWalk(
    path:       GridCell[],
    entity:     CombatEntity,
    grid:       CombatGrid,
    onComplete: () => void,
  ): void {
    // Seguridad: cancelar caminata previa si la hubiera
    this.cancel();

    if (path.length < 2) {
      onComplete();
      return;
    }

    this._path       = path;
    this._entity     = entity;
    this._grid       = grid;
    this._onComplete = onComplete;
    this._segIdx     = 0;
    this._t          = 0;
    this._segCosts   = this._buildSegCosts(path);
    this._costSpent  = 0;
    this._isWalking  = true;

    // Arrancar animacion y orientar hacia el primer paso
    entity.startWalkAnim();
    this._updateFacing(0);
    this._segLenM = this._segmentLengthM(0);

    // Registrar update loop
    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this._update();
    });

    logger.debug('CombatWalker: caminata iniciada', {
      steps: path.length, walkSpeed: WALK_SPEED,
    });
  }

  /**
   * Redirige la caminata activa hacia un nuevo path.
   * El path debe comenzar en la celda logica actual de la entidad.
   *
   * Comportamiento:
   *   - Snappea la entidad a la celda logica actual (path[0]).
   *   - Resetea el progreso interno (segIdx=0, t=0, costSpent=0).
   *   - El observer sigue activo: la animacion no se interrumpe.
   *   - onComplete original sigue vigente (se llama al llegar al nuevo destino).
   *
   * Ocupacion: el llamador actualiza release/occupy ANTES de llamar a redirectTo.
   *
   * @param newPath Nuevo path desde la celda logica actual hasta el nuevo destino.
   */
  redirectTo(newPath: GridCell[]): void {
    if (!this._isWalking || this._entity === null || this._grid === null) { return; }
    // Seguridad: si el path es trivial, ignorar (el llamador lo previene)
    if (newPath.length < 2) { return; }

    // Snap a la celda logica actual (path[0] = entity.cellX/Z)
    const startCell = newPath[0];
    if (startCell !== undefined) {
      const w = this._grid.cellToWorld(startCell.x, startCell.z);
      this._entity.setWorldPosition(w.x, 0, w.z);
      this._entity.setCell(startCell.x, startCell.z);
    }

    // Reemplazar el path y resetear estado de progreso
    this._path      = newPath;
    this._segIdx    = 0;
    this._t         = 0;
    this._segCosts  = this._buildSegCosts(newPath);
    this._costSpent = 0;
    this._segLenM   = this._segmentLengthM(0);

    this._updateFacing(0);

    // El observer sigue activo — la caminata continua sin corte
    logger.debug('CombatWalker: redirigido', {
      steps: newPath.length,
      dest:  newPath[newPath.length - 1],
    });
  }

  /**
   * Detiene la caminata sin llamar a onComplete().
   * Deja la ficha en la posicion en que este en ese momento.
   * Seguro llamar si no hay caminata activa.
   */
  cancel(): void {
    if (!this._isWalking) { return; }
    this._isWalking = false;
    this._detachObserver();
    this._entity?.stopWalkAnim();
    this._entity     = null;
    this._grid       = null;
    this._path       = [];
    this._segCosts   = [];
    this._costSpent  = 0;
    this._onComplete = null;
    logger.debug('CombatWalker: caminata cancelada');
  }

  /** Llama a cancel() y elimina la referencia a la escena. Llamar al destruir. */
  dispose(): void {
    this.cancel();
    logger.debug('CombatWalker: dispuesto');
  }

  // -- Logica interna -----------------------------------------------------------

  private _update(): void {
    if (!this._isWalking || this._entity === null || this._grid === null) { return; }

    const dtSec = this._scene.deltaTime / 1000;
    this._t += dtSec * WALK_SPEED / this._segLenM;

    // Bucle para manejar el caso improbable de saltar mas de un segmento en un frame
    while (this._t >= 1) {
      // Acumular el coste del segmento completado
      const completedCost = this._segCosts[this._segIdx] ?? 0;
      this._costSpent += completedCost;

      // Llegar a la celda destino del segmento actual
      const toCell = this._path[this._segIdx + 1];
      if (toCell === undefined) {
        this._arrive();
        return;
      }

      const toWorld = this._grid.cellToWorld(toCell.x, toCell.z);
      this._entity.setWorldPosition(toWorld.x, 0, toWorld.z);
      this._entity.setCell(toCell.x, toCell.z);

      this._segIdx++;
      this._t -= 1;

      // Fin del path
      if (this._segIdx >= this._path.length - 1) {
        this._arrive();
        return;
      }

      // Configurar el siguiente segmento
      this._segLenM = this._segmentLengthM(this._segIdx);
      this._updateFacing(this._segIdx);
    }

    // Interpolacion lineal dentro del segmento actual
    const fromCell = this._path[this._segIdx];
    const toCell   = this._path[this._segIdx + 1];
    if (fromCell === undefined || toCell === undefined) {
      this._arrive();
      return;
    }

    const fromW = this._grid.cellToWorld(fromCell.x, fromCell.z);
    const toW   = this._grid.cellToWorld(toCell.x,   toCell.z);
    const t     = this._t;

    this._entity.setWorldPosition(
      fromW.x + (toW.x - fromW.x) * t,
      0,
      fromW.z + (toW.z - fromW.z) * t,
    );
  }

  /** Snap final a la ultima celda, detiene la animacion y llama al callback. */
  private _arrive(): void {
    const lastCell = this._path[this._path.length - 1];
    if (lastCell !== undefined && this._entity !== null && this._grid !== null) {
      const w = this._grid.cellToWorld(lastCell.x, lastCell.z);
      this._entity.setWorldPosition(w.x, 0, w.z);
      this._entity.setCell(lastCell.x, lastCell.z);
    }

    this._isWalking = false;
    this._detachObserver();
    this._entity?.stopWalkAnim();

    const cb = this._onComplete;
    // Limpiar estado antes de llamar al callback (por si onComplete dispara otra caminata)
    this._entity     = null;
    this._grid       = null;
    this._path       = [];
    this._segCosts   = [];
    this._costSpent  = 0;
    this._onComplete = null;

    logger.debug('CombatWalker: llegado al destino');
    cb?.();
  }

  /** Orienta la entidad hacia el siguiente nodo del segmento indicado. */
  private _updateFacing(segIdx: number): void {
    const fromCell = this._path[segIdx];
    const toCell   = this._path[segIdx + 1];
    if (fromCell === undefined || toCell === undefined || this._entity === null) { return; }

    const dx  = toCell.x - fromCell.x;
    const dz  = toCell.z - fromCell.z;
    const rad = Math.atan2(dx, dz);
    this._entity.setFacingRad(rad);
  }

  /**
   * Longitud FISICA en metros del segmento (para calcular velocidad visual constante).
   * ortogonal = 1.0 m,  diagonal = sqrt(2) m.
   * NO confundir con el coste de juego (1.0 / 1.5) en _segCosts.
   */
  private _segmentLengthM(segIdx: number): number {
    const a = this._path[segIdx];
    const b = this._path[segIdx + 1];
    if (a === undefined || b === undefined) { return 1.0; }

    const dx = Math.abs(b.x - a.x);
    const dz = Math.abs(b.z - a.z);
    return (dx > 0 && dz > 0) ? Math.SQRT2 : 1.0;
  }

  /**
   * Precomputa los costes de juego de cada segmento del path.
   * ortogonal = 1.0,  diagonal = 1.5  (igual que CombatPathfinder.DIRECTIONS).
   */
  private _buildSegCosts(path: GridCell[]): number[] {
    const costs: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a === undefined || b === undefined) { costs.push(1.0); continue; }
      const dx = Math.abs(b.x - a.x);
      const dz = Math.abs(b.z - a.z);
      costs.push((dx > 0 && dz > 0) ? 1.5 : 1.0);
    }
    return costs;
  }

  private _detachObserver(): void {
    if (this._observer !== null) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }
  }
}
