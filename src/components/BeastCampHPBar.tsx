import React from "react";
import { GameState } from "@/types/game";

interface BeastCampHPBarProps {
  gameState: GameState;
}

const BeastCampHPBar = ({ gameState }: BeastCampHPBarProps) => {
  // Those are the two camps on your map:
  const camps = [
    { q: -2, r:  2, index: 0 },
    { q:  2, r: -2, index: 1 },
  ];

  // -- EXACTLY the same conversion from GameBoard.tsx! --
  const hexSize   = 50;
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (3/2 * q);
    const y = hexSize * ((Math.sqrt(3)/2 * q) + (Math.sqrt(3) * r));
    return { x, y };
  };

  return (
    <>
      {camps.map(({ q, r, index }) => {
        // skip defeated camps
        if (gameState.objectives.beastCamps.defeated[index]) return null;

        const currentHP = gameState.objectives.beastCamps.hp[index];
        const maxHP     = gameState.objectives.beastCamps.maxHp;
        const pct       = (currentHP / maxHP) * 100;
        const { x, y }  = hexToPixel(q, r);

        // center the 64px-wide bar: 64/2 = 32, adjust as needed
        const barWidth     = 64;
        const barHeight    = 6;
        const textHeight   = 16;
        const yOffsetAbove = barHeight + textHeight + 4; 

        return (
          <div
            key={index}
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${x - barWidth/2}px`,
              top:  `${y - yOffsetAbove}px`,
            }}
          >
            {/* hp track */}
            <div
              className="w-[64px] h-1.5 bg-gray-800 rounded-full border border-gray-600 overflow-hidden"
            >
              <div
                className={`
                  h-full rounded-full transition-all duration-200
                  ${pct > 70 ? "bg-green-400"
                    : pct > 40 ? "bg-yellow-400"
                    : pct > 10 ? "bg-orange-400"
                    : "bg-red-400"
                  }
                `}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* hp text */}
            <div className="mt-1 text-xs text-white text-center bg-black/60 rounded px-1">
              {currentHP}/{maxHP}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default BeastCampHPBar;

