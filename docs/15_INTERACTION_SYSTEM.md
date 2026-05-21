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

(Esta tabla se actualizara conforme entren las categorias)
