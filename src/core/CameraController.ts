// Imports externos (Babylon.js)
import {
  ArcRotateCamera,
  ArcRotateCameraPointersInput,
  Scene,
} from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuración de la cámara
// ============================================================

// Ángulo horizontal inicial (mirando desde detrás del personaje)
const CAMERA_ALPHA_INITIAL = -Math.PI / 2;

// Ángulo vertical inicial en radianes: ~52° desde arriba
const CAMERA_BETA_INITIAL = 0.9;

// Distancia inicial de la cámara al personaje (en unidades)
const CAMERA_RADIUS_INITIAL = 8;

// Límites de ángulo vertical (no pasa por debajo del suelo ni vista cenital)
const CAMERA_BETA_MIN = 0.2;
const CAMERA_BETA_MAX = Math.PI / 2.5;

// Límites de zoom (distancia mínima y máxima al personaje)
const CAMERA_RADIUS_MIN = 3;
const CAMERA_RADIUS_MAX = 18;

// ============================================================
// CameraController — cámara orbital que sigue al personaje.
//
// Responsabilidad única: crear y gestionar la ArcRotateCamera.
//   - Sigue al personaje exactamente cada frame (sin lerp)
//   - El usuario puede orbitar con click derecho + arrastrar
//   - Zoom con rueda del ratón
// ============================================================

export class CameraController {
  private readonly _camera: ArcRotateCamera;
  private readonly _target: Mesh;

  constructor(scene: Scene, canvas: HTMLCanvasElement, target: Mesh) {
    this._target = target;

    this._camera = new ArcRotateCamera(
      'mainCamera',
      CAMERA_ALPHA_INITIAL,
      CAMERA_BETA_INITIAL,
      CAMERA_RADIUS_INITIAL,
      // Posición inicial del target = posición actual del personaje
      target.position.clone(),
      scene
    );

    // Límites para evitar que la cámara pase por debajo del suelo o llegue a cenital
    this._camera.lowerBetaLimit = CAMERA_BETA_MIN;
    this._camera.upperBetaLimit = CAMERA_BETA_MAX;

    // Límites de zoom
    this._camera.lowerRadiusLimit = CAMERA_RADIUS_MIN;
    this._camera.upperRadiusLimit = CAMERA_RADIUS_MAX;

    // Habilitar control de ratón: arrastrar para orbitar, rueda para zoom
    this._camera.attachControl(canvas, /* preventDefault */ true);

    // Eliminar el plugin de teclado de Babylon — WASD lo gestiona InputManager.
    // Sin esto, ArcRotateCamera captura WASD/flechas y hace zoom involuntario.
    this._camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

    // Deshabilitar el panning completamente.
    this._camera.panningSensibility = 0;

    // Restringir la órbita al click DERECHO solamente (botón 2).
    // Por defecto Babylon activa los 3 botones; dejamos libre el click izquierdo
    // para futura interacción con el mundo (seleccionar objetos, etc.).
    // Usamos instanceof para el narrowing de tipos sin recurrir a "any".
    const pointers = this._camera.inputs.attached['pointers'];
    if (pointers instanceof ArcRotateCameraPointersInput) {
      pointers.buttons = [2]; // 0 = izquierdo, 1 = medio, 2 = derecho
    }

    // Registrar el seguimiento en el render loop
    scene.registerBeforeRender(() => {
      this._update();
    });

    logger.info('CameraController: cámara inicializada', {
      beta: CAMERA_BETA_INITIAL,
      radius: CAMERA_RADIUS_INITIAL,
    });
  }

  /**
   * Referencia a la cámara. PlayerController la necesita para calcular
   * la dirección de movimiento relativa a la vista.
   */
  get camera(): ArcRotateCamera {
    return this._camera;
  }

  // ——————————————————————————————————————————
  // Actualización por frame
  // ——————————————————————————————————————————

  private _update(): void {
    // Seguimiento directo, sin lerp.
    //
    // Por qué sin lerp: el lerp suaviza el target pero rota la cámara micro
    // cada frame durante el movimiento del personaje. Eso hacía que
    // getDirection() devolviera un forward ligeramente diferente cada frame,
    // produciendo el movimiento en curva en A/D.
    //
    // Con setTarget() directo, la orientación de la cámara es completamente
    // estable durante el movimiento → forward consistente → strafe recto.
    this._camera.setTarget(this._target.position);
  }
}
