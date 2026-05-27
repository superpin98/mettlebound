// Imports externos (Babylon.js)
import {
  Vector3,
  PBRMaterial,
  StandardMaterial,
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

// Sala 14u (X) x 10u (Z) -- reorientada en A2-b4.1
const HALF_X = 7;
const HALF_Z = 5;

const DOOR_THRESHOLD = 1.5;

// ============================================================
// InteractablesRoom -- sala rectangular con props interactuables
// ============================================================

/**
 * Sala rectangular 14u x 10u.
 * Puerta Oeste -> HubRoom.
 *
 * Geometria Visual (A2-b4-VISUAL-FIX):
 *   - Suelos tiles KayKit, paredes KayKit, colliders Havok.
 *   - Antorchas sin FlameSprite.
 */
export class InteractablesRoom extends ExplorationRoom {

  readonly shape: RoomShape = 'rectangular';

  constructor(config: RoomConfig) {
    super(config);
  }

  // --- Template method -----------------------------------------

  protected override async _buildImpl(): Promise<void> {
    // 1. Planta
    this.addArea({ x: -HALF_X, z: -HALF_Z, width: HALF_X * 2, depth: HALF_Z * 2 });

    // Puerta Oeste -> HubRoom
    this.addDoor({
      id:            `${this.id}_door_west`,
      direction:     'west',
      worldPosition: { x: -(HALF_X + 1), y: 0, z: 0 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Interactables placeholder
    this._buildInteractables();

    // 2. Geometria (no-op sincrono)
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: -(HALF_X - 2), y: 0, z: 0 };
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

    this._interactables.push(
      {
        id:               `${this.id}_barrel_01`,
        propType:         'barrel',
        state:            'intact',
        resistances:      defaultResistance,
        hp:               10,
        maxHp:            10,
        isDestructible:   true,
        isLightSource:    false,
        gridPosition:     { x: -3, z: -4 },
        inCombatSnapshot: false,
      },
      {
        id:               `${this.id}_barrel_02`,
        propType:         'barrel',
        state:            'intact',
        resistances:      defaultResistance,
        hp:               10,
        maxHp:            10,
        isDestructible:   true,
        isLightSource:    false,
        gridPosition:     { x: 3, z: -4 },
        inCombatSnapshot: false,
      },
      {
        id:               `${this.id}_barrel_03`,
        propType:         'barrel',
        state:            'intact',
        resistances:      defaultResistance,
        hp:               10,
        maxHp:            10,
        isDestructible:   true,
        isLightSource:    false,
        gridPosition:     { x: 0, z: 3 },
        inCombatSnapshot: false,
      },
    );
  }

  // --- Geometria (no-op: todo en _buildProps) ------------------

  protected override _buildGeometry(): void {
    // geometria KayKit colocada en _buildProps() (requiere async)
  }

  // --- _computeWallSegments ------------------------------------

  /**
   * Sala rectangular 14x10. Puerta en pared Oeste (x=-HALF_X) a z=0.
   *
   * N/S walls: 7 segmentos (14u/2u) -> puerta no aplica
   * E/W walls: 5 segmentos (10u/2u) -> puerta Oeste en z=0 -> segmento central
   */
  private _computeWallSegments(tileSize: number): WallSegment[] {
    const segs: WallSegment[] = [];
    const T = DOOR_THRESHOLD;

    // -- Pared Sur (z=-HALF_Z, 14u) ----------------------------
    const nColsNS = Math.round((HALF_X * 2) / tileSize);
    for (let c = 0; c < nColsNS; c++) {
      const x = (-HALF_X + tileSize / 2) + c * tileSize;
      segs.push({ x, z: -HALF_Z, rotY: 0, axis: 'x', type: 'wall', label: `S_${c}` });
    }

    // -- Pared Norte (z=+HALF_Z, 14u) --------------------------
    for (let c = 0; c < nColsNS; c++) {
      const x = (-HALF_X + tileSize / 2) + c * tileSize;
      segs.push({ x, z: HALF_Z, rotY: Math.PI, axis: 'x', type: 'wall', label: `N_${c}` });
    }

    // -- Pared Oeste (x=-HALF_X, 10u) -- puerta a z=0 ---------
    const nRowsEW = Math.round((HALF_Z * 2) / tileSize);
    for (let r = 0; r < nRowsEW; r++) {
      const z = (-HALF_Z + tileSize / 2) + r * tileSize;
      const isWestDoor = Math.abs(z - 0) < T;
      segs.push({
        x: -HALF_X, z, rotY: Math.PI / 2, axis: 'z',
        type:  isWestDoor ? 'doorway' : 'wall',
        label: `W_${r}`,
      });
    }

    // -- Pared Este (x=+HALF_X, 10u) ---------------------------
    for (let r = 0; r < nRowsEW; r++) {
      const z = (-HALF_Z + tileSize / 2) + r * tileSize;
      segs.push({ x: HALF_X, z, rotY: -Math.PI / 2, axis: 'z', type: 'wall', label: `E_${r}` });
    }

    // -- Esquinas -----------------------------------------------
    segs.push({ x: -HALF_X, z: -HALF_Z, rotY: 0,             axis: 'corner', type: 'corner', label: 'SO' });
    segs.push({ x:  HALF_X, z: -HALF_Z, rotY: Math.PI / 2,   axis: 'corner', type: 'corner', label: 'SE' });
    segs.push({ x:  HALF_X, z:  HALF_Z, rotY: Math.PI,        axis: 'corner', type: 'corner', label: 'NE' });
    segs.push({ x: -HALF_X, z:  HALF_Z, rotY: -Math.PI / 2,  axis: 'corner', type: 'corner', label: 'NO' });

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
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      0, 0, HALF_X * 2, HALF_Z * 2, tileSize);

    // -- Paredes KayKit ------------------------------------------
    const segments = this._computeWallSegments(tileSize);
    buildWallSegments(
      this.scene, this.assetManager, this.rootNode,
      wallC, cornerC, doorwayC, gatedC,
      segments, tileSize, this.id,
    );

    // -- Antorchas (sin FlameSprite) ----------------------------
    const INS = TORCH_WALL_INSET;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,               TORCH_Y, -(HALF_Z - INS)), rotY: 0,            inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`   },
      { pos: new Vector3(0,               TORCH_Y,   HALF_Z - INS),  rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_Norte` },
      { pos: new Vector3(-(HALF_X - INS), TORCH_Y,  0),              rotY: Math.PI / 2,  inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste` },
      { pos: new Vector3(  HALF_X - INS,  TORCH_Y,  0),              rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_Este`  },
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

    logger.info(`InteractablesRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
