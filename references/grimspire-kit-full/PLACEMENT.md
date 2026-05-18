# GRIMSPIRE — Placement Guide

Generated 2026-05-16 · 183 assets

## How to use this guide
Every sprite in this pack has a stable `id` (e.g. `icon_sword`, `slot_mythic_64`) and an explicit "screens" tag listing where the design intends it to appear. `manifest.json` contains the same data as this file in a machine-readable format — use it when wiring assets to Unity components programmatically.

## Screens

### title_screen
Main menu / title with cathedral backdrop, sigil rings, ember particles.

- **background** → props/prop_pillar, props/prop_arch, particles/particle_ember
- **logo_decor** → ornaments/divider_*, decor/sigil_ring_*
- **buttons** → buttons/btn_primary_*, buttons/btn_ghost_*

### class_select
Vessel/class picker. Portrait cards + stat pips + signature ability.

- **portraits** → portraits/portrait_knight, portraits/portrait_witch, portraits/portrait_monk, portraits/portrait_rogue
- **card_frames** → panels/panel_bronze_*, slots/slot_mythic_*
- **weapon_glyphs** → icons/weapons/sword, icons/weapons/staff, icons/armor/shield, icons/weapons/dagger
- **confirm_buttons** → buttons/btn_primary_280x56, buttons/btn_ghost_*

### hud
In-game heads-up display. Persistent during exploration + combat.

