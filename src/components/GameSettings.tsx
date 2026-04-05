import React, { useState, useEffect } from "react";
import { ChevronLeft, Volume2, VolumeX, Monitor, Gamepad2, BookOpen } from "lucide-react";
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
    text: "Neutral beast camps attack any unit adjacent to them at end of turn: 50 damage at range 1, 30 damage at range 2. Defeat them to grant your whole team +15% Might and Power.",
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
    text: "Destroy the enemy base (150 HP) OR eliminate all enemy units before they can respawn. Play aggressively!",
  },
  {
    title: "Roguelike Run",
    text: "In Single Player mode you run a gauntlet of 12 nodes per act across 3 acts. Win fights to earn gold, XP, and new cards. Characters level up and gain permanent stat points for the run.",
  },
  {
    title: "Items",
    text: "Items drop from Elite and Boss fights and can be bought from Merchants. Each character holds up to 5 items. Character-specific items enhance that character's unique abilities.",
  },
  {
    title: "Status Effects",
    text: "Armor Break: −25% Defense for 2 turns. Silence: Power drops to 0. Demoralize: 50% chance each turn to skip actions. Poison: −5 Might and Defense per turn, removed on heal. Mud Throw: −1 Movement for 2 turns.",
  },
  {
    title: "Arena Events",
    text: "During fights, random arena events may trigger: Gravity Surge doubles all movement, Forest Fire damages units on forest tiles, Laser Grid targets random hexes, and more. See the Historical Archives for full details.",
  },
];

const SCALE_PRESETS = [
  { label: "1920×1080", scale: 1.0, note: "Default" },
  { label: "1440×900",  scale: 0.75, note: "Medium" },
  { label: "1280×720",  scale: 0.67, note: "Small" },
  { label: "Auto",      scale: 0,   note: "Fit window" },
] as const;

type SettingsTab = 'general' | 'controls' | 'rules';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general',  label: 'General',    icon: <Monitor className="w-4 h-4" /> },
  { id: 'controls', label: 'Controls',   icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'rules',    label: 'Game Rules', icon: <BookOpen className="w-4 h-4" /> },
];

