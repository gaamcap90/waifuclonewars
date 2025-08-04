import React from "react";
import { GameState } from "@/types/game";

interface BeastCampHPBarProps {
  gameState: GameState;
  /** The same hexSize and offsetX/offsetY used in GameBoard */
  hexSize: number;
  offsetX: number;
  offsetY: number;
}

const BeastCampHPBar: React.FC<BeastCampHPBarProps> = ({
  gameState,
  hexSize,
  offsetX,
  offsetY
}) => {
  const hexWidth  = hexSize * 2;               // e.g. 100px
  const hexHeight = Math.sqrt(3) * hexSize;    // ~86.6px

  // Positions of the two beast camps in axial coords
  const camps = [
    { q: -2, r:  2, idx: 0 },
    { q:  2, r: -2, idx: 1 },
  ];

  // Convert axial coords → pixel coords (untransformed)
  const hexToPixel = (q: number, r: number) => ({
    x: hexSize * (3 / 2 * q),
    y: hexSize * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
  });

  return (
    <>
      {camps.map(({ q, r, idx }) => {
        const hp       = gameState.objectives.beastCamps.hp[idx];
        const maxHp    = gameState.objectives.beastCamps.maxHp;
        const defeated = gameState.objectives.beastCamps.defeated[idx];
        if (defeated) return null;

        const { x, y } = hexToPixel(q, r);
        // center under the hex tile and just below it
        const left = x + offsetX - hexWidth / 2;
        const top  = y + offsetY + hexHeight;

        const pct = Math.round((hp / maxHp) * 100);

        return (
          <div
            key={idx}
            className="absolute pointer-events-none z-30"
            style={{ left, top, width: hexWidth, textAlign: "center" }}
          >
            {/* HP bar background */}
            <div className="inline-block w-16 h-3 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct > 70 ? "bg-green-400" :
                  pct > 40 ? "bg-yellow-400" :
                  pct > 10 ? "bg-orange-400" :
                              "bg-red-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Numeric HP text */}
            <div className="text-xs text-white bg-black/60 rounded px-1 mt-1 inline-block">
              {hp}/{maxHp}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default BeastCampHPBar;


