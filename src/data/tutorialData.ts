// src/data/tutorialData.ts
import { EncounterDef, RunNode } from '@/types/roguelike';
import { ENEMIES } from './roguelikeData';

// ── Trigger types ─────────────────────────────────────────────────────────────

export type TutorialTrigger =
  | 'button'              // player clicks "Next ›" in overlay
  | 'any_move'            // player moves any character to an empty hex
  | 'any_card'            // player plays any card from hand
  | 'end_turn'            // player clicks End Turn
  | 'click_enemy'         // player clicks an enemy tile (no targeting active)
  | 'battle_won'          // current battle ended in victory
  | 'card_picked'         // player picked a card on the rewards screen
  | 'fight_node_clicked'  // player clicked a fight/elite/boss map node
  | 'campfire_done';      // player clicked Leave on the campfire screen

export type TutorialHighlight =
  | 'none'
  | 'stats_panel'
  | 'move_tiles'
  | 'hand_cards'
  | 'basic_attack_card'  // highlights only Basic Attack, dims others
  | 'shields_up_card'    // highlights only Shields Up, dims others
  | 'mana_display'
  | 'endturn_btn'
  | 'turn_queue'
  | 'enemy'
  | 'map_nodes'
  | 'reward_cards';

export interface TutorialStep {
  text: string;
  subtext?: string;
  trigger: TutorialTrigger;
  highlight: TutorialHighlight;
}

export type TutorialStage =
  | 'welcome'
  | 's1_battle'
  | 's2_battle'
  | 's3_map'
  | 's3b_campfire'
  | 's4_battle'
  | 's5_boss'
  | 'complete';

export const STAGE_ORDER: TutorialStage[] = [
  'welcome', 's1_battle', 's3_map', 's2_battle', 's3b_campfire', 's4_battle', 's5_boss', 'complete',
];

// ── Step definitions ──────────────────────────────────────────────────────────

export const TUTORIAL_STEPS: Record<TutorialStage, TutorialStep[]> = {
  welcome: [
    {
      text: 'Welcome to Waifu Clone Wars, Clone.',
      subtext: "You've been abducted by the Znyxorga Empire and thrown into their interdimensional gladiator circuit. This tutorial will teach you everything you need to survive. It takes about 5 minutes.",
      trigger: 'button',
      highlight: 'none',
    },
    {
      text: "Here's your first task — survive a training bout.",
      subtext: "You'll fight a weakened enemy to learn the basics of movement and combat. Click the first node to begin.",
      trigger: 'fight_node_clicked',
      highlight: 'map_nodes',
    },
  ],

  s1_battle: [
    {
      text: 'This is Leonidas. She is your first fighter.',
      subtext: 'Every character has HP (health), Might (melee damage), Power (card damage), Defense (damage reduction), and Move Range. Check the stats panel on the left.',
      trigger: 'button',
      highlight: 'stats_panel',
    },
    {
      text: 'Move Leonidas toward the enemy.',
      subtext: 'Click Leonidas to select her, then click one of the glowing green hexes to move. Green = valid move tile.',
      trigger: 'any_move',
      highlight: 'move_tiles',
    },
    {
      text: 'Now attack — use Basic Attack on the enemy.',
      subtext: 'Click the Basic Attack card, then click the enemy to hit it.',
      trigger: 'any_card',
      highlight: 'basic_attack_card',
    },
    {
      text: 'Good hit! Click END TURN.',
      subtext: "The enemy takes its turn, then you draw new cards and go again.",
      trigger: 'end_turn',
      highlight: 'endturn_btn',
    },
    {
      text: 'Finish it off!',
      subtext: 'You have two Basic Attacks — one will be enough. Use it on the enemy to win.',
      trigger: 'battle_won',
      highlight: 'basic_attack_card',
    },
  ],

  s2_battle: [
    {
      text: 'Two enemies this time. Let\'s talk about Mana.',
      subtext: 'You start each turn with 5 Mana. Cards cost different amounts. Unused mana is lost at end of turn.',
      trigger: 'button',
      highlight: 'mana_display',
    },
    {
      text: 'Play Shields Up to boost your Defense.',
      subtext: 'Click Shields Up to gain +10 Defense until your next turn, then click END TURN.',
      trigger: 'any_card',
      highlight: 'shields_up_card',
    },
    {
      text: 'Defeat all enemies!',
      subtext: 'You have two Basic Attacks this turn — use them on the enemies.',
      trigger: 'battle_won',
      highlight: 'none',
    },
  ],

  s3_map: [
    {
      text: 'You earned a card reward — pick one!',
      subtext: 'You keep this card for the rest of your run. Add it to your deck permanently. Choose the one that fits your strategy.',
      trigger: 'card_picked',
      highlight: 'reward_cards',
    },
    {
      text: 'This is the Arena Circuit map.',
      subtext: 'Between battles you travel a branching path. Each node offers something different. You choose your route — every run is different.',
      trigger: 'button',
      highlight: 'map_nodes',
    },
    {
      text: '⚔️ Fight  ·  💀 Elite  ·  🏪 Shop  ·  🛏️ Rest  ·  👑 Boss',
      subtext: 'Fight = standard battle · Elite = harder fight, better loot · Shop = spend gold · Rest = heal HP or upgrade a card · Boss = end of act.',
      trigger: 'button',
      highlight: 'map_nodes',
    },
    {
      text: 'Click the next fight node to continue.',
      subtext: 'In a real run, paths branch between fights, rest nodes, shops, and elites. For now, click the fight node to proceed.',
      trigger: 'fight_node_clicked',
      highlight: 'map_nodes',
    },
  ],

  s4_battle: [
    {
      text: 'Napoleon has joined your squad!',
      subtext: "You now control two fighters. Both act each turn — you choose the order. Each has their own cards and you share a mana pool between them.",
      trigger: 'button',
      highlight: 'turn_queue',
    },
    {
      text: 'Use the active unit bar at the top to switch fighters.',
      subtext: 'Click a portrait in the bar to switch who you\'re controlling, or just click their icon on the board. Both must finish their actions before you end the turn.',
      trigger: 'button',
      highlight: 'turn_queue',
    },
    {
      text: 'Use both characters — each has a Basic Attack card.',
      subtext: "Select Leonidas, use her Basic Attack. Then switch to Napoleon and use his. Combined they'll take down any enemy.",
      trigger: 'battle_won',
      highlight: 'hand_cards',
    },
  ],

  s5_boss: [
    {
      text: 'Final test — a Krath Champion stands before you.',
      subtext: "Use both fighters like before. This champion is weakened for training — the real ones are not.",
      trigger: 'button',
      highlight: 'none',
    },
    {
      text: 'Defeat the Champion to complete the tutorial!',
      subtext: "Each fighter has a Basic Attack. Land both and the champion falls.",
      trigger: 'battle_won',
      highlight: 'hand_cards',
    },
  ],

  s3b_campfire: [
    {
      text: 'This is a Rest Node — your recovery point.',
      subtext: 'Heal all characters for 30% of their max HP, or upgrade a card in your deck to a stronger version. Rest nodes are your main healing tool between fights.',
      trigger: 'button',
      highlight: 'none',
    },
    {
      text: 'Heal up, then head to the next fight.',
      subtext: 'Napoleon joins you for the next battle — you\'ll want to be ready. Leave when you\'re done.',
      trigger: 'campfire_done',
      highlight: 'none',
    },
  ],

  complete: [],
};

