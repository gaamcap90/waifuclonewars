// src/hooks/useAchievements.ts
// Achievement system — persistence, event dispatch, and toast queue.
// Usage: call useAchievements() once in Index.tsx, pass fireEvent + helpers down as props.

import { useState, useCallback, useRef } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, CHARACTER_UNLOCK_THRESHOLDS, CHARACTER_UNLOCK_EVENTS, type AchievementDef } from '@/data/achievements';

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_STATS     = 'wcw_achievement_stats_v1';
const LS_UNLOCKED  = 'wcw_achievements_unlocked_v1';
const LS_LORE      = 'wcw_achievement_lore_v1';
const LS_NEW_IDS   = 'wcw_new_achievement_ids_v1';
const LS_RUN_PERKS = 'wcw_run_perks_v1';

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
  kills_krath_champion:          number;
  kills_krath_berserker:         number;
  kills_phasewarden:             number;
  kills_iron_wall:               number;
  kills_twin_terror:             number;
  kills_znyxorgas_champion:      number;
  kills_naxion_warmaster:        number;
  kills_grox_titan:              number;
  kills_velthrak_shadowblade:    number;
  kills_glorp_shambler:          number;
  kills_zyx_skitter:             number;
  kills_naxion_scout:            number;
  kills_vron_crawler:            number;
  kills_spore_node:              number;
  kills_vexlar:                  number;
  kills_mog_toxin:               number;
  kills_qrix_hunter:             number;
  kills_void_wraith:             number;
  kills_velzar:                  number;
  kills_zyx_swarmer:             number;
  kills_zyx_remnant:             number;
  kills_qrix_hauler:             number;
  kills_qrix_salvager:           number;
  kills_qrix_voidbreacher:       number;
  kills_cryo_drifter:            number;
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
  kills_krath_champion: 0, kills_krath_berserker: 0,
  kills_phasewarden: 0, kills_iron_wall: 0,
  kills_twin_terror: 0, kills_znyxorgas_champion: 0,
  kills_naxion_warmaster: 0, kills_grox_titan: 0, kills_velthrak_shadowblade: 0,
  kills_glorp_shambler: 0, kills_zyx_skitter: 0, kills_naxion_scout: 0, kills_vron_crawler: 0,
  kills_spore_node: 0, kills_vexlar: 0, kills_mog_toxin: 0, kills_qrix_hunter: 0,
  kills_void_wraith: 0, kills_velzar: 0,
  kills_zyx_swarmer: 0, kills_zyx_remnant: 0,
  kills_qrix_hauler: 0, kills_qrix_salvager: 0,
  kills_qrix_voidbreacher: 0, kills_cryo_drifter: 0,
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
  id:      string;
  name:    string;
  icon:    string;
  points:  number;
  hasLore?: boolean;  // true when this achievement also unlocked a lore entry
  isPerk?:  boolean;  // true for run-perk milestone toasts
}

const LS_DEV_CHARS = 'wcw_dev_chars_unlocked';

