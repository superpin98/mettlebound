import type { Vec3 } from '@/types/spatial.types';

// ============================================================
// room.types.ts -- tipos de dominio de las salas de Mettlebound
//
// Tipos puros (sin dependencia de Babylon.js).
// Importables en tests de logica pura sin necesidad de DOM ni WebGL.
// ============================================================

// ─── Modo de sala ─────────────────────────────────────────────────

/**
 * Modo de funcionamiento de una sala.
 *   'exploration' : movimiento WASD libre, sin grid, formas complejas.
 *   'combat'      : movimiento por turnos, con grid, forma cuadrada/rectangular.
 */
export type RoomMode = 'exploration' | 'combat';

// ─── Forma geometrica ─────────────────────────────────────────────

/**
 * Planta geometrica de la sala.
 * Usada por el renderer y el pathfinding para saber como leer los limites.
 *
 * Valores actuales (Sprint 4-EXT):
 *   'rectangular'  -- sala basica (cuadrada o rectangular simple)
 *   'L_shape'      -- planta en L
 *   'T_shape'      -- planta en T
 *   'U_shape'      -- planta en U (herradura)
 *   'irregular'    -- forma libre definida por la subclase
 *
 * Las CombatRoom siempre usan 'rectangular' para simplificar el pathfinding.
 */
export type RoomShape =
  | 'rectangular'
  | 'L_shape'
  | 'T_shape'
  | 'U_shape'
  | 'irregular';

// ─── Puntos de conexion (puertas / salidas) ───────────────────────

/** Las cuatro direcciones cardinales de conexion entre salas. */
export type ConnectionDirection = 'north' | 'south' | 'east' | 'west';

/**
 * Puerta o pasaje que conecta esta sala con otra.
 *
 * Las salas solo conocen sus propias ConnectionPoints.
 * La navegacion entre salas es responsabilidad de un futuro RoomManager.
 * Esto evita dependencias circulares entre salas.
 */
export interface ConnectionPoint {
  /** Identificador unico dentro de la sala: ej. 'door_north_01'. */
  id: string;

  /** Lado de la sala donde esta la puerta. */
  direction: ConnectionDirection;

  /**
   * Centro del umbral de la puerta en coordenadas world.
   * worldPosition.y = 0 siempre (a nivel suelo).
   */
  worldPosition: Vec3;

  /** true si la puerta esta abierta y el jugador puede pasar. */
  isOpen: boolean;

  /**
   * ID de la sala destino.
   * null si la puerta aun no esta vinculada a ninguna sala
   * (placeholder durante construccion de la dungeons) o es un muro ciego.
   */
  linkedRoomId: string | null;
}
