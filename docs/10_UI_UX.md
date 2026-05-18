# 10 — UI / UX

> Documento de referencia visual y técnico para toda la capa de interfaz de Mettlebound.
> Actualizado en mayo 2026 tras incorporar el material de referencia Grimspire.

---

## a) Dirección visual global

### La fórmula

**Mettlebound es 3D low poly con una capa de UI 2D estilizada.**

El mundo 3D (personajes, enemigos, mazmorras) usa geometría low poly con iluminación limpia, sin textura pixel. La UI que se superpone sobre él habla un idioma completamente distinto: paneles con bordes dorados, fondos morado oscuro, tipografía gótica, iconografía geométrica de alto contraste. La tensión entre ambas capas es intencional y es parte de la identidad del juego.

### Juegos de referencia

| Juego | Qué tomamos |
|---|---|
| **Hades** | Transiciones suaves, feedback satisfactorio, color vivo sobre fondo oscuro, personalidad en cada elemento de UI |
| **Slay the Spire** | Mapa de nodos ramificado, tarjetas de boon con icono + stats + flavor text, legibilidad extrema |
| **Darkest Dungeon** | Atmósfera de horror gótico, tipografía blackletter, paleta de morados y dorados, log narrativo de combate |
| **Path of Exile** | Densidad informativa en tooltips, sistema de rareza con color, inventario tipo cuadrícula |

### Qué tomar del material Grimspire

✅ Tipografía blackletter dorada sobre fondo morado oscuro para títulos y headings  
✅ Paneles con borde dorado fino y fondo en la gama shadow-purple  
✅ Sistema de color por rareza (sus 6 rarezas → mapeadas a las 5 de Mettlebound + maldito como bonus)  
✅ Tarjetas de boon: icono grande centrado, título en color de rareza, tabla de stats, flavor text en cursiva  
✅ Iconografía 32×32 geométrica, plana, alto contraste, sin gradientes  
✅ Barras de recurso con gradiente horizontal (HP rojo, MP azul, XP dorado)  
✅ Damage numbers flotantes en fuente monoespaciada pixel sobre la escena  
✅ Ornamentos: divisores dorados, badges de nivel, anillos de sígilo en backgrounds  
✅ Tipografía pixel monospace para etiquetas HUD, stats y números (capa UI, no escena 3D)

### Qué NO usar

❌ Pixel art puro para personajes, enemigos o entornos (Mettlebound es 3D)  
❌ Filtros CRT, scanlines o pixel-scale sobre el canvas 3D  
❌ Spritesheets animados como sustitutos de geometría 3D  
❌ Escala de píxel (no aplicar `image-rendering: pixelated` al canvas de Babylon)  
❌ La font Jacquard 24 del kit (es una pixel-blackletter, se ve pixelada en 3D; usamos Cinzel Decorative en su lugar)

---

## b) Fuente de verdad estética

```
references/
├── visual-style-refs/          ← 11 capturas de pantalla del kit Grimspire en acción
│   ├── README.md               ← Índice de capturas + qué tomar / qué descartar
│   ├── 01_class_selection_choose_your_vessel.png
│   ├── 02_title_screen_grimspire.png
│   ├── 03_hud_combat_overlay.png        ← Referencia primaria para el HUD
│   ├── 04_upgrade_selection_three_boons.png  ← Referencia primaria para LevelUpModal
│   ├── 05_inventory_and_vestments.png
│   ├── 06_skill_tree_sworn_oaths.png
│   ├── 07_dungeon_map_of_the_descent.png
│   ├── 08_pause_menu.png
│   ├── 09_game_over_you_died.png
│   ├── 10_metaprogression_sanctuary.png
│   └── 11_settings_display.png
└── grimspire-kit-full/         ← Assets del kit Grimspire (PNG sprites + JSON sidecars)
    ├── TOKENS.txt              ← Paleta completa + stack tipográfico del kit
    ├── INDEX.md                ← Índice AI-friendly de assets (intent → path)
    ├── PLACEMENT.md            ← Guía de uso por pantalla
    └── [16 subcarpetas de assets]
```

**Regla de uso:** estas capturas son la fuente de verdad estética para toda decisión de UI que no esté explicitada en este documento. Antes de inventar un patrón nuevo, mirar si existe en las capturas. Los assets PNG del kit se pueden usar directamente en HTML overlays si se considera apropiado (ya son PNG con fondo transparente).

---

## c) Paleta consolidada

