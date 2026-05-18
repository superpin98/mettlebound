# 09 — Roster de Enemigos del MVP

## 🎨 Filosofía de diseño

Los 10 enemigos del MVP deben:
- Encajar con la **temática dark fantasy** del juego.
- Tener **personalidad mecánica distinta** (uno tanque, uno frágil rápido, uno mágico, etc.).
- Ser **visualmente reconocibles** en low poly aunque sean simples (silueta clara).
- Distribuirse por **tiers de dificultad** para que el escalado funcione.
- Tener **un comportamiento de IA simple pero coherente** con su sabor.

Cada enemigo se implementa como **archivo independiente** en `src/game/enemies/roster/`.

## 📋 Tabla resumen

| # | Enemigo | Tier | Rol | Stat principal | Daño | HP relativo |
|---|---------|------|-----|----------------|------|-------------|
| 1 | Esqueleto Guerrero | 0 | Cuerpo a cuerpo básico | STR | Físico | Medio |
| 2 | Sombra Menor | 0 | Mago frágil | INT | Mágico | Bajo |
| 3 | Arquero Óseo | 0 | A distancia | DEX | Físico distancia | Bajo |
| 4 | Araña Maldita | 0 | Veneno + evasión | DEX | Físico + DoT | Bajo |
| 5 | Zombi Putrefacto | 1 | Tanque lento | STR | Físico + cura al morir | Alto |
| 6 | Acólito Oscuro | 1 | Buff/debuff | INT | Mágico de utilidad | Bajo-medio |
| 7 | Caballero Corrupto | 2 | Tanque ofensivo | STR | Físico fuerte | Alto |
| 8 | Espectro del Vacío | 2 | Asesino mágico | INT + DEX | Mágico crítico | Bajo |
| 9 | Sabueso de Sangre | 2 | Lifesteal cuerpo a cuerpo | STR + LCK | Físico + lifesteal | Medio |
| 10 | Limo del Abismo | 1-3 | Especial — se divide | LCK | Físico bajo, regenera | Variable |

---

## 1. 🦴 Esqueleto Guerrero (`SkeletonWarrior`)

**Bioma:** Cripta de Piedra (todas las salas básicas)
**Tier:** 0 (piso 1-5)

```typescript
{
  id: 'skeleton_warrior',
  name: { es: 'Esqueleto Guerrero', en: 'Skeleton Warrior' },
  baseStats: {
    hp: 50,
    armor: 8,
    magicResist: 3,
    str: 8, dex: 4, int: 2, lck: 2,
    damage: 10,
    damageType: 'physical_melee',
    critChance: 5,
    evasion: 3,
    turnSpeed: 100,
  },
  hpScalingPerLevel: 12,
  damageScalingPerLevel: 1.5,
  skill: {
    name: 'Embate Óseo',
    mpCost: 0,
    cooldown: 3,
    effect: 'attack with 1.6x damage and chance of bleeding',
  },
  ai: {
    aggression: 0.7,
    skillUseChance: 0.35,
    intelligence: 0.3,
  },
  envAdaptation: {
    stone_crypt: 1.0,
    catacombs: 1.2,
    void: 0.7,
  },
  drops: {
    goldRange: [3, 8],
    itemChance: 0.3,
  },
  modelDescription: 'Esqueleto humanoide low poly con armadura oxidada y una espada corta. Cráneo con ojos vacíos. Color hueso pálido + acero oscuro.',
}
```

**Personalidad:** Predecible, atacante directo. El enemigo "tutorial" — el jugador aprende lo básico del combate luchando contra él.

---

## 2. 👻 Sombra Menor (`ShadowImp`)

**Bioma:** todos los de tier 0
**Tier:** 0

```typescript
{
  id: 'shadow_imp',
  name: { es: 'Sombra Menor', en: 'Lesser Shadow' },
  baseStats: {
    hp: 30,
    armor: 2,
    magicResist: 12,
    str: 2, dex: 6, int: 8, lck: 4,
    damage: 14,
    damageType: 'magical',
    critChance: 8,
    evasion: 12,
    turnSpeed: 115,
  },
  skill: {
    name: 'Susurro Helado',
    mpCost: 8,
    cooldown: 2,
    effect: 'mágico 1.4x + ralentiza al objetivo (-30% velocidad 2 turnos)',
  },
  ai: {
    aggression: 0.5,
    skillUseChance: 0.55,
    intelligence: 0.6,
  },
  envAdaptation: {
    stone_crypt: 0.9,
    void: 1.4,
  },
  drops: {
    goldRange: [2, 6],
    itemChance: 0.35,
    bonusMpPotion: 0.15,
  },
  modelDescription: 'Pequeño humanoide etéreo translúcido. Color púrpura oscuro con ojos blancos brillantes. Flota ligeramente.',
}
```

