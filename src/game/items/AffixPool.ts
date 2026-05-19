/**
 * Pools de affixes disponibles por slot de equipamiento.
 * El ItemGenerator consulta este archivo para saber que stats puede
 * generar aleatoriamente para cada pieza de equipo.
 */

import type { AffixStatKey, EquipmentSlot } from '@/types/items.types';
import type { Rarity } from '@/types/game.types';
import { BALANCE } from '@/config/balance';

// Tipos

/** Clave valida del mapa de rangos de affixes en BALANCE.ITEMS.AFFIX_RANGES. */
export type AffixRangeKey = keyof typeof BALANCE.ITEMS.AFFIX_RANGES;

/** Entrada de un pool de affixes: que stat se puede generar y como. */
export interface AffixPoolEntry {
  readonly stat: AffixStatKey;
  /** true = mostrar el valor como porcentaje en la UI. */
  readonly isPercent: boolean;
  /** Que rango de BALANCE.ITEMS.AFFIX_RANGES usar para generar el valor. */
  readonly rangeKey: AffixRangeKey;
  /**
   * true = el valor final es iLevel * random(min, max).
   * false = el valor final es random(min, max) directamente.
   */
  readonly scalesWithILevel: boolean;
  /**
   * Rareza minima del item para que este affix pueda aparecer.
   * undefined = disponible en cualquier rareza.
   */
  readonly minRarity?: Rarity;
}

// Helper

function a(
  stat: AffixStatKey,
  isPercent: boolean,
  rangeKey: AffixRangeKey,
  scalesWithILevel: boolean,
  minRarity?: Rarity,
): AffixPoolEntry {
  return minRarity !== undefined
    ? { stat, isPercent, rangeKey, scalesWithILevel, minRarity }
    : { stat, isPercent, rangeKey, scalesWithILevel };
}

// Pool compartido de anillos
// Los anillos son versatiles: acceso a casi todos los tipos de stat.

const RING_POOL: readonly AffixPoolEntry[] = [
  a('STR',               false, 'STAT_PER_ILEVEL',  true),
  a('DEX',               false, 'STAT_PER_ILEVEL',  true),
  a('INT',               false, 'STAT_PER_ILEVEL',  true),
  a('LCK',               false, 'STAT_PER_ILEVEL',  true),
  a('maxHp',             false, 'HP_PER_ILEVEL',    true),
  a('maxMp',             false, 'MP_PER_ILEVEL',    true),
  a('critChance',        true,  'CRIT_CHANCE',      false),
  a('critDamage',        true,  'CRIT_DAMAGE',      false),
  a('evasion',           true,  'EVASION',          false),
  a('physicalDamagePct', true,  'DAMAGE_PCT',       false),
  a('rangedDamagePct',   true,  'DAMAGE_PCT',       false),
  a('magicalDamagePct',  true,  'DAMAGE_PCT',       false),
  a('lifesteal',         true,  'LIFESTEAL',        false),
  a('manasteal',         true,  'MANASTEAL',        false),
  a('damageReductionPct',true,  'DAMAGE_REDUCTION', false),
  a('statusResistance',  true,  'STATUS_RESISTANCE',false),
];

// Pools por slot

