# Sistema de Interacción - Mettlebound

## Que es esto

Catalogo canonico de vectores de interaccion que rigen todas
las interacciones del juego (combate, ambiente, props, items,
estados, buffs). Inspirado en BG3, Caves of Qud, Noita,
RimWorld, CK3.

## Fuente de verdad

Los datos viven en `data/interaction_vectors.json`. Este
documento es la vista humana legible generada a partir de
ese JSON. Si hay discrepancia, gana el JSON.

## Como leer este documento

- Cada categoria agrupa vectores conceptualmente relacionados
- Cada vector tiene: id, nombre, descripcion, generadores
  tipicos, receptores afectados, resistencias tipicas, notas
  de diseno, nota de implementacion
- Convencion de IDs: snake_case con prefijo de categoria
  (ej: physical_external_slash_light)

## Indice

### Parte A - Categorias de vectores

(Pendiente de poblado conforme David genere las categorias
en chat web. Estructura prevista: 30+ categorias)

### Parte B - Secciones especiales

- B1: Combinaciones emergentes notables
- B2: Mapa de resistencias por raza (5 razas iniciales)
- B3: Buffs/Debuffs unicos
- B4: Propuestas creativas adicionales
- B5: Sistema y convenciones (este documento)

## Estado actual

| # | Nombre | category_id | Vectores | Estado |
|---|---|---|---|---|
| 1 | Daño físico externo | physical_external | 28 | ✅ Poblado |
| 2 | Daño físico interno | physical_internal | 12 | ✅ Poblado |
| 3 | Daño físico estructural | physical_structural | 14 | ✅ Poblado |
| 4 | Daño elemental — Fuego | elemental_fire | 16 | ✅ Poblado |
| 5 | Daño elemental — Frío | elemental_cold | 12 | ✅ Poblado |
| 6 | Daño elemental — Eléctrico | elemental_electric | 12 | ✅ Poblado |
| 7 | Daño elemental — Ácido / Corrosivo | elemental_acid | 10 | ✅ Poblado |
| 8 | Daño elemental — Veneno / Orgánico | elemental_poison | 14 | ✅ Poblado |
| 9 | Daño elemental — Tierra / Sísmico | elemental_earth | 6 | ✅ Poblado |
| 9b | Daño elemental — Aire / Vacío / Sónico letal | elemental_air | 6 | ✅ Poblado |
| 9c | Daño elemental — Agua / Presión | elemental_water | 4 | ✅ Poblado |
| 9d | Daño elemental — Luz / Oscuridad puras | elemental_light_dark | 6 | ✅ Poblado |
| 10 | Daño exótico — Psíquico / Mental | exotic_psychic | 14 | ✅ Poblado |
| 11 | Daño exótico — Sagrado / Oscuro | exotic_sacred_dark | 12 | ✅ Poblado |
| 12 | Daño exótico — Temporal / Dimensional | exotic_temporal_dimensional | 10 | ✅ Poblado |
| 13 | Daño exótico — Gravitacional | exotic_gravity | 8 | ✅ Poblado |
| 14 | Daño sostenido / Estados de daño | sustained_damage | 15 | ✅ Poblado |
| 15 | Movimiento forzado | forced_movement | 19 | ✅ Poblado |
| 16 | Modificación de iluminación | light_modification | 18 | ✅ Poblado |
| 17 | Modificación de terreno | terrain_modification | 18 | ✅ Poblado |
| 18 | Estados físicos negativos | physical_negative_states | 18 | ✅ Poblado |
| 19 | Estados físicos positivos | physical_positive_states | 10 | ✅ Poblado |
| 20 | Estados mentales negativos | mental_negative_states | 18 | ✅ Poblado |
| 21 | Estados mentales positivos | mental_positive_states | 8 | ✅ Poblado |
| 22 | Modificación de stats (temporal) | stat_modification_temporary | 20 | ✅ Poblado |
| 23 | Modificación de stats (permanente / run) | stat_modification_permanent_run | 10 | ✅ Poblado |
| 24 | Vectores de sigilo / Detección | stealth_detection | 16 | ✅ Poblado |
| 25 | Vectores de curación y soporte | healing_support | 16 | ✅ Poblado |
| 26 | Vectores de control mental / Influencia | mental_influence | 12 | ✅ Poblado |
| 27 | Vectores químicos / Fluidos combinables | chemical_fluids | 16 | ✅ Poblado |
| 28 | Vectores meta-físicos | metaphysical | 10 | ✅ Poblado |
| 29 | Vectores de sonido / Vibración (no letal) | sound_non_lethal | 10 | ✅ Poblado |
| 30 | Vectores de temperatura ambiental | ambient_temperature | 8 | ✅ Poblado |
| 31 | Vectores metabólicos / Nutricionales | metabolic_nutritional | 8 | ✅ Poblado |

(Esta tabla se actualizara conforme entren las categorias)
