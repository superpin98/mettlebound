/**
 * CombatActionBudget -- presupuesto de acciones del turno del jugador.
 *
 * Cada turno del jugador dispone de:
 *   - 1 acción PRINCIPAL  (ataque básico, habilidades de tier alto)
 *   - 1 acción SECUNDARIA (habilidades de tier bajo, pociones, buffs cortos)
 *
 * El MOVIMIENTO no es una acción: tiene su propio recurso (PM en MovementBar).
 *
 * ─── Diseño para skills ────────────────────────────────────────────────────
 * Cada skill declarará su `costType: ActionCostType`:
 *   - 'principal'  → consume la acción principal del turno (solo una)
 *   - 'secondary'  → consume la acción secundaria (solo una)
 * Algunas skills podrán usar cualquiera de las dos (depende del diseño);
 * eso se modelará en la capa de definición de skills, no aquí.
 *
 * consume() devuelve false si el slot ya estaba gastado (sin lanzar excepción).
 * El llamador (CombatActionUI o el sistema de skills) decide si mostrar feedback.
 *
 * ─── Ciclo de vida ────────────────────────────────────────────────────────
 *   reload()  → inicio del turno del jugador (llamado por CombatTurnSystem)
 *   consume() → al ejecutar una acción
 *   reset()   → al finalizar el combate (dispose)
 */

import { logger } from '@/core/Logger';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

/**
 * Tipo de coste de una acción.
 * Las skills y atajos declaran uno de estos valores para saber qué slot gastan.
 */
export type ActionCostType = 'principal' | 'secondary';

/** Estado del presupuesto de acciones (para UI y debug). */
export interface ActionBudgetSnapshot {
  /** true si la acción principal aún no se ha usado este turno. */
  principal: boolean;
  /** true si la acción secundaria aún no se ha usado este turno. */
  secondary: boolean;
}

// ── Clase ──────────────────────────────────────────────────────────────────────

export class CombatActionBudget {

  private _principal = false;
  private _secondary = false;

  // ── API pública ──────────────────────────────────────────────────────────────

  /**
   * Recarga ambas acciones al inicio del turno del jugador.
   * Llamar desde CombatTurnSystem._doPlayerTurn().
   */
  reload(): void {
    this._principal = true;
    this._secondary = true;
    logger.debug('CombatActionBudget: recargado', this.snapshot);
  }

  /**
   * Comprueba si un slot de acción está disponible (sin consumirlo).
   * Útil para habilitar/deshabilitar botones de la UI antes del clic.
   */
  isAvailable(type: ActionCostType): boolean {
    return type === 'principal' ? this._principal : this._secondary;
  }

  /**
   * Intenta consumir un slot de acción.
   * @returns true si había disponible y se consumió; false si ya estaba gastado.
   */
  consume(type: ActionCostType): boolean {
    if (!this.isAvailable(type)) {
      logger.debug('CombatActionBudget: acción no disponible', { type });
      return false;
    }
    if (type === 'principal') { this._principal = false; }
    else                      { this._secondary = false; }
    logger.debug('CombatActionBudget: acción consumida', { type, ...this.snapshot });
    return true;
  }

  /**
   * Vacía ambos slots sin recargar (fin de combate / dispose).
   * Llamar desde CombatTurnSystem.dispose().
   */
  reset(): void {
    this._principal = false;
    this._secondary = false;
    logger.debug('CombatActionBudget: reseteado');
  }

  /** Estado actual del presupuesto (para UI y window.__mb). */
  get snapshot(): ActionBudgetSnapshot {
    return {
      principal: this._principal,
      secondary: this._secondary,
    };
  }
}
