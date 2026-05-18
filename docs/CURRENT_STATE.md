# Estado actual del proyecto Mettlebound

> Este archivo refleja el estado vivo del proyecto. Se actualiza al final de
> cada sprint o al tomar decisiones arquitectonicas importantes. Cualquier
> instancia de Claude (en cualquier maquina) debe leerlo al iniciar una sesion
> para saber por donde vamos.

---

## Estado general

- **Version:** post-Sprint 2
- **Rama actual:** `sprint-2` (pendiente merge a `main`)
- **Ultima verificacion funcional:** navegador Windows, `npm run dev` limpio, 65/65 tests verde

---

## Sprint actual

**Proximo a empezar:** Sprint 3 — Items y rareza (ver detalle abajo).

---

## Sprints completados

### Sprint 0 — Setup inicial
- Vite + TypeScript + Babylon.js v9.7 instalados y configurados
- Estructura de carpetas segun `docs/02_PROJECT_STRUCTURE.md`
- Cubo girando en pantalla
- ESLint 9 con flat config (`eslint.config.js`)
- Prettier configurado
- `tsconfig.json` con strict + alias `@/` + `ignoreDeprecations: "6.0"`

### Sprint 1 — Personaje navegable y camara orbital
- `src/core/InputManager.ts`: captura WASD con `e.code`, metodo `dispose()`.
- `src/core/CameraController.ts`: ArcRotateCamera, orbit con click derecho,
  zoom con rueda. Sin panning. Limites de beta y radius.
- `src/game/player/PlayerController.ts`: capsula morada en Y=1, suelo 50x50
  con GridMaterial, movimiento relativo a la camara, rotacion con Quaternion.Slerp.
- `src/core/Engine.ts`: HemisphericLight + DirectionalLight.
- `src/main.ts`: orquesta Engine -> InputManager -> PlayerController -> CameraController.

### Sprint 2 — Stats, clases, niveles y UI base

Sistema de stats, clases, progresion y UI completamente funcional.

**Archivos creados:**

*Configuracion y tipos:*
- `src/types/game.types.ts` — Tipos compartidos: ClassId, StatKey, UpgradeRarity,
  CoreStats, DerivedStats, UpgradeEffect, UpgradeDefinition, ClassDefinition, PlayerSnapshot
- `src/config/balance.ts` — Todas las constantes numericas (BALANCE object)
- `src/config/classes.config.ts` — 5 clases + Errante, getClassById()

*Infraestructura:*
- `src/utils/random.ts` — RNG mulberry32, clase Mulberry32 + singleton gameRng
- `src/core/EventBus.ts` — Wrapper de mitt con GameEventMap tipado
- `vitest.config.ts` — Configuracion de tests con alias @/ para Node environment

*Logica de juego (funciones puras):*
- `src/game/stats/StatCalculator.ts` — calcMaxHp, calcMaxMp, calcCritChance,
  calcEvasion, calcTurnSpeed, calcDerivedStats, applySoftCap
- `src/game/progression/XPSystem.ts` — xpForLevel, xpToNextLevel, xpFromEnemy,
  levelFromTotalXp. Formula: floor(100 * (level-1)^1.4)
- `src/game/progression/UpgradePool.ts` — Pool de mejoras: 8 comunes + 6 poco comunes
- `src/game/progression/LevelUp.ts` — rollUpgradeOptions, applyStatPoint, applyUpgrade

*Estado del jugador:*
- `src/game/player/PlayerStats.ts` — Clase con estado mutable, emite eventos al EventBus

*UI (HTML overlay):*
- `src/ui/HUD.ts` — HUD en juego: clase, nivel, barras HP/MP/XP, stats, badge pendientes
- `src/ui/LevelUpModal.ts` — Modal de level-up con variante "Forja tu Errante" (8 pts)
- `src/ui/ClassSelectionModal.ts` — Pantalla "Elige tu Destino" con 5 tarjetas de clase
- `src/ui/UIScale.ts` — Auto-escala por resolucion + selector manual con persistencia

**Tests (65 tests, 4 archivos, todos verdes):**
- `tests/stats/StatCalculator.test.ts` — 22 tests de formulas de stats
- `tests/progression/XPSystem.test.ts` — 19 tests de curva XP
- `tests/progression/UpgradePool.test.ts` — 8 tests de integridad del pool
- `tests/progression/LevelUp.test.ts` — 16 tests de level-up y mejoras

