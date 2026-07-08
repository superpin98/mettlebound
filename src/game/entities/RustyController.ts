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
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  AnimationGroup,
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
const LABEL_Y        = 2.55;

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
  private _wanderTarget:          Vector3;
  private _isWaiting:             boolean = true;
  private _waitTimer:             number  = 0;
  private _observer:              Observer<Scene> | null = null;
  private _isInCombat:            boolean = false;

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
    // Plano 3D (2.0 × 0.5 u) que siempre mira a la cámara.
    const plane = MeshBuilder.CreatePlane(
      'rusty_label',
      { width: 2.0, height: 0.5 },
      this._scene,
    );
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    plane.position.y    = LABEL_Y;
    plane.parent        = this._pivot;

    // Textura dinámica: fondo oscuro semitransparente + texto dorado.
    const tex = new DynamicTexture('rusty_label_tex', { width: 512, height: 128 }, this._scene, false);
    tex.hasAlpha = true;

    // ICanvasRenderingContext de Babylon es un subset. Cast para acceder a textAlign/textBaseline.
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    // Fondo oscuro traslúcido — tag de NPC consciente neutral
    ctx.fillStyle = 'rgba(8, 6, 4, 0.72)';
    ctx.fillRect(0, 0, 512, 128);
    // Texto dorado centrado
    ctx.font          = 'bold 60px serif';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = LABEL_COLOR;
    ctx.fillText('Rusty', 256, 64);
    tex.update();

    const mat = new StandardMaterial('rusty_label_mat', this._scene);
    mat.diffuseTexture              = tex;
    mat.useAlphaFromDiffuseTexture  = true;
    mat.emissiveColor               = new Color3(1, 1, 1); // visible en oscuridad
    mat.backFaceCulling             = false;
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

    // Orientar hacia la dirección de movimiento
    this._pivot.rotation.y = Math.atan2(dx, dz);
  }

  private _registerUpdate(): void {
    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this._update();
    });
    eventBus.on('combat:start', this._onCombatStart);
    eventBus.on('combat:end',   this._onCombatEnd);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Posición actual de Rusty en el mundo (para futura detección de impacto). */
  get position(): Vector3 {
    return this._pivot.position;
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
    this._pivot.dispose();
    logger.info('RustyController: disposed');
  }
}
