import { useState, useEffect, useCallback, useRef } from "react";
import GameBoard from "@/components/GameBoard";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import LoadingScreen from "@/components/LoadingScreen";
import HistoricalArchives from "@/components/HistoricalArchives";
import GameSettings from "@/components/GameSettings";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import EscapeMenu from "@/components/EscapeMenu";
import CharacterSelection from "@/components/CharacterSelection";
import UltimateIndicator from "@/components/UltimateIndicator";
import RoguelikeMap from "@/components/RoguelikeMap";
import RewardsScreen from "@/components/RewardsScreen";
import useGameState from "@/hooks/useGameStateNew";
import { useRunState } from "@/hooks/useRunState";
import { useAudio } from "@/hooks/useAudio";
import { Toaster } from "@/components/ui/sonner";
import CombatLogPanel from "@/ui/CombatLogPanel";
import ArenaBackground from "@/ui/ArenaBackground";
import { CharacterId } from "@/types/roguelike";

const Index = () => {
  const [gameMode, setGameMode] = useState<'loading' | 'menu' | 'archives' | 'settings' | 'characterSelect' | 'singleplayer' | 'multiplayer' | 'roguelikeMap' | 'rewards'>('loading');
  const handleLoadingComplete = useCallback(() => setGameMode('menu'), []);
  const [pendingMode, setPendingMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<any>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const { runState, startRun, abandonRun, enterNode, completeCombat, collectRewards } = useRunState();
  const { gameState, selectTile, endTurn, basicAttack, useAbility, playCard, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement, startBattle, resetGame, cancelTargeting } = useGameState(
    (gameMode === 'singleplayer' || gameMode === 'multiplayer') ? gameMode : 'singleplayer',
    selectedCharacters
  );

  const { playSound, playMusic, stopMusic } = useAudio();

  // ── Music: menu vs battle ─────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode === 'menu' || gameMode === 'archives' || gameMode === 'settings' || gameMode === 'characterSelect' || gameMode === 'loading' || gameMode === 'roguelikeMap' || gameMode === 'rewards') {
      playMusic('menu');
    } else if (gameMode === 'singleplayer' || gameMode === 'multiplayer') {
      playMusic('battle');
    }
  }, [gameMode]);

  // ── SFX: combat log events ────────────────────────────────────────────────
  const combatLog = (gameState as any).combatLog ?? [];
  const prevLogLenRef = useRef<number>(combatLog.length);
  useEffect(() => {
    const prev = prevLogLenRef.current;
    const current = combatLog.length;
    if (current > prev) {
      const lastEntry = combatLog[current - 1];
      if (lastEntry?.text) {
        const t: string = lastEntry.text.toLowerCase();
        // Ultimate abilities — named abilities (not basic attack)
        if (t.includes('final salvo') || t.includes("rider's fury") || t.includes('vitruvian')) {
          playSound('ultimate');
        // Healing
        } else if (t.includes('healing') || t.includes('heal')) {
          playSound('heal');
        // Debuffs
        } else if (t.includes('applied') || t.includes('silence') || t.includes('demoralize') || t.includes('armor break') || t.includes('mud') || t.includes('poison')) {
          playSound('debuff_apply');
        // Named ability damage (cast X on Y)
        } else if (t.includes('cast ') || t.includes('used ') || t.includes('summoned')) {
          playSound('ability_cast');
        // Basic attacks
        } else if (t.includes('basic-attacked') || t.includes('attacked')) {
          playSound('attack_hit');
        // Card damage hits
        } else if (t.includes(' hit ') || t.includes('played ')) {
          playSound('card_play');
        // Base/camp damage
        } else if (t.includes('base') || t.includes('camp')) {
          playSound('base_hit');
        // Death
        } else if (t.includes('drowned') || t.includes('bloodlust')) {
          playSound('unit_death');
        } else if (t.includes('beast camp defeated')) {
          playSound('beast_kill');
        }
      }
    }
    prevLogLenRef.current = current;
  }, [combatLog.length]);

  // ── SFX: turn change ──────────────────────────────────────────────────────
  const prevTurnRef = useRef<number>(gameState.currentTurn ?? 1);
  useEffect(() => {
    if ((gameState.currentTurn ?? 1) > prevTurnRef.current) {
      playSound('turn_start');
    }
    prevTurnRef.current = gameState.currentTurn ?? 1;
  }, [gameState.currentTurn]);

  // ── SFX: victory / defeat ─────────────────────────────────────────────────
  const prevPhaseRef = useRef(gameState.phase);
  useEffect(() => {
    if (gameState.phase !== prevPhaseRef.current) {
      if (gameState.phase === 'victory') playSound('victory');
      if (gameState.phase === 'defeat')  playSound('defeat');
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase]);

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    playSound('ui_click');
    setPendingMode(mode);
    setGameMode('characterSelect');
  };

  const handleCharacterSelectionComplete = (selectedIcons: any[]) => {
    setSelectedCharacters(selectedIcons);
    if (pendingMode === 'singleplayer') {
      startRun(selectedIcons.map(c => c.id));
      setGameMode('roguelikeMap');
    } else {
      setGameMode('multiplayer');
    }
  };

  const handleNodeSelect = (nodeId: string) => {
    if (!runState) return;
    const node = runState.map.find(n => n.id === nodeId);
    if (!node) return;
    playSound('ui_click');
    enterNode(nodeId);
    setActiveNodeId(nodeId);
    if (node.type === 'enemy' || node.type === 'elite' || node.type === 'boss') {
      startBattle(runState.characters, runState.deckCardIds);
      setGameMode('singleplayer');
    }
    // campfire / merchant / treasure: future screens — stay on map for now
  };

  const handleBackToMenu = () => {
    resetGame();
    setGameMode('menu');
    setShowEscapeMenu(false);
  };

  const handleEndTurn = () => {
    playSound('end_turn');
    endTurn();
  };

  const handlePlayCard = (card: any, executorId: string) => {
    playSound('card_play');
    playCard(card, executorId);
  };

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ((gameState as any).targetingMode) {
          event.stopPropagation();
          cancelTargeting();
          return;
        }
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

  if (gameMode === 'loading') {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (gameMode === 'archives') {
    return <HistoricalArchives onBack={() => setGameMode('menu')} />;
  }

  if (gameMode === 'settings') {
    return <GameSettings onBack={() => setGameMode('menu')} />;
  }

  if (gameMode === 'menu') {
    return (
      <MainMenu
        onStartGame={handleStartGame}
        onArchives={() => setGameMode('archives')}
        onSettings={() => setGameMode('settings')}
      />
    );
  }

  if (gameMode === 'characterSelect') {
    return <CharacterSelection onStartGame={handleCharacterSelectionComplete} onBack={() => setGameMode('menu')} gameMode={pendingMode} />;
  }

  if (gameMode === 'roguelikeMap' && runState) {
    return (
      <RoguelikeMap
        runState={runState}
        onSelectNode={handleNodeSelect}
        onAbandonRun={() => { abandonRun(); setGameMode('menu'); }}
      />
    );
  }

  if (gameMode === 'rewards' && runState?.pendingRewards) {
    return (
      <RewardsScreen
        runState={runState}
        onCollect={(cardId, equipItem) => {
          collectRewards(cardId, equipItem);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />
      <Toaster />

      {/* Full-screen game board */}
      <GameBoard
        gameState={gameState}
        onTileClick={selectTile}
        onTileHover={setHoveredTile}
      />

      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <HorizontalGameUI
          gameState={gameState}
          onBasicAttack={basicAttack}
          onUseAbility={useAbility}
          onEndTurn={handleEndTurn}
          onUndoMovement={undoMovement}
          onRespawn={startRespawnPlacement}
          onPlayCard={handlePlayCard}
          onSelectIcon={selectIcon}
          hoveredTile={hoveredTile}
          currentTurnTimer={currentTurnTimer}
          runItemsByCharacter={runState ? Object.fromEntries(
            runState.characters.map(c => [c.id, c.items.filter(Boolean).map(item => ({ icon: item!.icon, name: item!.name, description: item!.description }))])
          ) : undefined}
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
          playAgainLabel={pendingMode === 'singleplayer' ? 'NEXT ROUND' : 'PLAY AGAIN'}
          onBackToMenu={handleBackToMenu}
          onPlayAgain={() => {
            if (pendingMode === 'singleplayer' && runState && activeNodeId) {
              // Roguelike: compute combat result and go to rewards
              const allIcons = gameState.players[0].icons;
              const finalHps: Record<string, number> = {};
              (['napoleon', 'genghis', 'davinci', 'leonidas'] as CharacterId[]).forEach(id => {
                const icon = allIcons.find(i => i.name.toLowerCase().includes(id === 'davinci' ? 'vinci' : id));
                finalHps[id] = icon?.stats.hp ?? 0;
              });
              completeCombat({
                nodeId: activeNodeId,
                won: gameState.phase === 'victory',
                turnsElapsed: gameState.currentTurn ?? 1,
                finalHps: finalHps as any,
              });
              setActiveNodeId(null);
              setGameMode('rewards');
            } else {
              setGameMode('characterSelect');
            }
          }}
        />
      )}
    </div>
  );
};

export default Index;
