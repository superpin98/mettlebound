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
  TransformNode,
  PointerEventTypes,
} from '@babylonjs/core';
import type { AbstractMesh, Mesh, ArcRotateCamera, AnimationGroup, PhysicsBody } from '@babylonjs/core';

// Imports internos
import type { InputManager } from '@/core/InputManager';
import type { AssetManager, AssetInstance } from '@/core/AssetManager';
import type { ClassId } from '@/types/game.types';
import type { Vec3 } from '@/types/spatial.types';
import type { EquippedItems } from '@/types/items.types';
import { getClassById, isBodyPart } from '@/config/classes.config';
import { logger } from '@/core/Logger';
import { eventBus } from '@/core/EventBus';
import { AttackHitbox } from '@/game/combat/AttackHitbox';
import {
  deriveWeaponStance,
  STANCE_ANIM_SET,
  type WeaponStance,
  type AnimSet,
} from '@/game/player/WeaponStance';

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

// URL base de las armas Mixamo
const WEAPONS_BASE_URL = '/assets/models/characters/weapons/';

// ============================================================
// Configuracion de armas del Guerrero (Mixamo).
// Todos los valores son TUNEABLES a ojo desde el navegador:
//   scale       -> factor de escala aplicado al mesh del arma.
//                  Ambas armas miden 1.9061m en Y raw (caja estándar Meshy).
//                  Espada:  0.5  → 1.9 × 0.5 ≈ 0.95m de hoja
//                  Escudo:  0.26 → 1.9 × 0.26 ≈ 0.5m de diámetro
//   position    -> offset local en metros respecto al pivot del hueso
//   rotationDeg -> grados Euler YXZ (Y=giro horiz, X=inclin, Z=giro arma)
// ============================================================

const MIXAMO_SWORD_CFG = {
  filename:    'sword_1h.glb',
  boneName:    'mixamorig:LeftHand',
  scale:       0.42,                      // <-- TUNABLE
  position:    { x: 0, y: 0.5, z: 0 },   // <-- TUNABLE (Y: mango hacia mano)
  rotationDeg: { x: 0, y: 0, z: 0 },     // <-- TUNABLE
};

const MIXAMO_SHIELD_CFG = {
  filename:    'shield_round_1h.glb',
  boneName:    'mixamorig:RightForeArm',
  scale:       0.3,                       // <-- TUNABLE
  position:    { x: 0, y: 0, z: 0 },     // <-- TUNABLE
  rotationDeg: { x: 0, y: 0, z: 0 },     // <-- TUNABLE
};

