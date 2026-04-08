import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LanguageProvider, useT } from "@/i18n";
import GameBoard from "@/components/GameBoard";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import LoadingScreen from "@/components/LoadingScreen";
import HistoricalArchives from "@/components/HistoricalArchives";
import GameSettings from "@/components/GameSettings";
import GameRules from "@/components/GameRules";
import HorizontalGameUI from "@/components/HorizontalGameUI";
import EscapeMenu from "@/components/EscapeMenu";
import CharacterSelection from "@/components/CharacterSelection";
import UltimateIndicator from "@/components/UltimateIndicator";
import RoguelikeMap from "@/components/RoguelikeMap";
import RewardsScreen from "@/components/RewardsScreen";
import { CampfireScreen, MerchantScreen, TreasureScreen, UnknownScreen, RunDefeatScreen } from "@/components/roguelike/RoomScreens";
import useGameState from "@/hooks/useGameStateNew";
import { useRunState } from "@/hooks/useRunState";
import { useAudio } from "@/hooks/useAudio";
import { Toaster } from "@/components/ui/sonner";
import CombatLogPanel from "@/ui/CombatLogPanel";
import ArenaBackground from "@/ui/ArenaBackground";
import { CharacterId } from "@/types/roguelike";
import { pickCardRewards } from "@/data/roguelikeData";
import MusicPlayer from "@/components/MusicPlayer";
import { useAnimations, nextAnimId } from "@/hooks/useAnimations";

