import React, { useState, useEffect } from "react";
import { getCharacterPortrait } from "@/utils/portraits";
import { useT } from "@/i18n";

export function TurnQueueBar({
  gameState,
  onEndTurn,
  runStartTime,
  timerPaused,
}: {
  gameState: any;
  onEndTurn: () => void;
  currentTurnTimer?: number;
  runStartTime?: number;
  timerPaused?: boolean;
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

  const { t } = useT();
  const isDestroyBase = gameState.encounterObjective === 'destroy_base';
  const turnsUntilBombardment = isDestroyBase
    ? (((3 - (turn % 3)) % 3) || 3)
    : null;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!runStartTime) return;
    setElapsed(Math.floor((Date.now() - runStartTime) / 1000));
    if (timerPaused) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - runStartTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [runStartTime, timerPaused]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  return (
    <div
      data-tut="turn_queue"
      className="flex items-center gap-2.5 rounded-xl"
      style={{
        background: "rgba(4,2,18,0.96)",
        border: `1px solid ${isBlue ? "rgba(60,100,220,0.65)" : "rgba(220,60,60,0.65)"}`,
        boxShadow: `0 2px 24px ${isBlue ? "rgba(37,60,180,0.22)" : "rgba(160,20,20,0.22)"}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        padding: "5px 14px 5px 6px",
      }}
    >
      {/* Run timer — only shown in roguelike runs */}
      {runStartTime !== undefined && (
        <>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] leading-none">⏱️</span>
            <span
              className="font-orbitron font-bold text-[11px] leading-none"
              style={{ color: '#94a3b8', letterSpacing: '0.06em' }}
            >
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
        </>
      )}

      {/* Active icon portrait */}
      <div className="shrink-0 relative" style={{ width: 36, height: 36 }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 8,
          overflow: 'hidden',
          border: `2px solid ${isBlue ? 'rgba(96,165,250,0.75)' : 'rgba(248,113,113,0.75)'}`,
          boxShadow: isBlue ? '0 0 10px rgba(59,130,246,0.55)' : '0 0 10px rgba(239,68,68,0.55)',
          background: isBlue ? 'rgba(37,99,235,0.5)' : 'rgba(185,28,28,0.5)',
          animation: 'anim-tq-active-pulse 1.8s ease-in-out infinite',
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
          {t.turnQueue.turn} {turn} · {activeIcon?.name ?? playerName}
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
              <div className="font-orbitron text-[7px] tracking-widest text-slate-500 leading-none">{t.turnQueue.bombardment}</div>
              <div
                className="font-orbitron text-[11px] font-bold leading-none mt-0.5"
                style={{ color: turnsUntilBombardment === 1 ? '#f87171' : '#fbbf24' }}
              >
                {turnsUntilBombardment === 1 ? t.turnQueue.nextTurn : t.turnQueue.inNTurns.replace('{n}', String(turnsUntilBombardment))}
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
      ) : (() => {
        // "Ready to end turn" = all alive p0 icons have used their card slot
        // AND (no mana left OR no affordable cards in hand). Pulse harder to nudge the player.
        const p0Icons: any[] = gameState.players?.[0]?.icons ?? [];
        const aliveP0 = p0Icons.filter((i: any) => i.isAlive);
        const allActed = aliveP0.length > 0 && aliveP0.every((i: any) => !!i.cardUsedThisTurn);
        const mana: number = gameState.globalMana?.[0] ?? 0;
        const hand = gameState.hands?.[0];
        const canStillPlay = Array.isArray(hand?.cards)
          && hand.cards.some((c: any) => (c?.manaCost ?? 0) <= mana);
        const readyToEnd = allActed && !canStillPlay;
        return (
          <button
            data-tut="endturn_btn"
            onClick={onEndTurn}
            className="font-orbitron text-[11px] font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 relative overflow-hidden"
            style={{
              background: readyToEnd
                ? "linear-gradient(135deg, rgba(255,180,40,0.96) 0%, rgba(220,90,20,0.98) 100%)"
                : "linear-gradient(135deg, rgba(240,50,50,0.92) 0%, rgba(160,15,15,0.96) 100%)",
              border: readyToEnd ? "1px solid rgba(255,210,80,0.95)" : "1px solid rgba(255,80,80,0.75)",
              color: "#fff",
              letterSpacing: "0.14em",
              textShadow: readyToEnd
                ? "0 0 16px rgba(255,200,80,1.0)"
                : "0 0 12px rgba(255,120,120,0.9)",
              boxShadow: readyToEnd
                ? "0 0 24px rgba(255,180,40,0.55), 0 0 8px rgba(255,210,80,0.35)"
                : undefined,
              animation: readyToEnd
                ? "btn-end-turn-pulse 0.9s ease-in-out infinite"
                : "btn-end-turn-pulse 1.8s ease-in-out infinite",
            }}
          >
            {/* Shimmer sweep */}
            <span className="absolute inset-0 pointer-events-none" style={{
              background: readyToEnd
                ? "linear-gradient(105deg, transparent 30%, rgba(255,230,160,0.30) 50%, transparent 70%)"
                : "linear-gradient(105deg, transparent 30%, rgba(255,200,200,0.18) 50%, transparent 70%)",
              animation: readyToEnd
                ? "card-foil-sweep 1.1s ease-in-out infinite"
                : "card-foil-sweep 2.2s ease-in-out infinite",
            }} />
            {t.turnQueue.endTurn}
          </button>
        );
      })()}
    </div>
  );
}
