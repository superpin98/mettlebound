// Imports externos (Babylon.js)
import {
  Vector3,
  Color3,
  PointLight,
} from '@babylonjs/core';
import type { Scene, AssetContainer } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuracion
// ============================================================

const DUNGEON_BASE_URL  = '/assets/models/dungeon/';
const FLOOR_FILE        = 'floor_tile_large.gltf.glb';
const WALL_FILE         = 'wall.gltf.glb';
const CORNER_FILE       = 'wall_corner.gltf.glb';
const TORCH_FILE        = 'torch_mounted.gltf.glb';
const PILLAR_FILE       = 'pillar.gltf.glb';

// Numero de tiles por lado (4x4 = 16 baldosas)
const GRID_SIZE = 4;

// Altura del punto de montaje de la antorcha en la pared
const TORCH_Y = 1.0;

// Separacion del rootNode de la antorcha respecto a la superficie de la pared.
// Sin esto el modelo queda enterrado dentro del panel de piedra y no se ve.
const TORCH_WALL_INSET = 0.35;

// Altura de la llama sobre el punto de montaje (parte superior de la antorcha)
const TORCH_FLAME_HEIGHT = 0.7;

// Luz de antorcha: ambar calido
const TORCH_DIFFUSE        = new Color3(1.0, 0.5, 0.15);
const TORCH_INTENSITY      = 1.2;
const TORCH_RANGE          = 6;

// Si es true, se colocan 4 pilares interiores decorativos
const PLACE_PILLARS = true;

// ============================================================
// TestRoom
//
// Sala estatica de prueba centrada en (0, 0, 0).
//   - Suelo    : cuadricula GRID_SIZE x GRID_SIZE de floor_tile_large
//   - Paredes  : 4 x GRID_SIZE segmentos rectos perimetrales
//   - Esquinas : 4 esquinas en los vertices del perimetro
//   - Antorchas: 1 por pared (N, S, E, O) centradas, con PointLight
//                en la posicion de la llama (TORCH_WALL_INSET hacia el interior)
//   - Pilares  : 4 interiores (controlados por PLACE_PILLARS)
//
// _isBuilt previene doble llamada a build() (guard anti-duplicacion).
// El tamano de tile se mide dinamicamente con getBoundingInfo().
// markAllMaterialsAsDirty fuerza recompilacion de shaders con las 4 PointLights.
// ============================================================

export class TestRoom {

  /** Guard: impide que build() cree la sala mas de una vez. */
  private static _isBuilt = false;

  /**
   * Construye la sala de prueba en la escena.
   * Llamar una sola vez tras playerController.loadModel().
   * Si se llama de nuevo, registra una advertencia y retorna sin hacer nada.
   */
  static async build(scene: Scene, assetManager: AssetManager): Promise<void> {
    if (TestRoom._isBuilt) {
      logger.warn('TestRoom: build() llamado mas de una vez -- ignorado.');
      return;
    }
    TestRoom._isBuilt = true;

    logger.info('TestRoom: construyendo sala...');
    logger.debug('TestRoom: luces en escena al iniciar build', {
      count: scene.lights.length,
      names: scene.lights.map((l) => l.name),
    });

    // Carga paralela de todos los containers
    const [
      floorContainer,
      wallContainer,
      cornerContainer,
      torchContainer,
      pillarContainer,
    ] = await Promise.all([
      assetManager.loadAsset(DUNGEON_BASE_URL, FLOOR_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, WALL_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, CORNER_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, PILLAR_FILE),
    ]);

    // Medir el tamano real del tile (instancia temporal, descartada tras medir)
    const tileSize = TestRoom._measureTileSize(floorContainer, assetManager);

    // half = distancia del centro al borde exterior del suelo
    const half = (GRID_SIZE / 2) * tileSize;

    logger.debug('TestRoom: dimensiones calculadas', {
      tileSize,
      sideLength: GRID_SIZE * tileSize,
    });

    TestRoom._buildFloor(assetManager, floorContainer, tileSize);
    TestRoom._buildWalls(assetManager, wallContainer, tileSize, half);
    TestRoom._buildCorners(assetManager, cornerContainer, half);
    TestRoom._buildTorches(scene, assetManager, torchContainer, half);

    if (PLACE_PILLARS) {
      TestRoom._buildPillars(assetManager, pillarContainer, tileSize);
    }

    // FIX: fuerza recompilacion de shaders para que los materiales vean
    // las 4 PointLights recien anadidas. Sin esto solo se activa 1 luz
    // al inicio porque los shaders se compilaron antes con solo 2 luces globales.
    // MATERIAL_LightDirtyFlag = 1
    scene.markAllMaterialsAsDirty(1);

    logger.info('TestRoom: sala construida.', {
      tileSize,
      sideLength: GRID_SIZE * tileSize,
      lucesEnEscena: scene.lights.length,
      nombresLuces: scene.lights.map((l) => l.name),
    });
  }

