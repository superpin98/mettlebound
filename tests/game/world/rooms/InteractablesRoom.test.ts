// Mocks hoisted por Vitest.
import { vi, describe, it, expect, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const mockDispose = vi.fn();
  return { mockDispose };
});

vi.mock('@babylonjs/core', () => ({
  TransformNode: class MockTransformNode {
    name: string;
    rotation = { x: 0, y: 0, z: 0 };
    parent: unknown = null;
    dispose = h.mockDispose;
    constructor(name: string) { this.name = name; }
  },
  Vector3: class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    static Zero()  { return { x: 0, y: 0, z: 0 }; }
    static Up()    { return { x: 0, y: 1, z: 0 }; }
    static Cross() { return { x: 0, y: 0, z: 0 }; }
  },
  Color3: class MockColor3 {
    constructor(r = 0, g = 0, b = 0) { void r; void g; void b; }
  },
  MeshBuilder: {
    CreateBox:    vi.fn().mockReturnValue({ position: { x: 0, y: 0, z: 0 }, parent: null, material: null, dispose: vi.fn() }),
    CreateGround: vi.fn().mockReturnValue({ position: { x: 0, y: 0, z: 0 }, parent: null, dispose: vi.fn() }),
  },
  StandardMaterial: vi.fn().mockImplementation(function() {
    return { emissiveColor: null };
  }),
  PBRMaterial: class {},
}));

vi.mock('@/game/world/rooms/RoomGeometry', () => ({
  TORCH_Y:           1.0,
  TORCH_WALL_INSET:  0.25,
  buildMountedTorch: vi.fn().mockImplementation(() => ({
    diffuse: {}, intensity: 1.2, range: 6, parent: null,
  })),
  buildFloorMesh: vi.fn().mockReturnValue({ position: { x: 0, y: 0, z: 0 }, parent: null }),
  buildWallMesh:  vi.fn().mockReturnValue({ position: { x: 0, y: 0, z: 0 }, parent: null }),
}));

import { InteractablesRoom } from '@/game/world/rooms/InteractablesRoom';
import type { Scene } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';

function makeRoom(id = 'inter_01'): InteractablesRoom {
  return new InteractablesRoom({ id, scene: { materials: { forEach: vi.fn() }, markAllMaterialsAsDirty: vi.fn() } as unknown as Scene, assetManager: { loadAsset: vi.fn().mockResolvedValue({}), instantiate: vi.fn().mockReturnValue({ rootNode: { parent: null, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, dispose: vi.fn() }) } as unknown as AssetManager });
}

describe('InteractablesRoom', () => {
  let room: InteractablesRoom;

  beforeEach(() => {
    h.mockDispose.mockClear();
    room = makeRoom();
  });

  describe('identidad', () => {
    it('mode es exploration', () => {
      expect(room.mode).toBe('exploration');
    });

    it('shape es rectangular', () => {
      expect(room.shape).toBe('rectangular');
    });

    it('isBuilt es false antes de build()', () => {
      expect(room.isBuilt).toBe(false);
    });
  });

  describe('getSpawnPoint()', () => {
    it('devuelve y=0', () => {
      expect(room.getSpawnPoint().y).toBe(0);
    });

    it('devuelve x=0 (spawn central)', () => {
      expect(room.getSpawnPoint().x).toBe(0);
    });
  });

  describe('build()', () => {
    it('isBuilt es true tras build()', async () => {
      await room.build();
      expect(room.isBuilt).toBe(true);
    });

    it('getLightSources() tiene 4 luces tras build()', async () => {
      await room.build();
      expect(room.getLightSources()).toHaveLength(4);
    });

    it('build() dos veces es no-op (4 luces, no 8)', async () => {
      await room.build();
      await room.build();
      expect(room.getLightSources()).toHaveLength(4);
    });
  });

  describe('getConnectionPoints()', () => {
    it('tiene 2 puertas tras build()', async () => {
      await room.build();
      expect(room.getConnectionPoints()).toHaveLength(2);
    });

    it('tiene puerta al sur', async () => {
      await room.build();
      expect(room.getConnectionPoints().map((p) => p.direction)).toContain('south');
    });

    it('tiene puerta al norte', async () => {
      await room.build();
      expect(room.getConnectionPoints().map((p) => p.direction)).toContain('north');
    });

    it('todas las puertas tienen isOpen=true', async () => {
      await room.build();
      expect(room.getConnectionPoints().every((p) => p.isOpen)).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('dispose() tras build() pone isBuilt=false', async () => {
      await room.build();
      room.dispose();
      expect(room.isBuilt).toBe(false);
    });

    it('dispose() llama dispose del rootNode', () => {
      room.dispose();
      expect(h.mockDispose).toHaveBeenCalled();
    });
  });
});
