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
import { SpawnAltar } from '@/game/world/props/SpawnAltar';
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

// Media anchura y profundidad del area principal (sala 14u x 12u)
const HALF_X = 7;
const HALF_Z = 6;

// Umbral de distancia para asignar doorway/gated a un segmento de pared.
// Un segmento se convierte en puerta si su posicion a lo largo de la pared
// esta dentro de este umbral respecto al centro de la puerta.
const DOOR_THRESHOLD = 1.5;  // en unidades Babylon

// Color del placeholder de puerta bloqueada (dorado emissive)
const LOCKED_DOOR_COLOR = new Color3(1, 0.8, 0.1);

// ============================================================
// HubRoom -- sala hub irregular (14x12 + 2 alcobas laterales)
// ============================================================

/**
 * Sala principal de Mettlebound. Forma irregular:
 *   - Area principal: 14u (X) x 12u (Z).
 *   - Alcoba Este:   2u x 4u en x=[HALF_X, HALF_X+2], z=[-2, 2].
 *   - Alcoba Oeste:  2u x 4u en x=[-(HALF_X+2), -HALF_X], z=[-2, 2].
 *
 * Geometria Visual (A2-b4-VISUAL-FIX):
 *   - Suelos de tiles KayKit floor_tile_large.gltf.glb.
 *   - Paredes de wall.gltf.glb / wall_corner.gltf.glb / wall_doorway.glb / wall_gated.gltf.glb.
 *   - Colliders Havok BOX por segmento solido.
 *   - Antorchas torch_mounted.gltf.glb con withFlame=false (sin FlameSprite).
 *
 * Salidas (hub estrella):
 *   - Norte: z = +(HALF_Z + 1) -- hacia CombatTriggerRoom.
 *   - Este:  x = +(HALF_X + 1) -- hacia InteractablesRoom.
 *   - Sur:   z = -(HALF_Z + 1) -- hacia LootRoom (bloqueada, placeholder dorado).
 */
export class HubRoom extends ExplorationRoom {

  readonly shape: RoomShape = 'irregular';

  constructor(config: RoomConfig) {
    super(config);
  }

  // --- Template method -----------------------------------------

