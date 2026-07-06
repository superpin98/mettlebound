# Estado Actual — METTLEBOUND

**Última actualización:** Sprint 4-EXT Fase A cerrada + inicio pipeline assets propios (julio 2026)
**Tests:** 508 pasando (28 archivos de test)
**TypeScript:** `tsc --noEmit` limpio, 0 null bytes
**Rama git:** `sprint-4-combate`, HEAD `bee070f`
**Build:** `npm run build` limpio (solo warning chunk size Babylon — normal)

---

## Qué funciona ahora mismo

### Modo Dungeon (default al arrancar `npm run dev`)

Al arrancar, `main.ts` carga `MettleboundDungeon` (layout hardcoded, se refactorizará en Sprint 6):

1. **Modal de selección de clase** — elige entre Guerrero, Cazadora, Mago, Pícaro o Errante.
2. **Dungeon 3D completo** — hub estrella con 4 salas + 3 corredores, todo con geometría KayKit.
3. **HubRoom** (14×12u + 2 alcobas lat.) — suelo tiles, paredes, esquinas, puertas, antorchas. SpawnAltar central.
4. **CombatTriggerRoom** (norte) — sala L-shape 16×10 + brazo 6×4.
5. **InteractablesRoom** (este) — sala 14×10.
6. **LootRoom** (sur) — antesala 4×6 + cámara 6×6. Puerta norte cerrada con llave (placeholder dorado).
7. **3 corredores** de 8u de largo × 3u de ancho, con geometría KayKit.
8. **Iluminación Grimspire** — clearColor `#080612`, niebla lineal 18-35, HemisphericLight morada, DirectionalLight azul, PointLights de antorchas ambar intensity 1.2 range 6.
9. **HUD** — nombre de clase, nivel, barras HP/MP/XP, stats primarios y derivados. Badge dorado si hay puntos pendientes.
10. **Action Bar** — botones 🎒 MOCHILA [I] y 📜 PERSONAJE [C].
11. **Inventario** — slots de equipado + bolsa 16 huecos, tooltip, rareza visual.
12. **Hoja de personaje** — stats base repartibles, derivados, sets activos.
13. **Modal de subida de nivel** — repartir puntos + elegir upgrade.
14. **Personaje jugador 3D** — modelo KayKit según clase, animaciones Idle/Walking_A, WASD + cámara orbital.
15. **Física Havok** — suelo universal 300×300u, cápsula del jugador.
16. **Panel DEV** (solo dev) — +100 XP, +Item rareza, Clase, botones Dungeon/TestRoom.
17. **DEV — KnightValidation** — `unarmed_knight.glb` (asset propio pre-Blender) cargado en (3,0,0) del hub con idle animando. Controlado por flag `DEV_KNIGHT_VALIDATION` en `MettleboundDungeon.ts`.

### Modo TestRoom (botón DEV → "TestRoom" → recarga)

Sala estática original con suelo 4×4 tiles KayKit, 16 paredes, 4 esquinas, 4 columnas y 4 antorchas completas (modelo físico + PointLight + FlameEffect partículas + FlameSprite billboard animado). Accesible vía `localStorage.getItem('mb_mode') === 'testroom'`. DevTools: `__mb.mode`.

---

## Layout del dungeon actual

**Hub estrella** — HubRoom en origen (0,0,0):

```
         [CombatTriggerRoom] (0,0,21)  L-shape 16×10+brazo
                  ↕ corredor (0,0,11) len=8
                  N
                  ↕
[Interactables] ← E ← [HubRoom] → S → [corredor] → [LootRoom] (0,0,-22)
(24,0,0) 14×10     (12,0,0) len=8         (0,0,-11)       10×6 locked
```

**Puertas:**
- HubRoom Norte → CombatTriggerRoom (abierta)
- HubRoom Este → InteractablesRoom (abierta)
- HubRoom Sur → LootRoom (`isLocked: true`, placeholder dorado flotante — bug conocido)

---

## Estructura de código (`src/`)

