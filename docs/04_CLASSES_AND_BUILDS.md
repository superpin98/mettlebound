# 04 — Clases, Conjuntos y Builds

## 🎭 Filosofía de las clases

**Principio rector:** Una clase NO te encasilla en un arquetipo. Te da unos stats iniciales temáticos y un arma de inicio, pero el jugador es libre de evolucionar como quiera. Un Guerrero leído puede convertirse en mago oscuro a base de items y elecciones de mejora; un Mago puede entrenar fuerza y darle martillazos a todo. Las clases son **puntos de partida con sabor**, no jaulas.

## 🛡️ Las 5 Clases del MVP

### 1. ⚔️ Guerrero — *El Heredero del Hierro*

> "La fuerza no es virtud, pero abre puertas que ninguna otra cosa abre."

**Stats iniciales** (total: 20 puntos repartidos):
- STR: 10
- DEX: 4
- INT: 2
- LCK: 4

**Arma inicial:** *Espada Larga Mellada* (común, daño físico cuerpo a cuerpo)
**Conjunto inicial:** Armadura de Cuero (común, conjunto "Cuero Curtido")
**Habilidad inicial:** *Embate Brutal* — coste 10 MP — daño físico ×1.8

**Sabor mecánico:**
- Más HP de base que el resto.
- Habilidad de tanque sin ser tanque puro.
- Le sobra MP normalmente, pero algunas builds le permiten convertirlo en rabia o daño.

---

### 2. 🏹 Cazador — *El Ojo Lejano*

> "El primer disparo decide la batalla. Apunta bien."

**Stats iniciales:**
- STR: 4
- DEX: 10
- INT: 3
- LCK: 3

**Arma inicial:** *Arco Corto del Bosque* (común, daño a distancia)
**Conjunto inicial:** Vestido de Cazador (común, conjunto "Cuero Curtido")
**Habilidad inicial:** *Disparo Certero* — coste 8 MP — daño a distancia ×1.5 + ignora 30% evasión

**Sabor mecánico:**
- Alta velocidad de turno → suele actuar primero → propensión al "ataque por sorpresa".
- Alta evasión.
- Daño consistente, no explosivo, salvo con builds de crítico apoyadas en suerte.

---

### 3. 🔮 Mago — *El Lector del Abismo*

> "El conocimiento es una llama. La sostengo con cuidado, porque también arde."

**Stats iniciales:**
- STR: 3
- DEX: 3
- INT: 10
- LCK: 4

**Arma inicial:** *Báculo de Aprendiz* (común, daño mágico)
**Conjunto inicial:** Túnica de Lino (común, conjunto "Hilo del Erudito")
**Habilidad inicial:** *Misil Arcano* — coste 12 MP — daño mágico ×1.8

**Sabor mecánico:**
- **ÚNICA clase con regen de MP en combate** (basado en INT).
- HP bajo, vulnerable cuerpo a cuerpo.
- Las builds creativas pueden hacerlo un *Battle Mage* combinando armaduras pesadas con báculo, pero pierde regen de maná en combate al cambiar de clase mecánica si lleva equipo pesado (esto es un *trade-off* implementado en items).

---

### 4. 🗡️ Pícaro — *La Sombra Calculadora*

> "No corro más rápido que tú. Solo aparezco después."

**Stats iniciales:**
- STR: 4
- DEX: 7
- INT: 3
- LCK: 6

**Arma inicial:** *Daga Curva* (común, daño físico rápido)
**Conjunto inicial:** Ropas Oscuras (común, conjunto "Cuero Curtido")
**Habilidad inicial:** *Apuñalada Vil* — coste 6 MP — daño físico ×1.4, +25% crit chance este turno

**Sabor mecánico:**
- Cantidad de crítico desproporcionada por sus stats iniciales.
- Buena suerte → mejor loot.
- Velocidad alta → muchos sorpresas.
- Frágil pero rápido.

---

### 5. 🌫️ Errante — *El Sin Camino*

> "No vine aquí a ser nadie en concreto. Vine a averiguar quién soy abajo."

**Stats iniciales:**
- STR: 3
- DEX: 3
- INT: 3
- LCK: 3
- **+8 puntos extra para distribuir libremente al crear personaje**

**Arma inicial:** *Ninguna* (lucha con puños = daño físico ×0.5)
**Conjunto inicial:** Harapos (común, sin conjunto)
**Habilidad inicial:** *Improvisar* — coste 5 MP — daño físico/distancia/mágico ×1.3 (toma el stat más alto del jugador)

