# New Content Checklist

Everything that must be done when adding new characters, abilities, effects, cards, or enemies.
Check each box before considering the feature "done". All new content must be localized in all 5 languages.

---

## Adding a New Character

### Game Logic
- [ ] `src/components/CharacterSelection.tsx` — add to `AVAILABLE` array (id, name, role, stats, badges)
- [ ] `src/components/CharacterSelection.tsx` — add role to `type Role` union if new
- [ ] `src/components/CharacterSelection.tsx` — add case to `rolePillStyle()` if new role
- [ ] `src/hooks/useGameStateNew.ts` → `getAbilitiesForCharacter()` — add abilities block
- [ ] `src/hooks/useGameStateNew.ts` → `getPassiveForCharacter()` — add passive string
- [ ] `src/data/roguelikeData.ts` → `buildStartingCharacters()` — add run state entry (id, displayName, portrait, hp, etc.)
- [ ] `src/data/roguelikeData.ts` → `CHARACTER_STARTING_CARDS` — add starting card id
- [ ] `src/utils/portraits.ts` → `HERO_PORTRAITS` — add `["Name", "/art/name_portrait.png"]`

### Cards (for each character ability card)
- [ ] `src/data/cards.ts` → `CARD_DEFS` — add card definitions (`exclusiveTo: CHARACTER_IDS.name`)
- [ ] `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` — add ability card reward entries with `exclusiveTo: 'DisplayName'`
- [ ] `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` — add **ultimate** card reward entry (`exclusiveTo: 'DisplayName'`, `isUltimate: true`)
- [ ] `src/data/roguelikeData.ts` → `pickCardRewards()` — add `endsWith('_ultimateSuffix')` check for the ultimate card id

### Archives (Historical Archives)
- [ ] `src/components/HistoricalArchives.tsx` → `CHARACTERS` array — add full character entry (lore, stats, abilities, portrait, colors)
- [ ] `src/components/HistoricalArchives.tsx` → `CARDS` array — add all ability cards with `exclusiveTo: 'DisplayName'`
- [ ] `src/components/HistoricalArchives.tsx` → `EXCL_COLOR` — add `DisplayName: '#hexcolor'`
- [ ] **Archive descriptions — numeric estimates only**: never write formulas like `Power×1.4` or `1.5× Might`. Convert to computed values at a typical L5 stat baseline (e.g. `~84 damage`, `~50 damage to adjacents`). See "Card Description Rules" section below for the full two-tier standard.

### Localization (all 5 files: en, de, ko, pt-BR, zh-CN)
- [ ] `src/i18n/*.ts` → `characters.id` — add full block: `name`, `tagline`, `title`, `lore`, `passive`, `ability1`, `ability2`, `ultimate`
- [ ] `src/i18n/*.ts` → `cards` — add entries for each card: `card_definitionId: { name, description }`
- [ ] `src/i18n/*.ts` → `roles` — add new role key if the role is new
- [ ] `src/i18n/achievement_*.ts` — add entries for the new character's achievements (see Achievements section below)

### Achievements (src/data/achievements.ts + all 4 achievement i18n files)
- [ ] `win_3_[char]` — Win 3 runs with [char]-chan on squad (25 pts, statKey: `[char]_runs_won`, threshold: 3)
- [ ] `legacy_[char]` — [char]-chan survives all 4 acts (20 pts, eventKey: `legacy_[char]`, runPerk: stat bonus)
- [ ] `echo_[char]` — Use [char]'s ultimate 50 times (20 pts, statKey: `ult_used_[char]`, threshold: 50)
- [ ] Kit moment achievement — character-specific gameplay trigger (10 pts, unique eventKey)
- [ ] Duo win achievement — win a run with [char] + one thematically paired char (10 pts, eventKey, loreUnlockId)
- [ ] Update achievement count comment at top of `achievements.ts`
- [ ] Wire `ult_used_[char]` stat tracking in `src/hooks/useAchievements.ts` → `card_played` handler
- [ ] Wire `[char]_runs_won` stat tracking in `src/hooks/useAchievements.ts` → `run_ended` handler (uses `${charId}_runs_won` key — verify charId matches)
- [ ] Wire kit moment eventKey in `src/hooks/useGameStateNew.ts` or `useRunState.ts`
- [ ] Wire `legacy_[char]` event in `src/hooks/useRunState.ts` → act 4 completion logic

### Lore (src/components/HistoricalArchives.tsx LORE array + LORE_CAT map)
- [ ] **Echo Fragment** (`echo_[char]`) — inner monologue on waking in the arena (category: `field_notes`). Link to `echo_[char]` achievement via `loreUnlockId`.
- [ ] **Acquisition Record** (`acquisition_[char]`) — Znyxorgan bureaucratic intake file (category: `acquisitions`). Link to `win_3_[char]` achievement.
- [ ] **Classified entry** (`classified_[char]`) — Drex-9 or handler behavioral observation (category: `classified`). Link to `legacy_[char]` achievement.
- [ ] **Field Notes / Conversation** (`field_notes_[char]` or `conversation_[char]_[other]`) — recovered audio or cross-clone exchange (category: `field_notes`). Link to duo win achievement.
- [ ] Add all new lore IDs to `LORE_CAT` map at bottom of HistoricalArchives.tsx
- [ ] Update `thren_vel_nor_thral` threshold in `src/data/achievements.ts` (total lore entries − 2)
- [ ] Add lore translations to `src/i18n/lore_de.ts`, `lore_ko.ts`, `lore_pt-BR.ts`, `lore_zh-CN.ts` (or confirm lore is English-only)

