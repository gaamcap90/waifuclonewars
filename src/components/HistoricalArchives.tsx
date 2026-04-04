import React, { useState } from "react";
import { ChevronLeft, Shield, Zap, Heart, Star } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";

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
    id: "napoleon",
    name: "Napoleon-chan",
    title: "The Brilliant Tactician",
    tagline: "Commander of the Clone Armies",
    role: "DPS RANGED",
    portrait: "/art/napoleon_portrait.png",
    accentColor: "#d946ef",
    ringColor: "rgba(217,70,239,0.55)",
    lore:
      "Once the greatest military mind in Earth's history, Napoleon Bonaparte was resurrected as a battle-clone by the Empire of Znyxorga. Now fighting in their interdimensional arena, this pint-sized prodigy commands forces with tactical genius, turning every battlefield into a stage for her brilliance. Her sharp eyes miss nothing — and her artillery never misses twice.",
    stats: { hp: 100, might: 70, power: 60, defense: 20, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🎯", name: "Vantage Point", cost: "Passive", desc: <>On a forest tile, basic attack range becomes 3. No <span style={{ color: "#fbbf24", fontWeight: 700 }}>Defense</span> bonus from forest — a calculated trade-off.</> },
      { kind: "ability", icon: "💥", name: "Artillery Barrage", cost: "2 Mana", desc: <>Unleash a devastating barrage dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>84</span> damage to a target at range 4.</> },
      { kind: "ability", icon: "⚔️", name: "Grande Armée", cost: "3 Mana", desc: <>Rally the troops! Grant +20% <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> AND <span style={{ color: "#60a5fa", fontWeight: 700 }}>Power</span> to all allies for 2 turns.</> },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo", cost: "3 Mana · Exhaust", desc: <>Fire 3 random artillery shots, each dealing <span style={{ color: "#60a5fa", fontWeight: 700 }}>42</span> to random enemies within range 4.</> },
    ],
  },
  {
    id: "genghis",
    name: "Genghis-chan",
    title: "The Unstoppable Conqueror",
    tagline: "Khan of a Thousand Battlefields",
    role: "DPS MELEE",
    portrait: "/art/genghis_portrait.png",
    accentColor: "#ef4444",
    ringColor: "rgba(239,68,68,0.55)",
    lore:
      "The mightiest conqueror ever to ride across the steppes of Earth has been reborn as a ferocious battle-clone. Her bloodlust only grows with each fallen foe — every kill sharpens her blade and restores her focus. In the arena of Znyxorga, she builds a new empire one victory at a time, and no wall of steel or magic has ever stopped her charge.",
    stats: { hp: 120, might: 50, power: 40, defense: 25, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🩸", name: "Bloodlust", cost: "Passive", desc: <>Each kill grants +15 <span style={{ color: "#f87171", fontWeight: 700 }}>Might</span> and restores 1 Mana. Stacks up to 3×.</> },
      { kind: "ability", icon: "⚡", name: "Mongol Charge", cost: "2 Mana", desc: <>Surge forward and strike a single target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>48</span> damage at range 3.</> },
      { kind: "ability", icon: "🌀", name: "Horde Tactics", cost: "3 Mana", desc: <>Command the horde! Deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>32</span> damage to ALL enemies within range 2 simultaneously.</> },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury", cost: "3 Mana · Exhaust", desc: <>Sweep the battlefield: deal <span style={{ color: "#60a5fa", fontWeight: 700 }}>28</span> to every enemy on a straight line up to range 5.</> },
    ],
  },
  {
    id: "davinci",
    name: "Da Vinci-chan",
    title: "The Genius Inventor",
    tagline: "Visionary of the Stars",
    role: "SUPPORT",
    portrait: "/art/davinci_portrait.png",
    accentColor: "#34d399",
    ringColor: "rgba(52,211,153,0.55)",
    lore:
      "Leonardo da Vinci painted the Mona Lisa, designed flying machines, and unlocked the secrets of human anatomy — often simultaneously. Now, as a battle-clone for the Empire of Znyxorga, she brings that boundless creativity to the arena. Her inventions heal the fallen, scout the skies, and protect her team from whatever the galaxy hurls at them.",
    stats: { hp: 80, might: 35, power: 50, defense: 15, moveRange: 3 },
    abilities: [
      { kind: "passive", icon: "🔧", name: "Tinkerer", cost: "Passive", desc: "If no exclusive ability card was used last turn, draw +1 card at the start of your turn." },
      { kind: "ability", icon: "✈️", name: "Flying Machine", cost: "2 Mana", desc: "Teleport to any unoccupied hex within range 5, bypassing terrain and obstacles." },
      { kind: "ability", icon: "💚", name: "Masterpiece", cost: "3 Mana", desc: <>Restore <span style={{ color: "#4ade80", fontWeight: 700 }}>45 HP</span> to an ally within range 3. Also removes the Poison debuff.</> },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", cost: "3 Mana · Exhaust", desc: <>Summon a combat drone: <span style={{ color: "#4ade80", fontWeight: 700 }}>50 HP</span>, <span style={{ color: "#f87171", fontWeight: 700 }}>15 Might</span>, <span style={{ color: "#fbbf24", fontWeight: 700 }}>30 Defense</span>. It fights for your team for 2 turns.</> },
    ],
  },
  {
    id: "leonidas",
    name: "Leonidas-chan",
    title: "The Unbreakable Wall",
    tagline: "Defender of the Thermopylae Gate",
    role: "TANK",
    portrait: "/art/leonidas_portrait.png",
    accentColor: "#f59e0b",
    ringColor: "rgba(245,158,11,0.55)",
    lore:
      "Three hundred Spartans. One narrow pass. An empire brought to its knees. Leonidas I held the Gates of Thermopylae against impossible odds, and her legend echoed across millennia — right into the cloning vats of Znyxorga. Reborn as a battle-clone in burnished bronze and blazing war-paint, Leonidas-chan turns every battlefield into a chokepoint. She does not retreat. She does not yield. She is the shield upon which enemy waves break and scatter.",
    stats: { hp: 130, might: 45, power: 20, defense: 42, moveRange: 2 },
    abilities: [
      {
        kind: "passive", icon: "🛡️", name: "Phalanx", cost: "Passive",
        desc: <>Each turn Leonidas ends adjacent to an ally, she gains +<span style={{ color: "#fbbf24", fontWeight: 700 }}>8 Defense</span> (stacks up to 3 turns, max +24). Stay close to teammates over multiple turns to build an iron wall.</>,
      },
      {
        kind: "ability", icon: "⚡", name: "Shield Bash", cost: "2 Mana",
        desc: <>Slam your shield into a target within range 1 for <span style={{ color: "#60a5fa", fontWeight: 700 }}>1.5× Power (30 dmg)</span> and apply <span style={{ color: "#fbbf24", fontWeight: 700 }}>Armor Break</span> (−20% Defense for 2 turns).</>,
      },
      {
        kind: "ability", icon: "🏛️", name: "Spartan Wall", cost: "3 Mana",
        desc: <>Raise the phalanx — grant <span style={{ color: "#fbbf24", fontWeight: 700 }}>+30% Defense</span> to Leonidas and all allies within range 2 for 2 turns.</>,
      },
      {
        kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", cost: "3 Mana · Exhaust",
        desc: <>Charge up to 3 hexes and crash into a target for <span style={{ color: "#60a5fa", fontWeight: 700 }}>3× Power (60 dmg)</span>. All enemies adjacent to the impact are <span style={{ color: "#f87171", fontWeight: 700 }}>Demoralized</span> for 1 turn (50% chance to skip movement and card plays).</>,
      },
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

interface Props {
  onBack: () => void;
}

export default function HistoricalArchives({ onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const char = selected ? CHARACTERS.find((c) => c.id === selected) ?? null : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      {char ? (
        <DetailView char={char} onBack={() => setSelected(null)} />
      ) : (
        <GridView onSelect={setSelected} onBack={onBack} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GRID VIEW
══════════════════════════════════════════════════════════════ */
function GridView({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{ height: 220 }}
      >
        <img
          src="/art/group_splash.jpg"
          alt="Battle scene"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ filter: "brightness(0.55) saturate(1.1)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-orbitron text-[10px] tracking-[0.5em] text-purple-400 mb-2">THE EMPIRE OF ZNYXORGA</p>
          <h1 className="font-orbitron font-black text-4xl text-white" style={{ textShadow: "0 0 30px rgba(34,211,238,0.5)" }}>
            HISTORICAL ARCHIVES
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Select a clone to view their dossier</p>
        </div>
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-orbitron text-xs tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" />
          MAIN MENU
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-[1200px] w-full">
          {CHARACTERS.map((c) => {
            const roleStyle = ROLE_STYLE[c.role];
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="group relative rounded-2xl overflow-hidden border border-slate-700/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl text-left"
                style={{ aspectRatio: "3/4" }}
              >
                {/* Portrait fill */}
                <img
                  src={c.portrait}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  style={{ filter: "brightness(0.75)" }}
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${c.accentColor}55 0%, rgba(2,4,14,0.7) 35%, transparent 70%)`,
                  }}
                />

                {/* Hover glow border */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ boxShadow: `inset 0 0 0 2px ${c.accentColor}` }}
                />

                {/* Content at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-2 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
                    {c.role}
                  </div>
                  <h2 className="font-orbitron font-black text-xl text-white leading-tight">{c.name}</h2>
                  <p className="text-sm italic mt-0.5" style={{ color: c.accentColor }}>{c.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">"{c.tagline}"</p>
                  <div
                    className="mt-3 flex items-center gap-1.5 text-xs font-orbitron tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ color: c.accentColor }}
                  >
                    VIEW DOSSIER →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DETAIL VIEW
══════════════════════════════════════════════════════════════ */
function DetailView({ char, onBack }: { char: CharacterEntry; onBack: () => void }) {
  const roleStyle = ROLE_STYLE[char.role];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header bar */}
      <div
        className="relative h-14 flex items-center px-6 border-b border-slate-800/60"
        style={{ background: "rgba(2,4,14,0.92)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" />
          ARCHIVES
        </button>
        <div className="mx-4 h-4 w-px bg-slate-700" />
        <span className="font-orbitron text-xs text-slate-500 tracking-widest">{char.name.toUpperCase()}</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-auto">
        {/* Left: Portrait panel */}
        <div
          className="w-[420px] shrink-0 relative flex flex-col items-center justify-center py-12 px-8"
          style={{ background: `linear-gradient(135deg, rgba(2,4,14,0.98) 0%, ${char.accentColor}12 100%)` }}
        >
          {/* Ambient glow */}
          <div
            className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${char.ringColor} 0%, transparent 70%)`,
              filter: "blur(50px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Portrait */}
          <div
            className="relative rounded-full overflow-hidden animate-pulse-soft"
            style={{
              width: 260,
              height: 260,
              border: `4px solid ${char.accentColor}60`,
              boxShadow: `0 0 50px ${char.ringColor}, 0 0 100px ${char.accentColor}30`,
            }}
          >
            <img
              src={char.portrait}
              alt={char.name}
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.92) contrast(1.05)" }}
            />
          </div>

          {/* Name below portrait */}
          <div className="relative text-center mt-6">
            <div className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border mb-3 ${roleStyle.text} ${roleStyle.border} ${roleStyle.bg}`}>
              {char.role}
            </div>
            <h2 className="font-orbitron font-black text-2xl text-white">{char.name}</h2>
            <p className="italic text-sm mt-1" style={{ color: char.accentColor }}>{char.title}</p>
          </div>

          {/* Separator */}
          <div className="relative w-full h-px my-6" style={{ background: `linear-gradient(to right, transparent, ${char.accentColor}50, transparent)` }} />

          {/* Stat bars */}
          <div className="relative w-full space-y-3">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">BASE STATS</p>
            {(
              [
                { key: "hp", label: "HP", icon: <Heart className="w-3 h-3" />, color: "#4ade80" },
                { key: "might", label: "MIGHT", icon: <Zap className="w-3 h-3" />, color: "#f87171" },
                { key: "power", label: "POWER", icon: <Star className="w-3 h-3" />, color: "#60a5fa" },
                { key: "defense", label: "DEFENSE", icon: <Shield className="w-3 h-3" />, color: "#fbbf24" },
              ] as const
            ).map(({ key, label, icon, color }) => {
              const val = char.stats[key as keyof typeof char.stats];
              const max = STAT_MAX[key as keyof typeof STAT_MAX];
              const pct = Math.min(100, (val / max) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-orbitron" style={{ color }}>
                      {icon}
                      {label}
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold">{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="flex-1 py-12 px-10 overflow-auto" style={{ background: "rgba(2,4,14,0.85)" }}>
          {/* Tagline */}
          <p className="font-orbitron text-[11px] tracking-[0.4em] text-slate-500 mb-1">CLASSIFIED DOSSIER</p>
          <h1 className="font-orbitron font-black text-4xl text-white mb-1">{char.name}</h1>
          <p className="italic text-lg mb-6" style={{ color: `${char.accentColor}cc` }}>
            "{char.tagline}"
          </p>

          {/* Lore divider */}
          <div className="h-px mb-6" style={{ background: `linear-gradient(to right, ${char.accentColor}40, transparent)` }} />

          {/* Lore text */}
          <div className="mb-8">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-3">LORE</p>
            <p className="text-slate-300 text-sm leading-relaxed max-w-[560px]">{char.lore}</p>
          </div>

          {/* Abilities */}
          <div>
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-500 mb-4">ABILITIES</p>
            <div className="grid grid-cols-1 gap-3 max-w-[620px]">
              {char.abilities.map((ab) => {
                const kindStyle =
                  ab.kind === "passive"
                    ? { border: "border-purple-600/50", bg: "bg-purple-950/40", badge: "bg-purple-900/70 text-purple-300 border-purple-600/50", badgeLabel: "PASSIVE" }
                    : ab.kind === "ultimate"
                    ? { border: "border-amber-500/50", bg: "bg-amber-950/30", badge: "bg-amber-900/70 text-amber-300 border-amber-500/50", badgeLabel: "ULTIMATE" }
                    : { border: "border-slate-600/50", bg: "bg-slate-800/40", badge: "bg-slate-700/70 text-slate-300 border-slate-600/50", badgeLabel: "ABILITY" };

                return (
                  <div
                    key={ab.name}
                    className={`flex gap-4 rounded-xl border p-4 ${kindStyle.border} ${kindStyle.bg}`}
                  >
                    {/* Icon */}
                    <div className="text-3xl shrink-0 w-10 text-center leading-none pt-0.5">{ab.icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-orbitron font-bold text-sm text-white">{ab.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${kindStyle.badge}`}>
                          {kindStyle.badgeLabel}
                        </span>
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
