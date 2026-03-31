import React, { useState } from "react";
import { AIIntent } from "@/types/game";

interface AIIntentBadgeProps {
  intents: AIIntent[];                             // all intents for this icon (up to 2)
  onHoverRange?: (range: number | null) => void;
}

const intentIcon: Record<string, string> = {
  attack:  "⚔",
  ability: "✦",
  heal:    "♥",
  buff:    "★",
};

const intentBg: Record<string, string> = {
  attack:  "bg-red-700/95 border-red-400",
  ability: "bg-orange-700/95 border-orange-400",
  heal:    "bg-emerald-700/95 border-emerald-400",
  buff:    "bg-yellow-600/95 border-yellow-400",
};

export default function AIIntentBadge({ intents, onHoverRange }: AIIntentBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  // The main (non-buff) intent drives the range highlight
  const mainIntent = intents.find(i => i.type !== 'buff') ?? intents[0];
  // Sort: buff on top, main attack/ability below
  const sorted = [...intents].sort((a, b) =>
    a.type === 'buff' ? -1 : b.type === 'buff' ? 1 : 0
  );

  return (
    <div
      className="relative flex flex-col items-center gap-0.5"
      onMouseEnter={() => { setShowTip(true);  onHoverRange?.(mainIntent?.range ?? null); }}
      onMouseLeave={() => { setShowTip(false); onHoverRange?.(null); }}
    >
      {sorted.map((intent, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-white text-xs font-bold shadow-lg cursor-default select-none ${intentBg[intent.type] ?? "bg-gray-700/90 border-gray-500"}`}
        >
          <span>{intentIcon[intent.type] ?? "?"}</span>
          <span>{intent.label}</span>
        </div>
      ))}

      {/* Tooltip */}
      {showTip && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-black/90 text-white text-xs rounded px-2 py-1.5 border border-gray-600 shadow-xl pointer-events-none min-w-[120px]">
          {sorted.map((intent, idx) => (
            <div key={idx} className={idx > 0 ? "mt-1 pt-1 border-t border-gray-700" : ""}>
              <div className="font-semibold">{intent.abilityName}</div>
              {intent.damage  !== undefined && <div className="text-red-300">Dmg: ~{Math.round(intent.damage)}</div>}
              {intent.healing !== undefined && <div className="text-green-300">Heal: {intent.healing}</div>}
              {intent.type === 'buff' && <div className="text-yellow-300">Buff applied before attack</div>}
              {intent.range > 0 && <div className="text-gray-400">Range: {intent.range}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
