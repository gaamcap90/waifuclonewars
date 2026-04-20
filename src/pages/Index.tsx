import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { preloadPortraits } from "@/utils/portraits";
import { LanguageProvider, useT } from "@/i18n";
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
import { CampfireScreen, MerchantScreen, TreasureScreen, UnknownScreen, RunDefeatScreen, RunVictoryScreen } from "@/components/roguelike/RoomScreens";
import SignatureLegendaryPicker from "@/components/roguelike/SignatureLegendaryPicker";
import useGameState from "@/hooks/useGameStateNew";
import { useRunState } from "@/hooks/useRunState";
import { useAudio } from "@/hooks/useAudio";
import { Toaster, toast } from "@/components/ui/sonner";
import CombatLogPanel from "@/ui/CombatLogPanel";
import ArenaBackground from "@/ui/ArenaBackground";
import { CharacterId } from "@/types/roguelike";
import { pickCardRewards, pickItemReward } from "@/data/roguelikeData";
import { CARD_DEFS, CARD_UPGRADES } from "@/data/cards";
import MusicPlayer from "@/components/MusicPlayer";
import { useAnimations, nextAnimId } from "@/hooks/useAnimations";
import { getCharacterPortrait } from "@/utils/portraits";
import { useTutorialState, loadTutorialDone } from "@/hooks/useTutorialState";
import { TutorialOverlay, TutorialCompleteOverlay } from "@/components/tutorial/TutorialOverlay";
import { TUTORIAL_CHARS } from "@/data/tutorialData";
import type { TutorialRunNode } from "@/data/tutorialData";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementToast } from "@/components/AchievementToast";
import { useCloneDialogue } from "@/hooks/useCloneDialogue";

type GameMode = 'loading' | 'menu' | 'archives' | 'achievements' | 'settings' | 'characterSelect' | 'singleplayer' | 'multiplayer' | 'roguelikeMap' | 'rewards' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'runDefeated' | 'runVictory';

// Screens that open as overlays — no fade transition
const OVERLAY_MODES = new Set<GameMode>(['settings', 'archives', 'achievements']);

// Per-character cast burst colors — used for ability/card VFX
const CHARACTER_VFX_COLORS: Record<string, string> = {
  Napoleon:   'rgba(59,130,246,0.95)',   // imperial blue
  Genghis:    'rgba(220,38,38,0.95)',    // blood red
  'Da Vinci': 'rgba(16,185,129,0.95)',   // renaissance emerald
  Leonidas:   'rgba(245,158,11,0.95)',   // Spartan gold
  'Sun-sin':  'rgba(6,182,212,0.95)',    // ocean cyan
  Beethoven:  'rgba(139,92,246,0.95)',   // deep violet
  Huang:      'rgba(249,115,22,0.95)',   // terracotta orange
  Nelson:     'rgba(14,165,233,0.95)',   // admiral sky-blue
  Hannibal:   'rgba(168,85,247,0.95)',   // Carthaginian purple
  Picasso:    'rgba(236,72,153,0.95)',   // cubist pink
  Teddy:      'rgba(34,197,94,0.95)',    // rough-rider green
  Mansa:      'rgba(234,179,8,0.95)',    // golden wealth
};

const LEGACY_MAIN_STAT: Record<string, 'might' | 'power' | 'defense'> = {
  napoleon: 'might', genghis: 'might', davinci: 'power',
  leonidas: 'defense', sunsin: 'power', beethoven: 'power',
  huang: 'might', nelson: 'might', hannibal: 'might',
  picasso: 'power', teddy: 'might', mansa: 'power',
};

/** Capture final HP and passive stack values from all player icons after combat. */
function captureIconStates(playerIcons: any[]): { finalHps: Record<string, number>; finalPassiveStacks: Record<string, number> } {
  const finalHps: Record<string, number> = {};
  const finalPassiveStacks: Record<string, number> = {};
  (['napoleon', 'genghis', 'davinci', 'leonidas', 'sunsin', 'beethoven', 'huang', 'nelson', 'hannibal', 'picasso', 'teddy', 'mansa'] as CharacterId[]).forEach(id => {
    const icon = playerIcons.find((i: any) => i.name.toLowerCase().includes(
      id === 'davinci' ? 'vinci' : id === 'sunsin' ? 'sun-sin' : id === 'teddy' ? 'teddy' : id
    ));
    finalHps[id] = icon?.stats.hp ?? 0;
    if ((icon?.passiveStacks ?? 0) > 0) finalPassiveStacks[id] = icon!.passiveStacks!;
  });
  return { finalHps, finalPassiveStacks };
}

