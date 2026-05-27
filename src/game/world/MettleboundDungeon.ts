// Imports externos (Babylon.js)
import {
  MeshBuilder,
  Vector3,
  PhysicsAggregate,
  PhysicsShapeType,
} from '@babylonjs/core';
import type { Scene, PhysicsBody } from '@babylonjs/core';

// Imports internos
import type { AssetManager } from '@/core/AssetManager';
import { Dungeon }             from '@/game/world/Dungeon';
import { Corridor }            from '@/game/world/Corridor';
import { HubRoom }             from '@/game/world/rooms/HubRoom';
import { CombatTriggerRoom }   from '@/game/world/rooms/CombatTriggerRoom';
import { InteractablesRoom }   from '@/game/world/rooms/InteractablesRoom';
import { LootRoom }            from '@/game/world/rooms/LootRoom';
import { logger }              from '@/core/Logger';

// ============================================================
// MettleboundDungeonResult -- lo que devuelve el factory
// ============================================================

/**
 * Referencias a todas las entidades del dungeon principal de Mettlebound.
 * Permite a main.ts acceder a hub.getSpawnPoint(), dungeon.events, etc.
 */
export interface MettleboundDungeonResult {
  dungeon:    Dungeon;
  hub:        HubRoom;
  combat:     CombatTriggerRoom;
  interacts:  InteractablesRoom;
  loot:       LootRoom;
  corrCombat: Corridor;
  corrInter:  Corridor;
  corrLoot:   Corridor;
}

// ============================================================
// Constantes de layout
// ============================================================

// Longitud de cada corredor en unidades Babylon.
// Calculado en A2-b4.2 para alinear puertas exactamente:
//   hub.north_door(z=7)  -- corrCombat.south(z=7)  -- corrCombat.north(z=15) -- combat.south(z=15)
//   hub.east_door(x=8)   -- corrInter.west(x=8)   -- corrInter.east(x=16)  -- inter.west(x=16)
//   hub.south_door(z=-7) -- corrLoot.north(z=-7)  -- corrLoot.south(z=-15) -- loot.north(z=-15)
const CORRIDOR_LEN = 8;

// Anchura de cada corredor (valor por defecto de Corridor = 3u)
const CORRIDOR_W = 3;

// Grosor del collider de suelo universal
const FLOOR_T = 0.1;

// Dimension del suelo universal (cubre todas las salas y pasillos)
const UNIVERSAL_FLOOR_SIZE = 300;

// ============================================================
// Posiciones world del layout estrella (calculadas en A2-b4.2)
// ============================================================

// HubRoom -- centrada en el origen del mundo
const HUB_POS        = { x: 0,  y: 0, z: 0   };

// Corredor Hub->Combat: puerta sur alineada con hub.door_north (z=7)
//   startDir='south' -> puerta_sur = centro.z - L/2 = 7 -> centro.z = 11
const CORR_COMBAT_POS = { x: 0,  y: 0, z: 11  };

// CombatTriggerRoom: puerta sur local (z=-6) alineada con corrCombat.north (z=15)
//   combat_centro.z - 6 = 15 -> combat_centro.z = 21
const COMBAT_POS      = { x: 0,  y: 0, z: 21  };

// Corredor Hub->Interactables: puerta oeste alineada con hub.door_east (x=8)
//   startDir='west' -> puerta_oeste = centro.x - L/2 = 8 -> centro.x = 12
const CORR_INTER_POS  = { x: 12, y: 0, z: 0   };

// InteractablesRoom: puerta oeste local (x=-8) alineada con corrInter.east (x=16)
//   inter_centro.x - 8 = 16 -> inter_centro.x = 24
const INTER_POS       = { x: 24, y: 0, z: 0   };

// Corredor Hub->Loot: puerta norte alineada con hub.door_south (z=-7)
//   startDir='north' -> puerta_norte = centro.z + L/2 = -7 -> centro.z = -11
const CORR_LOOT_POS   = { x: 0,  y: 0, z: -11 };

// LootRoom: puerta norte local (z=+7) alineada con corrLoot.south (z=-15)
//   loot_centro.z + 7 = -15 -> loot_centro.z = -22
const LOOT_POS        = { x: 0,  y: 0, z: -22 };

// ============================================================
// buildUniversalFloor -- suelo fisico provisional para A2-b4.2
// ============================================================

/**
 * Crea un collider de suelo plano invisible de 300x300 unidades.
 *
 * CUANDO llamar: ANTES de playerController.initPhysics().
 * Si la capsula Havok del jugador se crea antes de que exista
 * el suelo, caera al vacio durante el primer tick de fisica.
 *
 * Solucion provisional hasta Fase B (colliders por sala).
 */
