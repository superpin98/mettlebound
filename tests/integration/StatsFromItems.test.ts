/**
 * Tests de integracion: stats de items equipados -> PlayerStats.
 *
 * Verifica que equipar/desequipar items actualiza inmediatamente los stats
 * del jugador (via EventBus) sin necesidad de referencia directa entre clases.
 *
 * Flujo: Inventory.equipItem() -> EventBus -> PlayerStats._onEquipChange()
 *        -> calcTotalItemDeltas() -> derivedStats / getters actualizados
 *        -> getSnapshot() refleja los nuevos valores
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initGameRng } from '@/utils/random';
import { PlayerStats } from '@/game/player/PlayerStats';
import { Inventory } from '@/game/items/Inventory';
import { eventBus } from '@/core/EventBus';
import type { Item } from '@/types/items.types';

// ─── Configuracion ────────────────────────────────────────────────────────────

let playerStats: PlayerStats;
let inventory: Inventory;

beforeEach(() => {
  initGameRng(42);
  eventBus.all.clear();            // limpiar listeners de tests anteriores
  playerStats = new PlayerStats('errante'); // STR/DEX/INT/LCK=3, sin item inicial
  inventory   = new Inventory('errante');   // mochila vacia, sin item equipado
});

afterEach(() => {
  playerStats.dispose();           // eliminar listeners del EventBus
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crea un item minimo con affixes personalizados para tests. */
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

// ─── Baselines de Errante en nivel 1 ─────────────────────────────────────────
// STR=3, DEX=3, INT=3, LCK=3, nivel 1
// maxHp    = 100 + 3*10 + 1*5         = 135
// maxMp    = 30  + 3*5  + 1*2         = 47
// critChance = 5 + 3*0.3              = 5.9
// evasion    = 3*0.5                  = 1.5
// turnSpeed  = 100 + 3*0.5            = 101.5

describe('StatsFromItems -- affix plano directamente sobre derivado', () => {
  it('equipar casco con +11 maxHp incrementa maxHp en 11', () => {
    const helmet = makeItem('h1', 'head', [
      { stat: 'maxHp', value: 11, isPercent: false },
    ]);
    inventory.addItem(helmet);
    inventory.equipItem('h1');

    expect(playerStats.getSnapshot().derivedStats.maxHp).toBe(135 + 11);
  });

  it('desequipar el casco revierte maxHp al valor base', () => {
    const helmet = makeItem('h1', 'head', [
      { stat: 'maxHp', value: 11, isPercent: false },
    ]);
    inventory.addItem(helmet);
    inventory.equipItem('h1');
    inventory.unequipItem('head');

    expect(playerStats.getSnapshot().derivedStats.maxHp).toBe(135);
  });

  it('equipar pechera con +20 maxMp incrementa maxMp en 20', () => {
    const chest = makeItem('c1', 'chest', [
      { stat: 'maxMp', value: 20, isPercent: false },
    ]);
    inventory.addItem(chest);
    inventory.equipItem('c1');

    expect(playerStats.getSnapshot().derivedStats.maxMp).toBe(47 + 20);
  });

  it('affix de critChance incrementa critChance', () => {
    const ring = makeItem('r1', 'ring1', [
      { stat: 'critChance', value: 3.5, isPercent: true },
    ]);
    inventory.addItem(ring);
    inventory.equipItem('r1');

    expect(playerStats.getSnapshot().derivedStats.critChance).toBeCloseTo(5.9 + 3.5);
  });

  it('affix de evasion incrementa evasion', () => {
    const legs = makeItem('l1', 'legs', [
      { stat: 'evasion', value: 5, isPercent: true },
    ]);
    inventory.addItem(legs);
    inventory.equipItem('l1');

    expect(playerStats.getSnapshot().derivedStats.evasion).toBeCloseTo(1.5 + 5);
  });

  it('affix de turnSpeed incrementa turnSpeed', () => {
    const belt = makeItem('b1', 'belt', [
      { stat: 'turnSpeed', value: 10, isPercent: false },
    ]);
    inventory.addItem(belt);
    inventory.equipItem('b1');

    expect(playerStats.getSnapshot().derivedStats.turnSpeed).toBeCloseTo(101.5 + 10);
  });
});

