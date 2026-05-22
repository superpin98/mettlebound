# 15 — Sistema de Interacción: Vectores y Resistencias

> **Documento normativo.** Define los esquemas TypeScript, el motor de resolución,
> las escalas de magnitud, la precedencia de resistencias, las convenciones de nombres
> y los anti-patterns del sistema. Fuente de verdad junto a
> `docs/data/interaction_vectors.json`.
>
> Parte A del catálogo (434 vectores, 34 categorías) → `interaction_vectors.json`  
> Parte B (combinaciones, razas, buffs, propuestas) → `interaction_vectors.json`

---

## 1. Esquemas TypeScript

### 1.1 `MagnitudeLevel` y `ResistanceLevel`

```typescript
/**
 * Cinco niveles de magnitud. "trivial" es una adición de B5 respecto al
 * system_meta original (que tenía 4: low/medium/high/extreme).
 * Algunos vectores catalogados como "low" en Parte A podrán recalibrarse
 * a "trivial" en una pasada posterior. Sin urgencia para Sprint 4.
 */
type MagnitudeLevel = "trivial" | "low" | "medium" | "high" | "extreme";

/**
 * Nueve niveles de resistencia.
 * - El system_meta original tenía 8 (incluyendo "heal", sin "extreme_resist").
 * - B5 añade "extreme_resist" como escalón entre immune e resist_75.
 * - "heal" se conserva tal cual del sistema original: ver §1.1a para semántica.
 */
type ResistanceLevel =
  | "heal"               // El receptor CURA HP en vez de recibir daño (ver §1.1a)
  | "immune"             // ×0.00 — daño nulo, efecto nulo
  | "extreme_resist"     // ×0.10 — adición B5, para "casi inmune pero no del todo"
  | "resist_75"          // ×0.25
  | "resist_50"          // ×0.50
  | "resist_25"          // ×0.75
  | "normal"             // ×1.00 — sin modificación
  | "vulnerable"         // ×1.50
  | "extreme_vulnerable";// ×2.00
```

#### §1.1a — Semántica de `"heal"` como ResistanceLevel

`"heal"` no es un tipo de curación activa: es la declaración de que una entidad
**convierte en regeneración** ciertos vectores que a otras entidades les harían daño.
Ejemplos del catálogo (Parte A):

- **Slime de ácido** recibe `elemental_acid_dissolve_organic` → level `heal`.
  El ácido es su medio natural; en vez de dañarle, restaura su HP.
- **Sombra / Espectro** recibe `elemental_dark_void_drain` → level `heal`.
  Se alimenta del drenaje void; cuanto más extrae el generador, más se potencia.
- **Esqueleto** recibe `exotic_dark_corruption_aura` → level `heal`.
  Ya es no-muerto; el aura de corrupción lo potencia en vez de corromperlo.

El motor lo implementa en el Paso 6: si el `ResistanceLevel` resuelto es `"heal"`,
en vez de `receptor.hp -= daño_final`, se ejecuta `receptor.hp += daño_final`
(sin sobrepasar `maxHp`). El Codex lo registra como interacción especial.

`"heal"` es siempre un trait racial o de buff específico; **nunca el `default_resistance`**
de una raza.

---

### 1.2 `VectorRef` — Referencia al catálogo

```typescript
/** Referencia ligera a un vector del catálogo. */
interface VectorRef {
  vectorId: string;            // ID canónico, ej: "elemental_fire_combustion_direct"
  magnitudeLevel?: MagnitudeLevel; // Sobreescribe el nivel base si se especifica
}
```

### 1.3 `VectorImpact` — Vector aplicado con contexto concreto

```typescript
/**
 * Un vector real en vuelo: el generador declara qué produce, con qué magnitud,
 * rango y duración. El motor usa esto para resolver contra las resistencias del receptor.
 */
interface VectorImpact {
  vectorId: string;
  magnitude: MagnitudeLevel;
  source: EntityId;
  target?: EntityId | "area";
  areaRadius?: number;     // Casillas de radio si target === "area"
  durationTurns?: number;  // 0 = instantáneo
  tags?: string[];         // Metaetiquetas: "fire", "wet", "push", "magic", etc.
}
```

### 1.4 `Resistance` — Cómo resiste una entidad un vector