- **top_left_portrait** → portraits/portrait_*, ornaments/level_badge_*
- **top_left_bars** → bars/bar_frame_256x24, bars/bar_hp_fill_*, bars/bar_stamina_fill_*, bars/bar_mana_fill_*
- **top_left_status** → status/badge_*
- **top_center** → ornaments/divider_*
- **top_right_minimap** → panels/panel_bronze_192, map-tokens/*
- **bottom_left_abilities** → slots/slot_*_64, icons/weapons/sword, icons/armor/shield, icons/ui/star, icons/ui/heart
- **bottom_right_consumables** → slots/slot_*_48, icons/consum/potion, icons/consum/flask, icons/consum/scroll
- **bottom_center_currency** → icons/treasure/coin, icons/treasure/gem, icons/bestiary/skull
- **bottom_center_prompt** → buttons/btn_primary_*
- **boss_fight** → bars/boss_bar_480x32
- **damage_numbers** → damage/*

### inventory
Pack & vestments grid. Paperdoll on left, item grid center, detail right.

- **panel** → panels/panel_bronze_*
- **slot_grid** → slots/slot_*_64, slots/slot_*_48
- **items** → icons/*
- **equipped_marker** → icons/ui/star
- **action_buttons** → buttons/btn_*

### skill_tree
Sworn oaths talent tree. Diamond nodes connected by paths.

- **nodes** → skill-nodes/*
- **branch_separators** → ornaments/divider_*
- **cost_indicator** → icons/ui/star, icons/bestiary/skull
- **confirm** → buttons/btn_primary_*

### map
Branching dungeon map. Floors arranged left → right with node icons.

- **nodes** → map-tokens/*
- **boss_marker** → map-tokens/boss_*
- **rewards** → icons/treasure/*
- **legend** → icons/*

### loot
Three-card boon pick. Mythic / rare / cursed card with rarity ribbon.

- **cards** → panels/panel_bronze_256x128, panels/panel_blood_256
- **item_icons** → icons/*
- **rarity_rings** → decor/sigil_ring_*
- **actions** → buttons/btn_primary_*

### pause
Pause overlay with cathedral gate bars.

- **panel** → panels/panel_bronze_*
- **gate_bars** → props/prop_pillar
- **buttons** → buttons/btn_*

### game_over
"YOU DIED" run summary. Blood drips, tally panels, rewards earned.

- **tally_panels** → panels/panel_blood_256
- **notable_items** → slots/slot_*, icons/*
- **rewards** → icons/treasure/coin, icons/bestiary/skull, icons/treasure/gem
- **retry_buttons** → buttons/btn_primary_*, buttons/btn_ghost_*

### hub_sanctuary
Meta-progression between runs. Forge / Altar / Crypt / Merchant / Codex wings.

- **wing_icons** → icons/weapons/sword, icons/ui/star, icons/armor/shield, icons/treasure/coin, icons/consum/scroll
- **upgrade_cards** → panels/panel_bronze_*
- **currency** → icons/treasure/coin, icons/bestiary/skull, icons/treasure/gem
- **props** → props/prop_cauldron, props/prop_tome, props/prop_lantern, props/prop_banner

### settings
Display / Audio / Controls / Accessibility / About tabs.

- **panel** → panels/panel_bronze_*
- **tabs** → ornaments/divider_*
- **toggles_sliders** → (programmatic in Unity UI)
- **back_apply** → buttons/btn_*

### cursors
Mouse cursors swapped per context.

- **default** → cursors/cursor_default
- **interactable** → cursors/cursor_click
- **combat_target** → cursors/cursor_target


## Asset catalogue (by category)

### icon/weapons  (6 sprites)
- `icon_sword` — **Sword** · One-handed melee weapon icon.
  - path: `icons/weapons/sword_4x.png`
  - screens: inventory.weapon_slot, hud.ability_bar, loot.weapon_card
  - rarity variants: `icons-rarity/sword/sword_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_greatsword` — **Greatsword** · Two-handed heavy weapon icon.
  - path: `icons/weapons/greatsword_4x.png`
  - screens: inventory.weapon_slot, loot.weapon_card
  - rarity variants: `icons-rarity/greatsword/greatsword_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_dagger` — **Dagger** · Off-hand / rogue weapon icon.
  - path: `icons/weapons/dagger_4x.png`
  - screens: inventory.weapon_slot, class_select.rogue
  - rarity variants: `icons-rarity/dagger/dagger_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_staff` — **Staff** · Mage/witch weapon icon.
  - path: `icons/weapons/staff_4x.png`
  - screens: inventory.weapon_slot, class_select.witch
  - rarity variants: `icons-rarity/staff/staff_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_axe` — **Axe** · Heavy chopping weapon icon.
  - path: `icons/weapons/axe_4x.png`
  - screens: inventory.weapon_slot
  - rarity variants: `icons-rarity/axe/axe_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_bow` — **Bow** · Ranged weapon icon.
  - path: `icons/weapons/bow_4x.png`
  - screens: inventory.weapon_slot
  - rarity variants: `icons-rarity/bow/bow_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`

### icon/armor  (6 sprites)
- `icon_shield` — **Shield** · Block/defense icon.
  - path: `icons/armor/shield_4x.png`
  - screens: inventory.shield_slot, class_select.knight, hud.ability_bar
  - rarity variants: `icons-rarity/shield/shield_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_helm` — **Helm** · Head armor icon.
  - path: `icons/armor/helm_4x.png`
  - screens: inventory.helm_slot
  - rarity variants: `icons-rarity/helm/helm_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_boot` — **Boots** · Foot armor icon.
  - path: `icons/armor/boot_4x.png`
  - screens: inventory.boot_slot
  - rarity variants: `icons-rarity/boot/boot_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_ring` — **Ring** · Trinket icon.
  - path: `icons/armor/ring_4x.png`
  - screens: inventory.ring_slot
  - rarity variants: `icons-rarity/ring/ring_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_amulet` — **Amulet** · Neck/trinket icon.
  - path: `icons/armor/amulet_4x.png`
  - screens: inventory.amulet_slot
  - rarity variants: `icons-rarity/amulet/amulet_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_cape` — **Cape** · Back/cloak icon.
  - path: `icons/armor/cape_4x.png`
  - screens: inventory.cape_slot
  - rarity variants: `icons-rarity/cape/cape_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`

### icon/consum  (3 sprites)
- `icon_potion` — **Health Potion** · Healing consumable icon.
  - path: `icons/consum/potion_4x.png`
  - screens: hud.consumable_slot, inventory.consumable
- `icon_flask` — **Mana Flask** · Mana consumable icon.
  - path: `icons/consum/flask_4x.png`
  - screens: hud.consumable_slot, inventory.consumable
- `icon_scroll` — **Scroll** · Single-use spell scroll icon.
  - path: `icons/consum/scroll_4x.png`
  - screens: hud.consumable_slot, inventory.consumable

### icon/treasure  (5 sprites)
- `icon_coin` — **Gold Coin** · Soft currency icon.
  - path: `icons/treasure/coin_4x.png`
  - screens: hud.currency, hub.merchant
  - rarity variants: `icons-rarity/coin/coin_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_gem` — **Gem** · Rare material icon.
  - path: `icons/treasure/gem_4x.png`
  - screens: inventory.material, loot.rare_drop
  - rarity variants: `icons-rarity/gem/gem_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_largegem` — **Large Gem** · Premium currency / pale ash.
  - path: `icons/treasure/largegem_4x.png`
  - screens: hud.currency, hub.altar
  - rarity variants: `icons-rarity/largegem/largegem_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_chest` — **Treasure Chest** · Interactable loot container.
  - path: `icons/treasure/chest_4x.png`
  - screens: hud.world_prompt, map.chest_node
- `icon_key` — **Key** · Quest / lock-opener icon.
  - path: `icons/treasure/key_4x.png`
  - screens: inventory.quest
  - rarity variants: `icons-rarity/key/key_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`

### icon/bestiary  (4 sprites)
- `icon_skull` — **Skull** · Souls currency / kill counter.
  - path: `icons/bestiary/skull_4x.png`
  - screens: hud.currency, hud.kill_count
  - rarity variants: `icons-rarity/skull/skull_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_bones` — **Crossed Bones** · Death/cursed marker.
  - path: `icons/bestiary/bones_4x.png`
  - screens: codex.death_tally
- `icon_eye` — **Eye** · Reveal / vision symbol.
  - path: `icons/bestiary/eye_4x.png`
  - screens: skill_tree.smoke_branch
  - rarity variants: `icons-rarity/eye/eye_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_flame` — **Flame** · Fire / burning effect symbol.
  - path: `icons/bestiary/flame_4x.png`
  - screens: hud.status_burning, skill_tree.penance
  - rarity variants: `icons-rarity/flame/flame_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`

### icon/ui  (6 sprites)
- `icon_heart` — **Heart** · Health / life symbol.
  - path: `icons/ui/heart_4x.png`
  - screens: hud.health_indicator, inventory.relic
  - rarity variants: `icons-rarity/heart/heart_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_star` — **Star** · Oath / talent / favor symbol.
  - path: `icons/ui/star_4x.png`
  - screens: skill_tree.cost, hub.unlock_marker
  - rarity variants: `icons-rarity/star/star_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_cross` — **Cross** · Holy / shrine symbol.
  - path: `icons/ui/cross_4x.png`
  - screens: map.shrine_node, hud.status_blessed
  - rarity variants: `icons-rarity/cross/cross_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_ankh` — **Ankh** · Revive / immortality symbol.
  - path: `icons/ui/ankh_4x.png`
  - screens: skill_tree.keystone_revive
  - rarity variants: `icons-rarity/ankh/ankh_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_arrow` — **Arrow** · Direction / haste indicator.
  - path: `icons/ui/arrow_4x.png`
  - screens: hud.status_haste, map.path_arrow
  - rarity variants: `icons-rarity/arrow/arrow_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`
- `icon_lock` — **Lock** · Locked content marker.
  - path: `icons/ui/lock_4x.png`
  - screens: hub.locked_wing, skill_tree.locked_node
  - rarity variants: `icons-rarity/lock/lock_<rarity>_4x.png  (rarity: common|uncommon|rare|mythic|cursed|relic)`

### ui/slot  (18 sprites)
- `slot_common_48` — **Common slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_common_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_common_64` — **Common slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_common_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_common_96` — **Common slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_common_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_uncommon_48` — **Uncommon slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_uncommon_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_uncommon_64` — **Uncommon slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_uncommon_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_uncommon_96` — **Uncommon slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_uncommon_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_rare_48` — **Rare slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_rare_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_rare_64` — **Rare slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_rare_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_rare_96` — **Rare slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_rare_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_mythic_48` — **Mythic slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_mythic_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_mythic_64` — **Mythic slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_mythic_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_mythic_96` — **Mythic slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_mythic_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_cursed_48` — **Cursed slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_cursed_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_cursed_64` — **Cursed slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_cursed_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_cursed_96` — **Cursed slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_cursed_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_relic_48` — **Relic slot (48px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_relic_48.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_relic_64` — **Relic slot (64px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_relic_64.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card
- `slot_relic_96` — **Relic slot (96px)** · Inventory/hotbar/ability slot frame. Item icon goes on top.
  - path: `slots/slot_relic_96.png`
  - screens: inventory.grid, hud.ability_bar, hud.consumable_bar, loot.card

### ui/panel  (20 sprites)
- `panel_bronze_128` — **Bronze panel (128²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bronze_128.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bronze_192` — **Bronze panel (192²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bronze_192.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bronze_256` — **Bronze panel (256²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bronze_256.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bronze_384` — **Bronze panel (384²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bronze_384.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bronze_wide` — **Bronze panel (wide)** · 9-slice wide banner/tooltip frame.
  - path: `panels/panel_bronze_512x192.png`
  - screens: menu.banner, tooltip.wide
  - Unity: Sliced (border 24/24/24/24px)
- `panel_iron_128` — **Iron panel (128²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_iron_128.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_iron_192` — **Iron panel (192²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_iron_192.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_iron_256` — **Iron panel (256²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_iron_256.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_iron_384` — **Iron panel (384²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_iron_384.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_iron_wide` — **Iron panel (wide)** · 9-slice wide banner/tooltip frame.
  - path: `panels/panel_iron_512x192.png`
  - screens: menu.banner, tooltip.wide
  - Unity: Sliced (border 24/24/24/24px)
- `panel_blood_128` — **Blood panel (128²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_blood_128.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_blood_192` — **Blood panel (192²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_blood_192.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_blood_256` — **Blood panel (256²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_blood_256.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_blood_384` — **Blood panel (384²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_blood_384.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_blood_wide` — **Blood panel (wide)** · 9-slice wide banner/tooltip frame.
  - path: `panels/panel_blood_512x192.png`
  - screens: menu.banner, tooltip.wide
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bone_128` — **Bone panel (128²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bone_128.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bone_192` — **Bone panel (192²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bone_192.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bone_256` — **Bone panel (256²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bone_256.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bone_384` — **Bone panel (384²)** · 9-slice background frame for menus, cards, tooltips. Stretches to any size.
  - path: `panels/panel_bone_384.png`
  - screens: inventory.background, menu.window, tooltip, loot.card
  - Unity: Sliced (border 24/24/24/24px)
- `panel_bone_wide` — **Bone panel (wide)** · 9-slice wide banner/tooltip frame.
  - path: `panels/panel_bone_512x192.png`
  - screens: menu.banner, tooltip.wide
  - Unity: Sliced (border 24/24/24/24px)

### ui/button  (12 sprites)
- `btn_default_160x40` — **Default button (160×40)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_default_160x40.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_default_220x48` — **Default button (220×48)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_default_220x48.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_default_280x56` — **Default button (280×56)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_default_280x56.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_primary_160x40` — **Primary button (160×40)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_primary_160x40.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_primary_220x48` — **Primary button (220×48)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_primary_220x48.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_primary_280x56` — **Primary button (280×56)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_primary_280x56.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_danger_160x40` — **Danger button (160×40)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_danger_160x40.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_danger_220x48` — **Danger button (220×48)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_danger_220x48.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_danger_280x56` — **Danger button (280×56)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_danger_280x56.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_ghost_160x40` — **Ghost button (160×40)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_ghost_160x40.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_ghost_220x48` — **Ghost button (220×48)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_ghost_220x48.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt
- `btn_ghost_280x56` — **Ghost button (280×56)** · Click target. Primary = call-to-action, Default = neutral, Danger = destructive (Forsake Run, Discard), Ghost = secondary nav.
  - path: `buttons/btn_ghost_280x56.png`
  - screens: menu.actions, tooltip.confirm, hud.world_prompt

### ui/bar_fill  (10 sprites)
- `bar_hp_256x16` — **HP bar fill (256×16)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_hp_fill_256x16.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_hp_128x12` — **HP bar fill (128×12)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_hp_fill_128x12.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_stamina_256x16` — **STAMINA bar fill (256×16)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_stamina_fill_256x16.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_stamina_128x12` — **STAMINA bar fill (128×12)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_stamina_fill_128x12.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_mana_256x16` — **MANA bar fill (256×16)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_mana_fill_256x16.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_mana_128x12` — **MANA bar fill (128×12)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_mana_fill_128x12.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_xp_256x16` — **XP bar fill (256×16)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_xp_fill_256x16.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_xp_128x12` — **XP bar fill (128×12)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_xp_fill_128x12.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_shield_256x16` — **SHIELD bar fill (256×16)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_shield_fill_256x16.png`
  - screens: hud.top_left_bars
  - Unity: Filled
- `bar_shield_128x12` — **SHIELD bar fill (128×12)** · Resource bar gradient fill. Use Unity Image Type=Filled, FillMethod=Horizontal, then drive Fill Amount from your stat 0..1.
  - path: `bars/bar_shield_fill_128x12.png`
  - screens: hud.top_left_bars
  - Unity: Filled

### ui/bar_frame  (3 sprites)
- `bar_frame_256x24` — **Bar frame 256x24** · Frame around a resource bar. Place behind the fill.
  - path: `bars/bar_frame_256x24.png`
  - screens: hud.top_left_bars
- `bar_frame_128x16` — **Bar frame 128x16** · Frame around a resource bar. Place behind the fill.
  - path: `bars/bar_frame_128x16.png`
  - screens: hud.top_left_bars
- `boss_bar` — **Boss healthbar (480×32)** · Ornate boss-fight healthbar frame. Use with bar_hp_fill_* on top.
  - path: `bars/boss_bar_480x32.png`
  - screens: hud.boss_fight

### ui/status_badge  (9 sprites)
- `status_fury` — **Fury status badge** · Damage-boost buff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_fury_4x.png`
  - screens: hud.top_left_status
- `status_blessed` — **Blessed status badge** · Holy / damage-reduction buff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_blessed_4x.png`
  - screens: hud.top_left_status
- `status_bleed` — **Bleed status badge** · DoT bleed debuff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_bleed_4x.png`
  - screens: hud.top_left_status
- `status_shielded` — **Shielded status badge** · Damage-absorb shield buff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_shielded_4x.png`
  - screens: hud.top_left_status
- `status_poison` — **Poison status badge** · Poison DoT debuff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_poison_4x.png`
  - screens: hud.top_left_status
- `status_burning` — **Burning status badge** · Fire DoT debuff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_burning_4x.png`
  - screens: hud.top_left_status
- `status_haste` — **Haste status badge** · Move/attack-speed buff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_haste_4x.png`
  - screens: hud.top_left_status
- `status_chilled` — **Chilled status badge** · Slow debuff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_chilled_4x.png`
  - screens: hud.top_left_status
- `status_cursed` — **Cursed status badge** · Status curse / unholy debuff. Stack horizontally under the HP bar. Optionally overlay a remaining-duration text.
  - path: `status/badge_cursed_4x.png`
  - screens: hud.top_left_status

### ui/map_token  (30 sprites)
- `map_start_normal` — **Map · start (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/start_normal_4x.png`
  - screens: map.node
- `map_start_current` — **Map · start (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/start_current_4x.png`
  - screens: map.node
- `map_start_cleared` — **Map · start (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/start_cleared_4x.png`
  - screens: map.node
- `map_combat_normal` — **Map · combat (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/combat_normal_4x.png`
  - screens: map.node
- `map_combat_current` — **Map · combat (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/combat_current_4x.png`
  - screens: map.node
- `map_combat_cleared` — **Map · combat (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/combat_cleared_4x.png`
  - screens: map.node
- `map_elite_normal` — **Map · elite (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/elite_normal_4x.png`
  - screens: map.node
- `map_elite_current` — **Map · elite (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/elite_current_4x.png`
  - screens: map.node
- `map_elite_cleared` — **Map · elite (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/elite_cleared_4x.png`
  - screens: map.node
- `map_event_normal` — **Map · event (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/event_normal_4x.png`
  - screens: map.node
- `map_event_current` — **Map · event (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/event_current_4x.png`
  - screens: map.node
- `map_event_cleared` — **Map · event (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/event_cleared_4x.png`
  - screens: map.node
- `map_shrine_normal` — **Map · shrine (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shrine_normal_4x.png`
  - screens: map.node
- `map_shrine_current` — **Map · shrine (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shrine_current_4x.png`
  - screens: map.node
- `map_shrine_cleared` — **Map · shrine (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shrine_cleared_4x.png`
  - screens: map.node
- `map_shop_normal` — **Map · shop (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shop_normal_4x.png`
  - screens: map.node
- `map_shop_current` — **Map · shop (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shop_current_4x.png`
  - screens: map.node
- `map_shop_cleared` — **Map · shop (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/shop_cleared_4x.png`
  - screens: map.node
- `map_cursed_normal` — **Map · cursed (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/cursed_normal_4x.png`
  - screens: map.node
- `map_cursed_current` — **Map · cursed (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/cursed_current_4x.png`
  - screens: map.node
- `map_cursed_cleared` — **Map · cursed (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/cursed_cleared_4x.png`
  - screens: map.node
- `map_boss_normal` — **Map · boss (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/boss_normal_4x.png`
  - screens: map.node
- `map_boss_current` — **Map · boss (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/boss_current_4x.png`
  - screens: map.node
- `map_boss_cleared` — **Map · boss (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/boss_cleared_4x.png`
  - screens: map.node
- `map_rest_normal` — **Map · rest (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/rest_normal_4x.png`
  - screens: map.node
- `map_rest_current` — **Map · rest (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/rest_current_4x.png`
  - screens: map.node
- `map_rest_cleared` — **Map · rest (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/rest_cleared_4x.png`
  - screens: map.node
- `map_chest_normal` — **Map · chest (normal)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/chest_normal_4x.png`
  - screens: map.node
- `map_chest_current` — **Map · chest (current)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/chest_current_4x.png`
  - screens: map.node
- `map_chest_cleared` — **Map · chest (cleared)** · Branching-map room token. Use the right state based on player progress.
  - path: `map-tokens/chest_cleared_4x.png`
  - screens: map.node

### ui/skill_node  (20 sprites)
- `skill_core_locked` — **Skill · core (locked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/core_locked_4x.png`
  - screens: skill_tree.node
- `skill_core_available` — **Skill · core (available)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/core_available_4x.png`
  - screens: skill_tree.node
- `skill_core_unlocked` — **Skill · core (unlocked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/core_unlocked_4x.png`
  - screens: skill_tree.node
- `skill_core_keystone` — **Skill · core (keystone)** · Build-defining keystone node. Marks the end of a branch.
  - path: `skill-nodes/core_keystone_4x.png`
  - screens: skill_tree.keystone
- `skill_steel_locked` — **Skill · steel (locked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/steel_locked_4x.png`
  - screens: skill_tree.node
- `skill_steel_available` — **Skill · steel (available)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/steel_available_4x.png`
  - screens: skill_tree.node
- `skill_steel_unlocked` — **Skill · steel (unlocked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/steel_unlocked_4x.png`
  - screens: skill_tree.node
- `skill_steel_keystone` — **Skill · steel (keystone)** · Build-defining keystone node. Marks the end of a branch.
  - path: `skill-nodes/steel_keystone_4x.png`
  - screens: skill_tree.keystone
- `skill_penance_locked` — **Skill · penance (locked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/penance_locked_4x.png`
  - screens: skill_tree.node
- `skill_penance_available` — **Skill · penance (available)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/penance_available_4x.png`
  - screens: skill_tree.node
- `skill_penance_unlocked` — **Skill · penance (unlocked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/penance_unlocked_4x.png`
  - screens: skill_tree.node
- `skill_penance_keystone` — **Skill · penance (keystone)** · Build-defining keystone node. Marks the end of a branch.
  - path: `skill-nodes/penance_keystone_4x.png`
  - screens: skill_tree.keystone
- `skill_smoke_locked` — **Skill · smoke (locked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/smoke_locked_4x.png`
  - screens: skill_tree.node
- `skill_smoke_available` — **Skill · smoke (available)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/smoke_available_4x.png`
  - screens: skill_tree.node
- `skill_smoke_unlocked` — **Skill · smoke (unlocked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/smoke_unlocked_4x.png`
  - screens: skill_tree.node
- `skill_smoke_keystone` — **Skill · smoke (keystone)** · Build-defining keystone node. Marks the end of a branch.
  - path: `skill-nodes/smoke_keystone_4x.png`
  - screens: skill_tree.keystone
- `skill_cursed_locked` — **Skill · cursed (locked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/cursed_locked_4x.png`
  - screens: skill_tree.node
- `skill_cursed_available` — **Skill · cursed (available)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/cursed_available_4x.png`
  - screens: skill_tree.node
- `skill_cursed_unlocked` — **Skill · cursed (unlocked)** · Talent-tree diamond node. Branch color encodes path; state encodes progress.
  - path: `skill-nodes/cursed_unlocked_4x.png`
  - screens: skill_tree.node
- `skill_cursed_keystone` — **Skill · cursed (keystone)** · Build-defining keystone node. Marks the end of a branch.
  - path: `skill-nodes/cursed_keystone_4x.png`
  - screens: skill_tree.keystone

### character/portrait  (4 sprites)
- `portrait_knight` — **Portrait · Vow Knight** · Character bust for class-select screen, HUD portrait corner, and dialog avatar.
  - path: `portraits/portrait_knight_4x.png`
  - screens: class_select.card, hud.top_left_portrait, dialog.speaker
- `portrait_witch` — **Portrait · Ashen Witch** · Character bust for class-select screen, HUD portrait corner, and dialog avatar.
  - path: `portraits/portrait_witch_4x.png`
  - screens: class_select.card, hud.top_left_portrait, dialog.speaker
- `portrait_monk` — **Portrait · Reliquary Monk** · Character bust for class-select screen, HUD portrait corner, and dialog avatar.
  - path: `portraits/portrait_monk_4x.png`
  - screens: class_select.card, hud.top_left_portrait, dialog.speaker
- `portrait_rogue` — **Portrait · Cinder Rogue** · Character bust for class-select screen, HUD portrait corner, and dialog avatar.
  - path: `portraits/portrait_rogue_4x.png`
  - screens: class_select.card, hud.top_left_portrait, dialog.speaker

### ui/cursor  (3 sprites)
- `cursor_default` — **Default arrow** · Mouse cursor. Swap based on hover context. Hotspot at top-left for 'default', center for 'target'.
  - path: `cursors/cursor_default_4x.png`
  - screens: cursor
- `cursor_click` — **Pointing hand (interactable)** · Mouse cursor. Swap based on hover context. Hotspot at top-left for 'default', center for 'target'.
  - path: `cursors/cursor_click_4x.png`
  - screens: cursor
- `cursor_target` — **Red crosshair (combat)** · Mouse cursor. Swap based on hover context. Hotspot at top-left for 'default', center for 'target'.
  - path: `cursors/cursor_target_4x.png`
  - screens: cursor

### effect/particle  (6 sprites)
- `particle_ember` — **Ember particle** · Floating cinder particle (drift up). Use in title screen, hub, fire effects.
  - path: `particles/particle_ember_4x.png`
  - screens: fx.world, fx.ui
- `particle_sparkle` — **Sparkle particle** · 4-point twinkle for legendary loot, crit hits, sigil glow.
  - path: `particles/particle_sparkle_4x.png`
  - screens: fx.world, fx.ui
- `particle_blood` — **Blood particle** · Blood splat for hit feedback, kill effects.
  - path: `particles/particle_blood_4x.png`
  - screens: fx.world, fx.ui
- `particle_smoke` — **Smoke particle** · Soft puff for cursed altars, rogue smokebomb, fog reveal.
  - path: `particles/particle_smoke_4x.png`
  - screens: fx.world, fx.ui
- `particle_mana` — **Mana particle** · Blue wisp for mana spend, witch casting.
  - path: `particles/particle_mana_4x.png`
  - screens: fx.world, fx.ui
- `particle_soul` — **Soul particle** · Purple soul orb for enemy death drop, banked souls.
  - path: `particles/particle_soul_4x.png`
  - screens: fx.world, fx.ui

### world/prop  (8 sprites)
- `prop_pillar` — **Pillar** · Cathedral pillar with lit window. Background prop for title screen and hub.
  - path: `props/prop_pillar_4x.png`
  - screens: world.decor, menu.background
- `prop_arch` — **Arch** · Stone archway. Use as doorway between rooms or pause-menu backdrop.
  - path: `props/prop_arch_4x.png`
  - screens: world.decor, menu.background
- `prop_tombstone` — **Tombstone** · Tombstone with cross. Use in cursed altars, codex of the fallen, run-summary screen.
  - path: `props/prop_tombstone_4x.png`
  - screens: world.decor, menu.background
- `prop_banner` — **Banner** · Hanging crest banner. Decorate menus, faction halls.
  - path: `props/prop_banner_4x.png`
  - screens: world.decor, menu.background
- `prop_lantern` — **Lantern** · Wall lantern with flame. Place along corridors, hub.
  - path: `props/prop_lantern_4x.png`
  - screens: world.decor, menu.background
- `prop_tome` — **Tome** · Spellbook with sigil. Use in skill tree, codex screen, witch class.
  - path: `props/prop_tome_4x.png`
  - screens: world.decor, menu.background
- `prop_cauldron` — **Cauldron** · Bubbling green cauldron. Hub kitchen / brewing UI.
  - path: `props/prop_cauldron_4x.png`
  - screens: world.decor, menu.background
- `prop_crown` — **Crown** · Royal crown with ruby. Use for high-tier rewards, leaderboard.
  - path: `props/prop_crown_4x.png`
  - screens: world.decor, menu.background

### world/tile  (5 sprites)
- `iso_tile_shadow` — **Iso floor tile · shadow** · Isometric floor tile. Tile diagonally in 32×16-pixel grid.
  - path: `decor/iso_tile_shadow_64.png`
  - screens: world.floor
- `iso_tile_wood` — **Iso floor tile · wood** · Isometric floor tile. Tile diagonally in 32×16-pixel grid.
  - path: `decor/iso_tile_wood_64.png`
  - screens: world.floor
- `iso_tile_leather` — **Iso floor tile · leather** · Isometric floor tile. Tile diagonally in 32×16-pixel grid.
  - path: `decor/iso_tile_leather_64.png`
  - screens: world.floor
- `iso_tile_moss` — **Iso floor tile · moss** · Isometric floor tile. Tile diagonally in 32×16-pixel grid.
  - path: `decor/iso_tile_moss_64.png`
  - screens: world.floor
- `iso_tile_iron` — **Iso floor tile · iron** · Isometric floor tile. Tile diagonally in 32×16-pixel grid.
  - path: `decor/iso_tile_iron_64.png`
  - screens: world.floor

### ui/ornament  (5 sprites)
- `divider_256` — **Divider 256px** · Horizontal bronze divider with center dot. Between menu sections.
  - path: `ornaments/divider_256.png`
  - screens: menu.section_divider
  - Unity: Sliced (border 16/4/16/4px)
- `divider_384` — **Divider 384px** · Horizontal bronze divider with center dot. Between menu sections.
  - path: `ornaments/divider_384.png`
  - screens: menu.section_divider
  - Unity: Sliced (border 16/4/16/4px)
- `level_badge_1` — **Level badge · 1** · Pre-baked level number sample. In production, draw the number with TextMeshPro on top of a blank badge bg.
  - path: `ornaments/level_badge_1.png`
  - screens: hud.top_left_portrait
- `level_badge_14` — **Level badge · 14** · Pre-baked level number sample. In production, draw the number with TextMeshPro on top of a blank badge bg.
  - path: `ornaments/level_badge_14.png`
  - screens: hud.top_left_portrait
- `level_badge_99` — **Level badge · 99** · Pre-baked level number sample. In production, draw the number with TextMeshPro on top of a blank badge bg.
  - path: `ornaments/level_badge_99.png`
  - screens: hud.top_left_portrait

