/**
 * Funciones puras para calcular stats derivados del jugador.
 *
 * REGLAS:
 * - Sin side effects. Sin estado interno. Sin imports de singleton.
 * - Deterministas: misma entrada → misma salida siempre.
 * - Preparadas para validación en servidor (futuro anti-cheat).
 *
 * Todas las fórmulas usan exclusivamente constantes de BALANCE.
 * Cero números mágicos en este archivo.
 */

import { BALANCE } from '@/config/balance';
import type { CoreStats, DerivedStats } from '@/types/game.types';

// ─── Soft cap ────────────────────────────────────────────────────────────────

/**
 * Aplica un soft cap a un valor.
 * Por encima del threshold, cada punto adicional solo aporta `factor` puntos.
 * El resultado nunca supera `max`.
 *
 * Ejemplo con critChance (threshold=50, factor=0.5, max=80):
 *   raw=40 → 40        (sin cap)
 *   raw=50 → 50        (justo en el umbral)
 *   raw=60 → 50 + 5 = 55
 *   raw=80 → 50 + 15 = 65
 *   raw=110 → 50 + 30 = 80 (tope)
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

// ─── Stats individuales ──────────────────────────────────────────────────────

/** HP máximo del jugador. */
export function calcMaxHp(stats: CoreStats, level: number): number {
  return (
    BALANCE.PLAYER.BASE_HP +
    stats.STR * BALANCE.PLAYER.HP_PER_STR +
    level * BALANCE.PLAYER.HP_PER_LEVEL
  );
}

/** MP máximo del jugador. */
export function calcMaxMp(stats: CoreStats, level: number): number {
  return (
    BALANCE.PLAYER.BASE_MP +
    stats.INT * BALANCE.PLAYER.MP_PER_INT +
    level * BALANCE.PLAYER.MP_PER_LEVEL
  );
}

/**
 * Probabilidad de crítico (%) con soft cap aplicado.
 * La crítica incluye la base + el aporte de LCK, luego se aplica el soft cap.
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
 * Probabilidad de evasión (%) con soft cap aplicado.
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

// ─── Stats completos ─────────────────────────────────────────────────────────

/**
 * Calcula todos los stats derivados de una vez.
 * Es la función que usa PlayerStats internamente.
 */
export function calcDerivedStats(stats: CoreStats, level: number): DerivedStats {
  return {
    maxHp: calcMaxHp(stats, level),
    maxMp: calcMaxMp(stats, level),
    critChance: calcCritChance(stats),
    evasion: calcEvasion(stats),
    turnSpeed: calcTurnSpeed(stats),
  };
}
