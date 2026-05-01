# Visual Update — Waifu Clone Wars

Tracks all visual/art improvements: what's shipped, what's in progress, what's next.

---

## Shipped This Session

### Board & Camera
- **Pan clamping** — board can no longer be dragged past its edges or behind the card hand panel (`CARD_HAND_RESERVE = 170px`)
- **Sprite scale overrides** — `SPRITE_SCALE_OVERRIDES` map in HexTile.tsx: Huang 1.6×, Teddy 1.85×, Leonidas 1.85×, Genghis 1.95×

### Idle & Ambient Animations
- **Sprite idle float** — all characters bob with deterministic stagger (`charCode % 8 × 0.35s`) via float wrapper div
- **Mana crystal pulse** — two expanding hex rings + inner core glow on the `(0,0)` tile
- **Merchant atmosphere** — holographic top bar + floating coin particles on the merchant screen

### VFX
- **Per-character VFX colors** — `CHARACTER_VFX_COLORS` map (12 entries) in Index.tsx; cast animations use each character's distinct color
- **Rune cast burst** — alien glyphs `⬡ ⟁ ✦ ◈ ⬢ ⟐`, expanding hex ring, deterministic layout
- **Tiered screen shake** — 3 keyframe levels: light (dmg ≥ 20), heavy (≥ 40), massive (≥ 60); `shakeAnim: string | null` replaces boolean
- **Damage number punch** — improved `anim-float-up-fade`: scale 0.7→1.22→1.08→0.85, punchy bounce feel
- **Victory/defeat flash** — full-screen radial gradient flash in VictoryScreen at phase 2 (white/cyan or red)

### UI
- **Character portraits in CharacterPanel** — `PORTRAIT_MAP` for all 12 original characters, HP-reactive border glow (cyan→amber→red), urgent pulse animation at ≤30% HP
- **Boss intro enhancement** — `battleTransition.isBoss` field; boss intros get darker bg, scanline overlay, red glow, larger text

### Screen Transition
- **Scanline sweep** — scanline now leads the wipe edge (sweep keyframe, not fixed position)
- **Hold frame** — veil timer extended 260ms → 330ms for cleaner feel
- **Split emblem** — WCW emblem halves animate out/in on separate keyframes

### Card Art Pipeline
- `cardArt?: string` field added to `CardDef` interface
- `CARD_ART: Record<string, string>` map in `src/data/cards.ts` — 14 entries wired
- `getCardArt(definitionId)` export — single lookup used by CardHand and RoomScreens
- Existing type-based fallbacks (`/art/cards/attack.png` etc.) still active for unwired cards

---

## 3D Miniature Art — In Progress

Characters display as portrait cards on pedestals. The target is full 3D chibi miniature renders.

**Workflow per character:**
1. Full-body chibi portrait (arms-at-sides, transparent BG)
2. Upload to **Meshy.ai** → GLB (`sword sheathed on hip, smooth fur trim, chibi proportions`)
3. **Blender**: toon/cel shader + scenic base, 3/4 front angle, transparent PNG
4. Drop into `public/art/` replacing existing `<name>_sprite.png`

See `AI_ART_PROMPTS.md` for copy-paste generation prompts.

### Original 12 — 3D Status

| Character | Scenic Base Theme | Status |
|-----------|-------------------|--------|
| Sun-sin | Wet dock planks, water puddle reflection | 3D render done — needs Blender pass |
| Genghis | Dry steppe grass, mongolian banner flag | Full-body portrait ready for Meshy |
| Napoleon | Cobblestone battlefield, cannon smoke wisps | Pending |
| Da Vinci | Stone workshop floor, scattered blueprints | Pending |
| Leonidas | Cracked marble, spartan shield fragment | Pending |
| Beethoven | Concert hall stage, music sheet scatter | Pending |
| Huang-chan | Imperial stone courtyard, lanterns | Pending |
| Nelson | Ship deck planks, rope coils, sea spray | Pending |
| Hannibal | Alpine snow pass, elephant footprint | Pending |
| Picasso | Painted studio floor, broken palette | Pending |
| Teddy | Rough terrain, safari grass, hat | Pending |
| Mansa | Gold-dust plaza, Mali mosaic tiles | Pending |

### New 5 — All Art Missing

All 5 new characters have **zero art files**. Code paths are wired (`_portrait.png`, `_sprite.png`) but the files don't exist — broken images in CharacterSelection, Archives, CharacterPanel, and in-combat hex tiles.

