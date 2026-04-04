import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";

interface AbilityBadge {
  icon: string;
  name: string;
  desc: string;
  kind: "passive" | "ability" | "ultimate";
}

type Role = "dps_ranged" | "dps_melee" | "support" | "tank";

interface Character {
  id: string;
  name: string;
  tagline: string;
  role: Role;
  stats: { hp: number; might: number; power: number };
  badges: AbilityBadge[];
}

interface Props {
  onStartGame: (selected: Character[]) => void;
  onBack?: () => void;
  gameMode: "singleplayer" | "multiplayer";
}

const portraits: Record<"Napoleon" | "Genghis" | "DaVinci" | "Leonidas", string> = {
  Napoleon: "/art/napoleon_portrait.png",
  Genghis: "/art/genghis_portrait.png",
  DaVinci: "/art/davinci_portrait.png",
  Leonidas: "/art/leonidas_portrait.png",
};

function getPortrait(name: string) {
  if (name.includes("Napoleon")) return portraits.Napoleon;
  if (name.includes("Genghis")) return portraits.Genghis;
  if (name.includes("Da Vinci")) return portraits.DaVinci;
  if (name.includes("Leonidas")) return portraits.Leonidas;
  return undefined;
}

function rolePill(role: Role) {
  switch (role) {
    case "dps_ranged":
      return { label: "DPS RANGED", ring: "ring-fuchsia-400", text: "text-fuchsia-400", border: "border-fuchsia-400" };
    case "dps_melee":
      return { label: "DPS MELEE", ring: "ring-rose-400", text: "text-rose-400", border: "border-rose-400" };
    case "support":
      return { label: "SUPPORT", ring: "ring-emerald-400", text: "text-emerald-400", border: "border-emerald-400" };
    case "tank":
      return { label: "TANK", ring: "ring-amber-400", text: "text-amber-400", border: "border-amber-400" };
  }
}

const AVAILABLE: Character[] = [
  {
    id: "napoleon",
    name: "Napoleon-chan",
    tagline: "Commander of the Clone Armies",
    role: "dps_ranged",
    stats: { hp: 100, might: 70, power: 60 },
    badges: [
      { kind: "passive",  icon: "🎯", name: "Vantage Point",    desc: "On a forest tile, basic attack range becomes 3 — but no DEF bonus from forest (trade-off)." },
      { kind: "ability",  icon: "💥", name: "Artillery Barrage", desc: "Power×1.4 damage at range 4. (Cost: 2 mana)" },
      { kind: "ability",  icon: "⚔️", name: "Grande Armée",      desc: "+20% Might & Power to your whole team for 2 turns. (Cost: 3 mana)" },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo",       desc: "ULTIMATE — 3 random hits of Power×0.7 on enemies within range 4. (Cost: 3 mana, exhaust)" },
    ],
  },
  {
    id: "genghis",
    name: "Genghis-chan",
    tagline: "Khan of a Thousand Battlefields",
    role: "dps_melee",
    stats: { hp: 120, might: 50, power: 40 },
    badges: [
      { kind: "passive",  icon: "🩸", name: "Bloodlust",      desc: "Each kill: +15 Might and restore 1 Mana. Stacks up to 3×." },
      { kind: "ability",  icon: "⚡", name: "Mongol Charge",  desc: "Power×1.2 damage at range 3. (Cost: 2 mana)" },
      { kind: "ability",  icon: "🌀", name: "Horde Tactics",  desc: "Power×0.8 damage to ALL enemies within range 2. (Cost: 3 mana)" },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury",   desc: "ULTIMATE — Power×0.7 to all enemies on a line, range 5. (Cost: 3 mana, exhaust)" },
    ],
  },
  {
    id: "davinci",
    name: "Da Vinci-chan",
    tagline: "Visionary of the Stars",
    role: "support",
    stats: { hp: 80, might: 35, power: 50 },
    badges: [
      { kind: "passive",  icon: "🔧", name: "Tinkerer",             desc: "At turn start, if Da Vinci hasn't used an exclusive ability card last turn, draw +1 card." },
      { kind: "ability",  icon: "✈️", name: "Flying Machine",       desc: "Teleport to any hex within range 5. (Cost: 2 mana)" },
      { kind: "ability",  icon: "💚", name: "Masterpiece",          desc: "Heal an ally within range 3 for 45 HP. (Cost: 3 mana)" },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian",   desc: "ULTIMATE — Summon a combat drone: 50 HP, 15 Might, 30 DEF, lasts 2 turns. (Cost: 3 mana, exhaust)" },
    ],
  },
  {
    id: "leonidas",
    name: "Leonidas-chan",
    tagline: "Defender of the Thermopylae Gate",
    role: "tank",
    stats: { hp: 130, might: 45, power: 20 },
    badges: [
      { kind: "passive",  icon: "🛡️", name: "Phalanx",         desc: "Each turn adjacent to an ally: +8 Defense (stacks up to 3 turns, max +24). Build the wall by staying close." },
      { kind: "ability",  icon: "⚡", name: "Shield Bash",      desc: "1.5× Power (30 dmg) at range 1 + Armor Break (−20% DEF for 2 turns). (Cost: 2 mana)" },
      { kind: "ability",  icon: "🏛️", name: "Spartan Wall",     desc: "+30% Defense to Leonidas and all allies within range 2 for 2 turns. (Cost: 3 mana)" },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!",  desc: "ULTIMATE — Charge 3 hexes: 3× Power (60 dmg) to target + Demoralize all adjacent enemies 1t (50% skip turn). (Cost: 3 mana, exhaust)" },
    ],
  },
];

