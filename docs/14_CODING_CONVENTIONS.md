# 14 — Convenciones de Código

> Reglas de estilo, patrones y prácticas que se aplican a TODO el código del proyecto. Estas convenciones son **obligatorias**. Si Claude (o tú) las viola, se corrige antes de mergear.

## 🎯 Principios generales

1. **Claridad sobre cleverness.** Código que se entienda al leerlo, no código "ingenioso" que necesita explicación.
2. **Pequeño es mejor.** Archivos cortos, funciones cortas, clases con una sola responsabilidad.
3. **Tipos explícitos en APIs públicas.** Inferencia está bien dentro de funciones, pero las firmas de exports siempre tipadas.
4. **Errores tempranos.** Validar inputs al límite del módulo, no en lo profundo de la lógica.
5. **Cero `any`.** Si hace falta `any`, hay un comentario `// eslint-disable-next-line` explicando por qué.

## 📝 TypeScript

### Configuración (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Reglas de tipos

✅ **Bien:**

```typescript
interface PlayerStats {
  str: number;
  dex: number;
  int: number;
  lck: number;
}

function calculateDamage(attacker: Combatant, defender: Combatant): DamageResult {
  // ...
}

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const slot = 'head' as const;
```

❌ **Mal:**

```typescript
function calculateDamage(attacker, defender) {  // sin tipos
  return { amount: 50 } as any;                  // any
}

let stats: any = { /* ... */ };                  // any
```

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Clase | `PascalCase` | `class CombatManager` |
| Interface | `PascalCase` | `interface PlayerStats` |
| Type alias | `PascalCase` | `type Rarity = 'common' \| ...` |
| Enum | `PascalCase` (miembros también) | `enum Rarity { Common, ... }` (preferir union types) |
| Función | `camelCase` | `function calculateDamage()` |
| Variable | `camelCase` | `const playerHp = 100` |
| Constante | `UPPER_SNAKE_CASE` | `const MAX_HP = 999` |
| Prop privada | prefijo `_` | `private _internalState` |
| Archivo de clase | `PascalCase.ts` | `CombatManager.ts` |
| Archivo de utilidad | `camelCase.ts` | `random.ts` |
| Archivo de tipos | `*.types.ts` | `game.types.ts` |
| Archivo de config | `*.config.ts` | `balance.config.ts` |

### Preferir `type` sobre `interface` cuando:
- Es un union, tuple, mapped type, o utility type.
- No se va a extender / implementar.

### Preferir `interface` cuando:
- Define la forma de un objeto.
- Se va a extender o implementar.
- Es la "API pública" de un módulo.

## 🧱 Estructura de un archivo

Orden estándar de contenido en cada archivo `.ts`:

```typescript
// 1. Imports externos
import { Engine, Scene } from '@babylonjs/core';
import { z } from 'zod';

// 2. Imports internos absolutos (@/)
import { EventBus } from '@/core/EventBus';
import type { Player } from '@/game/player/Player';

// 3. Imports relativos
import { calculateDamage } from './formulas';

// 4. Types y schemas
interface CombatOptions { /* ... */ }
const CombatStateSchema = z.object({ /* ... */ });

// 5. Constantes
const MAX_TURN_COUNT = 999;

// 6. Clase / función principal exportada
export class CombatManager {
  // ...
}

// 7. Funciones helper internas (sin export)
function isValidCombatState(state: unknown): state is CombatState {
  // ...
}

// 8. Re-exports si aplica
export type { CombatOptions };
```

## ⚖️ Tamaño y complejidad

| Métrica | Límite | Acción si se excede |
|---------|--------|---------------------|
| Líneas de archivo | 300 | Dividir en módulos |
| Líneas de función | 50 | Extraer subfunciones |
| Parámetros de función | 4 | Agrupar en objeto |
| Nivel de anidamiento | 3 | Early returns o extraer |
| Complejidad ciclomática | 10 | Simplificar |

> Estos son límites blandos. Si tiene sentido, se pueden superar, pero hay que justificarlo en código.

## 🎨 Estilo

### Prettier config (`.prettierrc`)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Reglas adicionales

- **Imports ordenados** por el orden definido más arriba.
- **No imports sin usar.**
- **No variables sin usar** (prefijo `_` si necesario para tipado).
- **Comillas simples** salvo en strings con apóstrofes.
- **Punto y coma siempre.**
- **Curly braces** incluso en single-line ifs.
- **No mezclar tabs y spaces.**

## 🔥 Patrones recomendados

### 1. Eventos en vez de coupling directo

