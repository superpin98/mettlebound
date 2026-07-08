/**
 * Generador procedural de items.
 * Todas las funciones son puras salvo el uso del RNG global (gameRng).
 * Para tests deterministas, llamar a initGameRng(seed) antes de generar.
 */

import { nanoid } from 'nanoid';
import type { Rarity } from '@/types/game.types';
import type { Item, Affix, ItemBaseStats } from '@/types/items.types';
import { BALANCE } from '@/config/balance';
import { ITEM_TEMPLATES, getItemTemplate } from '@/config/items.config';
import { getAffixPool, type AffixPoolEntry } from '@/game/items/AffixPool';
import { EPIC_EFFECTS, LEGENDARY_EFFECTS } from '@/game/items/UniqueEffectPool';
import {
  AFFIX_COUNT_BY_RARITY,
  calculateDropRarity,
  hasUniqueEffect,
  hasProceduralName,
} from '@/game/items/RaritySystem';
import { gameRng } from '@/utils/random';

// Orden numerico de rarezas para comparar minRarity vs rareza del item.
const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

// Pools de nombres procedurales

const EPIC_ADJECTIVES = [
  'Susurrante', 'Eterno', 'Vil', 'Ardiente', 'Helado',
  'Hambriento', 'Ciego', 'Reluciente', 'Maldito', 'Sereno',
] as const;

const LEGENDARY_SUFFIXES = [
  'del Rey Caido', 'del Abismo', 'de la Luna Rota',
  'del Primer Invierno', 'de Mil Voces', 'del Vacio Hambriento',
] as const;

// Funciones internas

/**
 * Genera el valor numerico de un affix dado su entrada de pool e iLevel.
 * Stats planos: iLevel * random(min, max), redondeado a entero.
 * Porcentajes: random(min, max), redondeado a 1 decimal.
 */
function generateAffixValue(entry: AffixPoolEntry, iLevel: number): number {
  const range = BALANCE.ITEMS.AFFIX_RANGES[entry.rangeKey];
  if (entry.scalesWithILevel) {
    return Math.round(iLevel * gameRng.float(range.min, range.max));
  }
  // Redondear a 1 decimal para valores de porcentaje
  return Math.round(gameRng.float(range.min, range.max) * 10) / 10;
}

/**
 * Genera los affixes del item: N entradas unicas del pool del slot.
 * Filtra primero por minRarity: solo se incluyen entradas cuya minRarity
 * sea igual o inferior a la rareza del item.
 * Si el pool filtrado tiene menos entradas que el numero pedido, usa todas las disponibles.
 */
function generateAffixes(
  pool: readonly AffixPoolEntry[],
  count: number,
  iLevel: number,
  rarity: Rarity,
): readonly Affix[] {
  if (pool.length === 0) return [];

  // Filtrar por rareza minima requerida
  const eligible = pool.filter(
    (e) => e.minRarity === undefined || RARITY_ORDER[e.minRarity] <= RARITY_ORDER[rarity],
  );
  if (eligible.length === 0) return [];

  // Copia mutable para mezclar sin mutar el original
  const shuffled = gameRng.shuffle([...eligible]);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((entry) => ({
    stat: entry.stat,
    value: generateAffixValue(entry, iLevel),
    isPercent: entry.isPercent,
  }));
}

/**
 * Genera los stats base del item (dano para armas, armadura para piezas de armadura).
 * Los accesorios no tienen stats base -- sus beneficios vienen solo de affixes.
 */
function generateBaseStats(template: ReturnType<typeof getItemTemplate>, iLevel: number): ItemBaseStats {
  if (template.itemType === 'weapon') {
    const r = BALANCE.ITEMS.WEAPON_DAMAGE_PER_ILEVEL;
    return { damage: Math.max(1, Math.round(iLevel * gameRng.float(r.min, r.max))) };
  }
  if (template.itemType === 'armor') {
    const r = BALANCE.ITEMS.AFFIX_RANGES.ARMOR_PER_ILEVEL;
    return { armor: Math.max(1, Math.round(iLevel * gameRng.float(r.min, r.max))) };
  }
  return {};
}

