/**
 * EventBus global de la partida.
 *
 * Usa mitt como motor de eventos para desacoplar los sistemas de juego
 * de la interfaz de usuario. El modulo game/ nunca importa nada de ui/;
 * en su lugar emite eventos y la UI los escucha.
 *
 * Uso:
 *   import { eventBus } from '@/core/EventBus';
 *
 *   eventBus.emit('player:level-up', { newLevel: 5, snapshot });
 *   eventBus.on('player:level-up', ({ newLevel }) => { ... });
 *   eventBus.off('player:level-up', handler);
 */

import mitt from 'mitt';
import type { PlayerSnapshot } from '@/types/game.types';
import type { Item, EquipmentSlot, EquippedItems } from '@/types/items.types';
import type { PhysicsBody } from '@babylonjs/core';

/**
 * Mapa de eventos del juego.
 * mitt requiere que todos los valores sean unknown (no undefined).
 * Los eventos sin payload usan null como convencion.
 */
export type GameEventMap = {
  // Player
  'player:stats-changed': PlayerSnapshot;
  'player:level-up': { newLevel: number; snapshot: PlayerSnapshot };
  'player:xp-gained': { amount: number; snapshot: PlayerSnapshot };
  'player:attack': null;        // swing iniciado
  'player:attack-hit': { body: PhysicsBody };  // impacto real: hitbox tocó un cuerpo
  'player:death':      null;        // HP llegó a 0 — emitido una sola vez por PlayerStats
  'player:death-anim-end': null;     // animación Death_A terminada — dispara el GameOverModal
  'combat:start':  null;             // transición exploración→combate iniciada (freeze todo)
  'combat:end':    null;             // vuelta a exploración (unfreeze)
  'input:attack': null;         // click izquierdo detectado por InputManager
  'ui:show-level-up-modal': { snapshot: PlayerSnapshot };
  'ui:close-level-up-modal': null;
  // Inventory
  'inventory:item-added':      { item: Item };
  'inventory:item-equipped':   { item: Item; slot: EquipmentSlot; equipped: EquippedItems };
  'inventory:item-unequipped': { item: Item; slot: EquipmentSlot; equipped: EquippedItems };
  'inventory:item-discarded':  { item: Item };
  'inventory:full':            null;
};

/** El EventBus tipado de la partida. Singleton. */
export const eventBus = mitt<GameEventMap>();
