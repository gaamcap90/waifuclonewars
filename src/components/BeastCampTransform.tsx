import { useEffect } from "react";
import { GameState } from "@/types/game";

interface BeastCampTransformProps {
  gameState: GameState;
  onBoardUpdate: (newBoard: any[]) => void;
}

const BeastCampTransform = ({ gameState, onBoardUpdate }: BeastCampTransformProps) => {
  useEffect(() => {
    // Check if any beast camps were just defeated and need to transform to plains
    gameState.objectives.beastCamps.defeated.forEach((isDefeated, index) => {
      if (isDefeated) {
        const campCoords = index === 0 ? { q: -2, r: 2 } : { q: 2, r: -2 };
        
        // Find the beast camp tile in the board
        const updatedBoard = gameState.board.map(tile => {
          if (tile.coordinates.q === campCoords.q && tile.coordinates.r === campCoords.r) {
            // Transform to plains
            return {
              ...tile,
              terrain: {
                type: 'plain' as const,
                effects: {}
              }
            };
          }
          return tile;
        });
        
        // Only update if there's actually a change
        const hasChanged = gameState.board.some(tile => 
          tile.coordinates.q === campCoords.q && 
          tile.coordinates.r === campCoords.r && 
          tile.terrain.type === 'beast_camp'
        );
        
        if (hasChanged) {
          onBoardUpdate(updatedBoard);
        }
      }
    });
  }, [gameState.objectives.beastCamps.defeated, gameState.board, onBoardUpdate]);

  return null; // This component handles logic only
};

export default BeastCampTransform;