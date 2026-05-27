// Mocks hoisted por Vitest -- deben estar antes de los imports del codigo real.
// TransformNode es lo unico que Room instancia de Babylon.
// Usamos una clase (no una arrow function) como mock de constructor:
// las arrow functions no pueden usarse con 'new' en JavaScript.
import { vi, describe, it, expect } from 'vitest';

vi.mock('@babylonjs/core', () => ({
  TransformNode: class MockTransformNode {
    name: string;
    // dispose es un vi.fn() fresco por instancia, espiable en tests.
    dispose = vi.fn();
    constructor(name: string) {
      this.name = name;
    }
  },
}));

import type { Scene } from '@babylonjs/core';
import type { AssetManager } from '@/core/AssetManager';
import { Room } from '@/game/world/Room';
import type { RoomConfig } from '@/game/world/Room';
import type { RoomMode, RoomShape, ConnectionPoint } from '@/game/world/types/room.types';
import type { Vec3 } from '@/types/spatial.types';

// ============================================================
// StubRoom -- subclase concreta minima para testear Room
// ============================================================

class StubRoom extends Room {
  /** Modo fijo: 'exploration'. */
  readonly mode: RoomMode = 'exploration';

  /** Forma fija: 'rectangular'. */
  readonly shape: RoomShape = 'rectangular';

  /**
   * Espia para verificar que build() llama a _buildImpl().
   * Fresco en cada instancia de StubRoom.
   */
  readonly buildImplSpy = vi.fn();

  protected async _buildImpl(): Promise<void> {
    this.buildImplSpy();
  }

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Helper de test: popula _connectionPoints desde fuera de la clase
   * para testear getConnectionPoints() con datos reales.
   */
  addConnectionPoint(cp: ConnectionPoint): void {
    this._connectionPoints.push(cp);
  }
}

// ============================================================
// Helpers
// ============================================================

const MOCK_SCENE         = {} as unknown as Scene;
const MOCK_ASSET_MANAGER = {} as unknown as AssetManager;

function makeConfig(id = 'stub_01'): RoomConfig {
  return { id, scene: MOCK_SCENE, assetManager: MOCK_ASSET_MANAGER };
}

function makeRoom(id = 'stub_01'): StubRoom {
  return new StubRoom(makeConfig(id));
}

function makeConnectionPoint(overrides: Partial<ConnectionPoint> = {}): ConnectionPoint {
  return {
    id:            'door_north_01',
    direction:     'north',
    worldPosition: { x: 0, y: 0, z: 4 },
    isOpen:        true,
    linkedRoomId:  null,
    ...overrides,
  };
}

// Tipo auxiliar para acceder al rootNode protegido en tests
type WithRootNode = { rootNode: { name: string; dispose: ReturnType<typeof vi.fn> } };

// ============================================================
// Tests
// ============================================================

