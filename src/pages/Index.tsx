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
    <div className="h-screen bg-gradient-to-b from-space-dark via-space-medium to-space-dark p-2 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="text-center py-2">
          <h1 className="text-3xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</h1>
          <p className="text-alien-purple font-orbitron text-sm">Turn {gameState.currentTurn} | {gameMode === 'singleplayer' ? 'vs Znyxorgan AI' : 'Local Arena Battle'}</p>
        </div>
        
        {/* Game Board and UI - Side by side */}
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 flex justify-center items-center">
            <GameBoard gameState={gameState} onTileClick={selectTile} />
          </div>
          
          <div className="w-80 flex-shrink-0">
            <GameUI 
              gameState={gameState}
              onBasicAttack={basicAttack}
              onUseAbility={useAbility}
              onEndTurn={endTurn}
              currentTurnTimer={currentTurnTimer}
              onCharacterSelect={selectIcon}
            />
          </div>
        </div>
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
