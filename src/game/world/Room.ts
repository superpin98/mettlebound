// Imports externos (Babylon.js)
import { TransformNode } from '@babylonjs/core';
import type { Scene, PointLight } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { AssetManager } from '@/core/AssetManager';
import type { RoomMode, RoomShape, ConnectionPoint } from '@/game/world/types/room.types';
import { logger } from '@/core/Logger';

// ============================================================
// RoomConfig -- parametros de construccion de cualquier sala
// ============================================================

/**
 * Configuracion base para construir una Room.
 * Las subclases extienden esta interface con sus propias opciones:
 *   CombatRoomConfig extends RoomConfig { sourceRoomId: string; ... }
 *   ExplorationRoomConfig extends RoomConfig { theme: string; ... }
 */
export interface RoomConfig {
  /** Identificador unico de la sala: ej. 'hub_01', 'combat_room_001'. */
  id: string;

  /** Escena Babylon activa. */
  scene: Scene;

  /** Gestor de assets para cargar modelos y texturas. */
  assetManager: AssetManager;
}

// ============================================================
// Room -- clase abstracta base de todas las salas
// ============================================================

/**
 * Contrato comun de todas las salas de Mettlebound:
 * salas de exploracion (4 formas complejas) y CombatRoom (cuadrada).
 *
 * Patron de diseno: Template Method para build().
 *   - build()       : publico, gestiona el flag isBuilt y el guard anti-doble.
 *   - _buildImpl()  : protegido y abstracto, cada subclase implementa aqui
 *                     su geometria, luces y props.
 *
 * Ciclo de vida:
 *   constructor() -> build() -> [onEnter() / onExit() *] -> dispose()
 *
 * Todos los meshes, luces y nodos de la sala son hijos de rootNode.
 * dispose() los destruye todos de un golpe via rootNode.dispose().
 * Esto simplifica la limpieza y es reutilizable en Sprint 6 procedural.
 */
export abstract class Room {

  // --- Identidad -----------------------------------------------

  /** Identificador unico de esta instancia de sala. */
  readonly id: string;

  /**
   * Modo de la sala: exploracion libre o combate por turnos.
   * Implementado como getter abstracto: el modo es una propiedad
   * estructural inmutable de cada subclase, no un dato de config.
   *
   * Ejemplo en subclase:
   *   get mode(): RoomMode { return 'exploration'; }
   */
  abstract readonly mode: RoomMode;

  /**
   * Forma geometrica de la planta de la sala.
   * Implementado como getter abstracto por la misma razon que mode.
   * Las CombatRoom siempre devuelven 'rectangular'.
   *
   * Ejemplo en subclase:
   *   get shape(): RoomShape { return 'L_shape'; }
   */
  abstract readonly shape: RoomShape;

  // --- Babylon -------------------------------------------------

  /**
   * Escena Babylon. Accesible en subclases para crear meshes, luces, etc.
   */
  protected readonly scene: Scene;

  /**
   * Gestor de assets. Accesible en subclases para cargar modelos GLB.
   */
  protected readonly assetManager: AssetManager;

  /**
   * TransformNode raiz de la sala.
   * Toda la geometria (meshes, luces, nodos hijos) se ancla aqui.
   * Llamar rootNode.dispose() destruye visualmente la sala completa.
   *
   * Nombrado como 'room_{id}' para identificacion en el inspector de Babylon.
   */
  protected readonly rootNode: TransformNode;

  // --- Estado --------------------------------------------------

  private _isBuilt = false;

  /**
   * true unicamente despues de que build() haya completado con exito.
   * Vuelve a false tras dispose().
   */
  get isBuilt(): boolean {
    return this._isBuilt;
  }

  // --- Puntos de conexion --------------------------------------

  /**
   * Puertas y pasajes de esta sala hacia otras.
   * Las subclases de exploracion lo populan en _buildImpl().
   * CombatRoom lo deja vacio (hereda el default de getConnectionPoints).
   */
  protected _connectionPoints: ConnectionPoint[] = [];

  // --- Constructor ---------------------------------------------

  constructor(config: RoomConfig) {
    this.id           = config.id;
    this.scene        = config.scene;
    this.assetManager = config.assetManager;

    // El rootNode agrupa TODA la geometria de la sala.
    // Al hacer dispose() de este nodo se limpia todo sin rastrear cada mesh.
    this.rootNode = new TransformNode(`room_${config.id}`, config.scene);
  }

  // --- Template method: build ----------------------------------

