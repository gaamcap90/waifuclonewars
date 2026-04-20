import React, { useState } from "react";
import { AIIntent, Icon } from "@/types/game";

interface AIIntentBadgeProps {
  intents: AIIntent[];
  playerIcons?: Icon[];
  onHoverRange?: (range: number | null) => void;
}

const intentStyle: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  attack:  { bg: "rgba(180,20,20,0.90)",  border: "rgba(239,68,68,0.80)",  color: "#fca5a5", icon: "⚔" },
  ability: { bg: "rgba(160,60,10,0.90)",  border: "rgba(249,115,22,0.80)", color: "#fdba74", icon: "✦" },
  heal:    { bg: "rgba(10,100,50,0.90)",  border: "rgba(52,211,153,0.80)", color: "#6ee7b7", icon: "♥" },
  buff:    { bg: "rgba(100,80,0,0.90)",   border: "rgba(251,191,36,0.80)", color: "#fde68a", icon: "★" },
  upcoming_ability: { bg: "rgba(60,20,100,0.85)", border: "rgba(167,139,250,0.70)", color: "#c4b5fd", icon: "⏳" },
};

export default function AIIntentBadge({ intents, playerIcons, onHoverRange }: AIIntentBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  // Main intent: exclude upcoming_ability for hover range (use the active ability/attack range)
  const mainIntent = intents.find(i => i.type !== "buff" && i.type !== "upcoming_ability") ?? intents[0];
  // Active intents shown as primary badges
  const activeIntents = intents.filter(i => i.type !== "upcoming_ability");
  // Show only the most threatening upcoming ability (lowest turnsUntilReady)
  const allUpcoming = intents.filter(i => i.type === "upcoming_ability");
  const upcomingIntents = allUpcoming.length > 0
    ? [allUpcoming.reduce((best, cur) => (cur.turnsUntilReady ?? 99) < (best.turnsUntilReady ?? 99) ? cur : best)]
    : [];

  return (
    <div
      className="relative flex flex-col items-center gap-0.5"
      onMouseEnter={() => { setShowTip(true);  onHoverRange?.(mainIntent?.range ?? null); }}
      onMouseLeave={() => { setShowTip(false); onHoverRange?.(null); }}
    >
      {/* Active intents */}
      {activeIntents.map((intent, idx) => {
        const s = intentStyle[intent.type] ?? { bg: "rgba(40,40,60,0.90)", border: "rgba(100,100,140,0.70)", color: "#94a3b8", icon: "?" };
        return (
          <div
            key={idx}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-default select-none"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.color,
              boxShadow: `0 2px 8px rgba(0,0,0,0.50), 0 0 6px ${s.border}`,
              fontSize: "11px",
              fontFamily: "var(--font-orbitron, monospace)",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ fontSize: "10px" }}>{s.icon}</span>
            <span>{intent.label}</span>
          </div>
        );
      })}

      {/* Upcoming ability countdowns */}
      {upcomingIntents.map((intent, idx) => {
        const isNextTurn = (intent.turnsUntilReady ?? 0) <= 1;
        return (
          <div
            key={`up-${idx}`}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-default select-none"
            style={{
              background: isNextTurn ? "rgba(220,40,40,0.80)" : "rgba(60,20,100,0.80)",
              border: `1px solid ${isNextTurn ? "rgba(239,68,68,0.85)" : "rgba(167,139,250,0.65)"}`,
              color: isNextTurn ? "#fca5a5" : "#c4b5fd",
              boxShadow: isNextTurn ? "0 0 8px rgba(239,68,68,0.50)" : "0 2px 4px rgba(0,0,0,0.40)",
              fontSize: "10px",
              fontFamily: "var(--font-orbitron, monospace)",
              fontWeight: 700,
              letterSpacing: "0.03em",
              animation: isNextTurn ? "pulse 1s infinite" : undefined,
            }}
          >
            <span style={{ fontSize: "9px" }}>⏳</span>
            <span>{intent.turnsUntilReady ?? 0}t</span>
          </div>
        );
      })}

      {/* Tooltip */}
      {showTip && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-xl shadow-2xl min-w-[150px]"
          style={{
            background: "rgba(4,2,18,0.97)",
            border: "1px solid rgba(80,50,140,0.55)",
            padding: "8px 10px",
          }}
        >
          {activeIntents.map((intent, idx) => {
            const targetName = intent.targetId && playerIcons
              ? playerIcons.find(i => i.id === intent.targetId)?.name
              : undefined;
            return (
              <div key={idx} className={idx > 0 ? "mt-1.5 pt-1.5 border-t border-slate-800" : ""}>
                <div className="font-orbitron font-bold text-[11px] text-white">{intent.abilityName}</div>
                {targetName && <div className="text-[10px] text-yellow-300 mt-0.5">→ {targetName}</div>}
                {intent.damage  !== undefined && <div className="text-[10px] text-red-300 mt-0.5">~{Math.round(intent.damage)} dmg</div>}
                {intent.healing !== undefined && <div className="text-[10px] text-emerald-300 mt-0.5">Heal {intent.healing}</div>}
                {intent.range > 0 && <div className="text-[10px] text-slate-500 mt-0.5">Range {intent.range} (hover to preview)</div>}
              </div>
            );
          })}
          {upcomingIntents.map((intent, idx) => (
            <div key={`ut-${idx}`} className={activeIntents.length + idx > 0 ? "mt-1.5 pt-1.5 border-t border-slate-800" : ""}>
              <div className="font-orbitron font-bold text-[10px]" style={{ color: (intent.turnsUntilReady ?? 0) <= 1 ? "#fca5a5" : "#c4b5fd" }}>
                ⏳ {intent.abilityName}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(intent.turnsUntilReady ?? 0) <= 1
                  ? "🚨 Ready next turn!"
                  : `Ready in ${intent.turnsUntilReady} turns`}
              </div>
              {intent.range > 0 && <div className="text-[10px] text-slate-500 mt-0.5">Range {intent.range}</div>}
            </div>
          ))}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid rgba(80,50,140,0.55)" }} />
        </div>
      )}
    </div>
  );
}
