/**
 * CharacterSheet -- hoja de personaje completa (tecla C).
 *
 * Zona 1: clase, nivel, XP, stats primarios, HP/MP, puntos pendientes.
 * Zona 2: stats de combate activos (no cero) agrupados por categoria.
 *         Oculta si no hay ningun stat de combate con valor > 0.
 * Zona 3: bonus de conjuntos activos (2+ piezas equipadas).
 *         Oculta si no hay ningun set activo.
 *
 * Se actualiza en tiempo real via 'player:stats-changed'.
 *
 * NOTA: los atajos de teclado (C, Escape) los gestiona ActionBar/PanelManager.
 * Esta clase solo implementa show() / hide() / isOpen() / toggle().
 */

import { eventBus } from '@/core/EventBus';
import type { PlayerSnapshot, DerivedStats } from '@/types/game.types';
import type { PlayerStats } from '@/game/player/PlayerStats';
import type { Inventory } from '@/game/items/Inventory';
import { getActiveSetBonuses } from '@/game/items/SetBonuses';
import { xpProgressInCurrentLevel } from '@/game/progression/XPSystem';

const CLASS_NAMES: Record<string, string> = {
  guerrero: 'Guerrero', cazador: 'Cazador', mago: 'Mago',
  picaro: 'Picaro', errante: 'Errante',
};

// Stats ofensivos, defensivos y de utilidad de la Zona 2
const OFFENSIVE_STATS: Array<{ key: keyof DerivedStats; label: string; isPercent?: boolean }> = [
  { key: 'critDamage',          label: 'Dano critico',    isPercent: true  },
  { key: 'physicalDamagePct',   label: 'Dano fisico',     isPercent: true  },
  { key: 'rangedDamagePct',     label: 'Dano a distancia',isPercent: true  },
  { key: 'magicalDamagePct',    label: 'Dano magico',     isPercent: true  },
  { key: 'flatPhysicalDamage',  label: 'Fisico plano',    isPercent: false },
  { key: 'flatRangedDamage',    label: 'Distancia plano', isPercent: false },
  { key: 'flatMagicalDamage',   label: 'Magico plano',    isPercent: false },
  { key: 'bleedDamage',         label: 'Sangrado',        isPercent: false },
  { key: 'poisonDamage',        label: 'Veneno',          isPercent: false },
  { key: 'stunChancePct',       label: 'Aturdir',         isPercent: true  },
];

const DEFENSIVE_STATS: Array<{ key: keyof DerivedStats; label: string; isPercent?: boolean }> = [
  { key: 'armor',               label: 'Armadura',        isPercent: false },
  { key: 'magicResist',         label: 'Res. magica',     isPercent: false },
  { key: 'damageReductionPct',  label: 'Red. dano',       isPercent: true  },
  { key: 'physicalReductionPct',label: 'Red. fisica',     isPercent: true  },
];

const UTILITY_STATS: Array<{ key: keyof DerivedStats; label: string; isPercent?: boolean }> = [
  { key: 'lifestealPct',        label: 'Robo de vida',    isPercent: true  },
  { key: 'manastealPct',        label: 'Robo de mana',    isPercent: true  },
  { key: 'statusResistancePct', label: 'Res. estados',    isPercent: true  },
];

export class CharacterSheet {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private isVisible = false;
  private playerStats: PlayerStats;
  private inventory: Inventory;

  private readonly _onStatsChanged: (snap: PlayerSnapshot) => void;
  private readonly _onInventoryChange: () => void;

  constructor(playerStats: PlayerStats, inventory: Inventory) {
    this.playerStats = playerStats;
    this.inventory   = inventory;

    this.overlay = document.createElement('div');
    this.overlay.id = 'charsheet-overlay';
    this.overlay.classList.add('hidden');

    this.panel = document.createElement('div');
    this.panel.id = 'charsheet-panel';
    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);

    // Render inicial
    this.render(playerStats.getSnapshot());

