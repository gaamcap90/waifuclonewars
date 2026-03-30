import React from "react";

export function TurnQueueBar({
  gameState,
  onEndTurn,
  currentTurnTimer,
}: {
  gameState: any;
  onEndTurn: () => void;
  currentTurnTimer: number;
}) {
  const activePlayerId: 0 | 1 = gameState.activePlayerId ?? 0;
  const playerName: string = gameState.players?.[activePlayerId]?.name ?? (activePlayerId === 0 ? "Blue" : "Red");
  const isBlue = activePlayerId === 0;

  const timerPct = Math.max(0, Math.min(100, (currentTurnTimer / 60) * 100));
  const timerColor = currentTurnTimer <= 10 ? "bg-red-500" : currentTurnTimer <= 20 ? "bg-yellow-400" : "bg-green-500";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-card/90 backdrop-blur border rounded-lg px-6 py-3 flex items-center gap-5">
        {/* Team label */}
        <div className={[
          "text-lg font-orbitron font-bold px-3 py-1 rounded",
          isBlue ? "text-blue-300 bg-blue-900/40 border border-blue-500/50" : "text-red-300 bg-red-900/40 border border-red-500/50",
        ].join(" ")}>
          {playerName}&apos;s Turn
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div className={["text-2xl font-bold font-orbitron tabular-nums", currentTurnTimer <= 10 ? "text-red-400 animate-pulse" : "text-white"].join(" ")}>
            {currentTurnTimer}s
          </div>
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={["h-full rounded-full transition-all", timerColor].join(" ")} style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        {/* End Turn button */}
        <button
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition shadow-lg shadow-red-600/30 whitespace-nowrap"
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </div>
    </div>
  );
}
