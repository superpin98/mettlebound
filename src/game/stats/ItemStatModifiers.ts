/**
 * Calculo de bonificaciones de stats provenientes de items equipados y sets.
 * Funciones puras: sin estado, sin efectos secundarios.
 *
 * Uso principal: PlayerStats importa calcTotalItemDeltas y lo llama cada vez
 * que recibe un evento inventory:item-equipped / inventory:item-unequipped.
 */

import type { EquippedItems, AffixStatKey } from '@/types/items.types';
import type { UpgradeEffect } from '@/types/game.types';
import { getActiveSetBonuses } from '@/game/items/SetBonuses';

// Tipo de deltas

/**
 * Suma total de todas las bonificaciones de items + sets activos.
 *
 * Campos STR/DEX/INT/LCK se pasan a calcDerivedStats para que cascaden
 * correctamente a traves de las formulas (maxHp via STR, etc.).
 *
 * Los campos "Flat" se suman directamente a los derivados calculados.
 * Los campos "Pct" son porcentajes adicionales (no multiplicadores).
 */
export interface ItemStatDeltas {
  // Stats primarios -- cascadan a traves de calcDerivedStats
  STR: number;
  DEX: number;
  INT: number;
  LCK: number;
  // Bonificaciones directas sobre derivados
  maxHpFlat: number;
  maxMpFlat: number;
  critChanceFlat: number;
  evasionFlat: number;
  turnSpeedFlat: number;
  // Porcentaje de dano por tipo (separados para la UI)
  physicalDamagePct: number;
  rangedDamagePct: number;
  magicalDamagePct: number;
  // Dano plano por tipo
  flatPhysicalDamage: number;
  flatRangedDamage: number;
  flatMagicalDamage: number;
  // Defensa
  armor: number;
  magicResist: number;
  damageReductionPct: number;
  physicalReductionPct: number;
  // Combate adicional
  critDamagePct: number;
  lifestealPct: number;
  manastealPct: number;
  statusResistancePct: number;
  // Exoticos
  bleedDamage: number;
  poisonDamage: number;
  stunChancePct: number;
}

// Identidad

/** Deltas en cero. Usar como valor inicial o identidad de mergeDeltas. */
export const ZERO_ITEM_DELTAS: Readonly<ItemStatDeltas> = {
  STR: 0, DEX: 0, INT: 0, LCK: 0,
  maxHpFlat: 0, maxMpFlat: 0,
  critChanceFlat: 0, evasionFlat: 0, turnSpeedFlat: 0,
  physicalDamagePct: 0, rangedDamagePct: 0, magicalDamagePct: 0,
  flatPhysicalDamage: 0, flatRangedDamage: 0, flatMagicalDamage: 0,
  armor: 0, magicResist: 0,
  damageReductionPct: 0, physicalReductionPct: 0,
  critDamagePct: 0,
  lifestealPct: 0, manastealPct: 0, statusResistancePct: 0,
  bleedDamage: 0, poisonDamage: 0, stunChancePct: 0,
};

// Utilidades

/** Suma dos conjuntos de deltas en un nuevo objeto. */
export function mergeDeltas(
  a: ItemStatDeltas,
  b: ItemStatDeltas,
): ItemStatDeltas {
  return {
    STR: a.STR + b.STR,
    DEX: a.DEX + b.DEX,
    INT: a.INT + b.INT,
    LCK: a.LCK + b.LCK,
    maxHpFlat:      a.maxHpFlat + b.maxHpFlat,
    maxMpFlat:      a.maxMpFlat + b.maxMpFlat,
    critChanceFlat: a.critChanceFlat + b.critChanceFlat,
    evasionFlat:    a.evasionFlat + b.evasionFlat,
    turnSpeedFlat:  a.turnSpeedFlat + b.turnSpeedFlat,
    physicalDamagePct: a.physicalDamagePct + b.physicalDamagePct,
    rangedDamagePct:   a.rangedDamagePct + b.rangedDamagePct,
    magicalDamagePct:  a.magicalDamagePct + b.magicalDamagePct,
    flatPhysicalDamage: a.flatPhysicalDamage + b.flatPhysicalDamage,
    flatRangedDamage:   a.flatRangedDamage + b.flatRangedDamage,
    flatMagicalDamage:  a.flatMagicalDamage + b.flatMagicalDamage,
    armor:               a.armor + b.armor,
    magicResist:         a.magicResist + b.magicResist,
    damageReductionPct:  a.damageReductionPct + b.damageReductionPct,
    physicalReductionPct: a.physicalReductionPct + b.physicalReductionPct,
    critDamagePct:       a.critDamagePct + b.critDamagePct,
    lifestealPct:        a.lifestealPct + b.lifestealPct,
    manastealPct:        a.manastealPct + b.manastealPct,
    statusResistancePct: a.statusResistancePct + b.statusResistancePct,
    bleedDamage:         a.bleedDamage + b.bleedDamage,
    poisonDamage:        a.poisonDamage + b.poisonDamage,
    stunChancePct:       a.stunChancePct + b.stunChancePct,
  };
}