export default function GameSettings({ onBack }: Props) {
  const { settings, setMusicVolume, setSfxVolume, toggleMute } = useAudio();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [displayScale, setDisplayScale] = useState<number>(() => {
    const saved = localStorage.getItem("wcw_display_scale");
    return saved !== null ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    if (displayScale === 0 || displayScale === 1.0) {
      (document.documentElement.style as any).zoom = "";
    } else {
      (document.documentElement.style as any).zoom = String(displayScale);
    }
  }, [displayScale]);

  const applyScale = (scale: number) => {
    setDisplayScale(scale);
    localStorage.setItem("wcw_display_scale", String(scale));
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center px-6 border-b border-slate-800/60 shrink-0"
          style={{ background: "rgba(2,4,14,0.96)" }}>
          <button onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
            <ChevronLeft className="w-4 h-4" /> MAIN MENU
          </button>
          <div className="mx-4 h-4 w-px bg-slate-700" />
          <span className="font-orbitron text-xs text-slate-500 tracking-widest">GAME SETTINGS</span>
        </div>

        {/* Tab bar */}
        <div className="border-b border-slate-800/80 px-6 shrink-0"
          style={{ background: "rgba(2,4,14,0.97)" }}>
          <div className="flex gap-1 max-w-4xl mx-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
          <div className="max-w-4xl mx-auto px-8 py-10">

            {/* ── GENERAL TAB ── */}
            {activeTab === 'general' && (
              <div className="space-y-10">
                {/* Audio */}
                <section>
                  <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                    style={{ color: "#a78bfa" }}>Audio</h2>
                  <div className="rounded-xl border border-slate-700/40 p-6 space-y-6"
                    style={{ background: "rgba(2,4,14,0.7)" }}>

                    {/* Mute toggle — green = audio on, gray = muted */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {settings.muted
                          ? <VolumeX className="w-4 h-4 text-slate-500" />
                          : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        <span className="font-orbitron text-xs tracking-wider"
                          style={{ color: settings.muted ? '#64748b' : '#d1fae5' }}>
                          {settings.muted ? 'AUDIO MUTED' : 'AUDIO ON'}
                        </span>
                      </div>
                      <button onClick={toggleMute}
                        className="w-12 h-6 rounded-full border transition-all relative"
                        style={{
                          background: settings.muted ? 'rgba(51,65,85,0.9)' : 'rgba(16,185,129,0.8)',
                          borderColor: settings.muted ? '#475569' : '#34d399',
                          boxShadow: settings.muted ? 'none' : '0 0 10px rgba(52,211,153,0.4)',
                        }}>
                        <span className={[
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                          settings.muted ? "translate-x-0.5" : "translate-x-6",
                        ].join(" ")} />
                      </button>
                    </div>

                    {/* Music volume */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-xs text-slate-300 tracking-wider">MUSIC</span>
                        <span className="text-xs font-mono"
                          style={{ color: settings.muted ? '#475569' : '#94a3b8' }}>
                          {Math.round(settings.musicVolume * 100)}%
                        </span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01}
                        value={settings.musicVolume}
                        onChange={e => setMusicVolume(parseFloat(e.target.value))}
                        disabled={settings.muted}
                        className="w-full accent-cyan-400 disabled:opacity-30 cursor-pointer"
                      />
                    </div>

                    {/* SFX volume */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-xs text-slate-300 tracking-wider">SOUND EFFECTS</span>
                        <span className="text-xs font-mono"
                          style={{ color: settings.muted ? '#475569' : '#94a3b8' }}>
                          {Math.round(settings.sfxVolume * 100)}%
                        </span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01}
                        value={settings.sfxVolume}
                        onChange={e => setSfxVolume(parseFloat(e.target.value))}
                        disabled={settings.muted}
                        className="w-full accent-purple-400 disabled:opacity-30 cursor-pointer"
                      />
                    </div>

                    <p className="text-slate-700 text-[11px] font-orbitron tracking-wider text-center pt-1">
                      Drop audio files into /public/audio/ to enable
                    </p>
                  </div>
                </section>

                {/* Display */}
                <section>
                  <div className="h-px mb-8 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                  <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                    style={{ color: "#22d3ee" }}>Display</h2>
                  <div className="rounded-xl border border-slate-700/40 p-6"
                    style={{ background: "rgba(2,4,14,0.7)" }}>
                    <div className="font-orbitron text-xs text-slate-300 tracking-wider mb-4">RESOLUTION SCALE</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SCALE_PRESETS.map(({ label, scale, note }) => {
                        const active = displayScale === scale;
                        return (
                          <button key={label} onClick={() => applyScale(scale)}
                            className="flex flex-col items-center gap-1 rounded-lg px-4 py-3 border transition-all"
                            style={{
                              background: active ? "rgba(6,182,212,0.10)" : "rgba(2,4,14,0.70)",
                              borderColor: active ? "rgba(6,182,212,0.60)" : "rgba(100,116,139,0.40)",
                              boxShadow: active ? "0 0 14px rgba(6,182,212,0.14)" : "none",
                              color: active ? "#67e8f9" : "#94a3b8",
                            }}>
                            <span className="font-orbitron text-sm font-semibold">{label}</span>
                            <span className="text-[10px] opacity-60">{note}</span>
                            {active && <span className="text-[9px] text-cyan-400 font-orbitron tracking-wider">ACTIVE</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-slate-600 text-[11px] mt-3 font-orbitron tracking-wider">
                      Scales the entire game UI. Takes effect immediately.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* ── CONTROLS TAB ── */}
            {activeTab === 'controls' && (
              <div>
                <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                  style={{ color: "#22d3ee" }}>Controls Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {CONTROLS.map(cat => (
                    <div key={cat.category} className="rounded-xl border border-slate-700/50 p-5"
                      style={{ background: "rgba(2,4,14,0.7)" }}>
                      <h3 className="font-orbitron font-semibold text-sm text-slate-200 mb-4">
                        {cat.category}
                      </h3>
                      <div className="space-y-3">
                        {cat.bindings.map(b => (
                          <div key={b.action} className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-slate-500">{b.action}</span>
                            <span className="text-[12px] text-cyan-300 font-mono">{b.key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-xl border border-slate-700/30 p-5"
                  style={{ background: "rgba(2,4,14,0.5)" }}>
                  <p className="text-slate-500 text-xs font-orbitron tracking-wider text-center">
                    Full keyboard remapping support coming in a future update.
                  </p>
                </div>
              </div>
            )}

            {/* ── GAME RULES TAB ── */}
            {activeTab === 'rules' && (
              <div>
                <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                  style={{ color: "#a78bfa" }}>Game Rules</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RULES.map(rule => (
                    <div key={rule.title} className="rounded-xl border border-slate-700/40 p-4"
                      style={{ background: "rgba(2,4,14,0.7)" }}>
                      <h4 className="font-orbitron font-semibold text-sm text-slate-200 mb-1.5">
                        {rule.title}
                      </h4>
                      <p className="text-slate-400 text-[12px] leading-relaxed">{rule.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-slate-700 text-[11px] font-orbitron text-center tracking-widest">
              v0.12 · WAIFU CLONE WARS · EMPIRE OF ZNYXORGA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
