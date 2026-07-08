/**
 * CombatTransition -- secuencia cinemática exploración → combate.
 *
 * Flujo enter():
 *   a. Zoom de la cámara de exploración (radius 8 → 4, 500 ms)
 *   b. Overlay CSS: blur creciente + oscurecido (500 ms)
 *   c. Fundido a negro total (400 ms)
 *   d. Mientras la pantalla está a negro:
 *       - Callback onBlackScreen() → ocultar exploración (meshes + player + Rusty)
 *       - CombatGrid.show()        → construir/mostrar el tablero táctico
 *       - CombatCamera.activate()  → cambiar cámara activa a vista isométrica
 *   e. Fade-out del overlay negro (400 ms) → tablero visible
 *
 * Flujo exit():  (reservado para Sprint futuro — no implementado)
 *
 * Uso:
 *   const ct = new CombatTransition(scene, canvas, explorationCamera, onBlackScreen);
 *   await ct.enter();
 */

import { Scene, Animation, ArcRotateCamera } from '@babylonjs/core';

import { CombatGrid }   from '@/game/world/CombatGrid';
import { CombatCamera } from '@/game/combat/CombatCamera';
import { eventBus }     from '@/core/EventBus';
import { logger }       from '@/core/Logger';

// ── Timings (ms) ─────────────────────────────────────────────────────────────

const T_ZOOM_MS   = 500;  // zoom de la cámara de exploración
const T_BLUR_MS   = 500;  // CSS blur + oscurecido
const T_FADE_MS   = 400;  // fundido a negro total
const T_REVEAL_MS = 400;  // fade-out del negro (revelar tablero)

// ── Cámara ────────────────────────────────────────────────────────────────────

const CAMERA_FPS         = 60;
const ZOOM_RADIUS_TARGET = 4;   // cinematic zoom de la cámara de exploración

// ── Z-index ───────────────────────────────────────────────────────────────────

const OVERLAY_Z = 9000;

// ── Clase ─────────────────────────────────────────────────────────────────────

export class CombatTransition {

  private readonly _canvas:            HTMLCanvasElement;
  private readonly _explorationCamera: ArcRotateCamera;
  private readonly _combatGrid:        CombatGrid;
  private readonly _combatCamera:      CombatCamera;
  private readonly _onBlackScreen:     () => void;

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    explorationCamera: ArcRotateCamera,
    onBlackScreen: () => void,
  ) {
    this._canvas            = canvas;
    this._explorationCamera = explorationCamera;
    this._onBlackScreen     = onBlackScreen;
    this._combatGrid        = new CombatGrid(scene);
    this._combatCamera      = new CombatCamera(scene);
  }

  // ── Entrada ───────────────────────────────────────────────────────────────

  /** Arranca la secuencia cinemática de entrada al combate. */
  async enter(): Promise<void> {

    // a. Zoom cinematic de la cámara de exploración (simultáneo con blur)
    this._animateRadius(ZOOM_RADIUS_TARGET, T_ZOOM_MS);

    // b. Overlay: parte de transparente, se oscurece con blur
    const overlay = this._buildOverlay();
    document.body.appendChild(overlay);

    // Forzar reflow para que la transición CSS arranque desde 0
    overlay.getBoundingClientRect();
    await this._sleep(16);

    overlay.style.backdropFilter = 'blur(14px)';
    overlay.style.background     = 'rgba(0, 0, 0, 0.78)';

    // c. Fundido a negro total
    await this._sleep(T_BLUR_MS);
    overlay.style.background     = 'rgba(0, 0, 0, 1)';
    overlay.style.backdropFilter = 'blur(0px)';

    // d. Pantalla en negro — intercambiar escena de forma invisible al usuario
    await this._sleep(T_FADE_MS);

    // Ocultar toda la escena de exploración
    this._onBlackScreen();

    // Construir/mostrar el tablero táctico
    this._combatGrid.show();

    // Desconectar controles de la cámara de exploración y activar la isométrica
    this._explorationCamera.detachControl();
    this._combatCamera.activate(this._canvas);

    // e. Revelar la escena de combate con fade-out suave del overlay negro
    overlay.style.transition = `opacity ${T_REVEAL_MS}ms ease`;
    overlay.style.opacity    = '0';

    await this._sleep(T_REVEAL_MS + 50); // +50 ms de margen para que el CSS acabe

    overlay.remove();

    logger.info('CombatTransition: tablero táctico visible');
  }

  // ── Salida ────────────────────────────────────────────────────────────────

  /**
   * Vuelta a exploración.
   * No implementado todavía — el combate es irreversible hasta que se desarrolle
   * el flujo completo de victoria/derrota en un sprint posterior.
   */
  async exit(): Promise<void> {
    // TODO Sprint futuro:
    //   1. Fade a negro
    //   2. combatCamera.deactivate()
    //   3. Reactivar exploración (meshes + player + Rusty)
    //   4. Restaurar scene.activeCamera + explorationCamera.attachControl()
    //   5. Ocultar combatGrid
    //   6. Restaurar radius de la cámara de exploración
    //   7. Fade back in
    //   8. eventBus.emit('combat:end', null)
    logger.warn('CombatTransition.exit(): no implementado todavía');
    eventBus.emit('combat:end', null);
  }

  // ── Construcción DOM ──────────────────────────────────────────────────────

  private _buildOverlay(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'combat-overlay';
    el.style.cssText = [
      'position: fixed',
      'inset: 0',
      `z-index: ${OVERLAY_Z}`,
      'background: rgba(0,0,0,0)',
      'backdrop-filter: blur(0px)',
      `transition: backdrop-filter ${T_BLUR_MS}ms ease, background ${T_BLUR_MS}ms ease`,
      'pointer-events: all',
      'opacity: 1',
    ].join('; ');
    return el;
  }

  // ── Cámara de exploración ─────────────────────────────────────────────────

  private _animateRadius(target: number, durationMs: number): void {
    const frames = Math.round((durationMs / 1000) * CAMERA_FPS);
    Animation.CreateAndStartAnimation(
      'combatCamZoom',
      this._explorationCamera,
      'radius',
      CAMERA_FPS,
      frames,
      this._explorationCamera.radius,
      target,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }

  // Utilidades

  private _sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => { setTimeout(resolve, ms); });
  }
}
