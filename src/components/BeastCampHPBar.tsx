import React from "react";
import { GameState } from "@/types/game";

interface BeastCampHPBarProps {
  gameState: GameState;
}

const BeastCampHPBar = ({ gameState }: BeastCampHPBarProps) => {
  const beastCamps = [
    { q: -2, r:  2, index: 0 },
    { q:  2, r: -2, index: 1 }
  ];

  // must match GameBoard.tsx’s axial-to-pixel logic exactly
  const hexSize = 50;
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (3 / 2 * q);
    const y = hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
  };

  return (
    <>
      {beastCamps.map(({ q, r, index }) => {
        // skip defeated camps
        if (gameState.objectives.beastCamps.defeated[index]) return null;

        const currentHP = gameState.objectives.beastCamps.hp[index];
        const maxHP     = gameState.objectives.beastCamps.maxHp;
        const hpPercent = (currentHP / maxHP) * 100;
        const { x, y }  = hexToPixel(q, r);

        return (
          <div
            key={index}
            className="absolute z-30 pointer-events-none"
            style={{
              left: `calc(50% + ${x}px - 30px)`,
              top:  `calc(50% + ${y}px - 60px)`,
            }}
          >
            {/* HP bar background */}
            <div className="w-16 h-3 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-200
                  ${hpPercent > 70 ? "bg-green-400" :
                    hpPercent > 40 ? "bg-yellow-400" :
                    hpPercent > 10 ? "bg-orange-400" : "bg-red-400"
                  }
                `}
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* HP text */}
            <div className="text-xs text-center mt-1 text-white bg-black/60 rounded px-1">
              {currentHP}/{maxHP}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default BeastCampHPBar;
