// Mocks hoisted por Vitest.
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// vi.hoisted() -- variables disponibles en vi.mock factory
// ============================================================

const h = vi.hoisted(() => {
  const mockTriggerDispose = vi.fn();
  const mockBody = {
    setCollisionCallbackEnabled: vi.fn(),
    getCollisionObservable: vi.fn().mockReturnValue({
      add: vi.fn(),
    }),
  };
  const mockShape   = { isTrigger: false };
  const mockMesh    = { position: { set: vi.fn() }, isVisible: false, isPickable: false };
  const mockAnimStop = vi.fn();

  return { mockTriggerDispose, mockBody, mockShape, mockMesh, mockAnimStop };
});

// ============================================================
// Mocks de modulos externos
// ============================================================

vi.mock('@babylonjs/core', () => ({
  MeshBuilder: { CreateBox: vi.fn().mockReturnValue(h.mockMesh) },
  // PhysicsAggregate: funcion regular (no arrow) para que 'new' funcione.
  PhysicsAggregate: vi.fn().mockImplementation(function() {
    return {
      body:    h.mockBody,
      shape:   h.mockShape,
      dispose: h.mockTriggerDispose,
    };
  }),
  PhysicsShapeType: { BOX: 1 },
  PhysicsEventType: {
    COLLISION_STARTED:  'COLLISION_STARTED',
    COLLISION_FINISHED: 'COLLISION_FINISHED',
  },
  Animation: {
    CreateAndStartAnimation: vi.fn().mockImplementation(function() {
      return { stop: h.mockAnimStop };
    }),
    ANIMATIONLOOPMODE_CONSTANT: 0,
  },
  TransformNode: class MockTransformNode {
    name: string;
    dispose = vi.fn();
    constructor(name: string) { this.name = name; }
  },
}));

import { Dungeon } from '@/game/world/Dungeon';
import type { DungeonConfig } from '@/game/world/Dungeon';
import type { Scene, PhysicsBody } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';
import type { TriggerBounds } from '@/game/world/RoomTrigger';
import type { Room } from '@/game/world/Room';

// ============================================================
// Helpers
// ============================================================

function makeRoom(id: string): Room {
  return {
    id,
    isBuilt: true,
    onEnter:             vi.fn(),
    onExit:              vi.fn(),
    dispose:             vi.fn(),
    getLightSources:     vi.fn().mockReturnValue([]),
    getConnectionPoints: vi.fn().mockReturnValue([]),
  } as unknown as Room;
}

const DEFAULT_BOUNDS: TriggerBounds = {
  center: { x: 0, y: 1.5, z: 0 },
  width: 10, height: 3, depth: 10,
};
const MOCK_SCENE         = {} as unknown as Scene;
const MOCK_ASSET_MANAGER = {} as unknown as AssetManager;
const MOCK_PLAYER_BODY   = {} as unknown as PhysicsBody;

function makeDungeon(): Dungeon {
  const config: DungeonConfig = {
    scene: MOCK_SCENE, assetManager: MOCK_ASSET_MANAGER, playerBody: MOCK_PLAYER_BODY,
  };
  return new Dungeon(config);
}

// ============================================================
// Tests
// ============================================================

