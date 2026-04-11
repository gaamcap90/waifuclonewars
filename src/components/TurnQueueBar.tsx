import React from "react";
import { getCharacterPortrait } from "@/utils/portraits";

export function TurnQueueBar({
  gameState,
  onEndTurn,
}: {
  gameState: any;
  onEndTurn: () => void;
  currentTurnTimer?: number;
}) {
  const activePlayerId: 0 | 1 = gameState.activePlayerId ?? 0;
  const playerName: string = gameState.players?.[activePlayerId]?.name ?? (activePlayerId === 0 ? "Blue" : "Red");
  const isBlue = activePlayerId === 0;
  const isAI = gameState.players?.[activePlayerId]?.isAI;
  const turn: number = gameState.currentTurn ?? 1;

  // Active icon portrait — selected icon or first alive icon for active player
  const selectedIconId: string | undefined = gameState.selectedIcon;
  const aliveIcons = gameState.players?.[activePlayerId]?.icons?.filter((i: any) => i.isAlive) ?? [];
  const activeIcon = aliveIcons.find((i: any) => i.id === selectedIconId) ?? aliveIcons[0] ?? null;
  const portrait = activeIcon ? getCharacterPortrait(activeIcon.name) : null;

  const isDestroyBase = gameState.encounterObjective === 'destroy_base';
  const turnsUntilBombardment = isDestroyBase
    ? (((3 - (turn % 3)) % 3) || 3)
    : null;

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl"
      style={{
        background: "rgba(4,2,18,0.96)",
        border: `1px solid ${isBlue ? "rgba(60,100,220,0.65)" : "rgba(220,60,60,0.65)"}`,
        boxShadow: `0 2px 24px ${isBlue ? "rgba(37,60,180,0.22)" : "rgba(160,20,20,0.22)"}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        padding: "5px 14px 5px 6px",
      }}
    >
      {/* Active icon portrait */}
      <div className="shrink-0 relative" style={{ width: 36, height: 36 }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 8,
          overflow: 'hidden',
          border: `2px solid ${isBlue ? 'rgba(96,165,250,0.75)' : 'rgba(248,113,113,0.75)'}`,
          boxShadow: isBlue ? '0 0 10px rgba(59,130,246,0.55)' : '0 0 10px rgba(239,68,68,0.55)',
          background: isBlue ? 'rgba(37,99,235,0.5)' : 'rgba(185,28,28,0.5)',
        }}>
          {portrait ? (
            <img src={portrait} alt={activeIcon?.name} className="w-full h-full object-cover" style={{ objectPosition: 'center 15%' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm">
              {activeIcon?.name?.charAt(0) ?? '?'}
            </div>
          )}
        </div>
        {/* Team color dot */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 9, height: 9,
          borderRadius: '50%',
          background: isBlue ? '#60a5fa' : '#f87171',
          border: '1.5px solid rgba(4,2,18,0.95)',
          boxShadow: isBlue ? '0 0 5px rgba(96,165,250,0.90)' : '0 0 5px rgba(248,113,113,0.90)',
        }} />
      </div>

      {/* Turn + player name */}
      <div className="min-w-0">
        <div className="font-orbitron text-[9px] tracking-widest text-slate-500 leading-none mb-0.5">
          TURN {turn} · {activeIcon?.name ?? playerName}
        </div>
        <div
          className="font-orbitron text-[13px] font-black leading-none truncate"
          style={{ color: isBlue ? "#93c5fd" : "#fca5a5", letterSpacing: '0.06em' }}
        >
          {playerName}
        </div>
      </div>

      <div className="w-px h-7 shrink-0 mx-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

      {/* Bombardment timer — only shown in destroy_base encounters */}
      {turnsUntilBombardment !== null && (
        <>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
            style={{
              background: turnsUntilBombardment === 1 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${turnsUntilBombardment === 1 ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.08)'}`,
              animation: turnsUntilBombardment === 1 ? 'btn-end-turn-pulse 1s ease-in-out infinite' : 'none',
            }}
          >
            <span className="text-sm leading-none">💥</span>
            <div>
              <div className="font-orbitron text-[7px] tracking-widest text-slate-500 leading-none">BOMBARDMENT</div>
              <div
                className="font-orbitron text-[11px] font-bold leading-none mt-0.5"
                style={{ color: turnsUntilBombardment === 1 ? '#f87171' : '#fbbf24' }}
              >
                {turnsUntilBombardment === 1 ? 'NEXT TURN' : `IN ${turnsUntilBombardment} TURNS`}
              </div>
            </div>
          </div>
          <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
        </>
      )}

      {isAI ? (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="font-orbitron text-[10px] text-slate-400 tracking-widest">AI THINKING</span>
        </div>
      ) : (
        <button
          onClick={onEndTurn}
          className="font-orbitron text-[11px] font-bold px-4 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(220,40,40,0.85) 0%, rgba(150,15,15,0.90) 100%)",
            border: "1px solid rgba(239,68,68,0.65)",
            color: "#fca5a5",
            letterSpacing: "0.12em",
            animation: "btn-end-turn-pulse 2s ease-in-out infinite",
          }}
        >
          END TURN
        </button>
      )}
    </div>
  );
}
