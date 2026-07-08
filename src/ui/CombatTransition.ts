/**
 * CombatTransition -- secuencia cinemática exploración → combate (stub).
 *
 * Flujo enter():
 *   a. Zoom de cámara (radius 8 → 4, 500 ms) — Babylon Animation
 *   b. Overlay con backdrop-filter blur creciente + oscurecido (500 ms)
 *   c. Fundido a negro total (400 ms)
 *   d. Stub de combate visible sobre el negro (Cinzel Decorative, paleta Grimspire)
 *
 * Flujo exit():
 *   Fade-out del stub → Fade-out overlay → Restaurar radius cámara → combat:end
 *
 * Uso:
 *   const ct = new CombatTransition(scene, camera);
 *   await ct.enter(() => ct.exit());
 */

import { Scene, Animation, ArcRotateCamera } from '@babylonjs/core';
import { eventBus } from '@/core/EventBus';
import { logger } from '@/core/Logger';

// ── Timings (ms) ─────────────────────────────────────────────────────────────

const T_ZOOM_MS    = 500;  // duración zoom de cámara
const T_BLUR_MS    = 500;  // duración CSS blur + oscurecido
const T_FADE_MS    = 400;  // duración fundido a negro
const T_STUB_MS    = 300;  // fade-in/out del stub de combate

// ── Cámara ────────────────────────────────────────────────────────────────────

const CAMERA_FPS          = 60;
const ZOOM_RADIUS_TARGET  = 4;   // radius durante el combate (default es 8)

// ── Z-index ───────────────────────────────────────────────────────────────────
// HUD = 8000, GameOver = 8500 → combate por encima de todo

const OVERLAY_Z = 9000;

// ── Clase ─────────────────────────────────────────────────────────────────────

export class CombatTransition {

  private readonly _camera:         ArcRotateCamera;
  private readonly _originalRadius: number;

  private _overlay: HTMLDivElement | null = null;
  private _stub:    HTMLDivElement | null = null;

  constructor(_scene: Scene, camera: ArcRotateCamera) {
    this._camera         = camera;
    this._originalRadius = camera.radius;
  }

  // ── Entrada ───────────────────────────────────────────────────────────────

  /**
   * Arranca la secuencia cinemática.
   * @param onReturn  Callback invocado cuando el usuario pulsa "Volver".
   */
  async enter(): Promise<void> {
    // a. Zoom cámara (simultáneo con el blur)
    this._animateRadius(ZOOM_RADIUS_TARGET, T_ZOOM_MS);

    // b. Overlay: parte de transparente, va oscureciéndose con blur
    const overlay = this._buildOverlay();
    this._overlay = overlay;
    document.body.appendChild(overlay);

    // Forzar reflow para que la transición CSS arranque desde 0
    overlay.getBoundingClientRect();
    await this._sleep(16); // un frame de margen

    overlay.style.backdropFilter = 'blur(14px)';
    overlay.style.background     = 'rgba(0, 0, 0, 0.78)';

    // c. Fundido a negro total
    await this._sleep(T_BLUR_MS);
    overlay.style.background     = 'rgba(0, 0, 0, 1)';
    overlay.style.backdropFilter = 'blur(0px)';   // quitar blur cuando negro total

    // d. Stub de combate (aparece sobre el negro)
    await this._sleep(T_FADE_MS);
    const stub = this._buildStub();
    this._stub  = stub;
    overlay.appendChild(stub);

    // Fade-in del stub: necesita micro-tick para que la transición CSS aplique
    await this._sleep(16);
    stub.style.opacity = '1';

    logger.info('CombatTransition: stub de combate visible');
  }

  // ── Salida ────────────────────────────────────────────────────────────────

  /** Revierte la transición y devuelve el juego a exploración. */
  async exit(): Promise<void> {
    // Fade-out del stub
    if (this._stub !== null) {
      this._stub.style.opacity = '0';
    }
    await this._sleep(T_STUB_MS);

    // Fade-out del overlay completo
    if (this._overlay !== null) {
      this._overlay.style.transition = 'opacity 400ms ease';
      this._overlay.style.opacity    = '0';
    }

    // Restaurar radius de cámara (simultáneo con el fade-out)
    this._animateRadius(this._originalRadius, T_ZOOM_MS);

    await this._sleep(T_FADE_MS + 50); // esperar a que el overlay haya desaparecido

    // Limpiar DOM
    this._overlay?.remove();
    this._overlay = null;
    this._stub    = null;

    // Descongelar player y Rusty
    eventBus.emit('combat:end', null);
    logger.info('CombatTransition: vuelta a exploración');
  }

  // ── Construcción DOM ──────────────────────────────────────────────────────

  private _buildOverlay(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'combat-overlay';
    // Las propiedades de transición están en style.css (.combat-overlay)
    // Aquí los valores iniciales (desde transparente)
    el.style.cssText = [
      'position: fixed',
      'inset: 0',
      `z-index: ${OVERLAY_Z}`,
      'background: rgba(0,0,0,0)',
      'backdrop-filter: blur(0px)',
      `transition: backdrop-filter ${T_BLUR_MS}ms ease, background ${T_BLUR_MS}ms ease`,
      'pointer-events: all',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'opacity: 1',
    ].join('; ');
    return el;
  }

  private _buildStub(): HTMLDivElement {
    const el = document.createElement('div');
    el.className     = 'combat-stub';
    el.style.cssText = 'opacity: 0; transition: opacity 300ms ease;';
    el.innerHTML = `
      <div class="combat-stub__ornament">⚔</div>
      <h1 class="combat-stub__title">COMBATE</h1>
      <div class="combat-stub__divider"></div>
      <p class="combat-stub__subtitle">
        [Escena de combate por turnos — en construcción]
      </p>
    `;
    return el;
  }

  // ── Cámara ────────────────────────────────────────────────────────────────

  private _animateRadius(target: number, durationMs: number): void {
    const frames = Math.round((durationMs / 1000) * CAMERA_FPS);
    Animation.CreateAndStartAnimation(
      'combatCamZoom',
      this._camera,
      'radius',
      CAMERA_FPS,
      frames,
      this._camera.radius,
      target,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private _sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => { setTimeout(resolve, ms); });
  }
}
