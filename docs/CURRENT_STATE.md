# Estado Actual — METTLEBOUND

**Última actualización:** Sprint 3 completado (2026-05-19)
**Tests:** 196 pasando (9 archivos de test)
**TypeScript:** `tsc --noEmit` limpio, 0 null bytes
**Rama git sugerida:** `sprint3-items-ui-completo`

---

## Qué funciona ahora mismo

Al arrancar `npm run dev` el jugador ve:

1. **Modal de selección de clase** — elige entre Guerrero, Cazador, Mago, Pícaro o Errante.
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

---

## Wishlist / deuda técnica

- Animación visual al subir de nivel (flash en HUD).
- Drag & drop en el inventario.
- Filtros y ordenación de items en la bolsa.
- Persistencia del inventario entre recargas (localStorage).
- Sonidos UI básicos (hover, clic, equipar).
- Preview de stats al comparar item de bolsa con equipado del mismo slot.

---

## Siguiente sprint

**Sprint 4 — Generación de mazmorras** (`docs/13_ROADMAP.md`)

Objetivo: piso con 4-10 salas conectadas (geometría 3D procedural), bioma "Cripta de Piedra", interactuables básicos (cofre, palanca, fuente, hoguera) e iluminación coherente. El jugador puede navegar entre todas las salas y volver.

Archivos clave a crear: `Dungeon.ts`, `Floor.ts`, `Room.ts`, `RoomGenerator.ts`, `DungeonGraph.ts`.

*Generado al cerrar el Sprint 3 — 2026-05-19.*
