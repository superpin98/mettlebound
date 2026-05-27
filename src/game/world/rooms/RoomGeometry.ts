// Imports externos (Babylon.js)
import {
  Vector3,
  Color3,
  PointLight,
  TransformNode,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { Scene, AssetContainer, Mesh } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import { FlameEffect } from '@/game/world/FlameEffect';
import { FlameSprite } from '@/game/world/FlameSprite';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de antorchas -- compartidas por TestRoom y salas de A2-b3
// ============================================================

/** Altura del punto de montaje de la antorcha en la pared. */
export const TORCH_Y            = 1.0;

/** Separacion del rootNode respecto a la superficie de la pared. */
export const TORCH_WALL_INSET   = 0.25;

/** Altura desde el wrapper hasta la llama (tope de la U). */
export const TORCH_LIGHT_Y      = 0.55;

/** Desplazamiento hacia el centro de la sala para la PointLight. */
export const TORCH_LIGHT_INWARD = 0.15;

/** Altura del sprite de llama respecto al wrapper. */
export const TORCH_FLAME_OFFSET_Y = 0.70;

/** Cuanto sobresale la llama hacia el interior de la sala. */
export const TORCH_FLAME_FORWARD  = 0.3;

/** Desplazamiento lateral de la llama, paralelo a la pared. */
export const TORCH_FLAME_LATERAL  = 0.03;

/** Tamano del sprite billboard de la llama. */
export const FLAME_SPRITE_SIZE    = 0.90;

/** Color difuso de las antorchas (ambar calido). */
export const TORCH_DIFFUSE        = new Color3(1.0, 0.5, 0.15);

/** Intensidad de la PointLight de antorcha. */
export const TORCH_INTENSITY      = 1.2;

/** Radio de iluminacion de la PointLight. */
export const TORCH_RANGE          = 6;

// ============================================================
// Constantes de colisores de pared
// ============================================================

/** Altura del collider de pared (cubre al jugador de pie). */
export const WALL_H_COLLIDER  = 2;

/** Grosor del collider de segmento de pared recta. */
export const WALL_T_COLLIDER  = 0.5;

/** Tamano del collider de esquina. */
export const CORNER_T_COLLIDER = 0.7;

// ============================================================
// TorchDef -- definicion de una antorcha montada en pared
// ============================================================

/**
 * Parametros que describen la posicion y orientacion de una antorcha en pared.
 * Usados por buildMountedTorch en TestRoom y salas de exploracion A2-b3.
 */
export interface TorchDef {
  /** Posicion local del punto de montaje en la pared (respecto al parentNode). */
  pos: Vector3;
  /** Rotacion Y del wrapper (orienta el modelo hacia el interior). */
  rotY: number;
  /** Vector unitario desde la pared hacia el centro de la sala. */
  inward: Vector3;
  /** Etiqueta para nombrar nodos, ej: "Sur", "Norte". */
  label: string;
}

// ============================================================
// WallSegment -- descriptor de un segmento de pared KayKit
// ============================================================

/**
 * Tipo de segmento de pared.
 *   wall    -- segmento solido con collider Havok.
 *   corner  -- esquina solida con collider Havok.
 *   doorway -- paso abierto, SIN collider (atravesable).
 *   gated   -- paso bloqueado con reja, CON collider Havok.
 */
export type WallSegmentType = 'wall' | 'corner' | 'doorway' | 'gated';

/**
 * Descriptor de un segmento de pared para buildWallSegments().
 * Posicion y rotacion en espacio LOCAL del rootNode de la sala.
 */
export interface WallSegment {
  /** Centro X en espacio local de la sala. */
  x: number;
  /** Centro Z en espacio local de la sala. */
  z: number;
  /** Rotacion Y en radianes (convenciones de TestRoom). */
  rotY: number;
  /** Tipo de segmento y asset a usar. */
  type: WallSegmentType;
  /**
   * Eje a lo largo del cual corre la pared:
   *   'x'      -- pared N/S (segmento ocupa ancho en X)
   *   'z'      -- pared E/O (segmento ocupa profundidad en Z)
   *   'corner' -- esquina (collider cuadrado)
   */
  axis: 'x' | 'z' | 'corner';
  /** Etiqueta unica para nombrar el collider. */
  label: string;
}

// ============================================================
// buildMountedTorch -- antorcha completa en pared
// ============================================================

/**
 * Construye una antorcha montada en pared con tres capas:
 *   1. TransformNode wrapper (posicion + yaw).
 *   2. Instancia del modelo torch_mounted.gltf.glb.
 *   3. PointLight ambar.
 *   4. (opcional) FlameEffect (particulas ascendentes).
 *   5. (opcional) FlameSprite (billboard pixel art animado).
 *
 * BUG B1 FIX: FlameEffect y FlameSprite necesitan posicion en WORLD space.
 * Se usa wrapper.getAbsolutePosition() tras computeWorldMatrix() para
 * obtener la posicion world correcta independientemente del parentNode.
 *
 * @param scene        Escena Babylon activa.
 * @param assetManager Gestor de assets.
 * @param container    AssetContainer ya cargado de torch_mounted.
 * @param def          Posicion, rotacion, inward y label de la antorcha.
 * @param parentNode   TransformNode al que anclar el wrapper y la luz.
 * @param withFlame    Si true (defecto), crea FlameEffect + FlameSprite.
 *                     Pasar false en salas nuevas del dungeon para evitar
 *                     sprites flotantes (los efectos se implementaran con
 *                     posicionado correcto en A2-b5).
 * @returns            PointLight creada, para anadir a _lightSources.
 */
export function buildMountedTorch(
  scene:        Scene,
  assetManager: AssetManager,
  container:    AssetContainer,
  def:          TorchDef,
  parentNode?:  TransformNode,
  withFlame     = true,
): PointLight {
  const { pos, rotY, inward, label } = def;

  // Wrapper: posicion LOCAL + yaw
  const wrapper = new TransformNode(`torchWrapper_${label}`, scene);
  wrapper.position = pos;
  wrapper.rotation.y = rotY;
  if (parentNode !== undefined) {
    wrapper.parent = parentNode;
  }

  // Modelo 3D: hijo del wrapper
  const torch = assetManager.instantiate(container);
  torch.rootNode.parent   = wrapper;
  torch.rootNode.position = Vector3.Zero();

  // FIX B1: calcular posicion world del wrapper DESPUES de asignar el parent,
  // para que getAbsolutePosition() devuelva la posicion world correcta.
  wrapper.computeWorldMatrix(true);
  const worldPos = wrapper.getAbsolutePosition();

  // Posicion world de la luz (ligeramente desplazada hacia el interior)
  const lightPos = new Vector3(
    worldPos.x + inward.x * TORCH_LIGHT_INWARD,
    worldPos.y + TORCH_LIGHT_Y,
    worldPos.z + inward.z * TORCH_LIGHT_INWARD,
  );

  // 1. Luz puntual ambar
  const light = new PointLight(`torchLight_${label}`, lightPos, scene);
  light.diffuse   = TORCH_DIFFUSE;
  light.intensity = TORCH_INTENSITY;
  light.range     = TORCH_RANGE;
  if (parentNode !== undefined) {
    light.parent = parentNode;
  }

  // 2. (opcional) Efectos de llama en posicion world correcta
  if (withFlame) {
    FlameEffect.createAt(scene, lightPos);

    const lateral   = Vector3.Cross(Vector3.Up(), inward);
    const spritePos = new Vector3(
      worldPos.x + inward.x * TORCH_FLAME_FORWARD + lateral.x * TORCH_FLAME_LATERAL,
      worldPos.y + TORCH_FLAME_OFFSET_Y,
      worldPos.z + inward.z * TORCH_FLAME_FORWARD + lateral.z * TORCH_FLAME_LATERAL,
    );
    FlameSprite.createAt(scene, spritePos, FLAME_SPRITE_SIZE);
  }

  logger.debug(`RoomGeometry: antorcha '${label}' colocada`, {
    worldPos: { x: worldPos.x.toFixed(2), y: worldPos.y.toFixed(2), z: worldPos.z.toFixed(2) },
    lightPos: { x: lightPos.x.toFixed(2), y: lightPos.y.toFixed(2), z: lightPos.z.toFixed(2) },
    withFlame,
  });

  return light;
}

// ============================================================
// buildFloorTiles -- suelo de tiles KayKit para un area rectangular
// ============================================================

/**
 * Cubre un area rectangular con instancias de floor_tile_large.gltf.glb.
 * Los tiles se parentan a parentNode para que rootNode.dispose() los limpie.
 *
 * @param assetManager  Gestor de assets.
 * @param floorContainer AssetContainer del tile de suelo.
 * @param parentNode    TransformNode padre (rootNode de la sala).
 * @param cx            Centro X en espacio LOCAL de la sala.
 * @param cz            Centro Z en espacio LOCAL de la sala.
 * @param width         Ancho del area en unidades Babylon.
 * @param depth         Profundidad del area en unidades Babylon.
 * @param tileSize      Tamano real del tile (medido con measureTileSize).
 */
export function buildFloorTiles(
  assetManager:   AssetManager,
  floorContainer: AssetContainer,
  parentNode:     TransformNode,
  cx:             number,
  cz:             number,
  width:          number,
  depth:          number,
  tileSize:       number,
): void {
  const cols = Math.round(width / tileSize);
  const rows = Math.round(depth / tileSize);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cx + (c - cols / 2 + 0.5) * tileSize;
      const z = cz + (r - rows / 2 + 0.5) * tileSize;
      const tile = assetManager.instantiate(floorContainer);
      tile.rootNode.parent   = parentNode;
      tile.rootNode.position = new Vector3(x, 0, z);
    }
  }
  logger.debug('RoomGeometry: tiles de suelo colocados', { cx, cz, width, depth, cols, rows });
}

