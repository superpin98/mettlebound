// Imports externos (Babylon.js) -- solo tipos, sin valor en runtime
import type { Camera } from '@babylonjs/core';

// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { RoomMode, RoomShape } from '@/game/world/types/room.types';
import { Room } from '@/game/world/Room';
import type { RoomConfig } from '@/game/world/Room';
import { Grid } from '@/game/world/Grid';
import { GridRenderer } from '@/game/world/GridRenderer';

// ============================================================
// Constantes por defecto
// ============================================================

const COMBAT_DEFAULT_COLS = 10;
const COMBAT_DEFAULT_ROWS = 10;
const COMBAT_TILE_SIZE    = 1.0;   // 1 unidad Babylon = 1 tile tactico

// ============================================================
// CombatRoomConfig -- parametros de construccion
// ============================================================

/**
 * Extiende RoomConfig con datos especificos de CombatRoom.
 *
 * sourceRoomId -- ID de la sala de exploracion de la que procede este combate.
 *                 El CombatTransitionManager (A3) lo usa para volver a la sala
 *                 de origen al resolver el combate.
 * cols / rows  -- tamano del grid (defecto 10x10).
 * themeHint    -- pista de tema visual para el renderer de A2-b3.
 *                 Ej: "dungeon_stone", "crypt", "throne_room".
 */
export interface CombatRoomConfig extends RoomConfig {
  sourceRoomId: string;
  cols?: number;
  rows?: number;
  themeHint?: string;
}

// ============================================================
// CombatRoom -- sala de combate por turnos con grid tactico
// ============================================================

/**
 * Sala concreta para el modo combate por turnos de Mettlebound.
 *
 * Responsabilidades A2-b1:
 *   - Crea un Grid (cols x rows) centrado en el origen (0,0,0).
 *   - Marca el perimetro del grid como bloqueado (paredes).
 *   - Instancia un GridRenderer para visualizacion de debug.
 *   - Expone sourceRoomId para el CombatTransitionManager (A3).
 *
 * Extensiones futuras:
 *   - setupCombatCamera() (A3): camara isometrica tactica.
 *   - Logica de turno, spawn de enemigos, etc. (A3+).
 *
 * La planta es siempre rectangular: simplifica el pathfinding tactico.
 * Los connection points estan vacios (la vuelta a exploracion la gestiona
 * un futuro CombatTransitionManager, no un ConnectionPoint estatico).
 */
export class CombatRoom extends Room {

  // --- Identidad -----------------------------------------------

  readonly mode: RoomMode  = 'combat';
  readonly shape: RoomShape = 'rectangular';

  // --- Config persistida ---------------------------------------

  readonly sourceRoomId: string;
  readonly themeHint: string | undefined;

  private readonly _cols: number;
  private readonly _rows: number;

  // --- Grid tactico --------------------------------------------

  private _grid: Grid | null = null;
  private _gridRenderer: GridRenderer | null = null;

  /** Grid tactico de la sala. null antes de build(). */
  get grid(): Grid | null { return this._grid; }

  /** Renderer de debug del grid. null antes de build(). */
  get gridRenderer(): GridRenderer | null { return this._gridRenderer; }

  // ─── Constructor ─────────────────────────────────────────────

  constructor(config: CombatRoomConfig) {
    super(config);
    this.sourceRoomId = config.sourceRoomId;
    this._cols        = config.cols ?? COMBAT_DEFAULT_COLS;
    this._rows        = config.rows ?? COMBAT_DEFAULT_ROWS;
    this.themeHint    = config.themeHint;
  }

  // ─── Template method: _buildImpl ─────────────────────────────

  protected async _buildImpl(): Promise<void> {
    // Centrar el grid en (0,0,0): la esquina inferior izquierda es (-half, 0, -half).
    const halfX = (this._cols * COMBAT_TILE_SIZE) / 2;
    const halfZ = (this._rows * COMBAT_TILE_SIZE) / 2;

    this._grid = new Grid({
      cols:     this._cols,
      rows:     this._rows,
      origin:   { x: -halfX, y: 0, z: -halfZ },
      tileSize: COMBAT_TILE_SIZE,
    });

    // Bloquear perimetro (fila/columna 0 y N-1 = paredes de la sala).
    for (let c = 0; c < this._cols; c++) {
      this._grid.setTileBlocked(c, 0,              true);
      this._grid.setTileBlocked(c, this._rows - 1, true);
    }
    for (let r = 1; r < this._rows - 1; r++) {
      this._grid.setTileBlocked(0,              r, true);
      this._grid.setTileBlocked(this._cols - 1, r, true);
    }

    this._gridRenderer = new GridRenderer(this.scene, this._grid);
  }

  // ─── Metodos obligatorios de Room ────────────────────────────

  /**
   * Punto de spawn del jugador al iniciar el combate.
   * Devuelve el centro geometrico de la sala (0,0,0).
   *
   * future A3: calcularlo segun la puerta de entrada del jugador.
   */
  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  // ─── Hook de camara de combate ───────────────────────────────

  /**
   * Configura la camara para el modo combate (vista isometrica tactica).
   * No-op en A2-b1; se implementara en A3.
   *
   * future A3: ajustar FOV, posicion y target de la camara para
   * obtener la vista isometrica sobre el grid de combate.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setupCombatCamera(_camera: Camera): void {
    // no-op hasta A3
  }

  // ─── Ciclo de vida ────────────────────────────────────────────

  /**
   * Destruye el grid y el renderer antes de limpiar el rootNode.
   * Llama super.dispose() para garantizar la limpieza de Room base.
   */
  override dispose(): void {
    this._gridRenderer = null;
    this._grid         = null;
    super.dispose();
  }
}
