// Imports externos (Babylon.js)
import {
  Vector3,
  Color3,
  PointLight,
  TransformNode,
  PBRMaterial,
  StandardMaterial,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { Scene, AssetContainer } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import type { Vec3 } from '@/types/spatial.types';
import { FlameEffect } from '@/game/world/FlameEffect';
import { FlameSprite } from '@/game/world/FlameSprite';
import { TargetDummy } from '@/game/world/TargetDummy';
import { Grid } from '@/game/world/Grid';
import { GridRenderer } from '@/game/world/GridRenderer';
import { logger } from '@/core/Logger';

// ============================================================
// Constantes de configuracion
// ============================================================

const DUNGEON_BASE_URL  = '/assets/models/dungeon/';
const FLOOR_FILE        = 'floor_tile_large.gltf.glb';
const WALL_FILE         = 'wall.gltf.glb';
const CORNER_FILE       = 'wall_corner.gltf.glb';
const TORCH_FILE        = 'torch_mounted.gltf.glb';
const PILLAR_FILE       = 'pillar.gltf.glb';

// Numero de tiles por lado (4x4 = 16 baldosas)
const GRID_SIZE = 4;

// Altura del punto de montaje de la antorcha en la pared
const TORCH_Y = 1.0;

// Separacion del rootNode de la antorcha respecto a la superficie de la pared.
// Sin esto el modelo queda enterrado dentro del panel de piedra y no se ve.
// 0.25: valor calibrado para que la cruz naranja quede tocando la cara
// interior de la piedra sin enterrarse.
const TORCH_WALL_INSET = 0.25;

// Altura vertical desde el wrapper hasta la llama (tope de la U).
const TORCH_LIGHT_Y = 0.55;

// Desplazamiento hacia el centro de la sala para que la PointLight
// salga desde la llama interior de la U y no desde la cruz pegada a la pared.
// Valor pequeno: la antorcha es vertical, la llama casi en la vertical de la cruz.
const TORCH_LIGHT_INWARD = 0.15;

// Tamano del plane billboard de la llama (unidades Babylon).
// 0.5 u: ajustado para que la llama quepa dentro de la U sin sobresalir.
const FLAME_SPRITE_SIZE = 0.90;

// Altura del centro del sprite de llama respecto al wrapper de la antorcha.
// Sube este valor para mover la llama hacia arriba, bajalo para bajarla.
// El origen del plane esta en su centro geometrico.
const TORCH_FLAME_OFFSET_Y = 0.70;

// Cuanto sobresale la llama hacia el centro de la sala (en unidades Babylon).
// 0.0 = la llama queda en la vertical del palo (pegada a la pared).
// Sube este valor si la llama queda hundida dentro de la pared.
const TORCH_FLAME_FORWARD = 0.3;

// Desplazamiento lateral de la llama, paralelo a la pared y perpendicular a inward.
// 0.0 = sin desplazamiento. Positivo = hacia la derecha vista de frente a la pared.
// El vector lateral se calcula como Cross(Y_mundo, inward), que da el eje "derecha"
// desde el punto de vista de alguien mirando la pared desde dentro de la sala.
// Por pared: Sur→+X  Norte→-X  Oeste→-Z  Este→+Z
// Consistente: TORCH_FLAME_LATERAL=0.1 desplaza las 4 llamas hacia su derecha propia.
const TORCH_FLAME_LATERAL = 0.03;

// Luz de antorcha: ambar calido
const TORCH_DIFFUSE        = new Color3(1.0, 0.5, 0.15);
const TORCH_INTENSITY      = 1.2;
const TORCH_RANGE          = 6;

// Si es true, se colocan 4 pilares interiores decorativos
const PLACE_PILLARS = true;

// ============================================================
// TestRoom
//
// Sala estatica de prueba centrada en (0, 0, 0).
//   - Suelo    : cuadricula GRID_SIZE x GRID_SIZE de floor_tile_large
//   - Paredes  : 4 x GRID_SIZE segmentos rectos perimetrales
//   - Esquinas : 4 esquinas en los vertices del perimetro
//   - Antorchas: 1 por pared (N, S, E, O) centradas, con:
//                  * PointLight  (ilumina la sala)
//                  * ParticleSystem FlameEffect (particulas ascendentes)
//                  * Sprite billboard FlameSprite (llama pixel art animada)
//   - Pilares  : 4 interiores (controlados por PLACE_PILLARS)
//
// _isBuilt previene doble llamada a build() (guard anti-duplicacion).
// El tamano de tile se mide dinamicamente con getBoundingInfo().
// markAllMaterialsAsDirty fuerza recompilacion de shaders con las 4 PointLights.
// ============================================================

export class TestRoom {

  /** Guard: impide que build() cree la sala mas de una vez. */
  private static _isBuilt = false;

  /**
   * GridRenderer de debug creado en build().
   * Accesible desde DevTools via window.__mb.gridRenderer.
   * null antes de que build() se complete.
   */
  static gridRenderer: GridRenderer | null = null;

  /**
   * Construye la sala de prueba en la escena.
   * Llamar una sola vez tras playerController.loadModel().
   * Si se llama de nuevo, registra una advertencia y retorna sin hacer nada.
   */
  static async build(
    scene: Scene,
    assetManager: AssetManager,
  ): Promise<{ dummy: TargetDummy; grid: Grid }> {
    if (TestRoom._isBuilt) {
      logger.warn('TestRoom: build() llamado mas de una vez -- ignorado.');
      throw new Error('TestRoom.build() llamado mas de una vez');
    }
    TestRoom._isBuilt = true;

    logger.info('TestRoom: construyendo sala...');
    logger.debug('TestRoom: luces en escena al iniciar build', {
      count: scene.lights.length,
      names: scene.lights.map((l) => l.name),
    });

    // Carga paralela de todos los containers
    const [
      floorContainer,
      wallContainer,
      cornerContainer,
      torchContainer,
      pillarContainer,
    ] = await Promise.all([
      assetManager.loadAsset(DUNGEON_BASE_URL, FLOOR_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, WALL_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, CORNER_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, TORCH_FILE),
      assetManager.loadAsset(DUNGEON_BASE_URL, PILLAR_FILE),
    ]);

    // Medir el tamano real del tile (instancia temporal, descartada tras medir)
    const tileSize = TestRoom._measureTileSize(floorContainer, assetManager);

    // half = distancia del centro al borde exterior del suelo
    const half = (GRID_SIZE / 2) * tileSize;

    logger.debug('TestRoom: dimensiones calculadas', {
      tileSize,
      sideLength: GRID_SIZE * tileSize,
    });

    TestRoom._buildFloor(assetManager, floorContainer, tileSize);
    TestRoom._buildWalls(assetManager, wallContainer, tileSize, half);
    TestRoom._buildCorners(assetManager, cornerContainer, half);
    TestRoom._buildTorches(scene, assetManager, torchContainer, half);

    if (PLACE_PILLARS) {
      TestRoom._buildPillars(assetManager, pillarContainer, tileSize);
    }

    // Subir maxSimultaneousLights a 8 en TODOS los materiales de la escena.
    // El limite por defecto de Babylon es 4. Con 2 luces globales (hemi + dir)
    // + 4 PointLights de antorchas = 6 luces totales, el limite de 4 trunca
    // 2 PointLights y la sala aparece parcialmente oscura.
    // Debe aplicarse ANTES de markAllMaterialsAsDirty para que la recompilacion
    // de shaders ya use el nuevo limite.
    scene.materials.forEach((mat) => {
      if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) {
        mat.maxSimultaneousLights = 8;
      }
    });

    // FIX: fuerza recompilacion de shaders para que los materiales vean
    // las 4 PointLights recien anadidas.
    // El suelo, paredes y esquinas se instancian antes de que existan las
    // PointLights, asi que sus shaders se compilan con solo 2 luces (hemi + dir).
    // markAllMaterialsAsDirty(2) usa Material.LightDirtyFlag = 2, que obliga a
    // Babylon a recompilar el bloque de iluminacion de todos los shaders en el
    // proximo frame, ya con las 6 luces presentes.
    // NOTA: el flag 1 es TextureDirtyFlag, NO LightDirtyFlag -- no sirve aqui.
    scene.markAllMaterialsAsDirty(2);

    // ── Colliders de fisica (suelo + 4 paredes + 4 pilares) ──────────────────
    // Cajas/cilindros invisibles estaticos (mass:0) que definen la geometria de
    // colision de la sala. Deben crearse ANTES de que el player reciba su
    // PhysicsAggregate (initPhysics() en main.ts se llama despues de build()).
    TestRoom._buildPhysicsColliders(scene, half, tileSize);

    // ── Target Dummy (Rusty) ──────────────────────────────────────────────────
    // Posicion: (0, 0, 2) -- norte del centro, bien iluminado por antorcha norte.
    // create() es async: carga Skeleton_Minion.glb via AssetManager (cacheable).
    // El modelo asigna maxSimultaneousLights=8 internamente antes del primer frame.
    const dummy = await TargetDummy.create(
      scene,
      assetManager,
      new Vector3(0, 0, 2),
      'Rusty',
    );

    logger.info('TestRoom: sala construida.', {
      tileSize,
      sideLength: GRID_SIZE * tileSize,
      lucesEnEscena: scene.lights.length,
      nombresLuces: scene.lights.map((l) => l.name),
    });

    // ── Grid tactico (10x10, 1 unidad Babylon = 1 tile) ──────────────────────
    // El grid cubre paredes + interior: de -(half+1) a +(half+1) en X y Z.
    // Con half=4: origin=(-5,0,-5), 10 cols x 10 rows.
    //
    // Perimetro (col/row 0 y 9): zona de paredes, bloqueado.
    // Pilares: posiciones +-tileSize_visual (+-2u) → cols/rows 3 y 7.
    //
    // IMPORTANTE: tileSize aqui es el tamano VISUAL del tile KayKit (~2u).
    // El grid tactico usa su propio tileSize=1 (1 Babylon unit = 1 tile).
    const TACTICAL_TILE = 1.0;
    const TACTICAL_COLS = 10;
    const TACTICAL_ROWS = 10;

    const gridOrigin: Vec3 = {
      x: -(half + TACTICAL_TILE),
      y: 0,
      z: -(half + TACTICAL_TILE),
    };

    const grid = new Grid({
      cols:     TACTICAL_COLS,
      rows:     TACTICAL_ROWS,
      origin:   gridOrigin,
      tileSize: TACTICAL_TILE,
    });

    // Perimetro bloqueado (paredes N/S/E/O)
    for (let c = 0; c < TACTICAL_COLS; c++) {
      grid.setTileBlocked(c, 0,                  true);
      grid.setTileBlocked(c, TACTICAL_ROWS - 1,  true);
    }
    for (let r = 1; r < TACTICAL_ROWS - 1; r++) {
      grid.setTileBlocked(0,                 r, true);
      grid.setTileBlocked(TACTICAL_COLS - 1, r, true);
    }

    // Pilares bloqueados (1 tile por pilar, KISS -- A2/A3 puede expandir a 2x2)
    for (const wx of [-tileSize, tileSize]) {
      for (const wz of [-tileSize, tileSize]) {
        const coord = grid.worldToGrid(wx, wz);
        if (coord !== null) {
          grid.setTileBlocked(coord.col, coord.row, true);
        }
      }
    }

    // GridRenderer invisible por defecto.
    // Activar desde DevTools: __mb.toggleGrid() o __mb.gridRenderer.show()
    const gridRenderer = new GridRenderer(scene, grid);
    TestRoom.gridRenderer = gridRenderer;

    logger.debug('TestRoom: grid tactico creado', {
      cols:    TACTICAL_COLS,
      rows:    TACTICAL_ROWS,
      origin:  gridOrigin,
      tileSize: TACTICAL_TILE,
    });

    return { dummy, grid };
  }

  // ----------------------------------------------------------

  /**
   * Instancia una prueba temporal, lee el BoundingBox del primer
   * mesh hijo y devuelve la dimension mayor (X o Z).
   * Fallback: 2 (tamano estandar KayKit).
   */
  private static _measureTileSize(
    container: AssetContainer,
    assetManager: AssetManager,
  ): number {
    const probe = assetManager.instantiate(container);
    probe.rootNode.computeWorldMatrix(true);
    const meshes = probe.rootNode.getChildMeshes(false);
    let size = 2;

    const firstMesh = meshes[0];
    if (firstMesh !== undefined) {
      const bb = firstMesh.getBoundingInfo().boundingBox;
      const w = bb.maximum.x - bb.minimum.x;
      const d = bb.maximum.z - bb.minimum.z;
      size = Math.max(w, d);
    }

    probe.dispose();
    return size;
  }

  // ----------------------------------------------------------

  private static _buildFloor(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
  ): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = (col - GRID_SIZE / 2 + 0.5) * tileSize;
        const z = (row - GRID_SIZE / 2 + 0.5) * tileSize;
        const tile = assetManager.instantiate(container);
        tile.rootNode.position = new Vector3(x, 0, z);
      }
    }
    logger.debug('TestRoom: suelo colocado', { tiles: GRID_SIZE * GRID_SIZE });
  }

  // ----------------------------------------------------------

  /**
   * Coloca GRID_SIZE paredes por lado (16 total).
   * Rotaciones: wall.gltf.glb mira hacia +Z por defecto.
   *   Sur  (z=-half): rotY=0       Norte(z=+half): rotY=PI
   *   Oeste(x=-half): rotY=PI/2    Este (x=+half): rotY=-PI/2
   */
  private static _buildWalls(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
    half: number,
  ): void {
    const sides: { rotY: number; along: 'x' | 'z'; at: number }[] = [
      { rotY: 0,             along: 'x', at: -half },  // Sur
      { rotY: Math.PI,       along: 'x', at:  half },  // Norte
      { rotY: Math.PI / 2,   along: 'z', at: -half },  // Oeste
      { rotY: -Math.PI / 2,  along: 'z', at:  half },  // Este
    ];

    for (const { rotY, along, at } of sides) {
      for (let i = 0; i < GRID_SIZE; i++) {
        const offset = (i - GRID_SIZE / 2 + 0.5) * tileSize;
        const wall = assetManager.instantiate(container);
        wall.rootNode.position =
          along === 'x'
            ? new Vector3(offset, 0, at)
            : new Vector3(at, 0, offset);
        wall.rootNode.rotation = new Vector3(0, rotY, 0);
      }
    }
    logger.debug('TestRoom: paredes colocadas', { count: 4 * GRID_SIZE });
  }

  // ----------------------------------------------------------

  /**
   * Coloca 4 esquinas en los vertices del perimetro.
   * Rotaciones: wall_corner mira al cuadrante -X/-Z por defecto.
   *   SO: rotY=0  SE: rotY=PI/2  NE: rotY=PI  NO: rotY=-PI/2
   */
  private static _buildCorners(
    assetManager: AssetManager,
    container: AssetContainer,
    half: number,
  ): void {
    const corners: { sx: -1 | 1; sz: -1 | 1; rotY: number }[] = [
      { sx: -1, sz: -1, rotY: 0            },  // SO
      { sx:  1, sz: -1, rotY: Math.PI / 2  },  // SE
      { sx:  1, sz:  1, rotY: Math.PI      },  // NE
      { sx: -1, sz:  1, rotY: -Math.PI / 2 },  // NO
    ];

    for (const { sx, sz, rotY } of corners) {
      const corner = assetManager.instantiate(container);
      corner.rootNode.position = new Vector3(sx * half, 0, sz * half);
      corner.rootNode.rotation = new Vector3(0, rotY, 0);
    }
    logger.debug('TestRoom: esquinas colocadas', { count: 4 });
  }

  // ----------------------------------------------------------

  /**
   * Coloca 1 antorcha por pared (N, S, E, O), centrada.
   *
   * Cada antorcha tiene tres capas:
   *   1. PointLight       -- ilumina la sala con ambar calido
   *   2. FlameEffect      -- ParticleSystem de particulas ascendentes
   *   3. FlameSprite      -- sprite billboard pixel art animado (el "cuerpo" de la llama)
   *
   * Arquitectura wrapper:
   *   TransformNode wrapper: posicion en la pared + yaw (rotY).
   *   rootNode hijo: sin rotacion. El modelo KayKit torch_mounted viene
   *   vertical de fabrica (Y+ = U+llama, Y- = cruz de montaje).
   *
   * rotY por pared:
   *   Sur rotY=0  Norte rotY=PI  Oeste rotY=PI/2  Este rotY=-PI/2
   */
  private static _buildTorches(
    scene: Scene,
    assetManager: AssetManager,
    container: AssetContainer,
    half: number,
  ): void {
    const BY      = TORCH_Y;
    const INS     = TORCH_WALL_INSET;
    const LIGHT_Y = TORCH_LIGHT_Y;
    const INWARD  = TORCH_LIGHT_INWARD;

    // Diagnostico: meshes hijos del container de antorcha
    const probeInst = assetManager.instantiate(container);
    const childMeshNames = probeInst.rootNode.getChildMeshes(false).map((m) => m.name);
    probeInst.dispose();
    logger.debug('TestRoom: meshes hijos del container de antorcha', {
      count: childMeshNames.length,
      names: childMeshNames,
    });

    // inward: vector unitario hacia el centro de la sala en world space.
    const torches: { pos: Vector3; rotY: number; label: string; inward: Vector3 }[] = [
      { pos: new Vector3(0,           BY, -half + INS), rotY: 0,            label: 'Sur',   inward: new Vector3(0,  0,  1) },
      { pos: new Vector3(0,           BY,  half - INS), rotY: Math.PI,      label: 'Norte', inward: new Vector3(0,  0, -1) },
      { pos: new Vector3(-half + INS, BY,  0),          rotY: Math.PI / 2,  label: 'Oeste', inward: new Vector3(1,  0,  0) },
      { pos: new Vector3( half - INS, BY,  0),          rotY: -Math.PI / 2, label: 'Este',  inward: new Vector3(-1, 0,  0) },
    ];

    for (const { pos, rotY, label, inward } of torches) {
      // Wrapper: posicion en la pared + yaw para orientar la antorcha
      const wrapper = new TransformNode(`torchWrapper_${label}`, scene);
      wrapper.position = pos;
      wrapper.rotation.y = rotY;

      // Modelo 3D: instancia vertical sin rotacion adicional
      const torch = assetManager.instantiate(container);
      torch.rootNode.parent = wrapper;
      torch.rootNode.position = Vector3.Zero();

      // Posicion de la llama: arriba (LIGHT_Y) + nudge al centro (INWARD)
      const lightPos = new Vector3(
        pos.x + inward.x * INWARD,
        pos.y + LIGHT_Y,
        pos.z + inward.z * INWARD,
      );

      // 1. Luz puntual ambar
      const light = new PointLight(`torchLight_${label}`, lightPos, scene);
      light.diffuse   = TORCH_DIFFUSE;
      light.intensity = TORCH_INTENSITY;
      light.range     = TORCH_RANGE;

      // 2. Particulas ascendentes (fondo de la llama, bordes)
      FlameEffect.createAt(scene, lightPos);

      // 3. Sprite billboard pixel art animado (cuerpo central de la llama).
      // Posicion de la llama: offset relativo al wrapper.
      // TORCH_FLAME_OFFSET_Y sube/baja la llama (Y).
      // TORCH_FLAME_FORWARD la aleja de la pared hacia el centro de la sala (X/Z segun inward).
      // TORCH_FLAME_LATERAL la mueve lateralmente paralela a la pared (X/Z segun lateral).
      // lateral = Cross(Y_mundo, inward) -> eje "derecha" visto de frente a cada pared.
      // Usando wrapper.position como base -> funciona en generacion procedural.
      const lateral = Vector3.Cross(Vector3.Up(), inward);
      const spritePos = new Vector3(
        wrapper.position.x + inward.x * TORCH_FLAME_FORWARD + lateral.x * TORCH_FLAME_LATERAL,
        wrapper.position.y + TORCH_FLAME_OFFSET_Y,
        wrapper.position.z + inward.z * TORCH_FLAME_FORWARD + lateral.z * TORCH_FLAME_LATERAL,
      );
      FlameSprite.createAt(scene, spritePos, FLAME_SPRITE_SIZE);

      logger.debug('TestRoom: antorcha colocada', {
        label,
        rotY: rotY.toFixed(3),
        pos:      { x: pos.x.toFixed(2),      y: pos.y.toFixed(2),      z: pos.z.toFixed(2)      },
        lightPos: { x: lightPos.x.toFixed(2), y: lightPos.y.toFixed(2), z: lightPos.z.toFixed(2) },
      });
    }
    logger.debug('TestRoom: antorchas colocadas', { count: torches.length });
  }

  // ----------------------------------------------------------

  /**
   * Crea 9 colliders invisibles y estaticos (mass:0) para la sala:
   * - 1 suelo plano  : cubre todo el suelo, grosor 0.1u, top en Y=0.
   * - 4 paredes      : una por lado (N/S/E/O), altura 2u, grosor 0.3u.
   * - 4 pilares      : cilindros en (+-tileSize, 0, +-tileSize),
   *                    radio 0.75u (medido con gltf-transform en B2C), altura 2u.
   *
   * Mediciones B2C con gltf-transform:
   *   pillar.gltf.glb: X -0.75..+0.75, Z -0.75..+0.75, radio = 0.75u
   *   tileSize = 4u, posiciones pilar = (+-4, 0, +-4)
   *
   * No modifica la geometria visual (tiles/pilares GLB intactos).
   * Llamar desde build() con scene.enablePhysics() ya activo.
   */
  private static _buildPhysicsColliders(scene: Scene, half: number, tileSize: number): void {
    const WALL_H   = 2;    // altura de pared/pilar (u)
    const WALL_T     = 0.7;   // grosor collider de pared (subido de 0.3 en B2C-tweak)
    // Desplazamos el centro de cada pared hacia el interior para que la cara
    // exterior siga alineada con el tile visual (cara exterior = half + 0.15 original).
    // WALL_SHIFT = (0.7 - 0.3) / 2 = 0.2u hacia el centro de la sala.
    const WALL_SHIFT = (WALL_T - 0.3) / 2;
    const FLOOR_T    = 0.1;  // grosor del collider de suelo
    const PILLAR_D   = 1.5;  // diametro del pilar KayKit (radio = 0.75u, medido B2C)
    const side       = half * 2;

    // -- Suelo + 4 paredes (BOX) --
    const boxColliders = [
      // Suelo: top en Y=0, centro en Y = -FLOOR_T/2.
      { name: 'col_floor',  w: side,   h: FLOOR_T, d: side,   x: 0,                  y: -FLOOR_T / 2, z: 0                  },
      // Pared Sur  (cara exterior en z=-(half+0.15), centro desplazado +WALL_SHIFT)
      { name: 'col_wall_S', w: side,   h: WALL_H,  d: WALL_T, x: 0,                  y: WALL_H / 2,   z: -half + WALL_SHIFT  },
      // Pared Norte (cara exterior en z=+(half+0.15), centro desplazado -WALL_SHIFT)
      { name: 'col_wall_N', w: side,   h: WALL_H,  d: WALL_T, x: 0,                  y: WALL_H / 2,   z:  half - WALL_SHIFT  },
      // Pared Oeste (cara exterior en x=-(half+0.15), centro desplazado +WALL_SHIFT)
      { name: 'col_wall_W', w: WALL_T, h: WALL_H,  d: side,   x: -half + WALL_SHIFT, y: WALL_H / 2,   z: 0                  },
      // Pared Este  (cara exterior en x=+(half+0.15), centro desplazado -WALL_SHIFT)
      { name: 'col_wall_E', w: WALL_T, h: WALL_H,  d: side,   x:  half - WALL_SHIFT, y: WALL_H / 2,   z: 0                  },
    ];

    for (const c of boxColliders) {
      const box = MeshBuilder.CreateBox(
        c.name,
        { width: c.w, height: c.h, depth: c.d },
        scene,
      );
      box.position   = new Vector3(c.x, c.y, c.z);
      box.isVisible  = false;
      box.isPickable = false;
      new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0 }, scene);
    }

    // -- 4 pilares interiores (CYLINDER) --
    // Mismas posiciones que _buildPillars: (+-tileSize, 0, +-tileSize).
    // Centro del cilindro en Y = WALL_H/2 para que la base toque Y=0.
    const pd = tileSize;
    const cy = WALL_H / 2;
    const pillarPositions = [
      { px: -pd, pz: -pd },
      { px:  pd, pz: -pd },
      { px: -pd, pz:  pd },
      { px:  pd, pz:  pd },
    ];

    for (const p of pillarPositions) {
      const cyl = MeshBuilder.CreateCylinder(
        `col_pillar_${p.px}_${p.pz}`,
        { height: WALL_H, diameter: PILLAR_D, tessellation: 8 },
        scene,
      );
      cyl.position   = new Vector3(p.px, cy, p.pz);
      cyl.isVisible  = false;
      cyl.isPickable = false;
      new PhysicsAggregate(cyl, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
    }

    logger.debug('TestRoom: colliders de fisica creados', {
      cajas:   boxColliders.length,
      pilares: pillarPositions.length,
      total:   boxColliders.length + pillarPositions.length,
    });
  }

  // ----------------------------------------------------------

  /** Coloca 4 pilares interiores a +-tileSize del origen. */
  private static _buildPillars(
    assetManager: AssetManager,
    container: AssetContainer,
    tileSize: number,
  ): void {
    const d = tileSize;
    const positions: Vector3[] = [
      new Vector3(-d, 0, -d),
      new Vector3( d, 0, -d),
      new Vector3(-d, 0,  d),
      new Vector3( d, 0,  d),
    ];

    for (const pos of positions) {
      const pillar = assetManager.instantiate(container);
      pillar.rootNode.position = pos;
    }
    logger.debug('TestRoom: pilares colocados', { count: positions.length });
  }
}
