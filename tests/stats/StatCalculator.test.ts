/**
 * Tests de StatCalculator.
 */

import { describe, it, expect } from 'vitest';
import {
  applySoftCap,
  calcMaxHp,
  calcMaxMp,
  calcCritChance,
  calcEvasion,
  calcTurnSpeed,
  calcDerivedStats,
} from '@/game/stats/StatCalculator';
import { BALANCE } from '@/config/balance';
import type { CoreStats } from '@/types/game.types';

const BASE_STATS: CoreStats = { STR: 0, DEX: 0, INT: 0, LCK: 0 };
const GUERRERO: CoreStats = { STR: 10, DEX: 4, INT: 2, LCK: 4 };

describe('applySoftCap', () => {
  const { threshold, factor, max } = BALANCE.SOFT_CAPS.CRIT_CHANCE;
  it('por debajo del threshold lo devuelve igual', () => {
    expect(applySoftCap(30, threshold, factor, max)).toBe(30);
  });
  it('exactamente en el threshold no aplica cap', () => {
    expect(applySoftCap(threshold, threshold, factor, max)).toBe(threshold);
  });
  it('aplica el factor por encima del threshold', () => {
    expect(applySoftCap(60, threshold, factor, max)).toBe(55);
  });
  it('nunca supera el maximo', () => {
    expect(applySoftCap(999, threshold, factor, max)).toBe(max);
  });
});

describe('calcMaxHp', () => {
  it('con stats 0 y nivel 0 devuelve HP base', () => {
    expect(calcMaxHp(BASE_STATS, 0)).toBe(BALANCE.PLAYER.BASE_HP);
  });
  it('escala con STR y nivel', () => {
    const expected = BALANCE.PLAYER.BASE_HP + 10 * BALANCE.PLAYER.HP_PER_STR + 5 * BALANCE.PLAYER.HP_PER_LEVEL;
    expect(calcMaxHp({ ...BASE_STATS, STR: 10 }, 5)).toBe(expected);
  });
});

describe('calcMaxMp', () => {
  it('con stats 0 y nivel 0 devuelve MP base', () => {
    expect(calcMaxMp(BASE_STATS, 0)).toBe(BALANCE.PLAYER.BASE_MP);
  });
  it('escala con INT y nivel', () => {
    const expected = BALANCE.PLAYER.BASE_MP + 8 * BALANCE.PLAYER.MP_PER_INT + 3 * BALANCE.PLAYER.MP_PER_LEVEL;
    expect(calcMaxMp({ ...BASE_STATS, INT: 8 }, 3)).toBe(expected);
  });
});

describe('calcCritChance', () => {
  it('con LCK 0 devuelve crit base', () => {
    expect(calcCritChance(BASE_STATS)).toBeCloseTo(BALANCE.PLAYER.BASE_CRIT_CHANCE);
  });
  it('escala con LCK sin cap', () => {
    const stats: CoreStats = { ...BASE_STATS, LCK: 10 };
    const expected = BALANCE.PLAYER.BASE_CRIT_CHANCE + 10 * BALANCE.DAMAGE.CRIT_PER_LCK;
    expect(calcCritChance(stats)).toBeCloseTo(expected);
  });
  it('aplica soft cap por encima del threshold', () => {
    const stats: CoreStats = { ...BASE_STATS, LCK: 160 };
    const raw = BALANCE.PLAYER.BASE_CRIT_CHANCE + 160 * BALANCE.DAMAGE.CRIT_PER_LCK;
    const { threshold, factor, max } = BALANCE.SOFT_CAPS.CRIT_CHANCE;
    const expected = Math.min(threshold + (raw - threshold) * factor, max);
    expect(calcCritChance(stats)).toBeCloseTo(expected);
  });
  it('nunca supera el maximo absoluto', () => {
    expect(calcCritChance({ ...BASE_STATS, LCK: 9999 })).toBeLessThanOrEqual(BALANCE.SOFT_CAPS.CRIT_CHANCE.max);
  });
});

describe('calcEvasion', () => {
  it('con DEX 0 la evasion es 0', () => {
    expect(calcEvasion(BASE_STATS)).toBe(0);
  });
  it('escala con DEX sin cap', () => {
    expect(calcEvasion({ ...BASE_STATS, DEX: 20 })).toBeCloseTo(10);
  });
  it('en el threshold exacto el resultado es el threshold', () => {
    // DEX=80 -> raw = 80*0.5 = 40 = threshold -> sin cap
    expect(calcEvasion({ ...BASE_STATS, DEX: 80 })).toBeCloseTo(BALANCE.SOFT_CAPS.EVASION.threshold);
  });
  it('aplica soft cap por encima del threshold', () => {
    // DEX=100 -> raw=50 -> 40 + (50-40)*0.5 = 45
    const raw = 100 * BALANCE.DAMAGE.EVASION_PER_DEX;
    const { threshold, factor } = BALANCE.SOFT_CAPS.EVASION;
    expect(calcEvasion({ ...BASE_STATS, DEX: 100 })).toBeCloseTo(threshold + (raw - threshold) * factor);
  });
  it('nunca supera el maximo absoluto', () => {
    expect(calcEvasion({ ...BASE_STATS, DEX: 9999 })).toBeLessThanOrEqual(BALANCE.SOFT_CAPS.EVASION.max);
  });
});

describe('calcTurnSpeed', () => {
  it('con DEX 0 devuelve velocidad base', () => {
    expect(calcTurnSpeed(BASE_STATS)).toBe(BALANCE.PLAYER.BASE_TURN_SPEED);
  });
  it('escala con DEX', () => {
    const expected = BALANCE.PLAYER.BASE_TURN_SPEED + 10 * BALANCE.DAMAGE.TURN_SPEED_PER_DEX;
    expect(calcTurnSpeed({ ...BASE_STATS, DEX: 10 })).toBeCloseTo(expected);
  });
});

describe('calcDerivedStats', () => {
  it('devuelve todos los campos derivados', () => {
    const d = calcDerivedStats(GUERRERO, 1);
    expect(d).toHaveProperty('maxHp');
    expect(d).toHaveProperty('maxMp');
    expect(d).toHaveProperty('critChance');
    expect(d).toHaveProperty('evasion');
    expect(d).toHaveProperty('turnSpeed');
  });
  it('coincide con las funciones individuales', () => {
    const d = calcDerivedStats(GUERRERO, 3);
    expect(d.maxHp).toBe(calcMaxHp(GUERRERO, 3));
    expect(d.maxMp).toBe(calcMaxMp(GUERRERO, 3));
    expect(d.critChance).toBe(calcCritChance(GUERRERO));
    expect(d.evasion).toBe(calcEvasion(GUERRERO));
    expect(d.turnSpeed).toBe(calcTurnSpeed(GUERRERO));
  });
  it('es determinista', () => {
    expect(calcDerivedStats(GUERRERO, 5)).toEqual(calcDerivedStats(GUERRERO, 5));
  });
});
