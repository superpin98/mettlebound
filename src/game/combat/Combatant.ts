/**
 * Combatant -- clase base para cualquier entidad con HP en el juego.
 *
 * Logica pura: sin dependencias de Babylon.js ni del DOM.
 * Semilla del sistema Entity del Sprint 5: Player y Enemy
 * extendera esta clase en lugar de duplicar la logica de HP.
 *
 * Invariante: currentHp siempre en [0, maxHp].
 */
export class Combatant {

  private _currentHp: number;
  readonly maxHp: number;

  /**
   * Nombre para mostrar en la UI (barra de vida, tooltips, etc.).
   * Cadena vacia = sin nombre (entidades anonimas como mobs genericos).
   */
  displayName: string = '';

  constructor(maxHp: number) {
    this.maxHp      = maxHp;
    this._currentHp = maxHp;
  }

  /** HP actual (siempre en rango [0, maxHp]). */
  get currentHp(): number {
    return this._currentHp;
  }

  /** true cuando currentHp llega a 0. */
  get isDead(): boolean {
    return this._currentHp <= 0;
  }

  /** Ratio HP actual / maxHp en [0, 1]. Util para la barra de vida. */
  get hpPercent(): number {
    return this._currentHp / this.maxHp;
  }

  /**
   * Aplica danio. Clampea a 0 (no hay HP negativo ni resurreccion).
   * @param amount Cantidad de danio (positivo).
   */
  takeDamage(amount: number): void {
    this._currentHp = Math.max(0, this._currentHp - amount);
  }

  /**
   * Cura la entidad. Clampea a maxHp (no hay sobreHP).
   * @param amount Cantidad a curar (positivo).
   */
  heal(amount: number): void {
    this._currentHp = Math.min(this.maxHp, this._currentHp + amount);
  }

  /** Restaura HP al maximo. Usado al crear la entidad o hacer respawn. */
  restoreToFull(): void {
    this._currentHp = this.maxHp;
  }
}