describe('Dungeon', () => {
  let dungeon: Dungeon;

  beforeEach(() => {
    h.mockTriggerDispose.mockClear();
    h.mockShape.isTrigger = false;
    dungeon = makeDungeon();
  });

  // ----------------------------------------------------------
  // Estado inicial
  // ----------------------------------------------------------

  describe('estado inicial', () => {
    it('currentRoomId es null al crear', () => {
      expect(dungeon.currentRoomId).toBeNull();
    });

    it('roomCount es 0 al crear', () => {
      expect(dungeon.roomCount).toBe(0);
    });

    it('getCurrentRoom devuelve null', () => {
      expect(dungeon.getCurrentRoom()).toBeNull();
    });

    it('events tiene on y emit', () => {
      expect(typeof dungeon.events.on).toBe('function');
      expect(typeof dungeon.events.emit).toBe('function');
    });
  });

  // ----------------------------------------------------------
  // registerRoom
  // ----------------------------------------------------------

  describe('registerRoom', () => {
    it('incrementa roomCount', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      expect(dungeon.roomCount).toBe(1);
    });

    it('getRoom devuelve la sala registrada', () => {
      const room = makeRoom('hub_01');
      dungeon.registerRoom(room, DEFAULT_BOUNDS);
      expect(dungeon.getRoom('hub_01')).toBe(room);
    });

    it('getRoom devuelve null para id desconocido', () => {
      expect(dungeon.getRoom('nope')).toBeNull();
    });

    it('varias salas se acumulan', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.registerRoom(makeRoom('hub_02'), DEFAULT_BOUNDS);
      expect(dungeon.roomCount).toBe(2);
    });

    it('re-registrar mismo id sustituye la sala y su trigger', () => {
      const roomA = makeRoom('hub_01');
      const roomB = makeRoom('hub_01');
      dungeon.registerRoom(roomA, DEFAULT_BOUNDS);
      dungeon.registerRoom(roomB, DEFAULT_BOUNDS);
      expect(dungeon.getRoom('hub_01')).toBe(roomB);
      expect(dungeon.roomCount).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // unregisterRoom
  // ----------------------------------------------------------

  describe('unregisterRoom', () => {
    it('reduce roomCount', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.unregisterRoom('hub_01');
      expect(dungeon.roomCount).toBe(0);
    });

    it('getRoom devuelve null tras desregistrar', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.unregisterRoom('hub_01');
      expect(dungeon.getRoom('hub_01')).toBeNull();
    });

    it('id inexistente no lanza error', () => {
      expect(() => dungeon.unregisterRoom('nope')).not.toThrow();
    });

    it('llama dispose del trigger al desregistrar', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      h.mockTriggerDispose.mockClear();
      dungeon.unregisterRoom('hub_01');
      expect(h.mockTriggerDispose).toHaveBeenCalledOnce();
    });
  });

  // ----------------------------------------------------------
  // transitionToRoom
  // ----------------------------------------------------------

  describe('transitionToRoom', () => {
    it('actualiza currentRoomId', async () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      expect(dungeon.currentRoomId).toBe('hub_01');
    });

    it('getCurrentRoom devuelve la sala destino', async () => {
      const room = makeRoom('hub_01');
      dungeon.registerRoom(room, DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      expect(dungeon.getCurrentRoom()).toBe(room);
    });

    it('llama onEnter() de la sala destino', async () => {
      const room = makeRoom('hub_01');
      dungeon.registerRoom(room, DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      expect(room.onEnter).toHaveBeenCalledOnce();
    });

    it('llama onExit() de la sala actual antes de entrar en la nueva', async () => {
      const roomA = makeRoom('hub_01');
      const roomB = makeRoom('corridor_01');
      dungeon.registerRoom(roomA, DEFAULT_BOUNDS);
      dungeon.registerRoom(roomB, DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      await dungeon.transitionToRoom('corridor_01');
      expect(roomA.onExit).toHaveBeenCalledOnce();
    });

    it('sala no registrada no lanza error', async () => {
      await expect(dungeon.transitionToRoom('nope')).resolves.toBeUndefined();
    });

    it('sala no registrada no cambia currentRoomId', async () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      await dungeon.transitionToRoom('nope');
      expect(dungeon.currentRoomId).toBe('hub_01');
    });

    it('transicion a sala actual es no-op (onEnter no se vuelve a llamar)', async () => {
      const room = makeRoom('hub_01');
      dungeon.registerRoom(room, DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      vi.mocked(room.onEnter).mockClear();
      await dungeon.transitionToRoom('hub_01');
      expect(room.onEnter).not.toHaveBeenCalled();
    });

    it('segunda transicion simultanea es drop silencioso', async () => {
      const roomA = makeRoom('hub_01');
      const roomB = makeRoom('corridor_01');
      dungeon.registerRoom(roomA, DEFAULT_BOUNDS);
      dungeon.registerRoom(roomB, DEFAULT_BOUNDS);
      const p1 = dungeon.transitionToRoom('hub_01');
      const p2 = dungeon.transitionToRoom('corridor_01'); // drop
      await Promise.all([p1, p2]);
      expect(dungeon.currentRoomId).toBe('hub_01');
    });

    it('llama getLightSources de la sala destino', async () => {
      const room = makeRoom('hub_01');
      dungeon.registerRoom(room, DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      expect(room.getLightSources).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // room:enter automatico desde RoomEventBus
  // ----------------------------------------------------------

  describe('room:enter automatico desde RoomEventBus', () => {
    it('emitir room:enter actualiza currentRoomId via transicion automatica', async () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.events.emit('room:enter', { roomId: 'hub_01' });
      await Promise.resolve(); // un tick para que la Promise async se resuelva
      expect(dungeon.currentRoomId).toBe('hub_01');
    });
  });

  // ----------------------------------------------------------
  // dispose
  // ----------------------------------------------------------

  describe('dispose', () => {
    it('destruye todas las salas registradas', () => {
      const roomA = makeRoom('hub_01');
      const roomB = makeRoom('corridor_01');
      dungeon.registerRoom(roomA, DEFAULT_BOUNDS);
      dungeon.registerRoom(roomB, DEFAULT_BOUNDS);
      dungeon.dispose();
      expect(roomA.dispose).toHaveBeenCalledOnce();
      expect(roomB.dispose).toHaveBeenCalledOnce();
    });

    it('roomCount es 0 tras dispose', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.dispose();
      expect(dungeon.roomCount).toBe(0);
    });

    it('currentRoomId es null tras dispose', async () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      await dungeon.transitionToRoom('hub_01');
      dungeon.dispose();
      expect(dungeon.currentRoomId).toBeNull();
    });

    it('llama dispose() en todos los triggers', () => {
      dungeon.registerRoom(makeRoom('hub_01'), DEFAULT_BOUNDS);
      dungeon.registerRoom(makeRoom('hub_02'), DEFAULT_BOUNDS);
      h.mockTriggerDispose.mockClear();
      dungeon.dispose();
      expect(h.mockTriggerDispose).toHaveBeenCalledTimes(2);
    });
  });
});
