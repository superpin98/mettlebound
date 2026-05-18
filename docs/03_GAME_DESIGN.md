# 03 — Diseño de Juego

## 📊 Sistema de Stats

### Los 4 stats principales

| Stat | Escala | Bonus secundarios |
|------|--------|------------------|
| **💪 Fuerza (STR)** | Daño físico cuerpo a cuerpo, HP máximo | +1 HP por punto, +5% daño físico por punto |
| **🏹 Destreza (DEX)** | Daño a distancia, evasión, velocidad de turno | +0.5% evasión por punto, +4% daño a distancia por punto, +1 velocidad cada 10 puntos |
| **🧙 Inteligencia (INT)** | Daño mágico, MP máximo, regen de MP en combate | +2 MP por punto, +5% daño mágico por punto, regen MP en combate solo si clase mago |
| **🍀 Suerte (LCK)** | Probabilidad de crítico, rareza de drops | +0.3% crit por punto, +0.2% rareza drop por punto, +0.1% gold drop por punto |

### Stats derivados

| Stat derivado | Fórmula base |
|---------------|--------------|
| **HP máximo** | `100 + (STR × 10) + (nivel × 5)` |
| **MP máximo** | `30 + (INT × 5) + (nivel × 2)` |
| **Daño físico base** | `arma.dmg × (1 + STR × 0.05)` |
| **Daño a distancia base** | `arma.dmg × (1 + DEX × 0.04)` |
| **Daño mágico base** | `arma.dmg × (1 + INT × 0.05)` |
| **% Crítico** | `5 + (LCK × 0.3)` con cap suave hasta 80% |
| **Daño crítico** | `×1.5` base, modificable por items |
| **% Evasión** | `DEX × 0.5` con cap suave hasta 70% |
| **Velocidad de turno** | `100 + DEX × 0.5` (determina orden) |
| **Multiplicador de rareza** | `1 + (LCK × 0.002)` |
| **Multiplicador de gold** | `1 + (LCK × 0.001)` |

### Cap suave (soft cap)

Para evitar que builds escalen al infinito linealmente, se aplica esta fórmula a stats con %:

```typescript
// Ejemplo para crítico:
const rawCrit = 5 + (LCK * 0.3);
const softCrit = rawCrit > 50 ? 50 + (rawCrit - 50) * 0.5 : rawCrit;
const finalCrit = Math.min(softCrit, 80);
```

## ⚔️ Fórmula central de daño

```typescript
function calculateDamage(attacker, defender, baseDamage, damageType) {
  // 1. Base scaling
  const statScale = getStatScaling(attacker, damageType);
  const scaled = baseDamage * (1 + statScale * 0.05);

  // 2. Critical roll
  const isCrit = Math.random() < (attacker.critChance / 100);
  const critMult = isCrit ? attacker.critDamage : 1;

  // 3. Random variance (±10%)
  const variance = 0.9 + Math.random() * 0.2;

  // 4. Pre-mitigation damage
  let damage = scaled * critMult * variance;

  // 5. Defender's mitigation
  const defense = damageType === 'magical' ? defender.magicResist : defender.armor;
  const mitigation = defense / (defense + 100); // diminishing returns
  damage *= (1 - mitigation);

  // 6. Evasion roll (only for physical and ranged)
  if (damageType !== 'magical' && damageType !== 'true') {
    const evaded = Math.random() < (defender.evasion / 100);
    if (evaded) damage = 0;
  }

  return {
    amount: Math.max(1, Math.floor(damage)),  // mínimo 1 si conecta
    isCrit,
    isEvaded: damage === 0,
    type: damageType,
  };
}
```

### Tipos de daño

| Tipo | Color de número | Stat principal |
|------|-----------------|----------------|
| **Físico** | `#e8d090` (amarillo claro) | STR |
| **A distancia** | `#90e8c0` (verde menta) | DEX |
| **Mágico** | `#a890e8` (morado claro) | INT |
| **Verdadero** *(no mitigable)* | `#ffffff` (blanco) | varios |
| **Sangrado** *(DoT físico)* | `#c84040` (rojo sangre) | STR |
| **Veneno** *(DoT)* | `#80c040` (verde tóxico) | INT/DEX |
| **Fuego** | `#ff8040` (naranja) | INT |
| **Hielo** | `#80c8ff` (azul claro) | INT |
| **Sanación** *(no daño)* | `#80ff80` (verde sano) | — |
| **Crítico** | el color base + brillo + tamaño 1.5× | — |

Todos los números van en **fuente pixel art** (ej: VT323, Press Start 2P) con outline negro de 2px para legibilidad.

## 📈 Curva de niveles y XP

### XP para subir de nivel

```typescript
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.4));
}
```

| Nivel | XP necesaria | XP acumulada |
|-------|--------------|--------------|
| 1 → 2 | 100 | 100 |
| 5 → 6 | 364 | 1,193 |
| 10 → 11 | 1,000 | 4,652 |
| 20 → 21 | 2,793 | 19,538 |
| 30 → 31 | 5,498 | 51,452 |
| 50 → 51 | 13,824 | 196,883 |

### XP por enemigo derrotado

```typescript
function xpFromEnemy(enemyLevel: number, currentPlayerLevel: number): number {
  const base = 25 + enemyLevel * 12;
  // Penalización por farmear pisos muy por debajo del nivel
  const levelDiff = currentPlayerLevel - enemyLevel;
  const penalty = levelDiff > 5 ? Math.max(0.1, 1 - (levelDiff - 5) * 0.1) : 1;
  return Math.floor(base * penalty);
}
```

