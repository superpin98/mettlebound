// Imports externos (Babylon.js)
import {
  Vector3,
  Color3,
  PointLight,
  TransformNode,
  MeshBuilder,
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
// TorchDef -- definicion de una antorcha montada en pared
// ============================================================

/**
 * Parametros que describen la posicion y orientacion de una antorcha en pared.
 * Usados por buildMountedTorch en TestRoom y salas de exploracion A2-b3.
 */
export interface TorchDef {
  /** Posicion world del punto de montaje en la pared. */
  pos: Vector3;
  /** Rotacion Y del wrapper (orienta el modelo hacia el interior). */
  rotY: number;
  /** Vector unitario desde la pared hacia el centro de la sala. */
  inward: Vector3;
  /** Etiqueta para nombrar nodos, ej: "Sur", "Norte". */
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
 *   4. FlameEffect (particulas ascendentes).
 *   5. FlameSprite (billboard pixel art animado).
 *
 * @param scene        Escena Babylon activa.
 * @param assetManager Gestor de assets.
 * @param container    AssetContainer ya cargado de torch_mounted.
 * @param def          Posicion, rotacion, inward y label de la antorcha.
 * @param parentNode   TransformNode al que anclar el wrapper y la luz.
 *                     Si se omite, los nodos no tienen parent explicito.
 * @returns            PointLight creada, para anadir a _lightSources.
 */
export function buildMountedTorch(
  scene:        Scene,
  assetManager: AssetManager,
  container:    AssetContainer,
  def:          TorchDef,
  parentNode?:  TransformNode,
): PointLight {
  const { pos, rotY, inward, label } = def;

  // Wrapper: posicion en la pared + yaw
  const wrapper = new TransformNode(`torchWrapper_${label}`, scene);
  wrapper.position = pos;
  wrapper.rotation.y = rotY;
  if (parentNode !== undefined) {
    wrapper.parent = parentNode;
  }

  // Modelo 3D: hijo del wrapper, sin rotacion adicional
  const torch = assetManager.instantiate(container);
  torch.rootNode.parent   = wrapper;
  torch.rootNode.position = Vector3.Zero();

  // Posicion de la llama: punto de montaje + subida + nudge hacia interior
  const lightPos = new Vector3(
    pos.x + inward.x * TORCH_LIGHT_INWARD,
    pos.y + TORCH_LIGHT_Y,
    pos.z + inward.z * TORCH_LIGHT_INWARD,
  );

  // 1. Luz puntual ambar
  const light = new PointLight(`torchLight_${label}`, lightPos, scene);
  light.diffuse   = TORCH_DIFFUSE;
  light.intensity = TORCH_INTENSITY;
  light.range     = TORCH_RANGE;
  if (parentNode !== undefined) {
    light.parent = parentNode;
  }

  // 2. Particulas ascendentes (fondo de la llama)
  FlameEffect.createAt(scene, lightPos);

  // 3. Sprite billboard pixel art animado (cuerpo central de la llama)
  const lateral   = Vector3.Cross(Vector3.Up(), inward);
  const spritePos = new Vector3(
    wrapper.position.x + inward.x * TORCH_FLAME_FORWARD + lateral.x * TORCH_FLAME_LATERAL,
    wrapper.position.y + TORCH_FLAME_OFFSET_Y,
    wrapper.position.z + inward.z * TORCH_FLAME_FORWARD + lateral.z * TORCH_FLAME_LATERAL,
  );
  FlameSprite.createAt(scene, spritePos, FLAME_SPRITE_SIZE);

  logger.debug(`RoomGeometry: antorcha '${label}' colocada`, {
    pos:      { x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2) },
    lightPos: { x: lightPos.x.toFixed(2), y: lightPos.y.toFixed(2), z: lightPos.z.toFixed(2) },
  });

  return light;
}

// ============================================================
// buildFloorMesh -- suelo plano para un area de sala
// ============================================================

/**
 * Crea un mesh de suelo plano en y=0 para un area de la sala.
 * Lo ancla al parentNode para que rootNode.dispose() lo limpie.
 *
 * @param scene      Escena Babylon activa.
 * @param parentNode TransformNode padre (rootNode de la sala).
 * @param id         Nombre del mesh en la escena.
 * @param cx         Centro X en world space.
 * @param cz         Centro Z en world space.
 * @param width      Ancho en el eje X.
 * @param depth      Profundidad en el eje Z.
 * @returns          El mesh de suelo creado.
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
// buildWallMesh -- pared como caja
// ============================================================

/**
 * Crea un mesh de pared (caja) anclado al padre.
 *
 * @param scene      Escena Babylon activa.
 * @param parentNode TransformNode padre (rootNode de la sala).
 * @param id         Nombre del mesh.
 * @param cx cy cz   Centro del box en world space.
 * @param w  h  d    Width, height, depth del box.
 * @returns          El mesh de pared creado.
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
