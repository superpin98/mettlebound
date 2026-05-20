/**
 * TargetDummy -- entidad estatica no hostil para validar el sistema de combate.
 *
 * Extiende Combatant (logica pura de HP) y anade:
 *   - Mesh primitiva Babylon (cilindro gris, sin texturas)
 *   - Overlay HTML con barra de vida pixel art proyectada sobre el mundo 3D
 *   - Comportamiento al morir: animacion de caida tipo Minecraft + barra oculta
 *   - Respawn manual via respawn()
 *
 * metadata.isTargetDummy = true en el mesh: hitbox preparado para el
 * sistema de seleccion de objetivo del Bloque 8.
 */

import {
  Animation,
  EasingFunction,
  MeshBuilder,
  QuarticEase,
  StandardMaterial,
  Color3,
  Vector3,
  Matrix,
  type Scene,
  type Mesh,
  type Observer,
} from '@babylonjs/core';

import { Combatant } from '@/game/combat/Combatant';

// ── Constantes ────────────────────────────────────────────────

const DUMMY_MAX_HP = 200;

/** Altura del cilindro en unidades Babylon */
const CYLINDER_HEIGHT   = 1.8;

/** Radio del cilindro (diameter / 2) */
const CYLINDER_RADIUS   = 0.35;

/** Y del centro cuando esta de pie: height/2 */
const STAND_Y = CYLINDER_HEIGHT / 2;   // 0.9

/** Y del centro cuando esta tumbado de lado: radius */
const FALLEN_Y = CYLINDER_RADIUS;      // 0.35

/** Gris oscuro neutral -- color del cilindro */
const COLOR_ALIVE = new Color3(0.29, 0.29, 0.29);   // #4a4a4a

/** Unidades Babylon por encima del centro del mesh donde aparece la barra */
const OVERLAY_ABOVE = 1.6;

/** Duracion de la animacion de caida en fotogramas (a 60 fps ~ 400 ms) */
const DEATH_ANIM_FRAMES = 24;

/** FPS de referencia para las animaciones Babylon */
const ANIM_FPS = 60;

// ── Clase ─────────────────────────────────────────────────────

export class TargetDummy extends Combatant {

  private readonly _scene: Scene;
  private readonly _mesh: Mesh;
  private readonly _mat: StandardMaterial;

  /** Contenedor raiz del overlay (position: fixed en el DOM) */
  private readonly _overlay: HTMLDivElement;

  /** Div interior que representa el relleno de la barra */
  private readonly _fill: HTMLDivElement;

  /** Observer del render loop para actualizar posicion del overlay */
  private _renderObserver: Observer<Scene> | null = null;

  constructor(scene: Scene, position: Vector3) {
    super(DUMMY_MAX_HP);

    this._scene = scene;

    // ── Mesh ─────────────────────────────────────────────────

    this._mat = new StandardMaterial('dummyMat', scene);
    this._mat.diffuseColor  = COLOR_ALIVE;
    this._mat.specularColor = Color3.Black();

    this._mesh = MeshBuilder.CreateCylinder(
      'targetDummy',
      { height: CYLINDER_HEIGHT, diameter: CYLINDER_RADIUS * 2, tessellation: 12 },
      scene,
    );
    // Y = STAND_Y para que la base del cilindro toque el suelo (height/2)
    this._mesh.position = new Vector3(position.x, STAND_Y, position.z);
    this._mesh.material = this._mat;
    // Flag para el sistema de seleccion de objetivo (Bloque 8)
    this._mesh.metadata = { isTargetDummy: true };

    // ── Overlay HTML ──────────────────────────────────────────

    this._overlay = document.createElement('div');
    this._overlay.className = 'dummy-hp-overlay';

    const wrap = document.createElement('div');
    wrap.className = 'dummy-hp-bar-wrap';

    this._fill = document.createElement('div');
    this._fill.className = 'dummy-hp-bar-fill';

    wrap.appendChild(this._fill);
    this._overlay.appendChild(wrap);
    document.body.appendChild(this._overlay);

    // ── Render loop ───────────────────────────────────────────

    this._renderObserver = scene.onBeforeRenderObservable.add(() => {
      this._updateOverlayPosition();
      this._updateFillWidth();
    });
  }

