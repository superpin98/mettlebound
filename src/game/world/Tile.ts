import type { Vec3 } from '@/types/spatial.types';

// ============================================================
// Tipos de dominio del tile
// ============================================================

/** Superficie base del suelo. Por defecto 'stone'. */
export type BaseTerrain = 'stone' | 'wood' | 'metal';

/** Fluidos que pueden acumularse en un tile. */
export type FluidType = 'water' | 'oil' | 'blood' | 'acid';

/** Modificadores de estado del tile. */
export type ModifierType = 'electrified' | 'frozen' | 'sticky' | 'consecrated';

/** Nivel de temperatura del tile. */
export type TemperatureLevel = 'cold' | 'neutral' | 'hot' | 'burning';

// ============================================================
// TileData -- interface de datos planos
// ============================================================

export interface TileData {
  /**
   * Coordenada world del CENTRO del tile.
   * CONVENCION: position.y = 0 SIEMPRE.
   * Todos los tiles estan a nivel suelo (Y=0).
   * Nunca usar position.y para logica de juego.
   */
  position:    Vec3;

  /** Columna y fila del tile dentro del Grid. */
  gridCoord:   { col: number; row: number };

  /** Tipo de superficie base. Por defecto 'stone'. */
  baseTerrain: BaseTerrain;

  /** Fluidos presentes en este tile (pueden combinarse). */
  fluids:      Set<FluidType>;

  /** Modificadores activos en este tile. */
  modifiers:   Set<ModifierType>;

  /** Temperatura ambiental del tile. */
  temperature: TemperatureLevel;

  /**
   * Altura del tile respecto al suelo.
   *   0 = nivel normal
   *  +1 = cobertura baja (media pared, caja grande)
   *  +2 = pared baja (barandilla, muro bajo)
   */
  height: number;

  /**
   * true si el tile esta completamente bloqueado para el movimiento
   * (pared, pilar, obstaculo solido).
   */
  blocked: boolean;
}

// ============================================================
// Tile -- clase con metodos de mutacion
// ============================================================

/**
 * Unidad basica del grid tactico de Mettlebound.
 *
 * Tile es mutable por diseno: los sistemas de vectores (fluidos,
 * modificadores, temperatura) modifican el estado del tile en runtime.
 * Los campos position y gridCoord son readonly tras la creacion.
 */
export class Tile implements TileData {
  /** @see TileData.position */
  readonly position:  Vec3;

  /** @see TileData.gridCoord */
  readonly gridCoord: { col: number; row: number };

  baseTerrain:  BaseTerrain;
  fluids:       Set<FluidType>;
  modifiers:    Set<ModifierType>;
  temperature:  TemperatureLevel;
  height:       number;
  blocked:      boolean;

  constructor(data: TileData) {
    this.position    = data.position;
    this.gridCoord   = data.gridCoord;
    this.baseTerrain = data.baseTerrain;
    this.fluids      = data.fluids;
    this.modifiers   = data.modifiers;
    this.temperature = data.temperature;
    this.height      = data.height;
    this.blocked     = data.blocked;
  }

  // ——————————————————————————————————————————
  // Fluidos
  // ——————————————————————————————————————————

  /** Anade un fluido al tile (idempotente: Set no duplica). */
  addFluid(fluid: FluidType): void {
    this.fluids.add(fluid);
  }

  /** Elimina un fluido del tile. No lanza error si no estaba. */
  removeFluid(fluid: FluidType): void {
    this.fluids.delete(fluid);
  }

  // ——————————————————————————————————————————
  // Modificadores
  // ——————————————————————————————————————————

  /** Anade un modificador al tile (idempotente). */
  addModifier(mod: ModifierType): void {
    this.modifiers.add(mod);
  }

  /** Elimina un modificador del tile. No lanza error si no estaba. */
  removeModifier(mod: ModifierType): void {
    this.modifiers.delete(mod);
  }

  // ——————————————————————————————————————————
  // Temperatura
  // ——————————————————————————————————————————

  /** Cambia el nivel de temperatura del tile. */
  setTemperature(temp: TemperatureLevel): void {
    this.temperature = temp;
  }

  // ——————————————————————————————————————————
  // Bloqueo
  // ——————————————————————————————————————————

  /**
   * Devuelve true si el tile esta bloqueado para el movimiento.
   * Alias legible de this.blocked para uso en motores de pathfinding.
   */
  isBlocked(): boolean {
    return this.blocked;
  }
}
