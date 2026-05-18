# 10 — UI / UX (Estilo POE pulido)

## 🎨 Filosofía visual

**Referencias principales:** Path of Exile (densidad informativa, tooltips, paleta), Diablo II resurrected (lujo gótico), Hades (transiciones suaves y feedback satisfactorio).

**Principios:**

1. **Oscuro pero legible.** Fondo siempre con contraste alto sobre el texto.
2. **Información jerarquizada.** Lo importante grande y destacado, lo secundario más sutil.
3. **Color = significado.** Cada color tiene un rol (rareza, daño, estado).
4. **Animaciones sutiles.** Nada parpadea sin razón. Las transiciones son suaves (200-400ms).
5. **Feedback inmediato.** Toda acción del jugador genera respuesta visual y sonora *(post-MVP el sonido)*.
6. **Tipografía cuidada.** Mezcla de:
   - **Cinzel** o **Crimson Pro** para títulos y nombres de items (serifa con sabor medieval-fantasy)
   - **Inter** o **Rubik** para UI general y descripciones
   - **VT323** o **Press Start 2P** SOLO para números de daño volando

## 🎨 Paleta de colores

```css
:root {
  /* === BACKGROUNDS === */
  --bg-darkest:     #0a0a0d;   /* fondos más profundos */
  --bg-dark:        #14141a;   /* paneles principales */
  --bg-medium:      #1e1e26;   /* paneles secundarios */
  --bg-light:       #2a2a35;   /* hover, inputs, separadores */

  /* === BORDES === */
  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-medium:  rgba(255, 255, 255, 0.15);
  --border-strong:  rgba(255, 255, 255, 0.3);
  --border-gold:    #c8a45a;      /* acentos premium */

  /* === TEXTO === */
  --text-primary:   #f0e8d0;   /* texto principal, ligeramente cálido */
  --text-secondary: #b8b0a0;   /* texto secundario */
  --text-muted:     #6e6a60;   /* texto deshabilitado */
  --text-bright:    #ffffff;

  /* === RAREZAS (también usados en bordes de items, tooltips) === */
  --rarity-common:    #9d9d9d;
  --rarity-uncommon:  #1eff00;
  --rarity-rare:      #0070dd;
  --rarity-epic:      #a335ee;
  --rarity-legendary: #ff8000;

  /* === STATS === */
  --stat-str:       #d4543a;   /* rojo guerrero */
  --stat-dex:       #58c878;   /* verde ágil */
  --stat-int:       #5b8edb;   /* azul arcano */
  --stat-lck:       #f0c850;   /* dorado fortuna */

  /* === ESTADOS / DAÑOS === */
  --hp:             #d04848;
  --mp:             #5070d0;
  --xp:             #c8a45a;
  --damage-phys:    #e8d090;
  --damage-ranged:  #90e8c0;
  --damage-magic:   #a890e8;
  --damage-true:    #ffffff;
  --damage-fire:    #ff8040;
  --damage-ice:     #80c8ff;
  --damage-poison:  #80c040;
  --damage-bleed:   #c84040;
  --heal:           #80ff80;

  /* === FEEDBACK === */
  --success:        #6abe6e;
  --warning:        #e8a838;
  --danger:         #d44040;
  --info:           #4a9bd1;
}
```

## 🖼️ Layouts principales

### 1. HUD durante exploración

```
┌────────────────────────────────────────────────────────────────┐
│ [Nombre Personaje] LV.5    [Piso 3 — Cripta de Piedra]   [⚙]  │ ← Top bar
│ ━━━━━━━━━━━━━━━━━━━━━━━━ HP 87/120 ━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ MP 25/45  ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                │
│                                                                │
│                      [ESCENA 3D NAVEGABLE]                     │
│                                                                │
│                                                                │
│                                                                │
│                                                                │ ← Center
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│ [🎒 Inventario (I)]      💰 1.247        [🗺 Minimapa]        │
│                                                                │ ← Bottom bar
└────────────────────────────────────────────────────────────────┘
```

