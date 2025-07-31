import { useState, useCallback } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";

const createInitialBoard = (): HexTile[] => {
  const board: HexTile[] = [];
  const boardRadius = 7;

  for (let q = -boardRadius; q <= boardRadius; q++) {
    const r1 = Math.max(-boardRadius, -q - boardRadius);
    const r2 = Math.min(boardRadius, -q + boardRadius);
    
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

const getTerrainForPosition = (q: number, r: number): TerrainType => {
  // Center mana crystal
  if (q === 0 && r === 0) {
    return {
      type: 'mana_crystal',
      effects: { manaRegen: 2 }
    };
  }

  // Spawn areas (corners)
  if ((q === -6 && r === 6) || (q === 6 && r === -6)) {
    return {
      type: 'spawn',
      effects: {}
    };
  }

  // Beast camps
  if ((q === -3 && r === 3) || (q === 3 && r === -3)) {
    return {
      type: 'beast_camp',
      effects: {}
    };
  }

  // Mountains (red hexes in image)
  if (Math.abs(q) === 6 || Math.abs(r) === 6 || Math.abs(q + r) === 6) {
    return {
      type: 'mountain',
      effects: { rangeBonus: true, blocksLineOfSight: true }
    };
  }

  // Forests (green hexes with trees)
  if ((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 === 4) {
    return {
      type: 'forest',
      effects: { dodgeBonus: true, stealthBonus: true }
    };
  }

  // Rivers (blue hexes)
  if (q === 0 || r === 0 || q + r === 0) {
    return {
      type: 'river',
      effects: { movementModifier: -1 }
    };
  }

  // Default to plains
  return {
    type: 'plain',
    effects: {}
  };
};

const createInitialIcons = (): Icon[] => {
  const iconTemplates = [
    {
      name: "Vanguard",
      role: "tank" as const,
      stats: { hp: 100, maxHp: 100, moveRange: 2, initiative: 3 },
      abilities: [
        { id: "1", name: "Shield Bash", manaCost: 2, cooldown: 2, currentCooldown: 0, range: 1, description: "Stun and damage", damage: 30 },
        { id: "2", name: "Taunt", manaCost: 3, cooldown: 3, currentCooldown: 0, range: 2, description: "Force enemies to attack you" },
        { id: "3", name: "Shield Wall", manaCost: 4, cooldown: 4, currentCooldown: 0, range: 0, description: "Become immobile but immune" }
      ],
      passive: "Knockback resistance"
    },
    {
      name: "Shadowblade",
      role: "dps_melee" as const,
      stats: { hp: 70, maxHp: 70, moveRange: 4, initiative: 8 },
      abilities: [
        { id: "1", name: "Stealth Strike", manaCost: 3, cooldown: 2, currentCooldown: 0, range: 1, description: "High damage from stealth", damage: 60 },
        { id: "2", name: "Shadow Step", manaCost: 2, cooldown: 3, currentCooldown: 0, range: 6, description: "Teleport to target" },
        { id: "3", name: "Poison Blade", manaCost: 4, cooldown: 4, currentCooldown: 0, range: 1, description: "Damage over time", damage: 40 }
      ],
      passive: "Bonus damage in forest hexes"
    },
    {
      name: "Runeseer",
      role: "controller" as const,
      stats: { hp: 60, maxHp: 60, moveRange: 3, initiative: 5 },
      abilities: [
        { id: "1", name: "Arcane Bolt", manaCost: 2, cooldown: 1, currentCooldown: 0, range: 4, description: "Ranged magic damage", damage: 45 },
        { id: "2", name: "Terrain Shift", manaCost: 5, cooldown: 5, currentCooldown: 0, range: 3, description: "Change hex terrain type" },
        { id: "3", name: "Mass Slow", manaCost: 6, cooldown: 6, currentCooldown: 0, range: 2, description: "AoE movement reduction" }
      ],
      passive: "Bonus mana on spell cast"
    }
  ];

  const icons: Icon[] = [];
  
  // Create icons for both players
  for (let playerId = 0; playerId < 2; playerId++) {
    iconTemplates.forEach((template, index) => {
      icons.push({
        id: `${playerId}-${index}`,
        ...template,
        position: playerId === 0 ? { q: -5, r: 5 - index } : { q: 5, r: -5 + index },
        playerId,
        isAlive: true,
        respawnTurns: 0,
      });
    });
  }

  return icons;
};

const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialIcons = createInitialIcons();
    
    return {
      currentTurn: 1,
      currentPlayer: 0,
      phase: 'combat',
      players: [
        { id: 0, name: "Player 1", icons: initialIcons.filter(i => i.playerId === 0), color: "blue" },
        { id: 1, name: "Player 2", icons: initialIcons.filter(i => i.playerId === 1), color: "red" }
      ],
      board: createInitialBoard(),
      globalMana: [10, 10],
      turnTimer: 60,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamp: { defeated: false, buffApplied: false }
      },
      baseHealth: [10, 10]
    };
  });

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState(prev => {
      // Find if there's an icon at this position
      const icon = prev.players
        .flatMap(p => p.icons)
        .find(i => 
          i.position.q === coordinates.q && 
          i.position.r === coordinates.r && 
          i.isAlive &&
          i.playerId === prev.currentPlayer
        );

      if (icon) {
        // Select this icon
        return {
          ...prev,
          selectedIcon: icon.id,
          board: prev.board.map(tile => ({
            ...tile,
            highlighted: tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r,
            selectable: false
          }))
        };
      }

      // If we have a selected icon, try to move it
      if (prev.selectedIcon) {
        const selectedIcon = prev.players
          .flatMap(p => p.icons)
          .find(i => i.id === prev.selectedIcon);

        if (selectedIcon) {
          // Simple movement validation (within range)
          const distance = Math.max(
            Math.abs(coordinates.q - selectedIcon.position.q),
            Math.abs(coordinates.r - selectedIcon.position.r),
            Math.abs((coordinates.q + coordinates.r) - (selectedIcon.position.q + selectedIcon.position.r))
          );

          if (distance <= selectedIcon.stats.moveRange) {
            // Move the icon
            return {
              ...prev,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === selectedIcon.id 
                    ? { ...icon, position: coordinates }
                    : icon
                )
              })),
              selectedIcon: undefined,
              board: prev.board.map(tile => ({
                ...tile,
                highlighted: false,
                selectable: false
              }))
            };
          }
        }
      }

      return prev;
    });
  }, []);

  const endTurn = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 0 ? 1 : 0,
      currentTurn: prev.currentPlayer === 1 ? prev.currentTurn + 1 : prev.currentTurn,
      selectedIcon: undefined,
      globalMana: prev.globalMana.map(mana => Math.min(mana + 2, 20)),
      board: prev.board.map(tile => ({
        ...tile,
        highlighted: false,
        selectable: false
      }))
    }));
  }, []);

  return {
    gameState,
    selectTile,
    endTurn,
  };
};

export default useGameState;