export default function CharacterSelection({ onStartGame, onBack }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected = useMemo(
    () => AVAILABLE.filter((c) => selectedIds.includes(c.id)),
    [selectedIds]
  );
  const maxed = selectedIds.length >= 3;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ArenaBackground />
      <div className="w-[1400px] max-w-[95vw] mx-auto">
        {/* Back button */}
        {onBack && (
          <button onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-1.5 font-orbitron text-[11px] text-slate-400 hover:text-white transition-colors tracking-wider">
            ← MAIN MENU
          </button>
        )}

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-orbitron text-3xl text-white drop-shadow-sm">Select Your Team</h1>
          <p className="text-slate-300 mt-1">Choose up to three champions</p>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-center mb-6">
          <div className="px-4 py-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 font-semibold">
            Selected: {selectedIds.length}/3
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {AVAILABLE.map((c) => {
            const picked = selectedIds.includes(c.id);
            const role = rolePill(c.role);
            const disabled = maxed && !picked;

            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                aria-pressed={picked}
                disabled={disabled}
                className={[
                  "group relative text-left rounded-2xl transition-all",
                  "bg-slate-900/70 backdrop-blur border border-slate-700/70",
                  "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-lg",
                  picked
                    ? `ring-4 ${role.ring} shadow-[0_0_40px_rgba(251,191,36,0.35)] animate-pulse`
                    : "ring-0",
                ].join(" ")}
              >
                <Card className="bg-transparent border-0 shadow-none">
                  <CardHeader className="items-center">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/20 transition">
                        <img
                          src={getPortrait(c.name)}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Selected check badge */}
                      {picked && (
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 rounded-full p-1 shadow">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <CardTitle className="mt-3 text-xl text-white">{c.name}</CardTitle>

                    <p className="text-[11px] italic text-slate-400 -mt-1 mb-1">{c.tagline}</p>

                    <div
                      className={[
                        "text-xs font-bold px-3 py-1 rounded-full border",
                        role.text,
                        role.border,
                      ].join(" ")}
                    >
                      {role.label}
                    </div>
                  </CardHeader>

                  <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <Stat label="HP" value={c.stats.hp} />
                      <Stat label="Might" value={c.stats.might} />
                      <Stat label="Power" value={c.stats.power} />
                    </div>

                    {/* Passive + Ability badges */}
                    <div className="mt-4 pt-4 border-t border-slate-700/70">
                      <div className="text-slate-400 text-[11px] mb-2 uppercase tracking-wide">Passive &amp; Unique Abilities</div>
                      <div className="flex gap-2 flex-wrap">
                        {c.badges.map((b) => (
                          <AbilityBadgeButton key={b.name} badge={b} />
                        ))}
                      </div>
                    </div>

                    {/* Selected ribbon */}
                    {picked && (
                      <div className="mt-4">
                        <div className="inline-flex items-center gap-2 text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40">
                          Selected
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-2">
            {selected.map((c) => (
              <div
                key={c.id}
                className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20"
                title={c.name}
              >
                <img src={getPortrait(c.name)} alt={c.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <Button
            size="lg"
            disabled={selected.length !== 3}
            onClick={() => onStartGame(selected)}
            className={[
              "px-8 text-white font-bold transition",
              selected.length === 3
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30"
                : "bg-slate-600 cursor-not-allowed",
            ].join(" ")}
          >
            Start Battle
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700/70 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-slate-100 font-bold">{value}</div>
    </div>
  );
}

function AbilityBadgeButton({ badge }: { badge: AbilityBadge }) {
  const [hovered, setHovered] = useState(false);

  const borderColor =
    badge.kind === "passive"  ? "border-purple-500/60 bg-purple-900/40" :
    badge.kind === "ultimate" ? "border-amber-500/60 bg-amber-900/40" :
                                "border-slate-600/60 bg-slate-800/60";

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg cursor-default ${borderColor}`}>
        {badge.icon}
      </div>

      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 pointer-events-none"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.8))" }}
        >
          <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{badge.icon}</span>
              <span className="text-slate-100 text-xs font-bold">{badge.name}</span>
              {badge.kind === "passive" && (
                <span className="text-[9px] text-purple-400 border border-purple-500/40 rounded px-1">PASSIVE</span>
              )}
              {badge.kind === "ultimate" && (
                <span className="text-[9px] text-amber-400 border border-amber-500/40 rounded px-1">ULTIMATE</span>
              )}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{badge.desc}</p>
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-600 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