```typescript
interface Resistance {
  /** ID exacto del vector; tiene prioridad sobre vectorIdPrefix si ambos presentes. */
  vectorId?: string;
  /**
   * Prefijo de grupo: cubre todos los IDs que empiecen por este prefijo.
   * Ej: "physical_external_slash_" cubre slash_light, slash_heavy, slash_sweep, slash_cleave.
   */
  vectorIdPrefix?: string;
  level: ResistanceLevel;
  /** La resistencia solo aplica si esta condición es verdadera. */
  condition?: ResistanceCondition;
}

interface ResistanceCondition {
  type: "buff_active" | "terrain_tag" | "hp_below_pct" | "daytime" | "custom";
  value: string; // Ej: "buff_iron_skin" | "wet" | "50" | "night"
}
```

### 1.5 `ResistanceProfile` — Mapa completo de resistencias

```typescript
/**
 * Todas las fuentes de resistencia de una entidad, organizadas por origen.
 * El motor las aplica en el orden definido en §4 (Precedencia).
 */
interface ResistanceProfile {
  defaultResistance: ResistanceLevel;  // Fallback para cualquier vector no listado
  raceBase: Resistance[];
  equipment: Resistance[];
  buffsActive: Resistance[];
  cursesActive: Resistance[];
}
```

### 1.6 `Entity` — Interface base

```typescript
type EntityId = string; // Ej: "skeleton_warrior_room3_02", "player_1"

interface Entity {
  id: EntityId;
  type: "player" | "enemy" | "npc" | "prop";
  race: string; // Ej: "skeleton_warrior", "goblin_scout", "construct_golem_stone"

  hp: number;
  maxHp: number;
  str: number;
  dex: number;
  int: number;
  ste: number;

  resistances: ResistanceProfile;
  buffsActive: Buff[];
  cursesActive: Curse[];

  /** Vectores que esta entidad puede generar (arsenal declarado). */
  innateVectors: VectorRef[];

  gridPosition: { x: number; z: number };
  isAnchored: boolean;    // Inmune a movimiento forzado si true
  isEthereal: boolean;    // Ignora obstáculos físicos y vectores no-mágicos
  isInspectable: boolean;
  codexId?: string;
}
```

### 1.7 `Buff` / `Curse` — Efecto temporal

```typescript
interface Buff {
  id: string;   // Ej: "buff_iron_skin", "curse_fire_weakness"
  name: string;
  type: "buff" | "curse";
  durationType: "turns" | "combat" | "run" | "permanent";
  remainingTurns?: number; // Solo si durationType === "turns"

  /** Resistencias que concede este buff al portador. */
  resistancesGranted: Resistance[];
  /** Vulnerabilidades que impone (Resistance con level vulnerable/extreme_vulnerable). */
  vulnerabilitiesGranted: Resistance[];
  /** Modificadores de stats mientras el buff está activo. */
  statModifiers?: Partial<Record<"str" | "dex" | "int" | "ste" | "hp", number>>;
  /** Estado de entidad que fuerza el buff. */
  forcedState?: "levitating" | "invisible" | "wet" | "oiled" |
                "on_fire" | "frozen" | "ethereal";

  vfxHint: string;    // Clave para el sistema VFX, ej: "metallic_tint_on_skin"
  iconHint: string;   // Clave para el icono de UI, ej: "iron_skin_icon"
  sourceId?: string;  // Ej: "spell_iron_skin", "legendary_item_void_ring"

  /**
   * Protección anti-cycling para buffs con immune (ver §6 AP-6).
   * Si true, el buff no puede reactivarse mientras esté activo.
   */
  noCycling?: boolean;
  /** Tier del hechizo o rareza del ítem que genera este buff (1–3). */
  sourceTier?: 1 | 2 | 3;
}

/** Alias tipado para claridad semántica. Los curses usan type === "curse". */
type Curse = Buff;
```

### 1.8 `InteractableProp` — Objeto del entorno con vectores

