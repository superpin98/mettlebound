// ============================================================
// interaction.types.ts -- tipos del sistema de interaccion de Mettlebound
//
// Tipos puros (sin dependencia de Babylon.js).
// Fuente de verdad: docs/15_INTERACTION_SYSTEM.md (seccion 1.1 -- 1.8).
// ============================================================

// --- Magnitud y resistencia ---

/**
 * Cinco niveles de magnitud del impacto.
 * "trivial" es adicion de B5 respecto al system_meta original (que tenia 4 niveles).
 */
export type MagnitudeLevel = 'trivial' | 'low' | 'medium' | 'high' | 'extreme';

/**
 * Nueve niveles de resistencia.
 * "heal"           -- el receptor cura HP en vez de recibir danno.
 * "extreme_resist" -- adicion B5 (entre immune y resist_75).
 */
export type ResistanceLevel =
  | 'heal'
  | 'immune'
  | 'extreme_resist'
  | 'resist_75'
  | 'resist_50'
  | 'resist_25'
  | 'normal'
  | 'vulnerable'
  | 'extreme_vulnerable';

// --- Entidades ---

/** Identificador unico de una entidad en escena. */
export type EntityId = string;

// --- Referencias a vectores ---

/** Referencia ligera a un vector del catalogo. */
export interface VectorRef {
  /** ID canonico, ej: "elemental_fire_combustion_direct". */
  vectorId: string;
  /** Sobreescribe el nivel base si se especifica. */
  magnitudeLevel?: MagnitudeLevel;
}

/** Vector real en vuelo: el generador declara que produce y el motor resuelve. */
export interface VectorImpact {
  vectorId: string;
  magnitude: MagnitudeLevel;
  source: EntityId;
  target?: EntityId | 'area';
  /** Casillas de radio si target === "area". */
  areaRadius?: number;
  /** 0 = instantaneo. */
  durationTurns?: number;
  /** Metaetiquetas: "fire", "wet", "push", "magic", etc. */
  tags?: string[];
}

// --- Resistencias ---

/** Condicion que activa una resistencia solo en un contexto dado. */
export interface ResistanceCondition {
  type: 'buff_active' | 'terrain_tag' | 'hp_below_pct' | 'daytime' | 'custom';
  /** Ej: "buff_iron_skin", "wet", "50", "night". */
  value: string;
}

/** Como resiste una entidad a un vector concreto o grupo de vectores. */
export interface Resistance {
  /** ID exacto del vector (prioridad sobre vectorIdPrefix si ambos presentes). */
  vectorId?: string;
  /**
   * Prefijo de grupo. Cubre todos los IDs que empiecen por este prefijo.
   * Ej: "physical_external_slash_" cubre slash_light, slash_heavy, etc.
   */
  vectorIdPrefix?: string;
  level: ResistanceLevel;
  /** La resistencia solo aplica si esta condicion es verdadera. */
  condition?: ResistanceCondition;
}

/** Mapa completo de resistencias de una entidad, organizadas por origen. */
export interface ResistanceProfile {
  /** Fallback para cualquier vector no listado. */
  defaultResistance: ResistanceLevel;
  raceBase:     Resistance[];
  equipment:    Resistance[];
  buffsActive:  Resistance[];
  cursesActive: Resistance[];
}

// --- Props interactuables ---

/** Estado visual y funcional de un prop del entorno. */
export type PropState =
  | 'intact'
  | 'damaged'
  | 'active'
  | 'extinguished'
  | 'broken'
  | 'burning';

/** Transformacion de estado de un prop al recibir un vector especifico. */
export interface PropReaction {
  /** Vector que desencadena la reaccion. */
  triggerVectorId: string;
  /** Nuevo estado del prop tras la reaccion. */
  resultState?: PropState;
  /** Vectores generados como consecuencia. */
  producesVectors?: VectorImpact[];
  /** Descripcion para el Codex. */
  codexHint?: string;
}

/**
 * Cualquier objeto del entorno que puede generar vectores al activarse,
 * destruirse o interactuar con otros vectores.
 *
 * Implementa el pilar "Todo lo que pueda ser interactuable, lo es".
 * Fuente de verdad: docs/15_INTERACTION_SYSTEM.md secc. 1.8.
 */
export interface InteractableProp {
  /** Ej: "torch_wall_room2_01", "barrel_oil_room1_03". */
  id: string;
  /** Ej: "torch", "barrel_oil", "pillar", "bookshelf". */
  propType: string;
  state: PropState;

  resistances: ResistanceProfile;

  /** Vectores generados cuando el jugador ejecuta accion sobre el prop. */
  onActivate?: VectorImpact[];
  /** Vectores generados cuando el prop es destruido (HP llega a 0). */
  onDestroy?: VectorImpact[];
  /** Vectores emitidos de forma continua mientras el prop este activo (por turno). */
  onSustained?: VectorImpact[];
  /** Transformaciones de estado al recibir vectores especificos. */
  reactions?: PropReaction[];

  hp: number;
  maxHp: number;
  isDestructible: boolean;
  isLightSource: boolean;
  /** ID del PointLight de Babylon.js asociado. */
  lightSourceId?: string;

  gridPosition: { x: number; z: number };
  /** true cuando la sala esta en modo combate clonado. */
  inCombatSnapshot: boolean;
}
