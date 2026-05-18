/**
 * Tests de LevelUp.
 * Verifica inmutabilidad, determinismo y logica de asignacion de stats.
 */

import { describe, it, expect } from 'vitest';
import { rollUpgradeOptions, applyStatPoint, applyUpgrade } from '@/game/progression/LevelUp';
import { Mulberry32 } from '@/utils/random';
import type { CoreStats } from '@/types/game.types';

const SEED = 12345;
const BASE_STATS: CoreStats = { STR: 5, DEX: 5, INT: 5, LCK: 5 };

describe('rollUpgradeOptions', () => {
  it('devuelve exactamente 3 opciones', () => {
    const options = rollUpgradeOptions(new Mulberry32(SEED), 1, []);
    expect(options.length).toBe(3);
  });

  it('es determinista: misma seed, mismas opciones', () => {
    const a = rollUpgradeOptions(new Mulberry32(SEED), 1, []);
    const b = rollUpgradeOptions(new Mulberry32(SEED), 1, []);
    expect(a.map(u => u.id)).toEqual(b.map(u => u.id));
  });

  it('no repite opciones en la misma tirada', () => {
    const options = rollUpgradeOptions(new Mulberry32(SEED), 1, []);
    const ids = options.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no ofrece mejoras ya aplicadas', () => {
    const first = rollUpgradeOptions(new Mulberry32(SEED), 1, []);
    const appliedId = first[0]!.id;
    const second = rollUpgradeOptions(new Mulberry32(SEED), 1, [appliedId]);
    expect(second.map(u => u.id)).not.toContain(appliedId);
  });

  it('siempre devuelve al menos una opcion', () => {
    const options = rollUpgradeOptions(new Mulberry32(SEED), 5, []);
    expect(options.length).toBeGreaterThan(0);
  });
});

describe('applyStatPoint', () => {
  it('incrementa el stat correcto en 1', () => {
    const result = applyStatPoint(BASE_STATS, 'STR', 3);
    expect(result.newStats.STR).toBe(BASE_STATS.STR + 1);
    expect(result.newStats.DEX).toBe(BASE_STATS.DEX);
  });

  it('decrementa los puntos pendientes', () => {
    const result = applyStatPoint(BASE_STATS, 'STR', 3);
    expect(result.newPending).toBe(2);
  });

  it('no muta el objeto original', () => {
    const original = { ...BASE_STATS };
    applyStatPoint(BASE_STATS, 'STR', 3);
    expect(BASE_STATS).toEqual(original);
  });

  it('lanza error si no hay puntos suficientes', () => {
    expect(() => applyStatPoint(BASE_STATS, 'STR', 0)).toThrow();
  });

  it('funciona con todos los stats', () => {
    for (const stat of ['STR', 'DEX', 'INT', 'LCK'] as const) {
      const result = applyStatPoint(BASE_STATS, stat, 5);
      expect(result.newStats[stat]).toBe(BASE_STATS[stat] + 1);
    }
  });
});

describe('applyUpgrade', () => {
  it('stat_flat incrementa el stat correcto', () => {
    const result = applyUpgrade({ type: 'stat_flat', stat: 'STR', amount: 2 }, BASE_STATS);
    expect(result.newCoreStats.STR).toBe(BASE_STATS.STR + 2);
    expect(result.newCoreStats.DEX).toBe(BASE_STATS.DEX);
  });

  it('hp_flat no toca los core stats', () => {
    const result = applyUpgrade({ type: 'hp_flat', amount: 20 }, BASE_STATS);
    expect(result.hpBonusFlat).toBe(20);
    expect(result.newCoreStats).toEqual(BASE_STATS);
  });

  it('mp_flat reporta el bonus correcto', () => {
    const result = applyUpgrade({ type: 'mp_flat', amount: 15 }, BASE_STATS);
    expect(result.mpBonusFlat).toBe(15);
  });

  it('crit_flat reporta el bonus correcto', () => {
    const result = applyUpgrade({ type: 'crit_flat', amount: 3 }, BASE_STATS);
    expect(result.critBonusFlat).toBe(3);
  });

  it('damage_pct reporta el bonus correcto', () => {
    const result = applyUpgrade({ type: 'damage_pct', amount: 10 }, BASE_STATS);
    expect(result.damageBonusPct).toBe(10);
  });

  it('no muta los stats originales', () => {
    const original = { ...BASE_STATS };
    applyUpgrade({ type: 'stat_flat', stat: 'INT', amount: 3 }, BASE_STATS);
    expect(BASE_STATS).toEqual(original);
  });
});