describe('StatsFromItems -- stat primario en item cascadea a derivados', () => {
  it('affix +5 STR en arma incrementa maxHp en 50 (5 * HP_PER_STR=10)', () => {
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');

    // maxHp = BASE(100) + (STR_base(3) + STR_item(5)) * 10 + nivel(1)*5
    //       = 100 + 8*10 + 5 = 185
    expect(playerStats.getSnapshot().derivedStats.maxHp).toBe(185);
  });

  it('affix +4 INT en amuleto incrementa maxMp en 20 (4 * MP_PER_INT=5)', () => {
    const amulet = makeItem('am1', 'amulet', [
      { stat: 'INT', value: 4, isPercent: false },
    ]);
    inventory.addItem(amulet);
    inventory.equipItem('am1');

    // maxMp = 30 + (3+4)*5 + 2 = 30 + 35 + 2 = 67
    expect(playerStats.getSnapshot().derivedStats.maxMp).toBe(67);
  });

  it('affix STR aparece reflejado en coreStats del snapshot', () => {
    const sword = makeItem('sw1', 'weapon', [
      { stat: 'STR', value: 5, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw1');

    expect(playerStats.getSnapshot().coreStats.STR).toBe(3 + 5);
  });
});

describe('StatsFromItems -- acumulacion de multiples items y affixes', () => {
  it('dos items con maxHp acumulan correctamente', () => {
    const helmet = makeItem('h1', 'head', [
      { stat: 'maxHp', value: 11, isPercent: false },
    ]);
    const chest = makeItem('c1', 'chest', [
      { stat: 'maxHp', value: 25, isPercent: false },
    ]);
    inventory.addItem(helmet);
    inventory.addItem(chest);
    inventory.equipItem('h1');
    inventory.equipItem('c1');

    expect(playerStats.getSnapshot().derivedStats.maxHp).toBe(135 + 11 + 25);
  });

  it('item con multiples affixes aplica todos simultaneamente', () => {
    const ring = makeItem('r1', 'ring1', [
      { stat: 'maxHp',    value: 10, isPercent: false },
      { stat: 'critChance', value: 2, isPercent: true },
    ]);
    inventory.addItem(ring);
    inventory.equipItem('r1');

    const snap = playerStats.getSnapshot();
    expect(snap.derivedStats.maxHp).toBe(135 + 10);
    expect(snap.derivedStats.critChance).toBeCloseTo(5.9 + 2);
  });

  it('swap de item (equipa otro en mismo slot) aplica solo el nuevo', () => {
    const helmet1 = makeItem('h1', 'head', [
      { stat: 'maxHp', value: 11, isPercent: false },
    ]);
    const helmet2 = makeItem('h2', 'head', [
      { stat: 'maxHp', value: 30, isPercent: false },
    ]);
    inventory.addItem(helmet1);
    inventory.addItem(helmet2);
    inventory.equipItem('h1');   // +11 hp
    inventory.equipItem('h2');   // +30 hp (swap: h1 vuelve a la bolsa)

    expect(playerStats.getSnapshot().derivedStats.maxHp).toBe(135 + 30);
  });
});

describe('StatsFromItems -- no interferencia con el sistema de upgrade', () => {
  it('los stats base del Errante no se alteran sin items', () => {
    const snap = playerStats.getSnapshot();
    expect(snap.coreStats.STR).toBe(3);
    expect(snap.coreStats.DEX).toBe(3);
    expect(snap.coreStats.INT).toBe(3);
    expect(snap.coreStats.LCK).toBe(3);
    expect(snap.derivedStats.maxHp).toBe(135);
  });

  it('HP actual se clampea al nuevo maximo si el item reduce el tope', () => {
    // Equipar un item que sube maxHp, luego desequiparlo
    // El HP actual no debe superar el maxHp resultante
    const helmet = makeItem('h1', 'head', [
      { stat: 'maxHp', value: 50, isPercent: false },
    ]);
    inventory.addItem(helmet);
    inventory.equipItem('h1');

    // Simular que el jugador tiene HP al maximo con el item
    // (al equipar el HP actual ya es 135 inicial, el maximo es 185)
    // Desequipar: maxHp vuelve a 135, HP debe clampear a 135
    inventory.unequipItem('head');
    const snap = playerStats.getSnapshot();
    expect(snap.currentHp).toBeLessThanOrEqual(snap.derivedStats.maxHp);
  });
});

describe('StatsFromItems -- stats exoticos (bleedDamage, poisonDamage, lifesteal, manasteal, stunChance, physicalReductionPct)', () => {

  it('affix bleedDamage en arma aparece en derivedStats.bleedDamage', () => {
    const sword = makeItem('sw_bleed', 'weapon', [
      { stat: 'bleedDamage', value: 8, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw_bleed');

    expect(playerStats.getSnapshot().derivedStats.bleedDamage).toBe(8);
  });

  it('affix poisonDamage en guantes aparece en derivedStats.poisonDamage', () => {
    const gloves = makeItem('g_poison', 'hands', [
      { stat: 'poisonDamage', value: 5, isPercent: false },
    ]);
    inventory.addItem(gloves);
    inventory.equipItem('g_poison');

    expect(playerStats.getSnapshot().derivedStats.poisonDamage).toBe(5);
  });

  it('affix lifesteal en arma aparece en derivedStats.lifestealPct', () => {
    const sword = makeItem('sw_ls', 'weapon', [
      { stat: 'lifesteal', value: 3.5, isPercent: true },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw_ls');

    expect(playerStats.getSnapshot().derivedStats.lifestealPct).toBeCloseTo(3.5);
  });

  it('affix manasteal en anillo aparece en derivedStats.manastealPct', () => {
    const ring = makeItem('r_ms', 'ring1', [
      { stat: 'manasteal', value: 2, isPercent: true },
    ]);
    inventory.addItem(ring);
    inventory.equipItem('r_ms');

    expect(playerStats.getSnapshot().derivedStats.manastealPct).toBeCloseTo(2);
  });

  it('affix stunChance en arma aparece en derivedStats.stunChancePct', () => {
    const sword = makeItem('sw_stun', 'weapon', [
      { stat: 'stunChance', value: 10, isPercent: true },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw_stun');

    expect(playerStats.getSnapshot().derivedStats.stunChancePct).toBeCloseTo(10);
  });

  it('affix physicalReductionPct en pechera aparece en derivedStats.physicalReductionPct', () => {
    const chest = makeItem('c_pr', 'chest', [
      { stat: 'physicalReductionPct', value: 7, isPercent: true },
    ]);
    inventory.addItem(chest);
    inventory.equipItem('c_pr');

    expect(playerStats.getSnapshot().derivedStats.physicalReductionPct).toBeCloseTo(7);
  });

  it('desequipar item con bleedDamage vuelve a 0', () => {
    const sword = makeItem('sw_bleed2', 'weapon', [
      { stat: 'bleedDamage', value: 12, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.equipItem('sw_bleed2');
    inventory.unequipItem('weapon');

    expect(playerStats.getSnapshot().derivedStats.bleedDamage).toBe(0);
  });

  it('acumular bleedDamage y poisonDamage de dos items simultaneamente', () => {
    const sword = makeItem('sw_combo', 'weapon', [
      { stat: 'bleedDamage', value: 6, isPercent: false },
    ]);
    const gloves = makeItem('g_combo', 'hands', [
      { stat: 'poisonDamage', value: 4, isPercent: false },
    ]);
    inventory.addItem(sword);
    inventory.addItem(gloves);
    inventory.equipItem('sw_combo');
    inventory.equipItem('g_combo');

    const snap = playerStats.getSnapshot();
    expect(snap.derivedStats.bleedDamage).toBe(6);
    expect(snap.derivedStats.poisonDamage).toBe(4);
  });

  it('stats exoticos empiezan en 0 sin items equipados', () => {
    const snap = playerStats.getSnapshot();
    expect(snap.derivedStats.bleedDamage).toBe(0);
    expect(snap.derivedStats.poisonDamage).toBe(0);
    expect(snap.derivedStats.lifestealPct).toBe(0);
    expect(snap.derivedStats.manastealPct).toBe(0);
    expect(snap.derivedStats.stunChancePct).toBe(0);
    expect(snap.derivedStats.physicalReductionPct).toBe(0);
  });

  it('physicalReductionPct y damageReductionPct son independientes en el snapshot', () => {
    const belt = makeItem('belt_pr', 'belt', [
      { stat: 'damageReductionPct', value: 5, isPercent: true },
    ]);
    const chest = makeItem('c_pr2', 'chest', [
      { stat: 'physicalReductionPct', value: 8, isPercent: true },
    ]);
    inventory.addItem(belt);
    inventory.addItem(chest);
    inventory.equipItem('belt_pr');
    inventory.equipItem('c_pr2');

    const snap = playerStats.getSnapshot();
    expect(snap.derivedStats.damageReductionPct).toBeCloseTo(5);
    expect(snap.derivedStats.physicalReductionPct).toBeCloseTo(8);
  });
});
