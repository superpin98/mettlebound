/**
 * Tests de escalado proporcional de HP en PlayerStats.
 *
 * Verifica que cuando maxHp cambia en mitad de partida (por gasto de punto
 * de stat, level-up o equipo de item) el HP actual se ajusta proporcionalmente
 * en lugar de mantenerse fijo o restaurarse al maximo.
 *
 * Logica: newCurrentHp = Math.round((currentHp / oldMax) * newMax)
 *         clampado a [0, newMax]
 *
 * Baseline: Errante nivel 1 -- STR=3, maxHp=135
 *   Tras +1 STR (spendStatPoint): STR=4, maxHp=145
 *   Tras level-up a nivel 2:      maxHp=140
 *   Tras equipar item +5 STR:     STR=8, maxHp=185
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initGameRng } from '@/utils/random';
import { PlayerStats } from '@/game/player/PlayerStats';
import { Inventory } from '@/game/items/Inventory';
import { eventBus } from '@/core/EventBus';
import type { Item } from '@/types/items.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  slot: Item['slot'],
  affixes: Item['affixes'],
): Item {
  return {
    id,
    baseId: 'test_item',
    name: `Test ${slot}`,
    rarity: 'common',
    itemType: slot === 'weapon' ? 'weapon' : slot === 'pet' ? 'pet' : 'armor',
    slot,
    level: 1,
    iLevel: 1,
    baseStats: {},
    affixes,
    iconAssetId: 'test',
    sellValue: 0,
  };
}

// ─── Configuracion ────────────────────────────────────────────────────────────

let playerStats: PlayerStats;
let inventory: Inventory;

beforeEach(() => {
  initGameRng(42);
  eventBus.all.clear();
  playerStats = new PlayerStats('errante');
  inventory   = new Inventory('errante');
});

afterEach(() => {
  playerStats.dispose();
});

// ─── Creacion inicial ─────────────────────────────────────────────────────────

describe('PlayerStatsHp -- creacion inicial', () => {
  it('al crear el personaje currentHp es igual a maxHp (100%)', () => {
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(snap.derivedStats.maxHp);
    // maxHp = 100 + 3*10 + 1*5 = 135
    expect(snap.currentHp).toBe(135);
  });
});

// ─── spendStatPoint: gastar punto en STR ──────────────────────────────────────
// STR: 3 -> 4  |  maxHp: 135 -> 145

describe('PlayerStatsHp -- spendStatPoint escala HP proporcionalmente', () => {
  it('HP lleno (100%) sigue lleno despues de subir STR', () => {
    // currentHp=135 / oldMax=135 -> ratio 1.0 -> newHp=145
    playerStats.spendStatPoint('STR');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(145);
    expect(snap.derivedStats.maxHp).toBe(145);
  });

  it('HP al ~50% escala proporcionalmente al subir STR', () => {
    // takeDamage(67) -> currentHp=68 (~50% de 135)
    // Math.round(68/135 * 145) = Math.round(73.04) = 73
    playerStats.takeDamage(67);
    playerStats.spendStatPoint('STR');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(73);
    expect(snap.derivedStats.maxHp).toBe(145);
  });

  it('HP a 0 sigue a 0 despues de subir STR (no resucita)', () => {
    // Math.round(0/135 * 145) = 0
    playerStats.takeDamage(135);
    playerStats.spendStatPoint('STR');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(0);
    expect(snap.derivedStats.maxHp).toBe(145);
  });
});

// ─── addXp: level-up ──────────────────────────────────────────────────────────
// nivel 1 -> nivel 2  |  maxHp: 135 -> 140
// xpForLevel(2) = 100

describe('PlayerStatsHp -- level-up escala HP proporcionalmente', () => {
  it('HP lleno (100%) sigue lleno despues de subir de nivel', () => {
    // currentHp=135 / oldMax=135 -> ratio 1.0 -> newHp=140
    playerStats.addXp(100);
    const snap = playerStats.getSnapshot();
    expect(snap.level).toBe(2);
    expect(snap.currentHp).toBe(140);
    expect(snap.derivedStats.maxHp).toBe(140);
  });

  it('HP al ~50% escala proporcionalmente al subir de nivel', () => {
    // takeDamage(67) -> currentHp=68 (~50% de 135)
    // Math.round(68/135 * 140) = Math.round(70.52) = 71
    playerStats.takeDamage(67);
    playerStats.addXp(100);
    const snap = playerStats.getSnapshot();
    expect(snap.level).toBe(2);
    expect(snap.currentHp).toBe(71);
    expect(snap.derivedStats.maxHp).toBe(140);
  });

  it('HP a 0 sigue a 0 despues de subir de nivel (no resucita)', () => {
    // Math.round(0/135 * 140) = 0
    playerStats.takeDamage(135);
    playerStats.addXp(100);
    const snap = playerStats.getSnapshot();
    expect(snap.level).toBe(2);
    expect(snap.currentHp).toBe(0);
    expect(snap.derivedStats.maxHp).toBe(140);
  });
});

// ─── _onEquipChange: equipar/desequipar item con STR ─────────────────────────
// Equipar item +5 STR: STR 3->8, maxHp 135->185
// Desequipar: STR 8->3, maxHp 185->135

describe('PlayerStatsHp -- equipar item con +STR escala HP proporcionalmente', () => {
  it('HP lleno (100%) sigue lleno al equipar item con +STR', () => {
    // currentHp=135 / oldMax=135 -> ratio 1.0 -> newHp=185
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(185);
    expect(snap.derivedStats.maxHp).toBe(185);
  });

  it('HP al ~50% escala proporcionalmente al equipar item con +STR', () => {
    // takeDamage(67) -> currentHp=68 (~50% de 135)
    // Math.round(68/135 * 185) = Math.round(93.19) = 93
    playerStats.takeDamage(67);
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(93);
    expect(snap.derivedStats.maxHp).toBe(185);
  });

  it('HP a 0 sigue a 0 al equipar item con +STR (no resucita)', () => {
    // Math.round(0/135 * 185) = 0
    playerStats.takeDamage(135);
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(0);
    expect(snap.derivedStats.maxHp).toBe(185);
  });

  it('desequipar item con +STR tambien escala HP proporcionalmente hacia abajo', () => {
    // Equipo con HP lleno: 135 -> 185, currentHp=185
    // takeDamage(92) -> currentHp=93 (~50% de 185)
    // Desequipar: Math.round(93/185 * 135) = Math.round(67.84) = 68
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');
    playerStats.takeDamage(92);          // currentHp=93 sobre maxHp=185
    inventory.unequipItem('weapon');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBe(68);
    expect(snap.derivedStats.maxHp).toBe(135);
  });
});
