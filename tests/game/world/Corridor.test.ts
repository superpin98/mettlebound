// Mocks hoisted por Vitest -- deben estar antes de los imports del codigo real.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  TransformNode: class MockTransformNode {
    name: string;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  },
}));

import { Corridor } from '@/game/world/Corridor';
import type { Scene } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';

const MOCK_SCENE         = {} as unknown as Scene;
const MOCK_ASSET_MANAGER = {} as unknown as AssetManager;

// ============================================================
// Tests
// ============================================================

describe('Corridor', () => {
  let corridor: Corridor;

  beforeEach(() => {
    corridor = new Corridor({
      id:             'corridor_01',
      scene:          MOCK_SCENE,
      assetManager:   MOCK_ASSET_MANAGER,
      length:         12,
      startDirection: 'north',
    });
  });

  // ──────────────────────────────────────────
  // Identidad
  // ──────────────────────────────────────────

  describe('identidad', () => {
    it('mode es "exploration"', () => {
      expect(corridor.mode).toBe('exploration');
    });

    it('shape es "rectangular"', () => {
      expect(corridor.shape).toBe('rectangular');
    });
  });

  // ──────────────────────────────────────────
  // Config
  // ──────────────────────────────────────────

  describe('config', () => {
    it('length se almacena correctamente', () => {
      expect(corridor.length).toBe(12);
    });

    it('width por defecto es 3', () => {
      expect(corridor.width).toBe(3);
    });

    it('width personalizada se almacena', () => {
      const wide = new Corridor({
        id:             'corridor_wide',
        scene:          MOCK_SCENE,
        assetManager:   MOCK_ASSET_MANAGER,
        length:         10,
        width:          5,
        startDirection: 'east',
      });
      expect(wide.width).toBe(5);
    });

    it('startDirection se almacena', () => {
      expect(corridor.startDirection).toBe('north');
    });
  });

  // ──────────────────────────────────────────
  // Estado antes de build()
  // ──────────────────────────────────────────

  describe('estado antes de build()', () => {
    it('isBuilt es false', () => {
      expect(corridor.isBuilt).toBe(false);
    });

    it('no hay ConnectionPoints antes de build()', () => {
      expect(corridor.getConnectionPoints()).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────
  // Tras build() -- corredor norte-sur
  // ──────────────────────────────────────────

  describe('tras build() (startDirection = north)', () => {
    beforeEach(async () => {
      await corridor.build();
    });

    it('isBuilt es true', () => {
      expect(corridor.isBuilt).toBe(true);
    });

    it('tiene exactamente 2 ConnectionPoints (uno en cada extremo)', () => {
      expect(corridor.getConnectionPoints()).toHaveLength(2);
    });

    it('las dos puertas tienen direcciones north y south', () => {
      const dirs = corridor.getConnectionPoints().map(d => d.direction);
      expect(dirs).toContain('north');
      expect(dirs).toContain('south');
    });

    it('todas las puertas tienen isOpen = true', () => {
      for (const door of corridor.getConnectionPoints()) {
        expect(door.isOpen).toBe(true);
      }
    });

    it('todas las puertas tienen linkedRoomId = null', () => {
      for (const door of corridor.getConnectionPoints()) {
        expect(door.linkedRoomId).toBeNull();
      }
    });

    it('getConnectionPoints devuelve copia defensiva', () => {
      const cp1 = corridor.getConnectionPoints();
      const cp2 = corridor.getConnectionPoints();
      expect(cp1).not.toBe(cp2);
    });
  });

  // ──────────────────────────────────────────
  // Corredor este-oeste
  // ──────────────────────────────────────────

  describe('corredor este-oeste (startDirection = east)', () => {
    it('tiene puertas east y west', async () => {
      const ewCorridor = new Corridor({
        id:             'corridor_ew',
        scene:          MOCK_SCENE,
        assetManager:   MOCK_ASSET_MANAGER,
        length:         10,
        startDirection: 'east',
      });
      await ewCorridor.build();
      const dirs = ewCorridor.getConnectionPoints().map(d => d.direction);
      expect(dirs).toContain('east');
      expect(dirs).toContain('west');
    });
  });

  // ──────────────────────────────────────────
  // Corredor sur
  // ──────────────────────────────────────────

  describe('corredor sur (startDirection = south)', () => {
    it('tiene puertas south y north', async () => {
      const sCorridor = new Corridor({
        id:             'corridor_south',
        scene:          MOCK_SCENE,
        assetManager:   MOCK_ASSET_MANAGER,
        length:         8,
        startDirection: 'south',
      });
      await sCorridor.build();
      const dirs = sCorridor.getConnectionPoints().map(d => d.direction);
      expect(dirs).toContain('south');
      expect(dirs).toContain('north');
    });
  });

  // ──────────────────────────────────────────
  // getSpawnPoint
  // ──────────────────────────────────────────

  describe('getSpawnPoint', () => {
    it('devuelve el centro del corredor (0, 0, 0)', () => {
      expect(corridor.getSpawnPoint()).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  // ──────────────────────────────────────────
  // dispose
  // ──────────────────────────────────────────

  describe('dispose', () => {
    it('dispose tras build() resetea isBuilt a false', async () => {
      await corridor.build();
      corridor.dispose();
      expect(corridor.isBuilt).toBe(false);
    });
  });
});