```css
:root {
  /* =====================================================
     FONDOS — La gama shadow-purple es el alma del juego
     Extraída de TOKENS.txt (shadow: #080612 / #1a1228 / #2a1845 / #3e2a60)
     ===================================================== */
  --bg-void:        #080612;   /* negro casi puro, usado detrás de todo */
  --bg-deepest:     #0f0c1a;   /* fondo base del canvas/pantalla */
  --bg-panel:       #1a1228;   /* fondo de paneles principales */
  --bg-panel-mid:   #2a1845;   /* fondo de paneles secundarios, hover de filas */
  --bg-panel-light: #3e2a60;   /* fondo de elementos activos/seleccionados */
  --bg-overlay:     rgba(8, 6, 18, 0.85);  /* overlay de modales */

  /* =====================================================
     BORDES Y ORNAMENTACIÓN
     gold (TOKENS.txt): #6a4818 / #a87a30 / #d4a04a / #f4dc92
     ===================================================== */
  --border-gold-dim:    #a87a30;   /* borde dorado estándar (sin seleccionar) */
  --border-gold:        #d4a04a;   /* borde dorado principal */
  --border-gold-bright: #f4dc92;   /* borde dorado en hover / elemento activo */
  --border-subtle:      rgba(212, 160, 74, 0.15);  /* divisores internos */
  --border-medium:      rgba(212, 160, 74, 0.35);  /* bordes de panel neutros */

  /* =====================================================
     TEXTO
     parchment (TOKENS.txt): #6a5a36 / #a89058 / #d4bc7e / #f4e2a6
     ===================================================== */
  --text-primary:    #f4e2a6;   /* texto principal (parchment light) */
  --text-secondary:  #d4bc7e;   /* texto secundario */
  --text-muted:      #a89058;   /* texto deshabilitado / flavor */
  --text-dim:        #6a5a36;   /* texto muy apagado */
  --text-bright:     #ffffff;   /* texto de alto contraste (valores críticos) */

  /* =====================================================
     RAREZAS — Sistema completo
     Mapeado de las 5 rarezas de Mettlebound a los tokens Grimspire.
     Cada rareza tiene 4 tonos: dark/base/mid/light para uso contextual.
     ===================================================== */

  /* Común — steel grey */
  --rarity-common-dark:  #2a2c3a;
  --rarity-common:       #5a5e72;
  --rarity-common-mid:   #8c92a8;
  --rarity-common-light: #d0d6e4;

  /* Poco común — green */
  --rarity-uncommon-dark:  #1e3a1a;
  --rarity-uncommon:       #3a6a2e;
  --rarity-uncommon-mid:   #6a9a4a;
  --rarity-uncommon-light: #a8cc6c;

  /* Raro — blue */
  --rarity-rare-dark:  #1a2c4a;
  --rarity-rare:       #3a5e9a;
  --rarity-rare-mid:   #5a8acb;
  --rarity-rare-light: #9cc0ec;

  /* Épico — purple/mythic */
  --rarity-epic-dark:  #3a1850;
  --rarity-epic:       #6a2eaa;
  --rarity-epic-mid:   #a052d8;
  --rarity-epic-light: #d2a0f0;

  /* Legendario — gold/relic */
  --rarity-legendary-dark:  #6a4818;
  --rarity-legendary:       #a87a30;
  --rarity-legendary-mid:   #d4a04a;
  --rarity-legendary-light: #f4dc92;

  /* Maldito — red/cursed (bonus, para ítems con efectos negativos activos) */
  --rarity-cursed-dark:  #3a0a16;
  --rarity-cursed:       #6a1422;
  --rarity-cursed-mid:   #c43a3a;
  --rarity-cursed-light: #ec7878;

  /* =====================================================
     STATS DEL JUGADOR — colores identificativos por stat
     ===================================================== */
  --stat-str:   #c43a3a;   /* rojo / físico — red mid */
  --stat-dex:   #6a9a4a;   /* verde / agilidad — green mid */
  --stat-int:   #5a8acb;   /* azul / arcano — blue mid */
  --stat-lck:   #d4a04a;   /* dorado / fortuna — gold mid */

  /* =====================================================
     RECURSOS — barras HP / MP / XP
     ===================================================== */
  --hp-dark:   #3e0810;
  --hp:        #6a1420;
  --hp-mid:    #c43a3a;
  --hp-light:  #ec8a7a;

  --mp-dark:   #1a2c4a;
  --mp:        #3a5e9a;
  --mp-mid:    #5a8acb;
  --mp-light:  #a8c6ec;

  --xp-dark:   #5a1c0a;
  --xp:        #a83c14;
  --xp-mid:    #e8743a;
  --xp-light:  #ffb478;

  /* =====================================================
     TIPOS DE DAÑO — para números flotantes en combate
     (definidos en 03_GAME_DESIGN.md, aquí con nombres de variable)
     ===================================================== */
  --damage-physical:  #e8d090;   /* amarillo claro */
  --damage-ranged:    #90e8c0;   /* verde menta */
  --damage-magic:     #a890e8;   /* morado claro */
  --damage-true:      #ffffff;   /* blanco */
  --damage-bleed:     #c84040;   /* rojo sangre */
  --damage-poison:    #80c040;   /* verde tóxico */
  --damage-fire:      #ff8040;   /* naranja */
  --damage-ice:       #80c8ff;   /* azul claro */
  --heal:             #80ff80;   /* verde sanación */

  /* =====================================================
     FEEDBACK DE SISTEMA
     ===================================================== */
  --feedback-success:  #6a9a4a;   /* verde */
  --feedback-warning:  #e8743a;   /* ámbar */
  --feedback-danger:   #c43a3a;   /* rojo */
  --feedback-info:     #5a8acb;   /* azul */

  /* =====================================================
     CONTORNO UNIVERSAL (del kit: "void tone, not pure black")
     ===================================================== */
  --outline: #0a0510;
}
```

