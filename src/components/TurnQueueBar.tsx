import React from "react";

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

  return (
    <div
      className="flex items-center gap-3 rounded-xl"
      style={{
        background: "rgba(4,2,18,0.95)",
        border: `1px solid ${isBlue ? "rgba(60,100,220,0.60)" : "rgba(220,60,60,0.60)"}`,
        boxShadow: `0 2px 20px ${isBlue ? "rgba(37,60,180,0.20)" : "rgba(160,20,20,0.20)"}, inset 0 1px 0 rgba(255,255,255,0.04)`,
        padding: "6px 14px 6px 10px",
      }}
    >
      {/* Team color accent bar */}
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{
          background: isBlue ? "#60a5fa" : "#f87171",
          boxShadow: isBlue ? "0 0 8px rgba(96,165,250,0.85)" : "0 0 8px rgba(248,113,113,0.85)",
        }}
      />

      {/* Turn + player name */}
      <div className="min-w-0">
        <div className="font-orbitron text-[9px] tracking-widest text-slate-500 leading-none mb-0.5">
          TURN {turn}
        </div>
        <div
          className="font-orbitron text-sm font-bold leading-none truncate"
          style={{ color: isBlue ? "#93c5fd" : "#fca5a5" }}
        >
          {playerName}
        </div>
      </div>

      <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

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
