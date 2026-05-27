// Mocks hoisted por Vitest
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock de Babylon.js: Animation + tipos usados por LightingTransition
vi.mock('@babylonjs/core', () => ({
  Animation: {
    CreateAndStartAnimation: vi.fn().mockReturnValue({ stop: vi.fn() }),
    ANIMATIONLOOPMODE_CONSTANT: 0,
  },
}));

import { Animation } from '@babylonjs/core';
import type { PointLight, Scene } from '@babylonjs/core';
import {
  fadeOut,
  fadeIn,
  cancelTransitions,
  TRANSITION_DURATION_MS,
} from '@/game/world/LightingTransition';

// ============================================================
// Helpers
// ============================================================

function makeLight(name: string, intensity: number): PointLight {
  return { name, intensity } as unknown as PointLight;
}

const MOCK_SCENE = {} as unknown as Scene;

// ============================================================
// Tests
// ============================================================

describe('LightingTransition', () => {
  beforeEach(() => {
    vi.mocked(Animation.CreateAndStartAnimation).mockClear();
    vi.mocked(Animation.CreateAndStartAnimation).mockReturnValue({ stop: vi.fn() } as never);
  });

  // ──────────────────────────────────────────
  // fadeOut
  // ──────────────────────────────────────────

  describe('fadeOut', () => {
    it('no llama a Animation con array vacio (no-op seguro)', () => {
      const result = fadeOut([], MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('llama a CreateAndStartAnimation una vez por luz', () => {
      const lights = [makeLight('torch_01', 1.0), makeLight('torch_02', 0.8)];
      fadeOut(lights, MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).toHaveBeenCalledTimes(2);
    });

    it('anima la propiedad "intensity" de cada luz', () => {
      const light = makeLight('torch_01', 1.0);
      fadeOut([light], MOCK_SCENE);
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      expect(args?.[2]).toBe('intensity');
    });

    it('el valor destino siempre es 0', () => {
      const light = makeLight('torch_01', 1.0);
      fadeOut([light], MOCK_SCENE);
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      // arg index 6 = toValue
      expect(args?.[6]).toBe(0);
    });

    it('el valor origen es la intensidad actual de la luz', () => {
      const light = makeLight('torch_01', 0.75);
      fadeOut([light], MOCK_SCENE);
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      // arg index 5 = fromValue
      expect(args?.[5]).toBe(0.75);
    });

    it('omite luces que ya tienen intensity = 0', () => {
      const alreadyOff = makeLight('torch_off', 0);
      const on         = makeLight('torch_on',  1.0);
      fadeOut([alreadyOff, on], MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).toHaveBeenCalledTimes(1);
    });

    it('devuelve array con un Animatable por luz animada', () => {
      const lights = [makeLight('a', 1.0), makeLight('b', 0.5)];
      const result = fadeOut(lights, MOCK_SCENE);
      expect(result).toHaveLength(2);
    });

    it('usa TRANSITION_DURATION_MS por defecto (30 frames a 60fps)', () => {
      const light = makeLight('torch_01', 1.0);
      fadeOut([light], MOCK_SCENE);
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      // arg index 4 = totalFrames; 500ms / 1000 * 60fps = 30 frames
      const expectedFrames = Math.max(1, Math.round((TRANSITION_DURATION_MS / 1000) * 60));
      expect(args?.[4]).toBe(expectedFrames);
    });

    it('respeta duracion personalizada', () => {
      const light = makeLight('torch_01', 1.0);
      fadeOut([light], MOCK_SCENE, 1000); // 1 segundo = 60 frames
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      expect(args?.[4]).toBe(60);
    });
  });

  // ──────────────────────────────────────────
  // fadeIn
  // ──────────────────────────────────────────

  describe('fadeIn', () => {
    it('no llama a Animation con array vacio (no-op seguro)', () => {
      const result = fadeIn([], MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('llama a CreateAndStartAnimation una vez por target', () => {
      const targets = [
        { light: makeLight('a', 0), targetIntensity: 1.0 },
        { light: makeLight('b', 0), targetIntensity: 0.5 },
      ];
      fadeIn(targets, MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).toHaveBeenCalledTimes(2);
    });

    it('el valor destino es targetIntensity', () => {
      const targets = [{ light: makeLight('a', 0), targetIntensity: 0.8 }];
      fadeIn(targets, MOCK_SCENE);
      const args = vi.mocked(Animation.CreateAndStartAnimation).mock.calls[0];
      // arg index 6 = toValue
      expect(args?.[6]).toBe(0.8);
    });

    it('omite luces que ya estan en targetIntensity', () => {
      const targets = [
        { light: makeLight('a', 1.0), targetIntensity: 1.0 }, // ya en destino
        { light: makeLight('b', 0.0), targetIntensity: 1.0 }, // necesita animar
      ];
      fadeIn(targets, MOCK_SCENE);
      expect(Animation.CreateAndStartAnimation).toHaveBeenCalledTimes(1);
    });

    it('devuelve Animatables para las luces animadas', () => {
      const targets = [{ light: makeLight('a', 0), targetIntensity: 1.0 }];
      const result = fadeIn(targets, MOCK_SCENE);
      expect(result).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────
  // cancelTransitions
  // ──────────────────────────────────────────

  describe('cancelTransitions', () => {
    it('llama stop() en cada Animatable', () => {
      const stopA = vi.fn();
      const stopB = vi.fn();
      const animatables = [{ stop: stopA }, { stop: stopB }] as never[];
      cancelTransitions(animatables);
      expect(stopA).toHaveBeenCalledOnce();
      expect(stopB).toHaveBeenCalledOnce();
    });

    it('vacia el array tras cancelar', () => {
      const animatables = [{ stop: vi.fn() }] as never[];
      cancelTransitions(animatables);
      expect(animatables).toHaveLength(0);
    });

    it('con array vacio no lanza error', () => {
      expect(() => cancelTransitions([])).not.toThrow();
    });
  });
});
