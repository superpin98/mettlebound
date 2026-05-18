GRIMSPIRE — Polished Asset Pack
================================
Hand-crafted 32×32 pixel-art sprites with 4-tone shading and 1-px outlines.
Exported as transparent-background PNGs at the chosen pixel-scale (default 4×).

How to use in Unity
-------------------
1. Drop this folder into Assets/Art/Sprites/.
2. Select all PNGs → Inspector:
     Texture Type:    Sprite (2D and UI)
     Pixels Per Unit: 32   (one sprite = 1 unit at native resolution)
     Filter Mode:     Point (no filter)   ← critical for pixel art
     Compression:     None
   Click Apply.
3. For panel_*.png → Sprite Editor → set Border to 24/24/24/24 (9-slice).
4. For bar_*_fill_*.png → on the UI Image component, Image Type = Filled,
   Fill Method = Horizontal, then drive Fill Amount from your value 0–1.
5. For icons-rarity/<name>/ — pre-baked color variants for every rarity.
   Use these directly OR keep just the parchment-tone one in icons/ and tint
   via Image.color in Unity (cheaper, fewer atlas slots).

Folder layout
-------------
  manifest.json  ★ machine-readable catalogue (see "Naming + placement" below)
  PLACEMENT.md   ★ human-readable screen-by-screen guide
  icons/         all 30 icons in their base material palette
  icons-rarity/  the same icons recolored per rarity (common…relic)
  slots/         inventory slot frames, 6 rarities × 3 sizes
  panels/        9-slice frames (bronze / iron / blood / bone)
  buttons/       pre-baked button states (default / primary / danger / ghost)
  bars/          resource bar frames + 5 gradient fills (hp/stamina/mana/xp/shield)
  decor/         worldspace isometric floor tiles
  status/        combat effect badges (fury / blessed / bleed / poison / haste / chilled / cursed / etc)
  map-tokens/    branching-map node tokens × 3 states (normal / current / cleared)
  skill-nodes/   talent tree diamond nodes × 5 branches × 3 states + keystone variants
  portraits/     48×48 class portrait busts (Knight / Witch / Monk / Rogue)
  cursors/       in-game cursors (default / click / target)
  particles/     effect sprites (ember / sparkle / blood / smoke / mana / soul)
  props/         world set-dressing (pillar / arch / tombstone / banner / lantern / tome / cauldron / crown)
  ornaments/     dividers + level badge frames
  TOKENS.txt     full color palette + type stack

Naming + placement (so any AI assistant or you can find the right sprite)
------------------------------------------------------------------------
Every filename is structured: <category>/<name>_<modifiers>_<scale>x.png
  e.g. icons-rarity/sword/sword_mythic_4x.png
       map-tokens/boss_current_4x.png
       skill-nodes/cursed_keystone_4x.png

Every asset also has an entry in manifest.json with:
  - id            : stable identifier ("icon_sword", "slot_mythic_64", ...)
  - path          : where the PNG lives in this folder
  - name          : human-readable label
  - intended_use  : one-sentence design intent
  - placement     : list of screens / HUD anchors where the design uses it
                    (e.g. ["hud.top_left_portrait", "class_select.card"])
  - unity         : recommended Unity import settings (image_type, 9-slice borders, PPU)
  - tags          : free-form tags ("weapon", "rare", "tintable", ...)

The "screens" object at the top of manifest.json maps every screen
(title_screen, hud, inventory, skill_tree, map, ...) to the asset ids it
expects in each layout anchor. Read that section first if you're handing
the pack to an AI tool — it tells the tool where to put what.

Materials
---------
Every icon is shaded with a 4-tone palette per material — steel, wood, gold,
bronze, iron, leather, parchment, red/blood, blue, bone, cloth/purple,
ember/fire. Outline is a deep void tone (#0a0510), not pure black, so the
sprites read cleanly on both dark and light backdrops.
