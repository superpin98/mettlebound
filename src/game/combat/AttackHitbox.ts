/**
 * AttackHitbox -- hitbox de impacto universal para el ataque cuerpo a cuerpo.
 *
 * Arquitectura:
 *   Un TransformNode se ancla como hijo del pivot del jugador en posición local
 *   (0, offsetY, offsetZ). Al ser hijo del pivot, hereda automáticamente su
 *   posición Y orientación: el hitbox siempre queda DELANTE de donde mira el
 *   jugador, con cualquier clase.
 *
 * Detección de impacto (overlap activo):
 *   Havok no genera TRIGGER_ENTERED entre dos cuerpos ANIMATED. En su lugar,
 *   durante la ventana de impacto se añade un observer onBeforeRender que compara
 *   la posición mundial del hitbox con la de cada target registrado. Si la
 *   distancia < radius → emite 'player:attack-hit'.
 *
 * Config por clase:
 *   CLASS_HITBOX_CONFIG indexa HitboxConfig por ClassId.
 *   Añadir una entrada por clase cuando se implemente en Sprint 5+.
 *   PlayerController llama setClassConfig() en cada loadModel().
 *
 * Targets:
 *   Registrar cada enemigo golpeable con registerTarget(physicsBody, getCenter).
 *   getCenter() devuelve el centro del cuerpo del enemigo (no el pivot en el suelo).
 *
 * Emite:
 *   'player:attack-hit' → { body: PhysicsBody } — una sola vez por ventana.
 */

import {
  Scene,
  TransformNode,
  Vector3,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeSphere,
} from '@babylonjs/core';
import type { Observer, AnimationGroup } from '@babylonjs/core';
import type { ClassId } from '@/types/game.types';
import { eventBus } from '@/core/EventBus';
import { logger } from '@/core/Logger';

// ── Ventana de impacto ────────────────────────────────────────────────────────
// Fracción de la duración total del swing en que el hitbox está activo.
// TUNABLE: ajustar viendo cuándo conecta el puño visualmente en el navegador.

/** El hitbox se activa cuando el swing lleva este % completado. */
export const ATTACK_HIT_WINDOW_START = 0.40;  // <-- TUNABLE
/** El hitbox se desactiva cuando el swing lleva este % completado. */
export const ATTACK_HIT_WINDOW_END   = 0.70;  // <-- TUNABLE

// ── Config por clase ──────────────────────────────────────────────────────────

export interface HitboxConfig {
  /** Distancia delante del pivot (eje Z local del jugador), en metros. */
  offsetZ: number;
  /** Altura del centro del hitbox sobre el suelo, en metros. */
  offsetY: number;
  /** Radio de la esfera de detección, en metros. */
  radius:  number;
}

/**
 * Config de hitbox indexada por ClassId.
 * Solo guerrero activo hoy; añadir el resto en Sprint 5+.
 */
export const CLASS_HITBOX_CONFIG: Partial<Record<ClassId, HitboxConfig>> = {
  guerrero: { offsetZ: 1.0, offsetY: 0.0, radius: 0.9 },
  // errante: { offsetZ: 0.8, offsetY: 0.9, radius: 0.5 },
  // arquero: { offsetZ: 1.8, offsetY: 1.0, radius: 0.4 },
  // mago:    { offsetZ: 1.5, offsetY: 1.2, radius: 0.7 },
  // picaro:  { offsetZ: 0.9, offsetY: 0.9, radius: 0.5 },
};

const DEFAULT_HITBOX: HitboxConfig = { offsetZ: 1.0, offsetY: 1.0, radius: 0.6 };

// ── Tipos internos ────────────────────────────────────────────────────────────

interface HitTarget {
  body:    PhysicsBody;
  /** Devuelve el centro 3D del cuerpo del enemigo (NO el pivot en y=0). */
  getCenter: () => Vector3;
}

// ── AttackHitbox ──────────────────────────────────────────────────────────────

export class AttackHitbox {

  private readonly _scene: Scene;
  private readonly _node:  TransformNode;   // hijo del pivot del jugador
  private readonly _body:  PhysicsBody;     // body ANIMATED, sigue al nodo
  private          _shape: PhysicsShapeSphere;

  private _currentRadius: number;
  private _targets: HitTarget[]                    = [];
  private _frameObserver: Observer<Scene> | null   = null;
  private _isActive       = false;
  private _hitFired       = false;

