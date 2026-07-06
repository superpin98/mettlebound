// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  Vector3,
  Color3,
  DirectionalLight,
  HemisphericLight,
  StandardMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';

// ============================================================
// PreviewScene -- escena base minimalista para Sprint 4-EXT.
//
// Contiene:
//   - Suelo fisico plano (Havok) + material de grid visible
//   - 4 luces direccionales tenues desde los 4 diagonales
//   - 1 luz hemisferica de ambiente muy suave
//
// No tiene salas, corredores, dungeon ni logica de mundo.
// Es el espacio donde validar el Guerrero (Mixamo) y preparar
// el motor de combate por turnos (Fase B).
//
// Uso desde main.ts:
//   await PreviewScene.build(scene);
//   playerController.initPhysics();   <- despues de build()
//   playerController.teleportTo({ x: 0, y: 0, z: 0 });
// ============================================================

const GRID_SIZE    = 20;   // metros de lado del suelo cuadrado
const GRID_DIVS    = 20;   // divisiones del grid visible
const LIGHT_INTENS = 0.55; // intensidad de cada luz direccional

export class PreviewScene {

  /**
   * Construye el suelo fisico + luces.
   * Devuelve la escena configurada (misma referencia, por convenio).
   *
   * IMPORTANTE: llamar ANTES de playerController.initPhysics()
   * para que la capsula del player no caiga al vacio.
   */
  static build(scene: Scene): void {

    // ---- Suelo fisico ---------------------------------------------------
    // MeshBuilder.CreateGround no genera collider automaticamente con Havok.
    // Usamos una caja plana (height=0.2) para que el PhysicsAggregate BOX
    // cubra bien la superficie sin que el player "se hunda" en el borde.
    const ground = MeshBuilder.CreateBox(
      'previewGround',
      { width: GRID_SIZE, height: 0.2, depth: GRID_SIZE },
      scene,
    );
    ground.position.y = -0.1; // tapa de la caja queda en y=0 (nivel del suelo)
    ground.isPickable = false;

    // Material de cuadricula (grid)
    const gridMat = new StandardMaterial('previewGridMat', scene);
    gridMat.diffuseColor   = new Color3(0.15, 0.15, 0.15);
    gridMat.specularColor  = new Color3(0, 0, 0);
    gridMat.emissiveColor  = new Color3(0.08, 0.08, 0.10);
    gridMat.wireframe      = false;
    ground.material = gridMat;

    // Collider fisico estatico (mass=0 -> estatico, no se mueve)
    new PhysicsAggregate(
      ground,
      PhysicsShapeType.BOX,
      { mass: 0, restitution: 0, friction: 0.8 },
      scene,
    );

    // Grid visual de lineas sobre el suelo
    PreviewScene._buildGridLines(scene);

    // ---- Luz de ambiente muy tenue (fill global) -------------------------
    const ambient = new HemisphericLight(
      'previewAmbient',
      new Vector3(0, 1, 0),
      scene,
    );
    ambient.intensity      = 0.25;
    ambient.diffuse        = new Color3(0.6, 0.6, 0.7);
    ambient.groundColor    = new Color3(0.1, 0.1, 0.12);

    // ---- 4 luces direccionales desde los 4 diagonales ------------------
    // Norte-Oeste
    const lightNW = new DirectionalLight(
      'previewDirNW',
      new Vector3(-1, -1.5, -1).normalize(),
      scene,
    );
    lightNW.intensity = LIGHT_INTENS;
    lightNW.diffuse   = new Color3(0.9, 0.85, 0.8);

    // Norte-Este
    const lightNE = new DirectionalLight(
      'previewDirNE',
      new Vector3(1, -1.5, -1).normalize(),
      scene,
    );
    lightNE.intensity = LIGHT_INTENS * 0.7;
    lightNE.diffuse   = new Color3(0.7, 0.75, 0.9);

    // Sur-Oeste
    const lightSW = new DirectionalLight(
      'previewDirSW',
      new Vector3(-1, -1.5, 1).normalize(),
      scene,
    );
    lightSW.intensity = LIGHT_INTENS * 0.5;
    lightSW.diffuse   = new Color3(0.8, 0.8, 0.75);

    // Sur-Este (contraluz trasero, muy tenue)
    const lightSE = new DirectionalLight(
      'previewDirSE',
      new Vector3(1, -1.5, 1).normalize(),
      scene,
    );
    lightSE.intensity = LIGHT_INTENS * 0.35;
    lightSE.diffuse   = new Color3(0.6, 0.65, 0.7);

    // Limitar luces activas en el material del suelo
    gridMat.maxSimultaneousLights = 4;
  }

  // ——————————————————————————————————————————
  // Privado: grid visual de lineas
  // ——————————————————————————————————————————

  private static _buildGridLines(scene: Scene): void {
    const half    = GRID_SIZE / 2;
    const step    = GRID_SIZE / GRID_DIVS;
    const Y       = 0.01; // ligeramente sobre el suelo para evitar z-fighting
    const color   = new Color3(0.3, 0.3, 0.35);

    for (let i = 0; i <= GRID_DIVS; i++) {
      const pos = -half + i * step;

      // Linea paralela al eje Z
      MeshBuilder.CreateLines(
        `gridLineX_${i}`,
        {
          points: [
            new Vector3(pos, Y, -half),
            new Vector3(pos, Y,  half),
          ],
          colors: [
            color.toColor4(0.5),
            color.toColor4(0.5),
          ],
        },
        scene,
      );

      // Linea paralela al eje X
      MeshBuilder.CreateLines(
        `gridLineZ_${i}`,
        {
          points: [
            new Vector3(-half, Y, pos),
            new Vector3( half, Y, pos),
          ],
          colors: [
            color.toColor4(0.5),
            color.toColor4(0.5),
          ],
        },
        scene,
      );
    }
  }
}
