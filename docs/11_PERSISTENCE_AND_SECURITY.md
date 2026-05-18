# 11 — Persistencia y Seguridad

## 🎯 Objetivos

1. **Save robusto en localStorage** desde el día 1 que sobreviva a recargas, cierres y crashes del navegador.
2. **Arquitectura preparada para migración a Supabase** sin reescribir lógica de juego.
3. **Seguridad ultra estricta**: el save no debe poder ser editado trivialmente con devtools, y la lógica del juego debe ser validable en servidor el día que tengamos backend.
4. **Cero dependencia frontend de datos externos** en MVP: el juego funciona offline.

## 💾 Datos persistentes

### Lo que se guarda

```typescript
interface PersistedAccount {
  version: number;                  // versión del schema, para migraciones
  accountId: string;                // generado al crear cuenta local (nanoid)
  createdAt: number;                // timestamp ISO
  language: 'es' | 'en' | ...;

  // Run activa (si la hay)
  activeRun?: ActiveRun;

  // Historial de runs (post-MVP guardado completo, MVP solo stats agregadas)
  runs: RunSummary[];

  // Metaprogresión
  meta: MetaProgression;

  // Settings
  settings: GameSettings;

  // Hash de integridad
  integrity: string;                // hash de todo lo anterior
}

interface ActiveRun {
  runId: string;
  startedAt: number;
  player: PlayerState;
  currentFloor: FloorState;
  rng: { seed: string; counter: number };  // para reproducibilidad
  flags: Record<string, boolean>;          // eventos one-shot, etc.
}

interface RunSummary {
  runId: string;
  classId: string;
  floorReached: number;
  enemiesKilled: number;
  goldEarned: number;
  itemsCollected: number;
  durationSeconds: number;
  causeOfDeath?: string;
  permanentCurrencyEarned: number;
  bestItemFound?: ItemSummary;            // ItemSummary es Item sin objeto Babylon
  endedAt: number;
}

interface MetaProgression {
  permanentCurrency: number;              // divisa entre runs
  unlocks: string[];                      // IDs de mejoras desbloqueadas
  totalRuns: number;
  totalKills: number;
  totalDeepestFloor: number;
  // ... etc, ampliable
}

interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  showDamageNumbers: boolean;
  autoSave: boolean;
  language: string;
}
```

### Lo que NO se guarda

- Modelos 3D cargados, partículas activas → se regeneran al cargar.
- Estado de animaciones → se reinicia.
- Cache de tooltips, sprites de UI → se regenera.

## 🗂️ Estructura de almacenamiento

### Clave principal en localStorage

```
abyss-below:account     → PersistedAccount serializado (con hash integridad)
abyss-below:settings    → settings duplicado para acceso rápido
abyss-below:backup      → última versión válida del save (para recovery)
```

### Backup automático

Cada vez que se guarda un save válido, se guarda también una copia en `abyss-below:backup`. Si al cargar `abyss-below:account` el hash falla, se intenta cargar `abyss-below:backup`. Si ambos fallan, el juego ofrece crear cuenta nueva y muestra el error al jugador.

## 🔐 Validación con Zod

**Todo save** se valida con un schema Zod antes de cargarse en memoria. Si un campo falta, está corrupto o tiene tipo inválido, el load falla.

```typescript
// src/persistence/SaveSchema.ts
import { z } from 'zod';

export const ItemSchema = z.object({
  id: z.string().min(1),
  baseId: z.string().min(1),
  name: z.string(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  itemType: z.enum(['weapon', 'armor', 'accessory', 'pet', 'consumable']),
  slot: z.string(),
  level: z.number().int().min(1).max(999),
  iLevel: z.number().int().min(1).max(999),
  setId: z.string().optional(),
  baseStats: z.record(z.number()),
  affixes: z.array(z.object({
    stat: z.string(),
    value: z.number(),
    isPercent: z.boolean(),
  })),
  uniqueEffect: z.object({...}).optional(),
});

export const PlayerStateSchema = z.object({
  classId: z.string(),
  level: z.number().int().min(1).max(999),
  xp: z.number().int().min(0),
  stats: z.object({
    str: z.number().int().min(0),
    dex: z.number().int().min(0),
    int: z.number().int().min(0),
    lck: z.number().int().min(0),
  }),
  hp: z.number(),
  mp: z.number(),
  gold: z.number().int().min(0),
  inventory: z.array(ItemSchema).max(50),
  equipped: z.record(ItemSchema.optional()),
  // ...
});

export const PersistedAccountSchema = z.object({
  version: z.number().int(),
  accountId: z.string().min(1),
  createdAt: z.number().int(),
  language: z.string(),
  activeRun: z.object({...}).optional(),
  runs: z.array(z.object({...})).max(1000),
  meta: z.object({...}),
  settings: z.object({...}),
  integrity: z.string(),
});

export type PersistedAccount = z.infer<typeof PersistedAccountSchema>;
```

