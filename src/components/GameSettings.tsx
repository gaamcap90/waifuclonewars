import React from "react";
import { ChevronLeft } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useAudio } from "@/hooks/useAudio";

interface Props {
  onBack: () => void;
}

const CONTROLS: { category: string; bindings: { action: string; key: string }[] }[] = [
  {
    category: "Unit Control",
    bindings: [
      { action: "Select unit", key: "Left-click portrait or token" },
      { action: "Move unit", key: "Click highlighted hex" },
      { action: "Undo movement", key: "Undo button" },
    ],
  },
  {
    category: "Combat",
    bindings: [
      { action: "Basic attack", key: "Select unit → click enemy" },
      { action: "Use ability", key: "Click ability → click target" },
      { action: "Play card", key: "Click card in hand" },
      { action: "Cancel targeting", key: "ESC  /  Right-click" },
    ],
  },
  {
    category: "Turn & Menu",
    bindings: [
      { action: "End turn", key: "End Turn button" },
      { action: "Open ESC menu", key: "ESC" },
      { action: "Resign game", key: "Resign button (left panel)" },
      { action: "View character details", key: "Click character portrait" },
    ],
  },
];

const RULES: { title: string; text: string }[] = [
  {
    title: "Cards Per Turn",
    text: "Each character may play up to 3 cards per turn. The card pip indicator (🃏) tracks remaining plays.",
  },
  {
    title: "Mana",
    text: "Both teams start with 5 mana per turn. Controlling the Mana Crystal grants +1 or +2 bonus mana.",
  },
  {
    title: "Movement",
    text: "Green tiles show valid movement. After moving, you can still attack or use abilities — but not undo. Red tiles show your attack/ability range.",
  },
  {
    title: "Terrain",
    text: "Different terrain pieces provide different bonuses and effects. Hover any tile during a match to see its detailed effects.",
  },
  {
    title: "Beast Camps",
    text: "Neutral beast camps attack any unit adjacent to them at end of turn: 50 dmg at range 1, 30 dmg at range 2. Defeat them to grant your whole team +15% Might & Power.",
  },
  {
    title: "Respawn",
    text: "Defeated units respawn at your base after 4 turns. They cannot act the turn they respawn.",
  },
  {
    title: "Ultimates",
    text: "Each character has one ultimate ability that exhausts permanently after use. Use them wisely.",
  },
  {
    title: "Victory",
    text: "Destroy the enemy base (150 HP) OR eliminate all enemy units before they can respawn back. Play aggressively!",
  },
  {
    title: "Roguelike Run",
    text: "In Single Player mode you run a gauntlet of 12 nodes per act across 3 acts. Win fights to earn gold, XP, and new cards. Characters level up and gain permanent stat points for the run.",
  },
  {
    title: "Items",
    text: "Items drop from Elite/Boss fights and can be bought from Merchants. Each character holds up to 5 items. Character-specific items enhance that character's unique abilities.",
  },
];

export default function GameSettings({ onBack }: Props) {
  const { settings, setMusicVolume, setSfxVolume, toggleMute } = useAudio();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header bar */}
        <div
          className="h-14 flex items-center px-6 border-b border-slate-800/60 shrink-0"
          style={{ background: "rgba(2,4,14,0.92)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" />
            MAIN MENU
          </button>
          <div className="mx-4 h-4 w-px bg-slate-700" />
          <span className="font-orbitron text-xs text-slate-500 tracking-widest">GAME SETTINGS</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-8 py-10 max-w-[900px] mx-auto w-full">
          <h1 className="font-orbitron font-black text-3xl text-white mb-1">Game Settings</h1>
          <p className="text-slate-500 text-sm mb-10">Controls reference and game rules overview.</p>

          {/* Controls section */}
          <section className="mb-12">
            <h2
              className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
              style={{ color: "#22d3ee" }}
            >
              Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CONTROLS.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-xl border border-slate-700/50 p-5"
                  style={{ background: "rgba(2,4,14,0.7)" }}
                >
                  <h3 className="font-orbitron font-semibold text-sm text-slate-200 mb-4">
                    {cat.category}
                  </h3>
                  <div className="space-y-3">
                    {cat.bindings.map((b) => (
                      <div key={b.action} className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-500">{b.action}</span>
                        <span className="text-[12px] text-cyan-300 font-mono">{b.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="h-px mb-12 bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-transparent" />

          {/* Game Rules section */}
          <section>
            <h2
              className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
              style={{ color: "#a78bfa" }}
            >
              Game Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RULES.map((rule) => (
                <div
                  key={rule.title}
                  className="rounded-xl border border-slate-700/40 p-4"
                  style={{ background: "rgba(2,4,14,0.6)" }}
                >
                  <h4 className="font-orbitron font-semibold text-sm text-slate-200 mb-1.5">
                    {rule.title}
                  </h4>
                  <p className="text-slate-400 text-[12px] leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Audio */}
          <section className="mt-12">
            <div className="h-px mb-10 bg-gradient-to-r from-purple-500/30 via-cyan-500/20 to-transparent" />
            <h2
              className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
              style={{ color: "#a78bfa" }}
            >
              Audio
            </h2>
            <div
              className="rounded-xl border border-slate-700/40 p-6 space-y-6"
              style={{ background: "rgba(2,4,14,0.6)" }}
            >
              {/* Mute toggle */}
              <div className="flex items-center justify-between">
                <span className="font-orbitron text-xs text-slate-300 tracking-wider">MUTE ALL</span>
                <button
                  onClick={toggleMute}
                  className={[
                    "w-12 h-6 rounded-full border transition-colors relative",
                    settings.muted
                      ? "bg-cyan-500 border-cyan-400"
                      : "bg-slate-700 border-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      settings.muted ? "translate-x-6" : "translate-x-0.5",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Music volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs text-slate-300 tracking-wider">MUSIC</span>
                  <span className="text-xs text-slate-500 font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.musicVolume}
                  onChange={e => setMusicVolume(parseFloat(e.target.value))}
                  disabled={settings.muted}
                  className="w-full accent-cyan-400 disabled:opacity-40"
                />
              </div>

              {/* SFX volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs text-slate-300 tracking-wider">SOUND EFFECTS</span>
                  <span className="text-xs text-slate-500 font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.sfxVolume}
                  onChange={e => setSfxVolume(parseFloat(e.target.value))}
                  disabled={settings.muted}
                  className="w-full accent-purple-400 disabled:opacity-40"
                />
              </div>

              <p className="text-slate-700 text-[11px] font-orbitron tracking-wider text-center pt-1">
                Drop audio files into /public/audio/ to enable
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-10 text-slate-700 text-[11px] font-orbitron text-center tracking-widest">
            v0.05 · WAIFU CLONE WARS · EMPIRE OF ZNYXORGA
          </div>
        </div>
      </div>
    </div>
  );
}
