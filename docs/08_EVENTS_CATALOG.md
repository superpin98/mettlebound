# 08 — Catálogo de Eventos Aleatorios

## 🎲 Categorías de eventos (decididas)

1. **Combate** — encuentro forzado con enemigos
2. **Cofre** — loot directo, puede estar trampeado
3. **Trampa** — daño/debuff por mal movimiento
4. **Mercader/NPC** — compra y venta de items
5. **Altar** — sacrificas algo a cambio de algo
6. **Evento narrativo** — texto + decisión múltiple con consecuencias
7. **Mini-boss** — enemigo único con loot garantizado
8. **Sala de descanso** — recuperar HP/MP
9. **Acertijo** — puzzle simple con recompensa
10. **Fuente** — efecto permanente del run

## 🏗️ Estructura común de un evento

```typescript
interface RandomEvent {
  id: string;                       // 'chest_basic', 'merchant', etc.
  category: EventCategory;
  name: { [lang: string]: string }; // i18n
  description: { [lang: string]: string };
  flavorText?: { [lang: string]: string };

  minTier: number;                  // tier mínimo donde puede aparecer
  maxTier?: number;                 // tier máximo (undefined = sin límite)
  weight: number;                   // peso de aparición (más = más común)

  trigger: 'on_enter_room' | 'on_interact';
  scene3D?: string;                 // template 3D específico si aplica

  choices?: EventChoice[];          // decisiones del jugador
  resolution: (player, choice) => EventOutcome;

  oneShot?: boolean;                // si solo puede salir una vez por run
}

interface EventChoice {
  text: { [lang: string]: string };
  requirements?: {                  // opcional: requiere stat/item para elegir
    stat?: { type: StatType; min: number };
    item?: string;
    gold?: number;
  };
  preview?: string;                 // texto de qué pasará (no siempre se muestra)
}

interface EventOutcome {
  textResult: { [lang: string]: string };
  effects: Effect[];                // qué pasa al jugador/run
}
```

## 📜 Los 10 Eventos del MVP

> Detalle completo de cada evento. Claude Code debe implementarlos como archivos individuales en `src/game/events/catalog/`.

---

### 1. 📦 `chest_basic` — *Cofre simple*

**Categoría:** Cofre
**Tier:** 0+
**Trigger:** on_interact con un cofre visible en la sala

**Descripción:** Aparece un cofre en el centro de la sala con un leve brillo dorado.

**Choices:**
- **Abrir el cofre** → recibe 1 item aleatorio (rareza según tier + suerte) + 10-40 oro
- **Inspeccionarlo primero (gasta 5 oro)** → revela si está trampeado, su rareza aproximada, y le da +5% chance de mejor rareza al abrir
- **Ignorar** → no pasa nada

**Outcome:** `LootGiven | None`

---

### 2. 💀 `chest_trapped` — *Cofre trampeado*

**Categoría:** Cofre / Trampa
**Tier:** 1+ (no aparece en tier 0 para no castigar nuevos jugadores)
**Trigger:** on_interact

**Descripción:** Un cofre con runas grabadas que pulsan en color rojo apagado.

**Choices:**
- **Abrir directamente** → 50% chance de daño (15% HP max) + item igualmente, 50% de item Raro+
- **Intentar desarmar (DEX check)** → DEX > 8 desactiva la trampa; si falla, daño normal pero pierde 30% chance de mejor loot
- **Ignorar** → nada

**Outcome:** `Damage | LootGiven | None`

---

### 3. 🛒 `merchant` — *Mercader Errante*

**Categoría:** Mercader
**Tier:** 0+
**Trigger:** on_enter_room

**Descripción:** Un encapuchado sentado junto a un brasero. Tiene mercancía dispuesta sobre una manta. *"Pasa, viajero. Tengo cosas que no encontrarás abajo."*

**Mecánica:**
- Se abre un panel de comercio con 4-6 items aleatorios a la venta (rareza variable, precios según rareza × nivel del piso × 25 oro base).
- El jugador puede **vender** items suyos al 25% del valor base.
- El mercader **siempre tiene una poción de HP y una de MP**.
- Cuando el jugador sale, el mercader desaparece.

**Outcome:** `ItemsExchanged | None`

---

### 4. ⛧ `altar_hp` — *Altar Hambriento*

**Categoría:** Altar
**Tier:** 0+
**Trigger:** on_interact

**Descripción:** Un altar de piedra negra con un cuenco vacío. Susurra algo apenas audible. *"Dame tu fuerza vital, y te daré poder."*

