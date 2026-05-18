// Imports internos
import { Engine } from '@/core/Engine';
import { logger } from '@/core/Logger';

// Estilos globales
import './style.css';

// ============================================================
// main.ts — punto de entrada del juego.
// Responsabilidad única: localizar el canvas e iniciar el motor.
// ============================================================

const canvas = document.getElementById('renderCanvas');

if (!(canvas instanceof HTMLCanvasElement)) {
  logger.error('main: no se encontró #renderCanvas en el DOM');
  throw new Error('Canvas no encontrado. Revisa index.html.');
}

new Engine(canvas);
