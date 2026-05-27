import type { Vec3 } from '@/types/spatial.types';
import { Tile } from '@/game/world/Tile';

// ============================================================
// GridConfig -- parametros de construccion
// ============================================================

export interface GridConfig {
  /** Numero de columnas (eje X). */
  cols: number;
  /** Numero de filas (eje Z). */
  rows: number;
  /**
   * Esquina inferior izquierda del grid en coordenadas world.
   * origin.y = 0 por convencion (todos los tiles a nivel suelo).
   */
  origin: Vec3;
  /**
   * Tamano de cada tile en unidades Babylon.
   * Convencion del juego: 1.0 (1 unidad Babylon = 1 tile tactico).
   */
  tileSize: number;
}

// ============================================================
// Grid -- cuadricula tactica 2D
// ============================================================

/**
 * Organiza Tiles en una cuadricula bidimensional (cols x rows).
 *
 * Ejes:
 *   col → eje X de Babylon (Este)
 *   row → eje Z de Babylon (Norte)
 *
 * Acceso: tiles[row][col]  (fila primero, columna segundo).
 *
 * Grid es puro TypeScript: no importa Babylon.js.
 * GridRenderer es la capa visual separada que si usa Babylon.
 */
export class Grid {
  readonly cols:     number;
  readonly rows:     number;
  readonly origin:   Vec3;
  readonly tileSize: number;

  /**
   * Cuadricula interna: tiles[row][col].
   * row 0 = fila sur (Z minima), row N-1 = fila norte (Z maxima).
   * col 0 = columna oeste (X minima), col N-1 = columna este (X maxima).
   */
  readonly tiles: Tile[][];

  constructor(config: GridConfig) {
    this.cols     = config.cols;
    this.rows     = config.rows;
    this.origin   = config.origin;
    this.tileSize = config.tileSize;
    this.tiles    = this._buildTiles();
  }

  // ——————————————————————————————————————————
  // API publica
  // ——————————————————————————————————————————

  /**
   * Devuelve el Tile en (col, row), o null si fuera de limites.
   */
  getTile(col: number, row: number): Tile | null {
    if (!this.isInBounds(col, row)) { return null; }
    return this.tiles[row][col] ?? null;
  }

  /**
   * Convierte una posicion world (X, Z) a coordenada de grid.
   * Devuelve null si el punto cae fuera del area del grid.
   *
   * El parametro worldY se ignora (todos los tiles a Y=0).
   */
  worldToGrid(worldX: number, worldZ: number): { col: number; row: number } | null {
    const col = Math.floor((worldX - this.origin.x) / this.tileSize);
    const row = Math.floor((worldZ - this.origin.z) / this.tileSize);
    if (!this.isInBounds(col, row)) { return null; }
    return { col, row };
  }

  /**
   * Devuelve el CENTRO del tile (col, row) en coordenadas world.
   * position.y = 0 siempre (todos los tiles a nivel suelo).
   *
   * No comprueba limites: util para pre-calcular posiciones conocidas.
   * Usar isInBounds() antes si las coordenadas son dinamicas.
   */
  gridToWorld(col: number, row: number): Vec3 {
    return {
      x: this.origin.x + col * this.tileSize + this.tileSize / 2,
      y: 0,
      z: this.origin.z + row * this.tileSize + this.tileSize / 2,
    };
  }

  /**
   * Marca o desmarca un tile como bloqueado.
   * No lanza error si las coordenadas estan fuera de limites.
   */
  setTileBlocked(col: number, row: number, blocked: boolean): void {
    const tile = this.getTile(col, row);
    if (tile !== null) { tile.blocked = blocked; }
  }

  /**
   * Devuelve true si (col, row) esta dentro del area del grid.
   */
  isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  // ——————————————————————————————————————————
  // Construccion interna
  // ——————————————————————————————————————————

  private _buildTiles(): Tile[][] {
    const grid: Tile[][] = [];
    for (let row = 0; row < this.rows; row++) {
      const rowArr: Tile[] = [];
      for (let col = 0; col < this.cols; col++) {
        rowArr.push(
          new Tile({
            position:    this.gridToWorld(col, row),
            gridCoord:   { col, row },
            baseTerrain: 'stone',
            fluids:      new Set(),
            modifiers:   new Set(),
            temperature: 'neutral',
            height:      0,
            blocked:     false,
          }),
        );
      }
      grid.push(rowArr);
    }
    return grid;
  }
}
