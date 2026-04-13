import React, { useState } from "react";
import { ChevronLeft, Shield, Zap, Heart, Star, BookOpen, Sword, Package, Map, Users, Lock } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";
import { CARD_UPGRADES } from "@/data/cards";

// ── Stat keyword colorizer ───────────────────────────────────────────────────
const STAT_COLOR: Record<string, string> = {
  might: '#f87171', power: '#60a5fa', defense: '#fbbf24', hp: '#4ade80',
  mana: '#c084fc', movement: '#34d399', move: '#34d399',
};

function colorFor(word: string): string {
  const lw = word.toLowerCase();
  if (lw === 'ultimate' || lw === 'exhaust') return '#f59e0b';
  if (lw === 'might') return '#f87171';
  if (lw === 'power') return '#60a5fa';
  if (lw === 'defense' || lw === 'def') return '#fbbf24';
  if (lw === 'armor break') return '#fbbf24';
  if (lw === 'hp') return '#4ade80';
  if (lw === 'movement' || lw === 'move') return '#34d399';
  return '#fb923c'; // Stun, Rooted, Blinded, Bleed, Poison, Silence, Curse
}

// Regex uses non-capturing group (?:) so split() won't double-print the keyword
const COLORIZE_REGEX = /\b(?:ULTIMATE|EXHAUST|Armor Break|Might|Power|Defense|DEF|HP|Movement|Move|Stun|Rooted|Blinded|Bleed|Poison|Silence|Curse)\b/gi;

function colorizeDesc(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(COLORIZE_REGEX.source, COLORIZE_REGEX.flags);
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<span key={m.index} style={{ color: colorFor(m[0]), fontWeight: 600 }}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ── Upgrade lookup helper ────────────────────────────────────────────────────
function findUpgrade(charId: string, abilityName: string) {
  return Object.entries(CARD_UPGRADES).find(([key, val]) =>
    key.startsWith(charId + '_') &&
    val.upgradedName.replace(/\+$/, '').trim() === abilityName
  )?.[1] ?? null;
}

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
  waterName?: string;
  waterDesc?: React.ReactNode;
}
interface CharacterEntry {
  id: string;
  name: string;
  title: string;
  tagline: string;
  role: "DPS RANGED" | "DPS MELEE" | "SUPPORT" | "TANK" | "HYBRID" | "CONTROLLER";
  portrait: string;
  accentColor: string;
  ringColor: string;
  lore: string;
  stats: { hp: number; might: number; power: number; defense: number; moveRange: number; attackRange: number };
  waterStats?: { hp: number; might: number; power: number; defense: number; moveRange: number; attackRange: number };
  abilities: Ability[];
}

const CHARACTERS: CharacterEntry[] = [
  {
    id: "napoleon", name: "Napoleon-chan", title: "The Brilliant Tactician",
    tagline: "Commander of the Clone Armies",
    role: "DPS RANGED", portrait: "/art/napoleon_portrait.png",
    accentColor: "#d946ef", ringColor: "rgba(217,70,239,0.55)",
    lore: "Once the greatest military mind in Earth's history, Napoleon Bonaparte was resurrected as a battle-clone by the Empire of Znyxorga. Now fighting in their interdimensional arena, this pint-sized prodigy commands forces with tactical genius, turning every battlefield into a stage for her brilliance. Her sharp eyes miss nothing — and her artillery never misses twice.",
    stats: { hp: 100, might: 65, power: 60, defense: 20, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🔫", name: "Mitraille", cost: "Passive", desc: <>At the start of Napoleon's turn, all enemies within range 2 take <span style={{ color: "#f87171", fontWeight: 700 }}>5 pure damage</span> (ignores Defense). Named after the grapeshot that made Napoleon famous — don't get close.</> },
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
    stats: { hp: 120, might: 50, power: 40, defense: 25, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🩸", name: "Bloodlust", cost: "Passive", desc: <>Each kill grants +12 <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> and restores 1 Mana. Stacks up to 3×.</> },
      { kind: "ability", icon: "⚡", name: "Mongol Charge", cost: "2 Mana", desc: <>Strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>48 damage</span> at range 3, then apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>: <span style={{ color: "#f87171", fontWeight: 700 }}>16 HP per turn</span> for 2 turns.</> },
      { kind: "ability", icon: "🌀", name: "Horde Tactics", cost: "3 Mana", desc: <>Unleash the horde — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>20 damage per enemy</span> in range 2 to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL</span> enemies in range 2. (1 enemy = 20 dmg, 2 = 40, 3 = 60 each)</> },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury", cost: "3 Mana · Exhaust", desc: <>Sweep the line for <span style={{ color: "#60a5fa", fontWeight: 700 }}>40 damage</span> to all enemies. <span style={{ color: "#f87171", fontWeight: 700 }}>Doubled to 80</span> against targets below 40% HP — finish them off.</> },
    ],
  },
  {
    id: "davinci", name: "Da Vinci-chan", title: "The Genius Inventor",
    tagline: "Visionary of the Stars",
    role: "SUPPORT", portrait: "/art/davinci_portrait.png",
    accentColor: "#34d399", ringColor: "rgba(52,211,153,0.55)",
    lore: "Leonardo da Vinci painted the Mona Lisa, designed flying machines, and unlocked the secrets of human anatomy — often simultaneously. Now, as a battle-clone for the Empire of Znyxorga, she brings that boundless creativity to the arena. Her inventions heal the fallen, scout the skies, and protect her team from whatever the galaxy hurls at them.",
    stats: { hp: 85, might: 35, power: 50, defense: 15, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🔧", name: "Tinkerer", cost: "Passive", desc: "If no exclusive ability card was used last turn, draw +1 card at the start of your turn." },
      { kind: "ability", icon: "✈️", name: "Flying Machine", cost: "2 Mana", desc: <>Teleport to <span style={{ color: "#34d399", fontWeight: 700 }}>any unoccupied hex</span> on the board. No range limit. Bypasses terrain and obstacles.</> },
      { kind: "ability", icon: "💚", name: "Masterpiece", cost: "3 Mana", desc: <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>50 HP</span> to an ally within range 3. Also removes the Poison debuff.</> },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", cost: "3 Mana · Exhaust", desc: <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>HP 75</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might 50</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense 30</span>. Lasts until defeated. (Scales with Power)</> },
    ],
  },
  {
    id: "leonidas", name: "Leonidas-chan", title: "The Unbreakable Wall",
    tagline: "Defender of the Thermopylae Gate",
    role: "TANK", portrait: "/art/leonidas_portrait.png",
    accentColor: "#f59e0b", ringColor: "rgba(245,158,11,0.55)",
    lore: "Three hundred Spartans. One narrow pass. An empire brought to its knees. Leonidas I held the Gates of Thermopylae against impossible odds, and her legend echoed across millennia — right into the cloning vats of Znyxorga. Reborn as a battle-clone in burnished bronze and blazing war-paint, Leonidas-chan turns every battlefield into a chokepoint. She does not retreat. She does not yield. She is the shield upon which enemy waves break and scatter.",
    stats: { hp: 130, might: 40, power: 28, defense: 35, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🛡️", name: "Phalanx", cost: "Passive", desc: <>Each turn Leonidas ends adjacent to an ally, she gains +<span style={{ color: "#fbbf24", fontWeight: 700 }}>10 Defense</span> (stacks up to 3 turns, max +30). Stay close to teammates over multiple turns to build an iron wall.</> },
      { kind: "ability", icon: "⚡", name: "Shield Bash", cost: "2 Mana", desc: <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>1.8× Power (~50 dmg)</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 2 turns). Also grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</> },
      { kind: "ability", icon: "🏛️", name: "Spartan Wall", cost: "3 Mana", desc: <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> to Leonidas and all allies within range 2.</> },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", cost: "3 Mana · Exhaust", desc: <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>2.5× Power (~125 dmg)</span>. All enemies adjacent to the impact are <span style={{ color: "#fb923c", fontWeight: 700 }}>Rooted</span> for 2 turns — cannot move but can still attack and use cards.</> },
    ],
  },
  {
    id: "sunsin", name: "Sun-sin-chan", title: "The Admiral of the Turtle Fleet",
    tagline: "Admiral of the Turtle Fleet",
    role: "HYBRID", portrait: "/art/sunsin_portrait.png",
    accentColor: "#38bdf8", ringColor: "rgba(56,189,248,0.55)",
    lore: "Yi Sun-sin repelled an entire Japanese armada with a handful of ironclad turtle ships and an unshakeable will. The Empire of Znyxorga found her genetic echo preserved in the sea-salt timber of the Joseon docks and grew her in the deep-blue vats of their naval division. On dry land she fights with disciplined efficiency. But put ocean tiles between her and an enemy — and the turtle ship awakens. Cannons fire. Hulls hold. Admirals do not retreat.",
    stats: { hp: 100, might: 65, power: 60, defense: 25, moveRange: 3, attackRange: 1 },
    waterStats: { hp: 100, might: 88, power: 36, defense: 33, moveRange: 1, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "🐢", name: "Turtle Ship", cost: "Passive",
        desc: <>Can move onto lake tiles and ignore extra movement cost on river tiles. On land: balanced stats, Range 1 basic attacks.</>,
        waterDesc: <>ON WATER (lake or river): <span style={{ color: "#f87171", fontWeight: 700 }}>+35% Might</span> (65→88), <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span> (25→33), <span style={{ color: "#60a5fa", fontWeight: 700 }}>−40% Power</span> (60→36). Movement capped at 1. Range 3 basic attacks.</> },
      { kind: "ability", icon: "🔥", name: "Hwajeon", cost: "2 Mana",
        desc: <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~72 damage</span> at range 3. Pushes target back 1 hex.</>,
        waterName: "Ramming Speed",
        waterDesc: <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~72 damage</span> at range 1. Pushes target back 1 hex. (Power reduced on water)</> },
      { kind: "ability", icon: "🚢", name: "Naval Repairs", cost: "3 Mana",
        desc: <>Select a target area. All allies within range 2 heal <span style={{ color: "#4ade80", fontWeight: 700 }}>15 HP now</span> and <span style={{ color: "#4ade80", fontWeight: 700 }}>15 HP next turn</span>.</>,
        waterName: "Broadside",
        waterDesc: <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~25 damage</span> to all enemies in range 3.</> },
      { kind: "ultimate", icon: "⭐", name: "Chongtong Barrage", cost: "3 Mana · Exhaust",
        desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Charge 3 hexes, deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~60 damage</span> to enemies in path. Each hit enemy is <span style={{ color: "#38bdf8", fontWeight: 700 }}>pushed sideways</span>. Sun-sin ends at the last hex.</>,
        waterDesc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Main target: <span style={{ color: "#a78bfa", fontWeight: 700 }}>~90 damage</span>. Adjacent enemies: <span style={{ color: "#a78bfa", fontWeight: 700 }}>~43 damage</span>. Range 5.</> },
    ],
  },
  {
    id: "beethoven", name: "Beethoven-chan", title: "The Storm Composer",
    tagline: "Conductor of the Sternensturm",
    role: "CONTROLLER", portrait: "/art/beethoven_portrait.png",
    accentColor: "#22d3ee", ringColor: "rgba(34,211,238,0.55)",
    lore: "Ludwig van Beethoven composed some of Earth's most transcendent music while completely deaf — a testament to a will that refused to bow to fate. The Empire of Znyxorga cloned her from the resonant frequencies preserved in old concert hall stone. In the arena, Beethoven-chan wields sound itself as a weapon: sonic waves that hurl enemies across the field, melodies that energise her allies, and a final crescendo — the Götterfunken — that silences every foe in range. She cannot hear the chaos she creates. She only feels the thunder.",
    stats: { hp: 90, might: 35, power: 65, defense: 25, moveRange: 2, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🎵", name: "Crescendo", cost: "Passive", desc: <>Each exclusive ability card played grants <span style={{ color: "#22d3ee", fontWeight: 700 }}>+3 Power</span> permanently. Stacks up to <span style={{ color: "#fbbf24", fontWeight: 700 }}>7 times (+21 max)</span>. Her power grows with every note.</> },
      { kind: "ability", icon: "🌊", name: "Schallwelle", cost: "2 Mana", desc: <>Fire a directional sonic wave — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>33 damage</span> to all enemies in a line up to range 3 and <span style={{ color: "#22d3ee", fontWeight: 700 }}>push each 2 tiles back</span> along the wave direction.</> },
      { kind: "ability", icon: "🎶", name: "Freudenspur", cost: "3 Mana", desc: <>Target a tile within range 3 — <span style={{ color: "#22d3ee", fontWeight: 700 }}>that tile and all 6 adjacent tiles</span> become a resonance zone. Allies passing through zone tiles gain <span style={{ color: "#34d399", fontWeight: 700 }}>+2 Movement</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ultimate", icon: "⭐", name: "Götterfunken", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>46 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 1 turn</span> — no movement, no cards, no actions.</> },
    ],
  },
  {
    id: "huang", name: "Huang-chan", title: "The First Emperor",
    tagline: "Empress of the Terracotta Legions",
    role: "CONTROLLER", portrait: "/art/huang_portrait.png",
    accentColor: "#b45309", ringColor: "rgba(180,83,9,0.55)",
    lore: "Qin Shi Huang unified China under a single dynasty, built the Great Wall, and commissioned an army of 8,000 terracotta warriors to guard him in death. The Empire of Znyxorga extracted her genetic echo from clay dust sifted out of the mausoleum soil. Reborn as Huang-chan, she commands her terracotta legions once more — archers, footsoldiers, and cavalry that rise from the arena floor at her command. She does not strike enemies herself. She buries them under sheer numbers.",
    stats: { hp: 90, might: 30, power: 55, defense: 25, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🏺", name: "Imperial Command", cost: "Passive", desc: <>Huang-chan <span style={{ color: "#f87171", fontWeight: 700 }}>cannot play Basic Attack cards</span>. At least <span style={{ color: "#fbbf24", fontWeight: 700 }}>1 Basic Attack card</span> is guaranteed in hand each turn — for her Terracotta units to use. Terracotta units may <span style={{ color: "#fbbf24", fontWeight: 700 }}>only</span> use Basic Attack cards.</> },
      { kind: "ability", icon: "⚔️", name: "Terracotta Legion", cost: "2 Mana", desc: <>Select any empty hex within range 3. Summon a random warrior — <span style={{ color: "#fbbf24", fontWeight: 700 }}>50/50</span>: <span style={{ color: "#60a5fa", fontWeight: 700 }}>Archer</span> (HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>40</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 2, Move 2) or <span style={{ color: "#f87171", fontWeight: 700 }}>Warrior</span> (HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>40</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>30</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 1, Move 2). Both have Power 0 — deal pure Might damage. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ability", icon: "🐴", name: "First Emperor's Command", cost: "3 Mana", desc: <>Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>Terracotta Cavalry</span> on an adjacent hex: HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>38</span>, Power <span style={{ color: "#60a5fa", fontWeight: 700 }}>55</span>, Move 3. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. Immediately adds a <span style={{ color: "#f59e0b", fontWeight: 700 }}>FREE Cavalry Charge</span> card to your hand — deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>82 dmg</span> at range 3.</> },
      { kind: "ultimate", icon: "⭐", name: "Eternal Army", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>Take control</span> of a non-boss enemy within range 3 for <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. The unit auto-attacks the nearest enemy — same hit mechanics as when they attacked you. No abilities. You cannot attack the controlled unit. Cannot target bosses or mini-bosses.</> },
    ],
  },
];

// ── Upgraded ability descriptions (same copy as base, updated stats only) ─────
// Key format: `${char.id}_${ab.name}`
const UPGRADE_DESCS: Record<string, React.ReactNode> = {
  // Napoleon
  'napoleon_Artillery Barrage': <>Unleash a devastating barrage dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>~96</span> damage to a target at range 4.</>,
  'napoleon_Grande Armée': <>Rally the troops! Grant +30% <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> AND <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power</span> to all allies for 2 turns.</>,
  'napoleon_Final Salvo': <>Fire 5 random artillery shots, each dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>~42</span> damage to random enemies within range 4.</>,
  // Genghis
  'genghis_Mongol Charge': <>Strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~48 damage</span> at range 3, then apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>: <span style={{ color: "#f87171", fontWeight: 700 }}>~24 HP per turn</span> for 2 turns.</>,
  'genghis_Horde Tactics': <>Unleash the horde — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~20 damage per enemy</span> in range 3 to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL</span> enemies in range 3. (1 enemy = 20 dmg, 2 = 40, 3 = 60 each)</>,
  "genghis_Rider's Fury": <>Sweep the line for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~60 damage</span> to all enemies. <span style={{ color: "#f87171", fontWeight: 700 }}>Doubled to ~120</span> against targets below 40% HP — finish them off.</>,
  // Da Vinci
  'davinci_Flying Machine': <>Teleport to <span style={{ color: "#34d399", fontWeight: 700 }}>any unoccupied hex</span> on the board. On arrival: draw 1 card and gain <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> until your next turn. Costs 1 mana.</>,
  'davinci_Masterpiece': <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>~75 HP</span> to an ally within range 3. Also removes the Poison debuff.</>,
  'davinci_Vitruvian Guardian': <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>HP 90</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might 55</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense 40</span>. Lasts until defeated. (Scales with Power)</>,
  // Leonidas
  'leonidas_Shield Bash': <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~56 damage</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 3 turns). Grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</>,
  'leonidas_Spartan Wall': <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20–30 Defense</span> to Leonidas and all allies within range 2.</>,
  'leonidas_THIS IS SPARTA!': <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~175 damage (2.5× Power)</span>. All enemies adjacent to the impact are <span style={{ color: "#fb923c", fontWeight: 700 }}>Rooted</span> for 2 turns — cannot move but can still attack and use cards.</>,
  // Beethoven
  'beethoven_Schallwelle': <>Fire a directional sonic wave — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~46 damage</span> to all enemies in a line up to range 3 and <span style={{ color: "#22d3ee", fontWeight: 700 }}>push each 3 tiles back</span> along the wave direction.</>,
  'beethoven_Freudenspur': <>Target a tile within range 3 — <span style={{ color: "#22d3ee", fontWeight: 700 }}>that tile and all 6 adjacent tiles</span> become a resonance zone. Allies passing through zone tiles gain <span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>.</>,
  'beethoven_Götterfunken': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~46 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 2 turns</span> — no movement, no cards, no actions.</>,
  // Yi Sun-sin
  'sunsin_Hwajeon': <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~90 damage</span> at range 3. Pushes target back 2 hexes.</>,
  'sunsin_Naval Repairs': <>Select a target area. All allies within range 2 heal <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP now</span> and <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP next turn</span>.</>,
  'sunsin_Chongtong Barrage': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Charge 3 hexes, deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~143 damage</span> to enemies in path. Each hit enemy is <span style={{ color: "#38bdf8", fontWeight: 700 }}>pushed sideways</span>. Sun-sin ends at the last hex.</>,
  // Huang-chan
  'huang_Terracotta Legion': <>Select any empty hex within range 3. Summon a random warrior — <span style={{ color: "#fbbf24", fontWeight: 700 }}>50/50</span>: <span style={{ color: "#60a5fa", fontWeight: 700 }}>Archer</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 2, Move 2) or <span style={{ color: "#f87171", fontWeight: 700 }}>Warrior</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>30</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 1, Move 2). Both have Power 0 — deal pure Might damage. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</>,
  "huang_First Emperor's Command": <>Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>Terracotta Cavalry</span> on an adjacent hex: HP <span style={{ color: "#4ade80", fontWeight: 700 }}>80</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>38</span>, Power <span style={{ color: "#60a5fa", fontWeight: 700 }}>55</span>, Move 3. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. Immediately adds a <span style={{ color: "#f59e0b", fontWeight: 700 }}>FREE Cavalry Charge</span> card to your hand — deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>82 dmg</span> at range 3.</>,
  'huang_Eternal Army': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>Take control</span> of a non-boss enemy within range 3 for <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>. The unit auto-attacks the nearest enemy — same hit mechanics as when they attacked you. No abilities. You cannot attack the controlled unit. Cannot target bosses or mini-bosses.</>,
};

