// Mocks hoisted por Vitest.
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// vi.hoisted() -- variables disponibles en vi.mock factory
// ============================================================

const h = vi.hoisted(() => {
  const mockDispose = vi.fn();
  const mockMesh = {
    position: { x: 0, y: 0, z: 0 },
    parent:   null as unknown,
    material: null as unknown,
    dispose:  mockDispose,
  };
  const mockMaterial = { emissiveColor: null as unknown };
  return { mockDispose, mockMesh, mockMaterial };
});

// ============================================================
// Mocks de modulos externos
// ============================================================

vi.mock('@babylonjs/core', () => ({
  Vector3: class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  },
  Color3: class MockColor3 {
    r: number; g: number; b: number;
    constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; }
  },
  MeshBuilder: {
    CreateBox: vi.fn().mockReturnValue(h.mockMesh),
  },
  StandardMaterial: vi.fn().mockImplementation(function() {
    return h.mockMaterial;
  }),
  TransformNode: class MockTransformNode {
    name: string;
    rotation = { x: 0, y: 0, z: 0 };
    parent: unknown = null;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  },
}));

import { SpawnAltar } from '@/game/world/props/SpawnAltar';
import type { Scene, TransformNode } from '@babylonjs/core';
import type { Vec3 } from '@/types/spatial.types';

// ============================================================
// Helpers
// ============================================================

const MOCK_SCENE: Scene = {} as unknown as Scene;

const POS: Vec3 = { x: 1, y: 0, z: 2 };

// ============================================================
// Tests
// ============================================================

describe('SpawnAltar', () => {

  beforeEach(() => {
    h.mockDispose.mockClear();
    h.mockMesh.parent = null;
    h.mockMesh.material = null;
  });

  describe('create', () => {
    it('almacena worldPosition correctamente', () => {
      const altar = SpawnAltar.create(MOCK_SCENE, POS);
      expect(altar.worldPosition).toEqual(POS);
    });

    it('worldPosition es la posicion pasada (no muta)', () => {
      const pos: Vec3 = { x: 3, y: 0, z: -5 };
      const altar = SpawnAltar.create(MOCK_SCENE, pos);
      expect(altar.worldPosition.x).toBe(3);
      expect(altar.worldPosition.z).toBe(-5);
    });

    it('create sin parentNode no lanza error', () => {
      expect(() => SpawnAltar.create(MOCK_SCENE, POS)).not.toThrow();
    });

    it('create con parentNode asigna parent al mesh', () => {
      const mockParent = { name: 'root' } as unknown as TransformNode;
      SpawnAltar.create(MOCK_SCENE, POS, mockParent);
      expect(h.mockMesh.parent).toBe(mockParent);
    });

    it('create sin parentNode no asigna parent', () => {
      SpawnAltar.create(MOCK_SCENE, POS);
      expect(h.mockMesh.parent).toBeNull();
    });
  });

  describe('dispose', () => {
    it('dispose no lanza error', () => {
      const altar = SpawnAltar.create(MOCK_SCENE, POS);
      expect(() => altar.dispose()).not.toThrow();
    });

    it('dispose llama dispose() del mesh', () => {
      const altar = SpawnAltar.create(MOCK_SCENE, POS);
      altar.dispose();
      expect(h.mockDispose).toHaveBeenCalledOnce();
    });
  });
});
