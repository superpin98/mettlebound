/**
 * Constantes de balance del juego.
 * Cero números mágicos en la lógica — todo valor numérico de diseño vive aquí.
 * Modificar este archivo NO cambia las fórmulas, solo los valores que se aplican.
 */
export const BALANCE = {
  PLAYER: {
    BASE_HP: 100,
    BASE_MP: 30,
    BASE_CRIT_CHANCE: 5,      // % base de crítico antes de LCK
    BASE_CRIT_DAMAGE: 1.5,    // multiplicador de daño en crítico
    BASE_TURN_SPEED: 100,     // velocidad de turno base
    HP_PER_STR: 10,           // HP máximo por punto de STR
    HP_PER_LEVEL: 5,          // HP máximo por nivel
    MP_PER_INT: 5,            // MP máximo por punto de INT
    MP_PER_LEVEL: 2,          // MP máximo por nivel
    STAT_POINTS_PER_LEVEL: 3, // puntos de stat ganados al subir nivel
    ERRANTE_FREE_POINTS: 8,   // puntos libres al crear Errante
  },

  DAMAGE: {
    PHYSICAL_SCALE: 0.05,     // STR × este factor → bonus daño físico
    RANGED_SCALE: 0.04,       // DEX × este factor → bonus daño a distancia
    MAGICAL_SCALE: 0.05,      // INT × este factor → bonus daño mágico
    CRIT_PER_LCK: 0.3,        // % de crítico por punto de LCK
    EVASION_PER_DEX: 0.5,     // % de evasión por punto de DEX
    TURN_SPEED_PER_DEX: 0.5,  // bonus de velocidad de turno por DEX
    VARIANCE_MIN: 0.9,        // mínimo de varianza de daño (90%)
    VARIANCE_MAX: 1.1,        // máximo de varianza de daño (110%)
    MIN_DAMAGE_ON_HIT: 1,     // daño mínimo garantizado si el golpe conecta
  },

  SOFT_CAPS: {
    CRIT_CHANCE: {
      threshold: 50,  // a partir de aquí aplica el soft cap
      factor: 0.5,    // por encima del threshold, solo cuenta el 50%
      max: 80,        // techo absoluto de crítico
    },
    EVASION: {
      threshold: 40,
      factor: 0.5,
      max: 70,
    },
  },

  XP: {
    BASE: 100,                      // XP base para llegar al nivel 2
    EXPONENT: 1.4,                  // exponente de la curva de XP
    BASE_KILL_XP: 25,               // XP base por matar un enemigo del mismo nivel
    XP_PER_ENEMY_LEVEL: 12,         // XP extra por cada nivel del enemigo
    OVER_LEVEL_PENALTY_START: 5,    // diferencia de niveles donde empieza la penalización
    OVER_LEVEL_PENALTY_STEP: 0.1,   // reducción de XP por cada nivel de diferencia extra
  },

  ESCAPE: {
    BASE_CHANCE: 60,              // % base de huida
    LEVEL_DIFF_MOD: 5,            // % modificado por diferencia de nivel con el enemigo
    FAILED_ESCAPE_DAMAGE_MULT: 1.2, // multiplicador de daño recibido si falla la huida
    MIN_CHANCE: 5,                // % mínimo de huida (nunca 0)
    MAX_CHANCE: 95,               // % máximo de huida (nunca garantizado)
  },
} as const;
