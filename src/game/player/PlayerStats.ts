/**
 * PlayerStats — gestiona el estado completo del jugador durante la partida.
 *
 * Es la única clase con estado mutable del sistema de stats.
 * El resto de módulos (StatCalculator, XPSystem, LevelUp) son funciones puras
 * que PlayerStats orquesta.
 *
 * Comunicación con la UI: nunca llama a nada de ui/ directamente.
 * Emite eventos al EventBus y la UI los escucha.
 */

import { eventBus } from '@/core/EventBus';
import { getClassById } from '@/config/classes.config';
import { calcDerivedStats } from '@/game/stats/StatCalculator';
import { xpForLevel, xpFromEnemy, xpToNextLevel } from '@/game/progression/XPSystem';
import { applyStatPoint, applyUpgrade } from '@/game/progression/LevelUp';
import type {
  ClassId,
  CoreStats,
  DerivedStats,
  PlayerSnapshot,
  UpgradeDefinition,
} from '@/types/game.types';

export class PlayerStats {
  // ─── Estado interno ─────────────────────────────────────────────────────

  private classId: ClassId;
  private level: number;
  private totalXp: number;

  private coreStats: CoreStats;
  private derivedStats: DerivedStats;

  private currentHp: number;
  private currentMp: number;

  // Bonificaciones planas acumuladas por mejoras (no entran en la fórmula de stats)
  private bonusHpFlat: number = 0;
  private bonusMpFlat: number = 0;
  private bonusCritFlat: number = 0;
  private bonusEvasionFlat: number = 0;
  private bonusDamagePct: number = 0;
  private bonusSpeedFlat: number = 0;

  private pendingStatPoints: number;
  private appliedUpgrades: string[] = [];

  // ─── Constructor ────────────────────────────────────────────────────────

  constructor(classId: ClassId) {
    const classDef = getClassById(classId);

    this.classId = classId;
    this.level = 1;
    this.totalXp = 0;
    this.coreStats = { ...classDef.baseStats };
    this.pendingStatPoints = classDef.freePoints;

    this.derivedStats = calcDerivedStats(this.coreStats, this.level);

    // HP y MP empiezan al máximo
    this.currentHp = this.getMaxHp();
    this.currentMp = this.getMaxMp();

    this.emitStatsChanged();
  }

  // ─── Helpers de stats máximos ────────────────────────────────────────────

  getMaxHp(): number {
    return this.derivedStats.maxHp + this.bonusHpFlat;
  }

  getMaxMp(): number {
    return this.derivedStats.maxMp + this.bonusMpFlat;
  }

  getCritChance(): number {
    return this.derivedStats.critChance + this.bonusCritFlat;
  }

  getEvasion(): number {
    return this.derivedStats.evasion + this.bonusEvasionFlat;
  }

  getTurnSpeed(): number {
    return this.derivedStats.turnSpeed + this.bonusSpeedFlat;
  }

  getDamageBonusPct(): number {
    return this.bonusDamagePct;
  }

  // ─── XP y subida de nivel ────────────────────────────────────────────────

  /**
   * Añade XP al jugador (por matar un enemigo, explorar, etc.).
   * Si la XP acumulada supera el umbral, sube de nivel automáticamente.
   */
  addXp(amount: number): void {
    this.totalXp += amount;

    const snapshot = this.getSnapshot();
    eventBus.emit('player:xp-gained', { amount, snapshot });

    // Comprobar si se sube de nivel (puede haber más de uno de golpe)
    let levelsGained = 0;
    while (this.totalXp >= xpForLevel(this.level + 1)) {
      this.level++;
      this.pendingStatPoints += 3; // BALANCE.PLAYER.STAT_POINTS_PER_LEVEL se aplicaría aquí
      levelsGained++;

      // Recalcular stats con el nuevo nivel
      this.derivedStats = calcDerivedStats(this.coreStats, this.level);

      // Al subir de nivel, rellenar HP y MP a máximo
      this.currentHp = this.getMaxHp();
      this.currentMp = this.getMaxMp();
    }

    if (levelsGained > 0) {
      const newSnapshot = this.getSnapshot();
      eventBus.emit('player:level-up', { newLevel: this.level, snapshot: newSnapshot });
      eventBus.emit('ui:show-level-up-modal', { snapshot: newSnapshot });
    }

    this.emitStatsChanged();
  }

