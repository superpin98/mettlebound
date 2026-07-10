/**
 * GameOverModal -- overlay de muerte del jugador.
 *
 * Se muestra cuando recibe 'player:death-anim-end':
 *   - En combate: emitido por main.ts al terminar playerEntityCombat.playDeathAnim()
 *   - En exploración: emitido por PlayerController al terminar Death_A
 *
 * Escucha también 'player:death' para capturar la causa antes de mostrarse.
 * En exploración el payload es null → no se muestra causa.
 *
 * Patrón idéntico a LevelUpModal:
 *   - overlay en #ui-center
 *   - clases CSS .hidden / .visible para el fade
 *   - escucha EventBus, no sabe nada de game/
 */

import { eventBus } from '@/core/EventBus';

export class GameOverModal {
  private readonly overlay: HTMLElement;
  private readonly container: HTMLElement;
  private _isShowing = false;
  /** Causa de muerte capturada desde player:death antes de que llegue player:death-anim-end. */
  private _pendingCause: string | null = null;

  constructor() {
    this.overlay   = this._buildOverlay();
    this.container = this._buildContainer();
    this.overlay.appendChild(this.container);

    const center = document.getElementById('ui-center') ?? document.body;
    center.appendChild(this.overlay);

    this._bindButtons();

    // Capturar la causa en cuanto el jugador muere (antes que la animación termine).
    eventBus.on('player:death', (event) => {
      this._pendingCause = event?.cause ?? null;
    });

    // Mostrar el overlay cuando la animación de muerte haya terminado realmente.
    eventBus.on('player:death-anim-end', () => {
      if (this._isShowing) { return; }
      this.show(this._pendingCause);
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
      <div class="gameover-ornament">&#8224;</div>
      <h1 class="gameover-title">HAS PERECIDO</h1>
      <div class="gameover-divider"></div>
      <p class="gameover-cause hidden" id="gameover-cause"></p>
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

  show(cause: string | null): void {
    this._isShowing = true;

    // Actualizar causa si la hay
    const causeEl = this.container.querySelector<HTMLElement>('#gameover-cause');
    if (causeEl !== null) {
      if (cause !== null && cause.length > 0) {
        causeEl.textContent = cause;
        causeEl.classList.remove('hidden');
      } else {
        causeEl.classList.add('hidden');
      }
    }

    // Mostrar overlay con fade-in: quitar .hidden primero (display:flex),
    // luego en el siguiente frame añadir .visible (opacity: 1 via CSS transition).
    this.overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.overlay.classList.add('visible');
      });
    });
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  private _bindButtons(): void {
    const restartBtn = this.container.querySelector<HTMLButtonElement>('#gameover-restart-btn');
    restartBtn?.addEventListener('click', () => {
      window.location.reload();
    });

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
