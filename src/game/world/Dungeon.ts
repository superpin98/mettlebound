// Imports externos (Babylon.js)
import type { Scene, PhysicsBody } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import { Room } from '@/game/world/Room';
import { RoomEventBus } from '@/game/world/RoomEventBus';
import { RoomTrigger } from '@/game/world/RoomTrigger';
import type { TriggerBounds } from '@/game/world/RoomTrigger';
import { fadeOut, fadeIn, cancelTransitions } from '@/game/world/LightingTransition';
import type { Animatable } from '@babylonjs/core';
import { logger } from '@/core/Logger';

// ============================================================
// DungeonConfig -- parametros del orquestador
// ============================================================

export interface DungeonConfig {
  /** Escena Babylon activa. */
  scene: Scene;
  /** Gestor de assets (para construir salas en el futuro). */
  assetManager: AssetManager;
  /**
   * PhysicsBody del jugador.
   * Se distribuye a cada RoomTrigger para filtrar solo al player.
   */
  playerBody: PhysicsBody;
}

// ============================================================
// Dungeon -- orquestador de salas de Mettlebound
// ============================================================

/**
 * Gestiona todas las salas activas de la dungeon actual y
 * coordina las transiciones entre ellas.
 *
 * Responsabilidades A2-b2:
 *   - Mantiene un Map<id, Room> de salas registradas.
 *   - Gestiona currentRoomId (sala donde esta el jugador ahora).
 *   - Crea y destruye RoomTriggers al registrar/desregistrar salas.
 *   - Ejecuta transiciones: fade out de luces actuales,
 *     onExit/onEnter, fade in de luces nuevas.
 *   - Escucha room:enter del RoomEventBus para actualizar
 *     currentRoomId automaticamente cuando el jugador cruza un trigger.
 *
 * Uso:
 *   const dungeon = new Dungeon({ scene, assetManager, playerBody });
 *   dungeon.registerRoom(hubRoom, hubBounds);
 *   dungeon.registerRoom(corridorRoom, corridorBounds);
 *   await dungeon.transitionToRoom('hub_01');
 *
 * En A2-b4 se integrara con el flujo real del juego.
 */
export class Dungeon {

  // --- Acceso publico al bus de eventos -----------------------

  /**
   * Bus de eventos de sala. Accesible en lectura desde fuera
   * para que sistemas externos (AI, musica, etc.) puedan suscribirse.
   *
   * Solo Dungeon emite; los consumidores solo escuchan.
   */
  readonly events: RoomEventBus = new RoomEventBus();

  // --- Config -------------------------------------------------

  private readonly _scene:        Scene;
  // TODO A2-b4.2: assetManager sera usado cuando Dungeon construya salas programaticamente.
  // @ts-expect-error TS6133 -- campo reservado para A2-b4.2, intencionalmente no leido ahora.
  private readonly __assetManager: AssetManager;
  private readonly _playerBody:   PhysicsBody;

  // --- Estado -------------------------------------------------

  private readonly _rooms:    Map<string, Room>        = new Map();
  private readonly _triggers: Map<string, RoomTrigger> = new Map();

  private _currentRoomId:   string | null = null;
  private _isTransitioning: boolean       = false;

  /** Animatables en curso de la ultima transicion (para cancelacion). */
  private _activeAnimatables: Animatable[] = [];

  // --- Constructor --------------------------------------------

  constructor(config: DungeonConfig) {
    this._scene        = config.scene;
    this.__assetManager = config.assetManager;
    this._playerBody   = config.playerBody;

    // Escuchar room:enter del bus para actualizar currentRoomId
    // cuando el jugador cruza fisicamente un trigger.
    this.events.on('room:enter', ({ roomId }) => {
      this._handleTriggerEnter(roomId);
    });
  }

  // --- API publica: consulta ----------------------------------

  /** ID de la sala donde esta actualmente el jugador. null si ninguna. */
  get currentRoomId(): string | null { return this._currentRoomId; }

  /** Numero de salas registradas. */
  get roomCount(): number { return this._rooms.size; }

  /** Devuelve la sala actual o null. */
  getCurrentRoom(): Room | null {
    return this._currentRoomId !== null
      ? (this._rooms.get(this._currentRoomId) ?? null)
      : null;
  }

  /** Devuelve una sala por ID o null si no existe. */
  getRoom(id: string): Room | null {
    return this._rooms.get(id) ?? null;
  }

  // --- API publica: registro de salas -------------------------

  /**
   * Registra una sala en el Dungeon y crea su RoomTrigger.
   *
   * @param room   Sala ya construida (build() ya llamado).
   * @param bounds Volumen AABB del trigger que cubre la sala.
   *               En A2-b3 se calculara automaticamente.
   *
   * Si la sala ya estaba registrada, la sustituye y recrea el trigger.
   */
  registerRoom(room: Room, bounds: TriggerBounds): void {
    // Si ya existia, limpiar primero.
    this._unregisterRoomInternal(room.id);

    this._rooms.set(room.id, room);

    const trigger = new RoomTrigger({
      room,
      scene:      this._scene,
      bounds,
      playerBody: this._playerBody,
      eventBus:   this.events,
    });
    this._triggers.set(room.id, trigger);

    logger.info(`Dungeon: sala registrada '${room.id}'`);
  }

