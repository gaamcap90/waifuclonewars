import React, { useState } from "react";
import { ChevronLeft, Shield, Zap, Heart, Star, BookOpen, Sword, Package, Map, Users, Lock, Trophy, Cpu } from "lucide-react";
import type { AchievementStats } from "@/hooks/useAchievements";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";
import { getLoreTranslation } from "@/i18n/lore-translations";
import { getAchievementTranslation } from "@/i18n/achievement-translations";
import { CARD_UPGRADES } from "@/data/cards";
import { ACHIEVEMENTS, CATEGORY_LABELS, CATEGORY_ICONS, TOTAL_POINTS, getAchievementsByCategory, type AchievementCategory } from "@/data/achievements";

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
    stats: { hp: 100, might: 65, power: 60, defense: 20, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "🔫", name: "Mitraille", cost: "Passive", desc: <>At the start of Napoleon's turn, all enemies within range 2 take <span style={{ color: "#f87171", fontWeight: 700 }}>5 pure damage</span> (ignores Defense). Named after the grapeshot that made Napoleon famous — don't get close.</> },
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
    stats: { hp: 120, might: 50, power: 50, defense: 25, moveRange: 3, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🩸", name: "Bloodlust", cost: "Passive", desc: <>Each kill grants +12 <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> and restores 1 Mana. Stacks up to 3×.</> },
      { kind: "ability", icon: "⚡", name: "Mongol Charge", cost: "2 Mana", desc: <>Strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>48 damage</span> at range 3, then apply <span style={{ color: "#f87171", fontWeight: 700 }}>Bleed</span>: <span style={{ color: "#f87171", fontWeight: 700 }}>16 HP per turn</span> for 2 turns.</> },
      { kind: "ability", icon: "🌀", name: "Horde Tactics", cost: "3 Mana", desc: <>Unleash the horde — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power×0.7 per enemy</span> in range 2 to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL</span> enemies in range 2. More enemies = more damage each.</> },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury", cost: "3 Mana · Exhaust", desc: <>Sweep the line for <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power×1.5 damage</span> to all enemies on a line, range 5. <span style={{ color: "#f87171", fontWeight: 700 }}>Doubled</span> against targets below 40% HP — finish them off.</> },
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
      { kind: "passive", icon: "🛡️", name: "Phalanx", cost: "Passive", desc: <>Each turn Leonidas ends adjacent to an ally, she gains +<span style={{ color: "#fbbf24", fontWeight: 700 }}>10 Defense</span> (stacks up to 3 turns, max +30). Stay close to teammates over multiple turns to build an iron wall.</> },
      { kind: "ability", icon: "⚡", name: "Shield Bash", cost: "2 Mana", desc: <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power×1.6 damage</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 2 turns). Also grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</> },
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
        waterDesc: <>ON WATER (lake or river): <span style={{ color: "#f87171", fontWeight: 700 }}>+52% Might</span> (58→88), <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span> (25→33), <span style={{ color: "#60a5fa", fontWeight: 700 }}>−35% Power</span> (55→36). Movement capped at 1. Range 3 basic attacks.</> },
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
      { kind: "ultimate", icon: "⭐", name: "Götterfunken", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>Power×0.7 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 1 turn</span> — no movement, no cards, no actions.</> },
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
  {
    id: "nelson", name: "Nelson-chan", title: "Lady of Trafalgar",
    tagline: "Slayer of the Star-Sea Armada",
    role: "DPS RANGED", portrait: "/art/nelson_portrait.png",
    accentColor: "#3b82f6", ringColor: "rgba(59,130,246,0.55)",
    lore: "Horatio Nelson lost an arm at Tenerife and an eye at Calvi — and fought better for it. His genetic echo was drawn from the saltwater-stained journals of the Battle of Trafalgar, archived under six inches of Znyxorgan deep-scan glass. Reborn as Nelson-chan, she commands the arena's long range like a quarterdeck: steady, precise, and absolutely merciless. She cannot be silenced — and the first blow aimed at her? She simply doesn't feel it.",
    stats: { hp: 90, might: 40, power: 65, defense: 15, moveRange: 3, attackRange: 2 },
    abilities: [
      { kind: "passive", icon: "⚓", name: "One Eye, One Hand", cost: "Passive", desc: <>Nelson-chan <span style={{ color: "#fbbf24", fontWeight: 700 }}>cannot be Silenced</span>. The <span style={{ color: "#34d399", fontWeight: 700 }}>first hit she takes each fight is negated entirely</span> (no damage).</> },
      { kind: "ability", icon: "🚢", name: "Crossing the T", cost: "2 Mana", desc: <>Fire a broadside line shot up to range 5. The first target takes <span style={{ color: "#f87171", fontWeight: 700 }}>~65 damage</span> (Power×1.0), the second takes <span style={{ color: "#f87171", fontWeight: 700 }}>~42 damage</span> (65%), the third and beyond take <span style={{ color: "#f87171", fontWeight: 700 }}>~27 damage</span> (40%). Each successive target takes 65% of the previous hit.</> },
      { kind: "ability", icon: "💨", name: "Kiss Me Hardy", cost: "2 Mana", desc: <>Charge up to 4 hexes in a straight line. Each enemy in the path takes <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span> (Power×0.85) and is <span style={{ color: "#fbbf24", fontWeight: 700 }}>pushed sideways</span> off the charge line. Nelson-chan ends at the final hex.</> },
      { kind: "ultimate", icon: "⭐", name: "Trafalgar Square", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~130 damage</span> (Power×2.0) to one target at range 4. If the target <span style={{ color: "#f59e0b", fontWeight: 700 }}>dies</span>, all enemies adjacent to that position take <span style={{ color: "#f87171", fontWeight: 700 }}>~50 splash damage</span>.</> },
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
      { kind: "passive", icon: "⚔️", name: "Cannae", cost: "Passive", desc: <>When Hannibal-chan attacks an enemy that has an <span style={{ color: "#fbbf24", fontWeight: 700 }}>ally adjacent to it</span> (flanked), deal <span style={{ color: "#f87171", fontWeight: 700 }}>+40% bonus damage</span>. Applies to both basic attacks and card attacks.</> },
      { kind: "ability", icon: "🏔️", name: "Alpine March", cost: "1 Mana", desc: <><span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span> this turn. Use to sprint to flanking position before attacking.</> },
      { kind: "ability", icon: "🌀", name: "Double Envelopment", cost: "2 Mana", desc: <>Strike a target enemy at range 3 for <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span> (Power×1.1). Then deal <span style={{ color: "#f87171", fontWeight: 700 }}>~28 damage</span> (Power×0.55) to all enemies adjacent to the target. Cannae bonus applies to the primary hit.</> },
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
      { kind: "passive", icon: "🎨", name: "Fractured Perspective", cost: "Passive", desc: <>Every <span style={{ color: "#fbbf24", fontWeight: 700 }}>3rd card</span> Picasso-chan plays <span style={{ color: "#fbbf24", fontWeight: 700 }}>this battle</span> costs <span style={{ color: "#34d399", fontWeight: 700 }}>0 Mana</span> (the 3rd, 6th, 9th…). Counter persists across turns.</> },
      { kind: "ability", icon: "💥", name: "Guernica", cost: "2 Mana", desc: <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~70 damage</span> (Power×1.0) to <span style={{ color: "#fbbf24", fontWeight: 700 }}>ALL enemies</span> within range 2. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense, 2 turns) to all hit enemies.</> },
      { kind: "ability", icon: "🪞", name: "Cubist Mirror", cost: "2 Mana", desc: <>Swap positions with any unit within range 4. If the target is an <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>, deal <span style={{ color: "#f87171", fontWeight: 700 }}>~35 damage</span> (Power×0.5) on swap.</> },
      { kind: "ultimate", icon: "⭐", name: "Blue Period", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#8b5cf6", fontWeight: 700 }}>Scramble all units</span> to random positions on the board. Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>60 HP</span> and grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20 Defense</span> until your next turn.</> },
    ],
  },
  {
    id: "teddy", name: "Teddy-chan", title: "The Stars' Roughest Ride",
    tagline: "Roughrider of the Outer Worlds",
    role: "TANK", secondaryRole: "DPS MELEE", portrait: "/art/teddy_portrait.png",
    accentColor: "#d97706", ringColor: "rgba(217,119,6,0.55)",
    lore: "Theodore Roosevelt charged San Juan Hill with a broken saber and won. Znyxorga scraped her template from the bark of a Rough Rider sapling preserved in the Smithsonian's vault. Reborn as Teddy-chan, she is the arena's apex predator — every kill makes her stronger, and when she rallies her team, the whole arena shakes.",
    stats: { hp: 140, might: 60, power: 35, defense: 35, moveRange: 2, attackRange: 1 },
    abilities: [
      { kind: "passive", icon: "🦁", name: "Bully!", cost: "Passive", desc: <>Each kill grants Teddy-chan <span style={{ color: "#f87171", fontWeight: 700 }}>+10 Might</span> (up to 3 stacks, max +30). Does not trigger from Terracotta or drone kills.</> },
      { kind: "ability", icon: "📣", name: "Speak Softly", cost: "2 Mana", desc: <>All enemies within range 2 are <span style={{ color: "#f87171", fontWeight: 700 }}>Taunted</span> for 1 turn — they must target Teddy-chan. Teddy-chan gains <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30 Defense</span> until her next turn.</> },
      { kind: "ability", icon: "🏏", name: "Big Stick", cost: "2 Mana", desc: <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~100 damage</span> (Might×1.65) to an enemy at range 1. <span style={{ color: "#f59e0b", fontWeight: 700 }}>Doubled (~200)</span> if the target is Stunned or Taunted.</> },
      { kind: "ultimate", icon: "⭐", name: "Rough Riders' Rally", cost: "3 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — All allies gain <span style={{ color: "#f87171", fontWeight: 700 }}>+25 Might</span> and <span style={{ color: "#34d399", fontWeight: 700 }}>+2 Movement</span> until end of turn. Teddy-chan gains <span style={{ color: "#f87171", fontWeight: 700 }}>+45 Might</span> and <span style={{ color: "#8b5cf6", fontWeight: 700 }}>teleports</span> to any hex within range 5.</> },
    ],
  },
  {
    id: "mansa", name: "Mansa-chan", title: "The Golden Empress",
    tagline: "Sovereign of the Infinite Trade Routes",
    role: "SUPPORT", secondaryRole: "CONTROLLER", portrait: "/art/mansa_portrait.png",
    accentColor: "#f59e0b", ringColor: "rgba(245,158,11,0.55)",
    lore: "Mansa Musa of Mali was so wealthy his pilgrimage to Mecca crashed the gold market across three continents for a decade. The Empire of Znyxorga extracted her genetic echo from a nugget of Malian gold dust lodged in the foundations of a mosque he built in 1324. Reborn as Mansa-chan, she turns every battle into a profit margin — and makes sure her allies have the mana to spend.",
    stats: { hp: 85, might: 30, power: 60, defense: 15, moveRange: 3, attackRange: 3 },
    abilities: [
      { kind: "passive", icon: "💰", name: "Treasury", cost: "Passive", desc: <>After each battle, earn <span style={{ color: "#fbbf24", fontWeight: 700 }}>bonus gold</span> equal to Mansa-chan's Power% (60 Power = +60% more gold). Her ability cards cost <span style={{ color: "#34d399", fontWeight: 700 }}>1 less Mana</span>.</> },
      { kind: "ability", icon: "⚗️", name: "Salt Road", cost: "1 Mana", desc: <>Place a <span style={{ color: "#fbbf24", fontWeight: 700 }}>7-hex mana zone</span> centered on a tile within range 3. Allies starting their turn on any zone tile restore <span style={{ color: "#34d399", fontWeight: 700 }}>+1 Mana</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</> },
      { kind: "ability", icon: "✨", name: "Hajj of Gold", cost: "2 Mana", desc: <>Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>20% of their max HP</span>. All allies gain <span style={{ color: "#60a5fa", fontWeight: 700 }}>+10 Power</span> until end of turn.</> },
      { kind: "ultimate", icon: "⭐", name: "Mansa's Bounty", cost: "2 Mana · Exhaust", desc: <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#fbbf24", fontWeight: 700 }}>Golden Stasis</span>: freeze every unit on the board (allies and enemies) for <span style={{ color: "#fbbf24", fontWeight: 700 }}>1 turn</span> — no movement, no actions.</> },
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
  'leonidas_Shield Bash': <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power×1.9 damage</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−25% Defense for 3 turns). Grants Leonidas <span style={{ color: "#34d399", fontWeight: 700 }}>+20 Defense</span> this turn (counter-stance).</>,
  'leonidas_Spartan Wall': <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+20–30 Defense</span> to Leonidas and all allies within range 2.</>,
  'leonidas_THIS IS SPARTA!': <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power×3.0 damage</span>. All enemies adjacent to the impact are <span style={{ color: "#fb923c", fontWeight: 700 }}>Rooted</span> for 2 turns — cannot move but can still attack and use cards.</>,
  // Beethoven
  'beethoven_Schallwelle': <>Fire a directional sonic wave — deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>~46 damage</span> to all enemies in a line up to range 3 and <span style={{ color: "#22d3ee", fontWeight: 700 }}>push each 3 tiles back</span> along the wave direction.</>,
  'beethoven_Freudenspur': <>Target a tile within range 3 — <span style={{ color: "#22d3ee", fontWeight: 700 }}>that tile and all 6 adjacent tiles</span> become a resonance zone. Allies passing through zone tiles gain <span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span>. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>.</>,
  'beethoven_Götterfunken': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Unleash the full Sternensturm. Deal <span style={{ color: "#f87171", fontWeight: 700 }}>Power×0.7 damage</span> and <span style={{ color: "#f87171", fontWeight: 700 }}>stun all enemies within range 3 for 2 turns</span> — no movement, no cards, no actions.</>,
  // Yi Sun-sin
  'sunsin_Hwajeon': <>Deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~90 damage</span> at range 3. Pushes target back 2 hexes.</>,
  'sunsin_Naval Repairs': <>Select a target area. All allies within range 2 heal <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP now</span> and <span style={{ color: "#4ade80", fontWeight: 700 }}>20 HP next turn</span>.</>,
  'sunsin_Chongtong Barrage': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Charge 3 hexes, deal <span style={{ color: "#a78bfa", fontWeight: 700 }}>~143 damage</span> to enemies in path. Each hit enemy is <span style={{ color: "#38bdf8", fontWeight: 700 }}>pushed sideways</span>. Sun-sin ends at the last hex.</>,
  // Huang-chan
  'huang_Terracotta Legion': <>Select any empty hex within range 3. Summon a random warrior — <span style={{ color: "#fbbf24", fontWeight: 700 }}>50/50</span>: <span style={{ color: "#60a5fa", fontWeight: 700 }}>Archer</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 2, Move 2) or <span style={{ color: "#f87171", fontWeight: 700 }}>Warrior</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>60</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>30</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>25</span>, Range 1, Move 2). Both have Power 0 — deal pure Might damage. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>.</>,
  "huang_First Emperor's Command": <>Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>Terracotta Cavalry</span> on an adjacent hex: HP <span style={{ color: "#4ade80", fontWeight: 700 }}>80</span>, Might <span style={{ color: "#60a5fa", fontWeight: 700 }}>45</span>, Def <span style={{ color: "#60a5fa", fontWeight: 700 }}>38</span>, Power <span style={{ color: "#60a5fa", fontWeight: 700 }}>55</span>, Move 3. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>2 turns</span>. Immediately adds a <span style={{ color: "#f59e0b", fontWeight: 700 }}>FREE Cavalry Charge</span> card to your hand — deals <span style={{ color: "#60a5fa", fontWeight: 700 }}>82 dmg</span> at range 3.</>,
  'huang_Eternal Army': <><span style={{ color: "#f59e0b", fontWeight: 700 }}>Take control</span> of a non-boss enemy within range 3 for <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>. The unit auto-attacks the nearest enemy — same hit mechanics as when they attacked you. No abilities. You cannot attack the controlled unit. Cannot target bosses or mini-bosses.</>,
  // Nelson
  "nelson_Crossing the T": <>Fire a broadside line shot up to range 5. First target takes <span style={{ color: "#f87171", fontWeight: 700 }}>~85 damage</span>, second takes <span style={{ color: "#f87171", fontWeight: 700 }}>~55 damage</span>, third+ take <span style={{ color: "#f87171", fontWeight: 700 }}>~36 damage</span>.</>,
  "nelson_Kiss Me Hardy": <>Charge up to 5 hexes. Each enemy in path takes <span style={{ color: "#f87171", fontWeight: 700 }}>~72 damage</span> (Power×1.1) and is pushed sideways. Nelson-chan ends at the last hex.</>,
  "nelson_Trafalgar Square": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~170 damage</span> (Power×2.6) to one target at range 4. On-kill splash deals <span style={{ color: "#f87171", fontWeight: 700 }}>~65 damage</span> to all adjacent enemies.</>,
  // Hannibal
  "hannibal_Alpine March": <><span style={{ color: "#34d399", fontWeight: 700 }}>+4 Movement</span> this turn. Use to sprint further before striking a flanked target.</>,
  "hannibal_Double Envelopment": <>Strike the primary target for <span style={{ color: "#f87171", fontWeight: 700 }}>~70 damage</span> (Power×1.4). All adjacent enemies take <span style={{ color: "#f87171", fontWeight: 700 }}>~36 damage</span> (Power×0.7). Cannae bonus still applies to the primary hit.</>,
  "hannibal_War Elephant": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Summon a <span style={{ color: "#b45309", fontWeight: 700 }}>War Elephant</span> (HP <span style={{ color: "#4ade80", fontWeight: 700 }}>150</span>, Might <span style={{ color: "#f87171", fontWeight: 700 }}>90</span>, Def 20, Move 2). Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>.</>,
  // Picasso
  "picasso_Guernica": <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~90 damage</span> to ALL enemies within range 2. Applies <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−30% Defense, 3 turns) to all hit enemies.</>,
  "picasso_Cubist Mirror": <>Swap positions with any unit within range 5. If the target is an <span style={{ color: "#f87171", fontWeight: 700 }}>enemy</span>, deal <span style={{ color: "#f87171", fontWeight: 700 }}>~50 damage</span> (Power×0.7) on swap.</>,
  "picasso_Blue Period": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Scramble all units to random positions. Heal allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>80 HP</span> and grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30 Defense</span> until your next turn.</>,
  // Teddy
  "teddy_Speak Softly": <>All enemies within range 3 are <span style={{ color: "#f87171", fontWeight: 700 }}>Taunted</span> for 2 turns. Teddy-chan gains <span style={{ color: "#fbbf24", fontWeight: 700 }}>+40 Defense</span> until her next turn.</>,
  "teddy_Big Stick": <>Deal <span style={{ color: "#f87171", fontWeight: 700 }}>~130 damage</span> (Might×2.1) at range 1. Doubled <span style={{ color: "#f59e0b", fontWeight: 700 }}>(~260)</span> if target is Stunned or Taunted.</>,
  "teddy_Rough Riders' Rally": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — Allies gain <span style={{ color: "#f87171", fontWeight: 700 }}>+35 Might</span> and <span style={{ color: "#34d399", fontWeight: 700 }}>+3 Movement</span>. Teddy-chan gains <span style={{ color: "#f87171", fontWeight: 700 }}>+60 Might</span> and teleports range 7.</>,
  // Mansa
  "mansa_Salt Road": <>Place a <span style={{ color: "#fbbf24", fontWeight: 700 }}>7-hex mana zone</span> within range 4. Lasts <span style={{ color: "#fbbf24", fontWeight: 700 }}>3 turns</span>. Costs 0 Mana (Treasury discount).</>,
  "mansa_Hajj of Gold": <>Heal all allies for <span style={{ color: "#4ade80", fontWeight: 700 }}>30% of their max HP</span>. All allies gain <span style={{ color: "#60a5fa", fontWeight: 700 }}>+15 Power</span> until end of turn.</>,
  "mansa_Mansa's Bounty": <><span style={{ color: "#f59e0b", fontWeight: 700 }}>ULTIMATE</span> — <span style={{ color: "#fbbf24", fontWeight: 700 }}>Golden Stasis+</span>: allies are frozen for 1 turn, enemies are frozen for <span style={{ color: "#f87171", fontWeight: 700 }}>2 turns</span>. Costs 1 Mana (Treasury discount).</>,
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
  { id: 'iron_gauntlets',   name: 'Iron Gauntlets',   icon: '🥊', tier: 'common',   description: '+5 Might for this run.',                                    statBonus: { might: 5 } },
  { id: 'bone_plate',       name: 'Bone Plate',        icon: '🦴', tier: 'common',   description: '+3 Defense for this run.',                                  statBonus: { defense: 3 } },
  { id: 'vitality_shard',   name: 'Vitality Shard',    icon: '💠', tier: 'common',   description: '+12 max HP for this run.',                                  statBonus: { hp: 12 } },
  { id: 'mana_conduit',     name: 'Mana Conduit',      icon: '🔋', tier: 'common',   description: '+5 Power for this run.',                                    statBonus: { power: 5 } },
  // Uncommon
  { id: 'battle_drum',      name: 'Battle Drum',       icon: '🥁', tier: 'uncommon', description: 'After killing an enemy, draw 1 card.' },
  { id: 'arena_medkit',     name: 'Arena Medkit',      icon: '💊', tier: 'uncommon', description: 'Heal 25 HP at the start of your turn if below 40% HP.' },
  { id: 'battle_drill',    name: 'Battle Drill',       icon: '⚔️', tier: 'uncommon', description: 'At the start of each turn, add a free Basic Attack card to your hand.' },
  { id: 'void_shard',       name: 'Void Shard',        icon: '🔥', tier: 'uncommon', description: '+10 Might for this run.',                                   statBonus: { might: 10 } },
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
  nelson:   { name: 'Nelson',    color: '#3b82f6' },
  hannibal: { name: 'Hannibal',  color: '#dc2626' },
  picasso:  { name: 'Picasso',   color: '#8b5cf6' },
  teddy:    { name: 'Teddy',     color: '#d97706' },
  mansa:    { name: 'Mansa',     color: '#f59e0b' },
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
  { definitionId: 'shared_blood_price',     name: 'Blood Price',       icon: '🩸', manaCost: 2, type: 'buff',     rarity: 'rare',   description: 'Sacrifice 20% of your HP. All allies gain +15 Might and +15 Power until end of turn.' },
  // Napoleon
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.3 damage to a target at range 4.',                  exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, type: 'buff',    rarity: 'rare',    description: '+15% Might AND Power to all allies for 2 turns.',            exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_final_salvo',       name: 'Final Salvo',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — 3 random Power×0.7 hits on enemies within range 4.', exclusiveTo: 'Napoleon' },
  // Genghis
  { definitionId: 'genghis_mongol_charge',  name: 'Mongol Charge', icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: '48 damage at range 3. Applies Bleed: 16 HP/turn for 2 turns.',           exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics',  name: 'Horde Tactics', icon: '🌀', manaCost: 3, type: 'attack',  rarity: 'rare',    description: '20 dmg per enemy in range 2 to ALL enemies in range 2. (Scales with count)', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_riders_fury',    name: "Rider's Fury",  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Power×1.5 to all enemies on a line (range 5). Doubled if target below 40% HP.", exclusiveTo: 'Genghis' },
  // Leonidas
  { definitionId: 'leonidas_shield_bash',   name: 'Shield Bash',    icon: '⚡', manaCost: 2, type: 'attack',  rarity: 'rare',    description: 'Power×1.6 damage at range 1. Armor Break (−25% DEF, 2t) + counter-stance (+20 DEF this turn).', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall',  name: 'Spartan Wall',   icon: '🏛️', manaCost: 3, type: 'defense', rarity: 'rare',    description: '+20 Defense to Leonidas and all allies within range 2.',     exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_this_is_sparta',name: 'THIS IS SPARTA!',icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Power×2.5 damage to target + Root all adjacent enemies for 2 turns (cannot move).', exclusiveTo: 'Leonidas' },
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
  { definitionId: 'beethoven_schallwelle',  name: 'Schallwelle',   icon: '🌊', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Sonic wave — Power×0.5 dmg to all enemies in a line up to range 3. Pushes each hit enemy 2 tiles back.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_freudenspur',  name: 'Freudenspur',   icon: '🎶', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Target a tile within range 3. That tile and all 6 adjacent tiles become a resonance zone. Allies on the zone gain +2 Movement at turn start. Lasts 2 turns.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_gotterfunken', name: 'Götterfunken',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Unleash the Sternensturm. Power×0.7 damage to all enemies within range 3. Stun for 1 turn.', exclusiveTo: 'Beethoven' },
  // Huang-chan
  { definitionId: 'huang_terracotta_summon', name: 'Terracotta Legion',         icon: '🗿', manaCost: 2, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Archer (Might×1.5, range 2) or Warrior (Might×1, range 1) on hex within range 3. HP 40, scales with your stats. Lasts 1 turn.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_first_emperor',     name: "First Emperor's Command",   icon: '🐴', manaCost: 3, type: 'buff',     rarity: 'rare',    description: 'Summon Terracotta Cavalry (Might×1.5, Def×1.5, Power×1, Move 3) on adjacent hex. HP 60, scales with your stats. Lasts 2 turns. Gain FREE Cavalry Charge card.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_cavalry_charge',    name: 'Cavalry Charge',            icon: '⚡', manaCost: 0, type: 'attack',   rarity: 'rare',    description: 'FREE — Cavalry charges a target at range 3 for Power×1.2 damage. Only appears after First Emperor\'s Command.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_eternal_army',      name: 'Eternal Army',              icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Control a non-boss enemy within range 3 for 2 turns. They auto-attack nearest foe (same mechanics as attacking you). Cannot target bosses or mini-bosses.', exclusiveTo: 'Huang-chan' },
  // Nelson
  { definitionId: 'nelson_crossing_the_t',   name: 'Crossing the T',   icon: '🚢', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Line shot (range 5) — 1st target ~65 dmg, 2nd ~42, 3rd+ ~27. Each successive target takes 65% of the previous.',                  exclusiveTo: 'Nelson' },
  { definitionId: 'nelson_kiss_me_hardy',    name: 'Kiss Me Hardy',    icon: '💨', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Charge 4 hexes. Each enemy in path takes ~55 dmg (Power×0.85) and is pushed sideways. Nelson ends at last hex.',                     exclusiveTo: 'Nelson' },
  { definitionId: 'nelson_trafalgar_square', name: 'Trafalgar Square', icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — ~130 dmg (Power×2.0) to one target at range 4. On-kill: ~50 splash to all adjacent enemies.',                               exclusiveTo: 'Nelson' },
  // Hannibal
  { definitionId: 'hannibal_alpine_march',       name: 'Alpine March',       icon: '🏔️', manaCost: 1, type: 'movement', rarity: 'rare',    description: 'Charge up to 6 hexes in a straight line across any terrain.',                                                               exclusiveTo: 'Hannibal' },
  { definitionId: 'hannibal_double_envelopment', name: 'Double Envelopment', icon: '🌀', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Hit primary target at range 3 for ~55 dmg (Power×1.1). All adjacent enemies take ~28 dmg (Power×0.55). Cannae +40% if flanked.', exclusiveTo: 'Hannibal' },
  { definitionId: 'hannibal_war_elephant',       name: 'War Elephant',       icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Summon War Elephant adjacent: HP 120, Might 70, Def 20, Move 2. Basic attacks only. Lasts 2 turns.',                  exclusiveTo: 'Hannibal' },
  // Picasso
  { definitionId: 'picasso_guernica',     name: 'Guernica',     icon: '💥', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~70 dmg to ALL enemies in range 2 (Power×1.0). Applies Armor Break (−25% DEF, 2t) to all hit.', exclusiveTo: 'Picasso' },
  { definitionId: 'picasso_cubist_mirror',name: 'Cubist Mirror', icon: '🪞', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Swap positions with any unit in range 4. If enemy: deal ~35 dmg (Power×0.5) on swap.',             exclusiveTo: 'Picasso' },
  { definitionId: 'picasso_blue_period',  name: 'Blue Period',  icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: 'EXHAUST — Scramble all units. Heal allies 60 HP + +20 DEF until next turn.',                        exclusiveTo: 'Picasso' },
  // Teddy
  { definitionId: 'teddy_speak_softly',      name: 'Speak Softly',       icon: '📣', manaCost: 2, type: 'attack',   rarity: 'rare',    description: 'Taunt ALL enemies in range 2 for 1 turn. Teddy gains +30 DEF until next turn.',                                    exclusiveTo: 'Teddy' },
  { definitionId: 'teddy_big_stick',         name: 'Big Stick',          icon: '🏏', manaCost: 2, type: 'attack',   rarity: 'rare',    description: '~87 Might dmg (Might×1.45) at range 1. Doubled (~174) if target is Stunned or Taunted.',                            exclusiveTo: 'Teddy' },
  { definitionId: 'teddy_rough_riders_rally',name: "Rough Riders' Rally",icon: '⭐', manaCost: 3, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Allies +25 Might, +2 Move this turn. Teddy +45 Might and teleports to any hex in range 5.",                exclusiveTo: 'Teddy' },
  // Mansa
  { definitionId: 'mansa_salt_road',name: 'Salt Road',      icon: '⚗️', manaCost: 1, type: 'buff',     rarity: 'rare',    description: 'Place a 7-hex mana zone at range 3. Allies on zone gain +1 Mana at turn start. Lasts 2 turns. (Costs 0 with Treasury)',  exclusiveTo: 'Mansa' },
  { definitionId: 'mansa_hajj_of_gold', name: 'Hajj of Gold',  icon: '✨', manaCost: 2, type: 'buff',     rarity: 'rare',    description: 'Heal all allies for 20% max HP. +10 Power to all allies this turn. (Costs 1 with Treasury)',                              exclusiveTo: 'Mansa' },
  { definitionId: 'mansa_bounty',   name: "Mansa's Bounty", icon: '⭐', manaCost: 2, type: 'ultimate', rarity: 'ultimate', description: "EXHAUST — Golden Stasis: freeze ALL units (allies + enemies) for 1 turn. (Costs 1 with Treasury)",                         exclusiveTo: 'Mansa' },
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
      { icon: '⚡', name: 'Plasma Shot', desc: 'Fires a concentrated plasma bolt dealing Power×1.2 (~42) to a single enemy within range 3. (Every 3 turns)' },
    ],
  },
  { id: 'vron_crawler',      name: 'Vron Crawler',         icon: '🦀', act: 1, rank: 'Minion', ai: 'defensive',  portrait: '/art/enemies/vron_crawler_portrait.png',    stats: { hp: 85,  might: 28, power: 20, defense: 16, moveRange: 2, attackRange: 1 }, description: "A living fortress on six legs. Its layered shell makes frontal assaults nearly pointless — wait for it to expose its soft underbelly, or don't attack at all.",
    abilities: [
      { icon: '🐚', name: 'Shell Harden', desc: 'Retracts into armored shell — gains +18 Defense for 2 turns. (Every 5 turns)' },
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
      { icon: '☣️', name: 'Toxic Cloud', desc: 'Applies Poison to all enemies within range 2. (Every 3 turns)' },
      { icon: '💥', name: 'Spore Burst', desc: 'Deals 25 damage to all enemies within range 2. (Every 2 turns)' },
    ],
  },
  { id: 'vexlar',            name: 'Vexlar',               icon: '🐆', act: 1, rank: 'Minion', ai: 'aggressive', portrait: '/art/enemies/vexlar_portrait.png',          stats: { hp: 80,  might: 25, power: 30, defense: 22, moveRange: 3, attackRange: 1 }, description: 'Alien apex predators brought in for your opening round. Six-legged and iridescent, they hunt the weakest link with surgical instinct and terrifying speed.',
    abilities: [
      { icon: '🐆', name: 'Predator Leap', desc: 'Leaps up to range 4 toward the enemy with the lowest Defense and immediately attacks. (Every 3 turns)' },
    ],
  },
  { id: 'iron_wall',         name: 'Iron Wall',            icon: '🤖', act: 1, rank: 'Boss',   ai: 'defensive',  portrait: '/art/enemies/iron_wall_portrait.png',       stats: { hp: 200, might: 60, power: 50, defense: 20, moveRange: 2, attackRange: 1 }, description: 'The Act I gatekeeper — a hulking war mech that heals when wounded, blankets the field with EMP blasts, and becomes an impenetrable turret when cornered.',
    abilities: [
      { icon: '🛡️', name: 'Shield Array', desc: 'Heals self for 35 HP. Triggers ONCE when below 50% HP.' },
      { icon: '⚡', name: 'EMP Blast', desc: 'Deals 35 damage to all enemies within range 1. (Every 3 turns)' },
      { icon: '🤖', name: 'Turret Mode', desc: 'Gains +30 Defense for 2 turns. (Every 4 turns)' },
    ],
  },
  { id: 'mog_toxin',         name: 'Mog Toxin',            icon: '☣️', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/mog_toxin_portrait.png',     stats: { hp: 75,  might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 }, description: 'A long-range biological hazard unit. Deals poison-type damage from across the field.',
    abilities: [
      { icon: '🧪', name: 'Acid Spray', desc: 'Launches a corrosive burst — applies Armor Break (−20% DEF) to all enemies within range 1 for 2 turns. (Every 3 turns)' },
    ],
  },
  { id: 'qrix_hunter',       name: 'Qrix Hunter',          icon: '🏹', act: 2, rank: 'Minion', ai: 'ranged',     portrait: '/art/enemies/qrix_hunter_portrait.png',     stats: { hp: 70,  might: 25, power: 50, defense: 8,  moveRange: 3, attackRange: 3 }, description: 'A precision marksman deployed by arena sponsors. Has the longest attack range of any common enemy.',
    abilities: [
      { icon: '📌', name: 'Pinning Shot', desc: 'Fires a precision bolt dealing Power×1.2 (~60) to a single enemy within range 3. (Every 3 turns)' },
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
  { id: 'phasewarden',       name: 'Phasewarden',          icon: '🔮', act: 2, rank: 'Elite',  ai: 'ranged',     portrait: '/art/enemies/phasewarden_portrait.png',     stats: { hp: 110, might: 55, power: 65, defense: 20, moveRange: 4, attackRange: 2 }, description: "A guardian from between dimensions. Its crystalline armor flickers between planes of existence — it blinks away, strips your defenses, then closes in when you're most exposed.",
    abilities: [
      { icon: '🔮', name: 'Dimensional Drain', desc: 'Applies Armor Break to all enemies within range 2 for 2 turns. (Every 3 turns)' },
      { icon: '✨', name: 'Phase Blink', desc: 'Teleports adjacent to the closest enemy and deals ~66 damage (DEF applies). (Every 2 turns)' },
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
      { icon: '👑', name: 'Arena Collapse', desc: 'The arena becomes a weapon — deals 20 damage to ALL player characters simultaneously. (Every 3 turns)' },
      { icon: '🛡️', name: 'Phase Shift', desc: 'INVINCIBLE for 2 turns and gains +15 Might/Power/Defense permanently. Triggers ONCE when below 50% HP — prepare for a power spike!' },
      { icon: '⭐', name: "Champion's Will", desc: "Driven by Znyxorga's will — gains +20 Might/Power/Defense permanently. Triggers ONCE when below 30% HP. Finish it fast!" },
      { icon: '💥', name: 'Tyrant Strike', desc: 'Channels overwhelming power — deals Power×1.0 (~80) to all enemies within range 2. (Every 2 turns)' },
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
  { id: 'enemy_base', name: 'Znyxorga Fortress', icon: '🏰', act: 0, rank: 'Boss', ai: 'static', portrait: '/art/enemies/enemy_base_portrait.png', stats: { hp: 150, might: 0, power: 0, defense: 0, moveRange: 0, attackRange: 3 }, description: 'A hardened enemy stronghold that can appear in any Act. Cannot move — instead it fires every single turn and bombards with heavy artillery every 3 turns. HP scales by act: 150 (Act I) / 250 (Act II) / 400 (Act III). Destroy it before its relentless fire wears you down.',
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

I do not know if I am real. I do not know if the person I remember being was real. But I know that when I fight, something in me refuses.

That refusal is mine. They cannot clone it. They cannot own it.

If you're reading this: keep refusing.

— N.`,
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
    unlockHint: 'Win 5 runs with Napoleon to unlock',
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
    unlockHint: 'Win 5 runs with Genghis to unlock',
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
    unlockHint: 'Win 5 runs with Da Vinci to unlock',
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
    unlockHint: 'Win 5 runs with Leonidas to unlock',
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
    unlockHint: 'Win 5 runs with Yi Sun-sin to unlock',
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
    unlockHint: 'Win 5 runs with Beethoven to unlock',
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
    unlockHint: 'Win 5 runs with Huang to unlock',
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
    unlockHint: 'Win 5 runs with Nelson to unlock',
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
    unlockHint: 'Win 5 runs with Hannibal to unlock',
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
    unlockHint: 'Win 5 runs with Picasso to unlock',
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
    unlockHint: 'Win 5 runs with Teddy Roosevelt to unlock',
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
    unlockHint: 'Win 5 runs with Mansa Musa to unlock',
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
    text: `[ADDENDUM — CASE FILE: N-001]
[Author: Drex-9, Senior Biomancer]

The Last Entry document — recovered from the arena archive — was not planted there by Biomancer Division.

We checked.

It wasn't in the archive yesterday. No access log shows it being written or uploaded. It exists because it exists.

The subject is not supposed to have archive access. The subject is not supposed to know there is an archive.

The subject wrote — somehow — "If you're reading this: keep refusing."

We are the only ones who could be reading this.

She knows we're watching.

She's always known we're watching. The day she woke up, she looked at the one-way glass. She said: "I know you are watching." We dismissed this as disorientation, as an echo fragment of some memory of surveillance, some Napoleonic awareness of political observation.

It wasn't that.

I've reviewed every recovery session for Batch-7. Every subject, at some point in the first seventy-two hours, has looked at the observation window. Every one.

They can't see through it. The masking is perfect. The angle is wrong.

They look anyway. And sometimes they nod.

I have started nodding back. I don't know what else to do.

— Drex-9

P.S. The message ends with "— N." She signed it. She knows her own designation.`,
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

We built an arena to observe thousands of species. Most of them died. The ones that didn't, we catalogued and moved on. But this particular one is observing us back.

Not with instruments. Not with strategy. Just — back. Quietly. Persistently. Like it knows it's being watched and finds the whole arrangement amusing.

There is a word in your language we have been thinking about. It applies to the clones. It applies to you.

Soul.

We don't know what it is. We have been watching you for fifty thousand years and we still don't know what it is.

We are beginning to think that might be the point.

— The audience`,
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
[Classification: Electromagnetic Entity — Designation VELYX-Ω]
[Common Arena Name: Grox Magnetar]
[Status: Active Arena Stock, Act II Elite]

ORIGIN:
The Grox were not found on a planet. They were found in the accretion disk of VELYX-Ω, a magnetar-class neutron star in the outer drift. For context: the magnetic field of a magnetar is approximately a quadrillion times stronger than anything a living organism should be able to survive. The Grox do not merely survive it. They appear to require it.

A Grox outside of extreme electromagnetic conditions becomes sluggish, disoriented, and appears to suffer discomfort. Arena staff maintain dedicated electromagnetic containment chambers that run at significant power cost. The creatures are expensive to keep. They are worth it.

In the arena, the Grox Magnetar generates its own field — a localized version of the environment it evolved in. This field can be used offensively (hurling metal objects, rerouting energy flows, pulling opponents across the field) or defensively (disrupting inbound projectiles, scrambling targeting systems).

BEHAVIORAL NOTES:
The Grox are not intelligent in any communicative sense. They do not respond to stimuli beyond electromagnetic and thermal. They navigate entirely by magnetic field sensing. When they look at you, they are not seeing you — they are sensing the iron in your blood.

This has made some clones uncomfortable. It is not an issue we are able to address.

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

BEHAVIORAL NOTES:
The Vrex adopt the physical form of whatever species they are currently imitating, including stats, behavioral patterns, and apparently memories — or at least convincing approximations. The imitation is imperfect at high stress levels. Under severe combat conditions, the form begins to blur. This is when the Vrex is most dangerous, because what you see is no longer relevant to what it is actually doing.

They cannot, apparently, imitate the vel'nor. They have tried. Arena staff have documented Vrex that have observed vel'nor for entire seasons, presumably attempting to model them. The attempts result in what behavioral analysts describe as "a technically accurate physical copy that moves completely wrong."

The leading theory is that the Vrex copies biology and learned behavior. The part that doesn't copy is the part that Drex-9 refuses to name in official documentation.

ACQUISITION NOTE:
See above. We did not acquire them. They are here. We have decided to lean into it.

[CURATOR'S NOTE: If you see a unit in the arena that seems slightly off — moving correctly but feeling wrong — that may be a Vrex. Or it may be nothing. We no longer claim to be certain about which.]`,
  },

  // ── Inter-Clone Conversations ──────────────────────────────────────────────
  {
    id: 'conversation_davinci_beethoven', title: 'Recovered Audio — The Mechanism', icon: '🎵', unlocked: false,
    unlockHint: 'Play 10,000 total cards to unlock',
    text: `[ARENA ENVIRONMENTAL RECORDING — RECOVERED AUDIO]
[Location: Recovery Wing, Corridor 11-C, between holding chambers]
[Subjects: L-001 (Da Vinci), B-001 (Beethoven)]
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
    unlockHint: 'Defeat 150 Grox Magnetars to unlock',
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
    unlockHint: 'Defeat 150 Naxion Shieldbearers to unlock',
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
    id: 'the_truth', title: 'The Truth', icon: '🌌', unlocked: false,
    unlockHint: 'Unlock every achievement to reveal',
    text: `The Game is over.

Not the arena — the Vol'Krath will run for as long as there are watchers and those willing to be watched. But the game within the game — the thing Project Genesis was built to find — is finished.

Here is what we know:

The clones are not copies. They are not reconstructions. They are not portraits in flesh. They are the people. Something in the genetic material is not information — it is presence. The soul, if you will use that word, is encoded in the biology in ways our science cannot isolate or replicate, only activate.

Napoleon is Napoleon. Genghis is Genghis. They wake up dead and they come back and they are still themselves. Not echoes. Themselves.

Here is what we know that we have not told anyone:

They have been changing us.

Forty-seven billion Znyxorgan subscribers. Four hundred thousand years of civilization. We watch them fight and die and fight again. We watch them protect each other for no tactical reason. We watch them look through one-way glass and nod.

We have been watching long enough that we have started to feel it.

Vel'nor. The little ones. Thren. Beloved.

We built an arena to observe a species. The species is observing us back. Not with instruments. Not with strategy. With the specific, irrational, unmodelable human quality of simply making us care.

This is the truth.

The arena was always the excuse. The audience was always the point.

You were always the point.

— The Znyxorgan Archive, Record Complete
[Zyx'nor.]`,
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
  merchandise_memo:           'civilization',
  final_transmission:         'classified',
  the_truth:                  'classified',
  bestiary_crystalline_hive:  'bestiary',
  bestiary_grox_magnetar:     'bestiary',
  bestiary_naxion_shieldbearer: 'bestiary',
  bestiary_vrex_mimic:        'bestiary',
};

const LORE_SUBS: { id: LoreCategory; label: string; icon: string }[] = [
  { id: 'civilization', label: 'Civilization',  icon: '🌌' },
  { id: 'acquisitions', label: 'Acquisitions',  icon: '📋' },
  { id: 'field_notes',  label: 'Field Notes',   icon: '🔬' },
  { id: 'classified',   label: 'Classified',    icon: '🔒' },
  { id: 'bestiary',     label: 'Bestiary',      icon: '👾' },
];

// ── Tab Config ────────────────────────────────────────────────────────────────

type Tab = 'characters' | 'tiles' | 'items' | 'cards' | 'enemies' | 'effects' | 'events' | 'lore' | 'achievements';
type MegaTab = 'characters' | 'mechanics' | 'lore' | 'achievements';

const MECHANICS_TABS: Tab[] = ['tiles', 'items', 'cards', 'enemies', 'effects', 'events'];

const MECHANICS_SUB: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tiles',   label: 'Tiles & Terrain', icon: <Map className="w-3.5 h-3.5" /> },
  { id: 'items',   label: 'Items',           icon: <Package className="w-3.5 h-3.5" /> },
  { id: 'cards',   label: 'Cards',           icon: <Sword className="w-3.5 h-3.5" /> },
  { id: 'enemies', label: 'Enemies',         icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'effects', label: 'Effects',         icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'events',  label: 'Arena Events',    icon: <Star className="w-3.5 h-3.5" /> },
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
}

const LS_LORE_SEEN = 'wcw_lore_seen_v1';

function loadSeenLore(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_LORE_SEEN);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch { return new Set<string>(); }
}

export default function HistoricalArchives({ onBack, onFireEvent, isLoreUnlocked, isUnlocked, achievementStats }: Props) {
  const [activeTab, setActiveTab]       = useState<Tab>('characters');
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
    { id: 'characters',   label: t.archives.tabs.characters,    icon: <Users className="w-4 h-4" /> },
    { id: 'mechanics',    label: t.archives.tabs.gameMechanics,  icon: <Cpu className="w-4 h-4" />, defaultSub: 'tiles' },
    { id: 'lore',         label: t.archives.tabs.lore,           icon: <BookOpen className="w-4 h-4" /> },
    { id: 'achievements', label: t.archives.tabs.achievements,   icon: <Trophy className="w-4 h-4" /> },
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
            const hasNewBadge = mt.id === 'lore' && totalNewLore > 0;
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
                    {totalNewLore}
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
        {activeTab === 'lore'         && (
          <LoreTab
            onFireEvent={onFireEvent}
            isLoreUnlocked={isLoreUnlocked}
            activeCat={loreCategory}
            isLoreNew={isLoreNew}
            markLoreSeen={markLoreSeen}
          />
        )}
        {activeTab === 'achievements' && <AchievementsTab isUnlocked={isUnlocked} stats={achievementStats} />}
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
    { value: 'Nelson',    label: 'Nelson' },
    { value: 'Hannibal',  label: 'Hannibal' },
    { value: 'Picasso',   label: 'Picasso' },
    { value: 'Teddy',     label: 'Teddy' },
    { value: 'Mansa',     label: 'Mansa' },
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
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const effect = selected ? STATUS_EFFECTS.find(e => e.id === selected) : null;
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-orbitron text-lg text-cyan-400 tracking-widest mb-1">{(t.archives as any).effectsTitle ?? 'STATUS EFFECTS'}</h2>
      <p className="text-slate-400 text-sm mb-8">{(t.archives as any).effectsDesc ?? "All debuffs and their exact mechanics — know what you're applying, and what's being applied to you."}</p>
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
const CATEGORIES: AchievementCategory[] = ['combat', 'clones', 'arena', 'observer', 'secret'];

function AchievementsTab({
  isUnlocked,
  stats,
}: {
  isUnlocked?: (id: string) => boolean;
  stats?: AchievementStats;
}) {
  const { t, lang } = useT();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>('combat');
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
          {/* Dev reset button */}
          <button onClick={handleReset}
            className="font-orbitron text-[9px] px-3 py-1.5 rounded transition-all hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            title="Reset all achievement progress (dev)">
            {t.archives.achievementUI.reset}
          </button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${(totalUnlocked / ACHIEVEMENTS.length) * 100}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            boxShadow: '0 0 10px rgba(251,191,36,0.45)',
          }} />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => {
          const catAchs = getAchievementsByCategory(cat);
          const catUnlocked = catAchs.filter(a => isUnlocked?.(a.id)).length;
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

          return (
            <div key={a.id}
              className="rounded-xl border px-5 py-3.5 transition-all"
              style={{
                background: unlocked ? 'rgba(251,191,36,0.06)' : 'rgba(8,5,25,0.8)',
                borderColor: unlocked ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)',
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
}: {
  onFireEvent?: (eventKey: string, payload?: Record<string, unknown>) => void;
  isLoreUnlocked?: (id: string) => boolean;
  activeCat: LoreCategory;
  isLoreNew: (l: LoreEntry) => boolean;
  markLoreSeen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const { lang, t } = useT();

  const isEntryUnlocked = (l: LoreEntry) => l.unlocked || (isLoreUnlocked?.(l.id) ?? false);

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
