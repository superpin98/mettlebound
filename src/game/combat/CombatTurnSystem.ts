/**
 * CombatTurnSystem -- ciclo de turnos táctico.
 *
 * Gestiona el orden de turno entre combatientes.
 * Diseñado para ser modular: el orden se pasa externamente (calculado por
 * un futuro InitiativeCalculator basado en DEX/LCK) y puede incluir
 * repeticiones para double-turns.
 *
 * Flujo básico (2 combatientes):
 *   start() → turno del jugador (PM recargados, clicks habilitados)
 *   endPlayerTurn() / botón → turno del enemigo (auto-pasa con delay)
 *   → turno del jugador de nuevo → ...
 *
 * Tracker: al arrancar rellena una cola de QUEUE_SIZE turnos próximos.
 * Cada vez que avanza un turno llama a tracker.advance(nuevaEntrada)
 * para que la cola se deslice por la izquierda y rellene por la derecha.
 *
 * Eventos emitidos:
 *   'combat:turn-start' — inicio de cualquier turno
 *   'combat:turn-end'   — fin de cualquier turno
 */

import type { CombatMovementSystem } from '@/game/combat/CombatMovementSystem';
import type { InitiativeTracker }    from '@/ui/InitiativeTracker';
import { eventBus }                  from '@/core/EventBus';
import { logger }                    from '@/core/Logger';

/** Entrada en el orden de turno. El mismo combatiente puede aparecer varias veces. */
export interface TurnCombatant {
  /** ID único que coincide con el occupantId en el grid. */
  id:          string;
  /** Nombre mostrado en el InitiativeTracker. */
  displayName: string;
  /** Icono (emoji o glifo) mostrado en el InitiativeTracker. */
  icon:        string;
  /** true = controlado por el jugador; false = auto-pasa (IA). */
  isPlayer:    boolean;
}

/** Milisegundos que Rusty "piensa" antes de auto-pasar. */
const ENEMY_AUTO_PASS_MS = 700;

/**
 * Número de turnos próximos mostrados en el InitiativeTracker.
 * Con 2 combatientes: [J, R, J, R, J, R, J, R, J, R].
 */
const QUEUE_SIZE = 10;

export class CombatTurnSystem {

  private readonly _order:      TurnCombatant[];
  private readonly _movSys:     CombatMovementSystem;
  private readonly _tracker:    InitiativeTracker;
  private readonly _endTurnBtn: HTMLButtonElement;

  private _activeIdx        = 0;
  private _turnNumber       = 0;
  private _roundNumber      = 1;
  private _isRunning        = false;
  /**
   * Posición absoluta (sin módulo) del último elemento de la cola visible
   * en el tracker. Se incrementa en cada avance para calcular el nuevo
   * elemento que entra por la derecha.
   */
  private _queueAbsTailPos  = 0;

  /** Handle del setTimeout del turno enemigo, para cancelarlo en dispose(). */
  private _enemyTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param order       Lista de combatientes en orden de turno.
   * @param movSys      Sistema de movimiento del jugador.
   * @param tracker     HUD de iniciativa.
   * @param endTurnBtn  Botón "Terminar turno" del DOM.
   */
  constructor(
    order:      TurnCombatant[],
    movSys:     CombatMovementSystem,
    tracker:    InitiativeTracker,
    endTurnBtn: HTMLButtonElement,
  ) {
    this._order      = order;
    this._movSys     = movSys;
    this._tracker    = tracker;
    this._endTurnBtn = endTurnBtn;

    endTurnBtn.addEventListener('click', () => { this.endPlayerTurn(); });
  }

  // -- API pública ---------------------------------------------------------------

  /** Arranca el ciclo de turnos. El primer combatiente de order va primero. */
  start(): void {
    if (this._isRunning) { return; }
    this._isRunning       = true;
    this._activeIdx       = 0;
    this._turnNumber      = 0;
    this._roundNumber     = 1;
    this._queueAbsTailPos = QUEUE_SIZE - 1;

    // Rellenar la cola inicial del tracker con los próximos QUEUE_SIZE turnos
    this._tracker.initQueue(this._buildQueue(0, QUEUE_SIZE));
    this._tracker.show();
    this._activateTurn(0);
  }

