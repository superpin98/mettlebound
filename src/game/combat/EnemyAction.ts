/**
 * EnemyAction -- arquitectura de IA de enemigos basada en evaluacion de acciones.
 *
 * Diseno: evaluador extensible.
 *   - EnemyAI recibe una lista de acciones disponibles.
 *   - En cada turno filtra las ejecutables (canExecute) y elige la de mayor puntuacion (score).
 *   - Anadir una nueva capacidad al enemigo = implementar EnemyAction y pasarla al constructor.
 *   - Hoy: MeleeAttackAction + ApproachAction.
 *   - Futuro: SkillAction, FleeAction, BuffAction, etc.
 *
 * Uso:
 *   const ai = new EnemyAI([
 *     new MeleeAttackAction(),
 *     new ApproachAction(),
 *   ]);
 *   // En el turno del enemigo:
 *   await ai.execute(ctx);
 */

import type { Scene }         from '@babylonjs/core';
import type { CombatEntity }  from '@/game/combat/CombatEntity';
import type { CombatGrid }    from '@/game/world/CombatGrid';
import type { PlayerStats }   from '@/game/player/PlayerStats';
import { logger }             from '@/core/Logger';

// ── Recursos por turno ─────────────────────────────────────────────────────────

/**
 * Recursos de un enemigo para un turno concreto.
 * Se crea en EnemyAI.execute() al inicio de CADA turno (automaticamente frescos).
 * Las acciones los leen y reducen; cuando se agotan no quedan acciones ejecutables.
 */
export interface EnemyTurnResources {
  /** Puntos de movimiento restantes este turno. Empieza en self.movementPoints. */
  pmRemaining: number;
  /** True si la accion principal de este turno todavia esta disponible. */
  actionMain: boolean;
}

// ── Contexto de IA ─────────────────────────────────────────────────────────────

/**
 * Informacion disponible para el evaluador en el momento del turno.
 * Se construye en main.ts justo antes de llamar a ai.execute(ctx).
 */
export interface AIContext {
  /** Ficha de combate del enemigo que toma el turno. */
  self:        CombatEntity;
  /** ID de la entidad (para ocupacion del grid). Ej: 'rusty'. */
  selfId:      string;
  /** Fichas objetivo (por ahora solo [playerEntity]). */
  targets:     CombatEntity[];
  /**
   * Stats reales del jugador. Necesario para infligir dano via PlayerStats.takeDamage()
   * (que emite player:death y activa la cadena de Game Over).
   */
  playerStats: PlayerStats;
  /** Grid tactico para pathfinding, ocupacion y bounds-check. */
  grid:        CombatGrid;
  /** Escena Babylon para CombatWalker. */
  scene:       Scene;
}

// ── Interfaz de accion ─────────────────────────────────────────────────────────

/**
 * Una accion que un enemigo puede ejecutar en su turno.
 *
 * Implementar esta interfaz para cualquier nueva capacidad de enemigo.
 * El evaluador llama a canExecute() para filtrar y a score() para priorizar.
 */
export interface EnemyAction {
  /** Identificador legible para logs. */
  readonly id: string;
  /**
   * Indica si la accion es ejecutable dado el contexto y los recursos restantes.
   * No debe tener efectos secundarios.
   */
  canExecute(ctx: AIContext, res: EnemyTurnResources): boolean;
  /**
   * Puntuacion de la accion. Mayor = mas prioritaria.
   * Solo se llama si canExecute() devuelve true.
   * No debe tener efectos secundarios.
   */
  score(ctx: AIContext, res: EnemyTurnResources): number;
  /**
   * Ejecuta la accion de forma asincrona y reduce los recursos consumidos en res.
   * Resuelve cuando la accion termina (animacion incluida).
   */
  execute(ctx: AIContext, res: EnemyTurnResources): Promise<void>;
}

// ── Clase evaluadora ────────────────────────────────────────────────────────────

export class EnemyAI {

  private readonly _actions: EnemyAction[];

  /**
   * @param actions Lista de acciones disponibles para este enemigo.
   *                El evaluador las evalua todas en cada turno y elige la mejor.
   */
  constructor(actions: EnemyAction[]) {
    this._actions = [...actions];
  }

  /**
   * Ejecuta el turno del enemigo con recursos frescos.
   *
   * Recursos por turno: pm completo segun DEX + 1 accion principal.
   * Se crean al inicio de CADA llamada a execute() → garantia de recursos frescos
   * en turnos encadenados del mismo combatiente.
   *
   * Loop de acciones: evalua y ejecuta acciones repetidamente hasta que:
   *   a) Ningun accion es ejecutable (pm=0, accion=false, o no alcanzable).
   *   b) Se supera el limite de seguridad MAX_ITERS (evita bucles infinitos).
   */
  async execute(ctx: AIContext): Promise<void> {
    // Recursos frescos al inicio de CADA turno (turnos encadenados incluidos)
    const res: EnemyTurnResources = {
      pmRemaining: ctx.self.movementPoints,
      actionMain:  true,
    };

    const MAX_ITERS = 10; // seguridad: un turno nunca tendra mas de 10 acciones
    let iters = 0;

    while (iters++ < MAX_ITERS) {
      const available = this._actions.filter((a) => a.canExecute(ctx, res));

      if (available.length === 0) {
        logger.debug('EnemyAI: sin acciones ejecutables — turno terminado', {
          selfId: ctx.selfId, pmRemaining: res.pmRemaining, actionMain: res.actionMain,
        });
        break;
      }

      // Elegir la de mayor puntuacion
      available.sort((a, b) => b.score(ctx, res) - a.score(ctx, res));
      const best = available[0];
      if (best === undefined) { break; }

      logger.debug('EnemyAI: ejecutando accion', {
        selfId: ctx.selfId, action: best.id,
        pmRemaining: res.pmRemaining, actionMain: res.actionMain,
      });

      await best.execute(ctx, res);
    }
  }
}
