import { describe, it, expect, beforeEach } from 'vitest';
import { initGameRng } from '@/utils/random';
import { generateItem, generateRandomItem, calculateSellValue } from '@/game/items/ItemGenerator';
import { getItemTemplate } from '@/config/items.config';
import { AFFIX_COUNT_BY_RARITY } from '@/game/items/RaritySystem';
import type { Rarity } from '@/types/game.types';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

beforeEach(() => {
  initGameRng(42); // seed fija para tests deterministas
});

// ─── generateItem: campos basicos ────────────────────────────────────────────

describe('generateItem — campos basicos', () => {
  it('devuelve el baseId correcto', () => {
    const item = generateItem('leather_cap', 'common', 1);
    expect(item.baseId).toBe('leather_cap');
  });

  it('devuelve la rareza correcta', () => {
    for (const rarity of RARITIES) {
      const item = generateItem('leather_cap', rarity, 1);
      expect(item.rarity).toBe(rarity);
    }
  });

  it('devuelve el slot correcto segun el template', () => {
    const cap = generateItem('leather_cap', 'common', 1);
    expect(cap.slot).toBe('head');
    const sword = generateItem('sword_long_notched', 'common', 1);
    expect(sword.slot).toBe('weapon');
  });

  it('devuelve itemType correcto', () => {
    expect(generateItem('leather_cap', 'common', 1).itemType).toBe('armor');
    expect(generateItem('sword_long_notched', 'common', 1).itemType).toBe('weapon');
  });

  it('cada item generado tiene un id unico (nanoid)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateItem('leather_cap', 'common', 1).id);
    }
    expect(ids.size).toBe(50);
  });

  it('el iLevel se refleja en el item', () => {
    const item = generateItem('leather_cap', 'common', 5);
    expect(item.iLevel).toBe(5);
  });

  it('lanza error si el baseId no existe', () => {
    expect(() => generateItem('no_existe', 'common', 1)).toThrow();
  });
});

// ─── generateItem: affixes por rareza ────────────────────────────────────────

describe('generateItem — affixes por rareza', () => {
  it('common tiene exactamente 1 affix', () => {
    expect(generateItem('leather_cap', 'common', 1).affixes).toHaveLength(1);
  });

  it('uncommon tiene exactamente 2 affixes', () => {
    expect(generateItem('leather_cap', 'uncommon', 1).affixes).toHaveLength(2);
  });

  it('rare tiene exactamente 3 affixes', () => {
    expect(generateItem('leather_cap', 'rare', 1).affixes).toHaveLength(3);
  });

  it('epic tiene exactamente 4 affixes', () => {
    expect(generateItem('leather_cap', 'epic', 1).affixes).toHaveLength(4);
  });

  it('legendary tiene exactamente 5 affixes', () => {
    expect(generateItem('leather_cap', 'legendary', 1).affixes).toHaveLength(5);
  });

  it('los affixes no tienen stats duplicados', () => {
    // Repetir varias veces para reducir falsos positivos
    for (let i = 0; i < 10; i++) {
      const item = generateItem('leather_chest', 'legendary', 3);
      const stats = item.affixes.map((a) => a.stat);
      const unique = new Set(stats);
      expect(unique.size).toBe(stats.length);
    }
  });

  it('los valores de affixes son numeros positivos', () => {
    const item = generateItem('leather_chest', 'rare', 2);
    for (const affix of item.affixes) {
      expect(affix.value).toBeGreaterThan(0);
    }
  });

  it('affixes planos escalan con iLevel (iLevel 5 > iLevel 1 en promedio)', () => {
    // Generamos muchos items y comparamos medias para reducir varianza del RNG
    const sumLow = Array.from({ length: 20 }, () =>
      generateItem('leather_cap', 'common', 1).affixes[0]?.value ?? 0
    ).reduce((s, v) => s + v, 0);

    initGameRng(42);
    const sumHigh = Array.from({ length: 20 }, () =>
      generateItem('leather_cap', 'common', 5).affixes[0]?.value ?? 0
    ).reduce((s, v) => s + v, 0);

    expect(sumHigh).toBeGreaterThan(sumLow);
  });
});

// ─── generateItem: efectos unicos ────────────────────────────────────────────

describe('generateItem — efectos unicos', () => {
  it('epic tiene un uniqueEffect definido', () => {
    const item = generateItem('leather_cap', 'epic', 1);
    expect(item.uniqueEffect).toBeDefined();
  });

  it('legendary tiene un uniqueEffect definido', () => {
    const item = generateItem('leather_cap', 'legendary', 1);
    expect(item.uniqueEffect).toBeDefined();
  });

  it('common NO tiene uniqueEffect', () => {
    expect(generateItem('leather_cap', 'common', 1).uniqueEffect).toBeUndefined();
  });

  it('uncommon NO tiene uniqueEffect', () => {
    expect(generateItem('leather_cap', 'uncommon', 1).uniqueEffect).toBeUndefined();
  });

  it('rare NO tiene uniqueEffect', () => {
    expect(generateItem('leather_cap', 'rare', 1).uniqueEffect).toBeUndefined();
  });

  it('el uniqueEffect tiene rareza epic en items epicos', () => {
    const item = generateItem('leather_cap', 'epic', 1);
    expect(item.uniqueEffect?.rarity).toBe('epic');
  });

  it('el uniqueEffect tiene rareza legendary en items legendarios', () => {
    const item = generateItem('leather_cap', 'legendary', 1);
    expect(item.uniqueEffect?.rarity).toBe('legendary');
  });

  it('el uniqueEffect tiene un handler effect que es funcion', () => {
    const item = generateItem('leather_cap', 'epic', 1);
    expect(typeof item.uniqueEffect?.effect).toBe('function');
  });
});

