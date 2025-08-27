import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";

type Role = "dps_ranged" | "dps_melee" | "support";

interface Character {
  id: string;
  name: string;
  role: Role;
  stats: { hp: number; might: number; power: number };
  keyAbilityName: string;
  keyAbilityDesc: string;
}

interface Props {
  onStartGame: (selected: Character[]) => void;
  gameMode: "singleplayer" | "multiplayer";
}

const portraits: Record<"Napoleon" | "Genghis" | "DaVinci", string> = {
  Napoleon: "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png",
  Genghis: "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png",
  DaVinci: "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png",
};

function getPortrait(name: string) {
  if (name.includes("Napoleon")) return portraits.Napoleon;
  if (name.includes("Genghis")) return portraits.Genghis;
  if (name.includes("Da Vinci")) return portraits.DaVinci;
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
  }
}

const AVAILABLE: Character[] = [
  {
    id: "napoleon",
    name: "Napoleon-chan",
    role: "dps_ranged",
    stats: { hp: 100, might: 70, power: 60 },
    keyAbilityName: "Artillery Barrage",
    keyAbilityDesc: "Long-range bombardment. Deals 48 damage.",
  },
  {
    id: "genghis",
    name: "Genghis-chan",
    role: "dps_melee",
    stats: { hp: 120, might: 50, power: 40 },
    keyAbilityName: "Mongol Charge",
    keyAbilityDesc: "Rush attack through enemies. Deals 48 damage.",
  },
  {
    id: "davinci",
    name: "Da Vinci-chan",
    role: "support",
    stats: { hp: 80, might: 35, power: 50 },
    keyAbilityName: "Flying Machine",
    keyAbilityDesc: "Teleport to any hex + gain aerial view for 2 turns.",
  },
];

export default function CharacterSelection({ onStartGame }: Props) {
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
      <div className="w-[1100px] max-w-[92vw] mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                    <div className="mt-4 pt-4 border-t border-slate-700/70">
                      <div className="text-slate-300 text-xs mb-1">KEY ABILITY</div>
                      <div className="text-slate-100 font-semibold">{c.keyAbilityName}</div>
                      <div className="text-slate-400 text-sm">{c.keyAbilityDesc}</div>
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
