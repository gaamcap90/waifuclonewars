import { GameState } from "@/types/game";

const createInitialBoard = () => {
  const board = [];
  
  for (let q = -7; q <= 7; q++) {
    const r1 = Math.max(-7, -q - 7);
    const r2 = Math.min(7, -q + 7);
    
    for (let r = r1; r <= r2; r++) {
      const terrain = getTerrainForPosition(q, r);
      board.push({
        coordinates: { q, r },
        terrain,
        highlighted: false,
        selectable: false,
      });
    }
  }

  return board;
};

const getTerrainForPosition = (q: number, r: number) => {
  if (q === 0 && r === 0) {
    return {
      type: 'mana_crystal',
      effects: { manaRegen: 2 }
    };
  }

  if (q === -6 && r === 5) {
    return {
      type: 'base',
      effects: { movementModifier: -999 }
    };
  }

  if (q === 6 && r === -5) {
    return {
      type: 'base',
      effects: { movementModifier: -999 }
    };
  }

  if ((q >= -6 && q <= -4 && r >= 3 && r <= 5) || (q >= 4 && q <= 6 && r >= -5 && r <= -3)) {
    return {
      type: 'spawn',
      effects: {}
    };
  }

  if ((q === -2 && r === 2) || (q === 2 && r === -2)) {
    return {
      type: 'beast_camp',
      effects: {}
    };
  }

  if (Math.abs(q) >= 6 || Math.abs(r) >= 6 || Math.abs(q + r) >= 6) {
    return {
      type: 'mountain',
      effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 }
    };
  }

  if ((Math.abs(q + r) === 3 && Math.abs(q) <= 2) || (q === 0 && Math.abs(r) === 4)) {
    return {
      type: 'river',
      effects: { movementModifier: -999 }
    };
  }

  const isForest = (
    (q >= -4 && q <= -2 && r >= 0 && r <= 2) ||
    (q >= 2 && q <= 4 && r >= -2 && r <= 0) ||
    (q >= -1 && q <= 1 && r >= -3 && r <= -1) ||
    (q >= -1 && q <= 1 && r >= 1 && r <= 3)
  );
  
  if (isForest) {
    return {
      type: 'forest',
      effects: { dodgeBonus: true, stealthBonus: true }
    };
  }

  return {
    type: 'plain',
    effects: {}
  };
};

export const createFreshGameState = (gameMode: 'singleplayer' | 'multiplayer', selectedIcons?: any[]): GameState => {
  const initialIcons = selectedIcons || createDefaultIcons();
  const speedQueue = initialIcons
    .filter(icon => icon.isAlive)
    .sort((a, b) => b.stats.speed - a.stats.speed)
    .map(icon => icon.id);
    
  return {
    currentTurn: 1,
    activeIconId: speedQueue[0],
    phase: 'combat',
    players: [
      { id: 0, name: "Player 1", icons: initialIcons.filter(i => i.playerId === 0), color: "blue", isAI: false },
      { id: 1, name: gameMode === 'singleplayer' ? "Znyxorgan AI" : "Player 2", icons: initialIcons.filter(i => i.playerId === 1), color: "red", isAI: gameMode === 'singleplayer' }
    ],
    board: createInitialBoard(),
    globalMana: [15, 15],
    turnTimer: 20,
    speedQueue,
    queueIndex: 0,
    objectives: {
      manaCrystal: { controlled: false },
      beastCamps: { 
        hp: [75, 75],
        maxHp: 75,
        defeated: [false, false]
      }
    },
    teamBuffs: {
      mightBonus: [0, 0],
      powerBonus: [0, 0],
      homeBaseBonus: [0, 0]
    },
    baseHealth: [5, 5],
    matchTimer: 600,
    gameMode
  };
};

const createDefaultIcons = () => {
  const iconTemplates = [
    {
      name: "Napoleon-chan",
      role: "dps_ranged" as const,
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 70, power: 60, defense: 15, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 48 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 30 }
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground"
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack through enemies. Deals 48 damage.", damage: 48 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Teleport behind target. Deals 60 damage + fear effect.", damage: 60 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Charge through up to 3 enemies, dealing 24 damage each", damage: 24 }
      ],
      passive: "Conqueror's Fury: +15% damage for each enemy defeated this match"
    },
    {
      name: "Da Vinci-chan", 
      role: "support" as const,
      stats: { hp: 80, maxHp: 80, moveRange: 2, speed: 4, might: 35, power: 50, defense: 20, movement: 2 },
      abilities: [
        { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Teleport to any hex + gain aerial view for 2 turns.", damage: 0 },
        { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP + shields allies from next attack.", healing: 45 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 }
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals"
    }
  ];

  const icons = [];
  const player1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
  const player2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];
  
  for (let playerId = 0; playerId < 2; playerId++) {
    iconTemplates.forEach((template, index) => {
      const spawns = playerId === 0 ? player1Spawns : player2Spawns;
      icons.push({
        id: `${playerId}-${index}`,
        ...template,
        position: spawns[index],
        playerId,
        isAlive: true,
        respawnTurns: 0,
        actionTaken: false,
        movedThisTurn: false,
        hasUltimate: true,
        ultimateUsed: false,
      });
    });
  }

  return icons;
};
