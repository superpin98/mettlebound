# 12 — Metaprogresión (Post-MVP, diseño preparado)

> Esta documentación describe el sistema de metaprogresión que entrará en **v0.2**, después del MVP. Pero el código del MVP debe estar arquitectónicamente preparado para integrarlo sin reescribir nada.

## 🎯 Objetivo

Mantener al jugador enganchado a través de **runs sucesivas** que dejan progreso permanente. Cada muerte no es solo "fin" — es también "cosechar lo aprendido y aplicarlo a la siguiente run". Esto es **lo que separa un roguelike (sin meta) de un roguelite (con meta)**.

## 💎 Divisa permanente: "Ecos del Abismo"

### Cómo se obtiene

Al morir, se calcula la divisa basándose en lo logrado en la run:

```typescript
function calculatePermanentCurrency(run: RunSummary): number {
  let echoes = 0;

  // 1. Base por piso alcanzado (curva creciente)
  echoes += Math.floor(Math.pow(run.floorReached, 1.3) * 5);

  // 2. Bonus por kills
  echoes += Math.floor(run.enemiesKilled * 0.5);

  // 3. Bonus por jefes derrotados
  echoes += run.bossesDefeated * 50;

  // 4. Bonus por items raros recogidos
  echoes += run.itemsByRarity.rare * 5;
  echoes += run.itemsByRarity.epic * 25;
  echoes += run.itemsByRarity.legendary * 100;

  // 5. Bonus por logros de la run
  if (run.flawlessVictories > 0) echoes += run.flawlessVictories * 10;
  if (run.causeOfDeath === 'boss') echoes += 25;  // "muerte digna"

  // 6. Multiplicadores activos (de mejoras meta)
  echoes *= run.activeMetaMultipliers;

  return Math.floor(echoes);
}
```

**Ejemplo:**
- Run que llega al piso 7, mata 80 enemigos, 1 mini-boss, recoge 3 items Raros y 1 Épico, muere al jefe del piso 5:
  ```
  Base piso:  floor(7^1.3 * 5) ≈ 65
  Kills:      80 * 0.5         = 40
  Mini-boss:  1 * 50           = 50
  Raros:      3 * 5            = 15
  Épicos:     1 * 25           = 25
  Muerte digna: 25
  ─────────────────────────────
  Total:                       ≈ 220 ecos
  ```

### Cómo se obtiene también durante la run

Algunas mejoras meta y eventos pueden dar ecos durante la run (no solo al morir):
- Mejora pasiva "Coleccionista" → +1 eco cada 10 enemigos derrotados
- Evento de altar especial → ofrece convertir oro en ecos
- Item legendario "Sello del Abismo" → drop directo de 5-15 ecos

## 🏪 La Tienda Meta (Sanctum del Abismo)

Accesible desde el **menú principal**. Aspecto: una sala oscura con un personaje misterioso (¿comerciante?, ¿custodio?) tras un mostrador iluminado.

### Categorías de la tienda

#### 1. 🌱 Mejoras de inicio (Starting Boosts)
Aplican al crear un nuevo personaje en futuras runs.

| Mejora | Coste | Efecto |
|--------|-------|--------|
| *Aprendiz* | 50 | +1 punto de stat extra al crear personaje |
| *Veterano* | 200 | +3 puntos de stat extra al crear personaje |
| *Cómodo* | 100 | Empiezas con una poción de HP en el inventario |
| *Preparado* | 150 | Empiezas con una poción de MP en el inventario |
| *Sabio* | 250 | Empiezas con 1 mejora aleatoria poco común aplicada |
| *Rico* | 100 | Empiezas con 50 oro |
| *Pertrechado* | 400 | El arma inicial es Poco Común en lugar de Común |
| *Talismán Personal* | 350 | Empiezas con un anillo Poco Común aleatorio |

#### 2. 📈 Multiplicadores permanentes (Permanent Multipliers)
Afectan a todas las runs futuras.

| Mejora | Tiers (acumulables) | Coste por tier | Efecto |
|--------|---------------------|----------------|--------|
| *Maestro de los Ecos* | 1-5 | 100, 250, 500, 1000, 2000 | +10% ecos ganados por tier |
| *Crisol del Aprendizaje* | 1-5 | 80, 200, 400, 800, 1600 | +5% XP ganada por tier |
| *Avaricia Refinada* | 1-3 | 150, 400, 1000 | +10% oro por tier |
| *Manos de Cuervo* | 1-3 | 200, 500, 1200 | +5% rareza de drops por tier |
| *Constitución* | 1-5 | 100, 250, 500, 1000, 2000 | +5% HP máximo por tier |
| *Sabiduría Innata* | 1-5 | 100, 250, 500, 1000, 2000 | +5% MP máximo por tier |

