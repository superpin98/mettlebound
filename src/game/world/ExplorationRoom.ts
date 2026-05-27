// Imports externos (Babylon.js) -- solo tipos, sin valor en runtime
import type { PointLight } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { InteractableProp } from '@/types/interaction.types';
import type { ConnectionPoint, RoomMode, RoomShape } from '@/game/world/types/room.types';
import { Room } from '@/game/world/Room';
import type { RoomConfig } from '@/game/world/Room';

// ============================================================
// RoomRect -- rectangulo 2D en plano XZ
// ============================================================

/**
 * Rectangulo en el plano XZ que define un area del suelo de la sala.
 *   x, z   -- esquina inferior izquierda en coordenadas world.
 *   width  -- extension en el eje X.
 *   depth  -- extension en el eje Z.
 */
export interface RoomRect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

// ============================================================
// ExplorationRoom -- clase abstracta para salas de exploracion
// ============================================================

/**
 * Clase base de todas las salas de exploracion libre de Mettlebound.
 *
 * Responsabilidades:
 *   - Declara mode = 'exploration' (concreto, no sobreescribible).
 *   - Expone la API de construccion de planta: addArea, cutArea, addPillar, addDoor.
 *   - Mantiene las colecciones _areas, _cuts, _pillars, _interactables, _lightSources.
 *   - Define _buildGeometry() como hook no-op (se implementara en A2-b3).
 *
 * Las subclases concretas (Corridor, HubRoom, LShapeRoom, ...) implementan:
 *   - get shape(): RoomShape  -- forma geometrica de la planta.
 *   - _buildImpl(): Promise<void>  -- llama a addArea/cutArea/addPillar/addDoor
 *                                     y al final a _buildGeometry().
 *   - getSpawnPoint(): Vec3  -- punto de spawn al entrar en la sala.
 *
 * Hereda el patron Template Method de Room:
 *   build() publico -> _buildImpl() protegido -> _buildGeometry() protegido.
 */
export abstract class ExplorationRoom extends Room {

  // --- Identidad -----------------------------------------------

  /** Modo fijo de todas las salas de exploracion. */
  readonly mode: RoomMode = 'exploration';

  // ExplorationRoom NO declara shape: cada subclase concreta la fija.
  abstract readonly shape: RoomShape;

  // --- Colecciones de planta -----------------------------------

  /**
   * Rectangulos que forman el suelo navegable de la sala.
   * Una sala rectangular tiene 1 area; una L-shape tiene 2 areas, etc.
   */
  protected _areas: RoomRect[] = [];

  /**
   * Rectangulos que se recortan del area total para formar la planta.
   * Ej: esquina interior de una L-shape.
   */
  protected _cuts: RoomRect[] = [];

  /**
   * Posiciones world del centro de cada pilar de la sala.
   * Los pilares bloquean tiles del grid cuando la sala entra en combate.
   */
  protected _pillars: Vec3[] = [];

  // --- Objetos interactuables ----------------------------------

  /**
   * Props del entorno que implementan el sistema de interaccion por vectores.
   * Vacio en A2-b1; se rellena en A2-b3 cuando se construya geometria real.
   *
   * Fuente de verdad del tipo: docs/15_INTERACTION_SYSTEM.md secc. 1.8.
   */
  protected _interactables: InteractableProp[] = [];

  // --- Fuentes de luz ------------------------------------------

  /**
   * Luces de punto de Babylon.js creadas en esta sala.
   * Se gestionan aqui para poder apagarlas / destruirlas en dispose().
   *
   * future A2-b3: poblar en _buildGeometry() al colocar antorchas.
   */
  protected _lightSources: PointLight[] = [];

  // --- Constructor ---------------------------------------------

  constructor(config: RoomConfig) {
    super(config);
  }

  // --- API de construccion de planta ---------------------------

  /**
   * Anade un rectangulo navegable a la planta de la sala.
   * Llamar en _buildImpl() antes de _buildGeometry().
   */
  protected addArea(rect: RoomRect): void {
    this._areas.push(rect);
  }

  /**
   * Recorta un rectangulo del area navegable (para plantas en L, T, U).
   * Llamar en _buildImpl() antes de _buildGeometry().
   */
  protected cutArea(rect: RoomRect): void {
    this._cuts.push(rect);
  }

  /**
   * Registra la posicion de un pilar.
   * Llamar en _buildImpl() antes de _buildGeometry().
   */
  protected addPillar(position: Vec3): void {
    this._pillars.push(position);
  }

  /**
   * Anade un punto de conexion (puerta/salida) a la sala.
   * Llamar en _buildImpl() para cada salida de la sala.
   * Los datos quedan accesibles via getConnectionPoints() (heredado de Room).
   */
  protected addDoor(point: ConnectionPoint): void {
    this._connectionPoints.push(point);
  }

  // --- Override de getLightSources -----------------------------

  /**
   * Devuelve las PointLight de esta sala para las transiciones de iluminacion.
   * Vacio hasta A2-b3, cuando _buildGeometry() popule _lightSources.
   */
  override getLightSources(): readonly PointLight[] {
    return this._lightSources;
  }

  // --- Hook de geometria ---------------------------------------

  /**
   * Construye los meshes de suelo y paredes a partir de _areas, _cuts y _pillars.
   *
   * No-op en A2-b1. Se implementara en A2-b3 con MeshBuilder cuando
   * la sala de exploracion real sustituya a TestRoom.
   *
   * future A2-b3: crear GroundMesh para cada RoomRect en _areas,
   * aplicar _cuts como huecos, colocar pilares y construir paredes perimetrales.
   */
  protected _buildGeometry(): void {
    // no-op hasta A2-b3
  }
}
