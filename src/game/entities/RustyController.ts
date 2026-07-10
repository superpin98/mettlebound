/**
 * RustyController -- el único Esqueleto Sirviente consciente de Grimspire.
 *
 * Rusty no es un enemigo genérico ni un dummy de combate.
 * Es un personaje único con lore propio: aventurero caído cuya voluntad de
 * venganza fue más fuerte que el control de la mazmorra. Flag non_hostile=true.
 *
 * Lore relevante para la presentación:
 *   - Fobia al desprecio / a ser ignorado → tag dorado visible, no agresivo.
 *   - Consciente y neutral → color #c0a060 (nunca rojo de enemigo).
 *   - Test ético del sistema: atacarle genera karma negativo.
 *
 * Referencia doc: docs/data/interaction_vectors.json → race_resistances.skeleton_minion
 */

import {
  Scene,
  TransformNode,
  Vector3,
  Quaternion,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Texture,
  Color3,
  AnimationGroup,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
} from '@babylonjs/core';
import type { Observer } from '@babylonjs/core';

import type { AssetManager } from '@/core/AssetManager';
import type { AssetInstance } from '@/core/AssetManager';
import { Combatant } from '@/game/combat/Combatant';
import { eventBus } from '@/core/EventBus';
import { gameRng } from '@/utils/random';
import { logger } from '@/core/Logger';

// ── Constantes ───────────────────────────────────────────────────────────────

const ASSET_BASE     = '/assets/models/characters/skeletons/';
const ASSET_FILE     = 'Skeleton_Minion.glb';

/** HP de skeleton_minion según docs/data/interaction_vectors.json */
const RUSTY_HP       = 45;

/** Velocidad de paseo (m/s). Moderada para un esqueleto reflexivo. */
const WALK_SPEED     = 1.5;

/** Semibounds del área de deambulación. Grid es 20×20 (±10), usamos ±8. */
const WANDER_BOUNDS  = 8;

/** Distancia (m) a la que se considera "llegado" al destino. */
const ARRIVE_DIST    = 0.4;

/** Rango de espera al llegar (segundos). */
const WAIT_MIN       = 1.5;
const WAIT_MAX       = 3.5;

/** Altura del label sobre el suelo (KayKit mide ~2u). */
const LABEL_Y        = 2.3;

/** Color dorado de NPC consciente neutral. Fuente: solicitud + coherencia lore. */
const LABEL_COLOR    = '#c0a060';

// ── Clase principal ───────────────────────────────────────────────────────────

export class RustyController extends Combatant {

  private readonly _scene:        Scene;
  private readonly _pivot:        TransformNode;
  private _instance:              AssetInstance | null = null;
  private _idleAnim:              AnimationGroup | null = null;
  private _walkAnim:              AnimationGroup | null = null;
  private _currentAnim:           AnimationGroup | null = null;
  /** Todos los AnimationGroups del GLB — para buscar animaciones adicionales (ej: muerte). */
  private _allAnimGroups:         AnimationGroup[]      = [];
  private _wanderTarget:          Vector3;
  private _isWaiting:             boolean = true;
  private _waitTimer:             number  = 0;
  private _observer:              Observer<Scene> | null = null;
  private _isInCombat:            boolean = false;
  /** True cuando Rusty fue eliminado en combate. Impide que _update() lo mueva. */
  private _isDead:                boolean = false;
  private _pivotBody:             PhysicsBody | null = null;
  private _pivotShape:            PhysicsShapeCapsule | null = null;

  // Handlers guardados para poder des-suscribirlos en dispose()
  private readonly _onCombatStart = (): void => { this._isInCombat = true; };
  private readonly _onCombatEnd   = (): void => { this._isInCombat = false; };

  // ── Constructor privado (usar RustyController.create) ──────────────────────

