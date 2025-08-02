import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import GameUI from "@/components/GameUI";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
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
    <div className="min-h-screen bg-gradient-to-b from-space-dark via-space-medium to-space-dark p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</h1>
          <p className="text-alien-purple font-orbitron">Turn {gameState.currentTurn} | {gameMode === 'singleplayer' ? 'vs Znyxorgan AI' : 'Local Arena Battle'}</p>
        </div>
        
        {/* Game Board - Centered */}
        <div className="flex justify-center">
          <GameBoard gameState={gameState} onTileClick={selectTile} />
        </div>
        
        {/* Game UI - Below Board */}
        <GameUI 
          gameState={gameState}
          onBasicAttack={basicAttack}
          onUseAbility={useAbility}
          onEndTurn={endTurn}
          currentTurnTimer={currentTurnTimer}
          onCharacterSelect={selectIcon}
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
