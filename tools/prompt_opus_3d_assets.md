# Contexto para Claude Web (Opus) — Pipeline 3D Assets Mettlebound

Pega este bloque completo en una nueva conversación con Claude Web (Opus) como contexto de proyecto.

---

## El proyecto

**METTLEBOUND** es un roguelite 3D low-poly de mazmorras procedurales para navegador, construido con **Vite + TypeScript + Babylon.js**, hospedado en Netlify.

El jugador elige una de 5 clases, desciende por una mazmorra de profundidad infinita generada proceduralmente, lucha por turnos contra enemigos, recoge equipo con stats aleatorios y construye builds experimentales. Al morir, la run termina. Hay metaprogresión ligera entre runs.

**Estado actual del proyecto (Sprint 3.5):** el juego arranca y muestra personajes 3D en una sala de prueba usando modelos placeholder del pack **KayKit Adventurers** (modelos .glb low-poly genéricos). El siguiente paso importante, aparte de continuar con la lógica de juego, es reemplazar estos placeholders con assets propios de Mettlebound.

---

## Estilo visual objetivo

- **3D low-poly** — geometría angular, pocos polígonos, sin suavizado de normales innecesario
- Referencias: *A Short Hike*, *Bonfire Peaks*, *Hades* (paleta dark fantasy con buena iluminación)
- Paleta: **grimdark** — oscuro, tierras, rojos profundos, azules nocturnos, detalles dorados o pulsantes para elementos mágicos
- Los personajes son pequeños en pantalla (mazmorra 3D con cámara orbital), así que la silueta y los colores valen más que el detalle fino
- **Límite de triángulos aceptado: 15.000 tris por modelo** (nunca habrá más de ~5 entidades simultáneas en pantalla)
- **Formato de entrega: .glb** (formato nativo de Babylon.js)

---

## Pipeline de assets 3D (workflow validado)

Este es el flujo que seguimos para crear todos los personajes y criaturas del juego:

### Paso 1 — Imágenes de referencia (Copilot Image Creator / DALL-E 3)
Generamos 4 vistas ortogonales del personaje: **frente, espalda, izquierda, derecha**.
Las 4 vistas en una sola imagen o en imágenes separadas, fondo neutro (blanco o gris liso), misma escala en todas las vistas.
Esto es la entrada para Meshy.

### Paso 2 — Generación del modelo 3D (Meshy Premium)
Usamos **Meshy** (meshy.ai, suscripción premium) con la función **Image to 3D**:
- Subimos las 4 vistas de referencia
- Meshy genera el modelo 3D + auto-rig del esqueleto + presets de animación básicos
- Exportamos en **.fbx** (preserva el esqueleto editable)

Los presets de animación de Meshy cubren Idle, Walk, Run, Attack. Son el punto de partida.

### Paso 3 — Refinamiento en Blender (con Claude + Blender MCP oficial)
Importamos el .fbx a **Blender 4.x**.
Claude tiene acceso a Blender vía el **MCP oficial de Anthropic para Blender** (lanzado en abril 2026), que expone la API completa de Python (bpy) como herramientas MCP. Claude puede:
- Ajustar texturas y materiales directamente
- Afinar animaciones o añadir nuevas (keyframes, constraints)
- Corregir el rig si Meshy lo ha generado mal
- Optimizar geometría (decimation, limpieza de mallas)
- Exportar como .glb con las configuraciones correctas para Babylon.js

### Paso 4 — Integración en Babylon.js
El .glb resultante se carga con `SceneLoader.ImportMesh` de Babylon.js. Las animaciones se reproducen con `AnimationGroup`. El personaje del jugador ya tiene este sistema funcionando con los KayKit placeholders.

---

## Las 5 clases jugables

### 1. ⚔️ Guerrero — *El Heredero del Hierro*
> "La fuerza no es virtud, pero abre puertas que ninguna otra cosa abre."

**Stats:** STR 10 / DEX 4 / INT 2 / LCK 4
**Arma inicial:** Espada Larga Mellada
**Armadura inicial:** Armadura de Cuero Curtido
**Habilidad:** *Embate Brutal* — daño físico ×1.8
**Arquetipo visual:** guerrero medieval clásico pero oscuro, sucio, sin gloria — hierro mellado, capa raída, cicatrices visibles

---

### 2. 🏹 Cazador — *El Ojo Lejano*
> "El primer disparo decide la batalla. Apunta bien."

