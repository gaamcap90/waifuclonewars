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
  };
  abilities: Ability[];
  passive: string;
  position: Coordinates;
  playerId: number;
  isAlive: boolean;
  respawnTurns: number;
  actionTaken: boolean; // Has this icon acted this turn?
  movedThisTurn: boolean; // Has this icon moved this turn?
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
  phase: 'draft' | 'deploy' | 'combat' | 'victory';
  players: Player[];
  board: HexTile[];
  selectedIcon?: string;
  globalMana: number[];
  turnTimer: number;
  speedQueue: string[]; // Icon IDs in speed order
  queueIndex: number;
  objectives: {
    manaCrystal: { controlled: boolean; player?: number };
    beastCamp: { defeated: boolean; buffApplied: boolean };
  };
  baseHealth: number[];
  matchTimer: number; // In seconds (600 = 10 minutes)
}

export interface Player {
  id: number;
  name: string;
  icons: Icon[];
  color: string;
}