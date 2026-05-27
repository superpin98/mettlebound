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
import { TestRoom }            from '@/game/world/TestRoom';
import {
  buildUniversalFloor,
  buildMettleboundDungeon,
} from '@/game/world/MettleboundDungeon';
import { HUD }                 from '@/ui/HUD';
import { LevelUpModal }        from '@/ui/LevelUpModal';
import { ClassSelectionModal } from '@/ui/ClassSelectionModal';
import { InventoryUI }         from '@/ui/InventoryUI';
import { CharacterSheet }      from '@/ui/CharacterSheet';
import { PanelManager }        from '@/ui/PanelManager';
import { ActionBar }           from '@/ui/ActionBar';
import { applyScale, mountScaleSelector } from '@/ui/UIScale';
import { eventBus }            from '@/core/EventBus';
import { logger }              from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts -- punto de entrada del juego.
//
// Modos de arranque (leido de localStorage 'mb_mode'):
//   'dungeon'  (default) -- carga MettleboundDungeon (layout estrella)
//   'testroom'           -- carga TestRoom (sala de desarrollo)
//
// Orden de inicializacion comun:
//   1. Engine              -> crea la Scene y el render loop
//   2. InputManager        -> registra listeners de teclado
//   3. PlayerController    -> crea personaje y capsula (sin fisica aun)
//   4. CameraController    -> crea la camara
//   5. Conectar camara     -> inyectar en PlayerController
//   6. Havok               -> motor de fisicas
//   7. UIScale             -> aplica --ui-scale antes de ningun UI
//   8. ClassSelectionModal -> el jugador elige clase (await)
//   9. PlayerStats / Inventory / HUD / Paneles
//
// Orden especifico de dungeon:
//  10d. buildUniversalFloor  -> suelo fisico ANTES de initPhysics
//  11d. initPhysics          -> capsula Havok (suelo ya existe)
//  12d. buildMettleboundDungeon -> 4 salas + 3 corredores + triggers
//  13d. dungeon.transitionToRoom('hub_01') -> fade in de luces del hub
//  14d. teleportTo(hub.getSpawnPoint())    -> situar al jugador en hub
//
// Orden especifico de testroom:
//  10t. TestRoom.build       -> suelo + paredes + pilares con fisica
//  11t. initPhysics          -> capsula Havok (suelo ya existe)
// ============================================================

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontro #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

// --- Motor 3D ----------------------------------------------------------------

const engine = new Engine(canvas);
const scene  = engine.scene;

