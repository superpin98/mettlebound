// Imports externos (Babylon.js)
import {
  Engine as BabylonEngine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  Color4,
  Color3,
  StandardMaterial,
} from '@babylonjs/core';

// Imports internos
import { logger } from '@/core/Logger';

// ============================================================
// Engine — wrapper de BABYLON.Engine y BABYLON.Scene.
//
// Responsabilidad única: inicializar el motor de renderizado
// y exponer la escena para que otros sistemas la usen.
// Durante el Sprint 0 también crea el cubo de prueba.
// ============================================================

export class Engine {
  private readonly _engine: BabylonEngine;
  private readonly _scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    logger.info('Engine: inicializando Babylon.js');

    this._engine = new BabylonEngine(canvas, /* antialias */ true);
    this._scene = this._createScene();

    this._setupCamera(canvas);
    this._setupLight();
    this._setupSpinningCube();
    this._startRenderLoop();

    // Redimensionar el canvas cuando cambie el tamaño de la ventana
    window.addEventListener('resize', () => {
      this._engine.resize();
    });

    logger.info('Engine: listo');
  }

  // Devuelve la escena activa (otros sistemas la usarán en sprints futuros)
  get scene(): Scene {
    return this._scene;
  }

  // ——————————————————————————————————————————
  // Métodos privados de configuración
  // ——————————————————————————————————————————

  private _createScene(): Scene {
    const scene = new Scene(this._engine);
    // Fondo oscuro azulado — coherente con la estética de mazmorra
    scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);
    return scene;
  }

  private _setupCamera(canvas: HTMLCanvasElement): void {
    // ArcRotateCamera: cámara orbital que rodea un punto central.
    // Ángulos en radianes: alpha = rotación horizontal, beta = ángulo vertical.
    const camera = new ArcRotateCamera(
      'mainCamera',
      -Math.PI / 2,  // alpha: mirando desde delante
      Math.PI / 3,   // beta: ligeramente desde arriba
      5,             // radio: distancia al objetivo
      Vector3.Zero(),
      this._scene
    );
    // Permite arrastrar con el ratón para orbitar la cámara
    camera.attachControl(canvas, /* preventDefault */ true);
  }

  private _setupLight(): void {
    // HemisphericLight: luz ambiente que ilumina desde arriba.
    // Suficiente para ver el cubo sin sombras complejas.
    const light = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this._scene
    );
    light.intensity = 0.9;
    light.diffuse = new Color3(0.9, 0.85, 1.0);   // tono frío ligeramente violáceo
    light.groundColor = new Color3(0.2, 0.1, 0.3); // reflejo desde abajo oscuro
  }

  private _setupSpinningCube(): void {
    // Cubo de prueba — se eliminará en Sprint 1 al sustituirlo por el personaje
    const cube = MeshBuilder.CreateBox('testCube', { size: 1.2 }, this._scene);

    // Material de color sólido para que se vea el shading de la luz
    const material = new StandardMaterial('cubeMaterial', this._scene);
    material.diffuseColor = new Color3(0.5, 0.2, 0.8);  // morado Mettlebound
    material.specularColor = new Color3(0.3, 0.1, 0.5);
    cube.material = material;

    // Rotación en el render loop: 0.01 rad/frame ≈ 0.6°/frame ≈ 36°/s a 60fps
    this._scene.registerBeforeRender(() => {
      cube.rotation.y += 0.01;
      cube.rotation.x += 0.005;
    });

    logger.debug('Engine: cubo de prueba creado', { mesh: cube.name });
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
}
