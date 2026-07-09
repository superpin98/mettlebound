// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  Vector3,
  Color3,
  StandardMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';

// ============================================================
// CombatGrid -- tablero tactico 20x20 para la escena de combate.
//
// 20 celdas x 20 celdas de 1 m cada una = grid de 20x20 m.
// Origen del mundo (0,0,0) = centro exacto del tablero.
//
// Uso:
//   const grid = new CombatGrid(scene);
//   grid.show();     // construye y muestra (lazy)
//   grid.hide();     // oculta sin destruir
//   grid.dispose();  // destruye todo
//
// Conversion de coordenadas:
//   grid.cellToWorld(cx, cz) -> Vector3 (centro de la celda)
//   grid.worldToCell(pos)    -> { x, z } en rango 0-19
//
// Sistema de ocupacion (footprints multi-casilla):
//   grid.occupy(entityId, anchorX, anchorZ, footprintW, footprintH)
//   grid.release(entityId)
//   grid.isAreaFree(anchorX, anchorZ, footprintW, footprintH)
//   grid.occupantAt(cx, cz) -> entityId | null
// ============================================================

// -- Constantes ---------------------------------------------------------------

const CELLS      = 20;              // 20x20 celdas tacticas
const CELL_SIZE  = 1;               // 1 metro por celda -> grid 20x20 m
const GRID_TOTAL = CELLS * CELL_SIZE;
const FLOOR_Y    = -0.1;           // suelo ligeramente bajo el plano Y=0
const LINE_Y     = 0.01;           // lineas flotando 1 cm sobre el suelo

const LINE_COLOR = new Color3(0.35, 0.40, 0.55);
const LINE_ALPHA = 0.7;

// ── Clase ─────────────────────────────────────────────────────────────────────

export class CombatGrid {

  private readonly _scene: Scene;
  private _floor:   AbstractMesh | null     = null;
  private _lines:   AbstractMesh[]          = [];
  private _physics: PhysicsAggregate | null = null;
  private _built    = false;

  // ── Sistema de ocupacion ────────────────────────────────────────────────────
  // Mapa "cx,cz" -> entityId: que entidad ocupa cada celda.
  // Mapa entityId -> ["cx,cz", ...]: celdas que ocupa cada entidad (para release).
  private readonly _occupancy:   Map<string, string>   = new Map();
  private readonly _entityCells: Map<string, string[]> = new Map();

  constructor(scene: Scene) {
    this._scene = scene;
  }

  // ── API publica: grid ────────────────────────────────────────────────────────

  /**
   * Construye el suelo + lineas en la escena (lazy: solo se ejecuta la primera vez).
   * show() llama a build() automaticamente.
   */
  build(): void {
    if (this._built) { return; }
    this._buildFloor();
    this._buildLines();
    this._built = true;
  }

  /** Muestra el grid. Lo construye si es la primera llamada. */
  show(): void {
    if (!this._built) { this.build(); }
    if (this._floor !== null) { this._floor.isVisible = true; }
    for (const l of this._lines) { l.isVisible = true; }
  }

  /** Oculta todos los meshes del grid sin destruirlos. */
  hide(): void {
    if (this._floor !== null) { this._floor.isVisible = false; }
    for (const l of this._lines) { l.isVisible = false; }
  }

  /**
   * Convierte coordenada de celda (0-19, 0-19) a posicion mundial.
   * Devuelve el CENTRO de la celda a Y=0.
   *
   * @param cx  Columna (0 = izquierda del grid, 19 = derecha).
   * @param cz  Fila    (0 = frente del grid,    19 = fondo).
   */
  cellToWorld(cx: number, cz: number): Vector3 {
    const half = GRID_TOTAL / 2;
    return new Vector3(
      -half + cx * CELL_SIZE + CELL_SIZE / 2,
      0,
      -half + cz * CELL_SIZE + CELL_SIZE / 2,
    );
  }

  /**
   * Convierte posicion mundial a coordenada de celda.
   * El resultado esta clampeado a [0, 19].
   */
  worldToCell(pos: Vector3): { x: number; z: number } {
    const half = GRID_TOTAL / 2;
    const x = Math.max(0, Math.min(CELLS - 1, Math.floor((pos.x + half) / CELL_SIZE)));
    const z = Math.max(0, Math.min(CELLS - 1, Math.floor((pos.z + half) / CELL_SIZE)));
    return { x, z };
  }

  /**
   * Comprueba si una coordenada de celda está dentro del tablero (0 ≤ x,z < 20).
   * Útil para filtrar casillas adyacentes en pathfinding y cálculos de rango.
   */
  isInBounds(cx: number, cz: number): boolean {
    return cx >= 0 && cx < CELLS && cz >= 0 && cz < CELLS;
  }

  /** Destruye todos los meshes del grid, libera la fisica y limpia la ocupacion. */
  dispose(): void {
    this._physics?.dispose();
    this._physics = null;
    this._floor?.dispose();
    this._floor = null;
    for (const l of this._lines) { l.dispose(); }
    this._lines = [];
    this._occupancy.clear();
    this._entityCells.clear();
    this._built = false;
  }

