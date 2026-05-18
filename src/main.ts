// Imports internos
import { Engine } from '@/core/Engine';
import { InputManager } from '@/core/InputManager';
import { CameraController } from '@/core/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { PlayerStats } from '@/game/player/PlayerStats';
import { HUD } from '@/ui/HUD';
import { LevelUpModal } from '@/ui/LevelUpModal';
import { ClassSelectionModal } from '@/ui/ClassSelectionModal';
import { applyScale, mountScaleSelector } from '@/ui/UIScale';
import { eventBus } from '@/core/EventBus';
import { logger } from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts — punto de entrada del juego.
//
// Orden de inicialización:
//   1. Engine           → crea la Scene y el render loop
//   2. InputManager     → registra listeners de teclado
//   3. PlayerController → crea personaje y suelo
//   4. CameraController → crea la cámara
//   5. Conectar cámara  → inyectar en PlayerController
//   6. UIScale          → aplica --ui-scale antes de ningún UI
//   7. ClassSelectionModal → el jugador elige clase (await)
//   8. Si Errante → LevelUpModal "Forja tu Errante"
//   9. PlayerStats      → creado con la clase elegida
//  10. HUD + LevelUpModal → overlay HTML
// ============================================================

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontró #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

// ─── Motor 3D ────────────────────────────────────────────────────────────────

const engine = new Engine(canvas);
const scene = engine.scene;

const inputManager = new InputManager();
const playerController = new PlayerController(scene, inputManager);
const cameraController = new CameraController(scene, canvas, playerController.mesh);

playerController.setCamera(cameraController.camera);

// ─── Inicialización async ────────────────────────────────────────────────────
// Se usa IIFE async para poder await la selección de clase antes de
// crear PlayerStats, HUD y LevelUpModal.

(async () => {

  // ── Escala de UI ──────────────────────────────────────────────────────────
  applyScale();
  mountScaleSelector();

  // ── Selección de clase ────────────────────────────────────────────────────
  let chosenClass = await ClassSelectionModal.show();

  // ── Crear sistemas de juego ───────────────────────────────────────────────
  // playerStats se declara con let para que el botón "Cambiar Clase"
  // pueda reasignarla y los callbacks del LevelUpModal sigan apuntando
  // a la instancia activa (cierres por referencia).
  let playerStats = new PlayerStats(chosenClass);

  // HUD — snapshot inicial para pintar inmediatamente; luego escucha EventBus
  new HUD(playerStats.getSnapshot());

  // LevelUpModal — callbacks por referencia: siempre llaman al playerStats activo
  new LevelUpModal(
    (stat) => playerStats.spendStatPoint(stat),
    (upgrade) => playerStats.applyUpgrade(upgrade),
  );

  // ── Errante: abrir "Forja tu Errante" inmediatamente ─────────────────────
  if (chosenClass === 'errante') {
    eventBus.emit('ui:show-level-up-modal', { snapshot: playerStats.getSnapshot() });
  }

  // ─── Botones de debug (solo en development) ────────────────────────────────

  if (import.meta.env.DEV) {

    // Botón +100 XP
    const xpBtn = document.createElement('button');
    xpBtn.id = 'debug-xp-btn';
    xpBtn.textContent = '+100 XP';
    xpBtn.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:9999;' +
      'background:#3e2a60;color:#f4e2a6;border:1px solid #d4a04a;' +
      'padding:6px 14px;font-family:monospace;cursor:pointer;border-radius:4px;' +
      'transform:scale(var(--ui-scale,1));transform-origin:bottom right;';
    xpBtn.addEventListener('click', () => playerStats.addXp(100));
    document.body.appendChild(xpBtn);

    // Botón Cambiar Clase
    const classBtn = document.createElement('button');
    classBtn.id = 'debug-change-class-btn';
    classBtn.textContent = '↺ Clase';
    classBtn.style.cssText =
      'position:fixed;bottom:16px;right:108px;z-index:9999;' +
      'background:#3e2a60;color:#f4e2a6;border:1px solid #d4a04a;' +
      'padding:6px 14px;font-family:monospace;cursor:pointer;border-radius:4px;' +
      'transform:scale(var(--ui-scale,1));transform-origin:bottom right;';
    classBtn.addEventListener('click', async () => {
      chosenClass = await ClassSelectionModal.show();
      playerStats = new PlayerStats(chosenClass);
      if (chosenClass === 'errante') {
        eventBus.emit('ui:show-level-up-modal', { snapshot: playerStats.getSnapshot() });
      }
    });
    document.body.appendChild(classBtn);
  }

  logger.info('main: todos los sistemas inicializados. ¡A jugar!');

})();
