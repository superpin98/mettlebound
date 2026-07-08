# Estado Actual — METTLEBOUND

**Última actualización:** Sprint 4-EXT — WeaponStance + animset SNS/base por equipamiento (julio 2026)
**Tests:** 234 pasando en Windows (sandbox Linux no puede correr tests: rolldown native binding ausente — pre-existente)
**TypeScript:** `tsc --noEmit` limpio, 0 errores
**Rama git:** `sprint-4-combate`, HEAD `b392ff9` (pendiente commit de esta sesión)
**Build:** `npm run build` limpio (solo warning chunk size Babylon — normal)

---

## Escena activa: PreviewScene (modo validación)

`main.ts` carga `PreviewScene` directamente — es la escena de trabajo mientras
se valida el Guerrero y se prepara Fase B (combate). El dungeon completo
(`MettleboundDungeon`) sigue existiendo pero no está conectado en `main.ts`.

Al arrancar `npm run dev`:

1. **Modal de selección de clase** → elige clase.
2. **PreviewScene** — grid plano 20×20u, suelo físico Havok.
3. **Guerrero (Mixamo)** — `knight_fixed.glb` cargado automáticamente, idle animando.
4. **Iluminación neutra de validación** — HemisphericLight 1.0 blanca + 3 DirectionalLights
   suaves. Sin niebla, sin antorchas. Para ver geometría y textura con claridad.
5. **HUD, Action Bar, Inventario, Hoja de personaje** — todos funcionales.
6. **Panel DEV** — +100 XP, +Item rareza, Clase.

---

## Pipeline Blender — VALIDADO (julio 2026)

El Guerrero (knight_fixed.glb) está en producción. Pipeline completo:

| Paso | Estado |
|---|---|
| 4 vistas ortogonales (Copilot Image Creator) | ✅ |
| Image to 3D — Meshy, low-poly, T-pose | ✅ 2601 quads |
| Texturizado — Meshy, PBR acero/óxido Grimspire | ✅ |
| Auto-rig Meshy | ❌ descartado (colapsa geometría armadura) |
| Rig + animaciones — Mixamo | ✅ unarmed + sword-and-shield sets |
| Blender: importar FBX base + anims, exportar GLB | ✅ knight_fixed.glb 7.2 MB |
| Carga en Babylon + validación visual | ✅ visible, escala correcta, idle animando |

### knight_fixed.glb — datos técnicos

- **Archivo:** `public/assets/models/characters/knight_fixed.glb` (7.2 MB)
- **Geometría:** 1 mesh, 2357 vértices, 1 armature, 41 huesos, root `mixamorig:Hips`
- **Escala:** metros (1.86m altura en Babylon, sin corrección adicional)
- **Animaciones:** 5 actions — Idle (72f), Run (27f), Attack_A (36f), Hit (37f), Death_A (118f)
- **Clase config:** `modelAssetId: 'knight_fixed.glb'`, `isMixamo: true`, sin `modelScale`

### Lecciones críticas pipeline Mixamo → Blender → Babylon

1. **FBX Mixamo exporta en centímetros** → `automatic_bone_orientation=True` en import Blender.
   Blender normaliza a metros → GLB exportado ya en escala correcta. NO aplicar `modelScale: 0.01`.
2. **GLBs web-merged (sin Blender)** → skeleton jerarquía rota ("Skeleton node is not a common root")
   → deformación con animación. Solución: siempre reexportar desde Blender.
3. **`isMixamo: true` en ClassDefinition** controla:
   - Skip de `_applyAttachmentVisibility` (Mixamo mesh = nodo único, sin patrón KayKit `_Body/_Head`)
   - Conversión PBR → StandardMaterial (Meshy activa features que exceden `GL_MAX_VERTEX_UNIFORM_BUFFERS`)
   - NO controla escala (eso va en `modelScale` opcional — si no se define, no se escala)
4. **`resolveAnimMap`** en PlayerController: matching por contenido (`includes('idle')`, etc.),
   no por igualdad exacta. Filtra `mixamo.com` (bind pose). Seguro con `noUncheckedIndexedAccess`.
5. **Edit tool CRLF**: archivos Windows CRLF se truncan con Edit tool en sesiones largas.
   Usar Python `rb`/`wb` para ediciones grandes.

---

## Cambios de esta sesión (casa PC, julio 2026)

Archivos modificados respecto a HEAD `fab6274`:

| Archivo | Cambio |
|---|---|
| `src/config/classes.config.ts` | guerrero: `modelAssetId: 'knight_fixed.glb'`, `isMixamo: true` |
| `src/game/player/PlayerController.ts` | `resolveAnimMap` flexible, guard `isMixamo`, escala condicional |
| `src/game/world/PreviewScene.ts` | Iluminación neutra de validación (sin Grimspire) |
| `public/assets/models/characters/knight_fixed.glb` | NUEVO — GLB Blender 7.2 MB |
| `.gitignore` | Añadido `assets_wip/`, `*.blend`, `*.blend1` |

---

## knight_armed_v2.glb — 9 animaciones + armas fusionadas (julio 2026) ✅ FINAL

- **Archivo:** `public/assets/models/characters/knight_armed_v2.glb` (22.42 MB)
- **Animaciones (9):** Idle (0–57f), Run (0–21f), Attack_A (0–28f), Hit (0–29f), Death_A (0–94f) + Idle_SNS (1–77f), Run_SNS (1–24f), Attack_SNS (1–37f), Hit_SNS (1–28f) — todas con `use_fake_user=True`
- **Espada:** parented a `mixamorig:RightHand` (DIESTRO), location (-0.4231, 0.1664, 1.3142), rotation (0°,0°,0°), scale 0.42
- **Escudo:** parented a `mixamorig:LeftForeArm` (DIESTRO), location (-0.0443, -0.4507, 1.0646), rotation (0°,0°,0°), scale 0.2944
- **Posiciones ajustadas manualmente por David en Blender** — espada en mano derecha en alto (Idle_SNS), escudo cubriendo antebrazo izquierdo
- **Slot fix Blender 5.x:** asignación de action requiere `animation_data.action_slot = action.slots[0]`; sin esto las animaciones no se aplican aunque `.action` esté seteado
- **classes.config.ts:** `modelAssetId: 'knight_armed_v2.glb'` ✅ actualizado
- **PENDIENTE commit:** `git add public/assets/models/characters/knight_armed_v2.glb src/config/classes.config.ts docs/CURRENT_STATE.md` + push

## Sistema WeaponStance -- animset por equipamiento (julio 2026) ✅

### Archivos nuevos/modificados

| Archivo | Cambio |
|---|---|
|  | + union; + en  e  |
|  |  lleva  |
|  | Propaga  del template al item generado |
|  | NUEVO -- , , ,  |
|  |  con filtro SNS/base;  recalculable en caliente; suscripcion a eventos de equip |
|  |  en ; filtro SNS/base en  y  |

### Logica

- : slot  vacio o subtype desconocido ->  (set base);  ->  (set SNS).
- : , .
- : para cada regla, separa candidatos en SNS/base y elige el set preferido con fallback al otro. Death siempre base (no existe Death_SNS).
- Cambio en caliente:  ->  ->  -> re-resuelve y reanuda Idle del nuevo set.
- El ataque en curso no se interrumpe al cambiar stance.

### WeaponSubType extensible

 -- los no-SNS hacen fallback a  hasta que existan sus animsets.

### PENDIENTE commit

---

## Sistema de visibilidad de armas (julio 2026) ✅

