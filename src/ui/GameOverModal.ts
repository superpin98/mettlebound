/**
 * GameOverModal -- overlay de muerte del jugador.
 *
 * Se muestra cuando recibe 'player:death-anim-end', que se emite en
 * PlayerController justo cuando la animacion Death_A termina su ultimo frame.
 * El modelo queda congelado caido y el overlay aparece en ese instante exacto.
 *
 * Patron identico a LevelUpModal:
 *   - overlay en #ui-center
 *   - .hidden toggle para mostrar/ocultar
 *   - escucha EventBus, no sabe nada de game/
 *
 * Botones:
 *   Reiniciar          -> window.location.reload()
 *   Conocimiento adquirido -> placeholder para el Codex (proxima sprint)
 */

import { eventBus } from '@/core/EventBus';

export class GameOverModal {
  private readonly overlay: HTMLElement;
  private readonly container: HTMLElement;
  private _isShowing = false;

  constructor() {
    this.overlay   = this._buildOverlay();
    this.container = this._buildContainer();
    this.overlay.appendChild(this.container);

    const center = document.getElementById('ui-center') ?? document.body;
    center.appendChild(this.overlay);

    // Botones se enlazan una sola vez (contenido estatico)
    this._bindButtons();

    // Mostrar el overlay cuando la animacion de muerte haya terminado realmente.
    // 'player:death-anim-end' lo emite PlayerController al final de Death_A
    // (o de inmediato si el personaje no tiene animacion de muerte).
    eventBus.on('player:death-anim-end', () => {
      if (this._isShowing) { return; }
      this.show();
    });
  }

  // ─── DOM ──────────────────────────────────────────────────────────────────

  private _buildOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'gameover-overlay';
    el.classList.add('hidden');
    return el;
  }

  private _buildContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'gameover-modal';
    el.innerHTML = `
      <div class="gameover-ornament">&#10022;</div>
      <h1 class="gameover-title">HAS PERECIDO</h1>
      <div class="gameover-divider"></div>
      <p class="gameover-flavor">Tus huesos adornar&#225;n estas piedras por siempre.</p>
      <div class="gameover-buttons">
        <button id="gameover-restart-btn" class="gameover-btn gameover-btn--primary">
          Reiniciar
        </button>
        <button id="gameover-codex-btn" class="gameover-btn gameover-btn--ghost">
          Conocimiento adquirido
        </button>
      </div>
      <div id="gameover-codex-panel" class="gameover-codex-panel hidden">
        <p class="gameover-codex-text">
          Pr&#243;ximamente: aqu&#237; ver&#225;s los vectores e interacciones
          que has descubierto en esta run.
        </p>
      </div>
    `;
    return el;
  }

  // ─── Show ─────────────────────────────────────────────────────────────────

  show(): void {
    this._isShowing = true;
    this.overlay.classList.remove('hidden');
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  private _bindButtons(): void {
    // Reiniciar: recarga la pagina completa (forma mas simple y robusta)
    const restartBtn = this.container.querySelector<HTMLButtonElement>('#gameover-restart-btn');
    restartBtn?.addEventListener('click', () => {
      window.location.reload();
    });

    // Conocimiento adquirido: placeholder del Codex (toggle del panel inferior)
    const codexBtn   = this.container.querySelector<HTMLButtonElement>('#gameover-codex-btn');
    const codexPanel = this.container.querySelector<HTMLElement>('#gameover-codex-panel');
    codexBtn?.addEventListener('click', () => {
      codexPanel?.classList.toggle('hidden');
    });
  }

  // ─── Dispose ─────────────────────────────────────────────────────────────

  dispose(): void {
    this.overlay.remove();
  }
}
