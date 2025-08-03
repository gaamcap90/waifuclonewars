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
        
        return (
          <div
            key={camp.index}
            className="absolute z-30 pointer-events-none"
            style={{
              // Position above the beast camp hex using proper hex coordinate conversion
              left: `calc(50% + ${x}px - 40px)`,
              top: `calc(50% + ${y}px - 80px)`,
            }}
          >
            <div className="bg-black/90 text-white p-2 rounded-lg border border-red-500/70 min-w-[80px] shadow-lg">
              <div className="text-xs font-bold text-center mb-1 text-red-400">Beast Camp</div>
              <Progress 
                value={(currentHP / maxHP) * 100} 
                className="h-2 w-full bg-gray-700"
              />
              <div className="text-xs text-center mt-1 text-red-300">
                {currentHP}/{maxHP} HP
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default BeastCampHPBar;