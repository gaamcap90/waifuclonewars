// src/hooks/useAchievements.ts
// Achievement system — persistence, event dispatch, and toast queue.
// Usage: call useAchievements() once in Index.tsx, pass fireEvent + helpers down as props.

import { useState, useCallback, useRef } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, type AchievementDef } from '@/data/achievements';

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_STATS    = 'wcw_achievement_stats_v1';
const LS_UNLOCKED = 'wcw_achievements_unlocked_v1';
const LS_LORE     = 'wcw_achievement_lore_v1';

// ── Stats interface ───────────────────────────────────────────────────────────
export interface AchievementStats {
  // Global counters
  total_fights:                  number;
  total_wins:                    number;
  total_cards_played:            number;
  total_ultimates_used:          number;
  total_kills:                   number;
  runs_started:                  number;
  runs_completed:                number;
  total_events_triggered:        number;
  // Observer counters
  lore_entries_read:             number;
  characters_viewed:             number;
  unique_items_found:            number;
  // Combat/streak counters
  full_team_fight_wins:          number;
  survived_lethal_hits:          number;
  consecutive_wins:              number;
  consecutive_no_damage_fights:  number;
  // Per-character ultimates
  leonidas_ultimates:            number;
  napoleon_grande_armee:         number;
  napoleon_final_salvo:          number;
  genghis_ultimates:             number;
  beethoven_ultimates:           number;
  sunsin_ultimates:              number;
  davinci_ultimates:             number;
  huang_ultimates:               number;
  nelson_ultimates:              number;
  hannibal_ultimates:            number;
  picasso_ultimates:             number;
  teddy_ultimates:               number;
  mansa_ultimates:               number;
  // Per-enemy kill counters
  kills_crystalline_hive:        number;
  kills_grox_magnetar:           number;
  kills_naxion_shieldbearer:     number;
  kills_vrex_mimic:              number;
  // Per-character run wins
  napoleon_runs_won:             number;
  genghis_runs_won:              number;
  davinci_runs_won:              number;
  leonidas_runs_won:             number;
  sunsin_runs_won:               number;
  beethoven_runs_won:            number;
  huang_runs_won:                number;
  nelson_runs_won:               number;
  hannibal_runs_won:             number;
  picasso_runs_won:              number;
  teddy_runs_won:                number;
  mansa_runs_won:                number;
  // Set-tracking stored as arrays in JSON
  _viewed_lore_ids:              string[];
  _viewed_char_ids:              string[];
  _found_item_ids:               string[];
}

const DEFAULT_STATS: AchievementStats = {
  total_fights: 0, total_wins: 0, total_cards_played: 0, total_ultimates_used: 0,
  total_kills: 0, runs_started: 0, runs_completed: 0, total_events_triggered: 0,
  lore_entries_read: 0, characters_viewed: 0, unique_items_found: 0,
  full_team_fight_wins: 0, survived_lethal_hits: 0,
  consecutive_wins: 0, consecutive_no_damage_fights: 0,
  kills_crystalline_hive: 0, kills_grox_magnetar: 0,
  kills_naxion_shieldbearer: 0, kills_vrex_mimic: 0,
  leonidas_ultimates: 0, napoleon_grande_armee: 0, napoleon_final_salvo: 0,
  genghis_ultimates: 0, beethoven_ultimates: 0, sunsin_ultimates: 0,
  davinci_ultimates: 0, huang_ultimates: 0, nelson_ultimates: 0,
  hannibal_ultimates: 0, picasso_ultimates: 0, teddy_ultimates: 0, mansa_ultimates: 0,
  napoleon_runs_won: 0, genghis_runs_won: 0, davinci_runs_won: 0, leonidas_runs_won: 0,
  sunsin_runs_won: 0, beethoven_runs_won: 0, huang_runs_won: 0, nelson_runs_won: 0,
  hannibal_runs_won: 0, picasso_runs_won: 0, teddy_runs_won: 0, mansa_runs_won: 0,
  _viewed_lore_ids: [], _viewed_char_ids: [], _found_item_ids: [],
};

