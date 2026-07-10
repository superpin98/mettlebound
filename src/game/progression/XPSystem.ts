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
 *
 * Formula cuadratica (Pieza 6):
 *   XP = floor(XP_KILL_BASE * enemyLevel * (1 + XP_KILL_FACTOR * enemyLevel))
 *
 * Ejemplos con XP_KILL_BASE=10, XP_KILL_FACTOR=0.15:
 *   Nivel  1  ->   11 XP   (10 * 1 * 1.15)
 *   Nivel  5  ->   87 XP   (10 * 5 * 1.75)
 *   Nivel 10  ->  250 XP   (10 * 10 * 2.5)
 *   Nivel 20  ->  800 XP   (10 * 20 * 4.0)
 *   Nivel 40  -> 2800 XP   (10 * 40 * 7.0)
 *
 * Sin penalizacion por nivel del jugador: el desafio esta en el nivel del enemigo.
 */
export function xpFromEnemy(enemyLevel: number): number {
  const xp = BALANCE.XP.XP_KILL_BASE * enemyLevel * (1 + BALANCE.XP.XP_KILL_FACTOR * enemyLevel);
  return Math.max(1, Math.floor(xp));
}

/**
 * Calcula el nivel que corresponde a la XP total acumulada.
 * Devuelve el nivel mas alto tal que xpForLevel(level) <= totalXp.
 * Nivel minimo: 1. Sin tope de nivel.
 *
 * Implementacion: estimacion matematica directa + correccion de +-1.
 * La formula inversa de xpForLevel(N) = floor(BASE * (N-1)^EXP) es:
 *   N ≈ floor((totalXp / BASE)^(1/EXP)) + 1
 * La correccion por floor() puede generar un off-by-one maximo de 1-2 pasos,
 * resuelto con un bucle de ajuste acotado (< 5 iteraciones siempre).
 */
export function levelFromTotalXp(totalXp: number): number {
  if (totalXp <= 0) { return 1; }
  // Estimacion inversa: N ≈ (totalXp / BASE)^(1/EXPONENT) + 1
  const estimate = Math.floor(
    Math.pow(totalXp / BALANCE.XP.BASE, 1 / BALANCE.XP.EXPONENT),
  ) + 1;
  let level = Math.max(1, estimate);
  // Ajuste hacia atras si la estimacion se paso (off-by-one por floor)
  while (level > 1 && xpForLevel(level) > totalXp) { level--; }
  // Ajuste hacia adelante si la estimacion se quedo corta
  while (xpForLevel(level + 1) <= totalXp) { level++; }
  return level;
}

/**
 * Devuelve el progreso de XP dentro del nivel actual.
 *
 * @param totalXp - XP total acumulada del jugador (snapshot.xp)
 * @param level   - Nivel actual del jugador (snapshot.level)
 * @returns { current: XP ganada desde el inicio del nivel actual,
 *            needed:  XP total necesaria para pasar al siguiente nivel }
 *
 * Ejemplo: nivel 3 (xpForLevel(3)=263), totalXp=361
 *   current = 361 - 263 = 98
 *   needed  = xpForLevel(4) - xpForLevel(3) = 465 - 263 = 202
 *   -> muestra "98 / 202"
 */
export function xpProgressInCurrentLevel(
  totalXp: number,
  level: number,
): { current: number; needed: number } {
  const levelStart = xpForLevel(level);
  const current    = Math.max(0, totalXp - levelStart);
  const needed     = xpToNextLevel(level);
  return { current, needed };
}