  private constructor(scene: Scene, startPos: Vector3) {
    super(RUSTY_HP);
    this.displayName = 'Rusty';
    this._scene  = scene;
    this._pivot  = new TransformNode('rusty_pivot', scene);
    this._pivot.position.copyFrom(startPos);
    this._wanderTarget = startPos.clone();

    // Cuerpo físico ANIMATED: el pivot conduce la física, sin gravedad.
    // Necesario para que el hitbox de ataque del jugador detecte a Rusty.
    this._pivotBody = new PhysicsBody(this._pivot, PhysicsMotionType.ANIMATED, false, scene);
    this._pivotBody.disablePreStep = false;  // pivot.position → física cada frame
    this._pivotShape = new PhysicsShapeCapsule(
      new Vector3(0, 0.35, 0),  // base de la cápsula (sobre el suelo)
      new Vector3(0, 1.7,  0),  // tope de la cápsula (cabeza del esqueleto)
      0.35,                     // radio ~ anchura de hombros
      scene,
    );
    this._pivotBody.shape = this._pivotShape;
    this._pivotBody.setCollisionCallbackEnabled(true);
  }

  // ── Factory async ──────────────────────────────────────────────────────────

  /**
   * Crea e inicializa RustyController de forma asíncrona.
   * Carga el GLB, instancia el modelo, construye el label, arranca el wander.
   *
   * @param startPos  Posición inicial en el mundo. Default: (3, 0, 3).
   */
  static async create(
    scene: Scene,
    assetManager: AssetManager,
    startPos: Vector3 = new Vector3(3, 0, 3),
  ): Promise<RustyController> {

    const rusty = new RustyController(scene, startPos);
    await rusty._loadModel(assetManager);
    rusty._buildLabel();
    rusty._pickTarget();
    rusty._registerUpdate();
    logger.info('RustyController: Rusty inicializado en escena', {
      pos: `(${startPos.x}, ${startPos.y}, ${startPos.z})`,
    });
    return rusty;
  }

  // ── Carga del modelo ───────────────────────────────────────────────────────

  private async _loadModel(assetManager: AssetManager): Promise<void> {
    const container = await assetManager.loadAsset(ASSET_BASE, ASSET_FILE);
    const instance  = assetManager.instantiate(container);

    // Modelos KayKit ya están en escala metros (~2u de alto). Sin corrección.
    instance.rootNode.parent = this._pivot;

    this._instance = instance;
    this._resolveAnims(instance.animationGroups);
  }

  // ── Animaciones ────────────────────────────────────────────────────────────

  /**
   * Busca por nombre exacto (KayKit tiene nombres canónicos sin sufijos sucios).
   * Los AnimationGroups instanciados llevan sufijo _instN — se elimina para comparar.
   */
  private _resolveAnims(groups: AnimationGroup[]): void {
    this._allAnimGroups = [...groups]; // guardar todos para busquedas futuras (ej: muerte)
    const find = (target: string): AnimationGroup | null =>
      groups.find((g) => g.name.replace(/_inst\d+$/, '') === target) ?? null;

    this._idleAnim = find('Idle');
    // Walking_D_Skeletons es la andadura esqueleto específica de KayKit
    this._walkAnim = find('Walking_D_Skeletons') ?? find('Walking_A');

    logger.debug('RustyController: animaciones resueltas', {
      idle: this._idleAnim?.name ?? 'null',
      walk: this._walkAnim?.name ?? 'null',
    });
  }

  private _playAnim(anim: AnimationGroup | null): void {
    if (anim === null || anim === this._currentAnim) { return; }
    this._currentAnim?.stop();
    anim.start(true, 1.0, anim.from, anim.to, false);
    this._currentAnim = anim;
  }

  // ── Label flotante ─────────────────────────────────────────────────────────