export function buildUniversalFloor(scene: Scene): void {
  const floorMesh = MeshBuilder.CreateBox(
    'universal_floor_collider',
    { width: UNIVERSAL_FLOOR_SIZE, height: FLOOR_T, depth: UNIVERSAL_FLOOR_SIZE },
    scene,
  );
  floorMesh.position   = new Vector3(0, -FLOOR_T / 2, 0); // cara superior exactamente en y=0
  floorMesh.isVisible  = false;
  floorMesh.isPickable = false;
  new PhysicsAggregate(floorMesh, PhysicsShapeType.BOX, { mass: 0 }, scene);
  logger.debug('MettleboundDungeon: suelo universal creado (300x300, y=0).');
}

// ============================================================
// buildMettleboundDungeon -- factory principal
// ============================================================

/**
 * Construye el dungeon principal de Mettlebound en layout estrella:
 *
 *              [CombatTriggerRoom]
 *                      |  corr_hub_combat
 *    [Interactables] --+-- [HubRoom]
 *        corr_hub_inter         |  corr_hub_loot
 *                           [LootRoom]
 *
 * Prerequisito: buildUniversalFloor(scene) + playerController.initPhysics()
 * deben haberse llamado antes de este factory.
 *
 * Orden de operaciones:
 *   1. Instanciar 4 salas + 3 corredores.
 *   2. placeAt() segun layout estrella.
 *   3. build() async en paralelo (geometria + props).
 *   4. linkConnection() entre puertas adyacentes.
 *   5. Crear Dungeon y registrar 7 entidades con TriggerBounds.
 *
 * @param scene        Escena Babylon activa (Havok ya inicializado).
 * @param assetManager Gestor de assets para cargar modelos GLB.
 * @param playerBody   PhysicsBody de la capsula Havok del jugador.
 */