**Elementos visibles siempre:**
- HP y MP barras en la parte superior (estilo POE: anchas, con contador numérico interno)
- Nombre, nivel, piso actual
- Oro acumulado en la run
- Minimapa (arriba derecha o abajo derecha)
- Acceso rápido a inventario y menú pausa

**Visible cuando aplica:**
- Tooltip al pasar por encima de un interactuable con la tecla a pulsar (E)
- Notificaciones de eventos importantes (XP ganado, item recogido, level up)
- Aviso de "salida del piso disponible" al llegar a la última sala

### 2. Inventario (despliegue lateral)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          (escena 3D atenuada con blur leve)          │
│                                                      │
│                       ┌──────────────────────────────┤
│                       │ INVENTARIO            [X]    │
│                       │                              │
│                       │ ┌─ SLOTS EQUIPADOS ─────┐    │
│                       │ │  [CABEZA]  [COLGANTE] │    │
│                       │ │  [ARMA] [PECHO] [OFF] │    │
│                       │ │  [GUANTES] [CINTURÓN] │    │
│                       │ │  [PANTS]   [BOTAS]    │    │
│                       │ │  [ANILLO1] [ANILLO2]  │    │
│                       │ │  [MASCOTA]            │    │
│                       │ └────────────────────────┘    │
│                       │                              │
│                       │ ┌─ MOCHILA ───────────────┐  │
│                       │ │ [ ][ ][ ][ ][ ][ ]      │  │
│                       │ │ [ ][ ][ ][ ][ ][ ]      │  │
│                       │ │ [ ][ ][ ][ ][ ][ ]      │  │
│                       │ │ [ ][ ][ ][ ][ ][ ]      │  │
│                       │ │ [ ][ ][ ][ ][ ][ ]      │  │
│                       │ └──────────────────────────┘  │
│                       │ [Ordenar] [Filtrar]          │
│                       └──────────────────────────────┘
└──────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Se despliega desde la derecha con animación de 250ms (ease-out).
- El mundo 3D se sigue renderizando detrás (con blur ligero y oscurecimiento).
- **Drag and drop** entre slots y mochila.
- **Click derecho** sobre un item equipado → al inventario.
- **Click derecho** sobre un item del inventario → equipa en el slot correspondiente (si ya hay item, se intercambian).
- **Hover** → tooltip estilo POE (ver sección Tooltips).
- **Doble click** → intenta equipar.
- Items se ordenan por categoría + rareza por defecto.
- Filtros: por tipo, por rareza, "solo nuevos" (los que aún no has visto).
- Slots equipados muestran el icono del item; tooltip al hover.

### 3. Tooltip de item (estilo POE)

```
┌──────────────────────────────────────────────────┐
│ Casco Susurrante del Erudito         [Épico]    │ ← Color por rareza
│ Casco mágico                                    │
│ Nivel requerido: 8                              │
│ ─────────────────────────────────────────────── │
│ Armadura: 12                                    │
│ Resistencia mágica: 5                           │
│ ─────────────────────────────────────────────── │
│ + 8 Inteligencia                                │
│ + 15 Mana máximo                                │
│ + 12% Daño mágico                               │
│ + 3% Crítico                                    │
│ ─────────────────────────────────────────────── │
│ ✦ Aliento del Abismo                            │ ← Efecto único destacado
│   Recuperas 2 MP al inicio de cada turno        │
│ ─────────────────────────────────────────────── │
│ "Las palabras del abismo se aprenden            │
│  escuchando, no leyendo."                       │ ← Flavor text en cursiva
│                                                  │
│ Conjunto: Hilo del Erudito (1/4)                │ ← Si pertenece a conjunto
└──────────────────────────────────────────────────┘
```

**Reglas del tooltip:**
- Fondo: `--bg-darkest` con `--border-medium`.
- Borde del color de rareza (1.5px sólido).
- Sombra externa difusa con el color de rareza al 30% para efecto "glow".
- Padding generoso (16px), line-height 1.5.
- Nombre del item en color de rareza, tamaño 16px, Cinzel.
- Separadores: línea de 1px en `--border-subtle`.
- Stats: blancos, alineados.
- Affixes: azul claro (`#88b8e8`) precedidos de "+".
- Efecto único: prefijo `✦` en dorado, nombre destacado, descripción en blanco.
- Flavor text: cursiva, `--text-secondary`, 12px.
- Aparece junto al cursor (con offset) y nunca se sale de pantalla.
- Fade in 150ms.

