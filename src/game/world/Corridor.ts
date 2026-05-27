// Imports externos (Babylon.js)
import { Vector3, MeshBuilder, PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { RoomShape, ConnectionDirection } from '@/game/world/types/room.types';
import { ExplorationRoom } from '@/game/world/ExplorationRoom';
import type { RoomConfig } from '@/game/world/Room';
import { buildFloorTiles } from '@/game/world/rooms/RoomGeometry';
import { measureTileSize } from '@/game/world/utils/measureTile';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes
// ============================================================

const CORRIDOR_DEFAULT_WIDTH = 3;  // unidades Babylon
const TORCH_SPACING          = 4;  // distancia entre antorchas

const DUNGEON_BASE_URL = '/assets/models/dungeon/';
const FLOOR_FILE       = 'floor_tile_large.gltf.glb';
const WALL_FILE        = 'wall.gltf.glb';

/** Altura del collider de pared del corredor. */
const WALL_H = 2;

/** Grosor del collider de pared del corredor. */
const WALL_T = 0.5;

// ============================================================
// CorridorConfig -- parametros de construccion
// ============================================================

/**
 * Extiende RoomConfig con datos especificos de Corridor.
 */
export interface CorridorConfig extends RoomConfig {
  length: number;
  width?: number;
  startDirection: ConnectionDirection;
}

// ============================================================
// Corridor -- corredor recto que conecta dos salas
// ============================================================

/**
 * Sala de exploracion concreta que representa un corredor recto.
 *
 * Geometria Visual (A2-b4-VISUAL-FIX):
 *   - Suelo de tiles KayKit floor_tile_large.gltf.glb.
 *   - Paredes laterales de wall.gltf.glb (sin pared en los extremos,
 *     donde los corredores conectan con salas).
 *   - Colliders Havok BOX para suelo + paredes laterales.
 *
 * Orientacion:
 *   - startDirection north/south -> corredor corre a lo largo del eje Z.
 *   - startDirection east/west   -> corredor corre a lo largo del eje X.
 */
export class Corridor extends ExplorationRoom {

  readonly shape: RoomShape = 'rectangular';

  readonly length:         number;
  readonly width:          number;
  readonly startDirection: ConnectionDirection;

  private _torchMarkers: Vec3[] = [];

  get torchMarkers(): readonly Vec3[] { return this._torchMarkers; }

  constructor(config: CorridorConfig) {
    super(config);
    this.length         = config.length;
    this.width          = config.width ?? CORRIDOR_DEFAULT_WIDTH;
    this.startDirection = config.startDirection;
  }

  // ─── Template method: _buildImpl ─────────────────────────────

  protected async _buildImpl(): Promise<void> {
    const isNS = this.startDirection === 'north' || this.startDirection === 'south';

    const rectWidth = isNS ? this.width  : this.length;
    const rectDepth = isNS ? this.length : this.width;

    this.addArea({
      x:     -(rectWidth / 2),
      z:     -(rectDepth / 2),
      width:  rectWidth,
      depth:  rectDepth,
    });

    const endDirection = this._oppositeDirection(this.startDirection);

    this.addDoor({
      id:            `door_${this.id}_${this.startDirection}`,
      direction:     this.startDirection,
      worldPosition: this._doorPosition(this.startDirection, rectWidth, rectDepth),
      isOpen:        true,
      linkedRoomId:  null,
    });

    this.addDoor({
      id:            `door_${this.id}_${endDirection}`,
      direction:     endDirection,
      worldPosition: this._doorPosition(endDirection, rectWidth, rectDepth),
      isOpen:        true,
      linkedRoomId:  null,
    });

    this._buildTorchMarkers(isNS, rectWidth, rectDepth);

    // Geometria no-op sincrona (heredada)
    this._buildGeometry();

    // Geometria KayKit asincrona
    await this._buildKayKitGeometry(isNS, rectWidth, rectDepth);
  }

  // ─── Metodos obligatorios de Room ────────────────────────────

  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  // ─── Geometria KayKit ────────────────────────────────────────

  /**
   * Carga floor_tile_large.gltf.glb y wall.gltf.glb, y construye:
   *   - Suelo de tiles para el area del corredor.
   *   - Paredes laterales: segmentos de wall.gltf.glb a ambos lados
   *     del eje mayor, sin paredes en los extremos.
   *   - Colliders Havok para suelo + paredes laterales.
   *
   * @param isNS       true si el corredor corre en Z (NS), false si en X (EW).
   * @param rectWidth  Ancho del rectangulo del corredor.
   * @param rectDepth  Profundidad del rectangulo del corredor.
   */
  private async _buildKayKitGeometry(
    isNS:      boolean,
    rectWidth: number,
    rectDepth: number,
  ): Promise<void> {
    const [floorC, wallC] = await Promise.all([
      this.assetManager.loadAsset(DUNGEON_BASE_URL, FLOOR_FILE),
      this.assetManager.loadAsset(DUNGEON_BASE_URL, WALL_FILE),
    ]);

    const tileSize = measureTileSize(floorC, this.assetManager);

    // -- Suelo --------------------------------------------------
    buildFloorTiles(
      this.assetManager, floorC, this.rootNode,
      0, 0, rectWidth, rectDepth, tileSize,
    );

    // Posicion world del rootNode para colliders (rootNode solo traslacion)
    const px = this.rootNode.position.x;
    const pz = this.rootNode.position.z;

    // -- Collider de suelo -------------------------------------
    const floorBox = MeshBuilder.CreateBox(
      `col_floor_${this.id}`,
      { width: rectWidth, height: 0.1, depth: rectDepth },
      this.scene,
    );
    floorBox.position   = new Vector3(px, -0.05, pz);
    floorBox.isVisible  = false;
    floorBox.isPickable = false;
    new PhysicsAggregate(floorBox, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

    // -- Paredes laterales + colliders -------------------------
    // Los extremos del corredor estan abiertos (conectan con salas).
    // Solo se colocan paredes a los LADOS del eje mayor.
    if (isNS) {
      // Corredor eje Z: paredes en x=+/-halfWidth, a lo largo de Z
      const halfW = rectWidth / 2;
      const nWallSegs = Math.round(rectDepth / tileSize);

      for (const sideX of [-halfW, halfW]) {
        const rotY = sideX < 0 ? Math.PI / 2 : -Math.PI / 2;

        for (let i = 0; i < nWallSegs; i++) {
          const z = (-rectDepth / 2 + tileSize / 2) + i * tileSize;

          // Visual
          const inst = this.assetManager.instantiate(wallC);
          inst.rootNode.parent   = this.rootNode;
          inst.rootNode.position = new Vector3(sideX, 0, z);
          inst.rootNode.rotation = new Vector3(0, rotY, 0);

          // Collider (posicion world absoluta)
          const wBox = MeshBuilder.CreateBox(
            `col_wall_${this.id}_${sideX > 0 ? 'E' : 'W'}_${i}`,
            { width: WALL_T, height: WALL_H, depth: tileSize },
            this.scene,
          );
          wBox.position   = new Vector3(px + sideX, WALL_H / 2, pz + z);
          wBox.isVisible  = false;
          wBox.isPickable = false;
          new PhysicsAggregate(wBox, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
      }
    } else {
      // Corredor eje X: paredes en z=+/-halfDepth, a lo largo de X
      const halfD = rectDepth / 2;
      const nWallSegs = Math.round(rectWidth / tileSize);

      for (const sideZ of [-halfD, halfD]) {
        const rotY = sideZ < 0 ? 0 : Math.PI;

        for (let i = 0; i < nWallSegs; i++) {
          const x = (-rectWidth / 2 + tileSize / 2) + i * tileSize;

          // Visual
          const inst = this.assetManager.instantiate(wallC);
          inst.rootNode.parent   = this.rootNode;
          inst.rootNode.position = new Vector3(x, 0, sideZ);
          inst.rootNode.rotation = new Vector3(0, rotY, 0);

          // Collider (posicion world absoluta)
          const wBox = MeshBuilder.CreateBox(
            `col_wall_${this.id}_${sideZ < 0 ? 'S' : 'N'}_${i}`,
            { width: tileSize, height: WALL_H, depth: WALL_T },
            this.scene,
          );
          wBox.position   = new Vector3(px + x, WALL_H / 2, pz + sideZ);
          wBox.isVisible  = false;
          wBox.isPickable = false;
          new PhysicsAggregate(wBox, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
      }
    }

    logger.debug(`Corridor '${this.id}': geometria KayKit construida.`, {
      isNS, rectWidth, rectDepth, tileSize,
    });
  }

  // ─── Helpers privados ────────────────────────────────────────

  private _oppositeDirection(dir: ConnectionDirection): ConnectionDirection {
    const opposites: Record<ConnectionDirection, ConnectionDirection> = {
      north:     'south',
      south:     'north',
      east:      'west',
      west:      'east',
      northeast: 'southwest',
      southwest: 'northeast',
      southeast: 'northwest',
      northwest: 'southeast',
    };
    return opposites[dir];
  }

  private _doorPosition(
    dir: ConnectionDirection,
    rectWidth: number,
    rectDepth: number,
  ): Vec3 {
    const hw = rectWidth / 2;
    const hd = rectDepth / 2;
    switch (dir) {
      case 'north': return { x:   0, y: 0, z:  hd };
      case 'south': return { x:   0, y: 0, z: -hd };
      case 'east':  return { x:  hw, y: 0, z:   0 };
      case 'west':  return { x: -hw, y: 0, z:   0 };
      case 'northeast':
      case 'southeast':
      case 'southwest':
      case 'northwest':
        throw new Error(`Corridor._doorPosition: diagonal direction '${dir}' not supported in A2-b4.1 -- implement in Sprint 6`);
    }
  }

  private _buildTorchMarkers(
    isNS: boolean,
    rectWidth: number,
    rectDepth: number,
  ): void {
    const axisLen = isNS ? rectDepth : rectWidth;
    const half    = axisLen / 2;
    const wallOffset = 0.5;

    for (let dist = TORCH_SPACING; dist < half; dist += TORCH_SPACING) {
      if (isNS) {
        const hw = rectWidth / 2 - wallOffset;
        this._torchMarkers.push({ x:  hw, y: 0, z:  dist });
        this._torchMarkers.push({ x: -hw, y: 0, z:  dist });
        this._torchMarkers.push({ x:  hw, y: 0, z: -dist });
        this._torchMarkers.push({ x: -hw, y: 0, z: -dist });
      } else {
        const hd = rectDepth / 2 - wallOffset;
        this._torchMarkers.push({ x:  dist, y: 0, z:  hd });
        this._torchMarkers.push({ x:  dist, y: 0, z: -hd });
        this._torchMarkers.push({ x: -dist, y: 0, z:  hd });
        this._torchMarkers.push({ x: -dist, y: 0, z: -hd });
      }
    }
  }
}
