// Imports externos (Babylon.js)
import { Animation } from '@babylonjs/core';
import type { PointLight, Animatable, Scene } from '@babylonjs/core';

// ============================================================
// LightingTransition.ts -- transiciones suaves de iluminacion
//
// Anima la intensidad de las PointLight entre salas al hacer
// transiciones. Usa Babylon Animation.CreateAndStartAnimation
// para integrarse con el render loop de la escena.
//
// API funcional (sin estado): fadeOut y fadeIn son funciones
// puras que reciben luces y devuelven los Animatables creados.
// Dungeon los guarda para poder cancelarlos si hay interrupcion.
//
// Las funciones son no-op seguras si reciben arrays vacios
// (las salas no tienen luces reales hasta A2-b3).
// ============================================================

/** Duracion por defecto de la transicion en ms. */
export const TRANSITION_DURATION_MS = 500;

/**
 * Fotogramas de animacion asumidos.
 * Babylon trabaja en fotogramas; la duracion real en segundos
 * es (ANIM_FRAMES / ANIM_FPS) = 30/60 = 0.5 s por defecto.
 */
const ANIM_FPS = 60;

// ─── Helpers privados ─────────────────────────────────────────

/**
 * Calcula los fotogramas totales a partir de la duracion en ms.
 * Minimo 1 fotograma para evitar animaciones de duracion cero.
 */
function msToFrames(durationMs: number): number {
  return Math.max(1, Math.round((durationMs / 1000) * ANIM_FPS));
}

// ─── fadeOut ──────────────────────────────────────────────────

/**
 * Atenua todas las luces de una sala a intensity = 0.
 *
 * @param lights     Luces a apagar (puede ser array vacio -- no-op).
 * @param scene      Escena Babylon activa.
 * @param durationMs Duracion de la transicion en ms (defecto 500).
 * @returns          Array de Animatables creados (para cancelacion).
 *
 * TODO A2-b4: verificar que los Animatables se comportan
 * correctamente en el contexto de HavokPlugin activo.
 */
export function fadeOut(
  lights: PointLight[],
  scene: Scene,
  durationMs: number = TRANSITION_DURATION_MS,
): Animatable[] {
  if (lights.length === 0) { return []; }

  const totalFrames = msToFrames(durationMs);
  const animatables: Animatable[] = [];

  for (const light of lights) {
    const fromIntensity = light.intensity;
    if (fromIntensity === 0) { continue; } // ya apagada, no animar

    const anim = Animation.CreateAndStartAnimation(
      `lightFadeOut_${light.name}`,
      light,
      'intensity',
      ANIM_FPS,
      totalFrames,
      fromIntensity,
      0,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      undefined,
      scene,
    );

    if (anim !== null) { animatables.push(anim); }
  }

  return animatables;
}

// ─── fadeIn ───────────────────────────────────────────────────

/**
 * Enciende las luces de una sala desde intensity = 0 hasta
 * sus intensidades objetivo.
 *
 * @param targets    Array de { light, targetIntensity }.
 *                   Las luces que ya esten en targetIntensity se omiten.
 * @param scene      Escena Babylon activa.
 * @param durationMs Duracion de la transicion en ms (defecto 500).
 * @returns          Array de Animatables creados (para cancelacion).
 *
 * TODO A2-b4: verificar sincronizacion con fadeOut de la sala saliente
 * para que el crossfade sea percibido como continuo por el jugador.
 */
export function fadeIn(
  targets: { light: PointLight; targetIntensity: number }[],
  scene: Scene,
  durationMs: number = TRANSITION_DURATION_MS,
): Animatable[] {
  if (targets.length === 0) { return []; }

  const totalFrames = msToFrames(durationMs);
  const animatables: Animatable[] = [];

  for (const { light, targetIntensity } of targets) {
    if (light.intensity === targetIntensity) { continue; } // ya en destino

    const anim = Animation.CreateAndStartAnimation(
      `lightFadeIn_${light.name}`,
      light,
      'intensity',
      ANIM_FPS,
      totalFrames,
      light.intensity,
      targetIntensity,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      undefined,
      scene,
    );

    if (anim !== null) { animatables.push(anim); }
  }

  return animatables;
}

// ─── cancelTransitions ────────────────────────────────────────

/**
 * Cancela y limpia un array de Animatables en curso.
 * Llamar cuando una nueva transicion interrumpe una anterior.
 *
 * @param animatables Array devuelto por fadeOut() o fadeIn().
 */
export function cancelTransitions(animatables: Animatable[]): void {
  for (const anim of animatables) {
    anim.stop();
  }
  animatables.length = 0;
}