const inputManager    = new InputManager();
const assetManager    = new AssetManager(scene);
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

  // -- Cargar modelo 3D del personaje ----------------------------------------
  await playerController.loadModel(chosenClass);

  // -- Modo de arranque -------------------------------------------------------
  // Leer 'mb_mode' de localStorage. Default: 'dungeon'.
  // Para cambiar: usar botones DEV o escribir en DevTools:
  //   localStorage.setItem('mb_mode', 'testroom'); location.reload();
  const mbMode = localStorage.getItem('mb_mode') ?? 'dungeon';
  logger.info(`main: modo de arranque = '${mbMode}'`);

  // Variables que puede necesitar el bloque DEV segun el modo activo
  let dungeonResult: Awaited<ReturnType<typeof buildMettleboundDungeon>> | null = null;
  let testRoomResult: Awaited<ReturnType<typeof TestRoom.build>> | null = null;

  if (mbMode === 'dungeon') {

    // ---- Modo Dungeon -------------------------------------------------------
    // CRITICO: buildUniversalFloor ANTES de initPhysics para que la capsula
    // del jugador no caiga al vacio al ser creada por Havok.
    buildUniversalFloor(scene);

    // Activar fisica del player (suelo universal ya existe)
    playerController.initPhysics();

    // Construir dungeon completo
    const playerBody = playerController.physicsBody;
    dungeonResult = await buildMettleboundDungeon(scene, assetManager, playerBody);
    const { dungeon, hub } = dungeonResult;

    // Escuchar eventos de sala en consola (validacion sin HUD)
    dungeon.events.on('room:enter', (payload) => {
      console.log('[Dungeon] entered:', payload.roomId);
    });
    dungeon.events.on('room:exit', (payload) => {
      console.log('[Dungeon] exited:', payload.roomId);
    });

    // Transicion inicial al hub (fade in de luces; no hay fadeOut porque
    // currentRoomId=null al arrancar, el guard en transitionToRoom lo gestiona)
    await dungeon.transitionToRoom('hub_01');

    // Situar al jugador en el punto de spawn del hub
    // getSpawnPoint() devuelve {x:0, y:0, z:-4} (zona spawn del hub)
    playerController.teleportTo(hub.getSpawnPoint());

    logger.info('main: dungeon listo. Jugador posicionado en hub_01.');

  } else {

    // ---- Modo TestRoom ------------------------------------------------------
    // IMPORTANTE: build() crea los colliders de suelo y paredes.
    // initPhysics() debe llamarse DESPUES para que la capsula del player
    // no caiga al vacio antes de que exista el suelo.
    const built = await TestRoom.build(scene, assetManager);
    testRoomResult = built;

    // Activar fisica del player (colliders de sala ya existen)
    playerController.initPhysics();

    logger.info('main: TestRoom lista.');
  }

  // -- Sistemas de juego (comunes a ambos modos) ------------------------------
  let playerStats = new PlayerStats(chosenClass);
  let inventory   = new Inventory(chosenClass);

  new HUD(playerStats.getSnapshot());

  new LevelUpModal(
    (stat)    => playerStats.spendStatPoint(stat),
    (upgrade) => playerStats.applyUpgrade(upgrade),
  );

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

    // -- Botones de modo (siempre visibles en DEV) ----------------------------

    // Boton Cargar Dungeon
    const dungeonBtn = document.createElement('button');
    dungeonBtn.classList.add('dev-btn');
    dungeonBtn.id = 'dev-mode-dungeon-btn';
    dungeonBtn.textContent = 'Dungeon';
    if (mbMode === 'dungeon') { dungeonBtn.style.outline = '2px solid #6af'; }
    dungeonBtn.addEventListener('click', () => {
      localStorage.setItem('mb_mode', 'dungeon');
      window.location.reload();
    });
    devRow.appendChild(dungeonBtn);

    // Boton Cargar TestRoom
    const testRoomBtn = document.createElement('button');
    testRoomBtn.classList.add('dev-btn');
    testRoomBtn.id = 'dev-mode-testroom-btn';
    testRoomBtn.textContent = 'TestRoom';
    if (mbMode === 'testroom') { testRoomBtn.style.outline = '2px solid #6af'; }
    testRoomBtn.addEventListener('click', () => {
      localStorage.setItem('mb_mode', 'testroom');
      window.location.reload();
    });
    devRow.appendChild(testRoomBtn);

    // -- Botones especificos de TestRoom --------------------------------------

    if (mbMode === 'testroom' && testRoomResult !== null) {
      const { dummy } = testRoomResult;

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

      const dummyDmgBtn = document.createElement('button');
      dummyDmgBtn.classList.add('dev-btn');
      dummyDmgBtn.id = 'debug-dummy-damage-btn';
      dummyDmgBtn.dataset['cheat'] = 'damage-dummy-25';
      dummyDmgBtn.textContent = 'Dummy -25';
      dummyDmgBtn.addEventListener('click', () => {
        if (!dummy.isDead) dummy.takeDamage(25);
      });
      devRow.appendChild(dummyDmgBtn);

      const dummyRespawnBtn = document.createElement('button');
      dummyRespawnBtn.classList.add('dev-btn');
      dummyRespawnBtn.id = 'debug-dummy-respawn-btn';
      dummyRespawnBtn.dataset['cheat'] = 'respawn-dummy';
      dummyRespawnBtn.textContent = 'Respawn';
      dummyRespawnBtn.addEventListener('click', () => dummy.respawn());
      devRow.appendChild(dummyRespawnBtn);
    }

    // -- +Item (disponible en ambos modos) ------------------------------------

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

    // -- Cambiar Clase (disponible en ambos modos) ----------------------------

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
    // Disponibles desde F12 > Console:
    //   __mb.mode            -- 'dungeon' | 'testroom'
    //   __mb.dungeon         -- instancia Dungeon (solo en modo dungeon)
    //   __mb.grid            -- instancia Grid (solo en modo testroom)
    //   __mb.toggleGrid()    -- alterna visibilidad del grid tactico (testroom)

    const mbDebug: Record<string, unknown> = {
      mode: mbMode,
    };

    if (mbMode === 'dungeon' && dungeonResult !== null) {
      mbDebug['dungeon'] = dungeonResult.dungeon;
      mbDebug['hub']     = dungeonResult.hub;
    }

    if (mbMode === 'testroom' && testRoomResult !== null) {
      mbDebug['grid']        = testRoomResult.grid;
      mbDebug['gridRenderer'] = TestRoom.gridRenderer;
      mbDebug['toggleGrid']  = () => TestRoom.gridRenderer?.toggle();
    }

    (window as unknown as Record<string, unknown>)['__mb'] = mbDebug;

    // Suprimir advertencia de variable no usada
    void actionBar;
  }

  logger.info('main: todos los sistemas inicializados.');

})();