```typescript
type PropState =
  | "intact" | "damaged" | "active"
  | "extinguished" | "broken" | "burning";

interface PropReaction {
  triggerVectorId: string;          // Vector que desencadena la reacción
  resultState?: PropState;          // Nuevo estado del prop tras la reacción
  producesVectors?: VectorImpact[]; // Vectores generados como consecuencia
  codexHint?: string;               // Descripción para el Codex
}

/**
 * Cualquier objeto del entorno que puede generar vectores al activarse,
 * destruirse o interactuar con otros vectores.
 * Implementa el pilar "Todo lo que pueda ser interactuable, lo es".
 */
interface InteractableProp {
  id: string;        // Ej: "torch_wall_room2_01", "barrel_oil_room1_03"
  propType: string;  // Ej: "torch", "barrel_oil", "pillar", "bookshelf"
  state: PropState;

  resistances: ResistanceProfile;

  /** Vectores generados cuando el jugador ejecuta acción sobre el prop. */
  onActivate?: VectorImpact[];
  /** Vectores generados cuando el prop es destruido (HP → 0). */
  onDestroy?: VectorImpact[];
  /** Vectores emitidos de forma continua mientras el prop esté activo (por turno). */
  onSustained?: VectorImpact[];
  /** Transformaciones de estado al recibir vectores específicos. */
  reactions?: PropReaction[];

  hp: number;
  maxHp: number;
  isDestructible: boolean;
  isLightSource: boolean;
  lightSourceId?: string;       // ID del PointLight de Babylon.js asociado

  gridPosition: { x: number; z: number };
  inCombatSnapshot: boolean;    // true cuando la sala está en modo combate clonado
}
```

### 1.9 `CombatRoom` — Snapshot de sala en combate

```typescript
interface FluidTile {
  position: { x: number; z: number };
  fluidType: "water" | "oil" | "acid" | "blood" | "toxic_gas" | "ice";
  state: "liquid" | "frozen" | "evaporating" | "burning";
  remainingTurns: number;
}

/**
 * La sala de combate es un clon exacto de la sala de exploración.
 * Todos los props, luces y posiciones se copian al iniciar el combate.
 * Los cambios durante el combate no afectan a la sala original hasta su resolución.
 */
interface CombatRoom {
  sourceRoomId: string;
  entities: Entity[];
  props: InteractableProp[];
  activeFluids: FluidTile[];
  lightSources: LightSource[];
  turnOrder: EntityId[];
  currentTurn: number;
  surpriseTurnOwner?: EntityId; // Beneficiario del turno sorpresa, si lo hay
}
```

---

## 2. Diagrama de resolución del motor

Cuando un generador produce un `VectorImpact` y llega a un receptor,
el motor ejecuta estos pasos **en orden estricto**:

```
PASO 0 · Validación
  ¿Receptor existe? ¿En rango? ¿LoS válido?
  → Fallo: impacto cancelado, sin efecto.

PASO 1 · Resistencia base de raza
  race_resistances[race].resistance_exceptions
  → vectorId exacto              → usar ese level
  → vectorIdPrefix que cubre ID  → usar ese level
  → sin excepción                → usar default_resistance de la raza

PASO 2 · Aplicar equipo activo
  equipment → misma lógica exacto/prefijo
  → sobreescribe resultado del Paso 1 si hay entrada
  → "immune" de equipo es INMUNIDAD ESTRUCTURAL: no degradable por maldiciones

PASO 3 · Aplicar buffs activos  (acumulación: tomar el MÁS FAVORABLE)
  Por cada buff activo con resistencia al vector:
  → si el level es mejor que el acumulado: reemplazar

PASO 4 · Aplicar maldiciones activas  (acumulación: tomar el PEOR)
  Por cada curse con vulnerabilidad al vector:
  → degradar hasta 2 niveles el resultado
  → EXCEPCIÓN: "immune" de equipo (Paso 2) es inviolable

PASO 5 · Calcular multiplicador final

  heal             → receptor cura HP (ver §1.1a)
  immune           → ×0.00
  extreme_resist   → ×0.10
  resist_75        → ×0.25
  resist_50        → ×0.50
  resist_25        → ×0.75
  normal           → ×1.00
  vulnerable       → ×1.50
  extreme_vulnerable → ×2.00

  Daño final = daño_base(magnitudeLevel) × multiplicador

PASO 6 · Aplicar efecto según categoría del vector
  · Daño (physical, elemental…)    → reducir HP
  · Curación (heal, ResistanceLevel "heal") → aumentar HP (sin sobrepasar maxHp)
  · Estado (status_*)              → aplicar buff/debuff
  · Movimiento forzado             → mover entidad en grid
  · Terreno/fluido                 → modificar FluidTile en posición
  · Luz                            → actualizar PointLight asociado

PASO 7 · Resolver side effects y combinaciones
  · Comprobar combinations[]: ¿algún trigger satisfecho?
    → generar nuevo VectorImpact (cola, no recursión directa)
  · Comprobar reactions[] de props en zona afectada
  · Registrar en Codex si la interacción es nueva para el jugador
  · Profundidad máxima de cadena: 5 niveles
    (si se supera: descartar impactos restantes + console.warn)

PASO 8 · Feedback visual y auditivo
  · Activar VFX del vector y resultado
  · Actualizar HUD si el receptor es el jugador
  · Animar transiciones de estado de props y terreno
```

