import React, { useState, useEffect } from "react";
import { audioEngine } from "@/audio/AudioEngine";
import { ChevronLeft, Shield, Zap, Heart, Star, BookOpen, Sword, Package, Map, Users, Lock } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";

// ── Shared styles ─────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};
const CARD_TYPE_COLOR: Record<string, string> = {
  attack: '#f87171', defense: '#60a5fa', buff: '#a78bfa', debuff: '#fb923c',
  movement: '#34d399', ultimate: '#f59e0b',
};
const AI_LABEL: Record<string, string> = {
  aggressive: 'Aggressive', ranged: 'Ranged', defensive: 'Defensive', berserker: 'Berserker',
};
const AI_COLOR: Record<string, string> = {
  aggressive: '#ef4444', ranged: '#60a5fa', defensive: '#fbbf24', berserker: '#f97316',
};

// ── Character Data ────────────────────────────────────────────────────────────

interface Ability {
  kind: "passive" | "ability" | "ultimate";
  icon: string;
  name: string;
  cost: string;
  desc: React.ReactNode;
}
interface CharacterEntry {
  id: string;
  name: string;
  title: string;
  tagline: string;
  role: "DPS RANGED" | "DPS MELEE" | "SUPPORT" | "TANK";
  portrait: string;
  accentColor: string;
  ringColor: string;
  lore: string;
  stats: { hp: number; might: number; power: number; defense: number; moveRange: number };
  abilities: Ability[];
}

