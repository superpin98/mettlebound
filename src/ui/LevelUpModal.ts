/**
 * LevelUpModal — modal de subida de nivel.
 *
 * Dos variantes:
 *  - Normal (level-up estándar): 3 puntos de stat + 3 opciones de mejora.
 *  - Errante (creación de personaje): 8 puntos libres, SIN sección de mejoras.
 *    Se activa si el jugador es Errante y aún tiene los 8 puntos iniciales sin gastar.
 *
 * La modal escucha 'ui:show-level-up-modal' y emite acciones de vuelta a
 * PlayerStats a través del EventBus, manteniendo game/ y ui/ desacoplados.
 */

import { eventBus } from '@/core/EventBus';
import { rollUpgradeOptions } from '@/game/progression/LevelUp';
import { gameRng } from '@/utils/random';
import type { PlayerSnapshot, UpgradeDefinition } from '@/types/game.types';

export class LevelUpModal {
  private container: HTMLElement;
  private overlay: HTMLElement;

  /** Mejoras sorteadas en buildLevelUpContent; reutilizadas en attachUpgradeListeners. */
  private currentUpgrades: UpgradeDefinition[] = [];

  // Referencia al PlayerStats para llamar sus métodos directamente
  // (alternativa más simple que pasar por EventBus para acciones UI→juego)
  private onSpendStatPoint: (stat: 'STR' | 'DEX' | 'INT' | 'LCK') => void;
  private onApplyUpgrade: (upgrade: UpgradeDefinition) => void;

  constructor(
    onSpendStatPoint: (stat: 'STR' | 'DEX' | 'INT' | 'LCK') => void,
    onApplyUpgrade: (upgrade: UpgradeDefinition) => void,
  ) {
    this.onSpendStatPoint = onSpendStatPoint;
    this.onApplyUpgrade = onApplyUpgrade;

    this.overlay = this.buildOverlay();
    this.container = this.buildContainer();
    this.overlay.appendChild(this.container);
    const center = document.getElementById('ui-center') ?? document.body;
    center.appendChild(this.overlay);

    eventBus.on('ui:show-level-up-modal', ({ snapshot }) => {
      this.show(snapshot);
    });

    eventBus.on('ui:close-level-up-modal', () => {
      this.hide();
    });
  }

  // ─── DOM ──────────────────────────────────────────────────────────────────

