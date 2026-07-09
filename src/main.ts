// Havok Physics Engine
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, Vector3 } from '@babylonjs/core';

// Imports internos
import { Engine }              from '@/core/Engine';
import { InputManager }        from '@/core/InputManager';
import { CameraController }    from '@/core/CameraController';
import { AssetManager }        from '@/core/AssetManager';
import { PlayerController }    from '@/game/player/PlayerController';
import { PlayerStats }         from '@/game/player/PlayerStats';
import { Inventory }           from '@/game/items/Inventory';
import { generateItemOfRarity } from '@/game/items/ItemGenerator';
import { PreviewScene }        from '@/game/world/PreviewScene';
import { HUD }                 from '@/ui/HUD';
import { LevelUpModal }        from '@/ui/LevelUpModal';
import { ClassSelectionModal } from '@/ui/ClassSelectionModal';
import { InventoryUI }         from '@/ui/InventoryUI';
import { CharacterSheet }      from '@/ui/CharacterSheet';
import { PanelManager }        from '@/ui/PanelManager';
import { ActionBar }           from '@/ui/ActionBar';
import { applyScale, mountScaleSelector } from '@/ui/UIScale';
import { GameOverModal }        from '@/ui/GameOverModal';
import { RustyController }      from '@/game/entities/RustyController';
import { CombatTransition }     from '@/ui/CombatTransition';
import { CombatEntity }         from '@/game/combat/CombatEntity';
import { CombatMovementSystem } from '@/game/combat/CombatMovementSystem';
import { CombatTurnSystem }     from '@/game/combat/CombatTurnSystem';
import { InitiativeSystem, hasTrait } from '@/game/combat/InitiativeSystem';
import type { InitCombatantDef } from '@/game/combat/InitiativeSystem';
import { InitiativeTracker }    from '@/ui/InitiativeTracker';
import { getClassById }          from '@/config/classes.config';
import { RunState }             from '@/game/RunState';

import { eventBus }            from '@/core/EventBus';
import { logger }              from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts -- punto de entrada del juego.
//
// Escena activa: PreviewScene (grid plano + 4 luces + Guerrero Mixamo).
// Sustituye el MettleboundDungeon placeholder (Sprint 4-EXT Fase A).
//
// Orden de inicializacion:
//   1. Engine              -> crea la Scene y el render loop
//   2. InputManager        -> registra listeners de teclado
//   3. PlayerController    -> crea personaje y capsula (sin fisica aun)
//   4. CameraController    -> crea la camara
//   5. Conectar camara     -> inyectar en PlayerController
//   6. Havok               -> motor de fisicas
//   7. UIScale             -> aplica --ui-scale antes de ningun UI
//   8. ClassSelectionModal -> el jugador elige clase (await)
//   9. PlayerStats / Inventory / HUD / Paneles
//  10. PreviewScene.build  -> suelo fisico ANTES de initPhysics
//  11. initPhysics         -> capsula Havok (suelo ya existe)
//  12. loadModel(class)    -> modelo 3D del personaje en escena
// ============================================================

// Estado de la run actual (karma en memoria — sin persistencia hasta Sprint 5)
const runState = new RunState();

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontro #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

// --- Motor 3D ----------------------------------------------------------------

const engine          = new Engine(canvas);
const scene           = engine.scene;

const inputManager     = new InputManager();
const assetManager     = new AssetManager(scene);
const playerController = new PlayerController(scene, inputManager, assetManager);
const cameraController = new CameraController(scene, canvas, playerController.mesh);

playerController.setCamera(cameraController.camera);

// --- Inicializacion async ----------------------------------------------------

