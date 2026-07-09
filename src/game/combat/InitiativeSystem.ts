/**
 * InitiativeSystem -- cálculo de iniciativa por acumulación.
 *
 * Cada combatiente tiene un acumulador. Cada "tick" de simulación:
 *   acumulador += coreStats.DEX
 *
 * Al llegar al umbral (INITIATIVE_THRESHOLD = 100), actúa el combatiente
 * con mayor acumulador; el umbral se resta y sigue acumulando.
 *
 * El encadenamiento emerge solo: DEX 10 vs DEX 6 → ratio ~5:3 de turnos.
 * Solo DEX determina la iniciativa (LCK, STR, INT no intervienen aquí).
 *
 * ATAQUE SORPRESA: el atacante (jugador) arranca con SURPRISE_BONUS en su
 * acumulador, garantizando que va primero. Excepciones que anulan la sorpresa:
 *   - Enemigo con DEX >= 1.5× la del jugador.
 *   - Enemigo con trait 'alert' (stub inerte — siempre false, ver hasTrait).
 *
 * RECÁLCULO EN VIVO: updateCombatantDex() actualiza la DEX de un combatiente
 * y re-proyecta los turnos futuros respetando la acumulación actual
 * (_baseAccs), sin resetear los acumuladores a 0.
 */

import { logger } from '@/core/Logger';

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Umbral de iniciativa para activar un turno. */
export const INITIATIVE_THRESHOLD = 100;

/**
 * Bonus de acumulador inicial para el atacante por sorpresa.
 * Igual al umbral: el atacante actúa sin necesitar ticks adicionales.
 */
export const SURPRISE_BONUS = INITIATIVE_THRESHOLD;

/** Turnos precalculados en el buffer interno (> QUEUE_SIZE del tracker). */
const LOOKAHEAD_SIZE = 20;

// ── Tipos públicos ─────────────────────────────────────────────────────────────

/**
 * Descriptor de un combatiente para el tracker y el sistema de turnos.
 * Movido aquí desde CombatTurnSystem para evitar dependencias circulares.
 */
export interface TurnCombatant {
  /** ID único (coincide con occupantId en el grid). */
  id:          string;
  /** Nombre mostrado en el InitiativeTracker. */
  displayName: string;
  /** Icono (emoji o glifo) del InitiativeTracker. */
  icon:        string;
  /** true = controlado por el jugador; false = IA/auto-paso. */
  isPlayer:    boolean;
}

/** Entrada del InitiativeSystem: TurnCombatant + estadística DEX. */
export interface InitCombatantDef extends TurnCombatant {
  dex: number;
}

// ── Stub de traits ─────────────────────────────────────────────────────────────

/**
 * Comprueba si una entidad de combate tiene un trait concreto.
 *
 * STUB: siempre devuelve false.
 * TODO: conectar cuando exista el sistema de traits (docs/15_INTERACTION_SYSTEM.md).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function hasTrait(_entity: unknown, _trait: string): boolean {
  return false;
}

// ── Estado interno de simulación ───────────────────────────────────────────────

interface SimEntry extends InitCombatantDef {
  /** Acumulador de iniciativa en la simulación. */
  acc: number;
}

/**
 * Entrada del buffer: turn generado + snapshot de acumuladores DESPUÉS
 * de que este turno fue procesado (necesario para updateCombatantDex).
 */
interface BufferEntry {
  turn:    TurnCombatant;
  /** Estado de acumuladores de todos los combatientes tras este turno. */
  postAcc: Record<string, number>;
}

// ── Clase principal ────────────────────────────────────────────────────────────

export class InitiativeSystem {

  private readonly _simEntries: SimEntry[];

  /**
   * Estado real de los acumuladores en el momento actual del combate.
   * Se actualiza en cada advance() con el postAcc del turno consumido.
   * Sirve como punto de partida para regenerar el buffer tras un cambio de DEX.
   */
  private _baseAccs: Record<string, number>;

  /** Buffer de los próximos LOOKAHEAD_SIZE turnos precalculados. */
  private readonly _buffer: BufferEntry[];

