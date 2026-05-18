# Referencias de diseño — Mettlebound

Esta carpeta contiene material de referencia visual y de assets para el proyecto. No contiene código ni assets de producción, solo material de inspiración y fuentes de los que se pueden extraer sprites.

---

## Subcarpetas

### `visual-style-refs/`

**Qué es:** 11 capturas de pantalla del kit "Grimspire" en funcionamiento como demo web. Muestran el lenguaje visual completo del kit: paleta, tipografía, layout de paneles, sistema de rareza, tarjetas de boon, HUD, inventario, mapa, etc.

**Cómo se usa:** Fuente de verdad estética para toda decisión de UI de Mettlebound. Antes de diseñar cualquier elemento de interfaz, mirar si existe una captura relevante aquí. Ver `visual-style-refs/README.md` para el índice detallado de capturas y las reglas de qué tomar / qué no usar.

**Capturas clave:**
- `03_hud_combat_overlay.png` → referencia primaria para el HUD en juego
- `04_upgrade_selection_three_boons.png` → referencia primaria para el modal de level-up
- `02_title_screen_grimspire.png` → menú principal y botones

---

### `grimspire-kit-full/`

**Qué es:** El kit de assets Grimspire completo. 183 sprites exportados como PNG transparente a 4× escala (32×32 nativos → 128×128px en disco), más JSON sidecars con metadatos de animación para los sprites animados.

**Cómo se usa:** Los PNGs se pueden usar directamente en el HTML overlay de UI de Mettlebound. Importar con Vite o copiar a `public/ui/` según necesidad. Los assets animados (spritesheet + JSON) se gestionan en Sprint 8 cuando llega la UI completa.

**Archivos de referencia dentro del kit:**
- `TOKENS.txt` → paleta completa de colores y stack tipográfico (fuente de verdad para `docs/10_UI_UX.md`)
- `INDEX.md` → índice AI-friendly: descripción en lenguaje natural → path del archivo
- `PLACEMENT.md` → guía de uso por pantalla (qué asset va en qué zona del HUD, inventario, mapa, etc.)
- `README.txt` → instrucciones de importación en Unity (ignorar para Mettlebound; lo relevante es la estructura de carpetas y la paleta)

**Subcarpetas de assets:**

| Carpeta | Contenido |
|---|---|
| `icons/` | 30 iconos base en paleta de material (armas, armadura, consumibles, tesoro, UI) |
| `icons-rarity/` | Los mismos 30 iconos recoloreados por rareza (common→relic) |
| `slots/` | Frames de slot de inventario, 6 rarezas × 3 tamaños (48/64/96px) |
| `panels/` | Paneles 9-slice en 4 cromas: bronze, iron, blood, bone |
| `buttons/` | Botones en 4 variantes × 3 tamaños: default, primary, danger, ghost |
| `bars/` | Frames de barra de recurso + rellenos graduados (hp, stamina, mana, xp, shield) |
| `status/` | Badges de estado de combate (fury, blessed, bleed, poison, burning, haste, chilled, cursed, shielded) |
| `map-tokens/` | Nodos de mapa ramificado × 10 tipos × 3 estados (normal/current/cleared) |
| `skill-nodes/` | Nodos de árbol de habilidades × 5 ramas × 3 estados + keystones |
| `portraits/` | Bustos de clase: knight, witch, monk, rogue |
| `cursors/` | Cursores del juego: default, click, target |
| `particles/` | Sprites de efecto: ember, sparkle, blood, smoke, mana, soul |
| `props/` | Decoración de mundo: pillar, arch, tombstone, banner, lantern, tome, cauldron, crown |
| `decor/` | Tiles isométricos de suelo: shadow, wood, leather, moss, iron |
| `ornaments/` | Divisores horizontales + frames de badge de nivel |
| `animated/` | Versiones animadas (spritesheet + JSON) de todos los tipos anteriores |

---

## Notas de uso

- Este material es **inspiración y assets reutilizables**, no documentación del juego. La documentación del juego está en `docs/`.
- La traducción de decisiones estéticas de este material al código de Mettlebound está en `docs/10_UI_UX.md`.
- El material Grimspire está diseñado para Unity 2D. Para Mettlebound (Babylon.js + HTML overlay), usar los PNG directamente como `<img>` o `background-image` en CSS, ignorando las instrucciones de Unity en el README.txt del kit.