const Index = () => {
  const [gameMode, setGameModeRaw] = useState<GameMode>('loading');
  const [veil, setVeil] = useState<'idle' | 'out' | 'in'>('idle');
  const veilTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drop-in replacement for setGameMode — fades to black, switches, fades back
  const setGameMode = useCallback((mode: GameMode) => {
    if (OVERLAY_MODES.has(mode) || OVERLAY_MODES.has(gameMode as GameMode)) {
      setGameModeRaw(mode);
      return;
    }
    if (veilTimerRef.current) clearTimeout(veilTimerRef.current);
    setVeil('out');
    // 260ms wipe-out → 70ms hold at full black (emblem readable) → wipe-in
    veilTimerRef.current = setTimeout(() => {
      setGameModeRaw(mode);
      setVeil('in');
      veilTimerRef.current = setTimeout(() => setVeil('idle'), 380);
    }, 330);
  }, [gameMode]);

  const handleLoadingComplete = useCallback(() => setGameModeRaw('menu'), []);

  // Kick off portrait preloads once on mount so images are cached before first battle
  useEffect(() => { preloadPortraits(); }, []);
  const [pendingMode, setPendingMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [settingsReturnMode, setSettingsReturnMode] = useState<string>('menu');
  const [hoveredTile, setHoveredTile] = useState<any>(null);
  const [hoveredCardRange, setHoveredCardRange] = useState<number | null>(null);
  const [hoveredCardExecutorId, setHoveredCardExecutorId] = useState<string | null>(null);
  const [hoveredEnemyAbilityRange, setHoveredEnemyAbilityRange] = useState<{ iconId: string; range: number } | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [merchantPurchasedCardDefs, setMerchantPurchasedCardDefs] = useState<Set<string>>(new Set());
  const { runState, hasSavedRun, startRun, abandonRun, enterNode, completeCombat, completeNonCombatNode, collectRewards, healAtCampfire, healAllAtCampfire, upgradeSharedCard, removeCardFromDeck, addItemToCharacter, removeItemFromCharacter, spendGold, addGold, addCardToDeck, buyCardFromMerchant, buyHealAllFromMerchant, hurtAllCharacters, allocateStatPoint, upgradeAbility, startTutorialRun, grantSignatureLegendary, clearActBonusNotice } = useRunState();
  const [pendingEventItem, setPendingEventItem] = useState<import('@/types/roguelike').RunItem | null>(null);
  const [pendingEventItemSource, setPendingEventItemSource] = useState<'event' | 'merchant'>('event');
  const [showSignatureLegendaryPicker, setShowSignatureLegendaryPicker] = useState(false);
  const [actBonusPopup, setActBonusPopup] = useState<{ totalMana: number } | null>(null);
  // Shown after events that add a curse — display the curse card before going back to map
  const [pendingCurseAdded, setPendingCurseAdded] = useState<{ curseId: string; nodeId: string } | null>(null);
  const { gameState, selectTile, endTurn, basicAttack, useAbility, playCard, currentTurnTimer, selectIcon, undoMovement, respawnCharacter, startRespawnPlacement, startBattle, resetGame, cancelTargeting } = useGameState(
    (gameMode === 'singleplayer' || gameMode === 'multiplayer') ? gameMode : 'singleplayer',
    selectedCharacters
  );

  const { t } = useT();
  const { playSound, playMusic, stopMusic } = useAudio();
  const { animations, addAnimation } = useAnimations();
  const { tutorialState, currentStep, totalStepsInStage, stageId, startTutorial, skipTutorial, advanceTutorial, setTutorialStage, clearJustCompleted } = useTutorialState();
  const { fireEvent, toastQueue, dismissToast, isLoreUnlocked, isUnlocked, stats, newUnlockCount, newAchievementIds, newAchievementCount, markAchievementSeen, clearNewCounts, totalUnlockedPoints, unlockedCharacterIds, unlocked, devAllCharsUnlocked, toggleDevCharUnlock, fogOfWarTier, activeRunPerks } = useAchievements();
  const { activeDialogue, notifyInteraction } = useCloneDialogue(gameState, runState?.battleCount ?? 0);
  // Tracks which characters used their ultimate in the current fight (reset on fight start)
  const fightUltimatesRef = useRef<Set<string>>(new Set());
  // Tracks whether any player icon took damage in the current fight
  const fightDamageTakenRef = useRef(false);
  // Snapshot of player icon HPs at fight start (to detect no-damage runs)
  const fightStartHpRef = useRef<Record<string, number>>({});
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(!loadTutorialDone());
  const [turnFlash, setTurnFlash] = useState<0 | 1 | null>(null);
  const [showEnemyBanner, setShowEnemyBanner] = useState(false);
  const [showPlayerBanner, setShowPlayerBanner] = useState(false);
  const [hideUI, setHideUI] = useState(false);
  const [shakeAnim, setShakeAnim] = useState<string | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [redVignette, setRedVignette] = useState(false);
  const vignetteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phaseBanner, setPhaseBanner] = useState<{ enemyName: string; abilityName: string; icon: string } | null>(null);
  const prevPhaseBannerRef = useRef<string | null>(null);
  const [battleTransition, setBattleTransition] = useState<{ label: string; icon: string; isBoss?: boolean } | null>(null);

  // ── Notify dialogue system on first player interaction ───────────────────────
  useEffect(() => {
    if (hoveredTile !== null || hoveredCardRange !== null) notifyInteraction();
  }, [hoveredTile, hoveredCardRange]);

  // ── Act completion mana bonus notification ────────────────────────────────────
  useEffect(() => {
    if (runState?.pendingActBonusNotice && gameMode === 'roguelikeMap') {
      const totalMana = 5 + runState.pendingActBonusNotice;
      setActBonusPopup({ totalMana });
      clearActBonusNotice();
    }
  }, [runState?.pendingActBonusNotice, gameMode]);

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

    // Collect damage events to stagger VFX across multi-hit abilities
    const dmgQueue: Array<{ pos: { q: number; r: number }; dmg: number; isKill: boolean; playerId: number }> = [];

    allIcons.forEach(icon => {
      const prev = snap.get(icon.id);
      const currHp = icon.stats.hp;

      if (prev !== undefined) {
        const delta = currHp - prev.hp;

        if (delta < -0.5) {
          const dmg = Math.round(-delta);
          if (icon.playerId === 0) fightDamageTakenRef.current = true;
          // Red vignette fires immediately so it doesn't feel delayed
          if (icon.playerId === 0) {
            if (vignetteTimerRef.current) clearTimeout(vignetteTimerRef.current);
            setRedVignette(true);
            vignetteTimerRef.current = setTimeout(() => setRedVignette(false), 650);
          }
          dmgQueue.push({ pos: { ...icon.position }, dmg, isKill: currHp <= 0, playerId: icon.playerId });
        } else if (delta > 0.5) {
          if (prev.hp <= 0 && currHp > 0) {
            // Respawn — unit materialises from nothing
            addAnimation({ id: nextAnimId('cast'),      type: 'cast',      position: icon.position, color: 'rgba(140,200,255,0.95)' });
            addAnimation({ id: nextAnimId('shield'),    type: 'shield',    position: icon.position, color: 'rgba(120,180,255,0.90)' });
            addAnimation({ id: nextAnimId('aura'),      type: 'aura',      position: icon.position, color: 'rgba(160,220,255,0.80)' });
            addAnimation({ id: nextAnimId('heal_ring'), type: 'heal_ring', position: icon.position, color: 'rgba(100,180,255,0.75)' });
            playSound('ability_cast');
          } else {
            // Normal healing received
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
        // Knockback landing burst — enemy moved during player's turn = knockback ability
        if (icon.playerId === 1 && gameState.activePlayerId === 0) {
          addAnimation({
            id: nextAnimId('knockback'),
            type: 'knockback',
            position: icon.position,
            fromPosition: { q: prev.q, r: prev.r },
            color: 'rgba(100,220,255,0.92)',
          });
        }
        // Only play move sound for player team (avoid noise during AI multi-move)
        if (icon.playerId === 0) {
          playSound('card_play');
          advanceTutorial('any_move');
        }
      }

      snap.set(icon.id, { hp: currHp, q: icon.position.q, r: icon.position.r });
    });

    // Stagger damage VFX: 120ms between targets for multi-hit abilities, instant for single hits
    const STAGGER_MS = 120;
    dmgQueue.forEach(({ pos, dmg, isKill, playerId }, i) => {
      const delay = dmgQueue.length > 1 ? i * STAGGER_MS : 0;
      const fire = () => {
        addAnimation({ id: nextAnimId('dmg'), type: 'damage', position: pos, value: dmg });
        addAnimation({
          id: nextAnimId('impact'), type: 'impact', position: pos,
          color: playerId === 0 ? 'rgba(239,68,68,0.88)' : 'rgba(251,146,60,0.88)',
        });
        if (isKill) {
          addAnimation({ id: nextAnimId('death'), type: 'death', position: pos });
          playSound('unit_death');
        }
        // Screen shake fires with the first hit
        if (i === 0 && dmg >= 20) {
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          const anim = dmg >= 60 ? 'screen-shake-massive' : dmg >= 40 ? 'screen-shake-heavy' : 'screen-shake';
          const dur  = dmg >= 60 ? 320 : dmg >= 40 ? 260 : 200;
          setShakeAnim(anim);
          shakeTimerRef.current = setTimeout(() => setShakeAnim(null), dur);
        }
      };
      if (delay === 0) fire();
      else setTimeout(fire, delay);
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

  // ── 0-damage hits → "BLOCKED" shield VFX ────────────────────────────────────
  const prevZeroHitsRef = useRef<{q:number,r:number}[]>([]);
  useEffect(() => {
    const positions: {q:number,r:number}[] = (gameState as any).pendingZeroHitPositions ?? [];
    if (positions.length > 0 && positions !== prevZeroHitsRef.current) {
      positions.forEach(pos => {
        addAnimation({ id: nextAnimId('shield'), type: 'shield', position: pos, color: 'rgba(120,200,255,0.95)' });
        addAnimation({ id: nextAnimId('impact'), type: 'impact', position: pos, color: 'rgba(120,200,255,0.70)' });
      });
    }
    prevZeroHitsRef.current = positions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gameState as any).pendingZeroHitPositions]);

  // ── In-battle arena event → achievement counter ──────────────────────────────
  const prevArenaEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    const ev = (gameState as any).arenaEvent as { id: string } | null | undefined;
    const age: number = (gameState as any).arenaEventAge ?? 1;
    if (!ev || age !== 0) return;
    if (ev.id === prevArenaEventIdRef.current) return;
    prevArenaEventIdRef.current = ev.id;
    if (!runState?.isTutorialRun) fireEvent('arena_event_triggered');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(gameState as any).arenaEvent, (gameState as any).arenaEventAge]);

  // ── Turn flash + enemy banner when active player changes ─────────────────────
  const prevActivePlayerRef = useRef<number>(gameState.activePlayerId);
  useEffect(() => {
    if (gameState.activePlayerId !== prevActivePlayerRef.current) {
      setTurnFlash(gameState.activePlayerId as 0 | 1);
      setTimeout(() => setTurnFlash(null), 700);
      if (gameState.activePlayerId === 1) {
        setShowEnemyBanner(true);
        setTimeout(() => setShowEnemyBanner(false), 1600);
      } else {
        setShowPlayerBanner(true);
        setTimeout(() => setShowPlayerBanner(false), 1400);
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

  // ── SFX: victory / defeat + fight_ended achievement event ───────────────────
  const prevPhaseRef = useRef(gameState.phase);
  useEffect(() => {
    if (gameState.phase !== prevPhaseRef.current) {
      if (gameState.phase === 'victory') {
        playSound('victory');
        advanceTutorial('battle_won');
        // Fire fight_ended achievement event (skip during tutorial runs)
        if (!runState?.isTutorialRun) {
          const playerIcons = gameState.players[0]?.icons ?? [];
          const enemyIcons  = gameState.players[1]?.icons ?? [];
          const alivePlayerIcons = playerIcons.filter((i: any) => i.isAlive);
          const turns = gameState.currentTurn ?? 1;
          const killedLog: string[] = (gameState as any).killedEnemyNameLog ?? [];
          fireEvent('fight_ended', {
            won:            true,
            turnsElapsed:   turns,
            enemiesKilled:  killedLog.length,
            killedEnemyNames: killedLog,
            allAlive:       alivePlayerIcons.length === playerIcons.length,
            oneCloneAlive:  alivePlayerIcons.length === 1,
            noDamageTaken:  !fightDamageTakenRef.current,
            anyAt1Hp:       alivePlayerIcons.some((i: any) => i.stats.hp <= 1),
            survivedLethal: false,
            napoleonUltimate: fightUltimatesRef.current.has('napoleon'),
            genghisUltimate:  fightUltimatesRef.current.has('genghis'),
          });
          if (turns === 1) fireEvent('fight_1_turn');
        }
        fightUltimatesRef.current = new Set();
        fightDamageTakenRef.current = false;
      }
      if (gameState.phase === 'defeat') {
        playSound('defeat');
        if (!runState?.isTutorialRun) {
          fireEvent('fight_ended', {
            won: false, turnsElapsed: gameState.currentTurn ?? 1,
            enemiesKilled: 0, allAlive: false, oneCloneAlive: false,
            noDamageTaken: false, anyAt1Hp: false, survivedLethal: false,
            napoleonUltimate: false, genghisUltimate: false,
          });
        }
        fightUltimatesRef.current = new Set();
        fightDamageTakenRef.current = false;
      }
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase]);

  // ── Tutorial complete → fire achievement event ───────────────────────────
  useEffect(() => {
    if (tutorialState.justCompleted) fireEvent('tutorial_complete');
  }, [tutorialState.justCompleted]);

  // ── Tutorial: skip victory screen → go straight to rewards ──────────────
  const tutorialVictoryHandledRef = useRef(false);
  useEffect(() => {
    if (gameState.phase !== 'victory') { tutorialVictoryHandledRef.current = false; return; }
    if (!runState?.isTutorialRun || gameMode !== 'singleplayer' || !activeNodeId) return;
    if (tutorialVictoryHandledRef.current) return;
    tutorialVictoryHandledRef.current = true;

    const allIcons = gameState.players[0].icons;
    const finalHps: Record<string, number> = {};
    const finalPassiveStacks: Record<string, number> = {};
    (['napoleon', 'genghis', 'davinci', 'leonidas', 'sunsin', 'beethoven', 'huang', 'nelson', 'hannibal', 'picasso', 'teddy', 'mansa'] as CharacterId[]).forEach(id => {
      const icon = allIcons.find(i => i.name.toLowerCase().includes(
        id === 'davinci' ? 'vinci' : id === 'sunsin' ? 'sun-sin' : id === 'teddy' ? 'teddy' : id
      ));
      // Only record HP for icons that actually participated — characters not in this battle
      // are omitted so completeCombat keeps their existing currentHp instead of zeroing them out
      if (icon) {
        finalHps[id] = icon.stats.hp;
        if ((icon.passiveStacks ?? 0) > 0) finalPassiveStacks[id] = icon.passiveStacks!;
      }
    });
    completeCombat({
      nodeId: activeNodeId,
      won: true,
      turnsElapsed: gameState.currentTurn ?? 1,
      finalHps: finalHps as any,
      finalPassiveStacks,
      enemiesKilled: (gameState.players[1]?.icons ?? []).filter(i => !i.isAlive).length,
      killBlowsByName: (gameState as any).playerKillBlows ?? {},
    });
    setActiveNodeId(null);
    setGameMode('rewards');
  }, [gameState.phase, gameMode, runState?.isTutorialRun, activeNodeId]);

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer') => {
    playSound('ui_click');
    setPendingMode(mode);
    setGameMode('characterSelect');
  };

  const handleCharacterSelectionComplete = (selectedIcons: any[]) => {
    setSelectedCharacters(selectedIcons);
    if (pendingMode === 'singleplayer') {
      startRun(selectedIcons.map(c => c.id));
      fireEvent('run_started');
      setGameMode('roguelikeMap');
    } else {
      setGameMode('multiplayer');
    }
  };

  // ── Tutorial action gate ─────────────────────────────────────────────────────
  // Returns false if the tutorial is active and this action type isn't the current goal.
  const tutorialBlocks = useCallback((action: 'move' | 'card' | 'end_turn') => {
    if (!tutorialState.active || !currentStep) return false;
    const trigger = currentStep.trigger;
    if (trigger === 'battle_won') return false; // fight freely
    switch (action) {
      case 'move':     return trigger !== 'any_move';
      case 'card':     return trigger !== 'any_card';
      case 'end_turn': return trigger !== 'end_turn';
      default:         return false;
    }
  }, [tutorialState.active, currentStep]);

  const handleStartTutorial = useCallback(() => {
    setShowTutorialPrompt(false);
    setSelectedCharacters(TUTORIAL_CHARS as any[]);
    startTutorialRun();
    startTutorial();
    setGameMode('roguelikeMap');
  }, [startTutorialRun, startTutorial]);

  const handleNodeSelect = (nodeId: string) => {
    if (!runState) return;
    // Tutorial gate: block node clicks unless the current step's goal is to click a node
    if (tutorialState.active && currentStep && currentStep.trigger !== 'fight_node_clicked') return;
    const node = runState.map.find(n => n.id === nodeId);
    if (!node) return;
    playSound('ui_click');
    enterNode(nodeId);
    setActiveNodeId(nodeId);
    if (node.type === 'enemy' || node.type === 'elite' || node.type === 'boss') {
      if (runState.isTutorialRun) {
        const tutNode = node as TutorialRunNode;
        advanceTutorial('fight_node_clicked');
        setTutorialStage(tutNode.tutorialStage);
      }
      const mapSeed = runState.seed ^ (runState.battleCount * 31337);
      const transLabel = node.type === 'boss' ? 'BOSS BATTLE' : node.type === 'elite' ? 'ELITE ENCOUNTER' : 'COMBAT';
      const transIcon = node.type === 'boss' ? '💀' : node.type === 'elite' ? '⚡' : '⚔️';
      setBattleTransition({ label: transLabel, icon: transIcon, isBoss: node.type === 'boss' });
      const charsToUse = runState.isTutorialRun
        ? runState.characters.filter(c => (node as TutorialRunNode).tutorialCharIds?.includes(c.id))
        : runState.characters;
      const legacyBonus = (runState.act ?? 1) * 5;
      const charsWithLegacy = charsToUse.map(c => {
        const mainStat = LEGACY_MAIN_STAT[c.id];
        if (!mainStat || !unlocked.has(`legacy_${c.id}`)) return c;
        return { ...c, statBonuses: { ...c.statBonuses, [mainStat]: c.statBonuses[mainStat] + legacyBonus } };
      });
      // Sync selectedCharacters so the game hook builds only the correct icons
      if (runState.isTutorialRun) {
        const tutCharsFull = (TUTORIAL_CHARS as any[]).filter(c => (node as TutorialRunNode).tutorialCharIds?.includes(c.id));
        setSelectedCharacters(tutCharsFull);
      }
      setTimeout(() => {
        fightUltimatesRef.current = new Set();
        fightDamageTakenRef.current = false;
        fightStartHpRef.current = {};
        startBattle(charsWithLegacy, runState.deckCardIds, node.encounter ?? null, mapSeed, true, runState.battleCount, runState.upgradedCardDefIds, runState.act as 1 | 2 | 3 | 4, runState.permanentManaBonus ?? 0);
        setGameMode('singleplayer');
        setTimeout(() => setBattleTransition(null), 800);
      }, 1100);
    }
    if (node.type === 'campfire') {
      if (runState.isTutorialRun) {
        setTutorialStage('s3b_campfire');
      }
      setGameMode('campfire');
    }
    if (node.type === 'merchant') {
      setMerchantPurchasedCardDefs(new Set()); // reset per merchant visit
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
    if (tutorialState.active) skipTutorial();
    resetGame();
    setGameMode('menu');
    setShowEscapeMenu(false);
  };

  const handleEndTurn = () => {
    if (tutorialBlocks('end_turn')) return;
    playSound('end_turn');
    advanceTutorial('end_turn');
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
    // Tutorial: block completing a card target when cards aren't the current goal
    if (tutorialState.active && currentStep && (cardTm || abilityTm)) {
      const trigger = currentStep.trigger;
      if (trigger !== 'any_card' && trigger !== 'battle_won') return;
    }

    // Capture abilityTm before selectTile clears it
    const wasBasicAttackMode = abilityTm?.abilityId === 'basic_attack';
    selectTile(coords);
    // For targeted-card tutorial steps (Basic Attack), advance only when hit lands on a living enemy.
    // Basic Attack uses targetingMode (not cardTargetingMode), so check abilityTm instead of cardTm.
    if (tutorialState.active && currentStep?.trigger === 'any_card' && currentStep?.highlight === 'basic_attack_card') {
      if (cardTm || wasBasicAttackMode) {
        const allIcons = gameState.players.flatMap(p => p.icons);
        const hitLivingEnemy = allIcons.some(
          i => i.isAlive && i.playerId === 1 && i.position.q === coords.q && i.position.r === coords.r
        );
        if (hitLivingEnemy) advanceTutorial('any_card');
      }
    }
  }, [gameState, selectTile, addAnimation, advanceTutorial, tutorialState.active, currentStep]);

  const ACTIVE_GAME_MODES = ['combat', 'roguelikeMap', 'campfire', 'merchant', 'treasure', 'unknown', 'rewards', 'runDefeated', 'runVictory'];
  const handleLoreClick = () => {
    if (ACTIVE_GAME_MODES.includes(gameMode)) {
      if (!window.confirm('Leave the current game screen and view the Archives?\n\nYour run progress is saved.')) return;
    }
    setGameMode('archives');
  };

  const handlePlayCard = (card: any, executorId: string) => {
    playSound('card_play');
    // Achievement tracking — fire card_played event
    const isUltimate = card?.rarity === 'ultimate';
    if (isUltimate && !runState?.isTutorialRun) {
      // Map executor icon name → characterId
      const allIcons = gameState.players.flatMap((p: any) => p.icons);
      const executor = allIcons.find((i: any) => i.id === executorId);
      if (executor) {
        const name = executor.name.toLowerCase();
        const charId = name.includes('napoleon') ? 'napoleon'
          : name.includes('genghis')   ? 'genghis'
          : name.includes('leonidas')  ? 'leonidas'
          : name.includes('sun-sin')   ? 'sunsin'
          : name.includes('vinci')     ? 'davinci'
          : name.includes('beethoven') ? 'beethoven'
          : name.includes('huang')     ? 'huang'
          : name.includes('nelson')    ? 'nelson'
          : name.includes('hannibal')  ? 'hannibal'
          : name.includes('picasso')   ? 'picasso'
          : name.includes('teddy')     ? 'teddy'
          : name.includes('mansa')     ? 'mansa'
          : null;
        if (charId) {
          fightUltimatesRef.current.add(charId);
          const ultId = card.definitionId?.includes('final_salvo') ? 'final_salvo' : undefined;
          fireEvent('card_played', { isUltimate: true, characterId: charId, ultimateId: ultId });
        }
      }
    } else if (!runState?.isTutorialRun) {
      fireEvent('card_played', { isUltimate: false, characterId: '' });
    }
    // Cast burst at executor's current position
    const executor = gameState.players.flatMap(p => p.icons).find(i => i.id === executorId);
    if (executor) {
      const isHeal   = card?.effect?.healing !== undefined || card?.effect?.healZone || card?.effect?.healingMult !== undefined;
      const isBuff   = card?.effect?.atkBonus !== undefined || card?.effect?.defBonus !== undefined || card?.effect?.movementBonus !== undefined || card?.effect?.teamDmgPct !== undefined || card?.effect?.teamDefBuff !== undefined;
      const isShield = card?.effect?.defBonus !== undefined && !card?.effect?.damage;
      const charColor = Object.entries(CHARACTER_VFX_COLORS).find(([k]) => executor.name.includes(k))?.[1];
      addAnimation({
        id: nextAnimId('cast'),
        type: isShield ? 'shield' : isHeal ? 'aura' : 'cast',
        position: executor.position,
        color: isHeal
          ? 'rgba(80,255,140,0.9)'
          : charColor ?? (isBuff ? 'rgba(255,215,0,0.9)' : 'rgba(255,140,20,0.9)'),
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
    if (tutorialBlocks('card')) return;
    // Restrict to the specific highlighted card when a card-spotlight step is active
    if (tutorialState.active && currentStep?.highlight === 'basic_attack_card' && card.definitionId !== 'shared_basic_attack') return;
    if (tutorialState.active && currentStep?.highlight === 'shields_up_card' && card.definitionId !== 'shared_shield') return;
    // Basic Attack is a targeted card — defer advanceTutorial to handleSelectTile (after the hit lands).
    // All other any_card steps use non-targeted cards and can advance immediately.
    const isTargetedTutCard = tutorialState.active && currentStep?.highlight === 'basic_attack_card';
    if (!isTargetedTutCard) advanceTutorial('any_card');
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

  // ── Veil overlay — always rendered as sibling, persists across mode switches ──
  const isWipeOut = veil === 'out';
  const screenVeil = veil !== 'idle' ? (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        background: '#04030e',
        backgroundImage: [
          'repeating-linear-gradient(0deg,   rgba(139,92,246,0.04) 0px, rgba(139,92,246,0.04) 1px, transparent 1px, transparent 48px)',
          'repeating-linear-gradient(90deg,  rgba(139,92,246,0.04) 0px, rgba(139,92,246,0.04) 1px, transparent 1px, transparent 48px)',
        ].join(', '),
        animation: isWipeOut
          ? 'anim-veil-wipe-out 0.26s ease-in forwards'
          : 'anim-veil-wipe-in 0.38s ease-out forwards',
        overflow: 'hidden',
      }}
    >
      {/* Leading-edge energy scanline — sweeps in sync with clip-path wipe */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 3,
        background: 'linear-gradient(to bottom, rgba(139,92,246,0.3) 0%, rgba(34,211,238,0.95) 30%, rgba(255,255,255,1) 50%, rgba(34,211,238,0.95) 70%, rgba(139,92,246,0.3) 100%)',
        boxShadow: '0 0 20px rgba(34,211,238,0.8), 0 0 50px rgba(139,92,246,0.4)',
        animation: isWipeOut
          ? 'anim-veil-scanline-out 0.26s ease-in-out forwards'
          : 'anim-veil-scanline-in 0.38s ease-in-out forwards',
      }} />
      {/* Broader glow trail behind the scanline */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 80,
        background: isWipeOut
          ? 'linear-gradient(to left, rgba(34,211,238,0.18) 0%, transparent 100%)'
          : 'linear-gradient(to right, rgba(34,211,238,0.18) 0%, transparent 100%)',
        animation: isWipeOut
          ? 'anim-veil-glow-out 0.26s ease-in-out forwards'
          : 'anim-veil-glow-in 0.38s ease-in-out forwards',
      }} />
      {/* Center emblem — fades in on wipe-out, holds, then fades on wipe-in */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--font-orbitron, monospace)',
        fontSize: '1.4rem',
        letterSpacing: '0.3em',
        color: 'rgba(139,92,246,0.6)',
        textShadow: '0 0 24px rgba(139,92,246,0.5), 0 0 8px rgba(34,211,238,0.3)',
        whiteSpace: 'nowrap',
        animation: isWipeOut
          ? 'anim-veil-emblem-out 0.26s ease-out forwards'
          : 'anim-veil-emblem-in 0.38s ease-in forwards',
      }}>
        ⬡ WCW ⬡
      </div>
    </div>
  ) : null;

  if (gameMode === 'loading') {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (gameMode === 'archives') {
    return <HistoricalArchives
      onBack={() => { clearNewCounts(); setGameMode('menu'); }}
      onFireEvent={fireEvent}
      isLoreUnlocked={isLoreUnlocked}
      isUnlocked={isUnlocked}
      achievementStats={stats}
      newAchievementIds={newAchievementIds}
      newAchievementCount={newAchievementCount}
      markAchievementSeen={markAchievementSeen}
      totalUnlockedPoints={totalUnlockedPoints}
      devAllCharsUnlocked={devAllCharsUnlocked}
      onToggleDevChars={toggleDevCharUnlock}
    />;
  }

  if (gameMode === 'achievements') {
    return <HistoricalArchives
      standaloneMode
      onBack={() => { clearNewCounts(); setGameMode('menu'); }}
      onFireEvent={fireEvent}
      isLoreUnlocked={isLoreUnlocked}
      isUnlocked={isUnlocked}
      achievementStats={stats}
      newAchievementIds={newAchievementIds}
      newAchievementCount={newAchievementCount}
      markAchievementSeen={markAchievementSeen}
      initialTab="achievements"
      totalUnlockedPoints={totalUnlockedPoints}
      devAllCharsUnlocked={devAllCharsUnlocked}
      onToggleDevChars={toggleDevCharUnlock}
    />;
  }

  if (gameMode === 'settings') {
    return <GameSettings
      onBack={() => setGameMode(settingsReturnMode as any)}
      onReplayTutorial={() => {
        setShowTutorialPrompt(false);
        setGameMode('menu');
        setTimeout(handleStartTutorial, 350);
      }}
    />;
  }

  if (gameMode === 'menu') {
    return (<>
      {screenVeil}
      <AchievementToast queue={toastQueue} onDismiss={dismissToast} onLoreClick={handleLoreClick} />
      <MainMenu
        onStartGame={handleStartGame}
        onArchives={() => setGameMode('archives')}
        onAchievements={() => setGameMode('achievements')}
        onSettings={() => setGameMode('settings')}
        hasSavedRun={hasSavedRun}
        onContinueRun={() => setGameMode(runState?.pendingRewards ? 'rewards' : 'roguelikeMap')}
        newUnlockCount={newUnlockCount}
        achievementPoints={totalUnlockedPoints}
      />
      {/* First-launch tutorial prompt */}
      {showTutorialPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1400,
          background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(4,2,18,0.98)',
            border: '2px solid rgba(34,211,238,0.45)',
            borderRadius: 18,
            padding: '36px 44px',
            maxWidth: 440,
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(34,211,238,0.12)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🎮</div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, fontWeight: 900, color: '#22d3ee', letterSpacing: '0.12em', marginBottom: 10 }}>
              NEW CLONE DETECTED
            </div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>
              You have been abducted by the Znyxorga Empire.<br />
              A short tutorial will teach you to survive.<br />
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>It takes about 5 minutes.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { skipTutorial(); setShowTutorialPrompt(false); }}
                style={{
                  fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#64748b', borderRadius: 8,
                  padding: '10px 20px', cursor: 'pointer',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleStartTutorial}
                style={{
                  fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.92), rgba(6,182,212,0.88))',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '12px 28px', cursor: 'pointer',
                  boxShadow: '0 0 22px rgba(34,211,238,0.32)',
                }}
              >
                Start Tutorial →
              </button>
            </div>
          </div>
        </div>
      )}
    </>);
  }

  if (gameMode === 'characterSelect') {
    return <>{screenVeil}<CharacterSelection onStartGame={handleCharacterSelectionComplete} onBack={() => setGameMode('menu')} gameMode={pendingMode} unlockedCharacterIds={unlockedCharacterIds} achievementPoints={totalUnlockedPoints} unlockedAchievementIds={unlocked} /></>;
  }

  if (gameMode === 'roguelikeMap' && runState) {
    return (<>
      {screenVeil}
      <RoguelikeMap
        runState={runState}
        onSelectNode={handleNodeSelect}
        onAbandonRun={() => { abandonRun(); setGameMode('menu'); }}
        onSettings={() => { setSettingsReturnMode('roguelikeMap'); setGameMode('settings'); }}
        onAllocateStat={allocateStatPoint}
        onUpgradeAbility={upgradeAbility}
        onRoswellFound={() => fireEvent('roswell')}
        fogOfWarTier={fogOfWarTier}
        hasExtraItemSlot={activeRunPerks.has('inv_slot_7')}
      />
      <TutorialOverlay
        step={currentStep}
        stepIndex={tutorialState.step}
        totalSteps={totalStepsInStage}
        stageId={stageId}
        stageSeed={tutorialState.stage}
        onNext={() => advanceTutorial('button')}
        onSkip={() => { skipTutorial(); abandonRun(); setGameMode('menu'); }}
      />
      <AchievementToast queue={toastQueue} onDismiss={dismissToast} onLoreClick={handleLoreClick} />
      {actBonusPopup && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative flex flex-col items-center gap-6 rounded-2xl px-12 py-10 text-center"
            style={{
              background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #061020 100%)',
              border: '1px solid rgba(96,165,250,0.6)',
              boxShadow: '0 0 60px rgba(96,165,250,0.3), 0 20px 80px rgba(0,0,0,0.8)',
              minWidth: 360,
            }}>
            <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 20px rgba(96,165,250,0.8))' }}>✨</div>
            <div>
              <div className="font-orbitron text-[10px] tracking-[0.5em] uppercase mb-2" style={{ color: 'rgba(96,165,250,0.7)' }}>ACT COMPLETE</div>
              <div className="font-orbitron font-black text-white text-2xl mb-2" style={{ textShadow: '0 0 20px rgba(96,165,250,0.5)' }}>+1 Permanent Mana</div>
              <div className="font-orbitron text-[13px]" style={{ color: 'rgba(96,165,250,0.65)' }}>
                Starting Mana: <span className="text-white font-bold">{actBonusPopup.totalMana}</span>
              </div>
            </div>
            <button
              onClick={() => setActBonusPopup(null)}
              className="font-orbitron font-bold px-10 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.08))',
                border: '2px solid rgba(96,165,250,0.6)',
                color: '#93c5fd',
                boxShadow: '0 0 20px rgba(96,165,250,0.2)',
              }}>
              CONTINUE →
            </button>
          </div>
        </div>
      )}
    </>);
  }

  if (gameMode === 'rewards' && runState?.pendingRewards) {
    // Signature Legendary picker — intercepts before rewards screen on Act 1/2 boss kills
    if (showSignatureLegendaryPicker && runState) {
      return (
        <SignatureLegendaryPicker
          characters={runState.characters}
          alreadyChosen={runState.signatureLegendaryCharIds ?? []}
          onSelect={(charId, item, forceSlotIdx) => {
            grantSignatureLegendary(charId, item, forceSlotIdx);
            setShowSignatureLegendaryPicker(false);
          }}
        />
      );
    }

    // Tutorial boss complete — show the tutorial complete overlay instead of rewards
    if (runState.isTutorialRun && tutorialState.done) {
      return (<>
        {screenVeil}
        <TutorialCompleteOverlay
          onStartRun={() => {
            clearJustCompleted();
            abandonRun();
            setPendingMode('singleplayer');
            setGameMode('characterSelect');
          }}
          onReplayTutorial={() => {
            clearJustCompleted();
            handleStartTutorial();
          }}
        />
      </>);
    }
    // For tutorial runs: only show characters that fought in this battle
    const rewardsRunState = (runState.isTutorialRun && activeNodeId) ? (() => {
      const tutNode = runState.map.find(n => n.id === activeNodeId) as TutorialRunNode | undefined;
      const fightIds = tutNode?.tutorialCharIds;
      if (!fightIds || fightIds.length === 0) return runState;
      return { ...runState, characters: runState.characters.filter(c => fightIds.includes(c.id)) };
    })() : runState;

    return (<>
      {screenVeil}
      <RewardsScreen
        runState={rewardsRunState}
        onCollect={(cardId, equipItems) => {
          if (cardId) advanceTutorial('card_picked');
          const completedNode = runState.map.find(n => n.id === runState.pendingRewards?.completedNodeId);
          const isBossNode = completedNode?.type === 'boss';
          const isFinalBoss = isBossNode && runState.act === 4;
          if (isBossNode && !runState.isTutorialRun) {
            if (isFinalBoss) fireEvent('boss_killed');
            fireEvent('act_complete', { act: runState.act });
          }
          if (isFinalBoss && !runState.isTutorialRun) {
            const charIds = runState.characters.map(c => c.id);
            const aliveCharIds = runState.characters
              .filter(c => !runState.permanentlyDeadIds.includes(c.id) && c.currentHp > 0)
              .map(c => c.id);
            const deathless = runState.permanentlyDeadIds.length === 0;
            const noLosses = runState.completedNodeIds.length === runState.map.filter(n => n.type === 'enemy' || n.type === 'elite' || n.type === 'boss').length;
            fireEvent('run_ended', { won: true, characterIds: charIds, aliveCharacterIds: aliveCharIds, deathless, noLosses });
          }
          if (!runState.isTutorialRun) {
            for (const { item } of equipItems) fireEvent('item_found', { itemId: item.id, tier: item.tier });
          }
          collectRewards(cardId, equipItems);
          setGameMode(isFinalBoss ? 'runVictory' : 'roguelikeMap');
        }}
      />
      <TutorialOverlay
        step={currentStep}
        stepIndex={tutorialState.step}
        totalSteps={totalStepsInStage}
        stageId={stageId}
        stageSeed={tutorialState.stage}
        onNext={() => advanceTutorial('button')}
        onSkip={() => { skipTutorial(); abandonRun(); setGameMode('menu'); }}
        placement="top"
      />
    </>);
  }

  if (gameMode === 'campfire' && runState) {
    return (<>
      {screenVeil}
      <CampfireScreen
        runState={runState}
        onHealAll={() => { healAllAtCampfire(); }}
        onUpgradeSharedCard={(defId) => { upgradeSharedCard(defId); }}
        hasCardRemove={activeRunPerks.has('campfire_remove')}
        onRemoveCard={(defId) => { removeCardFromDeck(defId); }}
        onLeave={() => {
          advanceTutorial('campfire_done');
          completeNonCombatNode(activeNodeId!);
          setActiveNodeId(null);
          setGameMode('roguelikeMap');
        }}
      />
      <TutorialOverlay
        step={currentStep}
        stepIndex={tutorialState.step}
        totalSteps={totalStepsInStage}
        stageId={stageId}
        stageSeed={tutorialState.stage}
        onNext={() => advanceTutorial('button')}
        onSkip={() => { skipTutorial(); abandonRun(); setGameMode('menu'); }}
      />
    </>);
  }

  if (gameMode === 'merchant' && runState && !pendingEventItem) {
    return (<>{screenVeil}<MerchantScreen
        runState={runState}
        nodeId={activeNodeId ?? undefined}
        purchasedCardDefs={merchantPurchasedCardDefs}
        hasMerchant4th={activeRunPerks.has('merchant_4th')}
        hasMerchant4thItem={activeRunPerks.has('merchant_4th_item')}
        hasMysteryBoxFree={activeRunPerks.has('mystery_box_free')}
        onCardPurchased={(defId) => setMerchantPurchasedCardDefs(prev => new Set([...prev, defId]))}
        onBuyCard={(cardId, cost) => { buyCardFromMerchant(cardId, cost); }}
        onBuyHeal={(cost) => { buyHealAllFromMerchant(cost); }}
        onBuyItem={(item, cost) => {
          spendGold(cost);
          setPendingEventItemSource('merchant');
          setPendingEventItem(item);
        }}
        onDuplicateItem={(item, characterId, slotIndex, cost) => {
          spendGold(cost);
          addItemToCharacter(item, characterId, slotIndex);
        }}
        onSellItem={(item, characterId, slotIndex, goldGained) => {
          removeItemFromCharacter(characterId, slotIndex);
          addGold(goldGained);
        }}
        onRemoveCard={(cardId, cost) => { removeCardFromDeck(cardId); spendGold(cost); }}
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
      /></>);
  }

  if (gameMode === 'treasure' && runState) {
    return (<>{screenVeil}<TreasureScreen
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
    </>);
  }

  if (gameMode === 'unknown' && runState && !pendingEventItem && !pendingCurseAdded) {
    return (<>{screenVeil}<UnknownScreen
        runState={runState}
        onChoice={(result) => {
          if (!runState?.isTutorialRun) fireEvent('arena_event_triggered');
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
      /></>);
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
                          const isReplace = !!slotItem;
                          return (
                            <button
                              key={idx}
                              disabled={!!isTargetMismatch}
                              onClick={() => {
                                addItemToCharacter(item, char.id as CharacterId, idx);
                                if (!runState?.isTutorialRun) fireEvent('item_found', { itemId: item.id, tier: item.tier });
                                completeAndNavigate();
                              }}
                              className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                              style={isReplace
                                ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }
                                : { background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                            >
                              {isReplace ? `↩ ${slotItem.icon}` : `+ Slot ${idx + 1}`}
                            </button>
                          );
                        })}
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
    return (<>{screenVeil}<RunDefeatScreen runState={runState} onBackToMenu={() => { abandonRun(); setGameMode('menu'); }} /></>);
  }

  if (gameMode === 'runVictory' && runState) {
    return (<>{screenVeil}<RunVictoryScreen runState={runState} onBackToMenu={() => { abandonRun(); setGameMode('menu'); }} /></>);
  }

  return (
    <>
    {screenVeil}
    <div className="relative min-h-screen overflow-hidden">
      <ArenaBackground />
      <Toaster />
      {!hideUI && <MusicPlayer />}
      <AchievementToast queue={toastQueue} onDismiss={dismissToast} onLoreClick={handleLoreClick} />

      {/* Act completion mana bonus popup */}
      {actBonusPopup && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative flex flex-col items-center gap-6 rounded-2xl px-12 py-10 text-center"
            style={{
              background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #061020 100%)',
              border: '1px solid rgba(96,165,250,0.6)',
              boxShadow: '0 0 60px rgba(96,165,250,0.3), 0 20px 80px rgba(0,0,0,0.8)',
              minWidth: 360,
            }}>
            <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 20px rgba(96,165,250,0.8))' }}>✨</div>
            <div>
              <div className="font-orbitron text-[10px] tracking-[0.5em] uppercase mb-2" style={{ color: 'rgba(96,165,250,0.7)' }}>ACT COMPLETE</div>
              <div className="font-orbitron font-black text-white text-2xl mb-2" style={{ textShadow: '0 0 20px rgba(96,165,250,0.5)' }}>+1 Permanent Mana</div>
              <div className="font-orbitron text-[13px]" style={{ color: 'rgba(96,165,250,0.65)' }}>
                Starting Mana: <span className="text-white font-bold">{actBonusPopup.totalMana}</span>
              </div>
            </div>
            <button
              onClick={() => setActBonusPopup(null)}
              className="font-orbitron font-bold px-10 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.08))',
                border: '2px solid rgba(96,165,250,0.6)',
                color: '#93c5fd',
                boxShadow: '0 0 20px rgba(96,165,250,0.2)',
              }}>
              CONTINUE →
            </button>
          </div>
        </div>
      )}

      {/* Battle transition curtain */}
      {battleTransition && (() => {
        const isBoss = battleTransition.isBoss;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
            style={{ animation: 'anim-battle-curtain 1.9s ease-in-out forwards' }}>
            {/* Background */}
            <div className="absolute inset-0" style={{
              background: isBoss
                ? 'radial-gradient(ellipse at center, rgba(80,0,0,0.98) 0%, rgba(4,0,12,0.99) 60%)'
                : 'rgba(0,0,0,0.94)',
            }} />
            {/* Boss: scanline sweeps */}
            {isBoss && (<>
              <div className="absolute left-0 right-0 pointer-events-none" style={{
                height: 2, top: '36%',
                background: 'linear-gradient(to right, transparent, rgba(255,30,30,0.9), transparent)',
                animation: 'anim-turn-banner-line 0.7s ease-out 0.25s forwards',
                transformOrigin: 'left center', opacity: 0,
              }} />
              <div className="absolute left-0 right-0 pointer-events-none" style={{
                height: 1, top: '64%',
                background: 'linear-gradient(to right, transparent, rgba(200,50,50,0.5), transparent)',
                animation: 'anim-turn-banner-line 0.7s ease-out 0.45s forwards',
                transformOrigin: 'left center', opacity: 0,
              }} />
              {/* Corner warning glyphs */}
              {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} font-orbitron pointer-events-none`}
                  style={{ fontSize: '0.6rem', color: 'rgba(255,40,40,0.55)', letterSpacing: '0.2em',
                    animation: `anim-veil-emblem-out 0.4s ease-out ${0.3 + i * 0.08}s both` }}>
                  ⚠ DANGER ⚠
                </div>
              ))}
            </>)}
            {/* Content */}
            <div className="relative z-10 text-center" style={{ animation: 'anim-battle-title 1.5s ease-in-out forwards' }}>
              <div style={{
                fontSize: isBoss ? '5.5rem' : '4rem', marginBottom: 8,
                filter: isBoss
                  ? 'drop-shadow(0 0 40px rgba(255,0,0,1)) drop-shadow(0 0 80px rgba(180,0,0,0.7))'
                  : 'drop-shadow(0 0 30px rgba(255,60,60,0.9))',
                animation: isBoss ? 'anim-boss-icon-throb 0.7s ease-in-out 0.4s infinite alternate' : undefined,
              }}>
                {battleTransition.icon}
              </div>
              {isBoss && (
                <div style={{
                  fontFamily: 'var(--font-orbitron, monospace)', fontSize: '0.55rem',
                  letterSpacing: '0.6em', color: 'rgba(255,80,80,0.7)',
                  textTransform: 'uppercase', marginBottom: 6,
                }}>— FINAL GUARDIAN —</div>
              )}
              <div style={{
                fontFamily: 'var(--font-orbitron, monospace)', fontSize: '0.75rem',
                letterSpacing: '0.42em',
                color: isBoss ? 'rgba(255,100,100,0.75)' : 'rgba(255,140,140,0.80)',
                textTransform: 'uppercase', marginBottom: 8,
              }}>ENTERING</div>
              <div style={{
                fontFamily: 'var(--font-orbitron, monospace)',
                fontSize: isBoss ? '3.0rem' : '2.6rem',
                fontWeight: 900,
                letterSpacing: isBoss ? '0.14em' : '0.10em',
                color: isBoss ? '#ff5555' : '#ffffff',
                textShadow: isBoss
                  ? '0 0 60px rgba(255,0,0,0.95), 0 0 120px rgba(200,0,0,0.5)'
                  : '0 0 40px rgba(255,60,60,0.85), 0 0 80px rgba(200,0,0,0.40)',
                textTransform: 'uppercase',
              }}>{battleTransition.label}</div>
            </div>
          </div>
        );
      })()}

      {/* Full-screen game board */}
      <div
        className="absolute inset-0"
        style={shakeAnim ? { animation: `${shakeAnim} 0.22s ease-out` } : undefined}
      >
        <GameBoard
          gameState={gameState}
          onTileClick={handleSelectTile}
          onTileHover={setHoveredTile}
          animations={animations}
          hoverPreviewRange={hoveredCardRange}
          hoverPreviewExecutorId={hoveredCardExecutorId}
          externalIntentRange={hoveredEnemyAbilityRange}
          activeDialogue={runState?.isTutorialRun ? null : activeDialogue}
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

      {/* Player turn banner — cinematic YOUR TURN with portrait strip */}
      {showPlayerBanner && (() => {
        const playerIcons = gameState.players[0]?.icons.filter((i: any) => i.isAlive) ?? [];
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: 'linear-gradient(135deg, rgba(5,20,100,0.97) 0%, rgba(2,10,60,0.97) 100%)',
              border: '1px solid rgba(60,130,255,0.70)',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(30,80,240,0.50), 0 0 120px rgba(20,50,200,0.25)',
              animation: 'anim-turn-banner-in 1.4s ease-in-out forwards',
            }}>
              {/* Text block first (left side for player) */}
              <div style={{ padding: '12px 18px 12px 28px' }}>
                <div style={{
                  fontFamily: 'var(--font-orbitron, monospace)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.30em',
                  color: 'rgba(140,180,255,0.75)',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}>⚡ PLAYER</div>
                <div style={{
                  fontFamily: 'var(--font-orbitron, monospace)',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#fff',
                  textShadow: '0 0 22px rgba(60,130,255,0.95)',
                  animation: 'anim-turn-banner-text 1.4s ease-in-out forwards',
                }}>YOUR TURN</div>
              </div>
              {/* Portrait strip */}
              {playerIcons.length > 0 && (
                <div style={{ display: 'flex', gap: 0, borderLeft: '1px solid rgba(60,130,255,0.30)' }}>
                  {playerIcons.slice(0, 3).map((icon: any) => {
                    const portrait = getCharacterPortrait(icon.name);
                    return (
                      <div key={icon.id} style={{ width: 52, height: 64, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                        {portrait ? (
                          <img src={portrait} alt={icon.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%', filter: 'brightness(0.75) saturate(0.8)' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'rgba(28,60,185,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {icon.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 60%, rgba(2,10,60,0.7) 100%)' }} />
                      </div>
                    );
                  })}
                </div>
              )}
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
            runStartTime={runState?.runStartTime}
            timerPaused={gameState.phase === 'victory' || gameState.phase === 'defeat'}
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

      {/* Tutorial Overlay — combat (positioned above card HUD) */}
      <TutorialOverlay
        step={currentStep}
        stepIndex={tutorialState.step}
        totalSteps={totalStepsInStage}
        stageId={stageId}
        stageSeed={tutorialState.stage}
        onNext={() => advanceTutorial('button')}
        onSkip={() => { skipTutorial(); handleBackToMenu(); }}
        bottomOffset={215}
      />

      {/* Escape Menu */}
      {showEscapeMenu && (
        <EscapeMenu
          onSaveQuit={() => {
            if (tutorialState.active) skipTutorial();
            resetGame();
            setGameMode('menu');
            setShowEscapeMenu(false);
          }}
          onResign={() => {
            if (tutorialState.active) skipTutorial();
            abandonRun();
            resetGame();
            setGameMode('menu');
            setShowEscapeMenu(false);
          }}
          onContinue={() => setShowEscapeMenu(false)}
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
        const HERO_NAMES_CHECK = ["Napoleon", "Genghis", "Da Vinci", "Leonidas", "Sun-sin", "Beethoven", "Huang", "Nelson", "Hannibal", "Picasso", "Teddy", "Mansa"];
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
          onBackToMenu={() => {
            if (pendingMode === 'singleplayer' && runState && activeNodeId) {
              const won = gameState.phase === 'victory';
              const { finalHps, finalPassiveStacks } = captureIconStates(gameState.players[0].icons);
              const enemyIcons = gameState.players[1]?.icons ?? [];
              if (won) {
                completeCombat({
                  nodeId: activeNodeId,
                  won: true,
                  turnsElapsed: gameState.currentTurn ?? 1,
                  finalHps: finalHps as any,
                  finalPassiveStacks,
                  enemiesKilled: enemyIcons.filter(i => !i.isAlive).length,
                  killBlowsByName: (gameState as any).playerKillBlows ?? {},
                });
                if (!runState.isTutorialRun) {
                  toast('Run saved — continue anytime from the main menu', {
                    icon: '💾', duration: 3500,
                    style: { background: 'rgba(6,3,22,0.97)', border: '1px solid rgba(168,85,247,0.5)', color: '#e2e8f0' },
                  });
                }
              } else {
                // Lost — run is over, clear the save
                if (!runState.isTutorialRun) {
                  fireEvent('run_ended', {
                    won: false,
                    characterIds: runState.characters.map(c => c.id),
                    deathless: false,
                    noLosses: false,
                  });
                }
                abandonRun();
              }
            }
            handleBackToMenu();
          }}
          onPlayAgain={() => {
            if (pendingMode === 'singleplayer' && runState && activeNodeId) {
              const won = gameState.phase === 'victory';
              const { finalHps, finalPassiveStacks } = captureIconStates(gameState.players[0].icons);
              const enemyIcons = gameState.players[1]?.icons ?? [];
              completeCombat({
                nodeId: activeNodeId,
                won,
                turnsElapsed: gameState.currentTurn ?? 1,
                finalHps: finalHps as any,
                finalPassiveStacks,
                enemiesKilled: enemyIcons.filter(i => !i.isAlive).length,
                killBlowsByName: (gameState as any).playerKillBlows ?? {},
              });
              if (!won && !runState.isTutorialRun) {
                fireEvent('run_ended', {
                  won: false,
                  characterIds: runState.characters.map(c => c.id),
                  deathless: false,
                  noLosses: false,
                });
              }
              // Fire item_found for any boss items that were auto-equipped
              if (won && !runState.isTutorialRun && runState.pendingRewards?.bossItems) {
                for (const item of runState.pendingRewards.bossItems) {
                  fireEvent('item_found', { itemId: item.id, tier: item.tier });
                }
              }
              setActiveNodeId(null);
              if (won) {
                // Check if this was a boss node for Act 1 or 2 — offer Signature Legendary
                const completedNode = runState.map.find(n => n.id === activeNodeId);
                const isBoss = completedNode?.type === 'boss';
                const isAct1or2 = runState.act <= 2;
                const hasEligible = runState.characters.some(
                  c => c.currentHp > 0 && !(runState.signatureLegendaryCharIds ?? []).includes(c.id)
                );
                if (isBoss && isAct1or2 && hasEligible) {
                  setShowSignatureLegendaryPicker(true);
                  setGameMode('rewards'); // rewards waits behind the picker overlay
                } else {
                  setGameMode('rewards');
                }
              } else {
                setGameMode('runDefeated');
              }
            } else {
              setGameMode('characterSelect');
            }
          }}
        />
        );
      })()}
    </div>
    </>
  );
};

const IndexWithI18n = () => (
  <LanguageProvider>
    <Index />
  </LanguageProvider>
);

export default IndexWithI18n;
