# 📚 Documentación del Proyecto — Abyss Below

> Roguelite 3D low poly de mazmorras procedurales para navegador.
> Stack: TypeScript + Vite + Babylon.js. Hosting: Netlify.

---

## 📋 Índice de documentos

Lee los documentos **en este orden** la primera vez que abras el proyecto:

| # | Documento | Para qué sirve |
|---|-----------|----------------|
| **1** | `00_PROJECT_OVERVIEW.md` | Visión general del juego, géneros, referencias, alcance del MVP |
| **2** | `01_TECH_STACK.md` | Tecnologías exactas, versiones, justificaciones, comandos de setup |
| **3** | `02_PROJECT_STRUCTURE.md` | Estructura de carpetas y archivos, convenciones de naming |
| **4** | `03_GAME_DESIGN.md` | Diseño de mecánicas: stats, combate, progresión, daño, fórmulas |
| **5** | `04_CLASSES_AND_BUILDS.md` | Las 5 clases, conjuntos, builds, sistema de equipamiento |
| **6** | `05_ITEMS_AND_RARITY.md` | Sistema de objetos, rarezas, generación procedural, efectos únicos |
| **7** | `06_COMBAT_SYSTEM.md` | Combate por turnos detallado, fórmulas, interactividad, huida |
| **8** | `07_DUNGEONS_AND_ROOMS.md` | Generación procedural de mazmorras, salas, interactividad |
| **9** | `08_EVENTS_CATALOG.md` | Categorías de eventos y los 10 eventos del MVP |
| **10** | `09_ENEMIES_ROSTER.md` | Los 10 enemigos del MVP, comportamientos, drops |
| **11** | `10_UI_UX.md` | Estilo visual (POE-inspired), HUD, menús, transiciones |
| **12** | `11_PERSISTENCE_AND_SECURITY.md` | Save game, localStorage, plan de migración a Supabase, seguridad |
| **13** | `12_METAPROGRESSION.md` | Roadmap de metaprogresión post-MVP |
| **14** | `13_ROADMAP.md` | Sprints y fases del desarrollo, MVP → v1.0 |
| **15** | `14_CODING_CONVENTIONS.md` | Convenciones de código, patrones, TypeScript strict, ESLint |

---

## 🚀 Cómo usar esta documentación con Cowork

### Recomendación para meterla en el proyecto

**Opción A (recomendada):** Súbelos todos al proyecto de Cowork como una carpeta `docs/`. Cowork los indexará y los podrás referenciar individualmente cuando le pidas a Claude que trabaje en cada sistema.

**Opción B:** Súbelos como contexto del proyecto (instrucciones permanentes). Útil si quieres que Claude tenga TODO el contexto siempre cargado, pero ocupa más tokens.

### Workflow sugerido

1. Empieza pidiendo el **setup del proyecto** (basado en `01_TECH_STACK.md` y `02_PROJECT_STRUCTURE.md`).
2. Una vez tengas el `package.json`, la estructura de carpetas y Babylon.js renderizando un cubo, ataca los sistemas en este orden:
   - **Sprint 1:** Cámara + movimiento WASD del personaje (lo que ya hicimos)
   - **Sprint 2:** Sistema de stats y clases (`03`, `04`)
   - **Sprint 3:** Sistema de items y rarezas (`05`)
   - **Sprint 4:** Generación de mazmorras (`07`)
   - **Sprint 5:** Combate por turnos (`06`)
   - **Sprint 6:** Eventos aleatorios (`08`)
   - **Sprint 7:** Enemigos (`09`)
   - **Sprint 8:** UI/HUD (`10`)
   - **Sprint 9:** Persistencia (`11`)
   - **Sprint 10:** Pulido y testing

3. Cada sprint pídele a Claude que lea el `.md` correspondiente y te genere el código de ese sistema.

---

## ⚠️ Reglas de oro al desarrollar

1. **Nunca permitas que Claude meta toda la lógica en un solo archivo.** Si lo intenta, recházalo y exige modularización.
2. **TypeScript strict siempre.** Sin `any` salvo casos excepcionales documentados.
3. **Cada sistema tiene su carpeta y sus tests** (aunque sean mínimos al principio).
4. **Commit por sistema funcional.** No mezcles sprints.
5. **Antes de cualquier cambio grande, pídele a Claude que te explique el plan.** No lo dejes "ir a saco".