// ============================================================
// buildWallSegments -- paredes KayKit con colliders Havok
// ============================================================

/**
 * Coloca una lista de segmentos de pared KayKit (wall, corner, doorway, gated)
 * y crea PhysicsAggregate BOX (mass=0) para los segmentos solidos.
 *
 * Los assets visuales se parentan a parentNode.
 * Los colliders de fisica se crean en posicion WORLD absoluta (sin parent)
 * para compatibilidad garantizada con Havok en posicion fija.
 *
 * Convencion de rotaciones (heredada de TestRoom / wall.gltf.glb):
 *   rotY=0      -- pared Sur  (cara hacia +Z, interior norte)
 *   rotY=PI     -- pared Norte (cara hacia -Z, interior sur)
 *   rotY=PI/2   -- pared Oeste (cara hacia +X, interior este)
 *   rotY=-PI/2  -- pared Este  (cara hacia -X, interior oeste)
 *
 * Convencion wall_corner:
 *   SO(rotY=0) SE(rotY=PI/2) NE(rotY=PI) NO(rotY=-PI/2)
 *
 * @param scene          Escena Babylon activa (Havok inicializado).
 * @param assetManager   Gestor de assets.
 * @param parentNode     TransformNode de la sala (ya en posicion world final).
 * @param wallC          Container de wall.gltf.glb.
 * @param cornerC        Container de wall_corner.gltf.glb.
 * @param doorwayC       Container de wall_doorway.glb (sin collider).
 * @param gatedC         Container de wall_gated.gltf.glb (con collider).
 * @param segments       Lista de segmentos calculada por _computeWallSegments().
 * @param tileSize       Tamano del tile para dimensionar colliders.
 * @param roomId         ID de sala para nombrar meshes de collider.
 */
