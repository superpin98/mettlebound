# Estado Actual — METTLEBOUND

**Última actualización:** Sprint 3.5 completado (2026-05-20)
**Tests:** 211 pasando (9 archivos de test)
**TypeScript:** `tsc --noEmit` limpio, 0 null bytes
**Rama git:** `sprint-3.5` mergeada a `main`

---

## Qué funciona ahora mismo

Al arrancar `npm run dev` el jugador ve:

1. **Modal de selección de clase** — elige entre Guerrero, Cazadora, Mago, Pícaro o Errante.
2. **HUD** (esquina superior izquierda) — nombre de clase, nivel, barras HP/MP/XP, stats primarios (FUE/DES/INT/STE) y derivados (CRIT/ESQV/VEL). Badge dorado cuando hay puntos de stat pendientes.
3. **Action Bar** (centro inferior) — botones 🎒 MOCHILA [I] y 📜 PERSONAJE [C]. Solo un panel abierto a la vez.
4. **Inventario** (panel derecho, tecla I) — slots de equipado (10 ranuras) y bolsa (16 huecos). Slots ocupados muestran emoji + nombre truncado del item. Bordes de color y glow según rareza. Clic derecho para equipar/desequipar. Tooltip rico al pasar el ratón.
5. **Hoja de personaje** (panel izquierdo, tecla C) — identidad (clase/nivel/XP), stats base repartibles, vitales (HP/MP/derivados), stats de combate activos y bonificaciones de conjunto activas.
6. **Modal de subida de nivel** — al subir de nivel (o al elegir Errante) aparece el modal para repartir puntos de stat y elegir upgrades de pasiva.
7. **Panel DEV** (esquina inferior derecha, solo en desarrollo):
   - Botón `+100 XP` — añade XP y activa el modal si hay nivel.
   - Selector `+Item ▾` — dropdown con 5 opciones de rareza (Común/Poco Común/Raro/Épico/Legendario), cada una en su color. Genera un item de esa rareza exacta y lo añade a la bolsa.
   - Botón `Clase` — permite cambiar de clase en caliente sin recargar.
8. **Selector de escala UI** (esquina inferior izquierda, solo en desarrollo) — AUTO/100%/125%/150%/175%/200%, persiste en localStorage.
9. **TestRoom 3D** — sala de prueba centrada en (0,0,0) con suelo, paredes, esquinas, 4 columnas decorativas y 4 antorchas (modelo físico + luz cálida + partículas + sprite de llama animado). El personaje 3D del jugador aparece en el centro con animaciones Idle/Walking_A funcionales.

---

## Archivos creados / modificados en Sprint 3

### Tipos y configuración
| Archivo | Descripción |
|---|---|
| `src/types/items.types.ts` | Tipos Item, ItemTemplate, Affix, AffixStatKey (22 stats), EquipmentSlot, InventorySnapshot… |
| `src/config/balance.ts` | Constantes de balance: XP, stats base por clase, fórmulas HP/MP, rareza, affixes |
| `src/config/items.config.ts` | 23 templates de items, 4 definiciones de set, helpers getItemTemplate/getSetDefinition |

### Sistemas de juego
| Archivo | Descripción |
|---|---|
| `src/game/items/RaritySystem.ts` | Cálculo de rareza al hacer drop según LCK y tier del piso |
| `src/game/items/AffixPool.ts` | Pool de affixes por rareza; genera lista aleatoria con valores escalados |
| `src/game/items/UniqueEffectPool.ts` | Pool de efectos únicos para items legendarios |
| `src/game/items/ItemGenerator.ts` | `generateItem`, `generateRandomItem`, `generateItemOfRarity(rarity, iLevel)` |
| `src/game/items/ItemStatModifiers.ts` | `calcTotalItemDeltas(equipped)` — suma todos los affixes de items equipados |
| `src/game/items/SetBonuses.ts` | Detecta conjuntos activos y calcula sus bonificaciones |
| `src/game/items/Inventory.ts` | Gestiona bolsa (16 huecos) y equipamiento; emite eventos al EventBus |
| `src/game/stats/StatCalculator.ts` | `calcDerivedStats(coreStats, level)` → 22 campos DerivedStats |
| `src/game/player/PlayerStats.ts` | Estado del jugador: nivel, XP, stats base + items; getSnapshot, addXp, spendStatPoint |
| `src/game/progression/XPSystem.ts` | xpForLevel, xpToNextLevel, xpFromEnemy, levelFromTotalXp, xpProgressInCurrentLevel |