const CHARACTERS: CharacterEntry[] = [
  {
    id: "napoleon", name: "Napoleon-chan", title: "The Brilliant Tactician",
    tagline: "Commander of the Clone Armies",
    role: "DPS RANGED", portrait: "/art/napoleon_portrait.png",
    accentColor: "#d946ef", ringColor: "rgba(217,70,239,0.55)",
    lore: "Once the greatest military mind in Earth's history, Napoleon Bonaparte was resurrected as a battle-clone by the Empire of Znyxorga. Now fighting in their interdimensional arena, this pint-sized prodigy commands forces with tactical genius, turning every battlefield into a stage for her brilliance. Her sharp eyes miss nothing — and her artillery never misses twice.",
    stats: { hp: 100, might: 70, power: 60, defense: 20, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🎯", name: "Vantage Point", cost: "Passive", desc: <>On a forest tile, basic attack range becomes 3. No <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense</span> bonus from forest — a calculated trade-off.</> },
      { kind: "ability", icon: "💥", name: "Artillery Barrage", cost: "2 Mana", desc: <>Unleash a devastating barrage dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>84</span> damage to a target at range 4.</> },
      { kind: "ability", icon: "⚔️", name: "Grande Armée", cost: "3 Mana", desc: <>Rally the troops! Grant +20% <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> AND <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power</span> to all allies for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo", cost: "3 Mana · Exhaust", desc: <>Fire 3 random artillery shots, each dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>42</span> to random enemies within range 4.</> },
    ],
  },
  {
    id: "genghis", name: "Genghis-chan", title: "The Unstoppable Conqueror",
    tagline: "Khan of a Thousand Battlefields",
    role: "DPS MELEE", portrait: "/art/genghis_portrait.png",
    accentColor: "#ef4444", ringColor: "rgba(239,68,68,0.55)",
    lore: "The mightiest conqueror ever to ride across the steppes of Earth has been reborn as a ferocious battle-clone. Her bloodlust only grows with each fallen foe — every kill sharpens her blade and restores her focus. In the arena of Znyxorga, she builds a new empire one victory at a time, and no wall of steel or magic has ever stopped her charge.",
    stats: { hp: 120, might: 50, power: 40, defense: 25, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🩸", name: "Bloodlust", cost: "Passive", desc: <>Each kill grants +15 <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> and restores 1 Mana. Stacks up to 3×.</> },
      { kind: "ability", icon: "⚡", name: "Mongol Charge", cost: "2 Mana", desc: <>Surge forward and strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>48</span> damage at range 3.</> },
      { kind: "ability", icon: "🌀", name: "Horde Tactics", cost: "3 Mana", desc: <>Command the horde! Deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>32</span> damage to ALL enemies within range 2 simultaneously.</> },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury", cost: "3 Mana · Exhaust", desc: <>Sweep the battlefield: deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>28</span> to every enemy on a straight line up to range 5.</> },
    ],
  },
  {
    id: "davinci", name: "Da Vinci-chan", title: "The Genius Inventor",
    tagline: "Visionary of the Stars",
    role: "SUPPORT", portrait: "/art/davinci_portrait.png",
    accentColor: "#34d399", ringColor: "rgba(52,211,153,0.55)",
    lore: "Leonardo da Vinci painted the Mona Lisa, designed flying machines, and unlocked the secrets of human anatomy — often simultaneously. Now, as a battle-clone for the Empire of Znyxorga, she brings that boundless creativity to the arena. Her inventions heal the fallen, scout the skies, and protect her team from whatever the galaxy hurls at them.",
    stats: { hp: 80, might: 35, power: 50, defense: 15, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🔧", name: "Tinkerer", cost: "Passive", desc: "If no exclusive ability card was used last turn, draw +1 card at the start of your turn." },
      { kind: "ability", icon: "✈️", name: "Flying Machine", cost: "2 Mana", desc: <>Teleport to any unoccupied hex within range <span style={{ color: "#34d399", fontWeight: 700 }}>Power ÷ 10</span> (e.g. 50 Power = range 5). Bypasses terrain and obstacles.</> },
      { kind: "ability", icon: "💚", name: "Masterpiece", cost: "3 Mana", desc: <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>Power × 1.0 HP</span> to an ally within range 3. Also removes the Poison debuff.</> },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", cost: "3 Mana · Exhaust", desc: <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>HP = Power×1</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might = Power×0.6</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense = Power×0.6</span>. Lasts 2 turns.</> },
    ],
  },
  {
    id: "leonidas", name: "Leonidas-chan", title: "The Unbreakable Wall",
    tagline: "Defender of the Thermopylae Gate",
    role: "TANK", portrait: "/art/leonidas_portrait.png",
    accentColor: "#f59e0b", ringColor: "rgba(245,158,11,0.55)",
    lore: "Three hundred Spartans. One narrow pass. An empire brought to its knees. Leonidas I held the Gates of Thermopylae against impossible odds, and her legend echoed across millennia — right into the cloning vats of Znyxorga. Reborn as a battle-clone in burnished bronze and blazing war-paint, Leonidas-chan turns every battlefield into a chokepoint. She does not retreat. She does not yield. She is the shield upon which enemy waves break and scatter.",
    stats: { hp: 130, might: 40, power: 20, defense: 35, moveRange: 2 },
    abilities: [
      { kind: "passive", icon: "🛡️", name: "Phalanx", cost: "Passive", desc: <>Each turn Leonidas ends adjacent to an ally, she gains +<span style={{ color: "#fbbf24", fontWeight: 700 }}>8 Defense</span> (stacks up to 3 turns, max +24). Stay close to teammates over multiple turns to build an iron wall.</> },
      { kind: "ability", icon: "⚡", name: "Shield Bash", cost: "2 Mana", desc: <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>1.5× Power (30 dmg)</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−20% Defense for 2 turns).</> },
      { kind: "ability", icon: "🏛️", name: "Spartan Wall", cost: "3 Mana", desc: <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span> to Leonidas and all allies within range 2 for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", cost: "3 Mana · Exhaust", desc: <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>3× Power (60 dmg)</span>. All enemies adjacent to the impact are <span style={{ color: "#f87171", fontWeight: 700 }}>Demoralized</span> for 1 turn (50% chance to skip movement and card plays).</> },
    ],
  },
  {
    id: "sunsin", name: "Sun-sin-chan", title: "The Admiral of the Turtle Fleet",
    tagline: "Admiral of the Turtle Fleet",
    role: "DPS MELEE", portrait: "/art/sunsin_portrait.jpg",
    accentColor: "#38bdf8", ringColor: "rgba(56,189,248,0.55)",
    lore: "Yi Sun-sin repelled an entire Japanese armada with a handful of ironclad turtle ships and an unshakeable will. The Empire of Znyxorga found her genetic echo preserved in the sea-salt timber of the Joseon docks and grew her in the deep-blue vats of their naval division. On dry land she fights with disciplined efficiency. But put ocean tiles between her and an enemy — and the turtle ship awakens. Cannons fire. Hulls hold. Admirals do not retreat.",
    stats: { hp: 100, might: 65, power: 60, defense: 25, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🐢", name: "Turtle Ship", cost: "Passive", desc: <>Can move onto water tiles. On water: <span style={{ color: "#f87171", fontWeight: 700 }}>+40% Might</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span>, <span style={{ color: "#60a5fa", fontWeight: 700 }}>−40% Power</span>, −1 Movement, Range 3 basic attack. On land: balanced stats, Range 1.</> },
      { kind: "ability", icon: "🔥", name: "Hwajeon / Ramming Speed", cost: "2 Mana", desc: <><span style={{ color: "#a78bfa", fontWeight: 700 }}>Power×1.2</span> at range 3. Pushes target back 1 hex on hit.</> },
      { kind: "ability", icon: "🚢", name: "Naval Command / Broadside", cost: "3 Mana", desc: <>+15% <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> &amp; <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power</span> to all allies for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "Chongtong Barrage", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#a78bfa", fontWeight: 700 }}>Power×2.0</span> to all enemies in range 5.</> },
    ],
  },
];

const ROLE_STYLE: Record<string, { text: string; border: string; bg: string }> = {
  "DPS RANGED": { text: "text-fuchsia-300", border: "border-fuchsia-500/50", bg: "bg-fuchsia-900/30" },
  "DPS MELEE":  { text: "text-rose-300",    border: "border-rose-500/50",    bg: "bg-rose-900/30" },
  "SUPPORT":    { text: "text-emerald-300", border: "border-emerald-500/50", bg: "bg-emerald-900/30" },
  "TANK":       { text: "text-amber-300",   border: "border-amber-500/50",   bg: "bg-amber-900/30" },
};
const STAT_MAX = { hp: 180, might: 100, power: 100, defense: 50, moveRange: 5 };

// ── Tile Data ─────────────────────────────────────────────────────────────────

interface TileEntry {
  type: string; icon: string; name: string; color: string;
  image: string;
  effects: { label: string; detail: string }[];
  tip: string;
}

const TILES: TileEntry[] = [
  {
    type: 'plain', icon: '🟫', name: 'Plain', color: '#a3a3a3',
    image: '/art/tiles/Plain.png',
    effects: [{ label: 'No bonuses', detail: 'Open ground — free to move through, no stat modifiers.' }],
    tip: 'Most of the board. Use as a staging area.',
  },
  {
    type: 'forest', icon: '🌲', name: 'Forest', color: '#22c55e',
    image: '/art/tiles/Forest.png',
    effects: [
      { label: '+Defense', detail: 'Units on a forest tile gain a Defense bonus against incoming attacks.' },
      { label: 'Stealth', detail: 'Reduces enemy targeting priority.' },
      { label: 'Napoleon Passive', detail: "Napoleon-chan's basic attack range extends to 3 from forest, but she loses the Defense bonus." },
    ],
    tip: 'Great for ranged units and defensive positioning.',
  },
  {
    type: 'mountain', icon: '⛰️', name: 'Mountain', color: '#78716c',
    image: '/art/tiles/Mountains.png',
    effects: [
      { label: 'Impassable', detail: 'No unit can enter or cross a mountain hex.' },
      { label: 'Blocks Line of Sight', detail: 'Abilities and attacks cannot target through mountains on the same axial line.' },
    ],
    tip: 'Use mountains as natural barriers and cover. Position around them, not through them.',
  },
  {
    type: 'river', icon: '🌊', name: 'River', color: '#38bdf8',
    image: '/art/tiles/River.png',
    effects: [
      { label: 'Impassable', detail: 'Units cannot enter river tiles voluntarily — movement is blocked.' },
      { label: 'Lethal Displacement', detail: 'If knocked onto a river tile by an ability (e.g. charge, push), the unit is instantly killed.' },
    ],
    tip: 'Rivers are hard walls — route around them or use them to funnel enemies into a killing zone.',
  },
  {
    type: 'mana_crystal', icon: '💎', name: 'Mana Crystal', color: '#c084fc',
    image: '/art/tiles/Mana_Crystal.png',
    effects: [
      { label: '+1 Mana on Entry', detail: 'Standing on or moving onto a Mana Crystal tile restores 1 Mana to that unit.' },
    ],
    tip: 'Contest mana crystals early for tempo advantage.',
  },
];

// ── Item Data ─────────────────────────────────────────────────────────────────

interface ItemEntry {
  id: string; name: string; icon: string; tier: string;
  description: string; targetCharacter?: string;
  statBonus?: Partial<Record<string, number>>;
  passiveTag?: string;
}

const ITEMS: ItemEntry[] = [
  { id: 'iron_gauntlets',   name: 'Iron Gauntlets',   icon: '🥊', tier: 'common',   description: '+8 Might for this run.',                                    statBonus: { might: 8 } },
  { id: 'bone_plate',       name: 'Bone Plate',        icon: '🦴', tier: 'common',   description: '+6 Defense for this run.',                                  statBonus: { defense: 6 } },
  { id: 'vitality_shard',   name: 'Vitality Shard',    icon: '💠', tier: 'common',   description: '+25 max HP for this run.',                                  statBonus: { hp: 25 } },
  { id: 'mana_conduit',     name: 'Mana Conduit',      icon: '🔋', tier: 'common',   description: '+5 Power for this run.',                                    statBonus: { power: 5 } },
  { id: 'battle_drum',      name: 'Battle Drum',       icon: '🥁', tier: 'uncommon', description: 'After killing an enemy, draw 1 card.' },
  { id: 'arena_medkit',     name: 'Arena Medkit',      icon: '💊', tier: 'uncommon', description: 'Heal 20 HP at the start of your turn if below 40% HP.' },
  { id: 'void_shard',       name: 'Void Shard',        icon: '🔥', tier: 'uncommon', description: 'Basic attacks deal +10 bonus damage.',                     statBonus: { might: 10 } },
  { id: 'card_satchel',     name: 'Card Satchel',      icon: '🎒', tier: 'uncommon', description: '+1 starting hand size for this run.' },
  { id: 'strategists_case', name: "Strategist's Case", icon: '💼', tier: 'uncommon', description: '+2 starting hand size for this run.' },
  { id: 'quick_boots',      name: 'Quick Boots',       icon: '👟', tier: 'uncommon', description: '+1 movement range permanently.' },
  { id: 'soul_ember',       name: 'Soul Ember',        icon: '🕯️', tier: 'uncommon', description: 'On kill, restore 15 HP to this character.' },
  { id: 'alien_core',       name: 'Alien Core',        icon: '🧬', tier: 'rare',     description: '+12 Power. Ability damage +15%.',                          statBonus: { power: 12 } },
  { id: 'gladiator_brand',  name: "Gladiator's Brand", icon: '⚡', tier: 'rare',     description: 'First ability each fight costs 0 Mana.' },
  { id: 'grand_strategy',   name: 'Grand Strategy',    icon: '🗺️', tier: 'rare',     description: 'Artillery Barrage hits an additional adjacent target.',      targetCharacter: 'napoleon' },
  { id: 'emperors_coat',    name: "Emperor's Coat",    icon: '🪖', tier: 'rare',     description: 'Grande Armée also restores 1 Mana to each buffed ally.',    targetCharacter: 'napoleon' },
  { id: 'eternal_hunger',   name: 'Eternal Hunger',    icon: '🩸', tier: 'rare',     description: 'Bloodlust kill stacks carry over between fights for the entire run.',               targetCharacter: 'genghis' },
  { id: 'khans_seal',       name: "Khan's Seal",       icon: '🏹', tier: 'rare',     description: "Rider's Fury also stuns each hit enemy for 1 turn.",        targetCharacter: 'genghis' },
  { id: 'aerial_lens',      name: 'Aerial Lens',       icon: '🔭', tier: 'rare',     description: 'Flying Machine can swap position with an allied unit.',      targetCharacter: 'davinci' },
  { id: 'life_formula',     name: 'Life Formula',      icon: '💚', tier: 'rare',     description: 'Masterpiece heals an additional 25 HP.',                    targetCharacter: 'davinci' },
  { id: 'znyxorgas_eye',   name: "Znyxorga's Eye",    icon: '👁️', tier: 'legendary', description: 'After defeating an enemy, your next card costs 0 Mana.' },
  { id: 'void_armor',       name: 'Void Armor',        icon: '🛡️', tier: 'legendary', description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.' },
  { id: 'arena_champion',   name: 'Arena Champion',    icon: '🏆', tier: 'legendary', description: 'All stats +10 while this character is alive.',              statBonus: { hp: 10, might: 10, power: 10, defense: 10 } },
];

const CHAR_LABEL: Record<string, { name: string; color: string }> = {
  napoleon: { name: 'Napoleon', color: '#d946ef' },
  genghis:  { name: 'Genghis',  color: '#ef4444' },
  davinci:  { name: 'Da Vinci', color: '#34d399' },
  leonidas: { name: 'Leonidas', color: '#f59e0b' },
  sunsin:   { name: 'Sun-sin',  color: '#38bdf8' },
};

// ── Card Data ─────────────────────────────────────────────────────────────────

interface CardEntry {
  definitionId: string; name: string; icon: string;
  manaCost: number; type: string; rarity: string;
  description: string; exclusiveTo?: string;
}

const CARDS: CardEntry[] = [
  // Shared
  { definitionId: 'shared_basic_attack',  name: 'Basic Attack',   icon: '⚔️', manaCost: 1, type: 'attack',   rarity: 'common', description: 'Deal Might damage to a target in attack range.' },
  { definitionId: 'shared_shield',        name: 'Shields Up',     icon: '🛡️', manaCost: 1, type: 'defense',  rarity: 'common', description: 'Gain +10 Defense until the start of your next turn.' },
  { definitionId: 'shared_quick_move',    name: 'Quick Move',     icon: '🏃', manaCost: 1, type: 'movement', rarity: 'common', description: '+2 movement this turn.' },
  { definitionId: 'shared_mend',          name: 'Mend',           icon: '💚', manaCost: 1, type: 'defense',  rarity: 'common', description: 'Heal yourself for 20 HP.' },
  { definitionId: 'shared_battle_cry',    name: 'Battle Cry',     icon: '📣', manaCost: 1, type: 'buff',     rarity: 'common', description: '+10 Might this turn.' },
  { definitionId: 'shared_gamble',        name: 'Gamble',         icon: '🎲', manaCost: 1, type: 'buff',     rarity: 'common', description: 'Discard 2 random cards. Draw 2 new ones.' },
  { definitionId: 'shared_mud_throw',     name: 'Mud Throw',      icon: '🪣', manaCost: 1, type: 'debuff',   rarity: 'common', description: 'Enemy loses 1 movement for 2 turns. Range 3.' },
  { definitionId: 'shared_demoralize',    name: 'Demoralize',     icon: '😰', manaCost: 3, type: 'debuff',   rarity: 'common', description: '50% chance per turn to skip movement & cards. Lasts 2 turns. Range 2.' },
  { definitionId: 'shared_armor_break',   name: 'Armor Break',    icon: '💥', manaCost: 2, type: 'debuff',   rarity: 'common', description: 'Enemy loses 25% Defense for 2 turns. Range 2.' },
  { definitionId: 'shared_silence',       name: 'Silence',        icon: '🔇', manaCost: 3, type: 'debuff',   rarity: 'common', description: 'Enemy Power drops to 0 for 1 turn. Range 1.' },
  { definitionId: 'shared_poison_dart',   name: 'Poison Dart',    icon: '☠️', manaCost: 3, type: 'debuff',   rarity: 'common', description: 'Enemy loses 5 Might and 5 Defense each turn. Removed on heal. Range 2.' },
  // Napoleon
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.4 damage to a target at range 4.',                  exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, type: 'buff',    rarity: 'rare',    description: '+20% Might AND Power to all allies for 2 turns.',            exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_final_salvo',       name: 'Final Salvo',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — 3 random Power×0.7 hits on enemies within range 4.', exclusiveTo: 'Napoleon' },
  // Genghis
  { definitionId: 'genghis_mongol_charge',  name: 'Mongol Charge', icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.2 damage at range 3.',                              exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics',  name: 'Horde Tactics', icon: '🌀', manaCost: 3, type: 'attack',  rarity: 'rare',    description: 'Power×0.8 damage to ALL enemies within range 2.',            exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_riders_fury',    name: "Rider's Fury",  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Power×0.7 to ALL enemies on a line up to range 5.", exclusiveTo: 'Genghis' },
  // Leonidas
  { definitionId: 'leonidas_shield_bash',   name: 'Shield Bash',    icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.5 damage at range 1. Applies Armor Break (−25% Defense for 2 turns).',    exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall',  name: 'Spartan Wall',   icon: '🏛️', manaCost: 3, type: 'defense', rarity: 'rare',    description: '+20 Defense to Leonidas and all allies within range 2.',     exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_this_is_sparta',name: 'THIS IS SPARTA!',icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Power×3 to target + Demoralize adjacent enemies (1t).', exclusiveTo: 'Leonidas' },
  // Da Vinci
  { definitionId: 'davinci_flying_machine',     name: 'Flying Machine',     icon: '✈️', manaCost: 2, type: 'movement', rarity: 'rare',    description: 'Teleport to any unoccupied hex within range Power÷10 (50 Power = range 5).', exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',        name: 'Masterpiece',        icon: '💚', manaCost: 3, type: 'defense',  rarity: 'rare',    description: 'Heal an ally within range 3 for Power×1.0 HP.',           exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, type: 'ultimate',  rarity: 'ultimate', description: 'EXHAUST — Summon drone: HP=Power×1, Might=Power×0.6, Defense=Power×0.6. Lasts 2 turns.', exclusiveTo: 'Da Vinci' },
  // Sun-sin
  { definitionId: 'sunsin_hwajeon',             name: 'Hwajeon / Ramming Speed', icon: '🔥', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.2 at range 3. Pushes target back 1 hex on hit.',           exclusiveTo: 'Sun-sin' },
  { definitionId: 'sunsin_naval_command',       name: 'Naval Command / Broadside', icon: '🚢', manaCost: 3, type: 'buff',   rarity: 'rare',    description: '+15% Might & Power to all allies for 2 turns.',             exclusiveTo: 'Sun-sin' },
  { definitionId: 'sunsin_broadside',           name: 'Broadside',           icon: '💥', manaCost: 3, type: 'attack',  rarity: 'rare',    description: 'Power×0.7 to all enemies within range 3.',                  exclusiveTo: 'Sun-sin' },
  { definitionId: 'sunsin_chongtong_barrage',   name: 'Chongtong Barrage',   icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Power×2.0 to all enemies in range 5.',             exclusiveTo: 'Sun-sin' },
];

const EXCL_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b', 'Sun-sin': '#38bdf8',
};

// ── Enemy Data ────────────────────────────────────────────────────────────────

interface EnemyAbilityEntry { icon: string; name: string; desc: string; }
interface EnemyEntry {
  id: string; name: string; icon: string; act: number;
  rank: 'Minion' | 'Elite' | 'Boss';
  ai: string;
  stats: { hp: number; might: number; power: number; defense: number; moveRange: number; attackRange: number };
  description: string;
  abilities?: EnemyAbilityEntry[];
}

const ENEMIES: EnemyEntry[] = [
  { id: 'glorp_shambler',    name: 'Glorp Shambler',       icon: '🍄', act: 1, rank: 'Minion', ai: 'aggressive', stats: { hp: 60,  might: 35, power: 25, defense: 8,  moveRange: 2, attackRange: 1 }, description: 'A fungal creature from the swamps of Gloprax IV. Slow but relentless — it will walk straight into your lines.' },
  { id: 'zyx_skitter',       name: 'Zyx Skitter',          icon: '🦟', act: 1, rank: 'Minion', ai: 'aggressive', stats: { hp: 30,  might: 22, power: 15, defense: 4,  moveRange: 4, attackRange: 1 }, description: 'Fast-moving insectoid scouts. Fragile alone, but they arrive in pairs and swarm exposed flanks.' },
  { id: 'naxion_scout',      name: 'Naxion Scout',         icon: '👾', act: 1, rank: 'Minion', ai: 'ranged',     stats: { hp: 70,  might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 }, description: 'Arena gladiators hired by Znyxorga for target practice. Keeps its distance and uses ranged energy blasts.' },
  { id: 'vron_crawler',      name: 'Vron Crawler',         icon: '🦀', act: 1, rank: 'Minion', ai: 'defensive',  stats: { hp: 85,  might: 28, power: 20, defense: 22, moveRange: 2, attackRange: 1 }, description: 'An armored crustacean from the deep voids. Slow but thick-shelled — its defense is its offense.' },
  { id: 'krath_champion',    name: 'Krath Champion',       icon: '⚔️', act: 1, rank: 'Elite',  ai: 'berserker',  stats: { hp: 120, might: 55, power: 40, defense: 18, moveRange: 3, attackRange: 1 }, description: 'A seasoned gladiator of the Krath species. Fights with reckless fury, dealing heavy damage before falling.',
    abilities: [
      { icon: '🔥', name: 'Battle Rage', desc: 'Gains +25 Might and +10 Defense for 2 turns. (Every 3 turns)' },
      { icon: '⚔️', name: "Champion's Strike", desc: 'Deals 1.8× Might damage to the nearest enemy in range 2. (Every 2 turns)' },
    ],
  },
  { id: 'spore_cluster',     name: 'Spore Node',           icon: '🔴', act: 1, rank: 'Elite',  ai: 'ranged',     stats: { hp: 40,  might: 20, power: 30, defense: 5,  moveRange: 1, attackRange: 2 }, description: 'A cluster of three spore emitters. Poisons the air and bursts with AoE damage every 2 turns.',
    abilities: [
      { icon: '☣️', name: 'Toxic Cloud', desc: 'Applies Poison to all enemies within range 2. (Every 2 turns)' },
      { icon: '💥', name: 'Spore Burst', desc: 'Deals 25 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
  { id: 'vexlar',            name: 'Vexlar',               icon: '🐆', act: 1, rank: 'Minion', ai: 'aggressive', stats: { hp: 80,  might: 25, power: 30, defense: 30, moveRange: 3, attackRange: 1 }, description: 'Alien big cats introduced in your first fight. Thick-hided hunters with a terrifying lunge — they will seek out your weakest defender.',
    abilities: [
      { icon: '🐆', name: 'Predator Leap', desc: 'Leaps up to range 4 toward the enemy with the lowest Defense and immediately attacks. (Every 3 turns)' },
    ],
  },
  { id: 'iron_wall',         name: 'Iron Wall',            icon: '🤖', act: 1, rank: 'Boss',   ai: 'defensive',  stats: { hp: 200, might: 60, power: 50, defense: 35, moveRange: 2, attackRange: 1 }, description: 'Act I boss. A war mech that regenerates when wounded, blasts AoE, and locks down with Turret Mode.',
    abilities: [
      { icon: '💚', name: 'Shield Array', desc: 'Heals self for 70 HP. Triggers ONCE when below 50% HP.' },
      { icon: '⚡', name: 'EMP Blast', desc: 'Deals 40 damage to all enemies within range 2. (Every 3 turns)' },
      { icon: '🤖', name: 'Turret Mode', desc: 'Gains +40 Defense for 2 turns. (Every 4 turns)' },
    ],
  },
  { id: 'mog_toxin',         name: 'Mog Toxin',            icon: '☣️', act: 2, rank: 'Minion', ai: 'ranged',     stats: { hp: 75,  might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 }, description: 'A long-range biological hazard unit. Deals poison-type damage from across the field.' },
  { id: 'qrix_hunter',       name: 'Qrix Hunter',          icon: '🏹', act: 2, rank: 'Minion', ai: 'ranged',     stats: { hp: 70,  might: 25, power: 50, defense: 8,  moveRange: 3, attackRange: 3 }, description: 'A precision marksman deployed by arena sponsors. Has the longest attack range of any common enemy.' },
  { id: 'void_wraith',       name: 'Void Wraith',          icon: '👻', act: 2, rank: 'Minion', ai: 'aggressive', stats: { hp: 65,  might: 45, power: 40, defense: 5,  moveRange: 4, attackRange: 1 }, description: 'Spectral energy creature from the Null Zone. Fast and hits hard, but shatters quickly.' },
  { id: 'krath_berserker',   name: 'Krath Berserker',      icon: '💢', act: 2, rank: 'Elite',  ai: 'berserker',  stats: { hp: 140, might: 75, power: 55, defense: 14, moveRange: 4, attackRange: 1 }, description: 'The veteran of Act I. Goes berserk for a burst of +35 Might, then leaps across the field.',
    abilities: [
      { icon: '💢', name: 'Bloodrage', desc: 'Gains +35 Might and loses 20 Defense for 2 turns. (Every 3 turns)' },
      { icon: '🦘', name: 'Savage Leap', desc: 'Teleports adjacent to the closest enemy and deals 2.0× Might damage. (Every 2 turns)' },
    ],
  },
  { id: 'phasewarden',       name: 'Phasewarden',          icon: '🔮', act: 2, rank: 'Elite',  ai: 'ranged',     stats: { hp: 110, might: 55, power: 65, defense: 20, moveRange: 5, attackRange: 2 }, description: 'A phase-shifted guard that blinks away and drains Power from all nearby enemies.',
    abilities: [
      { icon: '🔮', name: 'Dimensional Drain', desc: 'Applies Armor Break to all enemies within range 3 for 2 turns. (Every 3 turns)' },
      { icon: '✨', name: 'Phase Blink', desc: 'Teleports adjacent to the closest enemy and deals 1.2× Might. (Every 2 turns)' },
    ],
  },
  { id: 'twin_terror_a',     name: 'Terror Alpha',         icon: '🗡️', act: 2, rank: 'Boss',   ai: 'berserker',  stats: { hp: 160, might: 70, power: 55, defense: 20, moveRange: 4, attackRange: 1 }, description: 'Act II boss. Charges at full speed and surges with Twin Fury — kill fast before Beta heals.',
    abilities: [
      { icon: '🗡️', name: 'Alpha Rush', desc: 'Charges 4 hexes and deals 2.2× Might damage on impact. (Every 2 turns)' },
      { icon: '🔥', name: 'Twin Fury', desc: 'Gains +30 Might for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'twin_terror_b',     name: 'Terror Beta',          icon: '🛡️', act: 2, rank: 'Boss',   ai: 'defensive',  stats: { hp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 }, description: 'Act II boss. Tanks damage and self-heals once when near death — always eliminate Alpha first.',
    abilities: [
      { icon: '💚', name: 'Aegis Heal', desc: 'Heals self for 90 HP. Triggers ONCE when below 40% HP.' },
      { icon: '🛡️', name: 'Mirror Aegis', desc: 'Gains +50 Defense for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'znyxorga_champion', name: "Znyxorga's Champion",  icon: '👑', act: 3, rank: 'Boss',   ai: 'berserker',  stats: { hp: 500, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 }, description: "The final boss. Hits all characters simultaneously with Arena Collapse. Becomes invincible at 50% HP while permanently gaining stats. Grows even more powerful below 30% HP. 500 HP total — the ultimate endurance test.",
    abilities: [
      { icon: '👑', name: 'Arena Collapse', desc: 'The arena becomes a weapon — deals 55 damage to ALL player characters simultaneously. (Every 3 turns)' },
      { icon: '🛡️', name: 'Phase Shift', desc: 'INVINCIBLE for 2 turns and gains +25 Might/Power/Defense permanently. Triggers ONCE when below 50% HP — prepare for a power spike!' },
      { icon: '⭐', name: "Champion's Will", desc: "Driven by Znyxorga's will — gains +35 Might/Power/Defense permanently. Triggers ONCE when below 30% HP. Finish it fast!" },
      { icon: '💥', name: 'Tyrant Strike', desc: 'Channels Power into a devastating strike — Power×1.6 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
];

// ── Lore Data ─────────────────────────────────────────────────────────────────

interface LoreEntry {
  id: string; title: string; icon: string;
  unlocked: boolean; unlockHint?: string;
  text: string;
}

const LORE: LoreEntry[] = [
  {
    id: 'empire', title: 'The Empire of Znyxorga', icon: '👑', unlocked: true,
    text: `Spanning forty-seven star systems across the Outer Veil, the Empire of Znyxorga is the most powerful civilization in this arm of the galaxy. Its citizens live in orbital pleasure-rings while conquered species labor below. At its center sits the Grand Colosseum — a structure larger than a small moon, broadcasting arena combat to billions of subscribers.

The Emperor himself rarely speaks. His will is enacted through the Arena Directorate, whose mandate is simple: keep the fights fresh, keep the crowds entertained, and source the most legendary warriors the multiverse has ever seen.

Earth was flagged as a priority acquisition in Znyxorga Sector Report 4471-X. Reason: "anomalously high concentration of historically significant combat-optimized biological units." In other words — Earth had very good warriors, and Znyxorga wanted them.`,
  },
  {
    id: 'cloning', title: 'The Clone Wars Protocol', icon: '🧬', unlocked: true,
    text: `Znyxorga does not steal warriors. It steals their ghosts.

The Clone Wars Protocol is a top-secret extraction method developed by Imperial Biomancer Drex-9. Using tachyon-threaded DNA anchors embedded in historical sites on Earth, the Directorate harvests residual genetic echoes of the dead — warriors so powerful their DNA left traces in the soil where they fought.

These echoes are grown in vats over seventy-two hours, producing a biological duplicate: full memories, fighting instincts, personality. The clone believes it is the original. Znyxorga lets them believe it. It's better for ratings.

The clones do not age. They heal between fights. They fight forever — or until the audience gets bored.`,
  },
  {
    id: 'arena', title: 'The Arena', icon: '🏟️', unlocked: true,
    text: `The Grand Colosseum generates 47 unique battlefield configurations per season. Terrain is modular: forests, mountains, rivers, and mana crystal deposits are rotated between matches to prevent strategy stagnation.

Each configuration is scored by audience engagement metrics in real time. Boring fights — those with long standoffs or one-sided slaughters — trigger terrain shifts mid-match. The Arena always wants blood.

The mana crystal fields are artificial — power cells seeded into the terrain to reward aggressive positioning. Znyxorga's sports theorists discovered that matches with mana crystals produce 34% more ability usage and 22% higher viewer retention. They've been standard issue ever since.`,
  },
  {
    id: 'project_genesis', title: 'Project Genesis — CLASSIFIED', icon: '🔒', unlocked: false,
    unlockHint: 'Complete Act I to unlock',
    text: `[CLEARANCE LEVEL ALPHA-7 REQUIRED]

Project Genesis is not about entertainment. The Arena is a cover.

Directorate Internal Memo #7741: "Subjects demonstrating cross-clone memory persistence, inter-individual tactical coordination, and anomalous emotional bonding are to be flagged for secondary extraction. Do not terminate. Preserve at all costs."

They're not watching to see who wins. They're watching to see if the clones start to remember who they are — and whether that changes how they fight.

Something about the soul persists in the DNA. Drex-9 calls it "echo resonance." The Emperor calls it "the asset."`,
  },
  {
    id: 'the_collector', title: 'The Collector', icon: '🔒', unlocked: false,
    unlockHint: 'Complete a full run to unlock',
    text: `There is a being in the upper tiers of the Colosseum who never broadcasts. No subscription fee. No camera access. Just a private box, always occupied, always watching.

Arena staff call it The Collector. No one knows its species. No one has spoken to it. But after every match where a clone does something unexpected — something no tactical simulation predicted — a small token is sent to that clone's recovery chamber. No note. No origin.

Napoleon found a compass. Genghis found a wolf tooth. Leonardo found a note: a single sketch of a flying machine, centuries ahead of the design she'd remembered drawing.

The Collector is looking for something specific. It hasn't found it yet.`,
  },
  {
    id: 'final_entry', title: 'Last Entry — Clone #001', icon: '🔒', unlocked: false,
    unlockHint: 'Defeat Znyxorga\'s Champion to unlock',
    text: `[RECOVERED FROM ARENA ARCHIVE — FILE INTEGRITY: 31%]

...I remember a battlefield. Not the Colosseum. Real mud. Real cold. Real fear.

I remember thinking I was going to lose.

I did not lose.

They built this body from what was left in the ground at Austerlitz, at the steppes, at the walls of the pass. But what they put in the vat — what they grew — was not just genetics. It was will.

I do not know if I am real. I do not know if the woman I remember being was real. But I know that when I fight, something in me refuses.

That refusal is mine. They cannot clone it. They cannot own it.

If you're reading this: keep refusing.

— N.`,
  },
];

// ── Tab Config ────────────────────────────────────────────────────────────────

type Tab = 'characters' | 'tiles' | 'items' | 'cards' | 'enemies' | 'effects' | 'events' | 'lore';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'characters', label: 'Characters', icon: <Users className="w-4 h-4" /> },
  { id: 'tiles',      label: 'Tiles',      icon: <Map className="w-4 h-4" /> },
  { id: 'items',      label: 'Items',      icon: <Package className="w-4 h-4" /> },
  { id: 'cards',      label: 'Cards',      icon: <Sword className="w-4 h-4" /> },
  { id: 'enemies',    label: 'Enemies',    icon: <Shield className="w-4 h-4" /> },
  { id: 'effects',    label: 'Effects',    icon: <Zap className="w-4 h-4" /> },
  { id: 'events',     label: 'Arena Events', icon: <Star className="w-4 h-4" /> },
  { id: 'lore',       label: 'Lore',       icon: <BookOpen className="w-4 h-4" /> },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export default function HistoricalArchives({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChar) audioEngine.playTheme(selectedChar);
    else audioEngine.stopTheme();
  }, [selectedChar]);
  useEffect(() => () => { audioEngine.stopTheme(); }, []);

  const char = selectedChar ? CHARACTERS.find(c => c.id === selectedChar) ?? null : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      {char ? (
        <DetailView char={char} onBack={() => setSelectedChar(null)} />
      ) : (
        <MainView
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setSelectedChar(null); }}
          onSelectChar={setSelectedChar}
          onBack={onBack}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN VIEW (tabs)
══════════════════════════════════════════════════════════════ */
function MainView({
  activeTab, onTabChange, onSelectChar, onBack,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onSelectChar: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        <img src="/art/group_splash.jpg" alt="Battle scene"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ filter: 'brightness(0.45) saturate(1.1)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-orbitron text-[10px] tracking-[0.5em] text-purple-400 mb-2">THE EMPIRE OF ZNYXORGA</p>
          <h1 className="font-orbitron font-black text-4xl text-white" style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>
            HISTORICAL ARCHIVES
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Game Compendium — All Classified Data</p>
        </div>
        <button onClick={onBack}
          className="absolute top-4 left-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
          <ChevronLeft className="w-4 h-4" /> MAIN MENU
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-800/80 px-6" style={{ background: 'rgba(4,2,18,0.97)' }}>
        <div className="flex gap-1 max-w-5xl mx-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-2 px-5 py-3.5 font-orbitron text-[11px] tracking-wider transition-all border-b-2"
              style={{
                color: activeTab === tab.id ? '#22d3ee' : '#64748b',
                borderBottomColor: activeTab === tab.id ? '#22d3ee' : 'transparent',
                background: activeTab === tab.id ? 'rgba(34,211,238,0.06)' : 'transparent',
              }}>
              {tab.icon} {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto" style={{ background: 'rgba(2,4,14,0.85)' }}>
        {activeTab === 'characters' && <CharactersTab onSelectChar={onSelectChar} />}
        {activeTab === 'tiles'      && <TilesTab />}
        {activeTab === 'items'      && <ItemsTab />}
        {activeTab === 'cards'      && <CardsTab />}
        {activeTab === 'enemies'    && <EnemiesTab />}
        {activeTab === 'effects'    && <EffectsTab />}
        {activeTab === 'events'     && <ArenaEventsTab />}
        {activeTab === 'lore'       && <LoreTab />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHARACTERS TAB
══════════════════════════════════════════════════════════════ */
function CharactersTab({ onSelectChar }: { onSelectChar: (id: string) => void }) {
  return (
    <div className="flex items-center justify-center px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-[1200px] w-full">
        {CHARACTERS.map(c => {
          const roleStyle = ROLE_STYLE[c.role];
          return (
            <button key={c.id} onClick={() => onSelectChar(c.id)}
              className="group relative rounded-2xl overflow-hidden border border-slate-700/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl text-left"
              style={{ aspectRatio: '3/4' }}>
              <img src={c.portrait} alt={c.name}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                style={{ filter: 'brightness(0.75)' }} />
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${c.accentColor}55 0%, rgba(2,4,14,0.7) 35%, transparent 70%)` }} />
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ boxShadow: `inset 0 0 0 2px ${c.accentColor}` }} />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-2 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
                  {c.role}
                </div>
                <h2 className="font-orbitron font-black text-xl text-white leading-tight">{c.name}</h2>
                <p className="text-sm italic mt-0.5" style={{ color: c.accentColor }}>{c.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 italic">"{c.tagline}"</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-orbitron tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: c.accentColor }}>
                  VIEW DOSSIER →
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TILES TAB
══════════════════════════════════════════════════════════════ */
function TilesTab() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-8">TERRAIN TYPES</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TILES.map(tile => (
          <div key={tile.type} className="rounded-xl border p-5"
            style={{ background: 'rgba(8,5,25,0.9)', borderColor: tile.color + '40' }}>
            <div className="flex items-center gap-3 mb-4">
              <img src={tile.image} alt={tile.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
                style={{ border: `1.5px solid ${tile.color}50` }} />
              <div>
                <h3 className="font-orbitron font-bold text-lg text-white">{tile.name}</h3>
                <p className="text-[11px] italic text-slate-500 mt-0.5">{tile.tip}</p>
              </div>
            </div>
            <div className="space-y-2">
              {tile.effects.map(ef => (
                <div key={ef.label} className="rounded-lg px-3 py-2" style={{ background: tile.color + '12', border: `1px solid ${tile.color}30` }}>
                  <span className="font-orbitron text-[10px] font-bold" style={{ color: tile.color }}>{ef.label}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{ef.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ITEMS TAB
══════════════════════════════════════════════════════════════ */
function ItemsTab() {
  const [filter, setFilter] = useState<string>('all');
  const tiers = ['all', 'common', 'uncommon', 'rare', 'legendary'];
  const filtered = filter === 'all' ? ITEMS : ITEMS.filter(i => i.tier === filter);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500">ITEMS — {ITEMS.length} TOTAL</p>
        <div className="flex gap-2">
          {tiers.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className="font-orbitron text-[10px] px-3 py-1 rounded-full border transition-all"
              style={{
                color: filter === t ? (t === 'all' ? '#22d3ee' : TIER_COLOR[t] ?? '#22d3ee') : '#475569',
                borderColor: filter === t ? (t === 'all' ? '#22d3ee' : TIER_COLOR[t] ?? '#22d3ee') : '#1e293b',
                background: filter === t ? (t === 'all' ? 'rgba(34,211,238,0.1)' : (TIER_COLOR[t] ?? '#22d3ee') + '18') : 'transparent',
              }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const tc = TIER_COLOR[item.tier] ?? '#94a3b8';
          const charInfo = item.targetCharacter ? CHAR_LABEL[item.targetCharacter] : null;
          return (
            <div key={item.id} className="rounded-xl border p-4 flex flex-col"
              style={{ background: 'rgba(8,5,25,0.9)', borderColor: tc + '45' }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{item.icon}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: tc, background: tc + '18', border: `1px solid ${tc}50` }}>
                    {item.tier.toUpperCase()}
                  </span>
                  {charInfo && (
                    <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: charInfo.color, background: charInfo.color + '18', border: `1px solid ${charInfo.color}50` }}>
                      {charInfo.name.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-orbitron font-bold text-sm text-white mb-1">{item.name}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed flex-1">{item.description}</p>
              {item.statBonus && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {Object.entries(item.statBonus).map(([k, v]) => v ? (
                    <span key={k} className="text-[10px] font-orbitron text-green-400">+{v} {k.toUpperCase()}</span>
                  ) : null)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CARDS TAB
══════════════════════════════════════════════════════════════ */
function CardsTab() {
  const [filter, setFilter] = useState<string>('all');
  const filterOpts = ['all', 'shared', 'Napoleon', 'Genghis', 'Da Vinci', 'Leonidas', 'Sun-sin'];
  const filtered = CARDS.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'shared') return !c.exclusiveTo;
    return c.exclusiveTo === filter;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500">CARDS — {CARDS.length} TOTAL</p>
        <div className="flex gap-2 flex-wrap justify-end">
          {filterOpts.map(f => {
            const color = f === 'all' || f === 'shared' ? '#22d3ee' : EXCL_COLOR[f] ?? '#22d3ee';
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="font-orbitron text-[10px] px-3 py-1 rounded-full border transition-all"
                style={{
                  color: filter === f ? color : '#475569',
                  borderColor: filter === f ? color : '#1e293b',
                  background: filter === f ? color + '18' : 'transparent',
                }}>
                {f.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(card => {
          const tc = CARD_TYPE_COLOR[card.type] ?? '#94a3b8';
          const ec = card.exclusiveTo ? EXCL_COLOR[card.exclusiveTo] : null;
          return (
            <div key={card.definitionId} className="rounded-xl border p-4 flex gap-3 items-start"
              style={{ background: 'rgba(8,5,25,0.9)', borderColor: tc + '35' }}>
              <span className="text-3xl shrink-0 pt-0.5">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-orbitron font-bold text-sm text-white">{card.name}</span>
                  <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                    style={{ color: tc, background: tc + '18', border: `1px solid ${tc}40` }}>
                    {card.type.toUpperCase()}
                  </span>
                  {ec && (
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: ec, background: ec + '18', border: `1px solid ${ec}40` }}>
                      {card.exclusiveTo}
                    </span>
                  )}
                  <span className="ml-auto font-orbitron text-[11px] text-slate-500 shrink-0">{card.manaCost} Mana</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ENEMIES TAB
══════════════════════════════════════════════════════════════ */
function EnemiesTab() {
  const [actFilter, setActFilter] = useState<number>(0);
  const acts = [0, 1, 2, 3];
  const filtered = actFilter === 0 ? ENEMIES : ENEMIES.filter(e => e.act === actFilter);

  const RANK_STYLE: Record<string, { color: string; bg: string }> = {
    Minion: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    Elite:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    Boss:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500">ENEMIES — {ENEMIES.length} TOTAL</p>
        <div className="flex gap-2">
          {acts.map(a => (
            <button key={a} onClick={() => setActFilter(a)}
              className="font-orbitron text-[10px] px-3 py-1 rounded-full border transition-all"
              style={{
                color: actFilter === a ? '#22d3ee' : '#475569',
                borderColor: actFilter === a ? '#22d3ee' : '#1e293b',
                background: actFilter === a ? 'rgba(34,211,238,0.1)' : 'transparent',
              }}>
              {a === 0 ? 'ALL' : `ACT ${a}`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(enemy => {
          const rank = RANK_STYLE[enemy.rank];
          const ai = AI_COLOR[enemy.ai] ?? '#94a3b8';
          return (
            <div key={enemy.id} className="rounded-xl border border-slate-700/40 p-4"
              style={{ background: 'rgba(8,5,25,0.9)' }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl">{enemy.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-orbitron font-bold text-sm text-white">{enemy.name}</h3>
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: rank.color, background: rank.bg, border: `1px solid ${rank.color}40` }}>
                      {enemy.rank.toUpperCase()}
                    </span>
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded ml-auto"
                      style={{ color: ai, background: ai + '18', border: `1px solid ${ai}40` }}>
                      {AI_LABEL[enemy.ai]}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] font-orbitron mt-0.5">ACT {enemy.act}</p>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-3">{enemy.description}</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { label: 'HP', value: enemy.stats.hp, color: '#4ade80' },
                  { label: 'MIGHT', value: enemy.stats.might, color: '#f87171' },
                  { label: 'POWER', value: enemy.stats.power, color: '#60a5fa' },
                  { label: 'DEF', value: enemy.stats.defense, color: '#fbbf24' },
                  { label: 'MOVE', value: enemy.stats.moveRange, color: '#a78bfa' },
                  { label: 'RANGE', value: enemy.stats.attackRange, color: '#fb923c' },
                ].map(s => (
                  <div key={s.label} className="rounded px-2 py-1 text-center"
                    style={{ background: s.color + '12', border: `1px solid ${s.color}30` }}>
                    <div className="font-orbitron text-[9px]" style={{ color: s.color }}>{s.label}</div>
                    <div className="font-bold text-sm text-white">{s.value}</div>
                  </div>
                ))}
              </div>
              {enemy.abilities && enemy.abilities.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-orbitron text-[9px] tracking-[0.3em] text-slate-600 mb-1">ABILITIES</p>
                  {enemy.abilities.map(ab => (
                    <div key={ab.name} className="flex gap-2 items-start rounded px-2 py-1.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-base shrink-0">{ab.icon}</span>
                      <div>
                        <span className="font-orbitron text-[10px] font-bold text-white">{ab.name}</span>
                        <p className="text-slate-500 text-[10px] leading-relaxed">{ab.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   EFFECTS TAB
══════════════════════════════════════════════════════════════ */
const STATUS_EFFECTS = [
  {
    id: 'armor_break', name: 'Armor Break', icon: '💥', color: '#f97316',
    source: 'Cards & Enemy Abilities',
    duration: '2 turns',
    mechanics: 'Target loses 25% of their current Defense for the duration. Stacks additively with multiple applications.',
    tip: 'Stack Armor Break before landing your hardest hits. A heavily-armored tank can be shredded in two turns.',
    counterplay: 'Stay out of range 2. Leonidas with Phalanx stacks can partially absorb the Defense loss.',
  },
  {
    id: 'demoralize', name: 'Demoralize', icon: '😰', color: '#a78bfa',
    source: 'Cards & THIS IS SPARTA!',
    duration: '2 turns',
    mechanics: 'At the start of each turn, the debuffed unit rolls a 50% chance. On failure, they skip both their movement and card plays for the entire turn — effectively wasting it.',
    tip: 'Apply to enemy elites or bosses right before their turn. A wasted turn from a boss can swing the whole fight.',
    counterplay: 'No direct counter — pray for lucky rolls. Spreading your characters reduces AoE Demoralize from abilities like THIS IS SPARTA!',
  },
  {
    id: 'silence', name: 'Silence', icon: '🔇', color: '#60a5fa',
    source: 'Cards & EMP Blast',
    duration: '1–2 turns',
    mechanics: 'Target\'s Power drops to 0. All Power-scaling abilities (Artillery Barrage, Masterpiece, Shield Bash, etc.) deal 0 damage. Basic Might-based attacks are unaffected.',
    tip: 'Silence Da Vinci before she can heal, or Napoleon before an Artillery Barrage turn.',
    counterplay: 'Keep power-heavy characters out of Silence range (range 1–2). Spread the team to avoid AoE Silence from Iron Wall\'s EMP Blast.',
  },
  {
    id: 'poison', name: 'Poison', icon: '☠️', color: '#4ade80',
    source: 'Poison Dart & Spore Nodes',
    duration: 'Until healed',
    mechanics: 'Each turn, the poisoned unit loses 5 Might AND 5 Defense. These stack per poison application. Poison is removed entirely when the unit is healed by any source (Mend, Masterpiece, Arena Medkit).',
    tip: 'Apply Poison early and deny heals. Against multiple Spore Nodes, your characters will be crippled within 2 turns without a dedicated healer.',
    counterplay: 'Always have at least one Mend or Masterpiece available when facing Spore Nodes. Healing removes all stacks immediately.',
  },
  {
    id: 'mud_throw', name: 'Mud Throw', icon: '🪣', color: '#92400e',
    source: 'Mud Throw card',
    duration: '2 turns',
    mechanics: 'Reduces the target\'s movement range by 1 per stack for the duration. Multiple applications stack — a unit with 3 Move Range hit twice is reduced to 1.',
    tip: 'Use on fast melee enemies (Void Wraith, Krath Berserker) to keep them at arm\'s length while your ranged characters chip away.',
    counterplay: 'Enemies affected by Mud Throw will still use abilities. Watch for dash attacks that bypass movement penalties.',
  },
];

function EffectsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const effect = selected ? STATUS_EFFECTS.find(e => e.id === selected) : null;
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-orbitron text-lg text-cyan-400 tracking-widest mb-1">STATUS EFFECTS</h2>
      <p className="text-slate-400 text-sm mb-8">All debuffs and their exact mechanics — know what you're applying, and what's being applied to you.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STATUS_EFFECTS.map(e => (
          <button key={e.id} onClick={() => setSelected(selected === e.id ? null : e.id)}
            className="text-left rounded-xl border p-5 transition-all"
            style={{
              background: selected === e.id ? `rgba(${e.color === '#f97316' ? '249,115,22' : e.color === '#a78bfa' ? '167,139,250' : e.color === '#60a5fa' ? '96,165,250' : e.color === '#4ade80' ? '74,222,128' : '146,64,14'},0.08)` : 'rgba(8,4,28,0.7)',
              borderColor: selected === e.id ? e.color : 'rgba(255,255,255,0.08)',
              boxShadow: selected === e.id ? `0 0 16px ${e.color}33` : 'none',
            }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{e.icon}</span>
              <div>
                <div className="font-orbitron font-bold text-sm text-white">{e.name}</div>
                <div className="text-[11px]" style={{ color: e.color }}>{e.source} · {e.duration}</div>
              </div>
            </div>
            {selected === e.id && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[11px] font-orbitron text-slate-400 tracking-widest mb-1">MECHANIC</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{e.mechanics}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <div className="text-[10px] font-orbitron text-cyan-400 tracking-widest mb-1">TACTICAL TIP</div>
                  <p className="text-xs text-slate-300">{e.tip}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="text-[10px] font-orbitron text-red-400 tracking-widest mb-1">COUNTERPLAY</div>
                  <p className="text-xs text-slate-300">{e.counterplay}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ARENA EVENTS TAB
══════════════════════════════════════════════════════════════ */
const ARENA_EVENTS = [
  {
    id: 'gravity_surge', name: 'Gravity Surge', icon: '🌀', color: '#818cf8',
    trigger: 'Random — any turn',
    duration: '1 turn',
    effect: 'Znyxorga\'s engineers flood the arena with anti-gravity pulses. ALL units\' movement range is doubled for this turn.',
    strategy: 'Use this to close distance instantly or retreat to safety. Aggressive characters like Genghis can reach the entire map in one turn. Watch out — enemies benefit too.',
  },
  {
    id: 'forest_fire', name: 'Forest Fire', icon: '🔥', color: '#f97316',
    trigger: 'Random — mid to late fight',
    duration: '2 turns',
    effect: 'Alien incendiary drones ignite forest tiles. Any unit standing on a Forest hex takes 15 damage at the start of their turn. Napoleon\'s Vantage Point is also disabled.',
    strategy: 'Vacate forest tiles immediately. Napoleon loses her range bonus AND takes damage — reposition her fast.',
  },
  {
    id: 'laser_grid', name: 'Laser Grid', icon: '⚡', color: '#ef4444',
    trigger: 'Random — any turn',
    duration: '1 turn',
    effect: 'Three random hexes are targeted by orbital lasers. Any unit occupying a marked hex at the end of the turn takes 40 damage. Marked hexes are shown with a red glow before the lasers fire.',
    strategy: 'Treat marked hexes like river tiles — deadly if you end your turn there. Priority: move your most vulnerable characters off them first.',
  },
  {
    id: 'alien_tide', name: 'Alien Tide', icon: '🌊', color: '#38bdf8',
    trigger: 'Random — after turn 3',
    duration: 'Permanent until fight ends',
    effect: 'The arena floods. Each turn, every hex adjacent to an existing River tile has a 50% chance of flooding (becoming an impassable River tile). The flood spreads slowly but relentlessly.',
    strategy: 'Prioritize crossing or flanking early before flood lanes close off. Genghis\'s Horde Tactics and Napoleon\'s ranged attacks become more valuable as movement is restricted.',
  },
  {
    id: 'mana_surge', name: 'Mana Surge', icon: '💎', color: '#c084fc',
    trigger: 'Random — any turn',
    duration: '1 turn',
    effect: 'All Mana Crystal tiles pulse with energy. Every character standing on or adjacent to a Mana Crystal tile gains +2 Mana immediately.',
    strategy: 'Position characters near crystals before a Mana Surge to bank extra mana for big ability turns.',
  },
  {
    id: 'gravity_well', name: 'Gravity Well', icon: '⬇️', color: '#a78bfa',
    trigger: 'Random — mid fight',
    duration: '1 turn',
    effect: 'A gravity well forms at the center of the arena. All units are pulled 2 hexes toward the center hex at the start of the turn. Units knocked into River tiles are instantly killed.',
    strategy: 'Dangerous near rivers — make sure no one is in a pull-to-river position. Can also be exploited to pull enemies into favorable positions.',
  },
];

function ArenaEventsTab() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="font-orbitron text-lg text-cyan-400 tracking-widest mb-1">ARENA EVENTS</h2>
      <p className="text-slate-400 text-sm mb-2">Znyxorga controls the arena. At any moment, the battlefield itself can change.</p>
      <p className="text-slate-500 text-xs mb-8 italic">Events trigger randomly during combat. You will see a warning banner before the effect activates — adapt your plan accordingly.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ARENA_EVENTS.map(ev => (
          <div key={ev.id} className="rounded-xl border p-5"
            style={{ background: 'rgba(8,4,28,0.75)', borderColor: `${ev.color}33` }}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl mt-0.5">{ev.icon}</span>
              <div>
                <div className="font-orbitron font-bold text-base text-white">{ev.name}</div>
                <div className="flex gap-3 mt-1">
                  <span className="text-[11px] px-2 py-0.5 rounded font-orbitron"
                    style={{ background: `${ev.color}18`, color: ev.color, border: `1px solid ${ev.color}44` }}>
                    {ev.trigger}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-orbitron text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {ev.duration}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed mb-3">{ev.effect}</p>
            <div className="rounded-lg p-3" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <div className="text-[10px] font-orbitron text-cyan-400 tracking-widest mb-1">STRATEGY</div>
              <p className="text-xs text-slate-300 leading-relaxed">{ev.strategy}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border p-5" style={{ background: 'rgba(4,2,18,0.9)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="font-orbitron text-xs text-red-400 tracking-widest mb-2">⚠️ DIRECTORATE NOTE</div>
        <p className="text-sm text-slate-300 italic leading-relaxed">
          "Arena Event implementation is subject to the Directorate's editorial override. Events are selected to maximize viewer engagement metrics. Clones with a predicted 80%+ win probability may experience accelerated event frequency." — Arena Operations Manual, §12.4
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LORE TAB
══════════════════════════════════════════════════════════════ */
function LoreTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const entry = selected ? LORE.find(l => l.id === selected) : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-8">CLASSIFIED RECORDS</p>
      {entry ? (
        <div>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-orbitron text-[11px] mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> ALL RECORDS
          </button>
          <div className="rounded-2xl border border-slate-700/40 p-8" style={{ background: 'rgba(8,5,25,0.95)' }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{entry.icon}</span>
              <h2 className="font-orbitron font-black text-2xl text-white">{entry.title}</h2>
            </div>
            <div className="h-px mb-6" style={{ background: 'linear-gradient(to right, rgba(34,211,238,0.4), transparent)' }} />
            <div className="space-y-4">
              {entry.text.split('\n\n').map((para, i) => (
                <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LORE.map(l => (
            <button key={l.id} onClick={() => l.unlocked && setSelected(l.id)}
              className="rounded-xl border text-left p-5 transition-all"
              style={{
                background: l.unlocked ? 'rgba(8,5,25,0.9)' : 'rgba(4,2,12,0.9)',
                borderColor: l.unlocked ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.05)',
                cursor: l.unlocked ? 'pointer' : 'not-allowed',
                opacity: l.unlocked ? 1 : 0.5,
              }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{l.unlocked ? l.icon : '🔒'}</span>
                <div>
                  <h3 className="font-orbitron font-bold text-sm text-white">{l.title}</h3>
                  {!l.unlocked && l.unlockHint && (
                    <p className="text-[10px] text-slate-600 font-orbitron mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {l.unlockHint}
                    </p>
                  )}
                </div>
              </div>
              {l.unlocked && (
                <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                  {l.text.split('\n\n')[0].substring(0, 120)}…
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHARACTER DETAIL VIEW (unchanged)
══════════════════════════════════════════════════════════════ */
function DetailView({ char, onBack }: { char: CharacterEntry; onBack: () => void }) {
  const roleStyle = ROLE_STYLE[char.role];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-14 flex items-center px-6 border-b border-slate-800/60"
        style={{ background: 'rgba(2,4,14,0.92)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
          <ChevronLeft className="w-4 h-4" /> ARCHIVES
        </button>
        <div className="mx-4 h-4 w-px bg-slate-700" />
        <span className="font-orbitron text-xs text-slate-500 tracking-widest">{char.name.toUpperCase()}</span>
      </div>

      <div className="flex-1 flex overflow-auto">
        {/* Left: Portrait panel */}
        <div className="w-[420px] shrink-0 relative flex flex-col items-center justify-center py-12 px-8"
          style={{ background: `linear-gradient(135deg, rgba(2,4,14,0.98) 0%, ${char.accentColor}12 100%)` }}>
          <div className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${char.ringColor} 0%, transparent 70%)`, filter: 'blur(50px)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <div className="relative rounded-full overflow-hidden"
            style={{ width: 260, height: 260, border: `4px solid ${char.accentColor}60`, boxShadow: `0 0 50px ${char.ringColor}, 0 0 100px ${char.accentColor}30` }}>
            <img src={char.portrait} alt={char.name} className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.92) contrast(1.05)' }} />
          </div>
          <div className="relative text-center mt-6">
            <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-3 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
              {char.role}
            </div>
            <h2 className="font-orbitron font-black text-2xl text-white">{char.name}</h2>
            <p className="italic text-sm mt-1" style={{ color: char.accentColor }}>{char.title}</p>
          </div>
          <div className="relative w-full h-px my-6"
            style={{ background: `linear-gradient(to right, transparent, ${char.accentColor}50, transparent)` }} />
          <div className="relative w-full space-y-3">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">BASE STATS</p>
            {([
              { key: 'hp', label: 'HP', icon: <Heart className="w-3 h-3" />, color: '#4ade80' },
              { key: 'might', label: 'MIGHT', icon: <Zap className="w-3 h-3" />, color: '#f87171' },
              { key: 'power', label: 'POWER', icon: <Star className="w-3 h-3" />, color: '#60a5fa' },
              { key: 'defense', label: 'DEFENSE', icon: <Shield className="w-3 h-3" />, color: '#fbbf24' },
            ] as const).map(({ key, label, icon, color }) => {
              const val = char.stats[key as keyof typeof char.stats];
              const max = STAT_MAX[key as keyof typeof STAT_MAX];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-orbitron" style={{ color }}>{icon}{label}</div>
                    <span className="text-[11px] text-slate-400 font-bold">{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: color, boxShadow: `0 0 6px ${color}80` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="flex-1 py-12 px-10 overflow-auto" style={{ background: 'rgba(2,4,14,0.85)' }}>
          <p className="font-orbitron text-[11px] tracking-[0.4em] text-slate-500 mb-1">CLASSIFIED DOSSIER</p>
          <h1 className="font-orbitron font-black text-4xl text-white mb-1">{char.name}</h1>
          <p className="italic text-lg mb-6" style={{ color: `${char.accentColor}cc` }}>"{char.tagline}"</p>
          <div className="h-px mb-6" style={{ background: `linear-gradient(to right, ${char.accentColor}40, transparent)` }} />
          <div className="mb-8">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-3">LORE</p>
            <p className="text-slate-300 text-sm leading-relaxed max-w-[560px]">{char.lore}</p>
          </div>
          <div>
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">ABILITIES</p>
            <div className="grid grid-cols-1 gap-3 max-w-[620px]">
              {char.abilities.map(ab => {
                const kindStyle = ab.kind === 'passive'
                  ? { border: 'border-purple-600/50', bg: 'bg-purple-950/40', badge: 'bg-purple-900/70 text-purple-300 border-purple-600/50', badgeLabel: 'PASSIVE' }
                  : ab.kind === 'ultimate'
                  ? { border: 'border-amber-500/50', bg: 'bg-amber-950/30', badge: 'bg-amber-900/70 text-amber-300 border-amber-500/50', badgeLabel: 'ULTIMATE' }
                  : { border: 'border-slate-600/50', bg: 'bg-slate-800/40', badge: 'bg-slate-700/70 text-slate-300 border-slate-600/50', badgeLabel: 'ABILITY' };
                return (
                  <div key={ab.name} className={`flex gap-4 rounded-xl border p-4 ${kindStyle.border} ${kindStyle.bg}`}>
                    <div className="text-3xl shrink-0 w-10 text-center leading-none pt-0.5">{ab.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-orbitron font-bold text-sm text-white">{ab.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${kindStyle.badge}`}>{kindStyle.badgeLabel}</span>
                        <span className="ml-auto text-[11px] text-slate-500 font-orbitron shrink-0">{ab.cost}</span>
                      </div>
                      <p className="text-slate-400 text-[12px] leading-relaxed">{ab.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