  /**
   * Desregistra una sala y destruye su trigger.
   * No llama dispose() en la sala -- el llamador decide cuando destruirla.
   */
  unregisterRoom(id: string): void {
    this._unregisterRoomInternal(id);
  }

  // --- API publica: transicion --------------------------------

  /**
   * Transiciona el jugador a una sala distinta.
   *
   * Flujo:
   *   1. Guard: si ya hay transicion en curso, drop silencioso.
   *   2. Yield al microtask queue (await Promise.resolve()) para que
   *      llamadas concurrentes vean _isTransitioning = true.
   *   3. Fade out de luces de la sala actual.
   *   4. Llamar onExit() de la sala actual.
   *   5. Actualizar currentRoomId.
   *   6. Llamar onEnter() de la sala nueva.
   *   7. Fade in de luces de la sala nueva.
   *
   * @param targetId ID de la sala destino. Debe estar registrada.
   */
  async transitionToRoom(targetId: string): Promise<void> {
    if (this._isTransitioning) {
      logger.warn(`Dungeon: transicion a '${targetId}' ignorada (ya en transicion).`);
      return;
    }

    const targetRoom = this._rooms.get(targetId);
    if (targetRoom === undefined) {
      logger.warn(`Dungeon: transicion a '${targetId}' fallida -- sala no registrada.`);
      return;
    }

    if (targetId === this._currentRoomId) {
      logger.warn(`Dungeon: transicion a '${targetId}' ignorada -- ya es la sala actual.`);
      return;
    }

    this._isTransitioning = true;

    // Yield al microtask queue para que llamadas concurrentes vean
    // _isTransitioning = true y sean descartadas antes de continuar.
    await Promise.resolve();

    try {
      const fromId      = this._currentRoomId;
      const currentRoom = fromId !== null ? (this._rooms.get(fromId) ?? null) : null;

      // Paso 1: cancelar animatables previos si los hubiera.
      cancelTransitions(this._activeAnimatables);

      // Paso 2: fade out de luces actuales.
      if (currentRoom !== null) {
        const currentLights = [...currentRoom.getLightSources()];
        this._activeAnimatables = fadeOut(currentLights, this._scene);
      }

      // Paso 3: onExit de sala actual.
      if (currentRoom !== null) {
        currentRoom.onExit();
      }

      // Paso 4: actualizar currentRoomId.
      this._currentRoomId = targetId;
      logger.info(`Dungeon: transicion '${fromId ?? 'ninguna'}' -> '${targetId}'`);

      // Paso 5: onEnter de sala nueva.
      targetRoom.onEnter();

      // Paso 6: fade in de luces nuevas.
      const newLights = targetRoom.getLightSources();
      const fadeInTargets = newLights.map(l => ({
        light:           l,
        targetIntensity: 1.0, // intensidad estandar; future A2-b3: leer de config de sala
      }));
      this._activeAnimatables.push(...fadeIn(fadeInTargets, this._scene));

    } finally {
      this._isTransitioning = false;
    }
  }

  // --- API publica: dispose -----------------------------------

  /**
   * Destruye todas las salas, todos los triggers y limpia el bus.
   * Llamar al salir de la dungeon o en el fin del juego.
   */
  dispose(): void {
    cancelTransitions(this._activeAnimatables);

    for (const trigger of this._triggers.values()) {
      trigger.dispose();
    }
    this._triggers.clear();

    for (const room of this._rooms.values()) {
      room.dispose();
    }
    this._rooms.clear();

    this.events.clear();
    this._currentRoomId = null;
    this._isTransitioning = false;

    logger.info('Dungeon: disposed.');
  }

  // --- Helpers privados ---------------------------------------

  /**
   * Maneja el evento room:enter emitido por un RoomTrigger.
   * Si el jugador entra fisicamente en una sala distinta a la actual,
   * inicia una transicion automatica.
   *
   * Nota: en A2-b4 se evaluara si esta automatizacion es deseable
   * o si la transicion debe controlarse manualmente (por ejemplo, al
   * cruzar una puerta cerrada).
   */
  private _handleTriggerEnter(roomId: string): void {
    if (roomId !== this._currentRoomId) {
      void this.transitionToRoom(roomId);
    }
  }

  /** Limpia la sala con id dado sin tocar el Map de rooms. */
  private _unregisterRoomInternal(id: string): void {
    const existing = this._triggers.get(id);
    if (existing !== undefined) {
      existing.dispose();
      this._triggers.delete(id);
    }
    this._rooms.delete(id);
  }
}
