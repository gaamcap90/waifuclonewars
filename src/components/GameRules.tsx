import React from "react";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";

interface GameRulesProps {
  onBack: () => void;
}

export default function GameRules({ onBack }: GameRulesProps) {
  const { t } = useT();
  const entries = t.settings.rules.entries;

  // Group entries by category, preserving insertion order
  const categories: string[] = [];
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const cat = (entry as any).category as string ?? '';
    if (!grouped[cat]) { grouped[cat] = []; categories.push(cat); }
    grouped[cat].push(entry);
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <ArenaBackground />
      <div className="relative z-10 flex-1 flex flex-col overflow-auto px-8 py-10 max-w-[960px] mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <button
            onClick={onBack}
            className="font-orbitron text-[11px] tracking-widest text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-slate-700/50 hover:border-slate-500"
          >
            ← BACK
          </button>
          <div>
            <p className="font-orbitron text-[10px] tracking-[0.5em] text-purple-400 mb-1">EMPIRE OF ZNYXORGA</p>
            <h1
              className="font-orbitron font-black text-4xl text-white"
              style={{ textShadow: '0 0 30px rgba(167,139,250,0.5)' }}
            >
              GAME RULES
            </h1>
          </div>
        </div>

        {/* Rules by category */}
        <div className="pb-8 space-y-8">
          {categories.map(cat => (
            <div key={cat}>
              {cat && (
                <h2
                  className="font-orbitron font-bold text-purple-300 text-xs tracking-[0.35em] uppercase mb-4 pb-2 border-b border-purple-500/20"
                  style={{ textShadow: '0 0 12px rgba(167,139,250,0.35)' }}
                >
                  {cat}
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped[cat].map((entry, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-700/40 p-5"
                    style={{ background: 'rgba(2,4,14,0.80)' }}
                  >
                    <h3 className="font-orbitron font-bold text-white text-sm mb-2"
                      style={{ textShadow: '0 0 12px rgba(167,139,250,0.4)' }}>
                      {entry.title}
                    </h3>
                    <p className="text-slate-300 text-[12px] leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
