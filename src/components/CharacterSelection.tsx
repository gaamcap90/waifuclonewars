import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";
import { getCharacterPortrait } from "@/utils/portraits";

interface AbilityBadge {
  icon: string;
  name: string;
  desc: string;
  waterName?: string;
  waterDesc?: string;
  kind: "passive" | "ability" | "ultimate";
}

type Role = "dps_ranged" | "dps_melee" | "support" | "tank" | "hybrid" | "controller";

interface Character {
  id: string;
  name: string;   // internal English name (used for game logic)
  tagline: string;
  role: Role;
  stats: { hp: number; might: number; power: number };
  waterStats?: { hp: number; might: number; power: number };
  badges: AbilityBadge[];
}

interface Props {
  onStartGame: (selected: Character[]) => void;
  onBack?: () => void;
  gameMode: "singleplayer" | "multiplayer";
}


function rolePillStyle(role: Role) {
  switch (role) {
    case "dps_ranged": return { ring: "ring-fuchsia-400", text: "text-fuchsia-400", border: "border-fuchsia-400" };
    case "dps_melee":  return { ring: "ring-rose-400",    text: "text-rose-400",    border: "border-rose-400" };
    case "support":    return { ring: "ring-emerald-400", text: "text-emerald-400", border: "border-emerald-400" };
    case "tank":       return { ring: "ring-amber-400",   text: "text-amber-400",   border: "border-amber-400" };
    case "hybrid":      return { ring: "ring-teal-400",    text: "text-teal-400",    border: "border-teal-400" };
    case "controller":  return { ring: "ring-violet-400",  text: "text-violet-400",  border: "border-violet-400" };
  }
}