  private _buildLabel(): void {
    // ── Pixel art equilibrado (112×24 px) + NEAREST_SAMPLINGMODE ─────────
    // Doble resolución: texels ~1 px pantalla — retro legible, sin blur.
    // Plano 1.4×0.44 u (mismo ancho que CombatHpBar para coherencia visual).
    const TEX_W = 112;
    const TEX_H = 24;

    const plane = MeshBuilder.CreatePlane(
      'rusty_label',
      { width: 1.4, height: 0.44 },
      this._scene,
    );
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    plane.position.y    = LABEL_Y;
    plane.parent        = this._pivot;
    plane.isPickable    = false;

    // DynamicTexture baja resolución — 5º argumento = NEAREST (sin interpolación)
    const tex = new DynamicTexture(
      'rusty_label_tex',
      { width: TEX_W, height: TEX_H },
      this._scene,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
    tex.hasAlpha = true;

    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

    // Fondo Grimspire oscuro
    ctx.fillStyle = 'rgba(6, 3, 14, 0.82)';
    ctx.fillRect(0, 0, TEX_W, TEX_H);

    // Texto dorado VT323 centrado (NPC consciente neutral)
    ctx.font         = '20px VT323';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = LABEL_COLOR;
    ctx.fillText('RUSTY', Math.floor(TEX_W / 2), Math.floor(TEX_H / 2));

    // Borde 2px con fillRect (sin antialiasing — proporcional a resolución ×2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, TEX_W, 2);
    ctx.fillRect(0, TEX_H - 2, TEX_W, 2);
    ctx.fillRect(0, 0, 2, TEX_H);
    ctx.fillRect(TEX_W - 2, 0, 2, TEX_H);

    tex.update();

    const mat = new StandardMaterial('rusty_label_mat', this._scene);
    mat.diffuseTexture             = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor              = new Color3(1, 1, 1);
    mat.backFaceCulling            = false;
    mat.disableLighting            = true;
    plane.material = mat;
  }

  // ── Wander AI ─────────────────────────────────────────────────────────────

  private _pickTarget(): void {
    const x = gameRng.float(-WANDER_BOUNDS, WANDER_BOUNDS);
    const z = gameRng.float(-WANDER_BOUNDS, WANDER_BOUNDS);
    this._wanderTarget.set(x, 0, z);
    this._isWaiting = false;
    this._playAnim(this._walkAnim);
  }

  private _update(): void {
    if (this._isDead)     { return; } // muerto — no mover ni animar nunca
    // Guard: en combate — congelar wander
    if (this._isInCombat) { return; }

    const dt = this._scene.getEngine().getDeltaTime() / 1000; // segundos

    if (this._isWaiting) {
      this._waitTimer -= dt;
      if (this._waitTimer <= 0) { this._pickTarget(); }
      return;
    }

    const pos = this._pivot.position;
    const dx  = this._wanderTarget.x - pos.x;
    const dz  = this._wanderTarget.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < ARRIVE_DIST) {
      // Llegó al destino — esperar antes de elegir otro punto
      this._isWaiting  = true;
      this._waitTimer  = gameRng.float(WAIT_MIN, WAIT_MAX);
      this._pivot.position.y = 0;
      this._playAnim(this._idleAnim);
      return;
    }

    // Avanzar hacia el destino
    const invDist = 1 / dist;
    pos.x += dx * invDist * WALK_SPEED * dt;
    pos.z += dz * invDist * WALK_SPEED * dt;
    pos.y  = 0; // siempre en el suelo, sin física Havok

    // Orientar hacia la dirección de movimiento.
    // PhysicsBody inicializa rotationQuaternion en el pivot; cuando existe,
    // Babylon ignora rotation.y. Usamos Quaternion directamente.
    this._pivot.rotationQuaternion = Quaternion.RotationAxis(
      Vector3.Up(),
      Math.atan2(dx, dz),
    );
  }