**Sabor mecánico:**
- Empieza débil pero adaptable.
- La clase "experimental" para builds verdaderamente raras.
- Sin conjunto inicial = más rapido encajar piezas de cualquier conjunto.
- Recompensa a los jugadores creativos.

---

## 🎒 Los 4 Conjuntos del MVP

Cada conjunto tiene **4 piezas:** Casco / Armadura / Pantalones / Guantes.

Llevar las 4 piezas activa un **bonus de conjunto** distintivo (no aporta el bonus llevar 2 o 3 piezas, solo el set completo — esto fuerza decisiones interesantes).

> **Nota:** los items individuales del conjunto pueden tener stats aleatorios y rarezas variables. Lo que da el bonus de set es llevar las 4 piezas del MISMO conjunto, independientemente de su rareza individual.

### 🟫 1. Cuero Curtido — *"El Curtido"*

**Concepto:** Conjunto de cuero versátil, perfecto para guerreros, cazadores y pícaros iniciales.

| Pieza | Stat base destacado |
|-------|---------------------|
| Casco | +STR, +DEX |
| Armadura | +HP, +DEX |
| Pantalones | +Velocidad de turno, +Evasión |
| Guantes | +DEX, +Crit chance |

**Bonus de conjunto (4 piezas):** *Cazador Curtido* — Tus ataques físicos y a distancia tienen +15% de daño cuando estás por encima del 50% HP.

---

### 🟪 2. Hilo del Erudito — *"El Erudito"*

**Concepto:** Vestiduras tejidas con hilo encantado. El conjunto del mago, pero con detalles que permiten builds híbridas.

| Pieza | Stat base destacado |
|-------|---------------------|
| Casco | +INT, +MP |
| Armadura | +MP, +Resistencia mágica |
| Pantalones | +INT, +Regen MP fuera de combate |
| Guantes | +INT, +% daño mágico |

**Bonus de conjunto (4 piezas):** *Saber Antiguo* — Tus hechizos cuestan 15% menos MP. Cada vez que recibes daño mágico, recuperas 5 MP.

---

### 🟥 3. Acero del Verdugo — *"El Verdugo"*

**Concepto:** Armadura pesada y agresiva. Para builds de daño masivo y supervivencia.

| Pieza | Stat base destacado |
|-------|---------------------|
| Casco | +STR, +HP |
| Armadura | +HP, +Armor |
| Pantalones | +STR, +Resistencia física |
| Guantes | +STR, +Daño físico flat |

**Bonus de conjunto (4 piezas):** *Sed de Sangre* — Cuando matas a un enemigo, recuperas el 10% de tu HP máximo y tu siguiente ataque hace +30% daño.

---

### 🟦 4. Velo del Vacío — *"El Velo"*

**Concepto:** Conjunto extraño, pulsante con energía oscura. Mezcla magia y agilidad. Para builds raras.

| Pieza | Stat base destacado |
|-------|---------------------|
| Casco | +INT, +LCK |
| Armadura | +HP, +MP, +Evasión |
| Pantalones | +DEX, +INT |
| Guantes | +LCK, +Crit damage |

**Bonus de conjunto (4 piezas):** *Resonancia del Vacío* — Tus críticos tienen un 25% de probabilidad de causar daño verdadero adicional igual al 50% del daño base. Además, cada turno en combate tienes un 10% de generar 5 MP de la nada.

---

## 📈 Sistema de mejoras al subir nivel

Al subir de nivel:
1. **Asignar 3 puntos** entre los 4 stats (1+1+1 / 2+1 / 3 todos a uno).
2. **Elegir 1 de 3 mejoras aleatorias** del Upgrade Pool.

### Rareza de las mejoras

| Rareza | Probabilidad base | Cada 5 niveles |
|--------|-------------------|----------------|
| Común | 60% | una garantía de Raro+ |
| Poco común | 25% | |
| Raro | 12% | |
| Épico | 2.5% | |
| Legendario | 0.5% | |

La suerte del jugador (LCK stat) modifica ligeramente estas probabilidades.

### Categorías de mejoras (Upgrade Pool inicial)

#### 🟫 Mejoras COMUNES (las "vainilla")
- `+5% daño físico`
- `+5% daño mágico`
- `+5% daño a distancia`
- `+10 HP máximo`
- `+5 MP máximo`
- `+2% crit chance`
- `+3% evasión`
- `+5% gold drop`

