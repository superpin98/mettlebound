/**
 * Definiciones de las 5 clases jugables de Mettlebound.
 *
 * Las clases son CONFIG objects (plain objects), NO clases TypeScript con herencia.
 * Modificar estos valores cambia el balance sin tocar la lógica.
 */

import type { ClassDefinition, ClassId } from '@/types/game.types';
import { BALANCE } from '@/config/balance';

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  {
    id: 'guerrero',
    name: 'Guerrero',
    description: 'Tanque cuerpo a cuerpo. Alta resistencia, daño físico sólido.',
    baseStats: { STR: 10, DEX: 4, INT: 2, LCK: 4 },
    freePoints: 0,
  },
  {
    id: 'cazador',
    name: 'Cazador',
    description: 'Combatiente a distancia. Alta Destreza, buena evasión y velocidad.',
    baseStats: { STR: 4, DEX: 10, INT: 3, LCK: 3 },
    freePoints: 0,
  },
  {
    id: 'mago',
    name: 'Mago',
    description: 'Especialista arcano. Altísimo daño mágico y MP, frágil físicamente.',
    baseStats: { STR: 3, DEX: 3, INT: 10, LCK: 4 },
    freePoints: 0,
  },
  {
    id: 'picaro',
    name: 'Pícaro',
    description: 'Acróbata letal. Equilibrio entre Destreza y Suerte; críticos frecuentes.',
    baseStats: { STR: 4, DEX: 7, INT: 3, LCK: 6 },
    freePoints: 0,
  },
  {
    id: 'errante',
    name: 'Errante',
    description:
      'Sin camino fijo. Stats base iguales en todo, pero con 8 puntos libres para forjar su propio estilo.',
    baseStats: { STR: 3, DEX: 3, INT: 3, LCK: 3 },
    freePoints: BALANCE.PLAYER.ERRANTE_FREE_POINTS,
  },
];

/**
 * Devuelve la definición de una clase por su ID.
 * Lanza un error explícito si el ID no existe (fallo temprano, más fácil de depurar).
 */
export function getClassById(id: ClassId): ClassDefinition {
  const def = CLASS_DEFINITIONS.find(c => c.id === id);
  if (!def) {
    throw new Error(`getClassById: clase desconocida '${id}'`);
  }
  return def;
}
