/**
 * Definiciones de las 5 clases jugables de Mettlebound.
 * Las clases son CONFIG objects (plain objects), NO clases con herencia.
 * Modificar estos valores cambia el balance sin tocar la logica.
 */

import type { ClassDefinition, ClassId } from '@/types/game.types';
import { BALANCE } from '@/config/balance';

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  {
    id: 'guerrero',
    name: 'Guerrero',
    description: 'Tanque cuerpo a cuerpo. Alta resistencia, dano fisico solido.',
    baseStats: { STR: 10, DEX: 4, INT: 2, LCK: 4 },
    freePoints: 0,
    startingItemId: 'sword_long_notched',
  },
  {
    id: 'cazador',
    name: 'Cazador',
    description: 'Combatiente a distancia. Alta Destreza, buena evasion y velocidad.',
    baseStats: { STR: 4, DEX: 10, INT: 3, LCK: 3 },
    freePoints: 0,
    startingItemId: 'bow_short_forest',
  },
  {
    id: 'mago',
    name: 'Mago',
    description: 'Especialista arcano. Altisimo dano magico y MP, fragil fisicamente.',
    baseStats: { STR: 3, DEX: 3, INT: 10, LCK: 4 },
    freePoints: 0,
    startingItemId: 'staff_apprentice',
  },
  {
    id: 'picaro',
    name: 'Picaro',
    description: 'Acrobata letal. Equilibrio entre Destreza y Suerte; criticos frecuentes.',
    baseStats: { STR: 4, DEX: 7, INT: 3, LCK: 6 },
    freePoints: 0,
    startingItemId: 'dagger_curved',
  },
  {
    id: 'errante',
    name: 'Errante',
    description: 'Sin camino fijo. Stats base iguales, con 8 puntos libres para forjar su estilo.',
    baseStats: { STR: 3, DEX: 3, INT: 3, LCK: 3 },
    freePoints: BALANCE.PLAYER.ERRANTE_FREE_POINTS,
    // startingItemId omitido: el Errante empieza sin item (forja su destino)
  },
];

/**
 * Devuelve la definicion de una clase por su ID.
 * Lanza error si el ID no existe (fallo temprano).
 */
export function getClassById(id: ClassId): ClassDefinition {
  const def = CLASS_DEFINITIONS.find((c) => c.id === id);
  if (!def) {
    throw new Error(`getClassById: clase desconocida '${id}'`);
  }
  return def;
}
