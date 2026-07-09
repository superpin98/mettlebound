// Imports externos (Babylon.js)
import {
  TransformNode,
  Vector3,
  Quaternion,
  PBRMaterial,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { Scene, AnimationGroup, AbstractMesh } from '@babylonjs/core';

// Imports internos
import type { AssetManager, AssetInstance } from '@/core/AssetManager';
import type { CoreStats } from '@/types/game.types';
import type { CombatGrid } from '@/game/world/CombatGrid';
import { Combatant } from '@/game/combat/Combatant';
import { logger } from '@/core/Logger';
import type { Item, EquipmentSlot, EquippedItems } from '@/types/items.types';
import {
  deriveWeaponStance,
  STANCE_ANIM_SET,
  type WeaponStance,
  type AnimSet,
} from '@/game/player/WeaponStance';
import { eventBus } from '@/core/EventBus';

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
   * Stats primarios de la entidad (STR/DEX/INT/LCK).
   * DEX determina los puntos de movimiento tactico.
   * Formula: MOV_BASE + round((MOV_MAX - MOV_BASE) * min(DEX, DEX_MOV_CAP) / DEX_MOV_CAP)
   */
  coreStats: CoreStats;
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
  private _coreStats:            CoreStats;
  private _instance:            AssetInstance | null = null;
  private _idleAnim:            AnimationGroup | null = null;
  private _walkAnim:            AnimationGroup | null = null;
  private _weaponMeshes:  AbstractMesh[]  = [];
  private _weaponStance:  WeaponStance    = 'unarmed';
  private _animGroups:    AnimationGroup[] = [];
  private _modelFilename: string           = '';
  /** True mientras CombatWalker tiene una caminata activa para esta entidad. */
  private _isWalking = false;

  /** Referencia al handler de equipar/desequipar para poder desuscribirlo en dispose(). */
  private _equipHandler: ((payload: { item: Item; slot: EquipmentSlot; equipped: EquippedItems }) => void) | null = null;

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
    this._coreStats             = config.coreStats;

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
      coreStats:   config.coreStats,
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
   * TransformNode raíz de la entidad en el mundo 3D.
   * Usado por CombatHpBar y otros sistemas que necesitan hacer parent
   * a la jerarquía visual de esta entidad.
   */
  get pivot(): TransformNode { return this._pivot; }

  /**
   * Puntos de movimiento tactico de esta entidad.
   * Formula: MOV_BASE + round((MOV_MAX - MOV_BASE) * min(DEX, DEX_MOV_CAP) / DEX_MOV_CAP)
   * Rango: [4, 12] para DEX in [0, 80+].
   * Se recalcula cada vez a partir de _coreStats.DEX (actualizable via updateCoreStats).
   */
  get movementPoints(): number {
    const dexCapped = Math.min(this._coreStats.DEX, DEX_MOV_CAP);
    return MOV_BASE + Math.round((MOV_MAX - MOV_BASE) * dexCapped / DEX_MOV_CAP);
  }

  // -- API publica: stats -------------------------------------------------------

  /** Stats primarios de combate de la entidad (STR/DEX/INT/LCK). */
  get coreStats(): CoreStats { return this._coreStats; }

  /**
   * Actualiza el bloque completo de stats en caliente.
   * Llamado por CombatMovementSystem al recibir player:stats-changed.
   * @param stats Nuevo bloque CoreStats efectivo (ya con bonus de items).
   */
  updateCoreStats(stats: CoreStats): void {
    this._coreStats = stats;
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
    this._isWalking = true;
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
    this._isWalking = false;
    if (this._walkAnim === null) { return; }
    this._walkAnim.stop();
    if (this._idleAnim !== null) {
      this._idleAnim.start(true, 1.0, this._idleAnim.from, this._idleAnim.to, false);
    }
    logger.debug('CombatEntity: Walk detenida, Idle reanudada');
  }

  // -- API publica: animación de ataque ----------------------------------------

  /**
   * Reproduce la animación de ataque UNA sola vez y vuelve al Idle al terminar.
   *
   * Busca un AnimationGroup cuyo nombre contenga 'attack' (case-insensitive),
   * aplicando el filtro SNS/base según el stance actual de la entidad.
   * Si no existe la animación, llama onEnd() inmediatamente (degradación elegante).
   *
   * @param onEnd Callback opcional ejecutado cuando la animación termina
   *              (o inmediatamente si no hay animación de ataque).
   */
  playAttackAnim(onEnd?: () => void): void {
    const animSet = STANCE_ANIM_SET[this._weaponStance];

    const candidates = this._animGroups.filter((g) => {
      const clean = g.name.replace(/_inst\d+$/, '').toLowerCase();
      return clean !== 'mixamo.com' && clean.includes('attack');
    });

    const group = CombatEntity._pickByAnimSet(candidates, animSet);

    if (group === undefined) {
      logger.warn('CombatEntity: animación de ataque no encontrada — skip', {
        displayName: this.combatant.displayName,
        weaponStance: this._weaponStance,
        available: this._animGroups.map((g) => g.name),
      });
      onEnd?.();
      return;
    }

    // Parar Idle para que no compita con el ataque
    this._idleAnim?.stop();

    // Reproducir ataque UNA vez (loop=false)
    group.start(false, 1.0, group.from, group.to, false);

    // Al terminar: volver al Idle y notificar
    group.onAnimationGroupEndObservable.addOnce(() => {
      if (this._idleAnim !== null) {
        this._idleAnim.start(true, 1.0, this._idleAnim.from, this._idleAnim.to, false);
      }
      onEnd?.();
      logger.debug('CombatEntity: animación de ataque finalizada', {
        displayName: this.combatant.displayName, animName: group.name,
      });
    });

    logger.debug('CombatEntity: reproduciendo ataque', {
      displayName: this.combatant.displayName, animName: group.name, animSet,
    });
  }

  // -- API publica: cambio de stance en caliente --------------------------------

  /**
   * Cambia el stance de arma en caliente.
   * Re-resuelve las animaciones Idle/Walk con el nuevo animset (SNS o base)
   * y actualiza la visibilidad de los meshes de arma.
   * La anim Idle del nuevo set arranca inmediatamente para que el cambio
   * sea visible al vuelo. Si la entidad estaba caminando, Walk se re-resuelve
   * sin interrupcion (CombatWalker la volvera a leer en el siguiente startWalkAnim).
   *
   * @param stance Nuevo stance de arma.
   */
  setWeaponStance(stance: WeaponStance): void {
    this._weaponStance = stance;
    const animSet: AnimSet = STANCE_ANIM_SET[stance];

    // Detener anims actuales antes de reasignar referencias
    this._idleAnim?.stop();
    this._walkAnim?.stop();
    this._idleAnim = null;
    this._walkAnim = null;

    // Re-resolver con el nuevo animset. _resolveIdleAnim arranca la Idle automaticamente.
    this._resolveIdleAnim(this._animGroups, this._modelFilename, animSet);
    this._resolveWalkAnim(this._animGroups, this._modelFilename, animSet);
    this._setWeaponVisibility(stance === 'sword_and_shield');

    // Si la entidad está caminando, _resolveIdleAnim acaba de arrancar la idle del nuevo set.
    // La paramos y arrancamos la walk del nuevo set para que el recorrido continúe animado.
    // _resolveIdleAnim/_resolveWalkAnim reasignan _idleAnim/_walkAnim, pero TS mantiene
    // el narrowing de la asignación explícita a null anterior y no lo resetea a través
    // de llamadas a métodos. El cast a AnimationGroup | null escapa ese narrowing incorrecto.
    const idleNow = this._idleAnim as AnimationGroup | null;
    const walkNow = this._walkAnim as AnimationGroup | null;
    if (this._isWalking && walkNow !== null) {
      idleNow?.stop();
      walkNow.start(true, 1.0, walkNow.from, walkNow.to, false);
    }

    logger.debug('CombatEntity: stance cambiado en caliente', {
      displayName: this.combatant.displayName, stance,
      walkingAtChange: this._isWalking,
    });
  }

  // -- Ciclo de vida -----------------------------------------------------------

  /**
   * Libera todos los recursos 3D (meshes, animaciones, pivot).
   * Llamar al finalizar el combate o al destruir la escena.
   */
  dispose(): void {
    // Desuscribir del bus antes de limpiar (evita listeners huerfanos al salir del combate)
    if (this._equipHandler !== null) {
      eventBus.off('inventory:item-equipped',   this._equipHandler);
      eventBus.off('inventory:item-unequipped', this._equipHandler);
      this._equipHandler = null;
    }
    this._walkAnim?.stop();
    this._idleAnim?.stop();
    this._instance?.dispose();
    this._pivot.dispose();
    this._instance    = null;
    this._idleAnim    = null;
    this._walkAnim    = null;
    this._animGroups  = [];
    this._weaponMeshes = [];
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

    this._instance      = instance;
    this._animGroups    = instance.animationGroups;
    this._modelFilename = config.filename;

    const initialStance: WeaponStance = config.weaponStance ?? 'unarmed';
    this._weaponStance = initialStance;
    const animSet: AnimSet = STANCE_ANIM_SET[initialStance];
    this._resolveIdleAnim(this._animGroups, this._modelFilename, animSet);
    this._resolveWalkAnim(this._animGroups, this._modelFilename, animSet);

    // Detectar meshes de arma (sword/shield) y aplicar visibilidad inicial
    this._findAndCacheWeaponMeshes(instance.rootNode.getChildMeshes(false));
    this._setWeaponVisibility(initialStance === 'sword_and_shield');

    // Suscribirse a cambios de inventario para actualizar stance en caliente en combate.
    // Se desuscribe en dispose().
    const handler = ({ equipped }: { equipped: EquippedItems }): void => {
      const newStance = deriveWeaponStance(equipped);
      if (newStance !== this._weaponStance) {
        this.setWeaponStance(newStance);
      }
    };
    this._equipHandler = handler;
    eventBus.on('inventory:item-equipped',   handler);
    eventBus.on('inventory:item-unequipped', handler);
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

  // -- Visibilidad de armas fusionadas ---------------------------------------

  /**
   * Identifica los meshes de arma (sword/shield) entre los hijos del modelo.
   * Nombre limpio (sin _instN) contiene 'sword' o 'shield'.
   */
  private _findAndCacheWeaponMeshes(all: AbstractMesh[]): void {
    const weapons: AbstractMesh[] = [];
    for (const m of all) {
      const clean = m.name.replace(/_inst\d+$/, '').toLowerCase();
      if (clean.includes('sword') || clean.includes('shield')) {
        weapons.push(m);
        for (const child of m.getChildMeshes(false)) { weapons.push(child); }
      }
    }
    this._weaponMeshes = weapons;
    logger.debug('CombatEntity: weapon meshes detectados', {
      displayName: this.combatant.displayName,
      count: weapons.length,
      names: weapons.map((m) => m.name),
    });
  }

  /** Activa o desactiva la visibilidad de los meshes de arma cacheados. */
  private _setWeaponVisibility(visible: boolean): void {
    for (const mesh of this._weaponMeshes) { mesh.isVisible = visible; }
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