### Mapeo rápido de rarezas para código

```typescript
// src/config/rarity.config.ts — referencia visual
export const RARITY_COLORS = {
  common:    'var(--rarity-common-mid)',     // #8c92a8
  uncommon:  'var(--rarity-uncommon-mid)',   // #6a9a4a
  rare:      'var(--rarity-rare-mid)',       // #5a8acb
  epic:      'var(--rarity-epic-mid)',       // #a052d8
  legendary: 'var(--rarity-legendary-mid)', // #d4a04a
} as const;
```

---

## d) Tipografía

### Las tres familias y sus roles

| Familia | Fuente | Uso |
|---|---|---|
| **Display / Títulos** | Cinzel Decorative | Nombres de pantalla, títulos de modal, nombre del juego, nombres de habilidades |
| **UI / HUD numérico** | VT323 | Etiquetas HUD, valores de stats, contadores, números de daño flotantes |
| **Body / Descripciones** | Spectral | Lore de clase, flavor text de items, descripción de mejoras, texto narrativo de eventos |

> **Nota — cambio de fuente UI (Sprint 2):** Se descartó **Pixelify Sans** por legibilidad deficiente en contexto numérico: los dígitos 0/8 y 6/9 son difícilmente distinguibles a tamaños pequeños de HUD, y la confusión B/8 fue recurrente en pruebas visuales. Se adoptó **VT323**, una fuente pixel art monoespaciada de un solo peso que mantiene el estilo retro-dungeon y ofrece dígitos inequívocos incluso a 12–14px. VT323 es variable en tamaño (sin subpixel blur en pantallas de alta densidad) y se carga con un único peso desde Google Fonts.