// Aplicadores internos

/** Acumula un affix en el delta mutable d. */
function applyAffix(d: ItemStatDeltas, stat: AffixStatKey, value: number): void {
  switch (stat) {
    case 'STR': d.STR += value; break;
    case 'DEX': d.DEX += value; break;
    case 'INT': d.INT += value; break;
    case 'LCK': d.LCK += value; break;
    case 'maxHp':   d.maxHpFlat += value;      break;
    case 'maxMp':   d.maxMpFlat += value;      break;
    case 'critChance':  d.critChanceFlat += value; break;
    case 'evasion':     d.evasionFlat += value;    break;
    case 'turnSpeed':   d.turnSpeedFlat += value;  break;
    case 'physicalDamagePct': d.physicalDamagePct += value; break;
    case 'rangedDamagePct':   d.rangedDamagePct += value;   break;
    case 'magicalDamagePct':  d.magicalDamagePct += value;  break;
    case 'flatPhysicalDamage': d.flatPhysicalDamage += value; break;
    case 'flatRangedDamage':   d.flatRangedDamage += value;   break;
    case 'flatMagicalDamage':  d.flatMagicalDamage += value;  break;
    case 'armor':              d.armor += value;              break;
    case 'magicResist':        d.magicResist += value;        break;
    case 'damageReductionPct': d.damageReductionPct += value; break;
    case 'physicalReductionPct': d.physicalReductionPct += value; break;
    case 'critDamage':         d.critDamagePct += value;      break;
    case 'lifesteal':          d.lifestealPct += value;       break;
    case 'manasteal':          d.manastealPct += value;       break;
    case 'statusResistance':   d.statusResistancePct += value; break;
    case 'bleedDamage':        d.bleedDamage += value;        break;
    case 'poisonDamage':       d.poisonDamage += value;       break;
    case 'stunChance':         d.stunChancePct += value;      break;
  }
}

/** Acumula un UpgradeEffect (de set bonus) en el delta mutable d. */
function applyUpgradeEffect(d: ItemStatDeltas, effect: UpgradeEffect): void {
  switch (effect.type) {
    case 'stat_flat':
      switch (effect.stat) {
        case 'STR': d.STR += effect.amount; break;
        case 'DEX': d.DEX += effect.amount; break;
        case 'INT': d.INT += effect.amount; break;
        case 'LCK': d.LCK += effect.amount; break;
      }
      break;
    case 'hp_flat':      d.maxHpFlat += effect.amount;      break;
    case 'mp_flat':      d.maxMpFlat += effect.amount;      break;
    case 'crit_flat':    d.critChanceFlat += effect.amount; break;
    case 'evasion_flat': d.evasionFlat += effect.amount;    break;
    case 'damage_pct':   d.physicalDamagePct += effect.amount; break;
    case 'speed_flat':   d.turnSpeedFlat += effect.amount;  break;
  }
}

// Funciones exportadas

/**
 * Suma los affixes de todos los items actualmente equipados.
 * No incluye bonus de set -- usar calcSetStatDeltas para eso.
 */
export function calcItemStatDeltas(equipped: EquippedItems): ItemStatDeltas {
  const d: ItemStatDeltas = { ...ZERO_ITEM_DELTAS };
  for (const item of Object.values(equipped)) {
    if (item === undefined) continue;
    for (const affix of item.affixes) {
      applyAffix(d, affix.stat, affix.value);
    }
  }
  return d;
}

/**
 * Calcula los deltas de los bonus de conjuntos activos.
 * Un bonus de set se activa cuando piecesEquipped >= piecesRequired.
 */
export function calcSetStatDeltas(equipped: EquippedItems): ItemStatDeltas {
  const d: ItemStatDeltas = { ...ZERO_ITEM_DELTAS };
  const activeBonuses = getActiveSetBonuses(equipped);
  for (const { bonus } of activeBonuses) {
    for (const effect of bonus.effects) {
      applyUpgradeEffect(d, effect);
    }
  }
  return d;
}

/**
 * Punto de entrada principal.
 * Suma affixes de items + bonus de sets activos.
 * PlayerStats debe llamar a esta funcion cada vez que el equipamiento cambia.
 */
export function calcTotalItemDeltas(equipped: EquippedItems): ItemStatDeltas {
  const itemDeltas = calcItemStatDeltas(equipped);
  const setDeltas  = calcSetStatDeltas(equipped);
  return mergeDeltas(itemDeltas, setDeltas);
}
