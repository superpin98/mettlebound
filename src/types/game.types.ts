/**
 * Tipos compartidos del juego.
 * Importar desde aqui en lugar de definir tipos locales en cada modulo.
 */

// Identificadores

/** Las 5 clases jugables del juego. */
export type ClassId = 'guerrero' | 'cazador' | 'mago' | 'picaro' | 'errante';

/** Las 4 estadisticas primarias. */
export type StatKey = 'STR' | 'DEX' | 'INT' | 'LCK';

/** Las 5 rarezas del juego (items, mejoras, efectos unicos). */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Alias de Rarity para upgrades. Mantener por retrocompatibilidad. */
export type UpgradeRarity = Rarity;

// Stats

/** Las 4 estadisticas primarias del jugador. */
export interface CoreStats {
  STR: number;
  DEX: number;
  INT: number;
  LCK: number;
}

/**
 * Stats derivados calculados a partir de los primarios, el nivel y los items.
 * En el PlayerSnapshot, estos valores ya incluyen los bonus de items equipados.
 * Los campos sin formula (flatDamage, lifesteal, etc.) son 0 si no hay items.
 */
export interface DerivedStats {
  // Calculados por formula (StatCalculator)
  maxHp: number;
  maxMp: number;
  critChance: number;      // porcentaje, 0-80
  evasion: number;         // porcentaje, 0-70
  turnSpeed: number;

  // Ofensivo -- fuente: items + posibles upgrades
  critDamage: number;          // % bonus al dano en critico (0 = sin bonus)
  physicalDamagePct: number;   // % bonus a dano fisico
  rangedDamagePct: number;     // % bonus a dano a distancia
  magicalDamagePct: number;    // % bonus a dano magico
  flatPhysicalDamage: number;  // dano fisico plano anadido
  flatRangedDamage: number;    // dano a distancia plano anadido
  flatMagicalDamage: number;   // dano magico plano anadido

  // Defensivo -- fuente: items + posibles upgrades
  armor: number;               // reduccion de dano fisico (flat)
  magicResist: number;         // reduccion de dano magico (flat)
  damageReductionPct: number;  // % reduccion de todo dano
  physicalReductionPct: number; // % reduccion de dano fisico (adicional a armor)

  // Sustain -- fuente: items
  lifestealPct: number;        // % de dano infligido recuperado como HP
  manastealPct: number;        // % de dano infligido recuperado como MP

  // Estados alterados -- fuente: items raros/epicos/legendarios
  bleedDamage: number;         // dano plano por sangrado aplicado
  poisonDamage: number;        // dano plano por veneno aplicado
  stunChancePct: number;       // % de probabilidad de aturdir al golpear

  // Resistencias -- fuente: items
  statusResistancePct: number; // % resistencia a estados alterados
}

// Mejoras (upgrades)

/** Efecto que puede aplicar una mejora al jugador. */
export type UpgradeEffect =
  | { type: 'stat_flat';    stat: StatKey; amount: number }
  | { type: 'hp_flat';      amount: number }
  | { type: 'mp_flat';      amount: number }
  | { type: 'crit_flat';    amount: number }
  | { type: 'evasion_flat'; amount: number }
  | { type: 'damage_pct';   amount: number }
  | { type: 'speed_flat';   amount: number };

/** Definicion de una mejora disponible en el pool. */
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effect: UpgradeEffect;
}

// Clases

/** Definicion de una clase jugable. */
export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  baseStats: CoreStats;
  freePoints: number;
  /** ID del template de item inicial. Omitido en Errante (empieza sin item). */
  startingItemId?: string;
  /** Nombre del archivo GLB del personaje, p.ej. 'Knight.glb'. */
  modelAssetId?: string;
  /**
   * Nombres de nodo de arma/accesorio que deben quedar visibles.
   * Todos los demas accesorios se ocultan tras cargar el modelo.
   * Lista vacia = sin armas (Errante a puno limpio).
   */
  visibleAttachments?: string[];
}

// Estado del jugador

/**
 * Snapshot inmutable del estado completo del jugador.
 * Se usa para leer el estado, no para mutarlo.
 * PlayerStats emite eventos con este snapshot.
 */
export interface PlayerSnapshot {
  classId: ClassId;
  level: number;
  xp: number;
  xpToNext: number;
  coreStats: CoreStats;
  derivedStats: DerivedStats;
  currentHp: number;
  currentMp: number;
  pendingStatPoints: number;
  appliedUpgrades: string[];
}

// El mapa de eventos del EventBus vive en @/core/EventBus (GameEventMap)
// para evitar dependencia circular (EventBus -> game.types -> EventBus).
