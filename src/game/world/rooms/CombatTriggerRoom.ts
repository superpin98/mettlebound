// Imports externos (Babylon.js)
import {
  Vector3,
  PBRMaterial,
  StandardMaterial,
} from '@babylonjs/core';

// Imports internos
import type { RoomShape } from '@/game/world/types/room.types';
import type { Vec3 } from '@/types/spatial.types';
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

// Sala principal: 10u x 10u
const MAIN_HX = 5;
const MAIN_HZ = 5;

// Brazo norte: 6u ancho x 4u profundo, adosado al norte del area principal
const ARM_HX    = 3;
const ARM_ZMIN  = MAIN_HZ;        // 5
const ARM_ZMAX  = MAIN_HZ + 4;   // 9

const DOOR_THRESHOLD = 1.5;

// ============================================================
// CombatTriggerRoom -- sala L-shape (10x10 + brazo 6x4)
// ============================================================

/**
 * Sala de exploracion con forma en L.
 *
 * Planta:
 *   - Area principal: 10u (X) x 10u (Z), centrada en origen.
 *   - Brazo Norte:    6u (X) x 4u (Z), x=[-3,3], z=[5,9].
 *
 * Geometria Visual (A2-b4-VISUAL-FIX):
 *   - Suelos de tiles KayKit floor_tile_large.gltf.glb.
 *   - Paredes KayKit con colliders Havok por segmento.
 *   - Antorchas con withFlame=false.
 *
 * Salidas:
 *   - Sur:   z = -(MAIN_HZ + 1) -- hacia HubRoom (unica salida).
 */
export class CombatTriggerRoom extends ExplorationRoom {

  readonly shape: RoomShape = 'L_shape';

  constructor(config: RoomConfig) {
    super(config);
  }

  // --- Template method -----------------------------------------

  protected override async _buildImpl(): Promise<void> {
    // 1. Planta
    this.addArea({ x: -MAIN_HX, z: -MAIN_HZ, width: MAIN_HX * 2, depth: MAIN_HZ * 2 });
    this.addArea({ x: -ARM_HX,  z: ARM_ZMIN,  width: ARM_HX * 2,  depth: ARM_ZMAX - ARM_ZMIN });

    // Puerta Sur -> HubRoom
    this.addDoor({
      id:            `${this.id}_door_south`,
      direction:     'south',
      worldPosition: { x: 0, y: 0, z: -(MAIN_HZ + 1) },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // 2. Geometria (no-op sincrono)
    this._buildGeometry();

    // 3. Props asincronos (incluye geometria KayKit)
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: -(MAIN_HZ - 2) };
  }

  // --- Geometria (no-op: todo en _buildProps) ------------------

  protected override _buildGeometry(): void {
    // geometria KayKit colocada en _buildProps() (requiere async)
  }

  // --- _computeWallSegments ------------------------------------

  /**
   * Genera segmentos de pared para la forma L-shape:
   *   - Perimetro del area principal (10x10), con puerta Sur.
   *   - Perimetro del brazo norte (6x4), sin pared Sur (conecta al principal).
   *   - Esquinas del perimetro externo.
   */
  private _computeWallSegments(tileSize: number): WallSegment[] {
    const segs: WallSegment[] = [];
    const T = DOOR_THRESHOLD;

    // -- Area principal: pared Sur (z=-MAIN_HZ, 10u) -----------
    const nColsMain = Math.round((MAIN_HX * 2) / tileSize);
    for (let c = 0; c < nColsMain; c++) {
      const x = (-MAIN_HX + tileSize / 2) + c * tileSize;
      const isSouthDoor = Math.abs(x - 0) < T;
      segs.push({
        x, z: -MAIN_HZ, rotY: 0, axis: 'x',
        type:  isSouthDoor ? 'doorway' : 'wall',
        label: `mS_${c}`,
      });
    }

    // -- Area principal: pared Oeste (x=-MAIN_HX, 10u) --------
    const nRowsMain = Math.round((MAIN_HZ * 2) / tileSize);
    for (let r = 0; r < nRowsMain; r++) {
      const z = (-MAIN_HZ + tileSize / 2) + r * tileSize;
      segs.push({
        x: -MAIN_HX, z, rotY: Math.PI / 2, axis: 'z',
        type: 'wall', label: `mW_${r}`,
      });
    }

    // -- Area principal: pared Este (x=+MAIN_HX, 10u) ---------
    for (let r = 0; r < nRowsMain; r++) {
      const z = (-MAIN_HZ + tileSize / 2) + r * tileSize;
      segs.push({
        x: MAIN_HX, z, rotY: -Math.PI / 2, axis: 'z',
        type: 'wall', label: `mE_${r}`,
      });
    }

    // -- Brazo norte: pared Norte (z=ARM_ZMAX, 6u) -------------
    const nColsArm = Math.round((ARM_HX * 2) / tileSize);
    for (let c = 0; c < nColsArm; c++) {
      const x = (-ARM_HX + tileSize / 2) + c * tileSize;
      segs.push({
        x, z: ARM_ZMAX, rotY: Math.PI, axis: 'x',
        type: 'wall', label: `aN_${c}`,
      });
    }

    // -- Brazo norte: pared Oeste (x=-ARM_HX, 4u) --------------
    const nRowsArm = Math.round((ARM_ZMAX - ARM_ZMIN) / tileSize);
    for (let r = 0; r < nRowsArm; r++) {
      const z = (ARM_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({
        x: -ARM_HX, z, rotY: Math.PI / 2, axis: 'z',
        type: 'wall', label: `aW_${r}`,
      });
    }

    // -- Brazo norte: pared Este (x=+ARM_HX, 4u) ---------------
    for (let r = 0; r < nRowsArm; r++) {
      const z = (ARM_ZMIN + tileSize / 2) + r * tileSize;
      segs.push({
        x: ARM_HX, z, rotY: -Math.PI / 2, axis: 'z',
        type: 'wall', label: `aE_${r}`,
      });
    }

    // -- Esquinas externas del perimetro L-shape ----------------
    // Esquinas del area principal (4 basicas, las interiores del brazo son internas)
    segs.push({ x: -MAIN_HX, z: -MAIN_HZ, rotY: 0,             axis: 'corner', type: 'corner', label: 'SO' });
    segs.push({ x:  MAIN_HX, z: -MAIN_HZ, rotY: Math.PI / 2,   axis: 'corner', type: 'corner', label: 'SE' });
    // Esquinas del brazo
    segs.push({ x: -ARM_HX,  z:  ARM_ZMAX, rotY: -Math.PI / 2, axis: 'corner', type: 'corner', label: 'aNO' });
    segs.push({ x:  ARM_HX,  z:  ARM_ZMAX, rotY: Math.PI,       axis: 'corner', type: 'corner', label: 'aNE' });

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
      0, 0, MAIN_HX * 2, MAIN_HZ * 2, tileSize);  // area principal
    const armCZ = (ARM_ZMIN + ARM_ZMAX) / 2;
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      0, armCZ, ARM_HX * 2, ARM_ZMAX - ARM_ZMIN, tileSize);  // brazo norte

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
      { pos: new Vector3(0,                TORCH_Y, -(MAIN_HZ - INS)),  rotY: 0,           inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`       },
      { pos: new Vector3(-(MAIN_HX - INS), TORCH_Y,  0),                rotY: Math.PI / 2, inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste`     },
      { pos: new Vector3(0,                TORCH_Y,  ARM_ZMAX - INS),   rotY: Math.PI,     inward: new Vector3(0, 0, -1), label: `${this.id}_NorteBrazo` },
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

    logger.info(`CombatTriggerRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