  private _activateTimer:   ReturnType<typeof setTimeout> | null = null;
  private _deactivateTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param scene   Escena Babylon (Havok ya inicializado).
   * @param pivot   TransformNode del jugador. El hitbox se ancla como hijo.
   * @param config  Config inicial (se actualiza con setClassConfig).
   */
  constructor(
    scene:  Scene,
    pivot:  TransformNode,
    config: HitboxConfig = DEFAULT_HITBOX,
  ) {
    this._scene         = scene;
    this._currentRadius = config.radius;

    // Nodo hijo del pivot: hereda posición y rotación del jugador
    this._node        = new TransformNode('attackHitboxNode', scene);
    this._node.parent = pivot;
    this._node.position.set(0, config.offsetY, config.offsetZ);

    // PhysicsBody ANIMATED — mantiene la forma en escena pero el overlap
    // se detecta por código (ver _startFrameCheck), no por TRIGGER_ENTERED.
    // Nota: Havok no genera eventos entre dos cuerpos ANIMATED.
    this._body = new PhysicsBody(this._node, PhysicsMotionType.ANIMATED, false, scene);
    this._body.disablePreStep = false;

    this._shape           = new PhysicsShapeSphere(Vector3.Zero(), config.radius, scene);
    this._shape.isTrigger = true;
    this._body.shape      = this._shape;

    logger.debug('AttackHitbox: creado', { config });
  }

  // ── Registrar targets ─────────────────────────────────────────────────────

  /**
   * Registra un enemigo golpeable.
   * @param body       PhysicsBody del enemigo (para identificarlo en player:attack-hit).
   * @param getCenter  Función que devuelve el centro 3D del cuerpo del enemigo
   *                   (pivot + offset Y, NO la posición en el suelo).
   */
  registerTarget(body: PhysicsBody, getCenter: () => Vector3): void {
    this._targets.push({ body, getCenter });
    logger.debug('AttackHitbox: target registrado', { total: this._targets.length });
  }

  // ── Config de clase ───────────────────────────────────────────────────────

  /**
   * Actualiza offset y radio según la clase activa.
   * Llamar desde PlayerController.loadModel() en cada cambio de clase.
   */
  setClassConfig(classId: ClassId): void {
    const cfg         = CLASS_HITBOX_CONFIG[classId] ?? DEFAULT_HITBOX;
    this._currentRadius = cfg.radius;
    this._node.position.set(0, cfg.offsetY, cfg.offsetZ);

    this._body.shape = null;
    this._shape.dispose();
    this._shape           = new PhysicsShapeSphere(Vector3.Zero(), cfg.radius, this._scene);
    this._shape.isTrigger = true;
    this._body.shape      = this._shape;

    logger.debug('AttackHitbox: config de clase aplicada', { classId, cfg });
  }

  // ── Ventana de impacto ────────────────────────────────────────────────────

  /**
   * Programa la activación/desactivación durante la ventana de impacto.
   * Llamar justo después de iniciar la animación de ataque.
   */
  scheduleWindow(anim: AnimationGroup): void {
    this._clearTimers();

    const fps     = anim.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    const totalMs = ((anim.to - anim.from) / fps) * 1000;
    const onAt    = totalMs * ATTACK_HIT_WINDOW_START;
    const offAt   = totalMs * ATTACK_HIT_WINDOW_END;

    this._activateTimer = setTimeout(() => {
      this._isActive = true;
      this._hitFired = false;
      this._startFrameCheck();
    }, onAt);

    this._deactivateTimer = setTimeout(() => {
      this._stopFrameCheck();
      this._isActive = false;
    }, offAt);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  dispose(): void {
    this._clearTimers();
    this._isActive   = false;
    this._body.shape = null;
    this._shape.dispose();
    this._body.dispose();
    this._node.dispose();
    logger.debug('AttackHitbox: disposed');
  }

  // ── Overlap activo (onBeforeRender) ───────────────────────────────────────

  private _startFrameCheck(): void {
    if (this._frameObserver !== null) { return; }

    this._frameObserver = this._scene.onBeforeRenderObservable.add(() => {
      if (!this._isActive || this._hitFired) { return; }
      if (this._targets.length === 0)        { return; }

      const hitboxPos = this._node.getAbsolutePosition();

      for (const target of this._targets) {
        const targetCenter = target.getCenter();
        const dist = Vector3.Distance(hitboxPos, targetCenter);

        if (dist <= this._currentRadius) {
          this._hitFired = true;
          eventBus.emit('player:attack-hit', { body: target.body });
        }
      }
    });
  }

  private _stopFrameCheck(): void {
    if (this._frameObserver !== null) {
      this._scene.onBeforeRenderObservable.remove(this._frameObserver);
      this._frameObserver = null;
    }
  }

  // ── Privado ───────────────────────────────────────────────────────────────

  private _clearTimers(): void {
    if (this._activateTimer !== null) {
      clearTimeout(this._activateTimer);
      this._activateTimer = null;
    }
    if (this._deactivateTimer !== null) {
      clearTimeout(this._deactivateTimer);
      this._deactivateTimer = null;
    }
    this._stopFrameCheck();
    this._isActive = false;
    this._hitFired = false;
  }
}
