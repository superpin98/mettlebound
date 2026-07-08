/**
 * Tipos del sistema de items, inventario y equipamiento de Mettlebound.
 * Importar desde aqui para todo lo relacionado con items.
 */

import type { ClassId, Rarity, UpgradeEffect } from '@/types/game.types';

// Clasificacion de items

/** Categoria principal de un item. */
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'pet' | 'consumable';

/**
 * Subtipo de arma. Controla que set de animaciones usa el portador.
 * Extensible: anadir nuevos valores cuando existan modelos y anims para ellos.
 */
export type WeaponSubType =
  | 'sword_and_shield'  // espada + escudo -- activa anims _SNS
  | 'sword_2h'          // espadon / hacha a dos manos (reservado)
  | 'bow'               // arco (reservado)
  | 'dagger'            // daga / armas duales (reservado)
  | 'staff';            // baculo / varita (reservado)

/** Slot de equipo donde puede colocarse un item. 10 slots totales. */
export type EquipmentSlot =
  | 'head'    // casco
  | 'chest'   // armadura
  | 'legs'    // pantalones
  | 'hands'   // guantes
  | 'weapon'  // arma principal
  | 'belt'    // cinturon
  | 'ring1'   // anillo izquierdo
  | 'ring2'   // anillo derecho
  | 'amulet'  // colgante
  | 'pet';    // mascota (vacio en MVP)

// Affixes

/**
 * Stat que puede modificar un affix.
 * Incluye stats primarios, derivados y de combate.
 */
export type AffixStatKey =
  // Stats primarios (flat)
  | 'STR' | 'DEX' | 'INT' | 'LCK'
  // HP / MP (flat)
  | 'maxHp' | 'maxMp'
  // Combate (porcentaje)
  | 'critChance' | 'critDamage' | 'evasion'
  // Dano por tipo (porcentaje)
  | 'physicalDamagePct' | 'rangedDamagePct' | 'magicalDamagePct'
  // Dano flat (affixes de arma)
  | 'flatPhysicalDamage' | 'flatRangedDamage' | 'flatMagicalDamage'
  // Defensa (flat y porcentaje)
  | 'armor' | 'magicResist' | 'damageReductionPct'
  // Sustain (porcentaje)
  | 'lifesteal' | 'manasteal'
  // Velocidad (flat)
  | 'turnSpeed'
  // Resistencia a estados alterados (porcentaje)
  | 'statusResistance'
  // Stats exoticos (rarezas altas)
  | 'bleedDamage'          // dano por sangrado (flat)
  | 'poisonDamage'         // dano por veneno (flat)
  | 'stunChance'           // probabilidad de aturdir (%)
  | 'physicalReductionPct'; // reduccion de dano fisico recibido (%)

/** Un affix es un modificador de stat aleatorio generado con el item. */
export interface Affix {
  readonly stat: AffixStatKey;
  readonly value: number;
  /** true = mostrar como %, false = mostrar como valor plano. */
  readonly isPercent: boolean;
}

// Efectos unicos (Epicos y Legendarios)

/**
 * Contexto de combate pasado al handler de un efecto unico.
 * Stub hasta Sprint 5 -- los tipos concretos se anadiran con CombatManager.
 * Se usa Record<string, unknown> en lugar de any: tipado pero abierto.
 */
export interface CombatTriggerContext {
  readonly sourceId: string;
  readonly targetId: string;
  readonly combatState: Readonly<Record<string, unknown>>;
}

/** Cuando se activa un efecto unico. */
export type UniqueEffectTrigger =
  | 'passive'
  | 'on_hit'
  | 'on_crit'
  | 'on_kill'
  | 'on_damaged'
  | 'turn_start';

/**
 * Efecto unico que pueden tener los items Epicos y Legendarios.
 * La funcion effect es un stub hasta Sprint 5 -- registrada en UniqueEffectPool.
 * Para guardar/cargar, se serializa solo el id y se restaura la funcion del pool.
 */
export interface UniqueEffect {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly triggerType: UniqueEffectTrigger;
  /** Logica del efecto. Recibe contexto de combate y emite eventos al EventBus. */
  readonly effect: (ctx: CombatTriggerContext) => void;
}

// Item

/** Stats base de un item (los del template, antes de affixes). */
export interface ItemBaseStats {
  readonly damage?: number;       // armas: dano base generado por iLevel
  readonly armor?: number;        // piezas de armadura
  readonly magicResist?: number;  // piezas de armadura o accesorios
}

/**
 * Una instancia concreta de un item generado proceduralmente.
 * Inmutable -- si algo cambia, se crea un nuevo objeto.
 */
export interface Item {
  readonly id: string;               // nanoid unico por instancia
  readonly baseId: string;           // ID del template (ej: "leather_helmet")
  readonly name: string;             // generado proceduralmente para Epico/Legendario
  readonly rarity: Rarity;
  readonly itemType: ItemType;
  readonly slot: EquipmentSlot;
  /** Subtipo de arma. Solo presente en items de tipo 'weapon'. */
  readonly weaponSubType?: WeaponSubType;
  readonly level: number;            // nivel minimo requerido para equiparlo
  readonly iLevel: number;           // item level (escala los rangos de stats)
  readonly setId?: string;           // si pertenece a un conjunto
  readonly baseStats: ItemBaseStats;
  readonly affixes: readonly Affix[];
  readonly uniqueEffect?: UniqueEffect;
  readonly description?: string;
  readonly iconAssetId: string;
  readonly sellValue: number;
}

/** Template de un item base del MVP. Define la forma; el generador lo instancia. */
export interface ItemTemplate {
  readonly id: string;
  readonly name: string;             // nombre base (ej: "Capucha de Cuero")
  readonly itemType: ItemType;
  readonly slot: EquipmentSlot;
  /** Subtipo de arma. Solo para templates con itemType 'weapon'. */
  readonly weaponSubType?: WeaponSubType;
  readonly setId?: string;
  /** Clases que pueden equipar este item. Undefined = cualquier clase. */
  readonly allowedClasses?: readonly ClassId[];
  readonly baseStats: ItemBaseStats;
  readonly description?: string;
  readonly iconAssetId: string;
}

// Conjuntos

/**
 * Bonus que activa un conjunto al llevar N piezas.
 * Reutiliza UpgradeEffect para los efectos de stat.
 * uniqueEffectId permite anadir un pasivo unico en el bonus de 4 piezas.
 */
export interface SetBonus {
  readonly piecesRequired: 2 | 4;
  readonly description: string;
  readonly effects: readonly UpgradeEffect[];
  /** ID de un UniqueEffect del pool que se activa como pasivo del conjunto. */
  readonly uniqueEffectId?: string;
}

/** Definicion de un conjunto de items. */
export interface SetDefinition {
  readonly id: string;
  readonly name: string;
  readonly bonuses: readonly SetBonus[];
}

// Inventario

/** Los 10 slots de equipo del personaje, todos opcionales. */
export type EquippedItems = {
  readonly [K in EquipmentSlot]?: Item;
};

/**
 * Snapshot inmutable del inventario.
 * null en el array de bolsa = slot vacio.
 */
export interface InventorySnapshot {
  readonly equipped: EquippedItems;
  readonly bag: ReadonlyArray<Item | null>;
  readonly bagSize: number;
}
