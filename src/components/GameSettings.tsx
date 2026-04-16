import React, { useState, useEffect } from "react";
import { ChevronLeft, Volume2, VolumeX, Monitor, Gamepad2, Globe } from "lucide-react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useAudio } from "@/hooks/useAudio";
import { useT, LANG_LABELS, Language } from "@/i18n";
import { clearTutorialDone } from "@/hooks/useTutorialState";

interface Props {
  onBack: () => void;
  onReplayTutorial?: () => void;
}

const SCALE_PRESETS_BASE = [
  { scale: 1.0 },
  { scale: 0.75 },
  { scale: 0.67 },
  { scale: 0 },
] as const;

type SettingsTab = 'general' | 'controls';

export default function GameSettings({ onBack, onReplayTutorial }: Props) {
  const { settings, setMusicVolume, setSfxVolume, toggleMute } = useAudio();
  const { t, lang, setLang } = useT();
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

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',  label: t.settings.tabs.general,   icon: <Monitor className="w-4 h-4" /> },
    { id: 'controls', label: t.settings.tabs.controls,  icon: <Gamepad2 className="w-4 h-4" /> },
  ];

  const CONTROLS_DATA = [
    {
      category: t.settings.controls.categories.unitControl,
      bindings: [
        { action: t.settings.controls.actions.selectUnit,   key: t.settings.controls.keys.clickPortrait },
        { action: t.settings.controls.actions.moveUnit,     key: t.settings.controls.keys.clickHex },
        { action: t.settings.controls.actions.undoMovement, key: t.settings.controls.keys.undoBtn },
        { action: t.settings.controls.actions.panBoard,     key: t.settings.controls.keys.clickDrag },
      ],
    },
    {
      category: t.settings.controls.categories.combat,
      bindings: [
        { action: t.settings.controls.actions.basicAttack,      key: t.settings.controls.keys.selectClickEnemy },
        { action: t.settings.controls.actions.useAbility,       key: t.settings.controls.keys.clickAbilityTarget },
        { action: t.settings.controls.actions.playCard,         key: t.settings.controls.keys.clickCard },
        { action: t.settings.controls.actions.cancelTargeting,  key: t.settings.controls.keys.escRightClick },
        { action: t.settings.controls.actions.inspectEnemy,     key: t.settings.controls.keys.clickEnemyNoTarget },
      ],
    },
    {
      category: t.settings.controls.categories.turnMenu,
      bindings: [
        { action: t.settings.controls.actions.endTurn,       key: t.settings.controls.keys.endTurnBtn },
        { action: t.settings.controls.actions.openEsc,       key: t.settings.controls.keys.esc },
        { action: t.settings.controls.actions.resignGame,    key: t.settings.controls.keys.resignBtn },
        { action: t.settings.controls.actions.viewCharacter, key: t.settings.controls.keys.clickPortrait2 },
        { action: t.settings.controls.actions.hideUI,        key: t.settings.controls.keys.hKey },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center px-6 border-b border-slate-800/60 shrink-0"
          style={{ background: "rgba(2,4,14,0.96)" }}>
          <button onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-orbitron text-xs tracking-wider">
            <ChevronLeft className="w-4 h-4" /> {t.mainMenu}
          </button>
          <div className="mx-4 h-4 w-px bg-slate-700" />
          <span className="font-orbitron text-xs text-slate-500 tracking-widest">{t.settings.title}</span>
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
                {/* Language */}
                <section>
                  <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                    style={{ color: "#a78bfa" }}>{t.settings.language.section}</h2>
                  <div className="rounded-xl border border-slate-700/40 p-6"
                    style={{ background: "rgba(2,4,14,0.7)" }}>
                    <div className="font-orbitron text-xs text-slate-300 tracking-wider mb-4 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-purple-400" />
                      {t.settings.language.label}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {(Object.keys(LANG_LABELS) as Language[]).map(l => {
                        const active = lang === l;
                        return (
                          <button key={l} onClick={() => setLang(l)}
                            className="flex flex-col items-center gap-1 rounded-lg px-3 py-3 border transition-all"
                            style={{
                              background: active ? "rgba(167,139,250,0.12)" : "rgba(2,4,14,0.70)",
                              borderColor: active ? "rgba(167,139,250,0.60)" : "rgba(100,116,139,0.40)",
                              boxShadow: active ? "0 0 14px rgba(167,139,250,0.14)" : "none",
                              color: active ? "#c4b5fd" : "#94a3b8",
                            }}>
                            <span className="font-orbitron text-[11px] font-semibold text-center leading-tight">
                              {LANG_LABELS[l]}
                            </span>
                            {active && <span className="text-[9px] text-purple-400 font-orbitron tracking-wider">{t.active}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Display */}
                <section>
                  <div className="h-px mb-8 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                  <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                    style={{ color: "#22d3ee" }}>{t.settings.display.section}</h2>
                  <div className="rounded-xl border border-slate-700/40 p-6"
                    style={{ background: "rgba(2,4,14,0.7)" }}>
                    <div className="font-orbitron text-xs text-slate-300 tracking-wider mb-4">
                      {t.settings.display.resolutionScale}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SCALE_PRESETS_BASE.map(({ scale }, idx) => {
                        const preset = t.settings.display.presets[idx];
                        const active = displayScale === scale;
                        return (
                          <button key={preset.label} onClick={() => applyScale(scale)}
                            className="flex flex-col items-center gap-1 rounded-lg px-4 py-3 border transition-all"
                            style={{
                              background: active ? "rgba(6,182,212,0.10)" : "rgba(2,4,14,0.70)",
                              borderColor: active ? "rgba(6,182,212,0.60)" : "rgba(100,116,139,0.40)",
                              boxShadow: active ? "0 0 14px rgba(6,182,212,0.14)" : "none",
                              color: active ? "#67e8f9" : "#94a3b8",
                            }}>
                            <span className="font-orbitron text-sm font-semibold">{preset.label}</span>
                            <span className="text-[10px] opacity-60">{preset.note}</span>
                            {active && <span className="text-[9px] text-cyan-400 font-orbitron tracking-wider">{t.active}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-slate-600 text-[11px] mt-3 font-orbitron tracking-wider">
                      {t.settings.display.hint}
                    </p>
                  </div>
                </section>

                {/* Audio */}
                <section>
                  <div className="h-px mb-8 bg-gradient-to-r from-purple-500/20 to-transparent" />
                  <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                    style={{ color: "#a78bfa" }}>{t.settings.audio.section}</h2>
                  <div className="rounded-xl border border-slate-700/40 p-6 space-y-6"
                    style={{ background: "rgba(2,4,14,0.7)" }}>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {settings.muted
                          ? <VolumeX className="w-4 h-4 text-slate-500" />
                          : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        <span className="font-orbitron text-xs tracking-wider"
                          style={{ color: settings.muted ? '#64748b' : '#d1fae5' }}>
                          {settings.muted ? t.settings.audio.muted : t.settings.audio.on}
                        </span>
                      </div>
                      <button onClick={toggleMute}
                        className="w-12 h-6 rounded-full border transition-all relative overflow-hidden"
                        style={{
                          background: settings.muted ? 'rgba(51,65,85,0.9)' : 'rgba(16,185,129,0.8)',
                          borderColor: settings.muted ? '#475569' : '#34d399',
                          boxShadow: settings.muted ? 'none' : '0 0 10px rgba(52,211,153,0.4)',
                        }}>
                        <span className={[
                          "absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200",
                          settings.muted ? "left-[3px]" : "left-[25px]",
                        ].join(" ")} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-xs text-slate-300 tracking-wider">{t.settings.audio.music}</span>
                        <span className="text-xs font-mono" style={{ color: settings.muted ? '#475569' : '#94a3b8' }}>
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

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-xs text-slate-300 tracking-wider">{t.settings.audio.sfx}</span>
                        <span className="text-xs font-mono" style={{ color: settings.muted ? '#475569' : '#94a3b8' }}>
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
                      {t.settings.audio.hint}
                    </p>
                  </div>
                </section>

                {/* Tutorial section */}
                <section>
                  <h2 className="font-orbitron font-bold text-[11px] tracking-[0.35em] uppercase mb-4"
                    style={{ color: "#22d3ee" }}>{t.settingsTutorial.sectionTitle}</h2>
                  <div className="flex items-center justify-between rounded-xl p-4"
                    style={{ background: 'rgba(4,2,18,0.6)', border: '1px solid rgba(34,211,238,0.12)' }}>
                    <div>
                      <p className="font-orbitron font-bold text-[12px] text-slate-200">{t.settingsTutorial.replayLabel}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{t.settingsTutorial.replayDesc}</p>
                    </div>
                    <button
                      onClick={() => {
                        clearTutorialDone();
                        if (onReplayTutorial) onReplayTutorial();
                        else onBack();
                      }}
                      className="font-orbitron font-bold text-[10px] tracking-[0.18em] uppercase rounded-lg px-4 py-2 transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(6,182,212,0.15))',
                        border: '1px solid rgba(34,211,238,0.40)',
                        color: '#22d3ee',
                      }}
                    >
                      {t.settingsTutorial.replayBtn}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ── CONTROLS TAB ── */}
            {activeTab === 'controls' && (
              <div>
                <h2 className="font-orbitron text-[11px] tracking-[0.5em] mb-6 uppercase"
                  style={{ color: "#22d3ee" }}>{t.settings.controls.section}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {CONTROLS_DATA.map(cat => (
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
                    {t.settings.controls.note}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-slate-700 text-[11px] font-orbitron text-center tracking-widest">
              {t.settings.footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
