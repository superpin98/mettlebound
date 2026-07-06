// Imports externos (Babylon.js)
import {
  Scene,
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
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
//   - Iluminacion NEUTRA de validacion (no Grimspire):
//       clearColor #202028 gris oscuro neutro
//       HemisphericLight alta (1.0) para ver la geometria pareja
//       3 DirectionalLights suaves (frente + laterales) para volumen
//       Sin niebla, sin antorchas
//
// Uso desde main.ts:
//   await PreviewScene.build(scene);
//   playerController.initPhysics();   <- despues de build()
//   playerController.teleportTo({ x: 0, y: 0, z: 0 });
// ============================================================

const GRID_SIZE = 20;  // metros de lado del suelo cuadrado
const GRID_DIVS = 20;  // divisiones del grid visible

export class PreviewScene {

  /**
   * Construye el suelo fisico + luces neutras de validacion.
   * Devuelve la escena configurada (misma referencia, por convenio).
   *
   * IMPORTANTE: llamar ANTES de playerController.initPhysics()
   * para que la capsula del player no caiga al vacio.
   */
  static build(scene: Scene): void {

    // ---- Fondo neutro (gris oscuro, no negro Grimspire) -----------------
    scene.clearColor = new Color4(0.125, 0.125, 0.157, 1); // #202028

    // Sin niebla (validacion de modelo)
    scene.fogMode = Scene.FOGMODE_NONE;

    // ---- Suelo fisico ---------------------------------------------------
    const ground = MeshBuilder.CreateBox(
      'previewGround',
      { width: GRID_SIZE, height: 0.2, depth: GRID_SIZE },
      scene,
    );
    ground.position.y = -0.1;
    ground.isPickable = false;

    const gridMat = new StandardMaterial('previewGridMat', scene);
    gridMat.diffuseColor  = new Color3(0.15, 0.15, 0.15);
    gridMat.specularColor = new Color3(0, 0, 0);
    gridMat.emissiveColor = new Color3(0.08, 0.08, 0.10);
    gridMat.wireframe     = false;
    gridMat.maxSimultaneousLights = 8;
    ground.material = gridMat;

    new PhysicsAggregate(
      ground,
      PhysicsShapeType.BOX,
      { mass: 0, restitution: 0, friction: 0.8 },
      scene,
    );

    PreviewScene._buildGridLines(scene);

    // ---- Luz hemisferica de ambiente (alta, neutra, pareja) -------------
    const ambient = new HemisphericLight('valAmbient', new Vector3(0, 1, 0), scene);
    ambient.intensity   = 1.0;
    ambient.diffuse     = new Color3(1.0, 1.0, 1.0);
    ambient.groundColor = new Color3(0.6, 0.6, 0.6);

    // ---- DirectionalLights para volumen suave ---------------------------
    // Frente-arriba
    const dirFront = new DirectionalLight('valDirFront', new Vector3(0.2, -1, -1).normalize(), scene);
    dirFront.intensity = 0.4;
    dirFront.diffuse   = new Color3(1.0, 1.0, 1.0);

    // Lateral derecha
    const dirRight = new DirectionalLight('valDirRight', new Vector3(-1, -0.5, 0.3).normalize(), scene);
    dirRight.intensity = 0.4;
    dirRight.diffuse   = new Color3(0.95, 0.95, 1.0);

    // Lateral izquierda (contraluz leve)
    const dirLeft = new DirectionalLight('valDirLeft', new Vector3(1, -0.5, 0.3).normalize(), scene);
    dirLeft.intensity = 0.35;
    dirLeft.diffuse   = new Color3(0.9, 0.92, 0.95);
  }

  // ——————————————————————————————————————————
  // Privado: grid visual de lineas
  // ——————————————————————————————————————————

  private static _buildGridLines(scene: Scene): void {
    const half  = GRID_SIZE / 2;
    const step  = GRID_SIZE / GRID_DIVS;
    const Y     = 0.01;
    const color = new Color3(0.3, 0.3, 0.35);

    for (let i = 0; i <= GRID_DIVS; i++) {
      const pos = -half + i * step;

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