**Personalidad:** Frágil pero esquivo. Castiga al jugador con magia que también lo ralentiza, haciéndolo perder turnos.

---

## 3. 🏹 Arquero Óseo (`BoneArcher`)

**Bioma:** Cripta de Piedra
**Tier:** 0

```typescript
{
  id: 'bone_archer',
  name: { es: 'Arquero Óseo', en: 'Bone Archer' },
  baseStats: {
    hp: 35,
    armor: 4,
    magicResist: 4,
    str: 3, dex: 9, int: 2, lck: 5,
    damage: 13,
    damageType: 'physical_ranged',
    critChance: 12,
    evasion: 8,
    turnSpeed: 110,
  },
  skill: {
    name: 'Disparo Empalante',
    mpCost: 0,
    cooldown: 4,
    effect: 'físico distancia 1.7x + aplica sangrado (3% HP/turno, 3 turnos)',
  },
  ai: {
    aggression: 0.6,
    skillUseChance: 0.4,
    intelligence: 0.5,
    keepDistance: true,    // intenta mantenerse lejos en sala de combate
  },
  drops: {
    goldRange: [3, 9],
    itemChance: 0.3,
  },
  modelDescription: 'Esqueleto con arco corto. Aljaba en la espalda con flechas. Postura encorvada, cráneo ligeramente inclinado.',
}
```

**Personalidad:** Daño consistente desde lejos. Si no se elimina rápido, el sangrado acumulado puede ser letal.

---

## 4. 🕷️ Araña Maldita (`CursedSpider`)

**Bioma:** Cripta, Catacumbas
**Tier:** 0

```typescript
{
  id: 'cursed_spider',
  name: { es: 'Araña Maldita', en: 'Cursed Spider' },
  baseStats: {
    hp: 40,
    armor: 3,
    magicResist: 8,
    str: 5, dex: 10, int: 3, lck: 3,
    damage: 9,
    damageType: 'physical_melee',
    critChance: 10,
    evasion: 18,
    turnSpeed: 130,
  },
  skill: {
    name: 'Mordisco Tóxico',
    mpCost: 0,
    cooldown: 3,
    effect: 'físico 1.2x + veneno 4 turnos (4% HP/turno)',
  },
  ai: {
    aggression: 0.85,
    skillUseChance: 0.6,
    intelligence: 0.4,
  },
  drops: {
    goldRange: [2, 7],
    itemChance: 0.4,
    bonusItem: 'spider_silk',   // material crafteo futuro
  },
  modelDescription: 'Araña del tamaño de un perro grande. Negra con manchas púrpura. Ojos múltiples rojos brillantes. 8 patas afiladas.',
}
```

**Personalidad:** Rápida, evasiva. El veneno hace que sea más peligrosa de lo que parece. Recompensa al jugador por priorizarla.

---

## 5. 🧟 Zombi Putrefacto (`RottenZombie`)

**Bioma:** Catacumbas, salas húmedas
**Tier:** 1 (pisos 6-10)

```typescript
{
  id: 'rotten_zombie',
  name: { es: 'Zombi Putrefacto', en: 'Rotten Zombie' },
  baseStats: {
    hp: 90,
    armor: 10,
    magicResist: 4,
    str: 12, dex: 2, int: 1, lck: 2,
    damage: 16,
    damageType: 'physical_melee',
    critChance: 3,
    evasion: 1,
    turnSpeed: 70,
  },
  skill: {
    name: 'Plaga Final',
    mpCost: 0,
    cooldown: 5,
    effect: 'al morir, libera nube tóxica: 15% HP daño + veneno a todos los enemigos cercanos del jugador (incluido el jugador)',
    triggerType: 'on_death',
  },
  passive: 'Regeneración Pútrida: cura 5% HP cada turno',
  ai: {
    aggression: 0.9,
    skillUseChance: 0.0,   // skill es pasiva on_death
    intelligence: 0.1,
  },
  drops: {
    goldRange: [5, 12],
    itemChance: 0.35,
  },
  modelDescription: 'Humanoide hinchado, piel verde-grisácea. Heridas abiertas. Camina arrastrando un pie. Ojos blancos sin pupila.',
}
```

**Personalidad:** Tanque lento que castiga al jugador si lo deja para el final.

---

## 6. 📿 Acólito Oscuro (`DarkAcolyte`)

**Bioma:** Catacumbas, Bibliotecas
**Tier:** 1

