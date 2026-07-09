/**
 * CombatAttackSystem -- flujo de ataque en combate táctico (estilo BG3).
 *
 * Flujo de ataque básico:
 *   1. "Atacar" → enterSelectMode() — cursor a crosshair, movimiento bloqueado.
 *   2. Clic sobre enemigo:
 *       A) En rango melee (≤1 celda) → ataca directamente.
 *       B) Fuera de rango pero alcanzable con PM → auto-approach: camina hasta
 *          una casilla adyacente y ataca al llegar.
 *       C) Inalcanzable → toast "¡No llegas!" — sin gasto.
 *   3. Escape / clic derecho → cancela la selección sin gastar nada.
 *   4. Durante el swing: movimiento bloqueado hasta que termina la animación.
 *   5. Si durante la aproximación (auto-approach) el jugador redirige el walker:
 *      el ataque se cancela pero el movimiento continúa normalmente.
 *
 * Diseño genérico:
 *   Objetivos registrados vía registerTarget(id, entity, hpBar).
 *   Hoy es Rusty; mañana son N enemigos u objetos destruibles.
 *   La detección de mesh usa parent-chain al pivot de la entidad registrada.
 *
 * Bloqueo de movimiento (Tweak 1):
 *   El ataque básico bloquea el movimiento. Propiedad de la acción: futuras
 *   skills de dash/TP pueden no bloquearlo. Hoy: siempre bloquea.
 *
 * Fórmula de daño exportada:
 *   calcBasicAttackDamage(coreStats) → 5 + floor(STR / 10).
 *   Importable desde cualquier skill futura sin depender de esta clase.
 */

import { PointerEventTypes } from '@babylonjs/core';
import type { Scene, Observer, PointerInfo, AbstractMesh, Node } from '@babylonjs/core';

import type { CombatEntity }         from '@/game/combat/CombatEntity';
import type { CombatHpBar }          from '@/game/combat/CombatHpBar';
import type { CombatActionBudget }   from '@/game/combat/CombatActionBudget';
import type { CombatActionBar }      from '@/ui/CombatActionBar';
import type { CombatMovementSystem } from '@/game/combat/CombatMovementSystem';
import type { CombatGrid }           from '@/game/world/CombatGrid';
import type { GridCell }             from '@/game/combat/CombatPathfinder';
import type { CoreStats }            from '@/types/game.types';
import { CombatPathfinder }          from '@/game/combat/CombatPathfinder';
import { logger }                    from '@/core/Logger';

// ── Fórmula de daño (exportada para reutilizar en futuros ataques) ──────────────

/**
 * Calcula el daño de un ataque básico cuerpo a cuerpo.
 * Fórmula: 5 + floor(STR / 10).
 *   STR  0 → 5 de daño
 *   STR 10 → 6 de daño
 *   STR 20 → 7 de daño
 * Centralizada aquí para cambiarla sin buscar en múltiples archivos.
 */
export function calcBasicAttackDamage(attackerStats: CoreStats): number {
  return 5 + Math.floor(attackerStats.STR / 10);
}

// ── Tipos internos ──────────────────────────────────────────────────────────────

/** Entrada del registro de objetivos atacables. */
interface AttackTarget {
  readonly entity: CombatEntity;
  readonly hpBar:  CombatHpBar;
}

/** Offsets de las 8 casillas adyacentes (excluye [0,0]). */
const ADJ_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

// ── Clase ────────────────────────────────────────────────────────────────────────

export class CombatAttackSystem {

  private readonly _scene:        Scene;
  private readonly _playerEntity: CombatEntity;
  private readonly _budget:       CombatActionBudget;
  private readonly _actionBar:    CombatActionBar;
  private readonly _movSys:       CombatMovementSystem;
  private readonly _grid:         CombatGrid;

  /** Registro de objetivos atacables. Clave: id semántico (p. ej. 'rusty'). */
  private readonly _targets: Map<string, AttackTarget> = new Map();

  private _isSelectingTarget  = false;
  private _isPlayerTurnActive = false;

  /** Toast DOM para mensajes de error (fuera de rango, no llega, etc.). */
  private readonly _toast: HTMLElement;

  private _pointerObserver: Observer<PointerInfo> | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * @param scene        Escena Babylon activa.
   * @param playerEntity Ficha del jugador (cellX/Z, coreStats, playAttackAnim).
   * @param budget       Presupuesto de acciones del turno.
   * @param actionBar    Barra de acciones (feedback visual de selección).
   * @param movSys       Sistema de movimiento (blockInputClicks, walkWithCallback).
   * @param grid         Grid de combate (isInBounds, occupantAt).
   */
  constructor(
    scene:        Scene,
    playerEntity: CombatEntity,
    budget:       CombatActionBudget,
    actionBar:    CombatActionBar,
    movSys:       CombatMovementSystem,
    grid:         CombatGrid,
  ) {
    this._scene        = scene;
    this._playerEntity = playerEntity;
    this._budget       = budget;
    this._actionBar    = actionBar;
    this._movSys       = movSys;
    this._grid         = grid;

    this._toast = this._buildToast();
  }

