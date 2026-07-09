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
 * Transicion visual suave (Tweak visual):
 *   - Casillas que aparecen/desaparecen se animan con un fade de FADE_MS ms.
 *   - Se usa mesh.visibility (0-1) interpolado cada frame via onBeforeRenderObservable.
 *   - El material compartido tiene alpha=0.15; el alpha efectivo renderizado es
 *     mat.alpha * mesh.visibility, permitiendo un fade suave sin cambiar el material.
 *   - El observer SOLO corre mientras hay tiles en transicion (sin coste en reposo).
 *   - La logica de QUE celdas son alcanzables no cambia: sigue recalculandose al
 *     cambiar de celda, no cada frame.
 *
 * Ciclo de vida:
 *   const hl = new CombatReachableHighlight(scene, grid, 'player');
 *   hl.show(playerEntity);           // usa entity.movementPoints como presupuesto
 *   hl.show(playerEntity, 3.5);      // presupuesto explicito (PM restantes del turno)
 *   hl.hide();                       // fade-out de todos los tiles activos
 *   hl.dispose();                    // libera los meshes al salir del combate
 */

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { Scene, AbstractMesh, Observer } from '@babylonjs/core';

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

/** Transparencia maxima del resaltado (0=invisible, 1=solido).
 *  El valor efectivo renderizado es mat.alpha * mesh.visibility. */
const HIGHLIGHT_ALPHA = 0.15;

/** Duracion del fade de entrada/salida en milisegundos. */
const FADE_MS = 160;

// -- Tipo interno ---------------------------------------------------------------

/** Estado de animacion de un tile con transicion activa. */
interface TileState {
  readonly mesh: AbstractMesh;
  /** Visibilidad objetivo: 1.0 = visible al maximo, 0.0 = invisible. */
  target: number;
}

// -- Clase ---------------------------------------------------------------------

export class CombatReachableHighlight {

  private readonly _scene:     Scene;
  private readonly _grid:      CombatGrid;
  private readonly _entityId:  string;

  /** Map "cx,cz" -> plane mesh. Pre-creados, todos ocultos al inicio. */
  private readonly _planes: Map<string, AbstractMesh> = new Map();

  /**
   * Tiles con una transicion de visibilidad activa.
   * El observer solo esta registrado mientras este mapa tiene entradas.
   */
  private readonly _states: Map<string, TileState> = new Map();

  /** Observer del render loop; null cuando no hay transiciones activas. */
  private _observer: Observer<Scene> | null = null;

  /**
   * @param scene    Escena Babylon activa.
   * @param grid     Grid de combate (para conversion celda->mundo).
   * @param entityId ID de la entidad cuyo rango se resalta (ej. 'player').
   */
  constructor(scene: Scene, grid: CombatGrid, entityId: string) {
    this._scene    = scene;
    this._grid     = grid;
    this._entityId = entityId;
    this._buildPlanes(scene);
    logger.debug('CombatReachableHighlight: 400 planos pre-creados');
  }

  // -- API publica --------------------------------------------------------------

  /**
   * Calcula el rango de movimiento y anima los tiles hacia el nuevo estado:
   *   - Tiles que entran en el rango  → fade-in (visibility 0 → 1).
   *   - Tiles que salen del rango     → fade-out (visibility 1 → 0).
   *   - Tiles que ya estaban al nivel correcto → sin transicion.
   *
   * NO llama a hide() previamente: gestiona las transiciones directamente
   * para que el fade sea suave en lugar de un salto brusco.
   *
   * @param entity   Ficha del jugador (para leer cellX/cellZ).
   * @param maxCost  Presupuesto maximo en PM. Si se omite, usa entity.movementPoints.
   */
  show(entity: CombatEntity, maxCost?: number): void {
    const budget    = maxCost !== undefined ? maxCost : entity.movementPoints;
    const playerKey = `${entity.cellX},${entity.cellZ}`;

    const reachable = CombatPathfinder.getReachableCells(
      { x: entity.cellX, z: entity.cellZ },
      budget,
      this._grid,
      this._entityId,
    );

    for (const [key, plane] of this._planes) {
      // Casilla del jugador nunca se resalta
      const shouldShow = reachable.has(key) && key !== playerKey;
      const target     = shouldShow ? 1.0 : 0.0;

      const state = this._states.get(key);
      if (state !== undefined) {
        // Ya hay una transicion activa: solo actualizamos el destino
        state.target = target;
        // Si cambiamos de fade-out a fade-in, aseguramos que el mesh sea visible
        if (target > 0) { plane.isVisible = true; }
      } else {
        // Sin transicion activa: comprobamos si hay cambio pendiente
        const cur = plane.visibility;
        if (Math.abs(cur - target) > 0.001) {
          if (target > 0) { plane.isVisible = true; }
          this._states.set(key, { mesh: plane, target });
        }
        // Si ya esta en el valor correcto, no hacemos nada
      }
    }

    this._ensureObserver();

    logger.debug('CombatReachableHighlight: rango mostrado', {
      origin:    `(${entity.cellX},${entity.cellZ})`,
      budget,
      cellCount: reachable.size,
    });
  }

