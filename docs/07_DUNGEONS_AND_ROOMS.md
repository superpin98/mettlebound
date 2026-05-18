# 07 — Mazmorras y Salas

## 🗺️ Estructura general

```
[Menú Principal]
       │ "Nueva Run"
       ▼
[Crear / cargar personaje]
       │
       ▼
[Sala Hub del Piso 1]
       │  ┌─ Selector de "Pisos disponibles" (estilo Slay the Spire)
       │  │  El jugador ve los próximos pisos y elige la rama
       │  ▼
       ▼
[Piso 1]
   │   ├─ Sala 1
   │   ├─ Sala 2
   │   ├─ Sala 3
   │   ├─ Sala 4
   │   ├─ ...
   │   └─ Sala N (N entre 4 y 10)
   │
   │ El jugador navega libremente con WASD
   │ Las salas se conectan por pasillos o puertas
   │
   ▼
[Salida del piso]
   │ Aparece una escalera/portal que da acceso al siguiente piso
   │ El jugador puede elegir bajar o seguir explorando
   ▼
[Piso 2]
   │ Más difícil, más loot, más rareza
   ▼
... pisos infinitos hasta morir ...
```

## 🎲 Generación procedural de un piso

### Pasos del generador

```typescript
function generateFloor(floorNumber: number, runSeed: string): Floor {
  // 1. Determinar tier del piso
  const tier = Math.floor((floorNumber - 1) / 5);  // tier 0, 1, 2...

  // 2. Determinar número de salas
  const numRooms = randomInt(4, 10, runSeed + floorNumber);

  // 3. Determinar bioma del piso
  const biome = pickBiome(tier, runSeed);

  // 4. Generar grafo de salas (cómo se conectan)
  const graph = generateRoomGraph(numRooms, runSeed);

  // 5. Asignar tipo a cada sala
  //    Reglas:
  //    - Sala inicial: siempre vacía (spawn point)
  //    - Sala final: siempre con la salida (escalera al siguiente piso)
  //    - Al menos 1 sala de combate por piso
  //    - Al menos 1 evento aleatorio por piso
  //    - Distribución del resto: 60% combate, 35% eventos, 5% vacía
  const roomTypes = assignRoomTypes(numRooms, runSeed);

  // 6. Generar cada sala individualmente
  const rooms = roomTypes.map((type, i) => generateRoom(type, biome, tier, runSeed + i));

  return new Floor({
    floorNumber,
    tier,
    biome,
    rooms,
    graph,
    seed: runSeed,
  });
}
```

### Biomas por tier

| Tier | Pisos | Biomas |
|------|-------|--------|
| 0 | 1-5 | Cripta de Piedra, Cavernas Iniciales |
| 1 | 6-10 | Catacumbas Antiguas, Bibliotecas Olvidadas |
| 2 | 11-15 | Cavernas de Cristal, Salones Inundados |
| 3 | 16-20 | Lagos de Lava, Forja Maldita |
| 4 | 21-25 | Vacío Profundo, Cámaras Oníricas |
| 5+ | 26+ | Abismo, modificadores aleatorios |

**Nota MVP:** solo el bioma "Cripta de Piedra" está completo. El resto vienen en v0.2+.

## 🏛️ Estructura de una sala

```typescript
interface Room {
  id: string;
  type: RoomType;            // 'empty' | 'combat' | 'event' | 'shop' | 'rest' | 'boss'
  biome: Biome;
  size: { width: number; depth: number };  // dimensiones (10-25 unidades)
  shape: RoomShape;          // 'rect' | 'L' | 'circle' | 'irregular'
  doors: Door[];             // conexiones a otras salas
  spawnPoints: Vector3[];    // para enemigos / interactuables
  layout: RoomLayout;        // muebles, decoración, etc.
  interactables: Interactable[];
  enemies?: Enemy[];         // si es sala de combate
  event?: RandomEvent;       // si es sala de evento
  isCleared: boolean;        // si ya se completó
  isVisited: boolean;
}

type RoomType = 'empty' | 'combat' | 'event' | 'merchant' | 'rest' | 'boss' | 'mini-boss';
```

