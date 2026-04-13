import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { preloadPortraits } from "@/utils/portraits";
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
import { CARD_DEFS, CARD_UPGRADES } from "@/data/cards";
import MusicPlayer from "@/components/MusicPlayer";
import { useAnimations, nextAnimId } from "@/hooks/useAnimations";
import { getCharacterPortrait } from "@/utils/portraits";

const Index = () => {
  const [gameMode, setGameMode] = useState<'loading' | 'menu' | 'archives' | 'settings' | 'rules' | 'characterSelect' | 'singleplayer' | 'multiplayer' | 'roguelikeMap' | 'rewards' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'runDefeated' | 'runVictory'>('loading');
  const handleLoadingComplete = useCallback(() => setGameMode('menu'), []);

  // Kick off portrait preloads once on mount so images are cached before first battle
  useEffect(() => { preloadPortraits(); }, []);
  const [pendingMode, setPendingMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [prevModeBeforeRules, setPrevModeBeforeRules] = useState<string | null>(null);
  const [settingsReturnMode, setSettingsReturnMode] = useState<string>('menu');
  const [hoveredTile, setHoveredTile] = useState<any>(null);
  const [hoveredCardRange, setHoveredCardRange] = useState<number | null>(null);
  const [hoveredCardExecutorId, setHoveredCardExecutorId] = useState<string | null>(null);
  const [hoveredEnemyAbilityRange, setHoveredEnemyAbilityRange] = useState<{ iconId: string; range: number } | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const { runState, startRun, abandonRun, enterNode, completeCombat, completeNonCombatNode, collectRewards, healAtCampfire, healAllAtCampfire, upgradeSharedCard, removeCardFromDeck, addItemToCharacter, removeItemFromCharacter, spendGold, addGold, addCardToDeck, buyCardFromMerchant, buyHealAllFromMerchant, hurtAllCharacters, allocateStatPoint, upgradeAbility } = useRunState();
  const [pendingEventItem, setPendingEventItem] = useState<import('@/types/roguelike').RunItem | null>(null);
  const [pendingEventItemSource, setPendingEventItemSource] = useState<'event' | 'merchant'>('event');
  // Shown after events that add a curse — display the curse card before going back to map
  const [pendingCurseAdded, setPendingCurseAdded] = useState<{ curseId: string; nodeId: string } | null>(null);
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
  const [redVignette, setRedVignette] = useState(false);
  const vignetteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phaseBanner, setPhaseBanner] = useState<{ enemyName: string; abilityName: string; icon: string } | null>(null);
  const prevPhaseBannerRef = useRef<string | null>(null);
  const [battleTransition, setBattleTransition] = useState<{ label: string; icon: string } | null>(null);

  // ── Animations: detect HP changes + movement between renders ──────────────────
  // iconId → { hp, q, r } snapshot from previous render
  const prevIconSnapshotRef = useRef<Map<string, { hp: number; q: number; r: number }>>(new Map());

  useEffect(() => {
    const allIcons = gameState.players.flatMap(p => p.icons);
    const snap = prevIconSnapshotRef.current;

    // Detect despawned summoned units (terracotta / drone) — they disappear from the icons array
    snap.forEach((prevData, iconId) => {
      if (!allIcons.find(ic => ic.id === iconId)) {
        // Unit was removed. Fire despawn VFX if it was a summoned unit (ID starts with known prefixes)
        const isSummoned = iconId.startsWith('terracotta_') || iconId.startsWith('drone_') || iconId.startsWith('decoy_');
        if (isSummoned) {
          addAnimation({
            id: nextAnimId('despawn'),
            type: 'despawn',
            position: { q: prevData.q, r: prevData.r },
          });
        }
        snap.delete(iconId);
      }
    });

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
          // Red vignette when player team takes damage
          if (icon.playerId === 0) {
            if (vignetteTimerRef.current) clearTimeout(vignetteTimerRef.current);
            setRedVignette(true);
            vignetteTimerRef.current = setTimeout(() => setRedVignette(false), 650);
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
            playSound('unit_death');
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
          addAnimation({
            id: nextAnimId('heal_ring'),
            type: 'heal_ring',
            position: icon.position,
            color: 'rgba(80,255,140,0.85)',
          });
        }
      }

      // Movement trail + sound — fire when position changed
      if (prev !== undefined && (prev.q !== icon.position.q || prev.r !== icon.position.r)) {
        // Trail at old position (where they were)
        addAnimation({
          id: nextAnimId('trail'),
          type: 'trail',
          position: { q: prev.q, r: prev.r },
          color: icon.playerId === 0 ? 'rgba(100,180,255,0.7)' : 'rgba(255,100,100,0.7)',
        });
        // Only play move sound for player team (avoid noise during AI multi-move)
        if (icon.playerId === 0) playSound('card_play');
      }

      snap.set(icon.id, { hp: currHp, q: icon.position.q, r: icon.position.r });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.players]);

  // ── Base HP change → fire impact + damage number at base tile ──────────────
  const prevBaseHealthRef = useRef<number[]>([100, 100]);
  useEffect(() => {
    const current: number[] = (gameState as any).baseHealth ?? [100, 100];
    const prev = prevBaseHealthRef.current;
    const BASE_POSITIONS = [{ q: -5, r: 4 }, { q: 5, r: -4 }]; // player 0 base, player 1 base
    current.forEach((hp, pid) => {
      const delta = hp - (prev[pid] ?? hp);
      if (delta < -0.5) {
        const pos = BASE_POSITIONS[pid];
        const dmg = Math.round(-delta);
        addAnimation({ id: nextAnimId('dmg'), type: 'damage', position: pos, value: dmg });
        addAnimation({ id: nextAnimId('impact'), type: 'impact', position: pos, color: 'rgba(255,60,20,0.90)' });
        addAnimation({ id: nextAnimId('aoe'), type: 'aoe', position: pos, value: 2, color: 'rgba(255,80,20,0.80)' });
      }
    });
    prevBaseHealthRef.current = current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gameState as any).baseHealth]);

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
        } else if (t.includes('applied') || t.includes('silence') || t.includes('rooted') || t.includes('armor break') || t.includes('mud') || t.includes('poison') || t.includes('blinded')) {
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

  // ── SFX: turn change + card draw ─────────────────────────────────────────
  const prevTurnRef = useRef<number>(gameState.currentTurn ?? 1);
  const prevHandSizeRef = useRef<number>((gameState as any).hand?.length ?? 0);
  useEffect(() => {
    if ((gameState.currentTurn ?? 1) > prevTurnRef.current) {
      playSound('turn_start');
    }
    prevTurnRef.current = gameState.currentTurn ?? 1;
  }, [gameState.currentTurn]);
  // Card draw sound — fires when hand gains cards (draw phase)
  useEffect(() => {
    const hand: any[] = (gameState as any).hand ?? [];
    if (hand.length > prevHandSizeRef.current && gameState.activePlayerId === 0) {
      playSound('card_draw');
    }
    prevHandSizeRef.current = hand.length;
  }, [(gameState as any).hand?.length]);

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
      const transLabel = node.type === 'boss' ? 'BOSS BATTLE' : node.type === 'elite' ? 'ELITE ENCOUNTER' : 'COMBAT';
      const transIcon = node.type === 'boss' ? '💀' : node.type === 'elite' ? '⚡' : '⚔️';
      setBattleTransition({ label: transLabel, icon: transIcon });
      setTimeout(() => {
        startBattle(runState.characters, runState.deckCardIds, node.encounter ?? null, mapSeed, true, runState.battleCount, runState.upgradedCardDefIds, runState.act as 1 | 2 | 3);
        setGameMode('singleplayer');
        setTimeout(() => setBattleTransition(null), 800);
      }, 1100);
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
          const isRanged = name.includes('Napoleon') || name.includes('Sun-sin')
            || name.includes('Da Vinci') || name.includes('Beethoven');

          const slashColor = name.includes('Genghis')  ? 'rgba(255,120,30,0.95)'
            : name.includes('Leonidas')                ? 'rgba(220,190,50,0.95)'
            : name.includes('Sun-sin')                 ? 'rgba(100,210,255,0.95)'
            :                                            'rgba(255,220,60,0.95)';

          const projColor = name.includes('Napoleon')  ? 'rgba(255,220,60,0.95)'
            : name.includes('Sun-sin')                 ? 'rgba(100,200,255,0.95)'
            : name.includes('Da Vinci')                ? 'rgba(180,120,255,0.95)'
            :                                            'rgba(255,100,100,0.95)';

          if (!isRanged && dist === 1) {
            // Melee — slash at target
            addAnimation({
              id: nextAnimId('slash'),
              type: 'slash',
              position: targetIcon.position,
              color: slashColor,
            });
          } else {
            // Ranged / ability — projectile
            addAnimation({
              id: nextAnimId('proj'),
              type: 'projectile',
              position: targetIcon.position,
              fromPosition: executor.position,
              color: projColor,
            });
          }
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
        || card?.effect?.aoeRooted
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
    return <GameSettings onBack={() => setGameMode(settingsReturnMode as any)} />;
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
        onSettings={() => { setSettingsReturnMode('roguelikeMap'); setGameMode('settings'); }}
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
        onUpgradeSharedCard={(defId) => { upgradeSharedCard(defId); }}
        onLeave={() => {
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  if (gameMode === 'merchant' && runState && !pendingEventItem) {
    return (
      <MerchantScreen
        runState={runState}
        onBuyCard={(cardId, cost) => { buyCardFromMerchant(cardId, cost); }}
        onBuyHeal={(cost) => { buyHealAllFromMerchant(cost); }}
        onDuplicateItem={(item, characterId, slotIndex, cost) => {
          spendGold(cost);
          addItemToCharacter(item, characterId, slotIndex);
        }}
        onSellItem={(item, characterId, slotIndex, goldGained) => {
          removeItemFromCharacter(characterId, slotIndex);
          addGold(goldGained);
        }}
        onMysteryBox={(cost) => {
          spendGold(cost);
          const roll = Math.random();
          const charIds = runState.characters.map(c => c.id);
          const CURSE_IDS = ['curse_burden', 'curse_malaise', 'curse_void_echo', 'curse_dread', 'curse_chains'];
          const giveItem = (tier: 'common' | 'uncommon' | 'rare' | 'legendary') => {
            const item = pickItemReward(tier, Math.random, charIds);
            if (item) { setPendingEventItemSource('merchant'); setPendingEventItem(item); }
          };
          // 15% damage | 15% curse | 20% common | 35% uncommon | 10% rare | 5% legendary
          if (roll < 0.15) {
            hurtAllCharacters(20);
            return 'damage';
          } else if (roll < 0.30) {
            const curse = CURSE_IDS[(Math.random() * CURSE_IDS.length) | 0];
            addCardToDeck(curse);
            return 'curse';
          } else if (roll < 0.50) {
            giveItem('common');
            return 'item'; // giveItem now sets pendingEventItem — player assigns on next render
          } else if (roll < 0.85) {
            giveItem('uncommon');
            return 'item';
          } else if (roll < 0.95) {
            giveItem('rare');
            return 'item';
          } else {
            giveItem('legendary');
            return 'item';
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

  if (gameMode === 'unknown' && runState && !pendingEventItem) {
    return (
      <UnknownScreen
        runState={runState}
        onChoice={(result) => {
          const rng = () => Math.random();
          const charIds = runState.characters.map(c => c.id);
          const nodeId = activeNodeId!;

          const randomCurse = () => {
            const CURSE_IDS = ['curse_burden', 'curse_malaise', 'curse_void_echo', 'curse_dread', 'curse_chains'];
            return CURSE_IDS[(Math.random() * CURSE_IDS.length) | 0];
          };

          // Helper: add curse + show notification before completing the node
          const addCurseAndNotify = (curseId: string) => {
            addCardToDeck(curseId);
            setPendingCurseAdded({ curseId, nodeId });
          };

          if (result === 'gold') {
            // Wounded Clone: help her — lose 20 HP, gain 60 gold
            hurtAllCharacters(20);
            addGold(60);
          } else if (result === 'heal') {
            // Altar pray or Abandoned Medkit — restore 30% HP to all
            healAllAtCampfire();
          } else if (result === 'card') {
            // Mysterious Altar A: pay 30 HP all → random card
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
            // Supply Crate: guaranteed item — let player assign it
            const item = pickItemReward('uncommon', rng, charIds);
            if (item) { setPendingEventItem(item); return; }
          } else if (result === 'item_gamble') {
            // Fallen Cache: 50/50 item or 35 damage
            if (rng() < 0.50) {
              const item = pickItemReward('uncommon', rng, charIds);
              if (item) { setPendingEventItem(item); return; }
            } else {
              hurtAllCharacters(35);
            }
          } else if (result === 'curse') {
            // Experimental Serum: flat 20 HP to all + Malaise
            hurtAllCharacters(-20);
            addCurseAndNotify('curse_malaise');
            return;
          } else if (result === 'gold_curse') {
            // Toxic Bloom: +60 gold + random curse
            addGold(60);
            addCurseAndNotify(randomCurse());
            return;
          } else if (result === 'heal_or_damage') {
            // Reality Fracture: 50/50 heal or damage
            if (rng() < 0.5) {
              healAllAtCampfire();
            } else {
              hurtAllCharacters(40);
            }
          } else if (result === 'item_curse') {
            // Void Peddler: gain uncommon item + random curse
            const curseId = randomCurse();
            addCardToDeck(curseId);
            setPendingCurseAdded({ curseId, nodeId });
            const item = pickItemReward('uncommon', rng, charIds);
            if (item) { setPendingEventItem(item); return; }
            return; // curse modal handles navigation
          } else if (result === 'upgrade_curse') {
            // The Corruptor A: upgrade a random existing shared card in deck + Chains of Znyxorga
            const upgradeableIds = runState.deckCardIds.filter(id => {
              const def = CARD_DEFS.find((d: any) => d.definitionId === id);
              return def && def.exclusiveTo === null && CARD_UPGRADES[id] && !runState.upgradedCardDefIds.includes(id);
            });
            if (upgradeableIds.length > 0) {
              const pick = upgradeableIds[(Math.random() * upgradeableIds.length) | 0];
              upgradeSharedCard(pick);
            }
            addCurseAndNotify('curse_chains');
            return;

          // ── New choice-B (and Spectral Merchant A) results ──────────────────
          } else if (result === 'card_free') {
            // Supply Crate B / Reality Fracture B: free card, no cost
            const [card] = pickCardRewards(runState.deckCardIds, rng, charIds);
            if (card) addCardToDeck(card.definitionId);
          } else if (result === 'discard_for_gold') {
            // Wounded Clone B: sacrifice 1 random non-curse card → +45 gold
            const discardable = runState.deckCardIds.filter(id => !id.startsWith('curse_'));
            if (discardable.length > 0) {
              const pick = discardable[(Math.random() * discardable.length) | 0];
              removeCardFromDeck(pick);
            }
            addGold(45);
          } else if (result === 'gold_rift') {
            // Unstable Rift B: safe harvest → +40 gold
            addGold(40);
          } else if (result === 'upgrade_hurt') {
            // Abandoned Medkit B: upgrade 1 random card, −15 HP all
            const upgradeableIds2 = runState.deckCardIds.filter(id => {
              const def = CARD_DEFS.find((d: any) => d.definitionId === id);
              return def && def.exclusiveTo === null && CARD_UPGRADES[id] && !runState.upgradedCardDefIds.includes(id);
            });
            if (upgradeableIds2.length > 0) {
              const pick = upgradeableIds2[(Math.random() * upgradeableIds2.length) | 0];
              upgradeSharedCard(pick);
            }
            hurtAllCharacters(15);
          } else if (result === 'gold_serum') {
            // Experimental Serum B: sell the vials → +55 gold, no curse
            addGold(55);
          } else if (result === 'item_hurt') {
            // Spectral Merchant A: pay 30 HP all → uncommon item
            hurtAllCharacters(30);
            const item = pickItemReward('uncommon', rng, charIds);
            if (item) { setPendingEventItem(item); return; }
          } else if (result === 'card_pay_gold') {
            // Spectral Merchant B: pay 60 gold → 1 random card
            if (runState.gold >= 60) {
              spendGold(60);
              const [card] = pickCardRewards(runState.deckCardIds, rng, charIds);
              if (card) addCardToDeck(card.definitionId);
            }
          } else if (result === 'gold_cache') {
            // Fallen Cache B: take only the coins → +45 gold
            addGold(45);
          } else if (result === 'gold_bloom') {
            // Toxic Bloom B: harvest carefully → +30 gold, no curse
            addGold(30);
          } else if (result === 'item_pay_gold') {
            // Void Peddler B: pay 70 gold → uncommon item, no curse
            if (runState.gold >= 70) {
              spendGold(70);
              const item = pickItemReward('uncommon', rng, charIds);
              if (item) { setPendingEventItem(item); return; }
            }
          } else if (result === 'upgrade_pay_gold') {
            // The Corruptor B: pay 80 gold → upgrade 1 random card, no curse
            if (runState.gold < 80) { completeNonCombatNode(activeNodeId!); setActiveNodeId(null); setGameMode('roguelikeMap'); return; }
            spendGold(80);
            const upgradeableIds3 = runState.deckCardIds.filter(id => {
              const def = CARD_DEFS.find((d: any) => d.definitionId === id);
              return def && def.exclusiveTo === null && CARD_UPGRADES[id] && !runState.upgradedCardDefIds.includes(id);
            });
            if (upgradeableIds3.length > 0) {
              const pick = upgradeableIds3[(Math.random() * upgradeableIds3.length) | 0];
              upgradeSharedCard(pick);
            }
          }
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
    );
  }

  // Pending event item overlay — shown after unknown events that give an item
  if (pendingEventItem && runState) {
    const TIER_COLOR: Record<string, string> = {
      common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
    };
    const item = pendingEventItem;
    const completeAndNavigate = () => {
      setPendingEventItem(null);
      if (pendingEventItemSource === 'merchant') {
        // Return to merchant shop — don't complete the node yet
        setPendingEventItemSource('event');
        setGameMode('merchant');
        return;
      }
      // If a curse notification is also pending, let it handle final navigation
      if (pendingCurseAdded) return;
      completeNonCombatNode(activeNodeId!);
      setActiveNodeId(null);
      setGameMode('roguelikeMap');
    };
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.92)' }} />
        <div className="relative z-10 rounded-2xl p-8 w-full max-w-lg"
          style={{ background: 'rgba(4,2,18,0.97)', border: '1px solid rgba(80,50,140,0.5)' }}>
          <div className="text-center mb-6">
            <span className="text-4xl">{item.icon}</span>
            <p className="font-orbitron font-black text-xl text-white mt-2">{item.name}</p>
            <p className="text-[11px] font-orbitron mt-1" style={{ color: TIER_COLOR[item.tier] }}>{item.tier.toUpperCase()}</p>
            {item.targetCharacter && (
              <p className="text-[10px] font-orbitron mt-0.5" style={{ color: TIER_COLOR[item.tier] }}>
                {item.targetCharacter.toUpperCase()} ONLY
              </p>
            )}
            <p className="text-slate-300 text-[12px] mt-2">{item.description}</p>
            <p className="text-slate-500 text-[11px] mt-3">Choose who equips this item</p>
          </div>
          <div className="flex flex-col gap-3">
            {runState.characters
              .filter(c => c.currentHp > 0)
              .map(char => {
                const alreadyHasIt = char.items.some(s => s?.id === item.id);
                const isTargetMismatch = !alreadyHasIt && item.targetCharacter && !char.displayName.toLowerCase().includes(item.targetCharacter.toLowerCase());
                return (
                  <div key={char.id} className="rounded-xl border border-slate-700/50 p-3"
                    style={{ background: 'rgba(8,5,25,0.9)', opacity: alreadyHasIt ? 0.55 : 1 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <img src={char.portrait} alt={char.displayName} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                      <span className="font-orbitron font-bold text-sm text-white">{char.displayName}</span>
                      {alreadyHasIt && (
                        <span className="text-[9px] text-amber-500/70 font-orbitron ml-auto italic">Already carries this</span>
                      )}
                      {!alreadyHasIt && isTargetMismatch && (
                        <span className="text-[9px] text-orange-400 font-orbitron ml-auto">Wrong class</span>
                      )}
                    </div>
                    {!alreadyHasIt && (
                      <div className="flex gap-2 flex-wrap">
                        {char.items.map((slotItem, idx) => {
                          if (slotItem) return null;
                          return (
                            <button
                              key={idx}
                              disabled={!!isTargetMismatch}
                              onClick={() => {
                                addItemToCharacter(item, char.id as CharacterId, idx);
                                completeAndNavigate();
                              }}
                              className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                              style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                            >
                              + Slot {idx + 1}
                            </button>
                          );
                        })}
                        {char.items.every(s => s !== null) && (
                          <span className="text-[10px] text-slate-600 italic">No empty slots</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          <div className="text-center mt-5">
            <button
              onClick={completeAndNavigate}
              className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline"
            >
              Skip — discard item
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Curse-added notification — shown after events that add a curse to the deck
  if (pendingCurseAdded && !pendingEventItem) {
    const curseDef = CARD_DEFS.find(d => d.definitionId === pendingCurseAdded.curseId);
    const CURSE_EFFECT: Record<string, string> = {
      curse_burden:    'Deck clutter — no end-of-turn penalty, just dead space.',
      curse_malaise:   'End of turn: each character takes 1 damage per unplayed card in hand.',
      curse_void_echo: 'Turn start: −2 mana this turn for each copy drawn.',
      curse_dread:     'End of turn: each character has a 25% chance to be Stunned next turn.',
      curse_chains:    'End of turn: all characters take 10 damage. Every turn it remains costs you.',
    };
    const effect = CURSE_EFFECT[pendingCurseAdded.curseId] ?? 'Lingers in your deck — cannot be removed by playing.';
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #1a0000 0%, #0a0000 60%, #000000 100%)' }}>
        {/* Subtle animated vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(120,0,0,0.04) 8px, rgba(120,0,0,0.04) 10px)' }} />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-4">
          {/* Warning header */}
          <div className="text-center">
            <p className="font-orbitron text-[10px] tracking-[0.5em] text-red-600 mb-2">☠ CURSE ADDED TO DECK</p>
            <h1 className="font-orbitron font-black text-3xl text-red-400"
              style={{ textShadow: '0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3)' }}>
              {curseDef?.name ?? pendingCurseAdded.curseId}
            </h1>
          </div>
          {/* Curse card */}
          <div className="rounded-2xl border-2 border-red-800 p-5 w-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1f0000 0%, #0a0000 60%, #1a0008 100%)',
              boxShadow: '0 0 40px rgba(239,68,68,0.25), inset 0 0 30px rgba(120,0,0,0.15)',
            }}>
            {/* Stripe pattern overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(120,0,0,0.08) 6px, rgba(120,0,0,0.08) 8px)' }} />
            {/* Inner border */}
            <div className="absolute inset-[4px] rounded-xl pointer-events-none"
              style={{ border: '1px solid rgba(239,68,68,0.25)' }} />
            <div className="relative flex items-start gap-4">
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' }}>💀</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-orbitron font-black text-lg text-red-300">{curseDef?.name ?? pendingCurseAdded.curseId}</span>
                  <span className="font-orbitron text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
                    CURSE
                  </span>
                </div>
                <p className="text-red-200/80 text-[12px] leading-relaxed mb-3">{curseDef?.description}</p>
                <div className="rounded-lg px-3 py-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-[10px] text-red-400/90 font-orbitron leading-relaxed">⚠ {effect}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-slate-500 font-orbitron">Stays in your deck — cannot be removed by playing</span>
                </div>
              </div>
            </div>
          </div>
          {/* Dismiss */}
          <button
            onClick={() => {
              setPendingCurseAdded(null);
              completeNonCombatNode(pendingCurseAdded.nodeId);
              setActiveNodeId(null);
              setGameMode('roguelikeMap');
            }}
            className="font-orbitron font-bold px-10 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '2px solid rgba(239,68,68,0.45)',
              color: '#ef4444',
              boxShadow: '0 0 20px rgba(239,68,68,0.12)',
            }}
          >
            UNDERSTOOD — CONTINUE →
          </button>
          <p className="text-slate-600 text-[10px] font-orbitron">This card is now in your deck. Remove it at a Campfire.</p>
        </div>
      </div>
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

      {/* Battle transition curtain */}
      {battleTransition && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          style={{ animation: 'anim-battle-curtain 1.9s ease-in-out forwards' }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.94)' }} />
          <div className="relative z-10 text-center" style={{ animation: 'anim-battle-title 1.5s ease-in-out forwards' }}>
            <div style={{ fontSize: '4rem', marginBottom: 8, filter: 'drop-shadow(0 0 30px rgba(255,60,60,0.9))' }}>
              {battleTransition.icon}
            </div>
            <div style={{
              fontFamily: 'var(--font-orbitron, monospace)',
              fontSize: '0.75rem',
              letterSpacing: '0.42em',
              color: 'rgba(255,140,140,0.80)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>ENTERING</div>
            <div style={{
              fontFamily: 'var(--font-orbitron, monospace)',
              fontSize: '2.6rem',
              fontWeight: 900,
              letterSpacing: '0.10em',
              color: '#ffffff',
              textShadow: '0 0 40px rgba(255,60,60,0.85), 0 0 80px rgba(200,0,0,0.40)',
              textTransform: 'uppercase',
            }}>{battleTransition.label}</div>
          </div>
        </div>
      )}

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
          hoverPreviewExecutorId={hoveredCardExecutorId}
          externalIntentRange={hoveredEnemyAbilityRange}
        />
      </div>

      {/* Red vignette — player team takes damage */}
      {redVignette && (
        <div className="absolute inset-0 pointer-events-none z-50" style={{
          boxShadow: 'inset 0 0 120px rgba(220,10,10,0.65), inset 0 0 55px rgba(255,0,0,0.30)',
          animation: 'anim-vignette-red 0.65s ease-out forwards',
        }} />
      )}

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

      {/* Enemy turn banner — cinematic with portrait strip */}
      {showEnemyBanner && (() => {
        const enemyIcons = gameState.players[1]?.icons.filter(i => i.isAlive) ?? [];
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: 'linear-gradient(135deg, rgba(100,5,5,0.97) 0%, rgba(60,0,0,0.97) 100%)',
              border: '1px solid rgba(255,60,60,0.70)',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(200,10,10,0.50), 0 0 120px rgba(150,0,0,0.25)',
              animation: 'anim-enemy-banner 1.6s ease-in-out forwards',
            }}>
              {/* Portrait strip */}
              {enemyIcons.length > 0 && (
                <div style={{ display: 'flex', gap: 0, borderRight: '1px solid rgba(255,60,60,0.30)' }}>
                  {enemyIcons.slice(0, 3).map(icon => {
                    const portrait = getCharacterPortrait(icon.name);
                    return (
                      <div key={icon.id} style={{ width: 52, height: 64, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                        {portrait ? (
                          <img src={portrait} alt={icon.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%', filter: 'brightness(0.75) saturate(0.8)' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'rgba(185,28,28,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {icon.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(60,0,0,0.7) 100%)' }} />
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Text block */}
              <div style={{ padding: '12px 28px 12px 18px' }}>
                <div style={{
                  fontFamily: 'var(--font-orbitron, monospace)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.30em',
                  color: 'rgba(255,140,140,0.75)',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}>⚔ ENEMY</div>
                <div style={{
                  fontFamily: 'var(--font-orbitron, monospace)',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#fff',
                  textShadow: '0 0 22px rgba(255,60,60,0.95)',
                }}>{t.game.enemyTurn}</div>
              </div>
            </div>
          </div>
        );
      })()}

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
            onCardHoverExecutorId={setHoveredCardExecutorId}
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

      {(gameMode === 'singleplayer' || gameMode === 'multiplayer') && (gameState.phase === 'victory' || gameState.phase === 'defeat') && (() => {
        const allIcons = gameState.players[0].icons;
        const enemyIcons = gameState.players[1].icons;
        const enemiesKilled = enemyIcons.filter(i => !i.isAlive).length;
        const turnsElapsed = gameState.currentTurn ?? 1;
        const combatLog: any[] = (gameState as any).combatLog ?? [];
        const totalDmg = combatLog.reduce((acc: number, e: any) => {
          const m = e?.text?.match(/(\d+)\s*(?:dmg|damage)/i);
          return acc + (m ? parseInt(m[1]) : 0);
        }, 0);
        const combatStats = [
          { label: 'ENEMIES', value: enemiesKilled, accent: '#f87171' },
          { label: 'TURNS', value: turnsElapsed, accent: '#fbbf24' },
          { label: 'DAMAGE', value: totalDmg > 0 ? totalDmg : '—', accent: '#fb923c' },
        ];
        const HERO_NAMES_CHECK = ["Napoleon", "Genghis", "Da Vinci", "Leonidas", "Sun-sin", "Beethoven", "Huang"];
        const characterResults = allIcons
          .filter(icon => HERO_NAMES_CHECK.some(n => icon.name.includes(n)))
          .map(icon => ({
            name: icon.name,
            portrait: getCharacterPortrait(icon.name),
            hpPct: icon.stats.maxHp > 0 ? icon.stats.hp / icon.stats.maxHp : 0,
            isAlive: icon.isAlive,
          }));
        return (
        <VictoryScreen
          isVictory={gameState.phase === 'victory'}
          playAgainLabel={pendingMode === 'singleplayer' ? 'NEXT ROUND' : 'PLAY AGAIN'}
          combatStats={combatStats}
          characterResults={characterResults}
          onBackToMenu={handleBackToMenu}
          onPlayAgain={() => {
            if (pendingMode === 'singleplayer' && runState && activeNodeId) {
              const won = gameState.phase === 'victory';
              const allIcons = gameState.players[0].icons;
              const finalHps: Record<string, number> = {};
              const finalPassiveStacks: Record<string, number> = {};
              (['napoleon', 'genghis', 'davinci', 'leonidas', 'sunsin', 'beethoven', 'huang'] as CharacterId[]).forEach(id => {
                const icon = allIcons.find(i => i.name.toLowerCase().includes(
                  id === 'davinci' ? 'vinci' : id === 'sunsin' ? 'sun-sin' : id
                ));
                finalHps[id] = icon?.stats.hp ?? 0;
                if ((icon?.passiveStacks ?? 0) > 0) finalPassiveStacks[id] = icon!.passiveStacks!;
              });
              const enemyIcons = gameState.players[1]?.icons ?? [];
              completeCombat({
                nodeId: activeNodeId,
                won,
                turnsElapsed: gameState.currentTurn ?? 1,
                finalHps: finalHps as any,
                finalPassiveStacks,
                enemiesKilled: enemyIcons.filter(i => !i.isAlive).length,
              });
              setActiveNodeId(null);
              setGameMode(won ? 'rewards' : 'runDefeated');
            } else {
              setGameMode('characterSelect');
            }
          }}
        />
        );
      })()}
    </div>
  );
};

const IndexWithI18n = () => (
  <LanguageProvider>
    <Index />
  </LanguageProvider>
);

export default IndexWithI18n;