Las tres fuentes están en **Google Fonts** (import único en `style.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=VT323&family=Spectral:wght@400;600&display=swap');
```

### Decisión razonada sobre títulos

El kit Grimspire usa **Jacquard 24**, una fuente pixel blackletter. En una pantalla de juego puramente 2D pixel art, es perfecta. En Mettlebound (3D + UI 2D superpuesta), la pixel blackletter quedaría incongruente con la resolución real del canvas. **Cinzel Decorative** preserva el sabor gótico-romano de fantasía oscura sin el rendering pixelado, y se lee bien en todos los tamaños. Para nombres de lugares o armas individuales donde se quiera más carácter gótico, se puede usar **UnifrakturMaguntia** como fuente de acento puntual.

### Especificaciones de uso

#### Cinzel Decorative — Títulos

```css
/* Título de pantalla (ej: "Elige tu clase") */
.ui-title-screen {
  font-family: 'Cinzel Decorative', serif;
  font-weight: 700;
  font-size: clamp(2rem, 4vw, 3.5rem);
  color: var(--text-primary);
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-shadow: 0 0 20px rgba(212, 160, 74, 0.4);
}

/* Título de modal (ej: "¡Nivel 6!") */
.ui-title-modal {
  font-family: 'Cinzel Decorative', serif;
  font-weight: 400;
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  color: var(--border-gold-bright);
  letter-spacing: 0.03em;
  line-height: 1.3;
}

/* Nombre de sección / panel header */
.ui-title-section {
  font-family: 'Cinzel Decorative', serif;
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--border-gold-dim);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  line-height: 1.4;
}
```

#### VT323 — HUD y etiquetas

```css
/* Etiquetas de stat (STR, DEX, INT, LCK) y valores numéricos */
.ui-stat-label {
  font-family: 'VT323', monospace;
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1.5;
}

.ui-stat-value {
  font-family: 'VT323', monospace;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Números de daño flotantes */
.ui-damage-number {
  font-family: 'VT323', monospace;
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1;
  /* color se aplica dinámicamente según --damage-* */
  -webkit-text-stroke: 1px var(--outline);
  text-shadow: 0 1px 3px var(--outline);
}

/* Contadores y valores en botones */
.ui-button-label {
  font-family: 'VT323', monospace;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

#### Spectral — Cuerpo de texto

```css
/* Texto de lore, descripción larga de mejora */
.ui-body {
  font-family: 'Spectral', Georgia, serif;
  font-weight: 400;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.65;
  letter-spacing: 0.01em;
}

/* Flavor text (cursiva, más apagado) */
.ui-flavor {
  font-family: 'Spectral', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.6;
}
```

---

## e) Patrones de panel y componentes

### Panel estándar

El panel es el bloque constructivo de toda la UI. Fondo morado oscuro + borde dorado fino.

```css
.ui-panel {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-gold-dim);
  border-radius: 2px;            /* bordes casi rectos, fantasía sobria */
  box-shadow:
    0 0 0 1px var(--bg-void),    /* sombra de separación del mundo */
    0 4px 24px rgba(8, 6, 18, 0.8);
  padding: 16px;
}

/* Header de panel con línea divisoria */
.ui-panel-header {
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 10px;
  margin-bottom: 12px;
}

/* Panel activo / seleccionado */
.ui-panel--active {
  border-color: var(--border-gold);
  box-shadow:
    0 0 0 1px var(--bg-void),
    0 0 12px rgba(212, 160, 74, 0.2),
    0 4px 24px rgba(8, 6, 18, 0.8);
}
```

### Tarjeta de upgrade / boon

Inspirada directamente en `04_upgrade_selection_three_boons.png`. Tres tarjetas en fila, borde del color de rareza, icono circular centrado, stats en tabla, flavor text al pie.

```css
.ui-upgrade-card {
  background-color: var(--bg-panel);
  border: 1.5px solid var(--rarity-color, var(--rarity-common-mid));
  border-radius: 2px;
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: border-color 100ms linear, box-shadow 100ms linear;
  min-width: 200px;
}

/* Glow sutil del color de rareza al hacer hover */
.ui-upgrade-card:hover {
  box-shadow: 0 0 16px rgba(var(--rarity-color-rgb), 0.25);
  border-color: color-mix(in srgb, var(--rarity-color) 100%, white 20%);
}

/* Etiqueta de rareza en la parte superior */
.ui-upgrade-card__rarity-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--rarity-color);
  color: var(--bg-void);
  font-family: 'VT323', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 2px 10px;
}

/* Icono circular */
.ui-upgrade-card__icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 1px dashed var(--rarity-color);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-panel-mid);
}

/* Nombre de la mejora */
.ui-upgrade-card__name {
  font-family: 'Cinzel Decorative', serif;
  font-size: 0.95rem;
  color: var(--rarity-color);
  text-align: center;
  line-height: 1.3;
}

/* Tabla de stats */
.ui-upgrade-card__stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'VT323', monospace;
  font-size: 0.75rem;
}

.ui-upgrade-card__stat-row {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
}

.ui-upgrade-card__stat-value {
  color: var(--rarity-color);
}