  /**
   * @param combatants               Combatientes con su DEX.
   * @param options.surpriseAttackerId  ID del combatiente que recibe SURPRISE_BONUS.
   *                                    Si undefined, todos arrancan en acumulador 0.
   */
  constructor(
    combatants: InitCombatantDef[],
    options: { surpriseAttackerId?: string | undefined } = {},
  ) {
    this._simEntries = combatants.map(c => ({
      ...c,
      acc: c.id === options.surpriseAttackerId ? SURPRISE_BONUS : 0,
    }));

    // Snapshot de estado inicial ANTES de generar el buffer
    this._baseAccs = Object.fromEntries(
      this._simEntries.map(c => [c.id, c.acc]),
    );

    logger.debug('InitiativeSystem: iniciado', {
      combatants: this._simEntries.map(c => ({ id: c.id, dex: c.dex, acc: c.acc })),
      surpriseAttackerId: options.surpriseAttackerId,
    });

    this._buffer = [];
    for (let i = 0; i < LOOKAHEAD_SIZE; i++) {
      this._buffer.push(this._stepSimulation());
    }

    logger.debug('InitiativeSystem: cola inicial generada', {
      queue: this._buffer.map(e => e.turn.id),
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  /** Combatiente cuyo turno es ahora (primero del buffer). */
  get currentTurn(): TurnCombatant {
    const first = this._buffer[0];
    if (first === undefined) {
      throw new Error('InitiativeSystem: buffer vacío');
    }
    return first.turn;
  }

  /**
   * Devuelve los próximos `count` turnos (el primero es el turno actual).
   * Usado para inicializar la cola del InitiativeTracker.
   */
  getInitialQueue(count: number): TurnCombatant[] {
    return this._buffer.slice(0, count).map(e => e.turn);
  }

  /**
   * Consume el turno actual y genera el siguiente al final del buffer.
   * Actualiza _baseAccs con el postAcc del turno consumido (estado real actual).
   * Devuelve el nuevo último elemento (nueva entrada del tracker).
   */
  advance(): TurnCombatant {
    const consumed = this._buffer.shift();
    if (consumed === undefined) {
      throw new Error('InitiativeSystem: buffer vacío en advance()');
    }
    // Actualizar el estado real: ahora estamos en el postAcc del turno consumido
    this._baseAccs = { ...consumed.postAcc };

    const newEntry = this._stepSimulation();
    this._buffer.push(newEntry);
    return newEntry.turn;
  }

  /**
   * Actualiza la DEX de un combatiente y regenera el buffer de turnos futuros
   * respetando la acumulación actual (_baseAccs) de cada combatiente.
   *
   * NO resetea los acumuladores a 0: re-proyecta hacia adelante desde el
   * estado real del momento actual.
   *
   * @param id     ID del combatiente a actualizar (ej. 'player').
   * @param newDex Nuevo valor de DEX.
   */
  updateCombatantDex(id: string, newDex: number): void {
    // 1. Actualizar DEX en la entrada de simulación
    for (const c of this._simEntries) {
      if (c.id === id) {
        c.dex = newDex;
        break;
      }
    }

    // 2. Resetear acumuladores de simulación al estado real actual
    for (const c of this._simEntries) {
      c.acc = this._baseAccs[c.id] ?? 0;
    }

    // 3. Regenerar el buffer completo desde el estado real con las nuevas DEX
    this._buffer.length = 0;
    for (let i = 0; i < LOOKAHEAD_SIZE; i++) {
      this._buffer.push(this._stepSimulation());
    }

    logger.debug('InitiativeSystem: DEX actualizada, buffer regenerado', {
      id,
      newDex,
      baseAccs:  this._baseAccs,
      newQueue:  this._buffer.slice(0, 10).map(e => e.turn.id),
    });
  }

  // ── Simulación ────────────────────────────────────────────────────────────────

  /**
   * Avanza la simulación hasta que alguien alcanza el umbral.
   * Usa enfoque basado en eventos: calcula los ticks mínimos necesarios y
   * avanza todos los acumuladores de golpe (eficiente, sin loop tick a tick).
   *
   * Desempate si varios alcanzan el umbral a la vez: mayor acumulador gana.
   * Si aún hay empate: el que aparece primero en el array (orden de declaración).
   *
   * Devuelve el turno generado + snapshot de postAcc para tracking del estado real.
   */
  private _stepSimulation(): BufferEntry {
    // 1. Ticks hasta la próxima activación
    let minTicks = Infinity;
    for (const c of this._simEntries) {
      if (c.dex <= 0) { continue; }
      const ticks = c.acc >= INITIATIVE_THRESHOLD
        ? 0
        : Math.ceil((INITIATIVE_THRESHOLD - c.acc) / c.dex);
      if (ticks < minTicks) { minTicks = ticks; }
    }
    if (!isFinite(minTicks)) {
      throw new Error('InitiativeSystem: todos los combatientes tienen DEX ≤ 0');
    }

    // 2. Avanzar todos los acumuladores
    for (const c of this._simEntries) {
      c.acc += c.dex * minTicks;
    }

    // 3. Elegir ganador: mayor acumulador; desempate por orden original
    let winnerAcc = -Infinity;
    let winner: SimEntry | null = null;
    for (const c of this._simEntries) {
      if (c.acc >= INITIATIVE_THRESHOLD && c.acc > winnerAcc) {
        winnerAcc = c.acc;
        winner    = c;
      }
    }
    if (winner === null) {
      throw new Error('InitiativeSystem: ningún combatiente alcanzó el umbral');
    }

    winner.acc -= INITIATIVE_THRESHOLD;

    // 4. Snapshot de postAcc (estado DESPUÉS de procesar este turno)
    const postAcc: Record<string, number> = Object.fromEntries(
      this._simEntries.map(c => [c.id, c.acc]),
    );

    return {
      turn: {
        id:          winner.id,
        displayName: winner.displayName,
        icon:        winner.icon,
        isPlayer:    winner.isPlayer,
      },
      postAcc,
    };
  }
}
