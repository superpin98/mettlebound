import { describe, it, expect } from 'vitest';
import { CLASS_DEFINITIONS } from '@/config/classes.config';
import type { ClassId } from '@/types/game.types';

// Mapeo canónico clase → modelo (fuente de verdad: assets/README.md)
const EXPECTED_MODELS: Record<ClassId, string> = {
  guerrero: 'Knight.glb',
  cazador: 'Rogue.glb',
  mago: 'Mage.glb',
  picaro: 'Rogue_Hooded.glb',
  errante: 'Barbarian.glb',
};

describe('CLASS_DEFINITIONS — campo modelAssetId', () => {
  it('todas las clases tienen modelAssetId definido', () => {
    for (const cls of CLASS_DEFINITIONS) {
      expect(cls.modelAssetId, `clase '${cls.id}' sin modelAssetId`).toBeDefined();
    }
  });

  it('todos los modelAssetId terminan en .glb', () => {
    for (const cls of CLASS_DEFINITIONS) {
      expect(cls.modelAssetId, `clase '${cls.id}'`).toMatch(/\.glb$/);
    }
  });

  it('cada clase apunta al modelo correcto segun el mapeo canónico', () => {
    for (const cls of CLASS_DEFINITIONS) {
      expect(cls.modelAssetId).toBe(EXPECTED_MODELS[cls.id]);
    }
  });

  it('no hay dos clases apuntando al mismo modelo (excepto errante como placeholder)', () => {
    // Errante usa Barbarian.glb como placeholder documentado — es el único duplicado
    // permitido: ningún otro par de clases debe compartir modelo.
    const nonErrante = CLASS_DEFINITIONS.filter((c) => c.id !== 'errante');
    const models = nonErrante.map((c) => c.modelAssetId);
    const unique = new Set(models);
    expect(unique.size).toBe(models.length);
  });
});
