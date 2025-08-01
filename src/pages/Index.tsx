import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import MainMenu from "@/components/MainMenu";
import useGameState from "@/hooks/useGameStateNew";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'singleplayer' | 'multiplayer'>('menu');
  const { gameState, selectTile, endTurn, basicAttack, useAbility } = useGameState(
    gameMode === 'menu' ? 'singleplayer' : gameMode
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode(mode);
  };

  if (gameMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Icons of Theia</h1>
          <p className="text-muted-foreground">Turn {gameState.currentTurn} | {gameMode === 'singleplayer' ? 'vs AI' : 'Local Multiplayer'}</p>
        </div>
        
        {/* Game Board */}
        <div className="flex justify-center">
          <GameBoard gameState={gameState} onTileClick={selectTile} />
        </div>
        
        {/* Horizontal UI */}
        <HorizontalGameUI 
          gameState={gameState}
          onBasicAttack={basicAttack}
          onUseAbility={useAbility}
          onEndTurn={endTurn}
        />
      </div>
    </div>
  );
};

export default Index;
