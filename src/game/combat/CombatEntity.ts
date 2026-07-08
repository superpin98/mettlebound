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
import {
  STANCE_ANIM_SET,
  type WeaponStance,
  type AnimSet,
} from '@/game/player/WeaponStance';

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
  /**
   * Destreza de la entidad. Determina los puntos de movimiento tactico.
   * Formula: MOV_BASE + round((MOV_MAX - MOV_BASE) * min(dex, DEX_MOV_CAP) / DEX_MOV_CAP)
   */
  dex: number;
  /**
   * Stance de arma. Controla que animset usa la entidad.
   * 'unarmed' = set base (Idle, Run).
   * 'sword_and_shield' = set SNS (Idle_SNS, Run_SNS).
   * Por defecto 'unarmed' si no se indica.
   */
  weaponStance?: WeaponStance;
}

// ── Constantes de movimiento tactico ────────────────────────────────────────────

/** Puntos de movimiento minimos (DEX = 0). */
const MOV_BASE    = 4;
/** Puntos de movimiento maximos (DEX >= DEX_MOV_CAP). */
const MOV_MAX     = 12;
/** DEX a partir de la cual el movimiento ya no mejora. */
const DEX_MOV_CAP = 80;

// ============================================================
// CombatEntity -- ficha de tablero para el sistema tactico.
//
// Representa una entidad (jugador, enemigo, aliado) posicionada
// en el CombatGrid durante un encuentro de combate.
//
// Animaciones gestionadas:
//   - Idle: reproducida en loop cuando la entidad esta quieta.
//   - Walk: reproducida durante el recorrido (CombatWalker).
//     startWalkAnim() / stopWalkAnim() controlan la transicion.
//
// Metodos de movimiento para CombatWalker:
//   - setCell(x, z)            -> actualiza la celda logica sin mover el pivot
//   - setWorldPosition(x,y,z)  -> mueve el pivot en espacio mundo
//   - setFacingRad(rad)        -> rota el pivot hacia un angulo
//
// SIN fisica Havok: es una ficha visual, no una entidad de exploracion.
// ============================================================

export class CombatEntity {

  private readonly _pivot:      TransformNode;
  private readonly _footprintW: number;
  private readonly _footprintH: number;
  private _dex:                 number;
  private _instance:            AssetInstance | null = null;
  private _idleAnim:            AnimationGroup | null = null;
  private _walkAnim:            AnimationGroup | null = null;

  /** Celda ancla (esquina XZ minima del footprint) en coordenadas de grid. */
  private _cellX = 0;
  private _cellZ = 0;

  /** Stats y HP de esta entidad en el combate. */
  readonly combatant: Combatant;

  // Constructor privado. Usar CombatEntity.create().
  private constructor(scene: Scene, config: CombatEntityConfig) {
    this.combatant             = new Combatant(config.maxHp);
    this.combatant.displayName = config.displayName;
    this._footprintW           = config.footprintW;
    this._footprintH           = config.footprintH;
    this._dex                  = config.dex;

    this._pivot = new TransformNode(
      `combatEntity_${config.displayName}`,
      scene,
    );
    // Inicializar con quaternion para evitar conflictos rotation vs rotationQuaternion.
    this._pivot.rotationQuaternion = Quaternion.Identity();
  }

  // -- Factory async ------------------------------------------------------------

  /**
   * Crea e inicializa una CombatEntity de forma asincrona.
   *
   * Si el GLB ya esta en el cache del AssetManager (cargado previamente
   * por PlayerController o RustyController), la operacion es sincrona
   * en la practica: sin peticion de red, solo instanciacion.
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
      dex:         config.dex,
      movPoints:   entity.movementPoints,
    });
    return entity;
  }

  // -- API publica: getters de estado ------------------------------------------

  /** Columna de la celda ancla (eje X, esquina XZ minima del footprint). */
  get cellX(): number { return this._cellX; }

  /** Fila de la celda ancla (eje Z, esquina XZ minima del footprint). */
  get cellZ(): number { return this._cellZ; }

  /** Anchura del footprint en celdas (eje X). */
  get footprintW(): number { return this._footprintW; }

  /** Profundidad del footprint en celdas (eje Z). */
  get footprintH(): number { return this._footprintH; }

