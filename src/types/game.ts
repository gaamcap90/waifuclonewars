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
  droneExpiresTurn?: number;    // Round number when this drone is removed (Vitruvian Guardian)
  debuffs?: Debuff[];           // Active debuffs on this icon
  passiveStacks?: number;       // Genghis Bloodlust kill stacks (0–3)
  abilityUsedThisTurn?: boolean; // Da Vinci Tinkerer: tracks if an exclusive ability card was played
  cardsUsedThisTurn?: number;   // Cards played this turn (max 3)
  enemyAbilityCooldowns?: Record<string, number>; // cooldown tracker for enemy boss abilities
  enemyAbilities?: import('@/types/roguelike').EnemyAbilityDef[]; // boss/elite ability definitions
  regens?: { amount: number; turnsRemaining: number }[]; // active regen buffs (Naval Repairs)
  itemPassiveTags?: string[];  // passive tags from all equipped items (populated at fight start)
  voidArmorUsed?: boolean;     // once_survive_lethal: used already this fight
  nextCardFree?: boolean;      // legacy free-card flag
  freeCardsLeft?: number;      // next_2_cards_free_on_kill: remaining free cards
  firstAbilityUsed?: boolean;  // first_ability_free: first ability card has been used this fight
  firstHitNegated?: boolean;   // negate_first_hit (Diamond Shell): first hit this fight already negated
  terracottaControlled?: boolean;  // Huang-chan Eternal Army: this enemy is currently controlled
  controlledByPlayer?: number;     // which player controls it (0 = player)
  controlExpiresTurn?: number;     // turn on which control expires
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

export type CardType = 'attack' | 'defense' | 'buff' | 'movement' | 'ultimate' | 'debuff';
export type CardRarity = 'common' | 'rare' | 'ultimate';

export type DebuffType = 'mud_throw' | 'demoralize' | 'armor_break' | 'silence' | 'poison' | 'stun' | 'bleed';

export interface Debuff {
  type: DebuffType;
  magnitude: number;   // amount of the debuff (stat reduction, move reduction, etc.)
  turnsRemaining: number;
}

export interface EffectValues {
  damage?: number;
  damageType?: 'atk' | 'flat'; // 'atk' = scales with executor might, 'flat' = literal value
  powerMult?: number;           // damage = executor.power * powerMult (after defense reduction)
  healing?: number;
  healingMult?: number;  // healing = caster.power * healingMult (scales with Power stat)
  atkBonus?: number;
  defBonus?: number;
  moveBonus?: number;
  teamDmgPct?: number;
  teamDefBuff?: number;          // immediate +DEF to caster + allies within range (Spartan Wall)
  range?: number;
  turns?: number;
  targets?: number;
  allEnemiesInRange?: boolean;  // hits every enemy within range (Horde Tactics)
  lineTarget?: boolean;         // hits all enemies on a straight line (Rider's Fury)
  multiHit?: number;            // number of hits (used with randomTargets)
  swapCount?: number;           // discard N cards, draw N new ones (Gamble)
  selfCast?: boolean;           // immediately applies effect on executor (Mend)
  randomTargets?: boolean;      // each hit targets a random enemy in range (Final Salvo)
  teleport?: boolean;           // enter hex-targeting mode to teleport executor (Flying Machine card)
  debuffType?: DebuffType;      // debuff card — applies a Debuff to the target
  debuffMagnitude?: number;     // magnitude of the applied debuff
  debuffDuration?: number;      // turns the debuff lasts
  pushback?: number;            // push target N hexes away from attacker (1 = 1 hex)
  healZone?: boolean;           // target a tile; heal allies within range each turn
  healPerTurn?: number;         // HP healed per tick (Naval Repairs)
  healDuration?: number;        // how many ticks (turns) the regen lasts
  lineCharge?: boolean;         // charge in a line, deal damage + push enemies sideways (Chongtong land)
  chargeDist?: number;          // max hexes to charge
  pushSide?: boolean;           // push hit enemies perpendicular to charge direction
  moveZone?: boolean;           // place a movement buff zone centered on caster, radius = range
  zoneDuration?: number;        // turns the zone lasts
  summonTerracotta?: boolean;   // Huang-chan Ability 1: summon a random terracotta warrior on target hex
  summonCavalry?: boolean;      // Huang-chan Ability 2: summon a terracotta cavalry + inject free charge card
  controlEnemy?: boolean;       // Huang-chan Ultimate: turn an enemy into a temporary ally
  controlDuration?: number;     // how many turns the control lasts
  bleedMult?: number;           // Genghis Mongol Charge: apply bleed = power * bleedMult per turn for 2 turns
  scalingAoE?: boolean;         // Genghis Horde Tactics: damage per enemy = power * perEnemyMult × enemy count
  perEnemyMult?: number;        // multiplier per enemy in range for scalingAoE
  executeDouble?: boolean;      // Genghis Rider's Fury: double damage if target < 50% HP
  summonHpBonus?: number;       // extra HP added to summoned terracotta units (Terracotta Legion upgrade)
  cavalryMightBonus?: number;   // extra Might added to summoned cavalry (First Emperor's Command upgrade)
  aoeDemoralize?: boolean;      // after hitting primary target, apply demoralize to all adjacent enemies (THIS IS SPARTA!)
}

export interface Zone {
  center: Coordinates;
  radius: number;
  effect: 'moveBonus';
  magnitude: number;   // e.g. +2 movement
  ownerId: number;     // player who placed the zone
  turnsRemaining: number;
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
  globalMaxMana: number[];      // Max mana this turn (5 base + crystal bonus)
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
    cardRefund?: { card: Card; manaRefund: number };
  };
  winner?: number; // Player ID who won
  hand?: Hand;   // Active player's current hand
  deck?: Deck;   // Active player's draw/discard piles
  aiIntents?: AIIntent[]; // What each AI character plans to do this round (visible during player's turn)
  arenaEvent?: ArenaEventDef | null; // Event that triggered at the start of this round
  laserGridStruckIds?: string[];    // Unit IDs struck by Laser Grid this round (shown for 1 round)
  floodActive?: boolean;            // Alien Tide: once triggered, river expands each turn
  forestFireActive?: boolean;       // Forest Fire: once triggered, fire spreads each turn
  burningForestTiles?: string[];    // Tile keys "q,r" of burning forest tiles
  pendingLaserTiles?: string[];     // Tile keys targeted by Laser Grid (1-turn warning before damage)
  pendingFloodCountdown?: number;   // Turns until Alien Tide activates (2 = 2 turns notice)
  pendingFireCountdown?: number;    // Turns until Forest Fire activates (2 = 2 turns notice)
  pendingFireStartTile?: string;    // "q,r" key of tile that will catch fire (shown as warning on board)
  activeZones?: Zone[];             // Beethoven Freudenspur movement buff zones
}

export interface ArenaEventDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Player {
  id: number;
  name: string;
  icons: Icon[];
  color: string;
  isAI?: boolean;
}

// ── AI Intent System (Slay the Spire style) ──────────────────────────────────

export type AIIntentType = 'attack' | 'ability' | 'heal' | 'buff' | 'upcoming_ability';

export interface AIIntent {
  iconId: string;       // which AI icon will act
  type: AIIntentType;
  abilityName: string;  // "Basic Attack", "Artillery Barrage", etc.
  label: string;        // displayed value: "48" (dmg) or "+45" (heal)
  range: number;        // used for range highlight on hover
  damage?: number;
  healing?: number;
  turnsUntilReady?: number; // for upcoming_ability: countdown turns until ability fires
}
