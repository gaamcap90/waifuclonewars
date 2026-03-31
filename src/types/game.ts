export interface Coordinates {
  q: number;
  r: number;
}

export interface TerrainType {
  type: 'forest' | 'mountain' | 'river' | 'plain' | 'mana_crystal' | 'beast_camp' | 'base' | 'spawn';
  effects: {
    movementModifier?: number;
    dodgeBonus?: boolean;
    rangeBonus?: boolean;
    stealthBonus?: boolean;
    blocksLineOfSight?: boolean;
    manaRegen?: number;
  };
}

export interface Icon {
  id: string;
  name: string;
  role: 'tank' | 'dps_ranged' | 'dps_melee' | 'support' | 'controller';
  stats: {
    hp: number;
    maxHp: number;
    moveRange: number;
    speed: number; // For turn queue
    might: number; // Physical attack power
    power: number; // Magical/ability power
    defense: number; // Damage reduction
    movement: number; // Current movement points remaining
    mana: number;    // Current mana (0–3 default)
    maxMana: number; // Max mana per turn (default 3)
  };
  cardBuffAtk?: number; // Temporary ATK bonus from cards this turn
  cardBuffDef?: number; // Temporary DEF bonus from cards this turn
  abilities: Ability[];
  passive: string;
  position: Coordinates;
  playerId: number;
  isAlive: boolean;
  respawnTurns: number;
  cardUsedThisTurn: boolean;
  movedThisTurn: boolean; // Has this icon moved this turn?
  hasUltimate: boolean; // Can use ultimate this match
  ultimateUsed: boolean; // Has used ultimate this match
  movementHistory?: { position: Coordinates; cost: number }[]; // Move history for undo
  hasRespawned?: boolean;
  justRespawned?: boolean;
  droneExpiresTurn?: number; // Round number when this drone is removed (Vitruvian Guardian)

}

export interface Ability {
  id: string;
  name: string;
  manaCost: number;
  cooldown: number;
  currentCooldown: number;
  range: number;
  description: string;
  damage?: number;
  healing?: number;
  effects?: string[];
  exclusiveTo?: string | null; // characterId or null for shared
}

// ── Card System ──────────────────────────────────────────────────────────────

export type CardType = 'attack' | 'defense' | 'buff' | 'movement' | 'ultimate';
export type CardRarity = 'common' | 'rare' | 'ultimate';

export interface EffectValues {
  damage?: number;
  damageType?: 'atk' | 'flat'; // 'atk' = scales with executor might, 'flat' = literal value
  powerMult?: number;           // damage = executor.power * powerMult (after defense reduction)
  healing?: number;
  atkBonus?: number;
  defBonus?: number;
  moveBonus?: number;
  teamDmgPct?: number;
  range?: number;
  turns?: number;
  targets?: number;
  allEnemiesInRange?: boolean;  // hits every enemy within range (Horde Tactics)
  lineTarget?: boolean;         // hits all enemies on a straight line (Rider's Fury)
  multiHit?: number;            // hit same target N times (Final Salvo)
  swapCount?: number;           // discard N cards, draw N new ones (Gamble)
}

export interface Card {
  id: string;           // unique instance id (filled on draw)
  definitionId: string; // links to CardDefinition
  name: string;
  manaCost: number;
  type: CardType;
  rarity: CardRarity;
  description: string;
  exclusiveTo: string | null; // characterId or null = shared
  // Inline effect values (resolved at card-play time)
  effect: EffectValues;
  // Optional terrain bonus key: e.g. 'mountain' → +20% damage
  terrainBonus?: Partial<Record<string, number>>;
}

export interface Hand {
  cards: Card[];
  maxSize: number; // default 10
}

export interface Deck {
  drawPile: Card[];
  discardPile: Card[];
}

export interface HexTile {
  coordinates: Coordinates;
  terrain: TerrainType;
  occupiedBy?: string; // Icon ID
  highlighted?: boolean;
  selectable?: boolean;
}

export interface GameState {
  currentTurn: number;
  activePlayerId: 0 | 1;
  cardLockActive: boolean; // true once first card played this turn
  phase: 'draft' | 'deploy' | 'combat' | 'victory' | 'defeat';
  players: Player[];
  board: HexTile[];
  selectedIcon?: string;
  respawnPlacement?: string; // Icon ID being placed for respawn
  globalMana: number[];
  turnTimer: number;
  speedQueue: string[]; // Icon IDs in speed order
  queueIndex: number;
  objectives: {
    manaCrystal: { controlled: boolean; player?: number };
    beastCamps: {
      hp: number[]; // HP for each beast camp [camp1, camp2]
      maxHp: number;
      defeated: boolean[];
    };
  };
  teamBuffs: {
    mightBonus: number[]; // % bonus for each player [player1, player2]
    powerBonus: number[]; // % bonus for each player
    homeBaseBonus: number[]; // % bonus for characters on home base
  };
  baseHealth: number[];
  matchTimer: number; // In seconds (600 = 10 minutes)
  gameMode: 'singleplayer' | 'multiplayer';
  targetingMode?: {
    abilityId: string;
    iconId: string;
    range: number;
  };
  winner?: number; // Player ID who won
  hand?: Hand;   // Active player's current hand
  deck?: Deck;   // Active player's draw/discard piles
  aiIntents?: AIIntent[]; // What each AI character plans to do this round (visible during player's turn)
}

export interface Player {
  id: number;
  name: string;
  icons: Icon[];
  color: string;
  isAI?: boolean;
}

// ── AI Intent System (Slay the Spire style) ──────────────────────────────────

export type AIIntentType = 'attack' | 'ability' | 'heal' | 'buff';

export interface AIIntent {
  iconId: string;       // which AI icon will act
  type: AIIntentType;
  abilityName: string;  // "Basic Attack", "Artillery Barrage", etc.
  label: string;        // displayed value: "48" (dmg) or "+45" (heal)
  range: number;        // used for range highlight on hover
  damage?: number;
  healing?: number;
}
