// Imports externos (Babylon.js)
import {
  Vector3,
  PBRMaterial,
  StandardMaterial,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { Scene, AssetContainer } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import type { Vec3 } from '@/types/spatial.types';
import {
  buildMountedTorch,
  TORCH_Y,
  TORCH_WALL_INSET,
} from '@/game/world/rooms/RoomGeometry';
import type { TorchDef } from '@/game/world/rooms/RoomGeometry';
import { measureTileSize } from '@/game/world/utils/measureTile';
import { TargetDummy } from '@/game/world/TargetDummy';
import { Grid } from '@/game/world/Grid';
import { GridRenderer } from '@/game/world/GridRenderer';
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

// Si es true, se colocan 4 pilares interiores decorativos
const PLACE_PILLARS = true;

// ============================================================
// TestRoom
//
// Sala estatica de prueba centrada en (0, 0, 0).
//   - Suelo    : cuadricula GRID_SIZE x GRID_SIZE de floor_tile_large
//   - Paredes  : 4 x GRID_SIZE segmentos rectos perimetrales
//   - Esquinas : 4 esquinas en los vertices del perimetro
//   - Antorchas: 1 por pared (N, S, E, O) centradas, con:
//                  * PointLight  (ilumina la sala)
//                  * ParticleSystem FlameEffect (particulas ascendentes)
//                  * Sprite billboard FlameSprite (llama pixel art animada)
//   - Pilares  : 4 interiores (controlados por PLACE_PILLARS)
//
// Antorchas: construidas via buildMountedTorch (RoomGeometry, withFlame=true).
// _isBuilt previene doble llamada a build() (guard anti-duplicacion).
// El tamano de tile se mide dinamicamente con measureTileSize() (utils/measureTile).
// markAllMaterialsAsDirty fuerza recompilacion de shaders con las 4 PointLights.
// ============================================================

export class TestRoom {

  /** Guard: impide que build() cree la sala mas de una vez. */
  private static _isBuilt = false;

  /**
   * GridRenderer de debug creado en build().
   * Accesible desde DevTools via window.__mb.gridRenderer.
   * null antes de que build() se complete.
   */
  static gridRenderer: GridRenderer | null = null;

  /**
   * Construye la sala de prueba en la escena.
   * Llamar una sola vez tras playerController.loadModel().
   * Si se llama de nuevo, registra una advertencia y retorna sin hacer nada.
   */
  static async build(
    scene: Scene,
    assetManager: AssetManager,
  ): Promise<{ dummy: TargetDummy; grid: Grid }> {
    if (TestRoom._isBuilt) {
      logger.warn('TestRoom: build() llamado mas de una vez -- ignorado.');
      throw new Error('TestRoom.build() llamado mas de una vez');
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

    // Medir el tamano real del tile via util compartido
    const tileSize = measureTileSize(floorContainer, assetManager);

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

    // Subir maxSimultaneousLights a 8 en TODOS los materiales de la escena.
    scene.materials.forEach((mat) => {
      if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) {
        mat.maxSimultaneousLights = 8;
      }
    });

    // FIX: fuerza recompilacion de shaders para que los materiales vean
    // las 4 PointLights recien anadidas.
    scene.markAllMaterialsAsDirty(2);

    // Colliders de fisica (suelo + 4 paredes + 4 pilares)
    TestRoom._buildPhysicsColliders(scene, half, tileSize);

    // Target Dummy (Rusty)
    const dummy = await TargetDummy.create(
      scene,
      assetManager,
      new Vector3(0, 0, 2),
      'Rusty',
    );

    logger.info('TestRoom: sala construida.', {
      tileSize,
      sideLength: GRID_SIZE * tileSize,
      lucesEnEscena: scene.lights.length,
      nombresLuces: scene.lights.map((l) => l.name),
    });

    // Grid tactico (10x10, 1 unidad Babylon = 1 tile)
    const TACTICAL_TILE = 1.0;
    const TACTICAL_COLS = 10;
    const TACTICAL_ROWS = 10;

    const gridOrigin: Vec3 = {
      x: -(half + TACTICAL_TILE),
      y: 0,
      z: -(half + TACTICAL_TILE),
    };

    const grid = new Grid({
      cols:     TACTICAL_COLS,
      rows:     TACTICAL_ROWS,
      origin:   gridOrigin,
      tileSize: TACTICAL_TILE,
    });

    // Perimetro bloqueado (paredes N/S/E/O)
    for (let c = 0; c < TACTICAL_COLS; c++) {
      grid.setTileBlocked(c, 0,                  true);
      grid.setTileBlocked(c, TACTICAL_ROWS - 1,  true);
    }
    for (let r = 1; r < TACTICAL_ROWS - 1; r++) {
      grid.setTileBlocked(0,                 r, true);
      grid.setTileBlocked(TACTICAL_COLS - 1, r, true);
    }

    // Pilares bloqueados
    for (const wx of [-tileSize, tileSize]) {
      for (const wz of [-tileSize, tileSize]) {
        const coord = grid.worldToGrid(wx, wz);
        if (coord !== null) {
          grid.setTileBlocked(coord.col, coord.row, true);
        }
      }
    }

    const gridRenderer = new GridRenderer(scene, grid);
    TestRoom.gridRenderer = gridRenderer;

    logger.debug('TestRoom: grid tactico creado', {
      cols:    TACTICAL_COLS,
      rows:    TACTICAL_ROWS,
      origin:  gridOrigin,
      tileSize: TACTICAL_TILE,
    });

    return { dummy, grid };
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
   * Coloca 1 antorcha por pared (N, S, E, O) usando buildMountedTorch.
   * withFlame=true (defecto): TestRoom muestra llamas completas.
   */
  private static _buildTorches(
    scene: Scene,
    assetManager: AssetManager,
    container: AssetContainer,
    half: number,
  ): void {
    const INS = TORCH_WALL_INSET;
    const BY  = TORCH_Y;

    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,           BY, -half + INS), rotY: 0,            inward: new Vector3(0,  0,  1), label: 'Sur'   },
      { pos: new Vector3(0,           BY,  half - INS), rotY: Math.PI,      inward: new Vector3(0,  0, -1), label: 'Norte' },
      { pos: new Vector3(-half + INS, BY,  0),          rotY: Math.PI / 2,  inward: new Vector3(1,  0,  0), label: 'Oeste' },
      { pos: new Vector3( half - INS, BY,  0),          rotY: -Math.PI / 2, inward: new Vector3(-1, 0,  0), label: 'Este'  },
    ];

    for (const def of torchDefs) {
      // withFlame=true (defecto) -- TestRoom mantiene llamas completas
      buildMountedTorch(scene, assetManager, container, def);
    }

    logger.debug('TestRoom: antorchas colocadas', { count: torchDefs.length });
  }

  // ----------------------------------------------------------

  /**
   * Crea 9 colliders invisibles y estaticos (mass:0) para la sala:
   * - 1 suelo plano, 4 paredes, 4 pilares.
   */
  private static _buildPhysicsColliders(scene: Scene, half: number, tileSize: number): void {
    const WALL_H     = 2;
    const WALL_T     = 0.7;
    const WALL_SHIFT = (WALL_T - 0.3) / 2;
    const FLOOR_T    = 0.1;
    const PILLAR_D   = 1.5;
    const side       = half * 2;

    const boxColliders = [
      { name: 'col_floor',  w: side,   h: FLOOR_T, d: side,   x: 0,                  y: -FLOOR_T / 2, z: 0                  },
      { name: 'col_wall_S', w: side,   h: WALL_H,  d: WALL_T, x: 0,                  y: WALL_H / 2,   z: -half + WALL_SHIFT  },
      { name: 'col_wall_N', w: side,   h: WALL_H,  d: WALL_T, x: 0,                  y: WALL_H / 2,   z:  half - WALL_SHIFT  },
      { name: 'col_wall_W', w: WALL_T, h: WALL_H,  d: side,   x: -half + WALL_SHIFT, y: WALL_H / 2,   z: 0                  },
      { name: 'col_wall_E', w: WALL_T, h: WALL_H,  d: side,   x:  half - WALL_SHIFT, y: WALL_H / 2,   z: 0                  },
    ];

    for (const c of boxColliders) {
      const box = MeshBuilder.CreateBox(
        c.name,
        { width: c.w, height: c.h, depth: c.d },
        scene,
      );
      box.position   = new Vector3(c.x, c.y, c.z);
      box.isVisible  = false;
      box.isPickable = false;
      new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0 }, scene);
    }

    const pd = tileSize;
    const cy = WALL_H / 2;
    const pillarPositions = [
      { px: -pd, pz: -pd },
      { px:  pd, pz: -pd },
      { px: -pd, pz:  pd },
      { px:  pd, pz:  pd },
    ];

    for (const p of pillarPositions) {
      const cyl = MeshBuilder.CreateCylinder(
        `col_pillar_${p.px}_${p.pz}`,
        { height: WALL_H, diameter: PILLAR_D, tessellation: 8 },
        scene,
      );
      cyl.position   = new Vector3(p.px, cy, p.pz);
      cyl.isVisible  = false;
      cyl.isPickable = false;
      new PhysicsAggregate(cyl, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
    }

    logger.debug('TestRoom: colliders de fisica creados', {
      cajas:   boxColliders.length,
      pilares: pillarPositions.length,
      total:   boxColliders.length + pillarPositions.length,
    });
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
