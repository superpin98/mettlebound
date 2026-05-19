/**
 * Gestion del inventario del jugador: bolsa + slots de equipo.
 *
 * La clase Inventory es el unico punto de mutacion del estado del inventario.
 * Emite eventos al EventBus en cada cambio para que la UI reaccione sin
 * acoplarse directamente a la logica de juego.
 *
 * Patron identico a PlayerStats (Sprint 2):
 *  - Estado mutable interno, snapshots inmutables al exterior.
 *  - getSnapshot() permite a la UI inicializarse con el estado actual
 *    sin esperar al primer evento.
 */

import type { ClassId } from '@/types/game.types';
import type { Item, EquipmentSlot, EquippedItems, InventorySnapshot } from '@/types/items.types';
import { getClassById } from '@/config/classes.config';
import { generateItem } from '@/game/items/ItemGenerator';
import { eventBus } from '@/core/EventBus';

export class Inventory {
  /** Numero de slots de bolsa. */
  static readonly BAG_SIZE = 30;

  private _bag: (Item | null)[];
  private _equipped: Partial<Record<EquipmentSlot, Item>>;

  /**
   * Crea el inventario para la clase indicada.
   * Si la clase tiene startingItemId, genera ese item y lo equipa.
   * Si no (Errante), el inventario empieza completamente vacio.
   */
  constructor(classId: ClassId) {
    this._bag = new Array<Item | null>(Inventory.BAG_SIZE).fill(null);
    this._equipped = {};

    const classDef = getClassById(classId);
    if (classDef.startingItemId !== undefined) {
      const startingItem = generateItem(classDef.startingItemId, 'common', 1);
      this._equipped[startingItem.slot] = startingItem;
      eventBus.emit('inventory:item-equipped', {
        item: startingItem,
        slot: startingItem.slot,
        equipped: { ...this._equipped } as EquippedItems,
      });
    }
  }

  // Lectura

  /**
   * Devuelve un snapshot inmutable del estado actual.
   * Llamar antes de suscribirse a eventos para inicializar la UI.
   */
  getSnapshot(): InventorySnapshot {
    return {
      equipped: { ...this._equipped } as EquippedItems,
      bag:      [...this._bag],
      bagSize:  Inventory.BAG_SIZE,
    };
  }

  // Mutacion

  /**
   * Anade un item a la bolsa en el primer slot libre.
   * Emite 'inventory:item-added' si hay espacio.
   * Emite 'inventory:full' si la bolsa esta llena.
   *
   * @returns true si el item fue anadido, false si la bolsa estaba llena.
   */
  addItem(item: Item): boolean {
    const emptyIndex = this._bag.indexOf(null);
    if (emptyIndex === -1) {
      eventBus.emit('inventory:full', null);
      return false;
    }
    this._bag[emptyIndex] = item;
    eventBus.emit('inventory:item-added', { item });
    return true;
  }

  /**
   * Equipa un item de la bolsa en su slot correspondiente.
   * Si el slot ya tiene un item, lo intercambia con el de la bolsa (swap).
   * Emite 'inventory:item-equipped' con el mapa completo de equipado.
   *
   * @param itemId - ID del item en la bolsa a equipar
   * @returns true si se equipo, false si el item no estaba en la bolsa.
   */
  equipItem(itemId: string): boolean {
    const bagIndex = this._bag.findIndex((i) => i?.id === itemId);
    if (bagIndex === -1) return false;

    const item = this._bag[bagIndex]!;
    const slot = item.slot;
    const displaced = this._equipped[slot];

    // Equipa el nuevo item y libera su slot de bolsa
    this._equipped[slot] = item;
    // Si habia item en el slot, ocupa el hueco que dejo el equipado (swap)
    this._bag[bagIndex] = displaced ?? null;

    eventBus.emit('inventory:item-equipped', {
      item,
      slot,
      equipped: { ...this._equipped } as EquippedItems,
    });
    return true;
  }

  /**
   * Desequipa el item de un slot y lo mueve a la bolsa.
   * Falla silenciosamente si el slot esta vacio o la bolsa esta llena.
   * Emite 'inventory:item-unequipped' con el mapa completo de equipado.
   *
   * @returns true si se desequipo, false si no habia item o la bolsa estaba llena.
   */
  unequipItem(slot: EquipmentSlot): boolean {
    const item = this._equipped[slot];
    if (item === undefined) return false;

    const emptyIndex = this._bag.indexOf(null);
    if (emptyIndex === -1) return false; // bolsa llena, no se puede desequipar

    this._bag[emptyIndex] = item;
    delete this._equipped[slot];
    eventBus.emit('inventory:item-unequipped', {
      item,
      slot,
      equipped: { ...this._equipped } as EquippedItems,
    });
    return true;
  }

  /**
   * Descarta un item de la bolsa permanentemente.
   * Emite 'inventory:item-discarded'.
   *
   * @param itemId - ID del item a descartar
   * @returns true si se descarto, false si el item no estaba en la bolsa.
   */
  discardItem(itemId: string): boolean {
    const bagIndex = this._bag.findIndex((i) => i?.id === itemId);
    if (bagIndex === -1) return false;

    const item = this._bag[bagIndex]!;
    this._bag[bagIndex] = null;
    eventBus.emit('inventory:item-discarded', { item });
    return true;
  }
}
