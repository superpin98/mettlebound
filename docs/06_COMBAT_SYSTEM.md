# 06 — Sistema de Combate

## ⚔️ Flujo general

```
[Exploración 3D]
       │
       │ Player toca enemigo / Enemigo toca al player
       ▼
[Determinar Sorpresa]
       │   • Si player ataca primero: SORPRESA del jugador
       │   • Si enemigo ataca primero: SORPRESA del enemigo
       │   • Tiempo de reacción: ~0.4s desde el toque
       ▼
[Transición a escena de combate]
       │   • Zoom in del personaje
       │   • Blur progresivo del escenario
       │   • Fade a negro suave
       │   • Carga de CombatScene
       │   • Fade out
       ▼
[Combate por turnos]
       │
       │   Loop:
       │   ┌─ Calcular orden de turnos (por velocidad)
       │   ├─ Si SORPRESA player: 2 turnos seguidos del jugador
       │   ├─ Si SORPRESA enemigo: 2 turnos seguidos del enemigo
       │   ├─ Después: alternancia normal por velocidad
       │   ├─ Acciones disponibles:
       │   │   • Ataque básico
       │   │   • Habilidad activa (si MP suficiente)
       │   │   • Usar objeto / poción
       │   │   • Inspeccionar entorno (gasta turno)
       │   │   • Usar interactuable de la sala (si fue descubierto)
       │   │   • Huir (% según fórmula)
       │   └─ Resolver daños y efectos
       │
       │ Combate termina (player gana / muere / huye)
       ▼
[Resolución]
       │   • Calcular XP y oro
       │   • Generar drops por enemigo
       │   • Aplicar efectos persistentes
       │   • Mostrar pantalla de recompensa
       ▼
[Transición de vuelta a exploración]
       │   • Fade in del escenario
       │   • Devolver al jugador a la sala (no al punto exacto del toque, sino al centro de la sala)
       ▼
[Exploración 3D]
```

## 🎯 Detección de "Ataque por sorpresa"

```typescript
function determineSurpriseAttack(player, enemy, collision) {
  // Distancia de colisión y vector de movimiento
  const playerWasMovingTowards = collision.playerVelocity.dot(
    enemy.position.subtract(player.position).normalize()
  ) > 0.3;

  const enemyWasMovingTowards = collision.enemyVelocity.dot(
    player.position.subtract(enemy.position).normalize()
  ) > 0.3;

  // El "primer atacante" es quien se acercó al otro intencionalmente
  if (playerWasMovingTowards && !enemyWasMovingTowards) {
    return 'player_surprise';
  }
  if (enemyWasMovingTowards && !playerWasMovingTowards) {
    return 'enemy_surprise';
  }
  // Ambos estaban moviéndose hacia el otro o ninguno: combate normal
  return 'normal';
}
```

**Mecánica de sorpresa:**
- Quien tiene la sorpresa, juega **2 turnos seguidos al inicio** del combate.
- Después, el orden vuelve a calcularse por velocidad.
- Visualmente: un texto grande pixel art aparece al principio del combate: *"¡EMBOSCADA!"* o *"¡SORPRESA!"* según corresponda.

## 🎬 Orden de turnos (después de la sorpresa)

```typescript
function calculateTurnOrder(combatants) {
  // Cada combatant tiene `turnSpeed` calculado de stats
  // Orden inicial por turnSpeed descendente
  combatants.sort((a, b) => b.turnSpeed - a.turnSpeed);

  // En caso de empate: el jugador siempre prioriza
  return combatants;
}
```

Si hay varios enemigos, todos actúan en su orden por velocidad, intercalados con el jugador. **No hay turnos de equipo** (no es "todos los enemigos, luego player"), es individual.

## 🎮 Acciones disponibles

### 1. Ataque básico
- **Coste:** 0 MP
- **Daño:** según arma + stat principal
- **Animación:** personaje da un paso adelante, golpea, vuelve. Enemigo tambalea.
- **Posibilidad de crítico** según stats.

### 2. Habilidad activa
- **Coste:** según habilidad (variable)
- **Daño/efecto:** definido en la habilidad
- Cada clase tiene su habilidad inicial; más se desbloquean con items y mejoras.
- **Si no hay MP suficiente:** botón deshabilitado y tooltip explica por qué.

### 3. Usar objeto / poción
- **Coste:** 0 MP, pero gasta el turno
- **Efecto:** según poción (HP/MP/buff temporal)
- Abre un mini-menú con las pociones del inventario.

### 4. Inspeccionar entorno
- **Coste:** 0 MP, **gasta 1 turno completo**
- **Efecto:** revela los **interactuables ocultos** de la sala de combate y muestra qué hace cada uno.
- Una vez inspeccionado, los interactuables están "marcados" y se pueden usar en turnos siguientes.
- **No es necesario inspeccionar** para usar interactuables visibles obvios (ej: una antorcha enorme), pero los ocultos (ej: una grieta en el suelo cerca del enemigo) requieren inspección.

