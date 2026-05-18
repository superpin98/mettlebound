/**
 * ClassSelectionModal — pantalla de selección de clase al iniciar partida.
 *
 * Devuelve una Promise<ClassId> que se resuelve cuando el jugador
 * hace click en una de las 5 tarjetas de clase.
 *
 * Se usa también desde el botón cheat "Cambiar Clase" (solo en DEV).
 */

import { CLASS_DEFINITIONS } from '@/config/classes.config';
import type { ClassId } from '@/types/game.types';

// ─── Iconos por clase ─────────────────────────────────────────────────────────

const CLASS_ICONS: Record<ClassId, string> = {
  guerrero: '⚔',
  cazador:  '🏹',
  mago:     '🔮',
  picaro:   '🗡',
  errante:  '🌫',
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export class ClassSelectionModal {
  /**
   * Muestra el modal a pantalla completa y devuelve una promesa que resuelve
   * con la ClassId elegida por el jugador.
   *
   * El modal se elimina del DOM automáticamente al resolver.
   */
  static show(): Promise<ClassId> {
    return new Promise<ClassId>(resolve => {
      // ── Overlay ──────────────────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'class-select-overlay';

      // ── Contenedor ───────────────────────────────────────────────────────
      const modal = document.createElement('div');
      modal.id = 'class-select-modal';

      // ── Cabecera ─────────────────────────────────────────────────────────
      const header = document.createElement('div');
      header.className = 'class-select-header';
      header.innerHTML = `
        <div class="class-select-ornament">✦</div>
        <h1 class="class-select-title">Elige tu Destino</h1>
        <p class="class-select-subtitle">
          Cada camino es tuyo. Esta elección es solo el comienzo.
        </p>
      `;
      modal.appendChild(header);

      // ── Grid de tarjetas ─────────────────────────────────────────────────
      const grid = document.createElement('div');
      grid.className = 'class-select-grid';

      CLASS_DEFINITIONS.forEach(cls => {
        const card = document.createElement('button');
        card.className = `class-card class-card-${cls.id}`;
        card.dataset['classId'] = cls.id;

        card.innerHTML = `
          <span class="class-card-icon">${CLASS_ICONS[cls.id]}</span>
          <span class="class-card-name">${cls.name}</span>
          <span class="class-card-desc">${cls.description}</span>
          <div class="class-card-stats">
            <span class="cs-stat cs-str">FUE <strong>${cls.baseStats.STR}</strong></span>
            <span class="cs-stat cs-dex">DES <strong>${cls.baseStats.DEX}</strong></span>
            <span class="cs-stat cs-int">INT <strong>${cls.baseStats.INT}</strong></span>
            <span class="cs-stat cs-lck">STE <strong>${cls.baseStats.LCK}</strong></span>
          </div>
          ${cls.freePoints > 0
            ? `<span class="class-card-free">+${cls.freePoints} pts libres</span>`
            : ''}
        `;

        card.addEventListener('click', () => {
          overlay.remove();
          resolve(cls.id);
        });

        grid.appendChild(card);
      });

      modal.appendChild(grid);
      overlay.appendChild(modal);
      const center = document.getElementById('ui-center') ?? document.body;
      center.appendChild(overlay);
    });
  }
}
