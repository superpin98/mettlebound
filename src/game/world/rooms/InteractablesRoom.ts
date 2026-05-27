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

// Sala reorientada en A2-b4.1: 14u (X) x 10u (Z).
// La puerta Oeste esta en la pared larga (14u), lo que resulta natural
// al entrar desde el Hub (al oeste).
const HALF_X = 7;   // antes: 5 (sala era 10x14)
const HALF_Z = 5;   // antes: 7

// ============================================================
// InteractablesRoom -- sala rectangular con props interactuables
// ============================================================

/**
 * Sala rectangular 14u x 10u con bariles y scaffolding como props
 * interactuables (placeholders para el VectorSystem de A3+).
 *
 * Reorientada en A2-b4.1 de 10x14 a 14x10 para que la puerta Oeste
 * quede en la pared larga (14u), que es la mas natural para la entrada.
 *
 * Props de A2-b3:
 *   - 4 antorchas en las 4 paredes.
 *   - 3 InteractableProp placeholder (bariles) en posiciones fijas.
 *
 * Salidas:
 *   - Oeste: x = -(HALF_X + 1) -- hacia HubRoom (unica salida).
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

    // Puerta Oeste -> HubRoom (unica salida)
    this.addDoor({
      id:            `${this.id}_door_west`,
      direction:     'west',
      worldPosition: { x: -(HALF_X + 1), y: 0, z: 0 },
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Interactables placeholder (future A3: carga modelos KayKit barrel, scaffold, etc.)
    this._buildInteractables();

    // 2. Geometria sincronica
    this._buildGeometry();

    // 3. Props asincronos
    await this._buildProps();
  }

  // --- Spawn point ---------------------------------------------

  /** Punto de entrada cerca de la pared oeste (jugador llega desde el Hub). */
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

  // --- Geometria -----------------------------------------------

  protected override _buildGeometry(): void {
    buildFloorMesh(this.scene, this.rootNode, `${this.id}_floor`, 0, 0, HALF_X * 2, HALF_Z * 2);

    // Las paredes N y S son las largas (14u); E y O son las cortas (10u).
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_S`, 0,        WALL_HEIGHT / 2, -HALF_Z,  HALF_X * 2, WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_N`, 0,        WALL_HEIGHT / 2,  HALF_Z,  HALF_X * 2, WALL_HEIGHT, WALL_THICK);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_W`, -HALF_X,  WALL_HEIGHT / 2,  0,       WALL_THICK, WALL_HEIGHT, HALF_Z * 2);
    buildWallMesh(this.scene, this.rootNode, `${this.id}_wall_E`,  HALF_X,  WALL_HEIGHT / 2,  0,       WALL_THICK, WALL_HEIGHT, HALF_Z * 2);

    logger.debug(`InteractablesRoom '${this.id}': geometria construida.`);
  }

  // --- Props asincronos ----------------------------------------

  private async _buildProps(): Promise<void> {
    const torchContainer = await this.assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE);

    const INS = TORCH_WALL_INSET;
    const torchDefs: TorchDef[] = [
      { pos: new Vector3(0,               TORCH_Y, -(HALF_Z - INS)), rotY: 0,            inward: new Vector3(0, 0,  1), label: `${this.id}_Sur`   },
      { pos: new Vector3(0,               TORCH_Y,   HALF_Z - INS),  rotY: Math.PI,      inward: new Vector3(0, 0, -1), label: `${this.id}_Norte` },
      { pos: new Vector3(-(HALF_X - INS), TORCH_Y, 0),               rotY: Math.PI / 2,  inward: new Vector3(1, 0,  0), label: `${this.id}_Oeste` },
      { pos: new Vector3(  HALF_X - INS,  TORCH_Y, 0),               rotY: -Math.PI / 2, inward: new Vector3(-1, 0, 0), label: `${this.id}_Este`  },
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

    logger.info(`InteractablesRoom '${this.id}': props construidos. Luces: ${this._lightSources.length}`);
  }
}