**Choices:**
- **Ofrecer 25% HP máximo (permanente esta run)** → +1 punto en stat aleatorio (permanente esta run)
- **Ofrecer 50% HP máximo (permanente esta run)** → +3 puntos en stat aleatorio + chance de obtener un item Raro
- **Romper el altar (STR check, requiere STR > 10)** → +30 oro y una piedra preciosa que vale 100 oro al venderla
- **Marcharse** → nada

**Outcome:** `StatBoost | HPReduction | Gold | None`

---

### 5. 📜 `narrative_choice` — *El Viajero Caído*

**Categoría:** Evento narrativo
**Tier:** 0+
**Trigger:** on_enter_room

**Descripción:** En el centro de la sala, un viajero herido apoyado contra una pared. Tiene sangre seca en la armadura. Te mira y susurra: *"Por favor... mi mochila... mi familia..."*

**Choices:**
- **Curarlo (gasta 2 pociones de HP o 30 HP propio)** → el viajero te da su mochila al irse: 50 oro, 1 poción de MP y un item Raro+. Aplica buff "Gratitud" (+10% suerte 1 piso)
- **Robarle (LCK check si quieres no sentirte mal)** → 30 oro y un item Común. Aplica debuff "Culpa" (-5% suerte 1 piso)
- **Ignorar / Continuar** → nada. Aplica buff leve "Indiferente" (+1 INT permanente esta run, máximo 3 veces)

**Outcome:** múltiples ramas; muestra texto distintivo según elección.

---

### 6. 🪤 `trap_spikes` — *Trampa de Pinchos*

**Categoría:** Trampa
**Tier:** 0+
**Trigger:** on_enter_room (la trampa se activa al pisar una placa de presión)

**Descripción:** Suelo de la sala con baldosas sueltas. Al avanzar, un click metálico bajo los pies.

**Mecánica:**
- **DEX check al instante:** DEX > 6 → esquivas
- Si esquivas: nada
- Si fallas: 10-20% HP de daño + posible sangrado 2 turnos (solo aplicable después; si no hay combate, solo el daño directo)
- La sala queda con la trampa visible y desactivada después

**Outcome:** `Damage | Bleed | None`

---

### 7. 🛏️ `rest_area` — *Hoguera Sagrada*

**Categoría:** Sala de descanso
**Tier:** 0+
**Trigger:** on_interact con la hoguera

**Descripción:** Hoguera ardiendo en silencio, rodeada de un círculo de runas. La piedra está caliente y acogedora.

**Choices:**
- **Descansar** → recupera 100% HP y 100% MP
- **Meditar (gasta turno largo)** → recupera 50% HP/MP + ganas un buff "Paz" (+10% XP en el próximo combate)
- **Lanzar tu mejor item al fuego** → destruye el item, pero recibes una mejora aleatoria del Upgrade Pool (de rareza igual o superior al item sacrificado)

**Outcome:** `Heal | Buff | Sacrifice`

**One-shot por sala** (la hoguera se apaga después de descansar).

---

### 8. 🧩 `puzzle_simple` — *El Mecanismo Antiguo*

**Categoría:** Acertijo
**Tier:** 0+
**Trigger:** on_interact con un mecanismo en la sala

**Descripción:** Una placa con tres símbolos pulsantes (azul, rojo, dorado). Una inscripción debajo: *"El primero abre el camino. El segundo guía al perdido. El tercero corona al sabio."*

**Mecánica:**
- 3 botones, hay que pulsarlos en el orden correcto.
- El orden correcto se genera proceduralmente y se da una pista basada en INT del jugador:
  - INT < 5: ninguna pista, debes adivinar (3! = 6 combinaciones)
  - INT 5-10: pista vaga ("el rojo va en el medio")
  - INT > 10: orden completo revelado tras lectura cuidadosa
- **Acertar:** abre un compartimento con un cofre garantizado Raro+
- **Fallar:** sala se rellena de gas tóxico → daño moderado (10% HP) + estado veneno 3 turnos

**Outcome:** `Loot | Damage + Status`

---

### 9. ⛲ `fountain` — *Fuente del Cambio*

**Categoría:** Fuente
**Tier:** 0+
**Trigger:** on_interact

**Descripción:** Una fuente de agua que cambia de color según el ángulo. El agua susurra.

**Choices (sin saber el resultado, riesgo/recompensa):**
- **Beber del agua** → efecto aleatorio permanente para esta run (50/50 positivo/negativo)
  - Positivos: +2 a un stat, +20% HP, +20% MP, +5% crit chance, etc.
  - Negativos: -2 a un stat, -10% HP, -1 slot de inventario, etc.
