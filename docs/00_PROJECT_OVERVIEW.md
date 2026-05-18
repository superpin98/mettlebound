# 00 — Visión General del Proyecto

## 🎮 Nombre provisional
**Abyss Below** *(cambiar en producción si no convence)*

## 🎯 Concepto en una frase
Un roguelite 3D low poly de exploración de mazmorras procedurales con combate por turnos, builds altamente personalizables y muerte permanente con metaprogresión.

## 🎯 Pitch extendido

El jugador es un aventurero (de una de 5 clases) que desciende por una mazmorra de profundidad infinita. Cada piso se genera proceduralmente y contiene entre 4 y 10 salas. El jugador navega libremente con WASD en 3D, encuentra enemigos que disparan combates por turnos en una sala dedicada con vista isométrica, recoge equipo con stats aleatorios y rareza variable, sube de nivel, y construye builds experimentales combinando 4 stats (Fuerza, Destreza, Inteligencia, Suerte) con piezas de equipamiento.

Al morir, la run termina permanentemente. El jugador recibe una **divisa permanente** proporcional a lo lejos que llegó, que gasta en el menú principal en mejoras permanentes que afectan a futuras runs.

Hay un **jefe cada 5 pisos** y un **jefe final en el piso 50** con una pequeña historia narrativa (un guardia corrompido buscando a su mujer perdida).

Tras vencer al jefe del piso 50 se desbloquea el **modo infinito** con escalado exponencial de dificultad.

## 🎨 Referencias de estilo

- **Visual:** Path of Exile (UI), Hades (paleta dark fantasy con buena iluminación), juegos low poly como *A Short Hike* o *Bonfire Peaks* para el estilo de assets.
- **Mecánicas:** Slay the Spire (selección de pisos), Diablo / PoE (sistema de items y rareza), Darkest Dungeon (combate por turnos en sala dedicada).
- **Modelo de negocio:** IdleON (free-to-play con packs cosméticos o de quality-of-life, **nunca pay-to-win**).

## 🎯 Géneros

- Roguelite (loop principal)
- Dungeon crawler (exploración 3D)
- RPG por turnos (combate)
- ARPG ligero (items y builds)

## 👥 Audiencia objetivo

- Jugadores casuales que disfrutan farmeo y dopamina rápida
- Jugadores hardcore que quieren optimizar builds y bajar lo más posible
- Ambos perfiles deben ser viables — el juego no fuerza el "downward grind" pero tampoco castiga al que se queda farmeando pisos bajos

## 🎯 Alcance MVP v0.1 (objetivo inmediato)

**Lo que SÍ entra en el MVP:**

- ✅ 5 clases jugables (Guerrero, Cazador, Mago, Pícaro, Errante neutro)
- ✅ 1 piso completo navegable en 3D
- ✅ 4-10 salas procedurales por piso
- ✅ 10 tipos de enemigos
- ✅ 10 eventos aleatorios (1-2 por categoría)
- ✅ Sistema de combate por turnos funcional
- ✅ Mecánica de ataque por sorpresa (2 turnos seguidos)
- ✅ Ataque básico + 1 habilidad activa + huir + inspeccionar entorno + usar objeto
- ✅ 4 conjuntos × 4 piezas = 16 items
- ✅ 4 armas iniciales (una por clase no-neutra)
- ✅ Sistema de rareza (5 niveles)
- ✅ Stats aleatorios en items
- ✅ Efectos únicos en Épicos+
- ✅ 1 sala de combate fija (luego se variará)
- ✅ Persistencia en localStorage
- ✅ Selector de idioma (preparado, mínimo ES + EN)
- ✅ Movimiento WASD + cámara orbital
- ✅ Inventario con drag-and-drop o click derecho para equipar
- ✅ Subida de nivel: asignar puntos + elegir 1 de 3 mejoras

**Lo que NO entra en MVP v0.1 (post-MVP):**

- ❌ Metaprogresión y divisa permanente *(v0.2)*
- ❌ Jefes de piso y jefe final *(v0.2)*
- ❌ Audio y música *(v0.3)*
- ❌ Múltiples salas de combate variadas según piso *(v0.2)*
- ❌ Backend con cuentas de usuario *(v1.0)*
- ❌ Sistema completo de 100+ eventos *(se va ampliando)*
- ❌ Historial de runs *(v0.2)*
- ❌ Mascotas (slot existe, contenido viene en v0.2)*

## ✅ Criterio de "MVP completado"

El MVP estará terminado cuando:

1. Se pueda completar una run desde el menú principal hasta morir.
2. Las 5 clases jueguen distinto unas de otras.
3. Los 10 eventos funcionen sin bugs.
4. El combate sea claro, divertido, con feedback visual decente.
5. El save persista correctamente entre sesiones.
6. El juego corra a 60 FPS estables en un portátil medio.
7. La estética sea coherente y "publicable" — no un prototipo feo.
