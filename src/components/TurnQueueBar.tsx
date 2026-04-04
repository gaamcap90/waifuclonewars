import React from "react";

export function TurnQueueBar({
  gameState,
  onEndTurn,
}: {
  gameState: any;
  onEndTurn: () => void;
  currentTurnTimer?: number; // kept in signature so callers don't need to change
}) {
  const activePlayerId: 0 | 1 = gameState.activePlayerId ?? 0;
  const playerName: string = gameState.players?.[activePlayerId]?.name ?? (activePlayerId === 0 ? "Blue" : "Red");
  const isBlue = activePlayerId === 0;
  const isAI = gameState.players?.[activePlayerId]?.isAI;

  return (
    <div className="flex items-center gap-3 bg-card/90 backdrop-blur border rounded-lg px-5 py-2.5">
      <div className={[
        "text-base font-orbitron font-bold px-3 py-1 rounded",
        isBlue ? "text-blue-300 bg-blue-900/40 border border-blue-500/50"
               : "text-red-300 bg-red-900/40 border border-red-500/50",
      ].join(" ")}>
        {playerName}&apos;s Turn
      </div>

      {isAI ? (
        <div className="text-sm text-muted-foreground animate-pulse">AI thinking…</div>
      ) : (
        <button
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition shadow-lg shadow-red-600/30"
          onClick={onEndTurn}
        >
          End Turn
        </button>
      )}
    </div>
  );
}
