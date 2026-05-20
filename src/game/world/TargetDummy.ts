/**
 * TargetDummy -- entidad estatica no hostil para validar el sistema de combate.
 *
 * Usa static async create() como factory porque la carga del GLB es asincrona.
 *
 * Extiende Combatant (logica pura de HP) y anade:
 *   - Modelo 3D Skeleton_Minion.glb (Rusty) cargado via AssetManager
 *   - Animacion Idle en bucle cuando vivo
 *   - Animacion Death_A (una sola vez, congela en ultimo frame) al morir
 *   - Overlay HTML con nombre + barra de vida pixel art proyectada sobre el mundo 3D
 *   - Respawn manual via respawn()
 *
 * metadata.isTargetDummy = true en los meshes hijo: hitbox preparado para el
 * sistema de seleccion de objetivo del Bloque 8.
 */

import {
  PBRMaterial,
  StandardMaterial,
  Vector3,
  Matrix,
  type Scene,
  type TransformNode,
  type AnimationGroup,
  type Observer,
} from '@babylonjs/core';

import { Combatant } from '@/game/combat/Combatant';
import type { AssetManager, AssetInstance } from '@/core/AssetManager';

// ── Constantes ────────────────────────────────────────────────

/** Ruta base de los modelos de esqueleto KayKit */
const SKELETON_BASE_URL = '/assets/models/characters/skeletons/';

/** Archivo GLB de Rusty */
const MINION_FILE = 'Skeleton_Minion.glb';

/** HP maximo del dummy */
const DUMMY_MAX_HP = 200;

/**
 * Unidades Babylon por encima del rootNode donde se ancla el overlay.
 * El modelo KayKit Skeleton_Minion mide ~1.6 u de alto (inspeccionado:
 * bounding box del Body de Y=0.376 a Y=1.425, cabeza por encima).
 * 1.9 u queda con margen sobre la calavera.
 */
const OVERLAY_ABOVE_Y = 1.9;

// ── Clase ─────────────────────────────────────────────────────

export class TargetDummy extends Combatant {

  private readonly _scene: Scene;
  private readonly _instance: AssetInstance;

  /** rootNode del modelo GLB, usado para posicionar y animar. */
  private readonly _rootNode: TransformNode;

  /** Posicion inicial guardada para resetear en respawn. */
  private readonly _initPosition: Vector3;

  /**
   * Rotacion Y inicial calculada para que el modelo mire hacia el origen.
   * Guardada para resetear en respawn si la animacion de muerte la altera.
   *
   * KayKit Skeleton tiene el frente mirando hacia -Z de fabrica (opuesto a
   * los Adventurers que miran +Z). Para mirara hacia el origen (0,0,0) desde
   * una posicion (px, 0, pz) la formula es: Math.atan2(px, pz).
   *
   * Ejemplos:
   *   pos=(0,0,2)  -> atan2(0,2)  =  0     (frente a -Z, mira al origen)
   *   pos=(2,0,0)  -> atan2(2,0)  =  PI/2  (frente a -X, mira al origen)
   *   pos=(-2,0,0) -> atan2(-2,0) = -PI/2  (frente a +X, mira al origen)
   */
  private readonly _initRotationY: number;

  /** Animacion Idle en bucle (estado por defecto). */
  private readonly _idleAnim: AnimationGroup | null;

  /** Animacion Death_A (una sola vez al morir). */
  private readonly _deathAnim: AnimationGroup | null;

  /** Contenedor raiz del overlay (position: fixed en el DOM) */
  private readonly _overlay: HTMLDivElement;

  /** Div con el nombre de la entidad (encima de la barra). */
  private readonly _nameLabel: HTMLDivElement;

  /** Div interior que representa el relleno de la barra */
  private readonly _fill: HTMLDivElement;

  /** Observer del render loop para actualizar posicion del overlay */
  private _renderObserver: Observer<Scene> | null = null;

  // ── Constructor privado ────────────────────────────────────────