export async function buildMettleboundDungeon(
  scene:        Scene,
  assetManager: AssetManager,
  playerBody:   PhysicsBody,
): Promise<MettleboundDungeonResult> {

  logger.info('MettleboundDungeon: iniciando construccion del layout estrella.');

  // ------------------------------------------------------------------
  // 1. Instanciar salas y corredores
  // ------------------------------------------------------------------

  const hub = new HubRoom({
    id: 'hub_01',
    scene,
    assetManager,
  });

  const combat = new CombatTriggerRoom({
    id: 'combat_01',
    scene,
    assetManager,
  });

  const interacts = new InteractablesRoom({
    id: 'inter_01',
    scene,
    assetManager,
  });

  const loot = new LootRoom({
    id: 'loot_01',
    scene,
    assetManager,
  });

  // Corredor Hub <-> Combat (eje Z, startDir='south' -> entrada por el sur del corredor)
  const corrCombat = new Corridor({
    id:             'corr_hub_combat',
    scene,
    assetManager,
    length:         CORRIDOR_LEN,
    width:          CORRIDOR_W,
    startDirection: 'south',
  });

  // Corredor Hub <-> Interactables (eje X, startDir='west' -> entrada por el oeste)
  const corrInter = new Corridor({
    id:             'corr_hub_inter',
    scene,
    assetManager,
    length:         CORRIDOR_LEN,
    width:          CORRIDOR_W,
    startDirection: 'west',
  });

  // Corredor Hub <-> Loot (eje Z negativo, startDir='north' -> entrada por el norte)
  const corrLoot = new Corridor({
    id:             'corr_hub_loot',
    scene,
    assetManager,
    length:         CORRIDOR_LEN,
    width:          CORRIDOR_W,
    startDirection: 'north',
  });

  // ------------------------------------------------------------------
  // 2. Posicionar cada entidad en world space
  // ------------------------------------------------------------------

  hub.placeAt(HUB_POS);
  corrCombat.placeAt(CORR_COMBAT_POS);
  combat.placeAt(COMBAT_POS);
  corrInter.placeAt(CORR_INTER_POS);
  interacts.placeAt(INTER_POS);
  corrLoot.placeAt(CORR_LOOT_POS);
  loot.placeAt(LOOT_POS);

  logger.debug('MettleboundDungeon: posiciones world asignadas.');

  // ------------------------------------------------------------------
  // 3. Construir geometria + props en paralelo
  // ------------------------------------------------------------------

  await Promise.all([
    hub.build(),
    combat.build(),
    interacts.build(),
    loot.build(),
    corrCombat.build(),
    corrInter.build(),
    corrLoot.build(),
  ]);

  logger.info('MettleboundDungeon: todas las salas y corredores construidos.');

  // ------------------------------------------------------------------
  // 4. Vincular ConnectionPoints (linkedRoomId) entre entidades adyacentes
  //
  // IDs de puerta:
  //   Salas:      `${room.id}_door_${direction}`
  //   Corredores: `door_${corridor.id}_${direction}`
  // ------------------------------------------------------------------

  // Hub <-> corrCombat <-> combat
  hub.linkConnection('hub_01_door_north',                'corr_hub_combat');
  corrCombat.linkConnection('door_corr_hub_combat_south', 'hub_01'        );
  corrCombat.linkConnection('door_corr_hub_combat_north', 'combat_01'     );
  combat.linkConnection('combat_01_door_south',          'corr_hub_combat');

  // Hub <-> corrInter <-> interacts
  hub.linkConnection('hub_01_door_east',                 'corr_hub_inter' );
  corrInter.linkConnection('door_corr_hub_inter_west',   'hub_01'         );
  corrInter.linkConnection('door_corr_hub_inter_east',   'inter_01'       );
  interacts.linkConnection('inter_01_door_west',         'corr_hub_inter' );

  // Hub <-> corrLoot <-> loot (la puerta sur del hub tiene isLocked=true)
  hub.linkConnection('hub_01_door_south',                'corr_hub_loot'  );
  corrLoot.linkConnection('door_corr_hub_loot_north',    'hub_01'         );
  corrLoot.linkConnection('door_corr_hub_loot_south',    'loot_01'        );
  loot.linkConnection('loot_01_door_north',              'corr_hub_loot'  );

  logger.debug('MettleboundDungeon: ConnectionPoints vinculados.');

  // ------------------------------------------------------------------
  // 5. Crear Dungeon y registrar las 7 entidades con TriggerBounds AABB
  //
  // TriggerBounds: cajas generosas, center.y = height/2 para cubrir
  // de y=0 a y=height (incluye la capsula del jugador de 2u de alto).
  // Provisionales hasta Fase B (calculo automatico por _areas).
  // ------------------------------------------------------------------

  const dungeon = new Dungeon({ scene, assetManager, playerBody });

  // HubRoom: area principal 14x12 + alcobas laterales 2x4
  dungeon.registerRoom(hub, {
    center: { x: HUB_POS.x,         y: 1.5, z: HUB_POS.z         },
    width:  22,  height: 3,  depth:  16,
  });

  // Corredor Hub->Combat: 3u ancho x 8u largo, eje Z
  dungeon.registerRoom(corrCombat, {
    center: { x: CORR_COMBAT_POS.x, y: 1.5, z: CORR_COMBAT_POS.z },
    width:  5,   height: 3,  depth:  10,
  });

  // CombatTriggerRoom: L-shape (main 10x10 + brazo norte 6x4)
  // Centro geometrico local en z=2 (promedio de -5 a 9)
  dungeon.registerRoom(combat, {
    center: { x: COMBAT_POS.x,      y: 1.5, z: COMBAT_POS.z + 2  },
    width:  12,  height: 3,  depth:  16,
  });

  // Corredor Hub->Interactables: 8u largo x 3u ancho, eje X
  dungeon.registerRoom(corrInter, {
    center: { x: CORR_INTER_POS.x,  y: 1.5, z: CORR_INTER_POS.z  },
    width:  10,  height: 3,  depth:  5,
  });

  // InteractablesRoom: 14x10
  dungeon.registerRoom(interacts, {
    center: { x: INTER_POS.x,       y: 1.5, z: INTER_POS.z        },
    width:  16,  height: 3,  depth:  12,
  });

  // Corredor Hub->Loot: 8u largo x 3u ancho, eje Z negativo
  dungeon.registerRoom(corrLoot, {
    center: { x: CORR_LOOT_POS.x,   y: 1.5, z: CORR_LOOT_POS.z   },
    width:  5,   height: 3,  depth:  10,
  });

  // LootRoom: camara 6x6 (z[0,6]) + antesala 4x6 (z[-6,0]), centro z=0 world
  dungeon.registerRoom(loot, {
    center: { x: LOOT_POS.x,        y: 1.5, z: LOOT_POS.z         },
    width:  8,   height: 3,  depth:  14,
  });

  logger.info('MettleboundDungeon: dungeon listo. 7 entidades registradas.', {
    rooms: [
      'hub_01', 'corr_hub_combat', 'combat_01',
      'corr_hub_inter', 'inter_01',
      'corr_hub_loot',  'loot_01',
    ],
  });

  return { dungeon, hub, combat, interacts, loot, corrCombat, corrInter, corrLoot };
}
