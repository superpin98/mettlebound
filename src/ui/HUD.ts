/**
 * HUD — cabecera de interfaz en juego (HTML overlay).
 *
 * Muestra: nombre de clase, nivel, barra de XP, barras de HP/MP,
 * los 4 stats primarios con sus derivados, y controles de debug.
 *
 * Se construye una sola vez y se actualiza vía updateFromSnapshot()
 * cada vez que el EventBus emite 'player:stats-changed'.
 *
 * Sin dependencia directa de Babylon.js — es HTML puro sobre el canvas.
 */

import { eventBus } from '@/core/EventBus';
import type { PlayerSnapshot } from '@/types/game.types';

export class HUD {
  private container: HTMLElement;

  // Referencias a elementos que se actualizan frecuentemente
  private elClassName!: HTMLElement;
  private elLevel!: HTMLElement;
  private elXpBar!: HTMLElement;
  private elXpText!: HTMLElement;
  private elHpBar!: HTMLElement;
  private elHpText!: HTMLElement;
  private elMpBar!: HTMLElement;
  private elMpText!: HTMLElement;
  private elStr!: HTMLElement;
  private elDex!: HTMLElement;
  private elInt!: HTMLElement;
  private elLck!: HTMLElement;
  private elCrit!: HTMLElement;
  private elEvasion!: HTMLElement;
  private elSpeed!: HTMLElement;
  private elPendingPoints!: HTMLElement;
  private elPendingBadge!: HTMLElement;

  constructor(initialSnapshot?: PlayerSnapshot) {
    this.container = this.buildDOM();
    const corner = document.getElementById('ui-corner') ?? document.body;
    corner.appendChild(this.container);

    // Pintar estado inicial si se pasa snapshot (evita HUD vacío cuando
    // el EventBus ya emitió player:stats-changed antes de que HUD existiera).
    if (initialSnapshot) {
      this.updateFromSnapshot(initialSnapshot);
    }

    // Escuchar cambios de stats futuros
    eventBus.on('player:stats-changed', (snapshot: PlayerSnapshot) => {
      this.updateFromSnapshot(snapshot);
    });
  }

  // ─── Construcción del DOM ────────────────────────────────────────────────