  /**
   * Puntos de movimiento tactico de esta entidad.
   * Formula: MOV_BASE + round((MOV_MAX - MOV_BASE) * min(DEX, DEX_MOV_CAP) / DEX_MOV_CAP)
   * Rango: [4, 12] para DEX in [0, 80+].
   * Se recalcula cada vez a partir de _dex (actualizable en caliente via updateDex).
   */
  get movementPoints(): number {
    const dexCapped = Math.min(this._dex, DEX_MOV_CAP);
    return MOV_BASE + Math.round((MOV_MAX - MOV_BASE) * dexCapped / DEX_MOV_CAP);
  }

  // -- API publica: stats -------------------------------------------------------

  /**
   * Actualiza la DEX de la entidad en caliente.
   * Llamado por CombatMovementSystem al recibir player:stats-changed.
   * @param dex Nuevo valor de DEX (efectivo, ya con bonus de items).
   */
  updateDex(dex: number): void {
    this._dex = dex;
  }

  // -- API publica: posicionamiento completo (con recalculo de mundo) -----------

  /**
   * Posiciona la ficha en el grid y la orienta.
   * Calcula el centro del footprint en espacio mundo y mueve el pivot.
   * Usado para colocacion inicial y teleport (sin caminata).
   *
   * @param anchorX   Columna de la celda ancla (esquina XZ minima).
   * @param anchorZ   Fila de la celda ancla.
   * @param grid      CombatGrid para la conversion celda->mundo.
   * @param facingRad Angulo de rotacion Y en radianes (0 = +Z, PI = -Z).
   */
  placeAt(
    anchorX:   number,
    anchorZ:   number,
    grid:      CombatGrid,
    facingRad: number,
  ): void {
    this._cellX = anchorX;
    this._cellZ = anchorZ;

    const a = grid.cellToWorld(anchorX, anchorZ);
    const b = grid.cellToWorld(
      anchorX + this._footprintW - 1,
      anchorZ + this._footprintH - 1,
    );
    this._pivot.position.x = (a.x + b.x) / 2;
    this._pivot.position.y = 0;
    this._pivot.position.z = (a.z + b.z) / 2;

    this._pivot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), facingRad);

    logger.debug('CombatEntity: posicionada en grid', {
      displayName: this.combatant.displayName, anchorX, anchorZ,
      worldX: this._pivot.position.x, worldZ: this._pivot.position.z, facingRad,
    });
  }

  // -- API para CombatWalker: movimiento paso a paso ---------------------------

  /**
   * Actualiza la celda logica sin mover el pivot visualmente.
   * Llamado por CombatWalker al entrar en cada celda del path.
   * Permite saber en que celda esta la entidad en cualquier momento
   * del recorrido (util para redireccion futura).
   */
  setCell(x: number, z: number): void {
    this._cellX = x;
    this._cellZ = z;
  }

  /**
   * Mueve el pivot a una posicion en espacio mundo.
   * Llamado cada frame por CombatWalker durante la interpolacion.
   */
  setWorldPosition(x: number, y: number, z: number): void {
    this._pivot.position.x = x;
    this._pivot.position.y = y;
    this._pivot.position.z = z;
  }

  /**
   * Rota el pivot hacia el angulo indicado.
   * Llamado por CombatWalker al cambiar de segmento en el path.
   */
  setFacingRad(rad: number): void {
    this._pivot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), rad);
  }

  // -- API para CombatWalker: animaciones de caminata --------------------------

  /**
   * Inicia la animacion de caminata en loop.
   * Pausa el Idle si estaba en reproduccion.
   * Sin efecto si no se encontro animacion Walk en el GLB.
   */
  startWalkAnim(): void {
    if (this._walkAnim === null) { return; }
    this._idleAnim?.stop();
    this._walkAnim.start(true, 1.0, this._walkAnim.from, this._walkAnim.to, false);
    logger.debug('CombatEntity: Walk iniciada', { animName: this._walkAnim.name });
  }

  /**
   * Detiene la animacion de caminata y reanuda el Idle.
   * Sin efecto si no hay Walk activa.
   */
  stopWalkAnim(): void {
    if (this._walkAnim === null) { return; }
    this._walkAnim.stop();
    if (this._idleAnim !== null) {
      this._idleAnim.start(true, 1.0, this._idleAnim.from, this._idleAnim.to, false);
    }
    logger.debug('CombatEntity: Walk detenida, Idle reanudada');
  }

  // -- Ciclo de vida -----------------------------------------------------------

  /**
   * Libera todos los recursos 3D (meshes, animaciones, pivot).
   * Llamar al finalizar el combate o al destruir la escena.
   */
  dispose(): void {
    this._walkAnim?.stop();
    this._idleAnim?.stop();
    this._instance?.dispose();
    this._pivot.dispose();
    this._instance = null;
    this._idleAnim = null;
    this._walkAnim = null;
    logger.debug('CombatEntity: dispuesta', { displayName: this.combatant.displayName });
  }

  // -- Carga del modelo ---------------------------------------------------------

  private async _loadModel(
    assetManager: AssetManager,
    config:       CombatEntityConfig,
  ): Promise<void> {
    const container = await assetManager.loadAsset(config.baseUrl, config.filename);
    const instance  = assetManager.instantiate(container);

    instance.rootNode.parent = this._pivot;

    if (config.modelScale !== 1) {
      const s = config.modelScale;
      instance.rootNode.scaling = new Vector3(s, s, s);
    }

    if (config.isMixamo) {
      for (const mesh of instance.rootNode.getChildMeshes(false)) {
        if (mesh.material instanceof PBRMaterial) {
          const pbr = mesh.material;
          const std = new StandardMaterial(`${mesh.name}_std`, mesh.getScene());
          if (pbr.albedoTexture !== null) { std.diffuseTexture = pbr.albedoTexture; }
          std.specularColor         = new Color3(0, 0, 0);
          std.maxSimultaneousLights = 4;
          mesh.material             = std;
        } else if (mesh.material instanceof StandardMaterial) {
          mesh.material.maxSimultaneousLights = 4;
        }
      }
    }

    this._instance = instance;
    const animSet: AnimSet = STANCE_ANIM_SET[config.weaponStance ?? 'unarmed'];
    this._resolveIdleAnim(instance.animationGroups, config.filename, animSet);
    this._resolveWalkAnim(instance.animationGroups, config.filename, animSet);
  }

  // -- Helpers de resolucion de animaciones ------------------------------------

  /**
   * Filtra candidatos segun animset.
   *   'sns'  → prefiere grupos con '_sns' en el nombre; fallback a los demas.
   *   'base' → prefiere grupos sin '_sns';              fallback a los demas.
   */
  private static _pickByAnimSet(candidates: AnimationGroup[], animSet: AnimSet): AnimationGroup | undefined {
    if (candidates.length === 0) { return undefined; }
    const sns  = candidates.filter((g) =>  g.name.replace(/_inst\d+$/, '').toLowerCase().includes('_sns'));
    const base = candidates.filter((g) => !g.name.replace(/_inst\d+$/, '').toLowerCase().includes('_sns'));
    const preferred = animSet === 'sns'
      ? (sns.length  > 0 ? sns  : base)
      : (base.length > 0 ? base : sns);
    return preferred[0];
  }

  // -- Resolucion de animaciones ------------------------------------------------

  /**
   * Busca la animacion Idle (nombre contiene 'idle', case-insensitive).
   * Descarta 'mixamo.com'. Aplica filtro SNS/base segun animSet.
   */
  private _resolveIdleAnim(groups: AnimationGroup[], filename: string, animSet: AnimSet): void {
    const candidates = groups.filter((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('idle');
    });

    const group = CombatEntity._pickByAnimSet(candidates, animSet);

    if (group === undefined) {
      logger.warn('CombatEntity: animacion Idle no encontrada', {
        filename, animSet, available: groups.map((g) => g.name),
      });
      return;
    }

    this._idleAnim = group;
    group.start(true, 1.0, group.from, group.to, false);
    logger.debug('CombatEntity: Idle iniciada', { animName: group.name, animSet });
  }

  /**
   * Busca la animacion de caminata.
   * Estrategia (en orden): 'walk' → 'run'. Aplica filtro SNS/base segun animSet.
   * Descarta 'mixamo.com'. NO la inicia: se activa bajo demanda via startWalkAnim().
   */
  private _resolveWalkAnim(groups: AnimationGroup[], filename: string, animSet: AnimSet): void {
    const walkCandidates = groups.filter((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('walk');
    });
    const runCandidates = groups.filter((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('run');
    });

    const group =
      CombatEntity._pickByAnimSet(walkCandidates, animSet) ??
      CombatEntity._pickByAnimSet(runCandidates,  animSet);

    if (group === undefined) {
      logger.warn('CombatEntity: animacion Walk/Run no encontrada (la ficha caminara sin anim)', {
        filename, animSet, available: groups.map((g) => g.name),
      });
      return;
    }

    this._walkAnim = group;
    logger.debug('CombatEntity: Walk resuelta', { animName: group.name, animSet });
  }
}
