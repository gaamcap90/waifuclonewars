import React, { useState } from "react";
import ArenaBackground from "@/ui/ArenaBackground";

interface MainMenuProps {
  onStartGame: (mode: "singleplayer" | "multiplayer") => void;
  onArchives?: () => void;
  onSettings?: () => void;
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

export default function MainMenu({ onStartGame, onArchives, onSettings }: MainMenuProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const navItems: NavItem[] = [
    {
      id: "sp",
      label: "Single Player",
      sub: "Roguelike Run",
      icon: "⚔️",
      enabled: true,
      action: () => onStartGame("singleplayer"),
    },
    {
      id: "mp",
      label: "Local Arena Battle",
      sub: "Two-player local match",
      icon: "🏟️",
      enabled: true,
      action: () => onStartGame("multiplayer"),
    },
    {
      id: "arch",
      label: "Historical Archives",
      sub: onArchives ? "Character Library" : "Character Library — Coming Soon",
      icon: "📚",
      enabled: !!onArchives,
      action: onArchives,
    },
    {
      id: "set",
      label: "Game Settings",
      sub: onSettings ? "Controls & Audio" : "Controls & Audio — Coming Soon",
      icon: "⚙️",
      enabled: !!onSettings,
      action: onSettings,
    },
    {
      id: "quit",
      label: "Quit",
      sub: "Exit game",
      icon: "🚪",
      enabled: true,
      danger: true,
      action: () => window.close(),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      <ArenaBackground />

      {/* ── LEFT NAV PANEL ── */}
      <div className="relative z-10 flex flex-col justify-center w-[440px] shrink-0 pl-16 pr-12 py-16">
        {/* Dark gradient behind the nav */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(2,4,14,0.97) 0%, rgba(2,4,14,0.88) 70%, transparent 100%)",
          }}
        />

        <div className="relative z-10">
          {/* ── Logo ── */}
          <div className="mb-10">
            <p
              className="font-orbitron text-[10px] tracking-[0.5em] mb-4 uppercase"
              style={{ color: "#a78bfa" }}
            >
              The Empire of Znyxorga Presents
            </p>

            <h1
              className="font-orbitron font-black leading-none text-white"
              style={{ fontSize: "3rem", letterSpacing: "-0.02em" }}
            >
              WAIFU
            </h1>
            <h1
              className="font-orbitron font-black leading-none"
              style={{
                fontSize: "3rem",
                letterSpacing: "-0.02em",
                color: "#22d3ee",
                textShadow: "0 0 40px rgba(34,211,238,0.65)",
              }}
            >
              CLONE WARS
            </h1>

            <p className="mt-3 text-slate-500 text-sm leading-relaxed">
              Historical legends reborn as anime warriors
              <br />
              in the galaxy's favourite battle arena.
            </p>
          </div>

          {/* Separator */}
          <div className="h-px mb-8 bg-gradient-to-r from-cyan-500/40 via-purple-500/20 to-transparent" />

          {/* ── Nav Items ── */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isHov = hovered === item.id && item.enabled;
              const accentColor = item.danger ? "#ef4444" : "#22d3ee";

              return (
                <button
                  key={item.id}
                  disabled={!item.enabled}
                  onClick={item.action}
                  onMouseEnter={() => item.enabled && setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="w-full text-left relative flex items-center gap-4 px-5 py-3 rounded-r-lg transition-colors duration-150"
                  style={{
                    background: isHov
                      ? item.danger
                        ? "rgba(239,68,68,0.1)"
                        : "rgba(34,211,238,0.07)"
                      : "transparent",
                    opacity: item.enabled ? 1 : 0.38,
                    cursor: item.enabled ? "pointer" : "default",
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-150"
                    style={{
                      height: isHov ? "65%" : "0%",
                      background: accentColor,
                      boxShadow: isHov ? `0 0 8px ${accentColor}` : "none",
                    }}
                  />

                  {/* Icon */}
                  <span className="text-xl shrink-0 w-7 text-center select-none">{item.icon}</span>

                  {/* Labels */}
                  <div
                    style={{
                      transform: isHov ? "translateX(5px)" : "translateX(0)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div
                      className="font-orbitron font-semibold text-[13px] leading-tight"
                      style={{
                        color: isHov
                          ? item.danger ? "#f87171" : "#e2e8f0"
                          : item.danger ? "#f87171" : "#94a3b8",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-10 text-slate-700 text-[11px] font-orbitron tracking-widest">
            v0.05 · WAIFU CLONE WARS
          </div>
        </div>
      </div>

      {/* ── ARTWORK PANEL ── */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src="/art/group_splash.jpg"
          alt="Waifu Clone Wars battle scene"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.72) contrast(1.05)" }}
          draggable={false}
        />
        {/* Left-edge fade into the nav panel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(2,4,14,0.85) 0%, rgba(2,4,14,0.2) 25%, transparent 55%)",
          }}
        />
        {/* Subtle vignette on other edges */}
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