  /**
   * Termina el turno del jugador.
   * Llamado por el botón "Terminar turno" o por código externo.
   * No hace nada si no es turno del jugador.
   */
  endPlayerTurn(): void {
    const current = this._order[this._activeIdx];
    if (current === undefined || !current.isPlayer) { return; }
    if (!this._isRunning) { return; }

    this._endTurnBtn.disabled = true;
    this._movSys.setPlayerTurnActive(false);
    this._advanceToNext();
  }

  /** Limpia timers y oculta el tracker. Llamar al salir de combate. */
  dispose(): void {
    if (this._enemyTimer !== null) {
      clearTimeout(this._enemyTimer);
      this._enemyTimer = null;
    }
    this._tracker.hide();
    this._endTurnBtn.disabled = true;
    this._isRunning = false;
  }

  // -- Internals -----------------------------------------------------------------

  private _activateTurn(idx: number): void {
    this._activeIdx = idx;
    this._turnNumber++;

    // Nueva ronda: volvemos al primer combatiente (tras el turno inicial)
    if (idx === 0 && this._turnNumber > 1) {
      this._roundNumber++;
      logger.debug('CombatTurnSystem: nueva ronda', { roundNumber: this._roundNumber });
    }

    const combatant = this._order[idx];
    if (combatant === undefined) { return; }

    // Nota: el tracker ya actualizó su estado visual en _advanceToNext()
    // (via tracker.advance()). Aquí solo necesitamos la lógica de turno.

    eventBus.emit('combat:turn-start', {
      combatantId: combatant.id,
      isPlayer:    combatant.isPlayer,
      turnNumber:  this._turnNumber,
    });

    logger.info('CombatTurnSystem: turno activado', {
      idx,
      id:          combatant.id,
      isPlayer:    combatant.isPlayer,
      turnNumber:  this._turnNumber,
      roundNumber: this._roundNumber,
    });

    if (combatant.isPlayer) {
      this._doPlayerTurn();
    } else {
      this._doEnemyTurn(combatant);
    }
  }

  private _doPlayerTurn(): void {
    this._movSys.setPlayerTurnActive(true);
    this._movSys.reloadMovement();
    this._endTurnBtn.disabled = false;
  }

  private _doEnemyTurn(combatant: TurnCombatant): void {
    this._endTurnBtn.disabled = true;
    this._movSys.setPlayerTurnActive(false);

    logger.debug('CombatTurnSystem: turno de enemigo — auto-paso', { id: combatant.id });

    // Rusty "piensa" un momento antes de pasar
    this._enemyTimer = setTimeout(() => {
      this._enemyTimer = null;
      if (!this._isRunning) { return; }
      this._advanceToNext();
    }, ENEMY_AUTO_PASS_MS);
  }

  private _advanceToNext(): void {
    const current = this._order[this._activeIdx];
    if (current !== undefined) {
      eventBus.emit('combat:turn-end', { combatantId: current.id });
    }

    // Calcular el nuevo elemento que entra por la derecha del tracker
    this._queueAbsTailPos++;
    const newTailEntry = this._order[this._queueAbsTailPos % this._order.length];
    if (newTailEntry !== undefined) {
      this._tracker.advance(newTailEntry);
    }

    const nextIdx = (this._activeIdx + 1) % this._order.length;
    this._activateTurn(nextIdx);
  }

  /**
   * Construye un array de 'count' entradas consecutivas del orden de turno,
   * empezando en startAbsPos (posición absoluta, se aplica módulo internamente).
   */
  private _buildQueue(startAbsPos: number, count: number): TurnCombatant[] {
    const result: TurnCombatant[] = [];
    for (let i = 0; i < count; i++) {
      const entry = this._order[(startAbsPos + i) % this._order.length];
      if (entry !== undefined) { result.push(entry); }
    }
    return result;
  }
}
