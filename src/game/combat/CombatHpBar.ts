/**
 * CombatHpBar -- barra de HP 3D como billboard, reutilizable para cualquier entidad.
 *
 * Patrón idéntico al label de RustyController:
 *   CreatePlane + billboardMode ALL + parent al pivot de la entidad.
 *   DynamicTexture: fondo oscuro + rect rojo (HP perdido) + rect verde (HP actual).
 *
 * El color de relleno cambia a naranja cuando la entidad está por debajo
 * del LOW_HP_THRESHOLD (30% de HP).
 *
 * Uso típico:
 *   const hpBar = new CombatHpBar(scene, entity.pivot);
 *   hpBar.update(entity.combatant.currentHp, entity.combatant.maxHp);
 *   // …más tarde:
 *   hpBar.dispose();
 */

import {
  MeshBuilder,
  DynamicTexture,
  StandardMaterial,
  Color3,
  TransformNode,
} from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import { logger } from '@/core/Logger';

// ── Constantes de dibujo ───────────────────────────────────────────────────────

/** Resolución interna de la textura (píxeles). */
const TEX_W = 256;
const TEX_H = 32;

const COLOR_BG   = 'rgba(10, 5, 5, 0.80)';  // fondo oscuro semitransparente
const COLOR_LOST = '#5a1a1a';                  // HP perdido — rojo oscuro
const COLOR_FULL = '#2a7a2a';                  // HP lleno/normal — verde
const COLOR_LOW  = '#a05000';                  // HP < 30% — naranja-rojo

/** Ratio de HP a partir del que la barra se muestra en COLOR_LOW. */
const LOW_HP_THRESHOLD = 0.30;

// ── Opciones ───────────────────────────────────────────────────────────────────

/**
 * Opciones de creación de CombatHpBar.
 * Todos los campos son opcionales; los valores por defecto están calibrados
 * para entidades de ~2 unidades de altura (modelos KayKit).
 */
export interface CombatHpBarOptions {
  /** Altura sobre el pivot (eje Y), en unidades de mundo. Por defecto 2.3. */
  yOffset?: number;
  /** Anchura del plano 3D. Por defecto 1.4. */
  planeWidth?: number;
  /** Altura del plano 3D. Por defecto 0.18. */
  planeHeight?: number;
}

// ── Clase ──────────────────────────────────────────────────────────────────────

export class CombatHpBar {

  private readonly _plane: Mesh;
  private readonly _tex:   DynamicTexture;

  /**
   * @param scene   Escena Babylon activa.
   * @param pivot   TransformNode padre (normalmente entity.pivot).
   * @param options Ajustes opcionales de posición/tamaño.
   */
  constructor(
    scene:   Scene,
    pivot:   TransformNode,
    options: CombatHpBarOptions = {},
  ) {
    const yOffset    = options.yOffset    ?? 2.3;
    const planeWidth  = options.planeWidth  ?? 1.4;
    const planeHeight = options.planeHeight ?? 0.18;

    // ── Plano 3D que siempre mira a la cámara ──────────────────────────────────
    this._plane = MeshBuilder.CreatePlane(
      'combatHpBar',
      { width: planeWidth, height: planeHeight },
      scene,
    );
    this._plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    this._plane.position.y    = yOffset;
    this._plane.parent        = pivot;
    this._plane.isPickable    = false; // no interferir con raycast de ataque

    // ── Textura dinámica ────────────────────────────────────────────────────────
    this._tex = new DynamicTexture(
      'combatHpBar_tex',
      { width: TEX_W, height: TEX_H },
      scene,
      false,  // no regenerar mipmaps — innecesario para UI 2D
    );
    this._tex.hasAlpha = true;

    const mat = new StandardMaterial('combatHpBar_mat', scene);
    mat.diffuseTexture             = this._tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor              = new Color3(1, 1, 1); // visible sin iluminación
    mat.backFaceCulling            = false;
    mat.disableLighting            = true;
    this._plane.material           = mat;

    // Dibujar barra al 100% en la creación
    this._draw(1.0);

    logger.debug('CombatHpBar: creada', { pivot: pivot.name, yOffset });
  }

  // ── API pública ────────────────────────────────────────────────────────────────

  /**
   * Redibuja la barra con los nuevos valores de HP.
   * Llamar después de cada takeDamage() o heal().
   *
   * @param currentHp HP actual de la entidad.
   * @param maxHp     HP máximo de la entidad.
   */
  update(currentHp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
    this._draw(ratio);
    logger.debug('CombatHpBar: actualizada', { currentHp, maxHp, ratio: ratio.toFixed(2) });
  }

  /** Libera el mesh, la textura y el material. */
  dispose(): void {
    this._tex.dispose();
    this._plane.material?.dispose();
    this._plane.dispose();
    logger.debug('CombatHpBar: dispuesta');
  }

  // ── Dibujo interno ─────────────────────────────────────────────────────────────

  private _draw(ratio: number): void {
    const ctx = this._tex.getContext() as unknown as CanvasRenderingContext2D;
    const w   = TEX_W;
    const h   = TEX_H;

    // Limpiar y dibujar fondo
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Franja de HP perdido (fondo rojo oscuro interior)
    ctx.fillStyle = COLOR_LOST;
    ctx.fillRect(2, 2, w - 4, h - 4);

    // Franja de HP actual
    const fillW = Math.round((w - 4) * ratio);
    if (fillW > 0) {
      ctx.fillStyle = ratio < LOW_HP_THRESHOLD ? COLOR_LOW : COLOR_FULL;
      ctx.fillRect(2, 2, fillW, h - 4);
    }

    // Borde sutil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    this._tex.update();
  }
}