```
src/
├── core/
│   ├── Engine.ts                    (iluminación Grimspire, cámara, HavokPlugin)
│   ├── AssetManager.ts              (loadAsset + caché + instantiate → AssetInstance)
│   └── Logger.ts
├── game/
│   ├── items/                       (sistema de items completo Sprint 3)
│   │   ├── RaritySystem.ts
│   │   ├── AffixPool.ts
│   │   ├── UniqueEffectPool.ts
│   │   ├── ItemGenerator.ts
│   │   ├── ItemStatModifiers.ts
│   │   ├── SetBonuses.ts
│   │   └── Inventory.ts
│   ├── player/
│   │   ├── PlayerController.ts      (modelo 3D, animaciones, WASD, physicsBody getter, teleportTo)
│   │   └── PlayerStats.ts           (nivel, XP, stats base + items, getSnapshot, addXp)
│   ├── progression/
│   │   ├── XPSystem.ts
│   │   └── UpgradePool.ts
│   ├── stats/
│   │   └── StatCalculator.ts        (calcDerivedStats → 22 campos)
│   └── world/
│       ├── Room.ts                  (clase abstracta + placeAt + linkConnection)
│       ├── ExplorationRoom.ts
│       ├── CombatRoom.ts            (ÚNICA con Grid táctico)
│       ├── Corridor.ts              (con _buildKayKitGeometry, 8 directions declaradas)
│       ├── Dungeon.ts               (registerRoom, transitionToRoom, eventBus)
│       ├── RoomTrigger.ts           (Havok trigger volumes)
│       ├── RoomEventBus.ts          (pub/sub tipado)
│       ├── LightingTransition.ts    (fade in/out de luces)
│       ├── MettleboundDungeon.ts    (factory hardcoded — refactor en Sprint 6)
│       │                             flag DEV_KNIGHT_VALIDATION al principio
│       ├── TestRoom.ts              (sala estática original — INTACTA)
│       ├── TargetDummy.ts
│       ├── FlameEffect.ts           (ParticleSystem partículas ascendentes)
│       ├── FlameSprite.ts           (plane 3D billboard, UV scrolling, NEAREST)
│       ├── Tile.ts, Grid.ts, GridRenderer.ts
│       ├── dev/
│       │   └── KnightValidation.ts  (DEV — carga unarmed_knight.glb en hub)
│       ├── utils/
│       │   └── measureTile.ts
│       ├── types/
│       │   └── room.types.ts        (ConnectionDirection 8 valores + isLocked)
│       ├── rooms/
│       │   ├── RoomGeometry.ts      (buildMountedTorch, buildFloorTiles, buildWallSegments)
│       │   ├── HubRoom.ts           (hub principal 14×12 + alcobas)
│       │   ├── CombatTriggerRoom.ts
│       │   ├── InteractablesRoom.ts
│       │   └── LootRoom.ts
│       └── props/
│           └── SpawnAltar.ts
├── stats/
├── ui/
│   ├── HUD.ts
│   ├── InventoryUI.ts
│   ├── ItemTooltip.ts
│   ├── CharacterSheet.ts
│   ├── LevelUpModal.ts
│   ├── ClassSelectionModal.ts
│   ├── PanelManager.ts
│   ├── ActionBar.ts
│   └── UIScale.ts
├── config/
│   ├── classes.config.ts            (mapeo clase→modelo, whitelist armas, display names)
│   ├── items.config.ts
│   └── balance.ts
└── types/
    ├── items.types.ts
    ├── interaction.types.ts
    └── spatial.types.ts
```

---

## Estructura de assets (`public/assets/`)

```
public/assets/
├── models/
│   ├── characters/
│   │   ├── Knight.glb               (KayKit placeholder — Guerrero)
│   │   ├── Rogue.glb                (KayKit placeholder — Cazadora)
│   │   ├── Mage.glb                 (KayKit placeholder — Mago)
│   │   ├── Rogue_Hooded.glb         (KayKit placeholder — Pícaro)
│   │   ├── Barbarian.glb            (KayKit placeholder — Errante)
│   │   ├── unarmed_knight.glb       (PRIMER ASSET PROPIO — validación pre-Blender)
│   │   │                             4698 tris, rig Mixamo, set unarmed
│   │   │                             scale=0.01 (Mixamo cm→metros)
│   │   │                             PBRMaterial reemplazado por StandardMaterial
│   │   └── skeletons/               (KayKit Skeletons CC0 — Rusty)
│   └── dungeon/
│       ├── floor_tile_large.gltf.glb
│       ├── wall.gltf.glb
│       ├── wall_corner.gltf.glb
│       ├── wall_doorway.glb
│       └── wall_gated.gltf.glb
├── sprites/
│   └── flame.png                    (CC0 BenHickling, 640×384, grid 10×6, 60 frames)
└── textures/
```

