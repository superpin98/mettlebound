/**
 * CombatTransition -- secuencia cinematica exploracion -> combate.
 *
 * Flujo enter():
 *   a. Zoom de la camara de exploracion (radius 8 -> 4, 500 ms)
 *   b. Overlay CSS: blur creciente + oscurecido (500 ms)
 *   c. Fundido a negro total (400 ms)
 *   d. Mientras la pantalla esta a negro:
 *       - Callback onBlackScreen()       -> ocultar exploracion (meshes + player + Rusty)
 *       - CombatGrid.show()              -> construir/mostrar el tablero tactico
 *       - Callback onPlaceCombatants()   -> crear fichas de combate y registrar ocupacion
 *       - CombatCamera.activate()        -> cambiar camara activa a vista isometrica
 *   e. Fade-out del overlay negro (400 ms) -> tablero visible con fichas colocadas
 *
 * Flujo exit():  (reservado para Sprint futuro -- no implementado)
 *
 * Uso:
 *   const ct = new CombatTransition(scene, canvas, explorationCamera,
 *                                    onBlackScreen, onPlaceCombatants);
 *   await ct.enter();
 */

import { Scene, Animation, ArcRotateCamera } from '@babylonjs/core';

import { CombatGrid }   from '@/game/world/CombatGrid';
import { CombatCamera } from '@/game/combat/CombatCamera';
import { eventBus }     from '@/core/EventBus';
import { logger }       from '@/core/Logger';

// -- Timings (ms) -------------------------------------------------------------

const T_ZOOM_MS   = 500;  // zoom de la camara de exploracion
const T_BLUR_MS   = 500;  // CSS blur + oscurecido
const T_FADE_MS   = 400;  // fundido a negro total
const T_REVEAL_MS = 400;  // fade-out del negro (revelar tablero)

// -- Camara -------------------------------------------------------------------

const CAMERA_FPS         = 60;
const ZOOM_RADIUS_TARGET = 4;   // cinematic zoom de la camara de exploracion

// -- Z-index ------------------------------------------------------------------

const OVERLAY_Z = 9000;

// -- Clase --------------------------------------------------------------------

export class CombatTransition {

  private readonly _scene:                 Scene;
  private readonly _canvas:               HTMLCanvasElement;
  private readonly _explorationCamera:    ArcRotateCamera;
  private readonly _combatGrid:           CombatGrid;
  private readonly _combatCamera:         CombatCamera;
  private readonly _onBlackScreen:        () => void;
  private readonly _onPlaceCombatants:    (grid: CombatGrid) => Promise<void>;
  private readonly _onRestoreExploration: (() => void) | null;
  /** Radio original de la camara de exploracion, guardado al inicio de enter(). */
  private _originalCameraRadius: number | null = null;

  constructor(
    scene:                  Scene,
    canvas:                 HTMLCanvasElement,
    explorationCamera:      ArcRotateCamera,
    onBlackScreen:          () => void,
    onPlaceCombatants:      (grid: CombatGrid) => Promise<void>,
    onRestoreExploration?:  () => void,
  ) {
    this._scene                 = scene;
    this._canvas                = canvas;
    this._explorationCamera     = explorationCamera;
    this._onBlackScreen         = onBlackScreen;
    this._onPlaceCombatants     = onPlaceCombatants;
    this._onRestoreExploration  = onRestoreExploration ?? null;
    this._combatGrid            = new CombatGrid(scene);
    this._combatCamera          = new CombatCamera(scene);
  }

  // -- Accesores ----------------------------------------------------------------

  /** Referencia a la cámara de combate — usada por main.ts para cinemáticas. */
  get combatCamera(): CombatCamera { return this._combatCamera; }

  // -- Entrada ------------------------------------------------------------------

