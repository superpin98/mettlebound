// Imports externos (Babylon.js)
import {
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import type { Scene, TransformNode, Mesh } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import { logger } from '@/core/Logger';

// ============================================================
// SpawnAltar -- altar de spawn del jugador
// ============================================================

/**
 * Prop visual que marca el punto de spawn del jugador en el HubRoom.
 *
 * En A2-b3: placeholder geometrico (caja plana con emision azulada).
 * future A2-b4: reemplazar por modelo KayKit altar.gltf.glb o equivalente.
 *
 * No implementa InteractableProp en este sprint.
 * future A3: anadir InteractableProp para activacion via VectorSystem.
 *
 * Ciclo de vida:
 *   SpawnAltar.create(scene, position, parentNode?) -> SpawnAltar
 *   altar.dispose()
 */
export class SpawnAltar {

  // --- Datos publicos ----------------------------------------

  /** Posicion world del altar (centro del mesh, y=0 = nivel suelo). */
  readonly worldPosition: Vec3;

  // --- Estado privado ----------------------------------------

  private readonly _mesh: Mesh;

  // --- Constructor privado -----------------------------------

  private constructor(worldPosition: Vec3, mesh: Mesh) {
    this.worldPosition = worldPosition;
    this._mesh         = mesh;
  }

  // --- Factory estatica -------------------------------------

  /**
   * Crea un SpawnAltar en la posicion indicada.
   *
   * @param scene      Escena Babylon activa.
   * @param position   Posicion world del altar (y=0 = nivel suelo).
   * @param parentNode TransformNode padre para que dispose() lo limpie.
   *                   Si se omite, el mesh no tiene parent explicito.
   * @returns          Instancia lista para usar.
   */
  static create(
    scene:       Scene,
    position:    Vec3,
    parentNode?: TransformNode,
  ): SpawnAltar {
    // Caja plana: 1.5u ancho x 0.2u alto x 1.5u profundo
    // Elevada 0.1u para que descanse visualmente sobre el suelo
    const mesh = MeshBuilder.CreateBox(
      'spawnAltar',
      { width: 1.5, height: 0.2, depth: 1.5 },
      scene,
    );
    mesh.position = new Vector3(position.x, position.y + 0.1, position.z);

    // Material emisivo azulado (placeholder visual)
    const mat         = new StandardMaterial('spawnAltarMat', scene);
    mat.emissiveColor = new Color3(0.2, 0.6, 1.0);
    mesh.material     = mat;

    if (parentNode !== undefined) {
      mesh.parent = parentNode;
    }

    logger.info(
      `SpawnAltar: creado en (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`,
    );

    return new SpawnAltar(position, mesh);
  }

  // --- Dispose -----------------------------------------------

  /**
   * Destruye el mesh del altar.
   * Si el mesh tiene parent, ya sera destruido por parentNode.dispose().
   * Llamar solo si se necesita destruir el altar sin destruir la sala.
   */
  dispose(): void {
    this._mesh.dispose();
    logger.debug('SpawnAltar: disposed.');
  }
}
