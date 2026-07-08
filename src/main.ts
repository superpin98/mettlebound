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
  PreviewScene.build(scene);

  // -- Rusty: NPC consciente neutral (carga el Skeleton_Minion.glb) ----------
  const rusty = await RustyController.create(scene, assetManager);

  // -- Fisica del player (suelo ya existe) ------------------------------------
  playerController.initPhysics();

  // -- Cargar modelo 3D del personaje ----------------------------------------
  await playerController.loadModel(chosenClass);

  // Situar al jugador en el centro del grid
  playerController.teleportTo({ x: 0, y: 0, z: 0 });

  logger.info('main: PreviewScene lista.');

  // -- CombatTransition: cinemática exploración→combate ------------------
  const combatTransition = new CombatTransition(scene, cameraController.camera);

  // Detección de impacto contra Rusty: se comprueba en cada swing del jugador.
  // player:attack se emite al INICIO del swing (PlayerController._tryAttack).
  // Si la distancia XZ es menor que el umbral → impacto → transición a combate.
  const HIT_RANGE_XZ = 2.2; // metros — ajustable
  let   _combatActive = false;

  eventBus.on('player:attack', () => {
    if (_combatActive) { return; } // ya en combate, ignorar
    const pp = playerController.mesh.position;
    const rp = rusty.position;
    const dx = pp.x - rp.x;
    const dz = pp.z - rp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > HIT_RANGE_XZ) { return; } // demasiado lejos

    // Impacto confirmado — karma negativo (atacar a NPC neutral consciente)
    runState.addKarma(-1);
    logger.info('main: impacto en Rusty — karma', { karma: runState.karma });

    // Freeze todo y arrancar cinemática
    _combatActive = true;
    eventBus.emit('combat:start', null);
    void combatTransition.enter(() => {
      // Callback 'Volver': revertir todo
      void combatTransition.exit().then(() => {
        _combatActive = false; // listo para detectar impacto de nuevo
      });
    });
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

    devPanel.appendChild(devRow);
    document.body.appendChild(devPanel);

    // -- window.__mb: helpers de debug en DevTools ----------------------------
    (window as unknown as Record<string, unknown>)['__mb'] = {
      scene,
      playerController,
      playerStats: () => playerStats,
      weapons: playerController.weaponDevHandle(),
      rusty,
      run: runState,
    };

    // Suprimir advertencia de variable no usada
    void actionBar;
  }

  logger.info('main: todos los sistemas inicializados.');

})();
