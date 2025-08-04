// src/components/BeastCampHPBar.tsx
import React from "react";
import { GameState } from "@/types/game";

interface BeastCampHPBarProps {
  gameState: GameState;
  /** Width of the board container (same as GameBoard’s containerWidth) */
  boardWidth: number;
  /** Height of the board container (same as GameBoard’s containerHeight) */
  boardHeight: number;
  /** Current pan x,y and zoom, if you want the bars to pan/zoom too */
  panX?: number;
  panY?: number;
  zoom?: number;
}

const BeastCampHPBar = ({
  gameState,
  boardWidth,
  boardHeight,
  panX = 0,
  panY = 0,
  zoom = 1
}: BeastCampHPBarProps) => {
  const hexSize   = 50;
  const hexWidth  = hexSize * 2;               // 100px
  const hexHeight = Math.sqrt(3) * hexSize;    // ~86.6px

  // same centering math as GameBoard
  const offsetX = (boardWidth  - hexWidth)  / 2;
  const offsetY = (boardHeight - hexHeight) / 2;

  // identical axial→pixel
  const hexToPixel = (q: number, r: number) => ({
    x: hexSize * (3/2 * q),
    y: hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r),
  });

  const camps = [
    { q: -2, r:  2, idx: 0 },
    { q:  2, r: -2, idx: 1 },
  ];

  return (
    <>
      {camps.map(({ q, r, idx }) => {
        const hp    = gameState.objectives.beastCamps.hp[idx];
        const maxHp = gameState.objectives.beastCamps.maxHp;
        const defeated = gameState.objectives.beastCamps.defeated[idx];
        if (defeated) return null;

        // get pixel
        const { x, y } = hexToPixel(q, r);
        // position the bar just below the hex
        const left = (x + offsetX) * zoom + panX;
        const top  = (y + offsetY + hexHeight) * zoom + panY;

        const pct = Math.round((hp / maxHp) * 100);

        return (
          <div
            key={idx}
            className="absolute pointer-events-none z-30"
            style={{
              transform: `translate(${left}px, ${top}px)`,
              width: `${hexWidth * zoom}px`,
              textAlign: "center"
            }}
          >
            <div className="inline-block w-16 h-3 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct > 70 ? "bg-green-400" :
                  pct > 40 ? "bg-yellow-400" :
                  pct > 10 ? "bg-orange-400" : "bg-red-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
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

