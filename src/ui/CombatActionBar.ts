/**
 * CombatActionBar -- barra de acciones de combate (estilo BG3).
 *
 * Centro-abajo, colapsable, con tres pestañas:
 *   Principal   → acciones de coste principal (hoy: Atacar)
 *   Secundaria  → acciones de coste secundario (hoy: sin acciones)
 *   Todas       → todas las acciones disponibles
 *
 * Estado de cada acción: disponible / gastada / sin-turno, leído de
 * CombatActionBudget (que ya está recargado cuando llega combat:turn-start).
 *
 * El FLUJO de selección (clic → objetivo → ejecutar) es pieza 4c.
 * Por ahora, clicar una acción solo registra en consola.
 *
 * Responsividad:
 *   - Ancho: clamp(280px, 55vw, 600px)
 *   - Fuentes: clamp(…)
 *   - Sin píxeles fijos de layout; centrado via left:0/right:0 + align-items:center
 */

import { eventBus }           from '@/core/EventBus';
import type { CombatActionBudget, ActionCostType } from '@/game/combat/CombatActionBudget';
import { logger }             from '@/core/Logger';

// ── Tipos internos ─────────────────────────────────────────────────────────────

type TabId = 'principal' | 'secondary' | 'all';

interface ActionDef {
  readonly id:       string;
  readonly name:     string;
  readonly icon:     string;
  readonly costType: ActionCostType;
  /** En qué pestañas aparece esta acción. */
  readonly tabs:     ReadonlyArray<TabId>;
}

// ── Catálogo de acciones (hoy solo Atacar) ─────────────────────────────────────

const ACTIONS: readonly ActionDef[] = [
  {
    id:       'attack',
    name:     'Atacar',
    icon:     '⚔️',
    costType: 'principal',
    tabs:     ['principal', 'all'],
  },
] as const;

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'principal', label: 'Principal'  },
  { id: 'secondary', label: 'Secundaria' },
  { id: 'all',       label: 'Todas'      },
] as const;

// ── Clase ──────────────────────────────────────────────────────────────────────

export class CombatActionBar {

  private readonly _budget:   CombatActionBudget;
  private readonly _root:     HTMLElement;
  private readonly _body:     HTMLElement;
  private readonly _collapseBtn: HTMLButtonElement;

  private _isPlayerTurn = false;
  private _isCollapsed  = false;
  private _activeTab: TabId = 'principal';

  /** panel DOM por tabId */
  private readonly _panels: Map<TabId, HTMLElement> = new Map();
  /** lista de botones de acción por actionId (pueden aparecer en varias tabs) */
  private readonly _actionBtns: Map<string, HTMLButtonElement[]> = new Map();

  /** Guardado para poder desuscribir en dispose(). */
  private readonly _turnHandler: (p: {
    combatantId: string;
    isPlayer:    boolean;
    turnNumber:  number;
  }) => void;