| Character | ID | Scenic Base Theme | Portrait | Sprite | 3D |
|-----------|----|-------------------|----------|--------|----|
| Vel'thar-chan | `velthar` | Void energy nexus, alien rune floor, ember glow | ❌ | ❌ | ❌ |
| Musashi-chan | `musashi` | Bamboo dojo floor, scattered practice weapons | ❌ | ❌ | ❌ |
| Cleopatra-chan | `cleopatra` | Marble temple steps, lotus blossoms, gold trim | ❌ | ❌ | ❌ |
| Tesla-chan | `tesla` | Laboratory tiles, arcing tesla coils, blueprints | ✅ | ❌ | ❌ |
| Shaka-chan | `shaka` | Savanna red earth, shield and assegai, cattle tracks | ❌ | ❌ | ❌ |

Files needed per character:
- `public/art/<id>_portrait.png` — CharacterSelection, Archives, roguelike map, CharacterPanel
- `public/art/<id>_sprite.png` — hex tile in-combat display
- `public/art/<id>_3d.png` — CharacterSelection 3D model slot

**Code also needs updating once art exists:**
- `PORTRAIT_MAP` in `src/components/CharacterPanel.tsx` — add 5 entries
- `CHARACTER_VFX_COLORS` in `src/pages/Index.tsx` — add 5 color entries
- `SPRITE_SCALE_OVERRIDES` in `src/components/HexTile.tsx` — tune scale per character

---

## Asset Gaps

### New Character Portraits — 5 missing (CRITICAL)

| File | Character | Where used |
|------|-----------|------------|
| `velthar_portrait.png` | Vel'thar | Selection, Archives, map, panel |
| `musashi_portrait.png` | Musashi | Selection, Archives, map, panel |
| `cleopatra_portrait.png` | Cleopatra | Selection, Archives, map, panel |
| ~~`tesla_portrait.png`~~ | ~~Tesla~~ | ~~Selection, Archives, map, panel~~ ✅ |
| `shaka_portrait.png` | Shaka | Selection, Archives, map, panel |

### New Character Sprites — 5 missing (CRITICAL)

| File | Character | Where used |
|------|-----------|------------|
| `velthar_sprite.png` | Vel'thar | In-combat hex tile |
| `musashi_sprite.png` | Musashi | In-combat hex tile |
| `cleopatra_sprite.png` | Cleopatra | In-combat hex tile |
| `tesla_sprite.png` | Tesla | In-combat hex tile |
| `shaka_sprite.png` | Shaka | In-combat hex tile |

### Enemy Portraits — 10 missing (drop into `/public/art/enemies/`)

| Priority | File | Enemy |
|----------|------|-------|
| **CRITICAL** | `velzar_will_portrait.png` | Vel'Zar — Act 4 final boss |
| High | `cryo_drifter_portrait.png` | Cryo Drifter |
| High | `zyx_swarmer_portrait.png` | Zyx Swarmer |
| High | `zyx_remnant_portrait.png` | Zyx Remnant |
| High | `qrix_hauler_portrait.png` | Qrix Hauler |
| High | `qrix_salvager_portrait.png` | Qrix Salvager |
| High | `qrix_voidbreacher_portrait.png` | Qrix Voidbreacher |
| Medium | `grox_titan_portrait.png` | Grox Titan (elite) |
| Medium | `naxion_warmaster_portrait.png` | Naxion Warmaster (elite) |
| Medium | `velthrak_shadowblade_portrait.png` | Velthrak Shadowblade (elite) |

21 enemy portraits already exist in `/public/art/enemies/`.

### Card Arts — ~63 missing (drop into `/public/art/cards/` named by `definitionId`)

**New character ultimates + signatures (do these first):**
- Vel'thar: `velthar_singularity` + ability cards
- Musashi: `musashi_book_of_five` + ability cards
- Cleopatra: `cleo_eternal_kingdom` + ability cards
- Tesla: `tesla_death_ray` + ability cards
- Shaka: `shaka_impondo_zankomo` + ability cards

