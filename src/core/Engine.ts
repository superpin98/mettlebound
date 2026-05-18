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

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Engine — wrapper de BABYLON.Engine y BABYLON.Scene.
//
// Responsabilidad única: inicializar el motor de renderizado,
// la escena base y la iluminación global. Los sistemas de
// cámara, personaje e input viven en sus propias clases.
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

  // Expone el motor de Babylon (útil para getDeltaTime en los controllers)
  get babylonEngine(): BabylonEngine {
    return this._engine;
  }

  // ——————————————————————————————————————————
  // Métodos privados
  // ——————————————————————————————————————————

  private _createScene(): Scene {
    const scene = new Scene(this._engine);
    // Fondo oscuro azulado — estética de mazmorra
    scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);
    return scene;
  }

  private _setupLight(): void {
    // — Luz hemisférica: luz ambiente omnidireccional —
    // Ilumina todo uniformemente según la normal de cada superficie.
    // Se mantiene aquí hasta que tengamos iluminación por sala en sprints futuros.
    const hemi = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this._scene
    );
    hemi.intensity = 0.85;
    hemi.diffuse = new Color3(0.9, 0.85, 1.0);       // tono frío violáceo
    hemi.groundColor = new Color3(0.165, 0.145, 0.19); // #2a2530 — cálido oscuro desde abajo

    // — Luz direccional: da sombreado volumétrico a la cápsula —
    // Llega desde arriba-frente para que se note la rotación del personaje.
    // Dirección normalizada: (-0.5, -1, -0.5) → Vector3 normalizado.
    const dir = new DirectionalLight(
      'sunLight',
      new Vector3(-0.5, -1, -0.5).normalize(),
      this._scene
    );
    dir.intensity = 0.5;
    dir.diffuse = new Color3(0.95, 0.9, 1.0); // blanco ligeramente frío
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
}