  private buildOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'levelup-overlay';
    el.classList.add('hidden');
    return el;
  }

  private buildContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'levelup-modal';
    return el;
  }

  // ─── Show / Hide ─────────────────────────────────────────────────────────

  show(snapshot: PlayerSnapshot): void {
    const isErranteCreation =
      snapshot.classId === 'errante' && snapshot.level === 1 && snapshot.pendingStatPoints === 8;

    this.container.innerHTML = isErranteCreation
      ? this.buildErranteContent(snapshot)
      : this.buildLevelUpContent(snapshot);

    this.attachStatButtonListeners(snapshot);

    if (!isErranteCreation) {
      this.attachUpgradeListeners(snapshot);
    }

    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  // ─── Contenido: Errante ───────────────────────────────────────────────────

  private buildErranteContent(snapshot: PlayerSnapshot): string {
    return `
      <div class="levelup-header levelup-header-errante">
        <div class="levelup-title-ornament">✦</div>
        <h2 class="levelup-title">Forja tu Errante</h2>
        <p class="levelup-subtitle">
          Sin camino predeterminado. Distribuye tus
          <strong>${snapshot.pendingStatPoints} puntos</strong>
          como desees.
        </p>
      </div>

      <div class="levelup-stat-section">
        ${this.buildStatButtons(snapshot)}
      </div>

      <button
        id="levelup-confirm-btn"
        class="levelup-confirm-btn"
        ${snapshot.pendingStatPoints > 0 ? 'disabled' : ''}
      >
        ${snapshot.pendingStatPoints > 0
          ? `Faltan ${snapshot.pendingStatPoints} puntos`
          : '¡Adentrarse en la mazmorra!'}
      </button>
    `;
  }

  // ─── Contenido: Level-up normal ───────────────────────────────────────────

  private buildLevelUpContent(snapshot: PlayerSnapshot): string {
    // Sortear UNA sola vez y guardar; attachUpgradeListeners reutiliza este array.
    this.currentUpgrades = rollUpgradeOptions(gameRng, snapshot.level, snapshot.appliedUpgrades);
    const upgrades = this.currentUpgrades;

    return `
      <div class="levelup-header">
        <div class="levelup-title-ornament">✦</div>
        <h2 class="levelup-title">¡Nivel ${snapshot.level}!</h2>
        <p class="levelup-subtitle">Asigna tus puntos y elige una mejora.</p>
      </div>

      <div class="levelup-stat-section">
        <p class="levelup-section-label">
          Puntos disponibles: <strong id="levelup-points-left">${snapshot.pendingStatPoints}</strong>
        </p>
        ${this.buildStatButtons(snapshot)}
      </div>

      ${upgrades.length > 0 ? `
      <div class="levelup-upgrades-section">
        <p class="levelup-section-label">Elige una mejora:</p>
        <div class="levelup-upgrades-grid">
          ${upgrades.map(u => this.buildUpgradeCard(u)).join('')}
        </div>
      </div>
      ` : ''}

      <button
        id="levelup-confirm-btn"
        class="levelup-confirm-btn"
        ${snapshot.pendingStatPoints > 0 ? 'disabled' : ''}
      >
        ${snapshot.pendingStatPoints > 0
          ? `Faltan ${snapshot.pendingStatPoints} puntos`
          : 'Continuar'}
      </button>
    `;
  }

  // ─── Helpers de DOM ──────────────────────────────────────────────────────

  private buildStatButtons(snapshot: PlayerSnapshot): string {
    const stats: Array<{ key: 'STR' | 'DEX' | 'INT' | 'LCK'; label: string; cssClass: string }> = [
      { key: 'STR', label: 'Fuerza',       cssClass: 'stat-str' },
      { key: 'DEX', label: 'Destreza',     cssClass: 'stat-dex' },
      { key: 'INT', label: 'Inteligencia', cssClass: 'stat-int' },
      { key: 'LCK', label: 'Suerte',       cssClass: 'stat-lck' },
    ];

    return `
      <div class="levelup-stat-buttons">
        ${stats.map(s => `
          <button
            class="levelup-stat-btn ${s.cssClass}"
            data-stat="${s.key}"
            ${snapshot.pendingStatPoints <= 0 ? 'disabled' : ''}
          >
            <span class="stat-btn-label">${s.label}</span>
            <span class="stat-btn-value" id="statval-${s.key}">${snapshot.coreStats[s.key]}</span>
            <span class="stat-btn-plus">+1</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  private buildUpgradeCard(upgrade: UpgradeDefinition): string {
    return `
      <button
        class="levelup-upgrade-card rarity-${upgrade.rarity}"
        data-upgrade-id="${upgrade.id}"
      >
        <span class="upgrade-rarity-badge">${this.rarityLabel(upgrade.rarity)}</span>
        <span class="upgrade-name">${upgrade.name}</span>
        <span class="upgrade-desc">${upgrade.description}</span>
      </button>
    `;
  }

  private rarityLabel(rarity: string): string {
    const labels: Record<string, string> = {
      common: 'Común',
      uncommon: 'Poco común',
      rare: 'Raro',
      epic: 'Épico',
      legendary: 'Legendario',
    };
    return labels[rarity] ?? rarity;
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  private attachStatButtonListeners(snapshot: PlayerSnapshot): void {
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.levelup-stat-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const stat = btn.dataset['stat'] as 'STR' | 'DEX' | 'INT' | 'LCK';
        this.onSpendStatPoint(stat);
        // El EventBus 'player:stats-changed' hará que el modal se re-renderice
        // la próxima vez que se abra. Por ahora actualizamos el texto del botón.
        const valEl = btn.closest('.levelup-stat-buttons')?.querySelector(`#statval-${stat}`);
        if (valEl) {
          valEl.textContent = String((snapshot.coreStats[stat] ?? 0) + 1);
          snapshot.coreStats[stat]++;
        }
        snapshot.pendingStatPoints--;

        // Actualizar botones y contador
        const pointsEl = this.container.querySelector('#levelup-points-left');
        if (pointsEl) pointsEl.textContent = String(snapshot.pendingStatPoints);

        const confirmBtn = this.container.querySelector<HTMLButtonElement>('#levelup-confirm-btn');
        if (confirmBtn) {
          confirmBtn.disabled = snapshot.pendingStatPoints > 0;
          confirmBtn.textContent = snapshot.pendingStatPoints > 0
            ? `Faltan ${snapshot.pendingStatPoints} puntos`
            : (snapshot.classId === 'errante' ? '¡Adentrarse en la mazmorra!' : 'Continuar');
        }

        if (snapshot.pendingStatPoints <= 0) {
          buttons.forEach(b => { b.disabled = true; });
        }
      });
    });

    // Botón confirmar
    const confirmBtn = this.container.querySelector<HTMLButtonElement>('#levelup-confirm-btn');
    confirmBtn?.addEventListener('click', () => {
      if (snapshot.pendingStatPoints <= 0) {
        this.hide();
      }
    });
  }

  private attachUpgradeListeners(_snapshot: PlayerSnapshot): void {
    const cards = this.container.querySelectorAll<HTMLButtonElement>('.levelup-upgrade-card');

    // Reutilizar las opciones ya sorteadas en buildLevelUpContent.
    // NO volver a llamar rollUpgradeOptions: gameRng ya avanzó de estado.
    const upgradeMap = new Map(this.currentUpgrades.map(u => [u.id, u]));

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset['upgradeId'];
        if (!id) return;
        const upgrade = upgradeMap.get(id);
        if (!upgrade) return;

        this.onApplyUpgrade(upgrade);

        // Marcar la tarjeta como seleccionada y deshabilitar el resto
        cards.forEach(c => {
          c.classList.toggle('selected', c === card);
          if (c !== card) c.disabled = true;
        });
      });
    });
  }

  dispose(): void {
    eventBus.off('ui:show-level-up-modal', () => {});
    eventBus.off('ui:close-level-up-modal', () => {});
    this.overlay.remove();
  }
}
