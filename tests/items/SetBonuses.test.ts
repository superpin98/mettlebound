import { describe, it, expect } from 'vitest';
import {
  countSetPieces,
  getActiveSetBonuses,
} from '@/game/items/SetBonuses';
import { getSetDefinition } from '@/config/items.config';
import type { EquippedItems, EquipmentSlot, Item } from '@/types/items.types';

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Construye un item minimo valido para tests de SetBonuses. */
function makeItem(slot: EquipmentSlot, setId?: string): Item {
  return {
    id: `test-${slot}`,
    baseId: 'leather_cap',
    name: 'Test Item',
    rarity: 'common',
    itemType: 'armor',
    slot,
    level: 1,
    iLevel: 1,
    ...(setId !== undefined ? { setId } : {}),
    baseStats: {},
    affixes: [],
    iconAssetId: 'icon_placeholder',
    sellValue: 10,
  };
}

/** 2 piezas del conjunto Cuero Curtido. */
const TWO_PIECES: EquippedItems = {
  head:  makeItem('head',  'set_cuero'),
  chest: makeItem('chest', 'set_cuero'),
};

/** Las 4 piezas del conjunto Cuero Curtido. */
const FOUR_PIECES: EquippedItems = {
  head:  makeItem('head',  'set_cuero'),
  chest: makeItem('chest', 'set_cuero'),
  legs:  makeItem('legs',  'set_cuero'),
  hands: makeItem('hands', 'set_cuero'),
};

// ─── countSetPieces ───────────────────────────────────────────────────────────

describe('countSetPieces', () => {
  it('inventario vacio devuelve mapa vacio', () => {
    expect(countSetPieces({}).size).toBe(0);
  });

  it('1 pieza cuenta 1 para ese set', () => {
    const counts = countSetPieces({ head: makeItem('head', 'set_cuero') });
    expect(counts.get('set_cuero')).toBe(1);
  });

  it('2 piezas del mismo set cuentan 2', () => {
    expect(countSetPieces(TWO_PIECES).get('set_cuero')).toBe(2);
  });

  it('4 piezas del mismo set cuentan 4', () => {
    expect(countSetPieces(FOUR_PIECES).get('set_cuero')).toBe(4);
  });

  it('item sin setId no se cuenta en ningun set', () => {
    const equipped: EquippedItems = {
      weapon: makeItem('weapon'), // sin setId
      head:   makeItem('head', 'set_cuero'),
    };
    const counts = countSetPieces(equipped);
    expect(counts.size).toBe(1);
    expect(counts.get('set_cuero')).toBe(1);
  });

  it('2 sets distintos devuelven conteos separados', () => {
    const equipped: EquippedItems = {
      head:  makeItem('head',  'set_cuero'),
      chest: makeItem('chest', 'set_cuero'),
      ring1: makeItem('ring1', 'set_vacio'),
    };
    const counts = countSetPieces(equipped);
    expect(counts.get('set_cuero')).toBe(2);
    expect(counts.get('set_vacio')).toBe(1);
    expect(counts.size).toBe(2);
  });
});

// ─── getActiveSetBonuses ──────────────────────────────────────────────────────

describe('getActiveSetBonuses', () => {
  it('inventario vacio devuelve array vacio', () => {
    expect(getActiveSetBonuses({})).toHaveLength(0);
  });

  it('1 pieza no activa ningun bono (umbral minimo es 2)', () => {
    const equipped: EquippedItems = { head: makeItem('head', 'set_cuero') };
    expect(getActiveSetBonuses(equipped)).toHaveLength(0);
  });

  it('2 piezas activan exactamente 1 bono', () => {
    expect(getActiveSetBonuses(TWO_PIECES)).toHaveLength(1);
  });

  it('4 piezas activan exactamente 2 bonos (umbral 2 y umbral 4)', () => {
    expect(getActiveSetBonuses(FOUR_PIECES)).toHaveLength(2);
  });

  it('el bono de 2 piezas tiene piecesRequired 2', () => {
    const bonuses = getActiveSetBonuses(TWO_PIECES);
    expect(bonuses[0]?.bonus.piecesRequired).toBe(2);
  });

  it('los 2 bonos de 4 piezas tienen piecesRequired 2 y 4', () => {
    const bonuses = getActiveSetBonuses(FOUR_PIECES);
    const reqs = bonuses.map((b) => b.bonus.piecesRequired).sort((a, b) => a - b);
    expect(reqs).toEqual([2, 4]);
  });

  it('el bono activo tiene el setId correcto', () => {
    expect(getActiveSetBonuses(TWO_PIECES)[0]?.setId).toBe('set_cuero');
  });

  it('el bono activo tiene el setName correcto', () => {
    const setDef = getSetDefinition('set_cuero')!;
    expect(getActiveSetBonuses(TWO_PIECES)[0]?.setName).toBe(setDef.name);
  });

  it('piecesEquipped refleja 2 cuando se llevan 2 piezas', () => {
    expect(getActiveSetBonuses(TWO_PIECES)[0]?.piecesEquipped).toBe(2);
  });

  it('piecesEquipped refleja 4 cuando se llevan 4 piezas', () => {
    const bonuses = getActiveSetBonuses(FOUR_PIECES);
    expect(bonuses.every((b) => b.piecesEquipped === 4)).toBe(true);
  });

  it('los efectos del bono de 2 piezas coinciden con la definicion del set', () => {
    const setDef = getSetDefinition('set_cuero')!;
    const expectedBonus = setDef.bonuses.find((b) => b.piecesRequired === 2)!;
    const bonuses = getActiveSetBonuses(TWO_PIECES);
    expect(bonuses[0]?.bonus.effects).toEqual(expectedBonus.effects);
  });

  it('los efectos del bono de 4 piezas coinciden con la definicion del set', () => {
    const setDef = getSetDefinition('set_cuero')!;
    const expectedBonus = setDef.bonuses.find((b) => b.piecesRequired === 4)!;
    const bonuses = getActiveSetBonuses(FOUR_PIECES);
    const bonus4 = bonuses.find((b) => b.bonus.piecesRequired === 4);
    expect(bonus4?.bonus.effects).toEqual(expectedBonus.effects);
  });

  it('2 sets con 2 piezas cada uno activan 2 bonos (uno por set)', () => {
    const equipped: EquippedItems = {
      head:  makeItem('head',  'set_cuero'),
      chest: makeItem('chest', 'set_cuero'),
      ring1: makeItem('ring1', 'set_vacio'),
      ring2: makeItem('ring2', 'set_vacio'),
    };
    expect(getActiveSetBonuses(equipped)).toHaveLength(2);
  });

  it('set con 1 pieza no activa bono aunque otro set tenga 2 piezas', () => {
    const equipped: EquippedItems = {
      head:  makeItem('head',  'set_cuero'),
      chest: makeItem('chest', 'set_cuero'),
      ring1: makeItem('ring1', 'set_vacio'), // solo 1 pieza
    };
    const bonuses = getActiveSetBonuses(equipped);
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0]?.setId).toBe('set_cuero');
  });
});