### Interfaz de usuario
| Archivo | Descripción |
|---|---|
| `src/ui/HUD.ts` | Cabecera HTML con HP/MP/XP/stats; se actualiza vía EventBus |
| `src/ui/InventoryUI.ts` | Panel inventario: slots emoji+nombre, bordes rareza, tooltip en hover |
| `src/ui/ItemTooltip.ts` | Tooltip rico con nombre, rareza, slot, affixes, comparación equipado |
| `src/ui/CharacterSheet.ts` | Hoja de personaje: identidad, stats base, derivados, sets activos |
| `src/ui/LevelUpModal.ts` | Modal de subida de nivel: repartir stats + elegir upgrade de pasiva |
| `src/ui/ClassSelectionModal.ts` | Modal de selección de clase al arrancar |
| `src/ui/PanelManager.ts` | Garantiza un solo panel abierto a la vez |
| `src/ui/ActionBar.ts` | Barra inferior fija; dueño único de atajos I/C/Escape |
| `src/ui/UIScale.ts` | Escala de UI vía CSS variable --ui-scale; selector persistido en localStorage |

### Tests — 196 en total (9 archivos)
| Archivo | Tests |
|---|---|
| `tests/items/RaritySystem.test.ts` | 24 |
| `tests/items/ItemGenerator.test.ts` | 30 |
| `tests/items/SetBonuses.test.ts` | 20 |
| `tests/items/Inventory.test.ts` | 30 |
| `tests/stats/StatCalculator.test.ts` | 22 |
| `tests/progression/XPSystem.test.ts` | 18 |
| `tests/progression/UpgradePool.test.ts` | 8 |
| `tests/integration/StatsFromItems.test.ts` | 24 (incluye 10 de stats exóticos) |
| `tests/items/AffixPool.test.ts` | 20 |

---

## Archivos creados / modificados en Sprint 3.5

### Assets
| Recurso | Descripción |
|---|---|
| `public/assets/models/characters/` | Pack KayKit Adventurers — modelos glb de personajes jugables |
| `public/assets/models/dungeon/` | Pack KayKit Dungeon — tiles de suelo, paredes, esquinas, antorchas, columnas |
| `public/assets/sprites/flame.png` | Spritesheet de llama pixel art CC0 (BenHickling) — 640×384 px, grid 10×6, 60 frames de 64×64 |
| **Total assets:** | 216 archivos, ~27 MB |

### Motor y cámara
| Archivo | Descripción |
|---|---|
| `src/core/Engine.ts` | Iluminación Grimspire: clearColor `#080612`, niebla lineal 18-35, HemisphericLight `grimAmbient` morada intensity 0.12, DirectionalLight `grimMoon` azul intensity 0.05 |
| `src/core/AssetManager.ts` | Sistema de carga de assets con AssetContainer, caché por URL y mock loader para tests |

### Mundo 3D
| Archivo | Descripción |
|---|---|
| `src/game/world/TestRoom.ts` | Sala estática de prueba: suelo 4×4 tiles, 16 paredes perimetrales, 4 esquinas, 4 columnas decorativas, 4 antorchas completas |
| `src/game/world/FlameEffect.ts` | ParticleSystem de partículas ascendentes naranjas con textura DynamicTexture procedural y BLENDMODE_ADD |
| `src/game/world/FlameSprite.ts` | Plane 3D billboard con spritesheet flame.png, UV scrolling animado a ~16 fps, NEAREST_SAMPLINGMODE para pixel art limpio |

### Personaje jugador
| Archivo | Descripción |
|---|---|
| `src/game/player/PlayerController.ts` | Modelo 3D glb del personaje según clase, animaciones Idle/Walking_A, whitelist de visibilidad de meshes de armas por clase en classes.config |
| `src/config/classes.config.ts` | Mapeo clase → modelo KayKit (Guerrero→Knight, Cazadora→Rogue, Mago→Mage, Pícaro→Rogue_Hooded, Errante→Barbarian), whitelist de armas, nombre display femenino para Cazadora |

### Tests — 211 en total (mismos 9 archivos, 15 tests nuevos en AssetManager)
| Incremento | Detalle |
|---|---|
| +15 tests | `tests/core/AssetManager.test.ts` — mock loader, caché, instanciación |

