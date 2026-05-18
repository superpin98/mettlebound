// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// InputManager — abstrae la captura de teclado.
//
// Responsabilidad única: saber qué teclas están pulsadas ahora
// mismo. No sabe nada del personaje ni de la cámara.
//
// Usa e.code (no e.key) para ser independiente del layout de
// teclado: KeyW es KeyW en QWERTY, AZERTY y Dvorak por igual.
// ============================================================

export class InputManager {
  private readonly _keysDown = new Set<string>();

  // Guardamos referencias a los listeners para poder eliminarlos en dispose()
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keysDown.add(e.code);
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keysDown.delete(e.code);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    logger.debug('InputManager: escuchando teclado');
  }

  /**
   * Devuelve true si la tecla indicada está pulsada en este frame.
   * Usa el valor de e.code: 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', etc.
   */
  isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  /**
   * Limpia los event listeners. Llamar al destruir la escena.
   */
  dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._keysDown.clear();
    logger.debug('InputManager: disposed');
  }
}
