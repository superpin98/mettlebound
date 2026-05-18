/**
 * Sistema de experiencia y progresion de nivel.
 * Funciones puras sin estado ni side effects.
 *
 * Formula: xpForLevel(N) = floor(100 * (N-1)^1.4) para N > 1, 0 para N <= 1.
 * Esto garantiza que xpForLevel(2) = 100, xpForLevel(3) = 263, etc.,
 * y que la XP necesaria por nivel es monotonamente creciente.
 */

import { BALANCE } from '@/config/balance';

/**
 * XP total acumulada necesaria para alcanzar el nivel indicado.
 * Nivel 1 requiere 0 XP. Nivel 2 requiere 100 XP. Nivel 3 requiere 263 XP.
 *
 * Tabla de referencia (BALANCE por defecto):
 *   Nivel 2  ->    100 XP   (floor(100 * 1^1.4))
 *   Nivel 3  ->    263 XP   (floor(100 * 2^1.4))
 *   Nivel 5  ->    696 XP   (floor(100 * 4^1.4))
 *   Nivel 10 ->   2167 XP   (floor(100 * 9^1.4))
 *   Nivel 20 ->   6169 XP   (floor(100 * 19^1.4))
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(BALANCE.XP.BASE * Math.pow(level - 1, BALANCE.XP.EXPONENT));
}

/**
 * XP que falta para subir al siguiente nivel desde el nivel actual.
 * Equivale a xpForLevel(level + 1) - xpForLevel(level).
 * La curva es monotonamente creciente.
 */
export function xpToNextLevel(currentLevel: number): number {
  return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel);
}

/**
 * XP ganada al derrotar un enemigo del nivel indicado.
 * Aplica penalizacion si el jugador supera al enemigo en mas de 5 niveles.
 *
 * Formula:
 *   base = BASE_KILL_XP + enemyLevel x XP_PER_ENEMY_LEVEL
 *   si diff > OVER_LEVEL_PENALTY_START:
 *     multiplicador = max(0.1, 1 - (diff - START) x STEP)
 *   resultado = max(1, floor(base x multiplicador))
 */
export function xpFromEnemy(enemyLevel: number, playerLevel: number): number {
  const base = BALANCE.XP.BASE_KILL_XP + enemyLevel * BALANCE.XP.XP_PER_ENEMY_LEVEL;
  const diff = playerLevel - enemyLevel;

  if (diff <= BALANCE.XP.OVER_LEVEL_PENALTY_START) {
    return Math.max(1, Math.floor(base));
  }

  const excessLevels = diff - BALANCE.XP.OVER_LEVEL_PENALTY_START;
  const multiplier = Math.max(0.1, 1 - excessLevels * BALANCE.XP.OVER_LEVEL_PENALTY_STEP);
  return Math.max(1, Math.floor(base * multiplier));
}

/**
 * Calcula el nivel que corresponde a la XP total acumulada.
 * Devuelve el nivel mas alto tal que xpForLevel(level) <= totalXp.
 * Nivel minimo: 1. Nivel maximo practico: 100.
 */
export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= xpForLevel(level + 1) && level < 100) {
    level++;
  }
  return level;
}