#### 3. 🎲 Desbloqueos del Pool (Pool Unlocks)
Añaden nuevas mejoras al upgrade pool de futuras runs.

| Mejora | Coste | Efecto |
|--------|-------|--------|
| *Conocimiento del Druida* | 200 | Desbloquea 3 mejoras "naturaleza" en el pool |
| *Tomos Prohibidos* | 300 | Desbloquea 3 mejoras "magia oscura" en el pool |
| *Secretos del Asesino* | 250 | Desbloquea 3 mejoras "sigilo" en el pool |
| *Doctrinas Bélicas* | 250 | Desbloquea 3 mejoras "guerra" en el pool |
| *Suerte del Embaucador* | 400 | Desbloquea 3 mejoras "LCK" rotísimas |

#### 4. ✨ Mejoras Build-Defining (Build Definers)
Son **mejoras tipo "starting class kit"** que se activan al inicio de la run y te marcan una dirección.

| Mejora | Coste | Efecto |
|--------|-------|--------|
| *Camino del Sangrador* | 500 | Tus ataques físicos tienen 10% de aplicar Sangrado desde el inicio |
| *Camino del Mago de Batalla* | 500 | Empiezas con regen de MP en combate (incluso si no eres Mago) |
| *Camino del Coleccionista* | 500 | El primer item de cada piso siempre es Raro+ |
| *Camino del Especulador* | 600 | El mercader ofrece 2 items adicionales y al doble de precio |
| *Camino del Vagabundo* | 600 | Empiezas con 1 pieza aleatoria de cada uno de los 4 conjuntos |
| *Camino del Asceta* | 800 | Empiezas sin equipo pero con +5 a todas las stats |
| *Camino del Necromante* | 1000 | Cada enemigo muerto deja un "espectro" que te ayuda durante 3 turnos |

#### 5. 🎨 Cosméticos (futura monetización suave)
Skins, efectos visuales, capas de partículas, etc. **No afectan al gameplay.**

Idealmente:
- Comprables con ecos
- O comprables con dinero real (microtransacciones cosméticas, NUNCA pay-to-win)
- O desbloqueables como recompensa por logros

#### 6. 🌐 Slots de Build (Build Slots) — futuro

Permite guardar configuraciones de "build inicial" (combinaciones de Starting Boosts + Build Definer) para usarlas rápido. 3 slots base, más slots desbloqueables.

## 🏆 Logros

Los logros dan ecos al desbloquearse + presumirse en perfil.

### Categorías iniciales

- **Exploración:** Llegar al piso 5/10/25/50, descubrir todos los biomas, etc.
- **Combate:** Matar X enemigos, hacer X de daño en un golpe, etc.
- **Colección:** Obtener un item de cada rareza, completar un conjunto, etc.
- **Mecánicas:** Empujar a 10 enemigos al abismo, ganar combates usando interactuables, ganar sin recibir daño, etc.
- **Sociales:** Compartir un screenshot, jugar X días distintos, etc.

### Estructura

```typescript
interface Achievement {
  id: string;
  name: { es: string; en: string; };
  description: { es: string; en: string; };
  iconAssetId: string;
  rewardEchoes: number;
  hidden?: boolean;          // logros ocultos hasta desbloquearse
  unlockCondition: (stats) => boolean;
}
```

## 📜 Historial de runs

En el menú principal, una pantalla muestra las últimas 100 runs con:

- Clase usada
- Piso alcanzado
- Tiempo de la run
- Causa de muerte
- Mejor item obtenido (clickable para ver tooltip)
- Ecos ganados

El jugador puede **marcar items como "favoritos"** para que en futuras runs aparezcan con un brillo especial cuando dropeen, dándoles esa dopamina de coleccionismo.

Si se implementa con Supabase, se pueden:
- Ordenar por piso, tiempo, etc.
- Filtrar por clase
- Comparar runs

## 🎯 Filosofía de la metaprogresión

1. **Cada run debe sentirse mejor que la anterior** sin trivializarla.
2. **El jugador debe poder elegir su camino**. No hay un "árbol" único, hay muchas direcciones de inversión.
3. **Las mejoras no deben sustituir el skill**. Un jugador con todas las mejoras debe seguir muriendo en pisos altos si juega mal.
4. **La diversidad de mejoras** debe permitir builds variadas y experimentación.
5. **El reset opcional**: en algún momento (v0.3+), el jugador puede "renacer" (prestige) intercambiando todo su progreso por una moneda más alta. Esto añade longevidad.

