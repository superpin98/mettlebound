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

// Antesala: 4u ancho x 6u profundo, x=[-2,2], z=[-6,0]
const ANTE_HX    = 2;
const ANTE_ZMIN  = -6;
const ANTE_ZMAX  =  0;

// Camara: 6u ancho x 6u profundo, x=[-3,3], z=[0,6]
const CAM_HX    = 3;
const CAM_ZMIN  = 0;
const CAM_ZMAX  = 6;

// ============================================================
// LootRoom -- sala de botin (antesala 4x6 + camara 6x6)
// ============================================================

/**
 * Sala de botin de Mettlebound. Planta irregular:
 *   - Antesala: 4u (X) x 6u (Z), x=[-2,2], z=[-6,0].
 *   - Camara:   6u (X) x 6u (Z), x=[-3,3], z=[0,6].
 *
 * Props de A2-b3:
 *   - 2 antorchas: pared Este de la antesala, pared Norte de la camara.
 *   - 1 InteractableProp chest placeholder en el centro de la camara.
 *
 * Salidas:
 *   - Sur: z = ANTE_ZMIN - 1  (entrada unica, sala sin salida norte).
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

    this.addDoor({
      id:            `${this.id}_door_south`,
      direction:     'south',
      worldPosition: { x: 0, y: 0, z: ANTE_ZMIN - 1 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Interactable placeholder (future A3: carga modelo chest_gold.gltf.glb)
    this._buildInteractables();

    // 2. Geometria sincronica
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: ANTE_ZMIN + 2 };
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

  // --- Geometria -----------------------------------------------

  protected override _buildGeometry(): void {
    // Suelos
    const anteDep = ANTE_ZMAX - ANTE_ZMIN;
    const camDep  = CAM_ZMAX  - CAM_ZMIN;
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_ante`, 0, (ANTE_ZMIN + ANTE_ZMAX) / 2, ANTE_HX * 2, anteDep);
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor_cam`,  0, (CAM_ZMIN  + CAM_ZMAX)  / 2, CAM_HX  * 2, camDep);

    // Paredes de la antesala
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_ante_S`, 0,        WALL_HEIGHT / 2, ANTE_ZMIN,      ANTE_HX * 2, WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_ante_W`, -ANTE_HX, WALL_HEIGHT / 2, (ANTE_ZMIN + ANTE_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, anteDep);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_ante_E`,  ANTE_HX, WALL_HEIGHT / 2, (ANTE_ZMIN + ANTE_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, anteDep);

    // Paredes de la camara
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_cam_N`,  0,       WALL_HEIGHT / 2, CAM_ZMAX,       CAM_HX  * 2, WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_cam_W`, -CAM_HX, WALL_HEIGHT / 2, (CAM_ZMIN + CAM_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, camDep);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_cam_E`,  CAM_HX, WALL_HEIGHT / 2, (CAM_ZMIN + CAM_ZMAX) / 2, WALL_THICK, WALL_HEIGHT, camDep);

    logger.debug(`LootRoom '${this.id}': geometria construida.`);
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    const torchContainer = await this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE);

    const INS  = TORCH_WALL_INSET;
    const anteMidZ = (ANTE_ZMIN + ANTE_ZMAX) / 2;
    const torchDefs: TorchDef[] = [
      // Antorcha en la pared Este de la antesala
      { pos: new Vector3(ANTE_HX - INS, TORCH_Y, anteMidZ), rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_AnteEste`  },
      // Antorcha en la pared Norte de la camara
      { pos: new Vector3(0, TORCH_Y, CAM_ZMAX - INS),        rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_CamNorte` },
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

    logger.info(`LootRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
