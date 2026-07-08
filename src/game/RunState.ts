/**
 * RunState -- estado de la run en curso (EN MEMORIA, no persistido a disco).
 *
 * Hoy contiene solo el karma ético. Crecerá en Sprint 5+ con:
 *   piso actual, oro de run, flags de eventos, semilla de RNG de run, etc.
 *
 * Karma:
 *   - Empieza en 0 cada run.
 *   - addKarma(-1) al atacar a un NPC neutral consciente (ej: Rusty).
 *   - Sin efecto mecánico todavía. Registro puro.
 *   - Se persistirá cuando exista el SaveManager (Sprint 5+).
 *
 * Referencia lore: docs/data/interaction_vectors.json → meta_karma_negative
 */

export class RunState {

  private _karma: number = 0;

  // ── Karma ─────────────────────────────────────────────────────────────────

  /**
   * Karma acumulado en la run actual.
   * Negativo = acciones éticamente cuestionables (atacar a Rusty, etc.).
   */
  get karma(): number {
    return this._karma;
  }

  /**
   * Modifica el karma por un delta (positivo o negativo).
   * Ejemplos:
   *   addKarma(-1)  → ataque a NPC neutral
   *   addKarma(+1)  → acción altruista (futuro)
   */
  addKarma(delta: number): void {
    this._karma += delta;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Resetea el estado a los valores iniciales.
   * Llamar al empezar una nueva run (Game Over → reiniciar, clase nueva, etc.).
   */
  reset(): void {
    this._karma = 0;
  }
}