## 🔄 Reset de cuenta

El jugador puede borrar su cuenta y empezar de cero desde el menú de opciones, con confirmación doble. Esto borra todo: progreso meta, runs, mejoras compradas.

## 📊 Balance del coste de mejoras

Los costes están pensados para que:
- Después de **3-5 runs cortas** (pisos 1-10), el jugador tenga para 1-2 mejoras pequeñas.
- Después de **10-15 runs**, pueda permitirse una Build-Defining.
- Para comprar **todo el Tier 1** de las mejoras "acumulables", necesite ~50 runs.
- Para comprar **todo** (después de varios Tiers de cada cosa), necesite cientos de runs.

Esto asegura **longevidad** sin frustración. Los costes se ajustarán con telemetría una vez el juego esté live.

## 🛠️ Implementación técnica

### Arquitectura

```
src/game/meta/
├── MetaShop.ts              # Definición de la tienda
├── MetaProgression.ts       # Estado de mejoras compradas
├── EchoCalculator.ts        # Cálculo de ecos al fin de run
├── Achievement.ts           # Sistema de logros
├── UnlockManager.ts         # Aplica los efectos meta a una nueva run
└── catalog/
    ├── starting_boosts.ts
    ├── multipliers.ts
    ├── pool_unlocks.ts
    ├── build_definers.ts
    └── achievements.ts
```

### Aplicación de mejoras a nuevas runs

Al iniciar una nueva run:

```typescript
function startNewRun(account: PersistedAccount, classId: string): ActiveRun {
  const meta = account.meta;

  // 1. Crear personaje base
  const player = createPlayerForClass(classId);

  // 2. Aplicar starting boosts comprados
  applyStartingBoosts(player, meta.unlocks);

  // 3. Aplicar multiplicadores permanentes
  applyPermanentMultipliers(player, meta.unlocks);

  // 4. Activar build definers seleccionados
  applyBuildDefiners(player, meta.activeBuildDefiners);

  // 5. Aplicar pool unlocks (modifican el upgrade pool disponible)
  modifyUpgradePool(meta.unlocks);

  // 6. Iniciar run
  return createActiveRun(player);
}
```

### Datos guardados

```typescript
interface MetaProgression {
  permanentCurrency: number;
  unlocks: string[];                      // IDs de mejoras compradas
  activeBuildDefiners: string[];          // build definers activos en próxima run (máx 1-2)
  totalRuns: number;
  totalKills: number;
  totalDeepestFloor: number;
  achievements: string[];                 // IDs de logros desbloqueados
  favorites: string[];                    // baseIds de items marcados como favoritos
  totalEchoesEarned: number;
  prestige: number;                       // futuro
}
```

## ⏱️ Cuándo se desarrolla

| Versión | Qué entra |
|---------|-----------|
| **v0.1 (MVP)** | NADA de meta. Solo arquitectura preparada (tipos definidos, slots vacíos). |
| **v0.2** | Calcular ecos al morir, mostrarlos en pantalla de derrota, tienda meta básica con Starting Boosts y Multipliers. |
| **v0.3** | Pool Unlocks, Build Definers, primeros 10 logros. |
| **v0.4** | Historial de runs, favoritos, más logros. |
| **v1.0** | Cosméticos, prestige, telemetría de balance. |

## 🎨 UI/UX de la tienda meta (preview)

```
┌──────────────────────────────────────────────────────────────┐
│  SANCTUM DEL ABISMO                                    [X]   │
│  ────────────────────                                         │
│  💎 Ecos del Abismo: 1.247                                   │
│                                                                │
│  [Mejoras de inicio] [Multiplicadores] [Pool] [Caminos]      │
│  ─────────────────────────────────────────────────────────   │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ APRENDIZ    │ │ VETERANO    │ │ CÓMODO      │ │ PREPA. │ │
│  │ +1 punto    │ │ +3 puntos   │ │ Inicia con  │ │ Inicia │ │
│  │ stat extra  │ │ stat extra  │ │ poción HP   │ │ con MP │ │
│  │             │ │             │ │             │ │        │ │
│  │ Coste: 50   │ │ Coste: 200  │ │ Coste: 100  │ │ 150    │ │
│  │ [COMPRADO]  │ │  [Comprar]  │ │ [COMPRADO]  │ │[Compr.]│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

Estilo coherente con el resto de la UI: dark fantasy + acentos dorados/púrpuras + tooltips informativos.
