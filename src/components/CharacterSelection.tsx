import React, { useMemo, useState } from "react";
import { CHARACTER_UNLOCK_THRESHOLDS, CHARACTER_UNLOCK_EVENTS } from "@/data/achievements";
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
  secondaryRole?: Role;
  stats: { hp: number; might: number; power: number };
  waterStats?: { hp: number; might: number; power: number };
  badges: AbilityBadge[];
}

interface Props {
  onStartGame: (selected: Character[]) => void;
  onBack?: () => void;
  gameMode: "singleplayer" | "multiplayer";
  unlockedCharacterIds?: Set<string>;
  achievementPoints?: number;
  unlockedAchievementIds?: Set<string>;
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
    stats: { hp: 100, might: 60, power: 65 },
    badges: [
      { kind: "passive",  icon: "🎯", name: "Vantage Point",    desc: "" },
      { kind: "ability",  icon: "💥", name: "Artillery Barrage", desc: "" },
      { kind: "ability",  icon: "⚔️", name: "Grande Armée",      desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Final Salvo",       desc: "" },
    ],
  },
  {
    id: "genghis", name: "Genghis-chan", tagline: "", role: "dps_melee",
    stats: { hp: 120, might: 55, power: 40 },
    badges: [
      { kind: "passive",  icon: "🩸", name: "Bloodlust",     desc: "" },
      { kind: "ability",  icon: "⚡", name: "Mongol Charge", desc: "" },
      { kind: "ability",  icon: "🌀", name: "Horde Tactics", desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Rider's Fury",  desc: "" },
    ],
  },
  {
    id: "davinci", name: "Da Vinci-chan", tagline: "", role: "support",
    stats: { hp: 100, might: 35, power: 50 },
    badges: [
      { kind: "passive",  icon: "🔧", name: "Tinkerer",           desc: "" },
      { kind: "ability",  icon: "✈️", name: "Flying Machine",     desc: "" },
      { kind: "ability",  icon: "💚", name: "Masterpiece",        desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Vitruvian Guardian", desc: "" },
    ],
  },
  {
    id: "leonidas", name: "Leonidas-chan", tagline: "", role: "tank",
    stats: { hp: 130, might: 40, power: 48 },
    badges: [
      { kind: "passive",  icon: "🛡️", name: "Phalanx",        desc: "" },
      { kind: "ability",  icon: "⚡", name: "Shield Bash",     desc: "" },
      { kind: "ability",  icon: "🏛️", name: "Spartan Wall",   desc: "" },
      { kind: "ultimate", icon: "⭐", name: "THIS IS SPARTA!", desc: "" },
    ],
  },
  {
    id: "sunsin", name: "Sun-sin-chan", tagline: "", role: "hybrid",
    stats: { hp: 100, might: 58, power: 55 },
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
    stats: { hp: 95, might: 35, power: 70 },
    badges: [
      { kind: "passive",  icon: "🎵", name: "Taubheit",     desc: "" },
      { kind: "ability",  icon: "🌊", name: "Schallwelle",  desc: "" },
      { kind: "ability",  icon: "🎶", name: "Freudenspur",  desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Götterfunken", desc: "" },
    ],
  },
  {
    id: "huang", name: "Huang-chan", tagline: "", role: "controller",
    stats: { hp: 90, might: 35, power: 55 },
    badges: [
      { kind: "passive",  icon: "🏺", name: "Imperial Command",         desc: "" },
      { kind: "ability",  icon: "⚔️", name: "Terracotta Legion",        desc: "" },
      { kind: "ability",  icon: "🐴", name: "First Emperor's Command",  desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Eternal Army",             desc: "" },
    ],
  },
  {
    id: "nelson", name: "Nelson-chan", tagline: "", role: "dps_ranged",
    stats: { hp: 95, might: 40, power: 65 },
    badges: [
      { kind: "passive",  icon: "⚓", name: "One Eye, One Hand", desc: "" },
      { kind: "ability",  icon: "🚢", name: "Crossing the T",   desc: "" },
      { kind: "ability",  icon: "💋", name: "Kiss Me Hardy",    desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Trafalgar Square", desc: "" },
    ],
  },
  {
    id: "hannibal", name: "Hannibal-chan", tagline: "", role: "dps_melee", secondaryRole: "controller",
    stats: { hp: 110, might: 55, power: 55 },
    badges: [
      { kind: "passive",  icon: "🦊", name: "Cannae",                desc: "" },
      { kind: "ability",  icon: "🏔️", name: "Alpine March",         desc: "" },
      { kind: "ability",  icon: "⚔️", name: "Double Envelopment",   desc: "" },
      { kind: "ultimate", icon: "⭐", name: "War Elephant",          desc: "" },
    ],
  },
  {
    id: "picasso", name: "Picasso-chan", tagline: "", role: "support", secondaryRole: "controller",
    stats: { hp: 95, might: 30, power: 70 },
    badges: [
      { kind: "passive",  icon: "🎨", name: "Fractured Perspective", desc: "" },
      { kind: "ability",  icon: "🖼️", name: "Guernica",             desc: "" },
      { kind: "ability",  icon: "🪞", name: "Cubist Mirror",         desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Blue Period",           desc: "" },
    ],
  },
  {
    id: "teddy", name: "Teddy-chan", tagline: "", role: "tank", secondaryRole: "dps_melee",
    stats: { hp: 140, might: 60, power: 40 },
    badges: [
      { kind: "passive",  icon: "🦁", name: "Bully!",                  desc: "" },
      { kind: "ability",  icon: "🤫", name: "Speak Softly",           desc: "" },
      { kind: "ability",  icon: "🏏", name: "Big Stick",              desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Rough Riders' Rally",    desc: "" },
    ],
  },
  {
    id: "mansa", name: "Mansa-chan", tagline: "", role: "support", secondaryRole: "controller",
    stats: { hp: 100, might: 30, power: 70 },
    badges: [
      { kind: "passive",  icon: "💰", name: "Treasury",           desc: "" },
      { kind: "ability",  icon: "🛤️", name: "Salt Road",          desc: "" },
      { kind: "ability",  icon: "🕌", name: "Hajj of Gold",       desc: "" },
      { kind: "ultimate", icon: "⭐", name: "Mansa's Bounty",     desc: "" },
    ],
  },
];

const ROLE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  dps_ranged:  { label: 'Ranged DPS',  icon: '🎯', color: 'rgba(232,72,232,0.7)' },
  dps_melee:   { label: 'Melee DPS',   icon: '⚔️', color: 'rgba(248,100,100,0.7)' },
  support:     { label: 'Support',     icon: '💚', color: 'rgba(52,211,153,0.7)' },
  tank:        { label: 'Tank',        icon: '🛡️', color: 'rgba(251,191,36,0.7)' },
  hybrid:      { label: 'Hybrid',      icon: '🐢', color: 'rgba(45,212,191,0.7)' },
  controller:  { label: 'Controller',  icon: '🌀', color: 'rgba(167,139,250,0.7)' },
};

// TCG frame gradient per role
const ROLE_FRAME: Record<Role, { a: string; b: string; glow: string; solid: string }> = {
  dps_ranged: { a: '#e879f9', b: '#a21caf', glow: 'rgba(232,121,249,0.45)', solid: '#e879f9' },
  dps_melee:  { a: '#fb7185', b: '#9f1239', glow: 'rgba(251,113,133,0.45)', solid: '#fb7185' },
  support:    { a: '#34d399', b: '#065f46', glow: 'rgba(52,211,153,0.45)',  solid: '#34d399' },
  tank:       { a: '#fbbf24', b: '#92400e', glow: 'rgba(251,191,36,0.45)',  solid: '#fbbf24' },
  hybrid:     { a: '#2dd4bf', b: '#0f766e', glow: 'rgba(45,212,191,0.45)', solid: '#2dd4bf' },
  controller: { a: '#a78bfa', b: '#4c1d95', glow: 'rgba(167,139,250,0.45)', solid: '#a78bfa' },
};

export default function CharacterSelection({ onStartGame, onBack, unlockedCharacterIds, achievementPoints = 0, unlockedAchievementIds }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
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

  const visibleChars = roleFilter
    ? AVAILABLE.filter(c => c.role === roleFilter || c.secondaryRole === roleFilter)
    : AVAILABLE;

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

        <div className="flex items-center justify-center gap-4 mb-4">
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

        {/* Role filter bar */}
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setRoleFilter(null)}
            className="font-orbitron text-[10px] px-3 py-1.5 rounded-full border transition-all"
            style={{
              background: roleFilter === null ? 'rgba(100,80,200,0.25)' : 'rgba(255,255,255,0.04)',
              borderColor: roleFilter === null ? 'rgba(139,92,246,0.70)' : 'rgba(80,70,110,0.40)',
              color: roleFilter === null ? '#a78bfa' : '#64748b',
              boxShadow: roleFilter === null ? '0 0 10px rgba(139,92,246,0.25)' : 'none',
            }}
          >
            All
          </button>
          {Object.entries(ROLE_LABELS).map(([role, meta]) => {
            const active = roleFilter === role;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(active ? null : role)}
                className="font-orbitron text-[10px] px-3 py-1.5 rounded-full border transition-all flex items-center gap-1"
                style={{
                  background: active ? meta.color.replace('0.7)', '0.18)') : 'rgba(255,255,255,0.04)',
                  borderColor: active ? meta.color : 'rgba(80,70,110,0.35)',
                  color: active ? '#fff' : '#64748b',
                  boxShadow: active ? `0 0 10px ${meta.color.replace('0.7)', '0.30)')}` : 'none',
                }}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {visibleChars.map((c, charIdx) => {
            const threshold = CHARACTER_UNLOCK_THRESHOLDS[c.id] ?? 0;
            const eventUnlock = CHARACTER_UNLOCK_EVENTS[c.id]; // e.g. 'thral_nor' for teddy
            const unlockLabel = eventUnlock
              ? (c.id === 'teddy' ? 'Complete Act III' : c.id === 'mansa' ? 'Complete Act IV' : eventUnlock)
              : `${threshold} pts`;
            const isLocked = unlockedCharacterIds ? !unlockedCharacterIds.has(c.id) : false;
            const picked = selectedIds.includes(c.id);
            const disabled = (maxed && !picked) || isLocked;
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
                isLocked={isLocked}
                unlockThreshold={threshold}
                unlockLabel={unlockLabel}
                onToggle={() => !isLocked && toggle(c.id)}
                onHover={() => {}}
                t={t}
                enterDelay={charIdx * 0.06}
                unlockedAchievementIds={unlockedAchievementIds}
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

function CharacterCard({ c, picked, disabled, isLocked, unlockThreshold, unlockLabel, onToggle, onHover, t, enterDelay = 0, unlockedAchievementIds }: {
  c: Character;
  picked: boolean;
  disabled: boolean;
  isLocked?: boolean;
  unlockThreshold?: number;
  unlockLabel?: string;
  onToggle: () => void;
  onHover: () => void;
  t: ReturnType<typeof useT>['t'];
  enterDelay?: number;
  unlockedAchievementIds?: Set<string>;
}) {
  const [mode, setMode] = useState<"land" | "water">("land");
  const [hovered, setHovered] = useState(false);
  const hasWaterForm = !!c.waterStats;
  const displayStats = hasWaterForm && mode === "water" ? c.waterStats! : c.stats;
  const roleLabel = t.roles[c.role];
  const frame = ROLE_FRAME[c.role];
  const portrait = getCharacterPortrait(c.name);

  // Stat bar max values for visual scaling
  const maxHp = 140;
  const maxStat = 70;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => { onHover(); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={picked}
      disabled={disabled}
      className="relative text-left focus-visible:outline-none"
      style={{
        width: '100%',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: (picked || hovered) && !disabled ? 'translateY(-6px) scale(1.03)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s',
        animation: `anim-charcard-enter 0.45s ease-out ${enterDelay}s both`,
      }}
    >
      {/* Outer glow ring when picked */}
      {picked && (
        <div className="absolute -inset-1 rounded-[18px] pointer-events-none" style={{
          background: `linear-gradient(135deg, ${frame.a}, ${frame.b})`,
          filter: `blur(8px)`,
          opacity: 0.7,
          animation: 'anim-mana-glow 2s ease-in-out infinite',
        }} />
      )}

      {/* Card body */}
      <div
        className="relative rounded-2xl"
        style={{
          background: 'linear-gradient(175deg, rgba(6,4,22,0.98) 0%, rgba(10,6,30,0.98) 100%)',
          border: picked
            ? `2px solid ${frame.solid}`
            : hovered
              ? `2px solid ${frame.a}80`
              : '2px solid rgba(80,60,120,0.45)',
          boxShadow: picked
            ? `0 0 30px ${frame.glow}, 0 0 60px ${frame.glow}40, inset 0 0 20px rgba(0,0,0,0.5)`
            : hovered
              ? `0 0 16px ${frame.glow}60, 0 8px 32px rgba(0,0,0,0.6)`
              : '0 4px 24px rgba(0,0,0,0.5)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {/* Frame gradient accent — top border stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${frame.b}, ${frame.a}, ${frame.b})`,
          zIndex: 10,
        }} />

        {/* Portrait — fills top portion, full bleed */}
        <div className="relative overflow-hidden" style={{ height: 220, background: `linear-gradient(180deg, ${frame.b}22 0%, transparent 100%)` }}>
          {portrait ? (
            <img
              src={portrait}
              alt={c.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 12%',
                imageRendering: 'auto',
                filter: disabled ? 'grayscale(0.7) brightness(0.5)' : hovered ? 'brightness(1.10) saturate(1.15) contrast(1.04)' : 'brightness(1.02) saturate(1.05)',
                transition: 'filter 0.25s',
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-orbitron font-black text-4xl"
              style={{ background: `linear-gradient(135deg, ${frame.b}60, ${frame.a}20)`, color: frame.a }}>
              {c.name.charAt(0)}
            </div>
          )}

          {/* Edge vignette — softened so art reads through */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: [
              'linear-gradient(to right, rgba(6,4,22,0.42) 0%, transparent 18%, transparent 82%, rgba(6,4,22,0.42) 100%)',
              'linear-gradient(to bottom, rgba(6,4,22,0.40) 0%, transparent 20%)',
            ].join(', '),
          }} />
          {/* Portrait bottom fade to card body */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(6,4,22,0.82) 55%, rgba(6,4,22,0.99) 100%)',
          }} />

          {/* Role badge(s) — top right */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 3, zIndex: 5 }}>
            <div style={{
              background: `linear-gradient(135deg, ${frame.b}ee, ${frame.a}bb)`,
              border: `1px solid ${frame.a}99`,
              borderRadius: 8,
              padding: '3px 9px',
              fontFamily: 'var(--font-orbitron, monospace)',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.10em',
              color: '#fff',
              textShadow: `0 0 10px ${frame.a}, 0 1px 2px rgba(0,0,0,0.9)`,
              boxShadow: `0 2px 10px ${frame.b}aa, inset 0 1px 0 rgba(255,255,255,0.10)`,
            }}>
              {roleLabel.toUpperCase()}
            </div>
            {c.secondaryRole && (() => {
              const sf = ROLE_FRAME[c.secondaryRole!];
              return (
                <div style={{
                  background: `linear-gradient(135deg, ${sf.b}ee, ${sf.a}bb)`,
                  border: `1px solid ${sf.a}99`,
                  borderRadius: 8,
                  padding: '3px 9px',
                  fontFamily: 'var(--font-orbitron, monospace)',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.10em',
                  color: '#fff',
                  textShadow: `0 0 10px ${sf.a}, 0 1px 2px rgba(0,0,0,0.9)`,
                  boxShadow: `0 2px 10px ${sf.b}aa, inset 0 1px 0 rgba(255,255,255,0.10)`,
                }}>
                  {(t.roles[c.secondaryRole!] ?? c.secondaryRole!).toUpperCase()}
                </div>
              );
            })()}
          </div>

          {/* Legacy badge — top-left, hidden when selected checkmark is showing */}
          {unlockedAchievementIds?.has(`legacy_${c.id}`) && !picked && (
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5 }}>
              <div style={{
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.55)',
                borderRadius: 8,
                padding: '2px 7px',
                fontFamily: 'var(--font-orbitron, monospace)',
                fontSize: 9,
                fontWeight: 900,
                color: '#fbbf24',
                letterSpacing: '0.08em',
                boxShadow: '0 0 8px rgba(251,191,36,0.30)',
              }}>⭐ LEGACY</div>
            </div>
          )}

          {/* Lock overlay */}
          {isLocked && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 8,
              background: 'rgba(0,0,0,0.72)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <div style={{
                fontFamily: 'var(--font-orbitron, monospace)',
                fontSize: 10, fontWeight: 900, color: '#fbbf24',
                letterSpacing: '0.08em', textAlign: 'center',
                textShadow: '0 0 10px rgba(251,191,36,0.6)',
              }}>{unlockLabel ?? `${unlockThreshold} pts`}</div>
            </div>
          )}

          {/* Selected checkmark */}
          {picked && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: frame.a,
              borderRadius: '50%',
              padding: 3,
              boxShadow: `0 0 12px ${frame.a}`,
              zIndex: 5,
            }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: '#0a0618' }} />
            </div>
          )}

          {/* Character name — overlaid on portrait bottom */}
          <div style={{
            position: 'absolute', bottom: 10, left: 12, right: 12, zIndex: 5,
          }}>
            <div style={{
              fontFamily: 'var(--font-orbitron, monospace)',
              fontSize: 15,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.04em',
              textShadow: `0 0 20px ${frame.glow}, 0 0 8px ${frame.a}88, 0 2px 4px rgba(0,0,0,0.95)`,
              lineHeight: 1.2,
            }}>
              {c.name}
            </div>
            {c.tagline && (
              <div style={{
                fontSize: 10,
                color: frame.a + 'dd',
                fontStyle: 'italic',
                marginTop: 2,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}>
                {c.tagline}
              </div>
            )}
          </div>
        </div>

        {/* Card lower section */}
        <div style={{ padding: '8px 12px 12px' }}>

          {/* Land/Water toggle for Sun-sin */}
          {hasWaterForm && (
            <div className="flex gap-0 mb-2" onClick={(e) => e.stopPropagation()}>
              {(['land', 'water'] as const).map((m) => (
                <div
                  key={m}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode(m)}
                  onKeyDown={(e) => e.key === 'Enter' && setMode(m)}
                  className="flex-1 text-center cursor-pointer transition-all"
                  style={{
                    padding: '3px 0',
                    borderRadius: m === 'land' ? '6px 0 0 6px' : '0 6px 6px 0',
                    background: mode === m
                      ? (m === 'land' ? 'rgba(134,239,172,0.18)' : 'rgba(56,189,248,0.18)')
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${mode === m
                      ? (m === 'land' ? 'rgba(134,239,172,0.55)' : 'rgba(56,189,248,0.55)')
                      : 'rgba(71,85,105,0.35)'}`,
                    fontFamily: 'var(--font-orbitron, monospace)',
                    fontSize: 8,
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    color: mode === m
                      ? (m === 'land' ? '#86efac' : '#38bdf8')
                      : '#475569',
                  }}
                >
                  {m === 'land' ? t.characterSelect.land : t.characterSelect.water}
                </div>
              ))}
            </div>
          )}

          {/* Stat bars */}
          <div className="space-y-1.5">
            {[
              { label: t.characterSelect.hp,    value: displayStats.hp,    max: maxHp,   color: '#4ade80' },
              { label: t.characterSelect.might,  value: displayStats.might, max: maxStat, color: '#fb923c' },
              { label: t.characterSelect.power,  value: displayStats.power, max: maxStat, color: '#60a5fa' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-0.5">
                  <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 9, color: '#94a3b8', letterSpacing: '0.12em' }}>{label.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 9, fontWeight: 700, color, textShadow: `0 0 6px ${color}99` }}>{value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (value / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color}cc, ${color})`,
                    borderRadius: 3,
                    boxShadow: `0 0 6px ${color}99, 0 0 2px ${color}`,
                    transition: 'width 0.3s ease-out',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Abilities divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, marginBottom: 5 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 7, letterSpacing: '0.22em', color: '#475569', textTransform: 'uppercase' }}>Abilities</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Ability badges row */}
          <div className="flex gap-1.5 flex-wrap">
            {c.badges.map((b) => (
              <AbilityBadgeButton key={b.name} badge={b} mode={hasWaterForm ? mode : undefined} t={t} frameColor={frame.a} />
            ))}
          </div>

          {/* Selected indicator */}
          {picked && (
            <div style={{
              marginTop: 8,
              textAlign: 'center',
              fontFamily: 'var(--font-orbitron, monospace)',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.3em',
              color: frame.a,
              textShadow: `0 0 8px ${frame.a}`,
            }}>
              ✦ SELECTED ✦
            </div>
          )}
        </div>

        {/* Bottom frame stripe */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${frame.b}, ${frame.a}, ${frame.b})`,
          opacity: picked ? 1 : 0.4,
        }} />

        {/* Foil shimmer overlay — shows on hover */}
        {hovered && !disabled && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
            animation: 'card-foil-sweep 0.55s ease-in-out forwards',
            borderRadius: 16,
          }} />
        )}
      </div>
    </button>
  );
}


function AbilityBadgeButton({ badge, mode, t, frameColor }: {
  badge: AbilityBadge;
  mode?: "land" | "water";
  t: ReturnType<typeof useT>['t'];
  frameColor?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const isWater = mode === "water" && (!!badge.waterDesc || !!badge.waterName);
  const isLandWithDual = mode === "land" && (!!badge.waterDesc || !!badge.waterName);
  const displayName = isWater && badge.waterName ? badge.waterName : badge.name;
  const displayDesc = isWater && badge.waterDesc ? badge.waterDesc : badge.desc;

  const kindColor =
    badge.kind === "passive"  ? '#a78bfa' :
    badge.kind === "ultimate" ? '#fbbf24' : '#60a5fa';

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{
        width: 28, height: 28,
        borderRadius: 6,
        border: `1.5px solid ${kindColor}60`,
        background: `${kindColor}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
        cursor: 'default',
        boxShadow: hovered ? `0 0 8px ${kindColor}60` : 'none',
        transition: 'box-shadow 0.15s',
      }}>
        {badge.icon}
      </div>

      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 pointer-events-none"
          style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.9))" }}
        >
          <div style={{
            background: 'rgba(4,2,18,0.98)',
            border: `1px solid ${frameColor ?? kindColor}50`,
            borderRadius: 10,
            padding: '8px 10px',
            boxShadow: `0 0 20px ${frameColor ?? kindColor}20`,
          }}>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span style={{ fontSize: 13 }}>{badge.icon}</span>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-orbitron, monospace)' }}>{displayName}</span>
              {badge.kind === "passive" && (
                <span style={{ fontSize: 8, color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 4, padding: '1px 4px', fontFamily: 'monospace' }}>
                  {t.archives.abilityKind.passive}
                </span>
              )}
              {badge.kind === "ultimate" && (
                <span style={{ fontSize: 8, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 4, padding: '1px 4px', fontFamily: 'monospace' }}>
                  {t.archives.abilityKind.ultimate}
                </span>
              )}
              {isWater && (
                <span style={{ fontSize: 8, color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 4, padding: '1px 4px', fontFamily: 'monospace' }}>
                  {t.archives.waterForm}
                </span>
              )}
            </div>
            <p style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.5 }}>{displayDesc || '—'}</p>
          </div>
          <div style={{ width: 8, height: 8, background: 'rgba(4,2,18,0.98)', border: `1px solid ${frameColor ?? kindColor}40`, borderRadius: 2, transform: 'rotate(45deg)', margin: '-4px auto 0', borderTop: 'none', borderLeft: 'none' }} />
        </div>
      )}
    </div>
  );
}