// Funciones exportadas

/**
 * Genera un nombre procedural para items Epicos y Legendarios.
 * Epicos: "{primer_palabra} {adjetivo}"
 * Legendarios: "{primer_palabra} {adjetivo} {sufijo}"
 */
export function generateName(template: ReturnType<typeof getItemTemplate>, rarity: Rarity): string {
  const firstWord = template.name.split(' ')[0] ?? template.name;
  const adj = gameRng.pick(EPIC_ADJECTIVES);
  if (rarity === 'legendary') {
    const suffix = gameRng.pick(LEGENDARY_SUFFIXES);
    return `${firstWord} ${adj} ${suffix}`;
  }
  return `${firstWord} ${adj}`;
}

/**
 * Calcula el valor de venta de un item segun su rareza y nivel.
 */
export function calculateSellValue(rarity: Rarity, level: number): number {
  const mult = BALANCE.ITEMS.SELL_VALUE.RARITY_MULT[rarity];
  const levelMult = 1 + level * BALANCE.ITEMS.SELL_VALUE.LEVEL_MULT_PER_LEVEL;
  return Math.floor(BALANCE.ITEMS.SELL_VALUE.BASE * mult * levelMult);
}

/**
 * Genera un item completo a partir de un template base, rareza e iLevel.
 *
 * @param baseId - ID del template (ej: 'leather_cap')
 * @param rarity - Rareza del item
 * @param iLevel - Item level: escala los valores de stats (1 = primer piso)
 * @returns Item instanciado con ID unico, affixes y stats aleatorios
 */
export function generateItem(baseId: string, rarity: Rarity, iLevel: number): Item {
  const template = getItemTemplate(baseId);
  const pool = getAffixPool(template.slot);
  const affixCount = AFFIX_COUNT_BY_RARITY[rarity];

  const affixes = generateAffixes(pool, affixCount, iLevel, rarity);
  const baseStats = generateBaseStats(template, iLevel);

  const effectPool = rarity === 'legendary' ? LEGENDARY_EFFECTS : EPIC_EFFECTS;
  const uniqueEffect = hasUniqueEffect(rarity)
    ? gameRng.pick(effectPool)
    : undefined;

  const name = hasProceduralName(rarity)
    ? generateName(template, rarity)
    : template.name;

  const level = iLevel; // Requisito de nivel = iLevel en el MVP

  return {
    id: nanoid(),
    baseId,
    name,
    rarity,
    itemType: template.itemType,
    slot: template.slot,
    ...(template.weaponSubType !== undefined ? { weaponSubType: template.weaponSubType } : {}),
    level,
    iLevel,
    ...(template.setId !== undefined ? { setId: template.setId } : {}),
    baseStats,
    affixes,
    ...(uniqueEffect !== undefined ? { uniqueEffect } : {}),
    ...(template.description !== undefined ? { description: template.description } : {}),
    iconAssetId: template.iconAssetId,
    sellValue: calculateSellValue(rarity, level),
  };
}

/**
 * Genera un item aleatorio completo: elige template y rareza aleatoriamente.
 * Util para drops de enemigos y el boton cheat DEV.
 *
 * @param playerLuck - Stat LCK del jugador (modifica rareza)
 * @param floorTier  - Piso actual (modifica rareza)
 * @param iLevel     - Item level para escalar stats
 */
export function generateRandomItem(
  playerLuck: number = 0,
  floorTier: number = 1,
  iLevel: number = 1
): Item {
  const rarity = calculateDropRarity(playerLuck, floorTier);
  const template = gameRng.pick(ITEM_TEMPLATES);
  return generateItem(template.id, rarity, iLevel);
}

/**
 * Genera un item con rareza EXACTA (sin tirada de azar).
 * Util para el selector DEV donde el usuario elige la rareza manualmente.
 *
 * @param rarity - Rareza deseada
 * @param iLevel - Item level para escalar stats
 */
export function generateItemOfRarity(
  rarity: Rarity,
  iLevel: number = 1
): Item {
  const template = gameRng.pick(ITEM_TEMPLATES);
  return generateItem(template.id, rarity, iLevel);
}