#### 🟩 Mejoras POCO COMUNES (toques de sabor)
- `Tus ataques físicos curan 2% del daño infligido como HP`
- `Cuando esquivas, tu siguiente ataque hace +20% daño`
- `+1 punto de stat extra por subida de nivel (acumulable)`
- `Recibes 10% menos daño mágico`
- `Tus críticos roban 5 MP al enemigo`
- `+15% rareza en drops durante 3 pisos`

#### 🟦 Mejoras RARAS (cambian estilo de juego)
- `Tus pociones tienen 50% de no consumirse al usarlas`
- `El primer enemigo que mates en cada sala suelta el doble de oro`
- `Cuando bajas a menos de 30% HP, ganas +30% daño y +20% velocidad`
- `Tus habilidades activas tienen 20% de probabilidad de no consumir MP`
- `Generas 1 cargo de [Furia/Foco/Caos/Suerte] cada turno; al llegar a 5, tu siguiente acción es gratuita o crítica`
- `Inspeccionar el entorno ya no consume turno`
- `Convierte el 20% de tu Suerte en Crítico`

#### 🟪 Mejoras ÉPICAS (sinergias build-defining)
- `Cada 3 turnos en combate, lanzas automáticamente tu habilidad activa gratis`
- `Tus ataques mágicos rebotan a un enemigo cercano con 50% del daño`
- `Cuando un enemigo te golpea, ganas un escudo igual al 50% del daño bloqueado durante 1 turno`
- `Tus críticos aplican Sangrado: 10% del daño durante 3 turnos`
- `Cuando matas a un enemigo crítico, repites el turno`
- `Las elecciones de subida de nivel siempre muestran al menos 1 mejora Rara`
- `Tu mascota gana +50% de stats`
- `Tus interacciones con el entorno hacen 50% más daño`

#### 🟧 Mejoras LEGENDARIAS (build-changing brutal)
- `**Pacto Sangriento**: Tu HP máximo se reduce a la mitad, pero todo tu daño se duplica.`
- `**Eco Arcano**: Cada vez que lanzas una habilidad, hay un 30% de que se lance otra vez automáticamente sin coste.`
- `**Suerte del Diablo**: Tus drops son al menos Raros. Pero pierdes 1 vida (mueres) si tu HP llega a 0 dos veces seguidas en el mismo piso.`
- `**Tormenta de Acero**: Tus ataques cuerpo a cuerpo golpean también a todos los enemigos adyacentes al objetivo con 60% del daño.`
- `**Compañero Oscuro**: Invocas un fantasma que ataca por ti con el 70% de tus stats. Si muere, no se invoca de nuevo hasta el siguiente piso.`
- `**Sed de Conocimiento**: Cada enemigo derrotado en combate te da 1 punto de INT permanente para esta run.`
- `**Beneficio Compuesto**: Cada vez que ganas oro, hay un 5% de obtener el doble. Cada vez que se activa, la probabilidad sube en 1%.`

> **Importante:** estas listas son **pools de partida**. Claude Code debe diseñar los archivos de mejoras de forma que añadir nuevas sea trivial (un objeto en un array, sin tocar lógica).

## 🎯 Ejemplos de builds objetivo (para validar diseño)

Para asegurar que el sistema permite variedad, el diseño debe soportar al menos estas 5 builds funcionales:

1. **Mage Tank** — Mago con conjunto Acero del Verdugo, escala INT pero tiene mucho HP. Combina hechizos con cuerpo a cuerpo.
2. **Hunter Crit** — Cazador puro suerte/destreza con Velo del Vacío. Críticos masivos.
3. **Berserker Sangrante** — Guerrero con Acero del Verdugo + mejoras de sangrado. Sed de Sangre + Pacto Sangriento.
4. **Pícaro Arcano** — Pícaro que invierte casi todo en INT y usa daga + báculo en builds que escalan magia con velocidad.
5. **Errante Híbrido** — Reparte stats equilibrados, intercambia piezas de los 4 conjuntos según situación, sin ningún bonus de conjunto activo. Compensa con mejoras versátiles.

## 🐾 Mascotas (slot existe en MVP, contenido en v0.2)

El slot está disponible. En MVP el slot está vacío y el HUD muestra "Sin mascota". En v0.2 se diseñará el sistema completo de mascotas.
