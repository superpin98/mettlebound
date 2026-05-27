// Vitest -- sin mocks de Babylon (RoomEventBus es TS puro)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomEventBus } from '@/game/world/RoomEventBus';

describe('RoomEventBus', () => {
  let bus: RoomEventBus;

  beforeEach(() => {
    bus = new RoomEventBus();
  });

  // ──────────────────────────────────────────
  // on / emit basico
  // ──────────────────────────────────────────

  describe('on / emit', () => {
    it('listener de room:enter recibe el payload correcto', () => {
      const listener = vi.fn();
      bus.on('room:enter', listener);
      bus.emit('room:enter', { roomId: 'hub_01' });
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({ roomId: 'hub_01' });
    });

    it('listener de room:exit recibe el payload correcto', () => {
      const listener = vi.fn();
      bus.on('room:exit', listener);
      bus.emit('room:exit', { roomId: 'hub_01', toId: 'corridor_01' });
      expect(listener).toHaveBeenCalledWith({ roomId: 'hub_01', toId: 'corridor_01' });
    });

    it('multiples listeners del mismo evento se llaman todos', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('room:enter', a);
      bus.on('room:enter', b);
      bus.emit('room:enter', { roomId: 'x' });
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });

    it('emitir sin listeners no lanza error', () => {
      expect(() => bus.emit('room:enter', { roomId: 'x' })).not.toThrow();
    });

    it('listeners de eventos distintos no se contaminan', () => {
      const enterListener = vi.fn();
      const exitListener  = vi.fn();
      bus.on('room:enter', enterListener);
      bus.on('room:exit',  exitListener);
      bus.emit('room:enter', { roomId: 'x' });
      expect(enterListener).toHaveBeenCalledOnce();
      expect(exitListener).not.toHaveBeenCalled();
    });

    it('fromId es opcional en room:enter', () => {
      const listener = vi.fn();
      bus.on('room:enter', listener);
      bus.emit('room:enter', { roomId: 'hub_01' });
      expect(listener).toHaveBeenCalledWith({ roomId: 'hub_01' });
    });

    it('toId es opcional en room:exit', () => {
      const listener = vi.fn();
      bus.on('room:exit', listener);
      bus.emit('room:exit', { roomId: 'hub_01' });
      expect(listener).toHaveBeenCalledWith({ roomId: 'hub_01' });
    });
  });

  // ──────────────────────────────────────────
  // off
  // ──────────────────────────────────────────

  describe('off', () => {
    it('off elimina el listener: ya no se llama al emitir', () => {
      const listener = vi.fn();
      bus.on('room:enter', listener);
      bus.off('room:enter', listener);
      bus.emit('room:enter', { roomId: 'x' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('off de listener no registrado no lanza error', () => {
      const listener = vi.fn();
      expect(() => bus.off('room:enter', listener)).not.toThrow();
    });

    it('off solo elimina el listener indicado, no los demas', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('room:enter', a);
      bus.on('room:enter', b);
      bus.off('room:enter', a);
      bus.emit('room:enter', { roomId: 'x' });
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledOnce();
    });
  });

  // ──────────────────────────────────────────
  // unsubscribe devuelto por on()
  // ──────────────────────────────────────────

  describe('unsubscribe (funcion devuelta por on)', () => {
    it('llamar unsubscribe elimina el listener', () => {
      const listener = vi.fn();
      const unsub = bus.on('room:enter', listener);
      unsub();
      bus.emit('room:enter', { roomId: 'x' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('llamar unsubscribe dos veces es un no-op (no lanza error)', () => {
      const unsub = bus.on('room:enter', vi.fn());
      unsub();
      expect(() => unsub()).not.toThrow();
    });
  });

  // ──────────────────────────────────────────
  // listenerCount
  // ──────────────────────────────────────────

  describe('listenerCount', () => {
    it('0 antes de registrar listeners', () => {
      expect(bus.listenerCount('room:enter')).toBe(0);
    });

    it('incrementa con cada on()', () => {
      bus.on('room:enter', vi.fn());
      bus.on('room:enter', vi.fn());
      expect(bus.listenerCount('room:enter')).toBe(2);
    });

    it('decrementa al hacer off()', () => {
      const listener = vi.fn();
      bus.on('room:enter', listener);
      bus.off('room:enter', listener);
      expect(bus.listenerCount('room:enter')).toBe(0);
    });

    it('el mismo listener registrado dos veces solo cuenta como 1 (Set)', () => {
      const listener = vi.fn();
      bus.on('room:enter', listener);
      bus.on('room:enter', listener);
      expect(bus.listenerCount('room:enter')).toBe(1);
    });
  });

  // ──────────────────────────────────────────
  // clear
  // ──────────────────────────────────────────

  describe('clear', () => {
    it('clear elimina todos los listeners de todos los eventos', () => {
      bus.on('room:enter', vi.fn());
      bus.on('room:exit',  vi.fn());
      bus.clear();
      expect(bus.listenerCount('room:enter')).toBe(0);
      expect(bus.listenerCount('room:exit')).toBe(0);
    });

    it('tras clear, emitir no lanza error', () => {
      bus.on('room:enter', vi.fn());
      bus.clear();
      expect(() => bus.emit('room:enter', { roomId: 'x' })).not.toThrow();
    });
  });
});
