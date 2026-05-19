/**
 * InventoryUI -- overlay no bloqueante de inventario (rework T3).
 *
 * Cambios frente a la version anterior:
 *  - Slots 100px con emoji unico por baseId/slot, sin texto.
 *  - Bordes de rareza con glow (common=gris, uncommon=verde, rare=azul,
 *    epic=morado, legendary=dorado pulsante).
 *  - Tooltip rico delegado a ItemTooltip (T2) via mouseover/mousemove.
 *  - Clic derecho: equipar desde bolsa / desequipar desde equipado.
 *
 * NOTA: los atajos de teclado (I, Escape) los gestiona ActionBar/PanelManager.
 * Esta clase solo implementa show() / hide() / isOpen() / toggle().
 */

import { eventBus } from '@/core/EventBus';
import type { InventorySnapshot, EquippedItems, EquipmentSlot, Item } from '@/types/items.types';
import type { Inventory } from '@/game/items/Inventory';
import { ItemTooltip } from '@/ui/ItemTooltip';

// Orden de slots en la seccion de Equipado
const EQUIP_ORDER: EquipmentSlot[] = [
  'weapon', 'head', 'chest', 'hands', 'legs',
  'belt',   'ring1', 'ring2', 'amulet', 'pet',
];

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Arma',     head: 'Casco',    chest: 'Pecho',
  hands:  'Guantes',  legs: 'Piernas',  belt:  'Cinturon',
  ring1:  'Anillo 1', ring2: 'Anillo 2', amulet: 'Amuleto',
  pet:    'Mascota',
};

// Emoji por slot (fallback cuando no hay baseId especifico)
const SLOT_EMOJI: Record<EquipmentSlot, string> = {
  weapon: '\u2694\uFE0F', head: '\u26D1\uFE0F', chest: '\uD83D\uDEE1\uFE0F',
  hands:  '\uD83E\uDDE4', legs: '\uD83D\uDC56',  belt:  '\u2B55',
  ring1:  '\uD83D\uDC8D', ring2: '\uD83D\uDC8D', amulet: '\uD83D\uDCFF',
  pet:    '\uD83D\uDC3E',
};

// Emoji por baseId
const BASE_EMOJI: Record<string, string> = {
  sword_long_notched: '\u2694\uFE0F',
  bow_short_forest:   '\uD83C\uDFF9',
  staff_apprentice:   '\uD83E\uDE84',
  dagger_curved:      '\uD83D\uDDE1\uFE0F',
  venom_blade:        '\uD83D\uDC0D',
  leather_cap:        '\u26D1\uFE0F',
  scholar_hat:        '\uD83C\uDFA9',
  verdugo_helm:       '\uD83D\uDC80',
  void_veil:          '\uD83C\uDF11',
  leather_chest:      '\uD83D\uDEE1\uFE0F',
  scholar_robe:       '\uD83D\uDC54',
  verdugo_chest:      '\u2694\uFE0F',
  void_mantle:        '\uD83C\uDF0C',
  leather_legs:       '\uD83D\uDC56',
  scholar_skirt:      '\uD83D\uDC57',
  verdugo_legs:       '\uD83D\uDC56',
  void_pants:         '\uD83C\uDF1A',
  leather_gloves:     '\uD83E\uDDE4',
  scholar_sleeves:    '\uD83D\uDCDC',
  verdugo_gauntlets:  '\u270A',
  void_gauntlets:     '\uD83C\uDF1F',
  barbed_gloves:      '\uD83C\uDF35',
  iron_guardian_belt: '\uD83D\uDD29',
};

function getItemEmoji(item: Item): string {
  return BASE_EMOJI[item.baseId] ?? SLOT_EMOJI[item.slot] ?? '\u2753';
}

export class InventoryUI {
  private overlay: HTMLElement;
  private equipGrid: HTMLElement;
  private bagGrid: HTMLElement;
  private tooltip: ItemTooltip;
  private inventory: Inventory;
  private isVisible = false;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.tooltip   = new ItemTooltip();

    this.overlay   = this.buildOverlay();
    this.equipGrid = this.overlay.querySelector('.inv-equip-grid')!;
    this.bagGrid   = this.overlay.querySelector('.inv-bag-grid')!;

    document.body.appendChild(this.overlay);

    this.render(inventory.getSnapshot());