> **Cadenas:** El Paso 7 usa una **cola de resolución** (no recursión directa).
> Los nuevos `VectorImpact` se encolan y procesan desde el Paso 0.
> Máximo 5 niveles; si se supera, los impactos restantes se descartan con `console.warn`.

---

## 3. Escalas de magnitud detalladas

Los valores de referencia asumen HP estándar de combate (skeleton_warrior base: ~80 HP).

> **Nota:** `trivial` es una adición de B5 respecto al `system_meta` original
> (que tenía 4 niveles: low / medium / high / extreme). Algunos vectores de Parte A
> catalogados como `low` pueden recalibrarse a `trivial` en una pasada posterior.
> Sin urgencia para Sprint 4. Actualizar `system_meta.magnitude_scale` del JSON
> al inyectar B5.

### 3.1 Vectores de daño

| Nivel     | Mult.  | Daño orientativo (HP ~80) | Referencia de diseño                                        |
|-----------|:------:|:---:|-------------------------------------------------------------|
| `trivial` | ×0.25  | 2–4 HP   | Rasguño, chispa, viento leve. Útil solo por acumulación.  |
| `low`     | ×0.50  | 5–10 HP  | Ataque básico sin bonificadores. Norma de `slash_light`.   |
| `medium`  | ×1.00  | 11–20 HP | Ataque estándar de combate. Baseline de equilibrio.        |
| `high`    | ×2.00  | 21–35 HP | Ataque especial, combo efectivo, vulnerabilidad explotada. |
| `extreme` | ×4.00  | 36–60 HP | Trampa fatal, boss move, vulnerabilidad máxima en cadena.  |

Ejemplo de interacción extrema:
`high` (×2.00) sobre `extreme_vulnerable` (×2.00) → factor total ×4.00 → 42–70 HP.

### 3.2 Vectores de estado

| Nivel     | Duración base | Severidad                                                |
|-----------|:---:|----------------------------------------------------------|
| `trivial` | 1 turno  | Leve; cancela con cualquier acción.                      |
| `low`     | 2 turnos | Notable; cancela con acción específica.                  |
| `medium`  | 3 turnos | Importante; requiere ítem o habilidad para cancelar.     |
| `high`    | 5 turnos | Grave; difícil de cancelar en combate.                   |
| `extreme` | 8+ turnos | Permanente de combate o de run.                         |

### 3.3 Vectores de movimiento forzado

| Nivel     | Casillas desplazadas |
|-----------|:---:|
| `trivial` | 1   |
| `low`     | 1–2 |
| `medium`  | 2–3 |
| `high`    | 3–4 |
| `extreme` | 5+  |

---

## 4. Precedencia de resistencias

Cuando una entidad tiene múltiples fuentes de resistencia para el mismo vector,
el motor aplica el siguiente orden. Gana **la primera entrada que aplique**,
salvo las maldiciones que modifican el resultado final.

```
Prioridad 1 (máxima — inmunidad estructural, no degradable)
  └── vectorId exacto en equipo con level "immune"
      Ej: escudo encantado immune a physical_external_pierce_*
      Las maldiciones NO pueden degradar esta inmunidad.

Prioridad 2
  └── vectorId exacto en buff activo
      Entre varios buffs, gana el level MÁS FAVORABLE.

Prioridad 3
  └── vectorId exacto en raza base (resistance_exceptions)
      Propiedad racial innata.

Prioridad 4
  └── vectorIdPrefix en equipo activo
      Ej: armadura de placas cubre physical_external_* (prefijo amplio).

Prioridad 5
  └── vectorIdPrefix en buff activo

Prioridad 6
  └── vectorIdPrefix en raza base

Prioridad 7 (fallback)
  └── default_resistance de la raza
      "normal" en la mayoría de razas genéricas.

Modificador post-resolución (no cambia la prioridad):
  └── Maldiciones activas: degradan hasta 2 niveles el resultado final.
      EXCEPCIÓN: Prioridad 1 ("immune" de equipo) es inviolable.
```

