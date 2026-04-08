// src/components/EnemyAbilityHUD.tsx
// Persistent right-side panel showing every alive enemy's abilities and their turn-countdown timers.
// Cooldown 0 = ability fires THIS turn (pulsing red warning).
// Cooldown 1 = fires NEXT turn (orange).
// Cooldown 2+ = grey countdown.

import React, { useState } from "react";
import { GameState } from "@/types/game";
import type { EnemyAbilityDef } from "@/types/roguelike";
import { useT } from "@/i18n";

interface Props {
  gameState: GameState;
}

const cooldownColor = (cd: number) => {
  if (cd === 0) return { bg: "rgba(200,20,20,0.85)", border: "rgba(239,68,68,0.90)", text: "#fca5a5", label: "READY" };
  if (cd === 1) return { bg: "rgba(160,80,0,0.85)",  border: "rgba(251,146,60,0.90)", text: "#fdba74", label: "1t" };
  return        { bg: "rgba(30,20,50,0.80)",  border: "rgba(100,80,130,0.50)", text: "#94a3b8", label: `${cd}t` };
};

function AbilityPill({ ab, cooldown }: { ab: EnemyAbilityDef; cooldown: number }) {
  const [tip, setTip] = useState(false);
  const { t } = useT();
  const c = cooldownColor(cooldown);
  const isReady = cooldown === 0;
  const isWarning = cooldown === 1;
  const pillLabel = isReady ? t.game.hud.ready : c.label;

  return (
    <div className="relative"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-default select-none transition-all"
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          boxShadow: isReady ? `0 0 10px rgba(239,68,68,0.45)` : isWarning ? `0 0 6px rgba(251,146,60,0.35)` : "none",
          animation: isReady ? "pulse 1s ease-in-out infinite" : undefined,
        }}
      >
        <span style={{ fontSize: 13 }}>{ab.icon}</span>
        <span className="font-orbitron text-[10px] font-bold truncate max-w-[90px]" style={{ color: c.text }}>
          {ab.name}
        </span>
        <span
          className="ml-auto font-orbitron font-black text-[10px] shrink-0"
          style={{
            color: c.text,
            textShadow: isReady ? "0 0 6px rgba(239,68,68,0.8)" : "none",
          }}
        >
          {pillLabel}
        </span>
      </div>

      {/* Tooltip on hover */}
      {tip && (
        <div
          className="absolute right-full mr-2 top-0 z-50 pointer-events-none rounded-xl shadow-2xl w-[220px]"
          style={{
            background: "rgba(4,2,18,0.98)",
            border: "1px solid rgba(100,70,160,0.60)",
            padding: "8px 10px",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 16 }}>{ab.icon}</span>
            <span className="font-orbitron font-bold text-[11px] text-white">{ab.name}</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-snug">{ab.description}</p>
          <div className="flex gap-2 mt-1.5">
            <span className="text-[9px] text-slate-500">{t.game.hud.cooldownLabel.replace('{n}', String(ab.cooldown))}</span>
            {ab.effect?.range && <span className="text-[9px] text-slate-500">{t.game.hud.rangeLabel.replace('{n}', String(ab.effect.range))}</span>}
          </div>
          {isReady && (
            <div className="mt-1.5 text-[10px] font-bold text-red-400 font-orbitron">{t.game.hud.firesThisTurn}</div>
          )}
          {isWarning && (
            <div className="mt-1.5 text-[10px] font-bold text-orange-400 font-orbitron">{t.game.hud.readyNextTurn}</div>
          )}
          {/* Arrow pointing right toward the pill */}
          <div className="absolute top-3 left-full w-0 h-0"
            style={{ borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "4px solid rgba(100,70,160,0.60)" }} />
        </div>
      )}
    </div>
  );
}

export default function EnemyAbilityHUD({ gameState }: Props) {
  const { t } = useT();
  const enemies = gameState.players[1]?.icons.filter(i => i.isAlive) ?? [];

  // Only show enemies that actually have abilities
  const enemiesWithAbilities = enemies.filter(e => {
    const abs = (e as any).enemyAbilities as EnemyAbilityDef[] | undefined;
    return abs && abs.length > 0;
  });

  if (enemiesWithAbilities.length === 0) return null;

  return (
    <div
      className="w-[280px] rounded-xl"
      style={{
        background: "linear-gradient(180deg, rgba(28,4,8,0.96) 0%, rgba(16,2,4,0.96) 100%)",
        border: "1px solid rgba(220,60,60,0.40)",
        boxShadow: "0 4px 18px rgba(160,20,20,0.14)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          background: "linear-gradient(90deg, rgba(160,20,20,0.30) 0%, transparent 80%)",
          borderBottom: "1px solid rgba(220,60,60,0.22)",
        }}
      >
        <span className="text-sm">⚔️</span>
        <span className="font-orbitron text-[10px] tracking-widest text-red-300 font-bold">{t.game.hud.enemyAbilities}</span>
        <span className="ml-auto text-[9px] font-orbitron text-slate-600">{t.game.hud.hoverForDetails}</span>
      </div>

      {/* Enemy list */}
      <div className="px-2.5 py-2 space-y-2.5">
        {enemiesWithAbilities.map(enemy => {
          const abilities = (enemy as any).enemyAbilities as EnemyAbilityDef[];
          const cooldowns: Record<string, number> = (enemy as any).enemyAbilityCooldowns ?? {};

          const portrait = (enemy as any).portrait as string | undefined;
          const description = (enemy as any).enemyDescription as string | undefined;
          return (
            <div key={enemy.id}>
              {/* Enemy name row */}
              <div className="flex items-center gap-2 mb-1">
                {portrait ? (
                  <img src={portrait} alt={enemy.name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                    style={{ border: "1px solid rgba(220,60,60,0.50)" }} />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[13px]"
                    style={{ background: "rgba(200,30,30,0.25)", border: "1px solid rgba(220,60,60,0.40)" }}>
                    {enemy.name === "Combat Drone" ? "⚙" : enemy.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-orbitron text-[10px] text-slate-300 truncate block">{enemy.name}</span>
                  <div className="h-1 w-full rounded-full overflow-hidden bg-slate-800 mt-0.5">
                    <div className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${(enemy.stats.hp / enemy.stats.maxHp) * 100}%` }} />
                  </div>
                </div>
              </div>
              {description && (
                <p className="text-[9px] text-slate-500 leading-snug mb-1.5 pl-1 italic">{description}</p>
              )}

              {/* Ability pills */}
              <div className="space-y-1 pl-1">
                {abilities
                  .filter(ab => !ab.oncePerFight || (cooldowns[ab.id] ?? 0) < 999)
                  .map(ab => {
                    const cd = cooldowns[ab.id] ?? 0;
                    // oncePerFight abilities at 999 cooldown are exhausted — skip
                    if (cd >= 999) return null;
                    return <AbilityPill key={ab.id} ab={ab} cooldown={cd} />;
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(60,20,20,0.50)", background: "rgba(10,2,4,0.50)" }}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: "0 0 4px rgba(239,68,68,0.7)" }} />
          <span className="text-[9px] text-slate-600 font-orbitron">{t.game.hud.ready}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-[9px] text-slate-600 font-orbitron">{t.game.hud.nextTurn}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="text-[9px] text-slate-600 font-orbitron">{t.game.hud.countdown}</span>
        </div>
      </div>
    </div>
  );
}
