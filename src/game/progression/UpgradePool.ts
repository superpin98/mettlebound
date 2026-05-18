/**
 * Pool de mejoras disponibles para el jugador al subir de nivel.
 *
 * MVP (Sprint 2): 8 comunes + 6 poco comunes activas.
 * Las rarezas superiores están definidas pero comentadas; se activarán en Sprint 8.
 *
 * REGLA: Todos los IDs deben ser únicos y en snake_case.
 */

import type { UpgradeDefinition } from '@/types/game.types';

export const UPGRADE_POOL: UpgradeDefinition[] = [
  // ─── Comunes ─────────────────────────────────────────────────────────────

  {
    id: 'common_str_1',
    name: 'Músculo endurecido',
    description: '+2 de Fuerza. Más HP máximo y daño físico.',
    rarity: 'common',
    effect: { type: 'stat_flat', stat: 'STR', amount: 2 },
  },
  {
    id: 'common_dex_1',
    name: 'Paso ligero',
    description: '+2 de Destreza. Más evasión y velocidad de turno.',
    rarity: 'common',
    effect: { type: 'stat_flat', stat: 'DEX', amount: 2 },
  },
  {
    id: 'common_int_1',
    name: 'Mente afilada',
    description: '+2 de Inteligencia. Más MP máximo y daño mágico.',
    rarity: 'common',
    effect: { type: 'stat_flat', stat: 'INT', amount: 2 },
  },
  {
    id: 'common_lck_1',
    name: 'Ojo de lince',
    description: '+2 de Suerte. Mayor probabilidad de crítico.',
    rarity: 'common',
    effect: { type: 'stat_flat', stat: 'LCK', amount: 2 },
  },
  {
    id: 'common_hp_flat',
    name: 'Vitalidad resistente',
    description: '+20 de HP máximo.',
    rarity: 'common',
    effect: { type: 'hp_flat', amount: 20 },
  },
  {
    id: 'common_mp_flat',
    name: 'Reserva arcana',
    description: '+15 de MP máximo.',
    rarity: 'common',
    effect: { type: 'mp_flat', amount: 15 },
  },
  {
    id: 'common_crit_flat',
    name: 'Golpe preciso',
    description: '+3% de probabilidad de crítico.',
    rarity: 'common',
    effect: { type: 'crit_flat', amount: 3 },
  },
  {
    id: 'common_speed_flat',
    name: 'Reflejos rápidos',
    description: '+10 de velocidad de turno.',
    rarity: 'common',
    effect: { type: 'speed_flat', amount: 10 },
  },

  // ─── Poco comunes ─────────────────────────────────────────────────────────

  {
    id: 'uncommon_str_2',
    name: 'Brazo de hierro',
    description: '+4 de Fuerza. Carne templada en el combate.',
    rarity: 'uncommon',
    effect: { type: 'stat_flat', stat: 'STR', amount: 4 },
  },
  {
    id: 'uncommon_dex_2',
    name: 'Sombra fugaz',
    description: '+4 de Destreza. Te mueves antes que la mayoría.',
    rarity: 'uncommon',
    effect: { type: 'stat_flat', stat: 'DEX', amount: 4 },
  },
  {
    id: 'uncommon_int_2',
    name: 'Canalización profunda',
    description: '+4 de Inteligencia. El poder fluye con más facilidad.',
    rarity: 'uncommon',
    effect: { type: 'stat_flat', stat: 'INT', amount: 4 },
  },
  {
    id: 'uncommon_hp_large',
    name: 'Corazón de piedra',
    description: '+40 de HP máximo.',
    rarity: 'uncommon',
    effect: { type: 'hp_flat', amount: 40 },
  },
  {
    id: 'uncommon_evasion_flat',
    name: 'Instinto de supervivencia',
    description: '+5% de evasión.',
    rarity: 'uncommon',
    effect: { type: 'evasion_flat', amount: 5 },
  },
  {
    id: 'uncommon_damage_pct',
    name: 'Filo implacable',
    description: '+10% de daño en todos los ataques.',
    rarity: 'uncommon',
    effect: { type: 'damage_pct', amount: 10 },
  },

  // ─── Raros, Épicos y Legendarios ─────────────────────────────────────────
  // Pendiente para Sprint 8. Definiciones comentadas para facilitar activación.
  //
  // {
  //   id: 'rare_all_stats_1',
  //   name: 'Marca del héroe',
  //   description: '+2 a todos los stats primarios.',
  //   rarity: 'rare',
  //   effect: { type: 'stat_flat', stat: 'STR', amount: 2 }, // expandir cuando se active
  // },
];

/**
 * Devuelve todas las mejoras del pool filtradas por rareza.
 * Útil para tests y para validar que hay suficientes opciones por tier.
 */
export function getUpgradesByRarity(
  rarity: UpgradeDefinition['rarity'],
): UpgradeDefinition[] {
  return UPGRADE_POOL.filter(u => u.rarity === rarity);
}
