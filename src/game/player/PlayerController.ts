// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  Vector3,
  Quaternion,
  Color3,
  PBRMaterial,
  StandardMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { AbstractMesh, Mesh, ArcRotateCamera, AnimationGroup, PhysicsBody } from '@babylonjs/core';

// Imports internos
import type { InputManager } from '@/core/InputManager';
import type { AssetManager, AssetInstance } from '@/core/AssetManager';
import type { ClassId } from '@/types/game.types';
import type { Vec3 } from '@/types/spatial.types';
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

// Dimensiones de la capsula fisica invisible del player.
// Altura total = 2u (modelo KayKit mide ~2u).
// Radio calibrado en B2C con gltf-transform sobre Knight.glb:
//   Z half (profundidad cuerpo) = 0.627u. Torso estimado = 0.45-0.50u.
//   Valor aplicado: 0.5u. Si el player roza paredes subir a 0.55;
//   si se atasca en puertas bajar a 0.45.
const CAPSULE_HEIGHT = 2;
const CAPSULE_RADIUS = 0.5;

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
  private readonly _scene: Scene;
  private readonly _pivot: Mesh;
  private readonly _input: InputManager;
  private readonly _assetManager: AssetManager;
  private _camera: ArcRotateCamera | null = null;

  // Capsula invisible: cuerpo fisico Havok del player.
  // Se crea en el constructor (geometria pura) y recibe su PhysicsAggregate
  // en initPhysics(), llamado desde main.ts despues de scene.enablePhysics()
  // y despues de que los colliders de la sala ya existan.
  private readonly _capsule: Mesh;
  private _capsuleAggregate: PhysicsAggregate | null = null;

  // Instancia 3D activa. Null hasta que loadModel() resuelva.
  private _currentInstance: AssetInstance | null = null;

  // Animation groups de la instancia activa
  private _idleAnim: AnimationGroup | null = null;
  private _walkAnim: AnimationGroup | null = null;

  // Evita re-lanzar el swap de animacion en cada frame
  private _isWalking = false;

  constructor(scene: Scene, input: InputManager, assetManager: AssetManager) {
    this._scene = scene;
    this._input = input;
    this._assetManager = assetManager;

    this._pivot   = this._createPivot(scene);
    this._capsule = this._createPhysicsCapsule(scene);

    scene.registerBeforeRender(() => {
      const deltaTime = scene.getEngine().getDeltaTime() / 1000;
      this._update(deltaTime);
    });

    logger.info('PlayerController: pivot y capsula creados', { position: this._pivot.position });
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
   * PhysicsBody de la capsula Havok del player.
   * Solo disponible despues de llamar initPhysics().
   */
  get physicsBody(): PhysicsBody {
    if (this._capsuleAggregate === null) {
      throw new Error('PlayerController.physicsBody: llamar initPhysics() antes de acceder.');
    }
    return this._capsuleAggregate.body;
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
   * Conecta la capsula invisible al motor Havok y bloquea la inercia angular.
   *
   * CUANDO llamar: desde main.ts, DESPUES de scene.enablePhysics()
   * y DESPUES de que el suelo/sala ya existan y la capsula no caiga al vacio.
   */
  initPhysics(): void {
    this._capsuleAggregate = new PhysicsAggregate(
      this._capsule,
      PhysicsShapeType.CAPSULE,
      { mass: 1, restitution: 0 },
      this._scene,
    );

    // Bloquear inercia angular: sin esto el player se inclina o tumba
    // al empujar contra una pared o colisionar con un enemigo.
    this._capsuleAggregate.body.setMassProperties({
      inertia:             new Vector3(0, 0, 0),
      inertiaOrientation:  Quaternion.Identity(),
    });

    logger.info('PlayerController: capsula fisica Havok activada.');
  }

  /**
   * Teletransporta al jugador a la posicion world indicada.
   * pos.y = 0 equivale al nivel del suelo; la capsula se eleva
   * automaticamente a CAPSULE_HEIGHT/2 para quedar apoyada.
   */
  teleportTo(pos: Vec3): void {
    this._capsule.position.set(pos.x, pos.y + CAPSULE_HEIGHT / 2, pos.z);
    this._pivot.position.copyFrom(this._capsule.position);
    logger.debug('PlayerController: teleportTo', pos);
  }

  /**
   * Carga el modelo 3D de la clase indicada y lo instancia en escena.
   * Si ya habia un modelo, lo dispone antes de cargar el nuevo.
   * Tras cargar, inicia la animacion Idle en loop automaticamente.
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

    // ---- Modelos Mixamo: correccion de escala y materiales ---------------
    // Mixamo exporta en centimetros. En Babylon (GLTF = metros) el personaje
    // aparece 100x demasiado grande. Aplicar scale=0.01 al rootNode lo corrige.
    // Ademas, los GLBs de Meshy/Mixamo activan clearcoat, IBL y subSurface en
    // sus PBRMaterials, lo que desborda GL_MAX_VERTEX_UNIFORM_BUFFERS (12).
    // Solucion: convertir cada PBRMaterial a StandardMaterial preservando
    // la diffuseTexture (albedoTexture del PBR).
    if (classDef.isMixamo === true) {
      const scale = classDef.modelScale ?? 0.01;
      instance.rootNode.scaling = new Vector3(scale, scale, scale);
      logger.info('PlayerController: modelo Mixamo — escala aplicada', { scale });

      const allMeshes = this._getAllMeshesFromInstance(instance.rootNode);
      for (const mesh of allMeshes) {
        if (mesh.material instanceof PBRMaterial) {
          mesh.material = this._pbrToStandard(mesh.material, mesh.name);
        } else if (mesh.material instanceof StandardMaterial) {
          mesh.material.maxSimultaneousLights = 4;
        }
      }
      logger.info('PlayerController: materiales Mixamo convertidos a Standard', {
        meshCount: allMeshes.length,
      });
    }

    this._currentInstance = instance;

    // Ocultar armas/accesorios que no corresponden a esta clase
    this._applyAttachmentVisibility(instance, classId);

    // Garantizar maxSimultaneousLights = 4 en los materiales del personaje.
    for (const mesh of instance.rootNode.getChildMeshes(false)) {
      if (
        mesh.material instanceof PBRMaterial ||
        mesh.material instanceof StandardMaterial
      ) {
        mesh.material.maxSimultaneousLights = 4;
      }
    }

    // Diagnostico: loguear grupos para confirmar sufijos de instancia
    logger.debug('PlayerController: animationGroups detectados', {
      count: instance.animationGroups.length,
      names: instance.animationGroups.map((g) => g.name),
    });

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

    // --- Movimiento ---
    if (this._capsuleAggregate) {
      const vel = this._capsuleAggregate.body.getLinearVelocity();
      this._capsuleAggregate.body.setLinearVelocity(new Vector3(
        isMovingNow ? moveDir.x * PLAYER_SPEED : 0,
        vel.y,
        isMovingNow ? moveDir.z * PLAYER_SPEED : 0,
      ));
      this._pivot.position.copyFrom(this._capsule.position);
    } else {
      if (!isMovingNow) { return; }
      this._pivot.position.addInPlace(moveDir.scale(PLAYER_SPEED * deltaTime));
    }

    // Rotar el pivot hacia la direccion de movimiento
    if (isMovingNow) {
      this._applyRotation(moveDir);
    }
  }

  /**
   * Calcula el vector de movimiento en world space a partir del input y la camara.
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
   * Rota el pivot hacia la direccion de movimiento mediante Quaternion.Slerp.
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
  // Creacion del pivot y de la capsula fisica
  // ——————————————————————————————————————————

  private _createPivot(scene: Scene): Mesh {
    const pivot = MeshBuilder.CreateBox('playerPivot', { size: 0.001 }, scene);
    pivot.isVisible = false;
    pivot.isPickable = false;
    pivot.position = new Vector3(0, PIVOT_HEIGHT, 0);
    return pivot;
  }

  private _createPhysicsCapsule(scene: Scene): Mesh {
    const capsule = MeshBuilder.CreateCapsule(
      'playerCapsule',
      { height: CAPSULE_HEIGHT, radius: CAPSULE_RADIUS, tessellation: 8 },
      scene,
    );
    capsule.isVisible  = false;
    capsule.isPickable = false;
    capsule.position   = new Vector3(0, CAPSULE_HEIGHT / 2, 0);
    return capsule;
  }

  // ——————————————————————————————————————————
  // Helpers para modelos Mixamo
  // ——————————————————————————————————————————

  /**
   * Recoge TODOS los AbstractMesh descendientes del rootNode,
   * fusionando getChildMeshes() y getDescendants() para no perder
   * ninguno (Mixamo puede tener jerarquias mixtas de Transform+Mesh).
   * Deduplica por uniqueId.
   */
  private _getAllMeshesFromInstance(rootNode: {
    getChildMeshes: (d: boolean) => AbstractMesh[];
    getDescendants: (d: boolean) => { uniqueId: number }[];
  }): AbstractMesh[] {
    const fromHierarchy   = rootNode.getChildMeshes(false);
    const fromDescendants = rootNode
      .getDescendants(false)
      .filter((n): n is AbstractMesh => 'material' in n);
    const seen   = new Set<number>();
    const result: AbstractMesh[] = [];
    for (const m of [...fromHierarchy, ...fromDescendants]) {
      if (!seen.has(m.uniqueId)) {
        seen.add(m.uniqueId);
        result.push(m);
      }
    }
    return result;
  }

  /**
   * Convierte un PBRMaterial en StandardMaterial preservando la textura difusa.
   * Elimina el specular y limita maxSimultaneousLights a 4.
   */
  private _pbrToStandard(pbr: PBRMaterial, meshName: string): StandardMaterial {
    const std = new StandardMaterial(`${meshName}_std`, pbr.getScene());
    if (pbr.albedoTexture !== null) {
      std.diffuseTexture = pbr.albedoTexture;
    }
    std.specularColor         = new Color3(0, 0, 0);
    std.maxSimultaneousLights = 4;
    return std;
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
   */
  private _applyAttachmentVisibility(instance: AssetInstance, classId: ClassId): void {
    const whitelist = getClassById(classId).visibleAttachments ?? [];
    const allMeshes = instance.rootNode.getChildMeshes(false);

    for (const mesh of allMeshes) {
      const baseName = mesh.name.replace(/_inst\d+$/, '');

      if (isBodyPart(baseName)) { continue; }

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
