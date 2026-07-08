/**
 * WeaponStance — estado de arma derivado del equipamiento.
 *
 * El stance controla que set de animaciones usa el personaje:
 *   'unarmed'          → set base (Idle, Run, Attack_A, Hit, Death_A)
 *   'sword_and_shield' → set SNS  (Idle_SNS, Run_SNS, Attack_SNS, Hit_SNS + Death_A comun)
 *
 * Para anadir un nuevo stance en el futuro:
 *   1. Ampliar WeaponStance con el nuevo valor.
 *   2. Anadir la entrada a STANCE_ANIM_SET ('base' o 'sns' segun proceda).
 *   3. Actualizar deriveWeaponStance con la condicion de deteccion.
 */

import type { EquippedItems } from '@/types/items.types';

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Estado de arma del personaje. Determina el animset activo. */
export type WeaponStance = 'unarmed' | 'sword_and_shield';

/** Identificador de animset. */
export type AnimSet = 'base' | 'sns';

// ── Mapa stance → animset ────────────────────────────────────────────────────

/**
 * Mapa extensible que relaciona cada stance con su animset.
 *   'base' = anims sin sufijo (Idle, Run, Attack_A, Hit, Death_A).
 *   'sns'  = anims con sufijo _SNS (Idle_SNS, Run_SNS, Attack_SNS, Hit_SNS).
 * Death_A no tiene variante SNS — el resolver siempre cae al set base para ella.
 */
export const STANCE_ANIM_SET: Record<WeaponStance, AnimSet> = {
  unarmed:          'base',
  sword_and_shield: 'sns',
};

// ── Logica de deteccion ──────────────────────────────────────────────────────

/**
 * Deriva el stance activo a partir del equipamiento del jugador.
 *
 * Reglas (en orden):
 *   1. Slot weapon vacio                              → 'unarmed'
 *   2. weapon.weaponSubType === 'sword_and_shield'    → 'sword_and_shield'
 *   3. Cualquier otro subtype (bow, staff, dagger...) → 'unarmed'
 *      (fallback hasta que existan sus anims propias)
 *
 * @param equipped - Snapshot de items equipados (de Inventory.getSnapshot().equipped)
 */
export function deriveWeaponStance(equipped: EquippedItems): WeaponStance {
  const weapon = equipped.weapon;
  if (weapon === undefined)                             { return 'unarmed'; }
  if (weapon.weaponSubType === 'sword_and_shield')      { return 'sword_and_shield'; }
  return 'unarmed';
}
