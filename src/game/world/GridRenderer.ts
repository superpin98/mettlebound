import { Scene, MeshBuilder, Color3, Vector3 } from '@babylonjs/core';
import type { LinesMesh } from '@babylonjs/core';
import type { Grid } from '@/game/world/Grid';

// ============================================================
// Constante de visibilidad inicial
// ============================================================

/**
 * Por defecto el grid de debug es INVISIBLE.
 * Activar desde DevTools con: __mb.toggleGrid()
 * o acceder al renderer completo con: __mb.gridRenderer
 */
const DEBUG_GRID_VISIBLE = false;

// ============================================================
// GridRenderer -- visualizacion de debug del grid tactico
// ============================================================

/**
 * Renderiza el grid tactico con dos capas de LinesMesh:
 *
 *   1. _gridMesh    : lineas verdes semitransparentes para todas
 *                     las celdas del grid (subdivision 1u x 1u).
 *   2. _blockedMesh : outlines rojos para tiles bloqueados
 *                     (paredes, pilares, obstaculos).
 *
 * Ambas capas son invisibles por defecto (DEBUG_GRID_VISIBLE = false).
 * toggle() alterna entre visible / invisible.
 *
 * Uso desde DevTools (F12 > Console):
 *   __mb.toggleGrid()          // alterna visibilidad
 *   __mb.gridRenderer.show()   // fuerza visible
 *   __mb.gridRenderer.hide()   // fuerza invisible
 *
 * No modifica ninguna geometria jugable ni colisiones.
 * Solo para inspeccion visual del grid durante desarrollo.
 */
export class GridRenderer {
  private _gridMesh:    LinesMesh | null = null;
  private _blockedMesh: LinesMesh | null = null;
  private _visible:     boolean = DEBUG_GRID_VISIBLE;

  constructor(scene: Scene, grid: Grid) {
    this._buildGridLines(scene, grid);
    this._buildBlockedHighlights(scene, grid);
    this._applyVisibility();
  }

  // ——————————————————————————————————————————
  // API publica
  // ——————————————————————————————————————————

  /** Alterna entre visible e invisible. */
  toggle(): void {
    this._visible = !this._visible;
    this._applyVisibility();
  }

  /** Fuerza la visualizacion del grid. */
  show(): void {
    this._visible = true;
    this._applyVisibility();
  }

  /** Oculta el grid de debug. */
  hide(): void {
    this._visible = false;
    this._applyVisibility();
  }

  /** Devuelve si el grid esta actualmente visible. */
  get isVisible(): boolean {
    return this._visible;
  }

  // ——————————————————————————————————————————
  // Construccion de meshes de lineas
  // ——————————————————————————————————————————

  /**
   * Construye un LineSystem con todas las lineas de la cuadricula.
   * Lineas verticales (a lo largo de Z) + horizontales (a lo largo de X).
   * Se elevan Y=0.02 sobre el suelo para evitar z-fighting.
   */
  private _buildGridLines(scene: Scene, grid: Grid): void {
    const Y   = 0.02;
    const ox  = grid.origin.x;
    const oz  = grid.origin.z;
    const w   = grid.cols * grid.tileSize;
    const d   = grid.rows * grid.tileSize;
    const ts  = grid.tileSize;

    const lines: Vector3[][] = [];

    // Lineas verticales (paralelas al eje Z)
    for (let c = 0; c <= grid.cols; c++) {
      const x = ox + c * ts;
      lines.push([
        new Vector3(x, Y, oz),
        new Vector3(x, Y, oz + d),
      ]);
    }

    // Lineas horizontales (paralelas al eje X)
    for (let r = 0; r <= grid.rows; r++) {
      const z = oz + r * ts;
      lines.push([
        new Vector3(ox,     Y, z),
        new Vector3(ox + w, Y, z),
      ]);
    }

    this._gridMesh       = MeshBuilder.CreateLineSystem('debugGrid_lines', { lines }, scene);
    this._gridMesh.color = new Color3(0.2, 0.9, 0.2);
    this._gridMesh.alpha = 0.35;
  }

  /**
   * Construye un LineSystem con los outlines de todos los tiles bloqueados.
   * Cada outline es un cuadrado cerrado elevado Y=0.03 (por encima de las lineas de grid).
   * No se crea el mesh si no hay ningún tile bloqueado.
   */
  private _buildBlockedHighlights(scene: Scene, grid: Grid): void {
    const Y  = 0.03;
    const ts = grid.tileSize;
    const lines: Vector3[][] = [];

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const tile = grid.getTile(col, row);
        if (tile === null || !tile.blocked) { continue; }

        const x0 = grid.origin.x + col * ts;
        const z0 = grid.origin.z + row * ts;
        const x1 = x0 + ts;
        const z1 = z0 + ts;

        // Cuadrado cerrado (5 puntos para cerrar el loop)
        lines.push([
          new Vector3(x0, Y, z0),
          new Vector3(x1, Y, z0),
          new Vector3(x1, Y, z1),
          new Vector3(x0, Y, z1),
          new Vector3(x0, Y, z0),
        ]);
      }
    }

    if (lines.length === 0) { return; }

    this._blockedMesh       = MeshBuilder.CreateLineSystem('debugGrid_blocked', { lines }, scene);
    this._blockedMesh.color = new Color3(0.9, 0.1, 0.1);
    this._blockedMesh.alpha = 0.75;
  }

  // ——————————————————————————————————————————
  // Estado de visibilidad
  // ——————————————————————————————————————————

  private _applyVisibility(): void {
    if (this._gridMesh    !== null) { this._gridMesh.isVisible    = this._visible; }
    if (this._blockedMesh !== null) { this._blockedMesh.isVisible = this._visible; }
  }
}