  // ── API publica: sistema de ocupacion ────────────────────────────────────────

  /**
   * Marca las celdas del footprint de una entidad como ocupadas.
   *
   * Soporta footprints multi-casilla:
   *   - 1x1: jugador, Rusty, enemigos genericos.
   *   - 2x2, 3x3, etc.: jefes (Sprint 5+).
   *
   * Precondicion: llamar isAreaFree() antes para validar.
   * Si alguna celda ya esta ocupada, se sobreescribe sin error.
   *
   * @param entityId   Identificador unico de la entidad (p.ej. 'player', 'rusty').
   * @param anchorX    Columna de la celda ancla (esquina XZ minima del footprint).
   * @param anchorZ    Fila de la celda ancla.
   * @param footprintW Anchura del footprint en celdas (eje X).
   * @param footprintH Profundidad del footprint en celdas (eje Z).
   */
  occupy(
    entityId:   string,
    anchorX:    number,
    anchorZ:    number,
    footprintW: number,
    footprintH: number,
  ): void {
    const keys: string[] = [];
    for (let dx = 0; dx < footprintW; dx++) {
      for (let dz = 0; dz < footprintH; dz++) {
        const key = `${anchorX + dx},${anchorZ + dz}`;
        this._occupancy.set(key, entityId);
        keys.push(key);
      }
    }
    this._entityCells.set(entityId, keys);
  }

  /**
   * Libera todas las celdas ocupadas por la entidad indicada.
   * No hace nada si la entidad no estaba registrada.
   *
   * @param entityId Identificador de la entidad a liberar.
   */
  release(entityId: string): void {
    const keys = this._entityCells.get(entityId);
    if (keys === undefined) { return; }
    for (const key of keys) {
      this._occupancy.delete(key);
    }
    this._entityCells.delete(entityId);
  }

  /**
   * Comprueba si todas las celdas del footprint indicado estan libres.
   *
   * @param anchorX    Columna de la celda ancla.
   * @param anchorZ    Fila de la celda ancla.
   * @param footprintW Anchura del footprint en celdas (eje X).
   * @param footprintH Profundidad del footprint en celdas (eje Z).
   * @param ignoreId   Si se indica, las celdas ocupadas por esta entidad
   *                   se consideran libres (util al calcular movimiento propio).
   */
  isAreaFree(
    anchorX:    number,
    anchorZ:    number,
    footprintW: number,
    footprintH: number,
    ignoreId:   string | undefined = undefined,
  ): boolean {
    for (let dx = 0; dx < footprintW; dx++) {
      for (let dz = 0; dz < footprintH; dz++) {
        const key     = `${anchorX + dx},${anchorZ + dz}`;
        const occupant = this._occupancy.get(key);
        if (occupant !== undefined && occupant !== ignoreId) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Devuelve el entityId que ocupa la celda indicada, o null si esta libre.
   *
   * @param cx Columna de la celda (0-19).
   * @param cz Fila de la celda (0-19).
   */
  occupantAt(cx: number, cz: number): string | null {
    return this._occupancy.get(`${cx},${cz}`) ?? null;
  }

  // ── Construccion interna ─────────────────────────────────────────────────────

  private _buildFloor(): void {
    const floor = MeshBuilder.CreateBox(
      'combatFloor',
      { width: GRID_TOTAL, height: 0.2, depth: GRID_TOTAL },
      this._scene,
    );
    floor.position.y = FLOOR_Y;
    floor.isPickable = true;

    const mat = new StandardMaterial('combatFloorMat', this._scene);
    mat.diffuseColor          = new Color3(0.12, 0.14, 0.18);
    mat.emissiveColor         = new Color3(0.05, 0.06, 0.08);
    mat.specularColor         = new Color3(0, 0, 0);
    mat.maxSimultaneousLights = 8;
    floor.material = mat;

    this._physics = new PhysicsAggregate(
      floor,
      PhysicsShapeType.BOX,
      { mass: 0, restitution: 0, friction: 0.8 },
      this._scene,
    );

    this._floor = floor;
  }

  private _buildLines(): void {
    const half = GRID_TOTAL / 2;

    for (let i = 0; i <= CELLS; i++) {
      const pos = -half + i * CELL_SIZE;

      // Lineas paralelas al eje Z (columnas)
      const lx = MeshBuilder.CreateLines(
        `combatLineX_${i}`,
        {
          points: [new Vector3(pos, LINE_Y, -half), new Vector3(pos, LINE_Y, half)],
          colors: [LINE_COLOR.toColor4(LINE_ALPHA), LINE_COLOR.toColor4(LINE_ALPHA)],
        },
        this._scene,
      );
      this._lines.push(lx);

      // Lineas paralelas al eje X (filas)
      const lz = MeshBuilder.CreateLines(
        `combatLineZ_${i}`,
        {
          points: [new Vector3(-half, LINE_Y, pos), new Vector3(half, LINE_Y, pos)],
          colors: [LINE_COLOR.toColor4(LINE_ALPHA), LINE_COLOR.toColor4(LINE_ALPHA)],
        },
        this._scene,
      );
      this._lines.push(lz);
    }
  }
}
