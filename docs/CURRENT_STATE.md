# Estado actual del proyecto Mettlebound

> Este archivo refleja el estado vivo del proyecto. Se actualiza al final de 
> cada sprint o al tomar decisiones arquitectónicas importantes. Cualquier 
> instancia de Claude (en cualquier máquina) debe leerlo al iniciar una sesión 
> para saber por dónde vamos.

## 📍 Sprint actual

**Próximo a empezar:** Sprint 2 — Sistema de stats, clases, niveles y mejoras 
(según docs/13_ROADMAP.md).

## ✅ Sprints completados

### Sprint 0 — Setup inicial
- Vite + TypeScript + Babylon.js v9.7 instalados y configurados
- Estructura de carpetas según docs/02_PROJECT_STRUCTURE.md
- Cubo girando en pantalla
- ESLint 9 con flat config (eslint.config.js)
- Prettier configurado
- tsconfig.json con strict + alias `@/` + `ignoreDeprecations: "6.0"`

### Sprint 1 — Personaje navegable y cámara orbital
- `src/core/InputManager.ts`: captura WASD con `e.code` (independiente del 
  layout de teclado), método `dispose()` para cleanup.
- `src/core/CameraController.ts`: ArcRotateCamera, `setTarget` directo cada 
  frame (sin lerp, sin deadzone), orbit solo con click derecho (botón 2), 
  zoom con rueda. Sin panning, sin keyboard inputs. Límites de beta y radius.
- `src/game/player/PlayerController.ts`: cápsula morada en Y=1, suelo 50x50 
  con GridMaterial (@babylonjs/materials), movimiento relativo a la cámara 
  usando `camera.getDirection(Vector3.Forward())` proyectado en horizontal + 
  cross con Up. Movimiento en world space (`position.addInPlace`). Rotación 
  suave del mesh con Quaternion.Slerp.
- `src/core/Engine.ts`: HemisphericLight (intensidad 0.85) + DirectionalLight 
  (intensidad 0.5) apuntando arriba-frente.
- `src/main.ts`: orquesta Engine → InputManager → PlayerController → CameraController.

## 📦 Dependencias instaladas

Runtime:
- `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/gui`, `@babylonjs/inspector`, `@babylonjs/materials`
- `nanoid`, `mitt`, `zod`, `i18next`

Dev:
- `eslint` (v9), `prettier`, `vitest`, `@typescript-eslint/parser`, 
  `@typescript-eslint/eslint-plugin`

## 🏗️ Decisiones arquitectónicas

- **Clases del juego** = CONFIG objects (no clases TS con herencia). Definidas 
  en `src/config/classes.config.ts`.
- **Constantes de balance** centralizadas en `src/config/balance.ts`. Cero 
  números mágicos en la lógica.
- **Fórmulas** = funciones puras, sin side effects, deterministas. Preparadas 
  para validación servidor (futuro anti-cheat).
- **RNG** centralizado en `src/utils/random.ts` con seed configurable. Nadie 
  usa `Math.random()` directo.
- **UI mínima** = HTML overlay simple. Babylon GUI compleja se pospone al Sprint 8.
- **EventBus** (mitt) para desacoplar `game/` de `ui/`. El game core nunca 
  llama directamente a la UI.

## 🐛 Bugs/cuidados conocidos

- Sandbox de Cowork tiene problemas de permisos NTFS con el directorio `.git`. 
  Los comandos `git init`, `git push`, etc. se ejecutan desde PowerShell de 
  Windows directamente.
- `tsconfig.json` tiene `ignoreDeprecations: "6.0"` por warning de baseUrl. 
  Toca migrar cuando llegue TypeScript 7.

## 🌐 Repositorio

- GitHub: https://github.com/superpin98/mettlebound (privado)
- Branch principal: `main`

## 📋 Cómo actualizar este archivo

Al final de cada sprint:
1. Mueve el sprint actual a "Sprints completados" con su resumen.
2. Indica el próximo sprint como "Sprint actual".
3. Añade decisiones arquitectónicas nuevas si las hay.
4. Añade bugs/cuidados nuevos si han surgido.
5. Commit y push: este archivo viaja con el repo.
