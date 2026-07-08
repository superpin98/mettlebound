/**
 * MovementBar -- indicador visual de puntos de movimiento restantes.
 *
 * UI de producto: muestra cuantos PM le quedan al jugador en el turno actual.
 * Se actualiza en tiempo real durante la caminata (llamar setCurrent() cada frame).
 *
 * Estructura DOM:
 *   #movement-bar
 *     .mov-bar-label   "MOV"
 *     .mov-bar-track   (fondo gris)
 *       .mov-bar-fill  (relleno verde, width% proporcional)
 *     .mov-bar-text    "3.5 / 8"
 *
 * Uso:
 *   const bar = new MovementBar();
 *   bar.setMax(8);
 *   bar.setCurrent(5.5);  // llamar cada frame durante la caminata
 *   bar.dispose();
 *
 * Estilo provisional: DOM/CSS funcional.
 * Reestilizable en el UI Pass sin reescribir esta clase.
 */

export class MovementBar {

  private readonly _container: HTMLDivElement;
  private readonly _fill:      HTMLDivElement;
  private readonly _text:      HTMLSpanElement;

  private _max     = 1;
  private _current = 1;

  constructor() {
    // -- Contenedor principal ---------------------------------------------------
    this._container = document.createElement('div');
    this._container.id = 'movement-bar';

    // -- Label "MOV" -----------------------------------------------------------
    const label = document.createElement('span');
    label.className   = 'mov-bar-label';
    label.textContent = 'MOV';

    // -- Track (fondo) + fill (barra verde) ------------------------------------
    const track = document.createElement('div');
    track.className = 'mov-bar-track';

    this._fill = document.createElement('div');
    this._fill.className = 'mov-bar-fill';
    track.appendChild(this._fill);

    // -- Texto numerico --------------------------------------------------------
    this._text = document.createElement('span');
    this._text.className = 'mov-bar-text';

    // -- Montar en DOM ---------------------------------------------------------
    this._container.appendChild(label);
    this._container.appendChild(track);
    this._container.appendChild(this._text);
    document.body.appendChild(this._container);

    this._refresh();
  }

  // -- API publica --------------------------------------------------------------

  /**
   * Fija el maximo de la barra (MP del jugador al inicio del turno / de la run).
   * Llamar al activar el sistema de movimiento.
   */
  setMax(max: number): void {
    this._max = Math.max(1, max);
    this._refresh();
  }

  /**
   * Actualiza el valor actual. Llamar cada frame durante la caminata.
   * El valor se clampa a [0, max].
   */
  setCurrent(current: number): void {
    this._current = Math.max(0, Math.min(this._max, current));
    this._refresh();
  }

  /** Muestra la barra. Llamar al activar el sistema de movimiento. */
  show(): void { this._container.classList.remove('mov-bar-hidden'); }

  /** Oculta la barra. Llamar al desactivar o en exploracion. */
  hide(): void { this._container.classList.add('mov-bar-hidden'); }

  /** Elimina el elemento del DOM. Llamar al destruir el sistema de movimiento. */
  dispose(): void {
    this._container.remove();
  }

  // -- Logica interna -----------------------------------------------------------

  private _refresh(): void {
    const pct = this._max > 0 ? (this._current / this._max) * 100 : 0;
    this._fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;

    // Texto: mostrar 1 decimal solo si hay fraccion significativa
    const rounded = Math.round(this._current * 10) / 10;
    const maxInt  = this._max;
    const curStr  = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    this._text.textContent = `${curStr} / ${maxInt}`;
  }
}
