# 13 — Roadmap de Desarrollo

> Cómo se va a construir Abyss Below, sprint por sprint, hasta llegar al MVP funcional y más allá. Pensado para sesiones realistas de trabajo, sin overselling.

## 🗓️ Visión general

```
v0.1 — MVP        ←→ ~10 sprints (~3-4 meses de trabajo regular)
v0.2 — Meta       ←→ +2-3 sprints
v0.3 — Polish     ←→ +2 sprints (audio, contenido, balance)
v0.4 — Backend    ←→ +2-3 sprints (Supabase, cuentas)
v1.0 — Launch     ←→ Beta, marketing, deploy
```

## 🎯 Definición de "sprint"

Un sprint es **un sistema completo y funcional** que puede integrarse y probarse independientemente. No tiene tiempo fijo — depende de tu disponibilidad.

Al final de cada sprint:
- El código está en GitHub con su commit limpio.
- El sistema funciona en aislamiento + integrado.
- Si hay tests, pasan.
- El juego sigue arrancando.

## 🏁 Sprint 0 — Setup del proyecto

**Objetivo:** Tener Vite + TypeScript + Babylon arrancando con un cubo girando.

**Tareas:**
1. Crear proyecto: `npm create vite@latest abyss-below -- --template vanilla-ts`
2. Instalar dependencias (ver `01_TECH_STACK.md`):
   ```bash
   npm install @babylonjs/core @babylonjs/loaders @babylonjs/gui @babylonjs/inspector
   npm install nanoid mitt zod i18next
   npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier vitest
   ```
3. Configurar `tsconfig.json` con `strict: true`.
4. Configurar ESLint y Prettier (ver `14_CODING_CONVENTIONS.md`).
5. Crear la estructura de carpetas vacía (ver `02_PROJECT_STRUCTURE.md`).
6. Crear `src/main.ts` que instancie Babylon Engine, una Scene básica y renderice un cubo.
7. Subir a GitHub.
8. Conectar a Netlify y comprobar deploy automático.
9. Configurar `netlify.toml` con headers CSP (ver `11_PERSISTENCE_AND_SECURITY.md`).

**Criterio de aceptación:** abrir la URL de Netlify y ver un cubo girando.

---

## 🏁 Sprint 1 — Movimiento del personaje y cámara

**Objetivo:** Personaje navegable en 3D con WASD y cámara orbital.

**Tareas:**
1. Sustituir el cubo por un placeholder de personaje (cápsula low poly).
2. Implementar `InputManager` (WASD + mouse).
3. Implementar `CameraController` (cámara que sigue al personaje, rotación con mouse).
4. Implementar `PlayerController` que mueve al personaje en X/Z y aplica rotación a la facing.
5. Crear suelo básico (plano grande con grid de prueba).
6. Importar lo aprendido en `mountain_world.html` adaptado a TypeScript.

**Criterio de aceptación:** moverse libremente por una plataforma con WASD, cámara siguiendo al personaje.

---

## 🏁 Sprint 2 — Stats, clases y subida de nivel

**Objetivo:** Sistema completo de stats y clases sin combate todavía.

**Tareas:**
1. Implementar `PlayerStats` con los 4 stats + derivados (HP, MP, crit, evasión...).
2. Implementar `StatCalculator` con todas las fórmulas (`03_GAME_DESIGN.md`).
3. Implementar las 5 clases (`04_CLASSES_AND_BUILDS.md`).
4. Implementar el pool de upgrades (al menos los Comunes y Poco Comunes del MVP).
5. Implementar `LevelUp` (asignación de puntos + selección de 1 de 3 mejoras).
6. **Tests unitarios** para fórmulas críticas (daño, XP, escapes).
7. UI muy básica para mostrar stats actuales del jugador (texto plano de momento).

**Criterio de aceptación:** crear personaje de cada una de las 5 clases, simular subida de nivel, verificar que stats cambian correctamente.

---

## 🏁 Sprint 3 — Items y rareza

**Objetivo:** Sistema completo de items, inventario y equipamiento.

**Tareas:**
1. Implementar tipo `Item` y subtipos (`05_ITEMS_AND_RARITY.md`).
2. Implementar `ItemGenerator` (procedural con rareza).
3. Implementar los 20 items base del MVP.
4. Implementar los 4 conjuntos y sus bonus.
5. Implementar `Inventory` (mochila de 30 slots + 10 slots equipados).
6. Implementar lógica de equipar/desequipar (drag&drop + click derecho).
7. Implementar pool de Unique Effects de Épicos/Legendarios.
8. **Tests** para generación de items en cada rareza.

