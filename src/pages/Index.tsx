import { useState, useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import EscapeMenu from "@/components/EscapeMenu";
import useGameState from "@/hooks/useGameStateNew";
import { Toaster } from "@/components/ui/sonner";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'singleplayer' | 'multiplayer'>('menu');
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const { gameState, selectTile, endTurn, basicAttack, useAbility, currentTurnTimer, selectIcon, undoMovement, respawnCharacter } = useGameState(
    gameMode === 'menu' ? 'singleplayer' : gameMode
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode(mode);
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
    setShowEscapeMenu(false);
  };

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameMode !== 'menu') {
        setShowEscapeMenu(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode]);

  if (gameMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-space-dark via-space-medium to-space-dark relative overflow-hidden">
      <Toaster />
      
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
          onUndoMovement={undoMovement}
          onRespawn={(iconId: string) => respawnCharacter(iconId, { q: 0, r: 0 })} // Will be updated to handle placement
          currentTurnTimer={currentTurnTimer}
        />
      </div>
      
      {/* Escape Menu */}
      {showEscapeMenu && (
        <EscapeMenu 
          onMainMenu={handleBackToMenu}
          onContinue={() => setShowEscapeMenu(false)}
        />
      )}
      
      {(gameState.phase === 'victory' || gameState.phase === 'defeat') && (
        <VictoryScreen 
          isVictory={gameState.phase === 'victory'} 
          onBackToMenu={handleBackToMenu} 
        />
      )}
    </div>
  );
};

export default Index;
