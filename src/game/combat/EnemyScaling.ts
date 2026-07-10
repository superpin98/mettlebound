/**
 * EnemyScaling -- capa de escalado de stats de enemigo por nivel.
 *
 * Primera capa del sistema de composicion de stats:
 *   stats_finales = base + escaldo_por_nivel + (futuro: raza + equipo + skills)
 *
 * Formula (Pieza 6):
 *   Por cada nivel por encima de 1 se reparten 3 puntos de stats ALEATORIAMENTE
 *   entre STR / DEX / INT / LCK usando el RNG proporcionado.
 *   Nivel 1   -> 0 puntos extra (stats base sin modificar)
 *   Nivel 5   -> 12 puntos extra repartidos al azar
 *   Nivel 40  -> 117 puntos extra repartidos al azar
 *
 * El RNG se pasa como parametro para que sea determinista (seed de la run)
 * y testeable sin efectos secundarios.
 *
 * Uso:
 *   import { scaleEnemyStatsByLevel } from '@/game/combat/EnemyScaling';
 *   import { gameRng } from '@/utils/random';
 *
 *   const scaled = scaleEnemyStatsByLevel(BASE_RUSTY_STATS, rustyLevel, () => gameRng.float(0, 1));
 */

import type { CoreStats } from '@/types/game.types';

/** Stats que pueden recibir puntos de escalado. */
const STAT_KEYS: ReadonlyArray<keyof CoreStats> = ['STR', 'DEX', 'INT', 'LCK'];

/** Puntos de stat que se reparten por cada nivel por encima de 1. */
const POINTS_PER_LEVEL = 3;

/**
 * Escala los stats base de un enemigo segun su nivel.
 *
 * @param base   Stats base del enemigo (nivel 1).
 * @param level  Nivel objetivo (>= 1). Si es 1, devuelve una copia de base sin cambios.
 * @param rng    Funcion que devuelve un numero en [0, 1). Debe ser el mismo RNG
 *               de la run para que el resultado sea determinista.
 * @returns      Nuevo objeto CoreStats con los puntos extra repartidos.
 */
export function scaleEnemyStatsByLevel(
  base:  CoreStats,
  level: number,
  rng:   () => number,
): CoreStats {
  const result: CoreStats = { ...base };

  const levelsAboveOne = Math.max(0, level - 1);
  const totalPoints    = levelsAboveOne * POINTS_PER_LEVEL;

  for (let i = 0; i < totalPoints; i++) {
    // Elegir una stat aleatoria y sumarle 1 punto
    const idx  = Math.floor(rng() * STAT_KEYS.length);
    const stat = STAT_KEYS[idx] ?? 'STR'; // fallback defensive (nunca ocurre si STAT_KEYS.length > 0)
    result[stat] = (result[stat] ?? 0) + 1;
  }

  return result;
}
