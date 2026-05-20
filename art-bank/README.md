# Art Bank

Banco de assets para items únicos / legendarios destinados a Sprint 17+ (Contenido y Rejugabilidad).

## Filosofía

Los assets aquí **NO se cargan en el juego automáticamente**. Esta carpeta es un *staging* fuera de `public/assets/`. Vite no la sirve. Solo cuando un item se "promueve" se mueve (o se referencia) desde `public/assets/`.

## Estructura

- `_index.json` — catálogo consultable de todos los assets del banco
- `legendary-items/` — items únicos categorizados
  - `weapons/` — armas (subcategorizadas por tipo)
  - `armor/` — armaduras
  - `accessories/` — anillos, amuletos, capas
  - `consumables/` — pociones únicas, etc.

## Cada item tiene su carpeta con:

- `model.glb` — el asset 3D
- `meta.json` — metadatos (rareza, slot, clases compatibles, datos técnicos, licencia)
- `preview.png` — screenshot del asset (opcional)

## Esquema de meta.json

Ver `legendary-items/weapons/swords-1h/sword_of_the_black_vow/meta.json` como ejemplo de referencia.

## Promoción a juego real (Sprint 17+)

Cuando un item esté listo para entrar al juego:
1. Mover/copiar el `model.glb` a `public/assets/items/legendary/`
2. Actualizar `meta.json` con `"promoted": true`
3. Registrar en el `LegendaryItemRegistry` del juego
4. Actualizar `_index.json` del banco
