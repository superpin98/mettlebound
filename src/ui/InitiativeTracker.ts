/**
 * InitiativeTracker -- cola animada de turnos (estilo BG3).
 *
 * Muestra los próximos QUEUE_SIZE turnos como una fila horizontal.
 * El turno EN CURSO es siempre la tarjeta de la izquierda.
 *
 * Cuando el turno avanza (llamando a advance()):
 *   1. La tarjeta actual (izquierda) desaparece con fade + shrink.
 *   2. El resto se deslizan hacia la izquierda (CSS overflow + width → 0).
 *   3. Una nueva tarjeta aparece por la derecha (fade in).
 *
 * El tracker NO conoce la lógica de turnos ni el orden de combate:
 * recibe una cola inicial y luego una entrada nueva en cada avance.
 * Esto lo hace reutilizable con cualquier InitiativeCalculator externo.
 */

import type { TurnCombatant } from '@/game/combat/InitiativeSystem';

/** Duración de la animación de salida en ms. */
const LEAVE_MS  = 280;
/** Duración de la animación de entrada en ms. */
const ENTER_MS  = 200;

export class InitiativeTracker {

  private readonly _el:    HTMLElement;
  /** Tarjetas visibles en orden (index 0 = turno actual). */
  private readonly _cards: HTMLElement[] = [];

  constructor() {
    this._el = document.createElement('div');
    this._el.id = 'initiative-tracker';
    this._el.classList.add('initiative-tracker--hidden');
    document.body.appendChild(this._el);
  }

  // -- API pública ---------------------------------------------------------------

  /**
   * Rellena la cola con los primeros turnos.
   * Llamar UNA VEZ antes de show(), desde CombatTurnSystem.start().
   */
  initQueue(queue: TurnCombatant[]): void {
    this._el.innerHTML = '';
    this._cards.length = 0;

    for (const entry of queue) {
      const card = this._buildCard(entry);
      this._el.appendChild(card);
      this._cards.push(card);
    }
    this._markFirst();
  }

  /**
   * Avanza la cola: anima la salida del turno actual y añade newEntry al final.
   * No bloqueante: la animación ocurre en segundo plano.
   *
   * @param newEntry  Entrada que se añade por la derecha para mantener la cola llena.
   */
  advance(newEntry: TurnCombatant): void {
    const leaving = this._cards[0];
    if (leaving === undefined) { return; }

    // Preparar nueva tarjeta (invisible, ya en el DOM para que el layout la incluya)
    const newCard = this._buildCard(newEntry);
    newCard.style.opacity   = '0';
    newCard.style.transform = 'scale(0.7)';
    newCard.style.transition = 'none';
    this._el.appendChild(newCard);
    this._cards.push(newCard);

    // Animar salida: width → 0 + margin-right → 0 + opacity → 0
    // (width: 58px está definido en CSS, por lo que la transición funciona)
    requestAnimationFrame(() => {
      leaving.style.transition = [
        `width ${LEAVE_MS}ms ease`,
        `margin-right ${LEAVE_MS}ms ease`,
        `padding-left ${LEAVE_MS}ms ease`,
        `padding-right ${LEAVE_MS}ms ease`,
        `opacity ${Math.round(LEAVE_MS * 0.78)}ms ease`,
        `border-width ${LEAVE_MS}ms ease`,
      ].join(', ');
      leaving.style.width        = '0';
      leaving.style.marginRight  = '0';
      leaving.style.paddingLeft  = '0';
      leaving.style.paddingRight = '0';
      leaving.style.borderWidth  = '0';
      leaving.style.opacity      = '0';

      setTimeout(() => {
        leaving.remove();
        this._cards.shift();
        this._markFirst();

        // Animar entrada de la nueva tarjeta (ya está en el DOM a la derecha)
        requestAnimationFrame(() => {
          newCard.style.transition = [
            `opacity ${ENTER_MS}ms ease`,
            `transform ${ENTER_MS}ms ease`,
          ].join(', ');
          newCard.style.opacity   = '1';
          newCard.style.transform = '';
        });
      }, LEAVE_MS + 10);
    });
  }

  /**
   * Recalcula y reemplaza la cola completa con una cross-fade suave.
   * Llamar cuando cambia el orden de iniciativa en pleno combate
   * (ej. después de updateCombatantDex).
   *
   * La animación: fade out (110ms) → initQueue → fade in (200ms).
   * No bloquea: la actualización ocurre en segundo plano.
   */
  refreshQueue(newQueue: TurnCombatant[]): void {
    const FADE_OUT_MS = 110;
    const FADE_IN_MS  = 200;
    this._el.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    this._el.style.opacity    = '0';
    setTimeout(() => {
      this.initQueue(newQueue);
      requestAnimationFrame(() => {
        this._el.style.transition = `opacity ${FADE_IN_MS}ms ease`;
        this._el.style.opacity    = '1';
      });
    }, FADE_OUT_MS + 10);
  }

  /** Hace visible el tracker. */
  show(): void { this._el.classList.remove('initiative-tracker--hidden'); }

  /** Oculta el tracker. */
  hide(): void { this._el.classList.add('initiative-tracker--hidden'); }

  /** Oculta y elimina el elemento del DOM. */
  dispose(): void {
    this.hide();
    if (this._el.parentNode !== null) { this._el.remove(); }
    this._cards.length = 0;
  }

  // -- Internals -----------------------------------------------------------------

  /** Construye una tarjeta DOM para un combatiente. */
  private _buildCard(entry: TurnCombatant): HTMLElement {
    const card = document.createElement('div');
    card.classList.add('init-card');
    card.dataset['combatantId'] = entry.id;

    const icon = document.createElement('div');
    icon.classList.add('init-card__icon');
    icon.textContent = entry.icon;

    const name = document.createElement('div');
    name.classList.add('init-card__name');
    name.textContent = entry.displayName;

    card.appendChild(icon);
    card.appendChild(name);
    return card;
  }

  /** Marca la primera tarjeta de la cola como turno actual. */
  private _markFirst(): void {
    for (const card of this._cards) {
      card.classList.remove('init-card--current');
    }
    const first = this._cards[0];
    if (first !== undefined) {
      first.classList.add('init-card--current');
    }
  }
}