```typescript
{
  id: 'dark_acolyte',
  name: { es: 'Acólito Oscuro', en: 'Dark Acolyte' },
  baseStats: {
    hp: 60,
    armor: 4,
    magicResist: 14,
    str: 3, dex: 5, int: 12, lck: 4,
    damage: 12,
    damageType: 'magical',
    critChance: 7,
    evasion: 5,
    turnSpeed: 95,
  },
  skill: {
    name: 'Maldición Drenante',
    mpCost: 12,
    cooldown: 3,
    effect: 'reduce un stat aleatorio del jugador en 2 puntos durante el combate + 10% HP daño',
  },
  passive: 'Buff de aliados: enemigos adyacentes ganan +15% daño',
  ai: {
    aggression: 0.4,
    skillUseChance: 0.7,
    intelligence: 0.8,
    prioritizeBuffingAllies: true,
  },
  drops: {
    goldRange: [8, 15],
    itemChance: 0.4,
    bonusItem: 'spell_scroll',  // raro
  },
  modelDescription: 'Encapuchado en túnica negra con ribetes púrpura. Una runa flotante visible sobre su cabeza. Manos esqueléticas visibles.',
}
```

**Personalidad:** El "support enemigo". Prioritario en grupos porque potencia al resto.

---

## 7. ⚔️ Caballero Corrupto (`CorruptKnight`)

**Bioma:** Catacumbas, Salones Olvidados
**Tier:** 2 (pisos 11+)

```typescript
{
  id: 'corrupt_knight',
  name: { es: 'Caballero Corrupto', en: 'Corrupt Knight' },
  baseStats: {
    hp: 130,
    armor: 18,
    magicResist: 10,
    str: 14, dex: 5, int: 3, lck: 4,
    damage: 22,
    damageType: 'physical_melee',
    critChance: 5,
    evasion: 4,
    turnSpeed: 85,
  },
  skill: {
    name: 'Tajo Devastador',
    mpCost: 15,
    cooldown: 4,
    effect: 'físico 2.0x + atordimiento 1 turno si el daño supera 30% HP del objetivo',
  },
  passive: 'Resistencia: -25% daño físico recibido',
  ai: {
    aggression: 0.8,
    skillUseChance: 0.5,
    intelligence: 0.6,
  },
  drops: {
    goldRange: [15, 30],
    itemChance: 0.5,
    bonusItem: 'knight_token',
  },
  modelDescription: 'Caballero alto en armadura completa rota y manchada. Yelmo con ranura roja brillante. Espada larga negra. Aura tenue oscura.',
}
```

**Personalidad:** Mini-tanque ofensivo. El primer enemigo realmente intimidante.

---

## 8. 👁️ Espectro del Vacío (`VoidWraith`)

**Bioma:** Vacío Profundo (tier 2+)
**Tier:** 2

```typescript
{
  id: 'void_wraith',
  name: { es: 'Espectro del Vacío', en: 'Void Wraith' },
  baseStats: {
    hp: 55,
    armor: 2,
    magicResist: 20,
    str: 3, dex: 12, int: 14, lck: 8,
    damage: 24,
    damageType: 'magical',
    critChance: 25,
    evasion: 22,
    turnSpeed: 125,
  },
  skill: {
    name: 'Asalto Etéreo',
    mpCost: 10,
    cooldown: 3,
    effect: 'se hace invisible 1 turno (los siguientes ataques fallan), y al reaparecer hace un crítico garantizado',
  },
  ai: {
    aggression: 0.75,
    skillUseChance: 0.6,
    intelligence: 0.85,
  },
  drops: {
    goldRange: [12, 25],
    itemChance: 0.55,
  },
  modelDescription: 'Forma humanoide vaga, púrpura translúcido. Sin extremidades claras, parece deshacerse en humo. Ojos blancos enormes.',
}
```

**Personalidad:** Asesino mágico que puntúa críticos. Frágil pero letal si conecta.

---

## 9. 🐺 Sabueso de Sangre (`BloodHound`)

**Bioma:** Catacumbas, Fosos
**Tier:** 2

```typescript
{
  id: 'blood_hound',
  name: { es: 'Sabueso de Sangre', en: 'Blood Hound' },
  baseStats: {
    hp: 80,
    armor: 7,
    magicResist: 6,
    str: 11, dex: 9, int: 2, lck: 6,
    damage: 18,
    damageType: 'physical_melee',
    critChance: 15,
    evasion: 10,
    turnSpeed: 120,
  },
  skill: {
    name: 'Mordisco Sangriento',
    mpCost: 0,
    cooldown: 3,
    effect: 'físico 1.5x + roba 50% del daño infligido como HP',
  },
  passive: 'Olfato Sangriento: +30% daño contra objetivos con HP < 50%',
  ai: {
    aggression: 0.95,
    skillUseChance: 0.4,
    intelligence: 0.5,
    prioritizeLowHpTarget: true,
  },
  drops: {
    goldRange: [10, 20],
    itemChance: 0.45,
  },
  modelDescription: 'Perro grande negro-rojizo con dientes muy visibles. Ojos rojos brillantes. Manchas de sangre seca en el pelaje.',
}
```