// ── Tutorial Encounters ───────────────────────────────────────────────────────

function scaleEnemy(enemy: typeof ENEMIES[string], scale: number) {
  return {
    ...enemy,
    stats: {
      hp:          Math.max(1, Math.round(enemy.stats.hp * scale)),
      maxHp:       Math.max(1, Math.round(enemy.stats.hp * scale)),
      might:       Math.max(1, Math.round(enemy.stats.might * scale)),
      power:       Math.max(1, Math.round(enemy.stats.power * scale)),
      defense:     Math.max(0, Math.round(enemy.stats.defense * scale)),
      moveRange:   enemy.stats.moveRange,
      attackRange: enemy.stats.attackRange,
    },
  };
}

// Stage 1: 1× Glorp Shambler at 80%
// Scripted hands: turn 0 = 1 Basic Attack (hits, 16 HP left), turn 1+ = 2 Basic Attacks (finish it off)
export const TUTORIAL_ENC_1: EncounterDef = {
  name: 'Training Bout I',
  objective: 'defeat_all',
  objectiveLabel: 'Defeat all enemies',
  enemies: [{ ...scaleEnemy(ENEMIES.glorp_shambler, 0.8), count: 1 }],
  goldReward: 0, xpReward: 10, bonusXpNoHit: 5, bonusXpFast: 5,
  itemDropChance: 0, guaranteedItem: false,
  tutorialForcePositions: [
    { nameContains: 'Leonidas', q: -1, r: 0 },
    { nameContains: 'Glorp',    q:  1, r: 0 },
  ],
  tutorialHandScript: [
    ['shared_basic_attack'],                           // turn 0: 1 attack (hits, doesn't kill)
    ['shared_basic_attack', 'shared_basic_attack'],    // turn 1: 2 attacks, use 1 to finish
  ],
};

// Stage 2: 2× Zyx Skitter at 70%
// Scripted hands: turn 0 = Shields Up only (learn shield), turn 1+ = 2 Basic Attacks (kill both)
export const TUTORIAL_ENC_2: EncounterDef = {
  name: 'Training Bout II',
  objective: 'defeat_all',
  objectiveLabel: 'Defeat all enemies',
  enemies: [{ ...scaleEnemy(ENEMIES.zyx_skitter, 0.7), count: 2 }],
  goldReward: 10, xpReward: 15, bonusXpNoHit: 5, bonusXpFast: 5,
  itemDropChance: 0, guaranteedItem: false,
  tutorialForcePositions: [
    { nameContains: 'Leonidas', q: -2, r:  0 },
    { nameContains: 'Zyx',      q:  1, r:  0 },
    { nameContains: 'Zyx',      q:  2, r: -1 },
  ],
  tutorialHandScript: [
    ['shared_shield'],                                 // turn 0: Shields Up only (learn shield)
    ['shared_basic_attack', 'shared_basic_attack'],    // turn 1: kill both Zyx (1-shot each)
  ],
};

