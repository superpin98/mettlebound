// Mocks hoisted por Vitest — deben estar antes de los imports del código real.
// Reemplazamos @babylonjs/core y el loader GLTF para que no intenten
// arrancar APIs de navegador en el entorno Node de los tests.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@babylonjs/loaders/glTF', () => ({}));
vi.mock('@babylonjs/core', () => ({
  SceneLoader: {
    LoadAssetContainerAsync: vi.fn(),
  },
}));

import { AssetManager } from '@/core/AssetManager';
import type { AssetContainer, Scene } from '@babylonjs/core';

// ============================================================
// Helpers
// ============================================================

/** Crea un AssetContainer mínimo con todo lo que AssetManager necesita. */
function makeMockContainer(): AssetContainer {
  return {
    // mockImplementation (no mockReturnValue) para que cada llamada
    // devuelva objetos distintos — necesario en el test de instancias.
    instantiateModelsToScene: vi.fn().mockImplementation(() => ({
      rootNodes: [{ dispose: vi.fn() }],
      skeletons: [{ dispose: vi.fn() }],
      animationGroups: [
        { name: 'Idle', start: vi.fn(), stop: vi.fn(), dispose: vi.fn() },
        { name: 'Walking_A', start: vi.fn(), stop: vi.fn(), dispose: vi.fn() },
      ],
    })),
  } as unknown as AssetContainer;
}

const MOCK_SCENE = {} as unknown as Scene;
const BASE_URL = '/assets/models/characters/';
const FILENAME = 'Knight.glb';

// ============================================================
// Tests
// ============================================================

describe('AssetManager', () => {
  let mockLoader: ReturnType<typeof vi.fn>;
  let mockContainer: AssetContainer;
  let manager: AssetManager;

  beforeEach(() => {
    mockContainer = makeMockContainer();
    mockLoader = vi.fn().mockResolvedValue(mockContainer);
    manager = new AssetManager(MOCK_SCENE, mockLoader);
  });

  // ——————————————————————————————————————————
  // loadAsset — caché
  // ——————————————————————————————————————————

  describe('loadAsset — comportamiento de caché', () => {
    it('carga el asset la primera vez invocando al loader', async () => {
      await manager.loadAsset(BASE_URL, FILENAME);

      expect(mockLoader).toHaveBeenCalledTimes(1);
      expect(mockLoader).toHaveBeenCalledWith(BASE_URL, FILENAME, MOCK_SCENE);
    });

    it('la segunda llamada con el mismo filename NO invoca al loader (caché)', async () => {
      await manager.loadAsset(BASE_URL, FILENAME);
      await manager.loadAsset(BASE_URL, FILENAME);

      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it('devuelve el mismo container en la primera y segunda llamada', async () => {
      const first = await manager.loadAsset(BASE_URL, FILENAME);
      const second = await manager.loadAsset(BASE_URL, FILENAME);

      expect(first).toBe(second);
    });

    it('dos filenames distintos generan dos cargas independientes', async () => {
      await manager.loadAsset(BASE_URL, 'Knight.glb');
      await manager.loadAsset(BASE_URL, 'Mage.glb');

      expect(mockLoader).toHaveBeenCalledTimes(2);
    });

    it('mismo filename con distinta baseUrl → dos cargas distintas', async () => {
      await manager.loadAsset('/assets/models/characters/', 'file.glb');
      await manager.loadAsset('/assets/models/dungeon/', 'file.glb');

      expect(mockLoader).toHaveBeenCalledTimes(2);
    });

    it('cacheSize refleja cuántos assets distintos hay cargados', async () => {
      expect(manager.cacheSize).toBe(0);

      await manager.loadAsset(BASE_URL, 'Knight.glb');
      expect(manager.cacheSize).toBe(1);

      await manager.loadAsset(BASE_URL, 'Mage.glb');
      expect(manager.cacheSize).toBe(2);

      await manager.loadAsset(BASE_URL, 'Knight.glb'); // ya en caché
      expect(manager.cacheSize).toBe(2);
    });
  });

  // ——————————————————————————————————————————
  // instantiate
  // ——————————————————————————————————————————

  describe('instantiate', () => {
    it('llama a instantiateModelsToScene del container', async () => {
      const container = await manager.loadAsset(BASE_URL, FILENAME);
      manager.instantiate(container);

      expect(container.instantiateModelsToScene).toHaveBeenCalledTimes(1);
    });

    it('devuelve rootNode y los animation groups del GLB', async () => {
      const container = await manager.loadAsset(BASE_URL, FILENAME);
      const instance = manager.instantiate(container);

      expect(instance.rootNode).toBeDefined();
      expect(instance.animationGroups).toHaveLength(2);
      expect(instance.animationGroups[0]?.name).toBe('Idle');
      expect(instance.animationGroups[1]?.name).toBe('Walking_A');
    });

    it('dos instancias del mismo container producen rootNodes distintos', async () => {
      const container = await manager.loadAsset(BASE_URL, FILENAME);
      const a = manager.instantiate(container);
      const b = manager.instantiate(container);

      expect(a.rootNode).not.toBe(b.rootNode);
    });

    it('dispose llama a dispose() en rootNode y animationGroups', async () => {
      const container = await manager.loadAsset(BASE_URL, FILENAME);
      const instance = manager.instantiate(container);

      instance.dispose();

      type WithDispose = { dispose: ReturnType<typeof vi.fn> };
      expect((instance.rootNode as unknown as WithDispose).dispose).toHaveBeenCalled();
      for (const ag of instance.animationGroups) {
        expect((ag as unknown as WithDispose).dispose).toHaveBeenCalled();
      }
    });
  });

  // ——————————————————————————————————————————
  // clearCache
  // ——————————————————————————————————————————

  describe('clearCache', () => {
    it('vacía la caché y fuerza recarga en la siguiente llamada', async () => {
      await manager.loadAsset(BASE_URL, FILENAME);
      expect(manager.cacheSize).toBe(1);

      manager.clearCache();
      expect(manager.cacheSize).toBe(0);

      await manager.loadAsset(BASE_URL, FILENAME);
      expect(mockLoader).toHaveBeenCalledTimes(2);
    });
  });
});
