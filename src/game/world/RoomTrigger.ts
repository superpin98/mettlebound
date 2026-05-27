// Imports externos (Babylon.js)
import {
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsEventType,
} from '@babylonjs/core';
import type { Scene, PhysicsBody } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { Room } from '@/game/world/Room';
import type { RoomEventBus } from '@/game/world/RoomEventBus';

// ============================================================
// TriggerBounds -- volumen de deteccion
// ============================================================

/**
 * Caja AABB que define el volumen de deteccion del trigger.
 * center.y = 0 + height/2 es el centro vertical tipico:
 *   el trigger cubre desde el suelo hasta 'height' unidades.
 * En A2-b2 se coloca manualmente al registrar la sala.
 * En A2-b3 se calculara automaticamente a partir de los _areas.
 */
export interface TriggerBounds {
  /** Centro del volumen en coordenadas world. */
  center: Vec3;
  /** Extension en el eje X (ancho). */
  width:  number;
  /** Extension en el eje Y (alto). Suficiente para cubrir al jugador. */
  height: number;
  /** Extension en el eje Z (profundo). */
  depth:  number;
}

// ============================================================
// RoomTriggerConfig
// ============================================================

export interface RoomTriggerConfig {
  /** Sala a la que pertenece este trigger. */
  room:        Room;
  /** Escena Babylon activa (ya con Havok inicializado). */
  scene:       Scene;
  /** Volumen de deteccion. */
  bounds:      TriggerBounds;
  /**
   * PhysicsBody del jugador.
   * El trigger solo emite eventos cuando colisiona con este body.
   * Comparacion por referencia -- no se usa tag ni layer.
   */
  playerBody:  PhysicsBody;
  /** Bus de eventos al que el trigger emitira room:enter / room:exit. */
  eventBus:    RoomEventBus;
}

// ============================================================
// RoomTrigger -- volumen fisico de deteccion de sala
// ============================================================

/**
 * Crea un volumen trigger (sensor Havok) que cubre una sala completa.
 *
 * Cuando el PhysicsBody del jugador entra en el volumen emite 'room:enter'.
 * Cuando sale emite 'room:exit'.
 *
 * El mesh es invisible y no bloquea el movimiento ni las fisicas normales.
 *
 * ─── NOTA SOBRE LA API HAVOK EN BABYLON.JS 9.7 ───────────────────
 * TODO A2-b4: verificar los siguientes puntos en navegador real:
 *   1. PhysicsAggregate acepta { mass: 0 } para cuerpos estaticos.
 *   2. aggregate.shape.isTrigger = true convierte el shape en sensor.
 *   3. aggregate.body.setCollisionCallbackEnabled(true) activa eventos.
 *   4. El observable devuelve eventos con propiedades 'collider' y
 *      'collidedAgainst' de tipo PhysicsBody.
 *   5. PhysicsEventType.COLLISION_STARTED / COLLISION_FINISHED son los
 *      nombres correctos en esta version (pueden llamarse diferente).
 *      Alternativas conocidas: COLLISION_STARTED / COLLISION_ENDED.
 * Si la API difiere, los ajustes se limitan a esta clase.
 * ──────────────────────────────────────────────────────────────────
 */
export class RoomTrigger {

  /** ID de la sala que este trigger representa. */
  readonly roomId: string;

  private readonly _config:    RoomTriggerConfig;
  private readonly _aggregate: PhysicsAggregate;

  constructor(config: RoomTriggerConfig) {
    this._config = config;
    this.roomId  = config.room.id;

    // Crear mesh invisible que sirve de soporte al PhysicsAggregate.
    // El mesh es hijo de la escena pero no de rootNode de la sala:
    // queremos que sobreviva aunque la sala se haya construido antes.
    const mesh = MeshBuilder.CreateBox(
      `trigger_${this.roomId}`,
      {
        width:  config.bounds.width,
        height: config.bounds.height,
        depth:  config.bounds.depth,
      },
      config.scene,
    );
    mesh.position.set(
      config.bounds.center.x,
      config.bounds.center.y,
      config.bounds.center.z,
    );
    mesh.isVisible = false;
    mesh.isPickable = false;

    // Crear PhysicsAggregate estatico.
    // TODO A2-b4: confirmar que { mass: 0 } crea un body STATIC en Havok.
    this._aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.BOX,
      { mass: 0 },
      config.scene,
    );

    // Convertir el shape en sensor (no colisiona, solo detecta).
    // TODO A2-b4: verificar que isTrigger existe en PhysicsShape de BJS 9.7.
    this._aggregate.shape.isTrigger = true;

    // Activar el callback de colision en el body del trigger.
    this._aggregate.body.setCollisionCallbackEnabled(true);

    // Suscribirse al observable de colisiones.
    this._registerCollisionObserver();
  }

  // ─── dispose ─────────────────────────────────────────────────

  /**
   * Destruye el mesh y el PhysicsAggregate del trigger.
   * Llamar cuando la sala es eliminada del Dungeon.
   */
  dispose(): void {
    this._aggregate.dispose();
  }

  // ─── Logica de colision ───────────────────────────────────────

  private _registerCollisionObserver(): void {
    const observable = this._aggregate.body.getCollisionObservable();
    const { playerBody, eventBus, room } = this._config;

    observable.add((event) => {
      // Determinar cual de los dos cuerpos es el "otro" (no el trigger).
      // TODO A2-b4: verificar nombres de propiedades del evento en BJS 9.7.
      const triggerBody = this._aggregate.body;
      const other = (event.collider === triggerBody)
        ? event.collidedAgainst
        : event.collider;

      // Filtrar: solo reaccionar al body del jugador.
      if (other !== playerBody) { return; }

      if (event.type === PhysicsEventType.COLLISION_STARTED) {
        eventBus.emit('room:enter', { roomId: room.id });
      } else if (event.type === PhysicsEventType.COLLISION_FINISHED) {
        // TODO A2-b4: verificar nombre -- puede ser COLLISION_ENDED en BJS 9.7.
        eventBus.emit('room:exit', { roomId: room.id });
      }
    });
  }
}