  // ----------------------------------------------------------

  /**
   * Instancia una prueba temporal, lee el BoundingBox del primer
   * mesh hijo y devuelve la dimension mayor (X o Z).
   * Fallback: 2 (tamano estandar KayKit).
   */
  private static _measureTileSize(
    container: AssetContainer,
    assetManager: AssetManager,
  ): number {
    const probe = assetManager.instantiate(container);
    probe.rootNode.computeWorldMatrix(true);
    const meshes = probe.rootNode.getChildMeshes(false);
    let size = 2;

    const firstMesh = meshes[0];
    if (firstMesh !== undefined) {
      const bb = firstMesh.getBoundingInfo().boundingBox;
      const w = bb.maximum.x - bb.minimum.x;
      const d = bb.maximum.z - bb.minimum.z;
      size = Math.max(w, d);
    }

    probe.dispose();
    return size;
  }

  // ----------------------------------------------------------

  private static _buildFloor(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
  ): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = (col - GRID_SIZE / 2 + 0.5) * tileSize;
        const z = (row - GRID_SIZE / 2 + 0.5) * tileSize;
        const tile = assetManager.instantiate(container);
        tile.rootNode.position = new Vector3(x, 0, z);
      }
    }
    logger.debug('TestRoom: suelo colocado', { tiles: GRID_SIZE * GRID_SIZE });
  }

  // ----------------------------------------------------------

  /**
   * Coloca GRID_SIZE paredes por lado (16 total).
   * Rotaciones: wall.gltf.glb mira hacia +Z por defecto.
   *   Sur  (z=-half): rotY=0       Norte(z=+half): rotY=PI
   *   Oeste(x=-half): rotY=PI/2    Este (x=+half): rotY=-PI/2
   */
  private static _buildWalls(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
    half: number,
  ): void {
    const sides: { rotY: number; along: 'x' | 'z'; at: number }[] = [
      { rotY: 0,             along: 'x', at: -half },  // Sur
      { rotY: Math.PI,       along: 'x', at:  half },  // Norte
      { rotY: Math.PI / 2,   along: 'z', at: -half },  // Oeste
      { rotY: -Math.PI / 2,  along: 'z', at:  half },  // Este
    ];

    for (const { rotY, along, at } of sides) {
      for (let i = 0; i < GRID_SIZE; i++) {
        const offset = (i - GRID_SIZE / 2 + 0.5) * tileSize;
        const wall = assetManager.instantiate(container);
        wall.rootNode.position =
          along === 'x'
            ? new Vector3(offset, 0, at)
            : new Vector3(at, 0, offset);
        wall.rootNode.rotation = new Vector3(0, rotY, 0);
      }
    }
    logger.debug('TestRoom: paredes colocadas', { count: 4 * GRID_SIZE });
  }

  // ----------------------------------------------------------

  /**
   * Coloca 4 esquinas en los vertices del perimetro.
   * Rotaciones: wall_corner mira al cuadrante -X/-Z por defecto.
   *   SO: rotY=0  SE: rotY=PI/2  NE: rotY=PI  NO: rotY=-PI/2
   */
  private static _buildCorners(
    assetManager: AssetManager,
    container: AssetContainer,
    half: number,
  ): void {
    const corners: { sx: -1 | 1; sz: -1 | 1; rotY: number }[] = [
      { sx: -1, sz: -1, rotY: 0            },  // SO
      { sx:  1, sz: -1, rotY: Math.PI / 2  },  // SE
      { sx:  1, sz:  1, rotY: Math.PI      },  // NE
      { sx: -1, sz:  1, rotY: -Math.PI / 2 },  // NO
    ];

    for (const { sx, sz, rotY } of corners) {
      const corner = assetManager.instantiate(container);
      corner.rootNode.position = new Vector3(sx * half, 0, sz * half);
      corner.rootNode.rotation = new Vector3(0, rotY, 0);
    }
    logger.debug('TestRoom: esquinas colocadas', { count: 4 });
  }

  // ----------------------------------------------------------

  /**
   * Coloca 1 antorcha por pared (N, S, E, O), centrada.
   *
   * El rootNode se desplaza TORCH_WALL_INSET unidades hacia el interior
   * de la sala para que la geometria del modelo quede visible delante
   * de la superficie de piedra, no enterrada dentro del panel de pared.
   *
   * La PointLight se coloca TORCH_FLAME_HEIGHT por encima del rootNode.
   *
   * Rotaciones (antorchas E/O son 90 grados respecto a N/S):
   *   Sur  rotY=0      Norte rotY=PI
   *   Oeste rotY=PI/2  Este  rotY=-PI/2
   */
  private static _buildTorches(
    scene: Scene,
    assetManager: AssetManager,
    container: AssetContainer,
    half: number,
  ): void {
    const BY  = TORCH_Y;
    const INS = TORCH_WALL_INSET;
    const FH  = TORCH_FLAME_HEIGHT;

    // Diagnostico: meshes hijos del container de antorcha
    const probeInst = assetManager.instantiate(container);
    const childMeshNames = probeInst.rootNode.getChildMeshes(false).map((m) => m.name);
    probeInst.dispose();
    logger.debug('TestRoom: meshes hijos del container de antorcha', {
      count: childMeshNames.length,
      names: childMeshNames,
    });

    const torches: { pos: Vector3; rotY: number; label: string }[] = [
      { pos: new Vector3(0,          BY, -half + INS), rotY: 0,           label: 'Sur'   },
      { pos: new Vector3(0,          BY,  half - INS), rotY: Math.PI,     label: 'Norte' },
      { pos: new Vector3(-half + INS, BY, 0),          rotY: Math.PI / 2, label: 'Oeste' },
      { pos: new Vector3( half - INS, BY, 0),          rotY: -Math.PI / 2, label: 'Este' },
    ];

    for (const { pos, rotY, label } of torches) {
      const torch = assetManager.instantiate(container);
      torch.rootNode.position = pos;
      torch.rootNode.rotation = new Vector3(0, rotY, 0);

      const lightPos = new Vector3(pos.x, pos.y + FH, pos.z);
      const light = new PointLight('torchLight_' + label, lightPos, scene);
      light.diffuse   = TORCH_DIFFUSE;
      light.intensity = TORCH_INTENSITY;
      light.range     = TORCH_RANGE;

      logger.debug('TestRoom: antorcha colocada', {
        label,
        pos: { x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2) },
        lightPos: { x: lightPos.x.toFixed(2), y: lightPos.y.toFixed(2), z: lightPos.z.toFixed(2) },
      });
    }
    logger.debug('TestRoom: antorchas colocadas', { count: torches.length });
  }

  // ----------------------------------------------------------

  /** Coloca 4 pilares interiores a +-tileSize del origen. */
  private static _buildPillars(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
  ): void {
    const d = tileSize;
    const positions: Vector3[] = [
      new Vector3(-d, 0, -d),
      new Vector3( d, 0, -d),
      new Vector3(-d, 0,  d),
      new Vector3( d, 0,  d),
    ];

    for (const pos of positions) {
      const pillar = assetManager.instantiate(container);
      pillar.rootNode.position = pos;
    }
    logger.debug('TestRoom: pilares colocados', { count: positions.length });
  }
}
