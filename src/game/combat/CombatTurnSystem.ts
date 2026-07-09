/**
 * CombatTurnSystem -- ciclo de turnos táctico.
 *
 * Gestiona el ciclo de turnos usando el orden calculado por InitiativeSystem.
 * El orden NO es un array fijo: viene de la acumulación real de iniciativa
 * (DEX-based), por lo que un combatiente puede aparecer varias veces
 * consecutivas si su DEX es muy superior.
 *
 * Flujo:
 *   start() → InitiativeSystem determina quién va → turno del jugador o del enemigo
 *   endPlayerTurn() / botón → avanzar a siguiente según InitiativeSystem
 *   Turno de Rusty → auto-pasa con delay → avanzar
 *
 * Eventos emitidos:
 *   'combat:turn-start' — inicio de cualquier turno
 *   'combat:turn-end'   — fin de cualquier turno
 */

import type { CombatMovementSystem } from '@/game/combat/CombatMovementSystem';
import type { PlayerSnapshot }       from '@/types/game.types';
import type { InitiativeTracker }    from '@/ui/InitiativeTracker';
import { InitiativeSystem }          from '@/game/combat/InitiativeSystem';
import { CombatActionBudget }        from '@/game/combat/CombatActionBudget';
import type { TurnCombatant }        from '@/game/combat/InitiativeSystem';
import { eventBus }                  from '@/core/EventBus';
import { logger }                    from '@/core/Logger';
import type { CombatAttackSystem }  from '@/game/combat/CombatAttackSystem';

// Re-exportar TurnCombatant para que los importadores existentes no se rompan.
export type { TurnCombatant } from '@/game/combat/InitiativeSystem';

/** Milisegundos que el enemigo "piensa" antes de auto-pasar. */
const ENEMY_AUTO_PASS_MS = 700;

/** Número de turnos próximos mostrados en el tracker. */
const QUEUE_SIZE = 10;

export class CombatTurnSystem {

  private readonly _initSys:    InitiativeSystem;
  private readonly _movSys:     CombatMovementSystem;
  private readonly _tracker:    InitiativeTracker;
  private readonly _endTurnBtn: HTMLButtonElement;

  private _turnNumber = 0;
  private _isRunning  = false;

  /** Handle del setTimeout del turno enemigo, para cancelarlo en dispose(). */
  private _enemyTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Handler suscrito a 'player:stats-changed' durante el combate.
   * Guardado para poder desuscribir limpiamente en dispose().
   */
  private _statsHandler: ((snap: PlayerSnapshot) => void) | null = null;

  /**
   * Sistema de ataque. Opcional: se asigna con setAttackSystem() tras la construcción.
   * CombatTurnSystem se encarga de activarlo/desactivarlo con el turno del jugador.
   */
  private _attackSys: CombatAttackSystem | null = null;

  /**
   * Presupuesto de acciones del turno (1 principal + 1 secundaria).
   * Se recarga al inicio de cada turno del jugador y se vacía en dispose().
   */
  private readonly _budget: CombatActionBudget;

  /**
   * @param initSys     Sistema de iniciativa que calcula el orden real.
   * @param movSys      Sistema de movimiento del jugador.
   * @param tracker     HUD de iniciativa.
   * @param endTurnBtn  Botón "Terminar turno" del DOM.
   */
  constructor(
    initSys:    InitiativeSystem,
    movSys:     CombatMovementSystem,
    tracker:    InitiativeTracker,
    endTurnBtn: HTMLButtonElement,
  ) {
    this._initSys    = initSys;
    this._movSys     = movSys;
    this._tracker    = tracker;
    this._endTurnBtn = endTurnBtn;

    this._budget = new CombatActionBudget();

    endTurnBtn.addEventListener('click', () => { this.endPlayerTurn(); });
  }

  // ── API pública ────────────────────────────────────────────────────────────────

  /** Presupuesto de acciones del turno actual (para UI y debug). */
  get budget(): CombatActionBudget { return this._budget; }

  /**
   * Registra el sistema de ataque para que CombatTurnSystem lo active y desactive
   * automáticamente con el turno del jugador.
   * Llamar justo después de construir ambos sistemas, antes de start().
   */
  setAttackSystem(sys: CombatAttackSystem): void {
    this._attackSys = sys;
  }

