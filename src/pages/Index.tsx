import { useState, useEffect } from "react";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import EscapeMenu from "@/components/EscapeMenu";
import NewGameUI from "@/components/NewGameUI";
import useGameState from "@/hooks/useGameStateNew";
import { Toaster } from "@/components/ui/sonner";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'singleplayer' | 'multiplayer'>('menu');
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const { gameState, selectTile, endTurn, basicAttack, useAbility, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement } = useGameState(
    gameMode === 'menu' ? 'singleplayer' : gameMode
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode(mode);
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
    setShowEscapeMenu(false);
  };

  // ESC key handler - pauses game automatically in single player
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameMode !== 'menu') {
        // Auto-pause in single player, just show menu in multiplayer
        if (gameMode === 'singleplayer') {
          setShowEscapeMenu(true);
        } else {
          setShowEscapeMenu(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode]);

  if (gameMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Toaster />
      
      {/* New integrated UI */}
      <NewGameUI 
        gameState={gameState}
        onBasicAttack={basicAttack}
        onAbilityUse={useAbility}
        onEndTurn={endTurn}
        onTileClick={selectTile}
        onUndoMovement={undoMovement}
      />
      
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