// ── New-unlock badge count (persisted so it survives page reloads) ─────────────
const LS_NEW_COUNTS = 'wcw_new_unlocks_v1';
function loadNewCounts(): { a: number; l: number } {
  try {
    const raw = localStorage.getItem(LS_NEW_COUNTS);
    return raw ? JSON.parse(raw) : { a: 0, l: 0 };
  } catch { return { a: 0, l: 0 }; }
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

  const [toastQueue, setToastQueue]           = useState<AchievementToastItem[]>([]);
  const [newCounts, setNewCounts]             = useState<{ a: number; l: number }>(loadNewCounts);
  const [newAchievementIds, setNewAchievementIds] = useState<Set<string>>(() => loadSet(LS_NEW_IDS));
  const [totalUnlockedPoints, setTotalUnlockedPoints] = useState<number>(() =>
    ACHIEVEMENTS.filter(a => unlockedRef.current.has(a.id)).reduce((s, a) => s + a.points, 0)
  );
  // Ref mirrors state so callbacks can read the current total without stale closures
  const totalPointsRef = useRef<number>(
    ACHIEVEMENTS.filter(a => unlockedRef.current.has(a.id)).reduce((s, a) => s + a.points, 0)
  );
  const [devAllCharsUnlocked, setDevAllCharsUnlocked] = useState<boolean>(
    () => localStorage.getItem(LS_DEV_CHARS) === 'true'
  );

  const toggleDevCharUnlock = useCallback(() => {
    setDevAllCharsUnlocked(prev => {
      const next = !prev;
      localStorage.setItem(LS_DEV_CHARS, String(next));
      return next;
    });
  }, []);

  // Persist all refs to localStorage
  const persist = useCallback(() => {
    localStorage.setItem(LS_STATS,    JSON.stringify(statsRef.current));
    localStorage.setItem(LS_UNLOCKED, JSON.stringify([...unlockedRef.current]));
    localStorage.setItem(LS_LORE,     JSON.stringify([...unlockedLoreRef.current]));
  }, []);

  // Compute fog of war tier from points total (0=1 row, 1=2 rows, 2=3 rows, 3=5 rows, 4=full)
  const fogTierFromPts = (pts: number): 0|1|2|3|4 =>
    pts >= 600 ? 4 : pts >= 400 ? 3 : pts >= 150 ? 2 : pts >= 50 ? 1 : 0;

  // Grant one achievement: add to set, unlock lore, enqueue toast, bump badge count
  const grantAchievement = useCallback((a: AchievementDef) => {
    if (unlockedRef.current.has(a.id)) return;
    unlockedRef.current.add(a.id);
    const oldTotal = totalPointsRef.current;
    const newTotal = oldTotal + a.points;
    totalPointsRef.current = newTotal;
    setTotalUnlockedPoints(newTotal);
    // Recompute and persist run perks immediately so non-React consumers (roguelikeData) see them
    const perks = new Set<string>();
    for (const ach of ACHIEVEMENTS) {
      if (unlockedRef.current.has(ach.id) && ach.runPerk && !ach.runPerk.id.startsWith('legacy_')) perks.add(ach.runPerk.id);
    }
    if (newTotal >= 100) perks.add('gold_bonus_10');
    if (newTotal >= 200) perks.add('merchant_4th');
    if (newTotal >= 250) perks.add('campfire_remove');
    if (newTotal >= 300) perks.add('gold_bonus_20');
    if (newTotal >= 350) perks.add('merchant_4th_item');
    if (newTotal >= 500) perks.add('gold_bonus_30');
    if (newTotal >= 700) perks.add('mystery_box_free');
    if (newTotal >= 800) perks.add('inv_slot_7');
    if (newTotal >= 900) perks.add('campfire_heal_50');
    if (newTotal >= 1000) perks.add('gold_bonus_100');
    if (newTotal >= 1150) perks.add('draw_4_cards');
    if (newTotal >= 1300) perks.add('campfire_dual_upgrade');
    if (newTotal >= 1450) perks.add('gold_bonus_50_2');
    if (newTotal >= 1600) perks.add('free_sig_legendary');
    localStorage.setItem(LS_RUN_PERKS, JSON.stringify([...perks]));
    // Fire perk milestone toasts for newly crossed thresholds
    const oldFog = fogTierFromPts(oldTotal);
    const newFog = fogTierFromPts(newTotal);
    if (newFog > oldFog) {
      const fogLabels = ['Fog +2 rows visible', 'Fog +4 rows visible', 'Fog +6 rows visible', 'Full Map Visibility'];
      for (let tier = oldFog + 1; tier <= newFog; tier++) {
        setToastQueue(q => [...q, { id: `perk_fog_${tier}`, name: fogLabels[tier - 1] ?? 'Fog upgraded', icon: '👁', points: 0, isPerk: true }]);
      }
    }
    if (oldTotal < 100 && newTotal >= 100) setToastQueue(q => [...q, { id: 'perk_gold_10', name: '+10% Gold from all sources', icon: '💰', points: 0, isPerk: true }]);
    if (oldTotal < 200 && newTotal >= 200) setToastQueue(q => [...q, { id: 'perk_merchant', name: 'Merchant: 4th card slot unlocked', icon: '🛒', points: 0, isPerk: true }]);
    if (oldTotal < 250 && newTotal >= 250) setToastQueue(q => [...q, { id: 'perk_campfire', name: 'Campfire: Card removal added', icon: '✂', points: 0, isPerk: true }]);
    if (oldTotal < 300 && newTotal >= 300) setToastQueue(q => [...q, { id: 'perk_gold_20', name: '+20% Gold from all sources', icon: '💰', points: 0, isPerk: true }]);
    if (oldTotal < 350 && newTotal >= 350) setToastQueue(q => [...q, { id: 'perk_merchant_item', name: 'Merchant: 4th item slot unlocked', icon: '🛒', points: 0, isPerk: true }]);
    if (oldTotal < 500 && newTotal >= 500) setToastQueue(q => [...q, { id: 'perk_gold_30', name: '+30% Gold from all sources', icon: '💰', points: 0, isPerk: true }]);
    if (oldTotal < 700 && newTotal >= 700) setToastQueue(q => [...q, { id: 'perk_mystery_free', name: 'Mystery Box is now FREE', icon: '🎁', points: 0, isPerk: true }]);
    if (oldTotal < 800 && newTotal >= 800) setToastQueue(q => [...q, { id: 'perk_inv_slot', name: 'Inventory slot #7 unlocked per character', icon: '🎒', points: 0, isPerk: true }]);
    if (oldTotal < 900 && newTotal >= 900) setToastQueue(q => [...q, { id: 'perk_campfire_50', name: 'Campfire now restores 50% HP!', icon: '🔥', points: 0, isPerk: true }]);
    if (oldTotal < 1000 && newTotal >= 1000) setToastQueue(q => [...q, { id: 'perk_gold_100', name: '+50% Gold — total bonus now 160%!', icon: '💰', points: 0, isPerk: true }]);
    if (oldTotal < 1150 && newTotal >= 1150) setToastQueue(q => [...q, { id: 'perk_draw4', name: 'Play up to 4 cards per turn!', icon: '🃏', points: 0, isPerk: true }]);
    if (oldTotal < 1300 && newTotal >= 1300) setToastQueue(q => [...q, { id: 'perk_dual_upgrade', name: 'Campfire: Upgrade TWO cards per rest!', icon: '⬆️', points: 0, isPerk: true }]);
    if (oldTotal < 1450 && newTotal >= 1450) setToastQueue(q => [...q, { id: 'perk_gold_50_2', name: '+50% Gold — total bonus now 210%!', icon: '💰', points: 0, isPerk: true }]);
    if (oldTotal < 1600 && newTotal >= 1600) setToastQueue(q => [...q, { id: 'perk_sig_leg', name: 'Start every run with a free Signature Legendary!', icon: '⭐', points: 0, isPerk: true }]);
    // Fire a blue perk toast for achievement-gated run perks (not char unlocks, not legacy stat perks)
    if (a.runPerk && a.runPerk.id !== 'char_teddy' && a.runPerk.id !== 'char_mansa' && !a.runPerk.id.startsWith('legacy_')) {
      setToastQueue(q => [...q, { id: `perk_${a.runPerk!.id}`, name: a.runPerk!.label, icon: '⚡', points: 0, isPerk: true }]);
    }
    const hasLore = !!a.loreUnlockId;
    if (hasLore) unlockedLoreRef.current.add(a.loreUnlockId!);
    setToastQueue(q => [...q, { id: a.id, name: a.name, icon: a.icon, points: a.points, hasLore }]);
    setNewCounts(c => {
      const next = { a: c.a + 1, l: hasLore ? c.l + 1 : c.l };
      localStorage.setItem(LS_NEW_COUNTS, JSON.stringify(next));
      return next;
    });
    setNewAchievementIds(prev => {
      const next = new Set(prev);
      next.add(a.id);
      localStorage.setItem(LS_NEW_IDS, JSON.stringify([...next]));
      return next;
    });
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
            else if (name === 'Krath Champion') s.kills_krath_champion      += 1;
            else if (name === 'Krath Berserker') s.kills_krath_berserker    += 1;
            else if (name === 'Phasewarden')    s.kills_phasewarden         += 1;
            else if (name === 'Iron Wall')      s.kills_iron_wall           += 1;
            else if (name === 'Terror Alpha' || name === 'Terror Beta') s.kills_twin_terror += 1;
            else if (name === "Znyxorga's Champion") s.kills_znyxorgas_champion += 1;
            else if (name === 'Naxion Warmaster')    s.kills_naxion_warmaster    += 1;
            else if (name === 'Grox Titan')          s.kills_grox_titan          += 1;
            else if (name === "Vel'thrak Shadowblade") s.kills_velthrak_shadowblade += 1;
            else if (name === 'Glorp Shambler')      s.kills_glorp_shambler      += 1;
            else if (name === 'Zyx Skitter')         s.kills_zyx_skitter         += 1;
            else if (name === 'Naxion Scout')        s.kills_naxion_scout        += 1;
            else if (name === 'Vron Crawler')        s.kills_vron_crawler        += 1;
            else if (name === 'Spore Node')          s.kills_spore_node          += 1;
            else if (name === 'Vexlar')              s.kills_vexlar              += 1;
            else if (name === 'Mog Toxin')           s.kills_mog_toxin           += 1;
            else if (name === 'Qrix Hunter')         s.kills_qrix_hunter         += 1;
            else if (name === 'Void Wraith')         s.kills_void_wraith         += 1;
            else if (name === "Vel'Zar — Emperor's Will") s.kills_velzar         += 1;
            else if (name === 'Zyx Swarmer')         s.kills_zyx_swarmer         += 1;
            else if (name === 'Zyx Remnant')         s.kills_zyx_remnant         += 1;
            else if (name === 'Qrix Hauler')         s.kills_qrix_hauler         += 1;
            else if (name === 'Qrix Salvager')       s.kills_qrix_salvager       += 1;
            else if (name === 'Qrix Voidbreacher')   s.kills_qrix_voidbreacher   += 1;
            else if (name === 'Cryo Drifter')        s.kills_cryo_drifter        += 1;
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
        s.consecutive_wins = 0;
        s.consecutive_no_damage_fights = 0;
        break;
      }

      // ── Run ended ────────────────────────────────────────────────────────────
      // payload: { won: boolean, characterIds: string[], aliveCharacterIds?: string[], deathless: boolean, noLosses: boolean }
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
          // Character Legacy — fire per-character event for each alive survivor
          const aliveCharIds = payload.aliveCharacterIds as string[] ?? [];
          for (const charId of aliveCharIds) {
            tryEvent(`legacy_${charId}`);
          }
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
      case 'act_complete':
        if (payload.act === 1) tryEvent('act_1_complete');
        if (payload.act === 2) tryEvent('act_2_complete');
        if (payload.act === 3) tryEvent('act_3_complete');
        if (payload.act === 4) tryEvent('act_4_complete');
        break;
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

  /** Mark one achievement as seen in Archives — removes its highlight and decrements the tab badge. */
  const markAchievementSeen = useCallback((id: string) => {
    setNewAchievementIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem(LS_NEW_IDS, JSON.stringify([...next]));
      return next;
    });
    setNewCounts(c => {
      const next = { ...c, a: Math.max(0, c.a - 1) };
      localStorage.setItem(LS_NEW_COUNTS, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Reset the new-unlock badge counts (call when leaving Archives). */
  const clearNewCounts = useCallback(() => {
    setNewCounts({ a: 0, l: 0 });
    setNewAchievementIds(new Set());
    localStorage.setItem(LS_NEW_COUNTS, JSON.stringify({ a: 0, l: 0 }));
    localStorage.removeItem(LS_NEW_IDS);
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
    /** Combined count of new unlocked achievements + lore entries since last Archives visit. */
    newUnlockCount: newCounts.a + newCounts.l,
    /** Set of newly unlocked achievement IDs (shrinks as user hovers over them in Archives). */
    newAchievementIds,
    /** Count of new achievements — live, equals newAchievementIds.size. */
    newAchievementCount: newAchievementIds.size,
    /** Mark one achievement as seen (hover in Archives) — removes highlight and decrements badge. */
    markAchievementSeen,
    /** Reset all new-unlock badges (call when leaving Archives). */
    clearNewCounts,
    /** Check if a specific achievement is unlocked. */
    isUnlocked:     (id: string) => unlockedRef.current.has(id),
    /** Check if a lore entry has been unlocked by an achievement. */
    isLoreUnlocked: (id: string) => unlockedLoreRef.current.has(id),
    /** Total achievement points earned so far. */
    totalUnlockedPoints,
    /** Set of character IDs that have been unlocked via achievement points or events (or dev override). */
    unlockedCharacterIds: (() => {
      if (devAllCharsUnlocked) {
        return new Set([...Object.keys(CHARACTER_UNLOCK_THRESHOLDS), ...Object.keys(CHARACTER_UNLOCK_EVENTS)]);
      }
      const ids = new Set(
        Object.entries(CHARACTER_UNLOCK_THRESHOLDS)
          .filter(([, req]) => totalUnlockedPoints >= req)
          .map(([id]) => id)
      );
      for (const [charId, achievementId] of Object.entries(CHARACTER_UNLOCK_EVENTS)) {
        if (unlockedRef.current.has(achievementId)) ids.add(charId);
      }
      return ids;
    })(),
    /** Fog of war visibility tier (0=1 row, 1=2 rows, 2=3 rows, 3=5 rows, 4=full). */
    fogOfWarTier: fogTierFromPts(totalUnlockedPoints),
    /** Active run perks derived from unlocked achievements + point milestones. */
    activeRunPerks: (() => {
      const perks = new Set<string>();
      for (const a of ACHIEVEMENTS) {
        if (unlockedRef.current.has(a.id) && a.runPerk && !a.runPerk.id.startsWith('legacy_')) perks.add(a.runPerk.id);
      }
      if (totalUnlockedPoints >= 100) perks.add('gold_bonus_10');
      if (totalUnlockedPoints >= 200) perks.add('merchant_4th');
      if (totalUnlockedPoints >= 250) perks.add('campfire_remove');
      if (totalUnlockedPoints >= 300) perks.add('gold_bonus_20');
      if (totalUnlockedPoints >= 350) perks.add('merchant_4th_item');
      if (totalUnlockedPoints >= 500) perks.add('gold_bonus_30');
      if (totalUnlockedPoints >= 700) perks.add('mystery_box_free');
      if (totalUnlockedPoints >= 800) perks.add('inv_slot_7');
      if (totalUnlockedPoints >= 900) perks.add('campfire_heal_50');
      if (totalUnlockedPoints >= 1000) perks.add('gold_bonus_100');
      if (totalUnlockedPoints >= 1150) perks.add('draw_4_cards');
      if (totalUnlockedPoints >= 1300) perks.add('campfire_dual_upgrade');
      if (totalUnlockedPoints >= 1450) perks.add('gold_bonus_50_2');
      if (totalUnlockedPoints >= 1600) perks.add('free_sig_legendary');
      return perks;
    })(),
    /** Dev flag — all characters force-unlocked. */
    devAllCharsUnlocked,
    /** Toggle dev force-unlock for all characters. */
    toggleDevCharUnlock,
  };
}