  /**
   * Arranca el ciclo de turnos.
   * Rellena el tracker con los próximos QUEUE_SIZE turnos y activa el primero.
   */
  start(): void {
    if (this._isRunning) { return; }
    this._isRunning  = true;
    this._turnNumber = 0;

    this._tracker.initQueue(this._initSys.getInitialQueue(QUEUE_SIZE));
    this._tracker.show();
    this._activateCombatant(this._initSys.currentTurn);

    // Escuchar cambios de stats del jugador para recalcular la cola EN VIVO.
    this._statsHandler = (snap: PlayerSnapshot): void => {
      if (!this._isRunning) { return; }
      this._initSys.updateCombatantDex('player', snap.coreStats.DEX);
      // Recalcular los turnos futuros — el turno en curso NO se interrumpe.
      this._tracker.refreshQueue(this._initSys.getInitialQueue(QUEUE_SIZE));
    };
    eventBus.on('player:stats-changed', this._statsHandler);
  }

  /**
   * Termina el turno del jugador.
   * No hace nada si no es turno del jugador o el sistema no está en marcha.
   */
  endPlayerTurn(): void {
    if (!this._isRunning)                    { return; }
    if (!this._initSys.currentTurn.isPlayer) { return; }

    this._endTurnBtn.disabled = true;
    this._movSys.setPlayerTurnActive(false);
    this._attackSys?.setPlayerTurnActive(false);
    this._advanceToNext();
  }

  /** Limpia timers y oculta el tracker. Llamar al salir de combate. */
  dispose(): void {
    if (this._enemyTimer !== null) {
      clearTimeout(this._enemyTimer);
      this._enemyTimer = null;
    }
    if (this._statsHandler !== null) {
      eventBus.off('player:stats-changed', this._statsHandler);
      this._statsHandler = null;
    }
    this._budget.reset();
    this._attackSys?.dispose();
    this._attackSys = null;
    this._tracker.hide();
    this._endTurnBtn.disabled = true;
    this._isRunning = false;
  }

  // ── Internals ──────────────────────────────────────────────────────────────────

  private _activateCombatant(combatant: TurnCombatant): void {
    this._turnNumber++;

    // Recargar el budget ANTES del emit para que los suscriptores de
    // 'combat:turn-start' lean el estado ya actualizado (p. ej. CombatActionBar).
    if (combatant.isPlayer) {
      this._budget.reload();
    }

    eventBus.emit('combat:turn-start', {
      combatantId: combatant.id,
      isPlayer:    combatant.isPlayer,
      turnNumber:  this._turnNumber,
    });

    logger.info('CombatTurnSystem: turno activado', {
      id:         combatant.id,
      isPlayer:   combatant.isPlayer,
      turnNumber: this._turnNumber,
    });

    if (combatant.isPlayer) {
      this._doPlayerTurn();
    } else {
      this._doEnemyTurn(combatant);
    }
  }

  private _doPlayerTurn(): void {
    // _budget.reload() ya fue llamado en _activateCombatant antes del emit.
    this._movSys.setPlayerTurnActive(true);
    this._movSys.reloadMovement();
    this._attackSys?.setPlayerTurnActive(true);
    this._endTurnBtn.disabled = false;
  }

  private _doEnemyTurn(combatant: TurnCombatant): void {
    this._endTurnBtn.disabled = true;
    this._movSys.setPlayerTurnActive(false);
    this._attackSys?.setPlayerTurnActive(false);

    logger.debug('CombatTurnSystem: turno de enemigo — auto-paso', { id: combatant.id });

    this._enemyTimer = setTimeout(() => {
      this._enemyTimer = null;
      if (!this._isRunning) { return; }
      this._advanceToNext();
    }, ENEMY_AUTO_PASS_MS);
  }

  private _advanceToNext(): void {
    const current = this._initSys.currentTurn;
    eventBus.emit('combat:turn-end', { combatantId: current.id });

    // Avanzar InitiativeSystem → nueva cola → nuevo tail para el tracker
    const newTail = this._initSys.advance();
    this._tracker.advance(newTail);

    this._activateCombatant(this._initSys.currentTurn);
  }
}