(async () => {

  // -- Havok Physics Engine ---------------------------------------------------
  const havokInstance = await HavokPhysics();
  const havokPlugin   = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
  logger.info('main: Havok Physics Engine inicializado (gravedad -9.81).');

  // -- Escala de UI -----------------------------------------------------------
  applyScale();
  mountScaleSelector();

  // -- Seleccion de clase -----------------------------------------------------
  let chosenClass = await ClassSelectionModal.show();

  // -- PreviewScene: suelo fisico + luces (ANTES de initPhysics) -------------
  // Los meshes devueltos se ocultan al entrar en la escena de combate.
  const explorationMeshes = PreviewScene.build(scene);

  // -- Rusty: NPC consciente neutral (carga el Skeleton_Minion.glb) ----------
  const rusty = await RustyController.create(scene, assetManager);

  // -- Fisica del player (suelo ya existe) ------------------------------------
  playerController.initPhysics();

  // Registrar a Rusty como target golpeable por el hitbox de ataque del jugador.
  // getCenter() devuelve el centro 3D de su cuerpo (pivot + 1u en Y).
  if (rusty.physicsBody !== null) {
    playerController.registerHitTarget(rusty.physicsBody, () => rusty.bodyCenter);
  }

  // -- Cargar modelo 3D del personaje ----------------------------------------
  await playerController.loadModel(chosenClass);

  // Situar al jugador en el centro del grid
  playerController.teleportTo({ x: 0, y: 0, z: 0 });

  logger.info('main: PreviewScene lista.');

  // -- CombatTransition: cinemática exploración→combate ------------------
  // Referencia al sistema de movimiento. Hoisted para que el boton DEV pueda
  // llamar a reloadMovement() (simular inicio de turno) desde fuera del callback.
  let movSys: CombatMovementSystem | null = null;
  // Ficha de combate de Rusty — hoisted para exponerla en window.__mb (debug).
  let rustyEntity: import('@/game/combat/CombatEntity').CombatEntity | null = null;

  // Botón «Terminar turno» — en DOM desde el inicio, visible solo en combate.
  const endTurnBtn = document.createElement('button');
  endTurnBtn.id          = 'end-turn-btn';
  endTurnBtn.textContent = 'Terminar turno';
  endTurnBtn.disabled    = true;
  document.body.appendChild(endTurnBtn);

  // onBlackScreen: se llama cuando la pantalla está completamente a negro,
  // antes de revelar la escena de combate. Oculta toda la exploración.
  const combatTransition = new CombatTransition(
    scene,
    canvas,
    cameraController.camera,
    // onBlackScreen: ocultar toda la escena de exploracion
    () => {
      for (const m of explorationMeshes) { m.isVisible = false; }
      playerController.mesh.setEnabled(false);
      rusty.setEnabled(false);
    },
    // onPlaceCombatants: colocar las fichas de combate con la pantalla a negro.
    // Los GLBs ya estan en cache (cargados por PlayerController y RustyController),
    // asi que las dos instanciaciones son practicamente sincronas.
    async (grid) => {
      // -- Ficha del jugador (modelo de la clase activa) ----------------------
      const classDef  = getClassById(chosenClass);
      const modelFile = classDef.modelAssetId;
      // playerEntity fuera del if para que sea accesible al crear CombatMovementSystem.
      let playerEntity: import('@/game/combat/CombatEntity').CombatEntity | null = null;
      if (modelFile !== undefined) {
        playerEntity = await CombatEntity.create(scene, assetManager, {
          baseUrl:     '/assets/models/characters/',
          filename:    modelFile,
          isMixamo:    classDef.isMixamo    ?? false,
          modelScale:  classDef.modelScale  ?? 1,
          maxHp:       100,
          displayName: 'Jugador',
          footprintW:  1,
          footprintH:  1,
          // Stats completos del jugador — DEX determina puntos de movimiento.
          coreStats:    playerStats.getSnapshot().coreStats,
          // Heredar el stance activo de exploración (unarmed / sword_and_shield).
          weaponStance: playerController.weaponStance,
        });
        // Celda (9, 5): X = -0.5, Z = -4.5 (sur del centro, 10 celdas al sur de Rusty).
        // facingRad = 0 -> mira hacia +Z (hacia Rusty en Z = +5.5).
        playerEntity.placeAt(9, 5, grid, 0);
        grid.occupy('player', 9, 5, 1, 1);
      } else {
        logger.warn('main: clase sin modelAssetId, saltando ficha de jugador', { chosenClass });
      }

      // -- Ficha de Rusty (Skeleton_Minion.glb) --------------------------------
      rustyEntity = await CombatEntity.create(scene, assetManager, {
        baseUrl:     '/assets/models/characters/skeletons/',
        filename:    'Skeleton_Minion.glb',
        isMixamo:    false,
        modelScale:  1,
        maxHp:       45,          // HP canonico de Rusty (docs/02_ENEMIES.md)
        displayName: 'Rusty',
        footprintW:  1,
        footprintH:  1,
        // Stats canonicos de Rusty: esqueleto agil pero debil.
        // DEX 6 => 4 + round(8 * 6/80) = 4+1 = 5 puntos de movimiento.
        coreStats:   { STR: 8, DEX: 6, INT: 3, LCK: 3 },
      });
      // Celda (9, 11): X = -0.5, Z = +1.5 (ligeramente al norte del centro).
      // facingRad = Math.PI -> mira hacia -Z (hacia el jugador en Z = -1.5).
      rustyEntity.placeAt(9, 15, grid, Math.PI);
      grid.occupy('rusty', 9, 15, 1, 1);

      // Sistema de movimiento por casillas.
      // Solo se activa si la clase tiene modelo (playerEntity != null).
      if (playerEntity !== null) {
        movSys = new CombatMovementSystem(
          scene,
          grid,
          playerEntity,
          'player',
        );
        movSys.activate();

        // -- Sistema de iniciativa real (acumulación por DEX) --------
        // Sorpresa: jugador ataca primero SALVO que Rusty tenga DEX >= 1.5×
        // la del jugador O tenga el trait 'alert' (stub: siempre false).
        // TODO: sustituir rustyIsAlert por hasTrait real cuando existan los traits.
        const playerDex    = playerEntity.coreStats.DEX;
        const rustyDex     = rustyEntity?.coreStats.DEX ?? 6;
        const rustyIsAlert = hasTrait(rustyEntity, 'alert');  // stub — false
        const hasSurprise  = rustyDex < playerDex * 1.5 && !rustyIsAlert;

        const combatantDefs: InitCombatantDef[] = [
          { id: 'player', displayName: 'Jugador', icon: '🛡️', isPlayer: true,  dex: playerDex },
          { id: 'rusty',  displayName: 'Rusty',   icon: '💀', isPlayer: false, dex: rustyDex  },
        ];
        const initSys = new InitiativeSystem(
          combatantDefs,
          { surpriseAttackerId: hasSurprise ? 'player' : undefined },
        );

        const tracker = new InitiativeTracker();
        const turnSys = new CombatTurnSystem(initSys, movSys, tracker, endTurnBtn);
        endTurnBtn.classList.add('visible');
        turnSys.start();
      }
    },
  );

  // Detección de impacto real: el AttackHitbox del jugador emite player:attack-hit
  // cuando su trigger sphere toca el PhysicsBody de un objetivo durante la ventana
  // de impacto del swing (40%-70% de la animación). Sustituye la detección XZ manual.
  let _combatActive = false;

  eventBus.on('player:attack-hit', (event) => {
    if (_combatActive)                        { return; } // ya en combate
    if (event.body !== rusty.physicsBody)     { return; } // no es Rusty

    // Impacto confirmado: golpe a NPC neutral consciente → karma negativo
    runState.addKarma(-1);
    logger.info('main: impacto en Rusty — karma', { karma: runState.karma });

    // Freeze exploración y arrancar cinemática
    _combatActive = true;
    eventBus.emit('combat:start', null);
    void combatTransition.enter();
  });

  // -- Sistemas de juego ------------------------------------------------------
  let playerStats = new PlayerStats(chosenClass);
  let inventory   = new Inventory(chosenClass);

  new HUD(playerStats.getSnapshot());

  new LevelUpModal(
    (stat)    => playerStats.spendStatPoint(stat),
    (upgrade) => playerStats.applyUpgrade(upgrade),
  );

  new GameOverModal();

  let inventoryUI = new InventoryUI(inventory);
  let charSheet   = new CharacterSheet(playerStats, inventory);

  const panelManager = new PanelManager();
  panelManager.register('inventory', inventoryUI);
  panelManager.register('character', charSheet);

  const actionBar = new ActionBar(panelManager);

  if (chosenClass === 'errante') {
    eventBus.emit('ui:show-level-up-modal', { snapshot: playerStats.getSnapshot() });
  }

  // --- Botones de debug (solo en development) --------------------------------

  if (import.meta.env.DEV) {

    const devPanel = document.createElement('div');
    devPanel.id = 'dev-panel';

    const devLabel = document.createElement('div');
    devLabel.classList.add('dev-label');
    devLabel.textContent = 'DEV';
    devPanel.appendChild(devLabel);

    const devRow = document.createElement('div');
    devRow.classList.add('dev-row');

    // -- +Item ----------------------------------------------------------------

    const RARITIES = [
      { id: 'common',    label: '+ Comun',      color: '#aaa'    },
      { id: 'uncommon',  label: '+ Poco Comun', color: '#6a9a4a' },
      { id: 'rare',      label: '+ Raro',       color: '#5a8acb' },
      { id: 'epic',      label: '+ Epico',      color: '#9b59b6' },
      { id: 'legendary', label: '+ Legendario', color: '#e2a23b' },
    ] as const;

    const rarityWrapper = document.createElement('div');
    rarityWrapper.id = 'dev-rarity-wrapper';

    const rarityToggle = document.createElement('button');
    rarityToggle.classList.add('dev-btn');
    rarityToggle.id = 'dev-rarity-toggle';
    rarityToggle.textContent = '+Item ▾';

    const rarityMenu = document.createElement('div');
    rarityMenu.id = 'dev-rarity-menu';
    rarityMenu.classList.add('hidden');

    for (const r of RARITIES) {
      const opt = document.createElement('button');
      opt.classList.add('dev-rarity-opt');
      opt.textContent = r.label;
      opt.style.color = r.color;
      opt.addEventListener('click', () => {
        rarityMenu.classList.add('hidden');
        const snap = playerStats.getSnapshot();
        const item = generateItemOfRarity(r.id, snap.level);
        const added = inventory.addItem(item);
        if (!added) { console.warn('DEV: mochila llena, no se pudo anadir el item'); }
      });
      rarityMenu.appendChild(opt);
    }

    rarityToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      rarityMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => { rarityMenu.classList.add('hidden'); });

    rarityWrapper.appendChild(rarityToggle);
    rarityWrapper.appendChild(rarityMenu);
    devRow.appendChild(rarityWrapper);

    // -- XP / HP --------------------------------------------------------------

    const xpBtn = document.createElement('button');
    xpBtn.classList.add('dev-btn');
    xpBtn.id = 'debug-xp-btn';
    xpBtn.textContent = '+100 XP';
    xpBtn.addEventListener('click', () => playerStats.addXp(100));
    devRow.appendChild(xpBtn);

    const dmgBtn = document.createElement('button');
    dmgBtn.classList.add('dev-btn');
    dmgBtn.id = 'debug-damage-btn';
    dmgBtn.dataset['cheat'] = 'damage-50';
    dmgBtn.textContent = '-50 HP';
    dmgBtn.addEventListener('click', () => playerStats.takeDamage(50));
    devRow.appendChild(dmgBtn);

    // -- Cambiar Clase --------------------------------------------------------

    const classBtn = document.createElement('button');
    classBtn.classList.add('dev-btn');
    classBtn.id = 'debug-change-class-btn';
    classBtn.textContent = 'Clase';
    classBtn.addEventListener('click', async () => {
      panelManager.closeAll();
      chosenClass = await ClassSelectionModal.show();
      await playerController.loadModel(chosenClass);
      playerStats.dispose();
      charSheet.dispose();
      playerStats  = new PlayerStats(chosenClass);
      inventoryUI.dispose();
      inventory   = new Inventory(chosenClass);
      inventoryUI = new InventoryUI(inventory);
      charSheet   = new CharacterSheet(playerStats, inventory);
      panelManager.register('inventory', inventoryUI);
      panelManager.register('character', charSheet);
      if (chosenClass === 'errante') {
        eventBus.emit('ui:show-level-up-modal', { snapshot: playerStats.getSnapshot() });
      }
    });
    devRow.appendChild(classBtn);

    // -- Recargar movimiento (simular inicio de turno) -------------------------
    // TODO: se sustituye por el inicio de turno real cuando exista sistema de turnos.
    const reloadMovBtn = document.createElement('button');
    reloadMovBtn.classList.add('dev-btn');
    reloadMovBtn.textContent = 'Recargar MOV';
    reloadMovBtn.title = 'Simula inicio de turno: recarga el presupuesto de movimiento [R]';
    reloadMovBtn.addEventListener('click', () => { movSys?.reloadMovement(); });
    devRow.appendChild(reloadMovBtn);

    // Tecla R (fuera de inputs) como atajo de teclado del mismo boton
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !(document.activeElement instanceof HTMLInputElement)) {
        movSys?.reloadMovement();
      }
    });

    devPanel.appendChild(devRow);

    // -- Editor de stats (DEV) -------------------------------------------------
    // Permite editar STR/DEX/INT/LCK en caliente para testing.
    // Los cambios se propagan a todos los sistemas via player:stats-changed.
    // CombatMovementSystem escucha ese evento y actualiza movementPoints / resaltado.

    const statsLabel = document.createElement('div');
    statsLabel.classList.add('dev-label');
    statsLabel.textContent = 'STATS';
    devPanel.appendChild(statsLabel);

    const statsGrid = document.createElement('div');
    statsGrid.id = 'dev-stats-grid';

    const STAT_KEYS = ['STR', 'DEX', 'INT', 'LCK'] as const;
    type DevStat = typeof STAT_KEYS[number];

    const statInputMap  = new Map<DevStat, HTMLInputElement>();
    const statCurMap    = new Map<DevStat, HTMLSpanElement>();

    const initialSnap = playerStats.getSnapshot();

    for (const stat of STAT_KEYS) {
      const row = document.createElement('div');
      row.classList.add('dev-stats-row');

      const lbl = document.createElement('span');
      lbl.classList.add('dev-stats-lbl');
      lbl.textContent = stat;

      const cur = document.createElement('span');
      cur.classList.add('dev-stats-cur');
      cur.textContent = String(initialSnap.coreStats[stat]);
      statCurMap.set(stat, cur);

      const inp = document.createElement('input');
      inp.type  = 'number';
      inp.min   = '1';
      inp.max   = '999';
      inp.value = String(initialSnap.coreStats[stat]);
      inp.classList.add('dev-stats-input');
      statInputMap.set(stat, inp);

      const btn = document.createElement('button');
      btn.classList.add('dev-btn');
      btn.textContent = 'Set';
      btn.addEventListener('click', () => {
        const val = parseInt(inp.value, 10);
        if (!isNaN(val) && val >= 1) {
          playerStats.setCoreStat(stat, val);
        }
      });
      // Aplicar tambien con Enter dentro del input
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { btn.click(); }
      });

      row.appendChild(lbl);
      row.appendChild(cur);
      row.appendChild(inp);
      row.appendChild(btn);
      statsGrid.appendChild(row);
    }

    devPanel.appendChild(statsGrid);
    document.body.appendChild(devPanel);

    // Sincronizar spans e inputs cuando cambian los stats (nivel, item, set-coreStat, etc.)
    eventBus.on('player:stats-changed', (snap) => {
      for (const stat of STAT_KEYS) {
        const curEl = statCurMap.get(stat);
        const inpEl = statInputMap.get(stat);
        if (curEl !== undefined) {
          curEl.textContent = String(snap.coreStats[stat]);
        }
        // Solo actualizar el input si David no lo esta editando en este momento
        if (inpEl !== undefined && inpEl !== document.activeElement) {
          inpEl.value = String(snap.coreStats[stat]);
        }
      }
    });

    // -- window.__mb: helpers de debug en DevTools ----------------------------
    (window as unknown as Record<string, unknown>)['__mb'] = {
      scene,
      playerController,
      playerStats:  () => playerStats,
      weapons:      playerController.weaponDevHandle(),
      rusty,
      // rustyEntity() devuelve la ficha tactica de Rusty tras entrar en combate.
      // Uso en DevTools: window.__mb.rustyEntity()?.coreStats
      //                  window.__mb.rustyEntity()?.combatant.currentHp
      rustyEntity:  () => rustyEntity,
      run:          runState,
    };

    // Suprimir advertencia de variable no usada
    void actionBar;
  }

  logger.info('main: todos los sistemas inicializados.');

})();