  // ── API pública ────────────────────────────────────────────────────────────────

  /**
   * Registra una entidad como objetivo atacable.
   * Para N enemigos: llamar una vez por cada uno.
   */
  registerTarget(id: string, entity: CombatEntity, hpBar: CombatHpBar): void {
    this._targets.set(id, { entity, hpBar });
    logger.debug('CombatAttackSystem: objetivo registrado', { id });
  }

  /**
   * Activa/desactiva el input de ataque según el turno.
   * Llamado por CombatTurnSystem al cambiar de turno.
   */
  setPlayerTurnActive(active: boolean): void {
    this._isPlayerTurnActive = active;
    if (!active && this._isSelectingTarget) {
      this._cancelSelectMode();
    }
  }

  /**
   * Entra en modo selección de objetivo.
   * Llamado desde CombatActionBar cuando el jugador pulsa "Atacar".
   * Bloquea clicks de movimiento hasta que se seleccione o cancele (Tweak 1).
   */
  enterSelectMode(): void {
    if (!this._isPlayerTurnActive)              { return; }
    if (this._isSelectingTarget)                { return; }
    if (!this._budget.isAvailable('principal')) { return; }

    this._isSelectingTarget = true;
    this._actionBar.enterSelectMode();
    document.body.classList.add('mb-selecting-target');

    // Tweak 1: bloquear clicks de movimiento mientras se selecciona objetivo
    this._movSys.blockInputClicks(true);

    logger.debug('CombatAttackSystem: modo selección activado');

    this._pointerObserver = this._scene.onPointerObservable.add(
      (info: PointerInfo) => { this._handlePointer(info); },
    );

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this._cancelSelectMode(); }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  /** Libera todos los recursos. Llamar al salir del combate. */
  dispose(): void {
    this._cancelSelectMode();
    this._toast.remove();
    this._targets.clear();
    logger.debug('CombatAttackSystem: dispuesto');
  }

  // ── Internos: modo selección ───────────────────────────────────────────────────

  private _cancelSelectMode(): void {
    if (!this._isSelectingTarget) { return; }
    this._isSelectingTarget = false;
    this._actionBar.exitSelectMode();
    document.body.classList.remove('mb-selecting-target');

    // Tweak 1: desbloquear movimiento al salir de selección
    this._movSys.blockInputClicks(false);

    if (this._pointerObserver !== null) {
      this._scene.onPointerObservable.remove(this._pointerObserver);
      this._pointerObserver = null;
    }
    if (this._keyHandler !== null) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    logger.debug('CombatAttackSystem: modo selección cancelado');
  }

  private _handlePointer(info: PointerInfo): void {
    if (!this._isSelectingTarget) { return; }

    // Clic derecho → cancelar selección
    if (
      info.type === PointerEventTypes.POINTERUP &&
      (info.event as PointerEvent).button === 2
    ) {
      this._cancelSelectMode();
      return;
    }

    if (info.type !== PointerEventTypes.POINTERUP) { return; }
    if ((info.event as PointerEvent).button !== 0)  { return; }

    // Raycast sin filtro: cualquier mesh pickable
    const pick = this._scene.pick(
      this._scene.pointerX,
      this._scene.pointerY,
      (mesh) => mesh.isPickable && mesh.isEnabled(),
    );

    if (!pick.hit || pick.pickedMesh === null) { return; }

    const found = this._findTargetByMesh(pick.pickedMesh);
    if (found === null) { return; } // clic en suelo u otro elemento no atacable

    const { id: targetId, entry: target } = found;
    const dx = Math.abs(this._playerEntity.cellX - target.entity.cellX);
    const dz = Math.abs(this._playerEntity.cellZ - target.entity.cellZ);
    const inMeleeRange = dx <= 1 && dz <= 1 && !(dx === 0 && dz === 0);

    if (inMeleeRange) {
      this._cancelSelectMode();
      this._executeAttack(targetId, target);
    } else {
      this._tryAutoApproach(targetId, target);
    }
  }

  // ── Internos: auto-approach (Tweak 2) ─────────────────────────────────────────

