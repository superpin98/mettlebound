// Mocks hoisted por Vitest.
// IMPORTANTE: vi.mock() se eleva (hoists) antes de los imports y declaraciones.
// Usar vi.hoisted() para que las variables de mock sean accesibles en el factory.
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// vi.hoisted() -- declaraciones disponibles en vi.mock factory
// ============================================================

const h = vi.hoisted(() => {
  const mockDispose = vi.fn();
  const mockSetPos  = vi.fn();

  // Array mutable de callbacks del observable.
  // El factory de vi.mock captura la REFERENCIA, no el valor.
  // beforeEach limpia con .length = 0 sin romper la referencia.
  const callbacks: Array<(event: unknown) => void> = [];

  const mockObservable = {
    add: vi.fn().mockImplementation((cb: (e: unknown) => void) => {
      callbacks.push(cb);
    }),
  };
  const mockBody = {
    setCollisionCallbackEnabled: vi.fn(),
    getCollisionObservable:      vi.fn().mockReturnValue(mockObservable),
  };
  // Usamos un objeto mutable para poder resetear isTrigger en beforeEach.
  const mockShape: { isTrigger: boolean } = { isTrigger: false };

  const mockMesh = {
    position:   { set: mockSetPos },
    isVisible:  false,
    isPickable: false,
  };

  return { mockDispose, mockSetPos, callbacks, mockObservable, mockBody, mockShape, mockMesh };
});

// ============================================================
// Mock de @babylonjs/core
// ============================================================

vi.mock('@babylonjs/core', () => ({
  MeshBuilder: {
    CreateBox: vi.fn().mockReturnValue(h.mockMesh),
  },
  // PhysicsAggregate: funcion regular (no arrow) para que 'new' funcione.
  PhysicsAggregate: vi.fn().mockImplementation(function() {
    return {
      body:    h.mockBody,
      shape:   h.mockShape,
      dispose: h.mockDispose,
    };
  }),
  PhysicsShapeType: { BOX: 1 },
  PhysicsEventType: {
    COLLISION_STARTED:  'COLLISION_STARTED',
    COLLISION_FINISHED: 'COLLISION_FINISHED',
  },
}));

import { RoomTrigger } from '@/game/world/RoomTrigger';
import type { TriggerBounds } from '@/game/world/RoomTrigger';
import { RoomEventBus } from '@/game/world/RoomEventBus';
import type { Scene, PhysicsBody } from '@babylonjs/core';
import type { Room } from '@/game/world/Room';

// ============================================================
// Helpers
// ============================================================

function makeRoom(id: string): Room {
  return { id } as unknown as Room;
}
function makePlayerBody(): PhysicsBody {
  return {} as unknown as PhysicsBody;
}

const MOCK_SCENE      = {} as unknown as Scene;
const DEFAULT_BOUNDS: TriggerBounds = {
  center: { x: 0, y: 1.5, z: 0 },
  width:  10,
  height: 3,
  depth:  10,
};

/** Dispara un evento de colision simulado hacia todos los callbacks registrados. */
function fireCollision(type: string, collider: unknown, collidedAgainst: unknown): void {
  for (const cb of h.callbacks) {
    cb({ type, collider, collidedAgainst });
  }
}

// ============================================================
// Tests
// ============================================================

describe('RoomTrigger', () => {
  let bus:        RoomEventBus;
  let playerBody: PhysicsBody;
  let room:       Room;
  let trigger:    RoomTrigger;

  beforeEach(() => {
    h.callbacks.length = 0;
    h.mockDispose.mockClear();
    h.mockSetPos.mockClear();
    h.mockBody.setCollisionCallbackEnabled.mockClear();
    h.mockBody.getCollisionObservable.mockClear();
    h.mockObservable.add.mockClear();
    h.mockShape.isTrigger = false;

    bus        = new RoomEventBus();
    playerBody = makePlayerBody();
    room       = makeRoom('hub_01');

    trigger = new RoomTrigger({
      room,
      scene:     MOCK_SCENE,
      bounds:    DEFAULT_BOUNDS,
      playerBody,
      eventBus:  bus,
    });
  });

  // ----------------------------------------------------------
  // Construccion
  // ----------------------------------------------------------

  describe('construccion', () => {
    it('roomId refleja el id de la sala', () => {
      expect(trigger.roomId).toBe('hub_01');
    });

    it('posiciona el mesh en el centro de TriggerBounds', () => {
      expect(h.mockSetPos).toHaveBeenCalledWith(
        DEFAULT_BOUNDS.center.x,
        DEFAULT_BOUNDS.center.y,
        DEFAULT_BOUNDS.center.z,
      );
    });

    it('marca el shape como isTrigger = true', () => {
      expect(h.mockShape.isTrigger).toBe(true);
    });

    it('activa el callback de colision en el body', () => {
      expect(h.mockBody.setCollisionCallbackEnabled).toHaveBeenCalledWith(true);
    });

    it('se suscribe al observable de colisiones', () => {
      expect(h.mockObservable.add).toHaveBeenCalledOnce();
    });
  });

  // ----------------------------------------------------------
  // Eventos room:enter
  // ----------------------------------------------------------

  describe('room:enter', () => {
    it('emite room:enter cuando el player es collidedAgainst', () => {
      const enterListener = vi.fn();
      bus.on('room:enter', enterListener);
      // triggerBody es el collider; playerBody es collidedAgainst
      const triggerBody = h.mockBody as unknown;
      fireCollision('COLLISION_STARTED', triggerBody, playerBody);
      expect(enterListener).toHaveBeenCalledOnce();
      expect(enterListener).toHaveBeenCalledWith({ roomId: 'hub_01' });
    });

    it('emite room:enter cuando el player es collider (ambas orientaciones)', () => {
      const enterListener = vi.fn();
      bus.on('room:enter', enterListener);
      const triggerBody = h.mockBody as unknown;
      fireCollision('COLLISION_STARTED', playerBody, triggerBody);
      expect(enterListener).toHaveBeenCalledOnce();
    });

    it('NO emite room:enter para cuerpos que no son el player', () => {
      const enterListener = vi.fn();
      bus.on('room:enter', enterListener);
      const otherBody = makePlayerBody();
      const triggerBody = h.mockBody as unknown;
      fireCollision('COLLISION_STARTED', triggerBody, otherBody);
      expect(enterListener).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // Eventos room:exit
  // ----------------------------------------------------------

  describe('room:exit', () => {
    it('emite room:exit cuando el player sale del trigger', () => {
      const exitListener = vi.fn();
      bus.on('room:exit', exitListener);
      const triggerBody = h.mockBody as unknown;
      fireCollision('COLLISION_FINISHED', triggerBody, playerBody);
      expect(exitListener).toHaveBeenCalledOnce();
      expect(exitListener).toHaveBeenCalledWith({ roomId: 'hub_01' });
    });

    it('NO emite room:exit para cuerpos distintos al player', () => {
      const exitListener = vi.fn();
      bus.on('room:exit', exitListener);
      const triggerBody = h.mockBody as unknown;
      fireCollision('COLLISION_FINISHED', triggerBody, makePlayerBody());
      expect(exitListener).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // dispose
  // ----------------------------------------------------------

  describe('dispose', () => {
    it('llama dispose() del PhysicsAggregate', () => {
      trigger.dispose();
      expect(h.mockDispose).toHaveBeenCalledOnce();
    });
  });
});
