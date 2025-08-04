import { GameState } from "@/types/game";
import { Progress } from "@/components/ui/progress";

interface BeastCampHPBarProps {
  gameState: GameState;
}

const BeastCampHPBar = ({ gameState }: BeastCampHPBarProps) => {
  const beastCamps = [
    { coordinates: { q: -2, r: 2 }, index: 0 },
    { coordinates: { q: 2, r: -2 }, index: 1 }
  ];

  // Convert axial coordinates to pixel coordinates
  const hexToPixel = (q: number, r: number) => {
    const hexSize = 50;
    const x = hexSize * (1.8 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  };

  return (
    <>
      {beastCamps.map(camp => {
        const isDefeated = gameState.objectives.beastCamps.defeated[camp.index];
        const currentHP = gameState.objectives.beastCamps.hp[camp.index];
        const maxHP = gameState.objectives.beastCamps.maxHp;
        
        if (isDefeated) return null;
        
        const { x, y } = hexToPixel(camp.coordinates.q, camp.coordinates.r);
        
        const hpPercent = (currentHP / maxHP) * 100;
        
        return (
          <div
            key={camp.index}
            className="absolute z-30 pointer-events-none"
            style={{
              // Position above the beast camp hex using proper hex coordinate conversion
              left: `calc(50% + ${x}px - 30px)`,
              top: `calc(50% + ${y}px - 70px)`,
            }}
          >
            <div className="w-16 h-3 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hpPercent > 70 ? "bg-green-400" :
                  hpPercent > 40 ? "bg-yellow-400" :
                  hpPercent > 10 ? "bg-orange-400" : "bg-red-400"
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
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