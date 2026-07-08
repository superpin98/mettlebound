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
    modelAssetId: 'knight_armed_v2.glb',
    isMixamo: true,
    visibleAttachments: [],
  },
  {
    id: 'cazador',
    name: 'Cazadora',
    description: 'Combatiente a distancia. Alta Destreza, buena evasion y velocidad.',
    baseStats: { STR: 4, DEX: 10, INT: 3, LCK: 3 },
    freePoints: 0,
    startingItemId: 'bow_short_forest',
    modelAssetId: 'Rogue.glb',
    visibleAttachments: ['1H_Crossbow'],
  },
  {
    id: 'mago',
    name: 'Mago',
    description: 'Especialista arcano. Altisimo dano magico y MP, fragil fisicamente.',
    baseStats: { STR: 3, DEX: 3, INT: 10, LCK: 4 },
    freePoints: 0,
    startingItemId: 'staff_apprentice',
    modelAssetId: 'Mage.glb',
    visibleAttachments: ['Spellbook'],
  },
  {
    id: 'picaro',
    name: 'Picaro',
    description: 'Acrobata letal. Equilibrio entre Destreza y Suerte; criticos frecuentes.',
    baseStats: { STR: 4, DEX: 7, INT: 3, LCK: 6 },
    freePoints: 0,
    startingItemId: 'dagger_curved',
    modelAssetId: 'Rogue_Hooded.glb',
    visibleAttachments: ['Knife', 'Knife_Offhand'],
  },
  {
    id: 'errante',
    name: 'Errante',
    description: 'Sin camino fijo. Stats base iguales, con 8 puntos libres para forjar su estilo.',
    baseStats: { STR: 3, DEX: 3, INT: 3, LCK: 3 },
    freePoints: BALANCE.PLAYER.ERRANTE_FREE_POINTS,
    // startingItemId omitido: el Errante empieza sin item (forja su destino)
    modelAssetId: 'Barbarian.glb',
    visibleAttachments: [], // Errante empieza a puno limpio
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

// ============================================================
// Utilidades de visibilidad de attachments
// ============================================================

/**
 * Substrings que identifican partes del cuerpo del personaje.
 * Un nodo cuyo nombre base contenga alguno de estos patrones
 * se considera parte del cuerpo y NUNCA se oculta, independientemente
 * de la whitelist de armas/accesorios de la clase.
 */
export const BODY_PART_PATTERNS: readonly string[] = [
  '_Body',
  '_Head',
  '_Helmet',
  '_Hat',
  '_Hooded',
  '_ArmLeft',
  '_ArmRight',
  '_LegLeft',
  '_LegRight',
  '_Cape',
];

/**
 * Devuelve true si el nombre base del nodo corresponde a una
 * parte del cuerpo (no a un arma ni accesorio).
 *
 * @param name - Nombre del nodo ya sin sufijo _instN.
 */
export function isBodyPart(name: string): boolean {
  return BODY_PART_PATTERNS.some((pattern) => name.includes(pattern));
}
