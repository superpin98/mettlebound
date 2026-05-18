# GRIMSPIRE Asset Pack — AI Lookup Index

> If you're an AI assistant placing sprites in Unity, **read this file first**.
> Resolve any descriptive query (rarity, animation, role) to an exact file path.

## 0 · How paths work

```
STATIC sprites          : icons/<category>/<name>_4x.png
RARITY-RECOLOR (static) : icons-rarity/<name>/<name>_<rarity>_4x.png
ANIMATED icon           : animated/icons/<name>_anim_sheet_4x.png
ANIMATED rarity         : animated/rarity/<name>/<name>_<rarity>_sheet_4x.png
ANIMATED legendary      : animated/legendary/<name>_sheet_4x.png
ANIMATED status badge   : animated/status/<effect>_anim_sheet_4x.png
ANIMATED map token      : animated/map-tokens/<type>_current_anim_sheet_4x.png
ANIMATED skill node     : animated/skill-nodes/<branch>_<state>_anim_sheet_4x.png
ANIMATED cursor         : animated/cursors/<kind>_anim_sheet_4x.png
ANIMATED particle       : animated/particles/<kind>_anim_sheet_4x.png
STATIC panel (9-slice)  : panels/panel_<chrome>_<size>.png
STATIC slot             : slots/slot_<rarity>_<size>.png
STATIC bar fill         : bars/bar_<kind>_fill_<W>x<H>.png
STATIC button           : buttons/btn_<kind>_<W>x<H>.png
STATIC portrait         : portraits/portrait_<class>_4x.png
STATIC prop             : props/prop_<name>_4x.png
STATIC tile             : decor/iso_tile_<material>_64.png
```

**Every animated PNG has a matching `.json` sidecar** in the same folder with frame coords, fps, and Unity slice config.

## 1 · Vocabulary

| Token | Allowed values |
|---|---|
| `<rarity>`   | `common`, `uncommon`, `rare`, `mythic`, `cursed`, `relic` |
| `<chrome>`   | `bronze`, `iron`, `blood`, `bone` |
| `<size>` (panel) | `128`, `192`, `256`, `384`, `512x192` |
| `<size>` (slot)  | `48`, `64`, `96` |
| `<kind>` (bar)   | `hp`, `stamina`, `mana`, `xp`, `shield` |
| `<kind>` (button)| `default`, `primary`, `danger`, `ghost` |
| `<class>`        | `knight`, `witch`, `monk`, `rogue` |
| `<material>` (tile)| `shadow`, `wood`, `leather`, `moss`, `iron` |
| `<effect>` (status)| `fury`, `blessed`, `bleed`, `shielded`, `poison`, `burning`, `haste`, `chilled`, `cursed` |
| `<type>` (map)   | `start`, `combat`, `elite`, `event`, `shrine`, `shop`, `cursed`, `boss`, `rest`, `chest` |
| `<branch>` (skill)| `core`, `steel`, `penance`, `smoke`, `cursed` |
| `<state>` (skill)| `locked`, `available`, `unlocked` |
| `<kind>` (cursor)| `default`, `click`, `target` |
| `<kind>` (particle)| `ember`, `sparkle`, `blood`, `smoke`, `mana`, `soul` |
| `<name>` (legendary)| `dreadblade`, `reaperScythe`, `archonWand` |

## 2 · Intent → Path lookup

Use this table when the user gives you a *description* and you need to find the file.

### Weapons / items by intent

| User says… | Path |
|---|---|
| "common sword icon"            | `icons/weapons/sword_4x.png` |
| "rare sword icon" (static)     | `icons-rarity/sword/sword_rare_4x.png` |
| "rare sword **animated**"      | `animated/rarity/sword/sword_rare_sheet_4x.png` |
| "mythic sword animated"        | `animated/rarity/sword/sword_mythic_sheet_4x.png` |
| "cursed sword animated"        | `animated/rarity/sword/sword_cursed_sheet_4x.png` |
| "relic sword animated" (top tier) | `animated/rarity/sword/sword_relic_sheet_4x.png` |
| "legendary sword"              | `animated/legendary/dreadblade_sheet_4x.png` |
| "legendary scythe"             | `animated/legendary/reaperScythe_sheet_4x.png` |
| "legendary wand"               | `animated/legendary/archonWand_sheet_4x.png` |
| "shield (any rarity)"          | base: `icons/armor/shield_4x.png`, rarity: `icons-rarity/shield/shield_<rarity>_4x.png` |
| "animated potion"              | `animated/icons/potion_anim_sheet_4x.png` |
| "animated mana flask"          | `animated/icons/flask_anim_sheet_4x.png` |
| "animated spinning coin"       | `animated/icons/coin_anim_sheet_4x.png` |
| "animated heartbeat heart"     | `animated/icons/heart_anim_sheet_4x.png` |
| "blinking eye icon"            | `animated/icons/eye_anim_sheet_4x.png` |
| "flickering flame icon"        | `animated/icons/flame_anim_sheet_4x.png` |

### HUD / status

| User says… | Path |
|---|---|
| "HP bar fill"                  | `bars/bar_hp_fill_256x16.png` (small: `bar_hp_fill_128x12.png`) |
| "boss healthbar frame"         | `bars/boss_bar_480x32.png` |
| "fury buff badge animated"     | `animated/status/fury_anim_sheet_4x.png` |
| "bleed debuff badge animated"  | `animated/status/bleed_anim_sheet_4x.png` |
| "burning DoT badge animated"   | `animated/status/burning_anim_sheet_4x.png` |
| "poison badge animated"        | `animated/status/poison_anim_sheet_4x.png` |
| "chilled / slow badge"         | `animated/status/chilled_anim_sheet_4x.png` |
| "shielded buff badge"          | `animated/status/shielded_anim_sheet_4x.png` |
| "haste / speed badge"          | `animated/status/haste_anim_sheet_4x.png` |
| "blessed buff badge"           | `animated/status/blessed_anim_sheet_4x.png` |
| "cursed debuff badge"          | `animated/status/cursed_anim_sheet_4x.png` |