**Ejemplo completo:**

```
Vector: elemental_fire_combustion_direct → receptor: skeleton_warrior

  P1: equipo → sin immune exacto a este vector
  P2: buffs  → ninguno activo
  P3: raza exacta → "vulnerable" (hueso seco arde, en resistance_exceptions)
  P4-6: sin prefijo relevante en equipo ni buffs
  Resultado base: vulnerable (×1.50)

  Maldición activa: curse_fire_weakness (degrada 1 nivel)
  Resultado final: extreme_vulnerable (×2.00)
```

---

## 5. Convenciones de nombres

### 5.1 IDs de vectores

Formato: `{categoría}_{subcategoría}_{descriptor}`

Reglas:
- Todo en `snake_case`, minúsculas, sin espacios ni guiones.
- El prefijo de categoría coincide exactamente con el `category_id` del JSON.
- El descriptor es específico en 1–2 palabras.
- Estados sostenidos: prefijo `status_` (ej: `status_bleed_major`).
- Fluidos de terreno: prefijo `terrain_fluid_` o `fluid_`.
- Metafísica: prefijo `meta_` o `exotic_`.

Ejemplos:

```
physical_external_slash_light
elemental_fire_combustion_direct
status_bleed_major
movement_forced_push_heavy
terrain_fluid_place_water
fluid_oil_fuel
exotic_psychic_mind_blast
light_reduce_extinguish
```

### 5.2 IDs de buffs y curses

Formato: `buff_{descriptor}` / `curse_{descriptor}`

```
buff_iron_skin
buff_levitation
buff_night_vision
buff_anchoring
curse_fire_weakness
curse_stat_permanent
```

### 5.3 IDs de combinaciones

Formato: `{elementoA}_plus_{elementoB}` o descripción semántica del resultado.

```
water_plus_electric_chain
oil_plus_fire_ignition
frozen_plus_blunt_shatter
```

### 5.4 IDs de razas y subtipos

Formato: `{raza_base}_{subtipo}` cuando existen subtipos.

```
skeleton_minion
skeleton_warrior
skeleton_mage
skeleton_rogue
goblin_scout
construct_golem_stone
construct_golem_metal
shadow_spectre
```

### 5.5 IDs de entidades en sala

Formato: `{race_id}_{sala_id}_{número_instancia_dos_dígitos}`

```
skeleton_warrior_room3_01
goblin_scout_room3_02
torch_wall_room2_01
barrel_oil_room1_03
```

### 5.6 Valores de `ResistanceCondition`

```typescript
// buff_active  → "buff_iron_skin", "buff_levitation"
// terrain_tag  → "wet", "oiled", "frozen_surface", "dark_zone", "on_fire"
// hp_below_pct → "50"  (porcentaje como string numérico)
// daytime      → "day" | "night"
// custom       → string libre; documentar inline en el vector o buff
```

### 5.7 Flags de `forcedState` en Entity

| Flag          | Efecto mecánico                                                             |
|---------------|-----------------------------------------------------------------------------|
| `levitating`  | Inmune a vectores de terreno (fluidos, suelo) y empuje horizontal.          |
| `invisible`   | No es objetivo de ataques básicos; detectable por `stealth_detect_*`.       |
| `wet`         | Amplifica `elemental_electric_*`; resiste `elemental_fire_*`.               |
| `oiled`       | Amplifica `elemental_fire_*`; genera `fluid_oil_fuel` al recibir chispa.    |
| `on_fire`     | Emite `elemental_fire_combustion_direct` cada turno sobre sí y adyacentes.  |
| `frozen`      | Inmune a `elemental_cold_*`; vulnerable a `physical_external_blunt_*`.      |
| `ethereal`    | Ignora obstáculos físicos y vectores `physical_external_*`.                 |

---

## 6. Anti-patterns a evitar

### ❌ AP-1: Codificar "tipo de daño" en las habilidades

