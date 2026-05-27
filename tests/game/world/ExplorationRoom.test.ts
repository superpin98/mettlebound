// Mocks hoisted por Vitest -- deben estar antes de los imports del codigo real.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  TransformNode: class MockTransformNode {
    name: string;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  },
}));

import { ExplorationRoom } from '@/game/world/ExplorationRoom';
import type { RoomRect } from '@/game/world/ExplorationRoom';
import type { Scene } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';
import type { Vec3 } from '@/types/spatial.types';
import type { RoomShape, ConnectionPoint } from '@/game/world/types/room.types';

// ============================================================
// Stub concreto de ExplorationRoom para tests
// ============================================================

/** Implementacion minima que permite instanciar la clase abstracta. */
class StubExplorationRoom extends ExplorationRoom {
  readonly shape: RoomShape = 'rectangular';

  protected async _buildImpl(): Promise<void> {
    // no-op -- los tests controlan directamente las colecciones via los helpers.
  }

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  // ─── Acceso a metodos protegidos (para tests) ─────────────────

  callAddArea(rect: RoomRect): void  { this.addArea(rect); }
  callCutArea(rect: RoomRect): void  { this.cutArea(rect); }
  callAddPillar(pos: Vec3): void     { this.addPillar(pos); }
  callAddDoor(point: ConnectionPoint): void { this.addDoor(point); }

  // ─── Acceso a colecciones protegidas (para tests) ────────────

  get areas():        RoomRect[]        { return this._areas; }
  get cuts():         RoomRect[]        { return this._cuts; }
  get pillars():      Vec3[]            { return this._pillars; }
  get interactables() { return this._interactables; }
}

const MOCK_SCENE         = {} as unknown as Scene;
const MOCK_ASSET_MANAGER = {} as unknown as AssetManager;

// ============================================================
// Tests
// ============================================================

describe('ExplorationRoom', () => {
  let room: StubExplorationRoom;

  beforeEach(() => {
    room = new StubExplorationRoom({
      id:           'stub_01',
      scene:        MOCK_SCENE,
      assetManager: MOCK_ASSET_MANAGER,
    });
  });

  // ──────────────────────────────────────────
  // Identidad
  // ──────────────────────────────────────────

  describe('identidad', () => {
    it('mode es siempre "exploration"', () => {
      expect(room.mode).toBe('exploration');
    });

    it('isBuilt es false antes de build()', () => {
      expect(room.isBuilt).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // Estado inicial de colecciones
  // ──────────────────────────────────────────

  describe('estado inicial', () => {
    it('_areas arranca vacio', () => {
      expect(room.areas).toHaveLength(0);
    });

    it('_cuts arranca vacio', () => {
      expect(room.cuts).toHaveLength(0);
    });

    it('_pillars arranca vacio', () => {
      expect(room.pillars).toHaveLength(0);
    });

    it('_interactables arranca vacio', () => {
      expect(room.interactables).toHaveLength(0);
    });

    it('getConnectionPoints devuelve array vacio', () => {
      expect(room.getConnectionPoints()).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────
  // addArea
  // ──────────────────────────────────────────

  describe('addArea', () => {
    it('almacena la rect en _areas', () => {
      const rect: RoomRect = { x: 0, z: 0, width: 10, depth: 10 };
      room.callAddArea(rect);
      expect(room.areas).toHaveLength(1);
      expect(room.areas[0]).toEqual(rect);
    });

    it('multiples addArea acumulan todas las rects', () => {
      room.callAddArea({ x: 0,  z: 0, width: 10, depth: 10 });
      room.callAddArea({ x: 10, z: 0, width: 5,  depth: 10 });
      expect(room.areas).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────
  // cutArea
  // ──────────────────────────────────────────

  describe('cutArea', () => {
    it('almacena el recorte en _cuts', () => {
      const cut: RoomRect = { x: 8, z: 0, width: 2, depth: 5 };
      room.callCutArea(cut);
      expect(room.cuts).toHaveLength(1);
      expect(room.cuts[0]).toEqual(cut);
    });

    it('multiples cutArea se acumulan', () => {
      room.callCutArea({ x: 0, z: 0, width: 2, depth: 2 });
      room.callCutArea({ x: 8, z: 8, width: 2, depth: 2 });
      expect(room.cuts).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────
  // addPillar
  // ──────────────────────────────────────────

  describe('addPillar', () => {
    it('almacena la posicion en _pillars', () => {
      const pos: Vec3 = { x: 2, y: 0, z: 3 };
      room.callAddPillar(pos);
      expect(room.pillars).toHaveLength(1);
      expect(room.pillars[0]).toEqual(pos);
    });

    it('multiples pilares se acumulan', () => {
      room.callAddPillar({ x: 2, y: 0, z:  2 });
      room.callAddPillar({ x: 2, y: 0, z: -2 });
      expect(room.pillars).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────
  // addDoor
  // ──────────────────────────────────────────

  describe('addDoor', () => {
    it('popula _connectionPoints', () => {
      const door: ConnectionPoint = {
        id:            'door_north_01',
        direction:     'north',
        worldPosition: { x: 0, y: 0, z: 5 },
        isOpen:        true,
        linkedRoomId:  null,
      };
      room.callAddDoor(door);
      expect(room.getConnectionPoints()).toHaveLength(1);
      expect(room.getConnectionPoints()[0]?.id).toBe('door_north_01');
    });

    it('multiples puertas se acumulan', () => {
      room.callAddDoor({ id: 'door_north_01', direction: 'north', worldPosition: { x: 0, y: 0, z:  5 }, isOpen: true, linkedRoomId: null });
      room.callAddDoor({ id: 'door_south_01', direction: 'south', worldPosition: { x: 0, y: 0, z: -5 }, isOpen: true, linkedRoomId: null });
      expect(room.getConnectionPoints()).toHaveLength(2);
    });

    it('getConnectionPoints devuelve copia defensiva (inmutabilidad)', () => {
      room.callAddDoor({ id: 'door_north_01', direction: 'north', worldPosition: { x: 0, y: 0, z: 5 }, isOpen: true, linkedRoomId: null });
      const cp1 = room.getConnectionPoints();
      const cp2 = room.getConnectionPoints();
      expect(cp1).not.toBe(cp2);
    });
  });

  // ──────────────────────────────────────────
  // build() (heredado de Room)
  // ──────────────────────────────────────────

  describe('build', () => {
    it('isBuilt es true despues de build()', async () => {
      await room.build();
      expect(room.isBuilt).toBe(true);
    });

    it('segunda llamada a build() no lanza error', async () => {
      await room.build();
      await expect(room.build()).resolves.toBeUndefined();
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
  });
});