Espada y escudo se ocultan en estado `unarmed` y se muestran al equipar `sword_and_shield`.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/game/player/PlayerController.ts` | `_weaponMeshes`, `_findAndCacheWeaponMeshes()`, `_setWeaponVisibility()` |
| `src/game/combat/CombatEntity.ts` | Idem, para enemigos con armas |

### Logica

- Al cargar modelo: `_findAndCacheWeaponMeshes()` escanea todos los meshes del `rootNode`, filtra los que contengan `sword` o `shield` en el nombre (limpiando el sufijo `_inst{N}` de Babylon).
- Los meshes cacheados en `_weaponMeshes[]`.
- `_setWeaponVisibility(visible)` itera el array y setea `isVisible`.
- Hook en `_refreshAnimsForStance`: primera linea (antes del null check), siempre se ejecuta.
- Hook en `loadModel`: tras cachear meshes, aplica visibilidad segun stance actual.

### Nombres de meshes esperados en Babylon

Los objetos Blender (`sword`, `shield`) se exportan como nodos GLTF y Babylon los instancia como:
- `sword_inst1` (o `sword_inst0` segun contador de instancias)
- `shield_inst1`

El logger confirma los nombres reales al arrancar: `PlayerController: weapon meshes detectados { count, names }`.

### TypeScript

`tsc --noEmit` limpio tras todos los cambios de esta sesion.


## knight_armed.glb — fusión espada + escudo (julio 2026)

- **Archivo:** `public/assets/models/characters/knight_armed.glb` (22.7 MB)
- **Geometría:** knight_fixed + sword_1h + shield_round_1h
- **Espada:** parented a `mixamorig:LeftHand` (caballero ZURDO), scale 0.5
- **Escudo:** parented a `mixamorig:RightForeArm`, scale 0.3
- **Animaciones:** 5 (Idle 72f, Run 27f, Attack_A 36f, Hit 37f, Death_A 118f)
- **FCurves fix:** todas las FCurves de traslación escaladas ×0.01 (615 curvas, 35.670 keyframes) — corrige bug Mixamo cm→m
- **Armature:** escala aplicada 0.01→1.0 antes del parenting
- **PENDIENTE (código Babylon):** cambiar `modelAssetId` de knight a `knight_armed.glb` y ajustar orientación y offsets de espada/escudo en mano
- **PENDIENTE:** Attack_A sigue rota (explosión estrella, pre-existing en knight_fixed.glb)

### Proceso técnico confirmado para bone parenting con Mixamo en Blender 5.x

1. `transform_apply(scale=True)` para fijar escala 0.01→1.0 del armature
2. Escalar todas las FCurves de traslación ×0.01 (API Blender 5.x: `action.layers→strips→channelbags→fcurves`)
3. Posicionar mesh del arma en world pos del hueso objetivo (frame 1, depsgraph evaluated)
4. Parent via OPERADOR `bpy.ops.object.parent_set(type='BONE', keep_transform=True)` con `arm.data.bones.active` establecido — NO via API directa (da posiciones incorrectas)

---

## Siguiente bloque de trabajo

En orden de prioridad:

1. **Conectar knight_armed.glb en código** — cambiar `modelAssetId: 'knight_fixed.glb'` → `'knight_armed.glb'` en `classes.config.ts`, verificar que armas son visibles y se mueven con el skeleton
2. **Ajustar orientación/offset de armas** — probablemente la espada y el escudo necesiten rotación local para quedar bien en la mano. Esto se hace en Blender (rotar el mesh del arma antes de emparentar) o ajustando `localMatrix` en Babylon.
3. **Conectar clases restantes** — las otras 4 clases siguen usando modelos KayKit (OK de momento).
4. **Fase B Sprint 4-EXT** — motor de combate por turnos:
   - Decisión primera: modelo de movimiento (BG3 vs 1-acción)
   - Sistema de turnos DEX + encadenamiento
   - Snapshot/clonado de sala para transición exploración→combate
4. **Futuro** — renombrar `knight_fixed.glb` → `Knight.glb` y retirar el placeholder KayKit.
5. **Futuro** — Visual polish Fase A (4 bugs de deuda visual en dungeon).

---

## Deuda visual conocida (Dungeon — Fase A, NO bloqueante)

1. **Antorchas mal posicionadas en doorways.**
2. **Salas con paredes incompletas.**
3. **Candado dorado flotante** — placeholder puerta sur del hub.
4. **Alineación fina entre tiles** KayKit en bordes.

---

## Arquitectura y patrones canónicos

### AssetManager — patrón de instanciación

```typescript
const container = await assetManager.loadAsset(baseUrl, filename);
const instance  = assetManager.instantiate(container); // → AssetInstance
// instance.rootNode       → TransformNode
// instance.animationGroups → AnimationGroup[]
// instance.dispose()      → limpieza completa
```

### Sprites 2D — NUNCA SpriteManager

`MeshBuilder.CreatePlane` + `billboardMode_Y` + `NEAREST_SAMPLINGMODE` +
`transparencyMode ALPHATEST` + `disableLighting=true` + UV scrolling.
Ref: `FlameSprite.ts`.

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

Aplicar en TODOS los materiales cuando haya más de 4 luces en escena.
Con dungeon real: 2 globales + 4 antorchas = 6 → límite por defecto de Babylon (4) truncaría 2.

---

## Modo dual TestRoom / Dungeon (desconectado de main.ts)

`MettleboundDungeon` y `TestRoom` existen en `src/game/world/` pero `main.ts`
apunta a `PreviewScene`. Para reconectar: editar `main.ts`.

DevTools (cuando estaban conectados): `__mb.mode`, `__mb.dungeon`, `__mb.hub`.

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
| ...resto world/dungeon | ~226 |

*Actualizado al cerrar sesión de julio 2026 — pipeline Blender validado, knight_fixed.glb en PreviewScene.*