Esto permite farmear pisos bajos pero penaliza el over-leveling extremo, manteniendo balance entre los dos perfiles de jugador (grinder vs downward).

## 🎲 Sistema de niveles del jugador

- **Nivel inicial:** 1
- **Sin nivel máximo en el MVP** (con la curva exponencial, llegar a nivel 50+ ya es muy costoso)
- **Puntos por subida de nivel:** 3 stats para distribuir libremente entre los 4 stats
- **Mejora al subir nivel:** 1 elección de 3 mejoras aleatorias del *Upgrade Pool* (ver `04_CLASSES_AND_BUILDS.md`)
- **Cada 5 niveles:** mejora "rara o superior" garantizada en el pool

## 🌊 Mana y combate

Reglas centrales del MP:

- **Mago** recupera `5 + INT × 0.1` MP cada turno en combate
- **Resto de clases NO regeneran MP en combate**. Solo recuperan fuera de combate:
  - Descansando en salas tipo "rest area" (recupera 100%)
  - Bebiendo pociones de maná
  - Eventos aleatorios (fuentes, altares...)
  - Pasivas/efectos de items (algunos legendarios pueden dar regen en combate)

## 🏃 Mecánica de huida

```typescript
function calculateEscapeChance(player, enemies, room) {
  let baseChance = 60; // 60% base

  // Diferencia de nivel
  const avgEnemyLevel = enemies.reduce((s, e) => s + e.level, 0) / enemies.length;
  const levelDiff = player.level - avgEnemyLevel;
  baseChance += levelDiff * 5; // +5% por nivel arriba, -5% por nivel abajo

  // Diferencia de velocidad
  const playerSpeed = player.turnSpeed;
  const avgEnemySpeed = enemies.reduce((s, e) => s + e.turnSpeed, 0) / enemies.length;
  const speedRatio = playerSpeed / avgEnemySpeed;
  baseChance *= speedRatio;

  // Modificador del entorno (algunos enemigos se adaptan mejor a ciertos terrenos)
  const envModifier = enemies.reduce((m, e) => m * (e.envAdaptation[room.biome] ?? 1), 1);
  baseChance /= envModifier;

  // Caps
  return Math.max(5, Math.min(95, baseChance)); // entre 5% y 95%
}
```

Si la huida falla:
- El jugador pierde su turno
- Los enemigos atacan con +20% daño ese turno (representan "te atrapan por la espalda")

## 💰 Sistema de oro

| Fuente | Cantidad aproximada |
|--------|---------------------|
| Enemigo común (rareza ≤ Raro) | `5 × nivel_enemigo × (0.8 - 1.2)` random |
| Enemigo épico+ | `15 × nivel_enemigo × (0.8 - 1.2)` random |
| Cofre | `30 × piso × (0.7 - 1.5)` random |
| Mercader | comprar/vender (precios = 25% del valor base del item al vender) |

## 🎯 Filosofía de balance

1. **Toda build debe ser viable.** Si un jugador encuentra una build creativa, debería funcionar aunque no sea óptima.
2. **No hay "build correcta".** El RNG y la elección del jugador deciden.
3. **Soft caps en vez de hard caps.** El jugador siempre siente progresión.
4. **Riesgo / recompensa siempre visible.** Empujar al enemigo a un abismo pierde su loot, sí, pero salva HP. El jugador decide.
5. **Penalizaciones leves, recompensas notorias.** El juego debe sentirse generoso.

## 🔢 Constantes mágicas (poner en `config/balance.ts`)

```typescript
export const BALANCE = {
  PLAYER: {
    BASE_HP: 100,
    BASE_MP: 30,
    BASE_CRIT_CHANCE: 5,
    BASE_CRIT_DAMAGE: 1.5,
    BASE_TURN_SPEED: 100,
    HP_PER_STR: 10,
    HP_PER_LEVEL: 5,
    MP_PER_INT: 5,
    MP_PER_LEVEL: 2,
    STAT_POINTS_PER_LEVEL: 3,
  },
  DAMAGE: {
    PHYSICAL_SCALE: 0.05,
    RANGED_SCALE: 0.04,
    MAGICAL_SCALE: 0.05,
    CRIT_PER_LCK: 0.3,
    EVASION_PER_DEX: 0.5,
    VARIANCE_MIN: 0.9,
    VARIANCE_MAX: 1.1,
    MIN_DAMAGE_ON_HIT: 1,
  },
  SOFT_CAPS: {
    CRIT_CHANCE: { threshold: 50, factor: 0.5, max: 80 },
    EVASION:     { threshold: 40, factor: 0.5, max: 70 },
  },
  XP: {
    BASE: 100,
    EXPONENT: 1.4,
    BASE_KILL_XP: 25,
    XP_PER_ENEMY_LEVEL: 12,
    OVER_LEVEL_PENALTY_START: 5,
    OVER_LEVEL_PENALTY_STEP: 0.1,
  },
  ESCAPE: {
    BASE_CHANCE: 60,
    LEVEL_DIFF_MOD: 5,
    FAILED_ESCAPE_DAMAGE_MULT: 1.2,
    MIN_CHANCE: 5,
    MAX_CHANCE: 95,
  },
  // ... etc
};
```

Esto permite ajustar balance sin tocar lógica.