  // ── API publica ───────────────────────────────────────────────

  /**
   * Aplica danio al dummy. Si muere, lanza la animacion de caida.
   * @param amount Cantidad de danio (positivo).
   */
  override takeDamage(amount: number): void {
    if (this.isDead) return;   // ya muerto: ignorar danio adicional
    super.takeDamage(amount);
    if (this.isDead) {
      this._applyDeadState();
    }
  }

  /**
   * Restaura el dummy a su estado inicial: HP completo, de pie y barra visible.
   * Cancela cualquier animacion en curso antes de resetear la pose.
   */
  respawn(): void {
    this._scene.stopAnimation(this._mesh);
    this._mesh.rotation.z = 0;
    this._mesh.position.y = STAND_Y;
    this.restoreToFull();
    this._applyAliveState();
  }

  /** Libera todos los recursos (mesh, material, overlay, observer). */
  dispose(): void {
    if (this._renderObserver) {
      this._scene.onBeforeRenderObservable.remove(this._renderObserver);
      this._renderObserver = null;
    }
    this._scene.stopAnimation(this._mesh);
    this._mesh.dispose();
    this._mat.dispose();
    this._overlay.remove();
  }

  // ── Helpers privados ──────────────────────────────────────────

  private _applyDeadState(): void {
    this._overlay.style.visibility = 'hidden';
    this._playDeathAnimation();
  }

  private _applyAliveState(): void {
    this._overlay.style.visibility = 'visible';
  }

  /**
   * Animacion de caida estilo Minecraft:
   *   - rotation.z: 0 → PI/2 (el cilindro cae de lado)
   *   - position.y: STAND_Y → FALLEN_Y (el centro baja al radio para apoyar en el suelo)
   * Easing: QuarticEaseOut -- empieza rapido y desacelera al apoyar.
   * Duracion: DEATH_ANIM_FRAMES / ANIM_FPS ~ 400 ms.
   */
  private _playDeathAnimation(): void {

    // ── Animacion de rotacion (eje Z) ─────────────────────────
    const rotAnim = new Animation(
      'dummyDeathRot',
      'rotation.z',
      ANIM_FPS,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    rotAnim.setKeys([
      { frame: 0,                  value: 0 },
      { frame: DEATH_ANIM_FRAMES,  value: Math.PI / 2 },
    ]);

    // ── Animacion de posicion (eje Y) ─────────────────────────
    const posAnim = new Animation(
      'dummyDeathPos',
      'position.y',
      ANIM_FPS,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    posAnim.setKeys([
      { frame: 0,                  value: STAND_Y },
      { frame: DEATH_ANIM_FRAMES,  value: FALLEN_Y },
    ]);

    // ── Easing compartido ─────────────────────────────────────
    const easing = new QuarticEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    rotAnim.setEasingFunction(easing);
    posAnim.setEasingFunction(easing);

    this._mesh.animations = [rotAnim, posAnim];
    this._scene.beginAnimation(this._mesh, 0, DEATH_ANIM_FRAMES, false);
  }

  private _updateFillWidth(): void {
    this._fill.style.width = `${this.hpPercent * 100}%`;
  }

  /**
   * Proyecta la posicion 3D del dummy a coordenadas de pantalla y
   * actualiza el CSS del overlay. Llamado cada frame desde el render loop.
   */
  private _updateOverlayPosition(): void {
    const scene = this._scene;
    if (!scene.activeCamera) return;

    const engine = scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const viewport = scene.activeCamera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );

    // Punto de anclaje: encima del centro del cilindro (cuando esta de pie)
    const worldPos = this._mesh.getAbsolutePosition().clone();
    worldPos.y += OVERLAY_ABOVE;

    const projected = Vector3.Project(
      worldPos,
      Matrix.Identity(),
      scene.getTransformMatrix(),
      viewport,
    );

    // Ocultar si el punto esta detras de la camara (z > 1 en NDC)
    if (projected.z > 1) {
      this._overlay.style.visibility = 'hidden';
      return;
    }

    if (!this.isDead) {
      this._overlay.style.visibility = 'visible';
    }

    this._overlay.style.left = `${rect.left + projected.x}px`;
    this._overlay.style.top  = `${rect.top  + projected.y}px`;
  }
}
