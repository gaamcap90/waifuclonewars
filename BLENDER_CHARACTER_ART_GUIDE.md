# Waifu Clone Wars — Blender Character Art Guide

This document is a briefing for an artist agent creating 3D character renders in Blender for all playable characters in *Waifu Clone Wars*. It covers art direction, per-character design intent, pose/render goals, and output specifications.

---

## 1. Game Context

**Waifu Clone Wars** is a tactical roguelike (Slay the Spire–style progression, hex-grid combat). The tone is:
- **Tongue-in-cheek anime sci-fi**: historical figures resurrected as "battle-clones" by an alien empire (Znyxorga's Arena)
- **Stylized, not photorealistic** — think colorful JRPG/gacha character designs with sci-fi flair
- Characters are female (or gender-neutral) anime-style reimaginings of famous historical figures
- Arena setting: alien colosseum crowd, alien planet sky, futuristic-but-gladiatorial

The phrase "Waifu Clone Wars" should inform everything. These are deliberate parodies — each character leans into their historical identity but with anime aesthetics and alien-arena costume design.

---

## 2. Global Art Direction

### Style
- **Anime/cel-shaded 3D** (e.g., Genshin Impact, Fire Emblem: Three Houses, Arc System Works)
- Clean lines, flat or lightly shaded color fills, minimal realism
- Stylized proportions: slightly large heads, expressive eyes, simplified anatomy
- Bright, saturated color palettes per character
- Costumes blend historical accuracy with sci-fi clone-armor detailing (glowing accents, alien metal textures)

### Blender Setup Recommendations
- **Render engine**: EEVEE (for toon/cel look) or Cycles with toon shader
- **Toon shading**: Use a shader with a hard diffuse ramp (2–3 tone steps, no smooth gradient)
- **Outlines**: Use Freestyle or a solidify modifier with inverted normals for a clean black outline
- **Lighting**: 3-point setup (key, fill, rim). Rim light should match character's accent color
- **Camera**: Slightly low angle (~15°), portrait crop — characters feel powerful and imposing
- **Background**: Transparent PNG (for use as portrait overlays) OR alien arena crowd blur (optional secondary version)

### Portrait Format (primary use)
- **Resolution**: 512×512px or 1024×1024px square
- **Framing**: Bust/three-quarter shot — head + upper torso + hands (if relevant to character)
- **Expression**: Confident, fighting-ready, personality-appropriate (see per-character notes)

### Sprite Format (in-game hex unit)
- **Resolution**: 128×128px or 256×256px square
- **Framing**: Full body, front-facing or slight angle
- **Pose**: Neutral idle stance, weapon/tool at ready
- Both portrait and sprite should feel consistent.

---

## 3. Characters

Each character section includes: real-world identity, role in game, stats, abilities, and art direction notes.

---

### 3.1 Napoleon-chan
**ID**: `napoleon`  
**Title**: "The Brilliant Tactician"  
**Tagline**: Commander of the Clone Armies  
**Role**: Ranged DPS  
**Stats**: HP 100 / Might 65 / Power 60  

**Lore**: Napoleon Bonaparte resurrected as a battle-clone. Pint-sized but terrifyingly precise. Tactical genius who turns every battlefield into a performance.

**Abilities**:
- **Passive — Mitraille**: Passive AoE aura, 10 damage to all adjacent enemies at turn start
- **Artillery Barrage**: Power×1.3 at range 4 (long-range bombardment)
- **Grande Armée**: Team-wide +20% Might & Power buff for 2 turns
- **Final Salvo** (Ultimate): 3 random hits of Power×0.7 on enemies in range 4

**Art Direction**:
- Short stature (lean into the Napoleon height joke — she's noticeably small but absolutely does not care)
- Dark navy/gold commander's coat, heavily adorned with alien-metal epaulettes and glowing gold trim
- Classic Napoleonic bicorne hat, modernized — maybe holographic visor built into it
- Carries a sleek sci-fi cannon / artillery sidearm
- Expression: sharp, slightly smug, one eyebrow raised
- Color palette: **deep navy, gold, crimson accent**
- Eyes: sharp and calculating, slightly narrowed

---

### 3.2 Genghis-chan
**ID**: `genghis`  
**Title**: "The Unstoppable Conqueror"  
**Tagline**: Khan of a Thousand Battlefields  
**Role**: Melee DPS  
**Stats**: HP 120 / Might 50 / Power 40  

**Lore**: The most feared conqueror in history reborn as a battle-clone. Her bloodlust increases with every kill. She is building a new empire, one arena fight at a time.

**Abilities**:
- **Passive — Bloodlust**: +12 Might and +1 Mana per kill, stacks 3×
- **Mongol Charge**: Power×1.2 ranged charge (range 3)
- **Horde Tactics**: AoE Power×0.8 to all enemies in range 2
- **Rider's Fury** (Ultimate): Full-row Power×0.7 sweep, range 5

**Art Direction**:
- Athletic build, wild energy — she moves fast
- Mongol-inspired armor (lamellar plates) infused with alien metal, nomadic fur trim with sci-fi bioluminescent edges
- Carries a curved blade or long lance (alien-metal version)
- Her passive "stacks" could be visualized as glowing wound-marks or red energy trails on her body
- Expression: battle-grin, fierce, feral joy — she's having the time of her life
- Color palette: **crimson red, dark leather, bone white, electric orange accent**
- Eyes: amber or gold, intense

---

### 3.3 Da Vinci-chan
**ID**: `davinci`  
**Title**: "The Genius Inventor"  
**Tagline**: Visionary of the Stars  
**Role**: Support  
**Stats**: HP 85 / Might 35 / Power 50  

**Lore**: History's most versatile genius now fights with inventions. She teleports, heals, and summons combat drones. When cornered, she simply teleports out.

**Abilities**:
- **Passive — Tinkerer**: Draw +1 card if no exclusive ability was used last turn
- **Flying Machine**: Teleport up to range 5
- **Masterpiece**: Heal an ally for Power×1.0 HP (range 3)
- **Vitruvian Guardian** (Ultimate): Summon combat drone (HP 75, Might 50, DEF 30)

**Art Direction**:
- Artistic, slightly eccentric — she looks like an inventor-wizard hybrid
- Renaissance-inspired outfit (flowing coat, doublet) remixed with alien tech: holographic blueprints floating around her, mechanical arm gadgets
- Carries a glowing stylus/pen that also functions as a weapon/tool
- Small hovering drone companion always near her (foreshadows Vitruvian Guardian)
- Expression: wide-eyed curiosity, mid-thought, maybe holding up a blueprint in one hand
- Color palette: **warm amber, parchment gold, cobalt blue (tech accents)**
- Eyes: wide, bright, amber-brown

---

### 3.4 Leonidas-chan
**ID**: `leonidas`  
**Title**: "The Unyielding Spartan"  
**Tagline**: Defender of the Thermopylae Gate  
**Role**: Tank  
**Stats**: HP 130 / Might 40 / Power 28  

**Lore**: Leonidas of Sparta held the pass with 300. Now she holds every pass in every dimension. Phalanx passive means she fights best alongside allies — and gets harder to kill the longer she stays in formation.

**Abilities**:
- **Passive — Phalanx**: +10 DEF per turn adjacent to an ally, stacks up to 3 turns (+30 max)
- **Shield Bash**: Power×1.8 melee + Armor Break + counter-stance (+20 DEF)
- **Spartan Wall**: +20 DEF to self + allies in range 2
- **THIS IS SPARTA!** (Ultimate): Charge 3 hexes, Power×2.5 + Root all adjacent enemies

**Art Direction**:
- Powerful, wide stance — she occupies space deliberately
- Spartan-style armor (corinthian helmet, bronze cuirass, greaves) with alien-metal plating layered on top — the armor looks ancient but battle-upgraded
- Massive circular shield on left arm, Spartan spear in right hand (alien-alloy versions)
- Her Phalanx stacks could be shown as golden shield energy rings around her
- Expression: stoic defiance — not angry, just utterly unmovable. One brow slightly raised. Classic.
- Color palette: **bronze, crimson cape, gold, iron grey**
- Eyes: steel grey or olive

---

### 3.5 Sun-sin-chan
**ID**: `sunsin`  
**Title**: "The Iron Admiral"  
**Tagline**: Admiral of the Turtle Fleet  
**Role**: Hybrid (dual land/water form)  
**Stats (Land)**: HP 100 / Might 65 / Power 60  
**Stats (Water)**: HP 100 / Might ~88 / Power 36 (transformed)  

**Lore**: Yi Sun-sin, Korea's greatest admiral. On land she is balanced and precise. On water, the Turtle Ship passive transforms her — movement slows, but power and defense skyrocket. She commands the rivers and seas.

**Abilities**:
- **Passive — Turtle Ship**: Dual-form: water tiles change stats entirely (Might +35%, DEF +30%, Power −40%, Move 1, Range 3)
- **Hwajeon / Ramming Speed**: Push + damage (range 3 land / range 1 water)
- **Naval Repairs / Broadside**: Ally heal OR AoE damage (water form)
- **Chongtong Barrage** (Ultimate): Charge attack (land) / long-range AoE cannon (water)

**Art Direction**:
- Two looks (optional dual render or composite):
  - **Land form**: Korean admiral's joseon-era naval uniform, sleek and precise, one hand on a blade
  - **Water form**: Turtle Ship armor — heavier, more mechanical, a full turtle-shell backplate or shoulder armor, more intimidating
- Carries a sword (joseon-era, alien-alloy accented)
- Turtle motif in costume details: shell-pattern armor plates, turtle crest on pauldron
- Expression (land): calm, strategic, reading the battlefield
- Expression (water): focused intensity, in her element
- Color palette: **teal/dark sea-green, brass, deep navy, red accent (Korean flag-inspired)**
- Eyes: sharp, steady, dark brown

---

### 3.6 Beethoven-chan
**ID**: `beethoven`  
**Title**: "The Storm Composer"  
**Tagline**: Conductor of the Sternensturm  
**Role**: Controller  
**Stats**: HP 90 / Might 35 / Power 65  

**Lore**: Cloned from resonant frequencies preserved in old concert hall stone, Beethoven-chan wields sound as a weapon. She pushes enemies with sonic waves, controls space with resonance zones, and stuns everything in range with her ultimate.

**Abilities**:
- **Passive — Crescendo**: +3 Power permanently per exclusive ability played (up to +21, 7 stacks)
- **Schallwelle**: Sonic line push — damage + knockback 2 tiles in a row
- **Freudenspur**: Create resonance zone tiles (allies get +2 Move when passing through, 2 turns)
- **Götterfunken** (Ultimate): AoE 46 dmg + Stun all in range 3

**Art Direction**:
- Elegant, theatrical, eccentric — she is conducting a battle symphony
- Long conductor's coat (possibly dramatic tails) with glowing musical note / waveform accents along the hem and collar
- Carries a glowing baton (her weapon — it emits visible sound waves)
- Sound wave VFX visually incorporated: visible rings/ripples around her, floating musical staffs or notes
- Hair wild or dramatically windswept (like mid-performance)
- Expression: eyes closed, utterly absorbed in the music — or wide open in an explosive crescendo moment
- Color palette: **deep purple, electric violet, silver/white, gold accent**
- Eyes: pale violet or silver-white (she's partly deaf, otherworldly quality)

---

### 3.7 Huang-chan (Qin Shi Huang)
**ID**: `huang`  
**Title**: "The First Emperor"  
**Tagline**: Empress of the Terracotta Legions  
**Role**: Controller (summon-based)  
**Stats**: HP 90 / Might 30 / Power 55  

**Lore**: Qin Shi Huang unified China and was buried with 8,000 terracotta warriors. Znyxorga extracted her echo from the clay at the mausoleum. She commands archers, warriors, and cavalry that literally rise from the ground. She does not fight alone. She never has.

**Abilities**:
- **Passive — Imperial Command**: Cannot use Basic Attacks herself; her Terracotta units do instead. Always has a Basic Attack card available for units.
- **Terracotta Legion**: Summon Archer or Warrior from clay (HP 40, 2 turns)
- **First Emperor's Command**: Summon Cavalry (HP 60, Move 3) + free Cavalry Charge card
- **Eternal Army** (Ultimate): Mind-control a non-boss enemy for 2 turns

**Art Direction**:
- Regal, commanding — she is an *empress*, not a soldier; she directs
- Qin-dynasty imperial robes mixed with terracotta-colored alien armor plating — some parts literally look like terracotta clay
- Crown/headdress with alien-gold ornamentation, glowing dynasty symbols
- One hand outstretched commanding her units; tiny terracotta soldiers visible at her feet or rising from the ground around her
- Expression: imperious, slightly detached — she sees the board, not the pieces
- Color palette: **terracotta orange, dynasty gold, deep crimson, black lacquer**
- Eyes: dark, calculating, cold authority

---

## 4. Upcoming Character (Reference Only — Not Yet Implemented)

### 4.1 Nelson-chan
**ID**: `nelson` (planned)  
**Theme**: Britannia Rules the Stars — UK rock / J-Rock fusion  
**Role**: TBD naval/ranged  
**Notes**: Coming after Napoleon's musical theme is implemented. Art should reflect Horatio Nelson (one arm, eyepatch historically), reimagined as a battle-clone. UK naval admiral coat, sci-fi cutlass, dramatic — think rock-opera energy meets Trafalgar.

---

## 5. Terracotta Units (Summons — Huang-chan)

Three summoned units that appear as in-game tokens (smaller sprites, no portrait needed unless the artist wants bonus content):

| Unit | Description |
|------|-------------|
| **Terracotta Archer** | Ranged (range 2), ~45 Might damage, HP 40, 2 turns. Classic archer pose, terracotta coloring, glowing eyes |
| **Terracotta Warrior** | Melee (range 1), ~30 Might damage, HP 40, 2 turns. Heavy clay armor, wide stance |
| **Terracotta Cavalry** | Mounted (Move 3), ~45 Might, HP 60, 2 turns. Horse and rider, both terracotta, glowing dynasty sigils |

All terracotta units: **terracotta orange/clay with golden glowing cracks** (like Kintsugi meets sci-fi reanimation). Eyes glow amber.

---

## 6. Output Checklist

For each of the 7 playable characters, deliver:

- [ ] **Portrait (512×512 or 1024×1024)** — bust/three-quarter, transparent background
- [ ] **Sprite (256×256)** — full body, idle stance, transparent background
- [ ] **Color palette swatch** — 4–6 hex colors defining the character's palette
- [ ] **(Optional) Alternate water form portrait** — Sun-sin-chan only

### File naming convention
```
[characterid]_portrait.png       → napoleon_portrait.png
[characterid]_sprite.png         → napoleon_sprite.png
[characterid]_palette.png        → napoleon_palette.png
sunsin_portrait_water.png        → Sun-sin water form
```

---

## 7. Technical Notes for Blender

### Recommended workflow
1. Start with a base female anime body rig (e.g., from Mixamo or a VRoid base)
2. Model costume/armor pieces as separate objects per character
3. Apply a toon/cel shader: **Principled BSDF with a custom diffuse ramp** (2–3 step hard ramp)
4. Outlines: Solidify modifier (thickness 0.02–0.04), flip normals, assign a pure black material
5. Lighting: Key light at 45° from front, soft fill opposite, bright rim light from behind using character's accent color
6. Camera: ~35mm lens equivalent, slight upward angle
7. Render as PNG with transparent background (RGBA)

### Toon shader node setup (Blender)
```
[Image Texture / Color] → [ColorRamp (Constant, 2 stops)] → [Principled BSDF (Base Color)] → Material Output
```
The ColorRamp controls how many distinct shading bands appear. 2 stops = flat/comic style. 3 stops = slightly more dimensional.

### Freestyle settings
- Enable Freestyle in Render Properties
- Line thickness: 1.5–2.5px
- Include: Silhouette, Border, Crease (threshold ~70°)
- Color: pure black (#000000)

---

## 8. Priority Order

If time is limited, render in this order (based on game usage):

1. Napoleon-chan (most prominent character, used in all marketing)
2. Genghis-chan
3. Leonidas-chan
4. Da Vinci-chan
5. Sun-sin-chan
6. Beethoven-chan
7. Huang-chan

---

*Last updated: April 2026. Game version: v0.21. Characters subject to stat balance changes but visual design is stable.*
