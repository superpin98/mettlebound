# 05 — Sistema de Objetos y Rareza

## 🎨 Sistema de Rareza

### Tabla de rarezas

| Rareza | Color UI | Hex | % Drop base | Stats affixes | Efecto único |
|--------|----------|-----|-------------|---------------|--------------|
| **Común** | Gris | `#9d9d9d` | 60% | 1 stat aleatorio | — |
| **Poco común** | Verde | `#1eff00` | 25% | 2 stats aleatorios | — |
| **Raro** | Azul | `#0070dd` | 10% | 3 stats aleatorios | — |
| **Épico** | Morado | `#a335ee` | 4% | 4 stats aleatorios | ✅ 1 efecto único |
| **Legendario** | Naranja claro | `#ff8000` | 1% | 5 stats aleatorios + 1 maestría | ✅ 1 efecto único raro |

> Los porcentajes son base. La **Suerte (LCK)** del jugador y modificadores del piso/evento los alteran.

### Modificador de drop por nivel del enemigo

```typescript
function calculateDropRarity(enemyLevel, playerLuck, floorTier) {
  const baseRolls = {
    common:    60,
    uncommon:  25,
    rare:      10,
    epic:       4,
    legendary:  1,
  };

  // Cuanto más alto el enemigo o el piso, más probable lo raro
  const tierBonus = floorTier * 0.5;
  const luckBonus = playerLuck * 0.2;

  baseRolls.uncommon  += tierBonus * 0.5;
  baseRolls.rare      += tierBonus * 0.7 + luckBonus * 0.3;
  baseRolls.epic      += tierBonus * 0.2 + luckBonus * 0.2;
  baseRolls.legendary += tierBonus * 0.05 + luckBonus * 0.1;

  baseRolls.common = Math.max(10, 100 - (baseRolls.uncommon + baseRolls.rare + baseRolls.epic + baseRolls.legendary));

  return rollRarity(baseRolls);
}
```

## 📦 Estructura de un Item

```typescript
interface Item {
  id: string;                   // ID único (nanoid)
  baseId: string;               // ID del template (ej: "leather_helmet")
  name: string;                 // Generado o del template
  rarity: Rarity;
  itemType: ItemType;           // 'weapon' | 'armor' | 'accessory' | 'pet' | 'consumable'
  slot: EquipmentSlot;          // 'head' | 'chest' | 'legs' | ...
  level: number;                // Nivel del item (para requirements)
  iLevel: number;               // Item level (rango de stats)
  setId?: string;               // Si pertenece a un conjunto

  baseStats: {                  // Stats base del template
    damage?: number;
    armor?: number;
    magicResist?: number;
    // ...
  };

  affixes: Affix[];             // Stats aleatorios (1-5 según rareza)
  uniqueEffect?: UniqueEffect;  // Solo épicos y legendarios

  description?: string;         // Flavor text
  iconAssetId: string;
  modelAssetId?: string;        // Modelo 3D si se renderiza
}

interface Affix {
  stat: StatModifier;           // ej: "+10% damage", "+5 str"
  value: number;
  isPercent: boolean;
}

interface UniqueEffect {
  id: string;                   // ej: "soul_drain"
  name: string;
  description: string;
  rarity: Rarity;
  triggerType: 'passive' | 'on_hit' | 'on_crit' | 'on_kill' | 'on_damaged' | 'turn_start';
  effect: () => void;           // Lógica
}
```

## 🎲 Generación procedural de items

### Pasos del generador

1. **Determinar slot** (qué tipo de pieza es).
2. **Tirar rareza** (con modificadores aplicados).
3. **Seleccionar base** (template aleatorio del slot y nivel apropiado).
4. **Generar affixes**: número según rareza, cada uno de un pool de affixes posibles para ese slot.
5. **Generar valores** de los affixes en rangos dependientes del iLevel.
6. **Si rareza ≥ Épico:** asignar un *Unique Effect* coherente con el item (de un pool por slot/tipo).
7. **Generar nombre** procedural opcional para Épicos y Legendarios (prefijo + base + sufijo).

### Pool de affixes según slot

#### Casco (head)
```
+ STR / DEX / INT / LCK [1-5 por iLevel]
+ HP máximo [5-25 por iLevel]
+ MP máximo [3-15 por iLevel]
+ Crit chance [0.5%-2.5% por iLevel]
+ Daño mágico % [1%-3%]
+ Daño físico %
+ Reducción de daño %
+ Resistencia mágica
```

