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
  };
  abilities: Ability[];
  passive: string;
  position: Coordinates;
  playerId: number;
  isAlive: boolean;
  respawnTurns: number;
  actionTaken: boolean; // Has this icon acted this turn?
  movedThisTurn: boolean; // Has this icon moved this turn?
  hasUltimate: boolean; // Can use ultimate this match
  ultimateUsed: boolean; // Has used ultimate this match
  movementHistory?: { position: Coordinates; cost: number }[]; // Move history for undo
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
  activeIconId?: string; // Current acting icon in speed queue
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
    beastStacks: number[]; // Number of beast camps defeated per player
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
}

export interface Player {
  id: number;
  name: string;
  icons: Icon[];
  color: string;
  isAI?: boolean;
}