### 4. Menú principal

```
                ABYSS BELOW
                ───────────

                ▸ Continuar
                ▸ Nueva Run
                ▸ Historial de Runs       [bloqueado en MVP]
                ▸ Tienda Meta              [bloqueado en MVP]
                ▸ Opciones
                ▸ Idioma:  Español ▾
                ▸ Créditos
                ▸ Salir
```

- Fondo: render 3D suave de una mazmorra con cámara orbitando lentamente.
- Título en Cinzel grande con bordes dorados sutiles.
- Botones del menú con hover dorado + transición lateral leve.
- Selector de idioma con dropdown elegante.

### 5. Selector de pisos (Slay the Spire)

```
┌─────────────────────────────────────────────────────────┐
│           ¿QUÉ CAMINO TOMARÁS?                          │
│                                                          │
│        ┌── [Camino A] ─→ ⚔️⚔️🪤 Combates             │
│        │   Cripta de Piedra, dificultad media           │
│        │   Loot frecuente                               │
│        │                                                 │
│ [Sala  ┼── [Camino B] ─→ 💎📜🛒 Eventos                │
│  fin]  │   Bibliotecas Olvidadas, dificultad baja       │
│        │   Tienda al final                              │
│        │                                                 │
│        └── [Camino C] ─→ 👹⚔️🪤 Elite                  │
│            Catacumbas, dificultad alta                  │
│            Mini-boss garantizado, mejor loot            │
│                                                          │
│                  [Confirmar elección]                   │
└─────────────────────────────────────────────────────────┘
```

### 6. Combate

Ya cubierto en `06_COMBAT_SYSTEM.md` pero los elementos UI son:

**HUD inferior izquierda — Player:**
```
┌─────────────────────────┐
│ TÚ - Pícaro nv.5        │
│ ━━━━━━━ HP 67/85 ━━━━━━│
│ ━━━━━━━ MP 18/30 ━━━━━━│
│ [estados activos]       │
└─────────────────────────┘
```

**HUD superior — Enemigos (uno por enemigo):**
```
┌─────────────────────────┐
│ Esqueleto Guerrero nv.4 │
│ ━━━━━━━ HP 28/50 ━━━━━━│
│ [estados activos]       │
└─────────────────────────┘
```

**Panel de acciones (cuando es el turno del jugador):**
```
┌────────────────────────────────────────────────────────┐
│  [⚔ Atacar]  [✦ Habilidad]  [🧪 Objeto]               │
│  [🔍 Inspeccionar]  [🌟 Entorno]  [🏃 Huir]            │
└────────────────────────────────────────────────────────┘
```

**Texto de turno (parte superior central):**
```
> Es el turno del Pícaro
```

**Cuando hay sorpresa:**
```
> ¡EMBOSCADA!  (texto pixel art gigante 2s, fade out)
```

### 7. Modal de evento narrativo

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│      [imagen ilustrativa del evento opcional]           │
│                                                          │
│  El Viajero Caído                                        │
│  ───────────────                                         │
│                                                          │
│  En el centro de la sala, un viajero herido apoyado     │
│  contra una pared. Tiene sangre seca en la armadura     │
│  y te mira con ojos suplicantes. Te susurra...          │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ▸ Curarlo (gasta 2 pociones de HP)              │   │
│  │ ▸ Robarle                                       │   │
│  │ ▸ Ignorar y continuar                           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Modal centrado, fondo translúcido oscuro (no negro total).
- Animación de entrada: fade in 300ms + zoom desde 0.95 a 1.
- Texto del evento en `--text-primary` con fuente Cinzel para títulos.
- Choices como botones grandes con hover claro.
- Si una choice tiene requisito (gold/stat), se muestra como prefijo y se deshabilita si no cumple.

### 8. Subida de nivel

Modal central:

```
┌──────────────────────────────────────────────────────┐
│              ¡SUBES AL NIVEL 6!                      │
│              ──────────────────                      │
│                                                       │
│   Puntos de stats disponibles: 3                     │
│                                                       │
│   ┌─────────────────────────────────────────────┐   │
│   │  STR  10  [-] [+]   +1 HP, +5% daño físico  │   │
│   │  DEX   4  [-] [+]   +0.5% evasión, +4% ranged│   │
│   │  INT   2  [-] [+]   +2 MP, +5% daño mágico  │   │
│   │  LCK   4  [-] [+]   +0.3% crit, +0.2% rareza│   │
│   └─────────────────────────────────────────────┘   │
│                                                       │
│   Elige una mejora:                                  │
│   ┌─────────────────┐ ┌─────────────────┐ ┌────────┐│
│   │ [Común]         │ │ [Raro]          │ │ [Épico]││
│   │ +5% daño físico │ │ Inspeccionar    │ │ Eco    ││
│   │                 │ │ no consume turno│ │ Arcano ││
│   └─────────────────┘ └─────────────────┘ └────────┘│
│                                                       │
│                    [Confirmar]                        │
└──────────────────────────────────────────────────────┘
```

Las cards de mejora muestran el color de rareza en el borde y la etiqueta.

### 9. Pantalla de muerte / fin de run

```
┌──────────────────────────────────────────────────────┐
│                                                       │
│                  HAS PERECIDO                         │
│                  ────────────                         │
│                                                       │
│        "Otro nombre olvidado por el abismo."         │
│                                                       │
│   Pisos alcanzados:       3                          │
│   Enemigos derrotados:    47                         │
│   Oro acumulado:          1.247                      │
│   Items obtenidos:        18                         │
│   Tiempo de la run:       00:47:32                   │
│                                                       │
│   Mejor objeto:                                       │
│   [tooltip del mejor item de la run en miniatura]    │
│                                                       │
│   (Post-MVP) Divisa permanente obtenida: 124 ✦       │
│                                                       │
│   [Volver al menú principal]                         │
└──────────────────────────────────────────────────────┘
```

## 🎬 Transiciones y animaciones

| Transición | Duración | Easing |
|------------|----------|--------|
| Apertura de inventario | 250ms | ease-out |
| Cierre de inventario | 200ms | ease-in |
| Modal abrir | 300ms | ease-out + scale |
| Modal cerrar | 200ms | ease-in |
| Tooltip aparecer | 150ms | linear |
| Cambio de sala | 0ms (no fade, render continuo) | — |
| Cambio de piso | 800ms | fade negro |
| Entrada combate | ~1500ms total | secuencia (ver `06_COMBAT_SYSTEM.md`) |
| Hover botón | 100ms | linear |
| Cambio de stat (HP/MP bar) | 400ms | ease-out (animación numérica suave) |

## 🌐 Internacionalización

- Selector visible en menú principal y opciones in-game.
- Cambio inmediato sin reload.
- Idiomas iniciales: **Español (es)**, **Inglés (en)**.
- Estructura preparada para añadir más: portugués, francés, alemán...
- Todos los strings en `src/i18n/[lang].json`.
- Función global `t(key, vars?)`.

```typescript
// Ejemplo
t('events.merchant.greeting')
// → "Pasa, viajero. Tengo cosas que no encontrarás abajo."

t('combat.damage_dealt', { amount: 47 })
// → "Has hecho 47 de daño."
```

## ♿ Accesibilidad básica

- Contraste alto en texto (mínimo 4.5:1 WCAG AA).
- Indicadores visuales además del color (íconos, formas).
- Reproductividad: el juego se puede pausar en cualquier momento.
- Keybinds configurables (post-MVP) pero por defecto sensatos.

## 📐 Resolución y escalado

- Diseñado para **1920×1080** como base.
- UI escala proporcionalmente entre 1280×720 y 4K.
- Elementos UI definidos en unidades relativas (vh/vw o rem).
- No se soporta orientación vertical.

## 🛠️ Implementación técnica

- **Babylon GUI** para la UI 3D (HUD overlay sobre la escena).
- **HTML/CSS overlays** para modales complejos y menús (más flexibilidad).
- Mezcla manejada por `SceneManager`: bloquea inputs de juego cuando hay overlay abierto.