---

## Decisiones de arquitectura

### Z-index hierarchy
```
1000  HUD
2000  Action Bar
3000  DEV panel + UIScale selector
4000  Panels (InventoryUI, CharacterSheet)
8000  Modals (LevelUpModal, ClassSelectionModal)
9999  Tooltips (ItemTooltip)
```

### PanelManager — un solo panel activo
`PanelManager` registra paneles como `PanelHandle { show, hide, isOpen }`. `toggle(id)` hace swap limpio entre paneles. `ActionBar` se suscribe a `onActiveChange` para actualizar el resaltado visual.

### Atajos de teclado centralizados
`ActionBar` es el único dueño de los atajos I/C/Escape. `InventoryUI` y `CharacterSheet` no tienen listeners de teclado propios.

### XP relativa al nivel — fuente canónica
`xpProgressInCurrentLevel(totalXp, level)` en `XPSystem.ts` compartida entre HUD y CharacterSheet. Devuelve `{ current, needed }` donde `current = totalXp - xpForLevel(level)`.

### DerivedStats — 22 campos siempre presentes
`StatCalculator.calcDerivedStats()` inicializa a 0 los campos de combate. `PlayerStats.getSnapshot()` los sobreescribe con los deltas de items.

### generateItemOfRarity — rareza exacta
Omite el cálculo probabilístico para poder generar items de rareza forzada (botón DEV, cofres especiales futuros).

### Antorchas — arquitectura por capas
Cada antorcha es independiente y se compone de tres capas apiladas en el mismo punto:
1. **PointLight** — ilumina la geometría circundante (ambar `Color3(1, 0.5, 0.15)`, intensity 1.2, range 6)
2. **FlameEffect** — ParticleSystem de partículas ascendentes (volumen y movimiento)
3. **FlameSprite** — plane 3D billboard con sprite animado (silueta reconocible de llama)

El wrapper `TransformNode` con `rotation.y` calculada según la pared hace que el modelo KayKit quede orientado correctamente sin transformaciones adicionales en el hijo.

### maxSimultaneousLights = 8 en todos los materiales
El límite por defecto de Babylon es 4. Con 2 luces globales + 4 PointLights de antorchas = 6 luces totales, el límite de 4 truncaba 2 PointLights. Se aplica a todos los materiales con `scene.markAllMaterialsAsDirty(2)` tras instanciar la sala.

---

## Pilares de identidad del juego

- **"Todo lo que se pueda hacer interactuable, sea interactuable"** — antorchas, barriles, cofres, mesas, puertas, paredes frágiles. Cada prop del mundo tiene potencial de mecánica.
- **Sistema de iluminación como mecánica jugable (Sprint 8+)** — visión por entidad, accuracy modulado por visibilidad, IA reactiva al entorno lumínico. Las PointLights de las antorchas son el primer ladrillo de este sistema.
- **"Producto serio, primogénito, no laboratorio"** — cada sprint cierra con algo jugable y visualmente coherente.
- **Filosofía visual: 3D low-poly + 2D pixel art solo para VFX** — la geometría del mundo y los personajes son 3D. Las llamas, hechizos y partículas son sprites 2D billboard anclados en el espacio 3D.

---

## Patrones reutilizables descubiertos en Sprint 3.5

### "Prop con luz emergente"
Cada `PointLight` pertenece a un prop iluminante. Si el prop se destruye, su luz también desaparece. Reutilizable en Sprint 6 para candelabros, hogueras, runas mágicas y cristales. Implementación de referencia: antorchas en `TestRoom._buildTorches`.

### "Prop montado en pared"
`TransformNode` wrapper con `rotation.y = atan2(N.x, N.z) + PI` calculada desde la normal de la pared. El modelo KayKit se instancia como hijo sin transformaciones extra. Reutilizable para banners, candelabros de pared y repisas. Implementación de referencia: antorchas en `TestRoom.ts`.

### "Sprite 2D con plane 3D billboard"
**Nunca usar `SpriteManager`** de Babylon — su pase 2D ignora el depth buffer y el sprite aparece por delante de paredes y geometría. Patrón correcto:
- `MeshBuilder.CreatePlane` con `billboardMode = BILLBOARDMODE_ALL`
- `NEAREST_SAMPLINGMODE` para pixel art sin blur
- `transparencyMode = MATERIAL_ALPHATEST` para corte duro de alpha
- `disableLighting = true` para brillo autoiluminado
- `backFaceCulling = false` por si la cámara pasa al otro lado
- UV scrolling manual con `uOffset/vOffset` sobre una textura compartida