  protected override async _buildImpl(): Promise<void> {
    // 1. Planta
    this.addArea({ x: -HALF_X,        z: -HALF_Z, width: HALF_X * 2, depth: HALF_Z * 2 });
    this.addArea({ x: HALF_X,         z: -2,      width: 2,          depth: 4 }); // alcoba Este
    this.addArea({ x: -(HALF_X + 2),  z: -2,      width: 2,          depth: 4 }); // alcoba Oeste

    this.addPillar({ x: -3, y: 0, z: -3 });
    this.addPillar({ x:  3, y: 0, z: -3 });
    this.addPillar({ x: -3, y: 0, z:  3 });
    this.addPillar({ x:  3, y: 0, z:  3 });

    // Puerta Norte -> CombatTriggerRoom
    this.addDoor({
      id:            `${this.id}_door_north`,
      direction:     'north',
      worldPosition: { x: 0, y: 0, z: HALF_Z + 1 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Puerta Este -> InteractablesRoom
    this.addDoor({
      id:            `${this.id}_door_east`,
      direction:     'east',
      worldPosition: { x: HALF_X + 1, y: 0, z: 0 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Puerta Sur -> LootRoom (bloqueada)
    this.addDoor({
      id:            `${this.id}_door_south`,
      direction:     'south',
      worldPosition: { x: 0, y: 0, z: -(HALF_Z + 1) },
      isOpen:        false,
      linkedRoomId:  null,
      isLocked:      true,
    });

    // 2. Geometria KayKit (sincrona tras AddDoor -- la construimos en _buildProps)
    this._buildGeometry();

    // 3. Props asincronos (incluye geometria KayKit que necesita await)
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: -(HALF_Z - 2) };
  }

  // --- Geometria (placeholder -- KayKit se construye en _buildProps) -----------

  protected override _buildGeometry(): void {
    // Placeholder de puerta bloqueada sur (cubo dorado emissive).
    // Se mantiene aqui porque es sincrono y no necesita assets GLB.
    // Sera reemplazado por wall_gated.gltf.glb en A2-b5+.
    const lockedMesh = MeshBuilder.CreateBox(
      `${this.id}_locked_door_S`,
      { width: 0.6, height: 1.2, depth: 0.2 },
      this.scene,
    );
    lockedMesh.position.x = 0;
    lockedMesh.position.y = 0.6;
    lockedMesh.position.z = -(HALF_Z + 1);
    lockedMesh.parent = this.rootNode;

    const mat = new StandardMaterial(`${this.id}_locked_door_mat`, this.scene);
    mat.emissiveColor = LOCKED_DOOR_COLOR;
    mat.disableLighting = true;
    lockedMesh.material = mat;
  }

  // --- _computeWallSegments ------------------------------------

  /**
   * Genera el array de WallSegment para el perimetro del area principal.
   * Alcobas: solo suelo, sin paredes (interior de la sala).
   *
   * Convencion de rotaciones (de TestRoom y wall.gltf.glb):
   *   Sur (z=-HALF_Z): rotY=0      Norte (z=+HALF_Z): rotY=PI
   *   Oeste(x=-HALF_X): rotY=PI/2  Este (x=+HALF_X):  rotY=-PI/2
   * Esquinas: SO=0, SE=PI/2, NE=PI, NO=-PI/2
   *
   * Puertas:
   *   door_north(x=0, norte): segmento mas cercano a x=0 -> 'doorway'
   *   door_east (z=0, este):  segmentos mas cercanos a z=0 -> 'doorway'
   *   door_south(x=0, sur):   segmento mas cercano a x=0 -> 'gated'
   */
  private _computeWallSegments(tileSize: number): WallSegment[] {
    const segs: WallSegment[] = [];
    const T = DOOR_THRESHOLD;

    // -- Pared Sur (z=-HALF_Z, 14u a lo largo de X) ---------------
    const nColsNS = Math.round((HALF_X * 2) / tileSize);
    for (let c = 0; c < nColsNS; c++) {
      const x = (-HALF_X + tileSize / 2) + c * tileSize;
      const isSouthDoor = Math.abs(x - 0) < T;
      segs.push({
        x, z: -HALF_Z, rotY: 0, axis: 'x',
        type:  isSouthDoor ? 'gated' : 'wall',
        label: `S_${c}`,
      });
    }

    // -- Pared Norte (z=+HALF_Z, 14u a lo largo de X) -------------
    for (let c = 0; c < nColsNS; c++) {
      const x = (-HALF_X + tileSize / 2) + c * tileSize;
      const isNorthDoor = Math.abs(x - 0) < T;
      segs.push({
        x, z: HALF_Z, rotY: Math.PI, axis: 'x',
        type:  isNorthDoor ? 'doorway' : 'wall',
        label: `N_${c}`,
      });
    }

    // -- Pared Oeste (x=-HALF_X, 12u a lo largo de Z) -------------
    const nRowsEW = Math.round((HALF_Z * 2) / tileSize);
    for (let r = 0; r < nRowsEW; r++) {
      const z = (-HALF_Z + tileSize / 2) + r * tileSize;
      segs.push({
        x: -HALF_X, z, rotY: Math.PI / 2, axis: 'z',
        type:  'wall',
        label: `W_${r}`,
      });
    }

    // -- Pared Este (x=+HALF_X, 12u a lo largo de Z) --------------
    for (let r = 0; r < nRowsEW; r++) {
      const z = (-HALF_Z + tileSize / 2) + r * tileSize;
      const isEastDoor = Math.abs(z - 0) < T;
      segs.push({
        x: HALF_X, z, rotY: -Math.PI / 2, axis: 'z',
        type:  isEastDoor ? 'doorway' : 'wall',
        label: `E_${r}`,
      });
    }

    // -- Esquinas -------------------------------------------------
    segs.push({ x: -HALF_X, z: -HALF_Z, rotY: 0,             axis: 'corner', type: 'corner', label: 'SO' });
    segs.push({ x:  HALF_X, z: -HALF_Z, rotY: Math.PI / 2,   axis: 'corner', type: 'corner', label: 'SE' });
    segs.push({ x:  HALF_X, z:  HALF_Z, rotY: Math.PI,        axis: 'corner', type: 'corner', label: 'NE' });
    segs.push({ x: -HALF_X, z:  HALF_Z, rotY: -Math.PI / 2,  axis: 'corner', type: 'corner', label: 'NO' });

    return segs;
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    // Carga paralela de todos los assets de geometria y props
    const [floorC, wallC, cornerC, doorwayC, gatedC, torchC] = await Promise.all([
      this.assetManager.loadAsset(DUNGEON_BASE_URL, FLOOR_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, WALL_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, CORNER_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, DOORWAY_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, GATED_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE),
    ]);

    const tileSize = measureTileSize(floorC, this.assetManager);

    // -- Suelos KayKit (area principal + alcobas) ----------------
    // cx/cz = centro de cada area en espacio local de la sala
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      0,           0,  HALF_X * 2, HALF_Z * 2, tileSize);  // principal
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      HALF_X + 1,  0,  2,          4,           tileSize);  // alcoba E
    buildFloorTiles(this.assetManager, floorC, this.rootNode,
      -(HALF_X + 1), 0, 2,         4,           tileSize);  // alcoba O

    // -- Paredes KayKit ------------------------------------------
    const segments = this._computeWallSegments(tileSize);
    buildWallSegments(
      this.scene, this.assetManager, this.rootNode,
      wallC, cornerC, doorwayC, gatedC,
      segments, tileSize, this.id,
    );

    // -- Antorchas (modelo 3D + PointLight, SIN FlameSprite) -----
    const INS = TORCH_WALL_INSET;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,               TORCH_Y, -(HALF_Z - INS)), rotY: 0,            inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`   },
      { pos: new Vector3(0,               TORCH_Y,   HALF_Z - INS),  rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_Norte` },
      { pos: new Vector3(-(HALF_X - INS), TORCH_Y, 0),               rotY: Math.PI / 2,  inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste` },
      { pos: new Vector3(  HALF_X - INS,  TORCH_Y, 0),               rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_Este`  },
    ];

    for (const def of torchDefs) {
      const light = buildMountedTorch(
        this.scene, this.assetManager, torchC, def, this.rootNode,
        false,  // withFlame=false: sin FlameSprite en salas del dungeon
      );
      this._lightSources.push(light);
    }

    // SpawnAltar central
    SpawnAltar.create(this.scene, { x: 0, y: 0, z: 0 }, this.rootNode);

    // Subir limite de luces simultaneas y forzar recompilacion de shaders
    this.scene.materials.forEach((mat) => {
      if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) {
        mat.maxSimultaneousLights = 8;
      }
    });
    this.scene.markAllMaterialsAsDirty(2);

    logger.info(`HubRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