**Criterio de aceptación:** generar 100 items de rareza aleatoria, verificar que son únicos y que sus stats están en rangos correctos. Equipar/desequipar funcional.

---

## 🏁 Sprint 4 — Generación de mazmorras

**Objetivo:** Pisos generados proceduralmente con salas conectadas.

**Tareas:**
1. Implementar `Dungeon`, `Floor`, `Room` (`07_DUNGEONS_AND_ROOMS.md`).
2. Implementar `RoomGenerator` (geometría 3D procedural de salas).
3. Implementar `DungeonGraph` (conexiones entre salas).
4. Implementar puertas y transiciones suaves entre salas.
5. Implementar el bioma "Cripta de Piedra" (texturas, decoración básica).
6. Implementar interactuables genéricos (cofre, palanca, fuente, hoguera).
7. Iluminación del bioma.

**Criterio de aceptación:** generar un piso con 4-10 salas conectadas, poder navegar entre todas ellas y volver. La iluminación es agradable y consistente.

---

## 🏁 Sprint 5 — Combate por turnos

**Objetivo:** Combate completo y funcional.

**Tareas:**
1. Implementar `CombatManager`, `TurnSystem`, `CombatScene` (`06_COMBAT_SYSTEM.md`).
2. Implementar transición animada entre exploración y combate.
3. Detección de "ataque por sorpresa" basado en vectores de movimiento.
4. Implementar las 6 acciones de combate (atacar, habilidad, objeto, inspeccionar, entorno, huir).
5. Implementar `DamageFormula` y `EscapeFormula`.
6. Implementar 10 estados alterados.
7. Implementar IA básica de enemigos.
8. Animaciones mínimas (attack, hurt, death) + números volando.
9. **Tests** para fórmulas de combate.

**Criterio de aceptación:** entrar en combate, hacer turnos, ganar/perder/huir. Los números de daño son correctos. La sorpresa funciona.

---

## 🏁 Sprint 6 — Enemigos

**Objetivo:** Los 10 enemigos del MVP integrados con el combate.

**Tareas:**
1. Implementar `Enemy`, `EnemyAI`, `EnemyFactory` (`09_ENEMIES_ROSTER.md`).
2. Crear los 10 enemigos como archivos individuales.
3. Generar modelos placeholder (primitivas Babylon hasta tener arte) — cápsulas con colores y formas distintivas.
4. Implementar habilidades especiales de cada enemigo.
5. Implementar el sistema de respawn cíclico.
6. Integrar con `RoomGenerator` (spawn según tier).

**Criterio de aceptación:** generar combates con 1-3 enemigos del roster, ver que cada uno se comporta distinto.

---

## 🏁 Sprint 7 — Eventos aleatorios

**Objetivo:** Los 10 eventos del MVP funcionando.

**Tareas:**
1. Implementar `EventManager`, `RandomEvent` (`08_EVENTS_CATALOG.md`).
2. Implementar los 10 eventos como archivos en `catalog/`.
3. Sistema de pesos y selección procedural.
4. Modal de UI para presentar eventos con decisiones múltiples.
5. Integrar con `RoomGenerator` (algunas salas son de evento).

**Criterio de aceptación:** explorar 10 salas, encontrar al menos 5-7 eventos distintos, todos resolviéndose correctamente.

---

## 🏁 Sprint 8 — UI / HUD

**Objetivo:** UI completa y pulida estilo POE.

**Tareas:**
1. Implementar HUD de exploración (HP/MP, oro, piso, minimapa) (`10_UI_UX.md`).
2. Implementar inventario con animación de despliegue.
3. Tooltips estilo POE con todos los detalles.
4. Modal de subida de nivel.
5. Modal de eventos narrativos.
6. Pantalla de menú principal.
7. Selector de pisos (Slay the Spire) — visualmente listo aunque solo haya 1 piso.
8. Pantalla de muerte / fin de run.
9. Selector de idioma + estructura i18n con ES y EN.

**Criterio de aceptación:** todo el flow del juego se puede navegar con UI agradable, sin elementos placeholder feos.

---

## 🏁 Sprint 9 — Persistencia y polish