Implementación de referencia: `FlameSprite.ts`. Reutilizable para todos los VFX 2D del juego (hechizos, impactos, runas, auras).

### Constantes de offset relativo para props procedurales
Las posiciones de elementos visuales ligados a un prop (luz, partículas, sprite) se expresan siempre como offsets relativos a `wrapper.position` más un vector direccional (`inward`, `lateral`). Nunca posiciones absolutas hardcodeadas. Esto garantiza que el mismo código funciona en la sala de prueba y en generación procedural sin modificaciones.

---

## Bugs resueltos en Sprint 3.5

| Bug | Causa | Solución |
|---|---|---|
| Solo 2 de 4 PointLights visibles al inicio | Límite por defecto de Babylon de 4 luces simultáneas (2 globales + 4 de antorchas = 6 > 4) | `mat.maxSimultaneousLights = 8` en todos los materiales + `markAllMaterialsAsDirty(2)` |
| Antorchas orientadas hacia dentro de la pared | El modelo KayKit necesita `rotation.y` según la normal de cada pared | Wrapper TransformNode con rotY calculado por pared (Sur=0, Norte=PI, Oeste=PI/2, Este=-PI/2) |
| Sprite de llama por delante de geometría 3D | `SpriteManager` usa un pase 2D separado que ignora el depth buffer | Cambio a `MeshBuilder.CreatePlane` con `billboardMode_ALL` — geometría 3D real que respeta depth |

---

## Lecciones aprendidas (protocolo para futuras sesiones)

### Mount-freeze (CRÍTICO)
El sandbox Linux cachea los archivos del filesystem Windows. Cuando el Edit tool modifica un archivo, el sandbox puede no ver el cambio.
**Regla:** Siempre usar `python3` en bash para escribir archivos directamente en el sandbox con `open(..., 'wb').write(data.encode())`. Verificar con bash después de cualquier cambio crítico.

### Null bytes del Edit tool
Si Edit borra un bloque grande de código puede dejar bytes nulos que TypeScript reporta como `TS1127: Invalid character`.
**Regla:** Después de cualquier Edit que elimine contenido: `data = open(f,'rb').read().replace(b'\x00',b''); open(f,'wb').write(data)`.

### CSS truncado
Los rewrites grandes de style.css pueden quedar truncados.
**Regla:** Después de escribir style.css verificar con Python que `data.count(b'{') == data.count(b'}')`.

### Calibración visual iterativa
Para ajustes de posición/tamaño de elementos visuales, exponer constantes con nombre semántico claro en la zona de constantes del archivo (no valores inline). El desarrollador itera a ojo directamente sin necesidad de logs de diagnóstico.

---

## Wishlist / deuda técnica

### Deuda de Sprint 3
- Animación visual al subir de nivel (flash en HUD).
- Drag & drop en el inventario.
- Filtros y ordenación de items en la bolsa.
- Persistencia del inventario entre recargas (localStorage).
- Sonidos UI básicos (hover, clic, equipar).
- Preview de stats al comparar item de bolsa con equipado del mismo slot.

### Deuda de Sprint 3.5
- **Bug pre-existente (mini-fix antes Sprint 4):** FUE sube HP máximo pero no rellena HP actual al subir stat.
- Blending suave entre animaciones Idle ↔ Walking ↔ Running (Sprint polish).
- Drag & drop inventario e iconos pixel art reales (Sprint UI Pass).
- Sustituir sprite 2D billboard de antorchas por modelo 3D pequeño de fuego (Sprint polish visual, no bloqueante).
- Asset pack Animated Effects de Stealthix $3 — candidato para Sprint UI Pass / VFX.
- Colisiones físicas de paredes en TestRoom (se implementan en Sprint 4).

---

## Siguiente sprint

**Sprint 4 — Combate básico**

Objetivo: input de ataque, animaciones de combate, hitbox, sistema de daño, colisiones de pared en TestRoom y target dummy. Mini bug-fix de FUE/HP antes de empezar.

Archivos clave a crear: sistema de combate en `src/game/combat/`, colisiones en `src/game/world/`.

*Actualizado al cerrar el Sprint 3.5 — 2026-05-20.*