```typescript
// ❌ Mal: el combat manager llama directamente a la UI
class CombatManager {
  onPlayerHit(damage: number) {
    UIManager.showDamageNumber(damage);
    UIManager.shakeScreen();
  }
}

// ✅ Bien: emite eventos
class CombatManager {
  onPlayerHit(damage: number) {
    eventBus.emit('combat:playerHit', { damage });
  }
}

// La UI escucha
eventBus.on('combat:playerHit', ({ damage }) => {
  showDamageNumber(damage);
  shakeScreen();
});
```

### 2. Composición sobre herencia

Salvo casos muy claros (clase base con métodos compartidos), preferir composición:

```typescript
// ✅ Bien
class Player {
  private stats: PlayerStats;
  private inventory: Inventory;
  private controller: PlayerController;

  constructor(/* ... */) { /* ... */ }
}
```

### 3. Funciones puras donde se pueda

Las fórmulas (daño, XP, escape) deben ser **funciones puras**: mismo input → mismo output. Esto las hace testables y deterministas (críticas para futuro anti-cheat).

```typescript
// ✅ Bien
export function calculateDamage(
  attacker: CombatantStats,
  defender: CombatantStats,
  baseDamage: number
): DamageResult {
  // sin side effects, sin Math.random sin seed, sin acceso a globales
}
```

### 4. Inmutabilidad cuando aplique

Para estados que cambian (jugador, run, etc.), usar **nuevos objetos** en lugar de mutar:

```typescript
// ❌ Mal
function levelUp(player: Player) {
  player.level++;
  player.stats.str++;
}

// ✅ Bien
function levelUp(player: Player): Player {
  return {
    ...player,
    level: player.level + 1,
    stats: { ...player.stats, str: player.stats.str + 1 },
  };
}
```

### 5. Discriminated unions para estados

```typescript
type GameState =
  | { type: 'menu' }
  | { type: 'exploring'; floor: Floor; player: Player }
  | { type: 'combat'; combat: CombatState; player: Player }
  | { type: 'event'; event: RandomEvent; player: Player }
  | { type: 'dead'; runSummary: RunSummary };

function render(state: GameState) {
  switch (state.type) {
    case 'menu': return renderMenu();
    case 'exploring': return renderExploration(state.floor, state.player);
    case 'combat': return renderCombat(state.combat, state.player);
    // TypeScript fuerza a manejar todos los casos
  }
}
```

## ⛔ Anti-patterns prohibidos

### 1. ❌ Mutar `props` o `args`

```typescript
// ❌ Mal
function damagePlayer(player: Player, amount: number) {
  player.hp -= amount;  // muta el input!
}
```

### 2. ❌ Lógica de juego en archivos de UI

UI muestra y captura input. La lógica vive en `game/`.

### 3. ❌ Estado global mutable accesible desde cualquier sitio

`GameState` es singleton, pero las modificaciones pasan por **métodos controlados** (`run.applyDamage()`), no acceso directo (`game.player.hp = 50`).

### 4. ❌ `Math.random()` directo en lógica de juego

Usar el RNG centralizado con seed:

```typescript
// ✅ Bien
import { gameRng } from '@/utils/random';
const roll = gameRng.float();          // 0-1
const intRoll = gameRng.int(1, 6);     // 1-6
```

Esto es crítico para reproducibilidad y futuro anti-cheat.

### 5. ❌ `setTimeout`/`setInterval` sin cleanup

Si usas timers, guarda la referencia y limpia al destruir:

```typescript
class Component {
  private timerId: number | null = null;

  start() {
    this.timerId = window.setTimeout(() => { /* ... */ }, 1000);
  }

  destroy() {
    if (this.timerId !== null) window.clearTimeout(this.timerId);
  }
}
```

### 6. ❌ Console.log en producción

Usar el `Logger` central:

```typescript
import { logger } from '@/core/Logger';
logger.debug('Player hit', { damage });
logger.info('Run started', { classId });
logger.warn('Save integrity warning');
logger.error('Combat resolution failed', err);
```

En producción, `debug` y `info` no se muestran. `warn` y `error` sí (y se pueden enviar a un servicio de telemetría en el futuro).

## 🧪 Testing

### Qué se testea

| Categoría | Cobertura | Notas |
|-----------|-----------|-------|
| Fórmulas (daño, XP, escape, rareza) | **Alta** | Funciones puras → fáciles de testear |
| Generación procedural (rooms, items) | **Media** | Test con seeds fijos para determinismo |
| Save/load | **Alta** | Schemas, migraciones, integridad |
| Sistema de turnos | **Media** | Casos extremos: sorpresa, evasión, etc. |
| UI | **Baja** | Solo regresiones específicas |
| Animaciones | **No se testea** | Visual |

