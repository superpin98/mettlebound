# 01 — Stack Tecnológico

## ✅ Tu entorno ya está listo
- **Node.js v24.14.1** — confirmado en tu captura
- **SO:** Windows
- **Editor:** asumimos VS Code

## 🛠️ Stack definitivo

### Core
| Tecnología | Versión | Por qué |
|-----------|---------|---------|
| **TypeScript** | `^5.4.0` | Tipado estricto, escala mucho mejor en proyectos grandes |
| **Vite** | `^5.2.0` | Bundler ultrarrápido, hot-reload instantáneo, build optimizado |
| **Babylon.js** | `^7.x` | Motor 3D con física, animaciones esqueléticas, GUI, post-procesado y assets pipeline ya integrados (ventaja vs Three.js) |
| **@babylonjs/loaders** | `^7.x` | Para cargar modelos `.glb`/`.gltf` cuando los necesites |
| **@babylonjs/gui** | `^7.x` | Sistema de UI 2D nativo de Babylon, perfecto para HUD |
| **@babylonjs/inspector** | `^7.x` | DevTools de Babylon, solo en desarrollo |

### Calidad de código
| Herramienta | Versión | Para qué |
|-------------|---------|----------|
| **ESLint** | `^9.x` | Linter de JS/TS |
| **@typescript-eslint** | `^7.x` | Reglas específicas de TS |
| **Prettier** | `^3.x` | Formateo automático |
| **Vitest** | `^1.x` | Testing rápido, integrado con Vite |

### Utilidades
| Librería | Para qué |
|----------|----------|
| **i18next** + **react-i18next** *(no, sin react)* — usaremos **i18next** vanilla | Internacionalización |
| **nanoid** | IDs únicos para items, enemies, eventos |
| **mitt** | Event emitter ligero (decoupling entre sistemas) |
| **zod** | Validación de schemas (ESENCIAL para seguridad de saves) |

### Hosting / Deploy
- **Netlify** (decidido)
- Build command: `npm run build`
- Publish directory: `dist`
- Conectar con repositorio GitHub para deploy automático en cada push

### Plan de backend (no se implementa aún)
- **Supabase** *(decidido para más adelante)*
- Auth con email o magic link
- Tabla `users`, `accounts`, `meta_progression`
- Row Level Security (RLS) **obligatorio** en todas las tablas
- Cifrado de datos sensibles en cliente antes de subir

## 🔒 Reglas de seguridad desde el día 1

Aunque el backend venga después, hay decisiones que se toman YA:

1. **Toda lógica de daño, drops y XP se calcula y se valida en cliente PERO con seeds determinísticos**, para que cuando migremos a backend podamos validar runs en servidor.
2. **El save en localStorage se serializa con un hash de integridad** (firmado con una clave que cambiará al migrar a backend). Esto previene que el usuario edite stats a mano fácilmente.
3. **Toda data de usuario se valida con Zod schemas** antes de cargarse. Un save corrupto o manipulado tira un error claro y se ofrece reset.
4. **Sin `eval()`, `Function()` ni `innerHTML`** en ningún momento. Si necesitas insertar texto dinámico, siempre `textContent`.
5. **CSP headers en Netlify** desde el primer deploy (Content-Security-Policy estricta).

## 📦 Comandos iniciales de setup

Una vez crees el proyecto, los comandos serán estos (te los pasaré con más detalle en el sprint 0):

```bash
# 1. Crear proyecto con Vite + TypeScript
npm create vite@latest abyss-below -- --template vanilla-ts

# 2. Entrar al proyecto
cd abyss-below

# 3. Instalar Babylon
npm install @babylonjs/core @babylonjs/loaders @babylonjs/gui @babylonjs/inspector

# 4. Instalar utilidades
npm install nanoid mitt zod i18next

# 5. Instalar dev dependencies
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier vitest

# 6. Arrancar el dev server
npm run dev
```

## 🚫 Lo que NO usamos y por qué

- **React / Vue / Svelte:** sobra peso, el juego no necesita un framework de UI reactivo. La UI 2D la hace Babylon GUI y algunos overlays HTML mínimos.
- **Three.js:** lo usamos en las pruebas, pero Babylon tiene física nativa, animaciones de esqueleto, GUI 2D y post-procesado de serie. Para un juego completo es mejor.
- **WebPack:** Vite es 10× más rápido en desarrollo y simplifica todo.
- **jQuery:** ya, ni de coña.

## 📊 Targets de rendimiento

- **60 FPS** estables en hardware medio (laptop con gráfica integrada moderna)
- **Build size inicial < 2 MB** comprimido (Babylon tree-shakeable, importar solo lo necesario)
- **Tiempo de carga inicial < 5s** en conexión 4G

## ✅ Confirmaciones técnicas finales

- ✅ Solo desktop por ahora (no mobile)
- ✅ TypeScript strict mode
- ✅ Persistencia localStorage con plan de migración Supabase
- ✅ i18n preparado desde el día 1 (mínimo ES + EN)
- ✅ Estilo POE muy pulido
