import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initGameRng } from '@/utils/random';
import { Inventory } from '@/game/items/Inventory';
import { generateItem } from '@/game/items/ItemGenerator';
import { eventBus } from '@/core/EventBus';
import type { Item } from '@/types/items.types';

// Seed fija para items deterministas en todos los tests
beforeEach(() => {
  initGameRng(42);
  // Limpiar todos los listeners entre tests para no contaminar eventos
  eventBus.all.clear();
});

// Helpers

/** Crea un item de cuero en la bolsa para usar en tests. */
function makeHelmet(): Item {
  return generateItem('leather_cap', 'common', 1);
}

/** Rellena la bolsa de un inventario hasta dejarlo lleno. */
function fillBag(inv: Inventory): void {
  for (let i = 0; i < Inventory.BAG_SIZE; i++) {
    inv.addItem(generateItem('leather_cap', 'common', 1));
  }
}

// Items de inicio por clase

describe('Inventory -- items de inicio por clase', () => {
  it('Errante empieza con slots de equipo vacios', () => {
    const inv = new Inventory('errante');
    const snap = inv.getSnapshot();
    expect(Object.keys(snap.equipped)).toHaveLength(0);
  });

  it('Errante empieza con bolsa completamente vacia', () => {
    const inv = new Inventory('errante');
    const snap = inv.getSnapshot();
    expect(snap.bag.every((s) => s === null)).toBe(true);
  });

  it('Guerrero empieza con sword_long_notched equipado en slot weapon', () => {
    const inv = new Inventory('guerrero');
    expect(inv.getSnapshot().equipped.weapon?.baseId).toBe('sword_long_notched');
  });

  it('Cazador empieza con bow_short_forest equipado en slot weapon', () => {
    const inv = new Inventory('cazador');
    expect(inv.getSnapshot().equipped.weapon?.baseId).toBe('bow_short_forest');
  });

  it('Mago empieza con staff_apprentice equipado en slot weapon', () => {
    const inv = new Inventory('mago');
    expect(inv.getSnapshot().equipped.weapon?.baseId).toBe('staff_apprentice');
  });

  it('Picaro empieza con dagger_curved equipado en slot weapon', () => {
    const inv = new Inventory('picaro');
    expect(inv.getSnapshot().equipped.weapon?.baseId).toBe('dagger_curved');
  });
});

// getSnapshot

describe('Inventory -- getSnapshot', () => {
  it('bagSize es siempre 30', () => {
    expect(new Inventory('errante').getSnapshot().bagSize).toBe(30);
  });

  it('el snapshot es inmutable (no muta el estado interno)', () => {
    const inv = new Inventory('errante');
    const snap1 = inv.getSnapshot();
    inv.addItem(makeHelmet());
    const snap2 = inv.getSnapshot();
    expect(snap1.bag.every((s) => s === null)).toBe(true);
    expect(snap2.bag.some((s) => s !== null)).toBe(true);
  });
});

// addItem

describe('Inventory -- addItem', () => {
  it('devuelve true al anadir item con bolsa con espacio', () => {
    const inv = new Inventory('errante');
    expect(inv.addItem(makeHelmet())).toBe(true);
  });

  it('el item anadido aparece en el snapshot de bolsa', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    expect(inv.getSnapshot().bag).toContain(item);
  });

  it('bolsa llena devuelve false', () => {
    const inv = new Inventory('errante');
    fillBag(inv);
    expect(inv.addItem(makeHelmet())).toBe(false);
  });

  it('bolsa llena emite inventory:full', () => {
    const inv = new Inventory('errante');
    fillBag(inv);
    const handler = vi.fn();
    eventBus.on('inventory:full', handler);
    inv.addItem(makeHelmet());
    expect(handler).toHaveBeenCalledOnce();
  });

  it('anadir item emite inventory:item-added con el item correcto', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    const handler = vi.fn();
    eventBus.on('inventory:item-added', handler);
    inv.addItem(item);
    expect(handler).toHaveBeenCalledWith({ item });
  });

  it('ocupa el primer slot libre de la bolsa', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    expect(inv.getSnapshot().bag[0]).toBe(item);
  });
});