export function buildWallSegments(
  scene:       Scene,
  assetManager: AssetManager,
  parentNode:  TransformNode,
  wallC:       AssetContainer,
  cornerC:     AssetContainer,
  doorwayC:    AssetContainer,
  gatedC:      AssetContainer,
  segments:    WallSegment[],
  tileSize:    number,
  roomId:      string,
): void {
  // Posicion world del parentNode (solo traslacion; no hay rotacion en rootNode)
  const px = parentNode.position.x;
  const pz = parentNode.position.z;

  for (const seg of segments) {
    // -- Visual ------------------------------------------------
    let container: AssetContainer;
    switch (seg.type) {
      case 'wall':    container = wallC;    break;
      case 'corner':  container = cornerC;  break;
      case 'doorway': container = doorwayC; break;
      case 'gated':   container = gatedC;   break;
    }

    const inst = assetManager.instantiate(container);
    inst.rootNode.parent   = parentNode;
    inst.rootNode.position = new Vector3(seg.x, 0, seg.z);
    inst.rootNode.rotation = new Vector3(0, seg.rotY, 0);

    // -- Collider Havok para segmentos solidos -----------------
    if (seg.type === 'wall' || seg.type === 'corner' || seg.type === 'gated') {
      let bw: number;
      let bd: number;
      if (seg.axis === 'corner') {
        bw = CORNER_T_COLLIDER;
        bd = CORNER_T_COLLIDER;
      } else if (seg.axis === 'x') {
        bw = tileSize;
        bd = WALL_T_COLLIDER;
      } else {
        bw = WALL_T_COLLIDER;
        bd = tileSize;
      }

      const box = MeshBuilder.CreateBox(
        `col_wall_${roomId}_${seg.label}`,
        { width: bw, height: WALL_H_COLLIDER, depth: bd },
        scene,
      );
      // Posicion world = offset de parentNode + posicion local del segmento
      box.position   = new Vector3(px + seg.x, WALL_H_COLLIDER / 2, pz + seg.z);
      box.isVisible  = false;
      box.isPickable = false;
      new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0 }, scene);
    }
  }

  logger.debug(`RoomGeometry: ${segments.length} segmentos de pared colocados en '${roomId}'`);
}

// ============================================================
// buildFloorMesh -- DEPRECADO (Babylon primitive, solo para compatibilidad)
// ============================================================

/**
 * @deprecated Usar buildFloorTiles con assets KayKit.
 * Mantenido para no romper mocks de tests existentes.
 * Crea un mesh de suelo plano en y=0 para un area de la sala.
 */
export function buildFloorMesh(
  scene:      Scene,
  parentNode: TransformNode,
  id:         string,
  cx:         number,
  cz:         number,
  width:      number,
  depth:      number,
): Mesh {
  const ground = MeshBuilder.CreateGround(id, { width, height: depth }, scene);
  ground.position.x = cx;
  ground.position.z = cz;
  ground.parent     = parentNode;
  return ground;
}

// ============================================================
// buildWallMesh -- DEPRECADO (Babylon primitive, solo para compatibilidad)
// ============================================================

/**
 * @deprecated Usar buildWallSegments con assets KayKit.
 * Mantenido para no romper mocks de tests existentes.
 * Crea un mesh de pared (caja) anclado al padre.
 */
export function buildWallMesh(
  scene:      Scene,
  parentNode: TransformNode,
  id:         string,
  cx:         number,
  cy:         number,
  cz:         number,
  w:          number,
  h:          number,
  d:          number,
): Mesh {
  const wall = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, scene);
  wall.position.x = cx;
  wall.position.y = cy;
  wall.position.z = cz;
  wall.parent     = parentNode;
  return wall;
}
