import { GameState } from "@/types/game";

interface UltimateIndicatorProps {
  gameState: GameState;
}

const UltimateIndicator = ({ gameState }: UltimateIndicatorProps) => {
  // Check if we're in targeting mode with an ultimate ability
  const isUltimateMode = gameState.targetingMode?.abilityId === 'ultimate';
  
  if (!isUltimateMode) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-lg border-2 border-orange-400 shadow-2xl animate-pulse">
        <div className="text-center">
          <div className="text-3xl font-bold font-orbitron tracking-wider">
            🌟 ULTIMATE ACTIVE 🌟
          </div>
          <div className="text-lg mt-2 opacity-90">
            Select your target!
          </div>
        </div>
      </div>
      
      {/* Background overlay effect */}
      <div className="fixed inset-0 bg-orange-500/10 animate-pulse -z-10"></div>
    </div>
  );
};

export default UltimateIndicator;