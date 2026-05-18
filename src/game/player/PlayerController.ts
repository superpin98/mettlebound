// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Quaternion,
} from '@babylonjs/core';
import type { Mesh, ArcRotateCamera } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials/grid';

// Imports internos
import type { InputManager } from '@/core/InputManager';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuración
// ============================================================

// Unidades Babylon por segundo
const PLAYER_SPEED = 5;

// Factor de interpolación para la rotación suave (0-1, más bajo = más suave)
const ROTATION_LERP = 0.12;

// Dimensiones de la cápsula placeholder
const CAPSULE_HEIGHT = 2;
const CAPSULE_RADIUS = 0.4;

// Tamaño del suelo en unidades de juego
const GROUND_SIZE = 50;

// ============================================================
// PlayerController — mueve el personaje con WASD.
//
// Responsabilidades:
//   - Crear la cápsula placeholder y el suelo con grid
//   - Calcular el movimiento relativo a la dirección de cámara
//   - Rotar suavemente el personaje hacia donde camina
//
// La cámara se inyecta después de la construcción con setCamera()
// porque CameraController necesita el mesh del personaje para
// crearse, generando una dependencia circular de construcción.
// ============================================================

export class PlayerController {
  private readonly _mesh: Mesh;
  private readonly _input: InputManager;
  private _camera: ArcRotateCamera | null = null;

  constructor(scene: Scene, input: InputManager) {
    this._input = input;

    this._mesh = this._createCapsule(scene);
    this._createGround(scene);

    // Registrar la actualización en el render loop
    scene.registerBeforeRender(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;
      this._update(deltaTime);
    });

    logger.info('PlayerController: personaje creado en', { position: this._mesh.position });
  }

  /**
   * Referencia al mesh del personaje. CameraController la usa como objetivo.
   */
  get mesh(): Mesh {
    return this._mesh;
  }

  /**
   * Inyecta la cámara después de que CameraController la haya creado.
   * Sin cámara, el personaje no se puede mover (el movimiento es relativo a ella).
   */
  setCamera(camera: ArcRotateCamera): void {
    this._camera = camera;
    logger.debug('PlayerController: cámara inyectada');
  }

  // ——————————————————————————————————————————
  // Actualización por frame
  // ——————————————————————————————————————————

  private _update(deltaTime: number): void {
    // Esperar a que la cámara esté disponible
    if (!this._camera) { return; }

    const moveDir = this._computeMoveDirection(this._camera);

    if (moveDir.lengthSquared() < 0.001) { return; }

    // Aplicar movimiento (frame-rate independiente)
    const displacement = moveDir.scale(PLAYER_SPEED * deltaTime);
    this._mesh.position.addInPlace(displacement);

    // Rotar el personaje para que mire hacia donde se mueve
    this._applyRotation(moveDir);
  }

  /**
   * Calcula el vector de movimiento en world space a partir del input y la cámara.
   *
   * Ahora que CameraController usa setTarget() directo (sin lerp), la orientación
   * de la cámara es completamente estable durante el movimiento del personaje.
   * getDirection(Forward) devuelve el mismo forward cada frame → strafe recto.
   *
   * El resultado está en world space y se aplica directamente sobre mesh.position
   * (no con mesh.translate en local space, que rotaría la dirección con el mesh).
   */
  private _computeMoveDirection(camera: ArcRotateCamera): Vector3 {
    // Forward de la cámara en world space, proyectado al plano horizontal
    const camForward = camera.getDirection(Vector3.Forward());
    camForward.y = 0;
    if (camForward.lengthSquared() < 0.001) { return Vector3.Zero(); }
    camForward.normalize();

    // Derecha de la cámara: Cross(Up, forward) en sistema zurdo de Babylon
    const camRight = Vector3.Cross(Vector3.Up(), camForward).normalize();

    // Acumular dirección por tecla (addInPlace no muta camForward/camRight)
    const direction = Vector3.Zero();
    if (this._input.isKeyDown('KeyW')) { direction.addInPlace(camForward); }
    if (this._input.isKeyDown('KeyS')) { direction.addInPlace(camForward.negate()); }
    if (this._input.isKeyDown('KeyD')) { direction.addInPlace(camRight); }
    if (this._input.isKeyDown('KeyA')) { direction.addInPlace(camRight.negate()); }

    if (direction.lengthSquared() < 0.001) { return Vector3.Zero(); }

    // Normalizar para que diagonal no sea más rápido que recto
    return direction.normalize();
  }

  /**
   * Rota el mesh hacia la dirección de movimiento mediante Quaternion.Slerp.
   * Esto evita el problema de wrap-around de ángulos que tendría un lerp simple.
   */
  private _applyRotation(moveDir: Vector3): void {
    // Ángulo en Y que apunta hacia la dirección de movimiento
    const targetAngle = Math.atan2(moveDir.x, moveDir.z);
    const targetQuat = Quaternion.RotationAxis(Vector3.Up(), targetAngle);

    // Inicializar rotationQuaternion si el mesh solo tiene rotation (Euler)
    if (!this._mesh.rotationQuaternion) {
      this._mesh.rotationQuaternion = Quaternion.Identity();
    }

    this._mesh.rotationQuaternion = Quaternion.Slerp(
      this._mesh.rotationQuaternion,
      targetQuat,
      ROTATION_LERP
    );
  }

  // ——————————————————————————————————————————
  // Creación de meshes de escena
  // ——————————————————————————————————————————

  private _createCapsule(scene: Scene): Mesh {
    const capsule = MeshBuilder.CreateCapsule(
      'player',
      { height: CAPSULE_HEIGHT, radius: CAPSULE_RADIUS },
      scene
    );

    // Y=1: la mitad de la altura, así el fondo de la cápsula queda exactamente en Y=0
    capsule.position = new Vector3(0, CAPSULE_HEIGHT / 2, 0);

    const material = new StandardMaterial('playerMaterial', scene);
    material.diffuseColor = new Color3(0.5, 0.2, 0.8);   // morado Mettlebound
    material.specularColor = new Color3(0.3, 0.1, 0.5);
    capsule.material = material;

    return capsule;
  }

  private _createGround(scene: Scene): void {
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: GROUND_SIZE, height: GROUND_SIZE, subdivisions: 1 },
      scene
    );

    const gridMaterial = new GridMaterial('groundMaterial', scene);
    gridMaterial.gridRatio = 1;
    gridMaterial.majorUnitFrequency = 5;
    gridMaterial.minorUnitVisibility = 0.4;
    gridMaterial.mainColor = new Color3(0.05, 0.06, 0.09);
    gridMaterial.lineColor = new Color3(0.23, 0.25, 0.33);
    gridMaterial.opacity = 1;
    gridMaterial.backFaceCulling = false;

    ground.material = gridMaterial;
  }

}
