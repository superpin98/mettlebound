// Imports externos (Babylon.js)
import {
  ArcRotateCamera,
  ArcRotateCameraPointersInput,
  Vector3,
} from '@babylonjs/core';
import type { Scene, Observer } from '@babylonjs/core';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// CombatCamera -- camara isometrica dedicada para el combate.
//
// Instancia propia, independiente de la camara de exploracion.
// No interfiere con CameraController ni con InputManager del player.
//
// Controles:
//   - WASD         -> panea el target sobre el plano XZ del tablero,
//                     relativo a la orientacion actual de la camara.
//                     W = hacia donde mira la camara (adelante).
//                     S = atras.  A = izquierda.  D = derecha.
//                     El target.y NUNCA cambia (siempre a ras del tablero).
//   - Click derecho -> orbita 360 alrededor del tablero (sin limite de alpha).
//   - Rueda        -> zoom (acercar/alejar).
//   - Click izquierdo / click central -> sin accion.
// ============================================================

// ── Constantes ajustables ────────────────────────────────────────────────────

/** Velocidad de paneo WASD en metros por segundo. Subir para pan mas rapido. */
const PAN_SPEED = 8;

/** Angulo horizontal inicial — diagonal isometrica clasica. */
const ALPHA_INITIAL = -Math.PI / 4;

/** Angulo vertical inicial — 45 grados de elevacion. */
const BETA_INITIAL = Math.PI / 4;

/** Beta minimo: camara muy cenital (~22 grados). */
const BETA_MIN = Math.PI / 8;

/** Beta maximo: todavia elevada, nunca a ras de suelo (~60 grados). */
const BETA_MAX = Math.PI / 3;

/** Radio inicial: encuadra el grid 20x20 m con margen. */
const RADIUS_INITIAL = 24;

/** Radio minimo (zoom in maximo). */
const RADIUS_MIN = 10;

/** Radio maximo (zoom out maximo). */
const RADIUS_MAX = 40;

/** Sensibilidad de la orbita orbital (menor = giro mas rapido). */
const ANGULAR_SENSIBILITY = 800;

/** Precision de la rueda de zoom (mayor = zoom mas lento). */
const WHEEL_PRECISION = 10;

// ── Clase ─────────────────────────────────────────────────────────────────────

export class CombatCamera {

  private readonly _camera:       ArcRotateCamera;
  private _pressedKeys:           Set<string>       = new Set();
  private _keyDownHandler:        ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler:          ((e: KeyboardEvent) => void) | null = null;
  private _renderObserver:        Observer<Scene>   | null = null;

  /**
   * Crea la camara isometrica.
   * No activa controles hasta llamar a activate().
   */
  constructor(scene: Scene) {
    this._camera = new ArcRotateCamera(
      'combatCamera',
      ALPHA_INITIAL,
      BETA_INITIAL,
      RADIUS_INITIAL,
      Vector3.Zero(),
      scene,
    );

    // ── Limites de elevacion: nunca a ras de suelo ───────────────────────
    this._camera.lowerBetaLimit  = BETA_MIN;
    this._camera.upperBetaLimit  = BETA_MAX;

    // ── Limites de zoom ──────────────────────────────────────────────────
    this._camera.lowerRadiusLimit = RADIUS_MIN;
    this._camera.upperRadiusLimit = RADIUS_MAX;

    // ── Orbita SOLO con click derecho (boton 2) ──────────────────────────
    // El click izquierdo queda libre para futura seleccion de casillas.
    const pointers = this._camera.inputs.attached['pointers'];
    if (pointers instanceof ArcRotateCameraPointersInput) {
      pointers.buttons = [2];
    }

    // ── Paneo por raton desactivado (usamos WASD en su lugar) ────────────
    this._camera.panningSensibility = 0;

    // ── Sensibilidades ───────────────────────────────────────────────────
    this._camera.angularSensibilityX = ANGULAR_SENSIBILITY;
    this._camera.angularSensibilityY = ANGULAR_SENSIBILITY;
    this._camera.wheelPrecision      = WHEEL_PRECISION;

    // Eliminar input de teclado de Babylon (WASD lo gestionamos nosotros).
    this._camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

    logger.info('CombatCamera: creada', {
      alpha: ALPHA_INITIAL,
      beta: BETA_INITIAL,
      radius: RADIUS_INITIAL,
    });
  }

  /** Referencia directa a la ArcRotateCamera de Babylon. */
  get camera(): ArcRotateCamera {
    return this._camera;
  }

