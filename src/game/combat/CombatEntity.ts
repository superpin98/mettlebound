// Imports externos (Babylon.js)
import {
  TransformNode,
  Vector3,
  Quaternion,
  PBRMaterial,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { Scene, AnimationGroup } from '@babylonjs/core';

// Imports internos
import type { AssetManager, AssetInstance } from '@/core/AssetManager';
import type { CombatGrid } from '@/game/world/CombatGrid';
import { Combatant } from '@/game/combat/Combatant';
import { logger } from '@/core/Logger';

// ============================================================
// Tipos
// ============================================================

/**
 * Configuracion para crear una CombatEntity.
 * Separa la logica visual (GLB, escala, isMixamo) de la logica de stats (maxHp, nombre).
 */
export interface CombatEntityConfig {
  /** URL base del GLB, ej. '/assets/models/characters/' */
  baseUrl:     string;
  /** Nombre del archivo GLB, ej. 'knight_armed.glb' */
  filename:    string;
  /**
   * Si true, aplica correccion PBR->StandardMaterial al instanciar.
   * Necesario para modelos Mixamo/Meshy exportados como GLTF para evitar
   * desbordamiento de GL_MAX_VERTEX_UNIFORM_BUFFERS (limite WebGL = 12).
   */
  isMixamo:    boolean;
  /**
   * Factor de escala aplicado al rootNode.
   * GLBs cocinados en Blender ya estan en metros -> 1.0.
   * GLBs crudos de Mixamo -> 0.01.
   */
  modelScale:  number;
  /** HP maximo de la entidad. */
  maxHp:       number;
  /** Nombre para mostrar en la UI (barra de vida, tooltips). */
  displayName: string;
  /** Anchura del footprint en celdas (eje X del grid). */
  footprintW:  number;
  /** Profundidad del footprint en celdas (eje Z del grid). */
  footprintH:  number;
}

// ============================================================
// CombatEntity -- ficha de tablero para el sistema tactico.
//
// Representa una entidad (jugador, enemigo, aliado) posicionada
// en el CombatGrid durante un encuentro de combate.
//
// Caracteristicas:
//   - Carga un GLB via AssetManager (aprovechar cache existente).
//   - Reproduce su animacion Idle en loop desde el momento de creacion.
//   - Conoce su posicion en el grid (celda ancla + footprint N×M).
//   - Soporta footprints multi-casilla (jugador/Rusty = 1x1;
//     jefes futuros = 2x2, 3x3, etc.) desde el diseno.
//   - SIN fisica Havok: es una ficha visual, no una entidad de exploracion.
//
// Patron: constructor privado + factory estatica async (igual que RustyController).
//
// Uso:
//   const entity = await CombatEntity.create(scene, assetManager, config);
//   entity.placeAt(cx, cz, grid, facingRad);
//   // ... combate en sprints futuros ...
//   entity.dispose();
// ============================================================

export class CombatEntity {

  private readonly _pivot:      TransformNode;
  private readonly _footprintW: number;
  private readonly _footprintH: number;
  private _instance:            AssetInstance | null = null;
  private _idleAnim:            AnimationGroup | null = null;

  /** Celda ancla (esquina XZ minima del footprint) en coordenadas de grid. */
  private _cellX = 0;
  private _cellZ = 0;

  /** Stats y HP de esta entidad en el combate. */
  readonly combatant: Combatant;

  // Constructor privado. Usar CombatEntity.create().
  private constructor(scene: Scene, config: CombatEntityConfig) {
    this.combatant            = new Combatant(config.maxHp);
    this.combatant.displayName = config.displayName;
    this._footprintW          = config.footprintW;
    this._footprintH          = config.footprintH;

    this._pivot = new TransformNode(
      `combatEntity_${config.displayName}`,
      scene,
    );
    // Inicializar con quaternion para evitar conflictos rotation vs rotationQuaternion.
    this._pivot.rotationQuaternion = Quaternion.Identity();
  }

  // ── Factory async ────────────────────────────────────────────────────────────

  /**
   * Crea e inicializa una CombatEntity de forma asincrona.
   *
   * Si el GLB ya esta en el cache del AssetManager (cargado previamente
   * por PlayerController o RustyController), la operacion es sincrona
   * en la practica: sin peticion de red, solo instanciacion.
   *
   * @param scene        Escena Babylon activa.
   * @param assetManager Cache de assets compartida con la exploracion.
   * @param config       Configuracion del modelo y stats.
   */
  static async create(
    scene: Scene,
    assetManager: AssetManager,
    config: CombatEntityConfig,
  ): Promise<CombatEntity> {
    const entity = new CombatEntity(scene, config);
    await entity._loadModel(assetManager, config);
    logger.info('CombatEntity: entidad creada', {
      displayName: config.displayName,
      footprint:   `${config.footprintW}x${config.footprintH}`,
    });
    return entity;
  }

  // ── API publica ──────────────────────────────────────────────────────────────

  /** Columna de la celda ancla (eje X, esquina XZ minima del footprint). */
  get cellX(): number { return this._cellX; }

  /** Fila de la celda ancla (eje Z, esquina XZ minima del footprint). */
  get cellZ(): number { return this._cellZ; }

  /** Anchura del footprint en celdas (eje X). */
  get footprintW(): number { return this._footprintW; }

  /** Profundidad del footprint en celdas (eje Z). */
  get footprintH(): number { return this._footprintH; }

  /**
   * Posiciona la ficha en el grid y la orienta segun el angulo indicado.
   *
   * Para footprints N×M, el pivot se coloca en el CENTRO geometrico
   * de todas las celdas que ocupa (no en la esquina ancla).
   * Para 1×1: el pivot cae en el centro exacto de la celda.
   *
   * @param anchorX   Columna de la celda ancla (esquina XZ minima).
   * @param anchorZ   Fila de la celda ancla.
   * @param grid      CombatGrid para la conversion celda->mundo.
   * @param facingRad Angulo de rotacion Y en radianes.
   *                  0 = facing +Z. Math.PI = facing -Z.
   *                  Convencion identica a PlayerController y RustyController.
   */
  placeAt(
    anchorX:   number,
    anchorZ:   number,
    grid:      CombatGrid,
    facingRad: number,
  ): void {
    this._cellX = anchorX;
    this._cellZ = anchorZ;

    // Centro del footprint en espacio mundo.
    // cellToWorld(cx, cz) devuelve el centro de la celda (cx, cz).
    // Para footprint N×M: el centro geometrico esta entre la celda ancla
    // y la celda en la esquina opuesta (anchorX + W - 1, anchorZ + H - 1).
    const a = grid.cellToWorld(anchorX, anchorZ);
    const b = grid.cellToWorld(
      anchorX + this._footprintW - 1,
      anchorZ + this._footprintH - 1,
    );
    this._pivot.position.x = (a.x + b.x) / 2;
    this._pivot.position.y = 0;  // a ras del suelo del grid (Y = 0)
    this._pivot.position.z = (a.z + b.z) / 2;

    this._pivot.rotationQuaternion = Quaternion.RotationAxis(
      Vector3.Up(),
      facingRad,
    );

    logger.debug('CombatEntity: posicionada en grid', {
      displayName: this.combatant.displayName,
      anchorX,
      anchorZ,
      worldX: this._pivot.position.x,
      worldZ: this._pivot.position.z,
      facingRad,
    });
  }

  /**
   * Libera todos los recursos 3D (meshes, animaciones, pivot).
   * Llamar al finalizar el combate o al destruir la escena.
   */
  dispose(): void {
    this._idleAnim?.stop();
    this._instance?.dispose();
    this._pivot.dispose();
    this._instance = null;
    this._idleAnim = null;
    logger.debug('CombatEntity: dispuesta', { displayName: this.combatant.displayName });
  }

  // ── Carga del modelo ─────────────────────────────────────────────────────────

  private async _loadModel(
    assetManager: AssetManager,
    config:       CombatEntityConfig,
  ): Promise<void> {
    const container = await assetManager.loadAsset(config.baseUrl, config.filename);
    const instance  = assetManager.instantiate(container);

    // Anclar al pivot. El pivot vive en world space;
    // el modelo hereda su posicion, rotacion y escala.
    instance.rootNode.parent = this._pivot;

    // Escala: solo si != 1 (GLBs cocinados en Blender ya estan en metros).
    if (config.modelScale !== 1) {
      const s = config.modelScale;
      instance.rootNode.scaling = new Vector3(s, s, s);
    }

    // Modelos Mixamo: convertir PBR -> Standard para evitar desbordamiento
    // de GL_MAX_VERTEX_UNIFORM_BUFFERS (limite WebGL = 12).
    // Mismo tratamiento que en PlayerController._pbrToStandard().
    if (config.isMixamo) {
      for (const mesh of instance.rootNode.getChildMeshes(false)) {
        if (mesh.material instanceof PBRMaterial) {
          const pbr = mesh.material;
          const std = new StandardMaterial(`${mesh.name}_std`, mesh.getScene());
          if (pbr.albedoTexture !== null) {
            std.diffuseTexture = pbr.albedoTexture;
          }
          std.specularColor         = new Color3(0, 0, 0);
          std.maxSimultaneousLights = 4;
          mesh.material             = std;
        } else if (mesh.material instanceof StandardMaterial) {
          mesh.material.maxSimultaneousLights = 4;
        }
      }
    }

    this._instance = instance;
    this._resolveIdleAnim(instance.animationGroups, config.filename);
  }

  // ── Animacion ────────────────────────────────────────────────────────────────

  /**
   * Busca la animacion Idle por nombre (case-insensitive, contiene 'idle').
   * Descarta 'mixamo.com' (bind pose basura que Mixamo siempre incluye).
   * Compatible con:
   *   - KayKit:  'Idle', 'Walking_A', ...
   *   - Mixamo:  'Knight_unarmed_idle', 'mixamo.com', ...
   */
  private _resolveIdleAnim(groups: AnimationGroup[], filename: string): void {
    const idleGroup = groups.find((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('idle');
    });

    if (idleGroup === undefined) {
      logger.warn('CombatEntity: animacion Idle no encontrada', {
        filename,
        available: groups.map((g) => g.name),
      });
      return;
    }

    this._idleAnim = idleGroup;
    idleGroup.start(
      /* loop     */ true,
      /* speed    */ 1.0,
      /* from     */ idleGroup.from,
      /* to       */ idleGroup.to,
      /* additive */ false,
    );
    logger.debug('CombatEntity: Idle iniciada', { animName: idleGroup.name });
  }
}