/* Flavor text */
.ui-upgrade-card__flavor {
  font-family: 'Spectral', serif;
  font-style: italic;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
```

### Botones

Cuatro variantes, inspiradas en las capturas de Grimspire:

```css
/* Base compartida */
.ui-btn {
  font-family: 'VT323', monospace;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 10px 24px;
  border-radius: 1px;
  cursor: pointer;
  transition: background-color 100ms linear, border-color 100ms linear;
  border: 1px solid transparent;
}

/* Primario — call-to-action (fondo sangre-oscuro, borde dorado) */
.ui-btn--primary {
  background-color: var(--rarity-cursed);   /* #6a1422 */
  border-color: var(--border-gold-dim);
  color: var(--text-primary);
}
.ui-btn--primary:hover {
  background-color: var(--hp);              /* #6a1420 → ligeramente más claro */
  border-color: var(--border-gold);
}

/* Default — acción neutra */
.ui-btn--default {
  background-color: var(--bg-panel-mid);
  border-color: var(--border-gold-dim);
  color: var(--text-secondary);
}
.ui-btn--default:hover {
  background-color: var(--bg-panel-light);
  border-color: var(--border-gold);
  color: var(--text-primary);
}

/* Danger — acción destructiva (Abandonar la run, Descartar) */
.ui-btn--danger {
  background-color: var(--rarity-cursed);
  border-color: var(--rarity-cursed-mid);
  color: var(--rarity-cursed-light);
}
.ui-btn--danger:hover {
  background-color: var(--rarity-cursed-mid);
  border-color: var(--rarity-cursed-light);
  color: var(--text-bright);
}

/* Ghost — secundario / cancelar */
.ui-btn--ghost {
  background-color: transparent;
  border-color: var(--border-gold-dim);
  color: var(--text-muted);
}
.ui-btn--ghost:hover {
  border-color: var(--border-gold);
  color: var(--text-secondary);
}

/* Deshabilitado */
.ui-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Tooltip de item (estilo POE)

El tooltip aparece junto al cursor, nunca se sale de pantalla, borde del color de rareza.

```css
.ui-tooltip {
  position: fixed;
  z-index: 9999;
  background-color: var(--bg-panel);
  border: 1.5px solid var(--rarity-color, var(--rarity-common-mid));
  border-radius: 2px;
  padding: 14px 16px;
  min-width: 240px;
  max-width: 320px;
  box-shadow:
    0 0 16px rgba(var(--rarity-color-rgb), 0.2),
    0 8px 32px rgba(8, 6, 18, 0.9);
  animation: tooltip-in 150ms linear forwards;
}

@keyframes tooltip-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.ui-tooltip__name {
  font-family: 'Cinzel Decorative', serif;
  font-size: 1rem;
  color: var(--rarity-color);
  margin-bottom: 2px;
}

.ui-tooltip__type {
  font-family: 'VT323', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}

.ui-tooltip__divider {
  height: 1px;
  background-color: var(--border-subtle);
  margin: 8px 0;
}

.ui-tooltip__stat {
  display: flex;
  justify-content: space-between;
  font-family: 'VT323', monospace;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.ui-tooltip__stat-value {
  color: var(--text-primary);
}

.ui-tooltip__affix {
  font-family: 'VT323', monospace;
  font-size: 0.78rem;
  color: var(--mp-light);   /* azul claro para afijos mágicos */
  line-height: 1.6;
}

.ui-tooltip__affix::before { content: '+ '; }

/* Efecto único destacado */
.ui-tooltip__unique-effect {
  color: var(--rarity-legendary-light);
  font-family: 'VT323', monospace;
  font-size: 0.78rem;
  line-height: 1.6;
}

.ui-tooltip__unique-effect::before { content: '✦ '; }

.ui-tooltip__flavor {
  font-family: 'Spectral', serif;
  font-style: italic;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.55;
}

.ui-tooltip__set {
  font-family: 'VT323', monospace;
  font-size: 0.7rem;
  color: var(--rarity-uncommon-mid);
  letter-spacing: 0.05em;
}
```

---

## f) Iconografía

### Estilo

Los iconos de Mettlebound son **geométricos, planos, alto contraste, monocromáticos con tinte de material**. Sin gradientes, sin sombras internas, sin detalles superfluos. El outline es `var(--outline)` (#0a0510), no negro puro.

El kit Grimspire proporciona **30 iconos base** en `references/grimspire-kit-full/icons/` y sus variantes de rareza en `icons-rarity/`. Estos se pueden usar directamente en la UI:

- **Formato preferido para UI**: PNG 32×32 del kit (ya exportados a 4× = 128×128px, usar con `width: 32px` o `width: 64px` según contexto)
- **Formato preferido para iconos personalizados**: SVG vectorial, monocromático, 24×24 o 32×32 viewBox
- **No usar**: JPEG, fondos blancos, gradientes, sombras internas

### Iconos disponibles del kit (categorías)

| Categoría | Qué incluye | Archivo base |
|---|---|---|
| Armas | sword, greatsword, dagger, staff, axe, bow | `icons/weapons/` |
| Armadura | shield, helm, boot, ring, amulet, cape | `icons/armor/` |
| Consumibles | potion, flask, scroll | `icons/consum/` |
| Tesoro | coin, gem, largegem, chest, key | `icons/treasure/` |
| Bestiario | skull, bones, eye, flame | `icons/bestiary/` |
| UI | heart, star, cross, ankh, arrow, lock | `icons/ui/` |
| Estados de combate | fury, blessed, bleed, poison, burning, haste, chilled, cursed, shielded | `status/` |

Para cada icono existe una variante pre-coloreada por rareza en `icons-rarity/<nombre>/<nombre>_<rareza>_4x.png`.

### Fuente de iconos para stats

Para los 4 stats principales (sin icono específico en el kit), usar caracteres Unicode en VT323 o crear SVGs simples de 24×24:

- STR 💪 → icono de espada del kit (`icons/weapons/sword_4x.png`)
- DEX 🏹 → icono de arco del kit (`icons/weapons/bow_4x.png`)
- INT 🔮 → icono de báculo del kit (`icons/weapons/staff_4x.png`)
- LCK 🍀 → icono de estrella del kit (`icons/ui/star_4x.png`)

---

## g) Layout del HUD principal

Basado en `references/visual-style-refs/03_hud_combat_overlay.png`, adaptado a Mettlebound.

```
┌─────────────────────────────────────────────────────────────────────┐
│ [RETRATO] Sir Aldric  LVL 14     · Cripta de Piedra · Piso 3 ·     │
│  ─────    ▓▓▓▓▓▓▓░░░ HP 284/480                    [ESC·PAUSA]     │
│  [btn]    ▓▓▓▓░░░░░░ MP  40/90                     [I · MOCHILA]   │
│           ▓▓▓░░░░░░░ XP 340/364                    [M · MAPA]      │
│           [FURIA][VENENO]                                           │
│ ↑                                                    ↑              │
│ Top-left                                         Top-right          │
│ (portrait + bars + status)               (controles rápidos)       │
│                                                                     │
│                                                                     │
│                  [ESCENA 3D — BABYLON.JS]                           │
│                                                                     │
│                      -42        MISS                                │
│                          -18 ✦                                      │
│                                                                     │
│                                                                     │
│ [Q·habilidad]  [W·atk]  [E·interactuar]      💰 1.247  💎 41  💀 4│
│ ──────────────────────────────────────────────────────────────────  │
│ [🧪×3][📜×1]                                                        │
│ ↑                                                    ↑              │
│ Bottom-left                                    Bottom-right        │
│ (habilidades + consumibles)                     (monedas)          │
└─────────────────────────────────────────────────────────────────────┘
```

### Desglose de zonas

**Esquina superior izquierda** — Info del personaje:
- Retrato de clase (48×48px, del kit si disponible o placeholder de color)
- Nombre + nivel en VT323
- 3 barras apiladas: HP (roja), MP (azul), XP (dorada-ámbar) con valores numéricos dentro
- Fila de badges de estado (`status/badge_*.png` del kit)

**Centro superior** — Contexto de run:
- Nombre del bioma / piso actual en Cinzel Decorative pequeño
- Métricas opcionales: tiempo, profundidad, enemigos derrotados

**Esquina superior derecha** — Controles rápidos:
- Botones ghost con tecla rápida: [ESC · PAUSA] [I · MOCHILA] [M · MAPA]

**Centro** — Canvas Babylon.js (limpio, sin UI sobre la escena salvo damage numbers)

**Damage numbers** — Flotan en la escena 3D usando CSS position:absolute anclado al projected world position:
- VT323, peso bold, outline negro, animación: sube 40px y desvanece en 800ms

**Franja inferior** — Acciones y economía:
- Izquierda: slots de habilidad activa + consumibles
- Derecha: monedas (💰), gemas (💎), almas (💀) con VT323

### CSS del HUD container

```css
#ui-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;      /* el canvas sigue recibiendo clicks del jugador */
  z-index: 100;
  font-family: 'VT323', monospace;
}

#ui-hud > * {
  pointer-events: auto;      /* los elementos individuales sí reciben eventos */
}

.hud-panel-topleft {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: rgba(26, 18, 40, 0.85);
  border: 1px solid var(--border-gold-dim);
  padding: 10px 12px;
  backdrop-filter: blur(4px);
}
```

---

## h) Animaciones y transiciones

Mettlebound tiene **feedback rápido y claro, pero nunca frenético**. Las animaciones comunican estado, no entretienen.

| Transición | Duración | Easing | Notas |
|---|---|---|---|
| Apertura panel/inventario | 250ms | ease-out | Desliza desde el borde |
| Cierre panel/inventario | 200ms | ease-in | Más rápido que la apertura |
| Modal abrir | 280ms | ease-out + scale 0.96→1 | También fade-in |
| Modal cerrar | 180ms | ease-in | scale 1→0.96 + fade-out |
| Tooltip aparecer | 150ms | linear | Solo fade |
| Hover botón | 100ms | linear | Solo color |
| Hover tarjeta upgrade | 100ms | linear | Color borde + glow sutil |
| Cambio barra HP/MP | 400ms | ease-out | Animación numérica visual |
| Damage number flotar | 800ms | ease-out | Sube 40px, desvanece desde 100% a 0% |
| Cambio de piso | 800ms | fade negro | El canvas completo |
| Entrada a combate | ~1500ms | secuencia | Ver `06_COMBAT_SYSTEM.md` |
| Level-up flash | 600ms | ease-out | Destello dorado sobre pantalla |

### Reglas generales

- **No usar `bounce` ni `elastic`** — el juego es oscuro y sobrio, no caricatura
- **Siempre usar `ease-out`** para entradas (rápidas al principio, suaves al llegar)
- **Siempre usar `ease-in`** para salidas (el elemento "cae" hacia su destino)
- **Respetar `prefers-reduced-motion`** (ver sección de accesibilidad)
- **Nada parpadea sin razón** — si un elemento parpadea, significa que requiere acción urgente

```css
/* Template base para transiciones de UI */
.ui-transition {
  transition-property: opacity, transform, border-color, box-shadow;
  transition-duration: 200ms;
  transition-timing-function: ease-out;
}
```

---

## i) Accesibilidad

### Contraste mínimo WCAG AA

Todos los textos sobre fondo de panel deben cumplir al menos **4.5:1** (texto normal) o **3:1** (texto grande ≥18px bold):

| Texto | Fondo | Ratio aproximado | Cumple |
|---|---|---|---|
| `--text-primary` #f4e2a6 | `--bg-panel` #1a1228 | ~11:1 | ✅ |
| `--text-secondary` #d4bc7e | `--bg-panel` #1a1228 | ~8:1 | ✅ |
| `--text-muted` #a89058 | `--bg-panel` #1a1228 | ~5:1 | ✅ |
| `--rarity-rare-mid` #5a8acb | `--bg-panel` #1a1228 | ~4.8:1 | ✅ |
| `--rarity-uncommon-mid` #6a9a4a | `--bg-panel` #1a1228 | ~4.5:1 | ✅ (límite) |
| `--rarity-epic-mid` #a052d8 | `--bg-panel` #1a1228 | ~5.2:1 | ✅ |

**Atención:** `--rarity-common-mid` (#8c92a8 gris) sobre fondo oscuro da ~5.5:1 — aceptable, pero no usar en texto muy pequeño.

### Reducción de movimiento

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }

  /* Mantener feedback esencial aunque sea instantáneo */
  .ui-damage-number { display: none; }   /* demasiado movimiento, preferible omitir */
}
```

### Tamaños mínimos de fuente

- **Texto interactivo** (botones, opciones): mínimo 14px (0.875rem)
- **Texto de lectura** (lore, tooltips): mínimo 12px (0.75rem)
- **Etiquetas HUD** (stats pequeños): mínimo 11px (0.69rem), solo si hay espacio suficiente y no es información crítica
- **Área mínima de toque** para elementos clicables: 44×44px (WCAG 2.5.5)

### Indicadores no dependientes del color

El sistema de rareza usa color como canal primario, pero siempre incluye un indicador secundario:
- Nombre de rareza escrito en texto (`COMÚN`, `ÉPICO`, etc.) en la tarjeta
- Diferencias de saturación y brillo entre rarezas (no solo matiz)
- En tooltips, la palabra de rareza aparece siempre en texto, no solo como borde de color

---

## Layouts principales (referencia heredada del documento anterior)

### 1. HUD durante exploración

*(Ver sección g para el layout detallado y CSS)*

### 2. Inventario (despliegue lateral)

El inventario se despliega desde la derecha en 250ms ease-out. El mundo 3D sigue renderizándose detrás con `backdrop-filter: blur(4px)` y oscurecimiento `rgba(8,6,18, 0.6)`.

Panel principal con `panel_bronze_384.png` o equivalente CSS:
- Izquierda: slots equipados (paperdoll 3×4)
- Centro: cuadrícula de mochila 6×5
- Derecha: tooltip del item seleccionado + botones Equipar / Descartar

Los slots vacíos muestran el frame de rareza `slots/slot_common_64.png`, los ocupados muestran el icono del item con el frame de su rareza.

### 3. Modal de subida de nivel

```
┌──────────────────────────────────────────────────┐
│           · ASCENSIÓN ·                          │
│        ¡NIVEL 6!                                 │
│        ─────────────                             │
│  Puntos para distribuir: 3 / 3                  │
│                                                   │
│  STR [10] [−][+]  +1 HP, +5% daño físico        │
│  DEX  [4] [−][+]  +0.5% evasión, +4% ranged     │
│  INT  [2] [−][+]  +2 MP, +5% daño mágico        │
│  LCK  [4] [−][+]  +0.3% crit, +0.2% rareza      │
│                                                   │
│  Elige una mejora:                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  COMÚN     │  │  RARO      │  │  ÉPICO     │ │
│  │ [icono]    │  │ [icono]    │  │ [icono]    │ │
│  │ +5% daño   │  │ Inspeccionar│ │ Eco Arcano │ │
│  │ físico     │  │ no consume │  │            │ │
│  │            │  │ turno      │  │            │ │
│  └────────────┘  └────────────┘  └────────────┘ │
│                                                   │
│               [CONFIRMAR]                        │
└──────────────────────────────────────────────────┘
```

### 4. Menú principal

Fondo: render 3D de mazmorra con cámara orbitando lentamente. Sobre él, panel central con `--bg-overlay` y borde dorado.

Título "METTLEBOUND" en Cinzel Decorative grande con `text-shadow: 0 0 30px rgba(212, 160, 74, 0.5)`.

Botones: `.ui-btn--default` apilados verticalmente, ancho fijo, alineados al centro. Hover: borde pasa a `--border-gold`, texto a `--text-primary`.

### 5. Selector de pisos (Slay the Spire)

Inspirado en `07_dungeon_map_of_the_descent.png`. Fondo morado oscuro con líneas de conexión doradas (`--border-gold-dim`). Nodos como cuadrados con borde del color del tipo de sala. Panel lateral derecho muestra preview del nodo seleccionado.

### 6. Pantalla de muerte

Inspirada en `09_game_over_you_died.png`. Título "HAS PERECIDO" en Cinzel Decorative rojo sangre, full-width. Dos paneles: tally de la run (izquierda) + recompensas que vuelven (derecha). Botones: `[Volver al menú]` y `[Descender de nuevo]`.

### 7. Modal de evento narrativo

Panel centrado con `--bg-overlay` y animación entrada 280ms scale+fade. Título en Cinzel Decorative. Texto narrativo en Spectral. Opciones como botones `.ui-btn--default` con descripción en Spectral italic y posibles condiciones de coste.

---

## Internacionalización

Toda string visible al jugador pasa por `t()`. Archivos en `src/i18n/es.json` y `en.json`. Idiomas iniciales: español (es), inglés (en).

```typescript
t('combat.damage_dealt', { amount: 47 })
// es: "Has infligido 47 de daño."
// en: "You dealt 47 damage."
```

---

## Resolución y escalado

- Base de diseño: **1920×1080**
- Rango soportado: 1280×720 — 4K
- Unidades: `rem` para tipografía, `vw/vh` para layout, `px` para bordes y ornamentos
- No se soporta orientación vertical

---

## Implementación técnica

- **Babylon.js** renderiza la escena 3D en el `<canvas>` que ocupa toda la pantalla
- **HTML/CSS overlay** para toda la UI (el `<canvas>` tiene `z-index: 0`, el `#ui-root` tiene `z-index: 100`, `pointer-events: none` globalmente, `pointer-events: auto` en elementos interactivos)
- **EventBus (mitt)** para comunicación game ↔ UI sin acoplamiento directo
- `SceneManager` bloquea los inputs de juego cuando hay un modal abierto (flag `inputBlocked`)
- Los assets PNG del kit Grimspire en `references/grimspire-kit-full/` se importan vía `import` de Vite o referenciados con rutas relativas desde la carpeta `public/`
