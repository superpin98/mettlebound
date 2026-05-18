# 02 — Estructura del Proyecto

## 📁 Árbol de carpetas completo

```
abyss-below/
├── public/                          # Assets estáticos (favicon, etc.)
│   └── favicon.svg
│
├── src/
│   ├── main.ts                      # Entry point — bootstrap del juego
│   ├── style.css                    # Estilos globales mínimos (reset, fonts)
│   │
│   ├── config/                      # Configuración del juego (constantes)
│   │   ├── balance.ts               # Constantes de balance: fórmulas, multiplicadores
│   │   ├── classes.config.ts        # Definición de las 5 clases
│   │   ├── items.config.ts          # Definición base de items y conjuntos
│   │   ├── enemies.config.ts        # Definición de enemigos
│   │   ├── events.config.ts         # Eventos aleatorios
│   │   ├── rarity.config.ts         # Sistema de rareza, colores, drops
│   │   └── i18n.config.ts           # Setup de internacionalización
│   │
│   ├── core/                        # Núcleo del motor (Babylon, escena, render)
│   │   ├── Engine.ts                # Wrapper de BABYLON.Engine + Scene
│   │   ├── SceneManager.ts          # Gestión de escenas y transiciones
│   │   ├── CameraController.ts      # Cámara orbital (lo que ya tenemos)
│   │   ├── InputManager.ts          # WASD, mouse, hotkeys, abstraído
│   │   ├── AssetLoader.ts           # Carga de modelos y texturas
│   │   ├── EventBus.ts              # Event emitter global (mitt)
│   │   └── Logger.ts                # Logger central con niveles
│   │
│   ├── game/                        # Lógica de juego
│   │   ├── GameState.ts             # Estado global del juego (singleton)
│   │   ├── RunManager.ts            # Gestión de la run actual
│   │   │
│   │   ├── player/
│   │   │   ├── Player.ts            # Clase Player (instancia jugable)
│   │   │   ├── PlayerStats.ts       # Stats, niveles, XP
│   │   │   ├── PlayerInventory.ts   # Inventario + slots equipados
│   │   │   └── PlayerController.ts  # Control 3D del personaje
│   │   │
│   │   ├── classes/
│   │   │   ├── PlayerClass.ts       # Interfaz/clase base
│   │   │   ├── Warrior.ts
│   │   │   ├── Hunter.ts
│   │   │   ├── Mage.ts
│   │   │   ├── Rogue.ts
│   │   │   └── Wanderer.ts          # La clase neutra
│   │   │
│   │   ├── stats/
│   │   │   ├── StatType.ts          # Enum/types de stats
│   │   │   ├── StatCalculator.ts    # Fórmulas de daño, evasión, crit
│   │   │   └── BuffSystem.ts        # Buffs y debuffs temporales
│   │   │
│   │   ├── items/
│   │   │   ├── Item.ts              # Clase base de item
│   │   │   ├── ItemGenerator.ts     # Generación procedural con rareza
│   │   │   ├── ItemEffects.ts       # Efectos únicos de épicos/legendarios
│   │   │   ├── EquipmentSlot.ts     # Definición de slots
│   │   │   ├── SetBonus.ts          # Bonus de conjunto
│   │   │   └── types/
│   │   │       ├── Weapon.ts
│   │   │       ├── Armor.ts
│   │   │       ├── Accessory.ts     # Anillos, colgante, cinturón
│   │   │       └── Pet.ts           # Mascotas
│   │   │
│   │   ├── dungeon/
│   │   │   ├── Dungeon.ts           # Estructura general
│   │   │   ├── Floor.ts             # Un piso
│   │   │   ├── Room.ts              # Una sala
│   │   │   ├── RoomGenerator.ts     # Generación procedural de salas
│   │   │   ├── DungeonGraph.ts      # Conexiones entre salas
│   │   │   └── interactables/
│   │   │       ├── Interactable.ts  # Clase base
│   │   │       ├── Chest.ts
│   │   │       ├── Door.ts
│   │   │       ├── Hazard.ts        # Trampas, abismos
│   │   │       └── EnvironmentObject.ts # Rocas, antorchas, etc.
│   │   │
│   │   ├── enemies/
│   │   │   ├── Enemy.ts             # Clase base
│   │   │   ├── EnemyAI.ts           # IA básica de combate por turnos
│   │   │   ├── EnemyFactory.ts      # Spawn según piso/dificultad
│   │   │   ├── EnemyRespawn.ts      # Respawn cíclico
│   │   │   └── roster/              # Los 10 enemigos del MVP
│   │   │       ├── SkeletonWarrior.ts
│   │   │       ├── ShadowImp.ts
│   │   │       ├── BoneArcher.ts
│   │   │       ├── CursedSpider.ts
│   │   │       ├── RottenZombie.ts
│   │   │       ├── DarkAcolyte.ts
│   │   │       ├── CorruptKnight.ts
│   │   │       ├── VoidWraith.ts
│   │   │       ├── BloodHound.ts
│   │   │       └── AbyssSlime.ts
│   │   │
│   │   ├── combat/
│   │   │   ├── CombatManager.ts     # Orquesta el combate
│   │   │   ├── TurnSystem.ts        # Orden de turnos, "ataque por sorpresa"
│   │   │   ├── CombatScene.ts       # Escena 3D isométrica
│   │   │   ├── CombatActions.ts     # Acciones: atacar, habilidad, huir, inspeccionar
│   │   │   ├── EscapeFormula.ts     # Cálculo de probabilidad de huida
│   │   │   ├── DamageFormula.ts     # Fórmula central de daño
│   │   │   ├── EnvironmentInteraction.ts # Interacción con sala en combate
│   │   │   └── animations/
│   │   │       ├── AttackAnim.ts
│   │   │       ├── DamageNumbers.ts # Numbers volando, fuente pixel
│   │   │       └── DeathAnim.ts
│   │   │
│   │   ├── events/
│   │   │   ├── EventManager.ts      # Trigger y resolución de eventos
│   │   │   ├── RandomEvent.ts       # Clase base
│   │   │   └── catalog/             # Los 10 eventos del MVP
│   │   │       ├── _index.ts        # Registro de todos los eventos
│   │   │       ├── chest_basic.ts
│   │   │       ├── chest_trapped.ts
│   │   │       ├── merchant.ts
│   │   │       ├── altar_hp.ts
│   │   │       ├── narrative_choice.ts
│   │   │       ├── trap_spikes.ts
│   │   │       ├── rest_area.ts
│   │   │       ├── puzzle_simple.ts
│   │   │       ├── fountain.ts
│   │   │       └── mini_boss.ts
│   │   │
│   │   ├── progression/
│   │   │   ├── LevelUp.ts           # Subida de nivel + asignación de puntos
│   │   │   ├── Upgrade.ts           # Upgrades al subir nivel
│   │   │   ├── UpgradePool.ts       # Pool de mejoras para elegir 3
│   │   │   └── XPSystem.ts          # Cálculo de XP y curva
│   │   │
│   │   └── meta/                    # Metaprogresión (futuro post-MVP)
│   │       └── README.md            # Plan documentado
│   │
│   ├── ui/                          # Capa de UI
│   │   ├── HUD.ts                   # HP, MP, oro, piso, etc.
│   │   ├── MainMenu.ts              # Menú principal
│   │   ├── InventoryPanel.ts        # Inventario con drag-and-drop
│   │   ├── CombatUI.ts              # Botones de acción en combate
│   │   ├── EventModal.ts            # Modal de eventos narrativos
│   │   ├── LevelUpModal.ts          # Modal de subida de nivel
│   │   ├── FloorSelector.ts         # Selector de pisos tipo Slay the Spire
│   │   ├── LanguageSelector.ts
│   │   ├── PauseMenu.ts
│   │   ├── Tooltip.ts               # Tooltips de items con estilo POE
│   │   └── components/              # Componentes UI reutilizables
│   │       ├── Button.ts
│   │       ├── Panel.ts
│   │       ├── ProgressBar.ts
│   │       └── RarityBadge.ts
│   │
│   ├── persistence/
│   │   ├── SaveManager.ts           # Save/load con localStorage
│   │   ├── SaveSchema.ts            # Zod schemas de validación
│   │   ├── SaveEncryption.ts        # Hash de integridad
│   │   └── MigrationManager.ts      # Migración entre versiones de save
│   │
│   ├── i18n/
│   │   ├── es.json                  # Español
│   │   ├── en.json                  # Inglés
│   │   └── i18n.ts                  # Setup
│   │
│   ├── types/
│   │   ├── game.types.ts            # Tipos compartidos
│   │   ├── ui.types.ts
│   │   └── globals.d.ts             # Tipos globales de TS
│   │
│   └── utils/
│       ├── random.ts                # RNG seedeable (para futuro determinismo)
│       ├── math.ts                  # Utilidades matemáticas
│       ├── color.ts                 # Helpers de colores (rareza, daño)
│       └── debug.ts                 # Solo desarrollo
│
├── tests/
│   ├── stats/                       # Tests de fórmulas de daño
│   ├── items/                       # Tests de generación procedural
│   └── combat/                      # Tests de turnos
│
├── docs/                            # ESTA documentación (la metes aquí)
│   ├── README.md
│   ├── 00_PROJECT_OVERVIEW.md
│   └── ... (resto de archivos)
│
├── .eslintrc.json                   # Config ESLint
├── .prettierrc                      # Config Prettier
├── tsconfig.json                    # Config TypeScript
├── vite.config.ts                   # Config Vite
├── netlify.toml                     # Headers de seguridad, redirects
├── package.json
├── .gitignore
└── README.md                        # README público del repo
```

