/**
 * Funciones puras para calcular stats derivados del jugador.
 *
 * REGLAS:
 * - Sin side effects. Sin estado interno. Sin imports de singleton.
 * - Deterministas: misma entrada -> misma salida siempre.
 * - Preparadas para validacion en servidor (futuro anti-cheat).
 *
 * Todas las formulas usan exclusivamente constantes de BALANCE.
 * Cero numeros magicos en este archivo.
 *
 * Los campos de combate (damagePct, armor, lifesteal, etc.) se inicializan
 * a 0 aqui. PlayerStats los enriquece con itemDeltas antes de exponerlos
 * en getSnapshot().
 */

import { BALANCE } from '@/config/balance';
import type { CoreStats, DerivedStats } from '@/types/game.types';

// Soft cap

/**
 * Aplica un soft cap a un valor.
 * Por encima del threshold, cada punto adicional solo aporta `factor` puntos.
 * El resultado nunca supera `max`.
 */
export function applySoftCap(
  raw: number,
  threshold: number,
  factor: number,
  max: number,
): number {
  if (raw <= threshold) return raw;
  const capped = threshold + (raw - threshold) * factor;
  return Math.min(capped, max);
}

// Stats individuales

/** HP maximo del jugador. */
export function calcMaxHp(stats: CoreStats, level: number): number {
  return (
    BALANCE.PLAYER.BASE_HP +
    stats.STR * BALANCE.PLAYER.HP_PER_STR +
    level * BALANCE.PLAYER.HP_PER_LEVEL
  );
}

/** MP maximo del jugador. */
export function calcMaxMp(stats: CoreStats, level: number): number {
  return (
    BALANCE.PLAYER.BASE_MP +
    stats.INT * BALANCE.PLAYER.MP_PER_INT +
    level * BALANCE.PLAYER.MP_PER_LEVEL
  );
}

/**
 * Probabilidad de critico (%) con soft cap aplicado.
 */
export function calcCritChance(stats: CoreStats): number {
  const raw = BALANCE.PLAYER.BASE_CRIT_CHANCE + stats.LCK * BALANCE.DAMAGE.CRIT_PER_LCK;
  return applySoftCap(
    raw,
    BALANCE.SOFT_CAPS.CRIT_CHANCE.threshold,
    BALANCE.SOFT_CAPS.CRIT_CHANCE.factor,
    BALANCE.SOFT_CAPS.CRIT_CHANCE.max,
  );
}

/**
 * Probabilidad de evasion (%) con soft cap aplicado.
 */
export function calcEvasion(stats: CoreStats): number {
  const raw = stats.DEX * BALANCE.DAMAGE.EVASION_PER_DEX;
  return applySoftCap(
    raw,
    BALANCE.SOFT_CAPS.EVASION.threshold,
    BALANCE.SOFT_CAPS.EVASION.factor,
    BALANCE.SOFT_CAPS.EVASION.max,
  );
}

/** Velocidad de turno del jugador. */
export function calcTurnSpeed(stats: CoreStats): number {
  return BALANCE.PLAYER.BASE_TURN_SPEED + stats.DEX * BALANCE.DAMAGE.TURN_SPEED_PER_DEX;
}

// Stats completos

/**
 * Calcula todos los stats derivados de una vez.
 * Es la funcion que usa PlayerStats internamente.
 *
 * Los campos de combate (dano, defensa, lifesteal, etc.) se inicializan a 0;
 * PlayerStats los sobreescribe con los valores reales de itemDeltas en
 * getSnapshot(). Esto garantiza que DerivedStats siempre este completo.
 */
export function calcDerivedStats(stats: CoreStats, level: number): DerivedStats {
  return {
    maxHp:      calcMaxHp(stats, level),
    maxMp:      calcMaxMp(stats, level),
    critChance: calcCritChance(stats),
    evasion:    calcEvasion(stats),
    turnSpeed:  calcTurnSpeed(stats),
    // Ofensivo -- sobreescritos por PlayerStats.getSnapshot() con itemDeltas
    critDamage:          0,
    physicalDamagePct:   0,
    rangedDamagePct:     0,
    magicalDamagePct:    0,
    flatPhysicalDamage:  0,
    flatRangedDamage:    0,
    flatMagicalDamage:   0,
    // Defensivo
    armor:               0,
    magicResist:         0,
    damageReductionPct:  0,
    physicalReductionPct: 0,
    // Sustain
    lifestealPct:        0,
    manastealPct:        0,
    // Exoticos
    bleedDamage:         0,
    poisonDamage:        0,
    stunChancePct:       0,
    // Resistencias
    statusResistancePct: 0,
  };
}