```typescript
// INCORRECTO
skill.damageType = "fire";

// CORRECTO
skill.producesVectors = [
  { vectorId: "elemental_fire_combustion_direct", magnitude: "high" }
];
```

El motor resuelve todo. La habilidad solo declara vectores; nunca hardcodea categorías.

---

### ❌ AP-2: Comprobar la raza en código para calcular daño

```typescript
// INCORRECTO
if (target.race === "skeleton") damage *= 0.5;

// CORRECTO: la raza declara sus resistance_exceptions en el JSON.
// El motor las resuelve en el Paso 1.
// Cero if/switch por raza en código de combate.
// Si falta una resistencia racial → añadirla al JSON, no al código.
```

---

### ❌ AP-3: Buffs que modifican "daño general" sin declarar vector

```typescript
// INCORRECTO
buff.damageBonus = 0.15; // +15% a todo, invisible al sistema

// CORRECTO: un buff de "más daño de fuego" eleva el magnitudeLevel
// de los vectores elemental_fire_* que genera el portador.
// Nunca un multiplicador genérico flotante fuera del sistema de vectores.
```

---

### ❌ AP-4: Resolver combinaciones hardcodeadas en habilidades

Si la lógica "agua + eléctrico = arco en cadena" vive solo en el hechizo del Mago,
los enemigos no pueden ejecutarla. **Todas las combinaciones van en `combinations[]`
del JSON. El Paso 7 las evalúa universalmente para jugador y enemigos.**

---

### ❌ AP-5: Props sin `reactions[]`

Todo barril, antorcha, pilar y puerta **debe tener** al menos una `PropReaction`.
Un barril de aceite sin reacción a `elemental_fire_combustion_direct` es un bug
de diseño. El pilar "todo es interactuable" se rompe aquí, no en el código.

---

### ❌ AP-6: Immune en buffs de duración de combate sin protección anti-cycling

`immune` en un buff de combate de N turnos barato es exploitable: el jugador lo cicla
indefinidamente con pociones o hechizos de bajo coste. La regla es:

| Tipo de buff                              | Máximo `level` permitido |
|-------------------------------------------|:---:|
| Buff de combate, tier 1 (hechizo básico, poción común)  | `resist_75`  |
| Buff de combate, tier 2 (hechizo medio, ítem raro)      | `resist_75`  |
| Buff de combate, tier 3+ (hechizo avanzado, ítem épico) | `immune` **con** `noCycling: true` |
| Buff de duración de run o permanente                    | `immune` permitido sin restricción |
| Equipo equipado (armadura, anillo, etc.)                | `immune` permitido sin restricción |

**Caso canónico — Piel de Acero (`buff_iron_skin`):**  
Buff canónico de referencia del juego. Definición final en B3, pero la decisión
de diseño queda bloqueada aquí: **Piel de Acero es un hechizo del Mago de tier 3**
(o un ítem de alta rareza), con `noCycling: true`. Da `immune` a
`physical_external_slash_*` y `physical_external_pierce_*` pero NO puede reactivarse
mientras esté activo; al expirar, hay un cooldown equivalente a la duración del buff.
Esto lo exime de la restricción de cycling sin romper el equilibrio de combate.
No se baja a `resist_75`: hacerlo traicionaría su identidad de buff de referencia.

---

### ❌ AP-7: Cadenas de combinaciones sin techo de profundidad

El motor tiene techo de **5 niveles** (§2, Paso 7). No diseñar combinaciones que
requieran más de 3 niveles para ser útiles: el jugador no puede razonarlos y
la debuggabilidad colapsa. Las cadenas de 4–5 niveles son serendipia emergente,
no diseño intencionado.

---

### ❌ AP-8: El Codex registra contexto, no reglas

**Incorrecto:** "En la sala 3 había una antorcha cerca del esqueleto."  
**Correcto:** "Los esqueletos son vulnerables al fuego."

Las entradas del Codex son reglas mecánicas transferibles a cualquier sala futura,
no memoria episódica de una run concreta.

---

*Generado en Sprint 4-EXT. Actualizar ante cambios de arquitectura relevantes.*  
*Referencia: `docs/data/interaction_vectors.json` — 434 vectores, 34 categorías.*  
*Pendiente: actualizar `system_meta.magnitude_scale` del JSON añadiendo `"trivial"`.*
