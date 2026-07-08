/**
 * CombatReachableHighlight -- resaltado visual del rango de movimiento tactico.
 *
 * Pre-crea 400 planos finos (uno por celda del grid 20x20) y los muestra u
 * oculta segun las celdas alcanzables calculadas por CombatPathfinder.getReachableCells().
 *
 * Diseno:
 *   - Un solo material compartido: eficiente en GPU.
 *   - Planos a Y=0.025 (por encima de las lineas del grid a Y=0.01).
 *   - Color dorado semitransparente: contrasta con el suelo azul-gris oscuro.
 *   - isPickable=false: no interfiere con el raycast de CombatMovementSystem.
 *
 * Ciclo de vida:
 *   const hl = new CombatReachableHighlight(scene, grid, 'player');
 *   hl.show(playerEntity);   // recalcula y muestra el rango
 *   hl.hide();               // oculta todo
 *   hl.dispose();            // libera los meshes al salir del combate
 */

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { Scene, AbstractMesh } from '@babylonjs/core';

import type { CombatGrid }   from '@/game/world/CombatGrid';
import type { CombatEntity } from '@/game/combat/CombatEntity';
import { CombatPathfinder }  from '@/game/combat/CombatPathfinder';
import { logger }            from '@/core/Logger';

// -- Constantes visuales -------------------------------------------------------

/** Ancho/alto de cada plano de resaltado (ligeramente menor que 1 celda). */
const PLANE_SIZE = 0.88;

/** Altura sobre el suelo del grid (lineas a Y=0.01, nosotros a 0.025). */
const PLANE_Y = 0.025;

/** Color del resaltado: dorado calido. */
const HIGHLIGHT_COLOR = new Color3(0.95, 0.72, 0.08);

/** Transparencia del resaltado (0=invisible, 1=solido). */
const HIGHLIGHT_ALPHA = 0.15;

// -- Clase --------------------------------------------------------------------

export class CombatReachableHighlight {

  private readonly _grid:         CombatGrid;
  private readonly _entityId:     string;
  /** Map "cx,cz" -> plane mesh. Pre-creados, todos ocultos al inicio. */
  private readonly _planes: Map<string, AbstractMesh> = new Map();

  /**
   * @param scene    Escena Babylon activa.
   * @param grid     Grid de combate (para conversion celda->mundo).
   * @param entityId ID de la entidad cuyo rango se resalta (ej. 'player').
   */
  constructor(scene: Scene, grid: CombatGrid, entityId: string) {
    this._grid     = grid;
    this._entityId = entityId;
    this._buildPlanes(scene);
    logger.debug('CombatReachableHighlight: 400 planos pre-creados');
  }

  // -- API publica --------------------------------------------------------------

  /**
   * Calcula el rango de movimiento de la entidad y resalta las celdas alcanzables.
   * Oculta todos los planos primero, luego muestra solo los alcanzables.
   *
   * @param entity Ficha del jugador (para leer cellX/cellZ y movementPoints).
   */
  show(entity: CombatEntity): void {
    this.hide();  // limpiar estado anterior

    const reachable = CombatPathfinder.getReachableCells(
      { x: entity.cellX, z: entity.cellZ },
      entity.movementPoints,
      this._grid,
      this._entityId,
    );

    let count = 0;
    for (const [key] of reachable) {
      // No resaltar la casilla donde ya esta el jugador
      if (key === `${entity.cellX},${entity.cellZ}`) { continue; }

      const plane = this._planes.get(key);
      if (plane !== undefined) {
        plane.isVisible = true;
        count++;
      }
    }

    logger.debug('CombatReachableHighlight: rango mostrado', {
      origin:    `(${entity.cellX},${entity.cellZ})`,
      movPoints: entity.movementPoints,
      cellCount: count,
    });
  }

  /** Oculta todos los planos de resaltado. */
  hide(): void {
    for (const [, plane] of this._planes) {
      plane.isVisible = false;
    }
  }

  /** Libera todos los meshes. Llamar al finalizar el combate. */
  dispose(): void {
    this.hide();
    for (const [, plane] of this._planes) {
      plane.dispose();
    }
    this._planes.clear();
    logger.debug('CombatReachableHighlight: dispuesto');
  }

  // -- Construccion interna -----------------------------------------------------

  private _buildPlanes(scene: Scene): void {
    // Material compartido: un solo objeto en GPU para todos los planos.
    const mat = new StandardMaterial('reachHighlightMat', scene);
    mat.emissiveColor    = HIGHLIGHT_COLOR;
    mat.alpha            = HIGHLIGHT_ALPHA;
    mat.disableLighting  = true;    // sin sombras ni iluminacion: color puro
    mat.backFaceCulling  = false;   // visible desde la camara isometrica (angulo alto)

    for (let cx = 0; cx < 20; cx++) {
      for (let cz = 0; cz < 20; cz++) {
        const worldPos = this._grid.cellToWorld(cx, cz);

        const plane = MeshBuilder.CreateGround(
          `reachPlane_${cx}_${cz}`,
          { width: PLANE_SIZE, height: PLANE_SIZE },
          scene,
        );
        plane.position.x  = worldPos.x;
        plane.position.y  = PLANE_Y;
        plane.position.z  = worldPos.z;
        plane.isPickable  = false;   // no interfiere con raycast de movimiento
        plane.isVisible   = false;
        plane.material    = mat;

        this._planes.set(`${cx},${cz}`, plane);
      }
    }
  }
}
