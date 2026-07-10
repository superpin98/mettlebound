/**
 * CombatHpBar -- barra de HP 3D pixel art, reutilizable para cualquier entidad.
 *
 * Técnica de pixel art marcado (misma que CombatNameLabel):
 *   1. DynamicTexture a resolución moderada (96×12 px).
 *      Mapeada a un plano 1.4u × 0.175u → cada texel ocupa ~2-3 px pantalla.
 *   2. samplingMode = Texture.NEAREST_SAMPLINGMODE → bordes duros, sin blur.
 *   3. Colores planos (sin gradientes): verde → naranja/rojo al bajar HP.
 *   4. Borde dibujado con fillRect (no strokeRect) para evitar antialiasing.
 *
 * Uso típico:
 *   const hpBar = new CombatHpBar(scene, entity.pivot);
 *   hpBar.update(entity.combatant.currentHp, entity.combatant.maxHp);
 *   // más tarde:
 *   hpBar.dispose();
 */

import {
  MeshBuilder,
  DynamicTexture,
  StandardMaterial,
  Texture,
  Color3,
  TransformNode,
} from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import { logger } from '@/core/Logger';

// ── Textura (baja resolución → píxeles gordos) ────────────────────────────────

/**
 * Ancho de la textura interna (×2 del original).
 * Doblar la resolución mantiene NEAREST chunky pero mejora la legibilidad del borde.
 */
const TEX_W = 96;

/** Alto de la textura interna. 12px: 2 borde + 8 contenido + 2 borde bottom. */
const TEX_H = 12;

// ── Colores planos (sin gradientes) ───────────────────────────────────────────

const COLOR_BG     = 'rgba(6, 3, 14, 0.82)';  // fondo negro-púrpura Grimspire
const COLOR_BORDER = 'rgba(0, 0, 0, 0.95)';    // borde duro 1px
const COLOR_LOST   = '#4a1010';                 // HP perdido — rojo oscuro apagado
const COLOR_FULL   = '#1a6b1a';                 // HP lleno/normal — verde oscuro
const COLOR_MID    = '#6b4000';                 // HP medio (~50%) — naranja oscuro
const COLOR_LOW    = '#8b1010';                 // HP crítico (<30%) — rojo

/** Porcentaje a partir del que la barra se vuelve naranja. */
const MID_THRESHOLD  = 0.50;
/** Porcentaje a partir del que la barra se vuelve roja. */
const LOW_THRESHOLD  = 0.25;

// ── Opciones ──────────────────────────────────────────────────────────────────

/**
 * Opciones de creación de CombatHpBar.
 * Todos los campos son opcionales; los valores por defecto están calibrados
 * para entidades de ~2 unidades de altura (modelos KayKit).
 */
export interface CombatHpBarOptions {
  /** Altura sobre el pivot (eje Y). Por defecto 1.50 (encima del nombre). */
  yOffset?: number;
  /** Anchura del plano 3D. Por defecto 1.4. */
  planeWidth?: number;
  /** Altura del plano 3D. Por defecto 0.175. */
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
    const yOffset     = options.yOffset    ?? 1.50;
    const planeWidth  = options.planeWidth  ?? 1.4;
    const planeHeight = options.planeHeight ?? 0.175;

    // ── Plano 3D billboard ─────────────────────────────────────────────────────
    this._plane = MeshBuilder.CreatePlane(
      'combatHpBar',
      { width: planeWidth, height: planeHeight },
      scene,
    );
    this._plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    this._plane.position.y    = yOffset;
    this._plane.parent        = pivot;
    this._plane.isPickable    = false;

    // ── Textura baja resolución + NEAREST_SAMPLINGMODE ─────────────────────────
    this._tex = new DynamicTexture(
      'combatHpBar_tex',
      { width: TEX_W, height: TEX_H },
      scene,
      false,
      Texture.NEAREST_SAMPLINGMODE,   // sin interpolación → píxeles duros
    );
    this._tex.hasAlpha = true;

    const mat = new StandardMaterial('combatHpBar_mat', scene);
    mat.diffuseTexture             = this._tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor              = new Color3(1, 1, 1);
    mat.backFaceCulling            = false;
    mat.disableLighting            = true;
    this._plane.material           = mat;

    this._draw(1.0);

    logger.debug('CombatHpBar: creada', { pivot: pivot.name, yOffset });
  }

  // ── API pública ────────────────────────────────────────────────────────────────

  /**
   * Redibuja la barra con los nuevos valores de HP.
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

    // Limpiar
    ctx.clearRect(0, 0, w, h);

    // Fondo Grimspire
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Interior: zona de HP (borde 2px, contenido y=2..y=9, 8 px de alto)
    const innerX = 2;
    const innerY = 2;
    const innerW = w - 4;  // 92 px
    const innerH = h - 4;  // 8 px

    ctx.fillStyle = COLOR_LOST;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Interior: zona de HP actual
    const fillW = Math.round(innerW * ratio);
    if (fillW > 0) {
      const color = ratio < LOW_THRESHOLD
        ? COLOR_LOW
        : ratio < MID_THRESHOLD
          ? COLOR_MID
          : COLOR_FULL;
      ctx.fillStyle = color;
      ctx.fillRect(innerX, innerY, fillW, innerH);
    }

    // Borde 2px (fillRect — sin antialiasing, proporcional a resolución ×2)
    ctx.fillStyle = COLOR_BORDER;
    ctx.fillRect(0, 0, w, 2);       // top
    ctx.fillRect(0, h - 2, w, 2);   // bottom
    ctx.fillRect(0, 0, 2, h);       // left
    ctx.fillRect(w - 2, 0, 2, h);   // right

    this._tex.update();
  }
}
