/**
 * PlayerStats -- gestiona el estado completo del jugador durante la partida.
 *
 * Es la unica clase con estado mutable del sistema de stats.
 * El resto de modulos (StatCalculator, XPSystem, LevelUp) son funciones puras
 * que PlayerStats orquesta.
 *
 * Comunicacion con la UI: nunca llama a nada de ui/ directamente.
 * Emite eventos al EventBus y la UI los escucha.
 *
 * Stats finales = base_clase + puntos_nivel + affixes_items + bonus_sets
 */

import { eventBus } from '@/core/EventBus';
import { getClassById } from '@/config/classes.config';
import { calcDerivedStats } from '@/game/stats/StatCalculator';
import { xpForLevel, xpFromEnemy, xpToNextLevel } from '@/game/progression/XPSystem';
import { applyStatPoint, applyUpgrade } from '@/game/progression/LevelUp';
import {
  calcTotalItemDeltas,
  ZERO_ITEM_DELTAS,
  type ItemStatDeltas,
} from '@/game/stats/ItemStatModifiers';
import type {
  ClassId,
  CoreStats,
  DerivedStats,
  PlayerSnapshot,
  UpgradeDefinition,
} from '@/types/game.types';
import type { EquippedItems } from '@/types/items.types';

export class PlayerStats {

  private classId: ClassId;
  private level: number;
  private totalXp: number;
  private coreStats: CoreStats;
  private derivedStats: DerivedStats;
  private currentHp: number;
  private currentMp: number;

  private bonusHpFlat: number = 0;
  private bonusMpFlat: number = 0;
  private bonusCritFlat: number = 0;
  private bonusEvasionFlat: number = 0;
  private bonusDamagePct: number = 0;
  private bonusSpeedFlat: number = 0;

  private itemDeltas: ItemStatDeltas = { ...ZERO_ITEM_DELTAS };

  private pendingStatPoints: number;
  private appliedUpgrades: string[] = [];

  // Flag para evitar emitir player:death más de una vez por sesión
  private _isDead = false;

  private readonly _onEquipChange: (payload: { equipped: EquippedItems }) => void;

  constructor(classId: ClassId) {
    const classDef = getClassById(classId);

    this.classId = classId;
    this.level = 1;
    this.totalXp = 0;
    this.coreStats = { ...classDef.baseStats };
    this.pendingStatPoints = classDef.freePoints;

    this.derivedStats = calcDerivedStats(this.getEffectiveCore(), this.level);
    // Caso A: creacion inicial -> HP y MP al 100%
    this.currentHp = this.getMaxHp();
    this.currentMp = this.getMaxMp();

    this._onEquipChange = ({ equipped }: { equipped: EquippedItems }): void => {
      const oldMaxHp = this.getMaxHp();
      const oldMaxMp = this.getMaxMp();
      this.itemDeltas = calcTotalItemDeltas(equipped);
      this.derivedStats = calcDerivedStats(this.getEffectiveCore(), this.level);
      // Caso B: recalculo en partida -> escalar proporcionalmente
      this.currentHp = this._scaleCurrentHp(this.currentHp, oldMaxHp, this.getMaxHp());
      this.currentMp = this._scaleCurrentMp(this.currentMp, oldMaxMp, this.getMaxMp());
      this.emitStatsChanged();
    };
    eventBus.on('inventory:item-equipped',   this._onEquipChange);
    eventBus.on('inventory:item-unequipped', this._onEquipChange);

    this.emitStatsChanged();
  }

  private getEffectiveCore(): CoreStats {
    return {
      STR: this.coreStats.STR + this.itemDeltas.STR,
      DEX: this.coreStats.DEX + this.itemDeltas.DEX,
      INT: this.coreStats.INT + this.itemDeltas.INT,
      LCK: this.coreStats.LCK + this.itemDeltas.LCK,
    };
  }

  getMaxHp(): number {
    return this.derivedStats.maxHp + this.bonusHpFlat + this.itemDeltas.maxHpFlat;
  }