- **Llenar un frasco vacío (gasta 20 oro)** → guarda el efecto en una poción que puedes usar más tarde para escoger cuándo aplicarlo
- **Ignorar** → nada

**Outcome:** `StatModification permanente run | Item | None`

---

### 10. 👹 `mini_boss` — *Heraldo del Abismo*

**Categoría:** Mini-boss
**Tier:** 1+ (no en piso 1 para no castigar inicio)
**Trigger:** on_enter_room (sala más grande con efecto dramático)

**Descripción:** La sala es más amplia que el resto. En el centro, un enemigo único de nivel = piso + 3. Suelta un grito al detectar al jugador.

**Mecánica:**
- Combate iniciado automáticamente.
- El enemigo es una versión "élite" de uno de los enemigos del roster con:
  - +50% HP
  - +30% daño
  - +1 habilidad especial
  - Aura visual (partículas oscuras orbitando)
- Drops garantizados:
  - 1 item Raro+ garantizado
  - 200-400 oro
  - XP × 2.5

**Variantes iniciales (4 mini-jefes):**
1. **Heraldo Esqueletal** — basado en SkeletonWarrior, habilidad: invoca 1 esqueleto débil
2. **Sombra Encarnada** — basado en VoidWraith, habilidad: invisibilidad 1 turno + crítico garantizado
3. **Lobo de Sangre** — basado en BloodHound, habilidad: lifesteal masivo al atacar
4. **Acólito del Vacío** — basado en DarkAcolyte, habilidad: maldición que reduce un stat del jugador durante el combate

**Outcome:** `Combat` con drops específicos

---

## 🔄 Probabilidad de aparición de eventos

```typescript
function pickEventForRoom(tier: number, roomSeed: string): RandomEvent {
  const eligible = allEvents.filter(e =>
    e.minTier <= tier &&
    (e.maxTier === undefined || e.maxTier >= tier)
  );

  // Peso ponderado
  const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
  let roll = seededRandom(roomSeed) * totalWeight;

  for (const event of eligible) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }

  return eligible[0]; // fallback
}
```

### Pesos del MVP

| Evento | Weight | Notas |
|--------|--------|-------|
| chest_basic | 100 | El más común |
| chest_trapped | 40 | Solo tier 1+ |
| merchant | 30 | Importante para gestión |
| altar_hp | 25 | Decisión interesante |
| narrative_choice | 35 | Sabor y elección |
| trap_spikes | 30 | Punzante |
| rest_area | 25 | No demasiado común, recompensa explorar |
| puzzle_simple | 20 | Más raro |
| fountain | 20 | Riesgo/recompensa |
| mini_boss | 10 | Raro, recompensa alta |

**Total weights iniciales:** 335

## 📁 Organización del catálogo

Cada evento se implementa como **un archivo independiente** en `src/game/events/catalog/`. El `_index.ts` exporta todos.

Ejemplo de archivo:

```typescript
// src/game/events/catalog/chest_basic.ts
import { defineEvent } from '../EventManager';

export const chestBasicEvent = defineEvent({
  id: 'chest_basic',
  category: 'chest',
  name: { es: 'Cofre simple', en: 'Simple chest' },
  description: { es: '...', en: '...' },
  minTier: 0,
  weight: 100,
  trigger: 'on_interact',
  choices: [
    {
      text: { es: 'Abrir el cofre', en: 'Open the chest' },
      preview: 'Recibirás un item aleatorio',
    },
    {
      text: { es: 'Inspeccionar (5 oro)', en: 'Inspect (5 gold)' },
      requirements: { gold: 5 },
    },
    {
      text: { es: 'Ignorar', en: 'Ignore' },
    },
  ],
  resolution: (player, choiceIndex) => {
    // lógica
  },
});
```

Y `_index.ts`:

```typescript
// src/game/events/catalog/_index.ts
import { chestBasicEvent } from './chest_basic';
import { chestTrappedEvent } from './chest_trapped';
// ... etc

export const ALL_EVENTS = [
  chestBasicEvent,
  chestTrappedEvent,
  // ...
];
```

Añadir un evento nuevo será: crear el archivo + añadirlo al array `ALL_EVENTS`. Nada más.

## 🌍 i18n en eventos

Todos los textos visibles al jugador van en objetos `{ es, en }`. El sistema de i18n elige según idioma activo.

En las traducciones se permiten variables: `"Has perdido {amount} HP"`. La función `t()` las sustituye en runtime.
