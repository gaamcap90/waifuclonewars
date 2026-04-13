import React, { useState } from "react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";
import MusicPlayer from "@/components/MusicPlayer";

interface MainMenuProps {
  onStartGame: (mode: "singleplayer" | "multiplayer") => void;
  onArchives?: () => void;
  onSettings?: () => void;
  onRules?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  sub: string;
  icon: string;
  enabled: boolean;
  danger?: boolean;
  action?: () => void;
}

export default function MainMenu({ onStartGame, onArchives, onSettings, onRules }: MainMenuProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { t } = useT();

  const navItems: NavItem[] = [
    {
      id: "sp",
      label: t.menu.sp,
      sub: t.menu.spSub,
      icon: "⚔️",
      enabled: true,
      action: () => onStartGame("singleplayer"),
    },
    {
      id: "mp",
      label: t.menu.mp,
      sub: t.menu.mpSub,
      icon: "🏟️",
      enabled: true,
      action: () => onStartGame("multiplayer"),
    },
    {
      id: "rules",
      label: t.menu.rules,
      sub: t.menu.rulesSub,
      icon: "📖",
      enabled: true,
      action: onRules,
    },
    {
      id: "arch",
      label: t.menu.archives,
      sub: onArchives ? t.menu.archivesSub : t.menu.archivesSoon,
      icon: "📚",
      enabled: !!onArchives,
      action: onArchives,
    },
    {
      id: "set",
      label: t.menu.settings,
      sub: onSettings ? t.menu.settingsSub : t.menu.settingsSoon,
      icon: "⚙️",
      enabled: !!onSettings,
      action: onSettings,
    },
    {
      id: "quit",
      label: t.menu.quit,
      sub: t.menu.quitSub,
      icon: "🚪",
      enabled: true,
      danger: true,
      action: () => window.close(),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      <ArenaBackground />
      <MusicPlayer />

      {/* ── LEFT NAV PANEL ── */}
      <div className="relative z-10 flex flex-col justify-center w-[440px] shrink-0 pl-16 pr-12 py-16">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(2,4,14,0.97) 0%, rgba(2,4,14,0.88) 70%, transparent 100%)",
          }}
        />

        {/* Floating orbs — behind everything in the left panel */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', left: '15%', top: '22%',
            width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
            filter: 'blur(28px)',
            animation: 'anim-menu-orb 14s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', left: '55%', top: '60%',
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)',
            filter: 'blur(22px)',
            animation: 'anim-menu-orb 19s ease-in-out infinite reverse',
          }} />
          <div style={{
            position: 'absolute', left: '5%', top: '72%',
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.14) 0%, transparent 70%)',
            filter: 'blur(18px)',
            animation: 'anim-menu-orb 11s ease-in-out infinite',
            animationDelay: '-4s',
          }} />
        </div>

        <div className="relative z-10">
          {/* ── Logo ── */}
          <div className="mb-10">
            <p
              className="font-orbitron text-[10px] tracking-[0.5em] mb-4 uppercase"
              style={{ color: "#a78bfa" }}
            >
              {t.menu.presenter}
            </p>

            <h1
              className="font-orbitron font-black leading-none text-white"
              style={{ fontSize: "3rem", letterSpacing: "-0.02em" }}
            >
              {t.menu.title1}
            </h1>
            <h1
              className="font-orbitron font-black leading-none anim-title-breathe"
              style={{
                fontSize: "3rem",
                letterSpacing: "-0.02em",
                color: "#22d3ee",
              }}
            >
              {t.menu.title2}
            </h1>

            <p className="mt-4 text-slate-500 text-sm leading-relaxed whitespace-pre-line">
              {t.menu.description}
            </p>
          </div>

          {/* Separator — animated shimmer */}
          <div className="relative h-px mb-8 overflow-hidden" style={{ background: 'rgba(34,211,238,0.15)' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              width: '35%',
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.75), rgba(168,85,247,0.55), transparent)',
              animation: 'anim-separator-shimmer 3.2s ease-in-out infinite',
            }} />
          </div>

          {/* ── Nav Items ── */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isHov = hovered === item.id && item.enabled;
              const accentColor = item.danger ? "#ef4444" : "#22d3ee";

              const isPrimary = item.id === "sp";
              const primaryAccent = "#f59e0b";

              return (
                <button
                  key={item.id}
                  disabled={!item.enabled}
                  onClick={item.action}
                  onMouseEnter={() => item.enabled && setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="w-full text-left relative flex items-center gap-4 px-5 rounded-r-lg transition-all duration-150"
                  style={{
                    paddingTop: isPrimary ? '10px' : '10px',
                    paddingBottom: isPrimary ? '10px' : '10px',
                    background: isPrimary
                      ? isHov
                        ? `rgba(245,158,11,0.14)`
                        : `rgba(245,158,11,0.07)`
                      : isHov
                        ? item.danger ? "rgba(239,68,68,0.1)" : "rgba(34,211,238,0.07)"
                        : "transparent",
                    opacity: item.enabled ? 1 : 0.38,
                    cursor: item.enabled ? "pointer" : "default",
                    borderLeft: isPrimary ? `3px solid ${primaryAccent}cc` : '3px solid transparent',
                    boxShadow: isPrimary && isHov ? `inset 0 0 40px rgba(245,158,11,0.08)` : 'none',
                  }}
                >
                  {/* Left accent bar — hidden for primary (uses border instead) */}
                  {!isPrimary && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-150"
                      style={{
                        height: isHov ? "65%" : "0%",
                        background: accentColor,
                        boxShadow: isHov ? `0 0 8px ${accentColor}` : "none",
                      }}
                    />
                  )}

                  {/* Icon */}
                  <span className="text-xl shrink-0 w-7 text-center select-none"
                    style={isPrimary ? { filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.7))' } : undefined}>
                    {item.icon}
                  </span>

                  {/* Labels */}
                  <div
                    style={{
                      transform: isHov ? "translateX(5px)" : "translateX(0)",
                      transition: "transform 0.15s ease",
                      flex: 1,
                    }}
                  >
                    <div
                      className="font-orbitron font-semibold leading-tight"
                      style={{
                        fontSize: isPrimary ? '14px' : '13px',
                        color: isPrimary
                          ? isHov ? primaryAccent : `${primaryAccent}cc`
                          : isHov
                            ? item.danger ? "#f87171" : "#e2e8f0"
                            : item.danger ? "#f87171" : "#94a3b8",
                        transition: "color 0.15s ease",
                        textShadow: isPrimary ? `0 0 14px rgba(245,158,11,${isHov ? '0.55' : '0.25'})` : 'none',
                      }}
                    >
                      {item.label}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: isPrimary ? 'rgba(245,158,11,0.50)' : '#475569' }}>{item.sub}</div>
                  </div>

                  {/* Primary badge */}
                  {isPrimary && (
                    <span className="font-orbitron text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'rgba(245,158,11,0.18)', color: `${primaryAccent}cc`, border: `1px solid rgba(245,158,11,0.35)` }}>
                      STORY
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-10 text-slate-700 text-[11px] font-orbitron tracking-widest">
            {t.menu.footer}
          </div>
        </div>
      </div>

      {/* ── ARTWORK PANEL ── */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src="/art/group_splash.png"
          alt="Waifu Clone Wars battle scene"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.72) contrast(1.05)" }}
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(2,4,14,0.85) 0%, rgba(2,4,14,0.2) 25%, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,4,14,0.35) 0%, transparent 20%, transparent 75%, rgba(2,4,14,0.55) 100%)",
          }}
        />
      </div>
    </div>
  );
}