  getMaxMp(): number {
    return this.derivedStats.maxMp + this.bonusMpFlat + this.itemDeltas.maxMpFlat;
  }

  getCritChance(): number {
    return this.derivedStats.critChance + this.bonusCritFlat + this.itemDeltas.critChanceFlat;
  }

  getEvasion(): number {
    return this.derivedStats.evasion + this.bonusEvasionFlat + this.itemDeltas.evasionFlat;
  }

  getTurnSpeed(): number {
    return this.derivedStats.turnSpeed + this.bonusSpeedFlat + this.itemDeltas.turnSpeedFlat;
  }

  getDamageBonusPct(): number {
    const itemDmg = this.itemDeltas.physicalDamagePct
      + this.itemDeltas.rangedDamagePct
      + this.itemDeltas.magicalDamagePct;
    return this.bonusDamagePct + itemDmg;
  }

  addXp(amount: number): void {
    this.totalXp += amount;
    const snapshot = this.getSnapshot();
    eventBus.emit('player:xp-gained', { amount, snapshot });

    let levelsGained = 0;
    while (this.totalXp >= xpForLevel(this.level + 1)) {
      const oldMaxHp = this.getMaxHp();
      const oldMaxMp = this.getMaxMp();
      this.level++;
      this.pendingStatPoints += 3;
      levelsGained++;
      this.derivedStats = calcDerivedStats(this.getEffectiveCore(), this.level);
      // Caso B: level-up -> escalar proporcionalmente (no curacion gratis)
      this.currentHp = this._scaleCurrentHp(this.currentHp, oldMaxHp, this.getMaxHp());
      this.currentMp = this._scaleCurrentMp(this.currentMp, oldMaxMp, this.getMaxMp());
    }

    if (levelsGained > 0) {
      const newSnapshot = this.getSnapshot();
      eventBus.emit('player:level-up', { newLevel: this.level, snapshot: newSnapshot });
      eventBus.emit('ui:show-level-up-modal', { snapshot: newSnapshot });
    }

    this.emitStatsChanged();
  }

  gainXpFromKill(enemyLevel: number): void {
    const xp = xpFromEnemy(enemyLevel, this.level);
    this.addXp(xp);
  }

  spendStatPoint(stat: keyof CoreStats): void {
    const oldMaxHp = this.getMaxHp();
    const oldMaxMp = this.getMaxMp();
    const { newStats, newPending } = applyStatPoint(
      this.coreStats,
      stat,
      this.pendingStatPoints,
    );
    this.coreStats = newStats;
    this.pendingStatPoints = newPending;
    this.derivedStats = calcDerivedStats(this.getEffectiveCore(), this.level);
    // Caso B: gasto de punto de stat -> escalar proporcionalmente
    this.currentHp = this._scaleCurrentHp(this.currentHp, oldMaxHp, this.getMaxHp());
    this.currentMp = this._scaleCurrentMp(this.currentMp, oldMaxMp, this.getMaxMp());
    this.emitStatsChanged();
  }

  applyUpgrade(upgrade: UpgradeDefinition): void {
    if (this.appliedUpgrades.includes(upgrade.id)) {
      throw new Error('applyUpgrade: la mejora ya esta aplicada: ' + upgrade.id);
    }

    const result = applyUpgrade(upgrade.effect, this.coreStats);

    this.coreStats         = result.newCoreStats;
    this.bonusHpFlat      += result.hpBonusFlat;
    this.bonusMpFlat      += result.mpBonusFlat;
    this.bonusCritFlat    += result.critBonusFlat;
    this.bonusEvasionFlat += result.evasionBonusFlat;
    this.bonusDamagePct   += result.damageBonusPct;
    this.bonusSpeedFlat   += result.speedBonusFlat;

    this.derivedStats = calcDerivedStats(this.getEffectiveCore(), this.level);
    this.appliedUpgrades.push(upgrade.id);
    this.emitStatsChanged();
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emitStatsChanged();
    // Detección de muerte: se emite una sola vez (flag _isDead evita re-emisión).
    // Se detecta aquí porque es el único punto por el que baja el HP,
    // tanto en exploración como en combate.
    if (this.currentHp === 0 && !this._isDead) {
      this._isDead = true;
      eventBus.emit('player:death', null);
    }
  }