  /**
   * Construye la sala: geometria, luces y props.
   *
   * Template method: no se sobreescribe en subclases.
   * Las subclases implementan _buildImpl() con su logica real.
   *
   * Guard anti-doble: si build() ya se llamo, registra un warning
   * y retorna sin hacer nada. Evita duplicar geometria en escena.
   */
  async build(): Promise<void> {
    if (this._isBuilt) {
      logger.warn(`Room '${this.id}': build() llamado mas de una vez -- ignorado.`);
      return;
    }
    await this._buildImpl();
    this._isBuilt = true;
  }

  /**
   * Implementacion interna de build(). Llamado una sola vez por build().
   * Cada subclase construye aqui su geometria, luces y props.
   * No llamar directamente: usar build() publico.
   */
  protected abstract _buildImpl(): Promise<void>;

  // --- Metodos abstractos --------------------------------------

  /**
   * Punto de spawn del jugador al entrar en esta sala.
   * Cada sala lo define segun su planta y el punto de llegada.
   * Devuelve coordenadas world (y=0 = nivel suelo).
   */
  abstract getSpawnPoint(): Vec3;

  // --- Metodos comunes -----------------------------------------

  /**
   * Devuelve los puntos de conexion (puertas/salidas) de la sala.
   *
   * Implementacion por defecto: copia defensiva de _connectionPoints.
   * Devuelve array vacio si la sala no ha definido conexiones.
   *
   * CombatRoom hereda este default (no tiene puertas propias;
   * la vuelta a exploracion la gestiona un futuro CombatTransitionManager).
   * ExplorationRoom y sus subclases populan _connectionPoints en _buildImpl().
   */
  getConnectionPoints(): ConnectionPoint[] {
    return [...this._connectionPoints];
  }

  /**
   * Devuelve las fuentes de luz (PointLight) de esta sala.
   * Implementacion por defecto: array vacio.
   *
   * ExplorationRoom sobreescribe con _lightSources para que
   * Dungeon pueda animar su intensidad en las transiciones.
   * CombatRoom hereda el default (no tiene luces propias;
   * la iluminacion de combate se gestionara en A3+).
   *
   * future A2-b3: las salas de exploracion reales poblaran
   * _lightSources al construir su geometria.
   */
  getLightSources(): readonly PointLight[] {
    return [];
  }

  // --- Hooks de ciclo de vida ----------------------------------

  /**
   * Llamado cuando el jugador entra en esta sala.
   * @param _from ConnectionPoint de origen. undefined si es spawn inicial.
   *
   * Implementacion por defecto: no-op.
   * Las subclases sobreescriben para logica de entrada
   * (activar enemigos, iniciar musica, abrir puertas, etc.).
   *
   * future: emit event 'room:enter' via EventBus cuando exista.
   * Ejemplo: eventBus.emit('room:enter', { roomId: this.id, from: _from })
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnter(_from?: ConnectionPoint): void {
    // no-op por defecto
    // future: eventBus.emit('room:enter', { roomId: this.id, from: _from })
  }

  /**
   * Llamado cuando el jugador sale de esta sala.
   * @param _to ConnectionPoint de destino. undefined si es teleport o muerte.
   *
   * Implementacion por defecto: no-op.
   * Las subclases sobreescriben para logica de salida
   * (guardar estado, desactivar enemigos, cerrar puertas, etc.).
   *
   * future: emit event 'room:exit' via EventBus cuando exista.
   * Ejemplo: eventBus.emit('room:exit', { roomId: this.id, to: _to })
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onExit(_to?: ConnectionPoint): void {
    // no-op por defecto
    // future: eventBus.emit('room:exit', { roomId: this.id, to: _to })
  }

  /**
   * Destruye toda la geometria de la sala.
   *
   * Implementacion base:
   *   1. Llama rootNode.dispose() -- destruye todos los meshes y nodos hijos.
   *   2. Resetea _isBuilt a false.
   *
   * Las subclases que necesiten limpieza adicional (particulas, luces
   * externas, observadores) deben sobreescribir dispose() y llamar
   * super.dispose() al final para garantizar la limpieza del rootNode.
   *
   * future: emit event 'room:dispose' via EventBus cuando exista.
   * Ejemplo: eventBus.emit('room:dispose', { roomId: this.id })
   */
  dispose(): void {
    // future: eventBus.emit('room:dispose', { roomId: this.id })
    this.rootNode.dispose();
    this._isBuilt = false;
  }
}