const Index = () => {
  const [gameMode, setGameMode] = useState<'loading' | 'menu' | 'archives' | 'settings' | 'rules' | 'characterSelect' | 'singleplayer' | 'multiplayer' | 'roguelikeMap' | 'rewards' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'runDefeated'>('loading');
  const handleLoadingComplete = useCallback(() => setGameMode('menu'), []);
  const [pendingMode, setPendingMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [prevModeBeforeRules, setPrevModeBeforeRules] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<any>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const { runState, startRun, abandonRun, enterNode, completeCombat, completeNonCombatNode, collectRewards, healAtCampfire, spendGold, addGold, addCardToDeck, buyCardFromMerchant, buyHealAllFromMerchant, hurtAllCharacters, allocateStatPoint } = useRunState();
  const { gameState, selectTile, endTurn, basicAttack, useAbility, playCard, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement, startBattle, resetGame, cancelTargeting } = useGameState(
    (gameMode === 'singleplayer' || gameMode === 'multiplayer') ? gameMode : 'singleplayer',
    selectedCharacters
  );

  const { t } = useT();
  const { playSound, playMusic, stopMusic } = useAudio();
  const { animations, addAnimation } = useAnimations();
  const [turnFlash, setTurnFlash] = useState<0 | 1 | null>(null);
  const [showEnemyBanner, setShowEnemyBanner] = useState(false);
  const [hideUI, setHideUI] = useState(false);

  // ── Animations: detect HP changes + movement between renders ──────────────────
  // iconId → { hp, q, r } snapshot from previous render
  const prevIconSnapshotRef = useRef<Map<string, { hp: number; q: number; r: number }>>(new Map());

  useEffect(() => {
    const allIcons = gameState.players.flatMap(p => p.icons);
    const snap = prevIconSnapshotRef.current;

    allIcons.forEach(icon => {
      const prev = snap.get(icon.id);
      const currHp = icon.stats.hp;

      if (prev !== undefined) {
        const delta = currHp - prev.hp;

        if (delta < -0.5) {
          // Damage received
          const dmg = Math.round(-delta);
          addAnimation({
            id: nextAnimId('dmg'),
            type: 'damage',
            position: icon.position,
            value: dmg,
          });
          addAnimation({
            id: nextAnimId('impact'),
            type: 'impact',
            position: icon.position,
            color: icon.playerId === 0
              ? 'rgba(239,68,68,0.88)'       // blue team takes red impact
              : 'rgba(251,146,60,0.88)',      // red team takes orange impact
          });
          if (currHp <= 0) {
            addAnimation({
              id: nextAnimId('death'),
              type: 'death',
              position: icon.position,
            });
          }
        } else if (delta > 0.5) {
          // Healing received
          const heal = Math.round(delta);
          addAnimation({
            id: nextAnimId('heal'),
            type: 'heal',
            position: icon.position,
            value: heal,
          });
          addAnimation({
            id: nextAnimId('aura'),
            type: 'aura',
            position: icon.position,
            color: 'rgba(80,255,140,0.85)',
          });
        }
      }

      // Movement trail — fire when position changed
      if (prev !== undefined && (prev.q !== icon.position.q || prev.r !== icon.position.r)) {
        // Trail at old position (where they were)
        addAnimation({
          id: nextAnimId('trail'),
          type: 'trail',
          position: { q: prev.q, r: prev.r },
          color: icon.playerId === 0 ? 'rgba(100,180,255,0.7)' : 'rgba(255,100,100,0.7)',
        });
      }

      snap.set(icon.id, { hp: currHp, q: icon.position.q, r: icon.position.r });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.players]);

  // ── Turn flash + enemy banner when active player changes ─────────────────────
  const prevActivePlayerRef = useRef<number>(gameState.activePlayerId);
  useEffect(() => {
    if (gameState.activePlayerId !== prevActivePlayerRef.current) {
      setTurnFlash(gameState.activePlayerId as 0 | 1);
      setTimeout(() => setTurnFlash(null), 700);
      if (gameState.activePlayerId === 1) {
        setShowEnemyBanner(true);
        setTimeout(() => setShowEnemyBanner(false), 1600);
      }
    }
    prevActivePlayerRef.current = gameState.activePlayerId;
  }, [gameState.activePlayerId]);

  // ── Music: start playlist on load; switch to battle track in combat ──────────
  useEffect(() => {
    playMusic('menu'); // keep playlist running across all modes (no forced track switch)
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
      const mapSeed = runState.seed ^ (runState.battleCount * 31337);
      startBattle(runState.characters, runState.deckCardIds, node.encounter ?? null, mapSeed, true);
      setGameMode('singleplayer');
    }
    if (node.type === 'campfire') {
      setGameMode('campfire');
    }
    if (node.type === 'merchant') {
      setGameMode('merchant');
    }
    if (node.type === 'treasure') {
      setGameMode('treasure');
    }
    if (node.type === 'unknown') {
      setGameMode('unknown');
    }
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

  // ── Projectile animation on tile select (before state updates) ───────────────
  const handleSelectTile = useCallback((coords: { q: number; r: number }) => {
    const cardTm = (gameState as any).cardTargetingMode as { card: any; executorId: string } | undefined;
    const abilityTm = gameState.targetingMode;

    const executorId = cardTm?.executorId ?? abilityTm?.iconId;
    if (executorId) {
      const allIcons = gameState.players.flatMap(p => p.icons);
      const executor = allIcons.find(i => i.id === executorId);
      const targetIcon = allIcons.find(
        i => i.isAlive && i.position.q === coords.q && i.position.r === coords.r
      );

      if (executor && targetIcon && targetIcon.playerId !== executor.playerId) {
        // Range check — only fire projectile if target is actually in range
        const range = abilityTm?.range ?? cardTm?.card?.effect?.range ?? 1;
        const dist = Math.max(
          Math.abs(executor.position.q - coords.q),
          Math.abs(executor.position.r - coords.r),
          Math.abs((executor.position.q + executor.position.r) - (coords.q + coords.r))
        );

        if (dist <= range) {
          const name = executor.name;
          const color = name.includes('Napoleon')  ? 'rgba(255,220,60,0.95)'
            : name.includes('Sun-sin')             ? 'rgba(100,200,255,0.95)'
            : name.includes('Da Vinci')            ? 'rgba(180,120,255,0.95)'
            : name.includes('Genghis')             ? 'rgba(255,140,40,0.95)'
            : name.includes('Leonidas')            ? 'rgba(200,180,60,0.95)'
            :                                        'rgba(255,100,100,0.95)';

          addAnimation({
            id: nextAnimId('proj'),
            type: 'projectile',
            position: targetIcon.position,
            fromPosition: executor.position,
            color,
          });
        }
      }
    }
    selectTile(coords);
  }, [gameState, selectTile, addAnimation]);

  const handlePlayCard = (card: any, executorId: string) => {
    playSound('card_play');
    // Cast burst at executor's current position
    const executor = gameState.players.flatMap(p => p.icons).find(i => i.id === executorId);
    if (executor) {
      const isHeal   = card?.effect?.healing !== undefined || card?.effect?.healZone || card?.effect?.healingMult !== undefined;
      const isBuff   = card?.effect?.atkBonus !== undefined || card?.effect?.defBonus !== undefined || card?.effect?.movementBonus !== undefined || card?.effect?.teamDmgPct !== undefined || card?.effect?.teamDefBuff !== undefined;
      const isShield = card?.effect?.defBonus !== undefined && !card?.effect?.damage;
      addAnimation({
        id: nextAnimId('cast'),
        type: isShield ? 'shield' : isHeal ? 'aura' : 'cast',
        position: executor.position,
        color: isHeal
          ? 'rgba(80,255,140,0.9)'
          : isBuff
            ? 'rgba(255,215,0,0.9)'
            : 'rgba(255,140,20,0.9)',
      });

      // AOE ring for area-effect cards
      const isAoe = card?.effect?.allEnemiesInRange
        || card?.effect?.teamDefBuff !== undefined
        || card?.effect?.teamDmgPct !== undefined
        || card?.effect?.aoeDemoralize
        || card?.effect?.healZone
        || card?.effect?.lineTarget
        || card?.effect?.multiHit;
      if (isAoe) {
        const range = card?.effect?.range ?? 2;
        const aoeColor = isHeal || card?.effect?.teamDefBuff !== undefined || card?.effect?.healZone
          ? 'rgba(80,220,140,0.85)'
          : card?.effect?.teamDmgPct !== undefined
          ? 'rgba(255,215,0,0.85)'
          : 'rgba(255,80,30,0.85)';
        addAnimation({
          id: nextAnimId('aoe'),
          type: 'aoe',
          position: executor.position,
          value: range,
          color: aoeColor,
        });
      }
    }
    playCard(card, executorId);
  };

  // ESC / H key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'h' || event.key === 'H') {
        if (gameMode === 'singleplayer' || gameMode === 'multiplayer') {
          setHideUI(prev => !prev);
        }
      }
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
  }, [gameMode, (gameState as any).targetingMode, cancelTargeting, setHideUI]);

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

  if (gameMode === 'rules') {
    return <GameRules onBack={() => {
      if (prevModeBeforeRules === 'singleplayer' || prevModeBeforeRules === 'multiplayer') {
        setGameMode(prevModeBeforeRules as any);
        setShowEscapeMenu(true);
      } else {
        setGameMode('menu');
      }
      setPrevModeBeforeRules(null);
    }} />;
  }

  if (gameMode === 'menu') {
    return (
      <MainMenu
        onStartGame={handleStartGame}
        onArchives={() => setGameMode('archives')}
        onSettings={() => setGameMode('settings')}
        onRules={() => setGameMode('rules')}
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
        onAllocateStat={allocateStatPoint}
      />
    );
  }

  if (gameMode === 'rewards' && runState?.pendingRewards) {
    return (
      <RewardsScreen
        runState={runState}
        onCollect={(cardId, equipItems) => {
          collectRewards(cardId, equipItems);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'campfire' && runState) {
    return (
      <CampfireScreen
        runState={runState}
        onHeal={(charId) => { healAtCampfire(charId); }}
        onLeave={() => {
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'merchant' && runState) {
    return (
      <MerchantScreen
        runState={runState}
        onBuyCard={(cardId, cost) => { buyCardFromMerchant(cardId, cost); }}
        onBuyHeal={(cost) => { buyHealAllFromMerchant(cost); }}
        onLeave={() => {
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'treasure' && runState) {
    return (
      <TreasureScreen
        runState={runState}
        onTakeCard={(cardId) => { collectRewards(cardId, []); completeNonCombatNode(activeNodeId!); setActiveNodeId(null); setGameMode('roguelikeMap'); }}
        onTakeItem={(item, characterId, slotIndex) => {
          collectRewards(null, [{ characterId, slotIndex, item }]);
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
        onSkip={() => { completeNonCombatNode(activeNodeId!); setActiveNodeId(null); setGameMode('roguelikeMap'); }}
      />
    );
  }

  if (gameMode === 'unknown' && runState) {
    return (
      <UnknownScreen
        runState={runState}
        onChoice={(result) => {
          const rng = () => Math.random();
          if (result === 'gold') {
            hurtAllCharacters(20);
            addGold(60);
          } else if (result === 'card') {
            // Altar: pay 30 HP for a card. Rift: 50/50 card or heavy damage.
            const eventRoll = rng();
            if (eventRoll < 0.5) {
              hurtAllCharacters(30);
              const [card] = pickCardRewards(runState.deckCardIds, rng, runState.characters.map(c => c.id));
              if (card) addCardToDeck(card.definitionId);
            } else {
              hurtAllCharacters(40); // rift backfired
            }
          } else if (result === 'damage') {
            hurtAllCharacters(40);
          }
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'runDefeated' && runState) {
    return (
      <RunDefeatScreen
        runState={runState}
        onBackToMenu={() => { abandonRun(); setGameMode('menu'); }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />
      <Toaster />
      {!hideUI && <MusicPlayer />}

      {/* Full-screen game board */}
      <GameBoard
        gameState={gameState}
        onTileClick={handleSelectTile}
        onTileHover={setHoveredTile}
        animations={animations}
      />

      {/* Turn transition flash */}
      {turnFlash !== null && (
        <div className="absolute inset-0 pointer-events-none z-50" style={{
          boxShadow: turnFlash === 0
            ? 'inset 0 0 80px rgba(59,130,246,0.55)'
            : 'inset 0 0 80px rgba(239,68,68,0.50)',
          animation: turnFlash === 0
            ? 'anim-turn-flash-blue 0.7s ease-out forwards'
            : 'anim-turn-flash-red 0.7s ease-out forwards',
        }} />
      )}

      {/* Enemy turn banner */}
      {showEnemyBanner && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div style={{
            background: 'rgba(140,15,15,0.90)',
            border: '2px solid rgba(255,70,70,0.85)',
            borderRadius: 6,
            padding: '10px 32px',
            color: 'white',
            fontFamily: 'var(--font-orbitron, monospace)',
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: '0 0 18px rgba(255,50,50,0.9)',
            boxShadow: '0 0 35px rgba(200,20,20,0.45)',
            animation: 'anim-enemy-banner 1.6s ease-in-out forwards',
          }}>
            {t.game.enemyTurn}
          </div>
        </div>
      )}

      {/* UI Overlays */}
      {!hideUI && (
        <div className="absolute inset-0 pointer-events-none">
          <HorizontalGameUI
            gameState={gameState}
            onEndTurn={handleEndTurn}
            onUndoMovement={undoMovement}
            onPlayCard={handlePlayCard}
            onSelectIcon={selectIcon}
            hoveredTile={hoveredTile}
            currentTurnTimer={currentTurnTimer}
            onToggleHideUI={() => setHideUI(prev => !prev)}
            runItemsByCharacter={runState ? Object.fromEntries(
              runState.characters.map(c => [c.id, c.items.filter(Boolean).map(item => ({ icon: item!.icon, name: item!.name, description: item!.description }))])
            ) : undefined}
          />
        </div>
      )}

      {/* Ultimate Indicator */}
      {!hideUI && <UltimateIndicator gameState={gameState} />}

      {/* Combat Logs */}
      {!hideUI && (
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
      )}

      {/* When UI is hidden, show a small restore button */}
      {hideUI && (gameMode === 'singleplayer' || gameMode === 'multiplayer') && (
        <button
          onClick={() => setHideUI(false)}
          title="Show UI (H)"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 200,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.20)',
            color: 'rgba(255,255,255,0.70)',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          👁
        </button>
      )}

      {/* Escape Menu */}
      {showEscapeMenu && (
        <EscapeMenu
          onMainMenu={handleBackToMenu}
          onContinue={() => setShowEscapeMenu(false)}
          onRules={() => {
            setShowEscapeMenu(false);
            setPrevModeBeforeRules(gameMode);
            setGameMode('rules');
          }}
        />
      )}

      {(gameMode === 'singleplayer' || gameMode === 'multiplayer') && (gameState.phase === 'victory' || gameState.phase === 'defeat') && (
        <VictoryScreen
          isVictory={gameState.phase === 'victory'}
          playAgainLabel={pendingMode === 'singleplayer' ? 'NEXT ROUND' : 'PLAY AGAIN'}
          onBackToMenu={handleBackToMenu}
          onPlayAgain={() => {
            if (pendingMode === 'singleplayer' && runState && activeNodeId) {
              const won = gameState.phase === 'victory';
              const allIcons = gameState.players[0].icons;
              const finalHps: Record<string, number> = {};
              (['napoleon', 'genghis', 'davinci', 'leonidas', 'sunsin'] as CharacterId[]).forEach(id => {
                const icon = allIcons.find(i => i.name.toLowerCase().includes(
                  id === 'davinci' ? 'vinci' : id === 'sunsin' ? 'sun-sin' : id
                ));
                finalHps[id] = icon?.stats.hp ?? 0;
              });
              completeCombat({
                nodeId: activeNodeId,
                won,
                turnsElapsed: gameState.currentTurn ?? 1,
                finalHps: finalHps as any,
              });
              setActiveNodeId(null);
              setGameMode(won ? 'rewards' : 'runDefeated');
            } else {
              setGameMode('characterSelect');
            }
          }}
        />
      )}
    </div>
  );
};

const IndexWithI18n = () => (
  <LanguageProvider>
    <Index />
  </LanguageProvider>
);

export default IndexWithI18n;
