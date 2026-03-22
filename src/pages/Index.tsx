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
import CombatLogPanel from "@/ui/CombatLogPanel";
import ArenaBackground from "@/ui/ArenaBackground";

const Index = () => {
  const [gameMode, setGameMode] = useState<'menu' | 'characterSelect' | 'singleplayer' | 'multiplayer'>('menu');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const { gameState, selectTile, endTurn, basicAttack, useAbility, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement, resetGame, cancelTargeting } = useGameState(
    gameMode === 'menu' || gameMode === 'characterSelect' ? 'singleplayer' : gameMode,
    selectedCharacters
  );

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    setGameMode('characterSelect');
  };

  const handleCharacterSelectionComplete = (selectedIcons: any[]) => {
    setSelectedCharacters(selectedIcons);
    setGameMode('singleplayer');
  };

  const handleBackToMenu = () => {
    resetGame(); // Reset the game state completely
    setGameMode('menu');
    setShowEscapeMenu(false);
  };

  // ESC key handler - pauses game automatically in single player
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // If targeting, cancel and do NOT open menu
        if ((gameState as any).targetingMode) {
          event.stopPropagation();
          cancelTargeting();
          return;
        }

        // Otherwise, original ESC behavior
        if (gameMode !== 'menu') {
          if (gameMode === 'singleplayer') {
            setShowEscapeMenu(true);
          } else {
            setShowEscapeMenu(prev => !prev);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, (gameState as any).targetingMode, cancelTargeting]);

  // Right-click to cancel targeting
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if ((gameState as any).targetingMode) {
        e.preventDefault();
        cancelTargeting();
      }
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, [(gameState as any).targetingMode, cancelTargeting]);

  if (gameMode === 'menu') {
    return <MainMenu onStartGame={handleStartGame} />;
  }

  if (gameMode === 'characterSelect') {
    return <CharacterSelection onStartGame={handleCharacterSelectionComplete} gameMode="singleplayer" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />
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

      {/* Combat Logs */}
      <div className="pointer-events-auto">
        <CombatLogPanel
          entries={(gameState as any).combatLog ?? []}
          side="left"
          title="Blue Actions"
          storageKey="combatLog:leftCollapsed"
        />
        <CombatLogPanel
          entries={(gameState as any).combatLog ?? []}
          side="right"
          title="Red Actions"
          storageKey="combatLog:rightCollapsed"
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
          onPlayAgain={() => {
            setGameMode('characterSelect'); // Go back to character selection for new game
          }}
        />
      )}
    </div>
  );
};

export default Index;