    // Actualizacion en tiempo real
    this._onStatsChanged = (snap: PlayerSnapshot): void => {
      this.render(snap);
    };
    eventBus.on('player:stats-changed', this._onStatsChanged);

    // Cuando el inventario cambia, re-render para actualizar sets
    this._onInventoryChange = (): void => {
      this.render(this.playerStats.getSnapshot());
    };
    eventBus.on('inventory:item-equipped',   this._onInventoryChange);
    eventBus.on('inventory:item-unequipped', this._onInventoryChange);
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
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  // --- Render ----------------------------------------------------------------

  private render(snap: PlayerSnapshot): void {
    const equippedItems = this.inventory.getSnapshot().equipped;
    const activeSets    = getActiveSetBonuses(equippedItems);

    const zone1 = this.buildZone1(snap);
    const zone2 = this.buildZone2(snap.derivedStats);
    const zone3 = this.buildZone3(activeSets);

    const closeBtn = `
      <div class="cs-header">
        <span class="cs-title">PERSONAJE</span>
        <button class="cs-close-btn" id="cs-close-btn">&#x2715;</button>
      </div>
    `;

    this.panel.innerHTML = closeBtn + zone1 + zone2 + zone3;
    this.panel.querySelector('#cs-close-btn')!
      .addEventListener('click', () => this.hide());
  }

  // --- Zona 1: clase, nivel, stats base ------------------------------------

  private buildZone1(snap: PlayerSnapshot): string {
    const className    = CLASS_NAMES[snap.classId] ?? snap.classId;
    const xpProgress   = xpProgressInCurrentLevel(snap.xp, snap.level);
    const xpPct        = xpProgress.needed > 0
      ? Math.round((xpProgress.current / xpProgress.needed) * 100)
      : 100;
    const pendingBadge = snap.pendingStatPoints > 0
      ? `<span class="cs-pending">${snap.pendingStatPoints} pts</span>`
      : '';

    const coreGrid = `
      <div class="cs-core-grid">
        <div class="cs-core-stat cs-core-str">
          <div class="cs-core-label">FUE</div>
          <div class="cs-core-value">${snap.coreStats.STR}</div>
        </div>
        <div class="cs-core-stat cs-core-dex">
          <div class="cs-core-label">DES</div>
          <div class="cs-core-value">${snap.coreStats.DEX}</div>
        </div>
        <div class="cs-core-stat cs-core-int">
          <div class="cs-core-label">INT</div>
          <div class="cs-core-value">${snap.coreStats.INT}</div>
        </div>
        <div class="cs-core-stat cs-core-lck">
          <div class="cs-core-label">SUE</div>
          <div class="cs-core-value">${snap.coreStats.LCK}</div>
        </div>
      </div>
    `;

    const vitalsGrid = `
      <div class="cs-vitals-grid">
        <div class="cs-vital cs-vital-hp">
          <div class="cs-vital-label">HP</div>
          <div class="cs-vital-value">${snap.currentHp}/${snap.derivedStats.maxHp}</div>
        </div>
        <div class="cs-vital cs-vital-mp">
          <div class="cs-vital-label">MP</div>
          <div class="cs-vital-value">${snap.currentMp}/${snap.derivedStats.maxMp}</div>
        </div>
        <div class="cs-vital">
          <div class="cs-vital-label">Critico</div>
          <div class="cs-vital-value">${snap.derivedStats.critChance.toFixed(1)}%</div>
        </div>
        <div class="cs-vital">
          <div class="cs-vital-label">Evasion</div>
          <div class="cs-vital-value">${snap.derivedStats.evasion.toFixed(1)}%</div>
        </div>
        <div class="cs-vital">
          <div class="cs-vital-label">Velocidad</div>
          <div class="cs-vital-value">${snap.derivedStats.turnSpeed.toFixed(1)}</div>
        </div>
      </div>
    `;

    return `
      <div>
        <div class="cs-identity">
          <span class="cs-class-name">${className}</span>
          <span class="cs-level">Nv. ${snap.level}</span>
          ${pendingBadge}
        </div>
        <div class="cs-xp-row">
          <div class="cs-xp-label">XP: ${xpProgress.current} / ${xpProgress.needed}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${xpPct}%"></div></div>
        </div>
        ${coreGrid}
        ${vitalsGrid}
      </div>
    `;
  }