  heal(amount: number): void {
    this.currentHp = Math.min(this.getMaxHp(), this.currentHp + amount);
    this.emitStatsChanged();
  }

  spendMp(amount: number): boolean {
    if (this.currentMp < amount) return false;
    this.currentMp -= amount;
    this.emitStatsChanged();
    return true;
  }

  restoreMp(amount: number): void {
    this.currentMp = Math.min(this.getMaxMp(), this.currentMp + amount);
    this.emitStatsChanged();
  }

  getSnapshot(): PlayerSnapshot {
    const effectiveCore = this.getEffectiveCore();
    return {
      classId: this.classId,
      level: this.level,
      xp: this.totalXp,
      xpToNext: xpToNextLevel(this.level),
      coreStats: { ...effectiveCore },
      derivedStats: {
        maxHp:      this.getMaxHp(),
        maxMp:      this.getMaxMp(),
        critChance: this.getCritChance(),
        evasion:    this.getEvasion(),
        turnSpeed:  this.getTurnSpeed(),
        critDamage:          this.itemDeltas.critDamagePct,
        physicalDamagePct:   this.itemDeltas.physicalDamagePct + this.bonusDamagePct,
        rangedDamagePct:     this.itemDeltas.rangedDamagePct,
        magicalDamagePct:    this.itemDeltas.magicalDamagePct,
        flatPhysicalDamage:  this.itemDeltas.flatPhysicalDamage,
        flatRangedDamage:    this.itemDeltas.flatRangedDamage,
        flatMagicalDamage:   this.itemDeltas.flatMagicalDamage,
        armor:               this.itemDeltas.armor,
        magicResist:         this.itemDeltas.magicResist,
        damageReductionPct:  this.itemDeltas.damageReductionPct,
        physicalReductionPct: this.itemDeltas.physicalReductionPct,
        lifestealPct:        this.itemDeltas.lifestealPct,
        manastealPct:        this.itemDeltas.manastealPct,
        bleedDamage:         this.itemDeltas.bleedDamage,
        poisonDamage:        this.itemDeltas.poisonDamage,
        stunChancePct:       this.itemDeltas.stunChancePct,
        statusResistancePct: this.itemDeltas.statusResistancePct,
      },
      currentHp: this.currentHp,
      currentMp: this.currentMp,
      pendingStatPoints: this.pendingStatPoints,
      appliedUpgrades: [...this.appliedUpgrades],
    };
  }

  /**
   * Escala currentHp proporcionalmente cuando maxHp cambia en mitad de partida.
   * Mantiene el ratio hp/maxHp anterior. Resultado redondeado y clampado a [0, newMax].
   * Si oldMax es 0 (caso degenerado), devuelve newMax para evitar division por cero.
   */
  private _scaleCurrentHp(current: number, oldMax: number, newMax: number): number {
    if (oldMax === 0) return newMax;
    return Math.min(newMax, Math.max(0, Math.round((current / oldMax) * newMax)));
  }

  /**
   * Escala currentMp proporcionalmente cuando maxMp cambia en mitad de partida.
   * Misma logica que _scaleCurrentHp.
   */
  private _scaleCurrentMp(current: number, oldMax: number, newMax: number): number {
    if (oldMax === 0) return newMax;
    return Math.min(newMax, Math.max(0, Math.round((current / oldMax) * newMax)));
  }

  private emitStatsChanged(): void {
    eventBus.emit('player:stats-changed', this.getSnapshot());
  }

  dispose(): void {
    eventBus.off('inventory:item-equipped',   this._onEquipChange);
    eventBus.off('inventory:item-unequipped', this._onEquipChange);
  }
}