#### Armadura (chest)
```
+ HP máximo [grande, 10-50]
+ Armor flat [grande]
+ Resistencia mágica
+ STR / DEX / INT / LCK
+ Evasión %
+ MP máximo
+ Reducción de daño físico %
+ Reducción de daño mágico %
```

#### Pantalones (legs)
```
+ HP máximo
+ Velocidad de turno
+ Evasión %
+ STR / DEX / INT
+ Movimiento (no aplica en combate, pero da bonus en exploración)
+ Resistencia a estados alterados %
```

#### Guantes (hands)
```
+ Daño físico flat
+ Daño mágico flat
+ Daño a distancia flat
+ Daño cuerpo a cuerpo %
+ Crit chance
+ Crit damage
+ STR / DEX
+ Velocidad de ataque (más turnos)
```

#### Anillos (ring1, ring2)
```
+ Cualquier stat
+ Cualquier % de daño
+ Crit
+ HP/MP regen
+ Resistencias
(slot muy versátil con valores menores)
```

#### Colgante (amulet)
```
+ Stats principales (valores altos)
+ Bonuses únicos a habilidades
+ MP máximo
+ Resistencias generales
(slot prestigioso, alto impacto)
```

#### Cinturón (belt)
```
+ HP/MP máximo
+ Reducción de daño %
+ Velocidad de pociones
+ Capacidad de inventario (post-MVP)
+ Daño % de algún tipo
```

#### Arma (weapon)
```
- DAÑO BASE (siempre): rango según tipo y rareza
- Tipo de daño (físico/distancia/mágico)
- Affixes adicionales:
  + STR / DEX / INT (escalado)
  + Velocidad de ataque
  + Crit chance / Crit damage
  + Lifesteal %
  + Manasteal %
  + Daño elemental añadido (fuego, hielo, veneno...)
  + Chance de aplicar estado alterado al golpear
```

## ⚡ Efectos Únicos (Épicos y Legendarios)

### Reglas de diseño
- Cada efecto único debe ser **temáticamente coherente** con el item (un casco de mago debería tener efectos mágicos, no de fuerza bruta).
- **Trigger claro** (cuándo se activa).
- **Efecto claro** (qué hace exactamente).
- **No deben romper el juego** pero **deben ser muy notorios**.

### Pool inicial de efectos únicos

#### Para Épicos

| Efecto | Trigger | Descripción |
|--------|---------|-------------|
| *Eco de Acero* | on_hit | 10% de chance de repetir el ataque básico |
| *Drenaje Sutil* | on_hit | Robas 3% del daño infligido como HP |
| *Resonancia* | on_crit | Tu siguiente ataque crítico hace +50% daño |
| *Velo de Sombra* | on_damaged | 15% de chance de hacerte invisible 1 turno (los enemigos pierden el turno tratando de encontrarte) |
| *Aliento del Abismo* | turn_start | Recuperas 2 MP al inicio de cada turno |
| *Acero Sangriento* | on_kill | Tu siguiente habilidad cuesta 50% menos MP |
| *Fortaleza Mental* | passive | -20% de daño mágico recibido |
| *Sed Insaciable* | on_kill | +5% daño durante 3 turnos (acumulable hasta 25%) |
| *Pasos Veloces* | passive | +10% velocidad de turno |
| *Carga Estática* | on_hit | 8% de chance de paralizar al enemigo 1 turno |

#### Para Legendarios

| Efecto | Trigger | Descripción |
|--------|---------|-------------|
| *Beso del Vacío* | passive | El 30% de tu daño físico se convierte en daño verdadero |
| *Pacto del Sabio* | on_damaged | Cuando recibes daño, ganas 1 punto de INT temporal (apilable, dura el combate) |
| *Corona del Tirano* | passive | Te hacen 30% más daño, pero infliges 50% más daño |
| *Susurro del Final* | passive | Si tu HP llega a 0, sobrevives con 1 HP. Una vez por sala. |
| *Hambre del Lobo* | on_kill | Recuperas 25% de HP máximo y tu siguiente ataque es crítico garantizado |
| *Reloj Roto* | passive | Una vez por combate, puedes deshacer tu último turno |
| *Llama Negra* | on_hit | Aplica Llama Negra: el enemigo sufre 5% de su HP máximo durante 3 turnos (no apilable, no mitigable) |
| *Mil Caras* | passive | Tu daño se calcula con tu stat más alto en lugar del que corresponda al tipo de arma |
| *Promesa del Errante* | passive | No tienes bonus de conjunto, pero ganas un bonus universal: +5% a todas las stats por cada conjunto distinto del que tengas equipado al menos una pieza |
| *Eco del Dragón* | on_crit | Cada crítico genera un eco que golpea a todos los enemigos por 50% del daño |

