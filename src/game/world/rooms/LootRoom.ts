// Imports externos (Babylon.js)
import {
  Vector3,
  MeshBuilder,
  Color3,
  StandardMaterial,
  PBRMaterial,
} from '@babylonjs/core';

// Imports internos
import type { RoomShape } from '@/game/world/types/room.types';
import type { Vec3 } from '@/types/spatial.types';
import type { ResistanceProfile } from '@/types/interaction.types';
import type { RoomConfig } from '@/game/world/Room';
import { ExplorationRoom } from '@/game/world/ExplorationRoom';
import {
  buildMountedTorch,
  buildFloorTiles,
  buildWallSegments,
  TORCH_Y,
  TORCH_WALL_INSET,
} from '@/game/world/rooms/RoomGeometry';
import type { TorchDef, WallSegment } from '@/game/world/rooms/RoomGeometry';
import { measureTileSize } from '@/game/world/utils/measureTile';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de sala
// ============================================================

const DUNGEON_BASE_URL = '/assets/models/dungeon/';
const FLOOR_FILE       = 'floor_tile_large.gltf.glb';
const WALL_FILE        = 'wall.gltf.glb';
const CORNER_FILE      = 'wall_corner.gltf.glb';
const DOORWAY_FILE     = 'wall_doorway.glb';
const GATED_FILE       = 'wall_gated.gltf.glb';
const TORCH_FILE       = 'torch_mounted.gltf.glb';

// Antesala: 4u ancho x 6u profundo, x=[-2,2], z=[-6,0]
const ANTE_HX    = 2;
const ANTE_ZMIN  = -6;
const ANTE_ZMAX  =  0;

// Camara: 6u ancho x 6u profundo, x=[-3,3], z=[0,6]
const CAM_HX    = 3;
const CAM_ZMIN  = 0;
const CAM_ZMAX  = 6;

const DOOR_THRESHOLD = 1.5;

// Color del placeholder de puerta bloqueada (dorado emissive)
const LOCKED_DOOR_COLOR = new Color3(1, 0.8, 0.1);

// ============================================================
// LootRoom -- sala de botin (camara 6x6 + antesala 4x6)
// ============================================================

/**
 * Sala de botin de Mettlebound. Planta irregular:
 *   - Camara:   6u (X) x 6u (Z), x=[-3,3], z=[0,6].   <- norte, entrada
 *   - Antesala: 4u (X) x 6u (Z), x=[-2,2], z=[-6,0].  <- sur, interior
 *
 * Geometria Visual (A2-b4-VISUAL-FIX):
 *   - Suelos tiles KayKit en ambas areas.
 *   - Paredes KayKit con colliders Havok.
 *   - Antorchas sin FlameSprite.
 *
 * Salidas:
 *   - Norte: z = CAM_ZMAX + 1  (hacia HubRoom, bloqueada con llave).
 */
export class LootRoom extends ExplorationRoom {

  readonly shape: RoomShape = 'irregular';

  constructor(config: RoomConfig) {
    super(config);
  }

  // --- Template method -----------------------------------------