  /**
   * Activa esta camara como camara principal de la escena.
   * Adjunta controles de raton y registra el listener de teclado WASD.
   *
   * Llamar ANTES de desconectar la camara de exploracion (para evitar frame sin camara activa).
   */
  activate(canvas: HTMLCanvasElement): void {
    const scene = this._camera.getScene();
    scene.activeCamera = this._camera;
    this._camera.attachControl(canvas, true);

    // Listeners de teclado propios — no interfieren con InputManager del player.
    // Durante el combate el PlayerController tiene _isInCombat=true y no mueve al personaje,
    // aunque ambos escuchen las mismas teclas.
    this._keyDownHandler = (e: KeyboardEvent): void => { this._pressedKeys.add(e.code); };
    this._keyUpHandler   = (e: KeyboardEvent): void => { this._pressedKeys.delete(e.code); };
    window.addEventListener('keydown', this._keyDownHandler);
    window.addEventListener('keyup',   this._keyUpHandler);

    // Loop de paneo: se ejecuta cada frame mientras esta camara esta activa.
    this._renderObserver = scene.onBeforeRenderObservable.add(() => {
      this._updatePan();
    });

    logger.info('CombatCamera: activada');
  }

  /**
   * Desconecta controles de raton, listeners de teclado y observer de render.
   * Llamar antes de reactivar la camara de exploracion.
   */
  deactivate(): void {
    this._camera.detachControl();

    if (this._keyDownHandler !== null) {
      window.removeEventListener('keydown', this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler !== null) {
      window.removeEventListener('keyup', this._keyUpHandler);
      this._keyUpHandler = null;
    }
    if (this._renderObserver !== null) {
      this._camera.getScene().onBeforeRenderObservable.remove(this._renderObserver);
      this._renderObserver = null;
    }
    this._pressedKeys.clear();

    logger.info('CombatCamera: desactivada');
  }

  dispose(): void {
    this.deactivate();
    this._camera.dispose();
  }

  // ── Paneo WASD ───────────────────────────────────────────────────────────────

  /**
   * Panea el target de la camara en el plano XZ relativo a su orientacion actual.
   * W = hacia donde apunta la camara. S = atras. A/D = lados.
   * El target.y siempre se mantiene en 0 (nunca drift vertical).
   */
  private _updatePan(): void {
    if (this._pressedKeys.size === 0) { return; }

    const dt = this._camera.getScene().getEngine().getDeltaTime() / 1000;

    // Vector "adelante" de la camara proyectado sobre el plano XZ.
    // Formula directa desde alpha (angle horizontal de ArcRotateCamera):
    //   posicion offset = (r*cos(b)*cos(a), r*sin(b), r*cos(b)*sin(a))
    //   forward_xz = -offset_xz normalizado = (-cos(a), 0, -sin(a))
    // Es un vector unitario (cos^2 + sin^2 = 1).
    const a   = this._camera.alpha;
    const fwd = new Vector3(-Math.cos(a), 0, -Math.sin(a));

    // Vector "derecha": perpendicular a forward sobre XZ, apuntando a la derecha.
    // Cross(Up, fwd) con Up=(0,1,0):
    //   = (1*(-sin(a)) - 0*0,  0*(-cos(a)) - 0*(-sin(a)),  0*0 - 1*(-cos(a)))
    //   = (-sin(a), 0, cos(a))
    const rgt = new Vector3(-Math.sin(a), 0, Math.cos(a));

    let dx = 0;
    let dz = 0;

    if (this._pressedKeys.has('KeyW')) { dx += fwd.x * PAN_SPEED * dt; dz += fwd.z * PAN_SPEED * dt; }
    if (this._pressedKeys.has('KeyS')) { dx -= fwd.x * PAN_SPEED * dt; dz -= fwd.z * PAN_SPEED * dt; }
    if (this._pressedKeys.has('KeyD')) { dx += rgt.x * PAN_SPEED * dt; dz += rgt.z * PAN_SPEED * dt; }
    if (this._pressedKeys.has('KeyA')) { dx -= rgt.x * PAN_SPEED * dt; dz -= rgt.z * PAN_SPEED * dt; }

    if (dx !== 0 || dz !== 0) {
      this._camera.target.x += dx;
      this._camera.target.z += dz;
      this._camera.target.y  = 0; // forzar siempre a ras del tablero
    }
  }
}
