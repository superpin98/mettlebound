/**
 * Lógica de subida de nivel.
 *
 * Funciones puras — sin estado, sin side effects.
 * Toda mutación real la hace PlayerStats; estas funciones solo calculan y devuelven.
 */

import { UPGRADE_POOL } from '@/game/progression/UpgradePool';
import type { CoreStats, UpgradeDefinition, UpgradeEffect, UpgradeRarity } from '@/types/game.types';
import type { Mulberry32 } from '@/utils/random';

// ─── Pesos de rareza ─────────────────────────────────────────────────────────

const RARITY_WEIGHTS: Record<UpgradeRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  epic: 2.5,
  legendary: 0.5,
};

// ─── Selección de mejoras ─────────────────────────────────────────────────────

/**
 * Selecciona una rareza aleatoria según los pesos definidos.
 * Si en el nivel actual corresponde una rareza garantizada, la fuerza.
 */
function rollRarity(rng: Mulberry32, guaranteedMinRarity?: UpgradeRarity): UpgradeRarity {
  if (guaranteedMinRarity) return guaranteedMinRarity;

  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng.float(0, total);

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [UpgradeRarity, number][]) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

/**
 * Extrae las mejoras disponibles de una rareza dada.
 * Excluye las que el jugador ya tiene aplicadas.
 */
function getAvailableByRarity(
  rarity: UpgradeRarity,
  appliedIds: string[],
): UpgradeDefinition[] {
  return UPGRADE_POOL.filter(u => u.rarity === rarity && !appliedIds.includes(u.id));
}

/**
 * Devuelve 3 opciones de mejora para presentar al jugador al subir de nivel.
 * - Garantiza rareza ≥ raro en niveles múltiplo de 5.
 * - Si no hay suficientes opciones de la rareza sorteada, baja al tier inferior.
 * - Nunca repite opciones ya aplicadas.
 * - Con la misma seed RNG, siempre produce las mismas 3 opciones.
 */
export function rollUpgradeOptions(
  rng: Mulberry32,
  level: number,
  appliedUpgradeIds: string[],
  count = 3,
): UpgradeDefinition[] {
  const guaranteedRarity: UpgradeRarity | undefined =
    level % 5 === 0 ? 'rare' : undefined;

  const selected: UpgradeDefinition[] = [];
  const usedIds = new Set(appliedUpgradeIds);

  // Intentamos llenar `count` slots; máximo de iteraciones para evitar loops infinitos
  const maxAttempts = 50;
  let attempts = 0;

  while (selected.length < count && attempts < maxAttempts) {
    attempts++;

    // Sortear rareza
    const rarity = rollRarity(rng, selected.length === 0 ? guaranteedRarity : undefined);

    // Buscar candidatos de esa rareza (o bajar de tier si no hay)
    const raritiesByPriority: UpgradeRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const startIdx = raritiesByPriority.indexOf(rarity);

    let candidates: UpgradeDefinition[] = [];
    for (let i = startIdx; i < raritiesByPriority.length; i++) {
      candidates = getAvailableByRarity(raritiesByPriority[i]!, [...usedIds]);
      if (candidates.length > 0) break;
    }

    if (candidates.length === 0) break;  // pool agotado

    const pick = rng.pick(candidates);
    selected.push(pick);
    usedIds.add(pick.id);
  }

  return selected;
}

// ─── Aplicar puntos de stat ───────────────────────────────────────────────────

/**
 * Devuelve los nuevos CoreStats tras asignar puntos al stat indicado.
 * No muta el objeto original.
 *
 * Lanza error si se intenta gastar más puntos de los disponibles.
 */
export function applyStatPoint(
  stats: CoreStats,
  stat: keyof CoreStats,
  pendingPoints: number,
  pointsToSpend = 1,
): { newStats: CoreStats; newPending: number } {
  if (pendingPoints < pointsToSpend) {
    throw new Error(`applyStatPoint: no hay suficientes puntos (disponibles: ${pendingPoints}, pedidos: ${pointsToSpend})`);
  }
  return {
    newStats: { ...stats, [stat]: stats[stat] + pointsToSpend },
    newPending: pendingPoints - pointsToSpend,
  };
}

// ─── Aplicar mejora ───────────────────────────────────────────────────────────

/**
 * Resultado de aplicar una mejora al snapshot del jugador.
 * Devuelve los valores que han cambiado (no el snapshot completo —
 * eso lo reensambla PlayerStats).
 */
export interface UpgradeApplicationResult {
  newCoreStats: CoreStats;
  hpBonusFlat: number;
  mpBonusFlat: number;
  critBonusFlat: number;
  evasionBonusFlat: number;
  damageBonusPct: number;
  speedBonusFlat: number;
}

/**
 * Calcula el efecto de aplicar una mejora sobre los stats actuales.
 * No muta nada. PlayerStats integra el resultado en su estado.
 */
export function applyUpgrade(
  effect: UpgradeEffect,
  currentStats: CoreStats,
): UpgradeApplicationResult {
  const base: UpgradeApplicationResult = {
    newCoreStats: { ...currentStats },
    hpBonusFlat: 0,
    mpBonusFlat: 0,
    critBonusFlat: 0,
    evasionBonusFlat: 0,
    damageBonusPct: 0,
    speedBonusFlat: 0,
  };

  switch (effect.type) {
    case 'stat_flat':
      base.newCoreStats = { ...currentStats, [effect.stat]: currentStats[effect.stat] + effect.amount };
      break;
    case 'hp_flat':
      base.hpBonusFlat = effect.amount;
      break;
    case 'mp_flat':
      base.mpBonusFlat = effect.amount;
      break;
    case 'crit_flat':
      base.critBonusFlat = effect.amount;
      break;
    case 'evasion_flat':
      base.evasionBonusFlat = effect.amount;
      break;
    case 'damage_pct':
      base.damageBonusPct = effect.amount;
      break;
    case 'speed_flat':
      base.speedBonusFlat = effect.amount;
      break;
  }

  return base;
}
