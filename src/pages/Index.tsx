import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import NewGameUI from "@/components/NewGameUI";
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
          <h1 className="text-4xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</h1>
          <p className="text-alien-purple font-orbitron">Turn {gameState.currentTurn} | {gameMode === 'singleplayer' ? 'vs Znyxorgan AI' : 'Local Arena Battle'}</p>
        </div>
        
        {/* Game Board */}
        <div className="flex justify-center">
          <GameBoard gameState={gameState} onTileClick={selectTile} />
        </div>
        
        {/* New Game UI */}
        <NewGameUI 
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