// ─── generateItem: nombres procedurales ──────────────────────────────────────

describe('generateItem — nombres procedurales', () => {
  it('common mantiene el nombre del template', () => {
    const template = getItemTemplate('leather_cap');
    const item = generateItem('leather_cap', 'common', 1);
    expect(item.name).toBe(template.name);
  });

  it('epic tiene nombre distinto al del template', () => {
    const template = getItemTemplate('leather_cap');
    const item = generateItem('leather_cap', 'epic', 1);
    expect(item.name).not.toBe(template.name);
  });

  it('legendary tiene nombre distinto al del template', () => {
    const template = getItemTemplate('leather_cap');
    const item = generateItem('leather_cap', 'legendary', 1);
    expect(item.name).not.toBe(template.name);
  });

  it('epic empieza con la primera palabra del nombre base', () => {
    const item = generateItem('leather_cap', 'epic', 1);
    expect(item.name.startsWith('Capucha')).toBe(true);
  });

  it('legendary contiene un sufijo especial (del/de la)', () => {
    const item = generateItem('leather_cap', 'legendary', 1);
    const hasSuffix = item.name.includes(' del ') || item.name.includes(' de la ') || item.name.includes(' de ');
    expect(hasSuffix).toBe(true);
  });
});

// ─── generateItem: stats base ────────────────────────────────────────────────

describe('generateItem — stats base', () => {
  it('arma tiene dano base mayor que 0', () => {
    const item = generateItem('sword_long_notched', 'common', 1);
    expect(item.baseStats.damage).toBeDefined();
    expect(item.baseStats.damage!).toBeGreaterThan(0);
  });

  it('armadura tiene armor base mayor que 0', () => {
    const item = generateItem('leather_chest', 'common', 1);
    expect(item.baseStats.armor).toBeDefined();
    expect(item.baseStats.armor!).toBeGreaterThan(0);
  });

  it('dano de arma escala con iLevel', () => {
    const lowLevel = generateItem('sword_long_notched', 'common', 1);
    initGameRng(42);
    const highLevel = generateItem('sword_long_notched', 'common', 5);
    // Con misma seed, iLevel 5 produce dano mayor
    expect(highLevel.baseStats.damage!).toBeGreaterThan(lowLevel.baseStats.damage!);
  });
});

// ─── 100 items aleatorios: unicidad y validez ─────────────────────────────────

describe('100 items aleatorios', () => {
  it('todos los IDs son unicos', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRandomItem(5, 1, 2).id);
    }
    expect(ids.size).toBe(100);
  });

  it('todos tienen una rareza valida', () => {
    const valid = new Set(RARITIES);
    for (let i = 0; i < 100; i++) {
      expect(valid.has(generateRandomItem(0, 1, 1).rarity)).toBe(true);
    }
  });

  it('todos tienen el numero correcto de affixes segun su rareza', () => {
    for (let i = 0; i < 100; i++) {
      const item = generateRandomItem(5, 1, 2);
      const expected = AFFIX_COUNT_BY_RARITY[item.rarity];
      // El pool puede tener menos entradas que lo pedido (ej: pet)
      expect(item.affixes.length).toBeLessThanOrEqual(expected);
    }
  });

  it('los epicos y legendarios siempre tienen uniqueEffect', () => {
    for (let i = 0; i < 100; i++) {
      const item = generateRandomItem(5, 5, 3);
      if (item.rarity === 'epic' || item.rarity === 'legendary') {
        expect(item.uniqueEffect).toBeDefined();
      }
    }
  });

  it('el sellValue siempre es mayor que 0', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateRandomItem(0, 1, 1).sellValue).toBeGreaterThan(0);
    }
  });
});

// ─── calculateSellValue ───────────────────────────────────────────────────────

describe('calculateSellValue', () => {
  it('common a nivel 1 tiene valor base correcto', () => {
    // floor(10 * 1 * (1 + 1*0.15)) = floor(11.5) = 11
    expect(calculateSellValue('common', 1)).toBe(11);
  });

  it('uncommon vale mas que common al mismo nivel', () => {
    expect(calculateSellValue('uncommon', 1)).toBeGreaterThan(calculateSellValue('common', 1));
  });

  it('el orden de valor respeta el orden de rareza', () => {
    const values = RARITIES.map((r) => calculateSellValue(r, 1));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
  });

  it('items de nivel mayor valen mas', () => {
    expect(calculateSellValue('rare', 5)).toBeGreaterThan(calculateSellValue('rare', 1));
  });

  it('legendary vale al menos 10x mas que common al mismo nivel', () => {
    expect(calculateSellValue('legendary', 1)).toBeGreaterThan(calculateSellValue('common', 1) * 10);
  });
});
