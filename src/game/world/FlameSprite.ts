// Imports externos (Babylon.js)
import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Color3,
  Vector3,
  Mesh,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuracion
// ============================================================

// Path absoluto desde public/ -- Vite sirve public/ en la raiz
const FLAME_TEXTURE_URL = '/assets/sprites/flame.png';

// Spritesheet: 640x384 px, 10 columnas x 6 filas, 64x64 por celda
const COLS   = 10;
const ROWS   = 6;
const FRAMES = COLS * ROWS; // 60

// Delay entre frames en ms (60 frames a 60ms = ~1s de loop, ~16 fps)
const FRAME_DELAY_MS = 60;

// Tamano del plane en unidades Babylon.
// 0.5 u cabe dentro de la U de la antorcha KayKit sin sobresalir.
const DEFAULT_SIZE = 0.5;

// ============================================================
// FlameSprite
//
// Reimplementado como plane 3D billboard para respetar el depth
// buffer de la escena.
//
//   PROBLEMA anterior: SpriteManager de Babylon usa un pase 2D
//   separado que ignora el depth buffer -- el sprite aparecia
//   por delante de paredes y geometria.
//
//   SOLUCION: MeshBuilder.CreatePlane crea geometria real 3D.
//   El depth buffer se respeta nativamente: paredes, pilares y
//   la propia U de la antorcha ocultan la llama segun su posicion.
//
// Arquitectura de recursos compartidos:
//   - UN Texture (cargada una sola vez)
//   - UN StandardMaterial (compartido entre todos los planes)
//   - N Mesh planes (uno por antorcha)
//
// Animacion por UV scrolling:
//   uScale = 1/COLS, vScale = 1/ROWS (solo se ve una celda de 64x64)
//   registerBeforeRender avanza el frame cada FRAME_DELAY_MS ms y
//   actualiza uOffset/vOffset en la textura compartida.
//   Resultado: todas las llamas animan sincronizadas (valido para Sprint 3.5).
//
// Uso:
//   FlameSprite.createAt(scene, position);
//   FlameSprite.createAt(scene, position, 0.4); // tamano custom
// ============================================================

export class FlameSprite {

  // Recursos compartidos (inicializados en la primera llamada)
  private static _texture:  Texture          | null = null;
  private static _material: StandardMaterial | null = null;

  // Estado de animacion
  private static _currentFrame  = 0;
  private static _lastFrameTime = 0;

  // Guard para registerBeforeRender (solo registrar una vez por escena)
  private static _registered = false;

  // ——————————————————————————————————————————
  // API publica
  // ——————————————————————————————————————————

  /**
   * Crea un plane 3D billboard con la llama pixel art animada.
   * Reutiliza textura y material globales -- la textura se carga UNA sola vez.
   *
   * @param scene    Escena Babylon activa.
   * @param position Posicion en world space (igual que la PointLight).
   * @param size     Tamano del plane en unidades Babylon (default 0.5).
   * @returns        El Mesh plane. Guarda la referencia si necesitas moverlo o destruirlo.
   */
  static createAt(scene: Scene, position: Vector3, size = DEFAULT_SIZE): Mesh {
    FlameSprite._ensureResources(scene);

    const plane = MeshBuilder.CreatePlane(
      'flamePlane',
      { width: size, height: size },
      scene,
    );

    plane.position      = position.clone();
    // BILLBOARDMODE_ALL: el plane siempre apunta directamente hacia la camara,
    // independientemente del angulo de vision (horizontal Y vertical).
    // BILLBOARDMODE_Y solo rotaba en el eje horizontal, lo que causaba que
    // desde una camara en angulo cenital el sprite apareciera como una "espada"
    // saliendo diagonal del soporte en lugar de una llama frontal.
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.material      = FlameSprite._material!;

    // La llama no debe proyectar sombras (es una particula visual, no geometria solida)
    plane.receiveShadows = false;

    logger.debug('FlameSprite: plane creado', {
      x: position.x.toFixed(2),
      y: position.y.toFixed(2),
      z: position.z.toFixed(2),
      size,
    });

    return plane;
  }

  // ——————————————————————————————————————————
  // Inicializacion de recursos compartidos
  // ——————————————————————————————————————————

