/**
 * InitiativeTracker -- cola animada de turnos (estilo BG3).
 *
 * Arquitectura: ESTADO separado de PRESENTACIÓN.
 *
 * Estado lógico (_queue + _cardEls): se actualiza SÍNCRONAMENTE en cada
 * llamada pública. Siempre refleja el turno real, a cualquier velocidad.
 *
 * Animación de salida (_leavingCard): puramente decorativa, interrumpible en
 * cualquier momento mediante _snapLeaving(). Si advance() llega antes de que
 * termine la animación anterior, hace snap instantáneo y arranca limpio.
 *
 * Invariantes garantizados tras cualquier método público:
 *   - _queue[i] ↔ _cardEls[i]  (siempre sincronizados)
 *   - _cardEls[0]               (siempre tiene init-card--current)
 *   - _leavingCard              (nunca tiene init-card--current)
 *   - máximo 1 elemento saliente en el DOM en todo momento
 */

import type { TurnCombatant } from '@/game/combat/InitiativeSystem';

/** Duración de la animación de salida en ms (debe coincidir con @keyframes initCardLeave en CSS). */
const LEAVE_MS = 280;

export class InitiativeTracker {

  private readonly _el: HTMLElement;

  // ── Estado lógico ────────────────────────────────────────────────────────────
  /** Combatientes en cola, en orden. Index 0 = turno activo. */
  private _queue:   TurnCombatant[] = [];
  /** Elementos DOM paralelos a _queue. _cardEls[i] ↔ _queue[i] siempre. */
  private _cardEls: HTMLElement[]   = [];

  // ── Animación de salida ──────────────────────────────────────────────────────
  /** Elemento DOM animando su salida (fuera de _queue/_cardEls). Null si no hay animación. */
  private _leavingCard: HTMLElement | null                    = null;
  /** Timer para limpiar _leavingCard del DOM tras la animación. */
  private _leaveTimer:  ReturnType<typeof setTimeout> | null = null;

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
    this._snapLeaving();      // cancela animación en curso si la hay
    this._queue   = [...queue];
    this._cardEls = [];
    this._el.innerHTML = '';

    for (const entry of queue) {
      const card = this._buildCard(entry);
      this._el.appendChild(card);
      this._cardEls.push(card);
    }
    this._markFirst();
  }

  /**
   * Avanza la cola: el turno actual sale (animado) y newEntry se añade al final.
   * No bloqueante: la animación de salida es puramente decorativa y snapeable.
   *
   * Si advance() se llama antes de que termine la animación anterior, el elemento
   * saliente previo hace snap instantáneo (desaparece del DOM en el mismo frame)
   * y la nueva animación arranca desde un estado limpio.
   *
   * @param newEntry  Entrada que se añade por la derecha para mantener la cola llena.
   */
  advance(newEntry: TurnCombatant): void {
    if (this._queue.length === 0) { return; }

    // 1. SNAP: cancela animación de salida anterior si la hay.
    //    Garantiza máximo 1 elemento saliente en el DOM en todo momento.
    this._snapLeaving();

    // 2. Extraer el primer elemento de _queue Y _cardEls (síncrono).
    const leavingEl = this._cardEls.shift();
    this._queue.shift();
    if (leavingEl === undefined) { return; }

    // 3. Quitar el resaltado ANTES de empezar la animación de salida.
    //    _markFirst() solo itera _cardEls (que ya no contiene leavingEl),
    //    por lo que sin esta línea el saliente conservaría --current durante la animación.
    leavingEl.classList.remove('init-card--current');

    // 4. Actualizar estado lógico con el nuevo tail (síncrono).
    this._queue.push(newEntry);
    const newCard = this._buildCard(newEntry);
    this._el.appendChild(newCard);
    this._cardEls.push(newCard);

    // 5. Resaltar el nuevo primer turno — estado correcto, sin timers.
    this._markFirst();

    // 6. Animación de salida: CSS puro vía @keyframes initCardLeave.
    //    Interrumpible en cualquier momento con _snapLeaving().
    leavingEl.classList.add('init-card--leaving');
    this._leavingCard = leavingEl;
    this._leaveTimer  = setTimeout(() => {
      this._snapLeaving();
    }, LEAVE_MS + 10);
  }

  /**
   * Recalcula y reemplaza la cola completa con una cross-fade suave.
   * Llamar cuando cambia el orden de iniciativa en pleno combate
   * (ej. después de updateCombatantDex).
   */
  refreshQueue(newQueue: TurnCombatant[]): void {
    this._snapLeaving();   // limpia saliente antes del rebuild
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
    this._snapLeaving();
    this.hide();
    if (this._el.parentNode !== null) { this._el.remove(); }
    this._queue.length   = 0;
    this._cardEls.length = 0;
  }

  // -- Internals -----------------------------------------------------------------

  /**
   * Cancela y limpia instantáneamente cualquier animación de salida en curso.
   * Siempre seguro llamar aunque no haya animación activa (no-op si _leavingCard === null).
   */
  private _snapLeaving(): void {
    if (this._leaveTimer !== null) {
      clearTimeout(this._leaveTimer);
      this._leaveTimer = null;
    }
    if (this._leavingCard !== null) {
      this._leavingCard.remove();
      this._leavingCard = null;
    }
  }

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

  /**
   * Marca _cardEls[0] como turno actual y elimina --current del resto.
   * Opera SOLO sobre _cardEls — nunca toca _leavingCard.
   * Resultado siempre correcto independientemente del estado de la animación de salida.
   */
  private _markFirst(): void {
    for (const card of this._cardEls) {
      card.classList.remove('init-card--current');
    }
    const first = this._cardEls[0];
    if (first !== undefined) {
      first.classList.add('init-card--current');
    }
  }
}
