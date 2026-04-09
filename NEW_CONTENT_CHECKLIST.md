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
- [ ] `src/data/roguelikeData.ts` → `CARD_REWARD_POOL` — add card reward entries with `exclusiveTo: 'DisplayName'`
- [ ] `src/data/roguelikeData.ts` → `pickCardRewards()` — add ultimate `endsWith` check for the ultimate card id

### Archives (Historical Archives)
- [ ] `src/components/HistoricalArchives.tsx` → `CHARACTERS` array — add full character entry (lore, stats, abilities, portrait, colors)
- [ ] `src/components/HistoricalArchives.tsx` → `CARDS` array — add all ability cards with `exclusiveTo: 'DisplayName'`
- [ ] `src/components/HistoricalArchives.tsx` → `EXCL_COLOR` — add `DisplayName: '#hexcolor'`
- [ ] **Archive descriptions**: no formulas (e.g. `Power×1.4`, `1.5× Might`) — always use computed numeric values (e.g. `~35 damage`, `~90 damage`)

### Localization (all 5 files: en, de, ko, pt-BR, zh-CN)
- [ ] `src/i18n/*.ts` → `characters.id` — add full block: `name`, `tagline`, `title`, `lore`, `passive`, `ability1`, `ability2`, `ultimate`
- [ ] `src/i18n/*.ts` → `cards` — add entries for each card: `card_definitionId: { name, description }`
- [ ] `src/i18n/*.ts` → `roles` — add new role key if the role is new

### Art
- [ ] `public/art/name_portrait.png` — character portrait (used in CharacterSelection, Archives, roguelike map)

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

### Archives
- [ ] `src/components/HistoricalArchives.tsx` → `CARDS` array — add entry

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
| Enemy templates | `src/data/roguelikeData.ts` → `ENEMIES` |
| Portrait resolver | `src/utils/portraits.ts` → `HERO_PORTRAITS` |
| Archives characters | `src/components/HistoricalArchives.tsx` → `CHARACTERS` |
| Archives cards | `src/components/HistoricalArchives.tsx` → `CARDS` |
| Archives enemies | `src/components/HistoricalArchives.tsx` → `ENEMIES` |
| Archives card colors | `src/components/HistoricalArchives.tsx` → `EXCL_COLOR` |
| All localization | `src/i18n/en.ts`, `de.ts`, `ko.ts`, `pt-BR.ts`, `zh-CN.ts` |
| Character portraits (heroes) | `public/art/name_portrait.png` |
| Enemy portraits | `public/art/enemies/name_portrait.png` |