  private buildDOM(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-class-row">
        <span id="hud-class-name" class="hud-class-name">—</span>
        <span id="hud-level" class="hud-level">Nv. 1</span>
        <span id="hud-pending-badge" class="hud-pending-badge hidden">+<span id="hud-pending-points">0</span></span>
      </div>

      <div class="hud-bar-row">
        <span class="hud-bar-label hud-hp-label">HP</span>
        <div class="hud-bar hud-hp-track">
          <div id="hud-hp-bar" class="hud-bar-fill hud-hp-fill"></div>
        </div>
        <span id="hud-hp-text" class="hud-bar-text">—/—</span>
      </div>

      <div class="hud-bar-row">
        <span class="hud-bar-label hud-mp-label">MP</span>
        <div class="hud-bar hud-mp-track">
          <div id="hud-mp-bar" class="hud-bar-fill hud-mp-fill"></div>
        </div>
        <span id="hud-mp-text" class="hud-bar-text">—/—</span>
      </div>

      <div class="hud-bar-row">
        <span class="hud-bar-label hud-xp-label">XP</span>
        <div class="hud-bar hud-xp-track">
          <div id="hud-xp-bar" class="hud-bar-fill hud-xp-fill"></div>
        </div>
        <span id="hud-xp-text" class="hud-bar-text">—</span>
      </div>

      <div class="hud-stats-grid">
        <div class="hud-stat hud-stat-str">
          <span class="hud-stat-label">FUE</span>
          <span id="hud-str" class="hud-stat-value">—</span>
        </div>
        <div class="hud-stat hud-stat-dex">
          <span class="hud-stat-label">DES</span>
          <span id="hud-dex" class="hud-stat-value">—</span>
        </div>
        <div class="hud-stat hud-stat-int">
          <span class="hud-stat-label">INT</span>
          <span id="hud-int" class="hud-stat-value">—</span>
        </div>
        <div class="hud-stat hud-stat-lck">
          <span class="hud-stat-label">STE</span>
          <span id="hud-lck" class="hud-stat-value">—</span>
        </div>
        <div class="hud-stat hud-stat-derived">
          <span class="hud-stat-label">CRIT</span>
          <span id="hud-crit" class="hud-stat-value">—%</span>
        </div>
        <div class="hud-stat hud-stat-derived">
          <span class="hud-stat-label">ESQV</span>
          <span id="hud-evasion" class="hud-stat-value">—%</span>
        </div>
        <div class="hud-stat hud-stat-derived" style="grid-column: span 2">
          <span class="hud-stat-label">VEL</span>
          <span id="hud-speed" class="hud-stat-value">—</span>
        </div>
      </div>
    `;

    // Cachear referencias
    this.elClassName    = el.querySelector('#hud-class-name')!;
    this.elLevel        = el.querySelector('#hud-level')!;
    this.elPendingBadge = el.querySelector('#hud-pending-badge')!;
    this.elPendingPoints = el.querySelector('#hud-pending-points')!;
    this.elHpBar        = el.querySelector('#hud-hp-bar')!;
    this.elHpText       = el.querySelector('#hud-hp-text')!;
    this.elMpBar        = el.querySelector('#hud-mp-bar')!;
    this.elMpText       = el.querySelector('#hud-mp-text')!;
    this.elXpBar        = el.querySelector('#hud-xp-bar')!;
    this.elXpText       = el.querySelector('#hud-xp-text')!;
    this.elStr          = el.querySelector('#hud-str')!;
    this.elDex          = el.querySelector('#hud-dex')!;
    this.elInt          = el.querySelector('#hud-int')!;
    this.elLck          = el.querySelector('#hud-lck')!;
    this.elCrit         = el.querySelector('#hud-crit')!;
    this.elEvasion      = el.querySelector('#hud-evasion')!;
    this.elSpeed        = el.querySelector('#hud-speed')!;

    return el;
  }

  // ─── Actualización ───────────────────────────────────────────────────────

  updateFromSnapshot(s: PlayerSnapshot): void {
    const CLASS_NAMES: Record<string, string> = {
      guerrero: 'Guerrero',
      cazador: 'Cazador',
      mago: 'Mago',
      picaro: 'Pícaro',
      errante: 'Errante',
    };

    this.elClassName.textContent = CLASS_NAMES[s.classId] ?? s.classId;
    this.elLevel.textContent = `Nv. ${s.level}`;

    // Badge de puntos pendientes
    if (s.pendingStatPoints > 0) {
      this.elPendingPoints.textContent = String(s.pendingStatPoints);
      this.elPendingBadge.classList.remove('hidden');
    } else {
      this.elPendingBadge.classList.add('hidden');
    }

    // HP
    const hpPct = s.derivedStats.maxHp > 0
      ? (s.currentHp / s.derivedStats.maxHp) * 100
      : 0;
    this.elHpBar.style.width = `${Math.max(0, Math.min(100, hpPct))}%`;
    this.elHpText.textContent = `${s.currentHp}/${s.derivedStats.maxHp}`;

    // MP
    const mpPct = s.derivedStats.maxMp > 0
      ? (s.currentMp / s.derivedStats.maxMp) * 100
      : 0;
    this.elMpBar.style.width = `${Math.max(0, Math.min(100, mpPct))}%`;
    this.elMpText.textContent = `${s.currentMp}/${s.derivedStats.maxMp}`;

    // XP
    const xpPct = s.xpToNext > 0 ? ((s.xp - this.xpAtCurrentLevel(s)) / s.xpToNext) * 100 : 100;
    this.elXpBar.style.width = `${Math.max(0, Math.min(100, xpPct))}%`;
    this.elXpText.textContent = `${s.xp - this.xpAtCurrentLevel(s)}/${s.xpToNext}`;

    // Stats primarios
    this.elStr.textContent = String(s.coreStats.STR);
    this.elDex.textContent = String(s.coreStats.DEX);
    this.elInt.textContent = String(s.coreStats.INT);
    this.elLck.textContent = String(s.coreStats.LCK);

    // Derivados
    this.elCrit.textContent    = `${s.derivedStats.critChance.toFixed(1)}%`;
    this.elEvasion.textContent = `${s.derivedStats.evasion.toFixed(1)}%`;
    this.elSpeed.textContent   = String(s.derivedStats.turnSpeed);
  }

  /** Calcula la XP acumulada al inicio del nivel actual. */
  private xpAtCurrentLevel(s: PlayerSnapshot): number {
    // xpForLevel(level) − xpForLevel(level) = 0 cuando level=1
    // Importar xpForLevel aquí crearía una dependencia circular; usamos la diferencia
    return s.xp - (s.xp % (s.xpToNext || 1));  // aproximación visual; la lógica real está en XPSystem
  }

  /** Libera los listeners del EventBus. Llamar si el HUD se destruye. */
  dispose(): void {
    eventBus.off('player:stats-changed', this.updateFromSnapshot.bind(this));
    this.container.remove();
  }
}
