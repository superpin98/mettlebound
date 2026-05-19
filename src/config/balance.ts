/**
 * Constantes de balance del juego.
 * Cero numeros magicos en la logica -- todo valor numerico de diseno vive aqui.
 * Modificar este archivo NO cambia las formulas, solo los valores que se aplican.
 */
export const BALANCE = {
  PLAYER: {
    BASE_HP: 100,
    BASE_MP: 30,
    BASE_CRIT_CHANCE: 5,      // % base de critico antes de LCK
    BASE_CRIT_DAMAGE: 1.5,    // multiplicador de dano en critico
    BASE_TURN_SPEED: 100,     // velocidad de turno base
    HP_PER_STR: 10,           // HP maximo por punto de STR
    HP_PER_LEVEL: 5,          // HP maximo por nivel
    MP_PER_INT: 5,            // MP maximo por punto de INT
    MP_PER_LEVEL: 2,          // MP maximo por nivel
    STAT_POINTS_PER_LEVEL: 3, // puntos de stat ganados al subir nivel
    ERRANTE_FREE_POINTS: 8,   // puntos libres al crear Errante
  },

  DAMAGE: {
    PHYSICAL_SCALE: 0.05,     // STR x este factor -> bonus dano fisico
    RANGED_SCALE: 0.04,       // DEX x este factor -> bonus dano a distancia
    MAGICAL_SCALE: 0.05,      // INT x este factor -> bonus dano magico
    CRIT_PER_LCK: 0.3,        // % de critico por punto de LCK
    EVASION_PER_DEX: 0.5,     // % de evasion por punto de DEX
    TURN_SPEED_PER_DEX: 0.5,  // bonus de velocidad de turno por DEX
    VARIANCE_MIN: 0.9,        // minimo de varianza de dano (90%)
    VARIANCE_MAX: 1.1,        // maximo de varianza de dano (110%)
    MIN_DAMAGE_ON_HIT: 1,     // dano minimo garantizado si el golpe conecta
  },

  SOFT_CAPS: {
    CRIT_CHANCE: {
      threshold: 50,  // a partir de aqui aplica el soft cap
      factor: 0.5,    // por encima del threshold, solo cuenta el 50%
      max: 80,        // techo absoluto de critico
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
    OVER_LEVEL_PENALTY_START: 5,    // diferencia de niveles donde empieza la penalizacion
    OVER_LEVEL_PENALTY_STEP: 0.1,   // reduccion de XP por cada nivel de diferencia extra
  },

  ESCAPE: {
    BASE_CHANCE: 60,              // % base de huida
    LEVEL_DIFF_MOD: 5,            // % modificado por diferencia de nivel con el enemigo
    FAILED_ESCAPE_DAMAGE_MULT: 1.2, // multiplicador de dano recibido si falla la huida
    MIN_CHANCE: 5,                // % minimo de huida (nunca 0)
    MAX_CHANCE: 95,               // % maximo de huida (nunca garantizado)
  },

  ITEMS: {
    // Pesos de rareza base (suman 100)
    RARITY_WEIGHTS: {
      common:    60,
      uncommon:  25,
      rare:      10,
      epic:       4,
      legendary:  1,
    },
    /** Bonus acumulado por punto de LCK del jugador (afecta a uncommon+). */
    DROP_LUCK_BONUS_PER_POINT: 0.2,
    /** Bonus base por nivel de piso (afecta a uncommon+). */
    DROP_TIER_BONUS_PER_FLOOR: 0.5,
    /** Peso minimo del common aunque la suerte/piso sea muy alta. */
    DROP_COMMON_MIN_WEIGHT: 10,

    // Rangos de affixes por iLevel
    // Stats planos: valor final = iLevel * random(min, max)
    // Porcentajes: valor final = random(min, max) -- sin escalar por iLevel
    AFFIX_RANGES: {
      STAT_PER_ILEVEL:         { min: 1,   max: 5   }, // STR/DEX/INT/LCK flat
      HP_PER_ILEVEL:           { min: 5,   max: 15  }, // maxHp flat (head, legs, belt)
      HP_CHEST_PER_ILEVEL:     { min: 10,  max: 30  }, // maxHp flat (chest -- mayor)
      MP_PER_ILEVEL:           { min: 3,   max: 8   }, // maxMp flat
      ARMOR_PER_ILEVEL:        { min: 3,   max: 10  }, // armor flat
      MAGIC_RESIST_PER_ILEVEL: { min: 2,   max: 8   }, // magicResist flat
      FLAT_DAMAGE_PER_ILEVEL:  { min: 2,   max: 8   }, // flatPhysical/Ranged/Magical
      TURN_SPEED:              { min: 2,   max: 8   }, // turnSpeed flat (pequeno)
      CRIT_CHANCE:             { min: 0.5, max: 2.5 }, // critChance %
      CRIT_DAMAGE:             { min: 5,   max: 20  }, // critDamage %
      EVASION:                 { min: 0.5, max: 2.0 }, // evasion %
      DAMAGE_PCT:              { min: 1.0, max: 3.0 }, // physicalDamagePct / etc.
      DAMAGE_REDUCTION:        { min: 0.5, max: 2.0 }, // damageReductionPct
      LIFESTEAL:               { min: 1.0, max: 5.0 }, // lifesteal %
      MANASTEAL:               { min: 1.0, max: 4.0 }, // manasteal %
      STATUS_RESISTANCE:       { min: 2.0, max: 8.0 }, // statusResistance %
      // Stats exoticos (rarezas altas -- epic/legendary)
      BLEED_DAMAGE_PER_ILEVEL:  { min: 2,   max: 6   }, // dano por sangrado flat
      POISON_DAMAGE_PER_ILEVEL: { min: 2,   max: 5   }, // dano por veneno flat
      STUN_CHANCE:              { min: 3.0, max: 8.0 }, // probabilidad de aturdir %
      PHYSICAL_REDUCTION:       { min: 1.0, max: 3.0 }, // reduccion dano fisico %
    },

    // Dano base de armas
    /** Rango de dano base de un arma: valor final = iLevel * random(min, max). */
    WEAPON_DAMAGE_PER_ILEVEL: { min: 3, max: 6 },

    // Valor de venta
    SELL_VALUE: {
      BASE: 10,
      LEVEL_MULT_PER_LEVEL: 0.15,  // +15% por nivel del item
      RARITY_MULT: {
        common:    1,
        uncommon:  3,
        rare:      8,
        epic:      25,
        legendary: 80,
      },
    },
  },
} as const;
