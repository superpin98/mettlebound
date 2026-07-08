/**
 * CombatPathfinder -- A* y flood-fill sobre el grid tactico 20x20.
 *
 * Exporta dos algoritmos:
 *   findPath()          A* de un origen a un destino.
 *   getReachableCells() Dijkstra flood-fill: todas las celdas alcanzables
 *                       dentro de un coste maximo (para resaltar el rango de movimiento).
 *
 * 8 direcciones, ortogonal=1.0, diagonal=1.5, evita celdas de otras entidades.
 */

import type { CombatGrid } from '@/game/world/CombatGrid';

// -- Tipos exportados ---------------------------------------------------------

/** Coordenada de celda en el grid tactico. */
export interface GridCell {
  x: number;
  z: number;
}

/** Resultado de una busqueda de camino (A*). */
export interface PathResult {
  /** Ruta completa desde el origen (inclusive) hasta el destino (inclusive). */
  path: GridCell[];
  /** Coste total acumulado. */
  cost: number;
}

// -- Constantes ---------------------------------------------------------------

const GRID_SIZE = 20;

/** [dx, dz, coste]: ortogonal=1.0, diagonal=1.5. */
const DIRECTIONS = [
  [ 0,  1, 1.0], [ 0, -1, 1.0], [ 1,  0, 1.0], [-1,  0, 1.0],
  [ 1,  1, 1.5], [ 1, -1, 1.5], [-1,  1, 1.5], [-1, -1, 1.5],
] as const;

// -- Nodo interno A* ----------------------------------------------------------

interface AStarNode {
  x: number; z: number; g: number; f: number; parent: AStarNode | null;
}

// -- Auxiliares ---------------------------------------------------------------

/**
 * Heuristica octil (admisible para diagonal=1.5):
 *   h = max(|dx|,|dz|) + 0.5 * min(|dx|,|dz|)
 */
function heuristic(ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return Math.max(dx, dz) + 0.5 * Math.min(dx, dz);
}

function reconstructPath(end: AStarNode): PathResult {
  const path: GridCell[] = [];
  let node: AStarNode | null = end;
  while (node !== null) {
    path.unshift({ x: node.x, z: node.z });
    node = node.parent;
  }
  return { path, cost: end.g };
}

// -- Clase principal ----------------------------------------------------------

export class CombatPathfinder {

  /**
   * A* desde start hasta end. Devuelve PathResult o null si no hay camino.
   *
   * @param movingEntityId La propia celda de la entidad es transitable;
   *                       celdas de otras entidades son obstaculos.
   */
  static findPath(
    start:          GridCell,
    end:            GridCell,
    grid:           CombatGrid,
    movingEntityId: string,
  ): PathResult | null {

    if (start.x === end.x && start.z === end.z) {
      return { path: [{ x: start.x, z: start.z }], cost: 0 };
    }

    const openSet:   AStarNode[] = [];
    const closedSet: Set<string> = new Set();

    openSet.push({ x: start.x, z: start.z, g: 0,
                   f: heuristic(start.x, start.z, end.x, end.z), parent: null });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      if (current === undefined) { break; }

      if (current.x === end.x && current.z === end.z) {
        return reconstructPath(current);
      }
      closedSet.add(`${current.x},${current.z}`);

      for (const dir of DIRECTIONS) {
        const nx = current.x + dir[0];
        const nz = current.z + dir[1];

        if (nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) { continue; }
        const key = `${nx},${nz}`;
        if (closedSet.has(key)) { continue; }

        const occupant = grid.occupantAt(nx, nz);
        if (occupant !== null && occupant !== movingEntityId) { continue; }

        const g = current.g + dir[2];
        const existingIdx = openSet.findIndex((n) => n.x === nx && n.z === nz);
        if (existingIdx !== -1) {
          const existing = openSet[existingIdx];
          if (existing !== undefined && existing.g <= g) { continue; }
          openSet.splice(existingIdx, 1);
        }
        openSet.push({ x: nx, z: nz, g,
                       f: g + heuristic(nx, nz, end.x, end.z), parent: current });
      }
    }
    return null;
  }

  /**
   * Dijkstra flood-fill: devuelve todas las celdas alcanzables con coste <= maxCost.
   * Usado por CombatReachableHighlight para resaltar el rango de movimiento.
   *
   * @param movingEntityId Igual que en findPath: propia celda transitable, otras bloqueadas.
   * @returns Map "cx,cz" -> coste minimo. Incluye la celda origen (coste 0).
   */
  static getReachableCells(
    start:          GridCell,
    maxCost:        number,
    grid:           CombatGrid,
    movingEntityId: string,
  ): Map<string, number> {
    const dist = new Map<string, number>();
    dist.set(`${start.x},${start.z}`, 0);

    const queue: Array<{ x: number; z: number; cost: number }> = [
      { x: start.x, z: start.z, cost: 0 },
    ];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      if (current === undefined) { break; }

      const currentKey = `${current.x},${current.z}`;
      const bestCost = dist.get(currentKey);
      // Entrada obsoleta (ya procesamos este nodo con menor coste)
      if (bestCost !== undefined && current.cost > bestCost) { continue; }

      for (const dir of DIRECTIONS) {
        const nx = current.x + dir[0];
        const nz = current.z + dir[1];
        const newCost = current.cost + dir[2];

        if (nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) { continue; }
        if (newCost > maxCost) { continue; }   // fuera del rango de movimiento

        const occupant = grid.occupantAt(nx, nz);
        if (occupant !== null && occupant !== movingEntityId) { continue; }

        const nKey = `${nx},${nz}`;
        const existing = dist.get(nKey);
        if (existing !== undefined && existing <= newCost) { continue; }

        dist.set(nKey, newCost);
        queue.push({ x: nx, z: nz, cost: newCost });
      }
    }

    return dist;
  }
}
