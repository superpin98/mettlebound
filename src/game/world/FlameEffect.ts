// Imports externos (Babylon.js)
import {
  ParticleSystem,
  DynamicTexture,
  Vector3,
  Color4,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuracion
// ============================================================

// Numero maximo de particulas vivas simultaneamente
const FLAME_CAPACITY = 200;

// Particulas emitidas por segundo
const FLAME_EMIT_RATE = 40;

// Color inicial: naranja brillante opaco
const FLAME_COLOR1 = new Color4(1.0, 0.5, 0.0, 1.0);

// Color alternativo: amarillo limon opaco (variacion de tono)
const FLAME_COLOR2 = new Color4(1.0, 0.9, 0.2, 1.0);

// Color al morir: rojo oscuro completamente transparente
const FLAME_COLOR_DEAD = new Color4(0.5, 0.1, 0.0, 0.0);

// Tamano inicial de cada particula (unidades Babylon)
const FLAME_SIZE_MIN = 0.04;
const FLAME_SIZE_MAX = 0.12;

// Tiempo de vida en segundos (minimo y maximo)
const FLAME_LIFE_MIN = 0.3;
const FLAME_LIFE_MAX = 0.7;

// Velocidad de emision en cada eje (cono muy estrecho, mayormente hacia arriba)
const FLAME_DIR1 = new Vector3(-0.1, 1.0, -0.1);
const FLAME_DIR2 = new Vector3( 0.1, 1.5,  0.1);

// Gravedad: ligero tirón hacia abajo para que la llama pierda velocidad
// y se curve levemente -- como calor que sube pero desacelera al expandirse.
const FLAME_GRAVITY = new Vector3(0, -0.5, 0);

// Resolucion de la textura procedural (potencia de 2 para compatibilidad GPU)
const TEX_SIZE = 32;

// ============================================================
// FlameEffect
//
// Modulo estatico. Crea una ParticleSystem en la posicion
// indicada y la devuelve al llamante para que pueda pausarla,
// moverla o destruirla si lo necesita.
//
// La textura se genera proceduralmente con DynamicTexture:
// degradado radial del centro (blanco) al borde (transparente).
// Esto da la forma "gota de fuego" sin depender de assets externos.
//
// Uso:
//   const flame = FlameEffect.createAt(scene, lightPos);
//   // Para destruir mas tarde:
//   flame.dispose();
// ============================================================

export class FlameEffect {

  // ——————————————————————————————————————————
  // API publica
  // ——————————————————————————————————————————

  /**
   * Crea y arranca un sistema de particulas de llama en la posicion indicada.
   *
   * @param scene    Escena Babylon activa.
   * @param position Punto de emision (normalmente la misma posicion que la PointLight).
   * @returns        La ParticleSystem activa. Guarda la referencia si necesitas
   *                 pausarla o destruirla mas adelante.
   */
  static createAt(
    scene: Scene,
    position: Vector3,
  ): ParticleSystem {
    const texture = FlameEffect._buildFlameTexture(scene);

    const ps = new ParticleSystem('flameEffect', FLAME_CAPACITY, scene);
    ps.particleTexture = texture;

    // ——— Emision ———

    // Emitir desde un unico punto (la posicion de la llama)
    ps.emitter = position.clone();

    // Cono muy estrecho hacia arriba
    ps.direction1 = FLAME_DIR1;
    ps.direction2 = FLAME_DIR2;

    ps.minEmitPower = 0.3;
    ps.maxEmitPower = 0.8;
    ps.emitRate     = FLAME_EMIT_RATE;

    // ——— Fisica ———

    ps.gravity = FLAME_GRAVITY;

    // ——— Ciclo de vida ———

    ps.minLifeTime = FLAME_LIFE_MIN;
    ps.maxLifeTime = FLAME_LIFE_MAX;

    // ——— Tamano ———

    ps.minSize = FLAME_SIZE_MIN;
    ps.maxSize = FLAME_SIZE_MAX;

    // ——— Color ———

    ps.color1     = FLAME_COLOR1;
    ps.color2     = FLAME_COLOR2;
    ps.colorDead  = FLAME_COLOR_DEAD;

    // ——— Blend ———

    // BLENDMODE_ADD: las particulas se suman al color del fondo.
    // Resultado: brillo calido sobre geometria oscura de mazmorra,
    // sin bordes negros (el negro de la textura se vuelve invisible).
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;

    // Arrancar el sistema en bucle continuo
    ps.start();

    logger.debug('FlameEffect: sistema de particulas creado', {
      x: position.x.toFixed(2),
      y: position.y.toFixed(2),
      z: position.z.toFixed(2),
    });

    return ps;
  }

  // ——————————————————————————————————————————
  // Generacion de textura procedural
  // ——————————————————————————————————————————

  /**
   * Genera una textura cuadrada TEX_SIZE x TEX_SIZE con un degradado radial:
   *   Centro (radio 0)  -> blanco opaco
   *   Borde  (radio 1)  -> blanco transparente
   *
   * Se usa con BLENDMODE_ADD, por lo que la transparencia en el borde
   * hace que la particula desaparezca suavemente sin borde negro.
   *
   * DynamicTexture dibuja en un canvas 2D interno de Babylon.
   * El canvas expone un contexto estandar CanvasRenderingContext2D.
   */
  private static _buildFlameTexture(scene: Scene): DynamicTexture {
    const tex = new DynamicTexture(
      'flameTexture',
      { width: TEX_SIZE, height: TEX_SIZE },
      scene,
      /* generateMipMaps */ false,
    );

    const ctx = tex.getContext();
    const cx  = TEX_SIZE / 2;
    const cy  = TEX_SIZE / 2;

    // Degradado radial: blanco en el centro, transparente en el borde
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, TEX_SIZE / 2);
    gradient.addColorStop(0,   'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.8)');
    gradient.addColorStop(1,   'rgba(255, 100,   0, 0.0)');

    ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    tex.update(/* invertY */ false);

    return tex;
  }
}