// Static character data — internal English names are used for game engine logic
const AVAILABLE: Character[] = [
  {
    id: "napoleon", name: "Napoleon-chan", tagline: "", role: "dps_ranged",
    stats: { hp: 100, might: 65, power: 60 },
    badges: [
      { kind: "passive",  icon: "🎯", name: "Vantage Point",    desc: "" },
      { kind: "ability",  icon: "💥", name: "Artillery Barrage", desc: "" },
      { kind: "ability",  icon: "⚔️", name: "Grande Armée",      desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo",       desc: "" },
    ],
  },
  {
    id: "genghis", name: "Genghis-chan", tagline: "", role: "dps_melee",
    stats: { hp: 120, might: 50, power: 40 },
    badges: [
      { kind: "passive",  icon: "🩸", name: "Bloodlust",     desc: "" },
      { kind: "ability",  icon: "⚡", name: "Mongol Charge", desc: "" },
      { kind: "ability",  icon: "🌀", name: "Horde Tactics", desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury",  desc: "" },
    ],
  },
  {
    id: "davinci", name: "Da Vinci-chan", tagline: "", role: "support",
    stats: { hp: 85, might: 35, power: 50 },
    badges: [
      { kind: "passive",  icon: "🔧", name: "Tinkerer",           desc: "" },
      { kind: "ability",  icon: "✈️", name: "Flying Machine",     desc: "" },
      { kind: "ability",  icon: "💚", name: "Masterpiece",        desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", desc: "" },
    ],
  },
  {
    id: "leonidas", name: "Leonidas-chan", tagline: "", role: "tank",
    stats: { hp: 130, might: 40, power: 28 },
    badges: [
      { kind: "passive",  icon: "🛡️", name: "Phalanx",        desc: "" },
      { kind: "ability",  icon: "⚡", name: "Shield Bash",     desc: "" },
      { kind: "ability",  icon: "🏛️", name: "Spartan Wall",   desc: "" },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", desc: "" },
    ],
  },
  {
    id: "sunsin", name: "Sun-sin-chan", tagline: "", role: "hybrid",
    stats: { hp: 100, might: 65, power: 60 },
    waterStats: { hp: 100, might: 91, power: 36 },
    badges: [
      { kind: "passive",  icon: "🐢", name: "Turtle Ship",       desc: "", waterDesc: "" },
      { kind: "ability",  icon: "🔥", name: "Hwajeon",           desc: "", waterName: "Ramming Speed", waterDesc: "" },
      { kind: "ability",  icon: "🚢", name: "Naval Repairs",     desc: "", waterName: "Broadside",     waterDesc: "" },
      { kind: "ultimate", icon: "⭐", name: "Chongtong Barrage", desc: "", waterDesc: "" },
    ],
  },
  {
    id: "beethoven", name: "Beethoven-chan", tagline: "", role: "controller",
    stats: { hp: 90, might: 35, power: 65 },
    badges: [
      { kind: "passive",  icon: "🎵", name: "Taubheit",     desc: "" },
      { kind: "ability",  icon: "🌊", name: "Schallwelle",  desc: "" },
      { kind: "ability",  icon: "🎶", name: "Freudenspur",  desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Götterfunken", desc: "" },
    ],
  },
  {
    id: "huang", name: "Huang-chan", tagline: "", role: "controller",
    stats: { hp: 90, might: 30, power: 55 },
    badges: [
      { kind: "passive",  icon: "🏺", name: "Imperial Command",         desc: "" },
      { kind: "ability",  icon: "⚔️", name: "Terracotta Legion",        desc: "" },
      { kind: "ability",  icon: "🐴", name: "First Emperor's Command",  desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Eternal Army",             desc: "" },
    ],
  },
];

export default function CharacterSelection({ onStartGame, onBack }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { t } = useT();

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
        {onBack && (
          <button onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-1.5 font-orbitron text-[11px] text-slate-400 hover:text-white transition-colors tracking-wider">
            {t.back}
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="font-orbitron text-3xl text-white drop-shadow-sm">{t.characterSelect.title}</h1>
          <p className="text-slate-300 mt-1">{t.characterSelect.subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="px-4 py-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 font-semibold">
            {t.characterSelect.selectedCount.replace('{n}', String(selectedIds.length))}
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
            {t.characterSelect.startBattle}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {AVAILABLE.map((c) => {
            const picked = selectedIds.includes(c.id);
            const disabled = maxed && !picked;
            // Build translated character data
            const charKey = c.id as keyof typeof t.characters;
            const charT = t.characters[charKey];
            const translatedC = {
              ...c,
              name: charT.name,
              tagline: charT.tagline,
              badges: c.badges.map((b, i) => {
                const abilities = [charT.passive, charT.ability1, charT.ability2, charT.ultimate] as any[];
                const ab = abilities[i];
                return {
                  ...b,
                  name: ab?.name ?? b.name,
                  desc: ab?.desc ?? b.desc,
                  waterName: (ab as any)?.waterName ?? b.waterName,
                  waterDesc: (ab as any)?.waterDesc ?? b.waterDesc,
                };
              }),
            };
            return (
              <CharacterCard
                key={c.id}
                c={translatedC}
                picked={picked}
                disabled={disabled}
                onToggle={() => toggle(c.id)}
                onHover={() => {}}
                t={t}
              />
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2 mt-6">
            {selected.map((c) => {
              const charT = t.characters[c.id as keyof typeof t.characters];
              return (
                <div key={c.id} className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20" title={charT.name}>
                  <img src={getCharacterPortrait(c.name)} alt={charT.name} className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCard({ c, picked, disabled, onToggle, onHover, t }: {
  c: Character;
  picked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onHover: () => void;
  t: ReturnType<typeof useT>['t'];
}) {
  const [mode, setMode] = useState<"land" | "water">("land");
  const roleStyle = rolePillStyle(c.role);
  const hasWaterForm = !!c.waterStats;
  const displayStats = hasWaterForm && mode === "water" ? c.waterStats! : c.stats;
  const roleLabel = t.roles[c.role];

  return (
    <button
      onClick={onToggle}
      onMouseEnter={onHover}
      aria-pressed={picked}
      disabled={disabled}
      className={[
        "group relative text-left rounded-2xl transition-all",
        "bg-slate-900/70 backdrop-blur border border-slate-700/70",
        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-lg",
        picked
          ? `ring-4 ${roleStyle.ring} shadow-[0_0_40px_rgba(251,191,36,0.35)] animate-pulse`
          : "ring-0",
      ].join(" ")}
    >
      <Card className="bg-transparent border-0 shadow-none">
        <CardHeader className="items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/20 transition">
              <img src={getCharacterPortrait(c.name)} alt={c.name} className="w-full h-full object-cover" />
            </div>
            {picked && (
              <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 rounded-full p-1 shadow">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          <CardTitle className="mt-3 text-xl text-white">{c.name}</CardTitle>
          <p className="text-[11px] italic text-slate-400 -mt-1 mb-1">{c.tagline}</p>

          <div className={["text-xs font-bold px-3 py-1 rounded-full border", roleStyle.text, roleStyle.border].join(" ")}>
            {roleLabel}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {/* Land / Water toggle for Sun-sin */}
          {hasWaterForm && (
            <div className="flex gap-0 mb-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMode("land")}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-orbitron font-bold py-1.5 rounded-l-lg border-y border-l transition-all"
                style={{
                  background: mode === "land" ? "rgba(134,239,172,0.15)" : "transparent",
                  borderColor: mode === "land" ? "rgba(134,239,172,0.55)" : "rgba(71,85,105,0.4)",
                  color: mode === "land" ? "#86efac" : "#475569",
                }}
              >
                {t.characterSelect.land}
              </button>
              <button
                onClick={() => setMode("water")}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-orbitron font-bold py-1.5 rounded-r-lg border-y border-r transition-all"
                style={{
                  background: mode === "water" ? "rgba(56,189,248,0.15)" : "transparent",
                  borderColor: mode === "water" ? "rgba(56,189,248,0.55)" : "rgba(71,85,105,0.4)",
                  color: mode === "water" ? "#38bdf8" : "#475569",
                }}
              >
                {t.characterSelect.water}
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label={t.characterSelect.hp}    value={displayStats.hp}    base={hasWaterForm ? c.stats.hp    : undefined} />
            <Stat label={t.characterSelect.might} value={displayStats.might} base={hasWaterForm ? c.stats.might : undefined} />
            <Stat label={t.characterSelect.power} value={displayStats.power} base={hasWaterForm ? c.stats.power : undefined} />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/70">
            <div className="text-slate-400 text-[11px] mb-2 uppercase tracking-wide">
              {t.characterSelect.passiveLabel}
            </div>
            <div className="flex gap-2 flex-wrap">
              {c.badges.map((b) => (
                <AbilityBadgeButton key={b.name} badge={b} mode={hasWaterForm ? mode : undefined} t={t} />
              ))}
            </div>
          </div>

          {picked && (
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40">
                {t.characterSelect.selectedBadge}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function Stat({ label, value, base }: { label: string; value: number; base?: number }) {
  const changed = base !== undefined && value !== base;
  const up = base !== undefined && value > base;
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700/70 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={["font-bold text-sm leading-tight", changed ? (up ? "text-emerald-400" : "text-red-400") : "text-slate-100"].join(" ")}>
        {value}
        {changed && <span className="text-[10px] ml-0.5">{up ? "▲" : "▼"}</span>}
      </div>
    </div>
  );
}

function AbilityBadgeButton({ badge, mode, t }: {
  badge: AbilityBadge;
  mode?: "land" | "water";
  t: ReturnType<typeof useT>['t'];
}) {
  const [hovered, setHovered] = useState(false);

  const isWater = mode === "water" && (!!badge.waterDesc || !!badge.waterName);
  const isLandWithDual = mode === "land" && (!!badge.waterDesc || !!badge.waterName);
  const displayName = isWater && badge.waterName ? badge.waterName : badge.name;
  const displayDesc = isWater && badge.waterDesc ? badge.waterDesc : badge.desc;

  const borderColor =
    badge.kind === "passive"  ? "border-purple-500/60 bg-purple-900/40" :
    badge.kind === "ultimate" ? "border-amber-500/60 bg-amber-900/40"   :
                                "border-sky-500/60 bg-sky-900/30";

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg cursor-default ${borderColor}`}>
        {badge.icon}
      </div>

      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 pointer-events-none"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.8))" }}
        >
          <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-base">{badge.icon}</span>
              <span className="text-slate-100 text-xs font-bold">{displayName}</span>
              {badge.kind === "passive" && (
                <span className="text-[9px] text-purple-400 border border-purple-500/40 rounded px-1">
                  {t.archives.abilityKind.passive}
                </span>
              )}
              {badge.kind === "ultimate" && (
                <span className="text-[9px] text-amber-400 border border-amber-500/40 rounded px-1">
                  {t.archives.abilityKind.ultimate}
                </span>
              )}
              {isWater && (
                <span className="text-[9px] text-sky-400 border border-sky-500/40 rounded px-1">
                  {t.archives.waterForm}
                </span>
              )}
              {isLandWithDual && (
                <span className="text-[9px] text-green-400 border border-green-500/40 rounded px-1">
                  {t.archives.landForm}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{displayDesc}</p>
          </div>
          <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-600 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
