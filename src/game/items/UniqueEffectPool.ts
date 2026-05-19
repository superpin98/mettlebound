/**
 * Pool de efectos unicos para items Epicos y Legendarios.
 *
 * Cada efecto tiene un handler stub que se conectara con CombatManager en Sprint 5.
 * Para guardar/cargar: serializar solo el id del efecto y restaurar la funcion
 * del pool al cargar (no serializar la funcion directamente).
 *
 * Para anadir nuevos efectos: definirlos aqui y registrarlos en items.config.ts.
 */

import type { UniqueEffect } from '@/types/items.types';

// ─── Efectos Epicos ──────────────────────────────────────────────────────────

export const EPIC_EFFECTS: readonly UniqueEffect[] = [
  {
    id: 'echo_of_steel',
    name: 'Eco de Acero',
    description: '10% de chance de repetir el ataque basico al golpear.',
    rarity: 'epic',
    triggerType: 'on_hit',
    effect: (_ctx) => { /* Sprint 5: 10% chance de repetir ataque */ },
  },
  {
    id: 'subtle_drain',
    name: 'Drenaje Sutil',
    description: 'Robas el 3% del dano infligido como HP.',
    rarity: 'epic',
    triggerType: 'on_hit',
    effect: (_ctx) => { /* Sprint 5: heal = damage * 0.03 */ },
  },
  {
    id: 'resonance',
    name: 'Resonancia',
    description: 'Tu siguiente critico hace +50% dano.',
    rarity: 'epic',
    triggerType: 'on_crit',
    effect: (_ctx) => { /* Sprint 5: buff nextCrit * 1.5 */ },
  },
  {
    id: 'shadow_veil',
    name: 'Velo de Sombra',
    description: '15% de chance de hacerte invisible 1 turno al recibir dano.',
    rarity: 'epic',
    triggerType: 'on_damaged',
    effect: (_ctx) => { /* Sprint 5: 15% invisible 1 turno */ },
  },
  {
    id: 'abyss_breath',
    name: 'Aliento del Abismo',
    description: 'Recuperas 2 MP al inicio de cada turno.',
    rarity: 'epic',
    triggerType: 'turn_start',
    effect: (_ctx) => { /* Sprint 5: mp += 2 */ },
  },
  {
    id: 'bloody_steel',
    name: 'Acero Sangriento',
    description: 'Tu siguiente habilidad cuesta 50% menos MP al matar.',
    rarity: 'epic',
    triggerType: 'on_kill',
    effect: (_ctx) => { /* Sprint 5: nextSkillCostMult = 0.5 */ },
  },
  {
    id: 'mental_fortress',
    name: 'Fortaleza Mental',
    description: '-20% de dano magico recibido.',
    rarity: 'epic',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: magicDamageReceived *= 0.8 */ },
  },
  {
    id: 'insatiable_thirst',
    name: 'Sed Insaciable',
    description: '+5% dano durante 3 turnos al matar (acumulable hasta 25%).',
    rarity: 'epic',
    triggerType: 'on_kill',
    effect: (_ctx) => { /* Sprint 5: damageBuff += 0.05, max 0.25 */ },
  },
  {
    id: 'swift_steps',
    name: 'Pasos Veloces',
    description: '+10% velocidad de turno (pasivo).',
    rarity: 'epic',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: turnSpeed *= 1.1 */ },
  },
  {
    id: 'static_charge',
    name: 'Carga Estatica',
    description: '8% de chance de paralizar al enemigo 1 turno al golpear.',
    rarity: 'epic',
    triggerType: 'on_hit',
    effect: (_ctx) => { /* Sprint 5: 8% apply paralysis 1 turn */ },
  },
];

// ─── Efectos Legendarios ─────────────────────────────────────────────────────

export const LEGENDARY_EFFECTS: readonly UniqueEffect[] = [
  {
    id: 'void_kiss',
    name: 'Beso del Vacio',
    description: 'El 30% de tu dano fisico se convierte en dano verdadero.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: 30% del fisico a true damage */ },
  },
  {
    id: 'wise_pact',
    name: 'Pacto del Sabio',
    description: 'Cada vez que recibes dano, ganas 1 INT temporal (dura el combate).',
    rarity: 'legendary',
    triggerType: 'on_damaged',
    effect: (_ctx) => { /* Sprint 5: tempInt += 1 */ },
  },
  {
    id: 'tyrant_crown',
    name: 'Corona del Tirano',
    description: 'Recibes 30% mas dano pero infliges 50% mas dano.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: damageOut *= 1.5, damageIn *= 1.3 */ },
  },
  {
    id: 'final_whisper',
    name: 'Susurro del Final',
    description: 'Si tu HP llega a 0, sobrevives con 1 HP. Una vez por sala.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: cheat death once per room */ },
  },
  {
    id: 'wolf_hunger',
    name: 'Hambre del Lobo',
    description: 'Al matar, recuperas 25% HP maximo y tu siguiente ataque es critico.',
    rarity: 'legendary',
    triggerType: 'on_kill',
    effect: (_ctx) => { /* Sprint 5: heal 25% maxHp, nextHit guaranteed crit */ },
  },
  {
    id: 'broken_clock',
    name: 'Reloj Roto',
    description: 'Una vez por combate, puedes deshacer tu ultimo turno.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: undo last turn, once per combat */ },
  },
  {
    id: 'black_flame',
    name: 'Llama Negra',
    description: 'Aplica Llama Negra: el enemigo sufre 5% HP maximo por 3 turnos.',
    rarity: 'legendary',
    triggerType: 'on_hit',
    effect: (_ctx) => { /* Sprint 5: apply blackFlame DoT: 5% maxHp x3 */ },
  },
  {
    id: 'thousand_faces',
    name: 'Mil Caras',
    description: 'Tu dano se calcula con tu stat mas alto en lugar del que corresponda.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: use max(STR,DEX,INT) for damage scaling */ },
  },
  {
    id: 'wanderer_promise',
    name: 'Promesa del Errante',
    description: '+5% a todas las stats por cada conjunto distinto del que tengas al menos 1 pieza.',
    rarity: 'legendary',
    triggerType: 'passive',
    effect: (_ctx) => { /* Sprint 5: +5% all stats per distinct partial set */ },
  },
  {
    id: 'dragon_echo',
    name: 'Eco del Dragon',
    description: 'Cada critico genera un eco que golpea a todos los enemigos por 50% del dano.',
    rarity: 'legendary',
    triggerType: 'on_crit',
    effect: (_ctx) => { /* Sprint 5: AoE hit all enemies at 50% damage */ },
  },
];

// ─── Lookup ──────────────────────────────────────────────────────────────────

const ALL_EFFECTS: ReadonlyMap<string, UniqueEffect> = new Map([
  ...EPIC_EFFECTS.map((e) => [e.id, e] as const),
  ...LEGENDARY_EFFECTS.map((e) => [e.id, e] as const),
]);

/**
 * Busca un efecto unico por su ID.
 * Devuelve undefined si el ID no existe en el pool.
 */
export function getUniqueEffect(id: string): UniqueEffect | undefined {
  return ALL_EFFECTS.get(id);
}
