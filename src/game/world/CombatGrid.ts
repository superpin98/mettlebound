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
// CombatGrid -- tablero táctico 20×20 para la escena de combate.
//
// 20 celdas × 20 celdas de 1 m cada una = grid de 20×20 m.
// Origen del mundo (0,0,0) = centro exacto del tablero.
//
// Uso:
//   const grid = new CombatGrid(scene);
//   grid.show();     // construye y muestra (lazy)
//   grid.hide();     // oculta sin destruir
//   grid.dispose();  // destruye todo
//
// Conversión de coordenadas:
//   grid.cellToWorld(cx, cz) → Vector3 (centro de la celda)
//   grid.worldToCell(pos)    → { x, z } en rango 0-19
// ============================================================

// ── Constantes ───────────────────────────────────────────────────────────────

const CELLS      = 20;              // 20×20 celdas tácticas
const CELL_SIZE  = 1;               // 1 metro por celda → grid 20×20 m
const GRID_TOTAL = CELLS * CELL_SIZE;
const FLOOR_Y    = -0.1;           // suelo ligeramente bajo el plano Y=0
const LINE_Y     = 0.01;           // líneas flotando 1 cm sobre el suelo

const LINE_COLOR = new Color3(0.35, 0.40, 0.55);
const LINE_ALPHA = 0.7;

// ── Clase ─────────────────────────────────────────────────────────────────────

export class CombatGrid {

  private readonly _scene: Scene;
  private _floor:   AbstractMesh | null     = null;
  private _lines:   AbstractMesh[]          = [];
  private _physics: PhysicsAggregate | null = null;
  private _built    = false;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * Construye el suelo + líneas en la escena (lazy: solo se ejecuta la primera vez).
   * show() llama a build() automáticamente.
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
   * Convierte coordenada de celda (0–19, 0–19) a posición mundial.
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
   * Convierte posición mundial a coordenada de celda.
   * El resultado está clampeado a [0, 19].
   */
  worldToCell(pos: Vector3): { x: number; z: number } {
    const half = GRID_TOTAL / 2;
    const x = Math.max(0, Math.min(CELLS - 1, Math.floor((pos.x + half) / CELL_SIZE)));
    const z = Math.max(0, Math.min(CELLS - 1, Math.floor((pos.z + half) / CELL_SIZE)));
    return { x, z };
  }

  /** Destruye todos los meshes del grid y libera la física. */
  dispose(): void {
    this._physics?.dispose();
    this._physics = null;
    this._floor?.dispose();
    this._floor = null;
    for (const l of this._lines) { l.dispose(); }
    this._lines = [];
    this._built = false;
  }

  // ── Construcción interna ─────────────────────────────────────────────────────

  private _buildFloor(): void {
    const floor = MeshBuilder.CreateBox(
      'combatFloor',
      { width: GRID_TOTAL, height: 0.2, depth: GRID_TOTAL },
      this._scene,
    );
    floor.position.y = FLOOR_Y;
    floor.isPickable = false;

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

      // Líneas paralelas al eje Z (columnas)
      const lx = MeshBuilder.CreateLines(
        `combatLineX_${i}`,
        {
          points: [new Vector3(pos, LINE_Y, -half), new Vector3(pos, LINE_Y, half)],
          colors: [LINE_COLOR.toColor4(LINE_ALPHA), LINE_COLOR.toColor4(LINE_ALPHA)],
        },
        this._scene,
      );
      this._lines.push(lx);

      // Líneas paralelas al eje X (filas)
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
