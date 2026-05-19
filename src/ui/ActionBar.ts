/**
 * ActionBar -- barra de acciones inferior central, estilo Hades/Diablo.
 *
 * Fija en el borde inferior central de la pantalla.
 * Botones visibles con icono emoji + etiqueta + tecla rapida.
 * El boton del panel activo queda resaltado visualmente.
 *
 * Gestiona TODOS los atajos de teclado de paneles (I / C / Escape)
 * para que InventoryUI y CharacterSheet no necesiten sus propios listeners.
 */

import type { PanelManager, PanelId } from '@/ui/PanelManager';

interface BtnDef {
  readonly id: PanelId;
  readonly icon: string;
  readonly label: string;
  readonly key: string;
  readonly code: string;
}

const BTN_DEFS: readonly BtnDef[] = [
  { id: 'inventory', icon: '🎒', label: 'MOCHILA',   key: 'I', code: 'KeyI' },
  { id: 'character', icon: '📜', label: 'PERSONAJE', key: 'C', code: 'KeyC' },
];

export class ActionBar {
  private el: HTMLElement;
  private btnMap: Map<PanelId, HTMLButtonElement> = new Map();
  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(private readonly panelManager: PanelManager) {
    this.el = this.buildBar();
    document.body.appendChild(this.el);

    // Actualizar resaltado cuando el PanelManager cambia de panel activo
    panelManager.onActiveChange((active) => this.updateHighlight(active));

    // Atajos de teclado globales para paneles
    this._onKeyDown = (e: KeyboardEvent): void => {
      const def = BTN_DEFS.find((d) => d.code === e.code);
      if (def !== undefined) {
        panelManager.toggle(def.id);
        return;
      }
      if (e.code === 'Escape') {
        panelManager.closeAll();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  private buildBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.id = 'action-bar';

    for (const def of BTN_DEFS) {
      const btn = document.createElement('button');
      btn.classList.add('action-btn');
      btn.dataset['panelId'] = def.id;
      btn.innerHTML = `
        <div class="action-btn-icon">${def.icon}</div>
        <div class="action-btn-label">${def.label}</div>
        <div class="action-btn-key">[${def.key}]</div>
      `;
      btn.addEventListener('click', () => this.panelManager.toggle(def.id));
      this.btnMap.set(def.id, btn);
      bar.appendChild(btn);
    }

    return bar;
  }

  private updateHighlight(active: PanelId | null): void {
    for (const [id, btn] of this.btnMap) {
      btn.classList.toggle('action-btn--active', id === active);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    this.el.remove();
  }
}