**Personalidad:** Persecutor obsesivo del objetivo herido. Drena vida.

---

## 10. 🟢 Limo del Abismo (`AbyssSlime`)

**Bioma:** Todos los biomas (puede aparecer en cualquier piso)
**Tier:** 1-3 (escalable, su tier depende del piso)

```typescript
{
  id: 'abyss_slime',
  name: { es: 'Limo del Abismo', en: 'Abyss Slime' },
  baseStats: {
    hp: 65,
    armor: 5,
    magicResist: 5,
    str: 6, dex: 4, int: 5, lck: 10,
    damage: 11,
    damageType: 'physical_melee',
    critChance: 3,
    evasion: 5,
    turnSpeed: 80,
  },
  skill: {
    name: 'División',
    mpCost: 0,
    cooldown: -1,  // automática al alcanzar 30% HP
    effect: 'cuando baja del 30% HP, se divide en 2 limos pequeños con 50% del HP máximo original y 70% de los stats',
    triggerType: 'on_low_hp',
    oneShot: true,
  },
  passive: 'Regeneración Acuosa: cura 3% HP cada turno',
  ai: {
    aggression: 0.5,
    skillUseChance: 0.0,
    intelligence: 0.2,
  },
  drops: {
    goldRange: [5, 15],
    itemChance: 0.5,         // alta porque tiene mucha "luck"
    bonusRarityModifier: 0.1, // sus drops tienden a ser de mejor rareza
  },
  modelDescription: 'Masa amorfa de gel verde-azulado oscuro. Burbujas en el interior. Pequeños ojos amarillos asomando. Brillo tenue.',
}
```

**Personalidad:** Especial. Las divisiones lo convierten en un problema sostenido. Si suben los limos pequeños, no se vuelven a dividir, así que controlables.

---

## 🛠️ Implementación

Cada enemigo se define en su archivo individual:

```typescript
// src/game/enemies/roster/SkeletonWarrior.ts
import { defineEnemy } from '../EnemyFactory';

export const skeletonWarrior = defineEnemy({
  id: 'skeleton_warrior',
  // ... toda la config
});
```

Y se registra:

```typescript
// src/game/enemies/roster/_index.ts
import { skeletonWarrior } from './SkeletonWarrior';
// ...

export const ALL_ENEMIES = [
  skeletonWarrior,
  shadowImp,
  boneArcher,
  // ...
];
```

## 🎲 Spawn por tier

```typescript
function getSpawnPoolForTier(tier: number): Enemy[] {
  return ALL_ENEMIES.filter(e => {
    const enemyTier = getEnemyTier(e);
    return enemyTier <= tier;  // pueden aparecer enemigos de igual o menor tier
  });
}

function spawnEnemiesForRoom(tier: number, seed: string): Enemy[] {
  const pool = getSpawnPoolForTier(tier);
  const count = randomIntSeeded(1, 3, seed);  // 1-3 enemigos por sala
  const result = [];

  for (let i = 0; i < count; i++) {
    const enemyDef = weightedPick(pool, seed + i);
    const level = tier * 5 + randomIntSeeded(1, 4, seed + i + 'lvl');
    result.push(instantiateEnemy(enemyDef, level));
  }

  return result;
}
```

## 📊 Escalado de stats por nivel

Cada enemigo tiene `hpScalingPerLevel` y `damageScalingPerLevel` (más algunos opcionales). Al instanciar:

```typescript
function instantiateEnemy(def: EnemyDef, level: number): Enemy {
  return new Enemy({
    ...def.baseStats,
    hp: def.baseStats.hp + (level - 1) * def.hpScalingPerLevel,
    damage: def.baseStats.damage + (level - 1) * def.damageScalingPerLevel,
    level,
    // resto se escala proporcionalmente
  });
}
```

## 🎨 Recordatorio: modelos low poly

Los `modelDescription` están en español/castellano para que el equipo (tú, futuros artistas o el propio Claude generándolos proceduralmente) pueda crearlos. En MVP se pueden generar **proceduralmente con primitivas de Babylon** (boxes + spheres + cones) hasta que se modelen con Blender.

Cada enemigo debe tener **silueta única** — visible aún en bajo detalle. Esta es la regla de oro para low poly.
