// src/types/roguelike.ts

export type NodeType = 'enemy' | 'elite' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'boss';
export type FightObjective = 'defeat_all' | 'destroy_base' | 'survive' | 'onslaught';
export type ItemTier = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CharacterId = 'napoleon' | 'genghis' | 'davinci' | 'leonidas' | 'sunsin' | 'beethoven' | 'huang' | 'nelson' | 'hannibal' | 'picasso' | 'teddy' | 'mansa';

export interface RunNode {
  id: string;
  row: number;     // 0 = start (bottom), 6 = boss (top)
  col: number;     // horizontal position within row (0-indexed)
  rowCount: number; // total nodes in this row (for x positioning)
  type: NodeType;
  connections: string[]; // node IDs in the next row this connects to
  encounter?: EncounterDef;
}

export interface EncounterDef {
  name: string;
  objective: FightObjective;
  objectiveLabel: string;
  enemies: EnemyTemplate[];
  survivalTurns?: number;      // for 'survive' objective
  spawnInterval?: number;      // turns between waves for 'onslaught'
  goldReward: number;
  xpReward: number;
  bonusXpNoHit: number;
  bonusXpFast: number;         // awarded if won in ≤ 4 turns
  itemDropChance: number;      // 0–1
  guaranteedItem: boolean;
  /** Tutorial-only: override spawn positions by matching icon name substring */
  tutorialForcePositions?: Array<{ nameContains: string; q: number; r: number }>;
  /** Tutorial-only: scripted hand per player-0 turn. Index 0 = initial hand, 1 = after first end-turn, etc. */
  tutorialHandScript?: string[][];
}

export interface EnemyAbilityEffect {
  type:
    | 'buff_self'          // stat buff on self
    | 'heal_self'          // restore own HP
    | 'aoe_damage'         // hits all player icons in range
    | 'debuff_enemies'     // applies debuff to all player icons in range
    | 'damage_all_enemies' // hits ALL player icons anywhere (boss nuke)
    | 'dash_attack';       // teleport adjacent to closest enemy and hit
  mightBonus?: number;
  powerBonus?: number;     // permanent Power increase (buff_self)
  defenseBonus?: number;
  duration?: number;
  amount?: number;
  range?: number;
  multiplier?: number;
  debuffType?: string;
  magnitude?: number;
  damage?: number;
  dashRange?: number;
}

export interface EnemyAbilityDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;           // turns between uses; 0 = usable every turn
  oncePerFight?: boolean;     // if true, set cooldown to 999 after first use
  triggerCondition?: 'low_hp';
  hpThreshold?: number;       // 0.0–1.0; used with low_hp trigger
  effect: EnemyAbilityEffect;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  icon: string;
  portrait?: string;
  description?: string;
  stats: {
    hp: number;
    maxHp: number;
    might: number;
    power: number;
    defense: number;
    moveRange: number;
    attackRange: number;
  };
  ai: 'aggressive' | 'defensive' | 'ranged' | 'berserker';
  count: number; // how many copies of this enemy appear
  abilities?: EnemyAbilityDef[];
}

export interface RunItem {
  id: string;
  name: string;
  icon: string;
  tier: ItemTier;
  targetCharacter?: CharacterId; // undefined = equippable by any
  description: string;
  statBonus?: Partial<{ hp: number; might: number; power: number; defense: number }>;
  passiveTag?: string; // e.g. 'on_kill_heal', 'draw_on_kill', 'void_armor' — handled by game engine
}

export interface CardReward {
  definitionId: string;
  name: string;
  icon: string;
  description: string;
  manaCost: number;
  exclusiveTo?: string; // e.g. 'Napoleon' | 'Genghis' | 'Da Vinci'
  rarity?: 'common' | 'uncommon' | 'rare' | 'ultimate';
}

export interface CharacterRunState {
  id: CharacterId;
  displayName: string;
  portrait: string;
  currentHp: number;
  maxHp: number; // base + bonuses
  level: number;
  xp: number;
  xpToNext: number;
  statBonuses: { hp: number; might: number; power: number; defense: number };
  pendingStatPoints: number;
  pendingAbilityUpgrades: number;   // normal ability upgrade tokens (levels 2 & 4)
  pendingUltimateUpgrade: number;   // ultimate ability upgrade token (level 6)
  upgradedAbilityIds: string[];     // definitionIds already upgraded (won't be offered again)
  items: (RunItem | null)[]; // 6 slots
  passiveStacks?: number;           // persisted passive stacks (e.g. Genghis Bloodlust with Eternal Hunger item)
}

export interface CombatResult {
  nodeId: string;
  won: boolean;
  turnsElapsed: number;
  finalHps: Record<CharacterId, number>; // HP each character ended with
  finalPassiveStacks?: Record<string, number>; // passive stacks to persist (e.g. Genghis bloodlust)
  enemiesKilled?: number;
}

export interface PendingRewards {
  gold: number;
  xp: number;
  cardChoices: CardReward[];   // 3 options, player picks 1 or skips
  itemDrop?: RunItem;           // optional item reward (normal fights)
  bossItems?: RunItem[];        // boss fights: one item per living character, auto-equipped
  completedNodeId?: string;     // the node that was just completed (used to unlock correct next nodes)
}

export interface RunState {
  seed: number;
  act: 1 | 2 | 3;
  gold: number;
  currentNodeId: string | null;
  completedNodeIds: string[];
  unlockedNodeIds: string[];
  map: RunNode[];
  characters: CharacterRunState[];
  deckCardIds: string[];
  pendingRewards: PendingRewards | null;
  permanentlyDeadIds: CharacterId[];  // chars who died in combat and are gone for the run
  battleCount: number;                // how many combat nodes completed so far
  upgradedCardDefIds: string[];       // definitionIds upgraded this run (applied at battle start)
  runStats: {
    enemiesKilled: number;
    itemsObtained: number;
    cardsObtained: number;
  };
  runStartTime: number; // Date.now() timestamp when run began
  isTutorialRun?: boolean;
}
