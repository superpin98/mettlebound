/**
 * Tests de XPSystem.
 * Verifica que las formulas de XP producen los valores documentados.
 */

import { describe, it, expect } from 'vitest';
import { xpForLevel, xpToNextLevel, xpFromEnemy, levelFromTotalXp } from '@/game/progression/XPSystem';

describe('xpForLevel', () => {
  it('nivel 1 requiere 0 XP', () => {
    expect(xpForLevel(1)).toBe(0);
  });
  it('nivel 0 tambien devuelve 0', () => {
    expect(xpForLevel(0)).toBe(0);
  });
  it('nivel 2 = 100 XP (floor(100 * 1^1.4))', () => {
    expect(xpForLevel(2)).toBe(100);
  });
  it('nivel 3 = 263 XP (floor(100 * 2^1.4))', () => {
    expect(xpForLevel(3)).toBe(263);
  });
  it('nivel 5 = 696 XP (floor(100 * 4^1.4))', () => {
    expect(xpForLevel(5)).toBe(696);
  });
  it('nivel 10 = 2167 XP (floor(100 * 9^1.4))', () => {
    expect(xpForLevel(10)).toBe(2167);
  });
  it('la curva es creciente', () => {
    for (let i = 2; i < 20; i++) {
      expect(xpForLevel(i + 1)).toBeGreaterThan(xpForLevel(i));
    }
  });
});

describe('xpToNextLevel', () => {
  it('desde nivel 1 la XP es xpForLevel(2) - xpForLevel(1)', () => {
    expect(xpToNextLevel(1)).toBe(xpForLevel(2) - xpForLevel(1));
  });
  it('siempre es positivo', () => {
    for (let lvl = 1; lvl <= 20; lvl++) {
      expect(xpToNextLevel(lvl)).toBeGreaterThan(0);
    }
  });
  it('crece con el nivel (curva monotona)', () => {
    for (let lvl = 1; lvl < 20; lvl++) {
      expect(xpToNextLevel(lvl + 1)).toBeGreaterThan(xpToNextLevel(lvl));
    }
  });
});

describe('xpFromEnemy', () => {
  it('enemigo nivel 1 vs jugador nivel 1 da XP base correcta', () => {
    expect(xpFromEnemy(1, 1)).toBe(37);
  });
  it('sin penalizacion cuando la diferencia es 5', () => {
    const a = xpFromEnemy(5, 5);
    const b = xpFromEnemy(5, 10);
    expect(a).toBe(b);
  });
  it('aplica penalizacion cuando el jugador supera en mas de 5 niveles', () => {
    const sin_pen = xpFromEnemy(1, 6);
    const con_pen = xpFromEnemy(1, 7);
    expect(con_pen).toBeLessThan(sin_pen);
  });
  it('nunca devuelve 0 o negativo', () => {
    expect(xpFromEnemy(1, 100)).toBeGreaterThanOrEqual(1);
  });
  it('enemigo de mayor nivel da mas XP', () => {
    expect(xpFromEnemy(10, 5)).toBeGreaterThan(xpFromEnemy(5, 5));
  });
});

describe('levelFromTotalXp', () => {
  it('0 XP es nivel 1', () => {
    expect(levelFromTotalXp(0)).toBe(1);
  });
  it('99 XP sigue en nivel 1', () => {
    expect(levelFromTotalXp(99)).toBe(1);
  });
  it('100 XP es nivel 2', () => {
    expect(levelFromTotalXp(100)).toBe(2);
  });
  it('es coherente con xpForLevel', () => {
    for (let lvl = 2; lvl <= 15; lvl++) {
      expect(levelFromTotalXp(xpForLevel(lvl))).toBe(lvl);
      expect(levelFromTotalXp(xpForLevel(lvl) - 1)).toBe(lvl - 1);
    }
  });
});
