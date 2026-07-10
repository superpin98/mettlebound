/**
 * CombatNameLabel -- etiqueta de nombre pixel art 3D para entidades de combate.
 *
 * Técnica de pixel art marcado (dos claves):
 *   1. DynamicTexture a baja resolución interna (56×12 px).
 *      Al mapearse a un plano de 1.4u × 0.44u, cada texel ocupa ~2-3 píxeles
 *      de pantalla en la vista de combate → bloques cuadrados visibles.
 *   2. samplingMode = Texture.NEAREST_SAMPLINGMODE (sin interpolación bilineal):
 *      los bordes entre texels quedan duros, efecto "chunky pixel" de 8-bit.
 *
 * Fuente: VT323 (bitmap / pixel font, ya cargada vía style.css).
 * Reutilizable: acepta cualquier TransformNode como pivot y cualquier nombre.
 *
 * Uso típico:
 *   const label = new CombatNameLabel(scene, entity.pivot, 'Rusty');
 *   // más tarde:
 *   label.dispose();
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

// ── Textura (resolución baja → píxeles gordos) ────────────────────────────────

/**
 * Ancho de la textura interna (px). Doble del original para mejorar legibilidad.
 * Mapeada a 1.4u de plano: cada texel ≈ 1-1.5 px pantalla — retro pero legible.
 */
const TEX_W = 112;

/** Alto de la textura interna (px). */
const TEX_H = 24;

/**
 * Tamaño de fuente dentro de la textura (px canvas).
 * VT323 a 20px: glifos limpios, proporciones correctas, carácter retro.
 */
const FONT_SIZE = 20;

// ── Colores ───────────────────────────────────────────────────────────────────

const COLOR_BG     = 'rgba(6, 3, 14, 0.82)';  // fondo negro-púrpura Grimspire
const COLOR_BORDER = 'rgba(0, 0, 0, 0.95)';    // borde duro 1px
const COLOR_TEXT   = '#d4a04a';                  // dorado Grimspire

// ── Opciones ──────────────────────────────────────────────────────────────────

export interface CombatNameLabelOptions {
  /** Altura sobre el pivot (eje Y). Por defecto 1.20 (justo encima de la cabeza). */
  yOffset?: number;
  /** Anchura del plano 3D. Por defecto 1.4 — alineado con la HP bar. */
  planeWidth?: number;
  /**
   * Altura del plano 3D. Por defecto 0.44.
   * Valor alto a propósito para amplificar el upscaling de la textura → píxeles gordos.
   */
  planeHeight?: number;
}

// ── Clase ──────────────────────────────────────────────────────────────────────

export class CombatNameLabel {

  private readonly _plane: Mesh;
  private readonly _tex:   DynamicTexture;

  /**
   * @param scene   Escena Babylon activa.
   * @param pivot   TransformNode padre (normalmente entity.pivot).
   * @param name    Nombre a mostrar.
   * @param options Ajustes opcionales de posición/tamaño.
   */
  constructor(
    scene:   Scene,
    pivot:   TransformNode,
    name:    string,
    options: CombatNameLabelOptions = {},
  ) {
    const yOffset     = options.yOffset    ?? 1.20;
    const planeWidth  = options.planeWidth  ?? 1.4;
    const planeHeight = options.planeHeight ?? 0.44;

    // ── Plano 3D billboard ─────────────────────────────────────────────────────
    this._plane = MeshBuilder.CreatePlane(
      'combatNameLabel',
      { width: planeWidth, height: planeHeight },
      scene,
    );
    this._plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    this._plane.position.y    = yOffset;
    this._plane.parent        = pivot;
    this._plane.isPickable    = false;

    // ── Textura baja resolución + NEAREST_SAMPLINGMODE ─────────────────────────
    //
    // NEAREST_SAMPLINGMODE = 1: el GPU usa el texel MÁS CERCANO sin interpolar.
    // Combinado con la baja resolución, cada texel se ve como un bloque cuadrado
    // duro en pantalla → look pixel art retro marcado, sin bordes suaves.
    this._tex = new DynamicTexture(
      'combatNameLabel_tex',
      { width: TEX_W, height: TEX_H },
      scene,
      false,                           // no mipmaps — UI 2D no los necesita
      Texture.NEAREST_SAMPLINGMODE,    // ← clave del efecto chunky pixel
    );
    this._tex.hasAlpha = true;

    const mat = new StandardMaterial('combatNameLabel_mat', scene);
    mat.diffuseTexture             = this._tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor              = new Color3(1, 1, 1); // visible sin iluminación
    mat.backFaceCulling            = false;
    mat.disableLighting            = true;
    this._plane.material           = mat;

    this._draw(name);

    logger.debug('CombatNameLabel: creada', { pivot: pivot.name, name, yOffset });
  }

  /** Libera el mesh, textura y material. */
  dispose(): void {
    this._tex.dispose();
    this._plane.material?.dispose();
    this._plane.dispose();
    logger.debug('CombatNameLabel: dispuesta');
  }

  // ── Dibujo interno ─────────────────────────────────────────────────────────────

  private _draw(name: string): void {
    const ctx = this._tex.getContext() as unknown as CanvasRenderingContext2D;
    const w   = TEX_W;
    const h   = TEX_H;

    // Limpiar
    ctx.clearRect(0, 0, w, h);

    // Fondo Grimspire
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Borde 2px (fillRect — sin antialiasing). 2px proporcional a la resolución ×2.
    ctx.fillStyle = COLOR_BORDER;
    ctx.fillRect(0, 0, w, 2);       // top
    ctx.fillRect(0, h - 2, w, 2);   // bottom
    ctx.fillRect(0, 0, 2, h);       // left
    ctx.fillRect(w - 2, 0, 2, h);   // right

    // Texto VT323 centrado — mayúsculas refuerzan el look retro
    ctx.font         = `${FONT_SIZE}px 'VT323', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = COLOR_TEXT;
    ctx.fillText(name.toUpperCase(), Math.floor(w / 2), Math.floor(h / 2));

    this._tex.update();
  }
}