**Stats:** STR 4 / DEX 10 / INT 3 / LCK 3
**Arma inicial:** Arco Corto del Bosque
**Armadura inicial:** Vestido de Cazador (Cuero Curtido)
**Habilidad:** *Disparo Certero* — daño a distancia ×1.5 + ignora 30% evasión
**Arquetipo visual:** cazador/rastreador de bosque, ligero, funcional — cuero ajustado, capucha, carcaj al hombro, mirada fría

---

### 3. 🔮 Mago — *El Lector del Abismo*
> "El conocimiento es una llama. La sostengo con cuidado, porque también arde."

**Stats:** STR 3 / DEX 3 / INT 10 / LCK 4
**Arma inicial:** Báculo de Aprendiz
**Armadura inicial:** Túnica de Lino (Hilo del Erudito)
**Habilidad:** *Misil Arcano* — daño mágico ×1.8
**Arquetipo visual:** mago estudioso con toque oscuro — túnica sencilla con runas sutiles, báculo con orbe apagado, físico delgado, expresión de concentración intensa

---

### 4. 🗡️ Pícaro — *La Sombra Calculadora*
> "No corro más rápido que tú. Solo aparezco después."

**Stats:** STR 4 / DEX 7 / INT 3 / LCK 6
**Arma inicial:** Daga Curva
**Armadura inicial:** Ropas Oscuras (Cuero Curtido)
**Habilidad:** *Apuñalada Vil* — daño físico ×1.4 + 25% crit chance
**Arquetipo visual:** asesino urbano pragmático — ropas oscuras ajustadas, capucha echada, múltiples dagas visibles, postura encorvada lista para moverse

---

### 5. 🌫️ Errante — *El Sin Camino*
> "No vine aquí a ser nadie en concreto. Vine a averiguar quién soy abajo."

**Stats:** STR 3 / DEX 3 / INT 3 / LCK 3 + 8 puntos libres
**Arma inicial:** Ninguna (combate a puños)
**Armadura inicial:** Harapos
**Habilidad:** *Improvisar* — daño ×1.3 escalado al stat más alto
**Arquetipo visual:** viajero indefinido y misterioso — ropa mezclada de otras clases, raída, sin identidad clara — la clase "blank slate" que visualmente tampoco tiene arquetipo fijo

---

## Tu tarea inmediata

Queremos probar el pipeline completo empezando por **uno de los 5 personajes**.

**Lo que necesito de ti:**

1. **Recomiéndame qué clase empezar primero** considerando qué arquetipo visual es más fácil de hacer funcionar bien en Meshy con 4 vistas de referencia (silueta clara, elementos únicos reconocibles, no demasiada complejidad de ropa/pelo).

2. **Genera el prompt exacto** para crear las 4 vistas de referencia en Copilot Image Creator (o cualquier generador de imágenes) para la clase que elijas. El prompt debe especificar:
   - Las 4 vistas (front, back, left, right) en la misma imagen o en 4 imágenes separadas
   - Fondo gris neutro liso (para que Meshy aísle bien el personaje)
   - Estilo low-poly dark fantasy consistente con la paleta de Mettlebound
   - La proporción correcta para un personaje de juego (no foto-realista, no super-deformado)
   - Detalles de equipamiento según la clase elegida

3. **Una vez que yo tenga las imágenes de referencia**, me guiarás paso a paso en Meshy para obtener el mejor resultado posible (configuración de la generación, qué ajustar si el modelo sale mal, cuándo vale la pena reintentar vs continuar a Blender).

---

## Restricciones y notas técnicas

- El juego corre en navegador: **rendimiento es crítico**. Nada de detalles que no se vean en pantalla.
- Los personajes tienen unos 1-2 metros de alto en el espacio 3D de la mazmorra y la cámara es orbital — no hay close-ups frecuentes.
- El skeleton debe ser compatible con el sistema de animación de Babylon.js (humanoid rig estándar).
- Babylon.js carga .glb nativamente con `SceneLoader.ImportMesh`. Las animaciones van en `AnimationGroup`.
- Actualmente el juego usa KayKit Adventurers como placeholder: los modelos son aprox. 1.5m de alto, rig humanoid simple, animaciones Idle + Walking_A. Los assets propios deben ser dimensionalmente similares para encajar en el sistema existente.
- No introducir dependencias nuevas en el proyecto sin aprobar primero.
