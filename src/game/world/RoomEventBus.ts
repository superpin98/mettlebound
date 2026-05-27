// ============================================================
// RoomEventBus.ts -- bus de eventos de salas de Mettlebound
//
// Bus de eventos tipado para la capa de orquestacion de salas.
// NO es el EventBus global del juego (src/core/EventBus.ts):
// este bus es propiedad exclusiva de Dungeon y gestiona solo
// eventos de ciclo de vida de salas.
//
// Patron pub/sub simple: sin librerias externas.
// Cada Dungeon crea su propia instancia -- no es singleton.
// ============================================================

// ─── Mapa de eventos y sus payloads ──────────────────────────

/**
 * Todos los eventos que puede emitir el sistema de salas.
 *
 * room:enter -- el jugador ha entrado en una sala.
 * room:exit  -- el jugador ha salido de una sala.
 */
export type RoomEventMap = {
  'room:enter': { roomId: string; fromId?: string };
  'room:exit':  { roomId: string; toId?:   string };
};

/** Union de todos los nombres de eventos de sala. */
export type RoomEventKey = keyof RoomEventMap;

/** Tipo del listener para un evento de sala concreto. */
export type RoomEventListener<K extends RoomEventKey> =
  (data: RoomEventMap[K]) => void;

// ─── RoomEventBus ─────────────────────────────────────────────

/**
 * Bus de eventos tipado para el sistema de salas.
 *
 * Uso:
 *   const bus = new RoomEventBus();
 *
 *   // Suscribirse
 *   const unsub = bus.on('room:enter', ({ roomId }) => {
 *     console.log('Entrando en sala:', roomId);
 *   });
 *
 *   // Emitir
 *   bus.emit('room:enter', { roomId: 'hub_01' });
 *
 *   // Desuscribirse con la funcion devuelta por on()
 *   unsub();
 */
export class RoomEventBus {

  /**
   * Mapa interno de listeners por evento.
   * Usamos Set<Function> para garantizar O(1) en add/delete
   * y eliminar automaticamente duplicados de referencia exacta.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _listeners = new Map<RoomEventKey, Set<(data: any) => void>>();

  // ─── API publica ─────────────────────────────────────────────

  /**
   * Suscribe un listener a un evento de sala.
   *
   * @returns Funcion de unsubscribe -- llamarla elimina el listener.
   *
   * Es seguro llamar unsubscribe() multiples veces: la segunda
   * llamada es un no-op.
   */
  on<K extends RoomEventKey>(
    event: K,
    listener: RoomEventListener<K>,
  ): () => void {
    let listeners = this._listeners.get(event);
    if (listeners === undefined) {
      listeners = new Set();
      this._listeners.set(event, listeners);
    }
    listeners.add(listener);

    return () => { this.off(event, listener); };
  }

  /**
   * Elimina un listener de un evento de sala.
   * No lanza error si el listener no estaba registrado.
   */
  off<K extends RoomEventKey>(
    event: K,
    listener: RoomEventListener<K>,
  ): void {
    this._listeners.get(event)?.delete(listener);
  }

  /**
   * Emite un evento de sala notificando a todos sus listeners.
   * Los listeners se llaman en orden de registro.
   *
   * Console.log de debug incluido para validacion en A2-b4.
   * future: eliminar o reemplazar por logger cuando el bus este integrado.
   */
  emit<K extends RoomEventKey>(event: K, data: RoomEventMap[K]): void {
    console.log('[RoomEventBus]', event, data);
    const listeners = this._listeners.get(event);
    if (listeners === undefined) { return; }
    for (const listener of listeners) {
      listener(data);
    }
  }

  /**
   * Devuelve el numero de listeners registrados para un evento.
   * Util para tests y diagnostico.
   */
  listenerCount(event: RoomEventKey): number {
    return this._listeners.get(event)?.size ?? 0;
  }

  /**
   * Elimina todos los listeners de todos los eventos.
   * Llamar en dispose() de Dungeon para evitar memory leaks.
   */
  clear(): void {
    this._listeners.clear();
  }
}