  private _tryAutoApproach(targetId: string, target: AttackTarget): void {
    const tx = target.entity.cellX;
    const tz = target.entity.cellZ;
    const playerPos = { x: this._playerEntity.cellX, z: this._playerEntity.cellZ };

    let bestPath: GridCell[] | null = null;
    let bestCost = Infinity;

    for (const [odx, odz] of ADJ_OFFSETS) {
      const cx = tx + odx;
      const cz = tz + odz;

      if (!this._grid.isInBounds(cx, cz)) { continue; }

      const occ = this._grid.occupantAt(cx, cz);
      if (occ !== null && occ !== 'player') { continue; }

      // Caso borde: jugador ya está en esa casilla adyacente
      if (cx === playerPos.x && cz === playerPos.z) {
        this._cancelSelectMode();
        this._executeAttack(targetId, target);
        return;
      }

      const result = CombatPathfinder.findPath(
        playerPos,
        { x: cx, z: cz },
        this._grid,
        'player',
      );
      if (result === null) { continue; }

      // Sin truncar: el path completo debe caber en los PM restantes
      if (result.cost > this._movSys.movPointsRemaining + 0.0001) { continue; }

      if (result.cost < bestCost) {
        bestCost = result.cost;
        bestPath = result.path;
      }
    }

    if (bestPath === null || bestPath.length < 2) {
      this._showToast('¡No llegas!');
      logger.debug('CombatAttackSystem: ninguna casilla adyacente alcanzable', {
        target: { x: tx, z: tz },
        playerPm: this._movSys.movPointsRemaining,
      });
      return;
    }

    const dest = bestPath[bestPath.length - 1];
    if (dest === undefined) { return; }

    logger.info('CombatAttackSystem: auto-approach iniciado', {
      targetId, dest, cost: bestCost,
    });

    // Salir de selección para desbloquear movimiento (permite redirecciones)
    this._cancelSelectMode();

    const ok = this._movSys.walkWithCallback(
      dest.x,
      dest.z,
      () => {
        // Llegada: verificar que el turno y el budget siguen vigentes
        if (!this._isPlayerTurnActive)              { return; }
        if (!this._budget.isAvailable('principal')) { return; }
        // Verificar rango al llegar (por si el objetivo se movió en el futuro)
        const dxNow = Math.abs(this._playerEntity.cellX - target.entity.cellX);
        const dzNow = Math.abs(this._playerEntity.cellZ - target.entity.cellZ);
        if (dxNow > 1 || dzNow > 1) {
          logger.warn('CombatAttackSystem: objetivo fuera de rango al llegar', { targetId });
          return;
        }
        this._executeAttack(targetId, target);
      },
      () => {
        // Interrupción (redirección manual): ataque cancelado, walk continúa
        logger.debug('CombatAttackSystem: auto-approach interrumpido — ataque cancelado', { targetId });
      },
    );

    if (!ok) {
      logger.warn('CombatAttackSystem: walkWithCallback rechazó el auto-approach', { dest, bestCost });
    }
  }

  // ── Internos: ejecución del ataque ────────────────────────────────────────────

  /**
   * Bloquea input → animación → daño + HP bar → desbloquea.
   * Consume la acción principal ANTES de la animación para que la UI
   * deshabilite los botones sin esperar al swing.
   */
  private _executeAttack(targetId: string, target: AttackTarget): void {
    const dmg = calcBasicAttackDamage(this._playerEntity.coreStats);

    logger.info('CombatAttackSystem: ejecutando ataque', {
      targetId, dmg, playerStr: this._playerEntity.coreStats.STR,
    });

    // Tweak 1: bloquear movimiento durante el swing
    this._movSys.blockInputClicks(true);

    this._playerEntity.playAttackAnim(() => {
      target.entity.combatant.takeDamage(dmg);
      target.hpBar.update(
        target.entity.combatant.currentHp,
        target.entity.combatant.maxHp,
      );

      // Tweak 1: desbloquear movimiento al terminar el swing
      this._movSys.blockInputClicks(false);

      logger.info('CombatAttackSystem: daño aplicado', {
        targetId, dmg,
        hpLeft: target.entity.combatant.currentHp,
        maxHp:  target.entity.combatant.maxHp,
        isDead: target.entity.combatant.isDead,
      });
    });

    // Consumir acción principal inmediatamente (la UI refleja el gasto ya)
    this._budget.consume('principal');
    this._actionBar.refresh();
  }

  // ── Internos: detección de objetivo por mesh ──────────────────────────────────

  private _findTargetByMesh(mesh: AbstractMesh): { id: string; entry: AttackTarget } | null {
    for (const [id, entry] of this._targets) {
      let node: Node | null = mesh;
      while (node !== null) {
        if (node === entry.entity.pivot) { return { id, entry }; }
        node = node.parent;
      }
    }
    return null;
  }

  // ── Toast de feedback ──────────────────────────────────────────────────────────

  private _buildToast(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'mb-combat-toast';
    document.body.appendChild(el);
    return el;
  }

  private _showToast(msg: string): void {
    this._toast.textContent = msg;
    this._toast.classList.remove('mb-toast--visible');
    void this._toast.offsetWidth;
    this._toast.classList.add('mb-toast--visible');
    setTimeout(() => { this._toast.classList.remove('mb-toast--visible'); }, 2000);
  }
}