### Map / dungeon

| User says… | Path |
|---|---|
| "combat map node (current)"    | `animated/map-tokens/combat_current_anim_sheet_4x.png` |
| "boss node animated"           | `animated/map-tokens/boss_current_anim_sheet_4x.png` |
| "shop node animated"           | `animated/map-tokens/shop_current_anim_sheet_4x.png` |
| "shrine node animated"         | `animated/map-tokens/shrine_current_anim_sheet_4x.png` |
| "cursed altar node"            | `animated/map-tokens/cursed_current_anim_sheet_4x.png` |
| "elite enemy node"             | `animated/map-tokens/elite_current_anim_sheet_4x.png` |
| "event/mystery node"           | `animated/map-tokens/event_current_anim_sheet_4x.png` |
| "campfire / rest node"         | `animated/map-tokens/rest_current_anim_sheet_4x.png` |
| "chest node"                   | `animated/map-tokens/chest_current_anim_sheet_4x.png` |
| "starting node"                | `animated/map-tokens/start_current_anim_sheet_4x.png` |
| "cleared node (no anim)"       | `map-tokens/<type>_cleared_4x.png` |

### Skill tree

| User says… | Path |
|---|---|
| "available skill node, steel branch" | `animated/skill-nodes/steel_available_anim_sheet_4x.png` |
| "unlocked penance node"        | `animated/skill-nodes/penance_unlocked_anim_sheet_4x.png` |
| "cursed branch keystone"       | static: `skill-nodes/cursed_keystone_4x.png` |
| "locked node (any branch)"     | `skill-nodes/<branch>_locked_4x.png` (static) |

### Cursors

| User says… | Path |
|---|---|
| "default cursor"               | `cursors/cursor_default_4x.png` (static) |
| "interactable / click cursor"  | `animated/cursors/click_anim_sheet_4x.png` |
| "combat target / crosshair"    | `animated/cursors/target_anim_sheet_4x.png` |

### Particles / FX

| User says… | Path |
|---|---|
| "ember rising particle"        | `animated/particles/ember_anim_sheet_4x.png` |
| "loot sparkle particle"        | `animated/particles/sparkle_anim_sheet_4x.png` |
| "blood splat hit effect"       | `animated/particles/blood_anim_sheet_4x.png` |
| "smoke puff"                   | `animated/particles/smoke_anim_sheet_4x.png` |
| "mana wisp"                    | `animated/particles/mana_anim_sheet_4x.png` |
| "soul orb pickup"              | `animated/particles/soul_anim_sheet_4x.png` |

### UI chrome (static)

| User says… | Path |
|---|---|
| "inventory panel background"   | `panels/panel_bronze_256.png` (9-slice, border 24px) |
| "tooltip background"           | `panels/panel_bronze_192.png` |
| "blood / cursed panel"         | `panels/panel_blood_256.png` |
| "iron panel"                   | `panels/panel_iron_256.png` |
| "rare inventory slot"          | `slots/slot_rare_64.png` |
| "mythic slot"                  | `slots/slot_mythic_64.png` |
| "primary CTA button"           | `buttons/btn_primary_220x48.png` (also 160x40, 280x56) |
| "danger / forsake button"      | `buttons/btn_danger_220x48.png` |
| "default button"               | `buttons/btn_default_220x48.png` |
| "ghost / secondary button"     | `buttons/btn_ghost_220x48.png` |

### Class / world

| User says… | Path |
|---|---|
| "knight portrait"              | `portraits/portrait_knight_4x.png` |
| "witch portrait"               | `portraits/portrait_witch_4x.png` |
| "monk portrait"                | `portraits/portrait_monk_4x.png` |
| "rogue portrait"               | `portraits/portrait_rogue_4x.png` |
| "cathedral pillar prop"        | `props/prop_pillar_4x.png` |
| "stone archway"                | `props/prop_arch_4x.png` |
| "tombstone"                    | `props/prop_tombstone_4x.png` |
| "hanging banner"               | `props/prop_banner_4x.png` |
| "wall lantern with flame"      | `props/prop_lantern_4x.png` |
| "spellbook / tome"             | `props/prop_tome_4x.png` |
| "bubbling cauldron"            | `props/prop_cauldron_4x.png` |
| "royal crown"                  | `props/prop_crown_4x.png` |
| "stone iso floor tile"         | `decor/iso_tile_shadow_64.png` |
| "moss tile"                    | `decor/iso_tile_moss_64.png` |

## 3 · Unity setup quick reference

```
GLOBAL DEFAULTS for every sprite import:
  Texture Type    : Sprite (2D and UI)
  Pixels Per Unit : 32   (portraits + legendary: 48)
  Filter Mode     : Point (no filter)   ← critical for pixel art
  Compression     : None
```

**For panels** (`panels/panel_*.png`): Sprite Mode = Single, then Sprite Editor → Border 24/24/24/24, Image Type = Sliced.

**For animated spritesheets** (anything under `animated/`): Sprite Mode = Multiple, then Sprite Editor → Slice → Grid By Cell Count → C = `frame_count`, R = 1. Read the matching `.json` sidecar for exact frame count, fps, pivot, and Animator clip name.

**For bar fills** (`bars/bar_*_fill_*.png`): UI Image component → Image Type = Filled, Fill Method = Horizontal, then drive `fillAmount` from your value 0..1.