> **Nota a Claude Code:** estos pools son los **iniciales del MVP**. El sistema debe permitir añadir nuevos efectos definiéndolos en un archivo de catálogo y registrándolos en `items.config.ts`. La lógica del efecto se implementa como función pura que recibe `{ source, target, combatState }` y emite eventos al `EventBus`.

## 🎨 Generación de nombres procedurales

Para Épicos y Legendarios, el nombre se compone:

```
[Prefijo] de la/del [Base] [Sufijo opcional]
```

**Prefijos (épicos):** *Susurrante*, *Eterno*, *Vil*, *Ardiente*, *Helado*, *Hambriento*, *Ciego*, *Reluciente*, *Maldito*, *Sereno*...

**Sufijos (legendarios):** *del Rey Caído*, *del Abismo*, *de la Luna Rota*, *del Primer Invierno*, *de Mil Voces*, *del Vacío Hambriento*...

Ejemplos:
- *Casco Susurrante del Erudito* (Épico)
- *Espada Eterna del Rey Caído* (Legendario)
- *Anillo Vil del Abismo* (Legendario)

## 🎒 Slots del personaje (recordatorio)

```
HEAD       (casco — pertenece a conjunto)
CHEST      (armadura — pertenece a conjunto)
LEGS       (pantalones — pertenece a conjunto)
HANDS      (guantes — pertenece a conjunto)
WEAPON     (arma principal)
BELT       (cinturón)
RING_1     (anillo izquierdo)
RING_2     (anillo derecho)
AMULET     (colgante)
PET        (mascota — slot vacío en MVP)
```

Total: 10 slots.

## 📋 Inventario

- **Tamaño limitado:** 30 slots al inicio, ampliable post-MVP con cinturones especiales o mejoras.
- **Drag & drop** entre inventario y slots equipados.
- **Click derecho** sobre un item del inventario lo equipa automáticamente en el slot correspondiente.
- **Click derecho** sobre un item equipado lo guarda en inventario.
- **Tooltips estilo POE:** fondo oscuro, borde del color de rareza, jerarquía clara de info (nombre → tipo → stats base → affixes → efecto único → flavor text).
- Items se ordenan por categoría + rareza por defecto, pero se puede reordenar manualmente.
- Items duplicados de baja rareza pueden venderse en bloque (post-MVP).

## 💰 Valor de venta

```typescript
function calculateSellValue(item: Item): number {
  const rarityMultipliers = {
    common: 1, uncommon: 3, rare: 8, epic: 25, legendary: 80
  };
  const baseValue = 10;
  const levelMult = 1 + (item.level * 0.15);
  return Math.floor(baseValue * rarityMultipliers[item.rarity] * levelMult);
}
```

## 📋 Lista de los 20 items del MVP

### Armas (4 — una por clase no-neutra)
1. *Espada Larga Mellada* (Común — Guerrero) — Físico cuerpo a cuerpo
2. *Arco Corto del Bosque* (Común — Cazador) — Físico a distancia
3. *Báculo de Aprendiz* (Común — Mago) — Mágico
4. *Daga Curva* (Común — Pícaro) — Físico cuerpo a cuerpo rápido

### Conjunto Cuero Curtido (4 piezas)
5. *Capucha de Cuero*
6. *Pechera de Cuero*
7. *Calzas de Cuero*
8. *Guantes de Cuero*

### Conjunto Hilo del Erudito (4 piezas)
9. *Capirote del Erudito*
10. *Túnica del Erudito*
11. *Faldón del Erudito*
12. *Manguitos del Erudito*

### Conjunto Acero del Verdugo (4 piezas)
13. *Yelmo del Verdugo*
14. *Coraza del Verdugo*
15. *Grevas del Verdugo*
16. *Manoplas del Verdugo*

### Conjunto Velo del Vacío (4 piezas)
17. *Velo del Vacío*
18. *Manto del Vacío*
19. *Pantalón del Vacío*
20. *Guanteletes del Vacío*

> Estos son los **20 items base del MVP**. Cada uno puede dropear con cualquiera de las 5 rarezas, con stats aleatorios, generando así centenares de variantes.

## 🎯 Drops garantizados

Para evitar runs frustrantes:
- **Primer combate de la run:** drop garantizado, al menos Poco Común.
- **Cofre de evento:** mínimo Poco Común, posibilidad alta de Raro+.
- **Mini-boss:** mínimo Raro garantizado.
- **Jefe de piso (post-MVP):** mínimo Épico garantizado.