describe('Room (clase abstracta via StubRoom)', () => {

  // ——————————————————————————————————————————
  // Constructor
  // ——————————————————————————————————————————

  describe('constructor', () => {
    it('almacena el id correctamente', () => {
      expect(makeRoom('hall_01').id).toBe('hall_01');
    });

    it('isBuilt es false recien creado', () => {
      expect(makeRoom().isBuilt).toBe(false);
    });

    it('crea rootNode con nombre room_{id}', () => {
      const room = makeRoom('hub_01');
      expect((room as unknown as WithRootNode).rootNode.name).toBe('room_hub_01');
    });

    it('almacena scene y assetManager correctamente', () => {
      const room = makeRoom();
      type Internals = { scene: Scene; assetManager: AssetManager };
      const i = room as unknown as Internals;
      expect(i.scene).toBe(MOCK_SCENE);
      expect(i.assetManager).toBe(MOCK_ASSET_MANAGER);
    });

    it('dos instancias con distinto id tienen ids independientes', () => {
      expect(makeRoom('a').id).toBe('a');
      expect(makeRoom('b').id).toBe('b');
    });
  });

  // ——————————————————————————————————————————
  // Getters abstractos
  // ——————————————————————————————————————————

  describe('mode y shape (getters abstractos de StubRoom)', () => {
    it('mode devuelve el valor declarado en StubRoom', () => {
      expect(makeRoom().mode).toBe('exploration');
    });

    it('shape devuelve el valor declarado en StubRoom', () => {
      expect(makeRoom().shape).toBe('rectangular');
    });
  });

  // ——————————————————————————————————————————
  // build() -- template method
  // ——————————————————————————————————————————

  describe('build() -- template method', () => {
    it('isBuilt pasa a true tras build()', async () => {
      const room = makeRoom();
      await room.build();
      expect(room.isBuilt).toBe(true);
    });

    it('llama a _buildImpl() exactamente una vez', async () => {
      const room = makeRoom();
      await room.build();
      expect(room.buildImplSpy).toHaveBeenCalledTimes(1);
    });

    it('segunda llamada a build() NO relanza _buildImpl (guard anti-doble)', async () => {
      const room = makeRoom();
      await room.build();
      await room.build();
      expect(room.buildImplSpy).toHaveBeenCalledTimes(1);
    });

    it('isBuilt sigue true tras segunda llamada ignorada', async () => {
      const room = makeRoom();
      await room.build();
      await room.build();
      expect(room.isBuilt).toBe(true);
    });

    it('multiples salas tienen isBuilt independiente', async () => {
      const roomA = makeRoom('a');
      const roomB = makeRoom('b');
      await roomA.build();
      expect(roomA.isBuilt).toBe(true);
      expect(roomB.isBuilt).toBe(false);
    });
  });

  // ——————————————————————————————————————————
  // getSpawnPoint()
  // ——————————————————————————————————————————

  describe('getSpawnPoint()', () => {
    it('devuelve el Vec3 definido en StubRoom', () => {
      expect(makeRoom().getSpawnPoint()).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  // ——————————————————————————————————————————
  // getConnectionPoints()
  // ——————————————————————————————————————————

  describe('getConnectionPoints()', () => {
    it('devuelve array vacio por defecto', () => {
      expect(makeRoom().getConnectionPoints()).toEqual([]);
    });

    it('devuelve copia defensiva (mutar el resultado no afecta al array interno)', () => {
      const room = makeRoom();
      const result = room.getConnectionPoints();
      result.push(makeConnectionPoint({ id: 'intruder' }));
      // El array interno no debe haberse modificado
      expect(room.getConnectionPoints()).toHaveLength(0);
    });

    it('refleja los ConnectionPoints populados en _connectionPoints', () => {
      const room = makeRoom();
      const cp = makeConnectionPoint({ id: 'door_south_01', direction: 'south' });
      room.addConnectionPoint(cp);
      const result = room.getConnectionPoints();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(cp);
    });

    it('con multiples puntos devuelve todos correctamente', () => {
      const room = makeRoom();
      room.addConnectionPoint(makeConnectionPoint({ id: 'cp_1', direction: 'north' }));
      room.addConnectionPoint(makeConnectionPoint({ id: 'cp_2', direction: 'east' }));
      room.addConnectionPoint(makeConnectionPoint({ id: 'cp_3', direction: 'south' }));
      expect(room.getConnectionPoints()).toHaveLength(3);
    });
  });

  // ——————————————————————————————————————————
  // Hooks de ciclo de vida
  // ——————————————————————————————————————————

  describe('onEnter()', () => {
    it('no lanza error sin argumentos', () => {
      expect(() => makeRoom().onEnter()).not.toThrow();
    });

    it('no lanza error con ConnectionPoint como argumento', () => {
      expect(() => makeRoom().onEnter(makeConnectionPoint())).not.toThrow();
    });
  });

  describe('onExit()', () => {
    it('no lanza error sin argumentos', () => {
      expect(() => makeRoom().onExit()).not.toThrow();
    });

    it('no lanza error con ConnectionPoint como argumento', () => {
      expect(() => makeRoom().onExit(makeConnectionPoint())).not.toThrow();
    });
  });

  // ——————————————————————————————————————————
  // dispose()
  // ——————————————————————————————————————————

  describe('dispose()', () => {
    it('llama a rootNode.dispose()', () => {
      const room = makeRoom();
      const rootNode = (room as unknown as WithRootNode).rootNode;
      room.dispose();
      expect(rootNode.dispose).toHaveBeenCalledTimes(1);
    });

    it('resetea isBuilt a false', async () => {
      const room = makeRoom();
      await room.build();
      expect(room.isBuilt).toBe(true);
      room.dispose();
      expect(room.isBuilt).toBe(false);
    });

    it('no lanza error si se llama antes de build()', () => {
      expect(() => makeRoom().dispose()).not.toThrow();
    });

    it('dispose() + build() vuelve a llamar _buildImpl (isBuilt reseteado)', async () => {
      const room = makeRoom();
      await room.build();
      room.dispose();
      await room.build();
      // Debe haberse llamado 2 veces: antes y despues del dispose
      expect(room.buildImplSpy).toHaveBeenCalledTimes(2);
    });
  });

});
