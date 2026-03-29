import React from "react";

export function TurnQueueBar({
  gameState,
  onEndTurn,
}: {
  gameState: any; // swap to your GameState type if you want
  onEndTurn: () => void;
}) {
  const queue: string[] = Array.isArray(gameState?.speedQueue)
    ? gameState.speedQueue
    : [];

  // Map names -> portrait assets (same images you use elsewhere)
  const getPortrait = (name: string | undefined | null) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes("napoleon")) {
      return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
    }
    if (n.includes("genghis")) {
      return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
    }
    if (n.includes("da vinci") || n.includes("davinci")) {
      return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
    }
    return null; // will fall back to initial
  };

  return (
    <div className="flex justify-center">
      <div className="bg-card/90 backdrop-blur border rounded-lg px-5 py-3">
        <div className="text-center text-lg font-orbitron text-arena-glow mb-2">
          Turn Queue
        </div>

        <div className="flex justify-center gap-3">
          {queue.slice(0, 8).map((iconId: string) => {
            const icon = gameState.players
              .flatMap((p: any) => p.icons)
              .find((i: any) => i.id === iconId);
            if (!icon) return null;

            const activeIcon = gameState.players
              .flatMap(p => p.icons)
              .find(i => i.playerId === gameState.activePlayerId && i.isAlive);

            // Grey out if dead, just respawned, or has no movement left
            const isDisabled =
              !icon.isAlive ||
              icon.justRespawned ||
              (icon.stats?.movement ?? 0) <= 0;

            const ring =
              icon.playerId === 0 ? "ring-blue-400" : "ring-red-400";

            const portrait =
              (icon.portrait as string | undefined) ?? getPortrait(icon.name);

            return (
              <div
                key={icon.id}
                className={[
                  "relative w-12 h-12 rounded-full overflow-hidden select-none",
                  "ring-2 transition-all",
                  isActive ? "ring-yellow-400 scale-110 shadow" : ring,
                ].join(" ")}
                title={
                  !icon.isAlive && icon.respawnTurns > 0
                    ? `${icon.name} — respawns in ${icon.respawnTurns}`
                    : icon.name
                }
              >
                {portrait ? (
                  <img
                    src={portrait}
                    alt={icon.name}
                    className={[
                      "w-full h-full object-cover",
                      isDisabled ? "grayscale opacity-40" : "",
                    ].join(" ")}
                    draggable={false}
                  />
                ) : (
                  <div
                    className={[
                      "w-full h-full flex items-center justify-center font-bold text-sm text-white",
                      icon.playerId === 0 ? "bg-blue-600" : "bg-red-600",
                      isDisabled ? "grayscale opacity-40" : "",
                    ].join(" ")}
                  >
                    {icon.name?.charAt(0) ?? "?"}
                  </div>
                )}

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