  /**
   * Crea la textura y el material la primera vez.
   * Registra el callback de animacion una sola vez.
   */
  private static _ensureResources(scene: Scene): void {
    if (FlameSprite._texture === null) {
      // Textura con NEAREST para pixel art sin blur
      const tex = new Texture(
        FLAME_TEXTURE_URL,
        scene,
        /* noMipMap        */ true,
        /* invertY         */ true,   // default Babylon -- V=0 = top of PNG
        /* samplingMode    */ Texture.NEAREST_SAMPLINGMODE,
      );

      // Mostrar solo una celda (1/COLS x 1/ROWS del total)
      tex.uScale  = 1 / COLS;
      tex.vScale  = 1 / ROWS;
      // Empezar en frame 0 (columna 0, fila 0 del PNG)
      tex.uOffset = 0;
      tex.vOffset = 0;
      // Usar canal alpha del PNG para transparencia
      tex.hasAlpha = true;

      FlameSprite._texture = tex;

      logger.debug('FlameSprite: textura creada', { url: FLAME_TEXTURE_URL });
    }

    if (FlameSprite._material === null) {
      const mat = new StandardMaterial('flameMat', scene);

      // diffuseTexture: necesario para que useAlphaFromDiffuseTexture lea el alpha del PNG.
      // emissiveTexture: la misma textura para que la llama brille sin depender de luces.
      // Ambas apuntan al mismo objeto -- el UV scrolling actualiza las dos a la vez.
      mat.diffuseTexture  = FlameSprite._texture;
      mat.emissiveTexture = FlameSprite._texture;

      // Leer el canal alpha del PNG para hacer transparente el fondo
      mat.useAlphaFromDiffuseTexture = true;

      // ALPHATEST: corte duro entre pixel visible y transparente.
      // Ideal para pixel art (sin semi-transparencias intermedias).
      mat.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST;

      // Tinte calido ambar que multiplica con los colores de la textura
      mat.emissiveColor = new Color3(1.0, 0.75, 0.35);

      // Sin calculo de luces: la llama brilla por si misma
      mat.disableLighting = true;

      // Visible desde ambos lados (por si la camara pasa al otro lado de la U)
      mat.backFaceCulling = false;

      FlameSprite._material = mat;

      logger.debug('FlameSprite: material creado');
    }

    if (!FlameSprite._registered) {
      scene.registerBeforeRender(() => FlameSprite._advanceFrame());
      FlameSprite._registered = true;
      logger.debug('FlameSprite: animacion registrada');
    }
  }

  // ——————————————————————————————————————————
  // Animacion por UV scrolling
  // ——————————————————————————————————————————

  /**
   * Avanza un frame del spritesheet si ha pasado FRAME_DELAY_MS.
   * Actualiza uOffset/vOffset en la textura compartida.
   *
   * Calculo de coordenadas UV (con invertY=true, default Babylon):
   *   V=0 apunta a la fila 0 (tope del PNG), V aumenta hacia abajo.
   *   col = frame % COLS   -> columna del frame en el spritesheet
   *   row = floor(frame / COLS) -> fila del frame en el spritesheet
   *   uOffset = col / COLS
   *   vOffset = row / ROWS
   */
  private static _advanceFrame(): void {
    const now = performance.now();
    if (now - FlameSprite._lastFrameTime < FRAME_DELAY_MS) { return; }
    FlameSprite._lastFrameTime = now;

    FlameSprite._currentFrame = (FlameSprite._currentFrame + 1) % FRAMES;

    const col = FlameSprite._currentFrame % COLS;
    const row = Math.floor(FlameSprite._currentFrame / COLS);

    const tex = FlameSprite._texture!;
    tex.uOffset = col / COLS;
    tex.vOffset = row / ROWS;
  }

  // ——————————————————————————————————————————
  // Utilidades
  // ——————————————————————————————————————————

  /**
   * Libera textura y material globales.
   * Llamar solo al destruir la escena completa.
   */
  static disposeResources(): void {
    FlameSprite._material?.dispose();
    FlameSprite._texture?.dispose();
    FlameSprite._material   = null;
    FlameSprite._texture    = null;
    FlameSprite._registered = false;
    FlameSprite._currentFrame  = 0;
    FlameSprite._lastFrameTime = 0;
    logger.debug('FlameSprite: recursos liberados');
  }
}