// equipItem

describe('Inventory -- equipItem', () => {
  it('equipa item de bolsa al slot correcto', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    expect(inv.getSnapshot().equipped.head?.id).toBe(item.id);
  });

  it('el item equipado sale de la bolsa', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    expect(inv.getSnapshot().bag).not.toContain(item);
  });

  it('devuelve true al equipar item de bolsa', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    expect(inv.equipItem(item.id)).toBe(true);
  });

  it('devuelve false si el item no esta en la bolsa', () => {
    const inv = new Inventory('errante');
    expect(inv.equipItem('id-inexistente')).toBe(false);
  });

  it('emite inventory:item-equipped con item y slot correctos', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    const handler = vi.fn();
    eventBus.on('inventory:item-equipped', handler);
    inv.equipItem(item.id);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ item, slot: 'head' }));
  });

  it('swap: equipar en slot ocupado mueve el item viejo a la bolsa', () => {
    const inv = new Inventory('errante');
    const helmet1 = generateItem('leather_cap', 'common', 1);
    const helmet2 = generateItem('leather_cap', 'common', 2);
    inv.addItem(helmet1);
    inv.equipItem(helmet1.id);
    inv.addItem(helmet2);
    inv.equipItem(helmet2.id);
    expect(inv.getSnapshot().equipped.head?.id).toBe(helmet2.id);
    expect(inv.getSnapshot().bag).toContain(helmet1);
  });

  it('swap con bolsa llena: el slot del item a equipar queda para el desplazado', () => {
    const inv = new Inventory('errante');
    const helmet1 = generateItem('leather_cap', 'common', 1);
    inv.addItem(helmet1);
    inv.equipItem(helmet1.id);
    fillBag(inv);
    expect(inv.getSnapshot().equipped.head?.id).toBe(helmet1.id);
  });
});

// unequipItem

describe('Inventory -- unequipItem', () => {
  it('desequipa el item y lo mueve a la bolsa', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    inv.unequipItem('head');
    const snap = inv.getSnapshot();
    expect(snap.equipped.head).toBeUndefined();
    expect(snap.bag).toContain(item);
  });

  it('devuelve true al desequipar item existente', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    expect(inv.unequipItem('head')).toBe(true);
  });

  it('devuelve false si el slot esta vacio', () => {
    const inv = new Inventory('errante');
    expect(inv.unequipItem('head')).toBe(false);
  });

  it('devuelve false si la bolsa esta llena', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    fillBag(inv);
    expect(inv.unequipItem('head')).toBe(false);
  });

  it('emite inventory:item-unequipped con item y slot correctos', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.equipItem(item.id);
    const handler = vi.fn();
    eventBus.on('inventory:item-unequipped', handler);
    inv.unequipItem('head');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ item, slot: 'head' }));
  });
});

// discardItem

describe('Inventory -- discardItem', () => {
  it('descarta el item y deja el slot de bolsa vacio', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    inv.discardItem(item.id);
    expect(inv.getSnapshot().bag).not.toContain(item);
  });

  it('devuelve true al descartar item existente', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    expect(inv.discardItem(item.id)).toBe(true);
  });

  it('devuelve false si el item no esta en la bolsa', () => {
    const inv = new Inventory('errante');
    expect(inv.discardItem('id-inexistente')).toBe(false);
  });

  it('emite inventory:item-discarded con el item correcto', () => {
    const inv = new Inventory('errante');
    const item = makeHelmet();
    inv.addItem(item);
    const handler = vi.fn();
    eventBus.on('inventory:item-discarded', handler);
    inv.discardItem(item.id);
    expect(handler).toHaveBeenCalledWith({ item });
  });

  it('descartar no afecta otros items de la bolsa', () => {
    const inv = new Inventory('errante');
    const item1 = generateItem('leather_cap', 'common', 1);
    const item2 = generateItem('leather_chest', 'common', 1);
    inv.addItem(item1);
    inv.addItem(item2);
    inv.discardItem(item1.id);
    expect(inv.getSnapshot().bag).toContain(item2);
  });
});