**Original 12 ultimates + signatures:**
- Napoleon: `artillery_barrage`, `grande_armee`, `final_salvo`
- Genghis: `mongol_charge`, `horde_tactics`, `riders_fury`
- Leonidas: `shield_bash`, `spartan_wall`, `this_is_sparta`
- Da Vinci: `masterpiece`, `flying_machine`
- Beethoven: `schallwelle`, `freudenspur`, `gotterfunken`
- Sun-sin: `hwajeon`, `naval_command`, `chongtong`
- Huang-chan: `first_emperor`, `eternal_army`
- Nelson: `crossing_the_t`, `kiss_me_hardy`, `trafalgar_square`
- Hannibal: `alpine_march`, `double_envelopment`, `war_elephant`
- Picasso: `guernica`, `cubist_mirror`, `blue_period`
- Teddy: `speak_softly`, `big_stick`, `rough_riders_rally`
- Mansa: `salt_road`, `hajj_of_gold`, `bounty`

**Shared cards:**
`entangle`, `jump`, `flash_bang`, `fortify`, `taunt`, `decoy`, `blood_price`, `overcharge`, `retribution`

**Curses:**
`curse_burden`, `curse_malaise`, `curse_void_echo`, `curse_dread`, `curse_chains`

To wire a card: add `<definitionId>: '/art/cards/<definitionId>.png'` to `CARD_ART` in `src/data/cards.ts`.

### New Character 3D Models — 5 missing

| File | Notes |
|------|-------|
| `velthar_3d.png` | Chibi + void/ember theme |
| `musashi_3d.png` | Chibi + dojo theme |
| `cleopatra_3d.png` | Chibi + Egyptian temple theme |
| `tesla_3d.png` | Chibi + lab/lightning theme |
| `shaka_3d.png` | Chibi + savanna theme |

### Terrain Tiles — 2 types missing (medium priority)

Both `ash` and `ruins` terrain types exist in the code but fall back to `Plains_180.png`. Each needs a flat tile and a 3D tile.

Drop flat tiles into `public/art/tiles/` and 3D tiles into `public/art/tiles/3d/`, then update `TERRAIN_MAP_FLAT` and `TERRAIN_MAP_3D` in [HexTile.tsx](src/components/HexTile.tsx).

| Flat tile | 3D tile | Terrain | Visual brief |
|-----------|---------|---------|--------------|
| `Ash_180.png` | `Ash_3d.png` | Ash | Scorched grey earth, faint ember cracks, ash powder dusting |
| `Ruins_180.png` | `Ruins_3d.png` | Ruins | Crumbled stone blocks, alien script fragments, mossy rubble |

**Current fallback**: both use `Plains_180.png` — they render as plain grass in-game.

**Code wire-up** (after dropping files):
- `TERRAIN_MAP_FLAT.ash` → `"/art/tiles/Ash_180.png"`
- `TERRAIN_MAP_FLAT.ruins` → `"/art/tiles/Ruins_180.png"`
- `TERRAIN_MAP_3D.ash` → `"/art/tiles/3d/Ash_3d.png"`
- `TERRAIN_MAP_3D.ruins` → `"/art/tiles/3d/Ruins_3d.png"`

### Environmental (lower priority)

| Asset | Description |
|-------|-------------|
| `arena/act1_bg.png` … `act4_bg.png` | Per-act arena backgrounds (all 4 acts share same CSS arena) |
| `crowd_left/right/top/bottom.png` | Crowd panoramic — 4 panels mounted in code, placeholder |
| Map node icons (7 types) | `enemy`, `elite`, `campfire`, `merchant`, `treasure`, `unknown`, `boss` |
| Status effect icons (8) | `poison`, `blinded`, `armor_break`, `taunt`, `burning`, `frozen`, `silenced`, `shielded` |
| Lore entry art | 64 entries, most gated behind achievements — lowest priority |

---

## Key Files

| File | Role |
|------|------|
| `src/components/HexTile.tsx` | `SPRITE_SCALE_OVERRIDES`, float wrapper, mana crystal pulse |
| `src/components/AnimationLayer.tsx` | VFX renderer — `CastBurst`, rune glyphs |
| `src/components/CharacterPanel.tsx` | `PORTRAIT_MAP` — needs 5 new chars added |
| `src/components/VictoryScreen.tsx` | Victory/defeat flash |
| `src/components/GameBoard.tsx` | Pan clamping |
| `src/pages/Index.tsx` | `CHARACTER_VFX_COLORS` — needs 5 new chars added |
| `src/data/cards.ts` | `CARD_ART` map, `getCardArt()` export |
| `src/utils/portraits.ts` | Portrait path resolver for enemies |
| `src/index.css` | All animation keyframes |
| `AI_ART_PROMPTS.md` | Copy-paste prompts for art generation |
