// src/components/GameHeader.tsx
import React from "react";
import { Crown } from "lucide-react";

type Props = {
  gameState: any;           // use your GameState/ExtState type if you prefer
  onEndTurn: () => void;
};

export const GameHeader: React.FC<Props> = ({ gameState, onEndTurn }) => {
  const turn = gameState?.currentTurn ?? 1;

  const beastCleared =
    gameState?.objectives?.beastCamps?.defeated?.filter(Boolean).length ?? 0;
  const beastTotal = gameState?.objectives?.beastCamps?.defeated?.length ?? 0;

  const crystalLabel = gameState?.objectives?.manaCrystal?.controlled
    ? "Controlled"
    : "Neutral";

  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-sm text-white p-3 border-b-2 border-pink-500/50">
      <div className="flex justify-between items-center">
        {/* Left: Turn number */}
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">Turn {turn}</span>
        </div>

        {/* Center: Turn Queue */}
        <div className="flex-1 mx-4">
          <div className="flex justify-center items-center">
            <p className="text-lg font-semibold mr-3">Turn Queue</p>

            <div className="flex space-x-2">
              {Array.isArray(gameState?.speedQueue) &&
                gameState.speedQueue.slice(0, 8).map((iconId: string) => {
                  const icon = gameState.players
                    .flatMap((p: any) => p.icons)
                    .find((i: any) => i.id === iconId);
                  if (!icon) return null;

                  const isActive =
                    icon.id === gameState.activeIconId && icon.isAlive;

                  const isDisabled =
                    !icon.isAlive ||
                    icon.justRespawned ||
                    (icon.stats?.movement ?? 0) <= 0;

                  const teamBg =
                    icon.playerId === 0 ? "bg-blue-600" : "bg-red-600";
                  const teamRing =
                    icon.playerId === 0 ? "ring-blue-400" : "ring-red-400";

                  return (
                    <div
                      key={icon.id}
                      className={[
                        "relative w-12 h-12 rounded-full overflow-hidden",
                        "flex items-center justify-center font-bold text-sm",
                        "ring-2 transition-transform",
                        isActive ? "ring-yellow-400 scale-110" : teamRing,
                        teamBg,
                        isDisabled ? "grayscale opacity-40" : "",
                      ].join(" ")}
                      title={`${icon.name}${
                        !icon.isAlive && icon.respawnTurns > 0
                          ? ` — respawns in ${icon.respawnTurns}`
                          : ""
                      }`}
                    >
                      {/* No portraits available → show initial */}
                      <span className="text-white">
                        {icon.name?.charAt(0) ?? "?"}
                      </span>

                      {/* Respawn badge */}
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
          </div>
        </div>

        {/* Right: Objectives summary */}
        <div className="flex space-x-4">
          <div className="flex items-center px-3 py-1 rounded-lg bg-blue-500/30 border border-blue-300">
            <Crown className="h-5 w-5 text-blue-200 mr-2" />
            <span className="font-semibold text-blue-100">Mana Crystal</span>
            <span className="ml-2 text-gray-200">{crystalLabel}</span>
          </div>
          <div className="flex items-center px-3 py-1 rounded-lg bg-red-500/30 border border-red-300">
            <Crown className="h-5 w-5 text-red-200 mr-2" />
            <span className="font-semibold text-red-100">Beast Camps</span>
            <span className="ml-2 text-gray-200">
              {beastCleared}/{beastTotal} Cleared
            </span>
          </div>
        </div>
      </div>

      {/* End Turn */}
      <div className="flex justify-center mt-2">
        <button
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition shadow-lg shadow-red-600/30"
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </div>
    </div>
  );
};
