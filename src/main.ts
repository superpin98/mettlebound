// Imports internos
import { Engine } from '@/core/Engine';
import { InputManager } from '@/core/InputManager';
import { CameraController } from '@/core/CameraController';
import { PlayerController } from '@/game/player/PlayerController';
import { logger } from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts — punto de entrada del juego.
//
// Responsabilidad única: localizar el canvas y arrancar los
// sistemas del motor en el orden correcto.
//
// Orden de inicialización:
//   1. Engine      → crea la Scene y el render loop
//   2. InputManager → registra listeners de teclado
//   3. PlayerController → crea personaje y suelo, necesita input
//   4. CameraController → crea la cámara, necesita el mesh del personaje
//   5. Conectar cámara → inyectar en PlayerController para el movimiento relativo
// ============================================================

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontró #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

const engine = new Engine(canvas);
const scene = engine.scene;

const inputManager = new InputManager();
const playerController = new PlayerController(scene, inputManager);
const cameraController = new CameraController(scene, canvas, playerController.mesh);

// Inyectar la cámara en el PlayerController después de que ambos existan.
// Necesario porque PlayerController necesita el mesh para crear CameraController,
// y CameraController necesita existir para tener una cámara que inyectar.
playerController.setCamera(cameraController.camera);

logger.info('main: todos los sistemas inicializados. ¡A jugar!');
