// Imports externos (Babylon.js)
import { SceneLoader } from '@babylonjs/core';
import type { Scene, AssetContainer, TransformNode, AnimationGroup } from '@babylonjs/core';

// Registrar el loader GLTF/GLB con el sistema de Babylon.
// Este import tiene efecto lateral: asocia el GLTFFileLoader
// al SceneLoader para que pueda procesar archivos .glb y .gltf.
import '@babylonjs/loaders/glTF';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Tipos
// ============================================================

/**
 * Función de carga inyectable para facilitar tests sin red.
 * Por defecto usa SceneLoader.LoadAssetContainerAsync de Babylon.
 */
type LoaderFn = (
  baseUrl: string,
  filename: string,
  scene: Scene
) => Promise<AssetContainer>;

/**
 * Resultado de instanciar un AssetContainer en la escena.
 * Cada instancia tiene su propio rootNode y animation groups
 * completamente independientes del container origen.
 */
export interface AssetInstance {
  /** Nodo raíz del modelo. Úsalo para posición, rotación y escala. */
  rootNode: TransformNode;
  /** Animation groups de esta instancia (independientes del container). */
  animationGroups: AnimationGroup[];
  /**
   * Libera todos los recursos de esta instancia (meshes + animaciones).
   * Llamar siempre al sustituir un modelo por otro para evitar leaks.
   */
  dispose: () => void;
}

// ============================================================
// AssetManager
//
// Responsabilidades:
//   - Cargar GLB/GLTF en un AssetContainer vía SceneLoader
//   - Cachear los containers por (baseUrl + filename) para
//     no recargar el mismo archivo más de una vez en la sesión
//   - Instanciar copias independientes del container en la escena
//
// NO gestiona el ciclo de vida de las instancias.
// El llamante es responsable de llamar AssetInstance.dispose()
// cuando ya no necesite el modelo.
// ============================================================

export class AssetManager {
  private readonly _scene: Scene;
  private readonly _cache = new Map<string, AssetContainer>();
  private readonly _loader: LoaderFn;
  private _instanceCounter = 0;

  /**
   * @param scene  Escena Babylon donde se instanciarán los modelos.
   * @param loader Función de carga. Omitir en producción (usa Babylon).
   *               Sustituir por vi.fn() en tests para aislar la red.
   */
  constructor(scene: Scene, loader?: LoaderFn) {
    this._scene = scene;
    this._loader =
      loader ??
      ((baseUrl, filename, sc) =>
        SceneLoader.LoadAssetContainerAsync(baseUrl, filename, sc));
  }

  // ——————————————————————————————————————————
  // Carga con caché
  // ——————————————————————————————————————————

  /**
   * Devuelve el AssetContainer del archivo indicado.
   * La primera vez lo carga desde disco (async).
   * Las siguientes devuelven el container cacheado en memoria.
   *
   * @param baseUrl  Ruta base, p.ej. '/assets/models/characters/'
   * @param filename Nombre del archivo, p.ej. 'Knight.glb'
   */
  async loadAsset(baseUrl: string, filename: string): Promise<AssetContainer> {
    const key = `${baseUrl}${filename}`;
    const cached = this._cache.get(key);

    if (cached) {
      logger.debug('AssetManager: caché hit', { filename });
      return cached;
    }

    logger.info('AssetManager: cargando asset', { filename });
    const container = await this._loader(baseUrl, filename, this._scene);
    this._cache.set(key, container);
    logger.info('AssetManager: asset cargado y cacheado', { filename });
    return container;
  }

  // ——————————————————————————————————————————
  // Instanciación
  // ——————————————————————————————————————————

  /**
   * Crea una instancia independiente del container en la escena.
   * Cada llamada produce un rootNode y animation groups únicos.
   *
   * @param container Container previamente cargado con loadAsset().
   */
  instantiate(container: AssetContainer): AssetInstance {
    const id = ++this._instanceCounter;

    // Prefijo único por instancia para evitar colisiones de nombres
    // cuando se instancian varios modelos del mismo GLB.
    const entries = container.instantiateModelsToScene(
      (name) => `${name}_inst${id}`
    );

    const rootNode = entries.rootNodes[0];
    if (!rootNode) {
      throw new Error(
        'AssetManager.instantiate: el container no tiene nodos raíz'
      );
    }

    return {
      rootNode,
      animationGroups: entries.animationGroups,
      dispose: () => {
        entries.animationGroups.forEach((ag) => ag.dispose());
        entries.rootNodes.forEach((n) => n.dispose());
        entries.skeletons.forEach((s) => s.dispose());
      },
    };
  }

  // ——————————————————————————————————————————
  // Utilidades
  // ——————————————————————————————————————————

  /**
   * Vacía la caché de containers.
   * NO dispone los containers — responsabilidad del llamante.
   */
  clearCache(): void {
    this._cache.clear();
  }

  /** Número de entries actualmente en caché (útil para tests y debug). */
  get cacheSize(): number {
    return this._cache.size;
  }
}