### Art
- [ ] `public/art/[char]_portrait.png` — character portrait (used in CharacterSelection, Archives, roguelike map)

---

## Adding a New Enemy

### Game Logic
- [ ] `src/data/roguelikeData.ts` → `ENEMIES` record — add `EnemyTemplate` (name, hp, might, power, defense, abilities, etc.)
- [ ] `src/data/roguelikeData.ts` → `buildEncounter()` enemy pools — add to appropriate pool (early/mid/late/boss)

### Archives
- [ ] `src/components/HistoricalArchives.tsx` → `ENEMIES` array — add full entry (stats, description, abilities, portrait, act, rank)
- [ ] **Archive descriptions**: no formulas — use computed numeric values only (e.g. `~36 damage`, not `Power×1.2 damage`)

### Art
- [ ] `public/art/enemies/enemy_name_portrait.png` — drop portrait here; Archives and game will pick it up automatically

---

## Adding a New Card / Ability

### Game Logic
- [ ] `src/data/cards.ts` → `CARD_DEFS` — add `CardDef` (definitionId, name, manaCost, type, rarity, effect, exclusiveTo)
- [ ] `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` — add `CardReward` entry
- [ ] If shared card: add to `SHARED_COPIES` in `cards.ts` with desired copy count
- [ ] If character ability: add to `getAbilitiesForCharacter()` in `useGameStateNew.ts`
- [ ] If ultimate: add `endsWith('_suffix')` check to `pickCardRewards()` in `roguelikeData.ts`

### Card Description Rules (two-tier system)

Cards have descriptions in two places — follow the appropriate format for each:

**In-game tooltip** (`CARD_DEFS[].description` and `CARD_UPGRADES[].patch.description` in `cards.ts`):
- Lead with a **numeric estimate** using `~` prefix: `~78 damage`, `~60 damage at range 3`
- If there is room after the main number, you may also include a brief **formula hint** in parentheses for transparency: `~78 damage (Power×1.4)` or `~60 damage at range 3 (Applies Bleed ~20/turn for 2 turns)`
- Non-damage cards use plain numeric values: `+10 Might this turn`, `−25% Defense for 2 turns`, `Heal 20 HP`
- The tooltip is the only place descriptions are shown in-game (cards in hand display name+mana only; description appears on hover)
- Examples from the codebase:
  - `"~78 damage at range 4."`
  - `"~60 damage at range 3. Applies Bleed (~20 HP/turn for 2 turns)."`
  - `"ULTIMATE (Exhaust) — ~130 damage to one target at range 4. If target dies, deal ~50 damage to all adjacent enemies."`
  - `"Deal ~96 damage to target within range 3. At Voltage ≥ 3: chains to ALL adjacent enemies for ~56 each."`

**Historical Archives** (`HistoricalArchives.tsx` → `CARDS` array and `ITEMS` array):
- **Numeric estimates only** — never write raw formulas like `Power×1.4`, `1.5× Might`, or `Power×0.25`
- Convert formulas to computed values using typical L5 base stats as reference
- Use the `<span style={{color: "#60a5fa"}}>` colorization pattern for damage numbers (blue), heal numbers (green), and defense numbers (yellow) — see existing entries
- Examples: `"~84 damage"` not `"Power×1.4 damage"`, `"~12 damage"` not `"Power×0.25 damage"`

### Archives
- [ ] `src/components/HistoricalArchives.tsx` → `CARDS` array — add entry (numeric estimates only — no formula strings)

### Localization (all 5 files)
- [ ] `src/i18n/*.ts` → `cards` — add `{ name, description }` for the card

---

## Adding a New Status Effect / Buff / Debuff

### Game Logic
- [ ] `src/combat/buffs.ts` — add effect definition and processing logic
- [ ] `src/hooks/useGameStateNew.ts` — wire up application and tick logic if needed

### Archives
- [ ] `src/components/HistoricalArchives.tsx` — add to effects/buffs section if one exists, or add a section

### Localization (all 5 files)
- [ ] `src/i18n/*.ts` → add effect name and description if shown in UI

---

## Adding a New Item

### Game Logic
- [ ] `src/data/roguelikeData.ts` → `ITEMS` array — add `RunItem` (name, icon, tier, description, statBonus/passiveTag, targetCharacter if exclusive)

### Archives
- [ ] `src/components/HistoricalArchives.tsx` — add to items section if one exists

---

## Adding a New Role

- [ ] `src/components/CharacterSelection.tsx` → `type Role` — add to union
- [ ] `src/components/CharacterSelection.tsx` → `rolePillStyle()` — add case with ring/text/border colors
- [ ] `src/i18n/*.ts` → `roles` — add key in all 5 language files

---