**Beneficio:** si en el futuro un atacante manipula el save, la mayoría de manipulaciones romperán el schema y el load fallará seguro.

## 🛡️ Hash de integridad

Para detectar (y desincentivar) la edición manual del save desde devtools:

```typescript
// src/persistence/SaveEncryption.ts
import { z } from 'zod';

const INTEGRITY_KEY = 'ab_v1_local';  // se cambia al migrar a backend

export async function computeIntegrity(account: PersistedAccount): Promise<string> {
  const { integrity, ...rest } = account;
  const json = JSON.stringify(rest);

  // SHA-256 via SubtleCrypto + clave (HMAC)
  const enc = new TextEncoder();
  const keyData = enc.encode(INTEGRITY_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(json));

  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifyIntegrity(account: PersistedAccount): Promise<boolean> {
  const expected = await computeIntegrity(account);
  return expected === account.integrity;
}
```

**Notas importantes:**
- Esto **no es protección criptográfica real** (la clave está en el cliente). Es **anti-tampering casual**: un usuario que edita stats con devtools verá el save invalidado.
- Cuando migremos a Supabase, las acciones críticas (drops, XP gain) se validarán **en servidor**, y la clave de integridad será del servidor.
- **Documentar honestamente:** el cheating offline será siempre posible. Lo que importa es que **online (leaderboards, multiplayer, packs)** no se pueda hacer trampas.

## 🔄 Migración entre versiones

Los saves tienen `version`. Si cargamos un save antiguo:

```typescript
// src/persistence/MigrationManager.ts
const MIGRATIONS: Record<number, (data: any) => any> = {
  1: (data) => data,  // sin cambios desde v0
  2: (data) => {
    // Migración v1 → v2: añadido campo "luck" a stats
    if (!data.player.stats.lck) data.player.stats.lck = 0;
    return data;
  },
  // ... ampliable
};

export function migrateSave(rawData: any): PersistedAccount {
  let current = rawData.version ?? 1;
  let data = rawData;

  while (current < CURRENT_VERSION) {
    const next = current + 1;
    if (MIGRATIONS[next]) {
      data = MIGRATIONS[next](data);
    }
    current = next;
  }

  data.version = CURRENT_VERSION;
  return data as PersistedAccount;
}
```

## 💾 SaveManager — API pública

```typescript
// src/persistence/SaveManager.ts

class SaveManager {
  async save(account: PersistedAccount): Promise<void> {
    // 1. Compute hash
    account.integrity = await computeIntegrity(account);

    // 2. Validate schema (defensa de bugs internos)
    const validated = PersistedAccountSchema.parse(account);

    // 3. Backup current valid save
    const current = localStorage.getItem('abyss-below:account');
    if (current) localStorage.setItem('abyss-below:backup', current);

    // 4. Save
    localStorage.setItem('abyss-below:account', JSON.stringify(validated));
  }

  async load(): Promise<PersistedAccount | null> {
    const raw = localStorage.getItem('abyss-below:account');
    if (!raw) return null;

    try {
      let data = JSON.parse(raw);
      data = migrateSave(data);

      const validated = PersistedAccountSchema.parse(data);

      // Verify integrity
      const valid = await verifyIntegrity(validated);
      if (!valid) {
        console.warn('Save integrity check failed. Trying backup...');
        return this.loadBackup();
      }

      return validated;
    } catch (e) {
      console.error('Save load failed:', e);
      return this.loadBackup();
    }
  }

  private async loadBackup(): Promise<PersistedAccount | null> {
    const raw = localStorage.getItem('abyss-below:backup');
    if (!raw) return null;

    try {
      let data = JSON.parse(raw);
      data = migrateSave(data);
      const validated = PersistedAccountSchema.parse(data);
      if (await verifyIntegrity(validated)) return validated;
    } catch (e) {
      console.error('Backup load also failed:', e);
    }
    return null;
  }

  async deleteAccount(): Promise<void> {
    if (!confirm('¿Borrar todo el progreso? No se puede deshacer.')) return;
    localStorage.removeItem('abyss-below:account');
    localStorage.removeItem('abyss-below:backup');
  }

  async exportSave(): Promise<string> {
    const data = localStorage.getItem('abyss-below:account');
    return data ?? '';
  }

  async importSave(text: string): Promise<boolean> {
    try {
      const data = JSON.parse(text);
      const validated = PersistedAccountSchema.parse(data);
      if (await verifyIntegrity(validated)) {
        await this.save(validated);
        return true;
      }
    } catch {}
    return false;
  }
}
```