## 📝 Convenciones de naming

### Archivos
- **Clases:** `PascalCase.ts` → `PlayerStats.ts`, `CombatManager.ts`
- **Configuración:** `kebab-case.config.ts` → `balance.config.ts`
- **Utilidades:** `camelCase.ts` → `random.ts`, `math.ts`
- **Tipos:** `kebab-case.types.ts` → `game.types.ts`
- **Tests:** `[archivo].test.ts` → `StatCalculator.test.ts`

### Código
- **Clases e Interfaces:** `PascalCase`
- **Funciones y variables:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Tipos y Enums:** `PascalCase`
- **Archivos privados (no exportados):** prefijo `_`

## 🎯 Reglas estrictas

1. **Un archivo, una responsabilidad.** Si un archivo crece a más de ~300 líneas, divídelo.
2. **No hay imports circulares.** Si Claude los crea, recházalo.
3. **Los `config/` solo exportan datos, nunca lógica.**
4. **Los `types/` solo exportan tipos, nunca implementación.**
5. **`game/` no conoce a `ui/`.** La UI escucha eventos del EventBus, pero el game core no llama a la UI directamente.
6. **`core/` es engine-agnostic dentro de lo razonable.** Babylon se usa en `core/Engine.ts` y en sistemas visuales, pero la lógica de juego no debería importar Babylon directamente.

## 🧪 Estrategia de testing

- **Tests obligatorios para:** fórmulas de daño, generación de items, sistema de turnos, cálculo de XP, validación de saves.
- **Tests opcionales para:** UI, navegación, animaciones.
- Vitest se ejecuta con `npm test` y debe pasar antes de cada commit grande.

## 📦 Output de build

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Bundle principal
│   ├── babylon-[hash].js    # Chunk de Babylon
│   └── index-[hash].css
└── favicon.svg
```