  /** Arranca la secuencia cinematica de entrada al combate. */
  async enter(): Promise<void> {

    // Guardar radio original de la camara de exploracion para restaurarlo en exit()
    this._originalCameraRadius = this._explorationCamera.radius;

    // a. Zoom cinematic de la camara de exploracion (simultaneo con blur)
    this._animateRadius(ZOOM_RADIUS_TARGET, T_ZOOM_MS);

    // b. Overlay: parte de transparente, se oscurece con blur
    const overlay = this._buildOverlay();
    document.body.appendChild(overlay);

    // Forzar reflow para que la transicion CSS arranque desde 0
    overlay.getBoundingClientRect();
    await this._sleep(16);

    overlay.style.backdropFilter = 'blur(14px)';
    overlay.style.background     = 'rgba(0, 0, 0, 0.78)';

    // c. Fundido a negro total
    await this._sleep(T_BLUR_MS);
    overlay.style.background     = 'rgba(0, 0, 0, 1)';
    overlay.style.backdropFilter = 'blur(0px)';

    // d. Pantalla en negro -- intercambiar escena de forma invisible al usuario
    await this._sleep(T_FADE_MS);

    // Ocultar toda la escena de exploracion
    this._onBlackScreen();

    // Construir/mostrar el tablero tactico
    this._combatGrid.show();

    // Colocar las fichas de combate mientras la pantalla sigue a negro.
    // Los GLBs ya estan cacheados por AssetManager (cargados en la exploracion),
    // por lo que la instanciacion es practica mente sincrona.
    await this._onPlaceCombatants(this._combatGrid);

    // Desconectar controles de la camara de exploracion y activar la isometrica
    this._explorationCamera.detachControl();
    this._combatCamera.activate(this._canvas);

    // e. Revelar la escena de combate con fade-out suave del overlay negro
    overlay.style.transition = `opacity ${T_REVEAL_MS}ms ease`;
    overlay.style.opacity    = '0';

    await this._sleep(T_REVEAL_MS + 50); // +50 ms de margen para que el CSS acabe

    overlay.remove();

    logger.info('CombatTransition: tablero tactico visible con fichas colocadas');
  }

  // -- Salida -------------------------------------------------------------------

  /**
   * Vuelta a exploracion desde el combate.
   *
   * Flujo simetrico a enter():
   *   a. Fade a negro (T_FADE_MS)
   *   b. Mientras la pantalla esta negra:
   *       - combatCamera.deactivate()
   *       - Restaurar escena de exploracion: activeCamera + attachControl + radius
   *       - Llamar onRestoreExploration() -> mostrar meshes + player + Rusty
   *       - combatGrid.hide()
   *   c. Fade back in (T_REVEAL_MS)
   *   d. eventBus.emit('combat:end', null)
   */
  async exit(): Promise<void> {
    // a. Fade a negro
    const overlay = this._buildOverlay();
    // Iniciar con fondo semitransparente y transicionar a negro total
    document.body.appendChild(overlay);
    overlay.getBoundingClientRect(); // forzar reflow
    await this._sleep(16);
    overlay.style.background = 'rgba(0, 0, 0, 1)';
    await this._sleep(T_FADE_MS);

    // b. Pantalla a negro: intercambiar escena
    this._combatCamera.deactivate();

    // Restaurar la camara de exploracion
    this._scene.activeCamera = this._explorationCamera;
    this._explorationCamera.attachControl(this._canvas, true);
    if (this._originalCameraRadius !== null) {
      this._explorationCamera.radius = this._originalCameraRadius;
    }

    // Restaurar meshes y entidades de exploracion; limpiar entidades de combate
    this._onRestoreExploration?.();

    // Ocultar el tablero tactico
    this._combatGrid.hide();

    // c. Fade back in
    overlay.style.transition = `opacity ${T_REVEAL_MS}ms ease`;
    overlay.style.opacity    = '0';
    await this._sleep(T_REVEAL_MS + 50);
    overlay.remove();

    // d. Notificar fin de combate
    eventBus.emit('combat:end', null);
    logger.info('CombatTransition.exit(): transicion de salida completada');
  }

  // -- Construccion DOM ---------------------------------------------------------

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

  // -- Camara de exploracion ----------------------------------------------------

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
