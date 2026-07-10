/**
 * ApproachAction -- accion de acercamiento del enemigo al jugador.
 *
 * Condicion de ejecucion: hay objetivo Y NO esta en rango melee (Chebyshev > 1).
 * Puntuacion: 50 (menor que MeleeAttackAction — acercarse solo si no se puede atacar).
 * Ejecucion:
 *   1. Encontrar la celda adyacente al jugador de menor coste de camino.
 *   2. Calcular el path completo via A* (CombatPathfinder).
 *   3. Truncar el path a los PM completos de la entidad (movementPoints segun DEX).
 *   4. Actualizar ocupacion del grid (release origen, occupy destino).
 *   5. Caminar via CombatWalker (misma logica que el jugador, reutilizada).
 *   La promesa resuelve al llegar al ultimo nodo del path truncado.
 *
 * Rusty gasta su presupuesto COMPLETO de movimiento, igual que el jugador.
 * Si el path es mas largo que sus PM, camina todo lo que puede.
 */

import type { EnemyAction, AIContext, EnemyTurnResources } from '@/game/combat/EnemyAction';
import type { GridCell }               from '@/game/combat/CombatPathfinder';
import { CombatPathfinder }            from '@/game/combat/CombatPathfinder';
import { CombatWalker }               from '@/game/combat/CombatWalker';
import { logger }                      from '@/core/Logger';

/** Puntuacion: menor que atacar. */
const SCORE = 50;

/** Offsets de las 8 casillas adyacentes (excluye [0,0]). */
const ADJ_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

/**
 * Trunca un path A* al presupuesto de PM indicado.
 * Coste de segmento: ortogonal=1.0, diagonal=1.5 (mismo que CombatPathfinder).
 * Devuelve el sub-path desde el origen hasta la ultima celda alcanzable.
 */
function truncatePathByPM(path: GridCell[], maxPM: number): GridCell[] {
  let accumulated = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    if (prev === undefined || curr === undefined) { break; }
    const isDiag   = prev.x !== curr.x && prev.z !== curr.z;
    const segCost  = isDiag ? 1.5 : 1.0;
    if (accumulated + segCost > maxPM + 0.0001) {
      return path.slice(0, i); // cortar antes de este segmento
    }
    accumulated += segCost;
  }
  return path; // todo el path cabe en el presupuesto
}

export class ApproachAction implements EnemyAction {

  readonly id = 'approach';

  canExecute(ctx: AIContext, res: EnemyTurnResources): boolean {
    // Sin PM restantes no puede moverse
    if (res.pmRemaining <= 0) { return false; }
    const target = ctx.targets[0];
    if (target === undefined) { return false; }
    const dx = Math.abs(ctx.self.cellX - target.cellX);
    const dz = Math.abs(ctx.self.cellZ - target.cellZ);
    // Solo ejecutar si NO estamos en rango melee
    return dx > 1 || dz > 1;
  }

  score(_ctx: AIContext, _res: EnemyTurnResources): number { return SCORE; }

  execute(ctx: AIContext, res: EnemyTurnResources): Promise<void> {
    const target = ctx.targets[0];
    if (target === undefined) { return Promise.resolve(); }

    const selfPos  = { x: ctx.self.cellX, z: ctx.self.cellZ };
    const targetPos = { x: target.cellX, z: target.cellZ };
    const selfPM   = res.pmRemaining; // usar PM restantes del turno, no el maximo

    // -- Buscar la celda adyacente al objetivo de menor coste ------------------
    let bestPath: GridCell[] | null = null;
    let bestCost = Infinity;

    for (const [odx, odz] of ADJ_OFFSETS) {
      const cx = targetPos.x + odx;
      const cz = targetPos.z + odz;

      if (!ctx.grid.isInBounds(cx, cz)) { continue; }

      const occ = ctx.grid.occupantAt(cx, cz);
      // La casilla debe estar libre o ser la propia posicion del enemigo
      if (occ !== null && occ !== ctx.selfId) { continue; }

      const result = CombatPathfinder.findPath(selfPos, { x: cx, z: cz }, ctx.grid, ctx.selfId);
      if (result === null) { continue; }

      if (result.cost < bestCost) {
        bestCost = result.cost;
        bestPath = result.path;
      }
    }

    if (bestPath === null || bestPath.length < 2) {
      logger.debug('ApproachAction: ningun camino encontrado hacia el objetivo', {
        selfId: ctx.selfId, targetPos,
      });
      return Promise.resolve();
    }

    // -- Truncar al presupuesto de PM ------------------------------------------
    const walkPath = truncatePathByPM(bestPath, selfPM);
    if (walkPath.length < 2) { return Promise.resolve(); }

    const dest = walkPath[walkPath.length - 1];
    if (dest === undefined) { return Promise.resolve(); }

    logger.info('ApproachAction: caminando hacia objetivo', {
      selfId: ctx.selfId,
      from: selfPos,
      to: dest,
      pathLength: walkPath.length,
      fullCost: bestCost,
      pmBudget: selfPM,
    });

    // -- Actualizar ocupacion del grid antes de caminar ------------------------
    // CombatWalker solo mueve visualmente; la ocupacion la gestiona el llamador.
    ctx.grid.release(ctx.selfId);
    ctx.grid.occupy(ctx.selfId, dest.x, dest.z, ctx.self.footprintW, ctx.self.footprintH);

    // -- Caminar via CombatWalker (misma clase que usa el jugador) -------------
    return new Promise<void>((resolve) => {
      const walker = new CombatWalker(ctx.scene);
      walker.startWalk(walkPath, ctx.self, ctx.grid, () => {
        // Consumir los PM gastados (approach usa todos los PM disponibles al truncar)
        res.pmRemaining = 0;
        logger.debug('ApproachAction: caminata completada', {
          selfId: ctx.selfId, arrivedAt: dest,
        });
        resolve();
      });
    });
  }
}
