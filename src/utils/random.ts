/**
 * RNG seedable basado en el algoritmo mulberry32.
 *
 * Por qué mulberry32:
 * - Calidad estadística excelente para videojuegos (pasa BigCrush)
 * - Extremadamente rápido (una sola operación de 32 bits por llamada)
 * - Determinista: la misma seed siempre produce la misma secuencia
 *
 * REGLA: Nadie en el proyecto usa Math.random() directamente.
 * Toda aleatoriedad del juego pasa por gameRng o un RNG local con seed.
 */

/** Genera números pseudoaleatorios con el algoritmo mulberry32. */
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    // Asegurar que el estado inicial es un entero de 32 bits sin signo
    this.state = seed >>> 0;
  }

  /**
   * Devuelve el siguiente número en la secuencia: float en [0, 1).
   */
  next(): number {
    // mulberry32: una iteración del generador
    let z = (this.state += 0x6d2b79f5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  }

  /**
   * Devuelve un entero en el rango [min, max] (ambos inclusive).
   */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Devuelve un float en el rango [min, max).
   */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Devuelve true con la probabilidad indicada (0–1).
   * Ejemplo: chance(0.25) → true el 25% de las veces.
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Elige un elemento aleatorio de un array.
   * Lanza un error si el array está vacío.
   */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('random.pick: el array está vacío');
    }
    return arr[this.int(0, arr.length - 1)]!;
  }

  /**
   * Baraja un array IN-PLACE con Fisher-Yates.
   * Devuelve el mismo array para facilitar encadenamiento.
   */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  /** Expone el estado actual (útil para guardar/restaurar). */
  getState(): number {
    return this.state;
  }

  /** Restaura el estado desde un valor guardado. */
  setState(state: number): void {
    this.state = state >>> 0;
  }
}

// ─── Singleton global ────────────────────────────────────────────────────────

/**
 * RNG global de la partida.
 * Se inicializa con una seed aleatoria al cargar el módulo.
 * Llamar a initGameRng(seed) para resetear con una seed concreta
 * (útil en tests y para semillas de partida guardada).
 */
export let gameRng = new Mulberry32(Date.now() >>> 0);

/**
 * Reinicia el RNG global con la seed indicada.
 * Después de esta llamada, la secuencia de números será determinista.
 */
export function initGameRng(seed: number): void {
  gameRng = new Mulberry32(seed);
}
