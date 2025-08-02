import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import useGameState from "@/hooks/useGameStateNew";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'singleplayer' | 'multiplayer'>('menu');
  const { gameState, selectTile, endTurn, basicAttack, useAbility, currentTurnTimer, selectIcon } = useGameState(
    gameMode === 'menu' ? 'singleplayer' : gameMode
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode(mode);
  };

  if (gameMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-space-dark via-space-medium to-space-dark relative overflow-hidden">
      {/* Full-screen game board */}
      <GameBoard 
        gameState={gameState}
        onTileClick={selectTile}
      />
      
      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">

        {/* Game UI overlays */}
        <HorizontalGameUI 
          gameState={gameState}
          onBasicAttack={basicAttack}
          onUseAbility={useAbility}
          onEndTurn={endTurn}
        />
      </div>
      
      {(gameState.phase === 'victory' || gameState.phase === 'defeat') && (
        <VictoryScreen 
          isVictory={gameState.phase === 'victory'} 
          onBackToMenu={() => setGameMode('menu')} 
        />
      )}
    </div>
  );
};

export default Index;