**Objetivo:** Save/load robusto + bugs corregidos + balance ajustado.

**Tareas:**
1. Implementar `SaveManager`, `SaveSchema`, hash integridad (`11_PERSISTENCE_AND_SECURITY.md`).
2. Implementar auto-save en triggers definidos.
3. Bug fixing general.
4. Ajuste de balance (testing del MVP completo, varias runs).
5. Optimización de rendimiento (objetivo 60 FPS estables).
6. Headers CSP estrictos en Netlify.

**Criterio de aceptación:** una run se puede empezar, cerrar el navegador, abrir mañana y seguir donde estaba. 60 FPS en hardware modesto.

---

## 🏁 Sprint 10 — Testing y prelanzamiento

**Objetivo:** MVP **completo, jugable y publicable**.

**Tareas:**
1. Test exhaustivo del MVP completo de principio a fin.
2. Probar las 5 clases hasta nivel ~10.
3. Probar todas las combinaciones críticas (build mago, build tank, build neutro experimental, etc.).
4. Limar cualquier rough edge de UX.
5. README público del repo bonito.
6. Página de Netlify con dominio agradable.
7. Compartir con amigos beta-testers para feedback.

**Criterio de aceptación:** ✅ MVP v0.1 oficialmente lanzado.

---

## 🎯 Post-MVP

### v0.2 — Metaprogresión y jefes

- Sistema de ecos al morir
- Tienda meta básica (Starting Boosts + Multipliers)
- Jefe del piso 5
- Más salas de combate variadas

### v0.3 — Audio y contenido

- Música original (o licenciada Creative Commons inicialmente)
- SFX de combate y exploración
- Más eventos (llegar a 30)
- Más items (llegar a 40)
- Más enemigos (llegar a 20)
- Logros básicos

### v0.4 — Profundidad

- Pisos 6-25 con sus biomas
- Jefes de los pisos 10, 15, 20, 25
- Build Definers en la tienda meta
- Historial de runs en menú principal
- Mascotas implementadas

### v0.5 — Beta abierta

- Backend Supabase con cuentas
- Sincronización de meta y runs
- Leaderboards

### v1.0 — Lanzamiento

- Piso 50 y jefe final con narrativa
- Modo infinito tras vencer al jefe final
- Múltiples idiomas (al menos 5)
- Cosméticos comprables
- Marketing y release

---

## 📋 Reglas operativas durante el desarrollo

1. **Un sprint a la vez.** No empezar el siguiente hasta cerrar el anterior.
2. **Commits frecuentes** con mensajes claros. Nada de "wip" o "fix".
3. **Revisión de código** después de cada sprint (incluso solo tú leyéndolo).
4. **Tests para lo crítico.** No tests para UI o cosas visuales (a no ser que se busquen regresiones específicas).
5. **No optimización prematura.** Hacer que funcione, después optimizar si hace falta.
6. **Si hay duda → consulta los .md.** Si los .md no responden → preguntar a Claude antes de improvisar.
7. **Cuidado con el scope creep.** Si surge una idea nueva, anótala para v0.2+. No la metas en el MVP.

## 🧭 Cómo trabajar con Claude por sprint

Recomendación de prompt al iniciar cada sprint:

```
Estoy en el Sprint X de mi proyecto Abyss Below. Hemos completado los sprints 0 a [X-1]. 
He cargado los archivos .md del proyecto en el contexto.

Antes de empezar, lee los siguientes archivos relevantes para este sprint:
- 02_PROJECT_STRUCTURE.md
- [los .md específicos de este sprint]

Luego, propón:
1. Un plan detallado de implementación
2. Qué archivos vas a crear/modificar
3. En qué orden
4. Qué tests vas a añadir

Espera mi aprobación antes de escribir código.
```

Este patrón evita que Claude (o tú) se lance a programar sin entender bien el alcance.

## 🎁 Hitos para celebrar

- **🎉 Hito 1:** Cubo girando en Netlify.
- **🎉 Hito 2:** Personaje navegando libremente en 3D.
- **🎉 Hito 3:** Primer combate ganado.
- **🎉 Hito 4:** Primera muerte por culpa de un enemigo de tu propio juego.
- **🎉 Hito 5:** MVP v0.1 jugable de principio a fin.
- **🎉 Hito 6:** Tu primer beta tester completa el MVP y te da feedback.
- **🎉 Hito 7:** Primer 100€ generado.
