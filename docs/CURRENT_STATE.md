# Estado Actual — METTLEBOUND

**Última actualización:** Sprint 4-EXT — Pipeline Blender validado + Guerrero cargando en PreviewScene (julio 2026)
**Tests:** 508 pasando (28 archivos de test)
**TypeScript:** `tsc --noEmit` limpio, 0 errores
**Rama git:** `sprint-4-combate`, HEAD `fab6274`
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

## Siguiente bloque de trabajo

En orden de prioridad:

1. **David valida visualmente el Guerrero** — textura, escala, idle. ¿Pivote en pies o caderas?
2. **Conectar clases restantes** — las otras 4 clases siguen usando modelos KayKit (OK de momento).
3. **Fase B Sprint 4-EXT** — motor de combate por turnos:
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