// Stage 4: 1× Vron Crawler at 60%  (2 chars)
// Scripted hands: turn 0 = 2 Basic Attacks (Leo + Napoleon each hit once, kills in 1 turn)
export const TUTORIAL_ENC_3: EncounterDef = {
  name: 'Training Bout III',
  objective: 'defeat_all',
  objectiveLabel: 'Defeat all enemies',
  enemies: [{ ...scaleEnemy(ENEMIES.vron_crawler, 0.6), count: 1 }],
  goldReward: 10, xpReward: 20, bonusXpNoHit: 5, bonusXpFast: 5,
  itemDropChance: 0, guaranteedItem: false,
  tutorialForcePositions: [
    { nameContains: 'Leonidas', q: -2, r:  0 },
    { nameContains: 'Napoleon', q: -3, r:  1 },
    { nameContains: 'Vron',     q:  2, r:  0 },
  ],
  tutorialHandScript: [
    ['shared_basic_attack', 'shared_basic_attack'],    // turn 0: both chars attack once
    ['shared_basic_attack', 'shared_basic_attack'],    // fallback turn 1 if needed
  ],
};

// Stage 5 Boss: 1× Krath Champion at 50%  (2 chars)
// Scripted hands: turn 0 = 2 Basic Attacks (combined damage kills champion)
export const TUTORIAL_ENC_BOSS: EncounterDef = {
  name: 'Tutorial Boss',
  objective: 'defeat_all',
  objectiveLabel: 'Defeat the Champion',
  enemies: [{ ...scaleEnemy(ENEMIES.krath_champion, 0.5), count: 1 }],
  goldReward: 20, xpReward: 30, bonusXpNoHit: 10, bonusXpFast: 10,
  itemDropChance: 0, guaranteedItem: false,
  tutorialForcePositions: [
    { nameContains: 'Leonidas', q: -2, r:  0 },
    { nameContains: 'Napoleon', q: -3, r:  1 },
    { nameContains: 'Krath',    q:  3, r:  0 },
  ],
  tutorialHandScript: [
    ['shared_basic_attack', 'shared_basic_attack'],    // turn 0: both chars attack
    ['shared_basic_attack', 'shared_basic_attack'],    // fallback turn 1 if needed
  ],
};

// ── Tutorial Map ──────────────────────────────────────────────────────────────

/** Extended RunNode that records which character IDs to use for this fight. */
export interface TutorialRunNode extends RunNode {
  tutorialCharIds: string[];
  tutorialStage: TutorialStage;
}

export const TUTORIAL_MAP: TutorialRunNode[] = [
  {
    id: 'tut-0', row: 0, col: 0, rowCount: 1,
    type: 'enemy', connections: ['tut-1'],
    encounter: TUTORIAL_ENC_1,
    tutorialCharIds: ['leonidas'],
    tutorialStage: 's1_battle',
  },
  {
    id: 'tut-1', row: 1, col: 0, rowCount: 1,
    type: 'enemy', connections: ['tut-2'],
    encounter: TUTORIAL_ENC_2,
    tutorialCharIds: ['leonidas'],
    tutorialStage: 's2_battle',
  },
  {
    id: 'tut-2', row: 2, col: 0, rowCount: 1,
    type: 'campfire', connections: ['tut-3'],
    tutorialCharIds: [],
    tutorialStage: 's3_map',
  },
  {
    id: 'tut-3', row: 3, col: 0, rowCount: 1,
    type: 'enemy', connections: ['tut-4'],
    encounter: TUTORIAL_ENC_3,
    tutorialCharIds: ['leonidas', 'napoleon'],
    tutorialStage: 's4_battle',
  },
  {
    id: 'tut-4', row: 4, col: 0, rowCount: 1,
    type: 'boss', connections: [],
    encounter: TUTORIAL_ENC_BOSS,
    tutorialCharIds: ['leonidas', 'napoleon'],
    tutorialStage: 's5_boss',
  },
];

// ── Tutorial Character Stubs ──────────────────────────────────────────────────
// Minimal shape needed by buildIconsFromSelection + buildStartingCharacters

export const TUTORIAL_CHARS = [
  { id: 'leonidas', name: 'Leonidas-chan', role: 'tank',      stats: { hp: 130, might: 40, power: 36 } },
  { id: 'napoleon', name: 'Napoleon-chan', role: 'dps_ranged', stats: { hp: 100, might: 65, power: 60 } },
];