### 5. Usar interactuable de la sala
- **Coste:** 0 MP, gasta el turno
- **Efecto:** según interactuable.

**Catálogo inicial de interactuables de combate:**
| Interactuable | Coste turno | Efecto |
|---------------|-------------|--------|
| **Antorcha** | sí | Arroja la antorcha → daño de fuego + chance de incendio (DoT) |
| **Roca / Estalactita** | sí | Empuja una piedra → daño físico flat + posible aturdimiento 1 turno |
| **Abismo (al borde)** | sí | Empuja al enemigo → SI lo hace caer, lo elimina pero **pierde su loot** |
| **Trampa de pinchos** | sí | Activa una trampa cercana → daño moderado + sangrado |
| **Cuerda colgante** | sí | Te subes a una repisa → +50% evasión durante 2 turnos |
| **Pólvora / barril** | sí | Lo enciendes → explosión grande en zona, 2 turnos después |
| **Estatua / pilar** | sí | Lo derribas → daño en área + bloquea visión 1 turno |
| **Charco de agua** | sí | Lo electrificas (si tienes daño mágico de rayo) → afecta a todos los enemigos en el charco |

> **Importante:** la sala de combate procedural genera entre 2 y 5 interactuables apropiados al bioma. La inspección revela cuáles hay.

### 6. Huir
- **Coste:** 0 MP, gasta el turno
- **Probabilidad de éxito:** según `EscapeFormula` (ver `03_GAME_DESIGN.md`).
- **Si falla:** pierdes el turno y los enemigos atacan con +20% daño.
- **Si éxito:** vuelves a la sala de exploración. El enemigo permanece donde estaba en exploración pero no te persigue durante 10 segundos.

## 🎨 Animaciones y feedback

### Números de daño volando

```typescript
interface DamageNumber {
  text: string;             // "47" o "47 CRIT"
  color: string;            // según tipo de daño
  fontSize: number;         // 1.5× si crítico
  font: 'pixel';            // VT323 o Press Start 2P
  outlineColor: 'black';
  startPos: Vector3;        // sobre el objetivo
  velocity: Vector3;        // fly up + slight random
  fadeTime: 1.5;            // seg
  scaleAnim: 'bounce';
}
```

### Animaciones mínimas del MVP

- **Atacar (player):** paso adelante (0.2s) + impacto + retroceso (0.3s)
- **Atacar (enemigo):** similar
- **Recibir daño:** flash rojo del modelo (0.15s) + tambaleo
- **Muerte:** caída del modelo + fade a transparente (1.5s)
- **Habilidad mágica:** partículas según tipo (esfera arcana, llama, etc.)
- **Habilidad física:** swing del arma + estela
- **Crítico:** flash blanco + shake de cámara muy leve (0.1s)
- **Esquivar:** modelo se desplaza lateralmente con afterimage

### Transición a combate

```typescript
async function transitionToCombat() {
  // 1. Pause game in exploration
  await freezePlayer();

  // 2. Zoom in to player (0.5s)
  await tween(camera, { fov: 30, position: closer }, 500);

  // 3. Apply progressive blur post-process
  await tween(blurPipeline, { intensity: 1 }, 500);

  // 4. Fade to black
  await fadeScreen('black', 300);

  // 5. Switch scene
  await sceneManager.switchTo(CombatScene);

  // 6. Setup combat scene with combatants placed
  setupCombatPositions(player, enemies);

  // 7. Fade from black
  await fadeScreen('clear', 400);

  // 8. Show "AMBUSH!" / "SURPRISE!" text if applicable
  showSurpriseText();

  // 9. Start combat
  startCombat();
}
```

## 🗺️ Sala de combate

### Estructura general

- **Vista isométrica top-down**, cámara fija pero con leve drift cinematográfico.
- **Player abajo** en el centro de la zona baja.
- **Enemigos arriba** distribuidos en una franja superior.
- **Entorno temático** según el piso/bioma.
- **Iluminación de combate** muy intencional: spotlights sobre los combatientes, ambiente más oscuro alrededor.
- **Interactuables visibles** distribuidos por la sala.

### Layout aproximado

```
        ┌─────────────────────────────┐
        │                             │
        │   E1     E2     E3          │  ← Zona enemigos (Z+)
        │                             │
        │  [interactuable]            │
        │                             │
        │         [interactuable]     │  ← Zona neutra (interactuables)
        │                             │
        │  [interactuable]            │
        │                             │
        │            P                │  ← Zona player (Z-)
        │                             │
        └─────────────────────────────┘
            cámara isométrica desde arriba-frente
```

