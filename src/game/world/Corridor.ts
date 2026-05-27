// Imports internos
import type { Vec3 } from '@/types/spatial.types';
import type { RoomShape, ConnectionDirection } from '@/game/world/types/room.types';
import { ExplorationRoom } from '@/game/world/ExplorationRoom';
import type { RoomConfig } from '@/game/world/Room';

// ============================================================
// Constantes
// ============================================================

const CORRIDOR_DEFAULT_WIDTH = 3;  // unidades Babylon
const TORCH_SPACING          = 4;  // distancia entre antorchas en unidades Babylon

// ============================================================
// CorridorConfig -- parametros de construccion
// ============================================================

/**
 * Extiende RoomConfig con datos especificos de Corridor.
 *
 * length         -- longitud del corredor en unidades Babylon (eje principal).
 * width          -- anchura del corredor (defecto 3u).
 * startDirection -- direccion de la puerta de entrada (la salida es la opuesta).
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
 * Responsabilidades A2-b1:
 *   - Define un area rectangular (length x width) centrada en origen.
 *   - Anade dos ConnectionPoints (uno en cada extremo del corredor).
 *   - Calcula marcadores de antorchas cada TORCH_SPACING unidades (almacenados,
 *     no renderizados hasta A2-b3).
 *
 * Orientacion:
 *   - startDirection 'north' o 'south' -> corredor corre a lo largo del eje Z.
 *   - startDirection 'east'  o 'west'  -> corredor corre a lo largo del eje X.
 */
export class Corridor extends ExplorationRoom {

  // --- Identidad -----------------------------------------------

  readonly shape: RoomShape = 'rectangular';

  // --- Config persistida ---------------------------------------

  readonly length:         number;
  readonly width:          number;
  readonly startDirection: ConnectionDirection;

  // --- Estado interno ------------------------------------------

  /**
   * Posiciones world de las antorchas del corredor.
   * Calculadas en _buildImpl(); renderizadas en A2-b3.
   *
   * Se exponen como getter para inspeccion/debug y futuros tests.
   */
  private _torchMarkers: Vec3[] = [];

  /** Posiciones world de las antorchas calculadas (no renderizadas hasta A2-b3). */
  get torchMarkers(): readonly Vec3[] { return this._torchMarkers; }

  // ─── Constructor ─────────────────────────────────────────────

  constructor(config: CorridorConfig) {
    super(config);
    this.length         = config.length;
    this.width          = config.width ?? CORRIDOR_DEFAULT_WIDTH;
    this.startDirection = config.startDirection;
  }

  // ─── Template method: _buildImpl ─────────────────────────────

  protected async _buildImpl(): Promise<void> {
    const isNS = this.startDirection === 'north' || this.startDirection === 'south';

    // Dimensiones del rectangulo segun la orientacion del corredor.
    const rectWidth = isNS ? this.width  : this.length;
    const rectDepth = isNS ? this.length : this.width;

    // Area del corredor centrada en (0, 0, 0).
    this.addArea({
      x:     -(rectWidth / 2),
      z:     -(rectDepth / 2),
      width:  rectWidth,
      depth:  rectDepth,
    });

    // Direccion del extremo de salida (opuesta al startDirection).
    const endDirection = this._oppositeDirection(this.startDirection);

    // Puerta de entrada (extremo startDirection).
    this.addDoor({
      id:            `door_${this.id}_${this.startDirection}`,
      direction:     this.startDirection,
      worldPosition: this._doorPosition(this.startDirection, rectWidth, rectDepth),
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Puerta de salida (extremo opuesto).
    this.addDoor({
      id:            `door_${this.id}_${endDirection}`,
      direction:     endDirection,
      worldPosition: this._doorPosition(endDirection, rectWidth, rectDepth),
      isOpen:        true,
      linkedRoomId:  null,
    });

    // Calcular marcadores de antorchas cada TORCH_SPACING a lo largo del eje mayor.
    this._buildTorchMarkers(isNS, rectWidth, rectDepth);

    // Construir geometria (no-op en A2-b1).
    this._buildGeometry();
  }

  // ─── Metodos obligatorios de Room ────────────────────────────

  /** Punto de spawn al entrar en el corredor: centro geometrico (0, 0, 0). */
  getSpawnPoint(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  // ─── Helpers privados ────────────────────────────────────────

  /** Devuelve la direccion opuesta a la dada. */
  private _oppositeDirection(dir: ConnectionDirection): ConnectionDirection {
    const opposites: Record<ConnectionDirection, ConnectionDirection> = {
      north: 'south',
      south: 'north',
      east:  'west',
      west:  'east',
    };
    return opposites[dir];
  }

  /**
   * Calcula la posicion world del centro de una puerta segun su lado.
   * El umbral esta en el borde del rectangulo del corredor, a Y = 0.
   */
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
    }
  }

  /**
   * Calcula marcadores de antorchas cada TORCH_SPACING unidades a lo largo
   * del eje mayor del corredor, en ambas paredes laterales.
   *
   * Los marcadores se almacenan en _torchMarkers; se renderizaran en A2-b3.
   */
  private _buildTorchMarkers(
    isNS: boolean,
    rectWidth: number,
    rectDepth: number,
  ): void {
    const axisLen = isNS ? rectDepth : rectWidth;
    const half    = axisLen / 2;

    // 0.5u de margen desde la pared para la posicion de la antorcha.
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