// Desactivar carga de armas (temporal hasta fusión en Blender).
// Poner a true para reactivar _loadMixamoWeapons().
const LOAD_WEAPONS = false;

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
  private _idleAnim:   AnimationGroup | null = null;
  private _walkAnim:   AnimationGroup | null = null;
  private _attackAnim: AnimationGroup | null = null;
  private _deathAnim:  AnimationGroup | null = null;

  // Stance de arma activo — determina que animset (base / SNS) se usa.
  // Se actualiza en caliente al equipar/desequipar items.
  private _weaponStance: WeaponStance = 'unarmed';

  // Evita re-lanzar el swap de animacion en cada frame
  private _isWalking  = false;
  private _isAttacking = false;
  // Bloquea input y animaciones tras la muerte del jugador
  private _isDead = false;
  private _isInCombat = false;

  // Hitbox de impacto (trigger esfera delante del pivot)
  // Se crea en initPhysics(), se configura en loadModel()
  private _attackHitbox: AttackHitbox | null = null;

  // Instancias de armas activas; se limpian al cambiar de clase
  private _weaponInstances: AssetInstance[] = [];

  // Anchors de armas (TransformNode anclado al hueso); clave = kw del filename
  private _weaponAnchors = new Map<string, { anchor: TransformNode; mesh: AbstractMesh }>();

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

    // Escuchar click izquierdo a través de Babylon's pointer system.
    // Motivo: attachControl(canvas, true) llama preventDefault() en pointerdown,
    // lo que suprime el mousedown DOM en window. onPointerObservable vive
    // dentro del mismo pipeline y no pelea con la cámara.
    scene.onPointerObservable.add((pi) => {
      if (pi.type === PointerEventTypes.POINTERDOWN && pi.event.button === 0) {
        logger.debug('PlayerController: click izquierdo detectado — intentando ataque');
        this._tryAttack();
      }
    });

    // Reaccionar a la muerte del jugador: parar animaciones en curso,
    // reproducir Death_A una sola vez y emitir 'player:death-anim-end'
    // cuando el último frame haya quedado congelado.
    eventBus.on('player:death', () => {
      this._isDead = true;

      // Anular velocidad horizontal para que el cuerpo no siga deslizándose
      if (this._capsuleAggregate !== null) {
        const vel = this._capsuleAggregate.body.getLinearVelocity();
        this._capsuleAggregate.body.setLinearVelocity(new Vector3(0, vel.y, 0));
      }

      // Interrumpir cualquier animación en curso
      this._idleAnim?.stop();
      this._walkAnim?.stop();
      this._attackAnim?.stop();
      this._isAttacking = false;

      if (this._deathAnim !== null) {
        // Reproducir Death_A una sola vez (loop = false).
        // Babylon congela el modelo en el último frame automáticamente al acabar.
        this._deathAnim.start(
          /* loop     */ false,
          /* speed    */ 1.0,
          /* from     */ this._deathAnim.from,
          /* to       */ this._deathAnim.to,
          /* additive */ false,
        );

        // Emitir el evento cuando la animación haya terminado de verdad.
        // addOnce: se desuscribe solo tras el primer disparo.
        this._deathAnim.onAnimationGroupEndObservable.addOnce(() => {
          eventBus.emit('player:death-anim-end', null);
          logger.info('PlayerController: Death_A terminada — emitiendo player:death-anim-end');
        });
      } else {
        // Fallback: no hay animación de muerte — mostrar Game Over de inmediato
        eventBus.emit('player:death-anim-end', null);
        logger.warn('PlayerController: sin Death_A — player:death-anim-end emitido sin animación');
      }

      logger.info('PlayerController: jugador muerto — animación de muerte iniciada');
    });

    // Congelar/descongelar movimiento e input durante transición a combate
    eventBus.on('combat:start', () => { this._isInCombat = true; });
    eventBus.on('combat:end',   () => { this._isInCombat = false; });

    // Actualizar animset cuando el jugador equipa o desequipa un arma.
    // Si el modelo aun no esta cargado, solo se actualiza _weaponStance;
    // loadModel() lo leerá al terminar de cargar.
    const onEquipChange = ({ equipped }: { equipped: EquippedItems }): void => {
      const newStance = deriveWeaponStance(equipped);
      if (newStance !== this._weaponStance) {
        this._refreshAnimsForStance(newStance);
      }
    };
    eventBus.on('inventory:item-equipped',   onEquipChange);
    eventBus.on('inventory:item-unequipped', onEquipChange);

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
   * Indica si el modelo activo tiene animacion de muerte disponible.
   * Consulta del sistema de combate para saber si puede reproducirla.
   */
  get hasDeathAnim(): boolean { return this._deathAnim !== null; }

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
   * Registra un enemigo como target golpeable por el hitbox de ataque.
   * Llamar desde main.ts tras crear cada enemigo.
   *
   * @param body       PhysicsBody del enemigo (identifica quién fue golpeado).
   * @param getCenter  Función que devuelve el centro 3D del cuerpo del enemigo.
   */
  registerHitTarget(body: PhysicsBody, getCenter: () => Vector3): void {
    this._attackHitbox?.registerTarget(body, getCenter);
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

    // Hitbox de ataque: trigger esfera anclada al pivot, delante del jugador
    this._attackHitbox = new AttackHitbox(this._scene, this._pivot);

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
    // Liberar armas del modelo anterior
    for (const wi of this._weaponInstances) { wi.dispose(); }
    this._weaponInstances = [];
    for (const { anchor } of this._weaponAnchors.values()) { anchor.dispose(); }
    this._weaponAnchors.clear();

    // Liberar el modelo anterior (cambio de clase en caliente)
    if (this._currentInstance !== null) {
      this._idleAnim = null;
      this._walkAnim = null;
      this._isWalking = false;
      this._isDead = false;   // resetear flag de muerte al cambiar de clase
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
      // Aplicar escala solo si modelScale esta definido y != 1.
      // GLBs cocinados en Blender ya vienen a escala metros correcta (no necesitan 0.01).
      // GLBs crudos de Mixamo (sin Blender) siguen necesitando modelScale: 0.01.
      const scale = classDef.modelScale ?? 1;
      if (scale !== 1) {
        instance.rootNode.scaling = new Vector3(scale, scale, scale);
        logger.info('PlayerController: modelo Mixamo — escala aplicada', { scale });
      } else {
        logger.debug('PlayerController: modelo Mixamo — sin escala adicional (GLB a metros)');
      }

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

    // Ocultar armas/accesorios que no corresponden a esta clase.
    // Modelos Mixamo: malla integrada sin nodos de arma separados.
    // Los nombres Mixamo no pasan isBodyPart() y visibleAttachments:[]
    // deshabilitaria toda la malla. Saltar el pase para estos modelos.
    if (classDef.isMixamo !== true) {
      this._applyAttachmentVisibility(instance, classId);
    }

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

    // Resolver animaciones segun el stance actual.
    // Si el jugador ya tenia un arma equipada antes de que el modelo cargara
    // (p.ej. item inicial asignado antes de loadModel), _weaponStance ya
    // estara actualizado y se usara el animset correcto desde el principio.
    const animSet = STANCE_ANIM_SET[this._weaponStance];
    const animMap = this._resolveAnimMap(animSet, filename);
    this._idleAnim   = animMap.get('Idle')     ?? null;
    this._walkAnim   = animMap.get('Run')       ?? null;
    this._attackAnim = animMap.get('Attack_A')  ?? null;
    this._deathAnim  = animMap.get('Death_A')   ?? null;
    this._isAttacking = false;

    // Actualizar config de hitbox para la clase elegida
    this._attackHitbox?.setClassConfig(classId);

    // Arrancar Idle en loop como estado por defecto
    this._idleAnim?.start(
      /* loop     */ true,
      /* speed    */ 1.0,
      /* from     */ this._idleAnim.from,
      /* to       */ this._idleAnim.to,
      /* additive */ false
    );


    // Anclar armas al esqueleto (solo clases Mixamo)
    // LOAD_WEAPONS = false: desactivado hasta fusión en Blender.
    if (LOAD_WEAPONS && classDef.isMixamo === true) {
      await this._loadMixamoWeapons();
    }

    logger.info('PlayerController: modelo listo', { classId });
  }

  // ——————————————————————————————————————————
  // Actualizacion por frame
  // ——————————————————————————————————————————

  private _update(deltaTime: number): void {
    if (!this._camera) { return; }
    // Guard: el jugador está muerto — congelar todo input y movimiento
    if (this._isDead)      { return; }
    // Guard: en transición a combate — congelar exploración
    if (this._isInCombat)  { return; }

    const moveDir = this._computeMoveDirection(this._camera);
    const isMovingNow = moveDir.lengthSquared() > 0.001;

    // Swap de animacion -- solo se ejecuta cuando cambia el estado
    // Guard: no interrumpir animacion de ataque en curso
    if (this._isAttacking) { return; }

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
  // Armas Mixamo
  // ——————————————————————————————————————————

  /**
   * Carga sword_1h.glb y shield_round_1h.glb y los ancla al esqueleto
   * del personaje Mixamo activo mediante attachToBone.
   *
   * Posicion/rotacion iniciales son placeholders (0,0,0) — ajustar
   * MIXAMO_SWORD_CFG y MIXAMO_SHIELD_CFG al inicio del archivo.
   */
  private async _loadMixamoWeapons(): Promise<void> {
    if (this._currentInstance === null) { return; }

    // Localizar el mesh con skeleton (malla principal del personaje)
    const allMeshes     = this._getAllMeshesFromInstance(this._currentInstance.rootNode);
    const characterMesh = allMeshes.find((m) => m.skeleton !== null) ?? null;

    if (characterMesh === null || characterMesh.skeleton === null) {
      logger.warn('PlayerController._loadMixamoWeapons: no se encontro mesh con skeleton');
      return;
    }

    const skeleton = characterMesh.skeleton;

    for (const cfg of [MIXAMO_SWORD_CFG, MIXAMO_SHIELD_CFG]) {

      // Escudo pendiente hasta validar la espada — saltar por ahora
      if (cfg.filename.includes('shield')) { continue; }

      // -- Cargar GLB del arma ------------------------------------------------
      const container      = await this._assetManager.loadAsset(WEAPONS_BASE_URL, cfg.filename);
      const weaponInstance = this._assetManager.instantiate(container);

      // Convertir PBR->Standard (armas de Meshy llevan PBR)
      const weaponMeshes = this._getAllMeshesFromInstance(weaponInstance.rootNode);
      for (const m of weaponMeshes) {
        if (m.material instanceof PBRMaterial) {
          m.material = this._pbrToStandard(m.material, m.name);
        } else if (m.material instanceof StandardMaterial) {
          m.material.maxSimultaneousLights = 4;
        }
      }

      // -- Obtener el mesh con geometría real (vertices > 0) -----------------
      const weaponMesh = weaponMeshes.find((m) => m.getTotalVertices() > 0) ?? null;
      if (weaponMesh === null) {
        logger.warn('PlayerController: arma sin mesh con vertices', { filename: cfg.filename });
        weaponInstance.dispose();
        continue;
      }

      // kw: clave corta del filename (sin extension) para el anchor y el map
      const kw = cfg.filename.replace('.glb', '').toLowerCase();

      // -- Buscar hueso -------------------------------------------------------
      const boneIdx = skeleton.getBoneIndexByName(cfg.boneName);
      if (boneIdx === -1) {
        logger.warn('PlayerController: hueso no encontrado', {
          boneName: cfg.boneName,
          allBones: skeleton.bones.map((b) => b.name),
        });
        continue;
      }
      const bone = skeleton.bones[boneIdx];
      if (bone === undefined) {
        logger.warn('PlayerController: bones[idx] undefined', { boneName: cfg.boneName });
        continue;
      }
      logger.info('PlayerController: hueso encontrado', { boneName: cfg.boneName, boneIdx });

      // -- Crear anchor TransformNode y anclar al hueso ---------------------
      // attachToBone pisaria scaling/position/rotation del mesh cada frame;
      // usando un wrapper TransformNode como intermediario, los transforms
      // aplicados al weaponMesh (hijo del anchor) quedan en espacio local
      // y Babylon no los sobreescribe.
      const anchor = new TransformNode(`weaponAnchor_${kw}`, this._scene);
      anchor.attachToBone(bone, characterMesh);

      weaponMesh.setParent(anchor);
      weaponMesh.scaling          = new Vector3(cfg.scale, cfg.scale, cfg.scale);
      weaponMesh.position         = new Vector3(cfg.position.x, cfg.position.y, cfg.position.z);
      weaponMesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(
        (cfg.rotationDeg.y * Math.PI) / 180,
        (cfg.rotationDeg.x * Math.PI) / 180,
        (cfg.rotationDeg.z * Math.PI) / 180,
      );

      this._weaponAnchors.set(kw, { anchor, mesh: weaponMesh });
      this._weaponInstances.push(weaponInstance);
      logger.info('PlayerController: arma anclada con anchor', {
        filename: cfg.filename,
        boneName: cfg.boneName,
        meshName: weaponMesh.name,
        anchorName: anchor.name,
        scale:    cfg.scale,
      });
    }
  }

  // ——————————————————————————————————————————
  // Lógica de ataque
  // ——————————————————————————————————————————

  /**
   * Intenta reproducir la animación de ataque.
   * Ignorado si ya hay un ataque en curso o si no hay animación cargada.
   */
  private _tryAttack(): void {
    if (this._isDead)               { return; }
    if (this._isInCombat)           { return; }
    if (this._isAttacking)          { return; }
    if (this._attackAnim === null)  { return; }

    this._isAttacking = true;

    // Anular inercia horizontal del cuerpo Havok: si el jugador atacaba
    // en movimiento, el cuerpo conservaria la velocidad y seguiria deslizandose
    // porque _update() retorna pronto y nunca llama setLinearVelocity(0).
    if (this._capsuleAggregate !== null) {
      const vel = this._capsuleAggregate.body.getLinearVelocity();
      this._capsuleAggregate.body.setLinearVelocity(
        new Vector3(0, vel.y, 0),  // respeta gravedad, zeroing X/Z
      );
    }

    // Parar animacion actual (idle o run)
    this._idleAnim?.stop();
    this._walkAnim?.stop();

    // Reproducir swing una sola vez (loop = false)
    this._attackAnim.start(
      /* loop     */ false,
      /* speed    */ 1.0,
      /* from     */ this._attackAnim.from,
      /* to       */ this._attackAnim.to,
      /* additive */ false,
    );

    // Activar hitbox en la ventana de impacto del swing
    this._attackHitbox?.scheduleWindow(this._attackAnim);

    // Emitir evento de swing (para UI o sistemas futuros)
    eventBus.emit('player:attack', null);

    // Al terminar el swing: desactivar flag y volver al estado correcto
    this._attackAnim.onAnimationGroupEndObservable.addOnce(() => {
      this._isAttacking = false;
      if (this._isWalking) {
        this._walkAnim?.start(true, 1.0, this._walkAnim.from, this._walkAnim.to, false);
      } else {
        this._idleAnim?.start(true, 1.0, this._idleAnim.from, this._idleAnim.to, false);
      }
      logger.debug('PlayerController: ataque terminado, volviendo a idle/run');
    });

    logger.info('PlayerController: ataque iniciado');
  }

  // ——————————————————————————————————————————
  // Dev handle para ajuste en vivo de armas (window.__mb.weapons)
  // ——————————————————————————————————————————

  /**
   * Devuelve un objeto de debug para ajustar armas en caliente desde DevTools.
   * Uso: window.__mb.weapons.sword.set({scale:0.5, x:0, y:0.1, z:0})
   *      window.__mb.weapons.dump()
   */
  public weaponDevHandle(): {
    sword:  { set: (v: Partial<{ scale: number; x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void };
    shield: { set: (v: Partial<{ scale: number; x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => void };
    dump: () => void;
  } {
    const makeHandle = (kw: string) => ({
      set: (v: Partial<{ scale: number; x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number }>) => {
        const entry = this._weaponAnchors.get(kw);
        if (!entry) { console.warn(`[weapons] sin anchor para ${kw} — carga el Guerrero primero`); return; }
        const { mesh } = entry;
        if (v.scale !== undefined) { mesh.scaling.setAll(v.scale); }
        if (v.x     !== undefined) { mesh.position.x = v.x; }
        if (v.y     !== undefined) { mesh.position.y = v.y; }
        if (v.z     !== undefined) { mesh.position.z = v.z; }
        if (v.rotX !== undefined || v.rotY !== undefined || v.rotZ !== undefined) {
          mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(
            ((v.rotY ?? 0) * Math.PI) / 180,
            ((v.rotX ?? 0) * Math.PI) / 180,
            ((v.rotZ ?? 0) * Math.PI) / 180,
          );
        }
      },
    });

    return {
      sword:  makeHandle('sword_1h'),
      shield: makeHandle('shield_round_1h'),
      dump: () => {
        for (const [kw, { mesh }] of this._weaponAnchors.entries()) {
          const q      = mesh.rotationQuaternion ?? Quaternion.Identity();
          const euler  = q.toEulerAngles();
          const toDeg  = (r: number) => +(r * 180 / Math.PI).toFixed(2);
          console.log(`[weapons.dump] ${kw}`, JSON.stringify({
            scale: +mesh.scaling.x.toFixed(4),
            x:     +mesh.position.x.toFixed(4),
            y:     +mesh.position.y.toFixed(4),
            z:     +mesh.position.z.toFixed(4),
            rotX:  toDeg(euler.x),
            rotY:  toDeg(euler.y),
            rotZ:  toDeg(euler.z),
          }));
        }
        if (this._weaponAnchors.size === 0) {
          console.warn('[weapons.dump] no hay armas cargadas — carga el Guerrero primero');
        }
      },
    };
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
  // ——————————————————————
  // Visibilidad de armas y accesorios
  // ——————————————————————

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

  // Resolucion de animaciones por stance
  // ——————————————————————————————————————————

  /**
   * Reglas de busqueda de animaciones por nombre (case-insensitive, sin sufijo _instN).
   * Cada entrada mapea una clave canonica a un predicado de substring.
   */
  private static readonly _ANIM_RULES: ReadonlyArray<{
    key: string;
    test: (n: string) => boolean;
  }> = [
    { key: 'Idle',     test: (n) => n.includes('idle') },
    { key: 'Run',      test: (n) => n.includes('run') || n.includes('walk') },
    { key: 'Attack_A', test: (n) => n.includes('attack') },
    { key: 'Hit',      test: (n) => n.includes('hit') },
    { key: 'Death_A',  test: (n) => n.includes('death') || n.includes('dying') },
  ];

  /**
   * Resuelve el mapa de AnimationGroups segun el animset deseado.
   *
   * Para cada regla:
   *   1. Recoge todos los candidatos cuyo nombre limpio pasa el predicado.
   *   2. Separa en snsMatches (nombre contiene '_sns') y baseMatches (el resto).
   *   3. Segun animSet:
   *        'sns'  → prefiere snsMatches;  si no hay, usa baseMatches  (fallback)
   *        'base' → prefiere baseMatches; si no hay, usa snsMatches   (fallback)
   *   4. Death_A siempre usa baseMatches (no hay variante _SNS de muerte).
   *
   * @param animSet  - 'base' o 'sns', derivado de STANCE_ANIM_SET[stance]
   * @param filename - Solo para mensajes de log
   */
  private _resolveAnimMap(animSet: AnimSet, filename: string): Map<string, AnimationGroup> {
    const groups = this._currentInstance?.animationGroups ?? [];
    const map    = new Map<string, AnimationGroup>();

    for (const rule of PlayerController._ANIM_RULES) {
      // Todos los candidatos que pasan el predicado (excluye bind pose de Mixamo)
      const candidates = groups.filter((g) => {
        const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
        return clean !== 'mixamo.com' && rule.test(clean);
      });

      if (candidates.length === 0) {
        logger.warn('PlayerController: animacion no encontrada', { key: rule.key, filename });
        continue;
      }

      // Partir en SNS y base
      const snsMatches  = candidates.filter((g) =>  g.name.replace(/_inst\d+$/, '').toLowerCase().includes('_sns'));
      const baseMatches = candidates.filter((g) => !g.name.replace(/_inst\d+$/, '').toLowerCase().includes('_sns'));

      // Death siempre usa el set base (no existe Death_SNS)
      let preferred: AnimationGroup[];
      if (rule.key === 'Death_A') {
        preferred = baseMatches.length > 0 ? baseMatches : candidates;
      } else if (animSet === 'sns') {
        preferred = snsMatches.length  > 0 ? snsMatches  : baseMatches;
      } else {
        preferred = baseMatches.length > 0 ? baseMatches : snsMatches;
      }

      if (preferred.length === 0) {
        logger.warn('PlayerController: animacion no encontrada tras filtrado', { key: rule.key, animSet, filename });
        continue;
      }

      const chosen = preferred[0]!;
      map.set(rule.key, chosen);

      logger.debug('PlayerController: anim resuelta', {
        key: rule.key, animSet,
        chosen: chosen.name,
        discarded: preferred.slice(1).map((g) => g.name),
      });
    }

    return map;
  }

  /**
   * Actualiza el stance activo y re-resuelve todas las animaciones en caliente.
   * Si el jugador esta atacando o muerto, las referencias se actualizan
   * pero no se interrumpe la animacion en curso.
   */
  private _refreshAnimsForStance(stance: WeaponStance): void {
    this._weaponStance = stance;

    if (this._currentInstance === null) {
      // Modelo aun no cargado -- solo guardamos el stance para que loadModel() lo use
      logger.debug('PlayerController: stance cambiado antes de cargar modelo', { stance });
      return;
    }

    const animSet = STANCE_ANIM_SET[stance];
    const animMap = this._resolveAnimMap(animSet, this._currentInstance.rootNode.name);

    // Detener anims actuales (a no ser que este muriendo)
    if (!this._isDead) {
      this._idleAnim?.stop();
      this._walkAnim?.stop();
    }

    // Reasignar referencias
    this._idleAnim   = animMap.get('Idle')     ?? null;
    this._walkAnim   = animMap.get('Run')       ?? null;
    this._attackAnim = animMap.get('Attack_A')  ?? null;
    this._deathAnim  = animMap.get('Death_A')   ?? null;

    // Si hay un ataque o muerte en curso, no interrumpir -- las nuevas referencias
    // se usaran la proxima vez que corresponda
    if (this._isAttacking || this._isDead) { return; }

    // Reanudar la animacion correspondiente al estado de movimiento actual
    if (this._isWalking) {
      this._walkAnim?.start(true, 1.0, this._walkAnim.from, this._walkAnim.to, false);
    } else {
      this._idleAnim?.start(true, 1.0, this._idleAnim.from, this._idleAnim.to, false);
    }

    logger.info('PlayerController: stance actualizado en caliente', {
      stance, animSet,
      idle:   this._idleAnim?.name   ?? 'none',
      walk:   this._walkAnim?.name   ?? 'none',
      attack: this._attackAnim?.name ?? 'none',
      death:  this._deathAnim?.name  ?? 'none',
    });
  }
}