  constructor(budget: CombatActionBudget) {
    this._budget = budget;
    this._root   = this._buildDOM();

    // Referencias cacheadas después de buildDOM
    this._body        = this._root.querySelector('.cab-body')         as HTMLElement;
    this._collapseBtn = this._root.querySelector('.cab-collapse-btn') as HTMLButtonElement;

    // Toggle de colapso
    this._collapseBtn.addEventListener('click', () => { this._toggleCollapse(); });

    // Clicks en tabs
    this._root.querySelectorAll<HTMLElement>('.cab-tab').forEach(tab => {
      const id = tab.dataset['tabId'] as TabId | undefined;
      if (id !== undefined) {
        tab.addEventListener('click', () => { this._setTab(id); });
      }
    });

    // Clicks en acciones — stub 4c
    this._root.querySelectorAll<HTMLButtonElement>('.cab-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) { return; }
        const actionId = btn.dataset['actionId'] ?? '?';
        logger.info('CombatActionBar: acción seleccionada (flujo 4c pendiente)', { actionId });
        // TODO 4c: iniciar flujo de selección de objetivo
      });
    });

    // Suscribir al inicio de turno
    this._turnHandler = ({ isPlayer }) => {
      this._isPlayerTurn = isPlayer;
      this._refreshButtons();
    };
    eventBus.on('combat:turn-start', this._turnHandler);

    // Empieza oculta
    this._root.classList.add('cab--hidden');
    document.body.appendChild(this._root);
  }

  // ── API pública ────────────────────────────────────────────────────────────────

  /** Muestra la barra al entrar en combate. */
  show(): void {
    this._root.classList.remove('cab--hidden');
    this._refreshButtons();
  }

  /** Oculta la barra al salir del combate. */
  hide(): void {
    this._root.classList.add('cab--hidden');
    this._isPlayerTurn = false;
  }

  /**
   * Refresca el estado habilitado/deshabilitado.
   * Llamar desde 4c después de consumir una acción.
   */
  refresh(): void {
    this._refreshButtons();
  }

  /** Limpia listeners y elimina el nodo del DOM. */
  dispose(): void {
    eventBus.off('combat:turn-start', this._turnHandler);
    this._root.remove();
  }

  // ── Construcción del DOM ───────────────────────────────────────────────────────

  private _buildDOM(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'combat-action-bar';

    // ── Cuerpo (pestañas + paneles de acciones) ──────────────────────────────
    const body = document.createElement('div');
    body.className = 'cab-body';

    // Fila de pestañas
    const tabRow = document.createElement('div');
    tabRow.className = 'cab-tabs';

    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = 'cab-tab';
      btn.dataset['tabId'] = tab.id;
      btn.textContent = tab.label;
      if (tab.id === this._activeTab) { btn.classList.add('cab-tab--active'); }
      tabRow.appendChild(btn);
    }

    // Paneles de acciones
    const panelsWrapper = document.createElement('div');
    panelsWrapper.className = 'cab-panels';

    for (const tab of TABS) {
      const panel = document.createElement('div');
      panel.className = 'cab-panel';
      panel.dataset['panelId'] = tab.id;
      if (tab.id !== this._activeTab) { panel.classList.add('cab-panel--hidden'); }

      const actionsForTab = ACTIONS.filter(a => a.tabs.includes(tab.id));

      if (actionsForTab.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'cab-empty';
        empty.textContent = 'Sin acciones disponibles';
        panel.appendChild(empty);
      } else {
        for (const action of actionsForTab) {
          const btn = this._buildActionBtn(action);
          panel.appendChild(btn);

          const list = this._actionBtns.get(action.id) ?? [];
          list.push(btn);
          this._actionBtns.set(action.id, list);
        }
      }

      panelsWrapper.appendChild(panel);
      this._panels.set(tab.id, panel);
    }

    body.appendChild(tabRow);
    body.appendChild(panelsWrapper);

    // ── Botón de colapso (ancla siempre visible) ─────────────────────────────
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'cab-collapse-btn';
    collapseBtn.title     = 'Mostrar/ocultar acciones [Z]';

    const collapseIcon = document.createElement('span');
    collapseIcon.className   = 'cab-collapse-icon';
    collapseIcon.textContent = '▼';
    collapseBtn.appendChild(collapseIcon);

    // DOM order: body primero (arriba), collapse btn después (abajo, pegado al borde)
    root.appendChild(body);
    root.appendChild(collapseBtn);

    return root;
  }

  private _buildActionBtn(action: ActionDef): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'cab-action-btn';
    btn.dataset['actionId'] = action.id;
    btn.dataset['costType'] = action.costType;

    const icon = document.createElement('span');
    icon.className   = 'cab-action-icon';
    icon.textContent = action.icon;
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className   = 'cab-action-name';
    name.textContent = action.name;

    // Indicador del tipo de coste (● dorado = principal, ● azul = secundaria)
    const dot = document.createElement('span');
    dot.className = `cab-action-cost cab-action-cost--${action.costType}`;
    dot.textContent = '●';
    dot.title = action.costType === 'principal' ? 'Acción principal' : 'Acción secundaria';

    btn.appendChild(icon);
    btn.appendChild(name);
    btn.appendChild(dot);
    return btn;
  }

  // ── Estado ─────────────────────────────────────────────────────────────────────

  private _refreshButtons(): void {
    for (const action of ACTIONS) {
      const btns      = this._actionBtns.get(action.id) ?? [];
      const budgetOk  = this._budget.isAvailable(action.costType);
      const available = this._isPlayerTurn && budgetOk;

      for (const btn of btns) {
        btn.disabled = !available;

        // Clases de estado visual (CSS puede aprovecharlas para iconos/tooltips futuros)
        btn.classList.toggle('cab-action--spent',   this._isPlayerTurn && !budgetOk);
        btn.classList.toggle('cab-action--no-turn', !this._isPlayerTurn);
      }
    }
  }

  private _setTab(id: TabId): void {
    if (id === this._activeTab) { return; }
    this._activeTab = id;

    this._panels.forEach((panel, tabId) => {
      panel.classList.toggle('cab-panel--hidden', tabId !== id);
    });

    this._root.querySelectorAll<HTMLElement>('.cab-tab').forEach(tab => {
      tab.classList.toggle('cab-tab--active', tab.dataset['tabId'] === id);
    });
  }

  private _toggleCollapse(): void {
    this._isCollapsed = !this._isCollapsed;
    this._body.classList.toggle('cab-body--collapsed', this._isCollapsed);
    const icon = this._collapseBtn.querySelector('.cab-collapse-icon');
    if (icon !== null) {
      icon.textContent = this._isCollapsed ? '▲' : '▼';
    }
  }
}
