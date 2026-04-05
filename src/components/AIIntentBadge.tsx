import React, { useState } from "react";
import { AIIntent } from "@/types/game";

interface AIIntentBadgeProps {
  intents: AIIntent[];
  onHoverRange?: (range: number | null) => void;
}

const intentStyle: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  attack:  { bg: "rgba(180,20,20,0.90)",  border: "rgba(239,68,68,0.80)",  color: "#fca5a5", icon: "⚔" },
  ability: { bg: "rgba(160,60,10,0.90)",  border: "rgba(249,115,22,0.80)", color: "#fdba74", icon: "✦" },
  heal:    { bg: "rgba(10,100,50,0.90)",  border: "rgba(52,211,153,0.80)", color: "#6ee7b7", icon: "♥" },
  buff:    { bg: "rgba(100,80,0,0.90)",   border: "rgba(251,191,36,0.80)", color: "#fde68a", icon: "★" },
};

export default function AIIntentBadge({ intents, onHoverRange }: AIIntentBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  const mainIntent = intents.find(i => i.type !== "buff") ?? intents[0];
  const sorted = [...intents].sort((a, b) => a.type === "buff" ? -1 : b.type === "buff" ? 1 : 0);

  return (
    <div
      className="relative flex flex-col items-center gap-0.5"
      onMouseEnter={() => { setShowTip(true);  onHoverRange?.(mainIntent?.range ?? null); }}
      onMouseLeave={() => { setShowTip(false); onHoverRange?.(null); }}
    >
      {sorted.map((intent, idx) => {
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

      {/* Tooltip */}
      {showTip && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-xl shadow-2xl min-w-[130px]"
          style={{
            background: "rgba(4,2,18,0.97)",
            border: "1px solid rgba(80,50,140,0.55)",
            padding: "8px 10px",
          }}
        >
          {sorted.map((intent, idx) => (
            <div key={idx} className={idx > 0 ? "mt-1.5 pt-1.5 border-t border-slate-800" : ""}>
              <div className="font-orbitron font-bold text-[11px] text-white">{intent.abilityName}</div>
              {intent.damage  !== undefined && <div className="text-[10px] text-red-300 mt-0.5">Dmg ~{Math.round(intent.damage)}</div>}
              {intent.healing !== undefined && <div className="text-[10px] text-emerald-300 mt-0.5">Heal {intent.healing}</div>}
              {intent.type === "buff" && <div className="text-[10px] text-yellow-300 mt-0.5">Buff before attack</div>}
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