**Actualizados:**
- `src/main.ts` — IIFE async: UIScale -> ClassSelectionModal (await) -> PlayerStats ->
  HUD -> LevelUpModal -> trigger Errante si corresponde -> botones cheat (DEV)
- `src/style.css` — CSS completo con custom properties, #ui-corner, #ui-center,
  HUD, LevelUpModal, ClassSelectionModal, UIScale selector

---

## Proximo sprint — Sprint 3: Items y rareza

**Objetivo:** Sistema completo de items, inventario y equipamiento.

**Tareas segun `docs/13_ROADMAP.md`:**
1. Implementar tipo `Item` y subtipos (`docs/05_ITEMS_AND_RARITY.md`)
2. Implementar `ItemGenerator` (procedural con rareza)
3. Implementar los 20 items base del MVP
4. Implementar los 4 conjuntos y sus bonus
5. Implementar `Inventory` (mochila de 30 slots + 10 slots equipados)
6. Implementar logica de equipar/desequipar
7. Implementar pool de Unique Effects de Epicos/Legendarios
8. **Tests** para generacion de items en cada rareza

**Criterio de aceptacion:** generar 100 items de rareza aleatoria, verificar que son
unicos y que sus stats estan en rangos correctos. Equipar/desequipar funcional.

**Antes de empezar:** leer `docs/05_ITEMS_AND_RARITY.md` completo antes de proponer
ninguna implementacion.

---

## Decisiones arquitectonicas

- **Clases del juego** = CONFIG objects (no clases TS con herencia).
  En `src/config/classes.config.ts`.
- **Constantes de balance** centralizadas en `src/config/balance.ts`. Cero
  numeros magicos en la logica.
- **Formulas** = funciones puras, sin side effects, deterministas.
- **RNG** = mulberry32 en `src/utils/random.ts`, singleton `gameRng`.
  Nadie usa `Math.random()` directo.
- **EventBus** (mitt) para desacoplar `game/` de `ui/`. GameEventMap definido
  en `src/core/EventBus.ts` (no en game.types para evitar dependencia circular).
- **Tipos de evento**: los eventos sin payload usan `null` (no `undefined`),
  porque mitt requiere valores `unknown`.
- **Errante**: modal dedicado "Forja tu Errante" que reutiliza LevelUpModal
  con 8 puntos y sin seccion de mejoras. Se activa automaticamente al crear el personaje.
- **Formula XP**: `floor(100 * (level-1)^1.4)`. Nivel 2 = 100 XP, nivel 3 = 263 XP.
  Curva monotonamente creciente.
- **Soft caps**: critico 50->80%, evasion 40->70%. Factor 0.5 por encima del umbral.
- **Arquitectura UI de escalado**: dos contenedores raiz en `index.html`:
  - `#ui-corner` (`transform-origin: top left`, z-index 100): HUD y elementos
    anclados a la esquina superior izquierda.
  - `#ui-center` (`transform-origin: center center`, z-index 10000): TODOS los
    modales. Cualquier modal futuro se apendea a `#ui-center` y escala
    automaticamente sin tocar el CSS.
  - `#ui-scale-root` y botones cheat (DEV) viven en `body` con transform individual
    y `transform-origin` de su propia esquina (bottom-left / bottom-right).
- **Tipografia**: VT323 sustituyo a Pixelify Sans (baja legibilidad de digitos 0/8,
  6/9, B/8 en HUD pequeno). Cinzel Decorative para titulos, Spectral para body.
- **UI minima**: HTML overlay simple. Babylon GUI compleja se pospone al Sprint 8.
- **Direccion visual**: 3D low poly + UI 2D estilizada (estilo Hades/Slay the Spire).
  Referencias en `references/visual-style/`. Documentacion en `docs/10_UI_UX.md`.

---

## Lecciones aprendidas — importante para futuros sprints

### 1. Entorno NTFS + sandbox Linux (bytes nulos)

En el PC de casa (Windows con NTFS), tanto las herramientas create_file/str_replace
del sandbox Linux como los heredocs de bash pueden introducir bytes nulos invisibles
al final de los archivos. Vitest (SWC) los tolera; Vite (OXC) no, y peta con
`PARSE_ERROR / Unexpected token`.

