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
  // Formula cuadratica (Pieza 6): floor(XP_KILL_BASE * level * (1 + XP_KILL_FACTOR * level))
  // Con XP_KILL_BASE=10, XP_KILL_FACTOR=0.15:
  //   nivel 1  -> floor(10 * 1 * 1.15)  = 11
  //   nivel 5  -> floor(10 * 5 * 1.75)  = 87
  //   nivel 10 -> floor(10 * 10 * 2.5)  = 250
  it('enemigo nivel 1 da 11 XP', () => {
    expect(xpFromEnemy(1)).toBe(11);
  });
  it('enemigo nivel 5 da 87 XP', () => {
    expect(xpFromEnemy(5)).toBe(87);
  });
  it('enemigo nivel 10 da 250 XP', () => {
    expect(xpFromEnemy(10)).toBe(250);
  });
  it('nunca devuelve 0 o negativo', () => {
    expect(xpFromEnemy(1)).toBeGreaterThanOrEqual(1);
  });
  it('enemigo de mayor nivel da mas XP (curva cuadratica creciente)', () => {
    expect(xpFromEnemy(10)).toBeGreaterThan(xpFromEnemy(5));
    expect(xpFromEnemy(5)).toBeGreaterThan(xpFromEnemy(1));
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
  it('es coherente con xpForLevel hasta nivel 20', () => {
    for (let lvl = 2; lvl <= 20; lvl++) {
      expect(levelFromTotalXp(xpForLevel(lvl))).toBe(lvl);
      expect(levelFromTotalXp(xpForLevel(lvl) - 1)).toBe(lvl - 1);
    }
  });
  it('sin tope de nivel: funciona mas alla de nivel 100', () => {
    // xpForLevel(150) debe dar nivel 150 (sin cap de 100)
    expect(levelFromTotalXp(xpForLevel(150))).toBe(150);
  });
  it('sin tope de nivel: funciona mas alla de nivel 200', () => {
    expect(levelFromTotalXp(xpForLevel(200))).toBe(200);
  });
});
