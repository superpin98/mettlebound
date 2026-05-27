import { describe, it, expect } from 'vitest';
import { Grid } from '@/game/world/Grid';
import type { GridConfig } from '@/game/world/Grid';

// ============================================================
// Helper de construccion
// ============================================================

const makeGrid = (overrides: Partial<GridConfig> = {}): Grid =>
  new Grid({
    cols:     5,
    rows:     5,
    origin:   { x: 0, y: 0, z: 0 },
    tileSize: 1,
    ...overrides,
  });

// ============================================================
// Tests
// ============================================================

describe('Grid', () => {

  // ——————————————————————————————————————————
  // Construccion
  // ——————————————————————————————————————————

  describe('construccion', () => {
    it('crea la cuadricula con dimensiones correctas', () => {
      const grid = makeGrid({ cols: 4, rows: 6 });
      expect(grid.cols).toBe(4);
      expect(grid.rows).toBe(6);
      expect(grid.tiles.length).toBe(6);       // filas (rows)
      expect(grid.tiles[0].length).toBe(4);    // columnas (cols)
    });

    it('todos los tiles se crean como no bloqueados por defecto', () => {
      const grid = makeGrid();
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          expect(grid.tiles[r][c].blocked).toBe(false);
        }
      }
    });

    it('todos los tiles tienen temperatura neutral por defecto', () => {
      const grid = makeGrid();
      expect(grid.tiles[0][0].temperature).toBe('neutral');
    });

    it('todos los tiles tienen baseTerrain stone por defecto', () => {
      const grid = makeGrid();
      expect(grid.tiles[2][3].baseTerrain).toBe('stone');
    });

    it('los gridCoord de cada tile son correctos', () => {
      const grid = makeGrid({ cols: 4, rows: 4 });
      expect(grid.tiles[2][1].gridCoord).toEqual({ col: 1, row: 2 });
      expect(grid.tiles[0][0].gridCoord).toEqual({ col: 0, row: 0 });
      expect(grid.tiles[3][3].gridCoord).toEqual({ col: 3, row: 3 });
    });

    it('respeta el tileSize asignado', () => {
      const grid = makeGrid({ tileSize: 2 });
      expect(grid.tileSize).toBe(2);
    });

    it('respeta el origin asignado', () => {
      const origin = { x: -5, y: 0, z: -5 };
      const grid = makeGrid({ origin });
      expect(grid.origin).toEqual(origin);
    });
  });

  // ——————————————————————————————————————————
  // getTile
  // ——————————————————————————————————————————

  describe('getTile', () => {
    it('devuelve el tile en coordenadas validas', () => {
      const grid = makeGrid();
      const tile = grid.getTile(2, 3);
      expect(tile).not.toBeNull();
      expect(tile!.gridCoord).toEqual({ col: 2, row: 3 });
    });

    it('devuelve el tile en esquinas', () => {
      const grid = makeGrid({ cols: 5, rows: 5 });
      expect(grid.getTile(0, 0)).not.toBeNull();
      expect(grid.getTile(4, 4)).not.toBeNull();
      expect(grid.getTile(0, 4)).not.toBeNull();
      expect(grid.getTile(4, 0)).not.toBeNull();
    });

    it('devuelve null fuera de limites -- negativos', () => {
      const grid = makeGrid();
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, -1)).toBeNull();
      expect(grid.getTile(-1, -1)).toBeNull();
    });

    it('devuelve null fuera de limites -- exceso', () => {
      const grid = makeGrid({ cols: 5, rows: 5 });
      expect(grid.getTile(5, 0)).toBeNull();
      expect(grid.getTile(0, 5)).toBeNull();
      expect(grid.getTile(5, 5)).toBeNull();
    });
  });

  // ——————————————————————————————————————————
  // isInBounds
  // ——————————————————————————————————————————

  describe('isInBounds', () => {
    it('devuelve true para coordenadas validas', () => {
      const grid = makeGrid({ cols: 10, rows: 10 });
      expect(grid.isInBounds(0, 0)).toBe(true);
      expect(grid.isInBounds(9, 9)).toBe(true);
      expect(grid.isInBounds(5, 5)).toBe(true);
    });

    it('devuelve false para negativos', () => {
      const grid = makeGrid();
      expect(grid.isInBounds(-1, 0)).toBe(false);
      expect(grid.isInBounds(0, -1)).toBe(false);
    });

    it('devuelve false cuando col o row igualan cols/rows (fuera por 1)', () => {
      const grid = makeGrid({ cols: 5, rows: 5 });
      expect(grid.isInBounds(5, 0)).toBe(false);
      expect(grid.isInBounds(0, 5)).toBe(false);
    });
  });

  // ——————————————————————————————————————————
  // gridToWorld
  // ——————————————————————————————————————————

  describe('gridToWorld', () => {
    it('devuelve el centro del tile (tileSize=1, origin=0,0,0)', () => {
      const grid = makeGrid({ origin: { x: 0, y: 0, z: 0 }, tileSize: 1 });
      const pos = grid.gridToWorld(0, 0);
      expect(pos.x).toBeCloseTo(0.5);
      expect(pos.y).toBe(0);
      expect(pos.z).toBeCloseTo(0.5);
    });

    it('calcula correctamente con origin desplazado', () => {
      const grid = makeGrid({ origin: { x: -5, y: 0, z: -5 }, tileSize: 1 });
      const pos = grid.gridToWorld(0, 0);
      expect(pos.x).toBeCloseTo(-4.5);
      expect(pos.z).toBeCloseTo(-4.5);
    });

    it('calcula posicion interior correctamente', () => {
      // Con origin=(-5,0,-5), col=5, row=5 -> centro en (0.5, 0, 0.5)
      const grid = makeGrid({ cols: 10, rows: 10, origin: { x: -5, y: 0, z: -5 }, tileSize: 1 });
      const pos = grid.gridToWorld(5, 5);
      expect(pos.x).toBeCloseTo(0.5);
      expect(pos.z).toBeCloseTo(0.5);
    });

    it('position.y siempre es 0', () => {
      const grid = makeGrid();
      expect(grid.gridToWorld(2, 3).y).toBe(0);
      expect(grid.gridToWorld(0, 0).y).toBe(0);
    });

    it('tileSize=2 duplica el espaciado', () => {
      const grid = makeGrid({ origin: { x: 0, y: 0, z: 0 }, tileSize: 2 });
      const pos = grid.gridToWorld(1, 1);
      expect(pos.x).toBeCloseTo(3);  // 0 + 1*2 + 2/2 = 3
      expect(pos.z).toBeCloseTo(3);
    });
  });

  // ——————————————————————————————————————————
  // worldToGrid
  // ——————————————————————————————————————————

  describe('worldToGrid', () => {
    it('convierte coordenada world a grid (origin=0,0,0)', () => {
      const grid = makeGrid({ origin: { x: 0, y: 0, z: 0 }, tileSize: 1 });
      expect(grid.worldToGrid(0.5, 0.5)).toEqual({ col: 0, row: 0 });
    });

    it('convierte correctamente con origin desplazado', () => {
      const grid = makeGrid({ cols: 10, rows: 10, origin: { x: -5, y: 0, z: -5 }, tileSize: 1 });
      const coord = grid.worldToGrid(0, 0);
      expect(coord).toEqual({ col: 5, row: 5 });
    });

    it('devuelve null fuera del area del grid (borde izquierdo)', () => {
      const grid = makeGrid({ cols: 5, rows: 5, origin: { x: 0, y: 0, z: 0 }, tileSize: 1 });
      expect(grid.worldToGrid(-0.1, 0.5)).toBeNull();
    });

    it('devuelve null fuera del area del grid (borde derecho)', () => {
      const grid = makeGrid({ cols: 5, rows: 5, origin: { x: 0, y: 0, z: 0 }, tileSize: 1 });
      expect(grid.worldToGrid(5.1, 0.5)).toBeNull();
    });

    it('worldToGrid y gridToWorld son inversos', () => {
      const grid = makeGrid({ cols: 10, rows: 10, origin: { x: -5, y: 0, z: -5 }, tileSize: 1 });
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const world = grid.gridToWorld(c, r);
          const back  = grid.worldToGrid(world.x, world.z);
          expect(back).toEqual({ col: c, row: r });
        }
      }
    });

    it('acepta punto en el borde exacto del tile (limite izquierdo)', () => {
      const grid = makeGrid({ cols: 5, rows: 5, origin: { x: 0, y: 0, z: 0 }, tileSize: 1 });
      expect(grid.worldToGrid(0, 0)).toEqual({ col: 0, row: 0 });
    });
  });

  // ——————————————————————————————————————————
  // setTileBlocked
  // ——————————————————————————————————————————

  describe('setTileBlocked', () => {
    it('marca un tile como bloqueado', () => {
      const grid = makeGrid();
      grid.setTileBlocked(2, 2, true);
      expect(grid.getTile(2, 2)!.blocked).toBe(true);
    });

    it('puede desbloquear un tile', () => {
      const grid = makeGrid();
      grid.setTileBlocked(2, 2, true);
      grid.setTileBlocked(2, 2, false);
      expect(grid.getTile(2, 2)!.blocked).toBe(false);
    });

    it('no afecta a tiles adyacentes', () => {
      const grid = makeGrid();
      grid.setTileBlocked(2, 2, true);
      expect(grid.getTile(1, 2)!.blocked).toBe(false);
      expect(grid.getTile(3, 2)!.blocked).toBe(false);
      expect(grid.getTile(2, 1)!.blocked).toBe(false);
      expect(grid.getTile(2, 3)!.blocked).toBe(false);
    });

    it('no lanza error con coordenadas fuera de limites', () => {
      const grid = makeGrid();
      expect(() => grid.setTileBlocked(99, 99, true)).not.toThrow();
      expect(() => grid.setTileBlocked(-1, -1, true)).not.toThrow();
    });

    it('puede bloquear todo el perimetro de un grid 10x10', () => {
      const grid = makeGrid({ cols: 10, rows: 10 });
      for (let c = 0; c < 10; c++) {
        grid.setTileBlocked(c, 0, true);
        grid.setTileBlocked(c, 9, true);
      }
      for (let r = 1; r < 9; r++) {
        grid.setTileBlocked(0, r, true);
        grid.setTileBlocked(9, r, true);
      }
      // Verificar esquinas y centros de cada lado
      expect(grid.getTile(0, 0)!.blocked).toBe(true);
      expect(grid.getTile(9, 9)!.blocked).toBe(true);
      expect(grid.getTile(5, 0)!.blocked).toBe(true);
      expect(grid.getTile(5, 9)!.blocked).toBe(true);
      // Interior libre
      expect(grid.getTile(5, 5)!.blocked).toBe(false);
    });
  });

});