**Staging assets propios (FUERA del repo):**
`C:\Users\dconde\Desktop\mettlebound-assets-wip\knight\`
- `unarmed/` — Run (con skin), Idle, Hit, Death_A (sin skin)
- `sword-and-shield/` — Idle, Run, Attack_A, Hit (sin skin)
- `Death_A.fbx` — compartida entre sets

---

## Tests — 508 en total (28 archivos)

| Bloque | Tests |
|---|---|
| items/RaritySystem | 24 |
| items/ItemGenerator | 30 |
| items/SetBonuses | 20 |
| items/Inventory | 30 |
| items/AffixPool | 20 |
| stats/StatCalculator | 22 |
| progression/XPSystem | 18 |
| progression/UpgradePool | 8 |
| progression/LevelUp | 16 |
| integration/StatsFromItems | 24 |
| core/AssetManager | 15 |
| player/PlayerStatsHp | 11 |
| game/world/RoomTrigger | 11 |
| game/world/LightingTransition | 17 |
| combat/Combatant | 12 |
| config/classModel | 4 |
| …resto world/dungeon | ~226 |

---

## Pipeline de assets propios — Estado julio 2026

### Guerrero (Knight) — EN PROGRESO

Pipeline (sección 2.11 del handoff):

| Paso | Herramienta | Estado |
|---|---|---|
| 4 vistas ortogonales | Copilot Image Creator | ✅ hecho |
| Image to 3D | Meshy (low-poly, quads, T-pose) | ✅ hecho — 2601 quads |
| Texturizado | Meshy (texto, eliminar iluminación ON, PBR ON) | ✅ hecho — acero/óxido Grimspire |
| Auto-rig | Meshy | ❌ DESCARTADO — colapsa modelo armadura 2 veces |
| Rig + animaciones | Mixamo | ✅ hecho — aguanta bien |
| Sets descargados | Mixamo | ✅ unarmed (Idle/Run/Hit/Death_A) + sword-and-shield (Idle/Run/Attack_A/Hit) |
| Blender | Fusionar malla+anims, pivote pies, export GLB | ⏳ PENDIENTE (en casa) |
| Validación dungeon | Babylon + Grimspire | 🔄 EN CURSO (unarmed_knight.glb DEV tool) |
| Armas iniciales | Espada 1H + escudo redondo (Meshy) | 🔄 EN GENERACIÓN |

### Nombres exactos de animaciones en unarmed_knight.glb

| Nombre en GLB | Mapeo canónico futuro |
|---|---|
| `mixamo.com` | T-pose/bind pose — IGNORAR |
| `Knight_unarmed_idle` | → `Idle` |
| `Knight_unarmed_run_forward` | → `Run` |
| `Knight_unarmed_attack` | → `Attack_A` |
| `Knight_unarmed_hit` | → `Hit` |
| `Knight_death` | → `Death_A` |

> **Nota**: la normalización de nombres (Knight_unarmed_idle → Idle) se hace en
> Blender al fusionar. No tocar hasta esa sesión.

### Lección crítica: Mixamo GLB en Babylon

- **Scale obligatorio: 0.01** — Mixamo exporta en centímetros. El nodo mesh
  tiene `scale=[100,100,100]` internamente; la jerarquía de huesos está en cm
  (Hips a Y=104.784). Babylon lee GLTF en metros → sin corrección, el personaje
  mide 170 metros.
- **PBRMaterial de Meshy incompatible con WebGL limit**: Meshy activa clearcoat,
  IBL, sheen, spherical harmonics y subSurface aunque el asset no los use.
  Excede `GL_MAX_VERTEX_UNIFORM_BUFFERS (12)`. Solución en `KnightValidation.ts`:
  desactivar todas las features, luego reemplazar PBR → StandardMaterial con
  albedoTexture como diffuseTexture. Esto es un workaround DEV; en producción
  habrá que o bien re-exportar desde Blender con material Simple/Unlit o usar
  este mismo stripping.
- **`useTextureToStoreBoneMatrices = true`**: aplicar en el skeleton para evitar
  contribución adicional de uniform blocks de huesos.
- **`PBRSubSurfaceConfiguration` no tiene `isEnabled`** — desactivar con
  `isRefractionEnabled`, `isTranslucencyEnabled`, `isScatteringEnabled`.
- **`useSphericalHarmonics` no existe en PBRMaterial de Babylon 9** — usar
  `forceIrradianceInFragment = false`.

---

## Deuda visual conocida (Fase A — NO arreglada aún)

1. **Antorchas mal posicionadas en doorways** — aparecen pegadas al marco.
2. **Salas con paredes incompletas** — huecos donde debería haber muro.
3. **Candado dorado flotante** — placeholder de puerta sur del hub fuera de posición.
4. **Alineación fina entre tiles** — hexágonos KayKit no casan perfectamente en bordes.

---

## Deuda técnica NO bloqueante

- **Suelo físico universal 300×300u provisional** en `MettleboundDungeon.ts`.
  Refinar en Fase B con colliders por sala.
- **Trigger volumes Havok** — TODOs abiertos desde A2-b2. Validar `isTrigger` +
  `COLLISION_FINISHED` en navegador.
- **Diagonales Corridor.ts** — lanza `Error` en los 4 cardinales diagonales.
  Implementación real en Sprint 6.
- **Flag `DEV_KNIGHT_VALIDATION = true`** en `MettleboundDungeon.ts` — poner a
  `false` cuando se termine la validación visual.
- **Nombres de animación sucios** (`Knight_unarmed_idle` en vez de `Idle`) —
  normalizar en la sesión Blender.

---

## Arquitectura y patrones canónicos

### AssetManager — patrón de instanciación

```typescript
const container = await assetManager.loadAsset(baseUrl, filename);
const instance  = assetManager.instantiate(container); // → AssetInstance
// instance.rootNode  → TransformNode
// instance.animationGroups → AnimationGroup[]
// instance.dispose() → limpieza completa
```

### Sprites 2D — NUNCA SpriteManager

`MeshBuilder.CreatePlane` + `billboardMode_Y` + `NEAREST_SAMPLINGMODE` +
`transparencyMode ALPHATEST` + `disableLighting=true` + UV scrolling.
Ref: `FlameSprite.ts`.

### Prop con luz emergente

`PointLight` pertenece al prop. Si el prop se destruye, la luz también.
Ref: `buildMountedTorch()` en `RoomGeometry.ts`.

### Prop montado en pared

`TransformNode` wrapper con `rotation.y = atan2(N.x, N.z) + PI`.
Ref: antorchas en `HubRoom._buildProps()`.

### Z-index UI

```
1000  HUD
2000  Action Bar
3000  DEV panel + UIScale
4000  Panels (InventoryUI, CharacterSheet)
8000  Modals (LevelUpModal, ClassSelectionModal)
9999  Tooltips (ItemTooltip)
```

### maxSimultaneousLights = 8

Aplicar en TODOS los materiales KayKit + `scene.markAllMaterialsAsDirty(2)`.
Con 2 globales + 4 antorchas = 6 → el límite por defecto de Babylon (4) truncaría 2 PointLights.

---

## Modo dual TestRoom / Dungeon

`main.ts` — `localStorage.getItem('mb_mode')`:
- `'dungeon'` (default): carga `buildMettleboundDungeon` + `KnightValidation` si flag activo.
- `'testroom'`: carga `TestRoom` original con llamas completas.

Botones DEV "Dungeon" y "TestRoom" → `localStorage.setItem` + `window.location.reload()`.
DevTools: `__mb.mode`, `__mb.dungeon`, `__mb.hub`.

---

## Siguiente bloque de trabajo

En orden de prioridad:

1. **David valida visualmente el Guerrero** en el navegador (escala, pivote, idle, textura).
2. **Visual polish Fase A** (4 bugs de deuda visual listados arriba). ~1-2 sesiones Cowork.
   Se puede paralelizar: David en Meshy generando armas / Cowork arreglando bugs.
3. **Sesión Blender** (en casa): pivote a pies, fusionar malla + animaciones en GLB único,
   renombrar anims a canónicos (Idle/Run/Attack_A/Hit/Death_A), ajustar PBR, export.
4. **Validación final del Guerrero** en dungeon con GLB cocinado.
5. **Fase B Sprint 4-EXT** — motor de combate por turnos:
   - Decisión primera: modelo de movimiento (BG3 vs 1-acción)
   - Sistema de turnos DEX + encadenamiento
   - Snapshot/clonado de sala para transición exploración→combate

*Actualizado al cerrar sesión de julio 2026 — pipeline assets + KnightValidation DEV tool.*