  private constructor(
    scene: Scene,
    instance: AssetInstance,
    position: Vector3,
  ) {
    super(DUMMY_MAX_HP);

    this._scene    = scene;
    this._instance = instance;
    this._rootNode = instance.rootNode;

    // Calcular rotacion para que el frente del modelo (-Z en KayKit Skeleton)
    // apunte hacia el origen (0, 0, 0) desde la posicion dada.
    // Formula: atan2(px, pz) invierte la logica respecto a los Adventurers (+Z).
    this._initRotationY = Math.atan2(position.x, position.z);

    // Posicionar: Y=0 para que los pies toquen el suelo.
    // KayKit Skeleton_Minion tiene el origen en los pies (igual que Adventurers).
    this._rootNode.position = new Vector3(position.x, 0, position.z);
    this._rootNode.rotation = new Vector3(0, this._initRotationY, 0);
    this._initPosition = new Vector3(position.x, 0, position.z);

    // Marcar todos los meshes hijo para el sistema de seleccion de objetivo (Bloque 8)
    for (const mesh of this._rootNode.getChildMeshes(false)) {
      mesh.metadata = { isTargetDummy: true };
    }

    // ── Animaciones ────────────────────────────────────────────

    // instantiateModelsToScene anade sufijo _instN; buscar por nombre base
    const findAnim = (baseName: string): AnimationGroup | null =>
      instance.animationGroups.find(
        (g) => g.name.replace(/_inst\d+$/, '') === baseName,
      ) ?? null;

    this._idleAnim  = findAnim('Idle');
    this._deathAnim = findAnim('Death_A');

    // Arrancar Idle en bucle como estado por defecto
    this._idleAnim?.start(
      /* loop     */ true,
      /* speed    */ 1.0,
      /* from     */ this._idleAnim.from,
      /* to       */ this._idleAnim.to,
      /* additive */ false,
    );

    // ── Overlay HTML ────────────────────────────────────────────

    this._overlay = document.createElement('div');
    this._overlay.className = 'dummy-hp-overlay';

    // Nombre: se rellena en create() una vez que se conoce displayName
    this._nameLabel = document.createElement('div');
    this._nameLabel.className = 'dummy-name-label';
    this._nameLabel.style.display = 'none';   // oculto hasta que create() lo active
    this._overlay.appendChild(this._nameLabel);

    const wrap = document.createElement('div');
    wrap.className = 'dummy-hp-bar-wrap';

    this._fill = document.createElement('div');
    this._fill.className = 'dummy-hp-bar-fill';

    wrap.appendChild(this._fill);
    this._overlay.appendChild(wrap);
    document.body.appendChild(this._overlay);

    // ── Render loop ─────────────────────────────────────────────

    this._renderObserver = scene.onBeforeRenderObservable.add(() => {
      this._updateOverlayPosition();
      this._updateFillWidth();
    });
  }

  // ── Factory estatica ──────────────────────────────────────────

  /**
   * Carga el modelo GLB de Rusty (Skeleton_Minion) y crea el TargetDummy.
   * Async porque la carga del GLB via AssetManager es asincrona.
   *
   * @param scene         Escena Babylon activa.
   * @param assetManager  Gestor de assets compartido (cachea el container).
   * @param position      Posicion en la sala (Y se ignora; los pies siempre a 0).
   * @param displayName   Nombre visible encima de la barra. "" = sin nombre.
   */
  static async create(
    scene: Scene,
    assetManager: AssetManager,
    position: Vector3,
    displayName: string = '',
  ): Promise<TargetDummy> {
    const container = await assetManager.loadAsset(SKELETON_BASE_URL, MINION_FILE);
    const instance  = assetManager.instantiate(container);

    // Garantizar maxSimultaneousLights = 8 en los materiales del esqueleto.
    // Se hace aqui, antes del primer frame, para que los shaders compilen
    // directamente con las 6 luces de la sala de prueba.
    for (const mesh of instance.rootNode.getChildMeshes(false)) {
      const mat = mesh.material;
      if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) {
        mat.maxSimultaneousLights = 8;
      }
    }

    const dummy = new TargetDummy(scene, instance, position);

    // Asignar nombre y actualizar label ahora que el objeto esta construido
    dummy.displayName = displayName;
    if (displayName) {
      dummy._nameLabel.textContent   = displayName;
      dummy._nameLabel.style.display = '';
    }

    return dummy;
  }

  // ── API publica ───────────────────────────────────────────────

  /**
   * Aplica danio al dummy. Al morir reproduce Death_A una sola vez.
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
   * Restaura el dummy: detiene Death_A, vuelve a Idle y muestra el overlay.
   * Llamado por el cheat "Respawn Dummy" del dev-panel.
   */
  respawn(): void {
    this._deathAnim?.stop();

    // Resetear transformaciones del rootNode por si la animacion las modifico
    this._rootNode.position = this._initPosition.clone();
    this._rootNode.rotation = new Vector3(0, this._initRotationY, 0);

    this.restoreToFull();
    this._applyAliveState();

    this._idleAnim?.start(
      /* loop     */ true,
      /* speed    */ 1.0,
      /* from     */ this._idleAnim.from,
      /* to       */ this._idleAnim.to,
      /* additive */ false,
    );
  }

  /** Libera todos los recursos (instancia GLB, overlay HTML, observer). */
  dispose(): void {
    if (this._renderObserver) {
      this._scene.onBeforeRenderObservable.remove(this._renderObserver);
      this._renderObserver = null;
    }
    this._deathAnim?.stop();
    this._idleAnim?.stop();
    this._instance.dispose();
    this._overlay.remove();
  }

  // ── Helpers privados ──────────────────────────────────────────

  private _applyDeadState(): void {
    this._overlay.style.visibility = 'hidden';
    // Detener Idle y reproducir Death_A una sola vez (congela en el ultimo frame)
    this._idleAnim?.stop();
    if (this._deathAnim) {
      this._deathAnim.start(
        /* loop     */ false,
        /* speed    */ 1.0,
        /* from     */ this._deathAnim.from,
        /* to       */ this._deathAnim.to,
        /* additive */ false,
      );
    }
  }

  private _applyAliveState(): void {
    this._overlay.style.visibility = 'visible';
  }

  private _updateFillWidth(): void {
    this._fill.style.width = `${this.hpPercent * 100}%`;
  }

  /**
   * Proyecta la posicion 3D de Rusty a coordenadas de pantalla y
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

    // Punto de anclaje: sobre la cabeza de Rusty (rootNode.y=0 -> pies en suelo)
    const worldPos = this._rootNode.getAbsolutePosition().clone();
    worldPos.y += OVERLAY_ABOVE_Y;

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
