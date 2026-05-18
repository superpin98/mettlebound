/**
 * Tipos compartidos del juego.
 * Importar desde aquí en lugar de definir tipos locales en cada módulo.
 */

// ─── Identificadores ────────────────────────────────────────────────────────

/** Las 5 clases jugables del juego. */
export type ClassId =
  | 'guerrero'
  | 'cazador'
  | 'mago'
  | 'picaro'
  | 'errante';

/** Las 4 estadísticas primarias. */
export type StatKey = 'STR' | 'DEX' | 'INT' | 'LCK';

/** Las 6 rarezas de mejoras. */
export type UpgradeRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

// ─── Stats ──────────────────────────────────────────────────────────────────

/** Las 4 estadísticas primarias del jugador. */
export interface CoreStats {
  STR: number;
  DEX: number;
  INT: number;
  LCK: number;
}

/** Stats derivados calculados a partir de los primarios y el nivel. */
export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  critChance: number;  // porcentaje, 0-80
  evasion: number;     // porcentaje, 0-70
  turnSpeed: number;
}

// ─── Mejoras (upgrades) ──────────────────────────────────────────────────────

/**
 * Efecto que puede aplicar una mejora.
 * Cada variante modifica un aspecto diferente del jugador.
 */
export type UpgradeEffect =
  | { type: 'stat_flat';    stat: StatKey; amount: number }
  | { type: 'hp_flat';      amount: number }
  | { type: 'mp_flat';      amount: number }
  | { type: 'crit_flat';    amount: number }  // porcentaje directo
  | { type: 'evasion_flat'; amount: number }  // porcentaje directo
  | { type: 'damage_pct';   amount: number }  // porcentaje multiplicativo
  | { type: 'speed_flat';   amount: number };

/** Definición de una mejora disponible en el pool. */
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  effect: UpgradeEffect;
}

// ─── Clases ──────────────────────────────────────────────────────────────────

/** Definición de una clase jugable. */
export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  baseStats: CoreStats;
  freePoints: number;  // puntos libres adicionales al crear el personaje (Errante: 8)
}

// ─── Estado del jugador ──────────────────────────────────────────────────────

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
  appliedUpgrades: string[];  // IDs de mejoras aplicadas
}

// Nota: el mapa de eventos del EventBus vive en @/core/EventBus (GameEventMap).
// Se define allí para evitar dependencia circular (EventBus → game.types → EventBus).
