# Visual Overhaul Plan — Waifu Clone Wars

---

## Status Legend
- ✅ Done (code shipped / art dropped)
- 🎨 Your task (art generation, external tools)
- 💡 Future / optional

---

## Track 1 — Tile Art: Alien Arena ✅ COMPLETE

- All 8 tile PNGs replaced in `public/art/tiles/`
- Forest, Mountain, River, Plains, Mana Crystal, Beast Camp, Blue Base, Red Base, Spawn variants
- Arena backdrop: void-indigo base, cyan energy glow, alien stadium walls, portal columns, hex grid overlay

---

## Track 2 — Character Figures: Miniatures on Pedestals

### Code ✅ COMPLETE
- Figure-on-pedestal rendering in `HexTile.tsx`: portrait card, team-colored glowing border
- Active unit: golden shimmer pulse + brighter border
- Scenic pedestal base with glowing nameplate stripe in team color + ground shadow ellipse
- Floating bob animation (2.8s cycle)
- Character name on pedestal with team-colored glow text
- Enemy portraits wired in `src/utils/portraits.ts` — 16 enemies mapped

### Art 🎨 IN PROGRESS — 3D Miniature Renders

Workflow per character:
1. Full-body chibi portrait (arms-at-sides, transparent BG)
2. Upload to **Meshy.ai** → GLB (`sword sheathed on hip, smooth fur trim, chibi proportions`)
3. **Blender**: toon/cel shader + scenic base, 3/4 front angle, transparent PNG
4. Drop into `public/art/` replacing existing files

| Character | Base theme | Status |
|---|---|---|
| Sun-sin | Wet dock planks, water puddle reflection | 🎨 3D render done, needs Blender pass |
| Genghis | Dry steppe grass, mongolian banner flag | 🎨 Full-body portrait ready for Meshy |
| Napoleon | Cobblestone battlefield, cannon smoke wisps | 🎨 Pending |
| Da Vinci | Stone workshop floor, scattered blueprints | 🎨 Pending |
| Leonidas | Cracked marble, spartan shield fragment | 🎨 Pending |

---

## Track 3 — Card Animations ✅ COMPLETE

- `useAnimations.ts` + `AnimationLayer.tsx` — full animation queue system
- **8 effect types**: damage number, heal number, impact blast, aura ring, cast burst, death skull, shield pulse, AOE ring
- **Projectile** — fires from caster to target for ranged attacks
- **Movement trail** — ghost trail on position change
- **AOE ring** — expanding ring for area cards (color-coded: green=heal, gold=team buff, red=attack)
- **Card fly-out** — card lifts and flashes bright on play, rockets off toward board (420ms)
- HP-change detector auto-fires damage/heal/death animations every render

---

## Track 4 — Enemy Art ✅ COMPLETE

- All 16 enemy portraits in `public/art/enemies/`, wired in `src/utils/portraits.ts`
- `glorp_shambler`, `zyx_skitter`, `void_wraith`, `krath_berserker`, `mog_toxin`, `qrix_hunter`,
  `naxion_scout`, `vron_crawler`, `krath_champion`, `spore_node`, `vexlar`, `iron_wall`,
  `phasewarden`, `terror_alpha`, `terror_beta`, `znyxorgas_champion`

---

## Track 5 — Arena & UI Polish ✅ COMPLETE

- Arena backdrop: void-indigo, cyan energy floor, alien walls, portal columns
- Animated arena floor: `arena-pulse` keyframe on hex grid overlay (`GameBoard.tsx`)
- Turn transition flash: blue/red screen-edge glow when turn switches (`Index.tsx`)
- Enemy turn banner: red overlay banner on enemy turn start (`Index.tsx`)

---

## Future / Optional 💡

- **Crowd ambience layer** — tiny silhouette crowd in outer dark ring of arena
- **Card art thumbnails** — replace placeholder art with real card illustrations
- **Victory/defeat cinematic** — particle burst + camera zoom on win/loss

---

## File Reference

| File | What it does |
|---|---|
| `src/components/HexTile.tsx` | Pedestal figure rendering, nameplate, float anim |
| `src/components/AnimationLayer.tsx` | Battle effect animations (damage, projectile, AOE, etc.) |
| `src/hooks/useAnimations.ts` | Animation queue system |
| `src/components/CardHand.tsx` | Card hand UI + fly-out animation on play |
| `src/components/GameBoard.tsx` | Arena backdrop, animated floor, hosts AnimationLayer |
| `src/pages/Index.tsx` | HP-change detector, projectile/trail/AOE wiring, turn flash, enemy banner |
| `src/index.css` | All animation keyframes |
| `src/utils/portraits.ts` | Portrait path resolver (heroes + 16 enemies) |
| `public/art/` | Hero portraits (5 files) |
| `public/art/tiles/` | Tile textures (all replaced) |
| `public/art/enemies/` | Enemy portraits (16 files) |
| `AI_ART_PROMPTS.md` | Copy-paste prompts for art generation |
