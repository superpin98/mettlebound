/**
 * Definiciones de los 23 items base del MVP y los 4 conjuntos.
 *
 * Los templates son CONFIG objects (datos puros, sin logica).
 * El ItemGenerator los instancia con stats aleatorios segun rareza e iLevel.
 */

import type { ItemTemplate, SetDefinition } from '@/types/items.types';

// ─── Templates de items ──────────────────────────────────────────────────────

export const ITEM_TEMPLATES: readonly ItemTemplate[] = [

  // ── Armas (4) ──────────────────────────────────────────────────────────────
  {
    id: 'sword_long_notched',
    name: 'Espada Larga Mellada',
    itemType: 'weapon',
    slot: 'weapon',
    baseStats: {},
    iconAssetId: 'icon_sword_placeholder',
  },
  {
    id: 'bow_short_forest',
    name: 'Arco Corto del Bosque',
    itemType: 'weapon',
    slot: 'weapon',
    baseStats: {},
    iconAssetId: 'icon_bow_placeholder',
  },
  {
    id: 'staff_apprentice',
    name: 'Baculo de Aprendiz',
    itemType: 'weapon',
    slot: 'weapon',
    baseStats: {},
    iconAssetId: 'icon_staff_placeholder',
  },
  {
    id: 'dagger_curved',
    name: 'Daga Curva',
    itemType: 'weapon',
    slot: 'weapon',
    baseStats: {},
    iconAssetId: 'icon_dagger_placeholder',
  },

  // ── Conjunto Cuero Curtido (4 piezas) ──────────────────────────────────────
  {
    id: 'leather_cap',
    name: 'Capucha de Cuero',
    itemType: 'armor',
    slot: 'head',
    setId: 'set_cuero',
    baseStats: {},
    iconAssetId: 'icon_leather_cap_placeholder',
  },
  {
    id: 'leather_chest',
    name: 'Pechera de Cuero',
    itemType: 'armor',
    slot: 'chest',
    setId: 'set_cuero',
    baseStats: {},
    iconAssetId: 'icon_leather_chest_placeholder',
  },
  {
    id: 'leather_legs',
    name: 'Calzas de Cuero',
    itemType: 'armor',
    slot: 'legs',
    setId: 'set_cuero',
    baseStats: {},
    iconAssetId: 'icon_leather_legs_placeholder',
  },
  {
    id: 'leather_gloves',
    name: 'Guantes de Cuero',
    itemType: 'armor',
    slot: 'hands',
    setId: 'set_cuero',
    baseStats: {},
    iconAssetId: 'icon_leather_gloves_placeholder',
  },

  // ── Conjunto Hilo del Erudito (4 piezas) ───────────────────────────────────
  {
    id: 'scholar_hat',
    name: 'Capirote del Erudito',
    itemType: 'armor',
    slot: 'head',
    setId: 'set_erudito',
    baseStats: {},
    iconAssetId: 'icon_scholar_hat_placeholder',
  },
  {
    id: 'scholar_robe',
    name: 'Tunica del Erudito',
    itemType: 'armor',
    slot: 'chest',
    setId: 'set_erudito',
    baseStats: {},
    iconAssetId: 'icon_scholar_robe_placeholder',
  },
  {
    id: 'scholar_skirt',
    name: 'Faldon del Erudito',
    itemType: 'armor',
    slot: 'legs',
    setId: 'set_erudito',
    baseStats: {},
    iconAssetId: 'icon_scholar_skirt_placeholder',
  },
  {
    id: 'scholar_sleeves',
    name: 'Manguitos del Erudito',
    itemType: 'armor',
    slot: 'hands',
    setId: 'set_erudito',
    baseStats: {},
    iconAssetId: 'icon_scholar_sleeves_placeholder',
  },

  // ── Conjunto Acero del Verdugo (4 piezas) ──────────────────────────────────
  {
    id: 'verdugo_helm',
    name: 'Yelmo del Verdugo',
    itemType: 'armor',
    slot: 'head',
    setId: 'set_verdugo',
    baseStats: {},
    iconAssetId: 'icon_verdugo_helm_placeholder',
  },
  {
    id: 'verdugo_chest',
    name: 'Coraza del Verdugo',
    itemType: 'armor',
    slot: 'chest',
    setId: 'set_verdugo',
    baseStats: {},
    iconAssetId: 'icon_verdugo_chest_placeholder',
  },
  {
    id: 'verdugo_legs',
    name: 'Grevas del Verdugo',
    itemType: 'armor',
    slot: 'legs',
    setId: 'set_verdugo',
    baseStats: {},
    iconAssetId: 'icon_verdugo_legs_placeholder',
  },
  {
    id: 'verdugo_gauntlets',
    name: 'Manoplas del Verdugo',
    itemType: 'armor',
    slot: 'hands',
    setId: 'set_verdugo',
    baseStats: {},
    iconAssetId: 'icon_verdugo_gauntlets_placeholder',
  },

  // ── Conjunto Velo del Vacio (4 piezas) ─────────────────────────────────────
  {
    id: 'void_veil',
    name: 'Velo del Vacio',
    itemType: 'armor',
    slot: 'head',
    setId: 'set_vacio',
    baseStats: {},
    iconAssetId: 'icon_void_veil_placeholder',
  },
  {
    id: 'void_mantle',
    name: 'Manto del Vacio',
    itemType: 'armor',
    slot: 'chest',
    setId: 'set_vacio',
    baseStats: {},
    iconAssetId: 'icon_void_mantle_placeholder',
  },
  {
    id: 'void_pants',
    name: 'Pantalon del Vacio',
    itemType: 'armor',
    slot: 'legs',
    setId: 'set_vacio',
    baseStats: {},
    iconAssetId: 'icon_void_pants_placeholder',
  },
  {
    id: 'void_gauntlets',
    name: 'Guanteletes del Vacio',
    itemType: 'armor',
    slot: 'hands',
    setId: 'set_vacio',
    baseStats: {},
    iconAssetId: 'icon_void_gauntlets_placeholder',
  },

  // ── Templates exoticos (sin set, portadores de affixes raros/epicos) ─────────
  {
    id: 'venom_blade',
    name: 'Hoja Venenosa',
    itemType: 'weapon',
    slot: 'weapon',
    baseStats: {},
    description: 'Una hoja impregnada de toxinas que favorece affixes de dano de estado.',
    iconAssetId: 'icon_venom_blade_placeholder',
  },
  {
    id: 'barbed_gloves',
    name: 'Guantes de Puas',
    itemType: 'armor',
    slot: 'hands',
    baseStats: {},
    description: 'Guanteletes con puas retractiles. Favorecen el sangrado y el veneno.',
    iconAssetId: 'icon_barbed_gloves_placeholder',
  },
  {
    id: 'iron_guardian_belt',
    name: 'Cinturon del Guardian de Hierro',
    itemType: 'armor',
    slot: 'belt',
    baseStats: {},
    description: 'Un cinturon reforzado que puede reducir el dano fisico recibido.',
    iconAssetId: 'icon_iron_guardian_belt_placeholder',
  },
];

