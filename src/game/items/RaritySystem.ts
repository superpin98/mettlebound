/**
 * Sistema de rareza para items generados proceduralmente.
 * Todas las funciones son puras: mismo input -> mismo output.
 * Usa el RNG centralizado (gameRng) para reproducibilidad.
 */

import type { Rarity } from '@/types/game.types';
import { BALANCE } from '@/config/balance';
import { gameRng } from '@/utils/random';

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Pesos de rareza: cada clave es una Rarity con su peso numerico. */
export type RarityWeights = Record<Rarity, number>;

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Orden de rarezas de menor a mayor (para iterar de forma determinista). */
const RARITY_ORDER: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

/** Numero de affixes que se generan por rareza. */
export const AFFIX_COUNT_BY_RARITY: Record<Rarity, number> = {
  common:    1,
  uncommon:  2,
  rare:      3,
  epic:      4,
  legendary: 5,
};

// ─── Funciones puras ─────────────────────────────────────────────────────────

/**
 * Calcula los pesos de rareza ajustados por suerte del jugador y tier del piso.
 * El peso de 'common' nunca baja del minimo definido en BALANCE.
 *
 * @param playerLuck - Stat LCK actual del jugador
 * @param floorTier  - Nivel del piso actual (1 = primer piso)
 * @returns Pesos ajustados para cada rareza
 */
export function getDropWeights(playerLuck: number, floorTier: number): RarityWeights {
  const b = BALANCE.ITEMS;
  const luckBonus = playerLuck * b.DROP_LUCK_BONUS_PER_POINT;
  const tierBonus = floorTier * b.DROP_TIER_BONUS_PER_FLOOR;

  const uncommon  = b.RARITY_WEIGHTS.uncommon  + tierBonus * 0.5;
  const rare      = b.RARITY_WEIGHTS.rare      + tierBonus * 0.7  + luckBonus * 0.3;
  const epic      = b.RARITY_WEIGHTS.epic      + tierBonus * 0.2  + luckBonus * 0.2;
  const legendary = b.RARITY_WEIGHTS.legendary + tierBonus * 0.05 + luckBonus * 0.1;
  const common    = Math.max(
    b.DROP_COMMON_MIN_WEIGHT,
    100 - (uncommon + rare + epic + legendary)
  );

  return { common, uncommon, rare, epic, legendary };
}

/**
 * Elige una rareza aleatoria a partir de un mapa de pesos.
 * Usa gameRng para reproducibilidad con seed.
 *
 * @param weights - Pesos por rareza (no necesitan sumar 100 exactamente)
 * @returns La rareza elegida
 */
export function rollRarity(weights: RarityWeights): Rarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + weights[r], 0);
  let roll = gameRng.next() * total;

  for (const rarity of RARITY_ORDER) {
    roll -= weights[rarity];
    if (roll <= 0) {
      return rarity;
    }
  }

  // Fallback defensivo: devolver el ultimo en caso de precision flotante
  return RARITY_ORDER[RARITY_ORDER.length - 1] ?? 'legendary';
}

/**
 * Calcula la rareza de un drop con modificadores de suerte y piso aplicados.
 * Combina getDropWeights + rollRarity en un unico paso conveniente.
 *
 * @param playerLuck - Stat LCK actual del jugador
 * @param floorTier  - Nivel del piso actual
 * @returns La rareza del item dropeado
 */
export function calculateDropRarity(playerLuck: number, floorTier: number): Rarity {
  return rollRarity(getDropWeights(playerLuck, floorTier));
}

/**
 * Devuelve true si la rareza dada es epica o legendaria (tiene efecto unico).
 */
export function hasUniqueEffect(rarity: Rarity): boolean {
  return rarity === 'epic' || rarity === 'legendary';
}

/**
 * Devuelve true si la rareza dada merece nombre procedural (epica o legendaria).
 */
export function hasProceduralName(rarity: Rarity): boolean {
  return rarity === 'epic' || rarity === 'legendary';
}
