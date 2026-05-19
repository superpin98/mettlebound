// Imports internos
import { Engine } from '@/core/Engine';
import { InputManager } from '@/core/InputManager';
import { CameraController } from '@/core/CameraController';
import { AssetManager } from '@/core/AssetManager';
import { PlayerController } from '@/game/player/PlayerController';
import { PlayerStats } from '@/game/player/PlayerStats';
import { Inventory } from '@/game/items/Inventory';
import { generateItemOfRarity } from '@/game/items/ItemGenerator';
import { TestRoom } from '@/game/world/TestRoom';
import { HUD } from '@/ui/HUD';
import { LevelUpModal } from '@/ui/LevelUpModal';
import { ClassSelectionModal } from '@/ui/ClassSelectionModal';
import { InventoryUI } from '@/ui/InventoryUI';
import { CharacterSheet } from '@/ui/CharacterSheet';
import { PanelManager } from '@/ui/PanelManager';
import { ActionBar } from '@/ui/ActionBar';
import { applyScale, mountScaleSelector } from '@/ui/UIScale';
import { eventBus } from '@/core/EventBus';
import { logger } from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts -- punto de entrada del juego.
//
// Orden de inicializacion:
//   1. Engine              -> crea la Scene y el render loop
//   2. InputManager        -> registra listeners de teclado
//   3. PlayerController    -> crea personaje y suelo
//   4. CameraController    -> crea la camara
//   5. Conectar camara     -> inyectar en PlayerController
//   6. UIScale             -> aplica --ui-scale antes de ningun UI
//   7. ClassSelectionModal -> el jugador elige clase (await)
//   8. Si Errante          -> LevelUpModal "Forja tu Errante"
//   9. PlayerStats         -> creado con la clase elegida
//  10. Inventory           -> creado con la clase elegida
//  11. HUD + LevelUpModal + InventoryUI + CharacterSheet -> overlays HTML
//  12. PanelManager        -> coordina un solo panel abierto a la vez
//  13. ActionBar           -> barra inferior con botones y atajos de teclado
//  14. TestRoom.build      -> sala de prueba (una sola vez, nunca en cambio de clase)
// ============================================================

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontro #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

// --- Motor 3D ----------------------------------------------------------------

const engine = new Engine(canvas);
const scene = engine.scene;

const inputManager = new InputManager();
const assetManager = new AssetManager(scene);
const playerController = new PlayerController(scene, inputManager, assetManager);
const cameraController = new CameraController(scene, canvas, playerController.mesh);

playerController.setCamera(cameraController.camera);

// --- Inicializacion async ----------------------------------------------------

(async () => {

  // -- Escala de UI -----------------------------------------------------------
  applyScale();
  mountScaleSelector();

  // -- Seleccion de clase -----------------------------------------------------
  let chosenClass = await ClassSelectionModal.show();

  // -- Cargar modelo 3D del personaje ----------------------------------------
  await playerController.loadModel(chosenClass);

  // -- Sala de prueba (se construye una sola vez, aqui) ----------------------
  await TestRoom.build(scene, assetManager);

  // -- Crear sistemas de juego ------------------------------------------------
  let playerStats = new PlayerStats(chosenClass);
  let inventory   = new Inventory(chosenClass);

  // HUD -- snapshot inicial; luego escucha EventBus
  new HUD(playerStats.getSnapshot());

  // LevelUpModal -- callbacks por referencia
  new LevelUpModal(
    (stat) => playerStats.spendStatPoint(stat),
    (upgrade) => playerStats.applyUpgrade(upgrade),
  );

  // Paneles UI
  let inventoryUI = new InventoryUI(inventory);
  let charSheet   = new CharacterSheet(playerStats, inventory);

  // PanelManager -- un solo panel abierto a la vez
  const panelManager = new PanelManager();
  panelManager.register('inventory', inventoryUI);
  panelManager.register('character', charSheet);

  // ActionBar -- barra inferior con botones MOCHILA / PERSONAJE + atajos I/C/Escape
  const actionBar = new ActionBar(panelManager);

  // -- Errante: abrir "Forja tu Errante" inmediatamente ----------------------
  if (chosenClass === 'errante') {
    eventBus.emit('ui:show-level-up-modal', { snapshot: playerStats.getSnapshot() });
  }

  // --- Botones de debug (solo en development) --------------------------------

  if (import.meta.env.DEV) {

    // Contenedor DEV agrupado
    const devPanel = document.createElement('div');
    devPanel.id = 'dev-panel';

    const devLabel = document.createElement('div');
    devLabel.classList.add('dev-label');
    devLabel.textContent = 'DEV';
    devPanel.appendChild(devLabel);

    const devRow = document.createElement('div');
    devRow.classList.add('dev-row');

    // Boton +100 XP
    const xpBtn = document.createElement('button');
    xpBtn.classList.add('dev-btn');
    xpBtn.id = 'debug-xp-btn';
    xpBtn.textContent = '+100 XP';
    xpBtn.addEventListener('click', () => playerStats.addXp(100));
    devRow.appendChild(xpBtn);

    // Selector de rareza para generar items
    const RARITIES = [
      { id: 'common',    label: '+ Comun',       color: '#aaa' },
      { id: 'uncommon',  label: '+ Poco Comun',  color: '#6a9a4a' },
      { id: 'rare',      label: '+ Raro',        color: '#5a8acb' },
      { id: 'epic',      label: '+ Epico',       color: '#9b59b6' },
      { id: 'legendary', label: '+ Legendario',  color: '#e2a23b' },
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
        if (!added) {
          console.warn('DEV: mochila llena, no se pudo anadir el item');
        }
      });
      rarityMenu.appendChild(opt);
    }

    rarityToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      rarityMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      rarityMenu.classList.add('hidden');
    });

    rarityWrapper.appendChild(rarityToggle);
    rarityWrapper.appendChild(rarityMenu);
    devRow.appendChild(rarityWrapper);

    // Boton Cambiar Clase
    const classBtn = document.createElement('button');
    classBtn.classList.add('dev-btn');
    classBtn.id = 'debug-change-class-btn';
    classBtn.textContent = 'Clase';
    classBtn.addEventListener('click', async () => {
      panelManager.closeAll();
      chosenClass = await ClassSelectionModal.show();
      // Recargar modelo 3D (AssetManager cachea, asi que el 2.o cambio es instantaneo)
      // TestRoom NO se reconstruye aqui -- la sala ya esta creada
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

    // Suprimir advertencia de variable no usada
    void actionBar;
  }

  logger.info('main: todos los sistemas inicializados.');

})();