// ─── Definiciones de conjuntos ───────────────────────────────────────────────

export const SET_DEFINITIONS: readonly SetDefinition[] = [
  {
    id: 'set_cuero',
    name: 'Cuero Curtido',
    bonuses: [
      {
        piecesRequired: 2,
        description: '+2 DEX, +3% evasion',
        effects: [
          { type: 'stat_flat', stat: 'DEX', amount: 2 },
          { type: 'evasion_flat', amount: 3 },
        ],
      },
      {
        piecesRequired: 4,
        description: '+5 DEX, +8% evasion, +1.5% critico',
        effects: [
          { type: 'stat_flat', stat: 'DEX', amount: 5 },
          { type: 'evasion_flat', amount: 8 },
          { type: 'crit_flat', amount: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'set_erudito',
    name: 'Hilo del Erudito',
    bonuses: [
      {
        piecesRequired: 2,
        description: '+2 INT, +20 MP maximo',
        effects: [
          { type: 'stat_flat', stat: 'INT', amount: 2 },
          { type: 'mp_flat', amount: 20 },
        ],
      },
      {
        piecesRequired: 4,
        description: '+5 INT, +50 MP maximo, +5% dano magico',
        effects: [
          { type: 'stat_flat', stat: 'INT', amount: 5 },
          { type: 'mp_flat', amount: 50 },
          { type: 'damage_pct', amount: 5 },
        ],
      },
    ],
  },
  {
    id: 'set_verdugo',
    name: 'Acero del Verdugo',
    bonuses: [
      {
        piecesRequired: 2,
        description: '+2 STR, +30 HP maximo',
        effects: [
          { type: 'stat_flat', stat: 'STR', amount: 2 },
          { type: 'hp_flat', amount: 30 },
        ],
      },
      {
        piecesRequired: 4,
        description: '+5 STR, +80 HP maximo, +5% dano fisico',
        effects: [
          { type: 'stat_flat', stat: 'STR', amount: 5 },
          { type: 'hp_flat', amount: 80 },
          { type: 'damage_pct', amount: 5 },
        ],
      },
    ],
  },
  {
    id: 'set_vacio',
    name: 'Velo del Vacio',
    bonuses: [
      {
        piecesRequired: 2,
        description: '+2 LCK, +1.5% critico',
        effects: [
          { type: 'stat_flat', stat: 'LCK', amount: 2 },
          { type: 'crit_flat', amount: 1.5 },
        ],
      },
      {
        piecesRequired: 4,
        description: '+5 LCK, +5% critico, +5 velocidad de turno',
        effects: [
          { type: 'stat_flat', stat: 'LCK', amount: 5 },
          { type: 'crit_flat', amount: 5 },
          { type: 'speed_flat', amount: 5 },
        ],
      },
    ],
  },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Devuelve el template de un item por su id. Lanza si no existe. */
export function getItemTemplate(id: string): ItemTemplate {
  const template = ITEM_TEMPLATES.find((t) => t.id === id);
  if (template === undefined) {
    throw new Error(`getItemTemplate: template desconocido "${id}"`);
  }
  return template;
}

/** Devuelve la definicion de un conjunto por su id. Lanza si no existe. */
export function getSetDefinition(id: string): SetDefinition {
  const def = SET_DEFINITIONS.find((s) => s.id === id);
  if (def === undefined) {
    throw new Error(`getSetDefinition: conjunto desconocido "${id}"`);
  }
  return def;
}
