// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  Vector3,
  Quaternion,
} from '@babylonjs/core';
import type { Mesh, ArcRotateCamera, AnimationGroup } from '@babylonjs/core';

// Imports internos
import type { InputManager } from '@/core/InputManager';
import type { AssetManager, AssetInstance } from '@/core/AssetManager';
import type { ClassId } from '@/types/game.types';
import { getClassById, isBodyPart } from '@/config/classes.config';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuracion
// ============================================================

// Unidades Babylon por segundo
const PLAYER_SPEED = 5;

// Factor de interpolacion para la rotacion suave (0-1, mas bajo = mas suave)
const ROTATION_LERP = 0.12;

// Altura del pivot sobre el suelo.
// y=1 ~= cintura del personaje (KayKit mide ~2 u de alto).
// La camara orbita alrededor del pivot, asi se apunta a la cintura, no a los pies.
const PIVOT_HEIGHT = 1;

// Offset del modelo respecto al pivot para que los pies toquen y=0.
// pivot.y = 1, modelo.y_local = -1 -> modelo.y_world = 0 (suelo).
const MODEL_Y_OFFSET = -1;

// URL base de los modelos de personaje
const CHAR_BASE_URL = '/assets/models/characters/';

// ============================================================
// PlayerController -- controla el personaje con WASD.
//
// Responsabilidades:
//   - Mantener un pivot invisible que la camara sigue desde el arranque
//   - Cargar el modelo 3D de la clase elegida como hijo del pivot
//   - Calcular el movimiento relativo a la direccion de camara
//   - Rotar el pivot (y el modelo hijo) hacia donde camina el jugador
//   - Gestionar el swap de animaciones Idle <-> Walking_A
//
// Bootstrap: el constructor es SINCRONO (crea el pivot inmediatamente
// para que CameraController tenga target). loadModel() es async y se
// llama en main.ts despues de que el jugador elige su clase.
// ============================================================

export class PlayerController {
  private readonly _pivot: Mesh;
  private readonly _input: InputManager;
  private readonly _assetManager: AssetManager;
  private _camera: ArcRotateCamera | null = null;

  // Instancia 3D activa. Null hasta que loadModel() resuelva.
  private _currentInstance: AssetInstance | null = null;

  // Animation groups de la instancia activa
  private _idleAnim: AnimationGroup | null = null;
  private _walkAnim: AnimationGroup | null = null;

  // Evita re-lanzar el swap de animacion en cada frame
  private _isWalking = false;

  constructor(scene: Scene, input: InputManager, assetManager: AssetManager) {
    this._input = input;
    this._assetManager = assetManager;

    this._pivot = this._createPivot(scene);

    scene.registerBeforeRender(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;
      this._update(deltaTime);
    });

