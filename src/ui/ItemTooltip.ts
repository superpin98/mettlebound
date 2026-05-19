/**
 * ItemTooltip -- tooltip flotante con informacion completa de un item.
 *
 * Uso:
 *   tooltip.show(item, x, y, equippedItems)  -- muestra y posiciona
 *   tooltip.move(x, y)                       -- sigue al cursor
 *   tooltip.hide()                           -- oculta
 */

import type { Item, AffixStatKey, EquippedItems } from '@/types/items.types';
import { getSetDefinition } from '@/config/items.config';
import { countSetPieces } from '@/game/items/SetBonuses';

// Etiquetas en castellano para cada stat de affix

const STAT_LABELS: Record<AffixStatKey, string> = {
  STR: 'FUE', DEX: 'DES', INT: 'INT', LCK: 'SUE',
  maxHp: 'HP Max', maxMp: 'MP Max',
  critChance: '% Critico', critDamage: '% Dano Crit',
  evasion: '% Evasion', turnSpeed: 'Velocidad',
  physicalDamagePct: '% Dano Fis.', rangedDamagePct: '% Dano Dist.', magicalDamagePct: '% Dano Mag.',
  flatPhysicalDamage: 'Dano Fis.', flatRangedDamage: 'Dano Dist.', flatMagicalDamage: 'Dano Mag.',
  armor: 'Armadura', magicResist: 'Res. Magica',
  damageReductionPct: '% Red. Dano', physicalReductionPct: '% Red. Fisica',
  lifesteal: '% Robo Vida', manasteal: '% Robo MP',
  statusResistance: '% Res. Estado',
  bleedDamage: 'Sangrado', poisonDamage: 'Veneno', stunChance: '% Aturdir',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Comun', uncommon: 'Poco comun', rare: 'Raro',
  epic: 'Epico', legendary: 'Legendario',
};

const SLOT_LABELS: Record<string, string> = {
  weapon: 'Arma', head: 'Casco', chest: 'Pecho',
  hands: 'Guantes', legs: 'Piernas', belt: 'Cinturon',
  ring1: 'Anillo 1', ring2: 'Anillo 2', amulet: 'Amuleto', pet: 'Mascota',
};

export class ItemTooltip {
  private el: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'item-tooltip';
    this.el.classList.add('hidden');
    document.body.appendChild(this.el);
  }

  show(item: Item, x: number, y: number, equippedItems: EquippedItems = {}): void {
    this.el.innerHTML = this.buildHtml(item, equippedItems);
    this.position(x, y);
    this.el.classList.remove('hidden');
  }

  move(x: number, y: number): void {
    if (!this.el.classList.contains('hidden')) {
      this.position(x, y);
    }
  }

  hide(): void {
    this.el.classList.add('hidden');
  }

  dispose(): void {
    this.el.remove();
  }

  // --- Construccion de HTML --------------------------------------------------

  private buildHtml(item: Item, equippedItems: EquippedItems): string {
    const rarityLabel = RARITY_LABELS[item.rarity] ?? item.rarity;
    const slotLabel   = SLOT_LABELS[item.slot]   ?? item.slot;

    // Stats base del item (dano de arma, armadura base)
    let baseHtml = '';
    if (item.baseStats.damage !== undefined) {
      baseHtml = `<div class="tt-basestats"><div class="tt-stat">Dano base: <strong>${item.baseStats.damage}</strong></div></div>`;
    } else if (item.baseStats.armor !== undefined) {
      baseHtml = `<div class="tt-basestats"><div class="tt-stat">Armadura base: <strong>${item.baseStats.armor}</strong></div></div>`;
    }

    // Affixes
    const affixHtml = item.affixes.length > 0
      ? item.affixes.map((a) => {
          const label = STAT_LABELS[a.stat] ?? a.stat;
          const val   = a.isPercent ? `+${a.value}%` : `+${a.value}`;
          return `<div class="tt-affix">${val} ${label}</div>`;
        }).join('')
      : '';

    // Efecto unico
    const uniqueHtml = item.uniqueEffect
      ? `<hr class="tt-divider"><div class="tt-unique"><strong>${item.uniqueEffect.name}</strong>: ${item.uniqueEffect.description}</div>`
      : '';

    // Set bonus
    const setHtml = this.buildSetHtml(item, equippedItems);

    return `
      <div class="tt-name inv-rarity-text-${item.rarity}">${item.name}</div>
      <div class="tt-rarity inv-rarity-text-${item.rarity}">${rarityLabel}</div>
      <div class="tt-type">${slotLabel} &mdash; Nivel ${item.iLevel}</div>
      ${baseHtml}
      ${affixHtml}
      ${uniqueHtml}
      ${setHtml}
      <div class="tt-sell">Venta: ${item.sellValue} oro</div>
    `.trim();
  }

  private buildSetHtml(item: Item, equippedItems: EquippedItems): string {
    if (item.setId === undefined) return '';
    const setDef = getSetDefinition(item.setId);
    if (setDef === undefined) return '';

    const piecesMap   = countSetPieces(equippedItems);
    const piecesCount = piecesMap.get(item.setId) ?? 0;

    const bonusLines = setDef.bonuses.map((b) => {
      const active = piecesCount >= b.piecesRequired;
      const cls    = active ? 'tt-set-bonus-active' : 'tt-set-bonus-inactive';
      const prefix = active ? '&#x2714; ' : '&#x25A1; ';
      return `<div class="${cls}">${prefix}${b.piecesRequired} pzs: ${b.description}</div>`;
    }).join('');

    return `
      <hr class="tt-divider">
      <div class="tt-set-header">Set: ${setDef.name} (${piecesCount} equipadas)</div>
      ${bonusLines}
    `;
  }

  // --- Posicionamiento -------------------------------------------------------

  private position(x: number, y: number): void {
    const TIP_W = 460;
    const TIP_H = 520; // estimado con font-size 22px
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = x + 16 + TIP_W > vw ? x - TIP_W - 4 : x + 16;
    const top  = y + TIP_H > vh     ? Math.max(4, vh - TIP_H - 4) : y + 4;
    this.el.style.left = `${left}px`;
    this.el.style.top  = `${top}px`;
  }
}