  private _registerUpdate(): void {
    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this._update();
    });
    eventBus.on('combat:start', this._onCombatStart);
    eventBus.on('combat:end',   this._onCombatEnd);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Cuerpo físico Havok de Rusty.
   * Disponible tras create(). El hitbox de ataque del jugador lo usa para
   * identificar a Rusty cuando TRIGGER_ENTERED se dispara.
   */
  get physicsBody(): PhysicsBody | null {
    return this._pivotBody;
  }

  /**
   * Centro 3D del cuerpo de Rusty (pivot + 1.0u en Y).
   * Usar esto para el overlap query del hitbox, NO `position` (que está en y=0).
   */
  get bodyCenter(): Vector3 {
    const p = this._pivot.position;
    return new Vector3(p.x, p.y + 1.0, p.z);
  }

  /** Posición actual del pivot de Rusty en el mundo (nivel del suelo). */
  get position(): Vector3 {
    return this._pivot.position;
  }

  /**
   * Activa o desactiva a Rusty y todos sus meshes hijo.
   * Usado para ocultarlo al entrar en la escena de combate.
   */
  /**
   * Marca a este NPC como muerto.
   * Detiene inmediatamente cualquier movimiento de exploracion y evita que
   * setEnabled(true) lo reactive. Generico: preparado para cualquier enemigo.
   */
  /**
   * Marca al NPC como muerto.
   * Solo establece el flag — NO oculta el mesh. El cuerpo permanece visible.
   * El comportamiento (movimiento, IA) se detiene via el guard en _update().
   * Para mostrar la pose de muerte en exploracion, llama showCorpse() aparte.
   */
  markDead(): void {
    this._isDead = true;
    // No ocultamos el pivot: el cadaver debe seguir visible en exploracion.
  }

  /**
   * Congela al NPC en la pose de muerte para la escena de exploracion.
   * Busca cualquier AnimationGroup cuyo nombre contenga 'death' (case-insensitive)
   * y lo reproduce UNA vez (loop=false): Babylon.js deja el ultimo frame visible.
   * Si no existe animacion de muerte, detiene la animacion actual (pose neutra).
   *
   * TODO (pieza futura): este cadaver sera saqueable con tecla E.
   */
  showCorpse(): void {
    // Detener TODAS las animaciones activas (Idle, Walk, cualquier otra)
    for (const g of this._allAnimGroups) { g.stop(); }
    this._currentAnim = null;

    // Buscar animacion de muerte por nombre (mismo criterio que CombatEntity)
    const deathGroup = this._allAnimGroups.find((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('death');
    });

    if (deathGroup === undefined) {
      logger.debug('RustyController: sin animacion de muerte — cadaver en pose neutra');
      return;
    }

    // Saltar DIRECTAMENTE al ultimo frame sin reproducir la animacion desde el principio.
    // Truco: start con from == to == lastFrame → rango 0, el skeleton queda en ese frame
    // y como loop=false no vuelve a frame 0 ni dispara onEnd.
    const lastFrame = deathGroup.to;
    deathGroup.start(false, 1.0, lastFrame, lastFrame, false);

    logger.debug('RustyController: cadaver fijado en ultimo frame de muerte', {
      anim: deathGroup.name, frame: lastFrame,
    });
  }

  /** True si el NPC fue eliminado en combate. */
  get isDead(): boolean { return this._isDead; }

  /**
   * Activa/desactiva el pivot de exploracion.
   * Si el NPC esta muerto, setEnabled(true) ESTA permitido para mostrar el cadaver.
   * El guard de _isDead en _update() garantiza que no se mueva.
   */
  setEnabled(enabled: boolean): void {
    this._pivot.setEnabled(enabled);
  }

  dispose(): void {
    eventBus.off('combat:start', this._onCombatStart);
    eventBus.off('combat:end',   this._onCombatEnd);
    if (this._observer !== null) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }
    this._currentAnim?.stop();
    this._instance?.dispose();
    // Física: limpiar body antes de disponer el pivot (el body lo referencia)
    if (this._pivotBody !== null) {
      this._pivotBody.shape = null;
      this._pivotBody.dispose();
      this._pivotBody = null;
    }
    this._pivotShape?.dispose();
    this._pivotShape = null;
    this._pivot.dispose();
    logger.info('RustyController: disposed');
  }
}