// src/types/roguelike.ts

export type NodeType = 'enemy' | 'elite' | 'campfire' | 'merchant' | 'treasure' | 'unknown' | 'boss';
export type FightObjective = 'defeat_all' | 'destroy_base' | 'survive' | 'onslaught';
export type ItemTier = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CharacterId = 'napoleon' | 'genghis' | 'davinci' | 'leonidas' | 'sunsin';

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
  items: (RunItem | null)[]; // 5 slots
}

export interface CombatResult {
  nodeId: string;
  won: boolean;
  turnsElapsed: number;
  finalHps: Record<CharacterId, number>; // HP each character ended with
}

export interface PendingRewards {
  gold: number;
  xp: number;
  cardChoices: CardReward[];   // 3 options, player picks 1 or skips
  itemDrop?: RunItem;           // optional item reward (normal fights)
  bossItems?: RunItem[];        // boss fights: one item per living character, auto-equipped
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
}
