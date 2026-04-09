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
import { CampfireScreen, MerchantScreen, TreasureScreen, UnknownScreen, RunDefeatScreen, RunVictoryScreen } from "@/components/roguelike/RoomScreens";
import useGameState from "@/hooks/useGameStateNew";
import { useRunState } from "@/hooks/useRunState";
import { useAudio } from "@/hooks/useAudio";
import { Toaster } from "@/components/ui/sonner";
import CombatLogPanel from "@/ui/CombatLogPanel";
import ArenaBackground from "@/ui/ArenaBackground";
import { CharacterId } from "@/types/roguelike";
import { pickCardRewards, pickItemReward } from "@/data/roguelikeData";
import MusicPlayer from "@/components/MusicPlayer";
import { useAnimations, nextAnimId } from "@/hooks/useAnimations";

const Index = () => {
  const [gameMode, setGameMode] = useState<'loading' | 'menu' | 'archives' | 'settings' | 'rules' | 'characterSelect' | 'singleplayer' | 'multiplayer' | 'roguelikeMap' | 'rewards' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'runDefeated' | 'runVictory'>('loading');
  const handleLoadingComplete = useCallback(() => setGameMode('menu'), []);
  const [pendingMode, setPendingMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [prevModeBeforeRules, setPrevModeBeforeRules] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<any>(null);
  const [hoveredCardRange, setHoveredCardRange] = useState<number | null>(null);
  const [hoveredEnemyAbilityRange, setHoveredEnemyAbilityRange] = useState<{ iconId: string; range: number } | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const { runState, startRun, abandonRun, enterNode, completeCombat, completeNonCombatNode, collectRewards, healAtCampfire, healAllAtCampfire, removeCardFromDeck, addItemToCharacter, spendGold, addGold, addCardToDeck, buyCardFromMerchant, buyHealAllFromMerchant, hurtAllCharacters, allocateStatPoint, upgradeAbility } = useRunState();
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
  const [shakeActive, setShakeActive] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phaseBanner, setPhaseBanner] = useState<{ enemyName: string; abilityName: string; icon: string } | null>(null);
  const prevPhaseBannerRef = useRef<string | null>(null);

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
          // Screen shake on heavy hits
          if (dmg >= 20) {
            if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
            setShakeActive(true);
            shakeTimerRef.current = setTimeout(() => setShakeActive(false), 200);
          }
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

  // ── Boss phase announcement ───────────────────────────────────────────────────
  const rawPhaseBanner = (gameState as any).phaseBanner as { enemyName: string; abilityName: string; icon: string } | null | undefined;
  useEffect(() => {
    if (!rawPhaseBanner) return;
    const key = `${rawPhaseBanner.enemyName}:${rawPhaseBanner.abilityName}`;
    if (key === prevPhaseBannerRef.current) return; // already shown this one
    prevPhaseBannerRef.current = key;
    setPhaseBanner(rawPhaseBanner);
    setTimeout(() => setPhaseBanner(null), 2800);
  }, [rawPhaseBanner]);

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
      startBattle(runState.characters, runState.deckCardIds, node.encounter ?? null, mapSeed, true, runState.battleCount, runState.upgradedCardDefIds);
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
        onUpgradeAbility={upgradeAbility}
      />
    );
  }

  if (gameMode === 'rewards' && runState?.pendingRewards) {
    return (
      <RewardsScreen
        runState={runState}
        onCollect={(cardId, equipItems) => {
          const completedNode = runState.map.find(n => n.id === runState.pendingRewards?.completedNodeId);
          const isFinalBoss = completedNode?.type === 'boss' && runState.act === 3;
          collectRewards(cardId, equipItems);
          setGameMode(isFinalBoss ? 'runVictory' : 'roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'campfire' && runState) {
    return (
      <CampfireScreen
        runState={runState}
        onHealAll={() => { healAllAtCampfire(); }}
        onRemoveCard={(cardId) => { removeCardFromDeck(cardId); }}
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
        onDuplicateItem={(item, characterId, slotIndex, cost) => {
          spendGold(cost);
          addItemToCharacter(item, characterId, slotIndex);
        }}
        onMysteryBox={(cost) => {
          spendGold(cost);
          const roll = Math.random();
          if (roll < 0.40) {
            // item — give to first character with an open slot, or slot 0
            const item = pickItemReward('uncommon', Math.random, runState.characters.map(c => c.id));
            const target = runState.characters.find(c => c.currentHp > 0 && c.items.some(s => s === null))
              ?? runState.characters.find(c => c.currentHp > 0);
            if (target && item) {
              const slotIdx = target.items.findIndex(s => s === null);
              addItemToCharacter(item, target.id as CharacterId, slotIdx >= 0 ? slotIdx : 0);
            }
            return 'item';
          } else if (roll < 0.75) {
            addGold(80);
            return 'gold';
          } else {
            hurtAllCharacters(20);
            return 'damage';
          }
        }}
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
          const charIds = runState.characters.map(c => c.id);

          // Pick a random curse card definitionId
          const CURSE_IDS = ['curse_burden', 'curse_malaise', 'curse_void_echo', 'curse_dread', 'curse_chains'];
          const randomCurse = () => CURSE_IDS[(Math.random() * CURSE_IDS.length) | 0];

          if (result === 'gold') {
            // Wounded Clone: help her — lose 20 HP, gain 60 gold
            hurtAllCharacters(20);
            addGold(60);
          } else if (result === 'heal') {
            // Altar pray or Abandoned Medkit — restore 30% HP to all
            healAllAtCampfire();
          } else if (result === 'card') {
            // Altar offer (pay 30 HP) or Spectral Merchant (pay 50 gold)
            hurtAllCharacters(30);
            const [card] = pickCardRewards(runState.deckCardIds, rng, charIds);
            if (card) addCardToDeck(card.definitionId);
          } else if (result === 'card_or_damage') {
            // Unstable Rift: 50/50 card or 40 damage
            if (rng() < 0.5) {
              const [card] = pickCardRewards(runState.deckCardIds, rng, charIds);
              if (card) addCardToDeck(card.definitionId);
            } else {
              hurtAllCharacters(40);
            }
          } else if (result === 'damage') {
            hurtAllCharacters(40);
          } else if (result === 'item') {
            // Supply Crate: guaranteed item
            const item = pickItemReward('uncommon', rng, charIds);
            const target = runState.characters.find(c => c.currentHp > 0 && c.items.some(s => s === null))
              ?? runState.characters.find(c => c.currentHp > 0);
            if (target && item) {
              const slotIdx = target.items.findIndex(s => s === null);
              addItemToCharacter(item, target.id as CharacterId, slotIdx >= 0 ? slotIdx : 0);
            }
          } else if (result === 'item_gamble') {
            // Fallen Cache: 50/50 item or 35 damage
            if (rng() < 0.50) {
              const item = pickItemReward('uncommon', rng, charIds);
              const target = runState.characters.find(c => c.currentHp > 0 && c.items.some(s => s === null))
                ?? runState.characters.find(c => c.currentHp > 0);
              if (target && item) {
                const slotIdx = target.items.findIndex(s => s === null);
                addItemToCharacter(item, target.id as CharacterId, slotIdx >= 0 ? slotIdx : 0);
              }
            } else {
              hurtAllCharacters(35);
            }
          } else if (result === 'curse') {
            // Experimental Serum: heal 20 HP + curse
            healAllAtCampfire(); // heals 30% but close enough; we can accept that
            addCardToDeck(randomCurse());
          } else if (result === 'gold_curse') {
            // Toxic Bloom: gain 40 gold + curse
            addGold(40);
            addCardToDeck(randomCurse());
          } else if (result === 'heal_or_damage') {
            // Reality Fracture: 50/50 heal or damage
            if (rng() < 0.5) {
              healAllAtCampfire();
            } else {
              hurtAllCharacters(40);
            }
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

  if (gameMode === 'runVictory' && runState) {
    return (
      <RunVictoryScreen
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
      <div
        className="absolute inset-0"
        style={shakeActive ? { animation: 'screen-shake 0.18s ease-out' } : undefined}
      >
        <GameBoard
          gameState={gameState}
          onTileClick={handleSelectTile}
          onTileHover={setHoveredTile}
          animations={animations}
          hoverPreviewRange={hoveredCardRange}
          externalIntentRange={hoveredEnemyAbilityRange}
        />
      </div>

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

      {/* Boss Phase Announcement Banner */}
      {phaseBanner && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div style={{
            background: 'linear-gradient(135deg, rgba(60,0,80,0.95) 0%, rgba(120,0,40,0.95) 100%)',
            border: '2px solid rgba(220,80,255,0.75)',
            borderRadius: '12px',
            padding: '22px 48px',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(200,0,255,0.55), 0 0 120px rgba(180,0,60,0.30), inset 0 1px 0 rgba(255,200,255,0.15)',
            animation: 'anim-phase-banner 2.8s ease-in-out forwards',
          }}>
            <div style={{
              fontSize: '0.75rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'rgba(220,150,255,0.85)',
              marginBottom: '6px',
            }}>PHASE SHIFT</div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#ffffff',
              textShadow: '0 0 24px rgba(240,100,255,0.9), 0 0 8px rgba(255,80,80,0.7)',
              lineHeight: 1.1,
            }}>{phaseBanner.icon} {phaseBanner.enemyName}</div>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,160,100,0.95)',
              textShadow: '0 0 14px rgba(255,100,50,0.8)',
              marginTop: '8px',
            }}>{phaseBanner.abilityName}</div>
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
            onCardHoverRange={setHoveredCardRange}
            onEnemyAbilityHoverRange={setHoveredEnemyAbilityRange}
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