**Protocolo para sesiones futuras:**
- Despues de cada batch de ediciones grande, verificar con Python:
  ```python
  with open(path,'rb') as f: data=f.read()
  null_idx = data.find(b'\x00')
  # si null_idx >= 0: truncar en ese punto
  ```
- Si `npm run dev` peta con PARSE_ERROR y `npm test` pasa → sospechar de
  bytes nulos ANTES que de bugs reales.
- REGLA: solo `str_replace` y `create_file` (herramienta Write). Nunca bash heredoc.

### 2. RNG y orden de llamadas

Un SeededRng compartido AVANZA su estado en cada call. Si necesitas usar "las mismas"
mejoras dos veces (pintar tarjetas y luego bindear eventos), GUARDALAS en una propiedad
de la clase, no las regeneres llamando otra vez al rng.

### 3. HUD inicial vs event-driven

PlayerStats emite eventos al crearse. Si el HUD se suscribe DESPUES, se pierde el
snapshot inicial. Pasarle el snapshot actual al instanciar el HUD (`new HUD(playerStats.getSnapshot())`),
no solo escucha pasiva.

---

## Wishlist visual — Sprint UI Pass futuro

La UI actual es funcional pero placeholder. Pendientes para un Sprint UI Pass dedicado:
- Barras HP/MP/XP con tweening suave (ease-out 300-500ms)
- Texturas del kit Grimspire en barras (bar_frame_*, bar_*_fill_*)
- Bordes y botones pixel art usando panel_*.png y btn_*.png con 9-slice scaling
- Ornamentos: divider_*.png entre secciones, level_badge_*.png
- Iconos animados (sparkles en mejoras legendarias)
- Cursor personalizado (cursor_default_4x.png / cursor_click_*)
- Particulas UI (sparkle al ganar XP, etc.)

---

## Dependencias instaladas

Runtime:
- `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/gui`,
  `@babylonjs/inspector`, `@babylonjs/materials`
- `nanoid`, `mitt`, `zod`, `i18next`

Dev:
- `eslint` (v9), `prettier`, `vitest`, `@typescript-eslint/parser`,
  `@typescript-eslint/eslint-plugin`

---

## Bugs y cuidados conocidos

- El sandbox de Cowork (Linux) puede escribir archivos con bytes nulos en NTFS.
  Ver seccion "Lecciones aprendidas" para el protocolo de limpieza.
- `tsconfig.json` tiene `ignoreDeprecations: "6.0"` por warning de baseUrl.
  Migrar cuando llegue TypeScript 7.
- El sandbox tiene problemas de permisos NTFS con `.git`. Los comandos
  `git init`, `git push`, etc. se ejecutan desde PowerShell de Windows.

---

## Repositorio

- GitHub: https://github.com/superpin98/mettlebound (privado)
- Branch principal: `main`
- Branch de trabajo actual: `sprint-2`

---

## Workflow de ramas y sincronizacion entre maquinas

Cada sprint vive en su propia rama (`sprint-2`, `sprint-3`, etc.), creada a
partir de `main`. **`main` solo recibe sprints completos y verificados.**

### Al iniciar trabajo en una maquina
```powershell
git checkout main && git pull
git checkout sprint-N          # o -b sprint-N si es nueva
git pull origin sprint-N       # solo si la rama ya existe en el servidor
```

### Al final de CADA sesion (aunque el sprint no este terminado)
1. Cowork actualiza este archivo (CURRENT_STATE.md) indicando progreso exacto.
2. Commit con prefijo segun estado:
   - `wip(sprint-N):` si esta a medias
   - `feat(sprint-N):` si el sprint esta completo
3. Push a la rama del sprint.

### Al cerrar un sprint completo
```powershell
git checkout main
git merge sprint-N
git push
```

---

## Como actualizar este archivo

Al final de cada sprint:
1. Mueve el sprint actual a "Sprints completados" con su resumen.
2. Indica el proximo sprint como "Sprint actual".
3. Añade decisiones arquitectonicas nuevas si las hay.
4. Añade bugs/cuidados nuevos si han surgido.
5. Commit y push: este archivo viaja con el repo.
