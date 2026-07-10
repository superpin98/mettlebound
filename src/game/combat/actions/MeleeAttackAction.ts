/**
 * MeleeAttackAction -- accion de ataque cuerpo a cuerpo del enemigo.
 *
 * Condicion de ejecucion: hay objetivo Y la distancia Chebyshev es <= 1.
 * Puntuacion: 100 (alta prioridad — atacar es siempre mejor que acercarse).
 * Ejecucion:
 *   1. Reproducir la animacion de ataque del enemigo (playAttackAnim).
 *   2. Al terminar la animacion: infligir dano al jugador via PlayerStats.takeDamage().
 *      Esto dispara la cadena player:death -> Death_A -> player:death-anim-end -> GameOverModal.
 *
 * Formula de dano: reutiliza calcBasicAttackDamage (5 + floor(STR/10)).
 * Mismas reglas y formula que el ataque del jugador.
 */

import type { EnemyAction, AIContext, EnemyTurnResources } from '@/game/combat/EnemyAction';
import { calcBasicAttackDamage }       from '@/game/combat/CombatAttackSystem';
import { logger }                      from '@/core/Logger';

/** Distancia Chebyshev maxima para ataque melee (1 celda). */
const MELEE_RANGE = 1;

/** Puntuacion base: alta prioridad, atacar siempre es preferible a acercarse. */
const SCORE = 100;

export class MeleeAttackAction implements EnemyAction {

  readonly id = 'melee-attack';

  canExecute(ctx: AIContext, res: EnemyTurnResources): boolean {
    // Necesita accion principal disponible
    if (!res.actionMain) { return false; }
    const target = ctx.targets[0];
    if (target === undefined) { return false; }
    const dx = Math.abs(ctx.self.cellX - target.cellX);
    const dz = Math.abs(ctx.self.cellZ - target.cellZ);
    // Chebyshev dist <= MELEE_RANGE Y no misma celda (dx=0 && dz=0 es autoataque)
    return (dx <= MELEE_RANGE && dz <= MELEE_RANGE) && !(dx === 0 && dz === 0);
  }

  score(_ctx: AIContext, _res: EnemyTurnResources): number { return SCORE; }

  execute(ctx: AIContext, res: EnemyTurnResources): Promise<void> {
    const target = ctx.targets[0];
    if (target === undefined) { return Promise.resolve(); }

    // Consumir la accion principal antes de la animacion
    res.actionMain = false;

    // Girar al atacante hacia el objetivo antes del swing (snap instantaneo)
    ctx.self.faceTowardCell(target.cellX, target.cellZ);

    return new Promise<void>((resolve) => {
      ctx.self.playAttackAnim(() => {
        const dmg = calcBasicAttackDamage(ctx.self.coreStats);

        logger.info('MeleeAttackAction: dano aplicado al jugador', {
          selfId: ctx.selfId,
          dmg,
          str: ctx.self.coreStats.STR,
          playerHpBefore: ctx.playerStats.getSnapshot().currentHp,
        });

        ctx.playerStats.takeDamage(dmg);

        logger.info('MeleeAttackAction: estado del jugador tras dano', {
          playerHpAfter: ctx.playerStats.getSnapshot().currentHp,
          isDead: ctx.playerStats.getSnapshot().currentHp <= 0,
        });

        resolve();
      });
    });
  }
}