const ROLE_STYLE: Record<string, { text: string; border: string; bg: string }> = {
  "DPS RANGED":  { text: "text-fuchsia-300", border: "border-fuchsia-500/50", bg: "bg-fuchsia-900/30" },
  "DPS MELEE":   { text: "text-rose-300",    border: "border-rose-500/50",    bg: "bg-rose-900/30" },
  "SUPPORT":     { text: "text-emerald-300", border: "border-emerald-500/50", bg: "bg-emerald-900/30" },
  "TANK":        { text: "text-amber-300",   border: "border-amber-500/50",   bg: "bg-amber-900/30" },
  "HYBRID":      { text: "text-teal-300",    border: "border-teal-500/50",    bg: "bg-teal-900/30" },
  "CONTROLLER":  { text: "text-cyan-300",    border: "border-cyan-500/50",    bg: "bg-cyan-900/30" },
};
const STAT_MAX = { hp: 180, might: 100, power: 100, defense: 50, moveRange: 4, attackRange: 3 };

// ── Tile Data ─────────────────────────────────────────────────────────────────

interface TileEntry {
  type: string; icon: string; name: string; color: string;
  image: string;
  effects: { label: string; detail: string }[];
  tip: string;
}

const TILES: TileEntry[] = [
  {
    type: 'plain', icon: '⬛', name: 'Arena Floor', color: '#64748b',
    image: '/art/tiles/Plains_180.png',
    effects: [{ label: 'No modifiers', detail: 'Open tech floor — free to move through, no stat modifiers of any kind.' }],
    tip: 'Most of the board. Use as a staging area.',
  },
  {
    type: 'forest', icon: '🔮', name: 'Crystal Spires', color: '#a855f7',
    image: '/art/tiles/Forest_180.png',
    effects: [
      { label: '+40% Defense', detail: 'Units on a forest tile gain +40% Defense against all incoming attacks. Normal movement cost.' },
      { label: 'Stealth', detail: 'Reduces enemy targeting priority.' },
    ],
    tip: 'Great for tanky units and defensive positioning. Forests cost normal movement now — easy to duck into for cover.',
  },
  {
    type: 'mountain', icon: '⛰️', name: 'Mountain', color: '#78716c',
    image: '/art/tiles/Mountains_180.png',
    effects: [
      { label: 'Impassable', detail: 'No unit can enter or cross a mountain hex.' },
      { label: 'Blocks Line of Sight', detail: 'Abilities and attacks cannot target through mountains on the same axial line.' },
    ],
    tip: 'Use mountains as natural barriers and cover. Position around them, not through them.',
  },
  {
    type: 'river', icon: '🌊', name: 'Lake', color: '#38bdf8',
    image: '/art/tiles/Lake_180.png',
    effects: [
      { label: 'Impassable', detail: 'Units cannot enter lake tiles voluntarily — movement is blocked.' },
      { label: 'Lethal Displacement', detail: 'If knocked onto a lake tile by an ability (e.g. charge, push), the unit is instantly killed.' },
      { label: 'Yi Sun-sin Exception', detail: "Sun-sin's Turtle Ship passive allows her to move onto lake tiles and gain her water bonuses." },
    ],
    tip: 'Lakes are hard walls — route around them or funnel enemies into a killing zone.',
  },
  {
    type: 'ford_river', icon: '〰️', name: 'River', color: '#7dd3fc',
    image: '/art/tiles/River_180_new.png',
    effects: [
      { label: 'Passable (costly)', detail: 'Units can cross river hexes but each step costs 2 movement instead of 1.' },
      { label: 'No Displacement Kill', detail: 'Being pushed into a river does not kill the unit — they simply stop and take the movement cost.' },
      { label: 'Yi Sun-sin Bonus', detail: 'Sun-sin counts as "on water" while crossing a river and gains her full Turtle Ship bonus stats.' },
    ],
    tip: 'Control the river crossings. Forcing enemies to ford slows them down — ideal for your ranged characters to punish.',
  },
  {
    type: 'ruins', icon: '🏛️', name: 'Ruins', color: '#a78bfa',
    image: '/art/tiles/Plains_180.png',
    effects: [
      { label: '+25 Defense', detail: 'Units standing on a Ruins tile gain +25 Defense against all incoming attacks.' },
      { label: 'Strategic Placement', detail: 'Ruins appear in 1–2 locations per map at key chokepoints or flanking routes.' },
    ],
    tip: 'Ruins are powerful defensive anchors. Park your tank or a low-defense support here to make them much harder to kill.',
  },
  {
    type: 'desert', icon: '🏜️', name: 'Desert', color: '#d97706',
    image: '/art/tiles/Desert_180_new.png',
    effects: [
      { label: 'Act 2+ Only', detail: 'Desert tiles only appear from Act 2 onward — the arena evolves.' },
      { label: 'Scorching Heat', detail: 'Units on desert tiles take 5 pure damage at turn end from the heat.' },
    ],
    tip: 'Avoid sitting on desert tiles longer than needed. Pass through quickly or use them to zone out enemies.',
  },
  {
    type: 'snow', icon: '❄️', name: 'Snow', color: '#bae6fd',
    image: '/art/tiles/Snow_180_new.png',
    effects: [
      { label: 'Blizzard', detail: 'Units on snow tiles at the start of their turn lose 10 Might and 10 Power until the end of that turn. Affects all units.' },
    ],
    tip: 'Move through snow tiles quickly. Avoid committing to fights on snow — both sides are weakened, but your power-based characters suffer most.',
  },
  {
    type: 'ice', icon: '🧊', name: 'Ice', color: '#93c5fd',
    image: '/art/tiles/Ice_180_new.png',
    effects: [
      { label: 'Slide', detail: 'When a unit moves onto an ice tile, they continue sliding 1 extra hex in the same direction automatically.' },
      { label: 'Collision', detail: "If the slide would go off the board or into an obstacle, the unit stops there and takes 5 damage and is Stunned for 1 turn." },
    ],
    tip: 'Use ice tiles to reposition enemies — abilities that push (Schallwelle, Hwajeon) can chain into ice slides. Avoid sliding your own units into walls.',
  },
  {
    type: 'mud', icon: '🪣', name: 'Mud', color: '#92400e',
    image: '/art/tiles/Mud_180_new.png',
    effects: [
      { label: '−1 Movement', detail: 'Units entering or standing on mud tiles lose 1 movement range while on the tile.' },
      { label: 'Temporary Creation', detail: 'The Mud Throw card creates a temporary Mud tile at the target location for 1 turn.' },
    ],
    tip: 'Throw Mud at a chokepoint to slow enemy movement. Combine with Rooted effects to lock down melee enemies entirely.',
  },
  {
    type: 'ash', icon: '🪨', name: 'Ash', color: '#78716c',
    image: '/art/tiles/Plains_180.png',
    effects: [
      { label: 'Burned Forest', detail: 'Ash tiles are what remain after a Forest tile burns down. They have no bonuses.' },
      { label: 'No Defense Bonus', detail: 'Unlike living forest, ash provides no defense benefit — the tile is dead terrain.' },
    ],
    tip: 'Once forest burns to ash, that cover is gone permanently. Defend your forest tiles or accept losing them to fire.',
  },
  {
    type: 'fog_of_war', icon: '🌫️', name: 'Fog of War', color: '#64748b',
    image: '/art/tiles/Plains_180.png',
    effects: [
      { label: 'Event-Only Tile', detail: 'Fog of War tiles only appear during specific arena events. They cannot appear on a normal map setup.' },
      { label: 'Hidden Units', detail: 'Units inside a Fog of War tile cannot be directly targeted by ranged attacks or abilities unless the attacker is adjacent.' },
      { label: 'Clears on Entry', detail: 'Moving a unit into a fog tile reveals that tile for the rest of the turn.' },
    ],
    tip: 'Fog of War events reward aggressive scouting. Move into fog to reveal threats before committing to attack — but be ready for surprises.',
  },
  {
    type: 'mana_crystal', icon: '💎', name: 'Mana Crystal', color: '#c084fc',
    image: '/art/tiles/Mana_Crystal_180.png',
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
  // Common
  { id: 'iron_gauntlets',   name: 'Iron Gauntlets',   icon: '🥊', tier: 'common',   description: '+10 Might for this run.',                                   statBonus: { might: 10 } },
  { id: 'bone_plate',       name: 'Bone Plate',        icon: '🦴', tier: 'common',   description: '+5 Defense for this run.',                                  statBonus: { defense: 5 } },
  { id: 'vitality_shard',   name: 'Vitality Shard',    icon: '💠', tier: 'common',   description: '+25 max HP for this run.',                                  statBonus: { hp: 25 } },
  { id: 'mana_conduit',     name: 'Mana Conduit',      icon: '🔋', tier: 'common',   description: '+10 Power for this run.',                                   statBonus: { power: 10 } },
  // Uncommon
  { id: 'battle_drum',      name: 'Battle Drum',       icon: '🥁', tier: 'uncommon', description: 'After killing an enemy, draw 1 card.' },
  { id: 'arena_medkit',     name: 'Arena Medkit',      icon: '💊', tier: 'uncommon', description: 'Heal 25 HP at the start of your turn if below 40% HP.' },
  { id: 'battle_drill',    name: 'Battle Drill',       icon: '⚔️', tier: 'uncommon', description: 'At the start of each turn, add a free Basic Attack card to your hand.' },
  { id: 'void_shard',       name: 'Void Shard',        icon: '🔥', tier: 'uncommon', description: '+10 Might. Basic attacks deal bonus damage.',              statBonus: { might: 10 } },
  { id: 'card_satchel',     name: 'Card Satchel',      icon: '🎒', tier: 'uncommon', description: '+1 starting hand size for this run.' },
  { id: 'quick_boots',      name: 'Quick Boots',       icon: '👟', tier: 'uncommon', description: '+1 movement range permanently.' },
  { id: 'soul_ember',       name: 'Soul Ember',        icon: '🕯️', tier: 'uncommon', description: 'On kill, restore 20 HP to this character.' },
  { id: 'war_trophy',       name: 'War Trophy',        icon: '💀', tier: 'uncommon', description: 'On kill, permanently gain +2 Might and +2 Power for the rest of the run.' },
  // Rare — General
  { id: 'strategists_case', name: "Strategist's Case", icon: '💼', tier: 'rare',     description: '+2 starting hand size for this run.' },
  { id: 'alien_core',       name: 'Alien Core',        icon: '🧬', tier: 'rare',     description: 'All ability damage dealt by this character is increased by 25%.' },
  { id: 'mana_crystal',    name: 'Mana Crystal',       icon: '🔷', tier: 'rare',     description: 'Gain +1 Mana at the start of each turn.' },
  { id: 'gladiator_brand',  name: "Gladiator's Brand", icon: '⚡', tier: 'rare',     description: 'First ability each fight costs 0 Mana.' },
  { id: 'diamond_shell',    name: 'Diamond Shell',     icon: '💎', tier: 'rare',     description: 'The first attack that deals damage to this character each fight is negated (deals 0 damage).' },
  // Rare — Napoleon
  { id: 'grand_strategy',   name: 'Grand Strategy',    icon: '🗺️', tier: 'rare',     description: 'Artillery Barrage hits an additional adjacent target.',      targetCharacter: 'napoleon' },
  { id: 'emperors_coat',    name: "Emperor's Coat",    icon: '🪖', tier: 'rare',     description: 'Grande Armée also grants +30% Might & Power to all allies.', targetCharacter: 'napoleon' },
  // Rare — Genghis
  { id: 'eternal_hunger',   name: 'Eternal Hunger',    icon: '🩸', tier: 'rare',     description: 'Bloodlust kill stacks carry over between fights for the entire run.',               targetCharacter: 'genghis' },
  { id: 'khans_seal',       name: "Khan's Seal",       icon: '🏹', tier: 'rare',     description: "Rider's Fury also stuns each hit enemy for 1 turn.",        targetCharacter: 'genghis' },
  // Rare — Da Vinci
  { id: 'aerial_lens',      name: 'Aerial Lens',       icon: '🔭', tier: 'rare',     description: 'Flying Machine can swap position with an allied unit.',      targetCharacter: 'davinci' },
  { id: 'life_formula',     name: 'Life Formula',      icon: '💚', tier: 'rare',     description: 'Masterpiece heals an additional 25 HP.',                    targetCharacter: 'davinci' },
  // Rare — Leonidas
  { id: 'spartan_shield',   name: 'Spartan Shield',    icon: '🛡️', tier: 'rare',     description: 'Shield Bash also pushes the target back 1 hex and STUNS for 1 turn — stunned unit cannot move, attack, or use abilities.', targetCharacter: 'leonidas' },
  { id: 'phalanx_oath',     name: 'Phalanx Oath',      icon: '🏛️', tier: 'rare',     description: 'Spartan Wall range increased by 1 and DEF bonus increased to +30.',                 targetCharacter: 'leonidas' },
  // Rare — Sun-sin
  { id: 'turtle_hull',      name: 'Turtle Hull',       icon: '🐢', tier: 'rare',     description: 'Yi Sun-sin takes 20% less damage from all sources.',                                targetCharacter: 'sunsin' },
  { id: 'admirals_banner',  name: "Admiral's Banner",  icon: '⛵', tier: 'rare',     description: 'Naval Repairs / Broadside also grants all nearby allies +30 DEF for 1 turn.',       targetCharacter: 'sunsin' },
  // Rare — Beethoven
  { id: 'resonant_crystal', name: 'Resonant Crystal',  icon: '🔮', tier: 'rare',     description: 'Götterfunken stuns all hit enemies for 2 turns instead of 1.',                           targetCharacter: 'beethoven' },
  { id: 'composers_baton',  name: "Composer's Baton",  icon: '🎼', tier: 'rare',     description: 'Allies standing on a Freudenspur zone also gain +5 Defense at turn start.',              targetCharacter: 'beethoven' },
  // Rare — Huang-chan
  { id: 'dragon_kiln',      name: 'Dragon Kiln',       icon: '🏺', tier: 'rare',     description: 'Terracotta units are summoned with +20 HP and +10 Might.',                               targetCharacter: 'huang' },
  { id: 'iron_edict',       name: 'Iron Edict',        icon: '📜', tier: 'rare',     description: 'Eternal Army lasts 3 turns instead of 2.',                                               targetCharacter: 'huang' },
  // Legendary
  { id: 'znyxorgas_eye',   name: "Znyxorga's Eye",    icon: '👁️', tier: 'legendary', description: 'After defeating an enemy, your next 2 cards cost 0 Mana.' },
  { id: 'void_armor',       name: 'Void Armor',        icon: '🛡️', tier: 'legendary', description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.' },
  { id: 'arena_champion',   name: 'Arena Champion',    icon: '🏆', tier: 'legendary', description: 'All stats +10 while this character is alive.',              statBonus: { hp: 10, might: 10, power: 10, defense: 10 } },
  { id: 'warlords_grimoire', name: "Warlord's Grimoire", icon: '📖', tier: 'legendary', description: 'On turns 2 and 3 of each fight, draw +2 cards and gain +2 Mana.' },
];

const CHAR_LABEL: Record<string, { name: string; color: string }> = {
  napoleon: { name: 'Napoleon',  color: '#d946ef' },
  genghis:  { name: 'Genghis',   color: '#ef4444' },
  davinci:  { name: 'Da Vinci',  color: '#34d399' },
  leonidas: { name: 'Leonidas',  color: '#f59e0b' },
  sunsin:   { name: 'Sun-sin',   color: '#38bdf8' },
  beethoven:{ name: 'Beethoven', color: '#22d3ee' },
  huang:    { name: 'Huang-chan',color: '#b45309' },
};

// ── Card Data ─────────────────────────────────────────────────────────────────

interface CardEntry {
  definitionId: string; name: string; icon: string;
  manaCost: number; type: string; rarity: string;
  description: string; exclusiveTo?: string;
  terrain?: 'land' | 'water'; // Sun-sin terrain-specific abilities
  isCurse?: boolean;
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
  { definitionId: 'shared_entangle',      name: 'Entangle',       icon: '🌿', manaCost: 2, type: 'debuff',   rarity: 'common', description: 'Target enemy is ROOTED — cannot move for 2 turns. Can still attack and use cards. Range 2.' },
  { definitionId: 'shared_armor_break',   name: 'Armor Break',    icon: '💥', manaCost: 2, type: 'debuff',   rarity: 'common', description: 'Enemy loses 25% Defense for 2 turns. Range 2.' },
  { definitionId: 'shared_silence',       name: 'Silence',        icon: '🔇', manaCost: 3, type: 'debuff',   rarity: 'common', description: 'Target cannot use abilities for 2 turns. Range 2.' },
  { definitionId: 'shared_poison_dart',   name: 'Poison Dart',    icon: '☠️', manaCost: 3, type: 'debuff',   rarity: 'common', description: 'Enemy loses 5 Might and 5 Defense each turn. Removed on heal. Range 2.' },
  // Shared — New
  { definitionId: 'shared_jump',            name: 'Jump',              icon: '🦘', manaCost: 1, type: 'movement', rarity: 'common', description: 'Leap over 1 tile — bypasses rivers and blocking units. Range 2.' },
  { definitionId: 'shared_flash_bang',      name: 'Flash Bang',        icon: '💥', manaCost: 1, type: 'debuff',   rarity: 'common', description: 'Throw a Flash Bang at range 3 — Blinds the target for 2 turns (attack and ability range reduced to 1).' },
  { definitionId: 'shared_suppressive_fire',name: 'Suppressive Fire',  icon: '🔫', manaCost: 2, type: 'attack',   rarity: 'common', description: 'Might×0.3 cone attack (3 wide, range 3). Slows hit enemies −1 move for 1 turn.' },
  { definitionId: 'shared_fortify',         name: 'Fortify',           icon: '🏰', manaCost: 2, type: 'defense',  rarity: 'common', description: 'Cannot move this turn. Gain +25 Defense and +15 Might until the end of your next turn.' },
  { definitionId: 'shared_taunt',           name: 'Taunt',             icon: '📢', manaCost: 2, type: 'debuff',   rarity: 'common', description: 'Force a nearby enemy to target this unit for 2 turns. This unit gains +15 Defense while Taunting.' },
  { definitionId: 'shared_decoy',           name: 'Decoy',             icon: '🪆', manaCost: 2, type: 'buff',     rarity: 'common', description: 'Place a 30 HP Decoy within range 3. Decoys cannot move or play cards. When destroyed, explodes for 20 damage to all enemies in range 2.' },
  { definitionId: 'shared_blood_price',     name: 'Blood Price',       icon: '🩸', manaCost: 3, type: 'buff',     rarity: 'rare',   description: 'Sacrifice 20% of your HP. All allies gain +15 Might and +15 Power until end of turn.' },
  // Napoleon
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.3 damage to a target at range 4.',                  exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, type: 'buff',    rarity: 'rare',    description: '+20% Might AND Power to all allies for 2 turns.',            exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_final_salvo',       name: 'Final Salvo',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — 3 random Power×0.7 hits on enemies within range 4.', exclusiveTo: 'Napoleon' },
  // Genghis
  { definitionId: 'genghis_mongol_charge',  name: 'Mongol Charge', icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: '48 damage at range 3. Applies Bleed: 16 HP/turn for 2 turns.',           exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics',  name: 'Horde Tactics', icon: '🌀', manaCost: 3, type: 'attack',  rarity: 'rare',    description: '20 dmg per enemy in range 2 to ALL enemies in range 2. (Scales with count)', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_riders_fury',    name: "Rider's Fury",  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — 40 damage to all enemies on a line. Doubled (80) if target below 40% HP.", exclusiveTo: 'Genghis' },
  // Leonidas
  { definitionId: 'leonidas_shield_bash',   name: 'Shield Bash',    icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.2 damage at range 1. Armor Break (−25% DEF, 2t) + counter-stance (+20 DEF this turn).', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall',  name: 'Spartan Wall',   icon: '🏛️', manaCost: 3, type: 'defense', rarity: 'rare',    description: '+20 Defense to Leonidas and all allies within range 2.',     exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_this_is_sparta',name: 'THIS IS SPARTA!',icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~125 dmg (Power×2.5) to target + Root all adjacent enemies for 2 turns (cannot move).', exclusiveTo: 'Leonidas' },
  // Da Vinci
  { definitionId: 'davinci_flying_machine',     name: 'Flying Machine',     icon: '✈️', manaCost: 2, type: 'movement', rarity: 'rare',    description: 'Teleport to any unoccupied hex on the board. No range limit.',              exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',        name: 'Masterpiece',        icon: '💚', manaCost: 3, type: 'defense',  rarity: 'rare',    description: 'Heal an ally within range 3 for 50 HP.',                  exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, type: 'ultimate',  rarity: 'ultimate', description: 'EXHAUST — Summon drone: HP 75, Might 50, Defense 30. Lasts until defeated. (Scales with Power)', exclusiveTo: 'Da Vinci' },
  // Sun-sin — Land forms
  { definitionId: 'sunsin_hwajeon_land',        name: 'Hwajeon',           icon: '🔥', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~72 dmg at range 3. Pushes target back 1 hex.',                                          exclusiveTo: 'Sun-sin', terrain: 'land' },
  { definitionId: 'sunsin_naval_repairs_land',  name: 'Naval Repairs',     icon: '🚢', manaCost: 3, type: 'defense',  rarity: 'rare',    description: 'Target an area — allies within range 2 heal 15 HP now and 15 HP next turn.',              exclusiveTo: 'Sun-sin', terrain: 'land' },
  { definitionId: 'sunsin_chongtong_land',      name: 'Chongtong Barrage', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Charge 3 hexes. ~60 dmg to enemies in path, pushed sideways. Sun-sin ends at last hex.', exclusiveTo: 'Sun-sin', terrain: 'land' },
  // Sun-sin — Water forms
  { definitionId: 'sunsin_ramming_speed_water', name: 'Ramming Speed',     icon: '🚢', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~72 dmg at range 1. Pushes target back 1 hex. (Power reduced on water)',                  exclusiveTo: 'Sun-sin', terrain: 'water' },
  { definitionId: 'sunsin_broadside_water',     name: 'Broadside',         icon: '💥', manaCost: 3, type: 'attack',   rarity: 'rare',    description: '~25 dmg to ALL enemies in range 3.',                                                     exclusiveTo: 'Sun-sin', terrain: 'water' },
  { definitionId: 'sunsin_chongtong_water',     name: 'Chongtong Barrage', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~90 dmg to main target + ~43 to adjacent enemies. Range 5.',                    exclusiveTo: 'Sun-sin', terrain: 'water' },
  // Beethoven
  { definitionId: 'beethoven_schallwelle',  name: 'Schallwelle',   icon: '🌊', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Sonic wave — Power×0.5 dmg to all enemies in a line up to range 3. Pushes each hit enemy 2 tiles back.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_freudenspur',  name: 'Freudenspur',   icon: '🎶', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Target a tile within range 3. That tile and all 6 adjacent tiles become a resonance zone. Allies on the zone gain +2 Movement at turn start. Lasts 2 turns.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_gotterfunken', name: 'Götterfunken',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Unleash the Sternensturm. Stun all enemies within range 3 for 1 turn.', exclusiveTo: 'Beethoven' },
  // Huang-chan
  { definitionId: 'huang_terracotta_summon', name: 'Terracotta Legion',         icon: '🗿', manaCost: 2, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Archer (Might×1.5, range 2) or Warrior (Might×1, range 1) on hex within range 3. HP 40, scales with your stats. Lasts 1 turn.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_first_emperor',     name: "First Emperor's Command",   icon: '🐴', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Cavalry (Might×1.5, Def×1.5, Power×1, Move 3) on adjacent hex. HP 60, scales with your stats. Lasts 2 turns. Gain FREE Cavalry Charge card.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_cavalry_charge',    name: 'Cavalry Charge',            icon: '⚡', manaCost: 0, type: 'attack',   rarity: 'rare',    description: 'FREE — Cavalry charges a target at range 3 for Power×1.2 damage. Only appears after First Emperor\'s Command.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_eternal_army',      name: 'Eternal Army',              icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Control a non-boss enemy within range 3 for 2 turns. They auto-attack nearest foe (same mechanics as attacking you). Cannot target bosses or mini-bosses.', exclusiveTo: 'Huang-chan' },
  // ── Curses ──────────────────────────────────────────────────────────────────
  // Curse cards are added to your deck by negative roguelike events. They do nothing useful — they waste mana and card plays.
  { definitionId: 'curse_burden',     name: 'Dead Weight',         icon: '💀', manaCost: 1, type: 'buff', rarity: 'common', description: 'A burden that drags on your soul. Costs 1 Mana — does nothing.', isCurse: true },
  { definitionId: 'curse_malaise',    name: 'Malaise',             icon: '💀', manaCost: 2, type: 'buff', rarity: 'common', description: 'Crushing lethargy seeps into your clones. Wastes 2 Mana — does nothing.', isCurse: true },
  { definitionId: 'curse_void_echo',  name: 'Void Echo',           icon: '💀', manaCost: 0, type: 'buff', rarity: 'common', description: 'A hollow resonance of dark energy. Wastes a card play — does nothing.', isCurse: true },
  { definitionId: 'curse_dread',      name: 'Dread',               icon: '💀', manaCost: 3, type: 'buff', rarity: 'common', description: 'An overwhelming sense of doom. Wastes 3 Mana — does nothing.', isCurse: true },
  { definitionId: 'curse_chains',     name: 'Chains of Znyxorga',  icon: '💀', manaCost: 1, type: 'buff', rarity: 'common', description: 'Invisible chains bind your clones. Must be played (costs 1 Mana) to discard — does nothing.', isCurse: true },
];

const EXCL_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b', 'Sun-sin': '#38bdf8', Beethoven: '#22d3ee', 'Huang-chan': '#b45309',
};

// ── Enemy Data ────────────────────────────────────────────────────────────────

interface EnemyAbilityEntry { icon: string; name: string; desc: string; }
interface EnemyEntry {
  id: string; name: string; icon: string; act: number;
  rank: 'Minion' | 'Elite' | 'Boss';
  ai: string;
  portrait?: string;
  stats: { hp: number; might: number; power: number; defense: number; moveRange: number; attackRange: number };
  description: string;
  abilities?: EnemyAbilityEntry[];
}

const ENEMIES: EnemyEntry[] = [
  { id: 'glorp_shambler',    name: 'Glorp Shambler',       icon: '🍄', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/glorp_shambler_portrait.png', stats: { hp: 60,  might: 35, power: 25, defense: 8,  moveRange: 2, attackRange: 1 }, description: 'A fungal creature from the swamps of Gloprax IV. Slow but relentless — it will walk straight into your lines.',
    abilities: [
      { icon: '☁️', name: 'Spore Release', desc: 'Releases toxic spores — applies Poison to all enemies within range 1. (Every 3 turns)' },
    ],
  },
  { id: 'zyx_skitter',       name: 'Zyx Skitter',          icon: '🦟', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/zyx_skitter_portrait.png', stats: { hp: 30,  might: 22, power: 15, defense: 4,  moveRange: 4, attackRange: 1 }, description: 'Fast-moving insectoid scouts. Fragile alone, but they arrive in pairs and swarm exposed flanks.',
    abilities: [
      { icon: '🦟', name: 'Swarm Bite', desc: 'Leaps onto the closest enemy and deals 20 damage to all enemies within range 1. (Every 4 turns)' },
    ],
  },
  { id: 'naxion_scout',      name: 'Naxion Scout',         icon: '👾', act: 1, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/naxion_scout_portrait.png',    stats: { hp: 70,  might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 }, description: "A hired gun from the outer arena circuits. One burning eye, one plasma pistol — it never stops smiling because it knows it's faster than you.",
    abilities: [
      { icon: '⚡', name: 'Plasma Shot', desc: 'Fires a concentrated plasma bolt dealing ~36 damage to the closest enemy within range 3. (Every 3 turns)' },
    ],
  },
  { id: 'vron_crawler',      name: 'Vron Crawler',         icon: '🦀', act: 1, rank: 'Minion', ai: 'defensive',  portrait: '/art/enemies/vron_crawler_portrait.png',    stats: { hp: 85,  might: 28, power: 20, defense: 16, moveRange: 2, attackRange: 1 }, description: "A living fortress on six legs. Its layered shell makes frontal assaults nearly pointless — wait for it to expose its soft underbelly, or don't attack at all.",
    abilities: [
      { icon: '🐚', name: 'Shell Harden', desc: 'Retracts into armored shell — gains +18 Defense for 2 turns. (Every 4 turns)' },
    ],
  },
  { id: 'krath_champion',    name: 'Krath Champion',       icon: '⚔️', act: 1, rank: 'Elite',  ai: 'berserker',  portrait: '/art/enemies/krath_champion_portrait.png',  stats: { hp: 105, might: 55, power: 40, defense: 18, moveRange: 3, attackRange: 1 }, description: "A seasoned Krath arena veteran decorated with the skulls of past opponents. Fights dirty, hard, and with a grin that says it's already killed better than you.",
    abilities: [
      { icon: '🔥', name: 'Battle Rage', desc: 'Gains +25 Might and +10 Defense for 2 turns. (Every 3 turns)' },
      { icon: '⚔️', name: "Champion's Strike", desc: 'Deals 1× Might damage to the nearest enemy in range 2. (Every 2 turns)' },
    ],
  },
  { id: 'spore_cluster',     name: 'Spore Node',           icon: '🔴', act: 1, rank: 'Elite',  ai: 'ranged',     portrait: '/art/enemies/spore_node_portrait.png',     stats: { hp: 40,  might: 20, power: 30, defense: 5,  moveRange: 1, attackRange: 2 }, description: 'Three semi-sentient spore heads on a shared fungal body. Sluggish and barely mobile, but the toxic clouds they pump out will rot your armor off in minutes.',
    abilities: [
      { icon: '☣️', name: 'Toxic Cloud', desc: 'Applies Poison to all enemies within range 2. (Every 2 turns)' },
      { icon: '💥', name: 'Spore Burst', desc: 'Deals 25 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
  { id: 'vexlar',            name: 'Vexlar',               icon: '🐆', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/vexlar_portrait.png',          stats: { hp: 80,  might: 25, power: 30, defense: 30, moveRange: 3, attackRange: 1 }, description: 'Alien apex predators brought in for your opening round. Six-legged and iridescent, they hunt the weakest link with surgical instinct and terrifying speed.',
    abilities: [
      { icon: '🐆', name: 'Predator Leap', desc: 'Leaps up to range 4 toward the enemy with the lowest Defense and immediately attacks. (Every 3 turns)' },
    ],
  },
  { id: 'iron_wall',         name: 'Iron Wall',            icon: '🤖', act: 1, rank: 'Boss',   ai: 'defensive',  portrait: '/art/enemies/iron_wall_portrait.png',       stats: { hp: 200, might: 60, power: 50, defense: 20, moveRange: 2, attackRange: 1 }, description: 'The Act I gatekeeper — a hulking war mech that heals when wounded, blankets the field with EMP blasts, and becomes an impenetrable turret when cornered.',
    abilities: [
      { icon: '💚', name: 'Shield Array', desc: 'Heals self for 50 HP. Triggers ONCE when below 50% HP.' },
      { icon: '⚡', name: 'EMP Blast', desc: 'Deals 40 damage to all enemies within range 1. (Every 3 turns)' },
      { icon: '🤖', name: 'Turret Mode', desc: 'Gains +40 Defense for 2 turns. (Every 4 turns)' },
    ],
  },
  { id: 'mog_toxin',         name: 'Mog Toxin',            icon: '☣️', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/mog_toxin_portrait.png',     stats: { hp: 75,  might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 }, description: 'A long-range biological hazard unit. Deals poison-type damage from across the field.',
    abilities: [
      { icon: '🧪', name: 'Acid Spray', desc: 'Launches a corrosive burst — applies Armor Break (−20% DEF) to all enemies within range 1 for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'qrix_hunter',       name: 'Qrix Hunter',          icon: '🏹', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/qrix_hunter_portrait.png',     stats: { hp: 70,  might: 25, power: 50, defense: 8,  moveRange: 3, attackRange: 3 }, description: 'A precision marksman deployed by arena sponsors. Has the longest attack range of any common enemy.',
    abilities: [
      { icon: '📌', name: 'Pinning Shot', desc: 'Fires a precision bolt dealing ~35 damage to the closest enemy within range 3. (Every 3 turns)' },
    ],
  },
  { id: 'void_wraith',       name: 'Void Wraith',          icon: '👻', act: 2, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/void_wraith_portrait.png', stats: { hp: 65,  might: 45, power: 40, defense: 5,  moveRange: 4, attackRange: 1 }, description: 'Spectral energy creature from the Null Zone. Fast and hits hard, but shatters quickly.',
    abilities: [
      { icon: '🌑', name: 'Shadow Step', desc: 'Phases through reality — teleports adjacent to the closest enemy and strikes for 1× Might (DEF applies). (Every 3 turns)' },
    ],
  },
  { id: 'krath_berserker',   name: 'Krath Berserker',      icon: '💢', act: 2, rank: 'Elite',  ai: 'berserker',  portrait: '/art/enemies/krath_berserker_portrait.png',  stats: { hp: 140, might: 60, power: 55, defense: 14, moveRange: 4, attackRange: 1 }, description: 'The veteran of Act I. Goes berserk for a burst of +25 Might, then leaps across the field.',
    abilities: [
      { icon: '💢', name: 'Bloodrage', desc: 'Gains +25 Might and loses 20 Defense for 2 turns. (Every 3 turns)' },
      { icon: '🦘', name: 'Savage Leap', desc: 'Teleports adjacent to the closest enemy and deals ~90 damage (DEF applies). (Every 2 turns)' },
    ],
  },
  { id: 'phasewarden',       name: 'Phasewarden',          icon: '🔮', act: 2, rank: 'Elite',  ai: 'ranged',     portrait: '/art/enemies/phasewarden_portrait.png',     stats: { hp: 110, might: 55, power: 65, defense: 20, moveRange: 4, attackRange: 2 }, description: "A guardian from between dimensions. Its crystalline armor flickers between planes of existence — it blinks away, strips your defenses, then closes in when you're most exposed.",
    abilities: [
      { icon: '🔮', name: 'Dimensional Drain', desc: 'Applies Armor Break to all enemies within range 2 for 2 turns. (Every 3 turns)' },
      { icon: '✨', name: 'Phase Blink', desc: 'Teleports adjacent to the closest enemy and deals ~66 damage (DEF applies). (Every 2 turns)' },
    ],
  },
  { id: 'twin_terror_a',     name: 'Terror Alpha',         icon: '🗡️', act: 2, rank: 'Boss',   ai: 'berserker',  portrait: '/art/enemies/terror_alpha_portrait.png',   stats: { hp: 160, might: 70, power: 55, defense: 20, moveRange: 4, attackRange: 1 }, description: 'The aggressive half of the Twin Terror. Built for raw speed and kinetic impact — charges at full sprint and hits like a missile. Kill it first or it will never stop coming.',
    abilities: [
      { icon: '🗡️', name: 'Alpha Rush', desc: 'Charges 4 hexes and deals ~126 damage on impact (DEF applies). (Every 2 turns)' },
      { icon: '🔥', name: 'Twin Fury', desc: 'Gains +30 Might for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'twin_terror_b',     name: 'Terror Beta',          icon: '🛡️', act: 2, rank: 'Boss',   ai: 'defensive',  portrait: '/art/enemies/terror_beta_portrait.png',    stats: { hp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 }, description: 'The defensive half of the Twin Terror. Absorbs punishment while Alpha creates chaos, then heals itself when nearly dead. Ignore it and Beta becomes unkillable.',
    abilities: [
      { icon: '💚', name: 'Aegis Heal', desc: 'Heals self for 65 HP. Triggers ONCE when below 40% HP.' },
      { icon: '🛡️', name: 'Mirror Aegis', desc: 'Gains +35 Defense for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'znyxorga_champion', name: "Znyxorga's Champion",  icon: '👑', act: 3, rank: 'Boss',   ai: 'berserker',  portrait: '/art/enemies/znyxorgas_champion_portrait.png', stats: { hp: 400, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 }, description: "Znyxorga's ultimate weapon — four arms, six eyes, 400 HP, and the patience of a god. Annihilates your whole team simultaneously and grows stronger the closer it gets to death.",
    abilities: [
      { icon: '👑', name: 'Arena Collapse', desc: 'The arena becomes a weapon — deals 55 damage to ALL player characters simultaneously. (Every 3 turns)' },
      { icon: '🛡️', name: 'Phase Shift', desc: 'INVINCIBLE for 2 turns and gains +15 Might/Power/Defense permanently. Triggers ONCE when below 50% HP — prepare for a power spike!' },
      { icon: '⭐', name: "Champion's Will", desc: "Driven by Znyxorga's will — gains +20 Might/Power/Defense permanently. Triggers ONCE when below 30% HP. Finish it fast!" },
      { icon: '💥', name: 'Tyrant Strike', desc: 'Channels overwhelming power — deals ~104 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
  // ── New Enemies ────────────────────────────────────────────────────────────
  { id: 'naxion_shieldbearer', name: 'Naxion Shieldbearer', icon: '🛡️', act: 1, rank: 'Elite', ai: 'defensive', portrait: '/art/enemies/naxion_shieldbearer_portrait.png', stats: { hp: 115, might: 45, power: 30, defense: 35, moveRange: 2, attackRange: 1 }, description: "A walking fortress in the shape of a soldier. The Naxion Shieldbearer absorbs everything you throw at it and hits back twice as hard — and if you think its allies are safe, you're wrong.",
    abilities: [
      { icon: '🛡️', name: 'Shield Slam', desc: 'Crashes its shield into a target — deals 1.4× Might damage and Roots the target for 1 turn. (Every 2 turns)' },
      { icon: '📣', name: 'Rally Cry', desc: 'Braces for impact — gains +25 Defense for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'grox_magnetar', name: 'Grox Magnetar', icon: '🧲', act: 2, rank: 'Elite', ai: 'ranged', portrait: '/art/enemies/grox_magnetar_portrait.png', stats: { hp: 130, might: 50, power: 70, defense: 25, moveRange: 3, attackRange: 3 }, description: "A living electromagnetic anomaly — the Grox Magnetar bends metal, reroutes energy, and silences technology with a thought. It doesn't fight in straight lines; it reshapes the battlefield to make sure nothing else does either.",
    abilities: [
      { icon: '🧲', name: 'Magnetic Pull', desc: 'Yanks a target 2 hexes closer then deals Power×0.8 damage. Range 3. (Every 2 turns)' },
      { icon: '⚡', name: 'EMP Surge', desc: 'Releases an electromagnetic pulse — Silences all enemies within range 1 for 1 turn (Power reduced to 0). (Every 3 turns)' },
    ],
  },
  { id: 'vrex_mimic', name: 'Vrex Mimic', icon: '🎭', act: 2, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/vrex_mimic_portrait.png', stats: { hp: 90, might: 40, power: 40, defense: 15, moveRange: 4, attackRange: 1 }, description: "Nobody knows what a Vrex Mimic actually looks like — it never stops wearing someone else's face. Adapts its form mid-fight, copying the threat in front of it with unnerving precision.",
    abilities: [
      { icon: '🎭', name: 'Imitate', desc: 'Mimics the closest enemy — gains their Might and Power values until end of turn, then strikes for 1.2× Might. (Every 2 turns)' },
      { icon: '🌀', name: 'Disorienting Shift', desc: 'Shifts form erratically — Roots the target for 1 turn. Range 2. (Every 3 turns)' },
    ],
  },
  { id: 'crystalline_hive', name: 'Crystalline Hive', icon: '💎', act: 3, rank: 'Minion', ai: 'ranged', portrait: '/art/enemies/crystalline_hive_portrait.png', stats: { hp: 85, might: 35, power: 60, defense: 20, moveRange: 2, attackRange: 3 }, description: "A collective organism grown from shattered crystal — the Hive doesn't think so much as resonate. Its shards fragment in every direction and the longer it stays alive, the more the air itself cuts you.",
    abilities: [
      { icon: '💎', name: 'Crystal Burst', desc: 'Erupts in razor shards — deals Power×1.2 to all enemies within range 2. (Every 2 turns)' },
      { icon: '🔶', name: 'Resonance Field', desc: 'Harmonic vibrations weaken armor — applies Armor Break (−15% DEF) to all enemies within range 2 for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'enemy_base', name: 'Znyxorga Fortress', icon: '🏰', act: 0, rank: 'Boss', ai: 'static', portrait: '/art/enemies/enemy_base_portrait.png', stats: { hp: 150, might: 0, power: 0, defense: 0, moveRange: 0, attackRange: 3 }, description: 'A hardened enemy stronghold that can appear in any Act. Cannot move — instead it fires every single turn and bombards with heavy artillery every 3 turns. Destroy it before its relentless fire wears you down.',
    abilities: [
      { icon: '🏰', name: 'Base Turret', desc: 'Fires at ALL player characters within range 3 for 50 damage every player turn.' },
      { icon: '💥', name: 'Siege Bombardment', desc: 'Rains fire on ALL player characters with line-of-sight for ~40 damage (Defense applies). (Every 3 turns)' },
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
  const { t } = useT();
  const TAB_LABELS: Record<string, string> = {
    characters: t.archives.tabs.characters,
    tiles: t.archives.tabs.tiles,
    cards: t.archives.tabs.cards,
    items: t.archives.tabs.items,
  };
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
            {t.archives.title}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Game Compendium — All Classified Data</p>
        </div>
        <button onClick={onBack}
          className="absolute top-4 left-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
          <ChevronLeft className="w-4 h-4" /> {t.mainMenu}
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
              {tab.icon} {(TAB_LABELS[tab.id] ?? tab.label).toUpperCase()}
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
  const { t } = useT();
  return (
    <div className="flex items-center justify-center px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-[1200px] w-full">
        {CHARACTERS.map(c => {
          const roleStyle = ROLE_STYLE[c.role];
          const ct = t.characters[c.id as keyof typeof t.characters];
          const displayName = ct?.name ?? c.name;
          const displayTitle = ct?.title ?? c.title;
          const displayTagline = ct?.tagline ?? c.tagline;
          const displayRole = t.roles[c.role.toLowerCase().replace(/ /g, '_') as keyof typeof t.roles] ?? c.role;
          return (
            <button key={c.id} onClick={() => onSelectChar(c.id)}
              className="group relative rounded-2xl overflow-hidden border border-slate-700/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl text-left"
              style={{ aspectRatio: '3/4' }}>
              <img src={c.portrait} alt={displayName}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                style={{ filter: 'brightness(0.75)' }} />
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${c.accentColor}55 0%, rgba(2,4,14,0.7) 35%, transparent 70%)` }} />
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ boxShadow: `inset 0 0 0 2px ${c.accentColor}` }} />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-2 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
                  {displayRole}
                </div>
                <h2 className="font-orbitron font-black text-xl text-white leading-tight">{displayName}</h2>
                <p className="text-sm italic mt-0.5" style={{ color: c.accentColor }}>{displayTitle}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 italic">"{displayTagline}"</p>
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
  const { t } = useT();
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
          const itemT = (t.items as Record<string, { name: string; description: string }>)[item.id];
          const charNameT = charInfo && item.targetCharacter
            ? (t.characters[item.targetCharacter as keyof typeof t.characters]?.name ?? charInfo.name)
            : null;
          return (
            <div key={item.id} className="rounded-xl border p-4 flex flex-col"
              style={{ background: 'rgba(8,5,25,0.9)', borderColor: tc + '45' }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{item.icon}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: tc, background: tc + '18', border: `1px solid ${tc}50` }}>
                    {(t.archives.itemTier[item.tier as keyof typeof t.archives.itemTier] ?? item.tier).toUpperCase()}
                  </span>
                  {charInfo && charNameT && (
                    <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: charInfo.color, background: charInfo.color + '18', border: `1px solid ${charInfo.color}50` }}>
                      {charNameT.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-orbitron font-bold text-sm text-white mb-1">{itemT?.name ?? item.name}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed flex-1">{itemT?.description ?? item.description}</p>
              {item.statBonus && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {Object.entries(item.statBonus).map(([k, v]) => v ? (
                    <span key={k} className="text-[10px] font-orbitron font-bold"
                      style={{ color: STAT_COLOR[k] ?? '#4ade80' }}>
                      +{v} {k.toUpperCase()}
                    </span>
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
  const { t } = useT();
  const [filter, setFilter] = useState<string>('all');
  const [upgradedCards, setUpgradedCards] = useState<Record<string, boolean>>({});
  const filterOpts: { value: string; label: string }[] = [
    { value: 'all',        label: 'All Cards' },
    { value: 'shared',     label: 'Shared' },
    { value: 'Napoleon',   label: 'Napoleon' },
    { value: 'Genghis',    label: 'Genghis' },
    { value: 'Da Vinci',   label: 'Da Vinci' },
    { value: 'Leonidas',   label: 'Leonidas' },
    { value: 'Sun-sin',    label: 'Sun-sin' },
    { value: 'Beethoven',  label: 'Beethoven' },
    { value: 'Huang-chan', label: 'Huang-chan' },
    { value: 'curses',     label: '💀 Curses' },
  ];
  const filtered = CARDS.filter(c => {
    if (filter === 'curses') return !!c.isCurse;
    if (filter === 'all') return true;
    if (filter === 'shared') return !c.exclusiveTo && !c.isCurse;
    return c.exclusiveTo === filter;
  });
  const activeColor = filter === 'all' || filter === 'shared' ? '#22d3ee' : EXCL_COLOR[filter] ?? '#22d3ee';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Upgrade sources info */}
      <div className="rounded-xl border border-emerald-900/40 p-4 mb-8 flex flex-col gap-2"
        style={{ background: 'rgba(6,18,12,0.85)' }}>
        <p className="font-orbitron font-bold text-[11px] tracking-widest text-emerald-400 mb-1">HOW UPGRADES WORK</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">🔥</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Campfire — Shared Cards</p>
              <p>At a campfire, choose "Upgrade a Shared Card" to permanently upgrade one shared card (e.g. Jump, Fortify, Taunt). Affects ALL copies in your deck. One upgrade per campfire rest.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">⬆️</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Level Up — Character Abilities</p>
              <p>Characters gain upgrade tokens at levels 2 and 4. Each token lets you upgrade one of their non-ultimate ability cards. Applies to all copies of that card in the deck.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">⭐</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Level 6 — Ultimate Upgrade</p>
              <p>At level 6, a character earns one ultimate upgrade token to power up their ultimate ability. The upgrade is permanent for the rest of the run.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500">CARDS — {filtered.length}/{CARDS.length} TOTAL</p>
        <div className="relative">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="font-orbitron text-[10px] tracking-widest appearance-none pl-3 pr-8 py-1.5 rounded-full border transition-all outline-none cursor-pointer"
            style={{
              color: activeColor,
              borderColor: activeColor,
              background: 'rgba(4,2,18,0.95)',
            }}
          >
            {filterOpts.map(f => (
              <option key={f.value} value={f.value}
                style={{ background: '#0a0614', color: f.value === 'all' || f.value === 'shared' ? '#22d3ee' : EXCL_COLOR[f.value] ?? '#22d3ee' }}>
                {f.label.toUpperCase()}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px]" style={{ color: activeColor }}>▼</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(card => {
          const isCurse = !!card.isCurse;
          const tc = isCurse ? '#c084fc' : (CARD_TYPE_COLOR[card.type] ?? '#94a3b8');
          const ec = card.exclusiveTo ? EXCL_COLOR[card.exclusiveTo] : null;
          const cardT = (t.cards as Record<string, { name: string; description: string }>)[card.definitionId];
          const upgrade = CARD_UPGRADES[card.definitionId] ?? null;
          const isShowingUpgrade = !!upgrade && !!upgradedCards[card.definitionId];
          return (
            <div key={card.definitionId} className="rounded-xl border p-4 flex gap-3 items-start transition-colors"
              style={{
                background: isCurse ? 'rgba(30,5,35,0.95)' : isShowingUpgrade ? 'rgba(6,20,12,0.95)' : 'rgba(8,5,25,0.9)',
                borderColor: isCurse ? 'rgba(192,132,252,0.35)' : isShowingUpgrade ? 'rgba(52,211,153,0.4)' : tc + '35',
              }}>
              <span className="text-3xl shrink-0 pt-0.5">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-orbitron font-bold text-sm" style={{ color: isShowingUpgrade ? '#34d399' : 'white' }}>
                    {isShowingUpgrade ? upgrade!.upgradedName : (cardT?.name ?? card.name)}
                  </span>
                  <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                    style={{ color: tc, background: tc + '18', border: `1px solid ${tc}40` }}>
                    {card.type.toUpperCase()}
                  </span>
                  {isCurse && (
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: '#c084fc', background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.4)' }}>
                      💀 CURSE
                    </span>
                  )}
                  {ec && (
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: ec, background: ec + '18', border: `1px solid ${ec}40` }}>
                      {card.exclusiveTo}
                    </span>
                  )}
                  {card.terrain === 'land' && (
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: '#86efac', background: 'rgba(134,239,172,0.12)', border: '1px solid rgba(134,239,172,0.35)' }}>
                      🏔 LAND ONLY
                    </span>
                  )}
                  {card.terrain === 'water' && (
                    <span className="font-orbitron text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)' }}>
                      🌊 WATER ONLY
                    </span>
                  )}
                  <span className="ml-auto font-orbitron text-[11px] shrink-0"
                    style={{ color: isShowingUpgrade && upgrade?.patch?.manaCost !== undefined ? '#34d399' : '#64748b' }}>
                    {isShowingUpgrade && upgrade?.patch?.manaCost !== undefined ? upgrade.patch.manaCost : card.manaCost} Mana
                  </span>
                </div>
                {isShowingUpgrade && (
                  <p className="font-orbitron text-[9px] text-emerald-400 mb-1.5">✦ {upgrade!.descriptionUpgrade}</p>
                )}
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {colorizeDesc(isShowingUpgrade
                    ? (upgrade!.patch.description ?? cardT?.description ?? card.description)
                    : (cardT?.description ?? card.description))}
                </p>
                {upgrade && (
                  <button
                    onClick={() => setUpgradedCards(prev => ({ ...prev, [card.definitionId]: !prev[card.definitionId] }))}
                    className="mt-2 font-orbitron text-[9px] font-bold px-2 py-0.5 rounded border transition-all"
                    style={{
                      color: isShowingUpgrade ? '#34d399' : '#64748b',
                      borderColor: isShowingUpgrade ? 'rgba(52,211,153,0.5)' : 'rgba(71,85,105,0.4)',
                      background: isShowingUpgrade ? 'rgba(52,211,153,0.1)' : 'transparent',
                    }}>
                    {isShowingUpgrade ? '← BASE VERSION' : '✦ SHOW UPGRADE'}
                  </button>
                )}
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
  const { t } = useT();
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
                {enemy.portrait ? (
                  <img src={enemy.portrait} alt={enemy.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                    style={{ border: '1px solid rgba(100,80,160,0.4)' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'inline'; }}
                  />
                ) : null}
                <span className="text-4xl" style={{ display: enemy.portrait ? 'none' : 'inline' }}>{enemy.icon}</span>
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
                  <p className="font-orbitron text-[9px] tracking-[0.3em] text-slate-600 mb-1">{t.archives.abilitiesSection}</p>
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
    id: 'rooted', name: 'Rooted', icon: '🌿', color: '#86efac',
    source: 'Cards & Abilities (Entangle, THIS IS SPARTA!)',
    duration: '1–2 turns',
    mechanics: 'The Rooted unit cannot move for the duration. They can still attack, use cards, and trigger abilities normally — only their movement is blocked.',
    tip: 'Root fast melee enemies to keep them at range. Combine with Armor Break for devastating burst turns while they cannot reposition.',
    counterplay: 'Rooted units can still attack and use cards, so they remain dangerous. Do not stand adjacent to a Rooted enemy — they can still hit you. Prioritise killing Rooted targets.',
  },
  {
    id: 'blinded', name: 'Blinded', icon: '💥', color: '#fde047',
    source: 'Cards (Flash Bang)',
    duration: '2 turns',
    mechanics: 'The Blinded unit\'s attack range and ability range are both reduced to 1 for the duration. Basic attacks and all abilities that require a target are affected.',
    tip: 'Flash Bang a long-range enemy (Napoleon, Qrix Hunter) before their turn to shut down their damage output entirely.',
    counterplay: 'Move your Blinded unit adjacent to the threat so they can still attack. Heal or wait out the 2-turn duration.',
  },
  {
    id: 'silence', name: 'Silence', icon: '🔇', color: '#60a5fa',
    source: 'Cards & Enemy Abilities',
    duration: '2–3 turns',
    mechanics: 'Target cannot use character ability cards (exclusive cards) for the duration. Shared cards like Basic Attack, Mend, and Shields Up are unaffected. Enemy AI units fall back to basic attacks while Silenced.',
    tip: 'Silence a boss before its key turn to prevent a devastating ability. Upgrade to Silence+ for Range 3 and 3-turn duration.',
    counterplay: 'Silenced characters can still use shared cards and move normally. Position them to basic attack while waiting out the debuff.',
  },
  {
    id: 'poison', name: 'Poison', icon: '☠️', color: '#4ade80',
    source: 'Cards & Enemy Abilities',
    duration: 'Until healed',
    mechanics: 'Each turn, the poisoned unit loses 5 Might AND 5 Defense. These stack per poison application. Poison is removed entirely when the unit is healed by any source (Mend, Masterpiece, Arena Medkit).',
    tip: 'Apply Poison early and deny heals. Against multiple Spore Nodes, your characters will be crippled within 2 turns without a dedicated healer.',
    counterplay: 'Always have at least one Mend or Masterpiece available when facing Spore Nodes. Healing removes all stacks immediately.',
  },
  {
    id: 'mud_throw', name: 'Mud Throw', icon: '🪣', color: '#92400e',
    source: 'Cards',
    duration: '2 turns',
    mechanics: 'Reduces the target\'s movement range by 1 per stack for the duration. Multiple applications stack — a unit with 3 Move Range hit twice is reduced to 1.',
    tip: 'Use on fast melee enemies (Void Wraith, Krath Berserker) to keep them at arm\'s length while your ranged characters chip away.',
    counterplay: 'Enemies affected by Mud Throw will still use abilities. Watch for dash attacks that bypass movement penalties.',
  },
  {
    id: 'stun', name: 'Stun', icon: '⚡', color: '#facc15',
    source: 'Abilities',
    duration: '1 turn',
    mechanics: 'The stunned unit is completely frozen for their next turn — no movement, no card plays, no abilities. Unlike Rooted (which only blocks movement), Stun is a complete guaranteed freeze.',
    tip: 'Stun is the hardest single-turn control in the game. Use it on the turn before a boss ability fires to waste it entirely.',
    counterplay: 'Stun only lasts 1 turn. Spread your characters to avoid being chain-stunned in a single turn.',
  },
  {
    id: 'bleed', name: 'Bleed', icon: '🩸', color: '#f87171',
    source: 'Abilities',
    duration: '2 turns',
    mechanics: 'Each turn-end, the bleeding unit loses HP equal to the bleed magnitude (~16 HP at base). Unlike Poison, Bleed bypasses Defense entirely — it is raw HP damage. Reapplying Bleed refreshes the duration rather than stacking.',
    tip: 'Apply Bleed then immediately pressure the enemy — they have 2 turns before it fades. Combine with Bloodlust kills for a mana-positive loop.',
    counterplay: 'Bleed does not reduce stats, only HP. Heal it before the second tick if possible. Unlike Poison, it is not removed by healing — it must run its course.',
  },
  {
    id: 'burning', name: 'Burning', icon: '🔥', color: '#f97316',
    source: 'Arena Events (Forest Fire)',
    duration: 'Until the burning tile is vacated',
    mechanics: 'Units standing on a burning forest tile take 30 pure damage at the start of each turn. The fire can spread to adjacent forest tiles. Moving off a burning tile removes the Burning status immediately.',
    tip: 'The moment you see a Forest Fire warning, vacate all forest tiles. 30 pure damage per turn kills even the tankiest character within a few turns.',
    counterplay: 'Move off the tile immediately. Burning damage ignores Defense — there is no mitigation. If you have a unit forced to stay in range, keep them healed.',
  },
  {
    id: 'shielded', name: 'Shielded', icon: '🛡️', color: '#38bdf8',
    source: 'Abilities & Items',
    duration: '1–2 turns',
    mechanics: 'The Shielded unit absorbs incoming damage up to the shield\'s value before HP is affected. Once the shield depletes, it is removed. Multiple shield applications stack.',
    tip: 'Apply Shielded before charging into a dangerous position. Combine with Fortify for maximum defensive burst on a tank.',
    counterplay: 'Multi-hit attacks (Artillery Barrage, Crystal Burst) deplete shields faster. Focus fire to break the shield in one activation, then follow up.',
  },
  {
    id: 'inspired', name: 'Inspired', icon: '✨', color: '#a78bfa',
    source: 'Abilities & Items',
    duration: '1–2 turns',
    mechanics: 'The Inspired unit gains a bonus to Might and/or Power for the duration. The magnitude varies by source — typically +10–20 to one or both stats.',
    tip: 'Inspired is a force multiplier. Stack it on your highest-damage character right before a big combo turn.',
    counterplay: 'Silence an Inspired unit to negate their Power bonus. Stun them to waste the inspired turn entirely.',
  },
  {
    id: 'curse', name: 'Curse', icon: '💜', color: '#c084fc',
    source: 'Enemy Abilities',
    duration: '2 turns (varies)',
    mechanics: 'Curses have variable effects depending on the source — they may reduce stat gain, reverse healing, or cause other negative effects beyond standard debuffs. Each Curse specifies its exact mechanic on application.',
    tip: 'Enemies that apply Curse are high-priority targets. Letting a Curse tick on your healer or carry can snowball quickly.',
    counterplay: 'Cleanse effects (Masterpiece removes Poison; similar effects may be added for Curse). Otherwise, prioritise killing the enemy applying the Curse before the next application.',
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
              background: selected === e.id ? `rgba(${e.color === '#f97316' ? '249,115,22' : e.color === '#a78bfa' ? '167,139,250' : e.color === '#60a5fa' ? '96,165,250' : e.color === '#4ade80' ? '74,222,128' : e.color === '#f87171' ? '248,113,113' : e.color === '#facc15' ? '250,204,21' : '146,64,14'},0.08)` : 'rgba(8,4,28,0.7)',
              borderColor: selected === e.id ? e.color : 'rgba(255,255,255,0.08)',
              boxShadow: selected === e.id ? `0 0 16px ${e.color}33` : 'none',
            }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{e.icon}</span>
              <div>
                <div className="font-orbitron font-bold text-sm text-white">{e.name}</div>
                <div className="text-[11px]" style={{ color: e.color }}>{e.duration}</div>
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
    trigger: 'Random',
    duration: 'Instant',
    effect: 'Anti-gravity pulses flood the arena. ALL living units gain +2 Movement this round.',
    strategy: 'Use this to close distance instantly or retreat to safety. Both sides benefit equally — plan ahead.',
  },
  {
    id: 'gravity_crush', name: 'Gravity Crush', icon: '🪨', color: '#94a3b8',
    trigger: 'Random',
    duration: 'Instant',
    effect: 'Intense gravity crushes the arena. All unit Movement is halved this round — nobody goes far.',
    strategy: 'Stack buffs and play defensively. Avoid committing to aggressive moves that require reaching the enemy this turn.',
  },
  {
    id: 'forest_fire', name: 'Forest Fire', icon: '🔥', color: '#f97316',
    trigger: 'Random · 2-turn warning',
    duration: 'Permanent once ignited',
    duration2: 'Spreads 50% chance per adjacent forest tile each turn',
    effect: 'A random forest tile catches fire after 2 turns of warning. Units on burning tiles take 30 pure damage at turn start. The fire spreads to adjacent forest tiles each turn.',
    strategy: 'Vacate forest tiles the moment the warning appears. Units on burning tiles take 30 pure damage at turn start — get out fast.',
  },
  {
    id: 'laser_grid', name: 'Laser Grid', icon: '⚡', color: '#ef4444',
    trigger: 'Random',
    duration: '1-turn warning · lasers fire next turn',
    effect: 'Znyxorga targets 10 random tiles with orbital lasers, highlighted in gold. Any unit on a marked tile when lasers fire next turn takes 40 pure damage.',
    strategy: '10 tiles is a lot — scan the board carefully. Move every unit off gold tiles immediately, prioritising your most fragile characters.',
  },
  {
    id: 'alien_tide', name: 'Alien Tide', icon: '🌊', color: '#38bdf8',
    trigger: 'Random · 2-turn warning',
    duration: 'Permanent once activated',
    duration2: 'Spreads 50% chance per adjacent lake tile each turn',
    effect: 'The arena floods after 2 turns of warning. Each subsequent turn, every hex adjacent to a Lake tile has a 50% chance of also flooding and becoming impassable.',
    strategy: 'Cross rivers and claim flanks before flood lanes close. Long-range characters like Napoleon gain value as movement corridors shrink.',
  },
  {
    id: 'mana_surge', name: 'Mana Surge', icon: '💎', color: '#c084fc',
    trigger: 'Random',
    duration: 'Instant',
    effect: 'Mana wells overflow. Both teams instantly gain +2 Mana.',
    strategy: 'Save your most expensive abilities for the turn right after a Mana Surge — you may chain two big cards in the same activation.',
  },
  {
    id: 'gravity_well', name: 'Gravity Well', icon: '⬇️', color: '#a78bfa',
    trigger: 'Random',
    duration: 'Instant',
    effect: "A gravity well forms at the arena's center. Every living unit is pulled 2 hexes toward the center hex. Units dragged into River tiles are instantly killed.",
    strategy: "Check every character's river proximity before acting. Two hexes toward center can send someone straight into a river. Deadly for the enemy if they're already near water.",
  },
  {
    id: 'repulse_field', name: 'Repulse Field', icon: '💥', color: '#fb923c',
    trigger: 'Random',
    duration: 'Instant',
    effect: 'Magnetic repulsion erupts from the arena center. Every living unit is blasted 2 hexes outward away from the center. Units thrown into Lake tiles are instantly killed.',
    strategy: "The mirror image of Gravity Well — instead of being sucked in, everyone is thrown outward. Stay away from lakes and arena edges before each turn. Units already near the perimeter are most at risk.",
  },
  {
    id: 'adrenaline_cloud', name: 'Adrenaline Cloud', icon: '🧪', color: '#f472b6',
    trigger: 'Random',
    duration: '1 round',
    effect: "The aliens pump experimental stimulants into the arena atmosphere. All units' Might and Power are increased by 50% for this round — enemies included. Every attack hits harder. Every ability hits harder.",
    strategy: 'A double-edged round. Use your hardest-hitting cards now — abilities and attacks that already deal big numbers become devastating. Be warned: the enemy hits just as hard back.',
  },
  {
    id: 'scramble', name: 'Scramble', icon: '🌀', color: '#34d399',
    trigger: 'Random',
    duration: 'Instant',
    effect: "Znyxorga's teleportation array fires at random, scrambling the position of every living unit on the battlefield to a completely random valid tile. Formations are shattered. Nobody knows where they'll end up.",
    strategy: 'Pure chaos — your carefully arranged formation is gone in an instant. After Scramble, re-evaluate the board completely before acting. Units that land adjacent to enemies are in immediate danger, but enemies may also be scattered away from you.',
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
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[11px] px-2 py-0.5 rounded font-orbitron"
                    style={{ background: `${ev.color}18`, color: ev.color, border: `1px solid ${ev.color}44` }}>
                    {ev.trigger}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] px-2 py-0.5 rounded font-orbitron text-slate-400"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {ev.duration}
                    </span>
                    {(ev as any).duration2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-orbitron text-slate-500"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {(ev as any).duration2}
                      </span>
                    )}
                  </div>
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
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const entry = selected ? LORE.find(l => l.id === selected) : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-8">{t.archives.classifiedRecords}</p>
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
  const { t } = useT();
  const [sunsinMode, setSunsinMode] = useState<"land" | "water">("land");
  const [showUpgraded, setShowUpgraded] = useState<Record<string, boolean>>({});
  const roleStyle = ROLE_STYLE[char.role];
  const hasWaterForm = !!char.waterStats;
  const displayStats = hasWaterForm && sunsinMode === "water" ? char.waterStats! : char.stats;
  const ct = t.characters[char.id as keyof typeof t.characters];
  const displayName = ct?.name ?? char.name;
  const displayTitle = ct?.title ?? char.title;
  const displayTagline = ct?.tagline ?? char.tagline;
  const displayLore = ct?.lore ?? char.lore;
  const abilityTranslations = ct ? [ct.passive, ct.ability1, ct.ability2, ct.ultimate] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-14 flex items-center px-6 border-b border-slate-800/60"
        style={{ background: 'rgba(2,4,14,0.92)' }}>
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
          <ChevronLeft className="w-4 h-4" /> {t.archives.title}
        </button>
        <div className="mx-4 h-4 w-px bg-slate-700" />
        <span className="font-orbitron text-xs text-slate-500 tracking-widest">{displayName.toUpperCase()}</span>
      </div>

      <div className="flex-1 flex overflow-auto">
        {/* Left: Portrait panel */}
        <div className="w-[420px] shrink-0 relative flex flex-col items-center justify-center py-12 px-8"
          style={{ background: `linear-gradient(135deg, rgba(2,4,14,0.98) 0%, ${char.accentColor}12 100%)` }}>
          <div className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${char.ringColor} 0%, transparent 70%)`, filter: 'blur(50px)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <div className="relative rounded-full overflow-hidden"
            style={{ width: 260, height: 260, border: `4px solid ${char.accentColor}60`, boxShadow: `0 0 50px ${char.ringColor}, 0 0 100px ${char.accentColor}30` }}>
            <img src={char.portrait} alt={displayName} className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.92) contrast(1.05)' }} />
          </div>
          <div className="relative text-center mt-6">
            <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-3 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
              {t.roles[char.role.toLowerCase().replace(/ /g, '_') as keyof typeof t.roles] ?? char.role}
            </div>
            <h2 className="font-orbitron font-black text-2xl text-white">{displayName}</h2>
            <p className="italic text-sm mt-1" style={{ color: char.accentColor }}>{displayTitle}</p>
          </div>
          <div className="relative w-full h-px my-6"
            style={{ background: `linear-gradient(to right, transparent, ${char.accentColor}50, transparent)` }} />
          <div className="relative w-full space-y-3">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">{t.archives.baseStats}</p>
            {([
              { key: 'hp',        label: t.archives.statLabels.hp.toUpperCase(),      icon: <Heart className="w-3 h-3" />,              color: '#4ade80' },
              { key: 'might',     label: t.archives.statLabels.might.toUpperCase(),   icon: <Zap className="w-3 h-3" />,                color: '#f87171' },
              { key: 'power',     label: t.archives.statLabels.power.toUpperCase(),   icon: <Star className="w-3 h-3" />,               color: '#60a5fa' },
              { key: 'defense',   label: t.archives.statLabels.defense.toUpperCase(), icon: <Shield className="w-3 h-3" />,             color: '#fbbf24' },
              { key: 'moveRange',   label: t.archives.statLabels.move.toUpperCase(),    icon: <span className="text-[10px]">🏃</span>,    color: '#a78bfa' },
              { key: 'attackRange', label: 'RANGE',                                     icon: <span className="text-[10px]">🎯</span>,    color: '#fb923c' },
            ] as const).map(({ key, label, icon, color }) => {
              const val = displayStats[key as keyof typeof displayStats];
              const base = char.stats[key as keyof typeof char.stats];
              const max = STAT_MAX[key as keyof typeof STAT_MAX];
              const changed = hasWaterForm && val !== base;
              const up = changed && val > base;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-orbitron" style={{ color }}>{icon}{label}</div>
                    <span className="text-[11px] font-bold" style={{ color: changed ? (up ? "#4ade80" : "#f87171") : "#94a3b8" }}>
                      {val}{changed && <span className="text-[9px] ml-0.5">{up ? "▲" : "▼"}</span>}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: changed ? (up ? "#4ade80" : "#f87171") : color, boxShadow: `0 0 6px ${color}80` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="flex-1 py-12 px-10 overflow-auto" style={{ background: 'rgba(2,4,14,0.85)' }}>
          <p className="font-orbitron text-[11px] tracking-[0.4em] text-slate-500 mb-1">{t.archives.classifiedDossier}</p>
          <h1 className="font-orbitron font-black text-4xl text-white mb-1">{displayName}</h1>
          <p className="italic text-lg mb-6" style={{ color: `${char.accentColor}cc` }}>"{displayTagline}"</p>
          <div className="h-px mb-6" style={{ background: `linear-gradient(to right, ${char.accentColor}40, transparent)` }} />
          <div className="mb-6">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-3">{t.archives.loreSection}</p>
            <p className="text-slate-300 text-sm leading-relaxed max-w-[560px]">{displayLore}</p>
          </div>

          {/* Land / Water form toggle — Sun-sin only */}
          {hasWaterForm && (
            <div className="mb-6 flex items-center gap-3">
              <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 shrink-0">{t.archives.form}</p>
              <div className="flex gap-0">
                <button onClick={() => setSunsinMode("land")}
                  className="text-[11px] font-orbitron font-bold px-4 py-1.5 rounded-l border transition-all"
                  style={{
                    background: sunsinMode === "land" ? "rgba(134,239,172,0.15)" : "transparent",
                    borderColor: sunsinMode === "land" ? "rgba(134,239,172,0.5)" : "rgba(71,85,105,0.4)",
                    color: sunsinMode === "land" ? "#86efac" : "#475569",
                  }}>{t.archives.landForm}</button>
                <button onClick={() => setSunsinMode("water")}
                  className="text-[11px] font-orbitron font-bold px-4 py-1.5 rounded-r border-y border-r transition-all"
                  style={{
                    background: sunsinMode === "water" ? "rgba(56,189,248,0.15)" : "transparent",
                    borderColor: sunsinMode === "water" ? "rgba(56,189,248,0.5)" : "rgba(71,85,105,0.4)",
                    color: sunsinMode === "water" ? "#38bdf8" : "#475569",
                  }}>{t.archives.waterForm}</button>
              </div>
              <p className="text-[10px] text-slate-600 italic">Stats &amp; abilities change based on terrain</p>
            </div>
          )}

          <div>
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">{t.archives.abilitiesSection}</p>
            <div className="grid grid-cols-1 gap-3 max-w-[620px]">
              {char.abilities.map((ab, idx) => {
                const isWater = hasWaterForm && sunsinMode === "water" && (!!ab.waterDesc || !!ab.waterName);
                const abT = abilityTranslations[idx] as any;
                const abName = isWater && ab.waterName ? (abT?.waterName ?? ab.waterName) : (abT?.name ?? ab.name);
                const displayDesc = isWater && ab.waterDesc ? ab.waterDesc : ab.desc;
                const kindStyle = ab.kind === 'passive'
                  ? { border: 'border-purple-600/50', bg: 'bg-purple-950/40', badge: 'bg-purple-900/70 text-purple-300 border-purple-600/50', badgeLabel: t.archives.abilityKind.passive }
                  : ab.kind === 'ultimate'
                  ? { border: 'border-amber-500/50', bg: 'bg-amber-950/30', badge: 'bg-amber-900/70 text-amber-300 border-amber-500/50', badgeLabel: t.archives.abilityKind.ultimate }
                  : { border: 'border-sky-600/50', bg: 'bg-sky-950/30', badge: 'bg-sky-900/70 text-sky-300 border-sky-600/50', badgeLabel: t.archives.abilityKind.ability };
                const upgrade = ab.kind !== 'passive' ? findUpgrade(char.id, ab.name) : null;
                const upgKey = `${char.id}_${ab.name}`;
                const isShowingUpgrade = !!upgrade && !!showUpgraded[upgKey];
                return (
                  <div key={ab.name} className={`flex gap-4 rounded-xl border p-4 transition-colors ${isShowingUpgrade ? 'border-emerald-500/50 bg-emerald-950/20' : `${kindStyle.border} ${kindStyle.bg}`}`}>
                    <div className="text-3xl shrink-0 w-10 text-center leading-none pt-0.5">{ab.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-orbitron font-bold text-sm" style={{ color: isShowingUpgrade ? '#34d399' : 'white' }}>
                          {isShowingUpgrade ? upgrade!.upgradedName : abName}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${kindStyle.badge}`}>{kindStyle.badgeLabel}</span>
                        {isWater && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-sky-900/70 text-sky-300 border-sky-600/50">{t.archives.waterForm}</span>}
                        {isShowingUpgrade && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-900/70 text-emerald-300 border-emerald-600/50">
                            ✦ {upgrade!.descriptionUpgrade}
                          </span>
                        )}
                        {upgrade && (
                          <button
                            onClick={() => setShowUpgraded(prev => ({ ...prev, [upgKey]: !prev[upgKey] }))}
                            className="ml-auto text-[9px] font-bold font-orbitron px-2 py-0.5 rounded border transition-all shrink-0"
                            style={{
                              color: isShowingUpgrade ? '#34d399' : '#64748b',
                              borderColor: isShowingUpgrade ? 'rgba(52,211,153,0.5)' : 'rgba(71,85,105,0.4)',
                              background: isShowingUpgrade ? 'rgba(52,211,153,0.12)' : 'transparent',
                            }}>
                            {isShowingUpgrade ? '✦ BASE' : '✦ UPGRADE'}
                          </button>
                        )}
                        {!upgrade && <span className="ml-auto text-[11px] text-slate-500 font-orbitron shrink-0">{ab.cost}</span>}
                      </div>
                      {!upgrade && <span className="hidden" />}
                      {upgrade && <p className="text-[10px] text-slate-500 font-orbitron mb-1">{ab.cost}</p>}
                      <p className="text-slate-400 text-[12px] leading-relaxed">
                        {isShowingUpgrade
                          ? (UPGRADE_DESCS[upgKey] ?? colorizeDesc(upgrade!.patch.description ?? (typeof displayDesc === 'string' ? displayDesc : '')))
                          : displayDesc}
                      </p>
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
