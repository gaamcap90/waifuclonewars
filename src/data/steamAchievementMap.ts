// src/data/steamAchievementMap.ts
//
// Maps internal achievement IDs (from src/data/achievements.ts) to Steam
// achievement API names (from your Steamworks dashboard).
//
// HOW TO POPULATE:
//   1. In Steamworks → Edit Steamworks Settings → Stats & Achievements,
//      create one Steam achievement per internal id below.
//   2. Set its "API Name" to a stable string (snake_case is conventional).
//   3. Copy that API Name into the value here.
//
// You don't need to map ALL 107 achievements at once — start with the
// most-shipped tier (combat + clones), add the rest before Steam launch.
// Unmapped IDs are silently no-ops (logged in dev). Empty string means
// "explicitly skip this one for now".

export const STEAM_ACHIEVEMENT_MAP: Record<string, string> = {
  // ── Combat (high priority — most players see these first) ─────────────────
  first_blood:        'ACH_FIRST_BLOOD',
  tactical_genius:    'ACH_TACTICAL_GENIUS',
  speed_of_thought:   'ACH_SPEED_OF_THOUGHT',
  last_warrior:       'ACH_LAST_WARRIOR',
  this_is_war:        'ACH_THIS_IS_WAR',
  armageddon:         'ACH_ARMAGEDDON',
  bully:              'ACH_BULLY',
  no_retreat:         'ACH_NO_RETREAT',
  unstoppable:        'ACH_UNSTOPPABLE',
  juggernaut:         'ACH_JUGGERNAUT',
  this_is_sparta:     'ACH_THIS_IS_SPARTA',
  final_salvo:        'ACH_AUX_ARMES',
  riders_fury:        'ACH_RIDERS_FURY',
  gotterfunken:       'ACH_GOTTERFUNKEN',
  chongtong:          'ACH_CHONGTONG',
  vitruvian:          'ACH_VITRUVIAN',
  mandate_of_heaven:  'ACH_MANDATE_OF_HEAVEN',
  trafalgar:          'ACH_TRAFALGAR',
  cannae:             'ACH_CANNAE',
  guernica:           'ACH_GUERNICA',
  big_stick:          'ACH_BIG_STICK',
  hajj:               'ACH_HAJJ',
  echo_velthar:       'ACH_VOID_SIGNAL',
  echo_musashi:       'ACH_THE_BOOK',
  echo_cleopatra:     'ACH_ETERNAL_KINGDOM',
  echo_tesla:         'ACH_DEATH_RAY_PROTOCOL',
  echo_shaka:         'ACH_IMPONDO_ZANKOMO',
  ultimate_power:     'ACH_ULTIMATE_POWER',
  ten_thousand_hours: 'ACH_TEN_THOUSAND_HOURS',
  card_master:        'ACH_CARD_MASTER',
  legend:             'ACH_LEGEND',

  // ── Clones — 3-win achievements ───────────────────────────────────────────
  clone_napoleon:  'ACH_CLONE_NAPOLEON',
  clone_genghis:   'ACH_CLONE_GENGHIS',
  clone_davinci:   'ACH_CLONE_DAVINCI',
  clone_leonidas:  'ACH_CLONE_LEONIDAS',
  clone_sunsin:    'ACH_CLONE_SUNSIN',
  clone_beethoven: 'ACH_CLONE_BEETHOVEN',
  clone_huang:     'ACH_CLONE_HUANG',
  clone_nelson:    'ACH_CLONE_NELSON',
  clone_hannibal:  'ACH_CLONE_HANNIBAL',
  clone_picasso:   'ACH_CLONE_PICASSO',
  clone_teddy:     'ACH_CLONE_TEDDY',
  clone_mansa:     'ACH_CLONE_MANSA',
  win_3_velthar:   'ACH_WIN_3_VELTHAR',
  win_3_musashi:   'ACH_WIN_3_MUSASHI',
  win_3_cleopatra: 'ACH_WIN_3_CLEOPATRA',
  win_3_tesla:     'ACH_WIN_3_TESLA',
  win_3_shaka:     'ACH_WIN_3_SHAKA',
  true_commander:  'ACH_TRUE_COMMANDER',

  // ── Clones — Act 4 survival ───────────────────────────────────────────────
  legacy_napoleon:  'ACH_LEGACY_NAPOLEON',
  legacy_genghis:   'ACH_LEGACY_GENGHIS',
  legacy_davinci:   'ACH_LEGACY_DAVINCI',
  legacy_leonidas:  'ACH_LEGACY_LEONIDAS',
  legacy_sunsin:    'ACH_LEGACY_SUNSIN',
  legacy_beethoven: 'ACH_LEGACY_BEETHOVEN',
  legacy_huang:     'ACH_LEGACY_HUANG',
  legacy_nelson:    'ACH_LEGACY_NELSON',
  legacy_hannibal:  'ACH_LEGACY_HANNIBAL',
  legacy_picasso:   'ACH_LEGACY_PICASSO',
  legacy_teddy:     'ACH_LEGACY_TEDDY',
  legacy_mansa:     'ACH_LEGACY_MANSA',
  legacy_velthar:   'ACH_LEGACY_VELTHAR',
  legacy_musashi:   'ACH_LEGACY_MUSASHI',
  legacy_cleopatra: 'ACH_LEGACY_CLEOPATRA',
  legacy_tesla:     'ACH_LEGACY_TESLA',
  legacy_shaka:     'ACH_LEGACY_SHAKA',

  // ── Arena (run progression, items, lore) ──────────────────────────────────
  first_steps:      'ACH_FIRST_STEPS',
  vel_nor:          'ACH_VEL_NOR',
  krath_zyn:        'ACH_KRATH_ZYN',
  first_run:        'ACH_FIRST_RUN',
  first_item:       'ACH_FIRST_ITEM',
  found_legendary:  'ACH_FOUND_LEGENDARY',
  deathless:        'ACH_DEATHLESS',
  one_turn_wonder:  'ACH_ONE_TURN_WONDER',
  thral:            'ACH_THRAL',
  vol_krath:        'ACH_VOL_KRATH',
  veteran_runner:   'ACH_VETERAN_RUNNER',
  bread_circuses:   'ACH_BREAD_CIRCUSES',
  ancient_game:     'ACH_ANCIENT_GAME',
  first_contact:    'ACH_FIRST_CONTACT',
  mass_extinction:  'ACH_MASS_EXTINCTION',
  shard_collector:  'ACH_SHARD_COLLECTOR',
  power_cut:        'ACH_POWER_CUT',
  shellbreaker:     'ACH_SHELLBREAKER',
  mirror_mirror:    'ACH_MIRROR_MIRROR',

  // ── Observer ──────────────────────────────────────────────────────────────
  archivist:        'ACH_ARCHIVIST',
  full_roster_view: 'ACH_FULL_ROSTER_VIEW',
  collector:        'ACH_COLLECTOR',
  fortune:          'ACH_FORTUNE',
  dedicated:        'ACH_DEDICATED',
  kill_counter:     'ACH_KILL_COUNTER',
  roswell:          'ACH_ROSWELL',

  // ── Secret (hidden — populated last to avoid spoiling Steam dashboard) ───
  thren:               'ACH_THREN',
  echo_resonance:      'ACH_ECHO_RESONANCE',
  the_refusal:         'ACH_THE_REFUSAL',
  something_wrong:     'ACH_SOMETHING_WRONG',
  they_remember:       'ACH_THEY_REMEMBER',
  silent_guardian:     'ACH_SILENT_GUARDIAN',
  thren_vel_nor_thral: 'ACH_THREN_VEL_NOR_THRAL',
  graa_thal_zyx_nor:   'ACH_GRAA_THAL_ZYX_NOR',

  // NOTE: kit-moment achievements (ganryujima, sixty_one, chain_reaction, etc.)
  // and duo-win achievements (clash_of_swords, symmetry, etc.) and the various
  // enemy-kill counters (swarmed, signal_lost, etc.) are not yet listed —
  // populate before Steam launch from achievements.ts.
};
