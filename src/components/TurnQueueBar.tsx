import React from "react";

export function TurnQueueBar({
  gameState,
  onEndTurn,
}: {
  gameState: any; // use your GameState/ExtState type if you have it
  onEndTurn: () => void;
}) {
  const queue: string[] = Array.isArray(gameState?.speedQueue)
    ? gameState.speedQueue
    : [];

  return (
    <div className="flex justify-center">
      <div className="bg-card/90 backdrop-blur border rounded-lg px-5 py-3">
        <div className="text-center text-lg font-orbitron text-arena-glow mb-2">
          Arena Turn Queue
        </div>

        <div className="flex justify-center gap-3">
          {queue.slice(0, 8).map((iconId: string, index: number) => {
            const icon = gameState.players
              .flatMap((p: any) => p.icons)
              .find((i: any) => i.id === iconId);
            if (!icon) return null;

            const isActive = icon.id === gameState.activeIconId && icon.isAlive;

            // Grey out if dead, just respawned, or has no movement left
            const isDisabled =
              !icon.isAlive ||
              icon.justRespawned ||
              (icon.stats?.movement ?? 0) <= 0;

            const teamBg = icon.playerId === 0 ? "bg-blue-600" : "bg-red-600";
            const teamRing =
              icon.playerId === 0 ? "ring-blue-400" : "ring-red-400";

            return (
              <div
                key={icon.id}
                className={[
                  "relative w-12 h-12 rounded-full overflow-hidden",
                  "flex items-center justify-center font-bold text-sm",
                  "ring-2 transition-all select-none",
                  isActive ? "ring-yellow-400 scale-110 shadow" : teamRing,
                  teamBg,
                  isDisabled ? "grayscale opacity-40" : "",
                ].join(" ")}
                title={
                  !icon.isAlive && icon.respawnTurns > 0
                    ? `${icon.name} — respawns in ${icon.respawnTurns}`
                    : icon.name
                }
              >
                {/* No portrait? show initial */}
                <span className="text-white">{icon.name?.charAt(0) ?? "?"}</span>

                {/* small respawn counter badge */}
                {!icon.isAlive &&
                  typeof icon.respawnTurns === "number" &&
                  icon.respawnTurns > 0 && (
                    <span className="absolute -bottom-1 -right-1 px-1 rounded text-[10px] leading-none bg-black/70 text-white">
                      {icon.respawnTurns}
                    </span>
                  )}
              </div>
            );
          })}
        </div>

        {/* End Turn button */}
        <div className="flex justify-center mt-3">
          <button
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition shadow-lg shadow-red-600/30"
            onClick={onEndTurn}
          >
            End Turn
          </button>
        </div>
      </div>
    </div>
  );
}