### Tipos de sala (varias en post-MVP, 1 fija en MVP)

Por ahora, **1 sala fija "caverna oscura"** con:
- Suelo de piedra agrietada
- Estalactitas/estalagmitas decorativas
- 3 antorchas en las paredes
- 1 abismo en un lateral
- 1-2 rocas grandes que se pueden tirar

En post-MVP cada piso tiene su set de salas temáticas (cripta, biblioteca arcana, mazmorra inundada, foso de lava, etc.).

## 💀 Resolución del combate

### Victoria

```typescript
function resolveVictory() {
  const rewards = {
    xp: 0,
    gold: 0,
    items: [],
  };

  for (const enemy of defeatedEnemies) {
    // Si el enemigo fue empujado al abismo: NO da loot
    if (enemy.deathCause === 'pushed_into_void') continue;

    rewards.xp += xpFromEnemy(enemy.level, player.level);
    rewards.gold += goldFromEnemy(enemy);
    const drop = rollDrop(enemy, player.luck, floor.tier);
    if (drop) rewards.items.push(drop);
  }

  showRewardScreen(rewards);
  applyRewards(rewards);
}
```

### Derrota (HP a 0)

- Transición a "pantalla de derrota" con flavor text.
- Mostrar estadísticas de la run: pisos, enemigos derrotados, oro acumulado, items obtenidos.
- **(Post-MVP)** Calcular divisa permanente.
- Botón "Volver al menú principal".
- Save de la run se borra (la run terminó).

### Huida

- Transición de vuelta a exploración.
- Aparece un texto "Has escapado." y desaparece.
- El combate se reinicia si el jugador vuelve a tocar al enemigo (el enemigo no persigue, pero está ahí).

## 🎭 Estados alterados (status effects)

Catálogo inicial — implementar como sistema modular:

| Estado | Icono | Efecto | Duración |
|--------|-------|--------|----------|
| **Sangrado** | 🩸 | 5% del HP máximo del afectado por turno (daño físico) | 3 turnos |
| **Veneno** | 🧪 | 3% del HP máximo + reduce 10% daño | 4 turnos |
| **Quemado** | 🔥 | 4% del HP máximo (daño fuego) | 3 turnos |
| **Congelado** | ❄️ | -50% velocidad de turno | 2 turnos |
| **Paralizado** | ⚡ | Salta 1 turno | 1 turno |
| **Cegado** | 🌫️ | -50% chance de acertar | 2 turnos |
| **Furia** | 😡 | +30% daño, +50% daño recibido | 3 turnos |
| **Foco** | 🎯 | +25% crit chance, -25% crit damage | 3 turnos |
| **Escudo** | 🛡️ | Absorbe X daño | hasta consumirse |
| **Regeneración** | 💚 | +5% HP máximo por turno | 4 turnos |

**Apilabilidad:** algunos sí (sangrado, veneno), otros no (congelado, paralizado). Definir en el sistema.

## 🔥 Casos especiales en combate

### Múltiples enemigos
- Cada uno actúa en su turno individualmente.
- El jugador selecciona objetivo al usar acciones de daño directo.
- Las acciones AoE (área) afectan a todos los enemigos del rango.
- **Drops y XP siguen siendo POR enemigo**, calculados individualmente al morir cada uno.

### Empujar al abismo
- Acción especial cuando el enemigo está al borde.
- Probabilidad de éxito según `STR del jugador vs STR del enemigo + estado del enemigo (si está aturdido es 100%)`.
- Si el enemigo cae: muere instantáneamente, **sin loot ni XP**.
- Decisión interesante de riesgo: ahorrar HP a costa de recompensas.

### Combate finalizado mid-action
- Si un efecto persistente mata al último enemigo durante el turno del jugador, el combate termina inmediatamente al resolver ese tick.

## 🎯 IA enemiga básica (MVP)

```typescript
interface EnemyAI {
  decideAction(combatState): CombatAction;
}

class BasicEnemyAI implements EnemyAI {
  decideAction(state) {
    // 1. Si HP < 25% y tiene habilidad defensiva: usarla
    // 2. Si MP suficiente y RNG < (skillUseChance): habilidad activa
    // 3. Si el jugador tiene un status que el enemigo aprovecha: explotarlo
    // 4. Si el jugador está al borde del abismo y enemigo es bruto: empujar
    // 5. Default: ataque básico al objetivo con menos HP
  }
}
```

Cada enemigo tiene parámetros distintos:
- `skillUseChance`: 0-1
- `aggression`: alta = prioriza ataques, baja = prioriza defensa
- `intelligence`: alta = busca debilidades, baja = ataca al primero
- `envAdaptation`: bonus en biomas concretos (afecta a fórmula de huida también)

En MVP, IAs simples diferenciadas por estos parámetros. En v0.2 se podrá hacer comportamientos más complejos.