  /**
   * Inicia el fade-out de todos los tiles visibles o en proceso de fade-in.
   * Los tiles se apagan gradualmente en FADE_MS ms.
   */
  hide(): void {
    for (const [key, plane] of this._planes) {
      const state = this._states.get(key);
      if (state !== undefined) {
        // Revertir transicion existente hacia 0
        state.target = 0;
      } else if (plane.visibility > 0.001) {
        // Tile visible sin transicion activa: iniciar fade-out
        this._states.set(key, { mesh: plane, target: 0 });
      }
    }
    this._ensureObserver();
  }

  /** Libera todos los meshes y el observer. Llamar al finalizar el combate. */
  dispose(): void {
    // Detener el observer antes de limpiar
    if (this._observer !== null) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }
    this._states.clear();

    for (const [, plane] of this._planes) {
      plane.dispose();
    }
    this._planes.clear();
    logger.debug('CombatReachableHighlight: dispuesto');
  }

  // -- Render loop --------------------------------------------------------------

  /** Registra el observer de render si no esta activo y hay transiciones pendientes. */
  private _ensureObserver(): void {
    if (this._observer !== null || this._states.size === 0) { return; }
    this._observer = this._scene.onBeforeRenderObservable.add(() => { this._tick(); });
  }

  /**
   * Avanza las transiciones de visibilidad en funcion del dt del frame.
   * Se ejecuta cada frame SOLO mientras _states tiene entradas.
   */
  private _tick(): void {
    const dt   = this._scene.getEngine().getDeltaTime();   // ms del ultimo frame
    const step = Math.min(dt / FADE_MS, 1.0);             // fraccion de fade (0-1)
    const done: string[] = [];

    for (const [key, state] of this._states) {
      const cur  = state.mesh.visibility;
      const diff = state.target - cur;

      if (Math.abs(diff) < 0.001) {
        // Llegamos al destino: fijar valor final y limpiar
        state.mesh.visibility = state.target;
        if (state.target === 0) {
          state.mesh.isVisible = false;   // fuera del pipeline de render
        }
        done.push(key);
        continue;
      }

      // Paso lineal hacia el destino (sin overshoot)
      state.mesh.visibility = diff > 0
        ? Math.min(state.target, cur + step)
        : Math.max(state.target, cur - step);
    }

    // Limpiar tiles que terminaron su transicion
    for (const key of done) {
      this._states.delete(key);
    }

    // Desregistrar observer cuando ya no hay trabajo
    if (this._states.size === 0) {
      this._scene.onBeforeRenderObservable.remove(this._observer!);
      this._observer = null;
    }
  }

  // -- Construccion interna -----------------------------------------------------

  private _buildPlanes(scene: Scene): void {
    // Material compartido: un solo objeto en GPU para todos los planos.
    const mat = new StandardMaterial('reachHighlightMat', scene);
    mat.emissiveColor   = HIGHLIGHT_COLOR;
    mat.alpha           = HIGHLIGHT_ALPHA;
    mat.disableLighting = true;    // sin sombras ni iluminacion: color puro
    mat.backFaceCulling = false;   // visible desde la camara isometrica (angulo alto)

    for (let cx = 0; cx < 20; cx++) {
      for (let cz = 0; cz < 20; cz++) {
        const worldPos = this._grid.cellToWorld(cx, cz);

        const plane = MeshBuilder.CreateGround(
          `reachPlane_${cx}_${cz}`,
          { width: PLANE_SIZE, height: PLANE_SIZE },
          scene,
        );
        plane.position.x = worldPos.x;
        plane.position.y = PLANE_Y;
        plane.position.z = worldPos.z;
        plane.isPickable = false;   // no interfiere con raycast de movimiento
        plane.isVisible  = false;
        plane.visibility = 0;       // inicio en 0 para que fade-in funcione correctamente

        plane.material = mat;

        this._planes.set(`${cx},${cz}`, plane);
      }
    }
  }
}