### Generación de layout de sala

```typescript
function generateRoom(type, biome, tier, seed): Room {
  // 1. Determinar forma y tamaño
  const shape = pickShape(seed);
  const size = randomDimensions(shape, seed);

  // 2. Generar muros y suelo según bioma
  const layout = generateLayoutGeometry(shape, size, biome);

  // 3. Colocar decoración y obstáculos (rocas, antorchas, columnas, etc.)
  const decoration = placeDecoration(layout, biome, seed);

  // 4. Colocar interactuables (cofres, palancas, fuentes...)
  const interactables = placeInteractables(layout, type, biome, seed);

  // 5. Spawn enemigos si combate
  const enemies = type === 'combat'
    ? spawnEnemies(tier, biome, seed)
    : undefined;

  // 6. Asignar evento si tipo evento
  const event = type === 'event'
    ? pickEvent(tier, seed)
    : undefined;

  // 7. Determinar puertas (al menos 1, máximo 4)
  const doors = generateDoors(shape, size, seed);

  return new Room({...});
}
```

## 🚪 Sistema de puertas y navegación

- Las puertas son los **únicos puntos de conexión** entre salas.
- Al cruzar una puerta, transición suave (no fade a negro, solo fundido rápido si está en otro chunk).
- Las puertas pueden estar:
  - **Abiertas** (por defecto)
  - **Cerradas** (requieren llave / completar la sala)
  - **Bloqueadas** (decisión narrativa, requiere stat / item)
  - **Selladas** (sala de combate hasta derrotar enemigos)
- En sala con enemigos, las **puertas se sellan** al entrar y se abren al limpiarla.

## 🗺️ Selector de pisos (Slay the Spire)

Tras completar el piso N, en la **sala final** del piso se muestra una vista cenital del próximo piso (N+1) con varias **ramas**:

```
        ┌── [Piso 2A] ── elite enemigos, +loot
        │
[Piso 1] ┼── [Piso 2B] ── balanceado, evento garantizado
        │
        └── [Piso 2C] ── shop al final, pocos combates
```

Cada rama muestra:
- Tipo dominante de salas (combate, eventos, shop, rest...)
- Bioma
- Indicador de dificultad

El jugador elige UNA rama. Una vez elegida, comienza ese piso.

**MVP:** este sistema se implementa pero con **solo 1 piso** disponible para el MVP. Las ramas son visuales pero no llevan a nada todavía.

## 🧱 Interactuables del entorno (exploración)

En cada sala hay 2-5 interactuables. Algunos son evidentes, otros requieren explorar.

### Catálogo inicial

| Interactable | Acción | Resultado |
|--------------|--------|-----------|
| **Cofre** | E para abrir | Item aleatorio según rareza |
| **Cofre trampeado** | E para abrir | Daño + item de menor rareza |
| **Palanca** | E para activar | Abre puerta secreta / desactiva trampa / activa mecanismo |
| **Estatua** | E para examinar | Texto narrativo + posible buff |
| **Fuente** | E para beber | Buff o debuff aleatorio |
| **Cadáver** | E para registrar | Loot bajo nivel + chance de evento |
| **Libro** | E para leer | Texto narrativo + +1 INT temporal |
| **Hoguera** | E para descansar | Recupera HP/MP completamente, una sola vez |
| **Cristal** | E para tocar | Efecto mágico aleatorio |
| **Altar** | E para ofrecer | Sacrificio (HP, oro, item) por bonus |
| **Roca grande** | E para empujar | Revela pasaje secreto / abre paso |
| **Trampa de pinchos visible** | E para desactivar | Requiere DEX o item; falla = daño |

### Interactuables específicos de combate

Algunos interactuables solo aparecen en **salas de combate** y solo se pueden usar **durante el combate** (ver `06_COMBAT_SYSTEM.md`).

## 🎨 Iluminación de las salas

Estilo **dark fantasy con iluminación suficiente**: la atmósfera es oscura pero el jugador siempre ve claramente.