## ⚡ Estrategia de auto-guardado

| Trigger | Frecuencia |
|---------|------------|
| Cambio de sala | Save completo |
| Subida de nivel | Save completo |
| Combate ganado (drops aplicados) | Save completo |
| Apertura/cierre de inventario | Solo si hubo cambios |
| Compra/venta a mercader | Save completo |
| Game pause / lose focus | Save completo |
| Cada 30 segundos (idle) | Save completo |
| Game close (`beforeunload`) | Save sincrónico final |

## 🌐 Roadmap a Supabase (cuando llegue el momento)

Cuando el juego esté en versión beta y se quiera meter backend:

### Fase 1: Cuentas (sin afectar gameplay)
- Auth con email/magic link
- Migrar `accountId` local a `accountId` de Supabase
- Sincronizar `MetaProgression` y `runs` al servidor (los saves siguen en localStorage)
- El cliente sigue siendo authoritative para la run activa

### Fase 2: Saves en servidor
- `activeRun` también se guarda en Supabase con cifrado en cliente antes de subir
- Si el jugador entra desde otro dispositivo, descarga su `activeRun`
- Conflictos: el save más reciente gana, con aviso

### Fase 3: Validación servidor (anti-cheat real)
- Las acciones del jugador se replican en servidor con el mismo seed
- El servidor recalcula combates y verifica que el HP y los drops coinciden
- Saves con divergencias se invalidan y se ofrece rollback

### Schemas de Supabase

```sql
-- Tabla de cuentas
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  language TEXT DEFAULT 'es'
);

-- Meta-progresión
CREATE TABLE meta_progression (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  permanent_currency BIGINT DEFAULT 0,
  unlocks JSONB DEFAULT '[]',
  total_runs INT DEFAULT 0,
  total_kills BIGINT DEFAULT 0,
  total_deepest_floor INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de runs
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  floor_reached INT NOT NULL,
  ended_at TIMESTAMPTZ DEFAULT now(),
  summary JSONB NOT NULL,
  permanent_currency_earned INT NOT NULL DEFAULT 0
);

-- Run activa serializada
CREATE TABLE active_run (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  data_encrypted TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS obligatorio en TODAS las tablas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON meta_progression
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "Users can update own data" ON meta_progression
  FOR UPDATE USING (auth.uid() = account_id);

-- ... etc para cada tabla
```

## 🔒 Reglas de seguridad — Código

1. **No usar nunca `eval`, `Function()`, ni `innerHTML`** con contenido dinámico. Siempre `textContent`.
2. **Headers CSP estrictos en Netlify** desde el primer deploy:

```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co;"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

3. **No exponer secrets ni keys** en el bundle. Las claves de Supabase serán `anon` keys con RLS (correcto), nunca `service_role` keys.
4. **Sanitizar inputs** (nombre del personaje, etc.): solo alfanuméricos + algunos símbolos, longitud máxima.
5. **Rate limiting** del lado servidor (cuando exista) para evitar abuso.
6. **No log de datos sensibles** ni en consola ni en servicios externos.
7. **Auditoría de dependencias**: `npm audit` antes de cada release. Cero vulnerabilidades altas en producción.
8. **CORS estricto** cuando integremos Supabase: solo el dominio de Netlify.

## 📌 TL;DR para el MVP

- ✅ Save en localStorage con Zod + hash de integridad + backup
- ✅ Toda lógica con seeds determinísticos (preparado para validación servidor)
- ✅ Schemas tipados con Zod
- ✅ CSP estricta desde primer deploy
- ✅ Migración a Supabase planificada en código (interfaces abstractas) pero NO implementada
- ❌ Sin backend en MVP
- ❌ Sin auth en MVP

Cuando llegue el momento de meter Supabase, el cambio principal será **swap del `SaveManager`** por una versión que también sincroniza con servidor. El resto del juego no se entera.
