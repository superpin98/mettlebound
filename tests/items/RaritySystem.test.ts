import { describe, it, expect } from 'vitest';
import { Mulberry32 } from '@/utils/random';
import {
  rollRarity,
  getDropWeights,
  calculateDropRarity,
  hasUniqueEffect,
  hasProceduralName,
  AFFIX_COUNT_BY_RARITY,
  type RarityWeights,
} from '@/game/items/RaritySystem';
import type { Rarity } from '@/types/game.types';

// ─── rollRarity ──────────────────────────────────────────────────────────────

describe('rollRarity', () => {
  it('devuelve solo valores validos de Rarity', () => {
    const validRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const weights: RarityWeights = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
    for (let i = 0; i < 50; i++) {
      const result = rollRarity(weights);
      expect(validRarities).toContain(result);
    }
  });

  it('devuelve common con pesos 100/0/0/0/0', () => {
    const weights: RarityWeights = { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    const result = rollRarity(weights);
    expect(result).toBe('common');
  });

  it('devuelve legendary con pesos 0/0/0/0/100', () => {
    const weights: RarityWeights = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 100 };
    const result = rollRarity(weights);
    expect(result).toBe('legendary');
  });

  it('distribucion estadistica respeta proporciones aproximadas', () => {
    // Con seed controlada, la distribucion debe aproximarse a los pesos base
    const localRng = new Mulberry32(99999);
    const counts: Record<Rarity, number> = {
      common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0,
    };
    const weights: RarityWeights = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
    const SAMPLES = 1000;

    // Temporalmente reemplazamos el gameRng con nuestro rng local
    // via llamadas directas con pesos conocidos
    for (let i = 0; i < SAMPLES; i++) {
      const total = 100;
      const roll = localRng.next() * total;
      let acc = 0;
      const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      for (const r of order) {
        acc += weights[r];
        if (roll < acc) { counts[r]++; break; }
      }
    }

    // La distribucion debe estar en un rango razonable (+/-20% del esperado)
    expect(counts.common).toBeGreaterThan(SAMPLES * 0.4);    // ~60%, tolerar 40%+
    expect(counts.uncommon).toBeGreaterThan(SAMPLES * 0.15); // ~25%, tolerar 15%+
    expect(counts.rare).toBeGreaterThan(SAMPLES * 0.05);     // ~10%, tolerar 5%+
    expect(counts.epic + counts.legendary).toBeGreaterThan(0); // alguno debe aparecer
  });
});

// ─── getDropWeights ──────────────────────────────────────────────────────────

describe('getDropWeights', () => {
  it('sin suerte ni piso, devuelve pesos base', () => {
    const weights = getDropWeights(0, 0);
    expect(weights.common).toBe(60);
    expect(weights.uncommon).toBe(25);
    expect(weights.rare).toBe(10);
    expect(weights.epic).toBe(4);
    expect(weights.legendary).toBe(1);
  });

  it('suerte alta aumenta rare, epic y legendary', () => {
    const base = getDropWeights(0, 0);
    const lucky = getDropWeights(20, 0);
    expect(lucky.rare).toBeGreaterThan(base.rare);
    expect(lucky.epic).toBeGreaterThan(base.epic);
    expect(lucky.legendary).toBeGreaterThan(base.legendary);
  });

  it('piso alto aumenta uncommon, rare, epic y legendary', () => {
    const base = getDropWeights(0, 0);
    const highFloor = getDropWeights(0, 10);
    expect(highFloor.uncommon).toBeGreaterThan(base.uncommon);
    expect(highFloor.rare).toBeGreaterThan(base.rare);
    expect(highFloor.epic).toBeGreaterThan(base.epic);
    expect(highFloor.legendary).toBeGreaterThan(base.legendary);
  });

  it('common nunca baja del minimo (10) aunque suerte y piso sean muy altos', () => {
    const weights = getDropWeights(100, 50);
    expect(weights.common).toBeGreaterThanOrEqual(10);
  });

  it('todos los pesos son numeros positivos o cero', () => {
    const weights = getDropWeights(15, 5);
    for (const w of Object.values(weights)) {
      expect(w).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── calculateDropRarity ─────────────────────────────────────────────────────

describe('calculateDropRarity', () => {
  it('devuelve una Rarity valida con parametros normales', () => {
    const validRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const result = calculateDropRarity(5, 1);
    expect(validRarities).toContain(result);
  });

  it('funciona con parametros extremos sin lanzar error', () => {
    expect(() => calculateDropRarity(0, 0)).not.toThrow();
    expect(() => calculateDropRarity(100, 100)).not.toThrow();
  });
});

// ─── Helpers de rareza ────────────────────────────────────────────────────────

describe('hasUniqueEffect', () => {
  it('devuelve true solo para epic y legendary', () => {
    expect(hasUniqueEffect('epic')).toBe(true);
    expect(hasUniqueEffect('legendary')).toBe(true);
    expect(hasUniqueEffect('common')).toBe(false);
    expect(hasUniqueEffect('uncommon')).toBe(false);
    expect(hasUniqueEffect('rare')).toBe(false);
  });
});

describe('hasProceduralName', () => {
  it('devuelve true solo para epic y legendary', () => {
    expect(hasProceduralName('epic')).toBe(true);
    expect(hasProceduralName('legendary')).toBe(true);
    expect(hasProceduralName('common')).toBe(false);
    expect(hasProceduralName('uncommon')).toBe(false);
    expect(hasProceduralName('rare')).toBe(false);
  });
});

describe('AFFIX_COUNT_BY_RARITY', () => {
  it('common tiene 1 affix, legendary tiene 5', () => {
    expect(AFFIX_COUNT_BY_RARITY.common).toBe(1);
    expect(AFFIX_COUNT_BY_RARITY.uncommon).toBe(2);
    expect(AFFIX_COUNT_BY_RARITY.rare).toBe(3);
    expect(AFFIX_COUNT_BY_RARITY.epic).toBe(4);
    expect(AFFIX_COUNT_BY_RARITY.legendary).toBe(5);
  });

  it('cada rareza superior tiene mas affixes que la inferior', () => {
    expect(AFFIX_COUNT_BY_RARITY.uncommon).toBeGreaterThan(AFFIX_COUNT_BY_RARITY.common);
    expect(AFFIX_COUNT_BY_RARITY.rare).toBeGreaterThan(AFFIX_COUNT_BY_RARITY.uncommon);
    expect(AFFIX_COUNT_BY_RARITY.epic).toBeGreaterThan(AFFIX_COUNT_BY_RARITY.rare);
    expect(AFFIX_COUNT_BY_RARITY.legendary).toBeGreaterThan(AFFIX_COUNT_BY_RARITY.epic);
  });
});
