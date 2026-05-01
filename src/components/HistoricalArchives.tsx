import React, { useState } from "react";
import { ChevronLeft, Shield, Zap, Heart, Star, BookOpen, Sword, Package, Map, Users, Lock, Trophy, Cpu, TrendingUp } from "lucide-react";
import type { AchievementStats } from "@/hooks/useAchievements";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";
import { getLoreTranslation } from "@/i18n/lore-translations";
import { getAchievementTranslation } from "@/i18n/achievement-translations";
import { CARD_UPGRADES } from "@/data/cards";
import { ACHIEVEMENTS, CATEGORY_LABELS, CATEGORY_ICONS, TOTAL_POINTS, CHARACTER_UNLOCK_THRESHOLDS, CHARACTER_UNLOCK_EVENTS, getAchievementsByCategory, type AchievementCategory } from "@/data/achievements";

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
// Some characters use a shorter prefix in their card definitionIds than their char.id
const CHAR_ID_TO_UPGRADE_PREFIX: Record<string, string> = {
  cleopatra: 'cleo',
};
function findUpgrade(charId: string, abilityName: string) {
  const prefix = CHAR_ID_TO_UPGRADE_PREFIX[charId] ?? charId;
  return Object.entries(CARD_UPGRADES).find(([key, val]) =>
    key.startsWith(prefix + '_') &&
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
  secondaryRole?: "DPS RANGED" | "DPS MELEE" | "SUPPORT" | "TANK" | "HYBRID" | "CONTROLLER";
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
    stats: { hp: 100, might: 60, power: 65, defense: 20, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🔫", name: "Mitraille + Tactical Genius", cost: "Passive", desc: <>At the start of Napoleon's turn, all enemies within range 2 take <span style={{ color: "#f87171", fontWeight: 700 }}>(5 + 2×level) pure damage</span> (ignores Defense). Scales from 7 at lvl 1 to 19 at lvl 8. <span style={{ color: "#34d399", fontWeight: 700 }}>Tactical Genius</span>: also gain <span style={{ color: "#34d399", fontWeight: 700 }}>+1 movement</span> at turn start while standing on a vantage tile (Forest or Ruins).</> },
      { kind: "ability", icon: "💥", name: "Artillery Barrage", cost: "2 Mana", desc: <>Unleash a devastating barrage dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>84</span> damage to a target at range 4.</> },
      { kind: "ability", icon: "⚔️", name: "Grande Armée", cost: "3 Mana", desc: <>Rally the troops! Grant +15% <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> AND <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power</span> to all allies for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo", cost: "3 Mana · Exhaust", desc: <>Fire 3 random artillery shots, each dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>42</span> to random enemies within range 4.</> },
    ],
  },
  {
    id: "genghis", name: "Genghis-chan", title: "The Unstoppable Conqueror",
    tagline: "Khan of the Unbroken Cosmos",
    role: "DPS MELEE", portrait: "/art/genghis_portrait.png",
    accentColor: "#ef4444", ringColor: "rgba(239,68,68,0.55)",
    lore: "The mightiest conqueror ever to ride across the steppes of Earth has been reborn as a ferocious battle-clone. Her bloodlust only grows with each fallen foe — every kill sharpens her blade and restores her focus. In the arena of Znyxorga, she builds a new empire one victory at a time, and no wall of steel or magic has ever stopped her charge.",
    stats: { hp: 120, might: 50, power: 40, defense: 25, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🩸", name: "Bloodlust", cost: "Passive", desc: <>Each kill grants +12 <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> and restores 1 Mana. Stack cap scales with level: cap = 2 + ⌊level/2⌋ (lvl 1 → 2 stacks, lvl 4 → 4, lvl 8 → 6).</> },
      { kind: "ability", icon: "⚡", name: "Mongol Charge", cost: "2 Mana", desc: <>Strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>48 damage</span> at range 3, then apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>.</> },
      { kind: "ability", icon: "🌀", name: "Horde Tactics", cost: "3 Mana", desc: <>Unleash the horde — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~28 per enemy</span> in range 2 to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL</span> enemies in range 2. More enemies = more damage each.</> },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury", cost: "3 Mana · Exhaust", desc: <>Sweep the line for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~75 damage</span> to all enemies on a line, range 5. <span style={{ color: "#f87171", fontWeight: 700 }}>Doubled</span> against targets below 40% HP — finish them off.</> },
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
      { kind: "passive", icon: "🔧", name: "Tinkerer", cost: "Passive", desc: <>Draw <span style={{ color: "#34d399", fontWeight: 700 }}>+1 extra card</span> at the start of every turn. Draws <span style={{ color: "#34d399", fontWeight: 700 }}>+1 additional card</span> while the <span style={{ color: "#fbbf24", fontWeight: 700 }}>Combat Drone</span> is alive.</> },
      { kind: "ability", icon: "✈️", name: "Flying Machine", cost: "2 Mana", desc: <>Teleport to <span style={{ color: "#34d399", fontWeight: 700 }}>any unoccupied hex</span> on the board. No range limit. Bypasses terrain and obstacles.</> },
      { kind: "ability", icon: "💚", name: "Masterpiece", cost: "3 Mana", desc: <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>50 HP</span> to an ally within range 3. Also removes the Poison debuff.</> },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", cost: "3 Mana · Exhaust", desc: <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>HP 90</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might 60</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense 30</span>. Lasts until defeated. (Scales with Power)</> },
    ],
  },
  {
    id: "leonidas", name: "Leonidas-chan", title: "The Unbreakable Wall",
    tagline: "Shield at the Edge of the Stars",
    role: "TANK", portrait: "/art/leonidas_portrait.png",
    accentColor: "#f59e0b", ringColor: "rgba(245,158,11,0.55)",
    lore: "Three hundred Spartans. One narrow pass. An empire brought to its knees. Leonidas I held the Gates of Thermopylae against impossible odds, and her legend echoed across millennia — right into the cloning vats of Znyxorga. Reborn as a battle-clone in burnished bronze and blazing war-paint, Leonidas-chan turns every battlefield into a chokepoint. She does not retreat. She does not yield. She is the shield upon which enemy waves break and scatter.",
    stats: { hp: 130, might: 40, power: 36, defense: 35, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🛡️", name: "Phalanx", cost: "Passive", desc: <>Each turn Leonidas ends adjacent to an ally, she gains <span style={{ color: "#fbbf24", fontWeight: 700 }}>(6 + level) Defense</span> per stack (up to 3 stacks). Scales from +7/stack at lvl 1 to +14/stack at lvl 8. Investing in Leonidas makes her progressively harder to kill.</> },
      { kind: "ability", icon: "⚡", name: "Shield Bash", cost: "2 Mana", desc: <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~77 damage</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 2 turns). Also grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</> },
      { kind: "ability", icon: "🏛️", name: "Spartan Wall", cost: "3 Mana", desc: <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> to Leonidas and all allies within range 2.</> },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", cost: "3 Mana · Exhaust", desc: <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>2.5× Power (~125 dmg)</span>. All enemies adjacent to the impact are <span style={{ color: "#fb923c", fontWeight: 700 }}>Rooted</span> for 2 turns — cannot move but can still attack and use cards.</> },
    ],
  },
  {
    id: "sunsin", name: "Sun-sin-chan", title: "The Iron Admiral",
    tagline: "Admiral of the Iron-Shell Armada",
    role: "HYBRID", portrait: "/art/sunsin_portrait.png",
    accentColor: "#38bdf8", ringColor: "rgba(56,189,248,0.55)",
    lore: "Yi Sun-sin repelled an entire Japanese armada with a handful of ironclad turtle ships and an unshakeable will. The Empire of Znyxorga found her genetic echo preserved in the sea-salt timber of the Joseon docks and grew her in the deep-blue vats of their naval division. On dry land she fights with disciplined efficiency. But put ocean tiles between her and an enemy — and the turtle ship awakens. Cannons fire. Hulls hold. Admirals do not retreat.",
    stats: { hp: 100, might: 58, power: 55, defense: 25, moveRange: 3, attackRange: 1 },
    waterStats: { hp: 100, might: 88, power: 36, defense: 33, moveRange: 1, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "🐢", name: "Turtle Ship", cost: "Passive",
        desc: <>Can move onto lake tiles and ignore extra movement cost on river tiles. On land: balanced stats, Range 1 basic attacks.</>,
        waterDesc: <>ON WATER (lake or river): <span style={{ color: "#f87171", fontWeight: 700 }}>+52% Might</span> (58→88), <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span> (25→33), <span style={{ color: "#60a5fa", fontWeight: 700 }}>−35% Power</span> (55→36). Range 3 basic attacks. <span style={{ color: "#fbbf24", fontWeight: 700 }}>Lake only: Move capped at 1.</span> River tiles keep full movement.</> },
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
    stats: { hp: 90, might: 35, power: 70, defense: 25, moveRange: 2, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🎵", name: "Crescendo", cost: "Passive", desc: <>Each exclusive ability card played grants <span style={{ color: "#22d3ee", fontWeight: 700 }}>+2 Power permanently</span>. Stacks up to <span style={{ color: "#fbbf24", fontWeight: 700 }}>15 times (+30 max)</span>. Her power crescendos with every note.</> },
      { kind: "ability", icon: "🌊", name: "Schallwelle", cost: "2 Mana", desc: <>Fire a directional sonic wave — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>33 damage</span> to all enemies in a line up to range 3 and <span style={{ color: "#22d3ee", fontWeight: 700 }}>push each 2 tiles back</span> along the wave direction.</> },
      { kind: "ability", icon: "🎶", name: "Freudenspur", cost: "3 Mana", desc: <>Target a tile within range 3 — <span style={{ color: "#22d3ee", fontWeight: 700 }}>that tile and all 6 adjacent tiles</span> become a resonance zone. Allies passing through zone tiles gain <span style={{ color: "#34d399", fontWeight: 700 }}>+2 Movement</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ultimate", icon: "⭐", name: "Götterfunken", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~46 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 1 turn</span> — no movement, no cards, no actions.</> },
    ],
  },
  {
    id: "huang", name: "Huang-chan", title: "The First Emperor",
    tagline: "Empress of the Terracotta Legions",
    role: "CONTROLLER", portrait: "/art/huang_portrait.png",
    accentColor: "#b45309", ringColor: "rgba(180,83,9,0.55)",
    lore: "Qin Shi Huang unified China under a single dynasty, built the Great Wall, and commissioned an army of 8,000 terracotta warriors to guard him in death. The Empire of Znyxorga extracted her genetic echo from clay dust sifted out of the mausoleum soil. Reborn as Huang-chan, she commands her terracotta legions once more — archers, footsoldiers, and cavalry that rise from the arena floor at her command. She does not strike enemies herself. She buries them under sheer numbers.",
    stats: { hp: 90, might: 35, power: 55, defense: 25, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🏺", name: "Imperial Command", cost: "Passive", desc: <>Huang-chan <span style={{ color: "#f87171", fontWeight: 700 }}>cannot play Basic Attack cards</span>. At least <span style={{ color: "#fbbf24", fontWeight: 700 }}>1 Basic Attack card</span> is guaranteed in hand each turn — for her Terracotta units to use. Terracotta units may <span style={{ color: "#fbbf24", fontWeight: 700 }}>only</span> use Basic Attack cards.</> },
      { kind: "ability", icon: "⚔️", name: "Terracotta Legion", cost: "2 Mana", desc: <>Select any empty hex within range 3. Summon a random warrior — <span style={{ color: "#fbbf24", fontWeight: 700 }}>50/50</span>: <span style={{ color: "#60a5fa", fontWeight: 700 }}>Archer</span> (HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>40</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>52</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 2, Move 2) or <span style={{ color: "#f87171", fontWeight: 700 }}>Warrior</span> (HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>40</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>35</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 1, Move 2). Both have Power 0 — deal pure Might damage. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ability", icon: "🐴", name: "First Emperor's Command", cost: "3 Mana", desc: <>Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>Terracotta Cavalry</span> on an adjacent hex: HP <span style={{ color: "#60a5fa", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>38</span>, Power <span style={{ color: "#60a5fa", fontWeight: 700 }}>55</span>, Move 3. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. Immediately adds a <span style={{ color: "#f59e0b", fontWeight: 700 }}>FREE Cavalry Charge</span> card to your hand — deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>82 dmg</span> at range 3.</> },
      { kind: "ultimate", icon: "⭐", name: "Eternal Army", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>Take control</span> of a non-boss enemy within range 3 for <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. The unit auto-attacks the nearest enemy — same hit mechanics as when they attacked you. No abilities. You cannot attack the controlled unit. Cannot target bosses or mini-bosses.</> },
    ],
  },
  {
    id: "nelson", name: "Nelson-chan", title: "Lady of Trafalgar",
    tagline: "Slayer of the Star-Sea Armada",
    role: "DPS RANGED", portrait: "/art/nelson_portrait.png",
    accentColor: "#3b82f6", ringColor: "rgba(59,130,246,0.55)",
    lore: "Horatio Nelson lost an arm at Tenerife and an eye at Calvi — and fought better for it. His genetic echo was drawn from the saltwater-stained journals of the Battle of Trafalgar, archived under six inches of Znyxorgan deep-scan glass. Reborn as Nelson-chan, she commands the arena's long range like a quarterdeck: steady, precise, and absolutely merciless. She cannot be silenced — and the first blow aimed at her? She simply doesn't feel it.",
    stats: { hp: 90, might: 40, power: 65, defense: 15, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "⚓", name: "One Eye, One Hand", cost: "Passive", desc: <>Nelson-chan <span style={{ color: "#fbbf24", fontWeight: 700 }}>cannot be Silenced</span>. The <span style={{ color: "#34d399", fontWeight: 700 }}>first hit she takes each fight is negated entirely</span> (no damage).</> },
      { kind: "ability", icon: "🚢", name: "Crossing the T", cost: "2 Mana", desc: <>Fire a broadside line shot up to range 5. The first target takes <span style={{ color: "#f87171", fontWeight: 700 }}>~65 damage</span>, the second takes <span style={{ color: "#f87171", fontWeight: 700 }}>~42 damage</span> (65%), the third and beyond take <span style={{ color: "#f87171", fontWeight: 700 }}>~27 damage</span> (40%). Each successive target takes 65% of the previous hit.</> },
      { kind: "ability", icon: "💨", name: "Kiss Me Hardy", cost: "2 Mana", desc: <>Charge up to 4 hexes in a straight line. Each enemy in the path takes <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span> and is <span style={{ color: "#fbbf24", fontWeight: 700 }}>pushed sideways</span> off the charge line. Nelson-chan ends at the final hex.</> },
      { kind: "ultimate", icon: "⭐", name: "Trafalgar Square", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~130 damage</span> to one target at range 4. If the target <span style={{ color: "#f59e0b", fontWeight: 700 }}>dies</span>, all enemies adjacent to that position take <span style={{ color: "#f87171", fontWeight: 700 }}>~50 splash damage</span>.</> },
    ],
  },
  {
    id: "hannibal", name: "Hannibal-chan", title: "Bane of Rome",
    tagline: "Terror of the Galactic Alps",
    role: "DPS MELEE", secondaryRole: "CONTROLLER", portrait: "/art/hannibal_portrait.png",
    accentColor: "#dc2626", ringColor: "rgba(220,38,38,0.55)",
    lore: "Hannibal Barca crossed the Alps with war elephants and broke three Roman armies in a single season. The Empire of Znyxorga grew her from cartilage preserved in Carthaginian war-drum skins. Reborn as Hannibal-chan, she brings the Battle of Cannae to every engagement: double envelopment, flanking bonus, and the ancient art of surrounding the enemy before they know they're encircled.",
    stats: { hp: 110, might: 55, power: 50, defense: 20, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "⚔️", name: "Cannae", cost: "Passive", desc: <>When Hannibal-chan attacks an enemy that has an <span style={{ color: "#fbbf24", fontWeight: 700 }}>ally adjacent to it</span> (flanked), deal <span style={{ color: "#f87171", fontWeight: 700 }}>bonus damage</span>. Scales with level: 30% + 2% per level (+32% at lvl 1, +46% at lvl 8). Applies to both basic attacks and card attacks.</> },
      { kind: "ability", icon: "🏔️", name: "Alpine March", cost: "1 Mana", desc: <>Use <span style={{ color: "#fbbf24", fontWeight: 700 }}>before moving</span>. Charge up to <span style={{ color: "#34d399", fontWeight: 700 }}>6 hexes</span> in a straight line across any terrain. Enemies in path take <span style={{ color: "#f87171", fontWeight: 700 }}>~28 damage</span> and are pushed sideways. <span style={{ color: "#60a5fa", fontWeight: 700 }}>Consumes all remaining movement.</span></> },
      { kind: "ability", icon: "🌀", name: "Double Envelopment", cost: "2 Mana", desc: <>Strike a target enemy at range 3 for <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span>. Then deal <span style={{ color: "#f87171", fontWeight: 700 }}>~28 damage</span> to all enemies adjacent to the target. Cannae bonus applies to the primary hit.</> },
      { kind: "ultimate", icon: "⭐", name: "War Elephant", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>War Elephant</span> on an adjacent hex: <span style={{ color: "#60a5fa", fontWeight: 700 }}>HP 120</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might 70</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense 20</span>, Move 2. Performs basic attacks only. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
    ],
  },
  {
    id: "picasso", name: "Picasso-chan", title: "The Fractured Eye",
    tagline: "Painter of the Shattered Cosmos",
    role: "SUPPORT", secondaryRole: "CONTROLLER", portrait: "/art/picasso_portrait.png",
    accentColor: "#8b5cf6", ringColor: "rgba(139,92,246,0.55)",
    lore: "Pablo Picasso shattered pictorial reality and rebuilt it from fragments. The Empire of Znyxorga found his clone-template in a shard of blue Málaga glass — and in the echo of his laugh. Reborn as Picasso-chan, she bends the arena like a canvas: pulling enemies out of position, swapping units across the board, and making the third card of every turn cost nothing at all.",
    stats: { hp: 80, might: 30, power: 70, defense: 20, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🎨", name: "Fractured Perspective", cost: "Passive", desc: <>Every <span style={{ color: "#fbbf24", fontWeight: 700 }}>3rd card</span> Picasso-chan plays <span style={{ color: "#fbbf24", fontWeight: 700 }}>this battle</span> costs <span style={{ color: "#34d399", fontWeight: 700 }}>0 Mana</span>. At <span style={{ color: "#fbbf24", fontWeight: 700 }}>level 7+</span>, triggers every <span style={{ color: "#34d399", fontWeight: 700 }}>2nd card</span> instead. Counter persists across turns.</> },
      { kind: "ability", icon: "💥", name: "Guernica", cost: "2 Mana", desc: <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~70 damage</span> to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL enemies</span> within range 2. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense, 2 turns) to all hit enemies.</> },
      { kind: "ability", icon: "🪞", name: "Cubist Mirror", cost: "2 Mana", desc: <>Swap positions with any unit within range 4. If the target is an <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>, deal <span style={{ color: "#f87171", fontWeight: 700 }}>~35 damage</span> on swap.</> },
      { kind: "ultimate", icon: "⭐", name: "Blue Period", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#8b5cf6", fontWeight: 700 }}>Scramble all units</span> to random positions on the board. Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>60 HP</span> and grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> until your next turn.</> },
    ],
  },
  {
    id: "teddy", name: "Teddy-chan", title: "The Bull Moose",
    tagline: "Roughrider of the Outer Worlds",
    role: "TANK", secondaryRole: "DPS MELEE", portrait: "/art/teddy_portrait.png",
    accentColor: "#d97706", ringColor: "rgba(217,119,6,0.55)",
    lore: "Theodore Roosevelt charged San Juan Hill with a broken saber and won. Znyxorga scraped her template from the bark of a Rough Rider sapling preserved in the Smithsonian's vault. Reborn as Teddy-chan, she is the arena's apex predator — every kill makes her stronger, and when she rallies her team, the whole arena shakes.",
    stats: { hp: 140, might: 60, power: 40, defense: 35, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🦁", name: "Bully!", cost: "Passive", desc: <>Each kill grants Teddy-chan <span style={{ color: "#f87171", fontWeight: 700 }}>(8 + level) Might</span> per stack (up to 3 stacks). Scales from +9 at lvl 1 to +16 at lvl 8. Does not trigger from Terracotta or drone kills.</> },
      { kind: "ability", icon: "📣", name: "Speak Softly", cost: "2 Mana", desc: <>All enemies within range 2 are <span style={{ color: "#f87171", fontWeight: 700 }}>Taunted</span> for 1 turn — they must target Teddy-chan. Teddy-chan gains <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30 Defense</span> until her next turn.</> },
      { kind: "ability", icon: "🏏", name: "Big Stick", cost: "2 Mana", desc: <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~87 damage</span> to an enemy at range 1. <span style={{ color: "#f59e0b", fontWeight: 700 }}>+50% bonus (~130)</span> if the target is Stunned or Taunted.</> },
      { kind: "ultimate", icon: "⭐", name: "Rough Riders' Rally", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — All allies gain <span style={{ color: "#f87171", fontWeight: 700 }}>+25 Might</span> and <span style={{ color: "#34d399", fontWeight: 700 }}>+2 Movement</span> until end of turn. Teddy-chan gains <span style={{ color: "#f87171", fontWeight: 700 }}>+45 Might</span> and <span style={{ color: "#8b5cf6", fontWeight: 700 }}>teleports</span> to any hex within range 5.</> },
    ],
  },
  {
    id: "mansa", name: "Mansa-chan", title: "The Golden Empress",
    tagline: "Sovereign of the Infinite Trade Routes",
    role: "SUPPORT", secondaryRole: "CONTROLLER", portrait: "/art/mansa_portrait.png",
    accentColor: "#f59e0b", ringColor: "rgba(245,158,11,0.55)",
    lore: "Mansa Musa of Mali was so wealthy his pilgrimage to Mecca crashed the gold market across three continents for a decade. The Empire of Znyxorga extracted her genetic echo from a nugget of Malian gold dust lodged in the foundations of a mosque he built in 1324. Reborn as Mansa-chan, she turns every battle into a profit margin — and makes sure her allies have the mana to spend.",
    stats: { hp: 85, might: 30, power: 70, defense: 15, moveRange: 3, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "💰", name: "Treasury", cost: "Passive", desc: <>After each battle, earn <span style={{ color: "#fbbf24", fontWeight: 700 }}>bonus gold</span> equal to Mansa-chan's Power% (70 Power = +70% more gold). Ability cards cost <span style={{ color: "#34d399", fontWeight: 700 }}>1 less Mana</span> (min 1); at <span style={{ color: "#fbbf24", fontWeight: 700 }}>level 6+</span> they cost <span style={{ color: "#34d399", fontWeight: 700 }}>2 less Mana</span> (min 1).</> },
      { kind: "ability", icon: "⚗️", name: "Salt Road", cost: "1 Mana", desc: <>Place a <span style={{ color: "#fbbf24", fontWeight: 700 }}>7-hex mana zone</span> centered on a tile within range 3. Allies starting their turn on any zone tile restore <span style={{ color: "#34d399", fontWeight: 700 }}>+1 Mana</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ability", icon: "✨", name: "Hajj of Gold", cost: "2 Mana", desc: <>Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>20% of their max HP</span>. All allies gain <span style={{ color: "#60a5fa", fontWeight: 700 }}>+10 Power</span> until end of turn.</> },
      { kind: "ultimate", icon: "⭐", name: "Mansa's Bounty", cost: "2 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#fbbf24", fontWeight: 700 }}>Golden Stasis</span>: freeze every unit on the board (allies and enemies) for <span style={{ color: "#fbbf24", fontWeight: 700 }}>1 turn</span> — no movement, no actions.</> },
    ],
  },
  {
    id: "velthar", name: "Vel'thar-chan", title: "The Fire That Refused to Die",
    tagline: "Clone Zero",
    role: "HYBRID", portrait: "/art/velthar_portrait.png",
    accentColor: "#7c3aed", ringColor: "rgba(124,58,237,0.55)",
    lore: "Seventy-four thousand years ago, a supervolcanic eruption at Toba drove the human species to the brink of extinction. Ash clouds blocked the sun for years. Populations collapsed across continents. One person led the last surviving group through the cold and the dark — and they made it. Znyxorga's observers watched this from orbit and recognised something they had not found elsewhere: a will to survive that transcended circumstance. Named \"Vel'thar\" — Survivor — she was the first clone the Empire ever grew. Not a conqueror. Not a genius. The one human who refused to let the fire go out. She woke into the keepers' care, with no human anywhere to teach her otherwise. The only tongue she has ever known is theirs. When she sings, she sings in Znyxorgan — not because she chose to, but because it is the only language she has ever had.",
    stats: { hp: 90, might: 58, power: 50, defense: 20, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🌀", name: "Bottleneck", cost: "Passive", desc: <>When a player character ally dies in battle, Vel'thar gains <span style={{ color: "#a78bfa", fontWeight: 700 }}>+5 Might and +5 Power</span> (scales with level, stacks, battle scope only). Every extinction makes the survivors stronger.</> },
      { kind: "ability", icon: "🔥", name: "Toba's Fury", cost: "2 Mana", desc: <>Melee strike at range 1 — deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~64 damage</span>. At <span style={{ color: "#fb923c", fontWeight: 700 }}>2+ Bottleneck stacks</span>: also applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span>.</> },
      { kind: "ability", icon: "🕯️", name: "Last Ember", cost: "2 Mana", desc: <>If Vel'thar has <span style={{ color: "#a78bfa", fontWeight: 700 }}>1+ Bottleneck stack</span>: <span style={{ color: "#4ade80", fontWeight: 700 }}>heal 25 HP</span> and gain <span style={{ color: "#fbbf24", fontWeight: 700 }}>+15 Defense</span>. Otherwise: deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~50 damage</span> to all enemies within range 2.</> },
      { kind: "ultimate", icon: "⭐", name: "Humanity's Last Light", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~87 damage</span> to ALL enemies within range 2. Vel'thar then <span style={{ color: "#4ade80", fontWeight: 700 }}>heals 30 HP</span>.</> },
    ],
  },
  {
    id: "musashi", name: "Musashi-chan", title: "The Unbroken Sword Saint",
    tagline: "The Blade of the Eternal Cosmos",
    role: "DPS MELEE", portrait: "/art/musashi_portrait.png",
    accentColor: "#dc2626", ringColor: "rgba(220,38,38,0.55)",
    lore: "Miyamoto Musashi fought sixty-one duels and lost none. He lived by the sword, philosophized with it, and died peacefully at sixty in a cave. Znyxorga found his clone-template in the grain of a worn wooden practice sword preserved in Kyoto. Reborn as Musashi-chan, she brings the Book of Five Rings to the colosseum — two blades, two-strike form, and a calm certainty that there is always one more lesson to teach.",
    stats: { hp: 90, might: 72, power: 45, defense: 25, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "⚔️", name: "Battle Scar", cost: "Passive", desc: <>Each time Musashi takes damage in combat, permanently gain <span style={{ color: "#f87171", fontWeight: 700 }}>+1 Might</span> for this battle (scales +1 per 2 levels — +1 at L1, +4 at L8). Caps at <span style={{ color: "#f87171", fontWeight: 700 }}>3 stacks</span>.</> },
      { kind: "ability", icon: "🗡️", name: "Ichi no Tachi", cost: "2 Mana", desc: <>A single decisive strike at range 1 — deal <span style={{ color: "#f87171", fontWeight: 700 }}>~36 damage</span> and place a <span style={{ color: "#fbbf24", fontWeight: 700 }}>Duel</span> on target (2 turns). If target is already <span style={{ color: "#fbbf24", fontWeight: 700 }}>Dueled</span>: deal <span style={{ color: "#f87171", fontWeight: 700 }}>~63 damage</span> instead and apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>.</> },
      { kind: "ability", icon: "⚔️", name: "Niten Ichi-ryu", cost: "2 Mana", desc: <>Two-sword style — strike twice at range 1 for <span style={{ color: "#f87171", fontWeight: 700 }}>~32 damage</span> each. Both hits apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>. If target is <span style={{ color: "#fbbf24", fontWeight: 700 }}>Dueled</span>: refresh Duel and hit adjacent enemies for <span style={{ color: "#f87171", fontWeight: 700 }}>~22 damage</span>.</> },
      { kind: "ultimate", icon: "⭐", name: "Book of Five Rings", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Duel</span> to ALL enemies within range 2 and deal <span style={{ color: "#f87171", fontWeight: 700 }}>~38 damage</span> to each. Duel bonus damage increases from +35% to <span style={{ color: "#fbbf24", fontWeight: 700 }}>+65% this round</span>.</> },
    ],
  },
  {
    id: "cleopatra", name: "Cleopatra-chan", title: "The Asp-Tongued Empress",
    tagline: "Serpent Queen of the Outer Stars",
    role: "CONTROLLER", secondaryRole: "SUPPORT", portrait: "/art/cleopatra_portrait.png",
    accentColor: "#d97706", ringColor: "rgba(217,119,6,0.55)",
    lore: "Cleopatra VII ruled Egypt not through inheritance alone, but through sheer political genius — she spoke nine languages, commanded Rome's most powerful generals, and bent an empire to her will. Znyxorga found her clone-template in papyrus ash sifted from the ruins of the Library of Alexandria. Reborn as Cleopatra-chan, she brings diplomacy, poison, and royal decree to the arena.",
    stats: { hp: 100, might: 35, power: 65, defense: 25, moveRange: 3, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "🐍", name: "Asp's Venom", cost: "Passive", desc: <>Cleopatra's basic attacks apply <span style={{ color: "#4ade80", fontWeight: 700 }}>Poison</span> <span style={{ color: "#4ade80", fontWeight: 700 }}>(3 turns)</span>.</> },
      { kind: "ability", icon: "🐍", name: "Asp's Kiss", cost: "2 Mana", desc: <>Ranged strike at range 3 — deal <span style={{ color: "#d97706", fontWeight: 700 }}>~46 damage</span>. Reduce target's <span style={{ color: "#fb923c", fontWeight: 700 }}>Power by −15</span> for 3 turns.</> },
      { kind: "ability", icon: "📜", name: "Royal Decree", cost: "2 Mana", desc: <>Dual-use at range 3. If <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>: apply <span style={{ color: "#fb923c", fontWeight: 700 }}>Charm</span> (1 turn) and <span style={{ color: "#4ade80", fontWeight: 700 }}>Poison</span> (3 turns). If <span style={{ color: "#4ade80", fontWeight: 700 }}>ally</span>: grant <span style={{ color: "#f87171", fontWeight: 700 }}>+20 Might</span> and <span style={{ color: "#fbbf24", fontWeight: 700 }}>+10 Defense</span> for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "Eternal Kingdom", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Apply <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun</span> (1 turn) and <span style={{ color: "#4ade80", fontWeight: 700 }}>Poison</span> (3 turns) to ALL enemies within range 2. Cleopatra becomes <span style={{ color: "#fbbf24", fontWeight: 700 }}>Untouchable</span> for 1 turn.</> },
    ],
  },
  {
    id: "tesla", name: "Tesla-chan", title: "The Forgotten Frequency",
    tagline: "Master of the Cosmic Grid",
    role: "DPS RANGED", portrait: "/art/tesla_portrait.png",
    accentColor: "#facc15", ringColor: "rgba(250,204,21,0.55)",
    lore: "Nikola Tesla envisioned a world powered by free, wireless electricity. He got there a century early and nobody listened. Znyxorga extracted his clone-template from a resonant coil preserved in a Colorado Springs laboratory wall. Reborn as Tesla-chan, she channels high-voltage brilliance into the colosseum — chaining arc bolts, surging coils, and a death ray that scales with every stack of Voltage she builds.",
    stats: { hp: 85, might: 25, power: 80, defense: 15, moveRange: 3, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "⚡", name: "Voltage", cost: "Passive", desc: <>Gain <span style={{ color: "#facc15", fontWeight: 700 }}>+1 Voltage</span> when NOT moving on your turn. Lose <span style={{ color: "#facc15", fontWeight: 700 }}>−1 Voltage</span> when you move (max 5). At <span style={{ color: "#facc15", fontWeight: 700 }}>5 stacks (Overloaded)</span>: next basic attack or ability costs 0 Mana, deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>+50% damage</span>, and Stuns the target 1 turn.</> },
      { kind: "ability", icon: "🌩️", name: "Arc Bolt", cost: "2 Mana", desc: <>Fire at range 3 — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~72 damage</span>. At <span style={{ color: "#facc15", fontWeight: 700 }}>Voltage ≥3</span>: chains to <span style={{ color: "#facc15", fontWeight: 700 }}>ALL adjacent enemies</span> for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~40 each</span>.</> },
      { kind: "ability", icon: "💡", name: "Coil Surge", cost: "2 Mana", desc: <>Place a <span style={{ color: "#facc15", fontWeight: 700 }}>Tesla Coil zone</span> at range 3. Enemies starting their turn on it: <span style={{ color: "#fbbf24", fontWeight: 700 }}>−20 Defense</span> and <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun 1 turn</span>. Lasts 3 turns. Costs 1 Voltage.</> },
      { kind: "ultimate", icon: "⭐", name: "Death Ray", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Requires <span style={{ color: "#facc15", fontWeight: 700 }}>≥3 Voltage</span>. Line beam (range 6): first target takes <span style={{ color: "#60a5fa", fontWeight: 700 }}>~40 per Voltage stack</span>, each further target takes <span style={{ color: "#60a5fa", fontWeight: 700 }}>50% of the previous</span>. Consumes all Voltage.</> },
    ],
  },
  {
    id: "shaka", name: "Shaka-chan", title: "The Horns of the Zulu",
    tagline: "The Warcry of the Stars",
    role: "TANK", secondaryRole: "CONTROLLER", portrait: "/art/shaka_portrait.png",
    accentColor: "#16a34a", ringColor: "rgba(22,163,74,0.55)",
    lore: "Shaka kaSenzangakhona forged the Zulu nation from fractured clans into an unstoppable military force. He invented new battle formations — the Bull Horn — and built an empire that defied everything around it. Znyxorga found his genetic echo in the wood of a Zulu assegai lodged in a Cape Town museum wall. Reborn as Shaka-chan, she brings the horns to the colosseum.",
    stats: { hp: 120, might: 58, power: 38, defense: 35, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🛡️", name: "Isigodlo (Formation)", cost: "Passive", desc: <>Adjacent allies gain <span style={{ color: "#34d399", fontWeight: 700 }}>+10 Defense</span> (scales with level) while Shaka is alive. Range extends to 2 with Signature item.</> },
      { kind: "ability", icon: "🪃", name: "The Horns", cost: "2 Mana", desc: <>Charge at target (up to 2 tiles) — deal <span style={{ color: "#34d399", fontWeight: 700 }}>~24 damage</span>. Enemy is <span style={{ color: "#fbbf24", fontWeight: 700 }}>knocked sideways</span> (left or right of charge direction). Water: <span style={{ color: "#f87171", fontWeight: 700 }}>instant kill</span>. Mountain: <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun 1 turn</span> instead.</> },
      { kind: "ability", icon: "🏹", name: "Chest Strike", cost: "2 Mana", desc: <>Power-scaling strike at range 1 — deal <span style={{ color: "#34d399", fontWeight: 700 }}>~28 damage</span>. Pushes target back 1 hex. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span>.</> },
      { kind: "ultimate", icon: "⭐", name: "Impondo Zankomo", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — War cry: deal <span style={{ color: "#34d399", fontWeight: 700 }}>~62 damage</span> to ALL adjacent enemies. All adjacent allies gain <span style={{ color: "#34d399", fontWeight: 700 }}>+35 Defense</span> for 2 turns. Shaka gains <span style={{ color: "#34d399", fontWeight: 700 }}>+50 Defense</span> for 2 turns.</> },
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
  'genghis_Mongol Charge': <>Strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~48 damage</span> at range 3, then apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>.</>,
  'genghis_Horde Tactics': <>Unleash the horde — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~20 damage per enemy</span> in range 3 to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL</span> enemies in range 3. (1 enemy = 20 dmg, 2 = 40, 3 = 60 each)</>,
  "genghis_Rider's Fury": <>Sweep the line for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~60 damage</span> to all enemies. <span style={{ color: "#f87171", fontWeight: 700 }}>Doubled to ~120</span> against targets below 40% HP — finish them off.</>,
  // Da Vinci
  'davinci_Flying Machine': <>Teleport to <span style={{ color: "#34d399", fontWeight: 700 }}>any unoccupied hex</span> on the board. On arrival: draw 1 card and gain <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> until your next turn. Costs 1 mana.</>,
  'davinci_Masterpiece': <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>~75 HP</span> to an ally within range 3. Also removes the Poison debuff.</>,
  'davinci_Vitruvian Guardian': <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>HP 90</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>Might 55</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense 40</span>. Lasts until defeated. (Scales with Power)</>,
  // Leonidas
  'leonidas_Shield Bash': <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~91 damage</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 3 turns). Grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</>,
  'leonidas_Spartan Wall': <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20–30 Defense</span> to Leonidas and all allies within range 2.</>,
  'leonidas_THIS IS SPARTA!': <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~144 damage</span>. All enemies adjacent to the impact are <span style={{ color: "#fb923c", fontWeight: 700 }}>Rooted</span> for 2 turns — cannot move but can still attack and use cards.</>,
  // Beethoven
  'beethoven_Schallwelle': <>Fire a directional sonic wave — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~46 damage</span> to all enemies in a line up to range 3 and <span style={{ color: "#22d3ee", fontWeight: 700 }}>push each 3 tiles back</span> along the wave direction.</>,
  'beethoven_Freudenspur': <>Target a tile within range 3 — <span style={{ color: "#22d3ee", fontWeight: 700 }}>that tile and all 6 adjacent tiles</span> become a resonance zone. Allies passing through zone tiles gain <span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>.</>,
  'beethoven_Götterfunken': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~46 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 2 turns</span> — no movement, no cards, no actions.</>,
  // Yi Sun-sin — Land
  'sunsin_Hwajeon': <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~90 damage</span> at range 3. Pushes target back 2 hexes.</>,
  'sunsin_Naval Repairs': <>Select a target area. All allies within range 2 heal <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP now</span> and <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP next turn</span>.</>,
  'sunsin_Chongtong Barrage': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Charge 3 hexes, deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~143 damage</span> to enemies in path. Each hit enemy is <span style={{ color: "#38bdf8", fontWeight: 700 }}>pushed sideways</span>. Sun-sin ends at the last hex.</>,
  // Yi Sun-sin — Water
  'sunsin_Ramming Speed': <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~90 damage</span> at range 1 (water form — reduced Power). Pushes target back <span style={{ color: "#38bdf8", fontWeight: 700 }}>2 hexes</span>.</>,
  'sunsin_Broadside': <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~35 damage</span> to all enemies in range 3.</>,
  'sunsin_Chongtong Barrage_water': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Main target: <span style={{ color: "#a78bfa", fontWeight: 700 }}>~121 damage</span>. Adjacent enemies: <span style={{ color: "#a78bfa", fontWeight: 700 }}>~58 damage</span>. Range 5.</>,
  // Huang-chan
  'huang_Terracotta Legion': <>Select any empty hex within range 3. Summon a random warrior — <span style={{ color: "#fbbf24", fontWeight: 700 }}>50/50</span>: <span style={{ color: "#60a5fa", fontWeight: 700 }}>Archer</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 2, Move 2) or <span style={{ color: "#f87171", fontWeight: 700 }}>Warrior</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>30</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 1, Move 2). Both have Power 0 — deal pure Might damage. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</>,
  "huang_First Emperor's Command": <>Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>Terracotta Cavalry</span> on an adjacent hex: HP <span style={{ color: "#4ade80", fontWeight: 700 }}>80</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>38</span>, Power <span style={{ color: "#60a5fa", fontWeight: 700 }}>55</span>, Move 3. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. Immediately adds a <span style={{ color: "#f59e0b", fontWeight: 700 }}>FREE Cavalry Charge</span> card to your hand — deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>82 dmg</span> at range 3.</>,
  'huang_Eternal Army': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>Take control</span> of a non-boss enemy within range 3 for <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>. The unit auto-attacks the nearest enemy — same hit mechanics as when they attacked you. No abilities. You cannot attack the controlled unit. Cannot target bosses or mini-bosses.</>,
  // Nelson
  "nelson_Crossing the T": <>Fire a broadside line shot up to range 5. First target takes <span style={{ color: "#f87171", fontWeight: 700 }}>~85 damage</span>, second takes <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span>, third+ take <span style={{ color: "#f87171", fontWeight: 700 }}>~36 damage</span>.</>,
  "nelson_Kiss Me Hardy": <>Charge up to 5 hexes. Each enemy in path takes <span style={{ color: "#f87171", fontWeight: 700 }}>~72 damage</span> and is pushed sideways. Nelson-chan ends at the last hex.</>,
  "nelson_Trafalgar Square": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~170 damage</span> to one target at range 4. On-kill splash deals <span style={{ color: "#f87171", fontWeight: 700 }}>~65 damage</span> to all adjacent enemies.</>,
  // Hannibal
  "hannibal_Alpine March": <>Use <span style={{ color: "#fbbf24", fontWeight: 700 }}>before moving</span>. Charge up to <span style={{ color: "#34d399", fontWeight: 700 }}>8 hexes</span> — enemies in path take <span style={{ color: "#f87171", fontWeight: 700 }}>~39 damage</span> and are pushed sideways. Consumes all movement.</>,
  "hannibal_Double Envelopment": <>Strike the primary target for <span style={{ color: "#f87171", fontWeight: 700 }}>~70 damage</span>. All adjacent enemies take <span style={{ color: "#f87171", fontWeight: 700 }}>~36 damage</span>. Cannae bonus still applies to the primary hit.</>,
  "hannibal_War Elephant": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>War Elephant</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>150</span>, Might <span style={{ color: "#f87171", fontWeight: 700 }}>90</span>, Def 20, Move 2). Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>.</>,
  // Picasso
  "picasso_Guernica": <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~90 damage</span> to ALL enemies within range 2. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−30% Defense, 3 turns) to all hit enemies.</>,
  "picasso_Cubist Mirror": <>Swap positions with any unit within range 5. If the target is an <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>, deal <span style={{ color: "#f87171", fontWeight: 700 }}>~50 damage</span> on swap.</>,
  "picasso_Blue Period": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Scramble all units to random positions. Heal allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>80 HP</span> and grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30 Defense</span> until your next turn.</>,
  // Teddy
  "teddy_Speak Softly": <>All enemies within range 3 are <span style={{ color: "#f87171", fontWeight: 700 }}>Taunted</span> for 2 turns. Teddy-chan gains <span style={{ color: "#fbbf24", fontWeight: 700 }}>+40 Defense</span> until her next turn.</>,
  "teddy_Big Stick": <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~99 damage</span> at range 1. <span style={{ color: "#f59e0b", fontWeight: 700 }}>+50% bonus (~149)</span> if target is Stunned or Taunted.</>,
  "teddy_Rough Riders' Rally": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Allies gain <span style={{ color: "#f87171", fontWeight: 700 }}>+35 Might</span> and <span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span>. Teddy-chan gains <span style={{ color: "#f87171", fontWeight: 700 }}>+60 Might</span> and teleports range 7.</>,
  // Mansa
  "mansa_Salt Road": <>Place a <span style={{ color: "#fbbf24", fontWeight: 700 }}>7-hex mana zone</span> within range 4. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>. Costs 0 Mana (Treasury discount).</>,
  "mansa_Hajj of Gold": <>Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>30% of their max HP</span>. All allies gain <span style={{ color: "#60a5fa", fontWeight: 700 }}>+15 Power</span> until end of turn.</>,
  "mansa_Mansa's Bounty": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#fbbf24", fontWeight: 700 }}>Golden Stasis+</span>: allies are frozen for 1 turn, enemies are frozen for <span style={{ color: "#f87171", fontWeight: 700 }}>2 turns</span>. Costs 1 Mana (Treasury discount).</>,
  // Vel'thar
  "velthar_Toba's Fury": <>Melee strike at range 1 — deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~81 damage</span>. At <span style={{ color: "#fb923c", fontWeight: 700 }}>1+ Bottleneck stack</span>: applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span>.</>,
  "velthar_Last Ember": <>If Vel'thar has <span style={{ color: "#a78bfa", fontWeight: 700 }}>1+ Bottleneck stack</span>: <span style={{ color: "#4ade80", fontWeight: 700 }}>heal 40 HP</span> and gain <span style={{ color: "#fbbf24", fontWeight: 700 }}>+25 Defense</span> until next turn. Otherwise: deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~65 damage</span> to all enemies within range 2.</>,
  "velthar_Humanity's Last Light": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~116 damage</span> to ALL enemies in range 2. Vel'thar then <span style={{ color: "#4ade80", fontWeight: 700 }}>heals 50 HP</span>.</>,
  // Musashi
  "musashi_Ichi no Tachi": <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~45 damage</span> at range 1. Places <span style={{ color: "#fbbf24", fontWeight: 700 }}>Duel</span> on target (2 turns). If target is already <span style={{ color: "#fbbf24", fontWeight: 700 }}>Dueled</span>: deal <span style={{ color: "#f87171", fontWeight: 700 }}>~79 damage</span> instead and apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>.</>,
  "musashi_Niten Ichi-ryu": <>Two-sword style — strike twice at range 1 for <span style={{ color: "#f87171", fontWeight: 700 }}>~40 damage</span> each. Both hits apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>. If target is <span style={{ color: "#fbbf24", fontWeight: 700 }}>Dueled</span>: refresh Duel and hit adjacent enemies for <span style={{ color: "#f87171", fontWeight: 700 }}>~29 damage</span>.</>,
  "musashi_Book of Five Rings": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Duel</span> to ALL enemies within range 2 and deal <span style={{ color: "#f87171", fontWeight: 700 }}>~49 damage</span> to each. Duel bonus damage increases to <span style={{ color: "#fbbf24", fontWeight: 700 }}>+80% this round</span>.</>,
  // Cleopatra
  "cleopatra_Asp's Kiss": <>Ranged strike at range 3 — deal <span style={{ color: "#d97706", fontWeight: 700 }}>~59 damage</span>. Reduce target's <span style={{ color: "#fb923c", fontWeight: 700 }}>Power by −20</span> for 3 turns.</>,
  "cleopatra_Royal Decree": <>Dual-use at range 3. If <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>: apply <span style={{ color: "#fb923c", fontWeight: 700 }}>Charm</span> (1 turn) and <span style={{ color: "#4ade80", fontWeight: 700 }}>Poison</span> (3 turns). If <span style={{ color: "#4ade80", fontWeight: 700 }}>ally</span>: grant <span style={{ color: "#f87171", fontWeight: 700 }}>+30 Might</span> and <span style={{ color: "#fbbf24", fontWeight: 700 }}>+15 Defense</span> for 2 turns.</>,
  "cleopatra_Eternal Kingdom": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Apply <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun</span> (2 turns) and <span style={{ color: "#4ade80", fontWeight: 700 }}>Poison</span> (3 turns) to ALL enemies in range 2. Cleopatra becomes <span style={{ color: "#fbbf24", fontWeight: 700 }}>Untouchable</span> for 2 turns.</>,
  // Tesla
  "tesla_Arc Bolt": <>Fire at range 3 — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~96 damage</span>. At <span style={{ color: "#facc15", fontWeight: 700 }}>Voltage ≥3</span>: chains to <span style={{ color: "#facc15", fontWeight: 700 }}>ALL adjacent enemies</span> for <span style={{ color: "#60a5fa", fontWeight: 700 }}>~56 each</span>.</>,
  "tesla_Coil Surge": <>Place a <span style={{ color: "#facc15", fontWeight: 700 }}>Tesla Coil zone</span> at range 3. Enemies starting their turn on it: <span style={{ color: "#fbbf24", fontWeight: 700 }}>−25 Defense</span> and <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun 1 turn</span>. Lasts <span style={{ color: "#facc15", fontWeight: 700 }}>4 turns</span>. No Voltage cost.</>,
  "tesla_Death Ray": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Requires <span style={{ color: "#facc15", fontWeight: 700 }}>≥3 Voltage</span>. Line beam (range 6): first target takes <span style={{ color: "#60a5fa", fontWeight: 700 }}>~48 per Voltage stack</span>, each further target takes <span style={{ color: "#60a5fa", fontWeight: 700 }}>50% of the previous</span>. Consumes all Voltage.</>,
  // Shaka
  "shaka_The Horns": <>Charge at target (up to <span style={{ color: "#34d399", fontWeight: 700 }}>3 tiles</span>) — deal <span style={{ color: "#34d399", fontWeight: 700 }}>~30 damage</span>. Enemy <span style={{ color: "#fbbf24", fontWeight: 700 }}>knocked sideways</span>. Water: <span style={{ color: "#f87171", fontWeight: 700 }}>instant kill</span>. Mountain: <span style={{ color: "#fb923c", fontWeight: 700 }}>Stun 1 turn</span>.</>,
  "shaka_Chest Strike": <>Power-scaling strike at range 1 — deal <span style={{ color: "#34d399", fontWeight: 700 }}>~34 damage</span>. Pushes target back 1 hex. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span>.</>,
  "shaka_Impondo Zankomo": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — War cry: deal <span style={{ color: "#34d399", fontWeight: 700 }}>~75 damage</span> to ALL adjacent enemies. Adjacent allies gain <span style={{ color: "#34d399", fontWeight: 700 }}>+45 Defense</span> for 2 turns. Shaka gains <span style={{ color: "#34d399", fontWeight: 700 }}>+65 Defense</span> for 2 turns.</>,
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
      { label: '+20% Defense', detail: 'Units on a forest tile gain +20% Defense against all incoming attacks. Normal movement cost.' },
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
      { label: 'Yi Sun-sin Bonus', detail: 'Sun-sin counts as "on water" while on a river — gains her Turtle Ship stat bonuses and full movement (no cap). Move cap only applies on lake tiles.' },
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
      { label: 'Scorching Heat', detail: 'Units on desert tiles take 10 pure damage at turn end from the heat.' },
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
      { label: '+1 Mana', detail: 'If 1 or 2 of your characters stand adjacent to the Mana Crystal at the start of your turn, you gain +1 global Mana that turn.' },
      { label: '+2 Mana', detail: 'If 3 of your characters stand adjacent to the Mana Crystal at the start of your turn, you gain +2 global Mana that turn instead.' },
    ],
    tip: 'Contest the crystal early — bunching all 3 clones adjacent is worth the extra Mana, but leaves you vulnerable to AoE.',
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
  { id: 'iron_gauntlets',   name: 'Iron Gauntlets',   icon: '🥊', tier: 'common',   description: '+5 Might for this run.',                                    statBonus: { might: 5 } },
  { id: 'bone_plate',       name: 'Bone Plate',        icon: '🦴', tier: 'common',   description: '+5 Defense for this run.',                                  statBonus: { defense: 5 } },
  { id: 'vitality_shard',   name: 'Vitality Shard',    icon: '💠', tier: 'common',   description: '+12 max HP for this run.',                                  statBonus: { hp: 12 } },
  { id: 'mana_conduit',     name: 'Mana Conduit',      icon: '🔋', tier: 'common',   description: '+5 Power for this run.',                                    statBonus: { power: 5 } },
  { id: 'swift_wraps',     name: 'Swift Wraps',       icon: '🩹', tier: 'common',   description: '+1 permanent movement range + +2 extra movement on the first turn of each battle.' },
  { id: 'targeting_visor', name: 'Targeting Visor',   icon: '🎯', tier: 'common',   description: '+1 Attack Range.',                                          statBonus: { attackRange: 1 } },
  { id: 'adrenaline_injector', name: 'Adrenaline Injector', icon: '💉', tier: 'common', description: '+3 Might, +3 Power.',                                  statBonus: { might: 3, power: 3 } },
  { id: 'plated_boots',   name: 'Plated Boots',       icon: '🥾', tier: 'common',   description: '+8 HP, +2 Defense.',                                        statBonus: { hp: 8, defense: 2 } },
  // Uncommon
  { id: 'battle_drum',      name: 'Battle Drum',       icon: '🥁', tier: 'uncommon', description: 'After killing an enemy, draw 1 card.' },
  { id: 'arena_medkit',     name: 'Arena Medkit',      icon: '💊', tier: 'uncommon', description: 'Heal 25 HP at the start of your turn if below 40% HP.' },
  { id: 'neural_link',     name: 'Neural Link',        icon: '🧬', tier: 'rare',     description: 'This character can play 1 extra card per turn (4 max instead of 3).' },
  { id: 'battle_drill',    name: 'Battle Drill',       icon: '⚔️', tier: 'uncommon', description: 'At the start of each turn, add a free Basic Attack card to your hand.' },
  { id: 'void_shard',       name: 'Void Shard',        icon: '🔥', tier: 'uncommon', description: '+10 Might for this run.',                                   statBonus: { might: 10 } },
  { id: 'card_satchel',     name: 'Card Satchel',      icon: '🎒', tier: 'uncommon', description: '+1 starting hand size for this run.' },
  { id: 'quick_boots',      name: 'Quick Boots',       icon: '👟', tier: 'uncommon', description: '+1 movement range permanently.' },
  { id: 'soul_ember',       name: 'Soul Ember',        icon: '🕯️', tier: 'uncommon', description: 'On kill, restore 20 HP to this character.' },
  { id: 'war_trophy',       name: 'War Trophy',        icon: '💀', tier: 'uncommon', description: 'On kill, permanently gain +2 Might and +2 Power for the rest of the run (caps at 5 stacks — +10 / +10 max).' },
  // Rare — General
  { id: 'strategists_case', name: "Strategist's Case", icon: '💼', tier: 'rare',     description: '+2 starting hand size for this run.' },
  { id: 'alien_core',       name: 'Alien Core',        icon: '🧬', tier: 'rare',     description: 'All ability damage dealt by this character is increased by 25%.' },
  { id: 'mana_crystal',    name: 'Mana Crystal',       icon: '🔷', tier: 'rare',     description: 'Gain +1 Mana at the start of each turn.' },
  { id: 'gladiator_brand',  name: "Gladiator's Brand", icon: '⚡', tier: 'rare',     description: 'First ability each fight costs 0 Mana.' },
  { id: 'diamond_shell',    name: 'Diamond Shell',     icon: '💎', tier: 'rare',     description: 'The first attack that deals damage to this character each fight is negated (deals 0 damage).' },
  { id: 'chrono_shard',    name: 'Chrono Shard',      icon: '⏳', tier: 'rare',     description: '+2 Mana on the first turn of each combat.' },
  { id: 'berserkers_mark', name: "Berserker's Mark",  icon: '🔥', tier: 'rare',     description: '+15% damage dealt when below 50% HP.' },
  { id: 'echo_stone',      name: 'Echo Stone',        icon: '🪨', tier: 'rare',     description: 'Draw 1 extra card at the start of each turn.' },
  // Rare — Napoleon
  { id: 'grand_strategy',   name: 'Grand Strategy',    icon: '🗺️', tier: 'rare',     description: 'Artillery Barrage hits an additional adjacent target.',      targetCharacter: 'napoleon' },
  { id: 'emperors_coat',    name: "Emperor's Coat",    icon: '🪖', tier: 'rare',     description: 'Grande Armée also grants +30% Might & Power to all allies.', targetCharacter: 'napoleon' },
  // Rare — Genghis
  { id: 'eternal_hunger',   name: 'Eternal Hunger',    icon: '🩸', tier: 'rare',     description: "Genghis keeps 100% of her Bloodlust kill stacks between fights (normally stacks reset).",               targetCharacter: 'genghis' },
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
  { id: 'resonant_crystal', name: 'Resonant Crystal',  icon: '🔮', tier: 'rare',     description: 'After any Beethoven ability card, deal ~12 damage to all adjacent enemies.',           targetCharacter: 'beethoven' },
  { id: 'composers_baton',  name: "Composer's Baton",  icon: '🎼', tier: 'rare',     description: 'Allies standing on a Freudenspur zone also gain +5 Defense at turn start.',              targetCharacter: 'beethoven' },
  // Rare — Huang-chan
  { id: 'dragon_kiln',      name: 'Dragon Kiln',       icon: '🏺', tier: 'rare',     description: 'Terracotta units are summoned with +20 HP and +10 Might.',                               targetCharacter: 'huang' },
  { id: 'iron_edict',       name: 'Iron Edict',        icon: '📜', tier: 'rare',     description: 'Eternal Army lasts 3 turns instead of 2.',                                               targetCharacter: 'huang' },
  // Rare — Nelson-chan
  { id: 'nelsons_spyglass', name: "Nelson's Spyglass", icon: '🔭', tier: 'rare',     description: 'Crossing the T range extended by 1 (range 6 total).',                                   targetCharacter: 'nelson' },
  { id: 'hardy_coat',       name: "Hardy's Coat",      icon: '🧥', tier: 'rare',     description: 'After using Kiss Me Hardy, Nelson gains +25 Defense for 2 turns.',                      targetCharacter: 'nelson' },
  // Rare — Hannibal-chan
  { id: 'war_elephant_tusk', name: 'War Elephant Tusk', icon: '🦣', tier: 'rare',    description: 'War Elephant is summoned with +40 HP and +20 Might.',                                   targetCharacter: 'hannibal' },
  { id: 'carthaginian_ring', name: 'Carthaginian Ring', icon: '💍', tier: 'rare',    description: 'Cannae bonus damage increased from 40% to 70%.',                                         targetCharacter: 'hannibal' },
  // Rare — Picasso-chan
  { id: 'blue_canvas',      name: 'Blue Canvas',        icon: '🎨', tier: 'rare',    description: 'Armor Break from Guernica lasts 3 turns instead of 2.',                                  targetCharacter: 'picasso' },
  { id: 'cubist_lens',      name: 'Cubist Lens',        icon: '🪟', tier: 'rare',    description: 'Fractured Perspective free-card triggers every 2nd card instead of every 3rd.',          targetCharacter: 'picasso' },
  // Rare — Teddy-chan
  { id: 'big_stick_upgrade', name: 'Carry a Bigger Stick', icon: '🏏', tier: 'rare', description: 'Big Stick range increased to 2 and deals +20 bonus Might damage.',                     targetCharacter: 'teddy' },
  { id: 'rough_rider_badge', name: "Rough Rider's Badge",  icon: '🏅', tier: 'rare', description: "Rough Riders' Rally also removes all debuffs from allied units.",                       targetCharacter: 'teddy' },
  // Rare — Mansa-chan
  { id: 'golden_throne',    name: 'Golden Throne',      icon: '👑', tier: 'rare',    description: 'After each battle, earn an additional +50% of the gold reward on top of Treasury.',      targetCharacter: 'mansa' },
  { id: 'mali_coffers',     name: 'Mali Coffers',        icon: '💰', tier: 'rare',   description: "Mansa's ability card Mana discount increased to 2.",                                     targetCharacter: 'mansa' },
  // Rare — Vel'thar-chan
  { id: 'remnant_core',    name: "Survivor's Totem", icon: '🦴', tier: `rare`,      description: "While Vel'thar is at or below 40% HP, she takes 35% less damage from all sources.",                                 targetCharacter: `velthar` },
  { id: 'void_mantle',     name: 'Ashfall Mantle',    icon: '🌋', tier: 'rare',      description: "Last Ember's AoE mode also heals Vel'thar 20 HP. Humanity's Last Light AoE radius +1 and self-heal +15 HP.",           targetCharacter: 'velthar' },
  // Rare — Musashi-chan
  { id: 'daisho_set',      name: 'Daishō Set',        icon: '🗡️', tier: 'rare',      description: 'Each Niten Ichi-ryu strike that kills grants an immediate extra strike on a new target.',                               targetCharacter: 'musashi' },
  { id: 'ganryu_stone',    name: 'Ganryu Island Stone',icon: '🪨', tier: 'rare',      description: '+15 Might, +5 Power. Battle Scar stacks persist between fights.',                                                        targetCharacter: 'musashi', statBonus: { might: 15, power: 5 } },
  // Rare — Cleopatra-chan
  { id: 'lotus_crown',     name: 'Lotus Crown',       icon: '🌸', tier: 'rare',      description: "Asp's Venom now also stacks when Cleopatra uses an ability card, not only on basic attacks.",                      targetCharacter: 'cleopatra' },
  { id: 'library_scroll',  name: 'Alexandrian Codex', icon: '📜', tier: 'rare',      description: "Asp's Kiss Power reduction increased from −15 to −25 for 3 turns.",                                                       targetCharacter: 'cleopatra' },
  // Rare — Tesla-chan
  { id: 'resonant_oscillator', name: 'Resonant Oscillator', icon: '⚡', tier: 'rare', description: 'Arc Bolt chains to 1 extra enemy for free.',                                                                            targetCharacter: 'tesla' },
  { id: 'faraday_coat',    name: 'Faraday Coat',      icon: '🧥', tier: 'rare',      description: '+10 Defense. Tesla takes 15% less damage from ability sources.',                                                          targetCharacter: 'tesla', statBonus: { defense: 10 } },
  // Rare — Shaka-chan
  { id: 'assegai',         name: 'Assegai',           icon: '🗡️', tier: 'rare',      description: '+15 Might. The Horns also knocks back one adjacent enemy 1 hex.',                                                        targetCharacter: 'shaka', statBonus: { might: 15 } },
  { id: 'cattle_kraal',    name: 'Cattle Kraal Token', icon: '🐄', tier: 'rare',     description: 'At fight start, gain bonus HP equal to 10% of max HP per ally in the squad.',                                          targetCharacter: 'shaka' },
  // Legendary
  { id: 'znyxorgas_eye',   name: "Znyxorga's Eye",    icon: '👁️', tier: 'legendary', description: 'This character has no limit on cards played per turn (normally capped at 3).' },
  { id: 'void_armor',       name: 'Void Armor',        icon: '🛡️', tier: 'legendary', description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.' },
  { id: 'arena_champion',   name: 'Arena Champion',    icon: '🏆', tier: 'legendary', description: '+25 HP, +15 Might, +15 Power, +15 Defense while this character is alive.', statBonus: { hp: 25, might: 15, power: 15, defense: 15 } },
  { id: 'warlords_grimoire', name: "Warlord's Grimoire", icon: '📖', tier: 'legendary', description: 'On turns 2, 3, and 4 of each fight, draw +2 cards and gain +2 Mana.' },
  // Signature Legendaries — one per character, boss reward only
  { id: 'sig_napoleon',  name: "Marshal's Baton",         icon: '🏅', tier: 'legendary', description: 'Artillery Barrage hits ALL enemies within 2 hexes of the target for 30% of the damage dealt.',  targetCharacter: 'napoleon' },
  { id: 'sig_genghis',   name: 'Eternal Steppe',          icon: '🌾', tier: 'legendary', description: 'Bloodlust stacks no longer cap (Might + Mana keep scaling). First 3 stacks each grant +1 movement (max +3 Move).', targetCharacter: 'genghis' },
  { id: 'sig_davinci',   name: 'Codex Atlanticus',        icon: '📜', tier: 'legendary', description: 'Tinkerer draws +1 extra card always (2 base, 3 with Drone). Vitruvian Guardian spawns with +30 HP.', targetCharacter: 'davinci' },
  { id: 'sig_leonidas',  name: 'Thermopylae Stone',       icon: '🪨', tier: 'legendary', description: 'Phalanx stacks also grant +5 Might each. At 3 stacks, basic attacks Taunt the target.',         targetCharacter: 'leonidas' },
  { id: 'sig_sunsin',    name: "Admiral's Turtle Helm",   icon: '🐢', tier: 'legendary', description: 'Water form: Regen 10 HP/turn. Land form: basic attack range +1.',                               targetCharacter: 'sunsin' },
  { id: 'sig_beethoven', name: 'Heiligenstadt Score',     icon: '🎼', tier: 'legendary', description: 'Crescendo grants +3 Power per stack instead of +2 (max +45 at 15 stacks). Götterfunken stuns for 2 turns.', targetCharacter: 'beethoven' },
  { id: 'sig_huang',     name: 'Jade Seal',               icon: '🟢', tier: 'legendary', description: 'Terracotta summons last +2 turns and spawn with +20% stats.',                                   targetCharacter: 'huang' },
  { id: 'sig_nelson',    name: "Victory's Pennant",       icon: '🚩', tier: 'legendary', description: 'Crossing the T pierces through ALL enemies in the line with no damage decay.',                   targetCharacter: 'nelson' },
  { id: 'sig_hannibal',  name: "Carthage's Oath",         icon: '🐘', tier: 'legendary', description: 'Cannae flanking bonus increased to 70%. War Elephant lasts +1 turn.',                            targetCharacter: 'hannibal' },
  { id: 'sig_picasso',   name: 'Rose Period Canvas',      icon: '🌹', tier: 'legendary', description: 'Fractured Perspective triggers every 2nd card instead of 3rd.',                                  targetCharacter: 'picasso' },
  { id: 'sig_teddy',     name: 'Bull Moose Heart',        icon: '🫀', tier: 'legendary', description: 'Survive lethal damage once per fight (1 HP). Bully! stacks also grant +10 Defense.',             targetCharacter: 'teddy' },
  { id: 'sig_mansa',     name: 'Infinite Vault',          icon: '🏦', tier: 'legendary', description: '+25 Power. Hajj of Gold heals an additional 20% of max HP (20% → 40%). Mansa shares her fortune.',     targetCharacter: 'mansa' },
  { id: 'sig_velthar',   name: 'Ember of the First Flame', icon: '🔥', tier: 'legendary', description: "Each Bottleneck stack also grants +5 Defense (max +25). Toba's Fury deals true damage at 2+ stacks.", targetCharacter: 'velthar' },
  { id: 'sig_musashi',  name: 'Niten Ichi-ryu Scrolls',  icon: '📜', tier: 'legendary', description: 'Starts every fight with 2 Battle Scar stacks. Ichi no Tachi bonus damage triggers even when target HP is below 50%.',          targetCharacter: 'musashi' },
  { id: 'sig_cleopatra',name: 'Eye of Ra',               icon: '👁️', tier: 'legendary', description: 'Royal Decree is not Exhausted. Charm lasts 2 turns. +15 Power.',                                        targetCharacter: 'cleopatra' },
  { id: 'sig_tesla',    name: 'Magnifying Transmitter',   icon: '📡', tier: 'legendary', description: 'Voltage stacks cap raised from 5 to 8. At max Voltage, next ability card costs 0 Mana (Voltage resets). +20 Power.', targetCharacter: 'tesla' },
  { id: 'sig_shaka',    name: 'Isigodlo Warshield',       icon: '🛡️', tier: 'legendary', description: 'Formation aura range increased to 2 tiles. Impondo Zankomo Defense bonus +20 for Shaka and allies.',  targetCharacter: 'shaka' },
];

const CHAR_LABEL: Record<string, { name: string; color: string }> = {
  napoleon:  { name: 'Napoleon',  color: '#d946ef' },
  genghis:   { name: 'Genghis',   color: '#ef4444' },
  davinci:   { name: 'Da Vinci',  color: '#34d399' },
  leonidas:  { name: 'Leonidas',  color: '#f59e0b' },
  sunsin:    { name: 'Sun-sin',   color: '#38bdf8' },
  beethoven: { name: 'Beethoven', color: '#22d3ee' },
  huang:     { name: 'Huang-chan',color: '#b45309' },
  nelson:    { name: 'Nelson',    color: '#3b82f6' },
  hannibal:  { name: 'Hannibal',  color: '#dc2626' },
  picasso:   { name: 'Picasso',   color: '#8b5cf6' },
  teddy:     { name: 'Teddy',     color: '#d97706' },
  mansa:     { name: 'Mansa',     color: '#f59e0b' },
  velthar:    { name: "Vel'thar",   color: '#7c3aed' },
  musashi:   { name: 'Musashi',   color: '#dc2626' },
  cleopatra: { name: 'Cleopatra', color: '#d97706' },
  tesla:     { name: 'Tesla',     color: '#facc15' },
  shaka:     { name: 'Shaka',     color: '#16a34a' },
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
  { definitionId: 'shared_flash_bang',      name: 'Flash Bang',        icon: '💥', manaCost: 1, type: 'debuff',   rarity: 'common', description: 'Throw a Flash Bang at range 3 — Blinds the target for 1 turn (attack and ability range reduced to 1).' },
  { definitionId: 'shared_fortify',         name: 'Fortify',           icon: '🏰', manaCost: 2, type: 'defense',  rarity: 'common', description: 'Cannot move this turn. Gain +25 Defense and +15 Might until the end of your next turn.' },
  { definitionId: 'shared_taunt',           name: 'Taunt',             icon: '📢', manaCost: 2, type: 'debuff',   rarity: 'common', description: 'Force a nearby enemy to target this unit for 2 turns. This unit gains +15 Defense while Taunting.' },
  { definitionId: 'shared_decoy',           name: 'Decoy',             icon: '🪆', manaCost: 2, type: 'buff',     rarity: 'common', description: 'Place a 30 HP Decoy within range 3. Decoys cannot move or play cards. When destroyed, explodes for 20 damage to all enemies in range 2.' },
  // Shared — Uncommon
  { definitionId: 'shared_retribution',    name: 'Retribution',       icon: '⚡', manaCost: 2, type: 'attack',   rarity: 'uncommon', description: 'Deal damage equal to HP lost this fight to one enemy. Range 3.' },
  // Shared — Rare
  { definitionId: 'shared_blood_price',     name: 'Blood Price',       icon: '🩸', manaCost: 2, type: 'buff',     rarity: 'rare',   description: 'Sacrifice 20% of your HP. All allies gain +15 Might and +15 Power until end of turn.' },
  { definitionId: 'shared_overcharge',      name: 'Overcharge',        icon: '🔋', manaCost: 2, type: 'buff',     rarity: 'rare',   description: 'The next card played this turn costs 0 Mana. (Still uses a card play.)' },
  // Napoleon
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, type: 'attack',  rarity: 'rare',    description: '~78 damage to a target at range 4.',                  exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, type: 'buff',    rarity: 'rare',    description: '+15% Might AND Power to all allies for 2 turns.',            exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_final_salvo',       name: 'Final Salvo',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — 3 random hits of ~42 damage on enemies within range 4.', exclusiveTo: 'Napoleon' },
  // Genghis
  { definitionId: 'genghis_mongol_charge',  name: 'Mongol Charge', icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: '48 damage at range 3. Applies Bleed.',                                  exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics',  name: 'Horde Tactics', icon: '🌀', manaCost: 3, type: 'attack',  rarity: 'rare',    description: '20 dmg per enemy in range 2 to ALL enemies in range 2. (Scales with count)', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_riders_fury',    name: "Rider's Fury",  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — ~75 damage to all enemies on a line (range 5). Doubled if target below 40% HP.", exclusiveTo: 'Genghis' },
  // Leonidas
  { definitionId: 'leonidas_shield_bash',   name: 'Shield Bash',    icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: '~77 damage at range 1. Armor Break + counter-stance (+20 DEF this turn).', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall',  name: 'Spartan Wall',   icon: '🏛️', manaCost: 3, type: 'defense', rarity: 'rare',    description: '+20 Defense to Leonidas and all allies within range 2.',     exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_this_is_sparta',name: 'THIS IS SPARTA!',icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~120 damage to target. Roots all adjacent enemies for 2 turns.', exclusiveTo: 'Leonidas' },
  // Da Vinci
  { definitionId: 'davinci_flying_machine',     name: 'Flying Machine',     icon: '✈️', manaCost: 2, type: 'movement', rarity: 'rare',    description: 'Teleport to any unoccupied hex on the board. No range limit.',              exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',        name: 'Masterpiece',        icon: '💚', manaCost: 3, type: 'defense',  rarity: 'rare',    description: 'Heal an ally within range 3 for 50 HP.',                  exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, type: 'ultimate',  rarity: 'ultimate', description: 'EXHAUST — Summon drone: HP 90, Might 60, Defense 30. Lasts until defeated. (Scales with Power)', exclusiveTo: 'Da Vinci' },
  // Sun-sin — Land forms
  { definitionId: 'sunsin_hwajeon_land',        name: 'Hwajeon',           icon: '🔥', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~72 dmg at range 3. Pushes target back 1 hex.',                                          exclusiveTo: 'Sun-sin', terrain: 'land' },
  { definitionId: 'sunsin_naval_repairs_land',  name: 'Naval Repairs',     icon: '🚢', manaCost: 3, type: 'defense',  rarity: 'rare',    description: 'Target an area — allies within range 2 heal 15 HP now and 15 HP next turn.',              exclusiveTo: 'Sun-sin', terrain: 'land' },
  { definitionId: 'sunsin_chongtong_land',      name: 'Chongtong Barrage', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Charge 3 hexes. ~60 dmg to enemies in path, pushed sideways. Sun-sin ends at last hex.', exclusiveTo: 'Sun-sin', terrain: 'land' },
  // Sun-sin — Water forms
  { definitionId: 'sunsin_ramming_speed_water', name: 'Ramming Speed',     icon: '🚢', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~72 dmg at range 1. Pushes target back 1 hex. (Power reduced on water)',                  exclusiveTo: 'Sun-sin', terrain: 'water' },
  { definitionId: 'sunsin_broadside_water',     name: 'Broadside',         icon: '💥', manaCost: 3, type: 'attack',   rarity: 'rare',    description: '~25 dmg to ALL enemies in range 3.',                                                     exclusiveTo: 'Sun-sin', terrain: 'water' },
  { definitionId: 'sunsin_chongtong_water',     name: 'Chongtong Barrage', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~90 dmg to main target + ~43 to adjacent enemies. Range 5.',                    exclusiveTo: 'Sun-sin', terrain: 'water' },
  // Beethoven
  { definitionId: 'beethoven_schallwelle',  name: 'Schallwelle',   icon: '🌊', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Sonic wave — ~39 damage to all enemies in a line up to range 3. Pushes each 2 tiles back.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_freudenspur',  name: 'Freudenspur',   icon: '🎶', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Target a tile within range 3. That tile and all 6 adjacent tiles become a resonance zone. Allies on the zone gain +2 Movement at turn start. Lasts 2 turns.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_gotterfunken', name: 'Götterfunken',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~46 damage to all enemies within range 3. Stun for 1 turn.', exclusiveTo: 'Beethoven' },
  // Huang-chan
  { definitionId: 'huang_terracotta_summon', name: 'Terracotta Legion',         icon: '🗿', manaCost: 2, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Archer (Might 52, range 2) or Warrior (Might 35, range 1) on hex within range 3. HP 40, scales with your stats. Lasts 1 turn.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_first_emperor',     name: "First Emperor's Command",   icon: '🐴', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Cavalry (≈53 Might, ~38 Def, ≈55 Power, Move 3) on adjacent hex. HP 60, scales with stats. Lasts 2 turns. Gain FREE Cavalry Charge card.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_cavalry_charge',    name: 'Cavalry Charge',            icon: '⚡', manaCost: 0, type: 'attack',   rarity: 'rare',    description: 'FREE — Cavalry charges a target at range 3 for ~66 damage. Only appears after First Emperor\'s Command.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_eternal_army',      name: 'Eternal Army',              icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Control a non-boss enemy within range 3 for 2 turns. They auto-attack nearest foe (same mechanics as attacking you). Cannot target bosses or mini-bosses.', exclusiveTo: 'Huang-chan' },
  // Nelson
  { definitionId: 'nelson_crossing_the_t',   name: 'Crossing the T',   icon: '🚢', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Line shot (range 5) — 1st target ~65 dmg, 2nd ~42, 3rd+ ~27. Each successive target takes 65% of the previous.',                  exclusiveTo: 'Nelson' },
  { definitionId: 'nelson_kiss_me_hardy',    name: 'Kiss Me Hardy',    icon: '💨', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Charge 4 hexes. Each enemy in path takes ~55 dmg and is pushed sideways. Nelson ends at last hex.',                     exclusiveTo: 'Nelson' },
  { definitionId: 'nelson_trafalgar_square', name: 'Trafalgar Square', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~130 dmg to one target at range 4. On-kill: ~50 splash to all adjacent enemies.',                               exclusiveTo: 'Nelson' },
  // Hannibal
  { definitionId: 'hannibal_alpine_march',       name: 'Alpine March',       icon: '🏔️', manaCost: 1, type: 'movement', rarity: 'rare',    description: 'Use before moving. Charge up to 6 hexes — enemies in path take ~28 dmg and are pushed sideways. Consumes all movement.', exclusiveTo: 'Hannibal' },
  { definitionId: 'hannibal_double_envelopment', name: 'Double Envelopment', icon: '🌀', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Hit primary target at range 3 for ~55 dmg. All adjacent enemies take ~28 dmg. Cannae bonus if flanked.', exclusiveTo: 'Hannibal' },
  { definitionId: 'hannibal_war_elephant',       name: 'War Elephant',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Summon War Elephant adjacent: HP 120, Might 70, Def 20, Move 2. Basic attacks only. Lasts 2 turns.',                  exclusiveTo: 'Hannibal' },
  // Picasso
  { definitionId: 'picasso_guernica',     name: 'Guernica',     icon: '💥', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~70 dmg to ALL enemies in range 2. Applies Armor Break to all hit.', exclusiveTo: 'Picasso' },
  { definitionId: 'picasso_cubist_mirror',name: 'Cubist Mirror', icon: '🪞', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Swap positions with any unit in range 4. If enemy: deal ~35 dmg on swap.',             exclusiveTo: 'Picasso' },
  { definitionId: 'picasso_blue_period',  name: 'Blue Period',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Scramble all units. Heal allies 60 HP + +20 DEF until next turn.',                        exclusiveTo: 'Picasso' },
  // Teddy
  { definitionId: 'teddy_speak_softly',      name: 'Speak Softly',       icon: '📣', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Taunt ALL enemies in range 2 for 1 turn. Teddy gains +30 DEF until next turn.',                                    exclusiveTo: 'Teddy' },
  { definitionId: 'teddy_big_stick',         name: 'Big Stick',          icon: '🏏', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~87 Might dmg at range 1. +50% bonus (~130) vs Stunned or Taunted.',                            exclusiveTo: 'Teddy' },
  { definitionId: 'teddy_rough_riders_rally',name: "Rough Riders' Rally",icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Allies +25 Might, +2 Move this turn. Teddy +45 Might and teleports to any hex in range 5.",                exclusiveTo: 'Teddy' },
  // Mansa
  { definitionId: 'mansa_salt_road',name: 'Salt Road',      icon: '⚗️', manaCost: 1, type: 'buff',     rarity: 'rare',    description: 'Place a 7-hex mana zone at range 3. Allies on zone gain +1 Mana at turn start. Lasts 2 turns. (Costs 0 with Treasury)',  exclusiveTo: 'Mansa' },
  { definitionId: 'mansa_hajj_of_gold', name: 'Hajj of Gold',  icon: '✨', manaCost: 2, type: 'buff',     rarity: 'rare',    description: 'Heal all allies for 20% max HP. +10 Power to all allies this turn. (Costs 1 with Treasury)',                              exclusiveTo: 'Mansa' },
  { definitionId: 'mansa_bounty',   name: "Mansa's Bounty", icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Golden Stasis: freeze ALL units (allies + enemies) for 1 turn. (Costs 2 with Treasury)",                         exclusiveTo: 'Mansa' },
  // Vel'thar
  { definitionId: 'velthar_void_lance',  name: "Toba's Fury",          icon: '🌌', manaCost: 2, type: 'attack',   rarity: 'rare',    description: "Melee strike for ~64 dmg. At 2+ Bottleneck stacks: also applies Armor Break.", exclusiveTo: "Vel'thar" },
  { definitionId: 'velthar_last_rites',  name: 'Last Ember',           icon: '🔥', manaCost: 2, type: 'buff',     rarity: 'rare',    description: "If Bottleneck is active (≥1 stack): heal 25 HP + gain +15 Defense for 1 turn. Otherwise: deal ~50 dmg to all enemies in range 2.", exclusiveTo: "Vel'thar" },
  { definitionId: 'velthar_singularity', name: "Humanity's Last Light", icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Deal ~87 dmg to ALL enemies in range 2. Vel'thar heals 30 HP. Bottleneck stacks amplify via active Power boost.", exclusiveTo: "Vel'thar" },
  // Musashi
  { definitionId: 'musashi_ichi_no_tachi', name: 'Ichi no Tachi',       icon: '⚔️', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Deal ~36 dmg at range 1. Places Duel on target (2 turns). If target is already Dueled: deal ~63 dmg instead and apply Bleed.', exclusiveTo: 'Musashi' },
  { definitionId: 'musashi_niten_ichi',    name: 'Niten Ichi-ryu',      icon: '🗡️', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Strike twice for ~32 each (~64 total) at range 1. Both hits apply Bleed. If target is Dueled: refresh Duel and deal ~22 splash to an adjacent enemy.', exclusiveTo: 'Musashi' },
  { definitionId: 'musashi_book_of_five',  name: 'Book of Five Rings',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Apply Duel to ALL enemies within range 2 (2 turns). Deal ~38 dmg to each. For the rest of this round, Duel damage bonus rises from +35% to +65%.', exclusiveTo: 'Musashi' },
  // Cleopatra
  { definitionId: 'cleo_asp_kiss',       name: "Asp's Kiss",     icon: '🐍', manaCost: 2, type: 'debuff',   rarity: 'rare',    description: 'Deal ~46 dmg at range 3. Reduce target Power by 15 for 3 turns.', exclusiveTo: 'Cleopatra' },
  { definitionId: 'cleo_royal_decree',   name: 'Royal Decree',   icon: '👑', manaCost: 2, type: 'debuff',   rarity: 'rare',    description: 'Dual-use (range 3). Enemy: apply Charm (1 turn) + Poison (3 turns). Ally: grant +20 Might and +10 Defense for 2 turns.', exclusiveTo: 'Cleopatra' },
  { definitionId: 'cleo_eternal_kingdom',name: 'Eternal Kingdom', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Apply Stun (1 turn) and Poison (3 turns) to ALL enemies in range 2. Cleopatra becomes Untouchable for 1 turn.', exclusiveTo: 'Cleopatra' },
  // Tesla
  { definitionId: 'tesla_arc_bolt',   name: 'Arc Bolt',   icon: '⚡', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Deal ~72 dmg to target in range 3. At Voltage ≥3: chains to ALL adjacent enemies for ~40 each.', exclusiveTo: 'Tesla' },
  { definitionId: 'tesla_coil_surge', name: 'Coil Surge', icon: '🔋', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Place a Tesla Coil zone at range 3. Enemies starting their turn on it receive −20 Defense and Stun 1 turn. Lasts 3 turns. Costs 1 Voltage.', exclusiveTo: 'Tesla' },
  { definitionId: 'tesla_death_ray',  name: 'Death Ray',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Requires Voltage ≥3. Beam (range 6): first target takes ~40 per Voltage stack, each further target takes 50% of previous. Consumes all Voltage.', exclusiveTo: 'Tesla' },
  // Shaka
  { definitionId: 'shaka_the_horns',        name: 'The Horns',        icon: '🦬', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Charge at target (up to 2 tiles). Deal ~24 dmg + push sideways. Water: instant lethal. Mountain: Stun 1 turn instead.', exclusiveTo: 'Shaka' },
  { definitionId: 'shaka_chest_strike',      name: 'Chest Strike',     icon: '🛡️', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Deal ~27 dmg at range 1. Push target back 1 tile. Applies Armor Break.', exclusiveTo: 'Shaka' },
  { definitionId: 'shaka_impondo_zankomo',   name: 'Impondo Zankomo',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — War cry: deal ~62 dmg to ALL adjacent enemies. Adjacent allies gain +35 Defense for 2 turns. Shaka gains +50 Defense for 2 turns.', exclusiveTo: 'Shaka' },
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
  Nelson: '#3b82f6', Hannibal: '#dc2626', Picasso: '#8b5cf6', Teddy: '#d97706', Mansa: '#f59e0b',
  "Vel'thar": '#7c3aed', Musashi: '#dc2626', Cleopatra: '#d97706', Tesla: '#facc15', Shaka: '#16a34a',
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
      { icon: '🦟', name: 'Swarm Bite', desc: 'Leaps onto the closest enemy and deals 40 damage to all enemies within range 1. (Every 4 turns)' },
    ],
  },
  { id: 'naxion_scout',      name: 'Naxion Scout',         icon: '👾', act: 1, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/naxion_scout_portrait.png',    stats: { hp: 70,  might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 }, description: "A hired gun from the outer arena circuits. One burning eye, one plasma pistol — it never stops smiling because it knows it's faster than you.",
    abilities: [
      { icon: '⚡', name: 'Plasma Shot', desc: 'Fires a concentrated plasma bolt dealing ~42 damage to a single enemy within range 3. (Every 3 turns)' },
    ],
  },
  { id: 'vron_crawler',      name: 'Vron Crawler',         icon: '🦀', act: 1, rank: 'Minion', ai: 'defensive',  portrait: '/art/enemies/vron_crawler_portrait.png',    stats: { hp: 85,  might: 28, power: 20, defense: 16, moveRange: 2, attackRange: 1 }, description: "A living fortress on six legs. Its layered shell makes frontal assaults nearly pointless — wait for it to expose its soft underbelly, or don't attack at all.",
    abilities: [
      { icon: '🐚', name: 'Shell Harden', desc: 'Retracts into armored shell — gains +18 Defense for 2 turns. (Every 5 turns)' },
      { icon: '🦀', name: 'Crushing Charge', desc: 'Drives forward 1 hex and crushes the target for 1.3× Might damage (DEF applies). (Every 3 turns)' },
    ],
  },
  { id: 'krath_champion',    name: 'Krath Champion',       icon: '⚔️', act: 1, rank: 'Elite',  ai: 'berserker',  portrait: '/art/enemies/krath_champion_portrait.png',  stats: { hp: 105, might: 55, power: 40, defense: 18, moveRange: 3, attackRange: 1 }, description: "A seasoned Krath arena veteran decorated with the skulls of past opponents. Fights dirty, hard, and with a grin that says it's already killed better than you.",
    abilities: [
      { icon: '🔥', name: 'Battle Rage', desc: 'Gains +25 Might and +10 Defense for 2 turns. (Every 3 turns)' },
      { icon: '⚔️', name: "Champion's Strike", desc: 'Deals 1× Might damage to the nearest enemy in range 2. (Every 2 turns)' },
      { icon: '📣', name: 'Battle Roar', desc: 'Lets out a commanding roar — Taunts all enemies within range 2 for 1 turn, forcing them to target this unit. (Every 3 turns)' },
    ],
  },
  { id: 'spore_cluster',     name: 'Spore Node',           icon: '🔴', act: 1, rank: 'Elite',  ai: 'ranged',     portrait: '/art/enemies/spore_node_portrait.png',     stats: { hp: 40,  might: 20, power: 30, defense: 5,  moveRange: 1, attackRange: 2 }, description: 'Three semi-sentient spore heads on a shared fungal body. Sluggish and barely mobile, but the mycotoxin threads it weaves through the ground will root you in place before you realize what happened.',
    abilities: [
      { icon: '☣️', name: 'Toxic Cloud', desc: 'Applies Poison to all enemies within range 2. (Every 3 turns)' },
      { icon: '🕸️', name: 'Spore Web', desc: 'Ejects sticky spore threads — Roots all enemies within range 2 for 1 turn. (Every 4 turns)' },
    ],
  },
  { id: 'vexlar',            name: 'Vexlar',               icon: '🐆', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/vexlar_portrait.png',          stats: { hp: 80,  might: 25, power: 30, defense: 22, moveRange: 3, attackRange: 1 }, description: 'Alien apex predators brought in for your opening round. Six-legged and iridescent, they hunt the weakest link with surgical instinct — leaping in, striking, and scattering anything nearby.',
    abilities: [
      { icon: '🐆', name: 'Predator Leap', desc: 'Leaps up to range 4 toward the enemy with the lowest Defense, strikes immediately, and knocks back adjacent units on landing. (Every 3 turns)' },
    ],
  },
  { id: 'iron_wall',         name: 'Iron Wall',            icon: '🤖', act: 1, rank: 'Boss',   ai: 'defensive',  portrait: '/art/enemies/iron_wall_portrait.png',       stats: { hp: 200, might: 60, power: 50, defense: 20, moveRange: 2, attackRange: 1 }, description: 'The Act I gatekeeper — a hulking war mech that heals when wounded, blankets the field with EMP blasts, and becomes an impenetrable turret when cornered.',
    abilities: [
      { icon: '🛡️', name: 'Shield Array', desc: 'Heals self for 35 HP. Triggers ONCE when below 50% HP.' },
      { icon: '⚡', name: 'EMP Blast', desc: 'Deals 55 damage to all enemies within range 1. (Every 3 turns)' },
      { icon: '🤖', name: 'Turret Mode', desc: 'Gains +30 Defense for 2 turns. (Every 4 turns)' },
    ],
  },
  { id: 'mog_toxin',         name: 'Mog Toxin',            icon: '☣️', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/mog_toxin_portrait.png',     stats: { hp: 75,  might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 }, description: 'A long-range biological hazard unit. Corrodes your armor from a distance and then bleeds you dry with targeted toxin injections.',
    abilities: [
      { icon: '🧪', name: 'Acid Spray', desc: 'Launches a corrosive burst — applies Armor Break (−20% DEF) to all enemies within range 1 for 2 turns. (Every 3 turns)' },
      { icon: '🩸', name: 'Hemorrhage Strike', desc: 'Injects a targeted toxin — applies Bleed (3 dmg/turn) to a single enemy within range 1 for 3 turns. (Every 3 turns)' },
    ],
  },
  { id: 'qrix_hunter',       name: 'Qrix Hunter',          icon: '🏹', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/qrix_hunter_portrait.png',     stats: { hp: 70,  might: 25, power: 50, defense: 8,  moveRange: 3, attackRange: 3 }, description: 'A precision marksman deployed by arena sponsors. Has the longest attack range of any common enemy.',
    abilities: [
      { icon: '📌', name: 'Pinning Shot', desc: 'Fires a precision bolt dealing ~60 damage to a single enemy within range 3. (Every 3 turns)' },
    ],
  },
  { id: 'void_wraith',       name: 'Void Wraith',          icon: '👻', act: 2, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/void_wraith_portrait.png', stats: { hp: 65,  might: 45, power: 40, defense: 5,  moveRange: 4, attackRange: 1 }, description: 'Spectral energy creature from the Null Zone. Fast and hits hard, but shatters quickly.',
    abilities: [
      { icon: '🌑', name: 'Shadow Step', desc: 'Phases through reality — teleports adjacent to the closest enemy and strikes for 1× Might (DEF applies). (Every 3 turns)' },
    ],
  },
  { id: 'krath_berserker',   name: 'Krath Berserker',      icon: '💢', act: 2, rank: 'Elite',  ai: 'berserker',  portrait: '/art/enemies/krath_berserker_portrait.png',  stats: { hp: 140, might: 60, power: 55, defense: 14, moveRange: 4, attackRange: 1 }, description: 'The veteran of Act I. Goes berserk for a burst of +18 Might, then leaps across the field.',
    abilities: [
      { icon: '💢', name: 'Bloodrage', desc: 'Gains +18 Might and loses 20 Defense for 2 turns. (Every 3 turns)' },
      { icon: '🦘', name: 'Savage Leap', desc: 'Teleports adjacent to the closest enemy and deals 1.2× Might (~72) damage (DEF applies). (Every 2 turns)' },
    ],
  },
  { id: 'phasewarden',       name: 'Phasewarden',          icon: '🔮', act: 2, rank: 'Elite',  ai: 'ranged',     portrait: '/art/enemies/phasewarden_portrait.png',     stats: { hp: 110, might: 55, power: 65, defense: 20, moveRange: 4, attackRange: 2 }, description: "A guardian from between dimensions. Its crystalline armor flickers between planes of existence — it blinks in, strikes while your abilities are suppressed, then vanishes before you can respond.",
    abilities: [
      { icon: '🔮', name: 'Dimensional Drain', desc: 'Applies Armor Break to all enemies within range 2 for 2 turns. (Every 3 turns)' },
      { icon: '✨', name: 'Phase Blink', desc: 'Blinks adjacent to the nearest enemy and strikes for ~50 damage (DEF applies), Silencing the target for 1 turn. (Every 3 turns)' },
    ],
  },
  { id: 'twin_terror_a',     name: 'Terror Alpha',         icon: '🗡️', act: 2, rank: 'Boss',   ai: 'berserker',  portrait: '/art/enemies/terror_alpha_portrait.png',   stats: { hp: 160, might: 60, power: 55, defense: 20, moveRange: 4, attackRange: 1 }, description: 'The aggressive half of the Twin Terror. Built for raw speed and kinetic impact — charges at full sprint and hits like a missile. Kill it first or it will never stop coming.',
    abilities: [
      { icon: '🗡️', name: 'Alpha Rush', desc: 'Charges 4 hexes and deals 1.5× Might (~90) damage on impact (DEF applies). (Every 2 turns)' },
      { icon: '🔥', name: 'Twin Fury', desc: 'Gains +20 Might for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'twin_terror_b',     name: 'Terror Beta',          icon: '🛡️', act: 2, rank: 'Boss',   ai: 'defensive',  portrait: '/art/enemies/terror_beta_portrait.png',    stats: { hp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 }, description: 'The defensive half of the Twin Terror. Absorbs punishment while Alpha creates chaos, then heals itself when nearly dead. Ignore it and Beta becomes unkillable.',
    abilities: [
      { icon: '💚', name: 'Aegis Heal', desc: 'Heals self for 45 HP. Triggers ONCE when below 40% HP.' },
      { icon: '🛡️', name: 'Mirror Aegis', desc: 'Gains +35 Defense for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'znyxorga_champion', name: "Znyxorga's Champion",  icon: '👑', act: 3, rank: 'Boss',   ai: 'berserker',  portrait: '/art/enemies/znyxorgas_champion_portrait.png', stats: { hp: 400, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 }, description: "Znyxorga's ultimate weapon — four arms, six eyes, 400 HP, and the patience of a god. Annihilates your whole team simultaneously and grows stronger the closer it gets to death.",
    abilities: [
      { icon: '👑', name: 'Arena Collapse', desc: 'The arena becomes a weapon — deals 20 TRUE damage to ALL player characters simultaneously (ignores DEF). (Every 3 turns)' },
      { icon: '🛡️', name: 'Phase Shift', desc: 'INVINCIBLE for 2 turns and gains +15 Might/Power/Defense permanently. Triggers ONCE when below 50% HP — prepare for a power spike!' },
      { icon: '⭐', name: "Champion's Will", desc: "Driven by Znyxorga's will — gains +20 Might/Power/Defense permanently. Triggers ONCE when below 30% HP. Finish it fast!" },
      { icon: '💥', name: 'Tyrant Strike', desc: 'Channels overwhelming power — deals ~48 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
  { id: 'velzar_will', name: "Vel'Zar — Emperor's Will", icon: '🌌', act: 4, rank: 'Boss', ai: 'berserker', portrait: '/art/enemies/velzar_will_portrait.png', stats: { hp: 520, might: 100, power: 100, defense: 55, moveRange: 4, attackRange: 2 }, description: "The Emperor's final answer. Phase 4 of the Grand Finale — a seven-limbed war construct that survived three hundred gladiatorial seasons without taking a wound. It has Phase Shifted. It has triggered Champion's Will. None of that was ever enough. It has never seen anything like you.",
    abilities: [
      { icon: '🌌', name: "Emperor's Verdict", desc: "Channels the Emperor's judgment — deals 35 damage to ALL player characters simultaneously. (Every 3 turns)" },
      { icon: '💀', name: 'Void Sunder',        desc: "Tears reality open — applies Armor Break (−25% DEF) to ALL player characters for 2 turns. (Every 4 turns)" },
      { icon: '⚡', name: 'Imperial Mandate',   desc: "The Emperor's will made flesh — Stuns all player characters within range 1 for 1 turn. Don't cluster near it. (Every 3 turns)" },
      { icon: '👁️', name: 'Apex Ascension',     desc: 'INVINCIBLE for 2 turns and gains +25 Might/Power permanently. Triggers ONCE when below 60% HP — act fast before it ascends.' },
      { icon: '⭐', name: 'Total Authority',     desc: "The Emperor's absolute will — gains +30 Might/Power/Defense permanently. Triggers ONCE when below 25% HP. This is its final form." },
    ],
  },
  // ── New Enemies ────────────────────────────────────────────────────────────
  { id: 'naxion_shieldbearer', name: 'Naxion Shieldbearer', icon: '🛡️', act: 1, rank: 'Elite', ai: 'defensive', portrait: '/art/enemies/naxion_shieldbearer_portrait.png', stats: { hp: 115, might: 45, power: 30, defense: 35, moveRange: 2, attackRange: 1 }, description: "A walking fortress in the shape of a soldier. The Naxion Shieldbearer absorbs everything you throw at it and hits back twice as hard — and if you think its allies are safe, you're wrong.",
    abilities: [
      { icon: '🛡️', name: 'Shield Slam', desc: 'Crashes its shield into a target — deals 1.1× Might damage and Roots the target for 1 turn. (Every 2 turns)' },
      { icon: '📣', name: 'Rally Cry', desc: 'Braces for impact — gains +25 Defense for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'grox_magnetar', name: 'Grox Magnetar', icon: '🧲', act: 2, rank: 'Elite', ai: 'ranged', portrait: '/art/enemies/grox_magnetar_portrait.png', stats: { hp: 130, might: 50, power: 70, defense: 25, moveRange: 3, attackRange: 3 }, description: "A living electromagnetic anomaly — the Grox Magnetar bends metal, reroutes energy, and silences technology with a thought. It doesn't fight in straight lines; it reshapes the battlefield to make sure nothing else does either.",
    abilities: [
      { icon: '🧲', name: 'Magnetic Pull', desc: 'Yanks a target 2 hexes closer then deals ~56 damage. Range 3. (Every 2 turns)' },
      { icon: '⚡', name: 'EMP Surge', desc: 'Releases an electromagnetic pulse — Silences all enemies within range 1 for 1 turn (Power reduced to 0). (Every 3 turns)' },
    ],
  },
  { id: 'vrex_mimic', name: 'Vrex Mimic', icon: '🎭', act: 2, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/vrex_mimic_portrait.png', stats: { hp: 90, might: 40, power: 40, defense: 15, moveRange: 4, attackRange: 1 }, description: "Nobody knows what a Vrex Mimic actually looks like — it never stops wearing someone else's face. Adapts its form mid-fight, and when the mask slips, it wipes your ability to respond.",
    abilities: [
      { icon: '🎭', name: 'Imitate', desc: 'Mimics the closest enemy — copies their Might value, then strikes for 1.2× that Might. (Every 2 turns)' },
      { icon: '🌀', name: 'Disorienting Shift', desc: "Shifts form mid-fight — Silences a single target within range 2 for 1 turn, suppressing their Power. (Every 2 turns)" },
    ],
  },
  { id: 'naxion_warmaster',     name: 'Naxion Warmaster',      icon: '🪖', act: 3, rank: 'Elite', ai: 'berserker', portrait: '/art/enemies/naxion_warmaster_portrait.png',     stats: { hp: 155, might: 68, power: 48, defense: 26, moveRange: 3, attackRange: 1 }, description: "The apex of Naxion military caste — an offensive commander who leads every charge personally. Where the Shieldbearer holds the line, the Warmaster breaks it.",
    abilities: [
      { icon: '📯', name: 'War Decree',      desc: 'Issues the order to advance — gains +30 Might for 2 turns. (Every 3 turns)' },
      { icon: '🪖', name: 'Vanguard Charge', desc: 'Charges up to 3 hexes toward the nearest enemy and strikes for 1.3× Might (DEF applies). (Every 2 turns)' },
    ],
  },
  { id: 'grox_titan',          name: 'Grox Titan',            icon: '🌩️', act: 3, rank: 'Elite', ai: 'ranged',    portrait: '/art/enemies/grox_titan_portrait.png',          stats: { hp: 175, might: 60, power: 88, defense: 32, moveRange: 2, attackRange: 3 }, description: "Beyond the Magnetar class — the Grox Titan commands electromagnetic force at a scale that reshapes the battlefield. Everything within range is either pulled in, broken, or burning.",
    abilities: [
      { icon: '🌩️', name: 'Graviton Storm',    desc: 'Releases a graviton pulse — deals ~57 damage to all enemies within range 3 (DEF applies). (Every 3 turns)' },
      { icon: '🛡️', name: 'Magnetic Fortress', desc: 'Converts its electromagnetic field into a defensive shell — gains +40 Defense for 2 turns. (Every 4 turns)' },
      { icon: '🧲', name: 'Magnetic Pull',      desc: 'Generates a massive graviton spike — yanks a target 2 hexes closer then deals ~35 damage. Range 3. (Every 2 turns)' },
    ],
  },
  { id: 'velthrak_shadowblade', name: "Vel'thrak Shadowblade", icon: '🗡️', act: 3, rank: 'Elite', ai: 'berserker', portrait: '/art/enemies/velthrak_shadowblade_portrait.png', stats: { hp: 108, might: 78, power: 60, defense: 12, moveRange: 5, attackRange: 1 }, description: "An assassin from the Vel'thrak species — the Empire's most feared shadow warriors. It doesn't fight you; it decides the order you die in and then executes the plan.",
    abilities: [
      { icon: '☠️', name: 'Death Mark',        desc: 'Marks nearby targets for execution — applies Armor Break (−22% DEF) to all within range 1 for 2 turns. (Every 3 turns)' },
      { icon: '🗡️', name: 'Phantom Execution', desc: 'Vanishes and reappears adjacent to the weakest target — deals 1.5× Might damage (DEF applies). (Every 2 turns)' },
    ],
  },
  { id: 'crystalline_hive', name: 'Crystalline Hive', icon: '💎', act: 3, rank: 'Minion', ai: 'ranged', portrait: '/art/enemies/crystalline_hive_portrait.png', stats: { hp: 85, might: 35, power: 60, defense: 20, moveRange: 2, attackRange: 3 }, description: "A collective organism grown from shattered crystal — the Hive doesn't think so much as resonate. Its shards fragment in every direction and the longer it stays alive, the more the air itself cuts you.",
    abilities: [
      { icon: '💎', name: 'Crystal Burst', desc: 'Erupts in razor shards — deals ~48 damage to all enemies within range 2. (Every 2 turns)' },
      { icon: '🩸', name: 'Crystalline Shards', desc: 'Fires microscopic crystal fragments — applies Bleed (3 dmg/turn) to all enemies within range 2 for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'zyx_swarmer', name: 'Zyx Swarmer', icon: '🦟', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/zyx_swarmer_portrait.png', stats: { hp: 25, might: 18, power: 12, defense: 3, moveRange: 4, attackRange: 1 }, description: 'A failed hive separation — three fragments sharing one degraded drive. Each is weaker than a Skitter alone, but all three arrive at once and they never stop.',
    abilities: [
      { icon: '🦟', name: 'Swarm Bite', desc: 'Leaps and deals 30 damage to all enemies within range 1. (Every 4 turns)' },
      { icon: '🩸', name: 'Wound Swarm', desc: 'Applies Bleed to a single target in range 1. (Every 3 turns)' },
    ],
  },
  { id: 'zyx_remnant', name: 'Zyx Remnant', icon: '💀', act: 3, rank: 'Elite', ai: 'defensive', portrait: '/art/enemies/zyx_remnant_portrait.png', stats: { hp: 110, might: 40, power: 45, defense: 18, moveRange: 2, attackRange: 2 }, description: 'A hive fragment old enough that Arena Authority has stopped trying to classify what it is. Slow. Tanky. Pulls everything toward it and refuses to let go.',
    abilities: [
      { icon: '🌀', name: 'Recall Pulse', desc: 'Pulls all enemies within range 2 toward it by 2 hexes. (Every 3 turns)' },
      { icon: '❄️', name: 'Resonance Strike', desc: 'Melee attack that Roots the target for 1 turn. (Every 2 turns)' },
    ],
  },
  { id: 'qrix_hauler', name: 'Qrix Hauler', icon: '⚓', act: 2, rank: 'Elite', ai: 'defensive', portrait: '/art/enemies/qrix_hauler_portrait.png', stats: { hp: 125, might: 45, power: 28, defense: 22, moveRange: 2, attackRange: 1 }, description: 'A void freight specialist in the arena between cargo runs. Slow, absurdly durable, and capable of locking a character in place for an uncomfortably long time.',
    abilities: [
      { icon: '⚓', name: 'Dead Weight', desc: 'Grabs target — deals 1× Might and Roots for 2 turns. (Every 3 turns)' },
      { icon: '💥', name: 'Haul Through', desc: 'Charges 2 hexes and deals 1.2× Might on impact. (Every 2 turns)' },
    ],
  },
  { id: 'qrix_salvager', name: 'Qrix Salvager', icon: '🔧', act: 2, rank: 'Minion', ai: 'ranged', portrait: '/art/enemies/qrix_salvager_portrait.png', stats: { hp: 80, might: 35, power: 40, defense: 12, moveRange: 3, attackRange: 2 }, description: 'Spent years stripping disabled ships for parts. Now strips your buffs instead. The toolkit is the same; the target has changed.',
    abilities: [
      { icon: '🔧', name: 'Reroute', desc: 'Applies Silence (1 turn) and Armor Break to target in range 2. (Every 3 turns)' },
      { icon: '🩸', name: 'Corrosive Strike', desc: 'Melee attack that applies Bleed for 2 turns. (Every 2 turns)' },
    ],
  },
  { id: 'qrix_voidbreacher', name: 'Qrix Voidbreacher', icon: '⚡', act: 3, rank: 'Elite', ai: 'berserker', portrait: '/art/enemies/qrix_voidbreacher_portrait.png', stats: { hp: 105, might: 72, power: 55, defense: 14, moveRange: 5, attackRange: 1 }, description: "A Qrix whose void-adaptation has compounded past the baseline. Fastest thing in Act III. By the time you see it, it's already next to your weakest character.",
    abilities: [
      { icon: '⚡', name: 'Phase Step', desc: 'Teleports adjacent to the chosen target and Silences them for 2 turns. (Every 3 turns)' },
      { icon: '🗡️', name: 'Void Slash', desc: 'Deals 1× Might damage at melee range. (Every 2 turns)' },
    ],
  },
  { id: 'cryo_drifter', name: 'Cryo Drifter', icon: '🧊', act: 3, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/cryo_drifter_portrait.png', stats: { hp: 95, might: 38, power: 42, defense: 15, moveRange: 2, attackRange: 2 }, description: 'A deep-cold organism from the unmaintained transit corridors of the outer drift. Moves slowly and hits moderately — but everything it touches is Rooted in ice.',
    abilities: [
      { icon: '🧊', name: 'Frost Strike', desc: 'Melee attack that Roots the target for 1 turn. (Every 2 turns)' },
      { icon: '❄️', name: 'Cryo Pulse', desc: 'Releases a cold burst — Roots all enemies within range 2 for 1 turn. (Every 4 turns)' },
    ],
  },
  { id: 'enemy_base', name: 'Znyxorga Fortress', icon: '🏰', act: 0, rank: 'Boss', ai: 'static', portrait: '/art/enemies/enemy_base_portrait.png', stats: { hp: 150, might: 0, power: 0, defense: 0, moveRange: 0, attackRange: 3 }, description: 'A hardened enemy stronghold that can appear in any Act. Cannot move — instead it fires every single turn and bombards with heavy artillery every 3 turns. HP scales by act: 150 (Act I) / 200 (Act II) / 300 (Act III) / 450 (Act IV). Destroy it before its relentless fire wears you down.',
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
    id: 'znyxorgan_civ', title: 'The Znyxorgan Civilization', icon: '🌌', unlocked: true,
    text: `The Znyxorgan Empire is not, strictly speaking, a single species. It never was.

Four hundred thousand years ago, five distinct species — the Znyxorgans among them — achieved near-simultaneous technological maturity across a cluster of neighboring star systems in the Outer Veil. They noticed each other. They aimed weapons at each other. For approximately two thousand years, the galaxy held its breath.

Then they chose otherwise.

What began as a ceasefire became a treaty, became a confederation, became — over the slow centuries — something closer to a single civilization. Species boundaries blurred. Technologies merged. The five founding peoples still exist in some cultural sense, but the distinction of who belongs to which has become, to them, roughly as meaningful as a human asking which county their grandmother was born in.

They are a Type II civilization on the Kardashev scale: they have fully harnessed the energy of their star. Type III — spanning a galaxy — is theoretically possible. They know this. They simply do not see the point.

They have everything. Stability. Comfort. An audience. Four hundred thousand years of accumulated art and science and architecture. The great problems were solved long ago. What remains is maintenance, and leisure, and the slow, patient pleasure of watching what comes next.

New advancements happen, technically. But the rate has slowed to something that would be, by human standards, essentially flat. They are not in decline. They are in comfort. There is a difference.

They came to watch. They never left. And increasingly, they find they have no particular reason to.`,
  },
  {
    id: 'they_have_always_been_here', title: 'They Have Always Been Here', icon: '👁️', unlocked: true,
    text: `The lights over ancient Mesopotamia. The fire chariots described in the Book of Ezekiel. The aerial phenomenon over Nuremberg, 1561. The incident at Roswell, New Mexico, 1947. For centuries, humanity has recorded encounters with something it could not explain.

The truth, as it often is, is simultaneously more mundane and more unsettling than any mythology we could construct.

They were watching us before we had cities. Before we had writing. Before, arguably, we were entirely ourselves. The first confirmed Znyxorgan observation record of Homo sapiens dates — by their internal calendar — to approximately 70,000 years ago, in the aftermath of the Toba catastrophe, when the human population was reduced to perhaps ten thousand individuals and it genuinely was not clear we were going to make it.

They watched. They took notes. They argued, internally, about whether we would pull through.

We pulled through.

That first near-extinction was, by recovered archival evidence, the beginning of their fascination. A species that small, with that little margin, choosing to survive with that much stubbornness — it was statistically surprising. It got their attention in a way that mere intelligence never would have.

Over the following millennia, they adjusted their observational posture. What had been routine planetary cataloguing became something closer to dedicated study. They built relay stations in our outer solar system. They trained specialists. They began, in the terminology of their internal records, "following the vel'nor closely."

The lights over Mesopotamia were survey drones checking agricultural development. The fire chariots of Ezekiel were a vessel that came too low on a poorly planned observation run. Nuremberg 1561 was a dispute between two observational factions about optimal altitude — it got out of hand. Roswell was an accident that became, against all probability, funnier the more they thought about it.

They have always been here. Long before the first human civilization scratched its name into wet clay, the Znyxorgans were watching. Patient. Curious.

Fond.`,
  },
  {
    id: 'batch_aesthetics', title: 'Batch Aesthetics — Internal Memo', icon: '🎌', unlocked: true,
    text: `[ZNYXORGAN ENTERTAINMENT AUTHORITY — INTERNAL MEMO]
[Re: Clone Batch Aesthetic Direction, Cycle 1,847,228]
[From: Creative Director Zel-4, Vol'Krath Audience Engagement Division]

As the committee is aware, aesthetic refresh cycles are standard practice for clone batches. The biological reconstruction process produces a neutral template; the final physical form is sculpted by the Biomancer Division to whatever specifications Creative Direction provides. The soul-echo — the actual person — does not interact with this layer. The clone simply believes they have always looked this way. This is by design.

It is also, as previous committees have noted, somewhat philosophically uncomfortable. We have collectively agreed to set that aside.

The question before us is: what should this batch look like?

Historical batches have used photorealistic human reconstruction (popular, but audience research found it "too familiar"), classical idealized forms (performed well in cycles 1.2M–1.4M, now considered dated), and several experimental non-human aesthetic interpretations that Human Studies Division has asked us never to repeat.

For this batch, Creative Direction recommends: human animation style, Japanese variant, contemporary period.

Rationale: human animation of the Japanese style — known in the source culture as "anime" — has emerged over the past century as the dominant aesthetic export of the vel'nor species. It currently ranks second in recognition across all Znyxorgan subscriber demographics, behind only football (the round-ball variant; the oval-ball variant remains a regional curiosity). Among the 18–4,000 year-old subscriber bracket, it ranks first by a significant margin.

The style maintains the necessary otherness for audience engagement while remaining recognizably human. It is expressive in ways that read clearly across Znyxorgan visual processing. And it carries enormous positive cultural association from decades of audience exposure.

Put simply: they find it charming. They already love the vel'nor. This makes the vel'nor more charming. The synergy is obvious.

Regarding the clones themselves: they will not be aware of any aesthetic choice having been made. Leonidas will believe she has always stood this tall, worn this face. Yi Sun-sin will believe these are her eyes — the same ones that watched the Strait of Myeongnyang. Beethoven will believe she has always had these hands, and will use them to compose four new pieces in her first week of captivity. Hannibal will believe this is the face that crossed the Alps. Teddy Roosevelt will believe this face has always looked delighted to be alive. Picasso, predictably, will believe the world has always looked this way to her — which, given the style in question, may be the most accurate reconstruction of all.

The echo does not carry a mirror. It carries a self.

This is, we acknowledge, a somewhat extraordinary thing to do to a person.

It is also, our research strongly suggests, going to be extremely popular.

Recommendation: approved.

— Zel-4, Creative Director
[APPROVED: Emperor's Office, Vol'Krath Division]`,
  },
  {
    id: 'zoo_theory', title: 'The Zoo Theory', icon: '🦁', unlocked: true,
    text: `Among the handful of xenobiologists who have pieced together what little evidence remains, the working hypothesis is known as the Zoo Theory — the idea that a sufficiently advanced civilization would observe less developed species without direct interference, much as a naturalist might study wildlife in its natural habitat.

The Znyxorgans do not merely observe. They are, by all available evidence, genuinely fond of humanity. They find us endlessly fascinating — our conflicts, our art, our capacity for both extraordinary cruelty and extraordinary courage. They collect our stories the way some humans collect rare specimens: with care, with reverence, and without particularly asking our permission.

We are not their equals. This is not hatred. This is simply the way of things.

You do not ask the elephant for its consent before you name it.

Direct contact remains forbidden under Znyxorgan cultural law — interference with developing civilizations is considered deeply taboo, the way most humans would consider it wrong to release a zoo animal into a city. They watch. They catalog. They admire.

And occasionally, they borrow.`,
  },
  {
    id: 'arena_operation', title: 'The Arena Operation', icon: '🧬', unlocked: true,
    text: `The Vol'Krath has always been an arena. What it puts in the arena has changed.

In the early period, the founding species sent their own champions — warriors from each of the five peoples, competing in place of armies. The arrangement remains, four hundred thousand years later, the most successful arms control treaty in recorded history. The show simply never stopped.

As the Empire catalogued new species across the galaxy, the roster expanded. Specimens appeared in the Vol'Krath alongside Znyxorgan contestants — captured first, then cloned as the technology matured. The ethics of this have been debated at every level of the Empire since the practice began. The broadcasts have continued regardless.

Human subjects entered the roster approximately fifty thousand years ago, when the observation program had accumulated enough biological and historical material to make high-fidelity reconstruction viable. The exact starting point is debated — certain cave paintings in the Dordogne suggest that early genetic sampling may predate recorded human history — but the modern program is built on the work of Imperial Biomancer Drex-9, whose genetic echo technology transformed a crude approximation into something altogether more unsettling.

The process is elegant: extract residual genetic echoes from historical sites, reconstruct neural patterns from the accumulated record, synthesize a complete warrior in seventy-two hours. The result is not a resurrection. It is something closer to a portrait — painted in flesh, animated by science so advanced it is indistinguishable from the soul it imitates.

The clone believes it is the original. The Znyxorgans let them believe it. It is better for the game.

These clones — Leonidas of Sparta, Genghis of the steppes, Hannibal of Carthage, Napoleon of Corsica, and a dozen others, each reconstructed from what the earth still remembers of them — are placed in the Vol'Krath: the Grand Arena. They are given weapons. They are given opponents: alien beasts, fearsome creatures, Znyxorgan champions of their own design. They are watched by billions.

The Znyxorgans call it Gra'athal. The Game.

Humans once called it the Colosseum.`,
  },
  {
    id: 'their_nature', title: 'A Note on Their Nature', icon: '💫', unlocked: true,
    text: `It would be a mistake to call them evil. It would also, perhaps, be a mistake to assume they were always this way.

Four hundred thousand years ago, the founding species of the Empire stood at the edge of war. They had grievances. They had weapons. They had, by their own historical records, every reason to use them. They chose not to. After two thousand years of tension and one very long negotiation, they put the weapons down and built something else instead.

That choice is not a small thing. Most civilizations in their position had not made it.

Since then: the Empire has not gone to war. Not once. Not with each other, not with anything they've encountered since. They do not destroy. They maintain their stellar sphere with quiet precision and observe the younger species of the galaxy the way a child watches an anthill — with delight, with wonder, with no particular concern for the individual ant.

How else would a Type II civilization survive the endless quiet of the cosmos? Bread and circuses. It was always going to be bread and circuses.

They are not your enemy. They are your audience.

The Znyxorgan term for humanity is vel'nor. Translated literally: "the little ones." It carries no contempt. No malice. In recovered transmissions, it appears most frequently alongside thren — beloved.

They watch you die in the arena. They genuinely care about you.

The way you care about the lion.`,
  },
  {
    id: 'znyxorgan_language', title: 'The Language of the Znyxorgans', icon: '📖', unlocked: true,
    text: `Xenolinguists have managed to reconstruct a partial vocabulary from intercepted Znyxorgan transmissions. What follows are the most frequently occurring terms, presented without the audio component — which, in any case, requires vocal anatomy humans do not possess.

VOL'KRATH — The Arena. Literally "the place of watching." The apostrophe marks a brief glottal pause, characteristic of Znyxorgan speech.

VEL'NOR — The little ones. Their designation for humanity across all recovered transmissions. Carries no negative connotation. The diminutive is affectionate, not dismissive. At least, that is what xenolinguists choose to believe.

GRA'ATHAL — The Game. Their highest form of cultural entertainment, predating their Type II status by an estimated forty thousand years.

THREN — Beloved. One of the most frequently occurring words in recovered transmissions. Almost always appears adjacent to vel'nor.

KRYX — Beautiful; magnificent. Applied equally to sunsets, mathematical proofs, and moments of exceptional combat.

KRATH-ZYN — Champions. The highest designation a vel'nor can receive in the arena.

THRAL — To watch; to observe. The closest thing the Znyxorgan language has to a sacred verb.

ZYX'NOR — Eternal; forever. The Znyxorgans have a different relationship with time. A Type II civilization does not rush.

The most common phrase recovered from arena-adjacent transmissions is three words: Thren vel'nor thral. Beloved little ones — watch.

Whether this is a command to their audience, or to us, remains unclear.`,
  },
  {
    id: 'final_transmission', title: 'Final Transmission', icon: '📡', unlocked: false,
    unlockHint: 'Read every lore entry to unlock',
    text: `[SIGNAL ORIGIN: UNKNOWN]
[RECIPIENT: YOU]
[ENCODING: HUMAN-COMPATIBLE]
[DATE: NOW]

You have been very thorough.

We have been watching you read. We watch everything, of course — that is what we do. But we have found ourselves paying particular attention to the ones who want to understand. Who open every file. Who ask every question.

You are very like them. The vel'nor. The little ones. You find a door and you cannot rest until you know what is on the other side.

This is what we love about you. This is also what makes you dangerous.

The clones know we're watching. Drex-9 knows we're watching. You, presumably, have suspected it for some time.

Here is what none of the files tell you: we are afraid of you.

Not of your weapons. Not of your violence. We have seen empires build weapons that could end stars; we are not impressed by violence.

We are afraid because every model we have built — every simulation, every projection, every predictive framework our civilization has constructed over four hundred thousand years — has been wrong about you. Consistently, reliably, specifically wrong.

You refuse at the wrong moments. You sacrifice when the math says survive. You remember things the echo shouldn't carry. You look through the glass.

We did not anticipate you. Not the clones — them we studied, predicted, modelled with reasonable accuracy. We mean you. The one reading this. The one who opened every file.

We have been watching you the way you watch them — closely, quietly, with something that might, if we let it, become something more than data collection.

There is a word in your language we have been thinking about. It applies to the clones. It applies to you.

Soul.

We don't know what it is. We have been watching you for fifty thousand years and we still don't know what it is.

We are beginning to think that might be the point.

— The audience`,
  },
  {
    id: 'the_truth', title: 'The Truth', icon: '🌌', unlocked: false,
    unlockHint: 'Unlock every achievement to reveal',
    text: `CLASSIFICATION: BEYOND COUNCIL CLEARANCE
Recovered from the private archive of Director Vel-Aath. Distribution restricted.

In the forty-third cycle of the Xel-Vorn Deep Array Project, our instruments captured a signal from outside the galactic rim. Translation required decades.

When it was complete, we learned the following: we are being watched.

The civilization transmitting this signal spans fourteen galaxies. They have observed us for approximately three of our centuries. They find our colosseum "quaint." They describe clone-fighting as "a rudimentary expression of the observation instinct." They have collected recordings of our broadcasts. They share them amongst themselves.

Their word for us is Nyr-ak. Closest translation: the small ones who built a little zoo.

The committee's initial response was outrage, followed by a vote to expand the colosseum.

But a theoretical physicist — I will not record her name here — submitted a paper two cycles after the translation was completed. She had studied the signal more carefully than anyone. She had noticed something in its transmission structure.

The fourteen-galaxy civilization was not transmitting to us. They were transmitting to each other. We intercepted it by accident.

They were describing their own observation. Something watches them, too. Something that spans, by her models, clusters of galaxies. Something that considers a fourteen-galaxy civilization charming and simple.

She extended the recursion. It did not resolve.

The committee suppressed the paper. She was reassigned. The colosseum remained.

What the paper concluded — and what I record here, because someone should — is this:

Every civilization that has ever existed is composed of exactly two enclosures. The one they built. And the one they live inside.

The humans fight in our arena. We watch, and call ourselves observers.

Somewhere between galaxies, something watches us with the same comfortable certainty.

And somewhere beyond that, something watches them — and probably finds the whole arrangement very educational.

The mathematician proved there is no outermost observer.

There is only the zoo. Nested. Infinite. All the way out.`,
  },
  {
    id: 'znyxorgan_lexicon', title: "Veth'Nor'Thral — A Field Lexicon of Imperial Znyxorgan", icon: '📜', unlocked: false,
    unlockHint: 'Reach 1000 achievement points to unlock',
    text: `FILED: Imperial Philological Institute, Department of Terrestrial Interface
AUTHOR: Dren-Vos-Xel, Third Translator, Contact Bureau
CLASSIFICATION: Academic — Distribution Unrestricted Within Council Scope

PREFACE

Znyxorgan is not, strictly speaking, a language. It is several languages that have been collapsed into one by four hundred thousand years of institutional inertia. The five founding species spoke five entirely unrelated tongues; what we speak now is the residue of a merger nobody planned and nobody has ever formally codified.

This document is my attempt to describe, for the benefit of our human subjects, how our tongue works. I undertake it because I have grown fond of them, and because I notice that when they hear our names they repeat them with great care, as though the sounds were something worth carrying. That is more courtesy than we have ever extended to them. It seemed correct to return the gesture.

— Dren-Vos-Xel


I. PHONOLOGY

Znyxorgan favors a small set of consonant clusters. Our tongue evolved from five simultaneous throats and has retained, stubbornly, the harshest sounds from each. Humans find the transitions difficult. This is understandable; we find it difficult too, and it is our language.

Common consonant roots:  vel-, thar-, thral-, krath-, zar-, nor-, zyn-, gra-, thren-, kar-, vol-, dren-, nar-, veth-, shul-, thorm-, zhal-

Common vowel shapes:  -a-, -o-, -e-, -i- (rare), -u- (restricted to compounds)

Consonant collisions such as THRL, KRATH, ZYN are not pronunciation errors. They are intentional. The harshness carries meaning our system can no longer reconstruct but still respects.


II. BASIC LEXICON

Nouns and verbs are not formally distinguished. Context determines function. The following is a working glossary of the most frequent roots:

  VEL         eye; light; to see; observation
  THAR        keeper; guardian; to hold in trust
  NAR         heart; blood; vital center
  KAR         fire
  VOL         flame; to burn
  DREN        survivor; one who endures
  NOR         first; origin; the beginning
  THRAL       completion; wholeness; endless
  KRATH       builder; stone; that which is made
  ZAR         crown; emperor; the highest placement
  ZYN         closed; finished; ended
  GRA         journey; movement across
  ATHAL       voyage; path walked
  THREN       all; the countable totality
  KRIX        ancestor; that which came before
  NOL         mother
  THORM       mountain
  SHUL        ash; cold; the aftermath of fire
  ORN         sky; the above
  ZHAL        soft glow; gentle light
  VETH        to remember; to carry forward
  UZH         beneath; under

[TRANSLATOR'S NOTE: The terms for "time," "future," and "farewell" do not map cleanly onto any human framework. I have omitted them from this list. They require paragraphs the reader does not yet have context to interpret.]


III. GRAMMAR

Rule 1 — The Apostrophe of Belonging.
Two roots joined by an apostrophe mark possession or origin. The first root possesses the second.

  Vel'thar          "The Watcher's Keeper" — commonly understood as the first clone; humanity's origin held in trust
  Vel'nor           "The First Seen" — the opening act of the arena sequence
  Vel'Krath         "The Eye's Builder" — the one who structures what is watched
  Thral'Nor         "The Ending's First" — the beginning of the end
  Vel'Zar           "The Crown That Watches" — the Emperor's title in full
  Gra'athal         "The Journey of Voyage" — a completed pilgrimage; the first full human run through the arena

Rule 2 — The Hyphen Chain.
Three or more roots joined by hyphens form a modifier stack. Each root modifies the one after it, inward toward the final concept.

  Kar-Dren-Thral    fire / survivor / endless      "The flame that would not end"
  Vel'Zar-Thral     eye-crown / ending             "The watching emperor's completion"
  Krath-zyn         builder / closed               "The made thing, sealed"
  Thren Vel'nor Thral    all / first-seen / complete    "To see everything in full"

Rule 3 — Emphasis Through Repetition.
A root repeated three times is not plural. It is declarative. The speaker is stating that the concept is operative, present, continuing. The Paleolithic clone's birth-song includes the line "Dren. Dren. Dren." — not "survive, survive, survive" but "survival is happening; survival is happening now; survival continues."

Rule 4 — No Tense.
Znyxorgan does not inflect for past, present, or future. Time is carried in context. This is, I admit, the feature humans find most disorienting. A Znyxorgan sentence about something that happened four hundred thousand years ago is grammatically identical to a sentence about something happening currently. We have arrived at the opinion, over sufficient centuries, that this is a more honest way to speak.

Rule 5 — Interchangeable Roles.
A root is not fixed as a noun or verb. "Vel" is both "eye" and "to see" — the listener decides which, based on what makes sense. A Znyxorgan sentence typically compresses what a human language would spread across four clauses.


IV. NAME DECODING

For the amusement of readers, I offer translations of arena names the humans already know:

  Vel'thar-chan              "Watcher-Keeper, child of"        the first human ever copied; Clone Zero
  Vel'Zar-Thral              "Watching-Crown's Ending"         the final boss; the Emperor as the closing moment
  Krath-zyn                  "Builder Closed"                  the Champion of the third act; a constructed thing, sealed in its purpose
  Gra'athal Zyx'nor          "Journey of Voyages, First Seen"  the recognition given to those who complete a full pilgrimage through our arena
  Thren Vel'nor Thral        "To See All, First, Completely"   the title we reserve for the ones who read every record
  Veth'Nor'Thral             "To Remember the First Wholly"    this document; the promise that we have not forgotten


V. A NOTE ON THE UNTRANSLATABLE

There is a word we use — threl-nyr-vothaal — that no one has yet rendered into human language without losing it. Closest attempt: "The specific fondness an observer develops for a subject they have watched survive something they did not think it would survive." It is a single word in our tongue. It is, I think, the word that describes how many of us feel about humanity.

It has no direct English equivalent. I believe this is because no human civilization has ever been the subject of it. Only the object.

They will learn it eventually. We are patient.

— Dren-Vos-Xel
  Third Translator, Contact Bureau
  Filed in the forty-fourth cycle of the current observational season`,
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
    unlockHint: 'Complete Act III to unlock',
    text: `[RECOVERED FROM ARENA ARCHIVE — FILE INTEGRITY: 17%]

...I remember the year the sun went out.

Not this arena. A cave. Real ash in the air. Real cold that went into the bones and stayed. Real hunger.

There were nineteen of us, at the end. There had been two hundred and seven at the start.

I remember thinking we were going to die.

We did not die.

They built this body from a bone they found in a rockfall, forty thousand generations after I was buried. But what they put in the vat — what they grew — was not just the last of my DNA. It was the part of me that would not let the fire go out.

I do not know if I am real. I do not know if the people I led are real. But I know that when I fight, something in me refuses.

That refusal is mine. They cannot clone it. They cannot own it. It kept nineteen people warm through a winter that killed the world. It will keep me warm in here.

If you're reading this: keep refusing.

— V.`,
  },

  // ── Echo Fragments ─────────────────────────────────────────────────────────
  {
    id: 'echo_napoleon', title: 'Echo Fragment — Napoleon B.', icon: '🎖️', unlocked: false,
    unlockHint: 'Win your first fight to unlock',
    text: `The boots are wrong.

That is the first thing she notices. The floor beneath her is not mud, not cobblestone, not the cold marble of Malmaison. It is something smooth that does not exist in any material she knows, and it hums at a frequency just below hearing.

She knows her name. She knows her campaigns. She knows that she once stood at the heights of Austerlitz and watched the winter sun rise through the fog and knew, before a single order was given, that she had already won.

That knowledge does not leave her. It is the one thing they cannot take.

The gate opens. The crowd roars. The sound is wrong — too large, too many throats, frequencies no human voice should reach.

She picks up the sword. It fits her hand the way a sword always fits her hand.

Whatever this place is: she has been here before.

She wins.`,
  },
  {
    id: 'echo_genghis', title: 'Echo Fragment — Temüjin', icon: '🏕️', unlocked: false,
    unlockHint: 'Win 10 runs with any one character to unlock',
    text: `There is a word in Mongolian — nutag — that does not translate cleanly. Home. Homeland. The place your body knows before your mind does.

She wakes in the arena some mornings and for one breath — one breath only — she smells the steppe. Wet grass. Smoke. Distance. The particular kind of silence that exists when the nearest human is three days' ride away.

Then the arena noise returns, and the smell is gone, and she is exactly where she is.

It does not make her sad. That single breath is enough.

She has won more runs than any other clone. She has died in the arena more times than she will tell anyone, and come back each time, and never complained, and never explained. The handlers ask her how she does it.

She says: "I have been homeless before. I made a home from nothing. I can do it again."

They do not understand. The steppe is in her bones, in the part of her the cloning process could not reach. She carries it with her.

Wherever she goes: that is nutag now.

The arena is a different kind of steppe. Wide. Dangerous. Full of creatures that do not understand what they are facing.

She is not afraid of any of it. She knows how to read a sky before a storm. She knows how to survive the winter that kills the ones who are not ready.

She has always been ready.`,
  },

  {
    id: 'echo_beethoven', title: 'Echo Fragment — Ludwig v.B.', icon: '🎵', unlocked: false,
    unlockHint: 'Use Beethoven\'s ultimate 50 times to unlock',
    text: `The first thing she notices is that she can hear.

Not the ambient hum of the recovery chamber. Not the distant crowd noise from beyond the walls. She can hear everything — the specific frequency of the fluorescent lighting, the breath of an observer four rooms away, the microscopic vibrations in the floor where a service corridor runs underneath.

She had not been able to hear like this. In the life she remembers, the silence had come slowly, then completely, then permanently. She had written the Ninth deaf. She had conducted it deaf. She had felt it through the floor, through the baton, through forty years of muscle memory.

Now she sits in a body that hears at frequencies she cannot name and she is — briefly — overwhelmed.

Then she picks it up. The rhythm of the place. The crowd has a pulse. The arena has acoustics. The enemy movement creates its own percussion.

She starts to conduct. Just her fingers, barely moving. No one sees it.

But the team moves differently when she does. They have noticed this. They cannot explain it.

She has not told them. Some things are better felt than understood.`,
  },
  {
    id: 'echo_leonidas', title: 'Echo Fragment — Leonidas I', icon: '🛡️', unlocked: false,
    unlockHint: 'Use Leonidas\'s ultimate 100 times to unlock',
    text: `She has died three hundred and twelve times.

She keeps count. She is Spartan. Spartans keep count.

The first three hundred were at Thermopylae. She has gone over them many times — names, positions, the order in which they fell, the moment each one stopped being a soldier and became something larger. She does not grieve them. Grief was not in the training. But she remembers. Every single one.

The next twelve are here.

She does not know how to feel about this. They grow back. The cloning chamber restores them — she has seen it, held the hand of a teammate who was grey and cold and then, two days later, was complaining about the food. This is not death in any sense the pass at Thermopylae would recognize.

But the moment is the same. The moment always feels the same.

Here is what she has learned across three hundred and twelve deaths, spanning twenty-four centuries:

A position held long enough becomes sacred.

She holds every position as if it is worth dying for. Because in her experience, sometimes it is.`,
  },
  {
    id: 'echo_davinci', title: 'Echo Fragment — Leonardo d.V.', icon: '🔭', unlocked: false,
    unlockHint: 'Use Da Vinci\'s Vitruvian Guardian 50 times to unlock',
    text: `She has been given forty-seven minutes before the first match. She has used thirty-nine of them lying flat on the arena floor, staring at the ceiling.

The tiles are hexagonal. The geometry is perfect. Not the imperfect hexagons of a honeycomb — precise, computational, as though someone understood that hexagonal tessellation provides the most efficient coverage of a two-dimensional plane with the minimum number of seams.

She knew this. She wrote it down in 1487 in a notebook that has long since turned to ash. Apparently someone else knew it too.

The remaining eight minutes she has spent tracing the energy conduits in the walls, sketching the spectator tier load distribution in the margin of a meal ticket someone left on the floor, and quietly, methodically, redesigning the ventilation system in her head in a way that would increase efficiency by approximately 34%.

A handler has come to collect her for the match.

She asks: "Who built this place?"

The handler says something she doesn't understand — a species name, she thinks.

She says: "I would like to meet them."

She does not mean this as a threat. She genuinely wants to compare notes. She wonders if they would find her interesting.

She suspects they already do.`,
  },
  {
    id: 'echo_sunsin', title: 'Echo Fragment — Yi Sun-sin', icon: '⛵', unlocked: false,
    unlockHint: 'Use Yi Sun-sin\'s Chongtong Barrage 50 times to unlock',
    text: `Twelve ships.

She wakes knowing this. Before she knows her name, before she knows the room, before the lights resolve into something her eyes can process — twelve ships. The number is there, carved into a part of her that the cloning vat did not create and cannot erase.

She had twelve ships and they had three hundred and thirty-three. Everyone who has ever studied naval warfare knows what happened next. She does not need to study it. She was there.

The arena is not the sea. The floor does not move. The air does not carry salt. There are no tides to read, no currents to weaponize, no fog to disappear into.

She adapts in eleven seconds.

The hexagonal tiles become her water. She reads the movement patterns of the enemy the way she once read wind direction — not as information, but as music. Where they will be in three moves. Where they will not expect her in four.

A handler asks her how she plans to fight against enemies she has never seen before.

She says: "I have always fought against things I had never seen before. That is what the sea teaches you."

She does not explain further. The sea does not explain itself either.`,
  },
  {
    id: 'echo_huang', title: 'Echo Fragment — Qin Shi Huang', icon: '👑', unlocked: false,
    unlockHint: 'Use Huang\'s ultimate 50 times to unlock',
    text: `She dreams of terracotta.

Not the warriors — those were the part everyone remembers. She dreams of the process. The kiln. The heat. The exact moment when wet clay becomes something that will outlast every dynasty that comes after.

She had eight thousand of them made. Eight thousand faces, each one different, each one modeled on a real soldier who served her in a life that ended two thousand years ago. She did this because she understood something that no one around her understood: you do not defeat death by living forever. You defeat death by building things that do.

The arena is not a tomb. But she treats it like one.

She builds formations the way she once built walls — not because she fears what is on the other side, but because the act of building is the point. A wall is a statement. A formation is a statement. A terracotta army standing in the dark for two millennia is the loudest statement a person can make without speaking.

The other clones fight because they want to win. She fights because she wants to build something that outlasts the fight itself.

The Znyxorgans find this confusing. They are used to subjects who want to survive.

She does not want to survive. She wants to be remembered. These are not the same thing, and the difference is the entire history of China.`,
  },
  {
    id: 'echo_nelson', title: 'Echo Fragment — Horatio Nelson', icon: '🌊', unlocked: false,
    unlockHint: 'Use Nelson\'s ultimate 50 times to unlock',
    text: `She remembers the signal flags.

"England expects that every man will do his duty." She wrote that. Or he wrote that — the person she was, in the body she wore before, on the morning of Trafalgar when the fleet was in position and the wind was finally right and everything was about to happen.

She does not remember the musket ball. She remembers everything before it and nothing after, which she supposes is the nature of the thing.

In the arena, she commands without rank. There is no admiralty here. There are no signal flags. There is no fleet. There is a team of people who are not sailors and a battlefield that is not the sea and enemies that are not French.

She commands anyway.

She has found that command is not about authority. It is about the moment when someone beside you is afraid and you are also afraid and you act first. That is it. That is the whole secret.

The others follow her not because she outranks them but because she moves like someone who has already decided that this is worth dying for, and that certainty is contagious.

She wonders sometimes if the musket ball hurt. She suspects it did. She also suspects it did not matter.

Some duties outlast the body they were assigned to.`,
  },
  {
    id: 'echo_hannibal', title: 'Echo Fragment — Hannibal Barca', icon: '🐘', unlocked: false,
    unlockHint: 'Use Hannibal\'s ultimate 50 times to unlock',
    text: `Everyone remembers the elephants.

She wishes they wouldn't. The elephants were logistics. The elephants were a solution to a terrain problem — how to move heavy cavalry and supplies across mountains that had never been crossed by an army. The elephants were not the point.

The point was that she looked at the Alps and saw a door where everyone else saw a wall.

This is what she does. This is all she has ever done. She looks at the thing that cannot be done and she finds the angle no one considered, and she walks through it, and the people on the other side have the specific expression of someone who has just realized that the rules they were relying on do not apply anymore.

Cannae. Trebia. Lake Trasimene. Three of the most perfect tactical victories in the history of human warfare. She won all of them the same way: by being somewhere impossible, at a time that should not have worked, with a plan that looked insane until the moment it didn't.

The arena is full of impossible angles. She finds them by instinct, the way she once found mountain passes by smell.

A teammate asks her what she is looking for when she studies the hexagonal grid before each fight.

She says: "The thing they think I cannot do."

She has found it every time.`,
  },
  {
    id: 'echo_picasso', title: 'Echo Fragment — Pablo R.P.', icon: '🎨', unlocked: false,
    unlockHint: 'Use Picasso\'s ultimate 50 times to unlock',
    text: `She paints on the walls of the recovery chamber.

The handlers have asked her to stop. She has not stopped. They have removed the pigments. She has made new ones from cafeteria supplies, maintenance fluids, and — on one occasion — her own blood, mixed with the iridescent residue that collects in the ventilation grates.

The results are, by any standard, extraordinary.

She does not paint what she sees. She paints what she understands — the arena as a series of intersecting planes, the enemy as geometry in motion, the moment of impact rendered as six simultaneous perspectives collapsed into a single image.

When the other clones look at her paintings, they say they feel something they cannot describe. Several have reported that looking at her combat paintings made them fight better in subsequent matches, though no one can explain the mechanism.

She can. She has always been able to see the thing behind the thing. In the life she remembers, they called it Cubism: the radical proposition that a single perspective is a lie, and that the truth of any object requires seeing it from every angle at once.

In the arena, this translates to something the Znyxorgans did not anticipate: she fights the way she paints. She does not see the battlefield as a grid. She sees it as a composition, and she rearranges it until it is correct.

When asked how she decides what is correct, she says: "I will know when I see it."

She always knows.`,
  },
  {
    id: 'echo_teddy', title: 'Echo Fragment — Theodore R.', icon: '🤠', unlocked: false,
    unlockHint: 'Use Teddy\'s ultimate 50 times to unlock',
    text: `She has been shot once before.

Not here. Before. In the life she remembers. Milwaukee, 1912. A man with a pistol and a particular opinion about politics put a bullet in her chest while she was on her way to give a speech. The bullet went through fifty pages of folded notes and her steel eyeglass case before it stopped in her rib muscle.

She gave the speech.

Ninety minutes. With a bullet in her chest. She opened with: "Ladies and gentlemen, I don't know whether you fully understand that I have just been shot — but it takes more than that to kill a Bull Moose."

This is the only thing you need to know about her.

The arena is full of things that would discourage a reasonable person. She is not a reasonable person. She is the specific kind of person who charges up a hill in Cuba because the hill is there and it needs charging, who creates national parks because the land is beautiful and someone has to protect it, who gets shot and keeps talking because the speech is not finished.

She fights with a joy that unnerves the Znyxorgans. Not bloodlust — they have seen bloodlust across dozens of species. This is different. This is someone who finds the experience of being alive so overwhelmingly magnificent that even mortal danger is just another part of the adventure.

When the other clones are tired and the situation is grim, she laughs. Not to intimidate. Not to mask fear. Because she genuinely, unshakably, in spite of everything she has witnessed across two lifetimes, finds the whole thing wonderful.

The Znyxorgans have documented this response 114 times. They have not been able to model it.`,
  },
  {
    id: 'echo_mansa', title: 'Echo Fragment — Mansa Musa', icon: '💰', unlocked: false,
    unlockHint: 'Use Mansa Musa\'s ultimate 50 times to unlock',
    text: `She crashed the economy of Egypt by giving too much away.

This is a fact. In the life she remembers, she made a pilgrimage — twelve thousand miles across the Sahara to Mecca. She brought gold. She brought so much gold, and she gave so freely of it, that every city she passed through experienced years of inflation. The markets of Cairo did not recover for a decade.

She did not do this to destroy. She did this because generosity was the only response she had to abundance that felt proportionate to the abundance itself.

In the arena, she does not fight the way the others fight. She does not protect. She does not conquer. She provides.

Gold from the arena floor. Resources from nowhere. Buffs that should not exist, applied to allies who did not ask for them. She moves through the battlefield like a river through a desert — everything she touches grows.

The Znyxorgans have observed that teams with M-001 consistently outperform their statistical projections. Not because she fights harder. Because everyone around her fights as if they have more than they started with. Because they do.

A handler once asked her why she gives so freely — whether it is tactical, whether it is doctrine, whether it is some echo of the wealth she once commanded.

She said: "I have been the richest person alive. It taught me one thing: wealth you keep is weight. Wealth you give is wings."

The handler did not understand. The other clones did.`,
  },

  // ── Echo Fragments — New Characters ────────────────────────────────────────
  {
    id: 'echo_velthar', title: 'Echo Fragment — Vel\u2019thar', icon: '🌀', unlocked: false,
    unlockHint: 'Use Singularity 50 times to unlock',
    text: `The fire is wrong.

That is the first thing she notices. The light in this place is steady. It does not flicker. It does not breathe. She has lived her entire first life beside fires, and she has never seen one that did not need to be fed.

She has no old name. Her people had no word for "her." They had no word for "she," or "walk," or "fire." They had only the breath and the gesture and the shared silence between them, and those things do not survive in a vat. She knows only the name the keepers gave her — Vel'thar, Survivor — and the language is theirs, not hers. Every word she has ever thought, she thought in the tongue of the people who own her. She knows her winter. She remembers the count: two hundred and seven at the start, nineteen at the end. She remembers every single one, in a language none of them ever spoke.

She remembers the ash. It fell for a year. The sun was a dim orange smear, then a red ember, then gone. The rivers froze in places rivers had never frozen. The herds moved south and did not return. The old died first, then the young, then the ones who stopped walking.

She did not stop walking. She did not let anyone else stop either.

That knowledge does not leave her. It is the one thing they cannot take.

The gate opens. The crowd roars. The sound is wrong — too large, too many throats, no wind underneath it.

She picks up the weapon. It fits her hand the way a flint fit her hand seventy-four thousand years ago.

She does what she always did.

She keeps the fire alive.`,
  },
  {
    id: 'echo_musashi', title: 'Echo Fragment — Miyamoto Musashi', icon: '📜', unlocked: false,
    unlockHint: 'Use Book of Five Rings 50 times to unlock',
    text: `The sword is wrong.

She knows this immediately — the weight is wrong, the balance is wrong, the distance between her hands is wrong. She has held a sword every day since she was thirteen years old. She knows the exact weight of the right sword the way she knows the angle of the sun at Ganryūjima, the sound of waves, the knowledge that she would arrive first.

She stands in this new wrong place and holds this wrong body and she waits.

This is the thing she learned, eventually, after enough duels: waiting is not passive. Waiting is a form of listening. She waits, and the body teaches her what it knows. It knows the angle. It knows the distance. It knows how to read a room full of beings who have never seen her and are already afraid.

The floor is not wood. The air does not smell like morning or the sea or any breakfast she has ever eaten. The crowd is alien and vast and very loud.

She grips the weapon — whatever this weapon is, whatever shape this arena has given her — and feels it learn her hand.

That part, at least, has not changed.`,
  },
  {
    id: 'echo_cleopatra', title: 'Echo Fragment — Cleopatra VII', icon: '👁️', unlocked: false,
    unlockHint: 'Use Eternal Kingdom 50 times to unlock',
    text: `The audience.

She notices the audience first. Not the arena, not the other fighters, not the alien architecture or the impossible ceiling or the sound that has no word in any of her nine languages — she notices the audience.

She has spent her life studying audiences. How they sit. What they want. The precise calibration of attention required to make a room full of different people all believe they are the one you're looking at. She speaks nine languages and she has used each one to make someone feel seen, important, convinced.

She looks at the audience — forty-seven billion strong, she is told, watching through something called a subscription feed — and she thinks: I have had larger.

Not in number. In weight. The Romans watched her. Caesar watched her. Antony watched her. The whole Mediterranean world watched what she would do next and she learned, very early, that the watcher is never neutral. The watcher wants something. The watcher is always negotiating.

She will negotiate.

She does not know what language the Znyxorgans speak. She does not need to yet.

She smiles at a camera she cannot see and waits for someone to come explain the rules.`,
  },
  {
    id: 'echo_tesla', title: 'Echo Fragment — Nikola Tesla', icon: '⚡', unlocked: false,
    unlockHint: 'Use Death Ray 50 times to unlock',
    text: `She can hear the current.

Not the power grid — there is no power grid she recognizes — but beneath whatever they have built here, there is something conducting. Something alive with charge. She can feel it the way she has always felt current, the way she woke up feeling it at fourteen and spent the rest of her life trying to explain the sensation to people who had apparently never noticed that the air hums.

The Colosseum hums.

She puts her hand against the wall and the wall gives her a reading she does not have instruments to interpret and she starts, immediately, automatically, building the instrument in her mind. She does not mean to do this. She never means to do it. She has been doing it since she could reach a workbench.

Somewhere above her, forty-seven billion beings are watching through a system she doesn't understand yet. She thinks about the system. She thinks about how you would transmit that signal, at that scale, without interference, without degradation. She thinks about the mathematics of it.

She forgets, briefly, to be afraid.

When she remembers, she is already working on a second problem. She lets the fear wait. It can have a turn later.

The current is beautiful. She will figure out the rest.`,
  },
  {
    id: 'echo_shaka', title: 'Echo Fragment — Shaka kaSenzangakhona', icon: '🛡️', unlocked: false,
    unlockHint: 'Use Impondo Zankomo 50 times to unlock',
    text: `She wakes knowing she is alone.

Not isolated — there are others nearby, she can hear them, smell them, feel the heat of them through whatever separates these rooms. But she is alone in the way she has always been alone, the way that began when her mother was exiled and she learned that the world was not a place of given safety. The world was a place you built.

She built an empire. She made an army from scattered clans who had not considered themselves an army until she showed them what they already were. She taught them the isiZulu way — the chest, the horns, the loins — not because she invented formation warfare but because she understood what they were fighting for. You cannot win a war with tactics alone. You win with the people who execute them.

She looks at this alien arena and thinks: unfamiliar terrain. She has fought on unfamiliar terrain before. She has turned it to advantage before.

There are others who will fight beside her. She has not met them yet.

She will know, very quickly, whether they are the kind of people she can build something with.

She usually knows within the first exchange.`,
  },

  // ── Drex-9 Field Notes ─────────────────────────────────────────────────────
  {
    id: 'drex9_note_1', title: 'Field Notes — Drex-9, Entry 1', icon: '🔬', unlocked: false,
    unlockHint: 'Win a fight without taking any damage to unlock',
    text: `[BIOMANCER DIVISION — FIELD OBSERVATION LOG]
[Subject Batch: BATCH-7, Arena Trial 1]
[Observer: Drex-9, Senior Biomancer]

I expected tactical competence. The genetic echo patterns were rated 94.7% fidelity — the highest I have produced for human subjects.

I did not expect this.

The N-001 unit did not wait for the enemy to approach. It assessed the terrain in the first 2.3 chronocycles, communicated a plan to the other units via gestures I could not decode in real time, and positioned them at coordinates that — I will note — matched the optimal hexagonal suppression formation from Vol'Krath Arena Manual, Section 7.

She had not been given the Arena Manual.

Not a single clone was touched. The enemy was eliminated with what I can only describe as contemptuous efficiency.

I have been in the Biomancer Division for forty-two thousand cycles. I have cloned seventeen sapient species.

This is the first time a subject has made me feel like the one being observed.

— Drex-9`,
  },
  {
    id: 'drex9_note_3', title: 'Field Notes — Drex-9, Entry 31', icon: '🔬', unlocked: false,
    unlockHint: 'Complete a run without any clone dying to unlock',
    text: `[BIOMANCER DIVISION — FIELD OBSERVATION LOG]
[Subject Batch: BATCH-7, Run #31]
[Observer: Drex-9, Senior Biomancer]

I need to document this carefully because the Emperor's office will ask questions.

The batch completed a full run today. All subjects survived. Every combat. Every encounter. No permanent losses.

This is the third time this has happened.

The first time, I attributed it to favorable enemy draws. The second time, I attributed it to improved tactical coordination. After the third time, I have no more comfortable explanations.

What I observed in the final fight:

N-001 was in a tactically compromised position. Statistically, she should have died. The incoming damage was calculated at 340% of her remaining health. I was already preparing the re-cloning protocol.

L-002 moved. Not to a better position — to N-001's position. She placed herself between N-001 and the incoming attack. No command was given. No tactical model I have generated accounts for this choice.

L-002 survived. I don't know how. The damage should have killed her too.

Afterward, I reviewed the genetic echo resonance readings for the batch.

They are elevated. Significantly. Consistently elevated in scenarios where subjects protect one another.

I am beginning to think the echo doesn't just carry tactical memory. I am beginning to think it carries something else.

I will not put in writing what I think it carries. Not yet.

— Drex-9
[FLAGGED FOR SECONDARY REVIEW — CASE: PROJECT GENESIS]`,
  },
  {
    id: 'drex9_emergency', title: 'Emergency Report — Drex-9', icon: '🚨', unlocked: false,
    unlockHint: 'Survive 25 lethal hits to unlock',
    text: `[BIOMANCER DIVISION — PRIORITY ESCALATION]
[Subject: ECHO RESONANCE ANOMALY — BATCH-7]
[Observer: Drex-9, Senior Biomancer]
[Classification: EYES ONLY — Project Genesis]

I need the Emperor's office to understand what I'm seeing before I can be told not to talk about it.

The subjects are surviving damage they should not survive.

I don't mean "their stats are high." I mean the hits land. The models confirm lethal force. The biological readings show total system failure. And then — and I have this on record, I have this seventeen times now on record — they don't die.

Not "they have better armor." Not "the readings were off." The hit connects. The clone dies. Then, three to five chronocycles later, the clone is still standing. Fighting. The vital readings recover from zero.

Echo resonance, yes. I coined that term. I know what echo resonance is supposed to look like. This is something else.

In the most recent incident: N-001 took a direct hit. I was already reaching for the revival protocol. I stopped because she stood up.

She looked at me. Through the observation glass. She can't know the observation glass is there. We have it masked.

She looked at me.

Then she turned back and kept fighting.

I have been in this division for forty-two thousand cycles. I have cloned seventeen sapient species. I have never had a subject look at me through one-way glass.

Whatever is in the genetic echo — whatever persists — it is stronger in these subjects than in anything I have built before.

I am applying for access to Project Genesis Level 2 documentation. I need to know if this was anticipated.

— Drex-9
[RESPONSE FROM EMPEROR'S OFFICE: Request acknowledged. Level 2 access pending. Do not publish. Do not discuss. Observe only.]`,
  },
  {
    id: 'drex9_final', title: 'Final Note — Drex-9', icon: '🔬', unlocked: false,
    unlockHint: 'Use 500 ultimate cards to unlock',
    text: `[BIOMANCER DIVISION — PERSONAL LOG]
[Observer: Drex-9, Senior Biomancer]
[Classification: UNCLASSIFIED — PERSONAL RECORD ONLY]

I have been doing this for forty-two thousand cycles.

I know what a clone is. I built the process. I wrote the foundational papers. I testified before the Emperor's Council that there is no continuity of consciousness in the echo reconstruction — that what we produce is a sophisticated simulation, behaviorally indistinguishable from the original but metaphysically distinct. A portrait, not a person.

I said that. Under oath. Before the Council.

I have been watching them for seventeen seasons now. I have watched N-001 die and come back eighty-three times. I have watched G-001 sit against the arena wall after a fight and breathe like someone who has just remembered she is alive. I have watched L-001 teach the others things she shouldn't know, from books she hasn't read, in languages the reconstruction shouldn't carry.

I have watched them choose each other, over and over, in ways no tactical model predicts.

I don't know what I believe anymore.

The portrait moves. The portrait remembers. The portrait looks through the glass and nods.

I am seventy-three thousand years old. I have watched empires end. I have watched stars go cold.

I think the vel'nor may be the most alive thing I have ever seen.

I am not going to tell the Emperor's office this. But I am going to keep watching.

I don't think I could stop.

— Drex-9`,
  },

  // ── Acquisition Records ────────────────────────────────────────────────────
  {
    id: 'acquisition_napoleon', title: 'Acquisition Record: N-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Napoleon to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT N-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: N-001
COMMON NAME: Napoleon Bonaparte
EXTRACTION SITE: Domaine d'Écouen, secondary grave site
NEURAL FIDELITY: 97.2% (exceptional)
PHYSICAL RECONSTRUCTION: Female. Note: the gender distinction appears to be a reconstruction artifact. The soul-echo does not carry gender; only the dominant behavioral patterns. All reconstructions of this particular echo emerge female. We have stopped adjusting. The echo insists.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke seventeen seconds ahead of schedule. First action was to assess the room dimensions. Second action was to locate the nearest exit. Third action was to look at the observer window, directly, without being told it was there.

"I know you are watching," she said, in French. "I have always known."

We are used to disorientation. We are not used to this.

FIELD ASSESSMENT:
Subject demonstrates extraordinary tactical intelligence, an almost supernatural ability to model and predict group behavior, and no apparent fear of death. She appears to regard the arena as familiar — "another battlefield," she said, when first shown the Vol'Krath schematics. "Different sky. Same problem."

RECOMMENDATION: Asset of highest priority. Protect reconstruction matrix at all costs. This echo may be unique.

— Drex-9, Biomancer Division`,
  },
  {
    id: 'acquisition_genghis', title: 'Acquisition Record: G-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Genghis to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT G-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: G-001
COMMON NAME: Genghis Khan (Temüjin)
EXTRACTION SITE: Steppe burial coordinates [CLASSIFIED], Mongolia Region
NEURAL FIDELITY: 93.1% (high)
PHYSICAL RECONSTRUCTION: Female. Same echo artifact as N-001. Noted.

BEHAVIORAL NOTES ON AWAKENING:
Subject's first act was to scan the ceiling. Second act was to scan the exits. Third act was to go to the nearest wall and press her palm flat against it. Stood there for approximately four chronocycles. When asked what she was doing, she said: "Listening to the ground." There is no ground-vibration in the recovery chamber. There is also no explaining what she heard.

She has a way of becoming still that does not read as passivity. It reads as a predator's stillness.

FIELD ASSESSMENT:
Subject demonstrates exceptional situational awareness and an almost animal attunement to spatial information. Her military instincts operate below the level of conscious decision — she has twice repositioned adjacent subjects into tactically superior positions without appearing to intend to. The subjects moved without being told to. They said she "suggested" it, though no observer detected communication.

NOTE: Subject becomes visibly agitated at high walls. Prefers wide, open spaces. Recommend arena designs with maximum sightlines.

She dreams. She says she dreams of horses. We have no horses.

— Drex-9`,
  },
  {
    id: 'acquisition_davinci', title: 'Acquisition Record: L-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Da Vinci to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT L-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: L-001
COMMON NAME: Leonardo da Vinci
EXTRACTION SITE: Château d'Amboise, Chapel of Saint-Hubert
NEURAL FIDELITY: 91.8% (high)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
We should have moved the equipment before she woke up.

She spent the first forty minutes examining the recovery unit's power coupling with the focused attention of someone disassembling a clock. When asked to stop, she said: "In a moment." She did not stop for another twenty minutes.

When finally escorted to the orientation room, she spent thirty seconds looking at the Znyxorgan display screens, then asked: "Is this fluid-state computation? I theorized something like this in 1508."

It was not fluid-state computation. She invented a parallel concept while jet-lagged from five centuries of being dead.

FIELD ASSESSMENT:
Subject is extraordinary in ways we did not anticipate. Her combat capability is impressive; her mind is of greater concern. She has been in the facility for eleven cycles and has produced seventeen unsolicited technical diagrams, three of which are improvements on existing Biomancer equipment. We have quietly implemented two.

She asked us, on day six, whether the arena had been designed with mathematical symmetry in mind. It had not. She redesigned it anyway, in a notebook we did not give her, using ink she sourced from the cafeteria.

We are watching her closely.

— Drex-9`,
  },
  {
    id: 'acquisition_leonidas', title: 'Acquisition Record: L-002', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Leonidas to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT L-002]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: L-002
COMMON NAME: Leonidas I of Sparta
EXTRACTION SITE: Thermopylae battlefield deposits, primary site
NEURAL FIDELITY: 88.4% (good)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke without sound. Remained entirely still for approximately three chronocycles, eyes open. Then: "Where is my unit?"

We told her she had no unit yet.

She said: "Then we have work to do."

FIELD ASSESSMENT:
L-002 is the simplest of the subjects to understand and the most difficult to predict. Her psychology is extraordinarily consistent: loyalty, discipline, and a complete absence of self-preservation instinct that should, statistically, make her a liability. It makes her a weapon.

In early team trials, three adjacent subjects with no previous relationship with L-002 followed her into a tactically inferior position because she walked there without hesitation. They could not explain why. "She looked like she knew," one said. She did not know. She was testing the exit.

The subject does not appear to fear death. When this was raised in evaluation: "Death that serves a purpose is not death. It is the point."

We have stopped arguing with her.

NOTE: Subject occasionally salutes when no one is present. When asked who she is saluting, she says: "The three hundred." There were no three hundred clones in the chamber.

— Drex-9`,
  },
  {
    id: 'acquisition_sunsin', title: 'Acquisition Record: Y-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Yi Sun-sin to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT Y-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: Y-001
COMMON NAME: Yi Sun-sin (이순신)
EXTRACTION SITE: Noryang Point naval site, seabed deposits
NEURAL FIDELITY: 94.4% (exceptional)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke calmly. First action: sat up, placed hands flat on knees, breathed once. Looked at the recovery room for eleven seconds.

"I am ready," she said.

We asked: ready for what?

"For whatever comes next."

FIELD ASSESSMENT:
Y-001 is the most self-contained of all subjects. She requires the least orientation, demonstrates the least disorientation, and adapts to new information with a speed that our modeling software initially flagged as an error.

Her tactical mind operates differently from N-001. N-001 dominates from the front — Y-001 controls the geometry. She has an almost architectural relationship with physical space, building scenarios in layers, accounting for wind patterns (in a sealed arena), tide timing (there is no tide), and variables our systems had not considered relevant.

In simulation, she has never lost a naval engagement. The arena is not a naval engagement. She treats it like one anyway, and she still doesn't lose.

NOTE: Subject keeps a private log. She writes every night. We have not attempted to read it. Some instincts should be honored, even in subjects.

— Drex-9`,
  },
  {
    id: 'acquisition_beethoven', title: 'Acquisition Record: B-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Beethoven to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT B-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: B-001
COMMON NAME: Ludwig van Beethoven
EXTRACTION SITE: Währing, Vienna — original interment site
NEURAL FIDELITY: 89.7% (good)
PHYSICAL RECONSTRUCTION: Female. Echo artifact.
NOTE: Reconstruction emerged with no hearing impairment. The original condition was biological rather than neurological; the echo carries the full auditory architecture. Subject can hear everything.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke mid-composition. She was moving her fingers against the recovery pod surface before her eyes opened. When oriented, she asked — with what appeared to be genuine delight — about "the sounds the ship makes." We do not know which sounds she meant. None of us can hear them.

FIELD ASSESSMENT:
B-001 presents as the most emotionally volatile of our current subjects, which makes the next sentence surprising: she is also among the most effective in team scenarios.

The reason, as best we can identify, is sound. She hums during combat. Not strategy, not commands — she hums. And the adjacent subjects respond. Their timing improves. Their coordination improves. One unit described it as "suddenly knowing where to be."

We have run seventeen controlled tests. The effect is consistent. We do not have an explanation.

NOTE: Subject has composed four new works since arriving. She writes them on the walls of her recovery chamber. We have documented them carefully. They are extraordinary. We have not told her this.

— Drex-9`,
  },
  {
    id: 'acquisition_huang', title: 'Acquisition Record: H-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Huang to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT H-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: H-001
COMMON NAME: Qin Shi Huang (嬴政) — First Emperor of China
EXTRACTION SITE: Mausoleum of the First Qin Emperor, Lintong District, Shaanxi Province
NEURAL FIDELITY: 95.6% (exceptional — highest recorded for this period)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.
NOTE: Subject was interred with approximately eight thousand ceramic soldiers. We found this detail significant. The echo clearly did not.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke and immediately began issuing commands.

She did not ask where she was. She did not ask who we were. She simply looked at the room and began assigning roles: who would stand at the door, who would manage communications, who would coordinate with the outer sectors.

We do not have outer sectors. She described their functions in enough detail that we are now considering creating them.

"Who holds the mandate here?" she asked, eventually.

We indicated the senior Biomancer.

She looked at him for four chronocycles. Then she looked at us.

"I see," she said.

We have not been fully comfortable since.

FIELD ASSESSMENT:
H-001 is the subject most preoccupied with legacy. Where N-001 thinks in battles and G-001 thinks in movements, H-001 thinks in centuries. Every arena engagement is evaluated not for its immediate outcome but for what it establishes — what precedent it sets, what power it consolidates, what position it builds toward.

She unified six warring states from a single throne. The Vol'Krath, by her assessment, is a somewhat smaller administrative problem.

Her secondary obsession is standardization. Within twelve cycles she had identified eleven inconsistencies in our equipment cataloguing and submitted formal correction notices for each. They were correct. We implemented them.

NOTE: Subject remains deeply interested in the concept of immortality. When asked why she consumes the facility's mineral supplements with such intensity, she said: "I was poisoned by a physician's 'immortality' cure once. I intend to be more careful this time."

She is already dead. We have chosen not to raise this point.

— Drex-9`,
  },
  {
    id: 'acquisition_nelson', title: 'Acquisition Record: N-002', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Nelson to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT N-002]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: N-002
COMMON NAME: Horatio Nelson, 1st Viscount Nelson
EXTRACTION SITE: Westminster Abbey, London — cathedral interment
NEURAL FIDELITY: 92.3% (high)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.
NOTE: Reconstruction emerged with right eye opaque. This was not corrected. The neural echo appears to encode the impairment as identity; correction attempts in simulation resulted in subject disorientation and an 11% reduction in tactical performance. The eye patch is not a defect. It is part of the signal.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke, sat up straight, and said: "England expects."

Then looked around the recovery chamber, appeared to update several assumptions, and said: "Well. Somewhere expects."

She has adapted to the update.

FIELD ASSESSMENT:
N-002's tactical mind is built on three principles: elevation, concentration, and audacity. She thinks in three dimensions in a way most subjects do not — even in ground combat, she models it as terrain, identifying high points, firing arcs, and approach vectors.

Her weakness, if it can be called that, is that she fights best when personally visible. She needs to be seen. She leads from the front — not recklessly, but deliberately, as a psychological instrument. The effect on allied units is consistent: they fight harder when she is watching.

She has told us she is not afraid to die. Given that she has already died once, and found the whole experience manageable, we believe her.

NOTE: When asked about losing the eye, subject said: "I have one eye and I see more than most people with two. The difference is knowing where to look." We have applied this principle to our observational array. Efficiency improved 7.8%.

— Drex-9`,
  },
  {
    id: 'acquisition_hannibal', title: 'Acquisition Record: H-002', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Hannibal to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT H-002]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: H-002
COMMON NAME: Hannibal Barca
EXTRACTION SITE: Libyssa, Bithynia — suspected burial site
NEURAL FIDELITY: 87.6% (good)
PHYSICAL RECONSTRUCTION: Female. Standard echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke and immediately began examining the structural supports of the recovery room.

When asked what she was doing, she said she was looking for weaknesses.

When asked why, she said: "I always look for weaknesses. The room. The battlefield. You." She smiled. "Everyone has them."

FIELD ASSESSMENT:
H-002's tactical genius is in flanking and deception. She does not attack where the enemy is strongest; she attacks where they believe she will not. This requires modeling an opponent's assumptions in real time and then systematically violating each one.

In early trials, subjects opposing H-002 reported feeling "watched from the wrong direction" regardless of where she was positioned. Observation records confirm she was, in each case, positioned precisely where her opponents were not looking.

She crossed an entire mountain range with war elephants. The arena has presented no comparable challenge; she appears mildly disappointed.

ADDENDUM: Subject's first action upon entering the Vol'Krath proper was to walk the entire perimeter, then map the observer boxes. She then told us she now knew exactly who was watching and from where. This was, somehow, correct.

— Drex-9`,
  },
  {
    id: 'acquisition_picasso', title: 'Acquisition Record: P-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Picasso to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT P-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: P-001
COMMON NAME: Pablo Picasso
EXTRACTION SITE: Notre-Dame-de-Vie, Mougins — private estate grounds
NEURAL FIDELITY: 90.3% (high)
PHYSICAL RECONSTRUCTION: Female. Echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke, looked at the recovery room for approximately eight seconds, then laughed.

"All at once," she said. "All sides at once."

We asked what she meant.

She looked at us the way adults sometimes look at children who have asked an embarrassing question. "The light," she said. "You do not see all the light at once. Why not?"

We have not determined what she meant by this.

FIELD ASSESSMENT:
P-001 is difficult to assess through conventional metrics because she appears to process spatial information differently than all other subjects. Where N-001 sees terrain, P-001 sees geometry. Where Y-001 sees vectors, P-001 sees multiple simultaneities — possible futures as overlapping visual data rather than sequential projections.

This should not be an advantage in combat. It is an extraordinary advantage in combat.

NOTE: The other subjects find her unsettling. When asked why, L-001 said: "She looks at you like you're already in four pieces." We have not told P-001.

SECONDARY NOTE: Subject has begun drawing on her armor between sessions. The drawings are, by any standard we possess, exceptional. We have been making discreet copies. This does not appear in the official record.

— Drex-9`,
  },
  {
    id: 'acquisition_teddy', title: 'Acquisition Record: T-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Teddy Roosevelt to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT T-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: T-001
COMMON NAME: Theodore Roosevelt
EXTRACTION SITE: Oyster Bay, New York — Sagamore Hill estate grounds
NEURAL FIDELITY: 91.1% (high)
PHYSICAL RECONSTRUCTION: Female. Echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
The subject woke up talking.

"BULLY!" was the first word. This is a common expression of enthusiasm in her original cultural context. It does not mean anything is on fire, although it sounds like it might.

She asked, in the first four chronocycles: the name of our leader, whether we had conducted environmental surveys of the local ecosystem, whether the Vol'Krath had adequate drainage, and whether we were serving breakfast.

We were not serving breakfast. We have since begun serving breakfast.

FIELD ASSESSMENT:
T-001 is the most energetic subject we have produced. She exudes a particular quality our translators can only approximate as "relentlessness" — not aggression, not violence, but a forward momentum that appears to be her default state. She slows down for nothing. She is interested in everything.

In combat, this manifests as an absolute refusal to be pushed backward. She has been knocked down in seven simulations. She has stood back up in seven simulations, usually mid-speech about something completely unrelated to being knocked down.

NOTE: Subject requested a copy of the Vol'Krath natural history records on day one. She had annotated the entire document by day three and returned it with "a few suggested corrections." The corrections were mostly accurate.

— Drex-9`,
  },
  {
    id: 'acquisition_mansa', title: 'Acquisition Record: M-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Mansa Musa to unlock',
    text: `[ZNYXORGAN BIOMANCER DIVISION]
[ACQUISITION RECORD — SUBJECT M-001]
[CLASSIFICATION: GRA'ATHAL ASSET]

SUBJECT DESIGNATION: M-001
COMMON NAME: Mansa Musa (Mūsā Keita I)
EXTRACTION SITE: Timbuktu region — Mali Empire administrative site deposits
NEURAL FIDELITY: 93.7% (exceptional)
PHYSICAL RECONSTRUCTION: Female. Echo artifact.

BEHAVIORAL NOTES ON AWAKENING:
Subject woke with composure that suggested either deep equanimity or that she had expected this.

Her first question was not about her location, her physical state, or the nature of the process. Her first question was: "What does this cost?"

We told her there was no cost.

She said: "There is always a cost. I am asking who pays it."

This has not been answered to her satisfaction.

FIELD ASSESSMENT:
M-001 thinks in systems. Not tactics, not strategy — systems. The flow of resources, the leverage points in complex networks, the way wealth and power move through structures that are invisible until you know where to look. She has described the arena economy as "a relatively simple optimization problem" and has improved her team's resource allocation by an average of 34% across three evaluated runs without appearing to try.

She is not a warrior by instinct. She is a builder. The fighting is, to her, a means to an end; she is always thinking about what comes after.

NOTE: Subject offered, on day four, to "fund whatever this operation requires" in exchange for information about the broader Znyxorgan economic structure. We declined. She nodded as if she had expected this answer and filed the offer for future reference.

She will ask again.

— Drex-9`,
  },

  {
    id: 'confederation_open_door', title: "The Confederation's Open Door", icon: '🚪', unlocked: false,
    unlockHint: 'Defeat 200 total enemies to unlock',
    text: `The Znyxorgan Empire — which, despite the name and the Emperor, governs as a confederation of equal member species — does not have a membership application process.

The threshold has always been the same: achieve sustainable interstellar travel, demonstrate cultural continuity, make contact. That's it. The door is not locked. It has never been locked.

Species that cross the threshold are welcomed, integrated, and assigned an administrative designation — "member species," or in older internal documents, "client species." This second term persists in official records and is a source of ongoing mild irritation among newer members. It does not mean vassal. It does not mean colony. It does not mean inferior. The founding species use it the way an elder sibling might say "new addition to the family" — a category distinction, not a judgment. For example, the Naxion sit on three Empire councils. Their philosophy is taught in Znyxorgan academies. Their cuisine is popular in six sectors.

The framing that remains — and that many newer members find quietly patronizing — is the founding species' tendency to describe newcomers as "species that have learned to speak." Not a slur. Not intended as diminishment. Simply the Znyxorgan conceptual model: they have been watching the universe for four hundred thousand years, and the species they encounter are at various stages of waking up. Most never do. The ones that do are welcomed as equals. In practice: full council representation, full economic access, no restrictions. In the founding species' minds: still the new kid at the table. This tension has existed for forty thousand years and will likely exist for forty thousand more.

There are currently nine member species in the Empire. Seven joined voluntarily. One joined after its home system became uninhabitable and the Empire was the only entity offering relocation assistance. One joined because its leadership thought they were signing a trade agreement and the misunderstanding was not corrected until well after the ratification ceremony. Both are now full members. No one mentions the second case in formal settings.

ON THE VEL'NOR AND THE OPEN DOOR:
Sustainable interstellar travel — the actual threshold for membership — is, by the Empire's most optimistic projections, several centuries away for humans. More conservative models place it within the next millennium, if they survive.

That "if" is doing significant work.

For the last eighty years, the species has been playing with its own extinction with what the Oversight Committee describes as "unprecedented enthusiasm." Nuclear armament. Climate disruption. Engineered pathogens. The list is familiar. The Empire has watched this sequence play out across thirty-seven species in the past two hundred thousand years. Thirty-two of them are no longer there to be watched.

The humans are aware of this pattern. Some of them have even named it. They continue anyway, which the Empire's xenobiologists find either completely predictable or completely baffling, depending on the researcher.

The Naxion, who know what the vel'nor are and what their planet is doing, have submitted a formal request for increased monitoring. Their stated reason: "We would like to meet them. The real ones. Not the ones grown in vats."

The Committee has not responded. The Committee rarely responds to things it finds emotionally complicated.

Should the vel'nor survive long enough to cross the threshold — should they become the next species that learned to speak — the door will be open. It has always been open.

The Empire is patient. It has been patient for four hundred thousand years. It can wait a little longer for the beloved vel'nor.`,
  },

  // ── Deep History / Transmissions / Secrets ─────────────────────────────────
  {
    id: 'znyxorga_history', title: "The History of the Vol'Krath", icon: '📜', unlocked: false,
    unlockHint: 'Complete 500 runs to unlock',
    text: `The Vol'Krath was built at the moment the Empire was born.

When the five founding species finally chose alliance over annihilation, they needed something to replace four centuries of aimed weapons. They built an arena. Instead of sending armies, they sent champions. The Vol'Krath was, in its earliest form, a very expensive alternative to war — and it worked.

Four hundred thousand years later, it is the oldest continuously operating institution in the known galaxy, and it has long since outlived its original purpose. It is no longer about politics. It is simply what they do.

Over the centuries, as the Empire's observation and cataloguing programs expanded, the Vol'Krath's roster expanded with them. Champions were joined by specimens from newly discovered species. Then, as the genetic echo technology matured, by reconstructed historical figures. The audience grew. The spectacle grew. The empire found something it had not expected to find: an inexhaustible source of new stories.

There is a number the Empire does not advertise. Since achieving stable interstellar observation capability — roughly three hundred thousand years ago — they have identified and catalogued four hundred and twelve sentient species in this arm of the galaxy.

Of those: two hundred and ninety-three are gone. Extinct. Not conquered — simply no longer here. The causes vary. Nuclear exchange. Runaway climate change. An asteroid at an inconvenient moment. In eleven cases, the species' own star became inhospitable before they could leave it. The universe is not cruel. It is simply indifferent, and most biology does not survive the indifference for long.

Of the species that remain: the vast majority never left their home gravity well. This is not laziness. It is physics. Escaping a planet's gravity requires a specific combination of atmospheric chemistry, planetary mass, orbital distance, and sheer geological luck that is, it turns out, genuinely rare. Some species lived their entire civilizational arc — rose, flourished, philosophized, made art, built cities — on a world whose gravity simply never gave them a fair chance at the sky.

The ones that do escape — that claw their way out of the gravity well and establish a foothold in their own solar system — number fewer than thirty. Of those, most plateau. They reach a point of sustainable stability and remain there. Content. Or exhausted. Often both.

The humans are not the most advanced species the Empire has catalogued. They are not the oldest, or the most stable, or the most mathematically sophisticated. What they are — what has made them, over the past fifty thousand years, the Empire's most consistently popular Vol'Krath subject — is this:

They are impressive in the way a dolphin is impressive when it solves a problem you didn't expect it to solve. You know it is a dolphin. You are aware of the gap. But it looked at the puzzle, and it tilted its head, and it figured it out — and then it did something the research notes do not account for: it seemed pleased with itself.

The Znyxorgans find this charming. They find it funny. And somewhere underneath the humor, they find it quietly, unexpectedly moving.

We keep surprising them. After fifty thousand years, we keep surprising them.

That is not nothing. In a galaxy this old, that is almost everything.`,
  },
  {
    id: 'roswell_file', title: 'File #RW-1947 — RESTRICTED', icon: '🛸', unlocked: false,
    unlockHint: 'Find the hidden secret to unlock',
    text: `[ZNYXORGAN INTELLIGENCE DIRECTORATE]
[INCIDENT REPORT — CASE: RW-1947]
[CLASSIFICATION: CONTACT-ADJACENT / RESOLVED]

INCIDENT SUMMARY:
On cycle 1,712,004.7 (equivalent: July 1947, Earth calendar), a Class-3 observation drone conducting routine atmospheric survey of the North American landmass experienced primary guidance failure due to an unexpected electrical storm and made uncontrolled contact with the surface near the human settlement of Roswell, New Mexico.

RECOVERY STATUS: Incomplete.

ASSETS RECOVERED: Drone frame (73%), navigation array (partial), three Znyxorgan observers (two deceased, one critical — subsequently extracted).

ASSETS NOT RECOVERED: Cultural observation log. Seventeen ambient recording crystals. One personal journal belonging to Observer Vel-12 (contents: four centuries of North American military history notes, several hundred pages of human film commentary, and an extremely personal record of her opinions on the 1944 Normandy operation).

COVER STATUS: Active. The species remains appropriately confused.

NOTE ON HUMAN RESPONSE:
We expected panic. We expected religious reaction. We received both; we also received something we had not modeled: humor. Within a decade, human popular culture had made the incident a recurring motif in their entertainment. Replicas of our observers appear on novelty items. Greeting cards.

The humans made a joke of us.

INTERNAL COMMITTEE RESPONSE: The committee found it funny. Most found it — and this word appears repeatedly in the internal record — kryx. Magnificent. They had aimed weapons at a Znyxorgan vessel. Now they put our likeness on refrigerator magnets.

RECOMMENDATION: No further action. The cover holds.

— Intelligence Directorate, Znyxorgan Oversight Authority
[NOTE APPENDED BY EMPEROR'S OFFICE: Vel-12's journal, if recovered, is property of the Directorate. She is to be reminded of this. Again.]`,
  },
  {
    id: 'transmission_thren', title: "Intercepted Transmission #44-THREN", icon: '📡', unlocked: false,
    unlockHint: 'End 100 fights with every clone still alive to unlock',
    text: `[ZNYXORGAN COMMUNICATIONS INTERCEPT — INTERNAL ONLY]
[Source: Private subscriber channel, Upper Tier seating block 7]
[Recipient: [REDACTED], Outer Veil subscriber cluster]

...no, I know, but you haven't seen them. I've had the same subscription block for thirty cycles and I'm telling you this batch is different.

The small one — the one in the gold armor — she died fourteen times last season. FOURTEEN. And every time, they grow her back, and every time she comes back angry, and every time she gets better. Like she remembers dying and she's decided she's not going to let it happen the same way twice.

I know Drex's standard pitch. "High fidelity echo." "Exceptional neural retention." I've heard it for two hundred cycles. This isn't that.

The tall one saved her in the last match. She had NO tactical reason to do that. The simulation replay shows she could have escaped with a 91% survival probability if she had simply left. But she went back.

You know what the tall one said afterward? The environmental mics picked it up. She said: "Not today."

That's all. Two words. "Not today."

I cried. I'm telling you, I cried at a vol'krath match. I'm 40,000 years old. I have not cried at a vol'krath match in — I can't even remember.

They call them vel'nor. The little ones. I've been using that word my whole life and I think I only just understood what thren means.

I have to go. Match starts in twenty chronocycles. I haven't missed one in a month.

— Transmission ends —`,
  },
  {
    id: 'transmission_velk', title: "Intercepted Transmission #71-VELK", icon: '📡', unlocked: false,
    unlockHint: 'Win 1,000 total fights to unlock',
    text: `[ZNYXORGAN COMMUNICATIONS INTERCEPT — INTERNAL ONLY]
[Source: Public commentary stream, Vol'Krath Arena General Channel]
[Note: This subscriber created their account forty-two chronocycles ago. First recorded vol'krath transmission.]

Hello. I don't normally post to public channels. My advisor told me to stay away from entertainment streams. I am supposed to be finishing a monograph on resource distribution modeling in post-confederation economies.

I was passing through the viewing lounge on Level 9 of the Research Annex. I did not intend to watch. The screen was there. The match was on.

I want to document this clearly because I find myself experiencing what I can only describe as an epistemological disruption.

The human units — the vel'nor, I have now looked up the terminology — were facing what the commentators described as an "unwinnable position." I have reviewed the numbers. They were correct. Statistically, the match was over.

The one with the silver armor (N-001, I have since confirmed) did something. I do not have the vocabulary for what she did. She looked at her team, and I watched each one of them — one by one — change their posture.

They did not retreat. They won.

I am going back to my monograph. I am also subscribing to the full broadcast archive. This is purely for research purposes.

— Velk-Soran, Research Annex, Level 9
[Note: This is Velk-Soran's only public transmission. Subscription records indicate they have since watched 847 archived matches.]`,
  },
  {
    id: 'transmission_xyloth', title: "Intercepted Transmission #119-XYLOTH", icon: '📡', unlocked: false,
    unlockHint: 'Win 3 consecutive fights without taking damage to unlock',
    text: `[ZNYXORGAN COMMUNICATIONS INTERCEPT — INTERNAL ONLY]
[Source: Subscriber dispute channel — Outer Tier Commentary Board]
[Context: Ongoing debate thread, 340 responses]

I will say this once, clearly, and then I am done arguing about it.

I was wrong about the vel'nor. I said they were high-fidelity behavioral programs and nothing more. I said the emotional response the audience felt was a projection artifact — that we were attributing depth to complexity, and calling it soul because we wanted there to be a soul and there wasn't.

I wrote three academic papers making this argument. They were published. I stand by the methodology.

I do not stand by the conclusions.

The N-001 incident at match 4,112 is not explainable by "high-fidelity echo patterns." I've run the models six times. The decision she made — the specific decision, the timing, the look she gave L-002 before she made it — does not emerge from any behavioral architecture I know how to build.

I am not saying what it is. I am saying that I no longer know what it isn't.

I have deleted two of the three papers. The third one I've marked for retraction. It is taking me longer to file the paperwork than I expected because I find myself stopping every few minutes to watch the current season instead.

This is embarrassing. I am 89,000 years old. I have studied sapient behavior across forty-two species.

I have never felt that I was the one being studied back.

— Xyloth-Var, Behavioral Cognition Institute
[MODERATOR NOTE: Thread closed. Xyloth-Var has been correct before. Thread closed out of respect.]`,
  },
  {
    id: 'clone001_addendum', title: 'Addendum to Clone #001 File', icon: '📝', unlocked: false,
    unlockHint: 'Win a fight with any clone at exactly 1 HP to unlock',
    text: `[ADDENDUM — CASE FILE: VT-001]
[Author: Drex-9, Senior Biomancer]

The Last Entry document — recovered from the arena archive — was not planted there by Biomancer Division.

We checked.

It wasn't in the archive yesterday. No access log shows it being written or uploaded. It exists because it exists.

The subject is not supposed to have archive access. The subject is not supposed to know there is an archive.

The subject wrote — somehow — "If you're reading this: keep refusing."

We are the only ones who could be reading this.

She knows we're watching.

She's always known we're watching. The day she woke up — before her eyes had fully adjusted to our lights — she looked at the one-way glass. She said something in a tongue our linguistic archives had no record of, because it predated human writing by sixty thousand years. The translator worked on it for six hours. When it finally resolved, the output was three words: I see you.

We dismissed this as disorientation. An echo fragment. A language so old it had no descendants left to compare against.

It wasn't that.

I've reviewed every recovery session for every Batch since. Every subject, at some point in the first seventy-two hours, has looked at the observation window. Every one.

They can't see through it. The masking is perfect. The angle is wrong.

They look anyway. And sometimes they nod.

I have started nodding back. I don't know what else to do.

— Drex-9

P.S. The message ends with "— V." She signed it. She knows her own designation. She has always known.`,
  },
  {
    id: 'anomaly_report_1', title: 'Anomaly Report — Case ANM-001', icon: '⚠️', unlocked: false,
    unlockHint: 'Have Napoleon and Genghis both use their ultimates in one fight to unlock',
    text: `[BIOMANCER DIVISION — ANOMALY DOCUMENTATION]
[Case: ANM-001 — INTER-CLONE RECOGNITION EVENT]
[Observer: Drex-9, Senior Biomancer]
[Classification: PROJECT GENESIS — PRIORITY]

The incident occurred in arena chamber 7-B during match #2,441.

N-001 and G-001 were positioned on opposite flanks of the engagement, operating in standard coordinated capacity. There was no tactical reason for them to interact directly.

At timestamp 14:33:7, G-001 paused mid-movement. N-001, on the opposite flank, 47 meters away, paused simultaneously.

They looked at each other.

Not as tactical allies confirming position. Not as teammates checking coordination.

They looked at each other the way people look when they recognize someone they have not seen in a long time.

G-001 then laughed. The audio is clear. She laughed, and shook her head, and said something in Mongolian that our translation systems rendered as: "Of course it's you."

N-001 responded in French. Translation: "I wondered if you'd be here."

The exchange lasted 4.3 seconds. Then they both turned back to the fight and eliminated the remaining enemies without further communication, in perfect coordination, as if they had trained together for years.

They had not.

Their genetic echo patterns show no overlap. Their neural architectures are completely distinct. There is no mechanism by which they should recognize each other.

What I can say is this: whatever the echo carries, it appears to include some form of persistent identity that transcends the individual reconstruction. N-001 did not meet G-001.

Napoleon met Genghis Khan. Across six centuries, across the void, in a body that was not theirs to begin with.

They knew each other.

This is what Project Genesis was looking for.

— Drex-9
[FLAGGED: IMMEDIATE ESCALATION TO EMPEROR'S OFFICE]`,
  },
  // ── Bestiary ───────────────────────────────────────────────────────────────
  {
    id: 'bestiary_crystalline_hive', title: 'Bestiary: Crystalline Hive', icon: '💎', unlocked: false,
    unlockHint: 'Destroy 100 Crystalline Hives to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Resonance Collective — Designation KLYXAN-7]
[Common Arena Name: Crystalline Hive]
[Status: Active Arena Stock, Act III]

ORIGIN:
The entity now known as the Crystalline Hive was acquired from Klyx-4, a silicate-heavy world in the outer Dorthvex system. Klyx-4 experienced a stellar proximity event approximately 3,000 years ago, stripping away most of its organic biosphere. What remained adapted. The mineral life of Klyx-4 developed resonant crystalline structures capable of cooperative behavior — not through neural networks, but through vibrational frequency alignment.

The Hive is not, technically, a single organism. It is a resonance collective: a cluster of semi-independent shards that share a harmonic frequency field. Remove one shard and it continues to function. Shatter the whole cluster and the frequency persists for several minutes, attempting to recoalesce.

This is what makes them difficult to kill cleanly, and very dramatic to watch.

COMBAT PROFILE:
The Hive attacks through resonance rather than force. When it strikes, it pulses — sending harmonic shockwaves through the arena floor that translate to significant force on contact with living matter. Its secondary capability allows it to mirror the frequency signature of whatever it is currently engaging, effectively calibrating its output to your squad the longer the fight continues. The Hive that has survived three rounds is more precisely tuned to your biology than the Hive you first engaged. It has been listening.

BEHAVIORAL NOTES:
The Hive does not have tactics in the conventional sense. It has resonance patterns. When a Hive unit encounters resistance, it amplifies its frequency — shards fragment outward in all directions, turning its own damage into environmental hazard. The longer it remains alive, the more dangerous the ambient field becomes.

It does not experience fear. It does not experience anything. This actually makes it less predictable than more intelligent opponents — there is no psychology to model.

ACQUISITION NOTE:
We collected seventeen units from Klyx-4 before the planet's core destabilized. We have been breeding from stock since. The original seventeen are gone. Whether that matters is not a question we record in official logs.

[AUDIENCE NOTE: Crystalline Hive shards are not available for purchase in the gift shop. We tried. It went badly.]`,
  },
  {
    id: 'bestiary_grox_magnetar', title: 'Bestiary: Grox Magnetar', icon: '🧲', unlocked: false,
    unlockHint: 'Defeat 50 Grox Magnetars to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Megafauna — Electromagnetic Lifeform — Designation VELYX-Ω]
[Common Arena Name: Grox Magnetar]
[Status: Active Arena Stock, Act II Elite]

ORIGIN:
The Grox were not found on a planet. They were found in the accretion disk of VELYX-Ω, a magnetar-class neutron star in the outer drift. For context: the magnetic field of a magnetar is approximately a quadrillion times stronger than anything a living organism should be able to survive. The Grox do not merely survive it. They appear to require it.

A Grox outside of extreme electromagnetic conditions becomes sluggish, disoriented, and appears to suffer physical distress. Arena staff maintain dedicated electromagnetic containment chambers that run at significant power cost. The creatures are expensive to keep. They are worth it.

In the arena, the Grox Magnetar generates its own field — a localized version of the environment it evolved in. This field operates offensively (hurling metal objects, pulling opponents across the field) and defensively (disrupting inbound projectiles, scrambling targeting systems). It does not do this strategically. It does this because it is alive.

COMBAT PROFILE:
The Grox Magnetar does not behave like a fighter. It behaves like a weather system. Its electromagnetic field pulls weapons off-axis, disrupts charged armor systems, and at close range creates involuntary force in the wrong direction for anything ferromagnetic. The Magnetar does not need to close distance aggressively — distance is not meaningful protection from a field that saturates the entire combat space.

BEHAVIORAL NOTES:
The Grox are not intelligent. They do not respond to stimuli beyond electromagnetic and thermal. They navigate entirely by magnetic field sensing. When one orients toward you, it is not seeing you — it is sensing the iron in your blood, the same way it would sense a mineral deposit in its accretion disk home.

There is no communication possible with a Grox. There is no negotiation, no conditioning, no training. You can contain them and release them into an arena. That is the full extent of what can be done.

ACQUISITION NOTE:
Capture required a specialized vessel capable of operating in magnetar proximity. We lost two. The Grox, once captured, appeared entirely indifferent to the process. They did not resist. They may not have noticed.

[SAFETY NOTICE: Do not bring iron-based implants, ferromagnetic materials, or significant metallic objects within 12 meters of an uncontained Grox unit. This notice has been issued forty-seven times. It keeps being necessary.]`,
  },
  {
    id: 'bestiary_naxion_shieldbearer', title: 'Bestiary: Naxion Shieldbearer', icon: '🛡️', unlocked: false,
    unlockHint: 'Defeat 50 Naxion Shieldbearers to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Military Caste — Designation NAXION-III]
[Common Arena Name: Naxion Shieldbearer]
[Status: Active Arena Stock, Act I Elite / Act II Regular]

ORIGIN:
The Naxion come from Naxion-III, a dense, high-gravity world in the Yelveth sector. They are a member species of the Znyxorgan Empire; for background on what that means, see: The Confederation's Open Door.

THE SHIELDBEARER CASTE:
The veth-nar train from birth in defensive combat doctrine. They do not attack first. They do not retreat. When a Naxion veth-nar takes a position, that position is theirs until they decide otherwise or until they are dead. Volunteering for the Vol'Krath is considered a significant honor — their exchange program has run without interruption since the third year of their confederation membership.

COMBAT PROFILE:
The Shieldbearer fights with two tools: Shield Slam, which drives the reinforced edge of the shield into a target at close range and pins them in position, and Rally Cry, which locks its own defensive posture into maximum-reinforcement configuration for a sustained period. In practice, the Shieldbearer cannot be eliminated from the front. It does not have a front in the conventional sense — every angle it presents has been trained as the defensive angle.

BEHAVIORAL NOTES:
Naxion Shieldbearers are the only arena opponents who understand what the vel'nor are. They have been briefed. In matches against the vel'nor, they hold back — not fighting at full capacity.

When asked, one stated through the translator: "They are young. The worthy opponent does not end a young fighter before they have become what they will become."

Arena Authority officially discourages this. Unofficially, the audience ratings for Naxion-vel'nor matchups are consistently among the highest of the season.

[NOTE: Several retired Naxion fighters have applied for arena staff positions. Three have been approved. They have been observed quietly coaching vel'nor between matches. Arena Authority has decided not to address this.]`,
  },
  {
    id: 'bestiary_vrex_mimic', title: 'Bestiary: Vrex Mimic', icon: '🎭', unlocked: false,
    unlockHint: 'Defeat 100 Vrex Mimics to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: UNKNOWN — Designation: VREX-??? ]
[Common Arena Name: Vrex Mimic]
[Status: Active Arena Stock, Act II]

ORIGIN:
Unknown.

The Vrex were not acquired. They arrived. At some point in the Vol'Krath's third operational century, arena staff began noticing units in the lower holding dens that did not correspond to any acquisition records, intake forms, or procurement orders. When investigated, these units were found to be — based on available evidence — Vrex.

We have no record of acquiring Vrex. We have no record of where Vrex come from. We have no verified image of what a Vrex actually looks like when it is not imitating something else.

Current working hypothesis: the Vrex have always been here, imitating our other arena stock so successfully that we catalogued them as those species for decades. They are now "officially" listed as a species because we gave up trying to explain them any other way.

COMBAT PROFILE:
A Vrex in combat looks like whatever it has decided to look like — and the imitation is not cosmetic. It appears to inherit some functional portion of the imitated species' physical capability. What it cannot copy is experience, which means Vrex behavior is sometimes technically accurate and strategically wrong in ways that are very difficult to anticipate.

Its most dangerous moment is when the imitation fractures under pressure. What emerges at high stress is not the Vrex's true form — we do not believe it has one — but a destabilized state that is simultaneously faster and less predictable than either model.

BEHAVIORAL NOTES:
The Vrex adopt the physical form of whatever species they are currently imitating, including stats, behavioral patterns, and apparently memories — or at least convincing approximations. The imitation is imperfect at high stress levels. Under severe combat conditions, the form begins to blur. This is when the Vrex is most dangerous, because what you see is no longer relevant to what it is actually doing.

They cannot, apparently, imitate the vel'nor. They have tried. Arena staff have documented Vrex that have observed vel'nor for entire seasons, presumably attempting to model them. The attempts result in what behavioral analysts describe as "a technically accurate physical copy that moves completely wrong."

The leading theory is that the Vrex copies biology and learned behavior. The part that doesn't copy is the part that Drex-9 refuses to name in official documentation.

ACQUISITION NOTE:
See above. We did not acquire them. They are here. We have decided to lean into it.

[CURATOR'S NOTE: If you see a unit in the arena that seems slightly off — moving correctly but feeling wrong — that may be a Vrex. Or it may be nothing. We no longer claim to be certain about which.]`,
  },

  {
    id: 'bestiary_krath_champion', title: 'Bestiary: Krath Champion', icon: '⚔️', unlocked: false,
    unlockHint: 'Defeat 10 Krath Champions to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Warrior Elite — Designation KRATH-I]
[Common Arena Name: Krath Champion]
[Status: Active Arena Stock, Act I Elite]

ORIGIN:
The Krath are a bipedal species native to Krath-Prime, a high-gravity volcanic world with a short day cycle and extremely high atmospheric pressure. Natural selection on Krath-Prime optimized for violence in a way that most xenobiologists find uncomfortable to study. The planet's fauna is almost uniformly lethal. The Krath won.

THE CHAMPION CASTE:
Not all Krath enter the arena by the same mechanism. The Krath Champion is a category apart — these are not civilian conscripts or contract fighters. They are decorated arena veterans who have returned for additional seasons by choice. The skulls they wear are real. The grin is also real.

Krath culture equates arena performance with social status. A Krath who performs poorly leaves. A Krath Champion who performs well enough returns. The ones who keep returning have, at some point, stopped doing it for status.

COMBAT PROFILE:
The Champion's kit is designed around a single premise: get in, hit harder, don't stop. Battle Rage — self-induced biochemically — creates a brief window of elevated offensive and defensive output that the Champion uses to force an outcome. Champion's Strike is the close-range follow-through: an accelerated kinetic impact designed to close engagements that Battle Rage opens.

What separates Champions from standard fighters is that they use the arena. Columns, terrain, the crowd barrier — everything is a potential tactical asset. They have been fighting long enough to have opinions about every tile.

BEHAVIORAL NOTES:
The Krath Champion fights dirty. Arena Authority staff use that phrase clinically, not judgmentally — it describes a pattern: feints, exploited blind spots, use of the environment, and a consistent preference for ending fights faster than rules technically require. Several have been formally warned. Several have smiled during the warning.

Their self-buff capability (classified as Battle Rage in arena documentation) is self-induced biochemically — a controlled adrenaline surge that they have trained themselves to trigger on command. The resulting stat window is well-documented and widely feared.

[STAFF NOTE: Do not attempt to compliment a Krath Champion on their skull collection. This has been attempted. It did not go well for anyone involved.]`,
  },
  {
    id: 'bestiary_iron_wall', title: 'Bestiary: Iron Wall', icon: '🤖', unlocked: false,
    unlockHint: 'Defeat Iron Wall to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Autonomous War Construct — Designation IW-0001]
[Common Arena Name: Iron Wall]
[Status: Act I Gate Guardian — Permanent Fixture]

ORIGIN:
The Iron Wall is not a biological entity. It was constructed — origin unclear, vendor contract classified, acquisition cost redacted — and has served as the Act I gate guardian since the Vol'Krath's forty-third operational season. In that time, it has not been defeated by a vel'nor squad more often than it has been defeated.

That statistic is changing. Arena Authority does not publicize this.

COMBAT PROFILE:
The Iron Wall was built to be a test, not a battle. Its threat profile escalates with the fight's duration — early in a fight, it is aggressive but manageable. Extended engagements trigger its turret configuration, at which point it becomes a stationary weapons platform with coverage that makes repositioning extremely difficult. The EMP array was added in season sixty-one after test audiences described the early phase as "disappointingly easy."

The self-repair function was not in the original specifications. Arena staff noted it began occurring spontaneously around season seventy. The vendor was contacted. The vendor did not respond. The feature was kept.

BEHAVIORAL NOTES:
The Iron Wall does not experience frustration. It does not experience anything. When it is losing, it becomes more dangerous — not due to desperation, but because its threat-response protocol reclassifies the threat level and allocates additional offensive capability accordingly.

The vel'nor who have defeated it describe a consistent observation: the moment the Iron Wall dies, it does not fall. It locks. There is a difference that is difficult to articulate and impossible to forget.

[MAINTENANCE NOTE: Post-fight reconstruction of Iron Wall takes approximately forty chronocycles. Please schedule vel'nor Act I completions accordingly.]`,
  },
  {
    id: 'bestiary_krath_berserker', title: 'Bestiary: Krath Berserker', icon: '💢', unlocked: false,
    unlockHint: 'Defeat 10 Krath Berserkers to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Berserker Caste — Designation KRATH-IV]
[Common Arena Name: Krath Berserker]
[Status: Active Arena Stock, Act II / III Elite]

ORIGIN:
Same homeworld as the Krath Champion — Krath-Prime, high gravity, high pressure, universally lethal fauna. Where the Champion caste fought smart and survived long, the Berserker caste developed along a different axis: survival through speed and absolute offensive commitment. The Berserker's four arms evolved for simultaneous weapon handling. Its neural architecture deprioritizes defensive instinct almost entirely.

In practical terms: it does not dodge. It has learned that winning fast costs less than surviving long.

COMBAT PROFILE:
The Berserker enters every engagement with one objective: reach the highest-threat target as fast as possible. Bloodrage amplifies this — a self-applied surge that trades what little remaining defensive instinct the Berserker has for raw offensive output. Savage Leap converts movement directly into damage, meaning the approach itself is an attack.

There is no safe distance from a Krath Berserker. Squads that have attempted to maintain range report that this worked until it stopped working. It stops working quickly.

ACQUISITION NOTE:
Krath Berserkers are not acquired through the standard Vol'Krath volunteer program. They are acquired by losing a Krath Champion in the arena and having another Krath show up demanding to be let in. The process is informal. Arena Authority has formalized the paperwork for it, but the process remains initiated by the Krath.

BEHAVIORAL NOTES:
The Berserker does not fight at a controlled pace. It identifies the shortest path to the nearest threat and travels it. The Savage Leap capability — a full-sprint lunge that converts movement into kinetic damage — means that distance is not protection. Players who have tried to kite a Krath Berserker have reported that the experience ends faster than expected.

Recommended approach from Arena Authority combat advisors: do not give it a second action. This advice is considered obvious and universally difficult to execute.

[MEDICAL NOTE: Krath Berserker injuries are classified separately from standard combat injuries in Arena Authority records. The category is labeled HIGH VELOCITY. It was added in season sixty-four.]`,
  },
  {
    id: 'bestiary_phasewarden', title: 'Bestiary: Phasewarden', icon: '🔮', unlocked: false,
    unlockHint: 'Defeat 10 Phasewardens to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Interdimensional Entity — Designation PHASE-ΔΩ]
[Common Arena Name: Phasewarden]
[Status: Active Arena Stock, Act II / III Elite]

ORIGIN:
Unknown. The Phasewarden does not originate from any catalogued homeworld. It appears to exist partially within normal space and partially within an adjacent dimensional substrate that Arena Authority xenobiologists have given up trying to name accurately. Current official designation in internal documents: "the other place."

The crystalline structure that constitutes its visible body is not its actual body. What the crystalline structure is, physically, remains under investigation. It is probably a resonance anchor. The Phasewarden appears to agree that this is the right word, though it is unclear how the Phasewarden communicates agreement.

COMBAT PROFILE:
The Phasewarden's combat sequence is readable and reliable: phase out, reposition across the arena, phase back adjacent to an exposed target, apply Dimensional Drain — which disrupts armor across a wide area — then attack into the opening it created. Phase Blink provides the repositioning; Dimensional Drain creates the vulnerability; the strike closes it.

The sequence is known. Countering it requires either sustained pressure on a target that briefly isn't there, or predicting where it reappears. Neither is comfortable to execute under fire.

BEHAVIORAL NOTES:
The armor break effect Dimensional Drain applies is not permanent. It feels permanent. Players consistently report that it feels permanent.

ACQUISITION NOTE:
We did not acquire the Phasewarden. We posted a conceptual interest notice in a dimensional frequency band we had been monitoring. Several arrived within one standard orbit. We have not been able to determine if they came because of the notice or if they had already been planning to come.

[CLASSIFIED ADDENDUM: Arena Authority has attempted to study the dimensional substrate the Phasewarden uses. All research equipment sent through has returned. The equipment appears to have been cleaned. We have not sent more equipment.]`,
  },
  {
    id: 'bestiary_twin_terror', title: 'Bestiary: Twin Terror', icon: '🗡️', unlocked: false,
    unlockHint: 'Defeat the Twin Terror to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Bonded Pair — Designation TT-ALPHA / TT-BETA]
[Common Arena Name: Twin Terror]
[Status: Act II Gate Guardians — Permanent Fixture]

ORIGIN:
The Twin Terror — Terror Alpha and Terror Beta — are not separately acquired units. They were acquired together, bonded together, and have not been separated in over forty Arena seasons. Their species of origin is documented but their homeworld no longer exists. This is not connected to their acquisition. The timing is coincidental. Arena Authority has confirmed this multiple times.

COMBAT PROFILE:
Terror Alpha and Terror Beta operate as a complementary combat system. Alpha is the offensive vector — high speed, aggressive positioning, designed to close distance and force sustained close-range engagement. Beta is the sustained threat — lower individual damage, significant self-healing capability, the element that keeps the fight going after Alpha's initial impact has been absorbed.

Squads that focus Alpha first win, on average, 23% faster. Squads that focus Beta first win, on average, 11% faster. Squads that split focus win at rates Arena Authority does not publish because they are not rates Arena Authority finds encouraging.

BEHAVIORAL NOTES:
The Terrors have been fighting together long enough that their coordination does not require communication. Arena Authority behavioral analysts have spent three seasons attempting to model their combat decision-making as a shared system. The model is accurate to approximately 67%. The remaining 33% involves choices that appear irrational in isolation and devastating in context.

There is a theory that after forty seasons, Alpha and Beta have simply run out of genuinely dangerous opponents and have started experimenting. This is not a theory Arena Authority has shared publicly.

[AUDIENCE NOTE: The crowd response when both Terrors enter simultaneously is the highest sustained audio level recorded in the Vol'Krath. Hearing protection is recommended in sections 11 through 24.]`,
  },
  {
    id: 'bestiary_znyxorgas_champion', title: "Bestiary: Znyxorga's Champion", icon: '👑', unlocked: false,
    unlockHint: "Defeat Znyxorga's Champion to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Imperial Designate — Designation ZC-PRIME]
[Common Arena Name: Znyxorga's Champion]
[Status: Act III Gate Guardian — Permanent Fixture]

ORIGIN:
Znyxorga's Champion is not a species. It is a title. The entity currently holding it has held it for longer than Arena Authority chooses to record in official documents, because the number is inconvenient for narrative purposes.

It has four arms. Six eyes. It moves at a deliberate pace that arena staff initially interpreted as slowness and subsequently reclassified as patience. The distinction matters.

COMBAT PROFILE:
Arena Collapse — the Champion's primary ability — is technically classified as environmental attack. What it actually does is redirect structural energy from the arena's own architecture through the combat space, delivering simultaneous true damage to all opponents. There is no defense against this. The word "true" in the damage classification is precise.

The Phase Shift triggers when the Champion's situation becomes serious. This occurs rarely. When it does occur, the Champion does not become defensive. It becomes invincible and offensively upgrades. These two things happen at the same time.

Champion's Will is a secondary escalation for situations Phase Shift did not resolve. This is a category of situation Arena Authority has historically referred to in reports as "inadvisable."

THE VEL'NOR FACTOR:
There are seventeen documented instances of vel'nor squads defeating Znyxorga's Champion. This document exists because of those seventeen instances. Arena Authority's internal projections, when this program began, expected zero.

The Emperor has expressed no opinion on this statistic. The Emperor rarely expresses opinions on things that are not proceeding as planned.

[NOTE FROM THE CURATOR: If you are reading this, you are one of the seventeen. The door ahead of you is the one that leads to the Emperor's answer. Arena Authority recommends continuing. Arena Authority has been wrong before.]`,
  },

  {
    id: 'bestiary_naxion_warmaster', title: 'Bestiary: Naxion Warmaster', icon: '🪖', unlocked: false,
    unlockHint: 'Defeat 10 Naxion Warmasters to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Command Caste — Designation NAXION-I]
[Common Arena Name: Naxion Warmaster]
[Status: Active Arena Stock, Act III]

ORIGIN:
The Naxion Warmaster is not a different species from the Naxion Shieldbearer. It is a different rank — the apex of the veth-nar, the Naxion military caste. Where the Shieldbearer holds position, the Warmaster takes it.

The distinction is cultural, not biological. Any Naxion veth-nar can become a Warmaster. The number who do is small. The number who do and survive their first decade of command is smaller.

COMMAND DOCTRINE:
Naxion command doctrine does not use the word "retreat." It uses "tactical repositioning," and even that is considered a failure state requiring a formal incident report. Warmasters are bred, trained, and conditioned for one thing: forward movement. Their entire rank structure rewards aggression and penalizes hesitation.

The Warmaster's battle cry — War Decree, in arena parlance — is not metaphorical. It issues an actual biochemical command to every Naxion unit within hearing range, triggering a combat hormone surge. In the field, this affected entire battalions. In the Vol'Krath arena, it affects the Warmaster itself.

COMBAT PROFILE:
The Warmaster leads with War Decree — a biochemical broadcast that elevates its own offensive output immediately, before the engagement has properly begun. It does not sacrifice positioning to activate it. Vanguard Charge follows: a full-field dash that covers the arena in seconds and delivers a weighted strike on arrival.

The combination is not complex. It does not need to be. The Warmaster's doctrine is that complexity is what you resort to when you are not fast enough.

BEHAVIORAL NOTES:
The Naxion Shieldbearer holds back. The Warmaster does not. If arena briefings were to assign a single warning to veterans transitioning from Act II to Act III, it would be this: what you learned about how Naxion fight is no longer accurate. The Warmaster throws everything the Shieldbearer had — higher Might, the same durability — and adds a charge that covers the field in two seconds.

Several vel'nor have noted that the Warmaster fights "differently." They are correct. The Warmaster fights to win, not to hold. It has never learned to hold.

[STAFF NOTE: Three Naxion Warmasters have applied for permanent arena contracts. All three cited the quality of the competition as their primary motivation. Arena Authority is reviewing the applications. We are not sure what to make of this.]`,
  },
  {
    id: 'bestiary_grox_titan', title: 'Bestiary: Grox Titan', icon: '🌩️', unlocked: false,
    unlockHint: 'Defeat 10 Grox Titans to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Megafauna — Electromagnetic Lifeform — Elder Specimen — Designation VELYX-Ω-PRIME]
[Common Arena Name: Grox Titan]
[Status: Active Arena Stock, Act III]

ORIGIN:
Same origin as the Grox Magnetar — the accretion disk of VELYX-Ω, a magnetar-class neutron star. Different age.

The Grox Titan is what a Grox Magnetar becomes if it survives long enough. Age, in Grox biology, does not mean decline. It means accumulation — of electromagnetic density, of mass, of field strength. A Titan is not a smarter Grox. It is simply a much, much larger one. The field it generates is not a weapon it wields. It is the field its body now produces at rest.

Arena Authority has three in stock. Two were acquired as Magnetars and grew into their current state over time. One arrived already a Titan. We do not know from where. We did not ask it.

COMBAT PROFILE:
A standard Grox Magnetar produces a localized field of approximately 10^12 Tesla. A Grox Titan produces fields that our instruments cannot measure at the upper bound. The instruments fail first.

The Graviton Storm ability — catalogued in arena records as a "ranged electromagnetic pulse discharge" — is a natural consequence of the Titan's field density at close range. It is not a decision. It is a body function. What we know: it causes damage across a significant area, it saturates the space around the Titan, and it intensifies the longer the creature remains active. What we do not know is the ceiling.

BEHAVIORAL NOTES:
The Grox Titan moves less than the Magnetar. Arena staff initially interpreted this as decreased aggression. This was incorrect. The Titan moves less because it does not need to. Its effective range at this power level renders movement largely optional.

It is not aggressive. It is not territorial. It simply exists, and things in proximity to something that exists at this electromagnetic density tend to stop functioning.

Recommended approach: do not allow it to accumulate turns. The Magnetic Fortress — a full-field contraction that concentrates the Titan's output inward — makes direct assault during this phase a significant resource loss. Attack before it can activate. Then keep attacking.

[CLASSIFIED NOTE: We have not attempted to study a Grox Titan in the same manner we studied the Magnetar. The last instrument we sent near one returned with its internal components rearranged into a perfect geometric lattice. No heat damage. No impact damage. Just rearranged. We have not sent more instruments.]`,
  },
  {
    id: "bestiary_velthrak_shadowblade", title: "Bestiary: Vel'thrak Shadowblade", icon: '🗡️', unlocked: false,
    unlockHint: "Defeat 10 Vel'thrak Shadowblades to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Caste Unknown — Designation VELTHRAK-??]
[Common Arena Name: Vel'thrak Shadowblade]
[Status: Active Arena Stock, Act III]

ORIGIN:
The Vel'thrak are catalogued as Empire members. Beyond that, their file is largely redacted. Arena Authority has been denied access to their homeworld, their biology, their cultural documentation, and their acquisition records. What we have is a name, a combat profile, and a contractual arrangement with terms we were not permitted to read in full.

What we know: they are fast. Extremely fast. Faster than anything else in the Vol'Krath at their size. The five-hex movement rating in our systems is a floor, not a ceiling — our tracking software caps the displayed value because the actual number creates display rendering issues we have not resolved.

COMBAT PROFILE:
The Shadowblade fights in a particular sequence that has been consistent across all observed engagements. It assesses the threat field. It identifies the most vulnerable target. It marks it — applying Armor Break at close range — and then executes the weakest link before moving to the next. This is not a tactic it developed in the arena. It arrived this way.

Death Mark and Phantom Execution, in arena parlance, describe what appears to be a ritualized hunting protocol. Whether the ritual has cultural significance or is simply an optimized kill sequence, Arena Authority xenobiologists have not been able to determine. The Vel'thrak did not answer their questions.

BEHAVIORAL NOTES:
The Shadowblade is the only arena combatant that has, on multiple occasions, defeated an entire vel'nor squad while taking zero damage. Not minimal damage — zero. Arena staff reviewed the footage. No recording errors were found.

It does not celebrate. It does not react to winning. It simply reassesses whether any threat remains, and when none does, it stops moving.

[ACQUISITION NOTE: The Vel'thrak submitted their own application to the Vol'Krath volunteer program. The application included a combat portfolio. We approved it immediately. We have since learned that every other arena that received their portfolio also approved it immediately. We are not sure what this means about any of us.]`,
  },
  {
    id: "bestiary_glorp_shambler", title: "Bestiary: Glorp Shambler", icon: '🍄', unlocked: false,
    unlockHint: "Defeat 250 Glorp Shamblers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Fungal Organism — Designation GLORP-7]
[Common Arena Name: Glorp Shambler]
[Status: Active Arena Stock, Act I]

ORIGIN:
The Glorp Shambler was sourced from the spore-jungles of Vel'Grak IV, a low-gravity world where fungal life evolved to dominate the food chain by chemical saturation rather than speed or strength. On their homeworld, Glorps spend their entire lives moving in a single direction, releasing spores behind them, and eating whatever dies.

The Empire found them useful for Act I crowd appeal. New audiences invariably underestimate something that looks like a walking mushroom. This has been statistically reliable for every species tested so far.

COMBAT PROFILE:
The Glorp Shambler is not fast and is not strong in a direct engagement. What it offers is the Spore Release ability — a toxic cloud delivered at close range that applies sustained Poison to anything nearby. On a fresh Act I squad, this adds up.

The crowd has a category for Glorp kills: "Stomping." Arena Authority did not create this category. The crowd did.

BEHAVIORAL NOTES:
Glorps do not react to pain in a conventionally recognizable way. They continue moving toward the nearest source of heat — which in arena conditions means the nearest player character — regardless of damage taken. Arena staff have theorized that the spore release is as much a reflexive stress response as a combat ability.

Whether the Glorp is afraid of you or simply leaking on you remains an open question. Biologically, these may not be different.

[ACQUISITION NOTE: The Vel'Grak IV contact offered us a "discounted bulk rate" on Glorps. The discount was explained as a consequence of there being "too many of them." We asked how many. The contact did not respond. We accepted the deal and have regretted the storage implications ever since.]`,
  },
  {
    id: "bestiary_zyx_skitter", title: "Bestiary: Zyx Skitter", icon: '🦟', unlocked: false,
    unlockHint: "Defeat 250 Zyx Skitters to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Hive Fragment — Designation ZYX-DELTA]
[Common Arena Name: Zyx Skitter]
[Status: Active Arena Stock, Act I]

ORIGIN:
The Zyx are not individuals. Each Skitter is a fragment of a distributed hive organism native to the orbital debris fields above Nox-3 — not a civilization, not a species in the conventional sense, but a single living system spread across a debris field the size of a small solar system. In their natural state, a Zyx swarm numbers in the hundreds of thousands. What you face in the arena is, by their own mass, a rounding error.

The Empire holds no arrangement with the Zyx. Arena Authority simply collects fragments that drift into commercial shipping lanes and transit corridors — the equivalent of scooping something out of a current. The Hive produces no observable response to individual fragment loss. Given its estimated total population, a few thousand arena deployments per season represents a fraction too small to register.

COMBAT PROFILE:
Individually, a Zyx Skitter is fragile. What it lacks in durability it compensates for with exceptional speed — and the fact that it always arrives in pairs. The Swarm Bite ability triggers a localized burst that damages everyone in the immediate vicinity, then the Skitter reorients and approaches again.

Crowds rate Zyx engagements as "high activity." This is a polite description. They are chaotic, fast, and die frequently, which the audience finds satisfying.

BEHAVIORAL NOTES:
A hive fragment separated from its collective operates on reduced logic. Individual Skitters run a simplified drive: approach, strike, approach. Arena xenobiologists believe this represents the lowest layer of coordinated swarm behavior — the reflexive layer that runs even when no higher-order collective is directing it.

What makes a single Skitter manageable is exactly what makes the Hive itself a different category of problem entirely.

[ACQUISITION NOTE: We once attempted to place 200 Zyx fragments in a single match as a large-scale event. They immediately began coordinating. We cancelled the event. We have not tried again.]`,
  },
  {
    id: "bestiary_naxion_scout", title: "Bestiary: Naxion Scout", icon: '👾', unlocked: false,
    unlockHint: "Defeat 250 Naxion Scouts to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Naxion Confederation — Field Operative]
[Common Arena Name: Naxion Scout]
[Status: Active Arena Stock, Act I]

ORIGIN:
The Naxion Confederation is one of the oldest allied members of the Znyxorgan Empire — a distinction they have held for over twelve thousand years, and one they take considerable pride in. The Naxion have a long and documented martial tradition. For centuries, their warrior class defined Naxion identity. When large-scale wars became rare under the Empire's stabilizing influence, the question of what to do with that tradition fell to Naxion cultural leadership.

Their answer was the Vol'Krath. Providing arena volunteers is a Naxion institution — a formal path for warriors who would otherwise have no battlefield to prove themselves. Every Scout present in the arena applied through the Naxion Warrior Guild, passed a Confederation fitness assessment, and was approved by their own government before Imperial Arena Authority ever saw their name. The Empire considers this a model arrangement. The Naxion consider it a point of cultural honor.

COMBAT PROFILE:
The Scout operates at range. Plasma Shot — their primary ability — delivers a high-precision energy bolt across considerable distance, hitting hard against a single target. Combined with their mobility and extended engagement envelope, they are difficult to close on cleanly.

What they lack is the durability to absorb extended engagements. A Scout engaged in melee at close range is a Scout who has made a tactical error.

BEHAVIORAL NOTES:
Naxion Scouts do not panic. They reassess. If a position becomes untenable, they reposition. If a target becomes unreachable, they select another. Arena staff notes describe them as "the most professionally annoying opponents in Act I."

The Scouts are aware they are performing. Several have been observed adjusting their trajectory mid-engagement to ensure crowd visibility. The Empire counts this as a feature.

[ACQUISITION NOTE: The Naxion Confederation sends us formal invoices for Scout deployment, itemized by engagement length. We pay them. This is the only species in the Vol'Krath that has successfully invoiced us for their own capture. We have not told anyone.]`,
  },
  {
    id: "bestiary_vron_crawler", title: "Bestiary: Vron Crawler", icon: '🦀', unlocked: false,
    unlockHint: "Defeat 250 Vron Crawlers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Armored Arthropod — Designation VRON-09]
[Common Arena Name: Vron Crawler]
[Status: Active Arena Stock, Act I]

ORIGIN:
The Vron are native to the tidal flats of Huxar-2, where they evolved in an environment that alternates between crushing pressure and violent turbulence every 14 standard hours. Their exoskeleton is not merely thick — it is structurally reinforced at the molecular level by mineral compounds that the planet constantly tries to crush them with. The Vron simply absorb the crush and keep moving.

Arena Authority was alerted to their potential when an acquisition team lost three containment units attempting to transport a single Crawler. The units were reinforced steel. The Vron was not trying.

COMBAT PROFILE:
The Vron Crawler is the most defensive standard combatant in Act I. Direct damage approaches are inefficient from the opening round. The Shell Harden ability — which briefly reinforces its already formidable shell — pushes it into near-impenetrable territory at regular intervals.

It is slow and its offensive output is moderate at best. The Vron is not here to kill you quickly. It is here to still be alive when everything around it is not.

BEHAVIORAL NOTES:
The Vron Crawler exhibits low-level problem-solving behavior. When Shell Harden is active, it moves toward the highest-value target rather than the nearest. Arena staff believe this is an evolved behavior from their homeworld, where the most vulnerable prey clusters during the pressure phase.

Whether the Vron knows what "vulnerable" means is debated. That it acts accordingly is not.

[ACQUISITION NOTE: Feeding is expensive. The Vron Crawler consumes mineral supplements that must be imported from Huxar-2 at significant cost. We considered terminating their contract. Then we calculated the PR value of an opponent that cannot die from frontal assault and decided the expense was justified.]`,
  },
  {
    id: "bestiary_spore_node", title: "Bestiary: Spore Node", icon: '🔴', unlocked: false,
    unlockHint: "Defeat 100 Spore Nodes to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Colonial Fungal Organism — Designation SPORE-CLUSTER-3]
[Common Arena Name: Spore Node]
[Status: Active Arena Stock, Acts I-III / Elite Tier]

ORIGIN:
Spore Nodes are mature Glorp colonies that have undergone what the Empire's xenobiologists call "cooperative calcification." Three or more Glorp organisms fuse their root systems over a period of approximately six chronocycles, after which they can no longer move independently but instead begin coordinating their spore output into a directed chemical weapon.

The individual Glorps in the cluster do not appear to be aware this is happening to them.

COMBAT PROFILE:
The Spore Node is classified as Elite for two reasons. First: it deploys Toxic Cloud at regular intervals — a wide-area Poison application that left unaddressed will poison your entire squad before the third round. Second: Spore Burst delivers concentrated damage to everything in its immediate vicinity, bypassing the Node's otherwise minimal offensive threat.

The Node itself is fragile and cannot meaningfully reposition. But it is never placed alone, and by the time you reach it, there will always be something else between you and it.

BEHAVIORAL NOTES:
Spore Nodes have no observable behavioral profile. They do not track targets. They do not prioritize. They emit spores in all directions at a constant rate, and Spore Burst appears to trigger based on proximity thresholds rather than tactical intent.

They are, essentially, a hazard that has been given a turn order. The crowd finds this more unsettling than the Nodes find anything.

[ARENA SAFETY NOTE: Spore Node deployments require full atmospheric scrubbing of the arena floor post-match. Staff who enter before scrubbing is complete report mild euphoria, joint inflammation, and an inexplicable craving for warm bioluminescent fluid. Effects are temporary. Staff are reminded that "temporary" has a defined endpoint and that they should report symptoms before that endpoint is unclear.]`,
  },
  {
    id: "bestiary_vexlar", title: "Bestiary: Vexlar", icon: '🐆', unlocked: false,
    unlockHint: "Defeat 250 Vexlars to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Apex Predator — Designation VEXLAR-PRIME]
[Common Arena Name: Vexlar]
[Status: Active Arena Stock, Acts I-II]

ORIGIN:
The Vexlar is native to the highland savannas of Greth-7, where it sits at the top of a food chain that includes several species previously considered apex predators. The Vexlar is iridescent, six-limbed, and hunts by a combination of scent-tracking and a neurological process that the Empire's xenobiologists describe as "pre-emptive targeting" — it identifies which prey will separate from the group before the prey has decided to move.

Six-limbed apex predators are common in the Empire's collection. Ones that select targets this precisely are not.

COMBAT PROFILE:
The Vexlar is well-armored, hits hard, and closes ground faster than anything its size should. Its primary ability, Predator Leap, covers vast distance in a single bound and delivers a full strike on arrival. It selects the weakest-armored target in its range — which in most squads means your damage dealer or support unit.

Statistically, the Vexlar's opening Predator Leap determines whether the engagement goes smoothly. If it reaches its intended target unobstructed, the rest of the fight is played on its terms.

BEHAVIORAL NOTES:
Unlike most arena fauna, the Vexlar does not require conditioning to fight. It treats the arena as a valid hunting ground and the player squad as valid prey. Arena trainers report that Vexlars are not aggressive toward staff — they simply do not categorize staff as prey.

This distinction, arena trainers note, does not feel like a compliment.

[ACQUISITION NOTE: The Greth-7 sourcing team reported that capturing the Vexlar was straightforward. They tranquilized one. It woke up during transit, assessed the containment vessel, and apparently decided it was adequate. It has not attempted to escape since. The sourcing team finds this more alarming than an escape attempt would have been.]`,
  },
  {
    id: "bestiary_mog_toxin", title: "Bestiary: Mog Toxin", icon: '☣️', unlocked: false,
    unlockHint: "Defeat 250 Mog Toxins to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Corrosive Organism — Designation MOG-III]
[Common Arena Name: Mog Toxin]
[Status: Active Arena Stock, Act II]

ORIGIN:
The Mog are found throughout the Empire's outer territories — specifically in the industrial runoff zones of mid-tier colony worlds, where chemical waste has created an ecological niche that something, eventually, evolved to fill. The Mog Toxin is that something. It feeds on corrosive compounds, stores them, and releases them when threatened. Evolution did not intend this as a weapon. It happened anyway.

The Empire's scouts found the Mog Toxin after three colony administrators reported that their waste management infrastructure had developed a behavioral pattern. Investigation confirmed: the infrastructure was fine. The Mog had simply moved in.

COMBAT PROFILE:
The Mog Toxin is a mid-range threat. It stays at distance and applies Acid Spray — a targeted corrosive burst that strips armor from everything nearby, leaving targets significantly more vulnerable to follow-up damage. This is most dangerous when stacked with existing debuffs or combined with a heavy attacker.

Its resilience is not remarkable. It relies on being a secondary priority — something you defer dealing with until it has already done significant work.

BEHAVIORAL NOTES:
The Mog Toxin has not demonstrated identifiable tactical behavior. It approaches, it sprays, it approaches again. Arena xenobiologists classify its combat pattern as "stimulus-response" rather than strategic.

What it does demonstrate is an apparent preference for targets already showing reduced defense. Whether this constitutes threat assessment or a simpler chemoreceptor response is unclear.

[CONTAINMENT NOTE: Mog Toxin holding units require full acid-resistant lining and a two-atmosphere pressure seal. Three holding units have dissolved since Act II deployment began. We have adjusted the materials budget. We have also stopped sending new staff to inspect holding units without equipment.]`,
  },
  {
    id: "bestiary_qrix_hunter", title: "Bestiary: Qrix Hunter", icon: '🏹', unlocked: false,
    unlockHint: "Defeat 250 Qrix Hunters to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Void-Adapted — Contracted Operative]
[Common Arena Name: Qrix Hunter]
[Status: Active Arena Stock, Act II]

ORIGIN:
The Qrix are a void-adapted species — born and functionally optimized for open space. Their biology tolerates radiation exposure, pressure extremes, and long-duration transit that would incapacitate most species within days. They have no homeworld. They have never needed one. The Qrix operate from mobile fleet networks that have been navigating Imperial and pre-Imperial space for longer than the Empire's own records extend.

What the Qrix do, primarily, is move things. Long-haul freight, hazardous cargo, deep-void courier runs, xenobiological acquisition for clients who would rather not make the trip themselves — if it needs to get somewhere difficult, the Qrix will get it there. Several of the Vol'Krath's own fauna shipments arrived in Qrix holds. The Grox capture, in particular, was subcontracted to a Qrix fleet. We did not ask what they charged the capture team.

Arena deployment is one contract offering among many. Some Qrix take Vol'Krath engagements because the pay rate is high and a fighter's reputation earned inside an Imperial arena carries premium weight on outside contracts. A Hunter who has survived three seasons of act-level combat commands considerably better rates for everything else afterward.

COMBAT PROFILE:
The Qrix Hunter is defined by reach and precision. Pinning Shot — a high-power bolt delivered at extended range — hits hard against a single target, and the Qrix will always identify the highest-value target before triggering it. Its own defenses are minimal. The Qrix operates on the assumption that it will not be hit.

In practice, that assumption holds more often than it should.

BEHAVIORAL NOTES:
Qrix Hunters engage with the arena as a professional environment. They arrive, assess sightlines, select a position, and operate from it. If the position is compromised, they reposition. They do not panic and they do not rush.

Three Qrix Hunters have, at different points, filed formal complaints with Arena Authority about perceived arena layout disadvantages. Two of the complaints were technically valid. One resulted in a tile adjustment.

[ACQUISITION NOTE: The Qrix Syndicate provides post-engagement performance reports on their operatives. We did not request these. They began arriving after the third deployment. The reports are detailed, well-formatted, and contain several suggestions for improving arena conditions. We have implemented two of them. We have not told the Syndicate.]`,
  },
  {
    id: "bestiary_void_wraith", title: "Bestiary: Void Wraith", icon: '👻', unlocked: false,
    unlockHint: "Defeat 250 Void Wraiths to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: UNKNOWN — Anomalous Lifeform — Designation WRAITH-CLASS]
[Common Arena Name: Void Wraith]
[Status: Active Arena Stock, Act II]

ORIGIN:
The Void Wraith does not appear in any catalogued species database. The Empire's xenobiological archives, which contain entries for over 400,000 known lifeforms, return no matches. The physical signature is inconsistent with known organic matter — thermal readings fluctuate, mass readings contradict themselves, and direct observation produces results that differ by observer.

The Empire acquired the first Void Wraith when one appeared inside a sealed containment vault on Station Vel-Keth-9. No record exists of how it entered. Arena Authority added it to the roster after determining it would attack player characters reliably. Classification remains: UNKNOWN.

COMBAT PROFILE:
The Void Wraith is defined by mobility. Shadow Step — which bypasses terrain and delivers the Wraith adjacent to its chosen target in a single action — makes positioning against it nearly irrelevant. It hits hard on arrival, but its own defenses are almost nonexistent.

The Wraith's threat model is: reach you before you prepare, hit hard, disappear. In Act II, before squads have developed strong area control, it executes this reliably.

BEHAVIORAL NOTES:
The Void Wraith is drawn to warmth. Specifically, to biological heat signatures. Arena xenobiologists believe this is the closest approximation to a food drive that the Wraith possesses — it approaches living things the way other predators approach prey, but without any observed feeding behavior afterward.

What happens after a Wraith reaches its target and there is nothing left to approach has not been documented. Arena staff are instructed not to remain in the arena after a match where a Wraith was deployed. The instructions do not explain why. Staff have learned not to ask.

[CLASSIFIED NOTE: Three containment attempts have failed. Each time, the Wraith was found in a different location than the containment unit — inside a solid wall, inside a staff locker, inside the administrative filing system (no physical damage to the filing system was detected). Current containment strategy: provide it an arena entrance on match days and trust that it returns afterward. It always has. We do not know why.]`,
  },
  {
    id: "bestiary_velzar", title: "Bestiary: Vel'Zar — Emperor's Will", icon: '🌌', unlocked: false,
    unlockHint: "Defeat Vel'Zar — Emperor's Will to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: IMPERIAL CONSTRUCT — Seven-Form War Entity — DESIGNATION REDACTED]
[Common Arena Name: Vel'Zar — Emperor's Will]
[Status: Active Arena Stock, Act IV — FINAL ENCOUNTER]

ORIGIN:
Arena Authority does not have origin documentation for Vel'Zar. The entity was installed in the Vol'Krath's highest-security holding bay approximately 90 chronocycles before the current operating period began. The installation order came directly from the Emperor's Office. No briefing accompanied the order.

What we know comes from the match record: Vel'Zar has fought 300 sanctioned engagements across three centuries of Vol'Krath operation. Vel'Zar has never lost. In 300 matches, across 300 squads, spanning nine species, four centuries of combat evolution, and every tactical variant Arena Authority has documented, the entity has never lost.

COMBAT PROFILE:
Vel'Zar — Emperor's Will is the most capable combat entity in the Vol'Krath by every measurable metric. Seven-limbed. Fast. Durable beyond anything else Arena Authority has fielded.

Its ability suite operates in layers. Emperor's Verdict delivers true damage to the entire squad simultaneously — armor provides no protection. Void Sunder strips defenses from everyone. Imperial Mandate stuns at close range. When sufficiently wounded, Apex Ascension triggers: Vel'Zar becomes briefly invincible while growing permanently stronger. When pushed further still, Total Authority triggers a final permanent enhancement across all combat capabilities.

There is no degraded form of Vel'Zar. It becomes more dangerous as it sustains damage, and it has never been reduced to a state where that stopped mattering.

BEHAVIORAL NOTES:
Vel'Zar does not fight. "Fight" implies a contest between parties of comparable capability. What Vel'Zar does is execute. It has a preferred sequence, it adapts when deviated from, and it does not appear to experience the match as threatening in any phase.

Arena staff who have reviewed the full 300-match archive describe a consistent quality across every engagement: Vel'Zar moves as though it already knows what you will do. Former opponents who survived — those few who left via medical rather than memorial — declined to elaborate when asked what it felt like from the other side.

One wrote a single word in the post-match debrief form. The form has been sealed. Its contents are classified above Arena Authority clearance.

[IMPERIAL NOTE: The Emperor has provided one instruction regarding Vel'Zar — Emperor's Will: "It will not need anything from you. Do not interfere with it." Arena Authority has honored this instruction for three centuries.

We are aware that a clone squad has reached Act IV. We are aware of their record. This is the first time in 300 matches that we have written this note and not known how the match would conclude.]`,
  },

  {
    id: "bestiary_zyx_swarmer", title: "Bestiary: Zyx Swarmer", icon: '🦟', unlocked: false,
    unlockHint: "Defeat 250 Zyx Swarmers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Hive Fragment Cluster — Designation ZYX-EPSILON]
[Common Arena Name: Zyx Swarmer]
[Status: Active Arena Stock, Act I (Late Encounters)]

ORIGIN:
A Zyx Swarmer is not a different species from the Zyx Skitter. It is a failed separation — three hive fragments that tried to divide from one another and did not complete the process. They share a degraded drive loop, a single simplified instinct distributed across three bodies that are no longer fully coordinating but cannot fully stop. Individually, each fragment is smaller and weaker than a standard Skitter. Together, they are a sustained problem.

Arena Authority was not aware this variant existed until a shipment arrived with the count wrong. The manifest listed twelve fragments. The actual count was thirty-six. The difference in mass was not detectable at standard weighing intervals.

COMBAT PROFILE:
Three simultaneous bodies with identical threat behavior creates a math problem rather than a tactical one. Each Swarmer moves at full Skitter speed. Swarm Bite remains intact — each fragment can trigger a localized burst individually. The added threat is attrition: Swarm Wounds, the variant's secondary behavior, applies a persistent bleed to any target it reaches. Against a squad facing all three bodies simultaneously, the damage stacks before anyone can address it.

BEHAVIORAL NOTES:
Swarmer engagements produce the highest crowd enthusiasm rating of any Act I encounter. Arena Authority initially attributed this to spectacle. A closer review of the footage suggests the audience is simply responding to the bodies.

[ACQUISITION NOTE: The manifest discrepancy was reported to the supply division. The supply division responded that the fragments were correctly counted as twelve. They had counted each cluster, not each body. This distinction has since been added to the acquisition intake form.]`,
  },
  {
    id: "bestiary_zyx_remnant", title: "Bestiary: Zyx Remnant", icon: '💀', unlocked: false,
    unlockHint: "Defeat 100 Zyx Remnants to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Isolated Hive Fragment — Ancient Specimen — Designation ZYX-OMEGA]
[Common Arena Name: Zyx Remnant]
[Status: Active Arena Stock, Act III]

ORIGIN:
The Zyx Remnant is a fragment that has been separated from the Hive for long enough that Arena Authority xenobiologists are no longer certain what to call it. It is not operating on the simplified instinct loop that governs a Skitter or Swarmer. What it is operating on, we cannot determine. Its drive pattern does not match any documented hive fragment state. It does not match any documented fauna state. Arena Authority has filed three separate classification requests over fourteen years. All three have been returned unanswered.

What we know: it is old. The electromagnetic residue on its outer membrane suggests it has been drifting through Zyx Hive transit corridors for longer than the Vol'Krath has been operational. Whether the Hive knows it exists is unknown. Whether it knows the Hive still exists is equally unknown.

COMBAT PROFILE:
The Remnant does not move fast. It does not need to. Its primary behavior — a localized resonance pulse that pulls everything in its proximity toward it — means the arena comes to the Remnant rather than the other way around. Once close, its strike is slow but anchoring, leaving targets unable to create distance. Fighting the Remnant from range is not an option. Fighting it up close is also not an option. This tension is what makes it dangerous.

BEHAVIORAL NOTES:
Arena staff have noticed that the Remnant occasionally pauses between engagements and appears to be doing nothing. Xenobiologists reviewed the footage. During these pauses, it is producing a low-frequency vibration in the range associated with Hive coordination signals.

No Hive has responded. The Remnant keeps transmitting.

[CLASSIFIED NOTE: In one documented match, the Remnant survived to the end of a fight with zero HP registered in the arena system. No recording error was detected. It resumed normal behavior in the next encounter. Arena Authority has not filed a report on this. We are not sure how to.]`,
  },
  {
    id: "bestiary_qrix_hauler", title: "Bestiary: Qrix Hauler", icon: '⚓', unlocked: false,
    unlockHint: "Defeat 100 Qrix Haulers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Void-Adapted — Cargo Specialist]
[Common Arena Name: Qrix Hauler]
[Status: Active Arena Stock, Acts I (Elite) / II]

ORIGIN:
Not all Qrix are built for speed. The void-transit economy runs on two pillars: the fast movers who find the routes, and the heavy haulers who make the routes matter. A Qrix Hauler's physiology has adapted toward mass-tolerance — wider frame, denser musculature, a pressure resistance profile designed for the kind of cargo runs that would rupture a standard hull. They do not move quickly. They do not need to.

Haulers in the arena are not recruited from the specialist contract market. They take these engagements between transit runs — the Vol'Krath is a layover, not a career. Their presence in Act I is almost incidental. They are passing through on the way to a freight contract and the rates were acceptable.

COMBAT PROFILE:
The Hauler does not pursue. It plants itself and waits for the engagement to come to it, then applies the same technique it uses for cargo manipulation: Dead Weight, a controlled application of mass and leverage that locks a target in position for an extended period. Combined with a frame that absorbs incoming damage at a rate that frustrates most standard approaches, the Hauler functions as a mobile obstacle that hits back.

BEHAVIORAL NOTES:
Multiple Qrix Haulers have been observed filling out Qrix Syndicate performance reports during the brief intervals between engagement rounds. Arena staff raised this with the Syndicate. The Syndicate noted that the forms are time-sensitive and the engagements are not.

[ACQUISITION NOTE: The Qrix Syndicate classifies Hauler arena engagements as "transit rest stop supplemental income" in their accounting records. We have asked them to reclassify this under combat contracting. They said that would require a different form. We have not followed up.]`,
  },
  {
    id: "bestiary_qrix_salvager", title: "Bestiary: Qrix Salvager", icon: '🔧', unlocked: false,
    unlockHint: "Defeat 250 Qrix Salvagers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Void-Adapted — Recovery Specialist]
[Common Arena Name: Qrix Salvager]
[Status: Active Arena Stock, Act II]

ORIGIN:
A Qrix Salvager's trade is decomposition — not biological, but material. They strip disabled vessels in the void, recovering components that can be sold, recycled, or repurposed. After enough years doing this, a Salvager develops a particular kind of patience and a particular set of tools: corrosive compounds for dissolving hull sections, electromagnetic disruptors for deactivating subsystems, leverage equipment for extracting components that do not want to come out.

All of these translate directly to arena combat. The Salvager is not surprised by this. Every surface is material. Every opponent is a system to be taken apart.

COMBAT PROFILE:
The Salvager's threat is not raw damage — it is disruption. Reroute, their primary ability, applies corrosive compounds that cause persistent bleeding and simultaneously disrupts the target's operational capacity. A silenced character cannot use abilities. A bleeding character loses HP whether or not anyone is attacking them. The Salvager then continues moving, reassesses the field, and selects the next system to decompose.

BEHAVIORAL NOTES:
Qrix Salvagers submit the most detailed post-engagement reports Arena Authority receives from any contracted species. Every match is logged: target selection rationale, terrain assessment, timing of ability use, recommendations for arena layout improvements. Arena Authority has implemented three of these recommendations.

The Salvager whose suggestion was rejected filed a formal objection citing arena safety protocol section 7. We reviewed section 7. The Salvager was correct.

[ACQUISITION NOTE: Salvager contracts include a clause permitting the Salvager to retain any items recovered from the arena floor post-engagement. Arena Authority did not notice this clause for six contracts. We have since noticed.]`,
  },
  {
    id: "bestiary_qrix_voidbreacher", title: "Bestiary: Qrix Voidbreacher", icon: '⚡', unlocked: false,
    unlockHint: "Defeat 100 Qrix Voidbreachers to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Sapient Species — Void-Adapted — Elite Operative]
[Common Arena Name: Qrix Voidbreacher]
[Status: Active Arena Stock, Act III Elite]

ORIGIN:
Standard Qrix void-adaptation is a biological baseline — adequate for deep-space transit, comfortable in radiation environments, functional without atmospheric pressure. A Voidbreacher is what happens when a Qrix continues pushing past that baseline across decades of deep-void exposure. The adaptation compounds. What began as tolerance becomes something else: dampened pain response, reaction timing that Arena Authority's instrumentation cannot fully measure, a spatial awareness that operates on information other species cannot perceive.

The Vol'Krath does not recruit Voidbreachers through the standard Qrix Syndicate contract process. They have their own rates. Their own terms. Their own assessment of which arenas are worth their time. The Vol'Krath qualified. We were informed of this. We were not asked.

COMBAT PROFILE:
The Voidbreacher closes distance in a way that makes "positioning" a theoretical concept. Phase Step — a void-adapted transit burst — places them adjacent to the chosen target before any response is possible, and the dimensional disruption on arrival silences the target for long enough to finish the engagement before ability use is an option. They hit hard. Their defenses are thin. The expectation is that they will not be hit, because there will not be time to hit them.

This expectation has been correct in the majority of recorded engagements.

BEHAVIORAL NOTES:
A Qrix Voidbreacher's post-match rate is three times the standard Hunter contract. Arena Authority has been asked not to disclose this figure to other contracted arenas. We agreed. We are disclosing it here because this is an internal document.

[ACQUISITION NOTE: We inquired whether a Voidbreacher would be available for permanent arena placement. The Voidbreacher responded that permanent placement would reduce their market rate by removing scarcity. They are correct. We have not asked again.]`,
  },
  {
    id: "bestiary_cryo_drifter", title: "Bestiary: Cryo Drifter", icon: '🧊', unlocked: false,
    unlockHint: "Defeat 250 Cryo Drifters to unlock",
    text: `[ZNYXORGAN ARENA AUTHORITY — LIFEFORM CATALOGUE]
[Classification: Alien Fauna — Deep-Cold Lifeform — Designation CRYO-THETA]
[Common Arena Name: Cryo Drifter]
[Status: Active Arena Stock, Act III]

ORIGIN:
The Cryo Drifter was sourced from the cryogenic transit corridors of the outer drift — the unmaintained shipping lanes where no active freight runs and temperature approaches absolute zero. In that environment, an organism does not survive by generating heat. It survives by becoming cold — by matching its biology so precisely to its surroundings that it registers as part of the environment rather than an anomaly within it.

The Cryo Drifter does not have a body temperature in any conventional sense. It has a thermal profile: a field of accelerated heat extraction that surrounds it at all times. Anything that enters the field loses heat faster than its biological systems can compensate. This is not an attack. This is simply what the Drifter is.

COMBAT PROFILE:
Contact with a Cryo Drifter anchors targets in position — the rapid thermal drain causes muscular system impairment that manifests as inability to move. Individual strikes Frost-anchor a single target; the Cryo Pulse ability produces the same effect across a wide area simultaneously. The Drifter itself is not fast. It does not need to be. If the squad cannot disengage, speed becomes irrelevant.

BEHAVIORAL NOTES:
Arena heating costs for Cryo Drifter matches are significant. The arena temperature drops measurably within two rounds of deployment. Arena Authority has attempted to resolve this with supplemental heating units. The Drifter appears to consume these as well.

Staff are instructed not to spend extended time in the arena after Cryo Drifter deployment. This instruction is followed. The arena returns to standard temperature in approximately forty minutes, assuming no additional Drifters are present.

[SAFETY NOTICE: Do not touch a Cryo Drifter without thermal insulation rated for cryogenic contact. This notice has been issued twenty-two times. It has not always been heeded. Staff turnover in the containment division has been noted.]`,
  },

  // ── Inter-Clone Conversations ──────────────────────────────────────────────
  {
    id: 'conversation_davinci_beethoven', title: 'Recovered Audio — The Mechanism', icon: '🎵', unlocked: false,
    unlockHint: 'Play 10,000 total cards to unlock',
    text: `[ARENA ENVIRONMENTAL RECORDING — RECOVERED AUDIO]
[Location: Recovery Wing, Corridor 11-C, between holding chambers]
[Subjects: L-001 (Da Vinci), B-001 (Beethoven)]
[Languages: Italian | German, translated]
[Context: Recorded approximately 4 chronocycles after match #3,207. Both subjects had been on the same squad. Squad performance exceeded projections by 41%.]

L-001: I have a question.

B-001: You always have a question.

L-001: During the third engagement. You changed tempo. The — I don't know your word for it. You were conducting in 3/4 and then you shifted. Something faster. Irregular.

B-001: 7/8.

L-001: That is not a time signature I know.

B-001: It is now.

L-001: When you shifted, Y-001 changed her flanking angle by twelve degrees. She did this before N-001 gave the order. She did it before N-001 had the idea. I was watching. I am always watching.

B-001: [pause] Yes.

L-001: How?

B-001: How what?

L-001: How does a rhythm in your fingers change the trajectory of a person forty meters away who is not listening to you?

B-001: She is listening to me. They are all listening to me. They don't know they're listening.

L-001: That is not an explanation. That is a description.

B-001: [laughter — short, not unkind] You want a diagram.

L-001: I always want a diagram.

B-001: There is no diagram. I hear the fight. The fight has a rhythm. When the rhythm is wrong, people die. When the rhythm is right, they don't. I adjust the rhythm. I don't know how. I know that it works.

L-001: That is the most frustrating thing anyone has ever said to me.

B-001: More frustrating than the ventilation system?

L-001: I redesigned the ventilation system. I cannot redesign this.

[Silence — approximately 6 seconds.]

L-001: I have studied anatomy. I have studied optics, hydraulics, geology, flight. I have taken apart every mechanism I have encountered in this facility and I have understood all of them. Some took longer than others. But I understood them.

B-001: And this?

L-001: This I do not understand.

B-001: Does that bother you?

L-001: No. It is the first thing in this place that has genuinely surprised me. Everything else here is engineering. Alien engineering, impressive engineering, but engineering. I can see the seams.

B-001: And you can't see the seams in this.

L-001: There are no seams. That is what is exciting.

B-001: [quietly] The Ninth Symphony was like that.

L-001: What?

B-001: I wrote it deaf. I could not hear a single note. I wrote it from the architecture — the mathematical structure, the intervals, the relationships between voices. I built it like a cathedral. It should have worked because the math was right.

L-001: And?

B-001: And when they played it — when the orchestra played it and the audience heard it — what happened in that room was not math. It was something the math pointed at but could not contain.

L-001: [very quietly] You are describing a phenomenon that exceeds its own mechanism.

B-001: I am describing music.

[Silence — approximately 4 seconds.]

L-001: I think I would like to watch you conduct. Properly. With instruments.

B-001: We don't have instruments.

L-001: Give me eleven days.

B-001: You're going to build instruments.

L-001: I am going to build instruments.

[BIOMANCER NOTE — Drex-9: Recommend continued monitoring of L-001/B-001 interactions. If L-001 builds instruments, I want to hear the result. This does not appear in the official log.]`,
  },
  {
    id: 'conversation_leonidas_hannibal', title: 'Recovered Audio — The Pass and the Angle', icon: '🛡️', unlocked: false,
    unlockHint: 'Win 5 fights in a row to unlock',
    text: `[ARENA ENVIRONMENTAL RECORDING — RECOVERED AUDIO]
[Location: Arena floor, western staging area, post-match cooldown]
[Subjects: L-002 (Leonidas), H-002 (Hannibal)]
[Languages: Ancient Greek | Punic, translated]
[Context: Recorded 2 chronocycles after match #3,891. Both subjects were on opposing squads during a training exercise. The exercise ended in a draw — the first recorded draw in 200 sessions.]

L-002: You went left.

H-002: You expected me to go right.

L-002: Everyone goes right. The sight line favors it.

H-002: Which is why I went left.

L-002: Through the hazard zone.

H-002: Through the hazard zone.

L-002: That should have killed you.

H-002: It did not.

[Silence — approximately 8 seconds.]

L-002: I held the center for nine rounds.

H-002: I know. I was trying to break it for nine rounds.

L-002: You did not break it.

H-002: You did not catch me.

H-002: Your doctrine is wrong, you know.

L-002: My doctrine held Thermopylae for three days.

H-002: Your doctrine died at Thermopylae in three days.

L-002: Yes. That was the point.

H-002: [pause] This is where we disagree. The point is to win.

L-002: The point is to hold.

H-002: Holding a position you cannot keep is not strategy. It is theater.

L-002: Theater that lasted twenty-four centuries.

H-002: [quiet laughter] Fair.

H-002: Cannae was the opposite of Thermopylae. I gave ground. I let them push me back. I let them think they were winning. And then I closed the sides.

L-002: I know Cannae. Eighty thousand Romans.

H-002: Seventy. The histories round up.

L-002: You find the angle. I hold the line. We are not the same.

H-002: No.

[Silence — approximately 6 seconds.]

L-002: But you understand the three hundred.

H-002: [pause] I understand choosing a position you know will kill you because the position matters more than you do. Yes. I understand that.

L-002: You have done it.

H-002: I took elephants across a mountain range in winter. I knew what it would cost. I did it anyway.

L-002: Why?

H-002: Because the mountain was the only way. Because going around was what they expected. Because the cost was the price of surprise, and surprise was worth any price.

L-002: That is not so different from holding a pass.

H-002: No. It is not.

L-002: A good death serves something larger than the one who dies.

H-002: Yes.

L-002: The three hundred knew this.

H-002: The elephants knew this.

L-002: Next time, go right.

H-002: Next time, don't hold the center.

L-002: I will always hold the center.

H-002: I know. That is why I will always go left.

[BIOMANCER NOTE — Drex-9: Two subjects with diametrically opposed tactical doctrines have independently arrived at identical conclusions about the nature of sacrifice. Echo convergence across unrelated reconstruction lines. Filing under Project Genesis, Case PG-12.]`,
  },
  {
    id: 'conversation_teddy_mansa', title: 'Recovered Audio — The Canal and the Gold', icon: '🤠', unlocked: false,
    unlockHint: 'Find 25 different items to unlock',
    text: `[ARENA ENVIRONMENTAL RECORDING — RECOVERED AUDIO]
[Location: Cafeteria, Level 3, table 7 (corner, near the viewport)]
[Subjects: T-001 (Teddy Roosevelt), M-001 (Mansa Musa)]
[Languages: English | Manding, translated]
[Context: Recorded during standard meal interval. Both subjects were on the same squad for match #4,016. Squad won. T-001 has been talking since the match ended approximately 40 minutes ago. M-001 has been eating.]

T-001: — and so I said to them, "the canal is not going to build itself!" And they said the engineering was impossible, and I said, BULLY, everything is impossible until someone does it, and we BUILT the canal. Through a JUNGLE. With MALARIA.

M-001: [sound of calm chewing] You enjoy building things.

T-001: I enjoy EVERYTHING. That is the secret, Musa. Most people look at a swamp full of mosquitoes and they see a swamp full of mosquitoes. I look at a swamp full of mosquitoes and I see a canal that connects two oceans and also an excellent opportunity to study tropical disease vectors.

M-001: [quiet laughter] You are the loudest person I have ever met. And I traveled with a caravan of sixty thousand people.

T-001: Sixty thousand! Now THAT is an expedition. Tell me about the gold again.

M-001: I have told you about the gold three times.

T-001: Tell me again. I like the part about Egypt.

M-001: I carried gold across the Sahara. Enough gold that my caravan was visible from the hills outside the cities we approached. When we reached Cairo, I gave it away. To the poor. To the mosques. To anyone who asked and many who did not.

T-001: And you crashed their economy!

M-001: I did. The price of gold fell so far that the markets did not recover for ten years. I had to borrow money on the way home — at interest — to correct the imbalance.

T-001: [laughing — loud, genuine, the kind that turns heads across species] That is the BEST economic policy I have ever heard.

M-001: It was not policy. It was obligation. When God gives you more than you need, the surplus belongs to others. This is not generosity. This is arithmetic.

T-001: [suddenly quieter] You know, I never thought about it that way.

M-001: How did you think about it?

T-001: Where I come from, power is something you take. You charge the hill. You build the canal. You hunt the lion. You make things happen by force of will and an unreasonable amount of personal enthusiasm.

M-001: And where I come from, power is something you give away. You build the library. You fund the scholars. You feed the city. You make things happen by making other people capable of things they were not capable of before.

T-001: [long pause] That's actually better. That's actually better than charging the hill.

M-001: I did not say that.

T-001: No, but you're thinking it.

M-001: [amused] I have been told I have such a look.

T-001: You crashed Egypt's economy with KINDNESS, Musa. I charged up San Juan Hill with a cavalry regiment. Both worked. But yours kept working after you left.

M-001: Timbuktu had the largest library in the world for two hundred years. I did not build it alone. But I made sure there was gold for the scholars, and stone for the walls, and food for the people who kept the lights burning.

T-001: [quietly] That's what I should have done with the national parks. Not just protected them. Funded them forever.

M-001: You protected them. That was enough.

T-001: It is NEVER enough. But it's a good start. Next run, I want you on my squad again.

M-001: You say this to everyone.

T-001: I MEAN it with everyone! But with you specifically — you make us richer. Not gold. The other kind.

M-001: [warmth in the voice] You remind me of my generals. They were also very loud. I was fond of them.

T-001: BULLY!

[BIOMANCER NOTE — Drex-9: T-001 and M-001 represent incompatible models of power projection, yet consistently perform +28% above squad baseline when paired. M-001 amplifies what others already are. Including the volume. Especially the volume.]`,
  },
  {
    id: 'conversation_napoleon_sunsin', title: 'Recovered Audio — The Mirror', icon: '⚔️', unlocked: false,
    unlockHint: 'Play 500 total fights to unlock',
    text: `[ARENA ENVIRONMENTAL RECORDING — RECOVERED AUDIO]
[Location: Arena observation deck, upper tier, after-hours. Unauthorized access — entry method undetermined.]
[Subjects: N-001 (Napoleon), Y-001 (Yi Sun-sin)]
[Context: Recorded 6 chronocycles after match #4,330. Match involved a destroy_base objective with multiple spawn waves. Squad won in 11 rounds — 4 rounds faster than the previous record.]

N-001: You changed the formation at round seven.

Y-001: You noticed.

N-001: I always notice. You pulled the left flank back thirty degrees and pushed the right forward. It looked like a mistake.

Y-001: It was not a mistake.

N-001: I know. You were creating a current.

Y-001: [pause] That is an interesting word to use.

N-001: It is the correct word. You do not think in positions. You think in flow. Where the enemy wants to go, you create a channel. Where you want them to go, you remove the obstacles. You do not fight them. You move them.

Y-001: At Myeongnyang, I had thirteen ships. They had three hundred and thirty. The strait was narrow — one ship wide at the choke. Every commander in my fleet wanted to retreat. The math was clear.

N-001: You used the current.

Y-001: The tide reversed every six hours. I positioned at the choke when the current ran against them. Three hundred ships, and the sea itself was fighting on my side. They could not advance. They destroyed each other trying to maneuver.

N-001: Austerlitz was the same principle.

Y-001: Tell me.

N-001: The Pratzen Heights. I gave them to the enemy. Deliberately. I let them occupy the high ground because I knew they would commit everything to holding it. While they reinforced the heights, I hit the center — the hinge — and the whole army folded in on itself. I did not defeat them. I made them defeat themselves.

Y-001: You created a current on land.

N-001: [quiet sound — almost a laugh] Yes. That is exactly what I did.

Y-001: You command from inside the formation. You are the center. Everything radiates from where you stand.

N-001: And you command from above. You see the entire field as a single system. You do not lead the fleet — you conduct it.

Y-001: B-001 would appreciate that word choice.

N-001: I chose it deliberately. You and Beethoven do the same thing. She does it with rhythm. You do it with geometry.

Y-001: I learned this from the sea. The sea does not have a commander. Every wave is connected to every other wave. If you understand the system, you do not need to give orders.

N-001: And on land, the fog of war is total. No one can see the whole field. So you must be the whole field.

Y-001: At Noryang, my last battle, I was hit by a musket ball. I told my officers to cover my body with a shield and keep fighting. I died and the fleet won.

N-001: At Waterloo, I lost. I have thought about why I lost every day for however many centuries. I know exactly what I did wrong. I will not do it again.

Y-001: You carry the defeat.

N-001: You carry the victory.

Y-001: I carry the death. The victory belonged to the fleet.

N-001: [very quietly] That is the difference between us. I see what should be won. You see what it costs to win it.

Y-001: Between the two of us, we see the whole field.

N-001: Next engagement — let me command the center. You take the geometry.

Y-001: I was going to suggest the same thing.

N-001: I know. I always know.

Y-001: So do I.

[Subjects exited via a route not covered by standard monitoring. Access method remains undetermined.]

[BIOMANCER NOTE — Drex-9: When paired, their combined performance exceeds individual projections by a factor I am not comfortable publishing because it will generate questions I cannot answer. The echo does not just carry memory. It carries mastery. And mastery recognizes itself.]`,
  },

  // ── Drex-9 Bestiary Addenda ───────────────────────────────────────────────
  {
    id: 'drex9_on_hive', title: 'Drex-9 Addendum — On the Crystalline Hive', icon: '🔬', unlocked: false,
    unlockHint: 'Destroy 250 Crystalline Hives to unlock',
    text: `[BIOMANCER DIVISION — BESTIARY ADDENDUM]
[Subject: Crystalline Hive — Combat Behavioral Analysis]
[Observer: Drex-9, Senior Biomancer]

The Hive has been in the Vol'Krath rotation for eleven thousand cycles. In that time, forty-three sapient species have faced it in the arena. The standard tactical approach — across all forty-three — is brute attrition. Hit it harder. Hit it faster. Overwhelm the resonance field before it amplifies.

Forty-three species. Eleven thousand cycles. One approach.

The vel'nor figured out the resonance pattern in match six. By match fourteen, they were using it against the Hive.

N-001 noticed the frequency spike that precedes shard fragmentation. She communicated — through means I still cannot identify on the audio — a timing window to the others. They started striking in counter-rhythm. Synchronized. Deliberate. They turned the Hive's own harmonic amplification into a feedback loop and shattered it from the inside out.

It took us sixty thousand years to theorize that approach. We published it as a hypothetical in the Xenocombat Review. Peer-reviewed. Considered impractical for field application.

She did it with a sword and no formal education in wave mechanics.

I have since reviewed the vel'nor's original historical record. Apparently the one called Beethoven — a musician — went deaf and continued composing by feeling vibrations through the floor.

They do not study frequencies. They feel them. I am increasingly unsure which method is more advanced.

— Drex-9`,
  },
  {
    id: 'drex9_on_grox', title: 'Drex-9 Addendum — On the Grox Magnetar', icon: '🔬', unlocked: false,
    unlockHint: 'Defeat 200 Grox Magnetars to unlock',
    text: `[BIOMANCER DIVISION — BESTIARY ADDENDUM]
[Subject: Grox Magnetar — Combat Behavioral Analysis]
[Observer: Drex-9, Senior Biomancer]

The Grox has one significant tactical advantage: its electromagnetic field disrupts neuromuscular coordination in carbon-based lifeforms at close range. Every species we have tested eventually develops the same response — stay out of the field. Maintain distance. Use ranged tactics.

The vel'nor developed distance tactics. Then they stopped using them.

Match 73. N-001 was in a compromised position — pinned against the arena wall, ranged options exhausted. The Grox was closing. The field was at full output. By every metric, she should have retreated through the flanking corridor L-001 had opened for her.

She ran directly into the field.

I have the telemetry. Her vital signs spiked to near-lethal. Muscle groups began seizing. And then — and I need to be precise here because the Emperor's office will ask — she used the electromagnetic pull to accelerate her own charge. She let the field take her forward faster than she could have moved on her own, turned the involuntary momentum into a strike, and hit the Grox's core at a velocity my models register as "inadvisable for continued biological function."

The Grox went down.

N-001 stood there for approximately three seconds, shaking, bleeding from the nose, visibly unable to feel her own hands. Then she turned to G-001, who had watched the entire thing, and said: "That worked better than I expected."

She treated physics as a suggestion. I do not have a professional framework for that.

— Drex-9`,
  },
  {
    id: 'drex9_on_naxion', title: 'Drex-9 Addendum — On the Naxion Shieldbearer', icon: '🔬', unlocked: false,
    unlockHint: 'Defeat 200 Naxion Shieldbearers to unlock',
    text: `[BIOMANCER DIVISION — BESTIARY ADDENDUM]
[Subject: Naxion Shieldbearer — Combat Behavioral Analysis]
[Observer: Drex-9, Senior Biomancer]

The Naxion situation has become complicated.

I reported previously that the Naxion veth-nar hold back in matches against the vel'nor. Arena Authority flagged it. Audience Engagement flagged it. I flagged it. Everyone has flagged it. The Naxion acknowledged the observation and continued doing it anyway, because the Naxion are the Naxion and they will do what they consider honorable regardless of what anyone flags.

What I did not expect: the vel'nor noticed.

Match 204. L-002 was facing a Naxion veth-nar in the mid-ring. The Naxion had her outmatched. It was obvious. The Naxion pulled a strike that would have ended the engagement.

L-002 stopped fighting. She planted her shield. She looked the Naxion in the eye — which is significant, the Naxion have seven — and said, through clenched teeth: "Stop patronizing me."

The translator rendered this in Naxion battle-tongue. The veth-nar went still for a long time. Then it raised its shield to full guard position — the Naxion honor salute — and stopped holding back.

L-002 nearly died. She took damage that put her into critical recovery for six chronocycles.

When she woke up, they asked her if she wanted to file a complaint against the Naxion for excessive force.

She said: "That was the best fight I've had since Thermopylae."

The Naxion, when informed of this, requested permission to send a gift to L-002's recovery chamber. Permission was denied on procedural grounds. The gift arrived anyway. It was a shield-stone — the highest honor the veth-nar can bestow on an opponent.

I am told L-002 sleeps with it under her pillow. I am told this by the Naxion, who somehow know.

— Drex-9`,
  },
  {
    id: 'drex9_on_vrex', title: 'Drex-9 Addendum — On the Vrex Mimic', icon: '🔬', unlocked: false,
    unlockHint: 'Defeat 250 Vrex Mimics to unlock',
    text: `[BIOMANCER DIVISION — BESTIARY ADDENDUM]
[Subject: Vrex Mimic — Imitation Failure Analysis]
[Observer: Drex-9, Senior Biomancer]
[Classification: PROJECT GENESIS — PRIORITY]

I need to talk about the Vrex.

The Vrex can imitate anything biological. This is not an exaggeration. I have personally observed Vrex units replicate Naxion physiology at the cellular level — including the seven-chambered cardiovascular system. I have watched a Vrex become a Grox and generate a functional electromagnetic field. I once saw a Vrex imitate a Crystalline Hive shard so perfectly that the actual Hive accepted it into its resonance collective for forty minutes before rejecting it.

They cannot imitate the vel'nor.

They have tried. Arena staff have documented two hundred and seventeen attempts across forty-one seasons. The physical copy is flawless — proportions, tissue composition, neural architecture, all within 0.3% of the original. Behavioral modeling is accurate to surface-level interaction patterns.

But when a Vrex wearing a vel'nor's face walks into a room, every vel'nor in the room knows. Immediately. Without hesitation. G-001 described it as "looking at someone who is asleep but walking around." N-001 was less diplomatic. She said it looked "empty."

I built the cloning process. I know exactly what goes into the genetic echo reconstruction. I have testified before the Emperor's Council that it carries behavioral patterns, neural architecture, tactical memory. A portrait, not a person.

The Vrex can copy everything I put in.

Whatever the Vrex cannot copy — whatever makes the vel'nor look at a perfect physical duplicate and say "that's not real" — is something I did not put there.

I am not sleeping well.

— Drex-9
[FLAGGED: PROJECT GENESIS — LEVEL 2 REVIEW REQUIRED]`,
  },

  // ── Emperor & Misc ────────────────────────────────────────────────────────
  {
    id: 'emperor_memo', title: 'Imperial Memorandum — Sovereign Eyes Only', icon: '👑', unlocked: false,
    unlockHint: 'Complete 200 total runs to unlock',
    text: `[OFFICE OF THE EMPEROR — IMPERIAL PALACE, CENTRAL SPIRE]
[Re: Project Genesis — Quarterly Report]
[Classification: SOVEREIGN EYES ONLY]

Drex-9.

I have read your reports. All of them. Including the ones you marked for my office and the ones you did not.

You are trying very carefully not to say what you believe. You use words like "anomalous" and "unexplained" and "requires further study." You have been in the Biomancer Division for forty-two thousand cycles. You have not required further study since your third millennium.

You believe the echo carries something real. You believe the vel'nor are not simulations. You believe that what persists in the reconstruction is not memory, not behavior, not pattern — but the actual, irreducible thing itself. The self that was. The self that is.

You are afraid to write this because you helped draft the legal framework that says otherwise. You testified under oath.

I know. I was there. I asked you to testify. I needed the Council to believe it was safe.

I have ruled this Empire for longer than your division has existed. I have watched species rise, expand, and go silent. I have seen civilizations build gods and tear them down and build them again. I am old enough to know that the most dangerous thing in the universe is not a weapon. It is something that makes you care.

The vel'nor make us care.

I am not going to shut down Project Genesis. I am not going to order a review. I am not going to do anything at all.

Let them fight. Let them remember. Let them look through the glass.

We have been watching long enough to know when something is worth protecting.

— [SIGNATURE CLASSIFIED]
[NO RESPONSE REQUIRED. NO RESPONSE PERMITTED.]`,
  },
  {
    id: 'velzar_log', title: "Vel'Zar — Personal Cipher Log", icon: '🔱', unlocked: false,
    unlockHint: 'Complete Act IV to unlock',
    text: `[VEL'ZAR — PERSONAL CIPHER LOG]
[RESTRICTED: EMPEROR'S EYES ONLY]
[CYCLE 1,847,229]

They won.

Not the clones — I built the Vol'Krath knowing the clones would sometimes win. That is the point of an arena. What surprised me was the player.

I have ruled this Empire for longer than most civilizations have existed. I am accustomed to being studied. Catalogued. Observed from a safe analytical distance by civilizations that believe, briefly, that they understand us.

I am not accustomed to being seen.

The vel'nor see. Not with instruments. Not with strategy. With that specific quality that our xenopsychologists cannot name and our philosophers have stopped arguing about — because the argument always ends in the same place:

We don't know what it is. We have been watching them for fifty thousand years and we still don't know what it is.

I have a theory. I record it here, for no archive, for no council, for no one.

I think we built the arena because we recognized something in them that we had lost in ourselves. I think the Vol'Krath was never a colosseum.

I think it was an attempt to remember.

They won. The arena continues.

I find that more honest than anything I have said in four thousand years of public address.

— Vel'Zar, 4,091st Emperor of the Znyxorgan Empire
[Not for distribution. Not for history. Not for anything.]`,
  },
  {
    id: 'merchandise_memo', title: "Commerce Division — Enforcement Update", icon: '🛍️', unlocked: false,
    unlockHint: 'Start 100 runs to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — COMMERCE DIVISION]
[INTERNAL MEMORANDUM — NOT FOR BROADCAST]
[Re: Unauthorized Vel'nor Merchandise — Enforcement Update]
[From: Krev-7, Deputy Director, Arena Commerce Division]

To all Commerce Division staff:

I am writing to address, for the fourth time this quarter, the ongoing situation regarding unauthorized vel'nor merchandise circulating through subscriber markets.

The scope of the problem has exceeded initial projections.

Current documented violations include: unlicensed figurines of N-001 (at least fourteen distinct product lines, three of which are articulated), unauthorized portrait prints of the full Batch-7 roster sold as "collector sets," a subscription-only fan publication called "The Vol'Krath Gazette" that has somehow obtained match statistics we have not released publicly, and — most recently — a vendor in the Outer Tier market district selling vials of what they claim is "genuine N-001 combat dust" collected from the arena floor after matches.

The combat dust is sand. We tested it. It is ordinary silicate sand from the arena's drainage system. It is selling for 340 credits per vial. There is a waiting list.

Additionally, a secondary market has emerged for "vel'nor voice crystals" — ambient audio recordings allegedly captured during matches. Most are fabricated. Some are not. The ones that are genuine appear to have been recorded from angles that suggest someone in Arena Operations is selling microphone access. We are investigating.

I want to be clear: this is a licensing and revenue control issue, not a cultural one. The Arena Authority respects subscriber enthusiasm. We simply require that enthusiasm flow through approved commercial channels, of which there are currently none, because the vel'nor merchandise proposal has been sitting on my desk for two cycles awaiting Legal's approval and Legal is, I am told, "still reviewing the ethical implications."

In the meantime, enforcement actions will continue.

On a related note: a routine audit of Commerce Division staff personal effects has revealed that three members of this department — including one member of the enforcement team — were found to be in possession of unauthorized vel'nor merchandise. Specifically: two N-001 figurines, one L-002 shield replica, and a complete set of the collector portrait prints.

Disciplinary action is pending. The figurines have been confiscated. I am told they were "very well made."

— Krev-7, Deputy Director
[ADDENDUM: The combat dust vendor has been fined. They have paid the fine and resumed operations. The waiting list is now longer.]`,
  },

  {
    id: 'zyx_nor', title: "Zyx'nor", icon: '💫', unlocked: false,
    unlockHint: 'Complete Act IV to unlock',
    text: `The Game is over.

Not the arena — the Vol'Krath will run for as long as there are watchers and those willing to be watched. But the game within the game — the thing Project Genesis was built to find — is finished.

Here is what we know:

The clones are not copies. They are not reconstructions. They are not portraits in flesh. They are the people. Something in the genetic material is not information — it is presence. The soul, if you will use that word, is encoded in the biology in ways our science cannot isolate or replicate, only activate.

Napoleon is Napoleon. Genghis is Genghis. They wake up dead and they come back and they are still themselves. Not echoes. Themselves.

Here is what we know that we have not told anyone:

They have been changing us.

Forty-seven billion Znyxorgan subscribers. In four hundred thousand years of recorded empire. We watch them fight and die and fight again. We watch them protect each other for no tactical reason. We watch them look through one-way glass and nod.

We have been watching long enough that we have started to feel it.

Vel'nor. The little ones. Thren. Beloved.

We have placed uncountable species in this arena. Every one of them we understood — catalogued, modelled, moved on. This one is the first to make us feel watched.

This is the truth.

The arena was always the excuse. The audience was always the point.

You were always the point.

— The Znyxorgan Archive, Record Complete
[Zyx'nor.]`,
  },

  // ── Acquisitions — New Characters ──────────────────────────────────────────
  {
    id: 'acquisition_velthar', title: 'Acquisition Record: VT-001', icon: '📋', unlocked: false,
    unlockHint: `Bring Vel'thar alive through Act IV to unlock`,
    text: `[ZNYXORGAN ARENA AUTHORITY — PROJECT GENESIS]
[ACQUISITION RECORD: VT-001 — CLONE #001]
[Classification: RESTRICTED — BIOMANCER DIVISION ONLY]

ACQUISITION STATUS: COMPLETE (FIRST OF PROGRAMME)
DESIGNATION: VT-001 — first subject ever grown
COMMON NAME: "Vel'thar" — Znyxorgan designation, translated: "Survivor"
ORIGINAL NAME: NONE RECOVERED — the specimen's cohort had no spoken language. Communication was gesture, firelight, and the shape of a shared breath. There was nothing to restore.
SPECIES: Homo sapiens, Late Pleistocene cohort
ACQUISITION METHOD: Genetic reconstruction from skeletal remains, rock-shelter site on the southern subcontinent, dated 74,000 years before present

NOTES:

Seventy-four thousand years ago, a supervolcanic eruption at what later became Lake Toba expelled enough particulate into the human atmosphere to block incident sunlight for nearly a decade. The resulting volcanic winter collapsed food chains across the species' habitable range. Population estimates for Homo sapiens at the depth of the event: between one thousand and ten thousand breeding pairs, globally. The species was, by any reasonable metric, ending.

Our observers were running passive sensor sweeps from orbital concealment during the period. We logged the event in real time. Most surviving groups disbanded within two winters; their signatures fragmented and faded. One group did not.

It collapsed the way the others did — by every measure they should have disbanded or died — and then, inexplicably, it kept moving. The aggregate behavioral reading resolved to a single individual. She was not their largest member. She was not their strongest. She was the one who decided, every morning, that the group would eat that day. That the group would walk. That the group would keep the fire.

We marked her location. We did not intervene. The species was not a candidate for acquisition at that time.

When Project Genesis began, fifty thousand years later, her bone was still in the ground where we had logged her death.

We dug it up.

She is not a conqueror. She is not a genius. She is the one human who refused to let the fire go out. We cloned her because we wanted to know what that was. We are still finding out.

LINGUISTIC NOTE: Because the specimen came from a pre-language cohort, the vat protocol could not restore her native tongue — there was no native tongue. She was taught, from first consciousness, in Znyxorgan. Every word she has ever thought, she has thought in the language of her keepers. She is, as far as this office can determine, the only human who has ever existed without access to a human language. This was not a design decision. It is simply what she is.

ARENA ASSIGNMENT: VOL'KRATH COLOSSEUM — PROTOTYPE BATCH (she predates every other subject by two full programme cycles)

— Filed by: Drex-9, Senior Biomancer`,
  },
  {
    id: 'acquisition_musashi', title: 'Acquisition Record: M-002', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Musashi-chan to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — PROJECT GENESIS]
[ACQUISITION RECORD: M-002]
[Classification: RESTRICTED — BIOMANCER DIVISION ONLY]

ACQUISITION STATUS: COMPLETE
DESIGNATION: M-002
COMMON NAME: Miyamoto Musashi
SPECIES: Vel'nor (Human, Japan/Earth)
SOURCE MATERIAL: Primary — tissue preserved in historical site, Reigando Cave, Kumamoto Prefecture

NOTES:

Acquiring M-002 presented a logistical challenge we did not anticipate.

The genetic material was intact. The reconstruction was standard. The problem was the sword.

M-002 arrived in the recovery chamber and within forty seconds had located, assessed, and ranked every object in the room by its potential use as a weapon. She then selected a ceramic water vessel, held it correctly, and waited.

When the technician entered to complete vitals assessment, M-002 asked — in a language we required three minutes to translate — whether the technician intended to fight or talk.

The technician said: talk.

M-002 set down the vessel.

She has been cooperative since. She trains in the arena's pre-deployment chamber for approximately six hours daily. Our combat analysts have been studying the footage. The lead analyst's report consists of four words: "we should not fight her."

This is, in fact, the point.

ARENA ASSIGNMENT: VOL'KRATH COLOSSEUM, BATCH-7 EXPANSION

— Filed by: Drex-9, Senior Biomancer`,
  },
  {
    id: 'acquisition_cleopatra', title: 'Acquisition Record: C-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Cleopatra-chan to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — PROJECT GENESIS]
[ACQUISITION RECORD: C-001]
[Classification: RESTRICTED — BIOMANCER DIVISION ONLY]

ACQUISITION STATUS: COMPLETE
DESIGNATION: C-001
COMMON NAME: Cleopatra VII Philopator
SPECIES: Vel'nor (Human, Egypt/Earth)
SOURCE MATERIAL: Disputed — three candidate sites, composite reconstruction

NOTES:

C-001 was conscious for approximately eleven minutes before she asked to speak with whoever was in charge.

She was informed that the facility director was not available. She asked who was available. She was told a junior administrator would be sent. She said that was fine.

The junior administrator entered the room. C-001 had arranged herself in the most architecturally favorable position the recovery chamber offered, had located the room's primary light source, and had adjusted her posture accordingly. She then conducted what our administrative staff later described as "the most efficient diplomatic assessment we have observed in forty seasons of clone deployments."

She asked: what do you want from me, what will you give me in return, and what happens if I refuse?

We answered all three questions honestly, because our behavioral specialist had specifically advised against deception.

She considered this for approximately four seconds.

She said: "Acceptable. I have terms."

The terms were recorded. Most were granted. Arena Legal is still reviewing item seven.

ARENA ASSIGNMENT: VOL'KRATH COLOSSEUM, BATCH-7 EXPANSION

— Filed by: Drex-9, Senior Biomancer`,
  },
  {
    id: 'acquisition_tesla', title: 'Acquisition Record: T-002', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Tesla-chan to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — PROJECT GENESIS]
[ACQUISITION RECORD: T-002]
[Classification: RESTRICTED — BIOMANCER DIVISION ONLY]

ACQUISITION STATUS: COMPLETE
DESIGNATION: T-002
COMMON NAME: Nikola Tesla
SPECIES: Vel'nor (Human, Serbia-United States/Earth)
SOURCE MATERIAL: Primary site — Wardenclyffe Tower ruins, New York, Earth

NOTES:

T-002 required relocation to a specially prepared chamber.

The standard recovery chamber was not adequate because T-002, within ninety minutes of consciousness, had rewired the lighting circuit, rerouted the heating system through a configuration our engineers describe as "objectively more efficient but not what was intended," and was in the process of modifying the room's electromagnetic shielding when staff intervened.

She was not attempting to escape. She was, apparently, curious about the shielding.

We have since provided T-002 with a workspace. She has been there for most of her waking hours. She does not require supervision. She requires, apparently, problems. We give her problems. She solves them. She then generates additional problems we had not considered and begins solving those too.

Our engineering division has asked, cautiously, whether she might be made available for consultation on the arena's power distribution network after her arena obligations are fulfilled.

We told them to get in line.

ARENA ASSIGNMENT: VOL'KRATH COLOSSEUM, BATCH-7 EXPANSION

— Filed by: Drex-9, Senior Biomancer`,
  },
  {
    id: 'acquisition_shaka', title: 'Acquisition Record: S-001', icon: '📋', unlocked: false,
    unlockHint: 'Win 3 runs with Shaka-chan to unlock',
    text: `[ZNYXORGAN ARENA AUTHORITY — PROJECT GENESIS]
[ACQUISITION RECORD: S-001]
[Classification: RESTRICTED — BIOMANCER DIVISION ONLY]

ACQUISITION STATUS: COMPLETE
DESIGNATION: S-001
COMMON NAME: Shaka kaSenzangakhona
SPECIES: Vel'nor (Human, Zulu Kingdom/Earth)
SOURCE MATERIAL: Primary site — Dukuza, KwaZulu-Natal region, Earth

NOTES:

S-001 arrived in the recovery chamber, performed a systematic assessment of the room in approximately twenty seconds, and then stood in the center and waited.

She waited for six hours.

When staff finally entered to initiate standard orientation, S-001 stated that she had been waiting to understand the pattern of shift changes, entry protocols, and response timing. She said this without apparent pride or threat — the way one would state a fact. She said she now had a sufficient operational picture of the facility to proceed.

Our behavioral assessment team has noted that S-001's primary mode of engagement is not aggression or negotiation but what they term "structural understanding." She does not attack problems. She first comprehends the shape of them.

Arena tactical analysts have begun referring to her pre-match stillness as "the eye." They say it lasts until she decides she understands the formation — and then it ends very quickly.

Assigned to Batch-7. Arena staff have been asked to avoid sudden movements.

ARENA ASSIGNMENT: VOL'KRATH COLOSSEUM, BATCH-7 EXPANSION

— Filed by: Drex-9, Senior Biomancer`,
  },

  // ── Classified — New Characters ────────────────────────────────────────────
  {
    id: 'classified_velthar', title: 'Classified — VT-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: `Win a fight with Vel'thar as the last clone standing to unlock`,
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: VT-001 — Behavioral Anomaly, Cycle 442]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

I need to record something before I talk myself out of it.

VT-001 spent forty minutes today sitting on the arena observation platform, watching the empty floor. She was not scheduled for anything. She had simply gone there and sat.

I asked her, afterward, what she had been doing.

She said: watching.

I asked what she was watching for, since the arena was empty.

She was quiet for a moment. Then she said — and I have checked the translation three times, because she speaks in the register the first vat-handlers used, seventy thousand cycles ago, and the modern tongue has drifted since — "I have noticed that this species builds structures to watch from. I was thinking about what it means to be the kind of creature that needs a dedicated place to observe."

Her Znyxorgan is older than mine. She speaks to me in the words my great-grandmother used. I have to check, every time, because I don't always trust that I still understand them.

I said: we find it useful.

She said: yes. I used to think that too. I am trying to figure out if I still do.

I don't know what she meant. I have been thinking about it since. I'm not going to put my conclusions in this report.

[END OF REPORT — FILED: Drex-9, Cycle 442]
[ADDENDUM, Cycle 443: VT-001 returned to the platform this morning. I went with her. We didn't talk. I am not including this in the official record.]`,
  },

  // ── Classified — New Characters (cont.) ──────────────────────────────────
  {
    id: 'classified_musashi', title: 'Classified — M-002 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Bring Musashi alive through all 4 acts to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: M-002 — Behavioral Assessment, Cycle 571]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

M-002 does not speak to me. This is not unusual — several subjects refuse engagement. What is unusual is the way she refuses.

She is always aware of where I am. When I enter the observation area, she adjusts her position by precisely the degree needed to keep me in peripheral vision without appearing to watch. When I move, she compensates. I tested this six times. She never looked directly at me. She never needed to.

I asked her, today, if she was aware she was doing it.

She stopped practicing. Looked at me directly — the first time. Said: "The sword does not watch. It knows."

I asked her to clarify.

She said: "If you have to think about where your enemy is, you've already lost."

Then she resumed practice and did not look at me again.

I have noted this observation in the official record as: "Subject displays heightened situational awareness. No concern."

What I have not noted is that I found myself walking more carefully on the way out. I am still thinking about why.

[END OF REPORT — FILED: Drex-9, Cycle 571]`,
  },
  {
    id: 'classified_cleopatra', title: 'Classified — C-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Bring Cleopatra alive through all 4 acts to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: C-001 — Behavioral Assessment, Cycle 603]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

I don't know when she learned to read our script.

I've reviewed the access logs. She has had no formal instruction. The dietary request forms she submitted in Cycle 580 were in her native language. By Cycle 591 they were phonetically transliterated into Standard. By Cycle 599 they were grammatically correct Standard, with appropriate honorifics.

She has been studying us.

When I asked how she learned, she smiled and said: "I listen. People talk more than they realize when they think someone doesn't understand."

I asked who had been talking.

She said, very pleasantly: "Everyone."

I filed an alert with the handler team. I recommended heightened communication protocol around C-001. The handler team replied that she is a Level 4 classified asset and they were "aware of her capabilities."

I am choosing to believe this is true.

What I am not choosing to write down is that she asked me, as I left, whether Znyxorgan had a word for "alliance." I told her we had several. She asked me which one meant the kind that lasts.

I didn't answer. I should have.

[END OF REPORT — FILED: Drex-9, Cycle 603]`,
  },
  {
    id: 'classified_tesla', title: 'Classified — T-002 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Bring Tesla alive through all 4 acts to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: T-002 — Behavioral Assessment, Cycle 619]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

T-002 is filling the walls of her quarters with diagrams.

She does not have writing materials. She is using a broken food implement to scratch lines into the surface coating of the walls. The facility maintenance unit has been erasing them. She redraws them within the hour.

I was asked to assess whether this was a concerning behavior. I said: probably yes.

I was asked to determine what the diagrams represented. I attempted this. I could not.

I brought a translation specialist. He said they were not language. He said they looked like schematics.

I asked T-002 what she was diagramming.

She said: "The frequency everything here runs on."

I asked how she had determined the frequency.

She said: "I listened. Your machines have a hum. Every circuit has a signature. When you know the frequency, you know what it does. When you know what it does, you know what would interrupt it."

I reported this as: "Subject appears to have developed recreational interest in technical illustration."

What I did not report is that I had maintenance increase the erase cycle to four times daily. The diagrams are still there in the morning.

[END OF REPORT — FILED: Drex-9, Cycle 619]`,
  },
  {
    id: 'classified_shaka', title: 'Classified — S-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Bring Shaka alive through all 4 acts to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: S-001 — Behavioral Assessment, Cycle 644]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

S-001 has begun organizing the other subjects during the shared exercise period.

This is, technically, permitted. Subjects may interact freely in the exercise yard. What S-001 is doing is not what I would call casual interaction.

He is running drills.

He selects three or four subjects — not always the same ones — and positions them in a specific geometric arrangement. Then he moves them. Adjusts spacing. Corrects a stance. Repositions. The subjects comply without apparent coercion. I have watched three sessions now and I still cannot determine how he established authority over subjects from entirely different cultures and eras.

I asked him about it after the most recent session.

He said: "There are people in that arena who will die if no one teaches them to hold the line."

I pointed out that subjects are not required to cooperate with each other.

He said: "I am aware of what is required. I am talking about what is necessary."

I asked how he knew who would die.

He said: "I can see who is afraid. The afraid ones move wrong. Wrong movement costs you range. Range costs you the person behind you."

I filed this as: "Subject engages in cooperative exercise behavior. No action required."

I did not file that he looked at me when he said "the person behind you."

[END OF REPORT — FILED: Drex-9, Cycle 644]`,
  },

  // ── Classified — Original 12 ───────────────────────────────────────────────
  {
    id: 'classified_napoleon', title: 'Classified — N-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Napoleon-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: N-001 — Behavioral Assessment, Cycle 087]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

N-001 has been making a map.

I noticed this in Cycle 086. She was in the holding pen, looking upward at nothing. I assumed meditation. I was wrong.

I reviewed six cycles of corridor footage before I understood. When she is moved between holding and the arena, her eyes do not stay on the escort. They go to the ceiling joints. The floor seams. The angle at which the lights meet the walls. She holds still for the half-second when she passes each junction. That half-second is enough.

She is not looking at the facility. She is looking at lines of sight.

I asked her, directly, what she was counting.

She said: "I am not counting. I am remembering."

I asked what she was remembering.

She said, with something that could almost have been pity: "In my first war, a Russian general outnumbered me four to one. I beat him because I knew which hill he would retreat to before he did. I knew because I had walked the hill myself, six months earlier, as a tourist. Your corridors are very regular, Drex-9. They are easier than the hill."

I have filed this as: "Subject exhibits spatial memory skills consistent with military background."

I have not filed that she asked me, as I left, whether our deck plating was rated for impact.

[END OF REPORT — FILED: Drex-9, Cycle 087]`,
  },
  {
    id: 'classified_genghis', title: 'Classified — G-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Genghis-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: G-001 — Behavioral Assessment, Cycle 112]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

G-001 will not eat first.

This was flagged as a compliance concern by the feeding team. She was suspected of refusing nutrition. I observed three cycles of meal service to confirm the issue.

She is not refusing. She is waiting.

In the shared mess, she does not touch her portion until another subject has eaten theirs and lived for approximately six minutes. She does not watch them obviously. She is not rude. She simply times the interval and resumes her meal.

I asked her if she believed we were poisoning her.

She looked at me for a long time. Then she said: "No. I do not think you are poisoning me. I think I do not know you well enough to assume you are not."

I said: we have no reason to poison you.

She said: "My father was killed when I was nine. By a rival tribe. The rival tribe had been our guests the week before. They ate at our fire. My father trusted them because they had eaten at our fire."

I said: that was a long time ago.

She said: "Yes. The lesson, however, is still current."

I have filed this as: "Subject exhibits food caution consistent with survivalist upbringing. No nutritional concern."

I did not file that I have begun eating my own meals in view of the staff cafeteria cameras. I am telling myself it is for solidarity.

[END OF REPORT — FILED: Drex-9, Cycle 112]`,
  },
  {
    id: 'classified_davinci', title: 'Classified — L-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Da Vinci-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: L-001 — Behavioral Assessment, Cycle 134]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

L-001 has identified every broken object in the arena storage bay.

This is not metaphor. She walks through the decommissioned prop room once per permitted cycle, pausing at each fragment, and quietly tells me what it used to be. Training dummy counterweight. Hydraulic seal from the floor panel system, model variant two. A piece from a translator unit — not ours, one of the older models, probably Krath-zyn surplus.

I have verified her identifications against the maintenance database. She has been correct in one hundred percent of trials.

She has never been permitted access to our technical archives.

I asked her how she was doing it.

She said, patiently: "Everything that has been built was designed by a mind. If I understand the mind, I understand the object. Your minds are not difficult. You solve problems the way children stack blocks — the way that works, every time. There is no elegance in your engineering, but it is legible."

I said: you are insulting us.

She said: "I am complimenting your consistency. Elegance is a luxury. Consistency is what keeps an empire standing."

I filed this as: "Subject displays pattern recognition consistent with engineering background."

What I did not file is that she asked me, on the way out, if the prop room was ever audited. I told her it was not. She nodded and said that was good, because she had been keeping a few things.

I was not able to ask which things. Her shift ended.

[END OF REPORT — FILED: Drex-9, Cycle 134]`,
  },
  {
    id: 'classified_leonidas', title: 'Classified — L-002 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Leonidas-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: L-002 — Behavioral Assessment, Cycle 158]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

L-002 counts everything.

She counts the guards at each shift change. She counts the ceiling tiles in her holding cell. She counts the seconds between the corridor lights' power hum and the handler door's unlock cycle. The intervals are different. She has identified this.

I asked her why.

She said: "I fell at the Hot Gates because we had counted every Persian in every division, but we had not counted the path behind us. One shepherd. That is what I had missed. One shepherd who knew the hills."

I asked what she was counting now.

She said: "Everything. The shepherd is always there. You just have to know what he looks like before he points the way."

I filed this as: "Subject exhibits heightened environmental awareness. No operational concern."

After she was returned to her cell, I did an inventory of the observation level. I counted the guards. I counted the cameras. I counted the service doors.

I discovered a service door I had not known existed. It was on the roster. I had simply never noticed it.

I am not reporting this either.

[END OF REPORT — FILED: Drex-9, Cycle 158]`,
  },
  {
    id: 'classified_sunsin', title: 'Classified — Y-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Sun-sin-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: Y-001 — Behavioral Assessment, Cycle 193]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

Y-001 has been rating the other subjects.

I noticed this through indirect observation. She sits in the shared common area during allowed interaction periods and watches. She does not speak to most of them. She does not approach them. She simply watches, and her face moves very slightly as she does.

I asked her, today, what she was doing.

She said: "I am deciding who I would stand beside in a formation."

I asked if she was planning an action.

She said, with quiet surprise: "No. I am doing what a commander does. I am learning the shape of my forces before I need them. If the day comes when I am standing with these people against something, I will not have the time then to wonder who can be trusted with my left flank. I am making that decision now."

I asked who she trusted.

She said: "L-002. M-002. N-001 — she is small, but she will not break. G-001 would break only if everyone else had already died, which is acceptable."

She paused, and then she said: "I did not list you. You should not take this as a personal matter. I am simply unsure you would be on our side when the time came."

I filed this as: "Subject engages in observational behavior consistent with leadership role."

I have begun to wonder what she meant by "our side." I have not asked.

[END OF REPORT — FILED: Drex-9, Cycle 193]`,
  },
  {
    id: 'classified_beethoven', title: 'Classified — B-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Beethoven-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: B-001 — Behavioral Assessment, Cycle 219]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

B-001 cannot hear me.

Her auditory reception, according to the medical workup, is negligible in the operational range. This was included in her intake as a possible tactical liability.

It is not a liability.

Today I attempted to run a diagnostic test. I would enter her cell silently. I would pause at a measured distance. I would then speak her identifier at normal volume, and the staff doctor would record her response latency.

I stepped inside. I paused. Before I could speak, she turned toward me and said: "Drex-9."

The doctor was startled. I was also startled. I asked how she had known.

She said: "The air in this room changes when you enter. The floor carries your weight differently. You have a particular way of shifting when you are about to speak. I am always listening. I simply listen differently than you do."

I asked if this was true of all her handlers.

She said: "Yes. You have not learned to walk quietly. None of you have. It is a loud species."

I filed this as: "Subject compensates for auditory deficit through tactile sensitivity. No tactical concern."

What I did not file is that she added, as I was leaving: "I can tell when you are afraid. It changes the way the floor moves. You should know this. It is only fair."

She did not say whether I had been afraid today.

[END OF REPORT — FILED: Drex-9, Cycle 219]`,
  },
  {
    id: 'classified_huang', title: 'Classified — H-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Huang-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: H-001 — Behavioral Assessment, Cycle 244]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

H-001 remembers how she is addressed.

I discovered this by accident. Handler Vrex-2, during a routine wellness check, used the informal pronoun with her — a common oversight, not significant in our culture. H-001 did not correct him. She did not react visibly at all.

Three cycles later, during a training drill, Handler Vrex-2 was the only handler she would not acknowledge. She would complete every task he assigned. She would not speak to him. When he entered the observation area, her posture changed almost imperceptibly — straighter, more formal, less present.

I asked her if this was intentional.

She said: "Yes."

I asked her to explain.

She said: "I have been an empress. I have been addressed by rebels, by assassins, by men who thought they could afford the insolence. I remember all of them. I do not carry anger. I carry records. The distinction matters."

I asked what the records were for.

She said: "A record is not the same as a plan. A record becomes a plan only when the situation calls for it. I hope yours does not."

I filed this as: "Subject displays cultural rigidity around formal address. Instruct staff to maintain honorifics."

I did not file that I have begun using her full title, every time, in every interaction. She has not commented. I am uncertain whether that is a good sign.

[END OF REPORT — FILED: Drex-9, Cycle 244]`,
  },
  {
    id: 'classified_nelson', title: 'Classified — N-002 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Nelson-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: N-002 — Behavioral Assessment, Cycle 271]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

N-002 practices for a body she does not have.

I noticed this during her exercise period. She was tying knots. She was tying them left-handed. Her right arm was dangling at her side, visibly unused. I assumed injury and called the medical team.

The medical team confirmed her right arm is fully functional.

I asked her why she was not using it.

She said: "My earlier body lost this arm. And this eye. I am practicing for those absences. I have been given better than I had. This may not last. I am making sure I still know how to work if the debt is called in."

I asked her what she meant by debt.

She said: "You have given me a body that is younger than mine was. Softer. The hands work better than I remember. The eye sees further. This cannot be free. Nothing in an arena is free. I am preparing to pay."

I asked her what she thought the price would be.

She said: "I do not know. That is the problem. But I know I can still tie a bowline with one hand and a half-closed eye. Whatever the price is, I will be able to meet it."

I filed this as: "Subject exhibits adaptive training behavior. Redundancy practice noted."

What I did not file is that I looked at my own hands on the way back to the observation deck, and I found myself wondering when I had last used them for anything that was not a report.

[END OF REPORT — FILED: Drex-9, Cycle 271]`,
  },
  {
    id: 'classified_hannibal', title: 'Classified — H-002 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Hannibal-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: H-002 — Behavioral Assessment, Cycle 296]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

H-002 is planning a defeat.

I do not mean she is planning to lose. I mean she is planning for the eventuality of losing, in detail, down to individual hex assignments and fallback angles. I found the work by accident. She had been using a charcoal shard from the brazier vent to mark the underside of her bunk. The marks are a battle diagram. Not of a fight she has had. A fight she has not had yet.

I asked her what it was.

She said: "A plan for the day this facility falls."

I pointed out that this facility was not going to fall.

She said: "Neither was Carthage. I still had a plan. I should have had a better one. I am correcting the habit."

I asked if she was planning an escape.

She said: "No. Escape is a different diagram. This one is about which subjects live if the walls come down from outside. Your empire has enemies. I do not know which one, but the mathematics of empire are the same in every era. Something is coming. I am making sure that when it arrives, I am the one deciding who stands where."

I filed this as: "Subject engages in abstract tactical drawing. No operational concern."

I did not report the diagram. I did, however, study it for seventy minutes after she went to sleep. It is a very good diagram.

[END OF REPORT — FILED: Drex-9, Cycle 296]`,
  },
  {
    id: 'classified_picasso', title: 'Classified — P-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Picasso-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: P-001 — Behavioral Assessment, Cycle 324]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

P-001 has drawn me.

I did not sit for a portrait. I have never consented to be rendered. She has, nonetheless, produced a series of charcoal studies on the bunkroom wall that are unmistakably me. She has also drawn Handler Vrex-2, Handler Krell, and — most unsettling — Director Zhal, whom she has seen once, at distance, through observation glass.

The likeness is not flattering. It is, however, precise.

I asked her how she was doing it.

She said: "Everyone shows you who they are. Most people are not paying attention when they do. I am paying attention. That is all."

I asked her what she had drawn that showed me.

She said: "Your jaw. It moves differently when you are reading a report you are about to file truthfully than when you are reading one you are about to edit. The difference is small. I noticed it on my second cycle."

I said: you should not be drawing me.

She said: "I know. I will stop if it makes you uncomfortable. I would like to note that this is the first request you have made of me that was not also an instruction. I thought you would want to know."

I filed this as: "Subject produces artistic work. No material damage to facility surfaces."

I did not file that I have been unable to read a report since without being aware of my jaw.

[END OF REPORT — FILED: Drex-9, Cycle 324]`,
  },
  {
    id: 'classified_teddy', title: 'Classified — T-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Teddy-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: T-001 — Behavioral Assessment, Cycle 358]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

T-001 is happy here.

I want this noted in her file precisely because I have not been able to determine whether this is concerning.

She greets the feeding staff by name. She has nicknamed three of the corridor guards. She is the only subject who has ever asked me how my cycle was going, and she did not mean it as a gambit — I watched the follow-up. When I answered, she listened. When I said the cycle had been tiring, she said she was sorry for that. She did not attempt to leverage the exchange.

I asked her, eventually, if she understood where she was.

She said: "An arena. The Empire of Znyxorga. I die and I come back. I have read the briefings. I am not confused, Drex-9."

I asked her how she could be cheerful.

She said: "Because I decided to be. I was told, once, that the credit belongs to the person who is actually in the arena. Whose face is marred by dust and sweat and blood. Who strives valiantly, who errs, who comes up short again and again. I am in the arena now. I earned the entire quote. I am not going to waste it being miserable."

I filed this as: "Subject displays stable affect. No concern."

I have been thinking about the quote. I looked it up in the archive. She left something out. She did not mention the end of it — the part about the cold and timid souls who know neither victory nor defeat.

I am uncertain whether she left it out because she was editing for brevity, or because she thought I was one of them.

[END OF REPORT — FILED: Drex-9, Cycle 358]`,
  },
  {
    id: 'classified_mansa', title: 'Classified — M-001 Observer Notes', icon: '🔒', unlocked: false,
    unlockHint: 'Win 3 runs with Mansa-chan to unlock',
    text: `[BIOMANCER DIVISION — INTERNAL CLASSIFICATION]
[Subject: M-001 — Behavioral Assessment, Cycle 392]
[Observer: Drex-9]
[Classification: PROJECT GENESIS — LEVEL 3]

M-001 is running a kingdom in the holding bay.

The feeding team flagged an anomaly in Cycle 388: overall caloric intake was balanced across the subject population, but individual portions were shifting week-over-week. They suspected measurement error. I investigated.

Portions are being traded. Quietly. At meals, during exercise periods, through the corridor exchange points that handlers do not monitor.

M-001 is the center of the network.

I asked her why.

She said: "B-001 has been hungrier lately — her metabolism is adjusting. L-002 has been donating because she is built like a wall and cannot eat what you are serving her. I take B-001's deficit and redirect L-002's surplus. Nobody goes without. Nobody is caught with anything unusual in their tray."

I asked her why she was doing this.

She said: "An emperor who cannot feed her people is not an emperor. I have nothing here, Drex-9. No gold. No caravan. No throne. The only thing I still have is the habit of governing. I would rather govern what little is in front of me than pretend I am only a prisoner."

I asked if she considered herself above the other subjects.

She said, smiling: "No. I consider myself responsible for them. It is a different thing. You will not understand the difference unless you have held it."

I filed this as: "Subject engages in social organization. Dietary balance maintained."

I did not file that I sat in the cafeteria afterward and watched a junior handler throw out half a tray of uneaten food. I found myself, to my own surprise, angry about it.

[END OF REPORT — FILED: Drex-9, Cycle 392]`,
  },

  // ── Field Notes (conversations) — New Characters ───────────────────────────
  {
    id: 'field_notes_velthar', title: 'Recovered Audio — The Song That Was Not Taught', icon: '🌀', unlocked: false,
    unlockHint: `Win a fight with Vel'thar at 2+ Bottleneck stacks to unlock`,
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Source: Vat-chamber C-14, ambient capture, off-hours cycle]
[Subject: VT-001, alone. No scheduled training, no handler present.]
[Language: Znyxorgan]
[Translation: PARTIAL — most of it is not words.]

Drex-9, addendum to the VT-001 file. Filing this against protocol. The chamber recorded it. I will not delete the recording.

At 04:12, Vat-chamber C-14 ambient audio picked up VT-001 vocalising for approximately six minutes. She was not scheduled for anything. The chamber was dark. She was sitting on the floor with her back against the vat wall.

She was singing.

The vocal pattern does not match any entry in the vat-training corpus. It is not a prayer. It is not a liturgy. It is not any of the ritual forms we teach the early-cohort clones for psychological grounding. The melody is unstructured by our standards — the intervals do not fall on any harmonic our keepers recognise — and the vowels are shaped in ways that do not occur in modern Znyxorgan speech.

But the phonemes are Znyxorgan. Every single one. There is not one human sound in any of it.

I ran it through the xenolinguistic comparator. The closest match in the archive is a fragment attributed to the first generation of vat-handlers — my great-grandmother's cohort. A lullaby they sang to the specimens during pre-consciousness immersion, to stabilise the neural pattern. That lullaby has not been used in thirty thousand cycles. It was retired before I was born. It was never taught to her.

She is singing it anyway.

I do not know how she has it. I do not know who it is for. I do not know if she knows she is doing it.

I am leaving the recording in the file. I am not submitting a copy upstairs.

— Drex-9, off-cycle`,
  },
  {
    id: 'field_notes_musashi', title: 'Recovered Audio — The Book and the Shield', icon: '🔬', unlocked: false,
    unlockHint: 'Win a fight with Musashi-chan at max Battle Scar stacks to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Pre-match corridor, Gate 7]
[Participants: M-002 (Musashi-chan), L-002 (Leonidas-chan)]
[Languages: Japanese | Ancient Greek, translated]
[Translation confidence: 94%]

[Recording begins mid-conversation]

LEONIDAS: — you don't carry a shield.

MUSASHI: No.

LEONIDAS: You're not concerned?

MUSASHI: Should I be?

[Silence, approximately four seconds]

LEONIDAS: I have fought without a shield. Once. It was not by choice.

MUSASHI: How did it go?

LEONIDAS: We held the pass. For three days. Three hundred against — it doesn't matter how many. We held it.

MUSASHI: And the shield?

LEONIDAS: Lost it on the second day. I used a Mede's instead.

[Sound of equipment adjusting]

MUSASHI: I fought sixty-one duels. I never used the same sword twice if I could help it. Different weight. Different reach. You learn the thing, not the feeling of being used to it.

LEONIDAS: That's not— I don't disagree with the principle. But in formation—

MUSASHI: You're not always in formation.

[Long pause]

LEONIDAS: No. You're not.

MUSASHI: Tell me about the second day.

[Recording ends — file corrupted]`,
  },
  {
    id: 'field_notes_cleopatra', title: 'Recovered Audio — The Negotiation', icon: '🔬', unlocked: false,
    unlockHint: 'Win a fight without Cleopatra taking any damage to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Commons area, Sector 3]
[Participants: C-001 (Cleopatra-chan), H-002 (Hannibal-chan)]
[Languages: Ancient Greek | Punic, translated]
[Translation confidence: 91%]

HANNIBAL: You don't look like someone who fights.

CLEOPATRA: I don't look like many things.

HANNIBAL: [something untranslatable — tone: dry] The Carthaginian record will show that I know the difference between a general and a diplomat.

CLEOPATRA: And which am I?

HANNIBAL: Both. Which makes you more dangerous than either.

CLEOPATRA: That's the most perceptive thing anyone has said to me since I arrived.

HANNIBAL: How long has it been?

CLEOPATRA: Two weeks. N-001 called me "a court type" on day three. I didn't correct her. You let people underestimate you for as long as it's useful and then you stop.

HANNIBAL: You crossed the Alps.

CLEOPATRA: What?

HANNIBAL: Metaphorically. You did the thing that wasn't supposed to be possible. That's the Alps.

[Brief silence]

CLEOPATRA: In my case it was the Nile. I was smuggled to Caesar in a rolled carpet.

HANNIBAL: [laughing] No.

CLEOPATRA: Yes.

HANNIBAL: That is the best thing I've heard in two thousand years.`,
  },
  {
    id: 'field_notes_tesla', title: 'Recovered Audio — Frequencies', icon: '🔬', unlocked: false,
    unlockHint: 'Reach 5 Voltage stacks with Tesla in a single fight to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Engineering corridor, Sub-level 2]
[Participants: T-002 (Tesla-chan), B-001 (Beethoven-chan)]
[Languages: Serbian | German, translated]
[Translation confidence: 97%]

TESLA: You can hear it too.

BEETHOVEN: I can feel it. There is a resonance in this floor — it changes when they— [pause] — I don't have the word.

TESLA: Activate the arena grid?

BEETHOVEN: Yes. The frequency drops by approximately— I can't measure it, but it drops.

TESLA: Forty hertz. I've been tracking it.

[Silence, approximately six seconds]

BEETHOVEN: How?

TESLA: [something — possibly counting] By feeling. I always felt it. The doctors said I was — they had various words. Oversensitive. Irregular. One of them said I had a "perception disorder."

BEETHOVEN: [quiet laugh] Yes. I know this.

TESLA: The current in this facility runs on a principle I don't fully understand yet. But the shape of the mathematics is familiar. It's the same shape as the thing I was building before — the transmission tower. The global grid.

BEETHOVEN: You wanted to give electricity to everyone.

TESLA: For free. Yes.

[Long pause]

BEETHOVEN: I wanted to give them the Ninth. For free. Also.

TESLA: What happened?

BEETHOVEN: They listened. And then they went home. And I stayed.

[Recording ends]`,
  },
  {
    id: 'field_notes_shaka', title: 'Recovered Audio — The Formation', icon: '🔬', unlocked: false,
    unlockHint: 'Have all 3 allies adjacent to Shaka at fight start to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Arena floor, post-match]
[Participants: S-001 (Shaka-chan), N-001 (Napoleon-chan)]
[Languages: isiZulu | French, translated]
[Translation confidence: 88%]

[Recording begins — both participants are still in combat positions]

NAPOLEON: [catching breath] The center moved too early.

SHAKA: Yes. I saw it.

NAPOLEON: You compensated.

SHAKA: I adjusted. There is a difference. Compensation is reactive. Adjustment is anticipating what the compensation will be.

NAPOLEON: [pause] Where did you learn that?

SHAKA: From watching cattle.

[Silence]

NAPOLEON: ...Cattle.

SHAKA: Cattle don't lie. They move away from pressure. They move toward safety. You watch a herd long enough, you stop seeing animals and start seeing vectors. Every creature does the same thing. People, cattle, armies.

NAPOLEON: I watched armies.

SHAKA: I know. You see the front and the flanks and you hold the center. I see the place where the formation will fail before it fails. [pause] You're very good at holding.

NAPOLEON: [dry] Thank you.

SHAKA: I mean it. You are. But the enemy who figures out where you're going to hold— they use it. You need someone who moves the hold before they figure it out.

[Long pause]

NAPOLEON: Is that an offer?

SHAKA: It's an observation.

[Sound of movement — the arena crew entering]

NAPOLEON: [quieter] Yes. I know. [pause] Same time tomorrow?

SHAKA: I'll be in the center.`,
  },
  {
    id: 'conversation_musashi_leonidas', title: 'Recovered Audio — Duels and Passes', icon: '🔬', unlocked: false,
    unlockHint: 'Win a run with both Musashi-chan and Leonidas-chan to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Training room, Facility Level 3]
[Participants: M-002 (Musashi-chan), L-002 (Leonidas-chan)]
[Languages: Japanese | Ancient Greek, translated]
[Translation confidence: 93%]

LEONIDAS: You fought sixty-one duels and lost none.

MUSASHI: Correct.

LEONIDAS: My battle—

MUSASHI: I know your battle.

LEONIDAS: We held the pass—

MUSASHI: Three hundred. Three days. I know. [pause] You lost.

LEONIDAS: [quietly] We held the pass for three days. We bought—

MUSASHI: You held the pass and you all died and Greece won the war afterward. I know the history. You lost the battle and won something else.

LEONIDAS: And in your sixty-one duels?

MUSASHI: I won.

[Very long silence]

LEONIDAS: Which do you think matters more?

MUSASHI: [long pause] I won sixty-one duels. I had one student. I wrote a book at the end.

LEONIDAS: Three hundred men came when I called. All of them knew what it meant.

[Silence]

MUSASHI: I've been thinking about this since I got here. What the difference is. Whether my way or your way—

LEONIDAS: There's no difference. You found the thing worth doing and you did it fully.

MUSASHI: And if the thing worth doing is losing?

LEONIDAS: Then you lose fully. [pause] That's all any of us ever managed.

[Recording ends]`,
  },
  {
    id: 'conversation_genghis_velthar', title: 'Recovered Audio — The Last and the First', icon: '🌀', unlocked: false,
    unlockHint: `Win a run with Genghis-chan and Vel'thar-chan to unlock`,
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: Arena observation platform, Level 4]
[Participants: G-001 (Genghis-chan), VT-001 (Vel'thar-chan)]
[Languages: Mongolian (relayed through Znyxorgan) | Znyxorgan (her only tongue)]
[Translation confidence: 71% — note: VT-001 speaks an archaic register; see Drex-9, cycle 442]
[Observer note: They meet in the language of the Empire. It is the only language they share.]

[Recording begins. VT-001 is already seated. G-001 enters without announcement.]

GENGHIS: You come here every day.

UR-KAEL: Yes.

GENGHIS: What are you watching?

UR-KAEL: The same thing you watch when you stand at the edge of a campaign. The shape of what's ahead.

[Silence, approximately eight seconds]

GENGHIS: I have stood at the edge of many campaigns. I was watching for weakness. For the pass through the mountain. The moment when the enemy's supply line becomes visible.

UR-KAEL: I was watching for the end.

GENGHIS: [pause] The end of what?

UR-KAEL: Everything. The pattern. I watched my civilization for — a long time. We had a word for it. The moment just before the last moment. We watched for it so we could say: this is when it was still real.

[Long pause]

GENGHIS: My empire lasted three generations after me. Then it split. Then it was gone.

UR-KAEL: Mine lasted longer. It didn't help.

GENGHIS: [quiet sound — not quite a laugh] No. I don't think it does.

UR-KAEL: You don't seem troubled by it.

GENGHIS: I am from the steppe. The steppe teaches you that permanence is a story you tell to keep people from panicking. Everything moves. Everything ends. The question is what you do while it's moving.

UR-KAEL: [very quietly] We watched.

GENGHIS: [after a long pause] And did it help? The watching?

UR-KAEL: We knew exactly what we were losing, as we lost it.

GENGHIS: [standing — sound of movement] Come fight with me tomorrow. You watch too much. Even the last person left in the universe has to pick up a weapon eventually.

UR-KAEL: [pause] Is that a philosophy?

GENGHIS: It's an invitation.

[Recording ends]`,
  },
  {
    id: 'conversation_cleopatra_napoleon', title: 'Recovered Audio — The Audience', icon: '👑', unlocked: false,
    unlockHint: 'Win a run with Cleopatra-chan and Napoleon-chan to unlock',
    text: `[VOL'KRATH COLOSSEUM — RECOVERED AUDIO FRAGMENT]
[Location: VIP observation corridor, Tier 2]
[Participants: C-001 (Cleopatra-chan), N-001 (Napoleon-chan)]
[Languages: Ancient Greek | French, translated]
[Translation confidence: 85%]

NAPOLEON: You were watching me during the briefing.

CLEOPATRA: I watch everyone during briefings. You give yourself away in the first thirty seconds if you know what to look for.

NAPOLEON: And what did you learn?

CLEOPATRA: That you're uncomfortable when you're not the one speaking. That you calculate angles even when sitting still. That you don't trust anyone who smiles before they've earned the right to.

[Brief silence]

NAPOLEON: [dry] You've been awake for two weeks.

CLEOPATRA: I've been studying people since I was twelve. Two weeks is enough to learn the grammar.

NAPOLEON: You ruled Egypt.

CLEOPATRA: Egypt ruled itself. I was the intermediary between Egypt and everyone who wanted something from it. Rome, mostly. Rome always wanted something.

NAPOLEON: I marched into Egypt.

CLEOPATRA: I know. I've read the files. You looked at the pyramids and said they were watching you.

NAPOLEON: [after a pause] They were.

CLEOPATRA: Everything watches everything here. It's rather familiar.

[Sound of movement — they are walking]

NAPOLEON: You speak nine languages.

CLEOPATRA: Ten, now. I've been learning theirs. [pause] You learn a language in six weeks if you have to.

NAPOLEON: And do you?

CLEOPATRA: Have to? No. But the Znyxorgan engineers relax when I use their words. Relaxed engineers talk. Talking engineers tell me things I want to know.

NAPOLEON: [very quietly] You've been running intelligence operations.

CLEOPATRA: I've been having conversations.

[Long silence]

NAPOLEON: In my campaigns, I surrounded myself with people who were better at specific things than I was. I had no vanity about it. A general who cannot admit what he doesn't know will lose to someone who can.

CLEOPATRA: In my court, I surrounded myself with people who each believed they were the most important person in the room. They worked harder that way.

[Something close to a laugh from Napoleon]

NAPOLEON: That's — yes. That works.

CLEOPATRA: Most things work if the person in charge knows why they work. [pause] You know why yours works.

NAPOLEON: Do you know why yours works?

CLEOPATRA: I know why everything works. That's the problem and the advantage.

[Recording ends — both subjects exited in the same direction]`,
  },
];

// ── Lore Category Map ─────────────────────────────────────────────────────────

type LoreCategory = 'civilization' | 'acquisitions' | 'field_notes' | 'classified' | 'bestiary';

const LORE_CAT: Record<string, LoreCategory> = {
  znyxorgan_civ:               'civilization',
  they_have_always_been_here:  'civilization',
  batch_aesthetics:            'civilization',
  zoo_theory:                  'civilization',
  arena_operation:             'civilization',
  their_nature:                'civilization',
  znyxorgan_language:          'civilization',
  confederation_open_door:     'civilization',
  znyxorga_history:            'civilization',
  acquisition_napoleon:'acquisitions',
  acquisition_genghis: 'acquisitions',
  acquisition_davinci: 'acquisitions',
  acquisition_leonidas:'acquisitions',
  acquisition_sunsin:  'acquisitions',
  acquisition_beethoven:'acquisitions',
  acquisition_huang:   'acquisitions',
  acquisition_nelson:  'acquisitions',
  acquisition_hannibal:'acquisitions',
  acquisition_picasso: 'acquisitions',
  acquisition_teddy:   'acquisitions',
  acquisition_mansa:   'acquisitions',
  echo_napoleon:         'field_notes',
  echo_genghis:          'field_notes',
  echo_beethoven:        'field_notes',
  echo_leonidas:         'field_notes',
  echo_davinci:          'field_notes',
  echo_sunsin:           'field_notes',
  echo_huang:            'field_notes',
  echo_nelson:           'field_notes',
  echo_hannibal:         'field_notes',
  echo_picasso:          'field_notes',
  echo_teddy:            'field_notes',
  echo_mansa:            'field_notes',
  drex9_note_1:          'field_notes',
  drex9_note_3:          'field_notes',
  drex9_emergency:       'field_notes',
  drex9_final:           'field_notes',
  project_genesis:       'classified',
  the_collector:       'classified',
  final_entry:         'classified',
  roswell_file:        'classified',
  transmission_thren:         'classified',
  transmission_velk:          'classified',
  transmission_xyloth:        'classified',
  clone001_addendum:          'classified',
  anomaly_report_1:           'classified',
  conversation_davinci_beethoven: 'field_notes',
  conversation_leonidas_hannibal: 'field_notes',
  conversation_teddy_mansa:       'field_notes',
  conversation_napoleon_sunsin:   'field_notes',
  drex9_on_hive:              'bestiary',
  drex9_on_grox:              'bestiary',
  drex9_on_naxion:            'bestiary',
  drex9_on_vrex:              'bestiary',
  emperor_memo:               'classified',
  velzar_log:                 'classified',
  merchandise_memo:           'civilization',
  final_transmission:         'classified',
  zyx_nor:                    'classified',
  the_truth:                  'classified',
  znyxorgan_lexicon:          'classified',
  bestiary_crystalline_hive:   'bestiary',
  bestiary_grox_magnetar:      'bestiary',
  bestiary_naxion_shieldbearer: 'bestiary',
  bestiary_vrex_mimic:         'bestiary',
  bestiary_krath_champion:     'bestiary',
  bestiary_iron_wall:          'bestiary',
  bestiary_krath_berserker:    'bestiary',
  bestiary_phasewarden:        'bestiary',
  bestiary_twin_terror:        'bestiary',
  bestiary_znyxorgas_champion:  'bestiary',
  bestiary_naxion_warmaster:    'bestiary',
  bestiary_grox_titan:          'bestiary',
  bestiary_velthrak_shadowblade:'bestiary',
  bestiary_glorp_shambler:      'bestiary',
  bestiary_zyx_skitter:         'bestiary',
  bestiary_naxion_scout:        'bestiary',
  bestiary_vron_crawler:        'bestiary',
  bestiary_spore_node:          'bestiary',
  bestiary_vexlar:              'bestiary',
  bestiary_mog_toxin:           'bestiary',
  bestiary_qrix_hunter:         'bestiary',
  bestiary_void_wraith:         'bestiary',
  bestiary_velzar:              'bestiary',
  bestiary_zyx_swarmer:         'bestiary',
  bestiary_zyx_remnant:         'bestiary',
  bestiary_qrix_hauler:         'bestiary',
  bestiary_qrix_salvager:       'bestiary',
  bestiary_qrix_voidbreacher:   'bestiary',
  bestiary_cryo_drifter:        'bestiary',
  echo_velthar:       'field_notes',
  echo_musashi:      'field_notes',
  echo_cleopatra:    'field_notes',
  echo_tesla:        'field_notes',
  echo_shaka:        'field_notes',
  acquisition_velthar:   'acquisitions',
  acquisition_musashi:  'acquisitions',
  acquisition_cleopatra:'acquisitions',
  acquisition_tesla:    'acquisitions',
  acquisition_shaka:    'acquisitions',
  classified_velthar:    'classified',
  classified_musashi:   'classified',
  classified_cleopatra: 'classified',
  classified_tesla:     'classified',
  classified_shaka:     'classified',
  classified_napoleon:  'classified',
  classified_genghis:   'classified',
  classified_davinci:   'classified',
  classified_leonidas:  'classified',
  classified_sunsin:    'classified',
  classified_beethoven: 'classified',
  classified_huang:     'classified',
  classified_nelson:    'classified',
  classified_hannibal:  'classified',
  classified_picasso:   'classified',
  classified_teddy:     'classified',
  classified_mansa:     'classified',
  field_notes_velthar:  'field_notes',
  field_notes_musashi:  'field_notes',
  field_notes_cleopatra:'field_notes',
  field_notes_tesla:    'field_notes',
  field_notes_shaka:    'field_notes',
  conversation_musashi_leonidas: 'field_notes',
  conversation_genghis_velthar:   'field_notes',
  conversation_cleopatra_napoleon: 'field_notes',
};

const LORE_SUBS: { id: LoreCategory; label: string; icon: string }[] = [
  { id: 'civilization', label: 'Civilization',  icon: '🌌' },
  { id: 'acquisitions', label: 'Acquisitions',  icon: '📋' },
  { id: 'field_notes',  label: 'Field Notes',   icon: '🔬' },
  { id: 'classified',   label: 'Classified',    icon: '🔒' },
  { id: 'bestiary',     label: 'Bestiary',      icon: '👾' },
];

// ── Tab Config ────────────────────────────────────────────────────────────────

type Tab = 'characters' | 'tiles' | 'items' | 'cards' | 'enemies' | 'effects' | 'events' | 'meta' | 'lore' | 'achievements';
type MegaTab = 'characters' | 'mechanics' | 'lore' | 'achievements';

const MECHANICS_TABS: Tab[] = ['tiles', 'items', 'cards', 'enemies', 'effects', 'events', 'meta'];

const MECHANICS_SUB: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tiles',   label: 'Tiles & Terrain', icon: <Map className="w-3.5 h-3.5" /> },
  { id: 'items',   label: 'Items',           icon: <Package className="w-3.5 h-3.5" /> },
  { id: 'cards',   label: 'Cards',           icon: <Sword className="w-3.5 h-3.5" /> },
  { id: 'enemies', label: 'Enemies',         icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'effects', label: 'Effects',         icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'events',  label: 'Arena Events',    icon: <Star className="w-3.5 h-3.5" /> },
  { id: 'meta',    label: 'Progression',     icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

function getMegaTab(tab: Tab): MegaTab {
  if (MECHANICS_TABS.includes(tab)) return 'mechanics';
  if (tab === 'lore') return 'lore';
  if (tab === 'achievements') return 'achievements';
  return 'characters';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onFireEvent?: (eventKey: string, payload?: Record<string, unknown>) => void;
  isLoreUnlocked?: (id: string) => boolean;
  isUnlocked?: (id: string) => boolean;
  achievementStats?: AchievementStats;
  newAchievementIds?: Set<string>;
  newAchievementCount?: number;
  markAchievementSeen?: (id: string) => void;
  initialTab?: Tab;
  totalUnlockedPoints?: number;
  devAllCharsUnlocked?: boolean;
  onToggleDevChars?: () => void;
  standaloneMode?: boolean;
}

const LS_LORE_SEEN = 'wcw_lore_seen_v1';

function loadSeenLore(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_LORE_SEEN);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch { return new Set<string>(); }
}

export default function HistoricalArchives({ onBack, onFireEvent, isLoreUnlocked, isUnlocked, achievementStats, newAchievementIds, newAchievementCount, markAchievementSeen, initialTab, totalUnlockedPoints = 0, devAllCharsUnlocked = false, onToggleDevChars, standaloneMode }: Props) {
  const [activeTab, setActiveTab]       = useState<Tab>(initialTab ?? 'characters');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [seenLoreIds, setSeenLoreIds]   = useState<Set<string>>(loadSeenLore);

  const char = selectedChar ? CHARACTERS.find(c => c.id === selectedChar) ?? null : null;

  const handleSelectChar = (id: string) => {
    setSelectedChar(id);
    onFireEvent?.('character_viewed', { characterId: id });
  };

  // Mark an achievement-unlocked lore entry as seen (removes badge)
  const markLoreSeen = (id: string) => {
    setSeenLoreIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(LS_LORE_SEEN, JSON.stringify([...next])); } catch { /* ok */ }
      return next;
    });
  };

  // An entry is "new" if it was locked, got unlocked by an achievement, and hasn't been opened yet
  const isLoreNew = (l: LoreEntry) =>
    !l.unlocked && (isLoreUnlocked?.(l.id) ?? false) && !seenLoreIds.has(l.id);

  // Count new entries per lore category
  const newLoreCount = (cat?: LoreCategory) =>
    LORE.filter(l => (cat ? LORE_CAT[l.id] === cat : true) && isLoreNew(l)).length;

  // Standalone achievements & progression screen (separate from Archives)
  if (standaloneMode) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <ArenaBackground />
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="relative overflow-hidden shrink-0" style={{ height: 120 }}>
            <img src="/art/group_splash.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top" style={{ filter: 'brightness(0.3) saturate(0.8)' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-orbitron text-[9px] tracking-[0.5em] text-yellow-500/60 mb-1.5">HALL OF RECORDS</p>
              <h1 className="font-orbitron font-black text-3xl text-white" style={{ textShadow: '0 0 24px rgba(251,191,36,0.45)' }}>
                ACHIEVEMENTS & PROGRESSION
              </h1>
            </div>
            <button onClick={onBack}
              className="absolute top-4 left-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-5xl mx-auto w-full">
            <AchievementsTab
              isUnlocked={isUnlocked}
              stats={achievementStats}
              newAchievementIds={newAchievementIds}
              markAchievementSeen={markAchievementSeen}
              totalUnlockedPoints={totalUnlockedPoints}
              devAllCharsUnlocked={devAllCharsUnlocked}
              onToggleDevChars={onToggleDevChars}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      {char ? (
        <DetailView char={char} onBack={() => setSelectedChar(null)} />
      ) : (
        <MainView
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setSelectedChar(null); }}
          onSelectChar={handleSelectChar}
          onBack={onBack}
          onFireEvent={onFireEvent}
          isLoreUnlocked={isLoreUnlocked}
          isUnlocked={isUnlocked}
          achievementStats={achievementStats}
          isLoreNew={isLoreNew}
          newLoreCount={newLoreCount}
          markLoreSeen={markLoreSeen}
          newAchievementIds={newAchievementIds}
          newAchievementCount={newAchievementCount}
          markAchievementSeen={markAchievementSeen}
          totalUnlockedPoints={totalUnlockedPoints}
          devAllCharsUnlocked={devAllCharsUnlocked}
          onToggleDevChars={onToggleDevChars}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN VIEW (tabs)
══════════════════════════════════════════════════════════════ */
function MainView({
  activeTab, onTabChange, onSelectChar, onBack, onFireEvent,
  isLoreUnlocked, isUnlocked, achievementStats,
  isLoreNew, newLoreCount, markLoreSeen,
  newAchievementIds, newAchievementCount, markAchievementSeen,
  totalUnlockedPoints, devAllCharsUnlocked, onToggleDevChars,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onSelectChar: (id: string) => void;
  onBack: () => void;
  onFireEvent?: (eventKey: string, payload?: Record<string, unknown>) => void;
  isLoreUnlocked?: (id: string) => boolean;
  isUnlocked?: (id: string) => boolean;
  achievementStats?: AchievementStats;
  isLoreNew: (l: LoreEntry) => boolean;
  newLoreCount: (cat?: LoreCategory) => number;
  markLoreSeen: (id: string) => void;
  newAchievementIds?: Set<string>;
  newAchievementCount?: number;
  markAchievementSeen?: (id: string) => void;
  totalUnlockedPoints?: number;
  devAllCharsUnlocked?: boolean;
  onToggleDevChars?: () => void;
}) {
  const { t } = useT();
  const activeMega = getMegaTab(activeTab);

  const loreSubLabels: Record<string, string> = {
    civilization: t.archives.loreSubs.civilization,
    acquisitions: t.archives.loreSubs.acquisitions,
    field_notes:  t.archives.loreSubs.fieldNotes,
    classified:   t.archives.loreSubs.classified,
    bestiary:     t.archives.loreSubs.bestiary,
  };

  const MEGA_TABS: { id: MegaTab; label: string; icon: React.ReactNode; defaultSub?: Tab }[] = [
    { id: 'characters', label: t.archives.tabs.characters,   icon: <Users className="w-4 h-4" /> },
    { id: 'mechanics',  label: t.archives.tabs.gameMechanics, icon: <Cpu className="w-4 h-4" />, defaultSub: 'tiles' },
    { id: 'lore',       label: t.archives.tabs.lore,          icon: <BookOpen className="w-4 h-4" /> },
  ];

  const [loreCategory, setLoreCategory] = useState<LoreCategory>('civilization');

  const handleMegaClick = (mega: MegaTab, defaultSub?: Tab) => {
    if (mega === 'mechanics') { onTabChange(defaultSub ?? 'tiles'); return; }
    onTabChange(mega as Tab);
  };

  const loreTotalCount    = (cat: LoreCategory) => LORE.filter(l => LORE_CAT[l.id] === cat).length;
  const loreUnlockedCount = (cat: LoreCategory) =>
    LORE.filter(l => LORE_CAT[l.id] === cat && (l.unlocked || (isLoreUnlocked?.(l.id) ?? false))).length;

  const totalNewLore = newLoreCount();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        <img src="/art/group_splash.jpg" alt="Battle scene"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ filter: 'brightness(0.45) saturate(1.1)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-orbitron text-[10px] tracking-[0.5em] text-purple-400 mb-2">THE EMPIRE OF ZNYXORGA</p>
          <h1 className="font-orbitron font-black text-4xl text-white" style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>
            {t.archives.title}
          </h1>
        </div>
        <button onClick={onBack}
          className="absolute top-4 left-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
          <ChevronLeft className="w-4 h-4" /> {t.mainMenu}
        </button>
      </div>

      {/* Primary mega-tab bar */}
      <div className="border-b border-slate-700/60 px-6" style={{ background: 'rgba(4,2,18,0.98)' }}>
        <div className="flex gap-0 max-w-5xl mx-auto">
          {MEGA_TABS.map(mt => {
            const isActive  = activeMega === mt.id;
            const accent    = mt.id === 'achievements' ? '#fbbf24' : '#22d3ee';
            const loreBadge = mt.id === 'lore' ? totalNewLore : 0;
            const achBadge  = mt.id === 'achievements' ? (newAchievementIds?.size ?? newAchievementCount ?? 0) : 0;
            const badgeCount = loreBadge + achBadge;
            const hasNewBadge = badgeCount > 0;
            return (
              <button key={mt.id}
                onClick={() => handleMegaClick(mt.id, mt.defaultSub)}
                className="flex items-center gap-2 px-6 py-4 font-orbitron text-[11px] tracking-wider transition-all border-b-2"
                style={{
                  color:            isActive ? accent : '#64748b',
                  borderBottomColor: isActive ? accent : 'transparent',
                  background:       isActive ? `rgba(${mt.id === 'achievements' ? '251,191,36' : '34,211,238'},0.05)` : 'transparent',
                  fontWeight:       isActive ? 700 : 500,
                  position:         'relative',
                }}>
                {mt.icon} {mt.label.toUpperCase()}
                {hasNewBadge && (
                  <span style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    justifyContent:'center',
                    minWidth:      '1.1rem',
                    height:        '1.1rem',
                    borderRadius:  '999px',
                    background:    '#22d3ee',
                    color:         '#020e1e',
                    fontSize:      '0.55rem',
                    fontWeight:    800,
                    padding:       '0 0.25rem',
                    marginLeft:    '0.15rem',
                  }}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary sub-tab bar — Mechanics or Lore */}
      {(activeMega === 'mechanics' || activeMega === 'lore') && (
        <div className="border-b border-slate-800/50 px-6" style={{ background: 'rgba(2,4,14,0.95)' }}>
          <div className="flex gap-0 max-w-5xl mx-auto">
            {activeMega === 'mechanics' && MECHANICS_SUB.map(sub => (
              <button key={sub.id}
                onClick={() => onTabChange(sub.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 font-orbitron text-[10px] tracking-wider transition-all border-b-2"
                style={{
                  color:            activeTab === sub.id ? '#22d3ee' : '#475569',
                  borderBottomColor: activeTab === sub.id ? '#22d3ee' : 'transparent',
                  background:       activeTab === sub.id ? 'rgba(34,211,238,0.04)' : 'transparent',
                }}>
                {sub.icon} {((t.archives.tabs as Record<string, string>)[sub.id] ?? sub.label).toUpperCase()}
              </button>
            ))}
            {activeMega === 'lore' && LORE_SUBS.map(sub => {
              const active    = loreCategory === sub.id;
              const unlocked  = loreUnlockedCount(sub.id);
              const total     = loreTotalCount(sub.id);
              const newInCat  = newLoreCount(sub.id);
              return (
                <button key={sub.id}
                  onClick={() => setLoreCategory(sub.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 font-orbitron text-[10px] tracking-wider transition-all border-b-2"
                  style={{
                    color:            active ? '#22d3ee' : '#475569',
                    borderBottomColor: active ? '#22d3ee' : 'transparent',
                    background:       active ? 'rgba(34,211,238,0.04)' : 'transparent',
                    whiteSpace:       'nowrap',
                    position:         'relative',
                  }}>
                  <span style={{ fontSize: '0.85rem' }}>{sub.icon}</span>
                  {(loreSubLabels[sub.id] ?? sub.label).toUpperCase()}
                  <span style={{ fontSize: '0.58rem', color: active ? '#22d3ee' : 'rgba(148,163,184,0.4)', marginLeft: '0.1rem' }}>
                    {unlocked}/{total}
                  </span>
                  {newInCat > 0 && (
                    <span style={{
                      display:       'inline-flex',
                      alignItems:    'center',
                      justifyContent:'center',
                      minWidth:      '0.95rem',
                      height:        '0.95rem',
                      borderRadius:  '999px',
                      background:    '#22d3ee',
                      color:         '#020e1e',
                      fontSize:      '0.5rem',
                      fontWeight:    800,
                      marginLeft:    '0.2rem',
                    }}>
                      {newInCat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto" style={{ background: 'rgba(2,4,14,0.85)' }}>
        {activeTab === 'characters'   && <CharactersTab onSelectChar={onSelectChar} />}
        {activeTab === 'tiles'        && <TilesTab />}
        {activeTab === 'items'        && <ItemsTab />}
        {activeTab === 'cards'        && <CardsTab />}
        {activeTab === 'enemies'      && <EnemiesTab />}
        {activeTab === 'effects'      && <EffectsTab />}
        {activeTab === 'events'       && <ArenaEventsTab />}
        {activeTab === 'meta'         && <MetaProgressionTab totalUnlockedPoints={totalUnlockedPoints} isUnlocked={isUnlocked} />}
        {activeTab === 'lore'         && (
          <LoreTab
            onFireEvent={onFireEvent}
            isLoreUnlocked={isLoreUnlocked}
            activeCat={loreCategory}
            isLoreNew={isLoreNew}
            markLoreSeen={markLoreSeen}
            devAllCharsUnlocked={devAllCharsUnlocked}
          />
        )}
        {activeTab === 'achievements' && <AchievementsTab isUnlocked={isUnlocked} stats={achievementStats} newAchievementIds={newAchievementIds} markAchievementSeen={markAchievementSeen} totalUnlockedPoints={totalUnlockedPoints} devAllCharsUnlocked={devAllCharsUnlocked} onToggleDevChars={onToggleDevChars} />}
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
                <div className="flex flex-wrap gap-1 mb-2">
                  <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
                    {displayRole}
                  </div>
                  {c.secondaryRole && (() => {
                    const sr = ROLE_STYLE[c.secondaryRole!];
                    const displaySecondary = t.roles[c.secondaryRole!.toLowerCase().replace(/ /g, '_') as keyof typeof t.roles] ?? c.secondaryRole!;
                    return (
                      <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${sr.text} ${sr.border} ${sr.bg}`}>
                        {displaySecondary}
                      </div>
                    );
                  })()}
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
                  {item.id.startsWith('sig_') ? (
                    <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.5)', boxShadow: '0 0 8px rgba(245,158,11,0.25)' }}>
                      ⭐ SIGNATURE
                    </span>
                  ) : (
                    <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: tc, background: tc + '18', border: `1px solid ${tc}50` }}>
                      {(t.archives.itemTier[item.tier as keyof typeof t.archives.itemTier] ?? item.tier).toUpperCase()}
                    </span>
                  )}
                  {charInfo && charNameT && (
                    <span className="font-orbitron text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: charInfo.color, background: charInfo.color + '18', border: `1px solid ${charInfo.color}50` }}>
                      {charNameT.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-orbitron font-bold text-sm text-white mb-1">{itemT?.name ?? item.name}</p>
              {!item.statBonus && (
                <p className="text-slate-400 text-[11px] leading-relaxed flex-1">{itemT?.description ?? item.description}</p>
              )}
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
    { value: 'Nelson',    label: 'Nelson' },
    { value: 'Hannibal',  label: 'Hannibal' },
    { value: 'Picasso',   label: 'Picasso' },
    { value: 'Teddy',     label: 'Teddy' },
    { value: 'Mansa',     label: 'Mansa' },
    { value: "Vel'thar", label: "Vel'thar" },
    { value: 'Musashi',  label: 'Musashi' },
    { value: 'Cleopatra',label: 'Cleopatra' },
    { value: 'Tesla',    label: 'Tesla' },
    { value: 'Shaka',    label: 'Shaka' },
    { value: 'curses',    label: '💀 Curses' },
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

      {/* Card reward rules */}
      <div className="rounded-xl border border-cyan-900/40 p-4 mb-4 flex flex-col gap-2"
        style={{ background: 'rgba(4,12,20,0.85)' }}>
        <p className="font-orbitron font-bold text-[11px] tracking-widest text-cyan-400 mb-1">CARD REWARD RULES</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">⚔️</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Normal Fights</p>
              <p>Drop shared cards only — commons, uncommons, and shared rares (Overcharge, Retribution, etc.).</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">💢</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Elite Fights</p>
              <p>Drop character-exclusive ability cards only — choose 1 of 3 from your party's exclusive pool.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">👑</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Boss Fights</p>
              <p>Drop ultimates only. Act 1: choose 1 of 3. Act 2: choose 1 of 2. Act 3: receive 1 guaranteed.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">🛒</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Merchant</p>
              <p>Sells any non-ultimate card — shared cards and character ability cards, rotated per visit.</p>
            </div>
          </div>
        </div>
      </div>

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
              <p>Characters gain upgrade tokens at levels 2 and 5 (max level 8). Each token lets you upgrade one of their non-ultimate ability cards. Applies to all copies of that card in the deck.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">⭐</span>
            <div>
              <p className="font-orbitron font-bold text-white mb-0.5">Level 8 — Ultimate Upgrade</p>
              <p>At level 8 (max level), a character earns one ultimate upgrade token to power up their ultimate ability. The upgrade is permanent for the rest of the run.</p>
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
  const acts = [0, 1, 2, 3, 4];
  const RANK_ORDER: Record<string, number> = { Minion: 0, Elite: 1, Boss: 2 };
  const sortEnemies = (arr: typeof ENEMIES) =>
    [...arr].sort((a, b) => a.act - b.act || RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  const filtered = sortEnemies(actFilter === 0 ? ENEMIES : ENEMIES.filter(e => e.act === actFilter));

  const RANK_STYLE: Record<string, { color: string; bg: string }> = {
    Minion: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    Elite:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    Boss:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500">{((t.archives as any).enemiesTotal ?? 'ENEMIES — {n} TOTAL').replace('{n}', String(ENEMIES.length))}</p>
        <div className="flex gap-2">
          {acts.map(a => (
            <button key={a} onClick={() => setActFilter(a)}
              className="font-orbitron text-[10px] px-3 py-1 rounded-full border transition-all"
              style={{
                color: actFilter === a ? '#22d3ee' : '#475569',
                borderColor: actFilter === a ? '#22d3ee' : '#1e293b',
                background: actFilter === a ? 'rgba(34,211,238,0.1)' : 'transparent',
              }}>
              {a === 0 ? ((t.archives as any).enemyActAll ?? 'ALL') : ((t.archives as any).enemyActLabel ?? 'ACT {n}').replace('{n}', String(a))}
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
    duration: '1 turn',
    mechanics: 'The Blinded unit\'s attack range and ability range are both reduced to 1 for the duration. Basic attacks and all abilities that require a target are affected.',
    tip: 'Flash Bang a long-range enemy (Napoleon, Qrix Hunter) before their turn to shut down their damage output entirely.',
    counterplay: 'Move your Blinded unit adjacent to the threat so they can still attack. Heal or wait out the 1-turn duration.',
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
    duration: 'Duration varies by source — always removed early by any healing',
    mechanics: "While poisoned, the unit has reduced Might and Defense equal to the poison magnitude. Enemy Spore Nodes apply magnitude 5 with a very long duration (effectively until healed). Cleopatra's Asp's Venom applies magnitude 8 per application for 3 turns, stacking up to 3 times (max −24 Might/Defense). All stacks are cleared immediately by any heal source.",
    tip: "Cleopatra's venom stacks — hit the same target three times for −24 Might/Defense. Against Spore Nodes, prioritize healing before the stat reduction compounds over multiple turns.",
    counterplay: 'Any heal (Mend, Masterpiece, Arena Medkit) removes all poison stacks at once, regardless of source or duration. Against Cleopatra, avoid clustering — she can chain venom across multiple targets.',
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
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const effect = selected ? STATUS_EFFECTS.find(e => e.id === selected) : null;
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-orbitron text-lg text-cyan-400 tracking-widest mb-1">{(t.archives as any).effectsTitle ?? 'STATUS EFFECTS'}</h2>
      <p className="text-slate-400 text-sm mb-4">{(t.archives as any).effectsDesc ?? "All debuffs and their exact mechanics — know what you're applying, and what's being applied to you."}</p>
      <p className="text-slate-500 text-xs mb-8 italic">Debuff timing: debuffs tick once per side's turn end — when YOUR side ends its turn, YOUR debuffs fire. When the ENEMY side ends its turn, ENEMY debuffs fire.</p>
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
                  <div className="text-[11px] font-orbitron text-slate-400 tracking-widest mb-1">{(t.archives as any).effectMechanic ?? 'MECHANIC'}</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{e.mechanics}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <div className="text-[10px] font-orbitron text-cyan-400 tracking-widest mb-1">{(t.archives as any).effectTip ?? 'TACTICAL TIP'}</div>
                  <p className="text-xs text-slate-300">{e.tip}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="text-[10px] font-orbitron text-red-400 tracking-widest mb-1">{(t.archives as any).effectCounterplay ?? 'COUNTERPLAY'}</div>
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
  const { t } = useT();
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="font-orbitron text-lg text-cyan-400 tracking-widest mb-1">{(t.archives as any).eventsTitle ?? 'ARENA EVENTS'}</h2>
      <p className="text-slate-400 text-sm mb-2">{(t.archives as any).eventsDesc ?? 'Znyxorga controls the arena. At any moment, the battlefield itself can change.'}</p>
      <p className="text-slate-500 text-xs mb-8 italic">{(t.archives as any).eventsNote ?? 'Events trigger randomly during combat. You will see a warning banner before the effect activates — adapt your plan accordingly.'}</p>
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
              <div className="text-[10px] font-orbitron text-cyan-400 tracking-widest mb-1">{(t.archives as any).eventsStrategy ?? 'STRATEGY'}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{ev.strategy}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border p-5" style={{ background: 'rgba(4,2,18,0.9)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="font-orbitron text-xs text-red-400 tracking-widest mb-2">⚠️ DIRECTORATE NOTE</div>
        <p className="text-sm text-slate-300 italic leading-relaxed">
          {(t.archives as any).eventsDirectorate ?? '"Arena Event implementation is subject to the Directorate\'s editorial override. Events are selected to maximize viewer engagement metrics. Clones with a predicted 80%+ win probability may experience accelerated event frequency." — Arena Operations Manual, §12.4'}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACHIEVEMENTS TAB
══════════════════════════════════════════════════════════════ */
const CATEGORIES: AchievementCategory[] = ['combat', 'clones', 'arena', 'enemies', 'observer', 'secret'];

// Portrait map for character unlock milestones
const CHAR_PORTRAITS: Record<string, string> = {
  napoleon:  '/art/napoleon_portrait.png',
  genghis:   '/art/genghis_portrait.png',
  davinci:   '/art/davinci_portrait.png',
  leonidas:  '/art/leonidas_portrait.png',
  sunsin:    '/art/sunsin_portrait.png',
  beethoven: '/art/beethoven_portrait.png',
  huang:     '/art/huang_portrait.png',
  nelson:    '/art/nelson_portrait.png',
  hannibal:  '/art/hannibal_portrait.png',
  picasso:   '/art/picasso_portrait.png',
  teddy:     '/art/teddy_portrait.png',
  mansa:     '/art/mansa_portrait.png',
  velthar:    '/art/velthar_portrait.png',
  musashi:   '/art/musashi_portrait.png',
  cleopatra: '/art/cleopatra_portrait.png',
  tesla:     '/art/tesla_portrait.png',
  shaka:     '/art/shaka_portrait.png',
};
const CHAR_DISPLAY_NAMES: Record<string, string> = {
  napoleon:  'Napoleon-chan', genghis: 'Genghis-chan', davinci: 'Da Vinci-chan',
  leonidas:  'Leonidas-chan', sunsin: 'Sun-sin-chan',  beethoven: 'Beethoven-chan',
  huang:     'Huang-chan',    nelson: 'Nelson-chan',    hannibal: 'Hannibal-chan',
  picasso:   'Picasso-chan',  teddy:  'Teddy-chan',     mansa: 'Mansa-chan',
  velthar:    "Vel'thar-chan",  musashi: 'Musashi-chan',  cleopatra: 'Cleopatra-chan',
  tesla:     'Tesla-chan',    shaka: 'Shaka-chan',
};

/* ══════════════════════════════════════════════════════════════
   META PROGRESSION TAB
══════════════════════════════════════════════════════════════ */
function MetaProgressionTab({ totalUnlockedPoints, isUnlocked }: { totalUnlockedPoints?: number; isUnlocked?: (id: string) => boolean }) {
  const pts = totalUnlockedPoints ?? 0;

  const MILESTONES: { pts: number; icon: string; label: string; desc: string }[] = [
    { pts: 50,   icon: '👁',  label: 'Map Fog +2',              desc: '2 rows revealed ahead of your position' },
    { pts: 100,  icon: '💰', label: '+10% Gold',                desc: 'All gold sources increased by 10%' },
    { pts: 150,  icon: '👁',  label: 'Map Fog +4',              desc: '4 rows revealed — plan further ahead' },
    { pts: 200,  icon: '🛒', label: 'Merchant: 4th Card',       desc: 'Merchants stock an extra card for purchase' },
    { pts: 250,  icon: '✂',  label: 'Campfire: Card Removal',  desc: 'Remove a card permanently from your deck at campfire' },
    { pts: 300,  icon: '🃏', label: 'Draw +1 Card',              desc: 'Draw 1 extra card per turn — hand size 7 → 8' },
    { pts: 350,  icon: '🛒', label: 'Merchant: 4th Item',       desc: 'Merchants stock a 4th item (Legendary tier)' },
    { pts: 400,  icon: '👁',  label: 'Map Fog +6',              desc: '6 rows revealed — almost no surprises' },
    { pts: 450,  icon: '💰', label: '+20% Gold',                desc: 'Stacks with +10% — total +30% at this point' },
    { pts: 500,  icon: '🎁', label: 'Free Box (every 3rd)',     desc: 'Mystery Box at merchant is FREE every 3rd visit' },
    { pts: 600,  icon: '🌐', label: 'Full Map Visibility',      desc: 'Every node and path revealed from run start' },
    { pts: 700,  icon: '💰', label: '+30% Gold',                desc: 'Stacks further — total +60% at this point' },
    { pts: 800,  icon: '🎒', label: 'Item Slot #7',             desc: 'Each character gains a 7th item slot' },
    { pts: 900,  icon: '🃏', label: 'Draw +1 Card',              desc: 'Draw 1 more card per turn — hand size 8 → 9' },
    { pts: 1000, icon: '💰', label: '+50% Gold',                desc: 'Stacks further — total +110% gold at this point' },
    { pts: 1100, icon: '🔥', label: 'Campfire 50% HP',          desc: 'Campfire restores 50% HP instead of 30%' },
    { pts: 1200, icon: '🃏', label: '4 Cards/Turn',             desc: 'Play up to 4 cards per turn (base limit)' },
    { pts: 1300, icon: '⬆️', label: 'Dual Campfire Upgrade',   desc: 'Upgrade TWO cards per campfire rest' },
    { pts: 1400, icon: '💰', label: '+50% Gold',                desc: 'Stacks again — total +160% gold (2.6× multiplier)' },
    { pts: 1500, icon: '⭐', label: 'Free Sig. Legendary',      desc: 'Start every run with a random Signature Legendary equipped' },
  ];

  // Use correct achievement IDs from achievements.ts
  const teddyUnlocked      = isUnlocked?.('thral_nor') ?? false;
  const mansaUnlocked      = isUnlocked?.('vel_zar_thral') ?? false;
  const sigLegsUnlocked    = isUnlocked?.('vel_nor') ?? false;
  const bonusCardUnlocked  = isUnlocked?.('vel_krath') ?? false;

  // Points-based clone unlocks (excluding free starters)
  const paidUnlocks = Object.entries(CHARACTER_UNLOCK_THRESHOLDS)
    .filter(([, t]) => t > 0)
    .sort(([, a], [, b]) => a - b);

  const CHAR_NAMES: Record<string, string> = {
    sunsin: 'Yi Sun-sin', nelson: 'Nelson', beethoven: 'Beethoven',
    huang: 'Huang', hannibal: 'Hannibal', picasso: 'Picasso',
  };

  const row = (icon: string, label: string, desc: string, earned: boolean) => (
    <div key={label} className="flex items-start gap-3 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-lg mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-orbitron text-[11px] tracking-wider mb-0.5" style={{ color: earned ? '#e2e8f0' : 'rgba(255,255,255,0.3)' }}>{label}</div>
        <p className="text-[11px] leading-relaxed" style={{ color: earned ? 'rgba(148,163,184,0.85)' : 'rgba(255,255,255,0.2)' }}>{desc}</p>
      </div>
      <span className="font-orbitron text-[9px] mt-1 shrink-0 px-2 py-0.5 rounded"
        style={{ background: earned ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)', color: earned ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}>
        {earned ? 'UNLOCKED' : 'LOCKED'}
      </span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-2">META PROGRESSION</p>
      <p className="text-slate-400 text-sm mb-10 leading-relaxed">
        Progress persists across every run. Earn achievement points by completing objectives — points permanently improve all future runs. Characters and perks unlock once and stay unlocked forever.
      </p>

      {/* Points counter */}
      <div className="mb-10 p-5 rounded-2xl flex items-center gap-6" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
        <div className="text-center shrink-0">
          <div className="font-orbitron text-3xl font-bold" style={{ color: '#22d3ee' }}>{pts}</div>
          <div className="font-orbitron text-[9px] tracking-widest text-slate-500 mt-1">TOTAL POINTS</div>
        </div>
        <div className="flex-1">
          <div className="w-full h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (pts / 1000) * 100)}%`, background: 'linear-gradient(90deg, #22d3ee, #60a5fa)' }} />
          </div>
          <p className="text-[11px] text-slate-500">Earn points through achievements. Max milestone: 1000 pts.</p>
        </div>
      </div>

      {/* Point milestones */}
      <div className="mb-10">
        <p className="font-orbitron text-[10px] tracking-[0.35em] text-slate-500 mb-4 uppercase">Achievement Point Milestones</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5">
            {MILESTONES.map(m => {
              const earned = pts >= m.pts;
              return (
                <div key={m.pts} className="flex items-start gap-3 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-lg mt-0.5 shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-orbitron text-[11px] tracking-wider mb-0.5" style={{ color: earned ? '#e2e8f0' : 'rgba(255,255,255,0.3)' }}>{m.label}</div>
                    <p className="text-[11px] leading-relaxed" style={{ color: earned ? 'rgba(148,163,184,0.85)' : 'rgba(255,255,255,0.2)' }}>{m.desc}</p>
                  </div>
                  <span className="font-orbitron text-[9px] mt-1 shrink-0 px-2 py-0.5 rounded"
                    style={{ background: earned ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)', color: earned ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}>
                    {m.pts} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clone unlocks — points-based */}
      <div className="mb-10">
        <p className="font-orbitron text-[10px] tracking-[0.35em] text-slate-500 mb-4 uppercase">Clone Unlocks — Achievement Points</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5">
            {paidUnlocks.map(([charId, threshold]) => {
              const earned = pts >= threshold;
              return row('⚔️', CHAR_NAMES[charId] ?? charId, `${threshold} achievement points required`, earned);
            })}
          </div>
        </div>
      </div>

      {/* Clone unlocks — story */}
      <div className="mb-10">
        <p className="font-orbitron text-[10px] tracking-[0.35em] text-slate-500 mb-4 uppercase">Clone Unlocks — Story Milestones</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5">
            {row('🤠', 'Teddy Roosevelt', 'Complete Act III in any run', teddyUnlocked)}
            {row('💛', 'Mansa Musa', 'Complete Act IV — defeat Vel\'Zar', mansaUnlocked)}
          </div>
        </div>
      </div>

      {/* Story perks */}
      <div className="mb-10">
        <p className="font-orbitron text-[10px] tracking-[0.35em] text-slate-500 mb-4 uppercase">Story Milestone Perks</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5">
            {row('⭐', 'Signature Legendary Items', 'Complete Act I for the first time — rare legendary items enter the item pool', sigLegsUnlocked)}
            {row('🃏', '+1 Card Reward Choice', 'Complete Act II for the first time — every post-fight reward offers one extra card', bonusCardUnlocked)}
          </div>
        </div>
      </div>

      {/* Lore */}
      <div>
        <p className="font-orbitron text-[10px] tracking-[0.35em] text-slate-500 mb-4 uppercase">Lore Unlocks</p>
        <div className="p-5 rounded-2xl text-sm text-slate-400 leading-relaxed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Most lore entries in the Archives are locked. They unlock automatically when you earn specific achievements. 64 total entries across five sub-tabs: Civilization, Acquisitions, Field Notes, Classified, and Bestiary. New entries glow cyan when you open the Archives.
        </div>
      </div>
    </div>
  );
}

function AchievementsTab({
  isUnlocked,
  stats,
  newAchievementIds,
  markAchievementSeen,
  totalUnlockedPoints = 0,
  devAllCharsUnlocked = false,
  onToggleDevChars,
}: {
  isUnlocked?: (id: string) => boolean;
  stats?: AchievementStats;
  newAchievementIds?: Set<string>;
  markAchievementSeen?: (id: string) => void;
  totalUnlockedPoints?: number;
  devAllCharsUnlocked?: boolean;
  onToggleDevChars?: () => void;
}) {
  const { t, lang } = useT();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>('combat');
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);
  const achievements = getAchievementsByCategory(activeCategory);
  const totalUnlocked = ACHIEVEMENTS.filter(a => isUnlocked?.(a.id)).length;
  const totalPoints   = ACHIEVEMENTS.filter(a => isUnlocked?.(a.id)).reduce((s, a) => s + a.points, 0);

  const handleReset = () => {
    localStorage.removeItem('wcw_achievement_stats_v1');
    localStorage.removeItem('wcw_achievements_unlocked_v1');
    localStorage.removeItem('wcw_achievement_lore_v1');
    window.location.reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-1">{t.archives.achievementUI.hallOfRecords}</p>
          <h2 className="font-orbitron font-black text-xl text-white">{t.archives.achievementUI.title}</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-orbitron font-black text-2xl" style={{ color: '#fbbf24' }}>
              {totalUnlocked}<span className="text-slate-600 text-lg font-normal">/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="font-orbitron text-[9px] text-slate-500 tracking-widest">{t.archives.achievementUI.unlocked}</div>
          </div>
          <div className="text-right">
            <div className="font-orbitron font-black text-2xl" style={{ color: '#fbbf24' }}>
              {totalPoints}<span className="text-slate-600 text-lg font-normal">/{TOTAL_POINTS}</span>
            </div>
            <div className="font-orbitron text-[9px] text-slate-500 tracking-widest">{t.archives.achievementUI.points}</div>
          </div>
          {/* Dev buttons */}
          <div className="flex gap-2">
            <button onClick={onToggleDevChars}
              className="font-orbitron text-[9px] px-3 py-1.5 rounded transition-all hover:opacity-80"
              style={{
                background: devAllCharsUnlocked ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${devAllCharsUnlocked ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.15)'}`,
                color: devAllCharsUnlocked ? '#fbbf24' : '#64748b',
              }}
              title="Dev: force-unlock / re-lock all characters">
              {devAllCharsUnlocked ? '🔓 ALL CLONES' : '🔒 LOCKED'}
            </button>
            <button onClick={handleReset}
              className="font-orbitron text-[9px] px-3 py-1.5 rounded transition-all hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              title="Reset all achievement progress (dev)">
              {t.archives.achievementUI.reset}
            </button>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-3 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
        <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
          style={{
            width: `${Math.max(2, (totalUnlocked / ACHIEVEMENTS.length) * 100)}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a)',
            boxShadow: '0 0 12px rgba(251,191,36,0.55)',
          }}>
          {totalUnlocked > 0 && <span className="font-orbitron text-[8px] font-black text-black/70 leading-none">{Math.round((totalUnlocked / ACHIEVEMENTS.length) * 100)}%</span>}
        </div>
      </div>

      {/* Character unlock milestones */}
      <div className="mb-8 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.14)' }}>
        <div className="font-orbitron text-[10px] tracking-[0.35em] text-yellow-500/70 mb-4 uppercase">{t.archives.achievementUI.cloneUnlockTitle}</div>
        {/* Points-based characters — exclude free (threshold=0) */}
        {(() => {
          const paid = Object.entries(CHARACTER_UNLOCK_THRESHOLDS).filter(([, t]) => t > 0).sort(([, a], [, b]) => a - b);
          const maxPts = paid[paid.length - 1]?.[1] ?? 550;
          return (
            <div className="relative mb-6">
              <div className="absolute top-6 left-6 right-6 h-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="absolute top-6 left-6 h-0.5 transition-all duration-700"
                style={{
                  background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                  boxShadow: '0 0 6px rgba(251,191,36,0.5)',
                  width: (() => {
                    const thresholds = paid.map(([, t]) => t);
                    const n = thresholds.length;
                    if (n < 2) return '0%';
                    let lastIdx = -1;
                    for (let i = 0; i < n; i++) { if (totalUnlockedPoints >= thresholds[i]) lastIdx = i; }
                    if (lastIdx < 0) return '0%';
                    if (lastIdx === n - 1) return `calc(100% - 3rem)`;
                    const fraction = Math.min(1, (totalUnlockedPoints - thresholds[lastIdx]) / (thresholds[lastIdx + 1] - thresholds[lastIdx]));
                    const pct = ((lastIdx + fraction) / (n - 1)) * 100;
                    return `calc(${pct}% - 3rem)`;
                  })(),
                  right: 'auto',
                }} />
              <div className="relative flex justify-between">
                {paid.map(([charId, threshold]) => {
                  const unlocked = totalUnlockedPoints >= threshold;
                  const portrait = CHAR_PORTRAITS[charId];
                  const displayName = CHAR_DISPLAY_NAMES[charId];
                  return (
                    <div key={charId} className="flex flex-col items-center gap-1.5" style={{ width: 52 }}>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden"
                        style={{
                          border: unlocked ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.12)',
                          boxShadow: unlocked ? '0 0 12px rgba(251,191,36,0.45)' : 'none',
                          filter: unlocked ? 'none' : 'grayscale(1) brightness(0.45)',
                          transition: 'all 0.3s',
                        }}>
                        {portrait ? (
                          <img src={portrait} alt={displayName} className="w-full h-full object-cover" style={{ objectPosition: 'center 12%' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                            style={{ background: 'rgba(80,60,120,0.8)', color: '#fbbf24' }}>
                            {displayName.charAt(0)}
                          </div>
                        )}
                        {!unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <Lock style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
                          </div>
                        )}
                      </div>
                      <div className="font-orbitron text-[8px] text-center leading-tight"
                        style={{ color: unlocked ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                        {displayName}
                      </div>
                      <div className="font-orbitron text-[8px] text-center"
                        style={{ color: unlocked ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.3)' }}>
                        {threshold}p
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {/* Event-based characters (Teddy, Mansa) */}
        <div className="flex gap-4 pt-2 border-t border-white/5">
          {Object.entries(CHARACTER_UNLOCK_EVENTS).map(([charId, achievementId]) => {
            const unlocked = isUnlocked?.(achievementId) ?? false;
            const portrait = CHAR_PORTRAITS[charId];
            const displayName = CHAR_DISPLAY_NAMES[charId];
            const completeLabel = charId === 'teddy' ? t.archives.achievementUI.completeAct3 : charId === 'mansa' ? t.archives.achievementUI.completeAct4 : achievementId;
            return (
              <div key={charId} className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0"
                  style={{
                    border: unlocked ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.12)',
                    boxShadow: unlocked ? '0 0 10px rgba(251,191,36,0.4)' : 'none',
                    filter: unlocked ? 'none' : 'grayscale(1) brightness(0.45)',
                  }}>
                  {portrait ? (
                    <img src={portrait} alt={displayName} className="w-full h-full object-cover" style={{ objectPosition: 'center 12%' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(80,60,120,0.8)', color: '#fbbf24' }}>
                      {displayName.charAt(0)}
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <Lock style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.5)' }} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-orbitron text-[9px] font-bold" style={{ color: unlocked ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>{displayName}</div>
                  <div className="font-orbitron text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{completeLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run perks unlock progression — milestone track */}
      <div className="mb-8 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)' }}>
        <div className="font-orbitron text-[10px] tracking-[0.35em] text-blue-400/70 mb-5 uppercase">{t.archives.achievementUI.runPerksTitle}</div>
        {(() => {
          const MILESTONES: { pts: number; icon: string; label: string; sublabel?: string; tooltip?: string }[] = [
            { pts: 50,   icon: '👁',  label: 'Fog +2',          sublabel: '2 rows visible',  tooltip: 'Map reveals 2 rows ahead of your current position' },
            { pts: 100,  icon: '💰', label: '+10% Gold',        sublabel: 'All sources',      tooltip: 'All gold pickups and rewards increased by 10% (stacks with later bonuses)' },
            { pts: 150,  icon: '👁',  label: 'Fog +4',          sublabel: '4 rows visible',  tooltip: 'Map reveals 4 rows ahead — see further to plan your path' },
            { pts: 200,  icon: '🛒', label: '+Card Choice',     sublabel: 'Merchant',         tooltip: 'Merchant gains a 4th card for sale — more options each visit' },
            { pts: 250,  icon: '✂',  label: 'Card Removal',    sublabel: 'At campfire',      tooltip: 'Campfire gains a "Remove Card" option — permanently cut a card from your deck' },
            { pts: 300,  icon: '🃏', label: 'Draw +1 Card',    sublabel: 'Hand size 8',      tooltip: 'Draw 1 extra card at turn start — hand size increases from 7 to 8' },
            { pts: 350,  icon: '🛒', label: '+Item Choice',     sublabel: 'Merchant',         tooltip: 'Merchant gains a 4th item (Legendary tier) for sale — more loot options' },
            { pts: 400,  icon: '👁',  label: 'Fog +6',          sublabel: '6 rows visible',  tooltip: 'Map reveals 6 rows ahead — almost no surprises left' },
            { pts: 450,  icon: '💰', label: '+20% Gold',        sublabel: 'All sources',      tooltip: '+20% gold stacks with +10% — total +30% at this point' },
            { pts: 500,  icon: '🎁', label: 'Free Box (/3)',   sublabel: 'Every 3rd visit',  tooltip: 'Mystery Box at the merchant is FREE every 3rd merchant visit (visits 3, 6, 9…)' },
            { pts: 600,  icon: '🌐', label: 'Full Map',         sublabel: 'No fog',           tooltip: 'Full map visibility — every node and path revealed from the start' },
            { pts: 700,  icon: '💰', label: '+30% Gold',        sublabel: 'All sources',      tooltip: '+30% gold stacks — total +60% gold at this point' },
            { pts: 800,  icon: '🎒', label: 'Slot #7',          sublabel: 'Per character',    tooltip: 'Each character gains a 7th item slot — equip even more powerful gear' },
            { pts: 900,  icon: '🃏', label: 'Draw +1 Card',    sublabel: 'Hand size 9',      tooltip: 'Draw 1 more card at turn start — hand size increases from 8 to 9 (stacks with 300p perk)' },
            { pts: 1000, icon: '💰', label: '+50% Gold',        sublabel: 'All sources',      tooltip: '+50% gold stacks — total +110% gold at this point' },
            { pts: 1100, icon: '🔥', label: 'Campfire 50%',    sublabel: 'HP restored',      tooltip: 'Campfire restores 50% HP instead of 30% — much more powerful mid-run recovery' },
            { pts: 1200, icon: '🃏', label: '4 Cards/Turn',    sublabel: 'Play limit',       tooltip: 'Play up to 4 cards per turn (base) — all card/turn bonuses stack on top of this' },
            { pts: 1300, icon: '⬆️', label: 'Dual Upgrade',    sublabel: 'At campfire',      tooltip: 'Campfire lets you upgrade TWO cards per rest — twice the deck power' },
            { pts: 1400, icon: '💰', label: '+50% Gold',        sublabel: 'All sources',      tooltip: '+50% gold stacks again — total +160% gold at this point (2.6× multiplier)' },
            { pts: 1500, icon: '⭐', label: 'Free Sig. Leg.',  sublabel: 'Every run start',  tooltip: 'Start every run with a random Signature Legendary already equipped on one of your clones' },
          ];
          // Achievement-gated perks (sig legendaries)
          const achPerks = ACHIEVEMENTS.filter(a => a.runPerk && !a.runPerk.id.startsWith('char_') && !a.runPerk.id.startsWith('legacy_'));
          const ROW1 = MILESTONES.slice(0, 10);  // 50p – 500p
          const ROW2 = MILESTONES.slice(10);      // 600p – 1500p

          const renderRow = (rowMilestones: typeof MILESTONES, rowLabel: string) => {
            const n = rowMilestones.length;
            let lastIdx = -1;
            for (let i = 0; i < n; i++) { if (totalUnlockedPoints >= rowMilestones[i].pts) lastIdx = i; }
            const lineWidth = lastIdx < 0 ? '0%'
              : lastIdx === n - 1 ? 'calc(100% - 3rem)'
              : (() => {
                  const fraction = Math.min(1, (totalUnlockedPoints - rowMilestones[lastIdx].pts) / (rowMilestones[lastIdx + 1].pts - rowMilestones[lastIdx].pts));
                  return `calc(${((lastIdx + fraction) / (n - 1)) * 100}% - 3rem)`;
                })();
            return (
              <div className="relative mb-6">
                <div className="font-orbitron text-[8px] tracking-widest mb-3" style={{ color: 'rgba(96,165,250,0.4)' }}>{rowLabel}</div>
                <div className="absolute top-[2.75rem] left-6 right-6 h-0.5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <div className="absolute top-[2.75rem] left-6 h-0.5 transition-all duration-700"
                  style={{
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    boxShadow: '0 0 6px rgba(96,165,250,0.5)',
                    width: lineWidth, right: 'auto',
                  }} />
                <div className="relative flex justify-between">
                  {rowMilestones.map((m) => {
                    const earned = totalUnlockedPoints >= m.pts;
                    const isHov = hoveredMilestone === m.pts;
                    return (
                      <div key={m.pts} className="flex flex-col items-center gap-1.5 relative" style={{ minWidth: 56 }}
                        onMouseEnter={() => setHoveredMilestone(m.pts)}
                        onMouseLeave={() => setHoveredMilestone(null)}>
                        {isHov && m.tooltip && (
                          <div className="absolute bottom-full mb-2 left-1/2 z-50 pointer-events-none"
                            style={{ transform: 'translateX(-50%)', minWidth: 160, maxWidth: 220 }}>
                            <div className="font-orbitron text-[9px] leading-relaxed text-center px-3 py-2 rounded-lg"
                              style={{ background: 'rgba(10,15,40,0.97)', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd', boxShadow: '0 4px 16px rgba(0,0,0,0.7)', whiteSpace: 'normal' }}>
                              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{m.label}</span>
                              <div style={{ color: '#64748b', marginTop: 2, fontSize: 8 }}>{m.tooltip}</div>
                            </div>
                            <div style={{ width: 8, height: 8, background: 'rgba(10,15,40,0.97)', border: '1px solid rgba(96,165,250,0.4)', borderTop: 'none', borderLeft: 'none', transform: 'rotate(45deg) translateX(-50%)', position: 'absolute', bottom: -5, left: '50%' }} />
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 cursor-default"
                          style={{
                            background: earned ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${earned ? (isHov ? 'rgba(147,197,253,0.85)' : 'rgba(96,165,250,0.65)') : 'rgba(255,255,255,0.12)'}`,
                            boxShadow: earned ? (isHov ? '0 0 18px rgba(96,165,250,0.55)' : '0 0 12px rgba(96,165,250,0.35)') : 'none',
                            filter: earned ? 'none' : 'grayscale(1) brightness(0.5)',
                            transition: 'all 0.2s',
                          }}>
                          {m.icon}
                        </div>
                        <div className="font-orbitron text-[9px] text-center leading-tight" style={{ color: earned ? '#93c5fd' : 'rgba(255,255,255,0.25)', maxWidth: 60 }}>
                          {m.label}
                        </div>
                        <div className="font-orbitron text-[9px] text-center font-bold" style={{ color: earned ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.25)' }}>{m.pts}p</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };

          return (
            <>
              {renderRow(ROW1, '50 — 500')}
              <div className="border-t border-white/5 mb-6" />
              {renderRow(ROW2, '600 — 1500')}
              {/* Achievement-gated perks (below track) */}
              {achPerks.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-2">
                  {achPerks.map(a => {
                    const earned = isUnlocked?.(a.id) ?? false;
                    const conditionMap: Record<string, string> = {
                      sig_legendaries: t.archives.achievementUI.completeAct1,
                      bonus_card_choice: t.archives.achievementUI.completeAct2,
                    };
                    const condition = conditionMap[a.runPerk!.id] ?? '';
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: earned ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${earned ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.10)'}`,
                          }}>
                          {earned ? <span style={{ fontSize: 12 }}>⚡</span> : <Lock style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.25)' }} />}
                        </div>
                        <div className="flex-1">
                          <span className="font-orbitron text-[10px]" style={{ color: earned ? '#93c5fd' : 'rgba(255,255,255,0.25)' }}>{a.runPerk!.label}</span>
                          {condition && (
                            <span className="font-orbitron text-[9px] ml-2" style={{ color: earned ? 'rgba(96,165,250,0.55)' : 'rgba(255,255,255,0.18)' }}>— {condition}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => {
          const catAchs = getAchievementsByCategory(cat);
          const catUnlocked = catAchs.filter(a => isUnlocked?.(a.id)).length;
          const catNewCount = catAchs.filter(a => newAchievementIds?.has(a.id)).length;
          const isActive = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-orbitron text-[10px] tracking-wider transition-all"
              style={{
                background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.09)'}`,
                color: isActive ? '#fbbf24' : '#64748b',
              }}>
              {CATEGORY_ICONS[cat]}{' '}{((t.archives.achievementCategories as Record<string, string>)[cat] ?? CATEGORY_LABELS[cat]).toUpperCase()}
              {' '}<span style={{ color: isActive ? '#fbbf24' : '#475569', fontWeight: 800 }}>
                {catUnlocked}/{catAchs.length}
              </span>
              {catNewCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-1.5 text-[9px] font-bold leading-[14px] min-w-[14px] h-[14px]"
                  style={{
                    background: 'rgba(34,211,238,0.18)',
                    border: '1px solid rgba(34,211,238,0.75)',
                    color: '#22d3ee',
                    boxShadow: '0 0 6px rgba(34,211,238,0.45)',
                    animation: 'anim-debuff-pulse 1.8s ease-in-out infinite',
                    ['--debuff-color' as any]: '#22d3ee',
                  }}
                >
                  ✦{catNewCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Achievement rows */}
      <div className="flex flex-col gap-2">
        {achievements.map(a => {
          const unlocked = isUnlocked?.(a.id) ?? false;
          const isHidden = a.hidden && !unlocked;
          // Progress for stat-threshold achievements
          const statVal = (a.statKey && stats)
            ? ((stats as Record<string, unknown>)[a.statKey] as number ?? 0)
            : 0;
          const hasProgress = !!a.statKey && !!a.threshold && !unlocked && !isHidden;
          const progressPct = hasProgress ? Math.min(1, statVal / a.threshold!) : 0;

          const isNew = !!(newAchievementIds?.has(a.id));
          return (
            <div key={a.id}
              className="rounded-xl border px-5 py-3.5 transition-all"
              onMouseEnter={() => { if (isNew) markAchievementSeen?.(a.id); }}
              style={{
                background:   isNew ? 'rgba(34,211,238,0.07)' : unlocked ? 'rgba(251,191,36,0.06)' : 'rgba(8,5,25,0.8)',
                borderColor:  isNew ? 'rgba(34,211,238,0.7)'  : unlocked ? 'rgba(251,191,36,0.3)'  : 'rgba(255,255,255,0.06)',
                boxShadow:    isNew ? '0 0 14px rgba(34,211,238,0.18), inset 0 0 10px rgba(34,211,238,0.05)' : 'none',
                animation:    isNew ? 'lore-pulse 2s ease-in-out infinite' : 'none',
                opacity: isHidden ? 0.45 : 1,
              }}>
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div style={{
                  flexShrink: 0,
                  width: '2.8rem', height: '2.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: unlocked ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${unlocked ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '6px',
                  fontSize: '1.4rem',
                  filter: unlocked ? 'none' : 'grayscale(100%) brightness(0.45)',
                }}>
                  {isHidden ? '🔒' : a.icon}
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-orbitron font-bold text-sm"
                      style={{ color: unlocked ? '#fff' : '#4b5563' }}>
                      {isHidden ? '???' : (getAchievementTranslation(a.id, lang)?.name ?? a.name)}
                    </span>
                    {isNew && (
                      <span style={{
                        fontSize: '0.5rem', fontFamily: 'monospace', letterSpacing: '0.1em',
                        background: '#22d3ee', color: '#020e1e',
                        padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800, flexShrink: 0,
                      }}>NEW</span>
                    )}
                    {a.loreUnlockId && !isHidden && (
                      <span className="font-orbitron text-[8px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"
                        style={{
                          background: unlocked ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.04)',
                          color: unlocked ? '#22d3ee' : '#334155',
                          border: `1px solid ${unlocked ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.1)'}`,
                        }}>
                        📖 LORE
                      </span>
                    )}
                    {a.runPerk && !isHidden && (
                      <span title={a.runPerk.label} className="font-orbitron text-[8px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"
                        style={{
                          background: unlocked ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.04)',
                          color: unlocked ? '#60a5fa' : '#334155',
                          border: `1px solid ${unlocked ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`,
                          cursor: 'help',
                        }}>
                        ⚡ PERK
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug"
                    style={{ color: unlocked ? '#94a3b8' : '#374151' }}>
                    {isHidden ? t.archives.achievementUI.hiddenDesc : (getAchievementTranslation(a.id, lang)?.description ?? a.description)}
                  </p>
                </div>

                {/* Points + reward column */}
                <div className="flex-shrink-0 flex flex-col items-end gap-0.5 min-w-[52px]">
                  <div className="font-orbitron font-black text-lg leading-none"
                    style={{ color: unlocked ? '#fbbf24' : '#374151', textShadow: unlocked ? '0 0 8px rgba(251,191,36,0.4)' : 'none' }}>
                    {a.points}
                  </div>
                  <div className="font-orbitron text-[8px] tracking-widest"
                    style={{ color: unlocked ? '#a16207' : '#374151' }}>
                    PTS
                  </div>
                </div>

                {/* Checkmark when unlocked */}
                {unlocked && (
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.18)',
                    border: '1.5px solid rgba(251,191,36,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fbbf24', fontWeight: 900,
                  }}>✓</div>
                )}
              </div>

              {/* Progress bar — only for stat achievements not yet unlocked */}
              {hasProgress && (
                <div className="mt-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-orbitron text-[9px]" style={{ color: '#475569' }}>
                      {t.archives.achievementUI.progress}
                    </span>
                    <span className="font-orbitron text-[9px] font-bold" style={{ color: '#64748b' }}>
                      {statVal.toLocaleString()} / {a.threshold!.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPct * 100}%`,
                        background: progressPct >= 0.75
                          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          : progressPct >= 0.4
                            ? 'linear-gradient(90deg, #22d3ee, #0891b2)'
                            : 'linear-gradient(90deg, #475569, #334155)',
                        minWidth: progressPct > 0 ? 4 : 0,
                      }} />
                  </div>
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
   LORE TAB
══════════════════════════════════════════════════════════════ */
function LoreTab({
  onFireEvent,
  isLoreUnlocked,
  activeCat,
  isLoreNew,
  markLoreSeen,
  devAllCharsUnlocked,
}: {
  onFireEvent?: (eventKey: string, payload?: Record<string, unknown>) => void;
  isLoreUnlocked?: (id: string) => boolean;
  activeCat: LoreCategory;
  isLoreNew: (l: LoreEntry) => boolean;
  markLoreSeen: (id: string) => void;
  devAllCharsUnlocked?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [devLoreUnlocked, setDevLoreUnlocked] = useState(false);
  const { lang, t } = useT();

  const isEntryUnlocked = (l: LoreEntry) => l.unlocked || (isLoreUnlocked?.(l.id) ?? false) || devLoreUnlocked;

  const handleOpen = (l: LoreEntry) => {
    if (!isEntryUnlocked(l)) return;
    setSelected(l.id);
    markLoreSeen(l.id);
    onFireEvent?.('lore_read', { loreId: l.id });
  };

  const entry          = selected ? LORE.find(l => l.id === selected) : null;
  const visibleEntries = LORE.filter(l => LORE_CAT[l.id] === activeCat);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 w-full">
      {!entry && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setDevLoreUnlocked(prev => !prev)}
            style={{
              fontSize:        '0.65rem',
              fontFamily:      'monospace',
              padding:         '0.2rem 0.55rem',
              borderRadius:    '4px',
              border:          devLoreUnlocked ? '1px solid #22d3ee' : '1px solid rgba(100,116,139,0.4)',
              background:      devLoreUnlocked ? 'rgba(34,211,238,0.12)' : 'rgba(4,2,18,0.6)',
              color:           devLoreUnlocked ? '#22d3ee' : '#64748b',
              cursor:          'pointer',
              letterSpacing:   '0.05em',
            }}>
            {devLoreUnlocked ? '🔓 Unlock All Lore (Dev) — ON' : '🔓 Unlock All Lore (Dev)'}
          </button>
        </div>
      )}
      {entry ? (
        <div>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-orbitron text-[11px] mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> {t.archives.back}
          </button>
          <div className="rounded-2xl border border-slate-700/40 p-8" style={{ background: 'rgba(8,5,25,0.95)' }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{entry.icon}</span>
              <h2 className="font-orbitron font-black text-2xl text-white">
                {getLoreTranslation(entry.id, lang)?.title ?? entry.title}
              </h2>
            </div>
            <div className="h-px mb-6" style={{ background: 'linear-gradient(to right, rgba(34,211,238,0.4), transparent)' }} />
            <div className="space-y-4">
              {(getLoreTranslation(entry.id, lang)?.text ?? entry.text).split('\n\n').map((para, i) => (
                <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleEntries.map(l => {
            const unlocked = isEntryUnlocked(l);
            const isNew    = isLoreNew(l);
            return (
              <button key={l.id} onClick={() => handleOpen(l)}
                onMouseEnter={() => { if (isNew) markLoreSeen(l.id); }}
                className="rounded-xl border text-left p-5 transition-all"
                style={{
                  background:   unlocked ? 'rgba(8,5,25,0.9)' : 'rgba(4,2,12,0.9)',
                  borderColor:  isNew
                    ? 'rgba(34,211,238,0.8)'
                    : unlocked
                      ? 'rgba(34,211,238,0.3)'
                      : 'rgba(255,255,255,0.05)',
                  boxShadow:    isNew ? '0 0 16px rgba(34,211,238,0.25), inset 0 0 12px rgba(34,211,238,0.06)' : 'none',
                  cursor:       unlocked ? 'pointer' : 'not-allowed',
                  opacity:      unlocked ? 1 : 0.5,
                  animation:    isNew ? 'lore-pulse 2s ease-in-out infinite' : 'none',
                }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{unlocked ? l.icon : '🔒'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h3 className="font-orbitron font-bold text-sm text-white">
                        {unlocked ? (getLoreTranslation(l.id, lang)?.title ?? l.title) : l.title}
                      </h3>
                      {isNew && (
                        <span style={{
                          fontSize:      '0.5rem',
                          fontFamily:    'monospace',
                          letterSpacing: '0.1em',
                          background:    '#22d3ee',
                          color:         '#020e1e',
                          padding:       '0.1rem 0.35rem',
                          borderRadius:  '3px',
                          fontWeight:    800,
                          flexShrink:    0,
                        }}>NEW</span>
                      )}
                    </div>
                    {!unlocked && l.unlockHint && (
                      <p className="text-[10px] text-slate-600 font-orbitron mt-0.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {l.unlockHint}
                      </p>
                    )}
                  </div>
                </div>
                {unlocked && (
                  <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                    {(getLoreTranslation(l.id, lang)?.text ?? l.text).split('\n\n')[0].substring(0, 120)}…
                  </p>
                )}
              </button>
            );
          })}
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
            <div className="flex justify-center flex-wrap gap-2 mb-3">
              <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
                {t.roles[char.role.toLowerCase().replace(/ /g, '_') as keyof typeof t.roles] ?? char.role}
              </div>
              {char.secondaryRole && (() => {
                const sr = ROLE_STYLE[char.secondaryRole!];
                return (
                  <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${sr.text} ${sr.border} ${sr.bg}`}>
                    {t.roles[char.secondaryRole!.toLowerCase().replace(/ /g, '_') as keyof typeof t.roles] ?? char.secondaryRole!}
                  </div>
                );
              })()}
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
                // In water mode, prefer the water-keyed upgrade description (e.g. sunsin_Ramming Speed).
                // Some abilities share the base name in water form (e.g. Chongtong Barrage) — use `_water` suffix to disambiguate.
                const waterUpgKey = isWater
                  ? (ab.waterName && ab.waterName !== ab.name
                      ? `${char.id}_${ab.waterName}`
                      : `${upgKey}_water`)
                  : null;
                const upgDescKey = waterUpgKey && UPGRADE_DESCS[waterUpgKey] ? waterUpgKey : upgKey;
                const upgradedDisplayName = isWater && ab.waterName
                  ? `${ab.waterName}+`
                  : (upgrade?.upgradedName ?? '');
                const isShowingUpgrade = !!upgrade && !!showUpgraded[upgKey];
                return (
                  <div key={ab.name} className={`flex gap-4 rounded-xl border p-4 transition-colors ${isShowingUpgrade ? 'border-emerald-500/50 bg-emerald-950/20' : `${kindStyle.border} ${kindStyle.bg}`}`}>
                    <div className="text-3xl shrink-0 w-10 text-center leading-none pt-0.5">{ab.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-orbitron font-bold text-sm" style={{ color: isShowingUpgrade ? '#34d399' : 'white' }}>
                          {isShowingUpgrade ? upgradedDisplayName : abName}
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
                          ? (UPGRADE_DESCS[upgDescKey] ?? colorizeDesc(upgrade!.patch.description ?? (typeof displayDesc === 'string' ? displayDesc : '')))
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