  /**
   * Añade la XP correspondiente a derrotar un enemigo del nivel indicado.
   */
  gainXpFromKill(enemyLevel: number): void {
    const xp = xpFromEnemy(enemyLevel, this.level);
    this.addXp(xp);
  }

  // ─── Asignación de puntos de stat ────────────────────────────────────────

  /**
   * Asigna un punto al stat indicado.
   * Lanza error si no hay puntos pendientes.
   */
  spendStatPoint(stat: keyof CoreStats): void {
    const { newStats, newPending } = applyStatPoint(
      this.coreStats,
      stat,
      this.pendingStatPoints,
    );
    this.coreStats = newStats;
    this.pendingStatPoints = newPending;
    this.derivedStats = calcDerivedStats(this.coreStats, this.level);
    this.emitStatsChanged();
  }

  // ─── Aplicar mejora ──────────────────────────────────────────────────────

  /**
   * Aplica una mejora seleccionada por el jugador al subir de nivel.
   */
  applyUpgrade(upgrade: UpgradeDefinition): void {
    if (this.appliedUpgrades.includes(upgrade.id)) {
      throw new Error(`applyUpgrade: la mejora '${upgrade.id}' ya está aplicada`);
    }

    const result = applyUpgrade(upgrade.effect, this.coreStats);

    this.coreStats = result.newCoreStats;
    this.bonusHpFlat += result.hpBonusFlat;
    this.bonusMpFlat += result.mpBonusFlat;
    this.bonusCritFlat += result.critBonusFlat;
    this.bonusEvasionFlat += result.evasionBonusFlat;
    this.bonusDamagePct += result.damageBonusPct;
    this.bonusSpeedFlat += result.speedBonusFlat;

    this.derivedStats = calcDerivedStats(this.coreStats, this.level);
    this.appliedUpgrades.push(upgrade.id);

    this.emitStatsChanged();
  }

  // ─── HP y MP ─────────────────────────────────────────────────────────────

  /** Recibe daño. El HP nunca baja de 0. */
  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emitStatsChanged();
  }

  /** Cura HP. El HP nunca supera el máximo. */
  heal(amount: number): void {
    this.currentHp = Math.min(this.getMaxHp(), this.currentHp + amount);
    this.emitStatsChanged();
  }

  /** Gasta MP. Devuelve false si no hay suficiente MP. */
  spendMp(amount: number): boolean {
    if (this.currentMp < amount) return false;
    this.currentMp -= amount;
    this.emitStatsChanged();
    return true;
  }

  /** Recupera MP. El MP nunca supera el máximo. */
  restoreMp(amount: number): void {
    this.currentMp = Math.min(this.getMaxMp(), this.currentMp + amount);
    this.emitStatsChanged();
  }

  // ─── Snapshot y eventos ──────────────────────────────────────────────────

  /** Devuelve una copia inmutable del estado actual. */
  getSnapshot(): PlayerSnapshot {
    return {
      classId: this.classId,
      level: this.level,
      xp: this.totalXp,
      xpToNext: xpToNextLevel(this.level),
      coreStats: { ...this.coreStats },
      derivedStats: {
        maxHp: this.getMaxHp(),
        maxMp: this.getMaxMp(),
        critChance: this.getCritChance(),
        evasion: this.getEvasion(),
        turnSpeed: this.getTurnSpeed(),
      },
      currentHp: this.currentHp,
      currentMp: this.currentMp,
      pendingStatPoints: this.pendingStatPoints,
      appliedUpgrades: [...this.appliedUpgrades],
    };
  }

  private emitStatsChanged(): void {
    eventBus.emit('player:stats-changed', this.getSnapshot());
  }
}
