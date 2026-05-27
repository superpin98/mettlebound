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
  buildFloorMesh,
  buildWallMesh,
  TORCH_Y,
  TORCH_WALL_INSET,
} from '@/game/world/rooms/RoomGeometry';
import type { TorchDef } from '@/game/world/rooms/RoomGeometry';
import { SpawnAltar } from '@/game/world/props/SpawnAltar';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de sala
// ============================================================

const DUNGEON_BASE_URL = '/assets/models/dungeon/';
const TORCH_FILE       = 'torch_mounted.gltf.glb';

const WALL_HEIGHT = 3;
const WALL_THICK  = 0.3;

// Media anchura y profundidad del area principal (sala 14u x 12u)
const HALF_X = 7;
const HALF_Z = 6;

// ============================================================
// HubRoom -- sala hub irregular (14x12 + 2 alcobas laterales)
// ============================================================

/**
 * Sala principal de Mettlebound. Forma irregular:
 *   - Area principal: 14u (X) x 12u (Z).
 *   - Alcoba Este:   2u x 4u en x=[HALF_X, HALF_X+2], z=[-2, 2].
 *   - Alcoba Oeste:  2u x 4u en x=[-(HALF_X+2), -HALF_X], z=[-2, 2].
 *
 * Props de A2-b3:
 *   - 4 antorchas montadas en paredes (N, S, E, O).
 *   - SpawnAltar placeholder en el centro.
 *
 * Salidas:
 *   - Sur:   z = -(HALF_Z + 1)
 *   - Norte: z =   HALF_Z + 1
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

    this.addDoor({
      id:            `${this.id}_door_south`,
      direction:     'south',
      worldPosition: { x: 0, y: 0, z: -(HALF_Z + 1) },
      isOpen:        true,
      linkedRoomId:  null,
    });
    this.addDoor({
      id:            `${this.id}_door_north`,
      direction:     'north',
      worldPosition: { x: 0, y: 0, z: HALF_Z + 1 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // 2. Geometria sincronica
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: -(HALF_Z - 2) };
  }

  // --- Geometria -----------------------------------------------

  protected override _buildGeometry(): void {
    // Suelos
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_main`,     0,             0, HALF_X * 2, HALF_Z * 2);
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_alcove_E`,  HALF_X + 1,   0, 2, 4);
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_alcove_W`, -(HALF_X + 1), 0, 2, 4);

    // Paredes perimetrales del area principal
    const side = HALF_X * 2;
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_S`, 0,        WALL_HEIGHT / 2, -HALF_Z,  side,            WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_N`, 0,        WALL_HEIGHT / 2,  HALF_Z,  side,            WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_W`, -HALF_X,  WALL_HEIGHT / 2,  0,       WALL_THICK,      WALL_HEIGHT, HALF_Z * 2);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_E`,  HALF_X,  WALL_HEIGHT / 2,  0,       WALL_THICK,      WALL_HEIGHT, HALF_Z * 2);

    logger.debug(`HubRoom '${this.id}': geometria construida.`);
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    const torchContainer = await this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE);

    const INS = TORCH_WALL_INSET;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,              TORCH_Y, -(HALF_Z - INS)), rotY: 0,            inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`   },
      { pos: new Vector3(0,              TORCH_Y,   HALF_Z - INS),  rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_Norte` },
      { pos: new Vector3(-(HALF_X - INS), TORCH_Y, 0),              rotY: Math.PI / 2,  inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste` },
      { pos: new Vector3(  HALF_X - INS,  TORCH_Y, 0),              rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_Este`  },
    ];

    for (const def of torchDefs) {
      const light = buildMountedTorch(this.scene, this.assetManager, torchContainer, def, this.rootNode);
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
