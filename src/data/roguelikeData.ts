// src/data/roguelikeData.ts
import {
  RunNode, NodeType, EncounterDef, EnemyTemplate,
  RunItem, CardReward, CharacterRunState,
} from "@/types/roguelike";

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Enemy Templates ───────────────────────────────────────────────────────────

export const ENEMIES: Record<string, EnemyTemplate> = {
  // Act 1 — alien fauna & low-tier gladiators
  glorp_shambler: {
    id: 'glorp_shambler', name: 'Glorp Shambler', icon: '🍄', count: 1,
    stats: { hp: 60, maxHp: 60, might: 35, power: 25, defense: 8, moveRange: 2, attackRange: 1 },
    ai: 'aggressive',
  },
  zyx_skitter: {
    id: 'zyx_skitter', name: 'Zyx Skitter', icon: '🦟', count: 2,
    stats: { hp: 30, maxHp: 30, might: 22, power: 15, defense: 4, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
  },
  naxion_scout: {
    id: 'naxion_scout', name: 'Naxion Scout', icon: '👾', count: 1,
    stats: { hp: 70, maxHp: 70, might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 },
    ai: 'ranged',
  },
  vron_crawler: {
    id: 'vron_crawler', name: 'Vron Crawler', icon: '🦀', count: 1,
    stats: { hp: 85, maxHp: 85, might: 28, power: 20, defense: 22, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
  },
  // Act 1 elites
  krath_champion: {
    id: 'krath_champion', name: 'Krath Champion', icon: '⚔️', count: 1,
    stats: { hp: 120, maxHp: 120, might: 55, power: 40, defense: 18, moveRange: 3, attackRange: 1 },
    ai: 'berserker',
  },
  spore_cluster: {
    id: 'spore_cluster', name: 'Spore Node', icon: '🔴', count: 3,
    stats: { hp: 40, maxHp: 40, might: 20, power: 30, defense: 5, moveRange: 1, attackRange: 2 },
    ai: 'ranged',
  },
  // Act 1 boss
  iron_wall: {
    id: 'iron_wall', name: 'Iron Wall', icon: '🤖', count: 1,
    stats: { hp: 200, maxHp: 200, might: 60, power: 50, defense: 35, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
  },
  // Act 2 enemies
  mog_toxin: {
    id: 'mog_toxin', name: 'Mog Toxin', icon: '☣️', count: 1,
    stats: { hp: 75, maxHp: 75, might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 },
    ai: 'ranged',
  },
  qrix_hunter: {
    id: 'qrix_hunter', name: 'Qrix Hunter', icon: '🏹', count: 1,
    stats: { hp: 70, maxHp: 70, might: 25, power: 50, defense: 8, moveRange: 3, attackRange: 3 },
    ai: 'ranged',
  },
  void_wraith: {
    id: 'void_wraith', name: 'Void Wraith', icon: '👻', count: 1,
    stats: { hp: 65, maxHp: 65, might: 45, power: 40, defense: 5, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
  },
  krath_berserker: {
    id: 'krath_berserker', name: 'Krath Berserker', icon: '💢', count: 1,
    stats: { hp: 140, maxHp: 140, might: 75, power: 55, defense: 14, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
  },
  phasewarden: {
    id: 'phasewarden', name: 'Phasewarden', icon: '🔮', count: 1,
    stats: { hp: 110, maxHp: 110, might: 55, power: 65, defense: 20, moveRange: 5, attackRange: 2 },
    ai: 'ranged',
  },
  // Act 2 boss
  twin_terror_a: {
    id: 'twin_terror_a', name: 'Terror Alpha', icon: '🗡️', count: 1,
    stats: { hp: 160, maxHp: 160, might: 70, power: 55, defense: 20, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
  },
  twin_terror_b: {
    id: 'twin_terror_b', name: 'Terror Beta', icon: '🛡️', count: 1,
    stats: { hp: 160, maxHp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 },
    ai: 'defensive',
  },
  // Act 3 boss
  znyxorga_champion: {
    id: 'znyxorga_champion', name: "Znyxorga's Champion", icon: '👑', count: 1,
    stats: { hp: 280, maxHp: 280, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 },
    ai: 'berserker',
  },
};

// ── Item Pool ─────────────────────────────────────────────────────────────────

export const ITEMS: RunItem[] = [
  // COMMON
  { id: 'iron_gauntlets', name: 'Iron Gauntlets', icon: '🥊', tier: 'common',
    description: '+8 Might for this run.',
    statBonus: { might: 8 } },
  { id: 'bone_plate', name: 'Bone Plate', icon: '🦴', tier: 'common',
    description: '+6 Defense for this run.',
    statBonus: { defense: 6 } },
  { id: 'vitality_shard', name: 'Vitality Shard', icon: '💠', tier: 'common',
    description: '+25 max HP for this run.',
    statBonus: { hp: 25 } },
  { id: 'mana_conduit', name: 'Mana Conduit', icon: '🔋', tier: 'common',
    description: '+5 Power for this run.',
    statBonus: { power: 5 } },
  // UNCOMMON
  { id: 'battle_drum', name: 'Battle Drum', icon: '🥁', tier: 'uncommon',
    description: 'After killing an enemy, draw 1 card.',
    passiveTag: 'draw_on_kill' },
  { id: 'arena_medkit', name: 'Arena Medkit', icon: '💊', tier: 'uncommon',
    description: 'Heal 20 HP at the start of your turn if below 40% HP.',
    passiveTag: 'regen_low_hp' },
  { id: 'void_shard', name: 'Void Shard', icon: '🔥', tier: 'uncommon',
    description: 'Basic attacks deal +10 bonus damage.',
    passiveTag: 'atk_bonus_10', statBonus: { might: 10 } },
  { id: 'card_satchel', name: 'Card Satchel', icon: '🎒', tier: 'uncommon',
    description: '+1 starting hand size for this run.',
    passiveTag: 'hand_size_plus_1' },
  { id: 'strategists_case', name: "Strategist's Case", icon: '💼', tier: 'uncommon',
    description: '+2 starting hand size for this run.',
    passiveTag: 'hand_size_plus_2' },
  { id: 'quick_boots', name: 'Quick Boots', icon: '👟', tier: 'uncommon',
    description: '+1 movement range permanently.',
    passiveTag: 'move_plus_1' },
  { id: 'soul_ember', name: 'Soul Ember', icon: '🕯️', tier: 'uncommon',
    description: 'On kill, restore 15 HP to this character.',
    passiveTag: 'on_kill_heal_15' },
  // RARE — general
  { id: 'alien_core', name: 'Alien Core', icon: '🧬', tier: 'rare',
    description: '+12 Power. Ability damage +15%.',
    statBonus: { power: 12 }, passiveTag: 'ability_power_15pct' },
  { id: 'gladiator_brand', name: "Gladiator's Brand", icon: '⚡', tier: 'rare',
    description: 'First ability each fight costs 0 Mana.',
    passiveTag: 'first_ability_free' },
  // RARE — Napoleon
  { id: 'grand_strategy', name: 'Grand Strategy', icon: '🗺️', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Artillery Barrage hits an additional adjacent target.',
    passiveTag: 'napoleon_barrage_splash' },
  { id: 'emperors_coat', name: "Emperor's Coat", icon: '🪖', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Grande Armée also restores 1 Mana to each buffed ally.',
    passiveTag: 'napoleon_armee_mana' },
  // RARE — Genghis
  { id: 'eternal_hunger', name: 'Eternal Hunger', icon: '🩸', tier: 'rare',
    targetCharacter: 'genghis',
    description: 'Bloodlust can stack up to 5× instead of 3×.',
    passiveTag: 'genghis_bloodlust_5x' },
  { id: 'khans_seal', name: "Khan's Seal", icon: '🏹', tier: 'rare',
    targetCharacter: 'genghis',
    description: "Rider's Fury also stuns each hit enemy for 1 turn.",
    passiveTag: 'genghis_fury_stun' },
  // RARE — Da Vinci
  { id: 'aerial_lens', name: 'Aerial Lens', icon: '🔭', tier: 'rare',
    targetCharacter: 'davinci',
    description: 'Flying Machine can swap position with an allied unit.',
    passiveTag: 'davinci_machine_swap' },
  { id: 'life_formula', name: 'Life Formula', icon: '💚', tier: 'rare',
    targetCharacter: 'davinci',
    description: 'Masterpiece heals an additional 25 HP.',
    passiveTag: 'davinci_masterpiece_plus25' },
  // LEGENDARY
  { id: 'znyxorgas_eye', name: "Znyxorga's Eye", icon: '👁️', tier: 'legendary',
    description: 'After defeating an enemy, all ability cooldowns reduce by 1.',
    passiveTag: 'cooldown_on_kill' },
  { id: 'void_armor', name: 'Void Armor', icon: '🛡️', tier: 'legendary',
    description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.',
    passiveTag: 'once_survive_lethal' },
  { id: 'arena_champion', name: 'Arena Champion', icon: '🏆', tier: 'legendary',
    description: 'All stats +10 while this character is alive.',
    statBonus: { hp: 10, might: 10, power: 10, defense: 10 } },
];

// ── Card Reward Pool ──────────────────────────────────────────────────────────

export const CARD_REWARD_POOL: CardReward[] = [
  { definitionId: 'shared_shield',       name: 'Shields Up',       icon: '🛡️', manaCost: 1, description: 'Gain +10 DEF until your next turn.' },
  { definitionId: 'shared_mend',         name: 'Mend',             icon: '💚', manaCost: 1, description: 'Restore 20 HP to a nearby ally.' },
  { definitionId: 'shared_battle_cry',   name: 'Battle Cry',       icon: '📣', manaCost: 2, description: '+10 Might to all allies this turn.' },
  { definitionId: 'shared_demoralize',   name: 'Demoralize',       icon: '😰', manaCost: 2, description: '50% chance per turn to skip movement & cards. Lasts 4 turns. Range 2.' },
  { definitionId: 'shared_armor_break',  name: 'Armor Break',      icon: '💥', manaCost: 2, description: 'Target enemy loses 20% Defense for 4 turns.' },
  { definitionId: 'shared_silence',      name: 'Silence',          icon: '🔇', manaCost: 1, description: 'Target cannot use abilities for 2 turns.' },
  { definitionId: 'shared_poison_dart',  name: 'Poison Dart',      icon: '☠️', manaCost: 1, description: 'Apply Poison — target takes damage each turn.' },
  { definitionId: 'shared_mud_throw',    name: 'Mud Throw',        icon: '🪣', manaCost: 1, description: 'Slow target — movement -2 for 2 turns.' },
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, description: 'Deal 84 damage at range 4.', exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, description: '+20% Might & Power to all allies for 2 turns.', exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_final_salvo',       name: 'Final Salvo',       icon: '⭐', manaCost: 3, description: '3 shots each dealing 42 to random enemies.', exclusiveTo: 'Napoleon' },
  { definitionId: 'genghis_mongol_charge',  name: 'Mongol Charge',  icon: '⚡', manaCost: 2, description: 'Deal 48 damage at range 3.', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics',  name: 'Horde Tactics',  icon: '🌀', manaCost: 3, description: 'Deal 32 damage to all enemies in range 2.', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_riders_fury',    name: "Rider's Fury",   icon: '⭐', manaCost: 3, description: 'Deal 28 to every enemy on a line up to range 5.', exclusiveTo: 'Genghis' },
  { definitionId: 'davinci_flying_machine', name: 'Flying Machine', icon: '✈️', manaCost: 2, description: 'Teleport to any unoccupied hex in range 5.', exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',    name: 'Masterpiece',    icon: '💚', manaCost: 3, description: 'Restore 45 HP to an ally and remove Poison.', exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, description: 'Summon a 50 HP combat drone for 2 turns.', exclusiveTo: 'Da Vinci' },
  { definitionId: 'leonidas_shield_bash',    name: 'Shield Bash',      icon: '⚡', manaCost: 2, description: 'Power×1.5 dmg at range 1 + Armor Break (−20% DEF, 2t).', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall',   name: 'Spartan Wall',     icon: '🏛️', manaCost: 3, description: '+20 Defense to Leonidas and all allies within range 2.', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_this_is_sparta', name: 'THIS IS SPARTA!',  icon: '⭐', manaCost: 3, description: 'Power×3 dmg to target + Demoralize adjacent enemies (1t).', exclusiveTo: 'Leonidas' },
  { definitionId: 'shared_quick_move',   name: 'Quick Move',  icon: '🏃', manaCost: 1, description: '+2 movement this turn.' },
  { definitionId: 'shared_gamble',       name: 'Gamble',      icon: '🎲', manaCost: 0, description: 'Draw 3 cards, discard 1 at random.' },
];

// ── Encounter Builders ────────────────────────────────────────────────────────

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildEncounter(
  type: 'enemy' | 'elite' | 'boss',
  act: 1 | 2 | 3,
  rng: () => number
): EncounterDef {
  const e1Pool = [ENEMIES.glorp_shambler, ENEMIES.zyx_skitter, ENEMIES.naxion_scout, ENEMIES.vron_crawler];
  const e2Pool = [ENEMIES.mog_toxin, ENEMIES.qrix_hunter, ENEMIES.void_wraith];
  const pool = act === 1 ? e1Pool : e2Pool;

  let enemies: EnemyTemplate[];
  let name: string;
  let xp: number;
  let gold: number;
  let dropChance: number;

  if (type === 'boss') {
    if (act === 1)      enemies = [ENEMIES.iron_wall];
    else if (act === 2) enemies = [ENEMIES.twin_terror_a, ENEMIES.twin_terror_b];
    else                enemies = [ENEMIES.znyxorga_champion];
    name = `Act ${act} Boss`;
    xp = 80; gold = 90 + Math.floor(rng() * 30); dropChance = 1.0;
  } else if (type === 'elite') {
    enemies = act === 1
      ? (rng() < 0.5 ? [ENEMIES.krath_champion] : [ENEMIES.spore_cluster, ENEMIES.spore_cluster, ENEMIES.spore_cluster])
      : (rng() < 0.5 ? [ENEMIES.krath_berserker] : [ENEMIES.phasewarden]);
    name = 'Elite Encounter';
    xp = 30; gold = 30 + Math.floor(rng() * 20); dropChance = 0.70;
  } else {
    // standard enemy: 1–3 enemies
    const count = rng() < 0.4 ? 2 : 1;
    enemies = Array.from({ length: count }, () => pick(pool, rng));
    name = count > 1 ? `${count} Enemies` : 'Enemy Encounter';
    xp = 20; gold = 10 + Math.floor(rng() * 15); dropChance = 0.30;
  }

  // Objective: bosses always destroy_base; elites 30% destroy_base; others 20% destroy_base
  const objectiveRoll = rng();
  const objective = type === 'boss'
    ? 'destroy_base'
    : objectiveRoll < 0.2 && type !== 'elite'
      ? (rng() < 0.5 ? 'survive' : 'defeat_all')
      : 'defeat_all';

  const objectiveLabels: Record<string, string> = {
    defeat_all: 'Defeat all enemies',
    destroy_base: 'Destroy the enemy base',
    survive: 'Survive 6 turns',
    onslaught: 'Hold the line',
  };

  return {
    name, objective, objectiveLabel: objectiveLabels[objective], enemies,
    survivalTurns: objective === 'survive' ? 6 : undefined,
    goldReward: gold, xpReward: xp, bonusXpNoHit: 30, bonusXpFast: 20,
    itemDropChance: dropChance, guaranteedItem: type === 'boss',
  };
}

// ── Node Type Picker ──────────────────────────────────────────────────────────

function pickNodeType(row: number, rng: () => number): NodeType {
  // 12-row map: rows 0=start (always enemy), 11=boss (fixed), 1-10 vary
  const tables: Record<number, [NodeType, number][]> = {
    1:  [['enemy',0.65],['unknown',0.20],['treasure',0.15]],
    2:  [['enemy',0.50],['campfire',0.30],['unknown',0.20]],
    3:  [['enemy',0.40],['elite',0.15],['campfire',0.20],['merchant',0.25]],
    4:  [['enemy',0.35],['elite',0.15],['campfire',0.25],['merchant',0.25]],
    5:  [['enemy',0.40],['elite',0.20],['treasure',0.20],['merchant',0.20]],
    6:  [['enemy',0.35],['elite',0.20],['campfire',0.25],['merchant',0.20]],
    7:  [['enemy',0.40],['elite',0.25],['campfire',0.20],['treasure',0.15]],
    8:  [['enemy',0.30],['elite',0.30],['campfire',0.25],['merchant',0.15]],
    9:  [['enemy',0.35],['elite',0.35],['treasure',0.30]],
    10: [['elite',0.60],['campfire',0.40]],
  };
  const table = tables[row] ?? [['enemy',1.0]];
  const roll = rng();
  let acc = 0;
  for (const [t, w] of table) {
    acc += w;
    if (roll <= acc) return t;
  }
  return 'enemy';
}

// ── Map Generation ────────────────────────────────────────────────────────────

export function generateActMap(seed: number, act: 1 | 2 | 3): RunNode[] {
  const rng = seededRng(seed + act * 997);
  const nodes: RunNode[] = [];

  // row 0 always 2 enemy nodes (starting choice), row 11 = boss
  const rowCounts = [2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 1]; // rows 0–11 (~12 nodes per path)

  const rowNodes: RunNode[][] = rowCounts.map((count, row) => {
    return Array.from({ length: count }, (_, col) => {
      let type: NodeType;
      if (row === 0) type = 'enemy';
      else if (row === 11) type = 'boss';
      else type = pickNodeType(row, rng);

      const isCombat = type === 'enemy' || type === 'elite' || type === 'boss';
      return {
        id: `r${row}c${col}`,
        row, col, rowCount: count, type,
        connections: [],
        encounter: isCombat ? buildEncounter(
          type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'enemy',
          act, rng
        ) : undefined,
      } satisfies RunNode;
    });
  });

  // Connect each node to 1–2 nodes in the next row
  for (let row = 0; row < rowNodes.length - 1; row++) {
    const curr = rowNodes[row];
    const next = rowNodes[row + 1];
    for (const node of curr) {
      const closestCol = Math.min(node.col, next.length - 1);
      const conns: string[] = [next[closestCol].id];
      // 40% chance to also connect to an adjacent node
      if (next.length > 1 && rng() < 0.40) {
        const alt = closestCol === 0 ? 1 : closestCol - 1;
        if (alt < next.length && alt !== closestCol) conns.push(next[alt].id);
      }
      node.connections = conns;
    }
  }

  return rowNodes.flat().map(n => ({ ...n, connections: [...new Set(n.connections)] }));
}

// ── Starting Deck ─────────────────────────────────────────────────────────────

// Base shared cards (given to everyone); character ability cards are added per selected character in useRunState
export const SHARED_STARTING_CARDS: string[] = [
  'shared_basic_attack', 'shared_basic_attack', 'shared_basic_attack', 'shared_basic_attack',
  'shared_shield',       'shared_shield',       'shared_shield',       'shared_shield',
  'shared_mend',
  'shared_battle_cry',
  'shared_gamble',
];

// One signature ability card per character (added only if that character is selected)
export const CHARACTER_STARTING_CARDS: Record<string, string> = {
  napoleon: 'napoleon_artillery_barrage',
  genghis:  'genghis_mongol_charge',
  davinci:  'davinci_masterpiece',
  leonidas: 'leonidas_shield_bash',
};

// ── Starting Characters ───────────────────────────────────────────────────────

export function buildStartingCharacters(): CharacterRunState[] {
  return [
    {
      id: 'napoleon', displayName: 'Napoleon-chan', portrait: '/art/napoleon_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      items: [null, null, null, null, null],
    },
    {
      id: 'genghis', displayName: 'Genghis-chan', portrait: '/art/genghis_portrait.png',
      currentHp: 120, maxHp: 120, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      items: [null, null, null, null, null],
    },
    {
      id: 'davinci', displayName: 'Da Vinci-chan', portrait: '/art/davinci_portrait.png',
      currentHp: 80, maxHp: 80, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      items: [null, null, null, null, null],
    },
    {
      id: 'leonidas', displayName: 'Leonidas-chan', portrait: '/art/leonidas_portrait.png',
      currentHp: 130, maxHp: 130, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      items: [null, null, null, null, null],
    },
  ];
}

// XP thresholds per level (cumulative)
export const XP_TO_NEXT = [0, 100, 220, 380, 580, 830, 9999];

// Pick 3 random cards for the reward screen (no duplicates from current deck)
export function pickCardRewards(currentDeck: string[], rng: () => number): CardReward[] {
  const pool = CARD_REWARD_POOL.filter(c => {
    // Allow duplicates of shared cards but not character ultimates
    const isUltimate = c.definitionId.endsWith('_fury') || c.definitionId.endsWith('_salvo') || c.definitionId.endsWith('_guardian');
    return !(isUltimate && currentDeck.includes(c.definitionId));
  });
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3);
}

export function pickItemReward(tier: 'common' | 'uncommon' | 'rare' | 'legendary', rng: () => number): RunItem {
  const pool = ITEMS.filter(i => {
    if (tier === 'legendary') return i.tier === 'legendary';
    if (tier === 'rare') return i.tier === 'rare' || i.tier === 'uncommon';
    if (tier === 'uncommon') return i.tier === 'uncommon' || i.tier === 'common';
    return i.tier === 'common';
  });
  return pick(pool, rng);
}
