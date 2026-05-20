import { describe, it, expect, beforeEach } from 'vitest';
import { Combatant } from '@/game/combat/Combatant';

describe('Combatant', () => {

  let c: Combatant;

  beforeEach(() => {
    c = new Combatant(200);
  });

  // --- Constructor ----------------------------------------------------------

  it('se inicializa con currentHp igual a maxHp', () => {
    expect(c.currentHp).toBe(200);
    expect(c.maxHp).toBe(200);
  });

  it('isDead es false al crearse', () => {
    expect(c.isDead).toBe(false);
  });

  it('hpPercent es 1 al crearse', () => {
    expect(c.hpPercent).toBe(1);
  });

  // --- takeDamage -----------------------------------------------------------

  it('takeDamage reduce currentHp correctamente', () => {
    c.takeDamage(25);
    expect(c.currentHp).toBe(175);
  });

  it('takeDamage clampea a 0 (no HP negativo)', () => {
    c.takeDamage(999);
    expect(c.currentHp).toBe(0);
  });

  it('isDead es true cuando currentHp llega a 0', () => {
    c.takeDamage(200);
    expect(c.isDead).toBe(true);
  });

  it('hpPercent es 0.5 con la mitad de HP', () => {
    c.takeDamage(100);
    expect(c.hpPercent).toBe(0.5);
  });

  // --- heal -----------------------------------------------------------------

  it('heal suma HP correctamente', () => {
    c.takeDamage(100);
    c.heal(30);
    expect(c.currentHp).toBe(130);
  });

  it('heal clampea a maxHp (no sobreHP)', () => {
    c.takeDamage(10);
    c.heal(999);
    expect(c.currentHp).toBe(200);
  });

  // --- restoreToFull --------------------------------------------------------

  it('restoreToFull devuelve HP al maximo', () => {
    c.takeDamage(150);
    c.restoreToFull();
    expect(c.currentHp).toBe(200);
    expect(c.isDead).toBe(false);
  });

});
