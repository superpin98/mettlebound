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
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de sala
// ============================================================

const DUNGEON_BASE_URL = '/assets/models/dungeon/';
const TORCH_FILE       = 'torch_mounted.gltf.glb';

const WALL_HEIGHT = 3;
const WALL_THICK  = 0.3;

// Sala principal: 10u x 10u
const MAIN_HX = 5;
const MAIN_HZ = 5;

// Brazo norte: 6u ancho x 4u profundo, adosado al norte del area principal
const ARM_HX    = 3;
const ARM_ZMIN  = MAIN_HZ;        // 5
const ARM_ZMAX  = MAIN_HZ + 4;   // 9

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
 * Props de A2-b3:
 *   - 3 antorchas: pared Sur, pared Oeste del area principal,
 *     pared Norte del brazo.
 *
 * Salidas:
 *   - Sur:   z = -(MAIN_HZ + 1) -- hacia HubRoom (unica salida).
 *
 * El nombre "CombatTrigger" indica que esta sala tiene un trigger que
 * puede desencadenar combate al entrar (implementacion en A3+).
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

    // Puerta Sur -> HubRoom (unica salida)
    this.addDoor({
      id:            `${this.id}_door_south`,
      direction:     'south',
      worldPosition: { x: 0, y: 0, z: -(MAIN_HZ + 1) },
      isOpen:        true,
      linkedRoomId:  null,
    });
    // La puerta norte (brazo) fue eliminada en A2-b4.1 -- hub estrella.

    // 2. Geometria sincronica
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: -(MAIN_HZ - 2) };
  }

  // --- Geometria -----------------------------------------------

  protected override _buildGeometry(): void {
    // Suelos
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_main`, 0,                  0, MAIN_HX * 2, MAIN_HZ * 2);
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_arm`,  0, (ARM_ZMIN + ARM_ZMAX) / 2, ARM_HX * 2, ARM_ZMAX - ARM_ZMIN);

    // Paredes
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_S`, 0,        WALL_HEIGHT / 2, -MAIN_HZ,     MAIN_HX * 2,  WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_W`, -MAIN_HX, WALL_HEIGHT / 2,  0,            WALL_THICK,   WALL_HEIGHT, MAIN_HZ * 2);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_E`,  MAIN_HX, WALL_HEIGHT / 2,  0,            WALL_THICK,   WALL_HEIGHT, MAIN_HZ * 2);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_arm_N`, 0,    WALL_HEIGHT / 2,  ARM_ZMAX,    ARM_HX * 2,   WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_arm_W`, -ARM_HX, WALL_HEIGHT / 2, (ARM_ZMIN + ARM_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, ARM_ZMAX - ARM_ZMIN);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_arm_E`,  ARM_HX, WALL_HEIGHT / 2, (ARM_ZMIN + ARM_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, ARM_ZMAX - ARM_ZMIN);

    logger.debug(`CombatTriggerRoom '${this.id}': geometria construida.`);
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    const torchContainer = await this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE);

    const INS = TORCH_WALL_INSET;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,              TORCH_Y, -(MAIN_HZ - INS)),  rotY: 0,           inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`      },
      { pos: new Vector3(-(MAIN_HX - INS), TORCH_Y, 0),               rotY: Math.PI / 2, inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste`    },
      { pos: new Vector3(0,              TORCH_Y,  ARM_ZMAX - INS),   rotY: Math.PI,     inward: new Vector3(0, 0, -1), label: `${this.id}_NorteBrazo` },
    ];

    for (const def of torchDefs) {
      const light = buildMountedTorch(this.scene, this.assetManager, torchContainer, def, this.rootNode);
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
