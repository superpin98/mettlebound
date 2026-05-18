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

/**
 * Mapa de eventos del juego.
 * mitt requiere que todos los valores sean unknown (no undefined).
 * Los eventos sin payload usan null como convencion.
 */
export type GameEventMap = {
  'player:stats-changed': PlayerSnapshot;
  'player:level-up': { newLevel: number; snapshot: PlayerSnapshot };
  'player:xp-gained': { amount: number; snapshot: PlayerSnapshot };
  'ui:show-level-up-modal': { snapshot: PlayerSnapshot };
  'ui:close-level-up-modal': null;
};

/** El EventBus tipado de la partida. Singleton. */
export const eventBus = mitt<GameEventMap>();