  protected override async _buildImpl(): Promise<void> {
    // 1. Planta
    this.addArea({ x: -ANTE_HX, z: ANTE_ZMIN, width: ANTE_HX * 2, depth: ANTE_ZMAX - ANTE_ZMIN });
    this.addArea({ x: -CAM_HX,  z: CAM_ZMIN,  width: CAM_HX  * 2, depth: CAM_ZMAX  - CAM_ZMIN  });

    // Puerta Norte -> HubRoom (bloqueada)
    this.addDoor({
      id:            `${this.id}_door_north`,
      direction:     'north',
      worldPosition: { x: 0, y: 0, z: CAM_ZMAX + 1 },
      isOpen:        false,
      linkedRoomId:  null,
      isLocked:      true,
    });

    // Interactable placeholder
    this._buildInteractables();

    // 2. Geometria sincrona (placeholder puerta bloqueada)
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: CAM_ZMAX - 1 };
  }

  // --- Interactables placeholder -------------------------------

  private _buildInteractables(): void {
    const defaultResistance: ResistanceProfile = {
      defaultResistance: 'normal',
      raceBase:          [],
      equipment:         [],
      buffsActive:       [],
      cursesActive:      [],
    };

    this._interactables.push({
      id:               `${this.id}_chest_01`,
      propType:         'chest',
      state:            'intact',
      resistances:      defaultResistance,
      hp:               30,
      maxHp:            30,
      isDestructible:   false,
      isLightSource:    false,
      gridPosition:     { x: 0, z: 4 },
      inCombatSnapshot: false,
    });
  }

  // --- Geometria (placeholder puerta bloqueada, sincrona) ------

  protected override _buildGeometry(): void {
    const lockedMesh = MeshBuilder.CreateBox(
      `${this.id}_locked_door_N`,
      { width: 0.6, height: 1.2, depth: 0.2 },
      this.scene,
    );
    lockedMesh.position.x = 0;
    lockedMesh.position.y = 0.6;
    lockedMesh.position.z = CAM_ZMAX + 1;
    lockedMesh.parent = this.rootNode;

    const mat = new StandardMaterial(`${this.id}_locked_door_mat`, this.scene);
    mat.emissiveColor = LOCKED_DOOR_COLOR;
    mat.disableLighting = true;
    lockedMesh.material = mat;
  }

  // --- _computeWallSegments ------------------------------------

  /**
   * Genera segmentos de pared para la forma camara+antesala.
   *
   * Camara (6x6, z=[0,6]):
   *   - Pared Norte (z=6): 3 tiles -> puerta gated en x=0
   *   - Paredes E/O de la camara (z=[0,6])
   *
   * Antesala (4x6, z=[-6,0]):
   *   - Pared Sur (z=-6): 2 tiles
   *   - Paredes E/O de la antesala (z=[-6,0])
   *
   * Esquinas del perimetro externo.
   */
  private _computeWallSegments(tileSize: number): WallSegment[] {
    const segs: WallSegment[] = [];
    const T = DOOR_THRESHOLD;

    const camDepth  = CAM_ZMAX  - CAM_ZMIN;   // 6
    const anteDepth = ANTE_ZMAX - ANTE_ZMIN;  // 6

    // -- Camara: pared Norte (z=CAM_ZMAX, 6u) -- puerta gated --
    const nColsCam = Math.round((CAM_HX * 2) / tileSize);
    for (let c = 0; c < nColsCam; c++) {
      const x = (-CAM_HX + tileSize / 2) + c * tileSize;
      const isNorthDoor = Math.abs(x - 0) < T;
      segs.push({
        x, z: CAM_ZMAX, rotY: Math.PI, axis: 'x',
        type:  isNorthDoor ? 'gated' : 'wall',
        label: `cN_${c}`,
      });
    }

    // -- Camara: pared Oeste (x=-CAM_HX, z=[0,6]) --------------
    const nRowsCam = Math.round(camDepth / tileSize);
    for (let r = 0; r < nRowsCam; r++) {
      const z = (CAM_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({ x: -CAM_HX, z, rotY: Math.PI / 2, axis: 'z', type: 'wall', label: `cW_${r}` });
    }

    // -- Camara: pared Este (x=+CAM_HX, z=[0,6]) ---------------
    for (let r = 0; r < nRowsCam; r++) {
      const z = (CAM_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({ x: CAM_HX, z, rotY: -Math.PI / 2, axis: 'z', type: 'wall', label: `cE_${r}` });
    }

    // -- Antesala: pared Sur (z=ANTE_ZMIN, 4u) -----------------
    const nColsAnte = Math.round((ANTE_HX * 2) / tileSize);
    for (let c = 0; c < nColsAnte; c++) {
      const x = (-ANTE_HX + tileSize / 2) + c * tileSize;
      segs.push({ x, z: ANTE_ZMIN, rotY: 0, axis: 'x', type: 'wall', label: `aS_${c}` });
    }

    // -- Antesala: pared Oeste (x=-ANTE_HX, z=[-6,0]) ----------
    const nRowsAnte = Math.round(anteDepth / tileSize);
    for (let r = 0; r < nRowsAnte; r++) {
      const z = (ANTE_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({ x: -ANTE_HX, z, rotY: Math.PI / 2, axis: 'z', type: 'wall', label: `aW_${r}` });
    }

    // -- Antesala: pared Este (x=+ANTE_HX, z=[-6,0]) -----------
    for (let r = 0; r < nRowsAnte; r++) {
      const z = (ANTE_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({ x: ANTE_HX, z, rotY: -Math.PI / 2, axis: 'z', type: 'wall', label: `aE_${r}` });
    }

    // -- Esquinas perimetro externo ----------------------------
    segs.push({ x: -ANTE_HX, z: ANTE_ZMIN, rotY: 0,             axis: 'corner', type: 'corner', label: 'aSO' });
    segs.push({ x:  ANTE_HX, z: ANTE_ZMIN, rotY: Math.PI / 2,   axis: 'corner', type: 'corner', label: 'aSE' });
    segs.push({ x: -CAM_HX,  z: CAM_ZMAX,  rotY: -Math.PI / 2,  axis: 'corner', type: 'corner', label: 'cNO' });
    segs.push({ x:  CAM_HX,  z: CAM_ZMAX,  rotY: Math.PI,        axis: 'corner', type: 'corner', label: 'cNE' });

    return segs;
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    const [floorC, wallC, cornerC, doorwayC, gatedC, torchC] = await Promise.all([
      this.assetManager.loadAsset(DUNGEON_BASE_URL, FLOOR_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, WALL_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, CORNER_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, DOORWAY_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, GATED_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE),
    ]);

    const tileSize = measureTileSize(floorC, this.assetManager);

    // -- Suelos KayKit ------------------------------------------
    const camCZ  = (CAM_ZMIN  + CAM_ZMAX)  / 2;
    const anteCZ = (ANTE_ZMIN + ANTE_ZMAX) / 2;
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      0, camCZ,  CAM_HX  * 2, CAM_ZMAX  - CAM_ZMIN,  tileSize);  // camara
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      0, anteCZ, ANTE_HX * 2, ANTE_ZMAX - ANTE_ZMIN, tileSize);  // antesala

    // -- Paredes KayKit ------------------------------------------
    const segments = this._computeWallSegments(tileSize);
    buildWallSegments(
      this.scene, this.assetManager, this.rootNode,
      wallC, cornerC, doorwayC, gatedC,
      segments, tileSize, this.id,
    );

    // -- Antorchas (sin FlameSprite) ----------------------------
    const INS      = TORCH_WALL_INSET;
    const anteMidZ = (ANTE_ZMIN + ANTE_ZMAX) / 2;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(ANTE_HX - INS, TORCH_Y, anteMidZ),  rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_AnteEste`  },
      { pos: new Vector3(0, TORCH_Y, CAM_ZMAX - INS),         rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_CamNorte` },
    ];

    for (const def of torchDefs) {
      const light = buildMountedTorch(
        this.scene, this.assetManager, torchC, def, this.rootNode, false,
      );
      this._lightSources.push(light);
    }

    this.scene.materials.forEach((mat) => {
      if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) {
        mat.maxSimultaneousLights = 8;
      }
    });
    this.scene.markAllMaterialsAsDirty(2);

    logger.info(`LootRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