// ── Toast item ────────────────────────────────────────────────────────────────
export interface AchievementToastItem {
  id:     string;
  name:   string;
  icon:   string;
  points: number;
}

// ── Event payload types (for documentation / callers) ─────────────────────────
/**
 * Events and their expected payload fields:
 *
 * 'card_played'            { isUltimate: boolean, characterId: string, ultimateId?: 'final_salvo' | 'grande_armee' }
 * 'fight_ended'            { won: boolean, turnsElapsed: number, enemiesKilled: number,
 *                            allAlive: boolean, oneCloneAlive: boolean, noDamageTaken: boolean,
 *                            anyAt1Hp: boolean, survivedLethal: boolean,
 *                            napoleonUltimate?: boolean, genghisUltimate?: boolean }
 * 'run_started'            {}
 * 'run_ended'              { won: boolean, leadCharacterId: string, deathless: boolean, noLosses: boolean }
 * 'item_found'             { itemId: string, tier: 'common'|'uncommon'|'rare'|'legendary' }
 * 'lore_read'              { loreId: string }
 * 'character_viewed'       { characterId: string }
 * 'arena_event_triggered'  {}
 * 'tutorial_complete'      {}
 * 'act_complete'           { act: number }
 * 'boss_killed'            {}
 * 'roswell'                {}
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadStats(): AchievementStats {
  try {
    const raw = localStorage.getItem(LS_STATS);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
  } catch { return { ...DEFAULT_STATS }; }
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch { return new Set<string>(); }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAchievements() {
  // Mutable refs — mutated directly for perf; React re-renders triggered by toastQueue only
  const statsRef       = useRef<AchievementStats>(loadStats());
  const unlockedRef    = useRef<Set<string>>(loadSet(LS_UNLOCKED));
  const unlockedLoreRef = useRef<Set<string>>(loadSet(LS_LORE));

  const [toastQueue, setToastQueue] = useState<AchievementToastItem[]>([]);

  // Persist all refs to localStorage
  const persist = useCallback(() => {
    localStorage.setItem(LS_STATS,    JSON.stringify(statsRef.current));
    localStorage.setItem(LS_UNLOCKED, JSON.stringify([...unlockedRef.current]));
    localStorage.setItem(LS_LORE,     JSON.stringify([...unlockedLoreRef.current]));
  }, []);

  // Grant one achievement: add to set, unlock lore, enqueue toast
  const grantAchievement = useCallback((a: AchievementDef) => {
    if (unlockedRef.current.has(a.id)) return;
    unlockedRef.current.add(a.id);
    if (a.loreUnlockId) unlockedLoreRef.current.add(a.loreUnlockId);
    setToastQueue(q => [...q, { id: a.id, name: a.name, icon: a.icon, points: a.points }]);
  }, []);

  // Scan all stat-threshold achievements and grant any that are now met
  const checkThresholds = useCallback(() => {
    const s  = statsRef.current;
    const ul = unlockedRef.current;
    for (const a of ACHIEVEMENTS) {
      if (!a.statKey || a.threshold === undefined) continue;
      if (ul.has(a.id)) continue;
      const val = (s as Record<string, unknown>)[a.statKey] as number ?? 0;
      if (val >= a.threshold) grantAchievement(a);
    }
  }, [grantAchievement]);

  // Grant the meta achievement if every other achievement is unlocked
  const checkAllComplete = useCallback(() => {
    const allExceptMeta = ACHIEVEMENTS.filter(a => a.id !== 'graa_thal_zyx_nor');
    if (allExceptMeta.every(a => unlockedRef.current.has(a.id))) {
      const meta = ACHIEVEMENT_MAP['graa_thal_zyx_nor'];
      if (meta) grantAchievement(meta);
    }
  }, [grantAchievement]);

  /**
   * Fire a named game event and update all relevant achievement counters.
   * See payload documentation above.
   */
  const fireEvent = useCallback((
    eventKey: string,
    payload: Record<string, unknown> = {},
  ) => {
    const s  = statsRef.current;
    const ul = unlockedRef.current;

    // Convenience: find-and-grant a one-shot event achievement if not yet unlocked
    const tryEvent = (key: string) => {
      const a = ACHIEVEMENTS.find(x => x.eventKey === key);
      if (a && !ul.has(a.id)) grantAchievement(a);
    };

    switch (eventKey) {

      // ── Card played ──────────────────────────────────────────────────────────
      case 'card_played': {
        s.total_cards_played += 1;
        if (payload.isUltimate) {
          s.total_ultimates_used += 1;
          const charId     = payload.characterId as string;
          const ultimateId = payload.ultimateId  as string | undefined;
          if      (charId === 'leonidas')  s.leonidas_ultimates  += 1;
          else if (charId === 'beethoven') s.beethoven_ultimates += 1;
          else if (charId === 'genghis')   s.genghis_ultimates   += 1;
          else if (charId === 'sunsin')    s.sunsin_ultimates    += 1;
          else if (charId === 'davinci')   s.davinci_ultimates   += 1;
          else if (charId === 'huang')     s.huang_ultimates     += 1;
          else if (charId === 'nelson')    s.nelson_ultimates    += 1;
          else if (charId === 'hannibal')  s.hannibal_ultimates  += 1;
          else if (charId === 'picasso')   s.picasso_ultimates   += 1;
          else if (charId === 'teddy')     s.teddy_ultimates     += 1;
          else if (charId === 'mansa')     s.mansa_ultimates     += 1;
          else if (charId === 'napoleon') {
            if (ultimateId === 'final_salvo') s.napoleon_final_salvo  += 1;
            else                              s.napoleon_grande_armee += 1;
          }
        }
        break;
      }

      // ── Fight ended ──────────────────────────────────────────────────────────
      case 'fight_ended': {
        const won          = payload.won          as boolean;
        const enemiesKilled = payload.enemiesKilled as number ?? 0;

        s.total_fights += 1;
        s.total_kills  += enemiesKilled;
        if (payload.survivedLethal) s.survived_lethal_hits += 1;

        // Per-enemy kill tracking
        if (payload.killedEnemyNames) {
          for (const name of payload.killedEnemyNames as string[]) {
            if (name === 'Crystalline Hive')    s.kills_crystalline_hive    += 1;
            else if (name === 'Grox Magnetar')  s.kills_grox_magnetar       += 1;
            else if (name === 'Naxion Shieldbearer') s.kills_naxion_shieldbearer += 1;
            else if (name === 'Vrex Mimic')     s.kills_vrex_mimic          += 1;
          }
        }

        if (won) {
          s.total_wins       += 1;
          s.consecutive_wins += 1;
          if (payload.allAlive) s.full_team_fight_wins += 1;
          s.consecutive_no_damage_fights = payload.noDamageTaken
            ? s.consecutive_no_damage_fights + 1
            : 0;

          tryEvent('first_fight_won');
          if (payload.noDamageTaken)                          tryEvent('perfect_fight_won');
          if ((payload.turnsElapsed as number) <= 3)          tryEvent('fight_3_turns');
          if (payload.oneCloneAlive)                          tryEvent('one_clone_win');
          if (enemiesKilled >= 3)                             tryEvent('multi_kill_3');
          if (s.consecutive_wins >= 3)                        tryEvent('three_consecutive_wins');
          if (s.consecutive_wins >= 5)                        tryEvent('five_consecutive_wins');
          if (payload.anyAt1Hp)                               tryEvent('win_at_1hp');
          if (payload.napoleonUltimate && payload.genghisUltimate) tryEvent('napoleon_genghis_both_ultimates');
        } else {
          s.consecutive_wins             = 0;
          s.consecutive_no_damage_fights = 0;
        }
        break;
      }

      // ── Run started ──────────────────────────────────────────────────────────
      case 'run_started': {
        s.runs_started += 1;
        break;
      }

      // ── Run ended ────────────────────────────────────────────────────────────
      // payload: { won: boolean, characterIds: string[], deathless: boolean, noLosses: boolean }
      case 'run_ended': {
        s.runs_completed += 1;
        // Fire on any completed run (win or loss) — quitting via menu does not fire run_ended
        tryEvent('first_run_complete');
        if (payload.won) {
          const charIds = payload.characterIds as string[];
          let anyAt10 = false;
          for (const charId of charIds) {
            const key = `${charId}_runs_won` as keyof AchievementStats;
            if (typeof (s as Record<string, unknown>)[key] === 'number') {
              (s as Record<string, number>)[key] += 1;
              if ((s as Record<string, number>)[key] >= 10) anyAt10 = true;
            }
          }
          if (anyAt10) tryEvent('ten_runs_one_char');
          if (payload.deathless) tryEvent('deathless_run');
          if (payload.noLosses)  tryEvent('perfect_run');
        }
        break;
      }

      // ── Item found ───────────────────────────────────────────────────────────
      case 'item_found': {
        const itemId = payload.itemId as string;
        if (!s._found_item_ids.includes(itemId)) {
          s._found_item_ids.push(itemId);
          s.unique_items_found = s._found_item_ids.length;
        }
        tryEvent('first_item_found');
        if (payload.tier === 'legendary') tryEvent('found_legendary_item');
        break;
      }

      // ── Archives events ──────────────────────────────────────────────────────
      case 'lore_read': {
        const loreId = payload.loreId as string;
        if (!s._viewed_lore_ids.includes(loreId)) {
          s._viewed_lore_ids.push(loreId);
          s.lore_entries_read = s._viewed_lore_ids.length;
        }
        break;
      }

      case 'character_viewed': {
        const charId = payload.characterId as string;
        if (!s._viewed_char_ids.includes(charId)) {
          s._viewed_char_ids.push(charId);
          s.characters_viewed = s._viewed_char_ids.length;
        }
        break;
      }

      case 'arena_event_triggered': {
        s.total_events_triggered += 1;
        break;
      }

      // ── One-shot events ──────────────────────────────────────────────────────
      case 'tutorial_complete':  tryEvent('tutorial_complete'); break;
      case 'act_complete':       if (payload.act === 1) tryEvent('act_1_complete'); break;
      case 'boss_killed':        tryEvent('boss_killed');       break;
      case 'roswell':            tryEvent('roswell_trigger');   break;
    }

    checkThresholds();
    checkAllComplete();
    persist();
  }, [grantAchievement, checkThresholds, checkAllComplete, persist]);

  /** Remove the oldest toast from the queue (called by AchievementToast when dismissed). */
  const dismissToast = useCallback(() => {
    setToastQueue(q => q.slice(1));
  }, []);

  return {
    /** Raw stats object — read-only from the consumer's perspective. */
    stats:        statsRef.current,
    /** Set of unlocked achievement IDs. */
    unlocked:     unlockedRef.current,
    /** Set of lore entry IDs unlocked by achievements. */
    unlockedLore: unlockedLoreRef.current,
    /** Current toast notification queue. */
    toastQueue,
    /** Fire a game event to update counters and check achievements. */
    fireEvent,
    /** Dismiss the front-of-queue toast. */
    dismissToast,
    /** Check if a specific achievement is unlocked. */
    isUnlocked:     (id: string) => unlockedRef.current.has(id),
    /** Check if a lore entry has been unlocked by an achievement. */
    isLoreUnlocked: (id: string) => unlockedLoreRef.current.has(id),
  };
}
