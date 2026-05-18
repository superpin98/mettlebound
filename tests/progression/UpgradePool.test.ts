/**
 * Tests de UpgradePool.
 * Verifican integridad del pool: IDs únicos, conteos mínimos y determinismo.
 */

import { describe, it, expect } from 'vitest';
import { UPGRADE_POOL, getUpgradesByRarity } from '@/game/progression/UpgradePool';

describe('UPGRADE_POOL — integridad', () => {
  it('todos los IDs son únicos', () => {
    const ids = UPGRADE_POOL.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('ningún upgrade tiene campos vacíos', () => {
    for (const u of UPGRADE_POOL) {
      expect(u.id.length).toBeGreaterThan(0);
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.description.length).toBeGreaterThan(0);
      expect(u.effect).toBeDefined();
    }
  });

  it('hay al menos 8 mejoras comunes', () => {
    expect(getUpgradesByRarity('common').length).toBeGreaterThanOrEqual(8);
  });

  it('hay al menos 6 mejoras poco comunes', () => {
    expect(getUpgradesByRarity('uncommon').length).toBeGreaterThanOrEqual(6);
  });

  it('todos los efectos de tipo stat_flat referencian un stat válido', () => {
    const validStats = ['STR', 'DEX', 'INT', 'LCK'];
    const statFlatUpgrades = UPGRADE_POOL.filter(u => u.effect.type === 'stat_flat');
    for (const u of statFlatUpgrades) {
      if (u.effect.type === 'stat_flat') {
        expect(validStats).toContain(u.effect.stat);
      }
    }
  });

  it('todos los effects con amount tienen amount > 0', () => {
    for (const u of UPGRADE_POOL) {
      if ('amount' in u.effect) {
        expect(u.effect.amount).toBeGreaterThan(0);
      }
    }
  });
});

describe('getUpgradesByRarity', () => {
  it('filtra correctamente por rareza', () => {
    const commons = getUpgradesByRarity('common');
    expect(commons.every(u => u.rarity === 'common')).toBe(true);
  });

  it('rarezas no activadas devuelven array vacío o pequeño', () => {
    // En Sprint 2 no hay raros activos
    const rares = getUpgradesByRarity('rare');
    expect(rares.length).toBe(0);
  });
});
