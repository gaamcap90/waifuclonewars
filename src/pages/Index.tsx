import { useState, useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import EscapeMenu from "@/components/EscapeMenu";
import CharacterSelection from "@/components/CharacterSelection";
import UltimateIndicator from "@/components/UltimateIndicator";
import useGameState from "@/hooks/useGameStateNew";
import { Toaster } from "@/components/ui/sonner";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'characterSelect' | 'singleplayer' | 'multiplayer'>('menu');
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const { gameState, selectTile, endTurn, basicAttack, useAbility, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement, resetGame } = useGameState(
    gameMode === 'menu' || gameMode === 'characterSelect' ? 'singleplayer' : gameMode
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode('characterSelect');
  };

  const handleCharacterSelectionComplete = (selectedIcons: any[]) => {
    setGameMode('singleplayer'); // Start the actual game
  };

  const handleBackToMenu = () => {
    resetGame(); // Reset the game state completely
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

  if (gameMode === 'characterSelect') {
    return <CharacterSelection onStartGame={handleCharacterSelectionComplete} gameMode="singleplayer" />;
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
          onRespawn={startRespawnPlacement}
          currentTurnTimer={currentTurnTimer}
        />
      </div>
      
      {/* Ultimate Indicator */}
      <UltimateIndicator gameState={gameState} />
      
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
          onPlayAgain={() => {
            setGameMode('characterSelect'); // Go back to character selection for new game
          }}
        />
      )}
    </div>
  );
};

export default Index;
