// Clone dialogue hook — watches game state and queues character speech bubbles.
// Max 1 bubble visible at a time. 3s display, 0.4s fade, 1s gap between.
// Squad intro is staged in a pending buffer and released on first player interaction.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState } from '@/types/game';
import type { CharacterId } from '@/types/roguelike';
import type { ActiveDialogue } from '@/components/CloneDialogueBubble';
import { audioEngine } from '@/audio/AudioEngine';
import {
  nameToCharId,
  CHARACTER_COLORS,
  CHARACTER_SHORT_NAMES,
  SQUAD_INTROS,
  ON_KILL_LINES,
  ON_PROTECT_LINES,
  ON_LOW_HP_LINES,
  ON_ULTIMATE_LINES,
  ON_VICTORY_LINES,
} from '@/data/cloneDialogue';

const DISPLAY_MS  = 3000;
const FADEOUT_MS   = 400;
const GAP_MS       = 1000;
const KILL_CHANCE  = 0.2;
const MAX_QUEUE    = 3;

/**
 * Pre-compute per-character sequential squad voice indices.
 * Maps: characterId → (SQUAD_INTROS index → that character's nth squad appearance)
 * So napoleon_squad_0 = Napoleon's first squad intro in the array, regardless of pair position.
 */
const SQUAD_VOICE_IDX: Map<string, Map<number, number>> = (() => {
  const result  = new Map<string, Map<number, number>>();
  const counter: Record<string, number> = {};
  SQUAD_INTROS.forEach((intro, si) => {
    intro.lines.forEach(line => {
      const cid = line.characterId;
      if (!result.has(cid)) result.set(cid, new Map());
      const n = counter[cid] ?? 0;
      result.get(cid)!.set(si, n);
      counter[cid] = n + 1;
    });
  });
  return result;
})();

/** Pick a random element and return both the value and its index. */
function pickIdx<T>(arr: T[]): [T, number] {
  const i = Math.floor(Math.random() * arr.length);
  return [arr[i], i];
}

/** Play a voice line if the file exists and voice is enabled. Silently ignores missing files. */
function playVoice(charId: CharacterId, voiceKey: string) {
  const s = audioEngine.getSettings();
  if (!s.voiceEnabled || s.muted) return;
  const audio = new Audio(`/audio/voices/${charId}/${voiceKey}.mp3`);
  audio.volume = s.voiceVolume;
  audio.play().catch(() => { /* file not yet recorded — silent fail */ });
}

function makeLine(
  charId: CharacterId,
  text: string,
  position: { q: number; r: number },
  voiceKey?: string,
): ActiveDialogue {
  return {
    id: `${charId}-${Date.now()}-${Math.random()}`,
    characterId: charId,
    characterName: CHARACTER_SHORT_NAMES[charId] ?? charId,
    text,
    position,
    color: CHARACTER_COLORS[charId] ?? '#22d3ee',
    voiceKey,
  };
}

type IconSnap = { id: string; charId: CharacterId | null; hp: number; maxHp: number; isAlive: boolean; ultimateUsed: boolean; q: number; r: number };

function snapIcons(gs: GameState, playerId: number): IconSnap[] {
  return (gs.players[playerId]?.icons ?? []).map(i => ({
    id: i.id,
    charId: nameToCharId(i.name),
    hp: i.stats.hp,
    maxHp: i.stats.maxHp,
    isAlive: i.isAlive,
    ultimateUsed: i.ultimateUsed,
    q: i.position.q,
    r: i.position.r,
  }));
}

