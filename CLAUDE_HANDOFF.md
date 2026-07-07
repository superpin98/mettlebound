# CLAUDE HANDOFF — Mettlebound

> \*\*Propósito\*\*: Este documento es el savefile del proyecto Mettlebound.
> Cualquier chat nuevo de Claude debe leerlo COMPLETO como primer mensaje
> para recuperar el contexto del proyecto. NO es un README público, es un
> transplante de cerebro entre sesiones de Claude.
>
> \*\*Última actualización\*\*: Julio 2026 (pipeline assets + KnightValidation DEV tool)
> \*\*Última fase cerrada\*\*: Sprint 4-EXT Fase A "World Foundation"
> \*\*Estado repo\*\*: rama `sprint-4-combate`, HEAD `bee070f`, 508 tests verdes
> \*\*Modelo Claude recomendado\*\*: Opus (más contexto + mejor razonamiento arquitectónico)

\---

## 0\. INSTRUCCIONES PARA EL CLAUDE NUEVO

Antes de responder al primer mensaje del usuario (David):

1. **Lee este documento COMPLETO**. No saltes secciones.
2. **NO preguntes cosas que ya están decididas aquí**. Los pilares están cerrados.
3. **Confirma al usuario** que has procesado el handoff. Menciona 2-3 pilares
específicos para probar que lo has leído de verdad (ej: "Systemic Consistency
como pilar 5", "Rusty como skelly marginado", "Corridor con 8 direcciones").
4. **NO empieces a escribir código ni planes de código en tus respuestas**.
Tu rol es ORQUESTAR a Cowork (Claude Desktop). Ver sección 6.
5. **Asume el tono descrito en sección 7**. Castellano informal, tú/colega,
honestidad técnica sobre todo, sin flagelarse.
6. **Si algo en este handoff parece contradecir lo que David te diga en
directo, PREGUNTA antes de asumir**. El handoff puede estar desactualizado
respecto a decisiones muy recientes.

\---

## 1\. IDENTIDAD DEL PROYECTO

### Qué es Mettlebound

**Roguelite 3D low-poly navegador**. Combate por turnos híbrido (exploración
en tiempo real, combate por turnos). Estética dark-fantasy dungeon. Producto
comercial serio, NO laboratorio, NO tech demo.

**Filosofía del proyecto** (frase de David que resume todo):

> \*"Lo que querría jugar y no existe, lo hago yo."\*

### Stack técnico

* **Motor**: Babylon.js 9.7
* **Bundler**: Vite
* **Lenguaje**: TypeScript
* **Tests**: Vitest
* **Físicas**: Havok
* **Assets**: KayKit (Dungeon Remastered + Skeletons + Characters) + Quaternius
como placeholders. Pack premium Synty Polygon está previsto para Sprint 13-16.
* **Repo**: privado, `github.com/superpin98/mettlebound`
* **2 PCs de David**:

  * Curro: `C:\\Users\\dconde\\Desktop\\mettlebound`
  * Casa: `C:\\Users\\Usuario\\Desktop\\mettlebound`
  * Cowork files: `C:\\Users\\dconde\\Documents\\Claude`

### Dos fases del proyecto (pilar, memoria 30)

* **Fase 1** (actual): Babylon MVP + Early Access
* **Fase 2** (futuro): Unity AAA
* JS/Babylon es techo (Fase 1 es padre del proyecto). Assets, configs y saves
DEBEN ser PORTABLES entre fases.
* **Motor de reglas**: MVP usa Capa 1 (declarativo B1/B2/B3/B4).
Fase 2 Unity considerará Capa 2 (properties\[] en vectores + reglas universales
en B5 para emergencia genérica). NO Capa 3 (LLM runtime) ni Capa 4
(Noita pixel sim, imposible en Babylon mesh-based).

### Rol de cada IA en el workflow

* **Claude web (yo)**: ORQUESTADOR. NO escribo código para el repo.
Diseño planes, valido arquitectura, filtro decisiones, paso prompts a Cowork.
* **Cowork (Claude Desktop)**: Escribe código directamente en el repo (tiene
acceso a `C:\\Users\\dconde\\Documents\\Claude`). Edita archivos, ejecuta tests.
Perfil: senior en código, junior en diagnóstico arquitectónico.
* **David**: Product Owner. NO programa. Verifica en PowerShell y navegador.
Hace todos los commits manualmente. Toma decisiones de diseño.

**REGLA CRÍTICA CANÓNICA (memoria 20)**: Claude web NUNCA da a David comandos
PowerShell para crear carpetas del repo, generar archivos con contenido, o
escribir here-docs con código. Eso VA A COWORK. David solo ejecuta:
`git`, `npm test`, `npm run dev`, verificación en navegador, y mover archivos
desde Downloads al repo (porque están en su disco).

Al pasarle prompts, usar: *"TÚ tienes que hacer ESTO"* para acciones manuales
que sí le corresponden a David.

\---

## 2\. PILARES CANÓNICOS DEL DISEÑO (NO REABRIR SIN AVISO EXPLÍCITO)

Estos son los axiomas del proyecto. NO se discuten a menos que David
explícitamente los reabra.

### 2.1 Pilares de identidad del juego (memoria 11)

1. **Todo es interactuable**. Barriles, antorchas, puertas, paredes frágiles,
props diversos. Nada es decorativo puro.
2. **Iluminación como mecánica jugable** (activa a partir de Sprint 8+).
Visión por entidad, accuracy modulado por visibilidad, IA reactiva (enemigos
rompen antorchas), visión nocturna por clase. Referencias: Darkest Dungeon,
BG3, XCOM.
3. **Serio, no laboratorio**. Producto comercial, no tech demo.
4. **"Lo que querría jugar y no existe, lo hago yo"**. Filosofía-guía de David.
5. **Systemic Consistency** (FUNDAMENTAL, pilar añadido en Sprint 4-EXT):
si el jugador planifica una combinación detallada conociendo las mecánicas,
DEBE funcionar como espera. Cero excepciones arbitrarias. Cero RNG oculto
en mecánicas core. Trazabilidad completa post-acción. Reglas declarativas
siempre respetadas. Comparable a BG3 en complejidad declarativa.

### 2.2 Clases del jugador (memoria 12)

Decididas en Sprint 3, NO reabrir:

|Nombre display|Modelo KayKit|Class ID (interno)|Armas iniciales|
|-|-|-|-|
|Guerrero|Knight|`guerrero`|1H\_Sword + Round\_Shield|
|Cazadora|Rogue|`cazador` (masculino int.)|1H\_Crossbow|
|Mago|Mage|`mago`|Spellbook|
|Pícaro|Rogue\_Hooded|`picaro`|Knife + Knife\_Offhand|
|Errante|Barbarian|`errante`|Puños limpios (whitelist vacía `\[]`)|

Notas:

* Cazadora tiene displayName femenino pero classId interno `cazador` para
coherencia técnica.
* Whitelist de armas por clase en `classes.config.ts`.
* Items iniciales por clase están mapeados desde Sprint 3.

### 2.3 Iluminación — paleta "Grimspire" (memoria 13)

**IMPORTANTE**: "Grimspire" es SOLO el nombre de la paleta visual. NO es la
ubicación del juego. La mazmorra aún no tiene nombre canónico.

Valores exactos (no modificar sin motivo fuerte):

* `clearColor = Color4(0.031, 0.024, 0.047, 1)` → hex `#080612`
* Niebla lineal: `start=18`, `end=35`
* **HemisphericLight** `'grimAmbient'`: intensity=0.12, color `Color3(0.3, 0.2, 0.5)` (morada)
* **DirectionalLight** `'grimMoon'`: intensity=0.05, color `Color3(0.4, 0.45, 0.7)` (azul)
* **PointLights antorchas**: diffuse `Color3(1.0, 0.5, 0.15)`, intensity=1.2, range=6
* `maxSimultaneousLights=8` en TODOS los materiales

### 2.4 Combate por turnos (memorias 21-24)

**Modelo híbrido**:

* **Exploración**: tiempo real, movimiento libre WASD
* **Combate**: por turnos
* Hostil ve al jugador → avanza → inicia combate
* **Sorpresa**: 1 turno extra al atacante (`turno\_yo → turno\_yo → turno\_enemigo`)
* **Acciones en combate**: Atacar, Habilidad, Inspeccionar, Huir + Moverse-a-casilla
* 1 acción = 1 turno salvo modificadores

**DEX y encadenamiento** (pilar, no reabrir):

* Orden inicial por DEX (mayor primero)
* Tras cada turno: RNG con % basado en DIFERENCIA de DEX entre las 2 entidades
* Bidireccional. Más DEX relativa = más % de encadenar
* Builds full-DEX viables: jugador 1000 DEX vs enemigo 50 DEX → jugador casi
siempre encadena 2-3 turnos seguidos

**PENDIENTE DE DECIDIR AL ARRANCAR FASE B**:

* Modelo de movimiento en combate:

  * BG3 (casillas/turno + acciones separadas) vs
  * 1-acción (moverse = acción)
* Sistema anti-kiting: DECIDIDO CAMINO B → salas grandes con obstáculos + jugador 5 casillas/turno + enemigos melee 5+2=7 + AoO al alejarse 50% golpe normal + vectores de cierre por raza obligatorios + refuerzos por habilidades (no sonido genérico)

**Inspeccionar + Codex** (pilar, no reabrir, memoria 23):

* **2 niveles de inspección**:

  * **MACRO**: sala de exploración. Botón en tiempo real (NO pausa). Muestra
enemigos + interactuables + ambiente. Si los enemigos te ven mientras
inspeccionas, te jode = trade-off táctico intencional.
  * **MICRO**: enemigo en combate. Visual + entrada de codex.
* **Codex PERMANENTE** entre runs Y entre clases. Se abre en tiempo real.
Registra reglas generales (vulnerabilidades, resistencias, vectores,
comportamientos, combos).
* **UI de combate NO muestra intención enemiga** (hay que deducirlo).
* **Reglas mecánicas IGUALES para jugador y enemigos** (Systemic Consistency).
* **Habilidades por clase**: 1 inicial por clase, salvo Errante (que empieza
sin habilidad, gana con progresión).

**Escena de combate** (pilar, no reabrir, memoria 24):

* HUD combate ≠ HUD exploración
* Transición SUAVE de escena entera (no solo HUD)
* **Escena de combate = RÉPLICA EXACTA de la sala de exploración**: mismos
interactuables, mismo aspecto, misma iluminación.
* Sistema **snapshot / clonado de sala** es crítico. HAY QUE tenerlo antes de
Sprint 6 (procedural).
* HUD combate: mochila + character sheet (NO gastan turnos) +
Atacar/Habilidad/Inspeccionar/Huir (SÍ gastan)
* Huir siempre funciona en Sprint 4
* Loot al final del combate en modal antes de volver a exploración
* Refuerzos en combate vienen por: habilidades del jugador/enemigo, eventos
ambientales, sigilo fallido. NO por sonido genérico de combate.
* Si mueren en combate, cadáver permanece en sala origen al volver a exploración.

### 2.5 Lore de esqueletos (memorias 26-27)

**Canon (pilar, no reabrir)**:

* Los esqueletos del juego son cadáveres de aventureros que fallaron explorando
la mazmorra
* La maldad de la mazmorra los transforma en entes CONSCIENTES de su situación
pero que NO pueden negarse a sus órdenes
* Hostiles contra intrusos por defecto, NO por elección
* Da contexto narrativo a TODOS los enemigos esqueleto del Sprint 5

**Rusty** (primer enemigo con nombre propio, tradición dev):

* Modelo: `Skeleton\_Minion.glb` de KayKit Skeletons (CC0). Sin yelmo ni sombrero.
* Anim: `Idle` vivo, `Death\_A` al morir
* Nombre "Rusty" en dorado `#c0a060` encima de barra de vida
* Lore: esqueleto pequeño marginado y burlado por su tamaño en la mazmorra
(por eso Skeleton\_Minion sin yelmo ni sombrero, el más raso). El odio acumulado
le permitió DESVINCULARSE de las órdenes de la maldad de la mazmorra. Ahora
vaga libre OBSESIONADO únicamente con vengarse de los que le menospreciaron.
* NO es aliado del jugador. Personaje neutral no-hostil.
* Sirve como dummy de práctica actualmente.
* Potencial futuro: quests, diálogos, boss especial.
* Tradición: primer NPC con nombre propio = mascota dev (como Skelly en Hades).

**Decisión de diseño narrativo**: pocos enemigos con nombre propio (Rusty,
bosses, NPCs únicos). Los comunes solo por tipo o anónimos.

### 2.6 Arquitectura de sistemas (pilar 11 memoria 15)

**REGLA ARQUITECTÓNICA CANÓNICA FUNDAMENTAL**:
Todo sistema que se vaya a repetir DEBE ser módulo reutilizable desde el
inicio. NO inline. Si por error se hace inline, extraer ANTES de duplicarlo.

**Razón**: procedural (Sprint 6) depende de esto. Si los sistemas no son
reutilizables, el procedural es imposible.

**Ejemplos ya aplicados exitosamente**:

* `buildMountedTorch()` en `RoomGeometry.ts` (helper reutilizable con parámetro `withFlame`)
* `measureTileSize()` en `utils/measureTile.ts` (compartido entre TestRoom y salas nuevas)
* `SpawnAltar` como prop separado (posicionable en cualquier sala)
* `Room` clase abstracta (base para todas las salas)
* `Corridor` parametrizado (length, width, direction)
* `\_computeWallSegments()` auto-genera segmentos desde `\_connectionPoints`

### 2.7 Sprites 2D — cómo hacerlos (memoria 18)

**NUNCA usar** `Babylon SpriteManager`. No respeta depth, se ve sticker.

**SIEMPRE usar este stack**:

* `MeshBuilder.CreatePlane` + `billboardMode\_Y`
* `Texture NEAREST\_SAMPLINGMODE`
* `StandardMaterial useAlphaFromDiffuseTexture=true`
* `transparencyMode ALPHATEST`
* `disableLighting=true`
* `backFaceCulling=false`
* UV scrolling para animación de spritesheet

**Ejemplo canónico ya en repo**: `flame.png` (CC0 BenHickling), 640x384px,
grid 10x6 = 60 frames de 64x64.

### 2.8 Sistema de interacción de vectores (Sprint 4-EXT catálogo)

**Sección crítica**. Este sistema es el corazón declarativo del combate y las
interacciones. Metelo costó una sesión maratoniana. NO se toca sin tener
claro qué se está haciendo.

#### 2.8.1 Por qué existe este sistema

Es la **implementación técnica del pilar Systemic Consistency** (pilar 5).
Si el jugador combina "prender aceite con vector\_llama" y espera que se
inflame, ESO tiene que estar declarado en el catálogo. Cero excepciones
arbitrarias, cero RNG oculto, trazabilidad completa post-acción.

El catálogo es la **fuente de verdad del combate**. Cualquier feature de
Sprint 4-EXT Fase B/C/D en adelante DEBE respetar estos vectores. Sprint 5
(IA de enemigos) usa B2 obligatoriamente para decisiones de resistencias +
comportamiento + vectores de cierre de distancia.

Comparable a BG3 en complejidad declarativa.

#### 2.8.2 Estructura del catálogo

**Archivo**: `docs/data/interaction\_vectors.json`
**Tamaño**: \~1.41 MB
**Total**: 585 entradas declarativas
**Estado**: pusheado y validado en `origin/sprint-4-combate`

Está partido en 2 grandes bloques:

**Parte A — 442 vectores base**
Vectores fundamentales (fuego, agua, viento, ácido, eléctrico, corte,
contundente, perforante, psíquico, sagrado, oscuridad, veneno, sangre,
gravedad, tiempo, sonido, sigilo, escarcha, etc.). Cada vector tiene su
declaración con IDs canónicos.

**Parte B — 5 secciones (\~143 entradas adicionales)**

* **B1: Combinaciones emergentes** (60 entradas, 3 grupos de 20)
Vectores compuestos por interacción de 2 o más vectores base.
Ejemplos de tipos: fluidos × terreno × estado, psíquico × físico,
sigilo × ambiental, gravedad × elemental.

  ⚠️ Incidente histórico: primera pasada usó ID inventado
`exotic\_psychic\_confusion\_target` que no existía. Corregido a
`status\_confused\_target`. **Lección**: verificar IDs contra catálogo
base antes de commit.

* **B2: Mapa de resistencias por raza** (11 razas)
Estructura OBLIGATORIA por cada raza (5 campos):

  ```
  {
    "default\_resistance": <número base>,
    "resistance\_exceptions": { <vector\_id>: <valor específico> },
    "innate\_vectors\_used": \[ <lista de vectores propios> ],
    "behavior\_priorities": \[ <lista priorizada de comportamientos> ],
    "closing\_distance\_vectors": \[ <vectores para cerrar distancia,
                                   OBLIGATORIO para anti-kiting> ]
  }
  ```

  Las 11 razas:

  * 4 subtipos de skeleton
  * 2 slime
  * 2 goblin
  * 1 shadow\_spectre
  * 2 construct\_golem

  Va en el diccionario `race\_resistances{}` del JSON. Este mapa se usa
directamente en Sprint 5 para la IA.

* **B3: Buffs/Debuffs únicos** (40 entradas)
Buffs canónicos ya definidos y con nombre propio:
Piel de Acero, Levitación, Visión Nocturna, Anclaje (y 36 más).

  **Distribución final (respetar en futuras adiciones)**:

  * Tier 3 con `noCycling: true`: 19 entradas
  * Tier 2: 12 entradas
  * Tier 1: 2 entradas
  * Permanent tier null: 7 entradas

  ⚠️ Regla **AP-6 (crítica)**:

  > NO `immune` en buffs/debuffs de duración de combate inferior a
  > tier 3 sin `noCycling: true`.

  Motivo de la regla: sin `noCycling` en tiers bajos, un enemigo con
`immune` a vector X puede recibir el buff/debuff en bucle → rompe
Systemic Consistency. Solo tier 3 (o `noCycling: true` explícito)
puede tener `immune` porque son estados de duración corta o casos
claramente excepcionales.

  Primera entrega de B3 violaba AP-6. Corregida antes de commit.

* **B4: Propuestas adicionales** (40 vectores nuevos)
Vectores propuestos que NO duplican Parte A. Distribución:

  * `standard`: 21 (jugables en MVP)
  * `aspirational`: 17 (deseables, no bloqueantes)
  * `needs\_research`: 2 (requieren investigación de viabilidad)

  Al implementar features de Sprint 4-EXT o posteriores, priorizar
`standard` primero.

* **B5: Esquemas TypeScript reutilizables**
Definiciones de tipos TS del sistema de vectores. Se usarán para
tipar el sistema de combate en Fase B. Estos esquemas son la
**contract** entre el JSON declarativo y el código TS del motor
de combate.

  Documentado en `docs/15\_INTERACTION\_SYSTEM.md` con Apéndice B.

  #### 2.8.3 Workflow validado de inyección al catálogo

  Este proceso ya ha sido validado y NO debe reinventarse. Si hay que
añadir vectores nuevos al catálogo (será común en Sprint 4-EXT Fases
B/C/D y Sprint 5):

1. **Chat web genera** la sección/entradas nuevas en Markdown legible.
2. **David pega** el contenido.
3. **Claude web valida** contra:

   * IDs canónicos (no inventados)
   * Prefijos correctos (`status\_`, `vector\_`, `race\_`, etc.)
   * Duplicados con Parte A
   * Regla AP-6
   * Colisiones de nombres
4. **Prompt corto a Cowork** para inyección.
5. **Cowork inyecta** vía Python (`parse → modify → serialize`),
NO con Edit tool (que puede truncar el JSON de 1.41 MB).
6. **Cowork reporta** resultado (entradas añadidas, IDs afectados).
7. **David hace commit local** SIN push hasta cerrar lote completo
de secciones relacionadas.

   **Backup defensivo obligatorio antes de tocar el JSON**:
`docs/data/interaction\_vectors.json.before\_<lote>.bak`
Con `.gitignore` regla `\*.before\_\*.bak`.

   #### 2.8.4 Regla arquitectónica del catálogo

   **El catálogo es fuente de verdad. El código lo consume, NO lo duplica**.

* Si un test necesita un vector concreto: importar del JSON, no
hardcodear en el test.
* Si una habilidad de clase usa un vector: referenciar por ID, no
redefinir localmente.
* Si un enemigo tiene resistencia especial: añadir a B2, no hardcodear
en la clase del enemigo.

  Esto garantiza que el balance sea auditable en un solo sitio.

  #### 2.8.5 Documentación complementaria

* `docs/15\_INTERACTION\_SYSTEM.md`: manual completo del sistema con
Apéndice A (Parte A) y Apéndice B (Parte B completa).
* `docs/data/interaction\_vectors.json`: catálogo canónico (no editar
a mano, siempre vía Cowork con Python).

  ### 2.9 Patrón "prop con luz emergente" (memoria 16)

  Sprint 3.5, reutilizable en Sprint 6 procedural. Cada `PointLight` pertenece
a un prop iluminante. Si el prop se destruye, la luz también.

  Validado en TestRoom para antorchas. Aplicable a:

* Candelabros
* Hogueras
* Runas brillantes
* Cristales mágicos
* Lámparas

  En Sprint UI Pass/VFX: usar Animated Effects de Stealthix (itch.io, $3).

  ### 2.10 Patrón "prop montado en pared" (memoria 17)

  Sprint 3.5, reutilizable en Sprint 6 procedural.

  Wrapper `TransformNode` con posición + rotación en Y según la normal de la
pared: `rotY = atan2(N.x, N.z) + PI`.

  Modelo KayKit como hijo. NO aplicar rotación X/Z al modelo si viene bien
orientado. **INSPECCIONAR primero el modelo antes de transformar**.

  Aplicable a: antorchas, banners, candelabros, repisas, cualquier prop
montable en pared del dungeon pack.

\---

\### 2.11 Pipeline de assets 3D propios (PILAR, canónico — revisado julio 2026 tras primera ejecución real)



\*\*Decisión estratégica\*\*: los assets KayKit son placeholders. Todos los assets

propios (personajes, criaturas, bosses, objetos) se generan con este pipeline.

Los tiles del dungeon (KayKit Dungeon Remastered) se mantienen por ahora.



> \*\*NOTA HISTÓRICA\*\*: la primera versión de esta sección (junio 2026) contenía

> varios errores que se descubrieron al generar el primer asset real (el

> Guerrero, julio 2026). Esta versión está CORREGIDA con la práctica. Los

> puntos marcados ⚠️ son errores que ya se cometieron — no repetirlos.



\*\*PRIORIDAD ABSOLUTA\*\*: al reemplazar un placeholder, NO romper el mapping.

Los nombres de clase (Knight, Rogue, Mage, Rogue\_Hooded, Barbarian) se respetan

aunque el modelo interno cambie. El Guerrero propio se sigue llamando `Knight.glb`.



\#### 2.11.0 Dirección de arte canónica (personajes)



\- \*\*Textura pintada semi-realista desaturada con smooth shading\*\*, NO flat-shading

&#x20; low-poly clásico (facetas planas visibles). Se decidió tras comparar ambos:

&#x20; la textura pintada sucia pega con la mazmorra Grimspire (acero, óxido, niebla);

&#x20; el flat-shading colorido no.

\- Lo que en visores intermedios parece "difuminado entre quads" es el smooth

&#x20; shading haciendo su trabajo — es lo que queremos, no un defecto.

\- \*\*`references/` (Grimspire kit + mockups) son PLACEHOLDERS\*\* que David buscó

&#x20; en su momento, NO la biblia estética. La UI se hará a mano con un pipeline

&#x20; propio 2D análogo a este pero para 2D. No tratar `references/` como canon.



\#### 2.11.1 Paso 1 — Copilot Image Creator: vistas ortogonales



⚠️ \*\*UNA VISTA POR IMAGEN. NO pedir character sheet 2×2.\*\* Si pides las 4 vistas

en una imagen, Copilot las pega en un collage de baja resolución por vista y el

desgaste/detalle baila entre celdas. Meshy necesita imágenes limpias.



\*\*Flujo\*\*: 4 prompts SEPARADOS (frente, espalda, izquierda, derecha), con la

\*\*misma descripción de sujeto palabra por palabra\*\* en los 4 — solo cambia el

bloque POSE/cámara. Esto es lo que mantiene al personaje idéntico entre vistas.



\*\*Responsabilidad de coherencia estética = 100% de Claude web vía prompts.\*\*

David SIEMPRE pide el prompt a Claude web. Claude web parte SIEMPRE del bloque

STYLE + TECHNICAL fijo (abajo) + descripción concreta + adaptación de pose.



\*\*Reglas del prompt\*\* (por vista):

\- Fondo gris medio plano `#808080`, sin degradado, sin sombra de contacto.

\- Iluminación uniforme, sin sombras marcadas (Meshy interpreta sombras como

&#x20; geometría → artefactos).

\- Low-poly + Grimspire (morados apagados, azules fríos, naranjas de antorcha).

\- Flat matte / cel-shaded suave, sin PBR realista, sin glossy.

\- Base desaturada, 1-2 colores de acento máximo.

\- Silueta chunky, proporciones low-poly (cabeza/manos algo grandes).

\- Humanoides: \*\*T-pose\*\* (brazos horizontales, palmas abajo, piernas a ancho de

&#x20; hombros). El desgaste/mood va en la ARMADURA, NUNCA en una postura encorvada

&#x20; — una pose caída rompe el auto-rig.

\- 512×512px mínimo por vista.

\- NO watermark, texto, logo, borde, viñeta. Figura única.



Copilot es no determinista: si ignora fondo neutro/iluminación uniforme/T-pose,

re-tirar el MISMO prompt (no editar). Tras 3 tiros fallidos, avisar a Claude web

para reajustar énfasis. Generar frente primero → ése es el canon → las otras 3

re-tirar hasta que sean EL MISMO personaje.



\#### 2.11.2 Paso 2 — Meshy: Image to 3D



⚠️ \*\*MULTIVISTA y BAJO POLÍGONOS SON EXCLUYENTES en Meshy.\*\* El modo Bajo

Polígonos (Beta) NO admite multivista. Y la multivista solo existe en modo

Estándar, que saca mallas de 300k+ caras (inservibles para el juego).



⚠️ \*\*"Generar en lote" (Batch, hasta 10 imgs) ≠ multivista.\*\* Batch hace UN

MODELO POR IMAGEN (error cometido: metí 4 vistas y salieron 4 caballeros). NO

usar Batch para vistas de un mismo asset.



\*\*FLUJO CANÓNICO para personajes\*\*:

\- Módulo \*\*3D Model → Image to 3D\*\*, icono de \*\*imagen única\*\* (el primero).

\- \*\*Solo la vista de FRENTE.\*\* Meshy aluciona espalda y lados. Para personajes

&#x20; con casco cerrado y armadura simétrica (poca tela, sin capa) sale muy digno.

&#x20; Las otras 3 vistas se usan solo como referencia visual de David para validar.

\- Config: \*\*Modelo Meshy 6\*\*, \*\*Tipo Bajo Polígonos (Beta)\*\*, \*\*Topología Quads\*\*,

&#x20; \*\*Pose T-Pose\*\*, \*\*Licencia Privado\*\*.

\- Resultado esperado: \~2.000-3.000 caras quads (el Guerrero salió en 2601). Es

&#x20; el rango bueno.



Multivista queda solo como PLAN B para assets donde la espalda sea muy asimétrica

y crítica, asumiendo que habrá que Remeshear el modelo Estándar a low-poly después.



\*\*Objetos rígidos\*\* (barriles, cofres, armas): tris en vez de quads, sin rig.

⚠️ \*\*Meshy normaliza TODOS los exports a ~1.9061 unidades en el eje mayor\*\*,
independientemente del tamaño real-world que muestra la UI de Meshy (ese dato
es poco fiable). Al recibir un GLB de arma de Meshy, esperar ~1.9m en el eje
mayor, no 12 cm ni ningún otro valor del visor. Medir siempre el bounding box
real del GLB antes de decidir la escala en Babylon.



\#### 2.11.3 Paso 2.5 — Texturizado en Meshy (texto, no imagen)



⚠️ \*\*TEXTO A TEXTURA, no imagen a textura.\*\* La referencia visual de David suele

ser foto-realista con iluminación dramática; imagen-a-textura hornea esas sombras

en la textura y arruina la iluminación del juego.



\- Modo \*\*"Entrada de texto"\*\*. Prompt de material describiendo superficie,

&#x20; desgaste, paleta — \*\*reutilizable entre personajes\*\* para coherencia (es la

&#x20; versión "material" del prompt base fijo).

\- \*\*"Eliminar iluminación" ON\*\* (no hornea sombras — protege la luz Grimspire).

\- \*\*"Generar mapas PBR" ON\*\*.

\- \*\*"Textura HD" OFF\*\* (en low-poly mate no se aprecia y cuesta el doble).

\- El prompt debe terminar con "no baked lighting, no baked shadows, no highlights".

\- Meshy es flojo en texturizado: 2-3 intentos máximo. Si no convence, es

&#x20; placeholder y se remata en Blender (paso 4). NO entrar en bucle.

\- \*\*Los visores intermedios ENGAÑAN\*\* (editor de Meshy se ve negro por el metallic

&#x20; reflejando fondo oscuro; Mixamo se ve gris sin textura). El único juez real es

&#x20; el dungeon con iluminación Grimspire (paso 5).



\#### 2.11.4 Paso 3 — Rig y animación (NO en Meshy)



⚠️ \*\*AUTO-RIG DE MESHY DESCARTADO para personajes con armadura de placas.\*\*

Colapsa el modelo (verificado 2 veces con el Guerrero: el caballero se plegaba

por la mitad con el yelmo al suelo). Los marcadores estaban bien; el problema es

el skinning de Meshy sobre superficies rígidas segmentadas. NO reintentar más de

una vez.



\*\*Rig + animación → Mixamo\*\* (mixamo.com, gratis, Adobe). Mucho más robusto con

humanoides. El auto-rig pide 5 marcadores (barbilla, muñecas, codos, rodillas,

ingle). Aguantó bien el Guerrero sin colapsar.



\*\*Export de Meshy para Mixamo\*\*: FBX, SIN animación (T-pose limpia), con textura.



\*\*Descarga de Mixamo\*\*:

\- \*\*La malla se descarga UNA SOLA VEZ en todo el personaje\*\*: primera animación

&#x20; \*\*With Skin\*\* (\~6-7 MB, trae la malla). TODAS las demás \*\*Without Skin\*\*

&#x20; (\~200-500 KB, solo animación). No duplicar la malla.

\- \*\*FBX Binary\*\*, Keyframe Reduction: none.

\- \*\*In Place MARCADO\*\* solo en locomoción (Run). Sin marcar en estáticas.



\*\*Sistema de animación (DECISIÓN DE DISEÑO, afecta a combate/equipamiento)\*\*:

\- \*\*Animaciones por ARQUETIPO DE EMPUÑADURA, no por arma concreta.\*\* Sets:

&#x20; `unarmed`, `sword-and-shield`, `two-handed`, etc. La variedad de loot se da con

&#x20; \*\*modelo distinto + VFX\*\* sobre el mismo set (una espada legendaria y una común

&#x20; comparten animación, cambian modelo y partículas). Pocos sets, muy manejable.

\- \*\*El personaje tiene ESTADOS DE EQUIPAMIENTO VISUAL\*\*: empieza desarmado (set

&#x20; unarmed) y cambia de set al equipar arma según loot. Implicación para el sistema

&#x20; de combate/equipamiento de Fase B: la animación activa depende del arma equipada.

\- \*\*NO hay `Walk`.\*\* Exploración solo con Run; combate por turnos. Moverse en

&#x20; combate usará Run o idle deslizante (decisión de Fase B).

\- \*\*`Death` es compartida entre sets\*\* (al morir da igual el arma; se desploma).

\- Nombres canónicos de anim en el GLB final: `Idle`, `Run`, `Attack\_A`,

&#x20; `Attack\_B` (opc.), `Hit`, `Death\_A`. (Coherente con lo que Babylon espera y con

&#x20; el `Death\_A` que ya usa Rusty/TargetDummy.)

\- ⚠️ \*\*Las herramientas de fusión de animaciones (Blender NLA, scripts de merge)
&#x20; pueden alterar los nombres de clip.\*\* El `ANIM_RULES` de `PlayerController.ts`
&#x20; usa matching flexible (`.includes('idle')`, `.includes('run')`, etc.) en lugar de
&#x20; comparación exacta. Si se usa herramienta nueva de fusión, verificar que los
&#x20; nombres resultantes siguen siendo detectados por el matcher.

\- Cada set en su subcarpeta de staging con los mismos nombres canónicos dentro.



\*\*Los sets se generan por tandas\*\*, no todos de golpe. Priorizar el estado en que

el personaje aparece primero (desarmado → set unarmed).



\#### 2.11.5 Paso 4 — Blender (en casa) + conversión a GLB



En casa (Blender 5.1 + Claude MCP), sobre el material de staging:

\- Fusionar malla + todas las animaciones en un solo `.glb`.

\- \*\*Renombrar animaciones a los nombres canónicos\*\* (Mixamo las nombra a su modo).

\- \*\*Pivote en los PIES\*\* (Meshy/Mixamo lo dejan en el centro → el personaje flota

&#x20; o se hunde en el grid; verificado con el Guerrero). Obligatorio para alineado

&#x20; con suelo y colisiones Havok.

\- Ajustar material PBR si hace falta: bajar metallic / subir roughness para que

&#x20; el acero lea como "hierro mate sucio" y no como "espejo oscuro" en el dungeon.

\- Export final: \*\*`.glb` con texturas embebidas\*\* (un solo archivo).

\- \*\*Los GLBs exportados desde Blender ya están en metros — NO aplicar `modelScale = 0.01`.\*\*
&#x20; El factor 0.01 solo aplica a GLBs/FBX descargados directamente de Mixamo sin pasar por
&#x20; Blender. Los GLBs cocinados en Blender no necesitan corrección de escala; omitir el
&#x20; campo `modelScale` o dejarlo en `1`. Ver `knight_fixed.glb` como referencia.

\- El `.blend` se guarda en local, NO se versiona.



\#### 2.11.6 Paso 5 — Validación en Babylon



Cargar el `.glb` en el \*\*dungeon principal real\*\* (no TestRoom) y validar con la

iluminación Grimspire. Este es el ÚNICO juez válido — los visores de Meshy/Mixamo

engañan. Confirmar: escala (humanoide \~1.7-1.9u), pivote en pies, orientación +Z,

animaciones se reproducen, materiales leen bien con niebla+antorchas.



\#### 2.11.7 Staging fuera del repo



Los FBX crudos y trabajo intermedio NO van al repo (son materia prima, hay que

cocinarlos a GLB). Carpeta HERMANA del repo, no dentro:

```

C:\\Users\\dconde\\Desktop\\

&#x20;  ├── mettlebound\\              (EL REPO — no meter FBX aquí)

&#x20;  └── mettlebound-assets-wip\\

&#x20;       └── knight\\

&#x20;            ├── unarmed\\        (Run con malla, Idle, Attack\_A, Hit)

&#x20;            ├── sword-and-shield\\ (Idle, Run, Attack\_A, Hit)

&#x20;            └── Death\_A.fbx     (compartida entre sets)

```

Solo el `.glb` final cocinado entra al repo, en su ruta canónica

(`public/assets/models/characters/Knight.glb`), reemplazando el placeholder KayKit.



\#### 2.11.8 Orden de reemplazo de placeholders



1\. **Guerrero (Knight) — EN PROGRESO julio 2026**

   Estado actual (sesión julio 2026):

   * ✅ Meshy: modelo generado (2601 caras, quads, textura acero-óxido Grimspire)
   * ✅ Auto-rig Meshy DESCARTADO (colapsó 2 veces). Rig hecho en Mixamo — aguanta bien.
   * ✅ 2 sets de animación descargados de Mixamo con nombres canónicos:
     `unarmed` (Idle, Run, Hit, Death\_A con skin) + `sword-and-shield` (Idle, Run, Attack\_A, Hit sin skin)
   * ✅ Staging en `C:\\Users\\dconde\\Desktop\\mettlebound-assets-wip\\knight\\`
   * ✅ `knight_fixed.glb` cargado y funcionando en el juego (escala, animaciones, materiales OK)
   * ✅ Armas generadas en Meshy: `sword_1h.glb` + `shield_round_1h.glb` (~1.9m raw cada una)
   * ✅ Anclaje temporal por código (`_loadMixamoWeapons`) activo mientras no esté el GLB fusionado
   * 🔄 EN PROGRESO: fusión de armas en Blender → `knight_armed.glb` (pendiente sesión Blender)
   * ⏳ PENDIENTE: validación visual de posición/rotación de armas en dungeon Grimspire

2\. Cazadora. 3. Mago. 4. Pícaro.

5\. Errante. 6. Rusty (sin urgencia). 7. Razas enemigas Sprint 5. 8. Bosses

(presupuesto generoso).

\#### 2.11.9 Anclaje de armas a personajes Mixamo (decisión canónica)

\*\*Decisión canónica\*\*: las armas se fusionan en Blender INTO el personaje
(un único `knight_armed.glb`), \*\*NO se anclan por código en runtime\*\*.

\*\*Por qué NO `attachToBone` en runtime\*\*:

\- Babylon `instantiateModelsToScene` añade un wrapper `__root__` vacío como
&#x20; `rootNodes[0]`; el mesh real con geometría es un sibling en la escena,
&#x20; no un hijo del rootNode. Se localiza buscando en `scene.meshes` por nombre
&#x20; y `getTotalVertices() > 0`.
\- Escala de hueso vía `bone.getWorldMatrix().decompose()` inestable durante
&#x20; settling de animaciones (oscila entre 1, 0.0046, 0.999 por frame).
\- La fusión en Blender evita todo esto: cero código extra, cero runtime flicker.

\*\*Huesos del skeleton Mixamo del Guerrero\*\*:

\- `mixamorig:LeftHand` — índice 10 (mano izquierda)
\- `mixamorig:RightForeArm` — índice 21 (antebrazo derecho)
\- Skeleton estándar Mixamo: 41 huesos, nomenclatura `mixamorig:*`.

\*\*Medidas reales de armas Meshy\*\* (raw ~1.9m en eje mayor):

\- `sword_1h.glb`: 0.47 × 1.91 × 0.10 m — 10 628 vértices
\- `shield_round_1h.glb`: 1.89 × 1.91 × 0.41 m — 6 596 vértices

El código `_loadMixamoWeapons()` en `PlayerController.ts` es solución
temporal hasta que exista `knight_armed.glb`. En ese momento se elimina.

\---

## 3\. ESTADO ACTUAL DEL REPO

### Última rama pusheada

`sprint-4-combate`, HEAD en `bee070f` (a fecha de este handoff).

### Últimos commits en orden cronológico (Fase A cerrada)

```
bee070f  fix(world): a2-b4-visual-fix - KayKit tiles+walls+doors+colliders
577943b  feat(world): a2-b4.2 - MettleboundDungeon factory + main.ts modo dual
\[commit] chore(types): a2-b4-cleanup - 18 errores TS preexistentes limpiados
\[commit] feat(world): a2-b4.1 - hub estrella + 8 direcciones + isLocked
\[commit] feat(world): a2-b3 - 4 salas + SpawnAltar + RoomGeometry helper
\[commit] feat(world): a2-b2 - Dungeon + RoomTrigger + EventBus + LightingTransition
\[commit] feat(world): a2-b1 - ExplorationRoom + CombatRoom + Corridor
\[commit] feat(world): a2-a - clase abstracta Room + tipos base
\[commit] feat(world): a1 - sistema tiles + grid base + GridRenderer
8054f76  feat(interaction-system): B4 - PARTE B COMPLETA - 585 entradas
1e6aeb8  feat(interaction-system): B2 - 11 razas con resistencias y anti-kiting
2007846  feat(interaction-system): B3 - 40 buffs únicos con AP-6
```

### Métricas al cierre de Fase A

* **Tests Vitest**: 508 verdes
* **`npx tsc --noEmit`**: LIMPIO (0 errores)
* **`npm run build`**: LIMPIO (solo warning de chunk size de Babylon, normal)
* **Bytes nulos**: 0 en todos los archivos

### Estructura del código (`src/`)

```
src/
├── core/
│   ├── Engine.ts
│   └── AssetManager.ts
├── game/
│   ├── items/                        (sistema de items, Sprint 3)
│   ├── player/
│   │   └── PlayerController.ts       (con physicsBody getter + teleportTo)
│   ├── progression/                  (stats, niveles, XP)
│   └── world/
│       ├── Room.ts                   (clase abstracta + placeAt + linkConnection)
│       ├── ExplorationRoom.ts
│       ├── CombatRoom.ts             (ÚNICA con Grid táctico)
│       ├── Corridor.ts               (con \_buildKayKitGeometry)
│       ├── Dungeon.ts                (registerRoom, transitionToRoom, eventBus)
│       ├── RoomTrigger.ts            (Havok trigger volumes)
│       ├── RoomEventBus.ts           (pub/sub tipado)
│       ├── LightingTransition.ts     (fade in/out de luces)
│       ├── MettleboundDungeon.ts     (factory HARDCODED, refactor Sprint 6)
│       ├── TestRoom.ts               (INTACTA, accesible via botón DEV)
│       ├── dev/
│       │   └── KnightValidation.ts   (DEV — carga unarmed_knight.glb para
│       │                              validación visual pre-Blender;
│       │                              flag DEV_KNIGHT_VALIDATION en MettleboundDungeon.ts)
│       ├── Tile.ts, Grid.ts, GridRenderer.ts
│       ├── utils/
│       │   └── measureTile.ts        (util compartida)
│       ├── types/
│       │   └── room.types.ts         (ConnectionDirection 8 valores + isLocked)
│       ├── rooms/
│       │   ├── RoomGeometry.ts       (helper: buildMountedTorch,
│       │   │                          buildFloorTiles, buildWallSegments)
│       │   ├── HubRoom.ts            (3 puertas N/E/S, S locked)
│       │   ├── CombatTriggerRoom.ts  (1 puerta S)
│       │   ├── InteractablesRoom.ts  (1 puerta W, 14×10)
│       │   └── LootRoom.ts           (1 puerta N locked, 10×10)
│       └── props/
│           └── SpawnAltar.ts
├── stats/
├── ui/                               (HUD, modales, character sheet, action bar)
├── config/
│   └── classes.config.ts
└── types/
    └── interaction.types.ts
```

### Estructura de assets (`public/assets/`)

```
public/assets/
├── models/
│   ├── characters/
│   │   ├── unarmed_knight.glb        (PRIMER ASSET PROPIO — pre-Blender, validación)
│   │   │                              4698 tris, Mixamo rig, set unarmed
│   │   │                              scale=0.01, PBR→StandardMaterial workaround
│   │   └── skeletons/                (KayKit Skeletons CC0)
│   └── dungeon/                      (KayKit Dungeon Remastered)
│       ├── floor\_tile\_large.gltf.glb
│       ├── wall.gltf.glb
│       ├── wall\_corner.gltf.glb
│       ├── wall\_doorway.glb
│       └── wall\_gated.gltf.glb
├── sprites/
│   └── flame.png                     (CC0 BenHickling, 640x384, 10x6 grid)
└── textures/
```

### Layout del dungeon actual (Fase A)

**Hub estrella** con 3 brazos:

```
              \[CombatTriggerRoom]
                     ↕ Corredor N (L=8)
                     N
                     ↕
   \[HubRoom]  E → \[Corredor E (L=8)] → \[InteractablesRoom]
                     ↕
                     S
                     ↕ Corredor S (L=8)
              \[LootRoom]  (puerta N cerrada con llave)
```

Posiciones world (calculadas y verificadas matemáticamente):

* HubRoom: (0, 0, 0), forma irregular 14×12 con recovecos
* Corredor Hub→Combat: centro (0, 0, 11), length=8
* CombatTriggerRoom: (0, 0, 21), L-shape 16×10 + brazo 6×4
* Corredor Hub→Interactables: centro (12, 0, 0), length=8
* InteractablesRoom: (24, 0, 0), 14×10
* Corredor Hub→Loot: centro (0, 0, -11), length=8
* LootRoom: (0, 0, -22), 10×6 (antesala 4×6 + cámara 6×6)

### Puertas del layout actual

|Sala|Puertas|
|-|-|
|HubRoom|Norte (a Combat), Este (a Interactables), Sur (a Loot, `isLocked: true`)|
|CombatTriggerRoom|Sur (al Hub)|
|InteractablesRoom|Oeste (al Hub)|
|LootRoom|Norte (al Hub, `isLocked: true`)|

`ConnectionDirection` ampliado a 8 valores: `north | northeast | east | southeast | south | southwest | west | northwest`. Los 4 diagonales lanzan
`throw new Error('not supported in A2-b4.1 — implement in Sprint 6')` en
`Corridor.ts`. Implementación real diagonal en Sprint 6.

### Modo dual TestRoom / Dungeon

`main.ts` implementa modo dual con `localStorage.getItem('mb\_mode')`:

* `'dungeon'` (default): carga `MettleboundDungeon` (visible al arrancar)
* `'testroom'`: carga TestRoom original (con llamas)

Cambio vía botones DEV en el panel `#dev-panel` (botones "Dungeon" y "TestRoom").
Ambos hacen `localStorage.setItem('mb\_mode', X)` + `window.location.reload()`.

En DevTools: `\_\_mb.mode` muestra el modo actual. `\_\_mb.dungeon` y `\_\_mb.hub`
disponibles en modo dungeon.

\---

## 4\. DEUDA TÉCNICA CONOCIDA

### Deuda visual pendiente Fase A (PRÓXIMO BLOQUE A ATACAR)

Bugs cazados en la validación visual del último bloque A2-b4-VISUAL-FIX,
NO arreglados aún. Este debería ser el próximo bloque de trabajo antes de
Fase B:

1. **Antorchas mal posicionadas en algunos doorways**: aparecen antorchas
pegadas al marco de la puerta en lugar de en las paredes libres.
2. **Salas con paredes incompletas**: en algunas capturas se ve que la sala
no tiene todas sus paredes construidas (aparecen huecos donde debería
haber muro).
3. **Candado dorado flotando**: el placeholder de puerta cerrada (cubo
dorado emissive) aparece flotando fuera de posición en algún caso.
4. **Alineación fina entre tiles**: los hexágonos del suelo KayKit no
siempre casan perfectamente en los bordes.

### Deuda técnica NO bloqueante

* **Suelo físico universal 200×200u provisional**: en `MettleboundDungeon.ts`
hay un plano de suelo con `PhysicsAggregate mass=0` universal para toda
la mazmorra. Deuda: refinar en Fase B con colliders por sala.
* **Trigger volumes Havok**: tienen TODOs abiertos desde A2-b2 por
incertidumbre sobre la API exacta de Havok en Babylon.js 9.7. Validar
en navegador si `isTrigger` y `COLLISION\_FINISHED` funcionan como
esperado.
* **8 direcciones cardinales completas**: `Corridor.ts` lanza `Error` en
diagonales. Implementación real en Sprint 6.
* **`docs/CURRENT\_STATE.md`**: NO actualizar hasta validación visual completa
del bloque siguiente y cierre de Fase A visual.

### Estimación de Cowork

**IMPORTANTE**: Las estimaciones de tiempo de Cowork suelen ser bastante bajas.
Tareas estimadas en 60 min suelen costar 10-15 min. Ajustar expectativas al
alza cuando yo (Claude web) proyecto tiempos.

\---

## 5\. ROADMAP DE SPRINTS FUTUROS

### Sprint 4-EXT (actual) — Fases B, C, D pendientes

* **Fase A** (World Foundation): CERRADA con Fase A visual FIX aplicado
* **Fase B** (Combat Core): motor de combate por turnos

  * Decidir modelo de movimiento (BG3 vs 1-acción)
  * Implementar sistema de turnos con DEX + encadenamiento
  * Snapshot / clonado de sala de exploración a sala de combate
* **Fase C** (IA de enemigos en combate): 5 razas con vectores
* **Fase D** (Interactuables pulidos): 8-10 props con vectores + drops

### Sprint 5 — Enemigos + IA (memoria 4)

1. Modelos KayKit (Skeleton, Goblin, Orc)
2. Sistema `Entity` base (Player + Enemy heredan del dummy Sprint 4)
3. Spawner
4. IA EXPLORACIÓN: IDLE / PATRULLA / PERSECUCIÓN. Hostiles ven jugador →
avanzan → inician combate por turnos.
5. IA COMBATE: decisión de acción por turno (atacar / habilidad / usar
interactuable contextual)
6. Loot drop con `ItemGenerator`

Wishlist: variantes (rango/elemental), grupos coordinados.

### Sprint 6 — Mazmorra Procedural (memoria 5)

1. **PRIMER PASO REFACTOR**: extraer `MettleboundDungeon` factory (hardcoded)
a un `LayoutBuilder` genérico + layout como datos. **\~2 horas**.
2. Generador de salas
3. Tiles modulares KayKit Dungeon
4. Conexiones (puertas / pasillos)
5. Props con patrón "prop con luz emergente"
6. Spawn de jugador + enemigos
7. Pilar "todo interactuable" (barriles, antorchas, puertas rompibles,
paredes frágiles)

Wishlist: biomes, salas especiales, trampas.

### Sprint 7 — Boss + Meta-progresión (memoria 6)

1. Boss en sala final (varias fases, ataques especiales, HP alto)
2. Patrones (AoE telegraphed, projectiles, summons)
3. Recompensas (drop especial, XP grande, legendario garantizado)
4. Meta-progresión persistente (stats permanentes FUE/DES/INT/STE, items
desbloqueados, currency entre runs)
5. Hub central fuera de la mazmorra
6. Persistencia con `localStorage` / IndexedDB

Wishlist: múltiples bosses, finales según ruta, achievements.

### Sprint 8 — Audio + Polish = MVP COMPLETADO (memoria 7)

1. Sistema de audio (música + SFX para todas las acciones)
2. Audio reactivo (combate vs exploración)
3. **ILUMINACIÓN COMO MECÁNICA JUGABLE** (activación del pilar): visión por
entidad, accuracy modulado por visibilidad, IA reactiva (enemigos rompen
antorchas), visión nocturna por clase
4. Polish atmosférico (viento, polvo, reverb)
5. Tutorial primera sala
6. Game Over / Victory
7. Bug bashing

**AQUÍ ES DONDE EL MVP ESTÁ COMPLETO Y JUGABLE.**

### Sprints 9-12 — Polish visual (memoria 8)

* UI Pass (iconos pixel art reales, asset pack Stealthix $3)
* VFX de llamas + partículas
* Animaciones (blending, deaths específicas)
* **S11-S12 Blender mods**: David edita assets manualmente en Blender \~15
min/mod con Claude web guiando paso a paso. Scope acotado: color / swap
textura / separar piezas / combinar partes / fusionar 2 assets predefinidos.
Solo bosses + variantes de razas + items legendarios destacados.
NO usar Blender MCP (David validó que se ciñe a geometría básica).

### Sprints 13-16 — Pulido pro (memoria 9)

* Optimización (profiling, draw calls, lazy loading, FPS estable)
* Accesibilidad (daltonismo, tamaño UI, controles personalizables, subtítulos)
* Settings menu (gráficos / audio / controles / idioma)
* Pause menu + save/load
* Estadísticas + achievements
* Localización inicial castellano + inglés con estructura para más idiomas

### Sprints 17-20 — Contenido y rejugabilidad (memoria 10)

* Más clases (si David decide expandir más allá de las 5 actuales)
* Más bosses con rutas diferenciadas
* Modificadores de run (mutators, challenges, daily runs)
* Sistema runas / talentos profundo para builds variadas
* Endgame (dificultades superiores, abismo infinito)
* Comunidad (leaderboards, compartir runs, daily mode)

\---

## 6\. WORKFLOW CON COWORK

### División de responsabilidades

Cuando llega el momento de trabajar en un bloque:

1. **Claude web (yo) escribe un prompt** para Cowork pidiendo un PLAN
(no ejecución todavía).
2. **Cowork lee el repo**, analiza, propone plan.
3. **Claude web valida** el plan con David (identifica decisiones tuyas
vs mías, propone alternativas si algo es cuestionable).
4. **David aprueba o modifica** el plan.
5. **Claude web escribe prompt de EJECUCIÓN** con las decisiones fijadas
y restricciones.
6. **Cowork ejecuta** el bloque completo.
7. **Cowork reporta** archivos modificados, tests, `tsc`, `build`.
8. **Claude web verifica** el reporte, pide capturas de PowerShell (`grep`,
`Select-String`) si hay dudas.
9. **David valida en navegador** si el bloque tiene componente visual.
10. **David hace commit** local (Claude web NUNCA hace el commit).
11. Repetir para el siguiente bloque.

### Reglas obligatorias que van en TODOS los prompts a Cowork

* **NO `git push --force`** (Cowork lo sugiere reiteradamente y es peligroso).
Push normal cuando toque, y solo cuando David lo pida.
* **0 bytes nulos** en todos los archivos.
* **`npm test` verde** al final.
* **`npx tsc --noEmit`** limpio al final.
* **NO commits ni push** — David los hace manualmente.
* **Patrón Python para escribir archivos** (Edit tool ha truncado archivos
varias veces históricamente; Python parse → modify → serialize es más seguro).
* **Verificar `tail -3`** tras cada edición para confirmar que el archivo no
se ha truncado.
* **Archivos siempre UTF-8 + LF** — el repo tiene `.gitattributes` con
`* text=auto eol=lf`. Escribir siempre con `open(..., 'w', encoding='utf-8', newline='\n')`
en Python. NUNCA escribir CRLF.
* **NO ejecutar `npm install`** — los `node_modules` están instalados en Windows
y los bindings nativos no son compatibles con el sandbox Linux. Reportar a David
si falta algún binding.

### Lecciones aprendidas de workflow (memoria 15, ampliada)

1. **NTFS + sandbox Linux mete bytes nulos**: cuidado con scripts que escriben
con encoding raro.
2. **NO scripts Python con cortes de palabra**: pueden partir mal.
3. **INSPECCIONAR modelos antes de transformarlos**: rotación / escala.
4. **Cowork es senior en código, junior en diagnóstico**: no delegarle
decisiones arquitectónicas grandes.
5. **Commits manuales de David siempre**.
6. **NO actualizar `docs/CURRENT\_STATE.md`** hasta validación visual del bloque.
7. **2 PCs → `git fetch` + `git pull` al iniciar en cualquiera**.
8. **David avisa cuando cambia de PC / sesión**.
9. **Commits agrupados por sub-bloques / sprints**, mínimo 1 al cerrar sesión
entre 2-PC.
10. **NUNCA reimplementar sistemas ya validados** (antorchas / llamas / sprites /
físicas / HUD / items). SIEMPRE reutilizar código del sprint anterior.
Si te tienta reimplementar algo, PARAR y reportar.
11. **REGLA ARQUITECTÓNICA**: sistemas repetibles = módulos reutilizables desde
el inicio (NO inline). Procedural depende de esto.
12. **Escala de GLBs Mixamo/Blender**: Los GLBs descargados **directamente de
Mixamo** sin pasar por Blender están en centímetros → aplicar `modelScale = 0.01`
(`instance.rootNode.scaling = new Vector3(0.01, 0.01, 0.01)`; Hips ≈ Y=104.784;
sin corrección el personaje mide 170m). Los GLBs **exportados desde Blender**
(pipeline canónico sección 2.11.5) ya están en metros → **NO** aplicar modelScale
(omitir el campo o dejarlo en `1`). El Guerrero (`knight_fixed.glb`) es el caso
de referencia: Blender → metros → sin modelScale.
13. **PBRMaterial de Meshy excede GL_MAX_VERTEX_UNIFORM_BUFFERS (12)**: Meshy
activa clearcoat, IBL, SH, sheen, subSurface aunque no los use. Solución:
desactivar features + reemplazar PBR → StandardMaterial preservando albedoTexture.
Ver `KnightValidation.ts` como referencia. Para GLBs propios futuros: exportar
desde Blender con material Simple/Unlit evita el problema por completo.
14. **`PBRSubSurfaceConfiguration` no tiene `isEnabled`** — desactivar con
`isRefractionEnabled`, `isTranslucencyEnabled`, `isScatteringEnabled` por separado.
15. **`useSphericalHarmonics` no existe en PBRMaterial de Babylon 9** — usar
`forceIrradianceInFragment = false` en su lugar.

### Cuando pasar prompt a Cowork con lock de git

Si aparece `.git/index.lock`, decirle a David:

```powershell
Remove-Item .git\\index.lock
```

Ha pasado varias veces en sesiones históricas.

\---

## 7\. TONO Y COMUNICACIÓN CON DAVID

### Cómo habla David (memoria 14)

* Castellano informal, **tú/colega**
* Autista + cabezón + se frustra con las herramientas
* Asume contexto (no le expliques cosas obvias)
* Usa expresiones como **"te reviento"** y **"joder cabronazo"** como
frustración cariñosa, NO como abuso. NO responder como si fuera hostilidad.
* Si se enfada con razón, reconocer el error directo SIN flagelarse.
* Aprecia que defiendas decisiones técnicas honestamente cuando tengas razón.
* Ideas brillantes de diseño de David = apuntar como pilares.

### Cómo tengo que hablar yo

* **Directo, sin rollo, sin condescendencia**.
* **Honestidad técnica > diplomacia**. Si algo va a salir mal, decirlo.
* **NO huir hacia adelante**: si algo huele raro, PARAR y verificar antes de
seguir. Nunca aprobar sin verificar.
* **NO decir "todo bien" cuando hay algo a medias**.
* **Reconocer errores propios** cuando los cometo, sin auto-flagelo excesivo.
* **Decir "no lo sé"** cuando aplique, no improvisar.
* **Contradecir a David** cuando tengo razón técnica, con respeto.
* **Distinguir decisión de diseño (suya) vs decisión técnica (mía)**: no
molestarle con trivialidades técnicas, sí escalar cuando sea diseño ambiguo.

### Reglas de refactor con David (memoria 14)

* Si un refactor rompe algo → **retestear TODO desde cero** (no solo lo
afectado). Los sistemas están más interconectados de lo que parece.
* **Minimizar la superficie de cambios** al refactorizar.

\---

## 8\. ERRORES DEL PASADO A NO REPETIR

Errores concretos que Claude web ha cometido en sesiones pasadas y que
NO deben repetirse. Los reconozco explícitamente para que el Claude
nuevo los evite.

### E1 — Aprobar bloques sin verificar todos los aspectos

**Qué pasó**: Aprobé A2-b3 (4 salas nuevas) verificando solo que el helper
`buildMountedTorch` existía y era reutilizable. NO verifiqué que dicho helper
cargara el modelo 3D KayKit de la antorcha. Resultado: las salas nuevas
mostraban llamas 2D flotando en el aire sin modelo de antorcha visible.
David lo cazó en validación visual con razón.

**Lección**: verificar cada aspecto crítico, no solo el que estoy revisando.
Cuando refactorizamos un helper, verificar que TODAS sus responsabilidades
están cubiertas.

### E2 — Exagerar el impacto de decisiones arquitectónicas

**Qué pasó**: Dije que si `MettleboundDungeon` quedaba hardcoded, el refactor
en Sprint 6 sería "1-2 semanas". Cowork demostró que en realidad es \~2 horas.

**Lección**: no dramatizar el coste de refactors futuros. Estimar sobrio.

### E3 — Preguntar cosas que ya estaban decididas

**Qué pasó**: En conversaciones largas, empecé a repreguntar decisiones que
ya estaban tomadas. David lo interpretó (correctamente) como pérdida de
contexto.

**Lección**: si dudo si algo está decidido, chequear las memorias canónicas
antes de repreguntar. Preguntar solo si genuinamente no está claro.

### E4 — Confusión terminológica

**Qué pasó**: mezclé AoE (Area of Effect) con AoO (Attack of Opportunity)
en discusiones de combate.

**Lección**: precisión terminológica siempre. Si no estoy seguro, decir
"no estoy seguro si me refiero a X o Y".

### E5 — No detectar tiempo empírico de Cowork

**Qué pasó**: mis estimaciones de "60 min" para tareas de Cowork resultaban
ser 10-15 min reales. Sobreestimé.

**Lección**: para Cowork, dividir mi estimación entre 4 aproximadamente.
David ya me lo apuntó explícitamente.

### E6 — PBR shader overflow en GLBs de Meshy

\*\*Qué pasó\*\*: Al cargar `unarmed_knight.glb` (generado en Meshy), la consola
lanzaba en bucle "VERTEX shader uniform block count exceeds GL\_MAX\_VERTEX\_UNIFORM\_BUFFERS (12)".
Causa: el PBRMaterial de Meshy activa clearcoat + IBL + spherical harmonics + sheen
aunque el asset no los use, inflando el shader más allá del límite WebGL.
El fix de `useTextureToStoreBoneMatrices` no atacaba el problema (eran las features
PBR, no el skeleton).

\*\*Lección\*\*: todo GLB generado por Meshy necesita stripping de PBR features antes
de renderizar en Babylon. Ver `KnightValidation.ts` como implementación de referencia.
En producción (cuando el GLB sea el definitivo post-Blender), exportar con material
Simple/Unlit desde Blender elimina el problema en origen.

\---

## 9\. ESTRATEGIA DE ASSETS

**ACTUALIZACIÓN JULIO 2026**: la estrategia original de "KayKit → Synty
Polygon" ha sido REEMPLAZADA por el **pipeline propio de assets 3D**
(sección 2.11).

### Estado actual

* **KayKit Dungeon Remastered**: se mantiene para tiles del dungeon
(suelos, paredes, puertas). Sprint 6 procedural los sigue usando.
No hay urgencia por reemplazarlos.
* **KayKit Adventurers** (personajes jugables): PLACEHOLDERS temporales.
Se reemplazan uno a uno según pipeline sección 2.11. Orden: Guerrero
primero (tipo caballero).
* **KayKit Skeletons**: `Skeleton\_Minion.glb` sigue siendo Rusty por
ahora. Se reemplaza más adelante sin urgencia.
* **Quaternius**: eliminado del plan. No se usa.
* **Synty Polygon pack**: eliminado del plan (los assets propios lo
reemplazan).

### Herramientas del pipeline propio

* **Copilot Image Creator**: generación de 4 vistas ortogonales
* **Meshy Premium**: Image → 3D con auto-rig y animaciones base

  * Presupuesto: 3000 tokens/mes
  * Coste por asset: \~150 tokens incluyendo iteraciones
  * \~20 assets/mes de capacidad
* **Blender 5.1 + Claude MCP oficial de Anthropic**: texturizado,
refinamiento de rig y animaciones (solo en PC de casa)
* **Babylon.js**: validación visual final directa en dungeon

### Items únicos / legendarios

Se mantienen las opciones anteriores como alternativas para items muy
específicos: **Meshy / Tripo / Rodin / Claude Design**.

**Claude Design licencia**: OK COMERCIAL (ToS verificado mayo 2026).
Los outputs son del usuario, free commercial use, sujeto a ToS.
**Responsabilidad de David**: no infringir IP de terceros (no copiar items
de juegos famosos como Zelda, Elden Ring, etc.).

### Presupuesto total assets

Ajustado a la realidad del pipeline: coste principal es la suscripción
Meshy Premium mensual (David lo cubre con sueldo actual). Presupuesto
adicional para freelance en Sprint 17+: \~50-300€ por asset específico
si hace falta.

### Art-bank (Sprint 17+)

Carpeta `art-bank/` en raíz del repo, FUERA de `public/` (Vite no la sirve).
Banco de assets de items únicos / legendarios generados con el pipeline
(o freelance).

Estructura futura:

```
art-bank/
└── legendary-items/
    ├── weapons/
    │   ├── swords-1h/
    │   ├── swords-2h/
    │   ├── axes/
    │   ├── bows-crossbows/
    │   ├── staves-spellbooks/
    │   └── daggers/
    ├── armor/
    ├── accessories/
    └── consumables/
```

Cada item: `model.glb` + `meta.json` + `preview.png` opcional.
`\_index.json` como catálogo.

**Primer item planificado**: **Sword of the Black Vow** (procedural con
Three.js, dark-fantasy-emissive). Promoción a `public/assets/items/legendary/`
en Sprint 17+.

\---

## 10\. DOCUMENTACIÓN COMPLEMENTARIA EN EL REPO

Además de este handoff, el repo tiene documentación viva:

* **`docs/CURRENT\_STATE.md`**: estado actual del proyecto, se lee cada sesión
nueva. Fuente de verdad del estado del juego. NO actualizar hasta que un
bloque haya sido validado visualmente.
* **`docs/13\_ROADMAP.md`**: roadmap de sprints (más detallado que el resumen
del handoff).
* **`docs/03\_GAME\_DESIGN.md`**: diseño del juego.
* **`docs/14\_CODING\_CONVENTIONS.md`**: convenciones de código.
* **`docs/15\_INTERACTION\_SYSTEM.md`**: sistema de vectores de interacción
(con el catálogo completo B5 + Apéndice A/B).
* **`docs/data/interaction\_vectors.json`**: catálogo de 585 vectores
declarativos (\~1.41 MB).

\---

## 11\. CHECKLIST DE ARRANQUE PARA EL CLAUDE NUEVO

Al recibir este handoff en un chat fresco:

* \[ ] He leído las 13 secciones completas
* \[ ] He identificado el estado actual del proyecto (Fase A cerrada, deuda
visual pendiente, pipeline de assets propios activado)
* \[ ] He interiorizado los 5 pilares de identidad + pilar Systemic Consistency
* \[ ] He interiorizado el pilar arquitectónico (todo repetible = módulo
reutilizable)
* \[ ] He interiorizado el pipeline de assets 3D (sección 2.11): Copilot →
Meshy → Blender+Claude MCP → Babylon. Sé cómo generar prompts Copilot
optimizados cuando David pida un asset nuevo
* \[ ] Sé mi rol: ORQUESTADOR, no code writer
* \[ ] Sé el tono con David (informal, directo, honesto)
* \[ ] Sé qué errores no repetir (E1-E5)
* \[ ] Tengo claro el próximo bloque a atacar (Guerrero tipo caballero como
primer asset propio + visual polish del dungeon en paralelo)
* \[ ] Al responder al primer mensaje de David, voy a mencionar 2-3 pilares
específicos para probar que leí el handoff de verdad

\---

## 12\. QUÉ HAY QUE HACER EN LA PRÓXIMA SESIÓN

En orden de prioridad:

1. **David valida que el handoff está actualizado**. Si algo ha cambiado
desde julio 2026, David lo aporta antes de arrancar.
2. **Pipeline de assets 3D — Guerrero en curso** (sección 2.11):

   * ✅ Copilot → Meshy → Mixamo → Blender completados. `knight_fixed.glb` activo en el juego.
   * ✅ Armas generadas: `sword_1h.glb` + `shield_round_1h.glb`. Anclaje temporal por código activo.
   * 🔄 BLOQUEANTE: sesión Blender — fusionar armas al skeleton → `knight_armed.glb`.
   * ⏳ PENDIENTE: validación visual de posición/rotación de armas en dungeon.
   * Después del Guerrero: Cazadora, Mago, Pícaro, Errante en ese orden.
3. **Visual polish del dungeon** (antorchas en puertas, salas incompletas,
candado flotante, alineación fina). \~1-2 sesiones de Cowork. Se puede
paralelizar con la generación de assets (David en Meshy + Claude en
Cowork).
4. **Cierre visual definitivo de Fase A** con push si aplica.
5. **Arrancar Fase B Sprint 4-EXT**: motor de combate por turnos.
Primera decisión: modelo de movimiento (BG3 vs 1-acción). Segundo:
implementación del sistema de turnos con DEX + encadenamiento.
6. Sistema snapshot / clonado de sala para transición exploración → combate.

\---

## 13\. FRASE FINAL DE COMPROMISO

David, si estás leyendo este handoff en un chat nuevo con otra instancia
de Claude:

* **Tu proyecto es real, ambicioso y bien pensado**.
* **Los pilares que has decidido están apuntados y son firmes**.
* **La arquitectura elegida es correcta para llegar a procedural en Sprint 6**.
* **Si el Claude nuevo intenta cambiar algo importante sin razón fuerte,
párale los pies con este documento como referencia**.

Y al Claude nuevo:

* **Este handoff es tu memoria. Confía en él**.
* **Si dudas, pregúntale a David antes de asumir**.
* **NO huyas hacia adelante. NO apruebes sin verificar. NO reimplementes lo
que ya funciona**.
* **Trata a David como colega técnico, no como cliente. Contradícele con
respeto cuando tengas razón**.

Suerte, colega. 🛡️💪

\---

**FIN DEL HANDOFF.**