## Updating Game Rules

Update `src/i18n/en.ts` → `settings.rules.entries` (and all 4 other language files) whenever:

- [ ] A new game mode or objective type is added
- [ ] A new mechanic is introduced (terrain type, event, status effect category)
- [ ] An existing mechanic changes significantly (e.g. respawn rules, mana rules)
- [ ] A feature is removed (remove or update the relevant entry)

The `GameRules.tsx` component renders entries grouped by `category`. Entries have three fields: `category`, `title`, `text`.
Categories currently used: `'Roguelike Run'`, `'Basics'`, `'Gameplay'` (and translated equivalents in each language file).

---

## Current Outstanding Items — 5 New Characters (v0.5)

Characters: **Vel'thar** (velthar), **Musashi** (musashi), **Cleopatra** (cleopatra), **Tesla** (tesla), **Shaka** (shaka)

### 🔴 Gameplay-Breaking (must fix before these chars are playable)
- [ ] `src/hooks/useGameStateNew.ts` → `getAbilitiesForCharacter()` — add cases for all 5
- [ ] `src/hooks/useGameStateNew.ts` → `getPassiveForCharacter()` — add cases for all 5
- [ ] `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` — add ultimates: `velthar_singularity`, `musashi_book_of_five`, `cleo_eternal_kingdom`, `tesla_death_ray`, `shaka_impondo_zankomo`
- [ ] `src/data/roguelikeData.ts` → `pickCardRewards()` — add `endsWith` checks for the 5 ultimates above

### 🟡 Content (missing from Archives / UI)
- [ ] `src/components/HistoricalArchives.tsx` → `CARDS` array — add all 15 ability cards (3 per char × 5 chars)
- [ ] Portrait PNGs — `public/art/velthar_portrait.png`, `musashi_portrait.png`, `cleopatra_portrait.png`, `tesla_portrait.png`, `shaka_portrait.png`

### 🟢 Achievements (src/data/achievements.ts — already have win_3 + legacy + echo; still needed)
- [ ] Kit moment achievements — unique gameplay triggers for each of the 5 (events must also be wired in engine)
- [ ] Duo win achievements — 1 per new char paired with an existing char (loreUnlockId → conversation lore entry)
- [ ] Wire `ult_used_[char]` tracking in `useAchievements.ts` for all 5 (check if already wired)

### 🟢 Lore (src/components/HistoricalArchives.tsx LORE array)
- [ ] **Acquisition Records** — `acquisition_musashi`, `acquisition_cleopatra`, `acquisition_tesla`, `acquisition_shaka` (velthar already has one)
- [ ] **Classified entries** — `classified_musashi`, `classified_cleopatra`, `classified_tesla`, `classified_shaka`, `classified_velthar`
- [ ] **Conversation / Field Notes** — `field_notes_musashi`, `field_notes_cleopatra`, `field_notes_tesla`, `field_notes_shaka` (link to duo win achievements)
- [ ] Update `thren_vel_nor_thral` threshold after adding lore entries

---

## Quick Reference — File Map

| What | Where |
|------|-------|
| Character selection screen data | `src/components/CharacterSelection.tsx` → `AVAILABLE` |
| Character abilities (game engine) | `src/hooks/useGameStateNew.ts` → `getAbilitiesForCharacter()` |
| Character passive (game engine) | `src/hooks/useGameStateNew.ts` → `getPassiveForCharacter()` |
| Roguelike run characters | `src/data/roguelikeData.ts` → `buildStartingCharacters()` |
| Starting card per character | `src/data/roguelikeData.ts` → `CHARACTER_STARTING_CARDS` |
| All card definitions | `src/data/cards.ts` → `CARD_DEFS` |
| Card reward pool (roguelike) | `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` |
| Ultimate reward gating | `src/data/roguelikeData.ts` → `pickCardRewards()` |
| Enemy templates | `src/data/roguelikeData.ts` → `ENEMIES` |
| Portrait resolver | `src/utils/portraits.ts` → `HERO_PORTRAITS` |
| Achievement definitions | `src/data/achievements.ts` |
| Achievement stat tracking | `src/hooks/useAchievements.ts` |
| Archives characters | `src/components/HistoricalArchives.tsx` → `CHARACTERS` |
| Archives cards | `src/components/HistoricalArchives.tsx` → `CARDS` |
| Archives enemies | `src/components/HistoricalArchives.tsx` → `ENEMIES` |
| Archives lore entries | `src/components/HistoricalArchives.tsx` → `LORE` array |
| Lore category map | `src/components/HistoricalArchives.tsx` → `LORE_CAT` |
| Archives card colors | `src/components/HistoricalArchives.tsx` → `EXCL_COLOR` |
| All localization | `src/i18n/en.ts`, `de.ts`, `ko.ts`, `pt-BR.ts`, `zh-CN.ts` |
| Achievement i18n | `src/i18n/achievement_de.ts`, `achievement_ko.ts`, `achievement_pt-BR.ts`, `achievement_zh-CN.ts` |
| Character portraits (heroes) | `public/art/name_portrait.png` |
| Enemy portraits | `public/art/enemies/name_portrait.png` |
