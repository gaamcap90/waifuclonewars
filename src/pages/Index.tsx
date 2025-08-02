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
        {/* Header overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
          <div className="text-center bg-background/80 backdrop-blur-sm rounded-lg px-6 py-2 border border-border/50">
            <h1 className="text-2xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</h1>
            <p className="text-xs text-alien-purple font-orbitron">Turn {gameState.currentTurn} | {gameMode === 'singleplayer' ? 'vs Znyxorgan AI' : 'Local Arena Battle'}</p>
          </div>
        </div>

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