export const AFFIX_POOLS: Record<EquipmentSlot, readonly AffixPoolEntry[]> = {

  head: [
    a('STR',               false, 'STAT_PER_ILEVEL',         true),
    a('DEX',               false, 'STAT_PER_ILEVEL',         true),
    a('INT',               false, 'STAT_PER_ILEVEL',         true),
    a('LCK',               false, 'STAT_PER_ILEVEL',         true),
    a('maxHp',             false, 'HP_PER_ILEVEL',           true),
    a('maxMp',             false, 'MP_PER_ILEVEL',           true),
    a('critChance',        true,  'CRIT_CHANCE',             false),
    a('magicResist',       false, 'MAGIC_RESIST_PER_ILEVEL', true),
    a('damageReductionPct',true,  'DAMAGE_REDUCTION',        false),
    a('physicalDamagePct', true,  'DAMAGE_PCT',              false),
    a('magicalDamagePct',  true,  'DAMAGE_PCT',              false),
    // Exoticos
    a('stunChance',        true,  'STUN_CHANCE',             false, 'epic'),
  ],

  chest: [
    a('STR',                false, 'STAT_PER_ILEVEL',         true),
    a('DEX',                false, 'STAT_PER_ILEVEL',         true),
    a('INT',                false, 'STAT_PER_ILEVEL',         true),
    a('LCK',                false, 'STAT_PER_ILEVEL',         true),
    a('maxHp',              false, 'HP_CHEST_PER_ILEVEL',     true),
    a('maxMp',              false, 'MP_PER_ILEVEL',           true),
    a('armor',              false, 'ARMOR_PER_ILEVEL',        true),
    a('magicResist',        false, 'MAGIC_RESIST_PER_ILEVEL', true),
    a('evasion',            true,  'EVASION',                 false),
    a('damageReductionPct', true,  'DAMAGE_REDUCTION',        false),
    // Exoticos
    a('physicalReductionPct', true, 'PHYSICAL_REDUCTION',     false, 'rare'),
  ],

  legs: [
    a('STR',               false, 'STAT_PER_ILEVEL',  true),
    a('DEX',               false, 'STAT_PER_ILEVEL',  true),
    a('INT',               false, 'STAT_PER_ILEVEL',  true),
    a('maxHp',             false, 'HP_PER_ILEVEL',    true),
    a('evasion',           true,  'EVASION',          false),
    a('turnSpeed',         false, 'TURN_SPEED',       false),
    a('statusResistance',  true,  'STATUS_RESISTANCE',false),
    a('damageReductionPct',true,  'DAMAGE_REDUCTION', false),
  ],

  hands: [
    a('STR',               false, 'STAT_PER_ILEVEL',        true),
    a('DEX',               false, 'STAT_PER_ILEVEL',        true),
    a('flatPhysicalDamage',false, 'FLAT_DAMAGE_PER_ILEVEL', true),
    a('flatRangedDamage',  false, 'FLAT_DAMAGE_PER_ILEVEL', true),
    a('flatMagicalDamage', false, 'FLAT_DAMAGE_PER_ILEVEL', true),
    a('critChance',        true,  'CRIT_CHANCE',            false),
    a('critDamage',        true,  'CRIT_DAMAGE',            false),
    a('physicalDamagePct', true,  'DAMAGE_PCT',             false),
    a('turnSpeed',         false, 'TURN_SPEED',             false),
    // Exoticos
    a('bleedDamage',       false, 'BLEED_DAMAGE_PER_ILEVEL', true, 'rare'),
    a('poisonDamage',      false, 'POISON_DAMAGE_PER_ILEVEL',true, 'rare'),
  ],

  weapon: [
    a('STR',               false, 'STAT_PER_ILEVEL',        true),
    a('DEX',               false, 'STAT_PER_ILEVEL',        true),
    a('INT',               false, 'STAT_PER_ILEVEL',        true),
    a('critChance',        true,  'CRIT_CHANCE',            false),
    a('critDamage',        true,  'CRIT_DAMAGE',            false),
    a('lifesteal',         true,  'LIFESTEAL',              false),
    a('manasteal',         true,  'MANASTEAL',              false),
    a('physicalDamagePct', true,  'DAMAGE_PCT',             false),
    a('rangedDamagePct',   true,  'DAMAGE_PCT',             false),
    a('magicalDamagePct',  true,  'DAMAGE_PCT',             false),
    a('turnSpeed',         false, 'TURN_SPEED',             false),
    // Exoticos
    a('bleedDamage',       false, 'BLEED_DAMAGE_PER_ILEVEL', true, 'rare'),
    a('poisonDamage',      false, 'POISON_DAMAGE_PER_ILEVEL',true, 'rare'),
    a('stunChance',        true,  'STUN_CHANCE',             false, 'epic'),
  ],

  belt: [
    a('STR',                  false, 'STAT_PER_ILEVEL',  true),
    a('DEX',                  false, 'STAT_PER_ILEVEL',  true),
    a('INT',                  false, 'STAT_PER_ILEVEL',  true),
    a('LCK',                  false, 'STAT_PER_ILEVEL',  true),
    a('maxHp',                false, 'HP_PER_ILEVEL',    true),
    a('maxMp',                false, 'MP_PER_ILEVEL',    true),
    a('damageReductionPct',   true,  'DAMAGE_REDUCTION', false),
    a('physicalDamagePct',    true,  'DAMAGE_PCT',       false),
    // Exoticos
    a('physicalReductionPct', true,  'PHYSICAL_REDUCTION', false, 'rare'),
  ],

  ring1: RING_POOL,
  ring2: RING_POOL,

  amulet: [
    a('STR',               false, 'STAT_PER_ILEVEL',         true),
    a('DEX',               false, 'STAT_PER_ILEVEL',         true),
    a('INT',               false, 'STAT_PER_ILEVEL',         true),
    a('LCK',               false, 'STAT_PER_ILEVEL',         true),
    a('maxMp',             false, 'MP_PER_ILEVEL',           true),
    a('critChance',        true,  'CRIT_CHANCE',             false),
    a('critDamage',        true,  'CRIT_DAMAGE',             false),
    a('physicalDamagePct', true,  'DAMAGE_PCT',              false),
    a('rangedDamagePct',   true,  'DAMAGE_PCT',              false),
    a('magicalDamagePct',  true,  'DAMAGE_PCT',              false),
    a('evasion',           true,  'EVASION',                 false),
    a('lifesteal',         true,  'LIFESTEAL',               false),
    // Exoticos
    a('poisonDamage',      false, 'POISON_DAMAGE_PER_ILEVEL', true, 'rare'),
  ],

  // Slot de mascota vacio en el MVP.
  pet: [],
};

/**
 * Devuelve el pool de affixes para un slot dado.
 * Si el slot no tiene pool (pet en MVP), devuelve array vacio.
 */
export function getAffixPool(slot: EquipmentSlot): readonly AffixPoolEntry[] {
  return AFFIX_POOLS[slot];
}