    const refresh = (): void => this.render(inventory.getSnapshot());
    eventBus.on('inventory:item-added',      refresh);
    eventBus.on('inventory:item-equipped',   refresh);
    eventBus.on('inventory:item-unequipped', refresh);
    eventBus.on('inventory:item-discarded',  refresh);
  }

  // --- Visibilidad -----------------------------------------------------------

  toggle(): void { this.isVisible ? this.hide() : this.show(); }

  show(): void {
    this.overlay.classList.remove('hidden');
    this.isVisible = true;
  }

  hide(): void {
    this.overlay.classList.add('hidden');
    this.isVisible = false;
    this.tooltip.hide();
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  // --- Construccion del DOM --------------------------------------------------

  private buildOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'inventory-overlay';
    el.classList.add('hidden');
    el.innerHTML = `
      <div id="inventory-panel">
        <div class="inv-header">
          <span class="inv-title">MOCHILA</span>
          <button class="inv-close-btn" id="inv-close-btn">&#x2715;</button>
        </div>
        <div class="inv-section">
          <div class="inv-section-label">EQUIPADO</div>
          <div class="inv-equip-grid"></div>
        </div>
        <div class="inv-section">
          <div class="inv-section-label">BOLSA &mdash; clic der: equipar / desequipar</div>
          <div class="inv-bag-grid"></div>
        </div>
      </div>
    `;
    el.querySelector('#inv-close-btn')!.addEventListener('click', () => this.hide());
    return el;
  }

  // --- Render ----------------------------------------------------------------

  private render(snap: InventorySnapshot): void {
    this.renderEquipped(snap.equipped);
    this.renderBag(snap.bag, snap.equipped);
  }

  private renderEquipped(equipped: EquippedItems): void {
    this.equipGrid.innerHTML = '';
    for (const slot of EQUIP_ORDER) {
      const item = equipped[slot];
      this.equipGrid.appendChild(this.buildCell(item ?? null, slot, 'equipped', equipped));
    }
  }

  private renderBag(bag: ReadonlyArray<Item | null>, equipped: EquippedItems): void {
    this.bagGrid.innerHTML = '';
    for (const item of bag) {
      this.bagGrid.appendChild(this.buildCell(item, null, 'bag', equipped));
    }
  }

  // --- Celda de slot ---------------------------------------------------------

  private buildCell(
    item: Item | null,
    slot: EquipmentSlot | null,
    source: 'equipped' | 'bag',
    equipped: EquippedItems,
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.classList.add('inv-slot');

    if (item) {
      cell.classList.add('inv-slot-filled', `inv-rarity-${item.rarity}`);
      const emoji = getItemEmoji(item);
      const nameText = item.name.length > 14 ? item.name.slice(0, 13) + '\u2026' : item.name;
      cell.innerHTML = `<div class="inv-slot-emoji">${emoji}</div><div class="inv-slot-name">${nameText}</div>`;

      // Clic derecho: equipar / desequipar
      cell.addEventListener('contextmenu', (e: MouseEvent): void => {
        e.preventDefault();
        this.tooltip.hide();
        if (source === 'bag') {
          this.inventory.equipItem(item.id);
        } else if (source === 'equipped' && slot !== null) {
          this.inventory.unequipItem(slot);
        }
      });

      // Hover: mostrar tooltip rico
      cell.addEventListener('mouseenter', (e: MouseEvent): void => {
        this.tooltip.show(item, e.clientX, e.clientY, equipped);
      });
      cell.addEventListener('mousemove', (e: MouseEvent): void => {
        this.tooltip.move(e.clientX, e.clientY);
      });
      cell.addEventListener('mouseleave', (): void => {
        this.tooltip.hide();
      });

    } else {
      cell.classList.add('inv-slot-empty');
      if (slot !== null) {
        const slotEmoji = SLOT_EMOJI[slot] ?? '';
        const label = SLOT_LABELS[slot];
        cell.innerHTML = `
          <div style="font-size:22px;opacity:0.25;line-height:1">${slotEmoji}</div>
          <div class="inv-slot-label">${label}</div>
        `;
      }
    }

    return cell;
  }

  // --- Ciclo de vida ---------------------------------------------------------

  dispose(): void {
    this.overlay.remove();
    this.tooltip.dispose();
  }
}
