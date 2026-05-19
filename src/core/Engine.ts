// Imports externos (Babylon.js)
import {
  Engine as BabylonEngine,
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color4,
  Color3,
} from '@babylonjs/core';

// Scene.FOGMODE_LINEAR es una constante estatica de la clase Scene.
// El import de Scene ya la incluye -- no hay import adicional necesario.

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Engine -- wrapper de BABYLON.Engine y BABYLON.Scene.
//
// Responsabilidad unica: inicializar el motor de renderizado,
// la escena base y la iluminacion global. Los sistemas de
// camara, personaje e input viven en sus propias clases.
// ============================================================

export class Engine {
  private readonly _engine: BabylonEngine;
  private readonly _scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    logger.info('Engine: inicializando Babylon.js');

    this._engine = new BabylonEngine(canvas, /* antialias */ true);
    this._scene = this._createScene();

    this._setupLight();
    this._startRenderLoop();

    window.addEventListener('resize', () => {
      this._engine.resize();
    });

    logger.info('Engine: listo');
  }

  // Expone la escena para que otros sistemas añadan meshes y callbacks
  get scene(): Scene {
    return this._scene;
  }

  // Expone el motor de Babylon (util para getDeltaTime en los controllers)
  get babylonEngine(): BabylonEngine {
    return this._engine;
  }

  // ——————————————————————————————————————————
  // Metodos privados
  // ——————————————————————————————————————————

  private _createScene(): Scene {
    const scene = new Scene(this._engine);

    // —— Grimspire: fondo void ——
    // #080612 — negro casi puro con tinte morado, igual que --bg-void en la paleta CSS.
    scene.clearColor = new Color4(0.031, 0.024, 0.047, 1.0);

    // —— Niebla lineal atmosferica ——
    // Empieza a los 18 u y desaparece a los 35 u. La sala de prueba mide ~8 u
    // de lado, asi que el jugador la ve completa; el exterior se disuelve en niebla.
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = new Color3(0.031, 0.024, 0.047); // mismo tinte que clearColor
    scene.fogStart = 18;
    scene.fogEnd = 35;

    return scene;
  }

  private _setupLight(): void {
    // —— Grimspire: luz hemisferica de ambiente minimo ——
    // Intensity muy baja: solo evita que los modelos sean siluetas negras.
    // diffuse morado frio -> simula el reflejo de piedra humeda de mazmorra.
    // groundColor casi negro -> sin rebote desde el suelo (es roca, no cielo).
    const hemi = new HemisphericLight(
      'grimAmbient',
      new Vector3(0, 1, 0),
      this._scene
    );
    hemi.intensity = 0.12;
    hemi.diffuse = new Color3(0.3, 0.2, 0.5);     // morado frio
    hemi.groundColor = new Color3(0.02, 0.01, 0.03); // casi negro

    // —— Grimspire: luz direccional tenue tipo luna ——
    // Intensity minima: da forma a la geometria sin iluminar el entorno.
    // diffuse azul frio -> contraste sutil con el ambar de las antorchas (TestRoom).
    const dir = new DirectionalLight(
      'grimMoon',
      new Vector3(-0.3, -1, -0.5).normalize(),
      this._scene
    );
    dir.intensity = 0.05;
    dir.diffuse = new Color3(0.4, 0.45, 0.7); // azul frio, luz de luna filtrada

    // Las PointLights calidas de antorchas se crean en TestRoom.ts
    // junto a sus meshes, para que posicion y luz esten siempre sincronizadas.
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
}