    logger.info('PlayerController: pivot creado', { position: this._pivot.position });
  }

  // ——————————————————————————————————————————
  // API publica
  // ——————————————————————————————————————————

  /**
   * Mesh que la camara sigue. Es el pivot invisible.
   * El modelo 3D visible es hijo del pivot, no es este mesh.
   * Se mantiene este getter para no romper CameraController ni main.ts.
   */
  get mesh(): Mesh {
    return this._pivot;
  }

  /**
   * Inyecta la camara tras crear CameraController.
   * Sin camara el personaje no puede moverse.
   */
  setCamera(camera: ArcRotateCamera): void {
    this._camera = camera;
    logger.debug('PlayerController: camara inyectada');
  }

  /**
   * Carga el modelo 3D de la clase indicada y lo instancia en escena.
   * Si ya habia un modelo, lo dispone antes de cargar el nuevo.
   * Tras cargar, inicia la animacion Idle en loop automaticamente.
   *
   * La escena no se pasa como parametro porque AssetManager ya la
   * tiene almacenada desde su constructor.
   */
  async loadModel(classId: ClassId): Promise<void> {
    // Liberar el modelo anterior (cambio de clase en caliente)
    if (this._currentInstance !== null) {
      this._idleAnim = null;
      this._walkAnim = null;
      this._isWalking = false;
      this._currentInstance.dispose();
      this._currentInstance = null;
      logger.debug('PlayerController: modelo anterior liberado');
    }

    const classDef = getClassById(classId);
    const filename = classDef.modelAssetId;

    if (!filename) {
      logger.warn('PlayerController: clase sin modelAssetId', { classId });
      return;
    }

    logger.info('PlayerController: cargando modelo', { classId, filename });

    const container = await this._assetManager.loadAsset(CHAR_BASE_URL, filename);

    // Neutralizar luces que el loader GLTF pudo haber extraido del GLB al container.
    // Sin esto, cada loadModel() de un modelo nuevo acumula luces extra en la escena.
    if (container.lights.length > 0) {
      logger.debug('PlayerController: luces embebidas en GLB eliminadas', {
        count: container.lights.length,
        names: container.lights.map((l) => l.name),
      });
      container.lights.forEach((l) => l.dispose());
    }

    const instance = this._assetManager.instantiate(container);

    // Anclar modelo al pivot: hereda posicion, rotacion y escala del pivot
    instance.rootNode.parent = this._pivot;

    // Bajar el modelo para que los pies queden a y=0 en world space
    // (pivot esta a PIVOT_HEIGHT=1, asi que offset local = MODEL_Y_OFFSET=-1)
    instance.rootNode.position = new Vector3(0, MODEL_Y_OFFSET, 0);

    this._currentInstance = instance;

    // Ocultar armas/accesorios que no corresponden a esta clase
    this._applyAttachmentVisibility(instance, classId);

    // Diagnostico: loguear grupos para confirmar sufijos de instancia
    logger.debug('PlayerController: animationGroups detectados', {
      count: instance.animationGroups.length,
      names: instance.animationGroups.map((g) => g.name),
    });

    // instantiateModelsToScene aplica el nameFn tambien a los AnimationGroups,
    // convirtiendo 'Idle' -> 'Idle_inst1', 'Walking_A' -> 'Walking_A_inst1', etc.
    // Buscamos ignorando el sufijo _instN, igual que _applyAttachmentVisibility con meshes.
    const findAnim = (baseName: string): AnimationGroup | null =>
      instance.animationGroups.find(
        (g) => g.name.replace(/_inst\d+$/, '') === baseName
      ) ?? null;

    this._idleAnim = findAnim('Idle');
    this._walkAnim = findAnim('Walking_A');

    if (!this._idleAnim) {
      logger.warn('PlayerController: animacion Idle no encontrada', { filename });
    }

    // Arrancar Idle en loop como estado por defecto
    this._idleAnim?.start(
      /* loop     */ true,
      /* speed    */ 1.0,
      /* from     */ this._idleAnim.from,
      /* to       */ this._idleAnim.to,
      /* additive */ false
    );

    logger.info('PlayerController: modelo listo', { classId });
  }

  // ——————————————————————————————————————————
  // Actualizacion por frame
  // ——————————————————————————————————————————

  private _update(deltaTime: number): void {
    if (!this._camera) { return; }

    const moveDir = this._computeMoveDirection(this._camera);
    const isMovingNow = moveDir.lengthSquared() > 0.001;

    // Swap de animacion -- solo se ejecuta cuando cambia el estado
    if (isMovingNow && !this._isWalking) {
      this._idleAnim?.stop();
      this._walkAnim?.start(
        true, 1.0,
        this._walkAnim.from,
        this._walkAnim.to,
        false
      );
      this._isWalking = true;
    } else if (!isMovingNow && this._isWalking) {
      this._walkAnim?.stop();
      this._idleAnim?.start(
        true, 1.0,
        this._idleAnim.from,
        this._idleAnim.to,
        false
      );
      this._isWalking = false;
    }

    if (!isMovingNow) { return; }

    // Mover el pivot en el plano horizontal (frame-rate independiente)
    const displacement = moveDir.scale(PLAYER_SPEED * deltaTime);
    this._pivot.position.addInPlace(displacement);

    // Rotar el pivot hacia la direccion de movimiento
    this._applyRotation(moveDir);
  }

  /**
   * Calcula el vector de movimiento en world space a partir del input y la camara.
   * El resultado esta normalizado (diagonal no es mas rapida que recta).
   */
  private _computeMoveDirection(camera: ArcRotateCamera): Vector3 {
    const camForward = camera.getDirection(Vector3.Forward());
    camForward.y = 0;
    if (camForward.lengthSquared() < 0.001) { return Vector3.Zero(); }
    camForward.normalize();

    const camRight = Vector3.Cross(Vector3.Up(), camForward).normalize();

    const direction = Vector3.Zero();
    if (this._input.isKeyDown('KeyW')) { direction.addInPlace(camForward); }
    if (this._input.isKeyDown('KeyS')) { direction.addInPlace(camForward.negate()); }
    if (this._input.isKeyDown('KeyD')) { direction.addInPlace(camRight); }
    if (this._input.isKeyDown('KeyA')) { direction.addInPlace(camRight.negate()); }

    if (direction.lengthSquared() < 0.001) { return Vector3.Zero(); }
    return direction.normalize();
  }

  /**
   * Rota el pivot (y el modelo hijo) hacia la direccion de movimiento
   * mediante Quaternion.Slerp para evitar wrap-around de angulos.
   */
  private _applyRotation(moveDir: Vector3): void {
    const targetAngle = Math.atan2(moveDir.x, moveDir.z);
    const targetQuat = Quaternion.RotationAxis(Vector3.Up(), targetAngle);

    if (!this._pivot.rotationQuaternion) {
      this._pivot.rotationQuaternion = Quaternion.Identity();
    }

    this._pivot.rotationQuaternion = Quaternion.Slerp(
      this._pivot.rotationQuaternion,
      targetQuat,
      ROTATION_LERP
    );
  }

  // ——————————————————————————————————————————
  // Creacion del pivot
  // ——————————————————————————————————————————

  /**
   * Crea un Mesh invisible de tamano infimo.
   * Usamos Mesh (no TransformNode) porque rotationQuaternion
   * es necesario para el Slerp de rotacion y es mas estable en Mesh.
   */
  private _createPivot(scene: Scene): Mesh {
    const pivot = MeshBuilder.CreateBox('playerPivot', { size: 0.001 }, scene);
    pivot.isVisible = false;
    pivot.isPickable = false;
    pivot.position = new Vector3(0, PIVOT_HEIGHT, 0);
    return pivot;
  }

  // ——————————————————————————————————————————
  // Visibilidad de armas y accesorios
  // ——————————————————————————————————————————

  /**
   * Muestra solo los nodos de arma/accesorio permitidos por la clase.
   *
   * Reglas:
   *   1. Si el nodo es una parte del cuerpo (isBodyPart) -> siempre visible.
   *   2. Si el nombre base (sin sufijo _instN) coincide exactamente con
   *      alguna entrada de la whitelist, o empieza por "entrada." (variantes
   *      Blender tipo Knife.001), se muestra.
   *   3. El resto se oculta con setEnabled(false).
   *
   * Usamos getChildMeshes(false) en lugar de getDescendants() para evitar
   * tocar los TransformNodes del esqueleto, que romperian las animaciones.
   */
  private _applyAttachmentVisibility(instance: AssetInstance, classId: ClassId): void {
    const whitelist = getClassById(classId).visibleAttachments ?? [];
    const allMeshes = instance.rootNode.getChildMeshes(false);

    for (const mesh of allMeshes) {
      // Quitar sufijo _instN que anade instantiateModelsToScene
      const baseName = mesh.name.replace(/_inst\d+$/, '');

      // Las partes del cuerpo nunca se tocan
      if (isBodyPart(baseName)) { continue; }

      // Mostrar si el nombre base coincide (exacto o con sufijo ".NNN" de Blender)
      const shouldShow = whitelist.some(
        (w) => baseName === w || baseName.startsWith(w + '.'),
      );
      mesh.setEnabled(shouldShow);
    }

    logger.debug('PlayerController: visibilidad de attachments aplicada', {
      classId,
      whitelist,
    });
  }
}
