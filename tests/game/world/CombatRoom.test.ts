// Mocks hoisted por Vitest -- deben estar antes de los imports del codigo real.
// Patron identico al de AssetManager.test.ts.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  TransformNode: class MockTransformNode {
    name: string;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  },
}));

vi.mock('@/game/world/GridRenderer', () => ({
  GridRenderer: class MockGridRenderer {
    toggle    = vi.fn();
    show      = vi.fn();
    hide      = vi.fn();
    isVisible = false;
  },
}));

import { CombatRoom } from '@/game/world/CombatRoom';
import type { Scene } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';

const MOCK_SCENE         = {} as unknown as Scene;
const MOCK_ASSET_MANAGER = {} as unknown as AssetManager;

// ============================================================
// Tests
// ============================================================

describe('CombatRoom', () => {
  let room: CombatRoom;

  beforeEach(() => {
    room = new CombatRoom({
      id:           'combat_01',
      scene:        MOCK_SCENE,
      assetManager: MOCK_ASSET_MANAGER,
      sourceRoomId: 'hub_01',
    });
  });

  // ──────────────────────────────────────────
  // Identidad
  // ──────────────────────────────────────────

  describe('identidad', () => {
    it('mode es "combat"', () => {
      expect(room.mode).toBe('combat');
    });

    it('shape es "rectangular"', () => {
      expect(room.shape).toBe('rectangular');
    });

    it('sourceRoomId se almacena correctamente', () => {
      expect(room.sourceRoomId).toBe('hub_01');
    });

    it('themeHint es undefined si no se provee', () => {
      expect(room.themeHint).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────
  // Estado antes de build()
  // ──────────────────────────────────────────

  describe('estado antes de build()', () => {
    it('isBuilt es false', () => {
      expect(room.isBuilt).toBe(false);
    });

    it('grid es null', () => {
      expect(room.grid).toBeNull();
    });

    it('gridRenderer es null', () => {
      expect(room.gridRenderer).toBeNull();
    });

    it('getConnectionPoints devuelve array vacio (CombatRoom no tiene puertas propias)', () => {
      expect(room.getConnectionPoints()).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────
  // Tras build()
  // ──────────────────────────────────────────

  describe('tras build()', () => {
    beforeEach(async () => {
      await room.build();
    });

    it('isBuilt es true', () => {
      expect(room.isBuilt).toBe(true);
    });

    it('grid esta creado (no es null)', () => {
      expect(room.grid).not.toBeNull();
    });

    it('grid tiene 10 columnas por defecto', () => {
      expect(room.grid?.cols).toBe(10);
    });

    it('grid tiene 10 filas por defecto', () => {
      expect(room.grid?.rows).toBe(10);
    });

    it('esquinas del perimetro estan bloqueadas', () => {
      const g = room.grid!;
      expect(g.getTile(0, 0)?.blocked).toBe(true);
      expect(g.getTile(9, 0)?.blocked).toBe(true);
      expect(g.getTile(0, 9)?.blocked).toBe(true);
      expect(g.getTile(9, 9)?.blocked).toBe(true);
    });

    it('fila inferior (row=0) completa esta bloqueada', () => {
      const g = room.grid!;
      for (let c = 0; c < 10; c++) {
        expect(g.getTile(c, 0)?.blocked).toBe(true);
      }
    });

    it('tiles interiores no estan bloqueados', () => {
      const g = room.grid!;
      expect(g.getTile(5, 5)?.blocked).toBe(false);
      expect(g.getTile(1, 1)?.blocked).toBe(false);
      expect(g.getTile(8, 8)?.blocked).toBe(false);
    });

    it('gridRenderer esta creado (no es null)', () => {
      expect(room.gridRenderer).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // Config personalizada
  // ──────────────────────────────────────────

  describe('config personalizada', () => {
    it('respeta cols y rows del config', async () => {
      const custom = new CombatRoom({
        id:           'combat_custom',
        scene:        MOCK_SCENE,
        assetManager: MOCK_ASSET_MANAGER,
        sourceRoomId: 'hub_02',
        cols:         8,
        rows:         6,
      });
      await custom.build();
      expect(custom.grid?.cols).toBe(8);
      expect(custom.grid?.rows).toBe(6);
    });

    it('themeHint se almacena si se provee', () => {
      const themed = new CombatRoom({
        id:           'combat_themed',
        scene:        MOCK_SCENE,
        assetManager: MOCK_ASSET_MANAGER,
        sourceRoomId: 'hub_03',
        themeHint:    'dungeon_stone',
      });
      expect(themed.themeHint).toBe('dungeon_stone');
    });
  });

  // ──────────────────────────────────────────
  // getSpawnPoint
  // ──────────────────────────────────────────

  describe('getSpawnPoint', () => {
    it('devuelve el centro geometrico (0, 0, 0)', () => {
      expect(room.getSpawnPoint()).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  // ──────────────────────────────────────────
  // dispose
  // ──────────────────────────────────────────

  describe('dispose', () => {
    it('dispose tras build() resetea isBuilt a false', async () => {
      await room.build();
      room.dispose();
      expect(room.isBuilt).toBe(false);
    });

    it('dispose limpia grid a null', async () => {
      await room.build();
      room.dispose();
      expect(room.grid).toBeNull();
    });

    it('dispose limpia gridRenderer a null', async () => {
      await room.build();
      room.dispose();
      expect(room.gridRenderer).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // build() guard (heredado de Room)
  // ──────────────────────────────────────────

  describe('build guard', () => {
    it('segunda llamada a build() no duplica el grid', async () => {
      await room.build();
      const gridRef = room.grid;
      await room.build(); // no-op por el guard
      expect(room.grid).toBe(gridRef); // misma referencia
    });
  });
});