  // --- Zona 2: stats de combate activos ------------------------------------

  private buildZone2(d: DerivedStats): string {
    const offRows  = this.filterStatRows(OFFENSIVE_STATS,  d);
    const defRows  = this.filterStatRows(DEFENSIVE_STATS,  d);
    const utilRows = this.filterStatRows(UTILITY_STATS,    d);

    if (offRows.length === 0 && defRows.length === 0 && utilRows.length === 0) {
      return ''; // zona oculta si no hay stats activos
    }

    const buildGroup = (title: string, rows: string[]): string =>
      rows.length === 0 ? '' : `
        <div class="cs-zone2-group">
          <div class="cs-zone2-group-label">${title}</div>
          ${rows.join('')}
        </div>
      `;

    return `
      <div class="cs-zone2">
        <div class="cs-zone-section-title">COMBATE</div>
        ${buildGroup('OFENSIVO', offRows)}
        ${buildGroup('DEFENSIVO', defRows)}
        ${buildGroup('UTILIDAD', utilRows)}
      </div>
    `;
  }

  private filterStatRows(
    defs: Array<{ key: keyof DerivedStats; label: string; isPercent?: boolean }>,
    d: DerivedStats,
  ): string[] {
    return defs
      .filter(({ key }) => (d[key] as number) > 0)
      .map(({ key, label, isPercent }) => {
        const val = d[key] as number;
        const display = isPercent
          ? `${val % 1 === 0 ? val : val.toFixed(1)}%`
          : `${val % 1 === 0 ? val : val.toFixed(1)}`;
        return `
          <div class="cs-combat-row">
            <span class="cs-combat-label">${label}</span>
            <span class="cs-combat-value">${display}</span>
          </div>
        `;
      });
  }

  // --- Zona 3: bonus de conjuntos activos -----------------------------------

  private buildZone3(
    activeSets: readonly ReturnType<typeof getActiveSetBonuses>[number][],
  ): string {
    if (activeSets.length === 0) return '';

    const seenSets = new Set<string>();
    const entries: string[] = [];

    for (const { setId, setName, piecesEquipped } of activeSets) {
      if (seenSets.has(setId)) continue;
      seenSets.add(setId);

      const allBonusesForSet = activeSets.filter((a) => a.setId === setId);
      const { bonus } = activeSets.find((a) => a.setId === setId)!;

      const bonusLines = allBonusesForSet.map((ab) => {
        const cls = piecesEquipped >= ab.bonus.piecesRequired
          ? 'cs-set-bonus-active'
          : 'cs-set-bonus-inactive';
        return `<div class="${cls}">${ab.bonus.piecesRequired} pzs: ${ab.bonus.description}</div>`;
      }).join('');

      void bonus; // suppress lint

      entries.push(`
        <div class="cs-set-entry">
          <div class="cs-set-name">${setName}</div>
          <div class="cs-set-pieces">${piecesEquipped} piezas equipadas</div>
          ${bonusLines}
        </div>
      `);
    }

    return `
      <div class="cs-zone3">
        <div class="cs-zone3-label">CONJUNTOS ACTIVOS</div>
        ${entries.join('')}
      </div>
    `;
  }

  // --- Ciclo de vida ---------------------------------------------------------

  dispose(): void {
    eventBus.off('player:stats-changed',     this._onStatsChanged);
    eventBus.off('inventory:item-equipped',  this._onInventoryChange);
    eventBus.off('inventory:item-unequipped',this._onInventoryChange);
    this.overlay.remove();
  }
}