export function useCloneDialogue(gameState: GameState, battleCount = 0) {
  const [activeDialogue, setActiveDialogue] = useState<ActiveDialogue | null>(null);
  const queueRef    = useRef<ActiveDialogue[]>([]);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Squad intro: staged here until the player's first interaction, then released.
  const pendingIntroRef    = useRef<ActiveDialogue[]>([]);
  const hasInteractedRef   = useRef(false);
  // Stable ref to processQueue so the recursive setTimeout doesn't go stale.
  const processQueueRef    = useRef<() => void>(() => {});

  // Per-fight dedup
  const firedRef = useRef({
    squadIntro: false,
    lowHp: new Set<string>(),
    ultimate: new Set<string>(),
    victory: false,
  });

  // Tracks the last character to get a kill — used for the victory line
  const lastKillerRef = useRef<CharacterId | null>(null);

  // Snapshot for diffing
  const prevPlayerRef = useRef<IconSnap[]>([]);
  const prevEnemyRef  = useRef<IconSnap[]>([]);
  const prevPhaseRef  = useRef(gameState.phase);
  const prevBattleRef = useRef(battleCount);

  // Enqueue a line (respects max queue)
  const enqueue = useCallback((d: ActiveDialogue) => {
    if (queueRef.current.length < MAX_QUEUE) queueRef.current.push(d);
  }, []);

  // Process queue: show next item after gap
  const processQueue = useCallback(() => {
    if (timerRef.current) return; // already waiting
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift()!;

    // Resolve current position (character may have moved since enqueue)
    const icon = gameState.players[0]?.icons.find(i => nameToCharId(i.name) === next.characterId);
    if (icon) {
      next.position = { q: icon.position.q, r: icon.position.r };
    }

    setActiveDialogue(next);
    // if (next.voiceKey) playVoice(next.characterId, next.voiceKey); // voices disabled — bubbles only
    timerRef.current = setTimeout(() => {
      setActiveDialogue(null);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        processQueueRef.current(); // use stable ref to avoid stale closure
      }, GAP_MS);
    }, DISPLAY_MS + FADEOUT_MS);
  }, [gameState.players]);

  // Keep processQueueRef pointing at the latest version
  processQueueRef.current = processQueue;

  // Called from Index.tsx on first tile hover or card hover.
  // Moves staged intro lines into the live queue and kicks processing.
  const notifyInteraction = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    if (pendingIntroRef.current.length > 0) {
      pendingIntroRef.current.forEach(line => {
        if (queueRef.current.length < MAX_QUEUE) queueRef.current.push(line);
      });
      pendingIntroRef.current = [];
      if (!timerRef.current && queueRef.current.length > 0) {
        processQueueRef.current();
      }
    }
  }, []);

  // Reset on new fight
  useEffect(() => {
    if (battleCount !== prevBattleRef.current) {
      firedRef.current = { squadIntro: false, lowHp: new Set(), ultimate: new Set(), victory: false };
      queueRef.current = [];
      pendingIntroRef.current = [];
      hasInteractedRef.current = false;
      setActiveDialogue(null);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      prevPlayerRef.current = [];
      prevEnemyRef.current = [];
      prevBattleRef.current = battleCount;
    }
  }, [battleCount]);

  // Main trigger detection
  useEffect(() => {
    const playerIcons = snapIcons(gameState, 0);
    const enemyIcons  = snapIcons(gameState, 1);
    const prev        = prevPlayerRef.current;
    const prevEnemy   = prevEnemyRef.current;
    const fired       = firedRef.current;

    // ── Squad intro: only on the FIRST combat of a run, staged until first interaction ─────
    if (!fired.squadIntro && gameState.phase === 'combat' && playerIcons.length >= 2 && battleCount === 0) {
      const charIds = new Set(playerIcons.filter(i => i.charId).map(i => i.charId!));
      for (let si = 0; si < SQUAD_INTROS.length; si++) {
        const intro = SQUAD_INTROS[si];
        if (charIds.has(intro.pair[0]) && charIds.has(intro.pair[1])) {
          const icon0 = playerIcons.find(i => i.charId === intro.lines[0].characterId);
          const icon1 = playerIcons.find(i => i.charId === intro.lines[1].characterId);
          if (icon0 && icon1) {
            const cid0 = intro.lines[0].characterId;
            const cid1 = intro.lines[1].characterId;
            const vk0 = `${cid0}_squad_${SQUAD_VOICE_IDX.get(cid0)?.get(si) ?? 0}`;
            const vk1 = `${cid1}_squad_${SQUAD_VOICE_IDX.get(cid1)?.get(si) ?? 0}`;
            const line0 = makeLine(cid0, intro.lines[0].text, { q: icon0.q, r: icon0.r }, vk0);
            const line1 = makeLine(cid1, intro.lines[1].text, { q: icon1.q, r: icon1.r }, vk1);
            if (hasInteractedRef.current) {
              enqueue(line0);
              enqueue(line1);
            } else {
              pendingIntroRef.current = [line0, line1];
            }
            fired.squadIntro = true;
            break;
          }
        }
      }
    }

    // Need previous snapshot to detect changes
    if (prev.length > 0) {
      // ── On kill (enemy died) ───────────────────────────────────────────
      // Resolve the current actor from the speed queue — that's who just acted
      const actingIconId = gameState.speedQueue?.[gameState.queueIndex ?? 0];
      const actingPlayerIcon = actingIconId ? playerIcons.find(i => i.id === actingIconId && i.isAlive && i.charId) : null;

      for (const enemy of enemyIcons) {
        const wasAlive = prevEnemy.find(e => e.id === enemy.id)?.isAlive;
        if (wasAlive && !enemy.isAlive) {
          // Credit the kill to whoever's turn it is, if a player icon; otherwise
          // fall back to the nearest alive player icon (proxy for melee/ranged AoE)
          let killer = actingPlayerIcon;
          if (!killer) {
            const living = playerIcons.filter(i => i.isAlive && i.charId);
            if (living.length > 0) {
              living.sort((a, b) => {
                const dA = Math.max(Math.abs(a.q - enemy.q), Math.abs(a.r - enemy.r), Math.abs((a.q + a.r) - (enemy.q + enemy.r)));
                const dB = Math.max(Math.abs(b.q - enemy.q), Math.abs(b.r - enemy.r), Math.abs((b.q + b.r) - (enemy.q + enemy.r)));
                return dA - dB;
              });
              killer = living[0];
            }
          }
          if (killer?.charId) {
            // Always track last killer for the victory line
            lastKillerRef.current = killer.charId;
            // Only show kill bubble 20% of the time
            if (Math.random() < KILL_CHANCE) {
              const entry = ON_KILL_LINES.find(e => e.characterId === killer!.charId);
              if (entry) {
                const [text, idx] = pickIdx(entry.lines);
                const vk = `${killer.charId}_kill_${idx}`;
                enqueue(makeLine(killer.charId, text, { q: killer.q, r: killer.r }, vk));
              }
            }
          }
        }
      }

      // ── On protect (heal/shield applied to an ally) ────────────────────
      for (const icon of playerIcons) {
        if (!icon.charId || !icon.isAlive) continue;
        const prevSnap = prev.find(p => p.id === icon.id);
        if (prevSnap && icon.hp > prevSnap.hp && Math.random() < 0.35) {
          const entry = ON_PROTECT_LINES.find(e => e.characterId === icon.charId);
          if (entry) {
            const [text, idx] = pickIdx(entry.lines);
            const vk = `${icon.charId}_protect_${idx}`;
            enqueue(makeLine(icon.charId, text, { q: icon.q, r: icon.r }, vk));
            break; // one protect line per state update
          }
        }
      }

      // ── On low HP ──────────────────────────────────────────────────────
      for (const icon of playerIcons) {
        if (!icon.charId || !icon.isAlive || fired.lowHp.has(icon.charId)) continue;
        if (icon.hp > 0 && icon.hp / icon.maxHp < 0.25) {
          const prevHp = prev.find(p => p.id === icon.id);
          if (prevHp && prevHp.hp / prevHp.maxHp >= 0.25) {
            const entry = ON_LOW_HP_LINES.find(e => e.characterId === icon.charId);
            if (entry) {
              const [text, idx] = pickIdx(entry.lines);
              const vk = `${icon.charId}_lowhp_${idx}`;
              enqueue(makeLine(icon.charId, text, { q: icon.q, r: icon.r }, vk));
              fired.lowHp.add(icon.charId);
            }
          }
        }
      }

      // ── On ultimate ────────────────────────────────────────────────────
      for (const icon of playerIcons) {
        if (!icon.charId || fired.ultimate.has(icon.charId)) continue;
        const wasUsed = prev.find(p => p.id === icon.id)?.ultimateUsed;
        if (!wasUsed && icon.ultimateUsed) {
          const entry = ON_ULTIMATE_LINES.find(e => e.characterId === icon.charId);
          if (entry) {
            const [text, idx] = pickIdx(entry.lines);
            const vk = `${icon.charId}_ultimate_${idx}`;
            enqueue(makeLine(icon.charId, text, { q: icon.q, r: icon.r }, vk));
            fired.ultimate.add(icon.charId);
          }
        }
      }
    }

    // ── On victory ─────────────────────────────────────────────────────────
    if (gameState.phase === 'victory' && prevPhaseRef.current !== 'victory' && !fired.victory) {
      fired.victory = true;
      const alive = playerIcons.filter(i => i.isAlive && i.charId);
      if (alive.length > 0) {
        // Prefer the character who landed the last kill; fall back to random alive
        const killerIcon = lastKillerRef.current
          ? alive.find(i => i.charId === lastKillerRef.current)
          : null;
        const speaker = killerIcon ?? alive[Math.floor(Math.random() * alive.length)];
        const entry = ON_VICTORY_LINES.find(e => e.characterId === speaker.charId);
        if (entry && speaker.charId) {
          const [text, idx] = pickIdx(entry.lines);
          const vk = `${speaker.charId}_victory_${idx}`;
          enqueue(makeLine(speaker.charId, text, { q: speaker.q, r: speaker.r }, vk));
        }
      }
    }

    prevPlayerRef.current = playerIcons;
    prevEnemyRef.current  = enemyIcons;
    prevPhaseRef.current  = gameState.phase;

    // Kick the queue processor (for non-intro lines)
    if (!activeDialogue && queueRef.current.length > 0 && !timerRef.current) {
      processQueue();
    }
  }, [gameState.players, gameState.phase]);

  // Cleanup
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Respect dialogueEnabled setting — hide bubbles without clearing the queue
  const dialogueVisible = audioEngine.getSettings().dialogueEnabled ? activeDialogue : null;
  return { activeDialogue: dialogueVisible, notifyInteraction };
}
