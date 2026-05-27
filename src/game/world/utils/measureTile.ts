// Imports externos (Babylon.js)
import type { AssetContainer } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';

// ============================================================
// measureTileSize -- mide el tamano real de un tile KayKit
// ============================================================

/**
 * Instancia temporalmente un AssetContainer para medir el tamano
 * del tile usando el BoundingBox de su primer mesh.
 *
 * Descarta la instancia de prueba inmediatamente tras la medicion.
 * Si el mesh no tiene geometria util, retorna 2 (valor por defecto
 * de floor_tile_large.gltf.glb en el KayKit Dungeon pack).
 *
 * @param container   AssetContainer ya cargado del tile a medir.
 * @param assetManager Gestor de assets para instanciar.
 * @returns           Longitud del lado mayor del tile (en unidades Babylon).
 */
export function measureTileSize(
  container:    AssetContainer,
  assetManager: AssetManager,
): number {
  const probe = assetManager.instantiate(container);
  probe.rootNode.computeWorldMatrix(true);
  const meshes = probe.rootNode.getChildMeshes(false);
  let size = 2;

  const firstMesh = meshes[0];
  if (firstMesh !== undefined) {
    const bb = firstMesh.getBoundingInfo().boundingBox;
    const w  = bb.maximum.x - bb.minimum.x;
    const d  = bb.maximum.z - bb.minimum.z;
    size = Math.max(w, d);
  }

  probe.dispose();
  return size;
}