### Estructura de tests

```typescript
// tests/combat/DamageFormula.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDamage } from '@/game/combat/DamageFormula';

describe('calculateDamage', () => {
  it('scales with STR for physical damage', () => {
    const result = calculateDamage(
      { str: 10, /* ... */ },
      { armor: 0, /* ... */ },
      100,
      'physical'
    );
    expect(result.amount).toBeGreaterThan(100);
  });

  it('respects minimum damage of 1', () => {
    // ...
  });

  // ...
});
```

### Comandos

```bash
npm test                  # run tests once
npm run test:watch        # watch mode durante desarrollo
npm run test:coverage     # con cobertura
```

## 🌐 i18n

**Toda string visible al jugador** debe pasar por la función `t()`:

```typescript
// ❌ Mal
button.text = 'Atacar';

// ✅ Bien
button.text = t('combat.actions.attack');
```

Los archivos de traducción están en `src/i18n/`:

```json
// src/i18n/es.json
{
  "combat": {
    "actions": {
      "attack": "Atacar",
      "skill": "Habilidad",
      "inspect": "Inspeccionar"
    },
    "result": {
      "victory": "Has vencido",
      "defeat": "Has perecido"
    }
  }
}
```

Soporte de variables:

```typescript
t('combat.damage_dealt', { amount: 47 });
// es: "Has hecho 47 de daño"
// en: "You dealt 47 damage"
```

## 📦 Imports

### Orden

1. Externos (`@babylonjs/*`, `zod`, etc.)
2. Internos absolutos (`@/...`)
3. Relativos (`./`, `../`)

### Aliases

`@/` apunta a `src/`. Configurado en `tsconfig.json` y `vite.config.ts`:

```typescript
// ✅ Bien
import { CombatManager } from '@/game/combat/CombatManager';

// ⚠️ Aceptable solo si está en la misma carpeta
import { calculateDamage } from './DamageFormula';
```

### Re-exports en `index.ts`

Para módulos con muchos archivos relacionados, exportar todo desde un `index.ts`:

```typescript
// src/game/combat/index.ts
export { CombatManager } from './CombatManager';
export { calculateDamage } from './DamageFormula';
export type { CombatState, CombatAction } from './types';
```

Y en el resto del código:

```typescript
import { CombatManager, calculateDamage } from '@/game/combat';
```

## 📝 Comentarios

### Cuándo SÍ comentar

- **Por qué**, no qué (el código ya dice qué).
- Decisiones de diseño no obvias.
- TODOs con contexto.
- Workarounds documentados.

### Cuándo NO comentar

- Código auto-explicativo.
- Repetir lo que dice el código.
- Comentarios obsoletos (peor que no tener).

### Formato

```typescript
/**
 * Calcula el daño infligido por un atacante a un defensor.
 *
 * El cálculo aplica:
 * - Escalado de stat principal
 * - Critical roll (random)
 * - Variance aleatoria (90%-110%)
 * - Mitigación con diminishing returns
 *
 * @returns Daño final, o 0 si esquivó.
 */
export function calculateDamage(...): DamageResult { /* ... */ }
```

## 🔍 ESLint config

> **Nota:** El proyecto usa ESLint 9.x, que emplea el formato "flat config" (`eslint.config.js`
> como módulo ES). El formato antiguo `.eslintrc.json` **no está soportado** en ESLint 9.x.

```js
// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['node_modules/**', 'dist/**'] },

  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
```

## 🚦 Pre-commit checks

Idealmente con Husky + lint-staged:

```bash
# pre-commit hook:
npm run lint
npm run format:check
npm run typecheck
npm test
```

Si alguno falla, el commit se rechaza.

## 📌 Cheatsheet rápido

| Si vas a... | Entonces... |
|-------------|-------------|
| Crear un nuevo sistema | Léelo primero en el `.md` correspondiente |
| Llamar a UI desde game | NO. Usa `eventBus.emit()` |
| Usar `Math.random()` | NO. Usa `gameRng` |
| Hacer un `any` | NO. Mejor `unknown` y type guards |
| Mutar un parámetro | NO. Devuelve nuevo objeto |
| Hardcodear un número | Ponlo en `config/balance.ts` |
| Hardcodear texto en UI | Ponlo en `i18n/*.json` |
| Hacer un archivo de 500 líneas | NO. Divide por responsabilidad |
| Copy-pastear código entre archivos | Extrae a una utilidad |
| Console.log para depurar | OK temporalmente, `logger.debug` para permanente |
