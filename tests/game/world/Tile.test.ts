import { describe, it, expect } from 'vitest';
import { Tile } from '@/game/world/Tile';
import type { TileData } from '@/game/world/Tile';

// ============================================================
// Helper de construccion
// ============================================================

const makeTile = (overrides: Partial<TileData> = {}): Tile =>
  new Tile({
    position:    { x: 0, y: 0, z: 0 },
    gridCoord:   { col: 0, row: 0 },
    baseTerrain: 'stone',
    fluids:      new Set(),
    modifiers:   new Set(),
    temperature: 'neutral',
    height:      0,
    blocked:     false,
    ...overrides,
  });

// ============================================================
// Tests
// ============================================================

describe('Tile', () => {

  // ——————————————————————————————————————————
  // Construccion
  // ——————————————————————————————————————————

  describe('construccion', () => {
    it('crea un tile con valores por defecto correctos', () => {
      const tile = makeTile();
      expect(tile.baseTerrain).toBe('stone');
      expect(tile.temperature).toBe('neutral');
      expect(tile.height).toBe(0);
      expect(tile.blocked).toBe(false);
      expect(tile.fluids.size).toBe(0);
      expect(tile.modifiers.size).toBe(0);
    });

    it('position.y es 0 por convencion (nivel suelo)', () => {
      const tile = makeTile({ position: { x: 3, y: 0, z: 5 } });
      expect(tile.position.y).toBe(0);
    });

    it('respeta la gridCoord asignada', () => {
      const tile = makeTile({ gridCoord: { col: 3, row: 7 } });
      expect(tile.gridCoord.col).toBe(3);
      expect(tile.gridCoord.row).toBe(7);
    });

    it('respeta el baseTerrain asignado', () => {
      expect(makeTile({ baseTerrain: 'wood' }).baseTerrain).toBe('wood');
      expect(makeTile({ baseTerrain: 'metal' }).baseTerrain).toBe('metal');
    });

    it('respeta height asignado', () => {
      expect(makeTile({ height: 2 }).height).toBe(2);
    });
  });

  // ——————————————————————————————————————————
  // Fluidos
  // ——————————————————————————————————————————

  describe('fluids', () => {
    it('addFluid anade el fluido', () => {
      const tile = makeTile();
      tile.addFluid('water');
      expect(tile.fluids.has('water')).toBe(true);
    });

    it('removeFluid elimina el fluido', () => {
      const tile = makeTile({ fluids: new Set(['oil']) });
      tile.removeFluid('oil');
      expect(tile.fluids.has('oil')).toBe(false);
    });

    it('puede tener multiples fluidos simultaneos', () => {
      const tile = makeTile();
      tile.addFluid('water');
      tile.addFluid('blood');
      expect(tile.fluids.size).toBe(2);
    });

    it('addFluid es idempotente (Set no duplica)', () => {
      const tile = makeTile();
      tile.addFluid('acid');
      tile.addFluid('acid');
      expect(tile.fluids.size).toBe(1);
    });

    it('removeFluid en fluido no presente no lanza error', () => {
      const tile = makeTile();
      expect(() => tile.removeFluid('water')).not.toThrow();
    });

    it('admite los 4 tipos de fluido', () => {
      const tile = makeTile();
      for (const f of ['water', 'oil', 'blood', 'acid'] as const) {
        tile.addFluid(f);
      }
      expect(tile.fluids.size).toBe(4);
    });
  });

  // ——————————————————————————————————————————
  // Modificadores
  // ——————————————————————————————————————————

  describe('modifiers', () => {
    it('addModifier anade el modificador', () => {
      const tile = makeTile();
      tile.addModifier('electrified');
      expect(tile.modifiers.has('electrified')).toBe(true);
    });

    it('removeModifier elimina el modificador', () => {
      const tile = makeTile({ modifiers: new Set(['frozen']) });
      tile.removeModifier('frozen');
      expect(tile.modifiers.has('frozen')).toBe(false);
    });

    it('puede tener multiples modificadores simultaneos', () => {
      const tile = makeTile();
      tile.addModifier('sticky');
      tile.addModifier('consecrated');
      expect(tile.modifiers.size).toBe(2);
    });

    it('addModifier es idempotente', () => {
      const tile = makeTile();
      tile.addModifier('electrified');
      tile.addModifier('electrified');
      expect(tile.modifiers.size).toBe(1);
    });

    it('removeModifier en modificador no presente no lanza error', () => {
      const tile = makeTile();
      expect(() => tile.removeModifier('frozen')).not.toThrow();
    });
  });

  // ——————————————————————————————————————————
  // Temperatura
  // ——————————————————————————————————————————

  describe('temperature', () => {
    it('setTemperature cambia la temperatura', () => {
      const tile = makeTile();
      tile.setTemperature('burning');
      expect(tile.temperature).toBe('burning');
    });

    it('acepta todos los valores validos', () => {
      const tile = makeTile();
      for (const t of ['cold', 'neutral', 'hot', 'burning'] as const) {
        tile.setTemperature(t);
        expect(tile.temperature).toBe(t);
      }
    });
  });

  // ——————————————————————————————————————————
  // Bloqueo / isBlocked
  // ——————————————————————————————————————————

  describe('blocked / isBlocked', () => {
    it('isBlocked devuelve false por defecto', () => {
      expect(makeTile().isBlocked()).toBe(false);
    });

    it('isBlocked devuelve true cuando blocked=true', () => {
      expect(makeTile({ blocked: true }).isBlocked()).toBe(true);
    });

    it('blocked es mutable directamente', () => {
      const tile = makeTile();
      tile.blocked = true;
      expect(tile.isBlocked()).toBe(true);
    });

    it('isBlocked refleja el valor actual de blocked', () => {
      const tile = makeTile({ blocked: true });
      tile.blocked = false;
      expect(tile.isBlocked()).toBe(false);
    });
  });

});
