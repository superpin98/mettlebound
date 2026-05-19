/**
 * Calculo de bonus de conjuntos (sets) activos.
 * Funciones puras: dado el equipamiento, devuelve los bonos activos.
 * Sin efectos secundarios — solo leer y calcular.
 */

import type { EquippedItems, SetBonus } from '@/types/items.types';
import { SET_DEFINITIONS } from '@/config/items.config';

// ─── Tipos exportados ─────────────────────────────────────────────────────────

/** Bonus de conjunto activo con contexto completo del conjunto. */
export interface ActiveSetBonus {
  /** ID del conjunto (ej: 'set_cuero'). */
  readonly setId: string;
  /** Nombre del conjunto (ej: 'Cuero Curtido'). */
  readonly setName: string;
  /** Piezas equipadas de este conjunto en el momento del calculo. */
  readonly piecesEquipped: number;
  /** La definicion del bono activado. */
  readonly bonus: SetBonus;
}

// ─── Funciones exportadas ─────────────────────────────────────────────────────

/**
 * Cuenta cuantas piezas de cada conjunto estan equipadas.
 * Solo cuenta items que tengan setId definido.
 *
 * @param equipped - Mapa de slots a items equipados
 * @returns Mapa de setId a numero de piezas equipadas
 */
export function countSetPieces(equipped: EquippedItems): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const item of Object.values(equipped)) {
    if (item?.setId !== undefined) {
      counts.set(item.setId, (counts.get(item.setId) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Calcula todos los bonus de conjunto activos para el equipamiento actual.
 * Un bonus esta activo si piecesEquipped >= piecesRequired.
 * Con 4 piezas: tanto el bono de 2 como el de 4 estan activos.
 *
 * @param equipped - Mapa de slots a items equipados
 * @returns Lista de bonos activos, ordenados por set y umbral ascendente
 */
export function getActiveSetBonuses(equipped: EquippedItems): readonly ActiveSetBonus[] {
  const pieces = countSetPieces(equipped);
  const active: ActiveSetBonus[] = [];

  for (const setDef of SET_DEFINITIONS) {
    const count = pieces.get(setDef.id) ?? 0;
    if (count === 0) continue;

    for (const bonus of setDef.bonuses) {
      if (count >= bonus.piecesRequired) {
        active.push({
          setId: setDef.id,
          setName: setDef.name,
          piecesEquipped: count,
          bonus,
        });
      }
    }
  }

  return active;
}