### Principios de iluminación

- **Luz ambiente baja** (azulada fría) para sensación de mazmorra.
- **Antorchas, cristales, hogueras** como fuentes locales cálidas que crean contraste.
- **Spotlight suave** sobre el personaje (no obvio, ~10% intensidad extra en su área).
- **Niebla de profundidad** muy ligera para dar sensación de "más allá" en los pasillos.
- **Post-procesado:** bloom suave en las luces, ligero color grading hacia tonos fríos en sombras y cálidos en luces (cinematic).
- **NUNCA escenas tan oscuras que el jugador no vea**. Si una sala es muy oscura, hay un cristal/antorcha en el centro.

### Ejemplos concretos

- Sala vacía: 3-4 antorchas en las paredes + ambient azul
- Sala de combate: 2 antorchas + cristal central + spotlight sobre los combatientes
- Sala de hoguera: hoguera grande dominante + sombras largas dramáticas
- Sala de cofre: cofre con leve emisión propia (sugiere "ven a abrirme")
- Sala de altar: cristal del altar emite luz característica del bioma

## 🎵 Audio de la sala (post-MVP, slot preparado)

Cada sala/bioma tiene:
- Ambient sound loop
- Música de fondo (intensidad variable según contexto)
- SFX de pasos según material (piedra, agua, metal...)

En MVP, slot vacío. En v0.3 se mete audio.

## 🔄 Respawn de enemigos

> Para soportar el playstyle de los farmers, los enemigos pueden respawnear.

**Reglas:**

```typescript
function shouldRespawnEnemies(room, currentTime) {
  // Sala vacía después de combate
  if (!room.isCleared || room.type !== 'combat') return false;

  // No respawn si está siendo visitada actualmente
  if (player.currentRoom === room) return false;

  // Tiempo desde que se limpió
  const elapsedSec = (currentTime - room.clearedAt) / 1000;

  // Respawn aleatorio entre 60 y 180 segundos
  const respawnTime = 60 + (room.respawnCount * 30);  // cada vez más tarde

  if (elapsedSec > respawnTime) {
    room.respawnEnemies();
    room.respawnCount++;
    return true;
  }

  return false;
}
```

- Los enemigos que respawnean **dan menos XP** (penalty del 30% por respawn).
- El loot mantiene su rareza, pero la cantidad de oro se reduce 20%.
- Esto desincentiva el farmeo masivo pero lo permite si el jugador quiere.

## 💎 Coherencia visual entre salas

- Salas del mismo piso comparten paleta y motivos del bioma.
- Transición entre pisos puede cambiar dramáticamente (catacumba a lava, etc.).
- Decoración no se repite literal entre salas del mismo piso (se barajan templates).

## 🧪 Reglas a respetar al generar

1. **Toda sala debe ser navegable.** No se permiten configuraciones donde el jugador queda atrapado.
2. **Toda sala debe tener al menos una salida.** Excepto las "dead-end" intencionales con tesoro.
3. **El minimapa siempre debe poder representar la sala.**
4. **Las puertas deben coincidir** entre salas conectadas (si A→B, en B la puerta hacia A debe existir).
5. **Las dimensiones máximas** de una sala son ~25×25 unidades. Por encima de eso, se divide en subsalas.

## 📐 Datos de generación: ejemplos

```typescript
// Ejemplo de Floor para piso 3
{
  floorNumber: 3,
  tier: 0,
  biome: 'stone_crypt',
  seed: 'run-abc-floor-3',
  rooms: [
    { id: 'r1', type: 'empty',   isStart: true },
    { id: 'r2', type: 'combat',  enemies: [SkeletonWarrior, ShadowImp] },
    { id: 'r3', type: 'event',   event: 'chest_basic' },
    { id: 'r4', type: 'combat',  enemies: [BoneArcher x2] },
    { id: 'r5', type: 'event',   event: 'fountain' },
    { id: 'r6', type: 'rest',    isExit: true },
  ],
  graph: { /* adjacency list */ },
}
```
