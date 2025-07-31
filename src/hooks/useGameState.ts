import { useState, useCallback } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";

const createInitialBoard = (): HexTile[] => {
  const board: HexTile[] = [];
  
  // Create hex map matching the image pattern
  // The image shows a roughly 15x11 hex grid
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

const getTerrainForPosition = (q: number, r: number): TerrainType => {
  // Center mana crystal (purple in image)
  if (q === 0 && r === 0) {
    return {
      type: 'mana_crystal',
      effects: { manaRegen: 2 }
    };
  }

  // Player 1 base (bottom left area)
  if (q === -6 && r === 5) {
    return {
      type: 'base',
      effects: {}
    };
  }

  // Player 2 base (top right area)  
  if (q === 6 && r === -5) {
    return {
      type: 'base',
      effects: {}
    };
  }

  // Spawn areas near bases
  if ((q >= -6 && q <= -4 && r >= 3 && r <= 5) || (q >= 4 && q <= 6 && r >= -5 && r <= -3)) {
    return {
      type: 'spawn',
      effects: {}
    };
  }

  // Beast camps (red hexes in image - symmetric positions)
  if ((q === -2 && r === 2) || (q === 2 && r === -2)) {
    return {
      type: 'beast_camp',
      effects: {}
    };
  }

  // Mountains (orange/brown hexes with mountain symbols)
  if (Math.abs(q) >= 5 || Math.abs(r) >= 5 || Math.abs(q + r) >= 5) {
    return {
      type: 'mountain',
      effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -1 }
    };
  }

  // Forests (green hexes with tree symbols) - create clusters
  const isForest = (
    // Left forest cluster
    (q >= -4 && q <= -2 && r >= 0 && r <= 2) ||
    // Right forest cluster  
    (q >= 2 && q <= 4 && r >= -2 && r <= 0) ||
    // Top forest cluster
    (q >= -1 && q <= 1 && r >= -3 && r <= -1) ||
    // Bottom forest cluster
    (q >= -1 && q <= 1 && r >= 1 && r <= 3)
  );
  
  if (isForest) {
    return {
      type: 'forest',
      effects: { dodgeBonus: true, stealthBonus: true }
    };
  }

  // Rivers (light blue hexes) - create flowing pattern
  if (Math.abs(q + r) === 2 || (q === 0 && Math.abs(r) <= 3) || (r === 0 && Math.abs(q) <= 3)) {
    return {
      type: 'river',
      effects: { movementModifier: -1 }
    };
  }

  // Default to plains (yellow/golden hexes)
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
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 3 },
      abilities: [
        { id: "1", name: "Shield Bash", manaCost: 3, cooldown: 2, currentCooldown: 0, range: 1, description: "Stun and damage", damage: 35 },
        { id: "2", name: "Taunt", manaCost: 4, cooldown: 3, currentCooldown: 0, range: 2, description: "Force enemies to attack you" }
      ],
      passive: "Damage reduction on high ground"
    },
    {
      name: "Shadowblade",
      role: "dps_melee" as const,
      stats: { hp: 70, maxHp: 70, moveRange: 4, speed: 8 },
      abilities: [
        { id: "1", name: "Stealth Strike", manaCost: 4, cooldown: 2, currentCooldown: 0, range: 1, description: "High damage from stealth", damage: 65 },
        { id: "2", name: "Shadow Step", manaCost: 3, cooldown: 3, currentCooldown: 0, range: 6, description: "Teleport to target" }
      ],
      passive: "Bonus damage in forest hexes"
    },
    {
      name: "Runeseer",
      role: "controller" as const,
      stats: { hp: 60, maxHp: 60, moveRange: 3, speed: 5 },
      abilities: [
        { id: "1", name: "Arcane Bolt", manaCost: 3, cooldown: 1, currentCooldown: 0, range: 4, description: "Ranged magic damage", damage: 50 },
        { id: "2", name: "Frost Nova", manaCost: 5, cooldown: 4, currentCooldown: 0, range: 2, description: "AoE freeze and damage", damage: 40 }
      ],
      passive: "Mana regen on spell cast"
    }
  ];

  const icons: Icon[] = [];
  
  // Create icons for both players
  for (let playerId = 0; playerId < 2; playerId++) {
    iconTemplates.forEach((template, index) => {
      icons.push({
        id: `${playerId}-${index}`,
        ...template,
        position: playerId === 0 ? { q: -5, r: 4 - index } : { q: 5, r: -4 + index },
        playerId,
        isAlive: true,
        respawnTurns: 0,
        actionTaken: false,
        movedThisTurn: false,
      });
    });
  }

  return icons;
};

// Helper function to create speed queue
const createSpeedQueue = (icons: Icon[]): string[] => {
  return icons
    .filter(icon => icon.isAlive)
    .sort((a, b) => b.stats.speed - a.stats.speed)
    .map(icon => icon.id);
};

const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialIcons = createInitialIcons();
    const speedQueue = createSpeedQueue(initialIcons);
    
    return {
      currentTurn: 1,
      activeIconId: speedQueue[0],
      phase: 'combat',
      players: [
        { id: 0, name: "Player 1", icons: initialIcons.filter(i => i.playerId === 0), color: "blue" },
        { id: 1, name: "Player 2", icons: initialIcons.filter(i => i.playerId === 1), color: "red" }
      ],
      board: createInitialBoard(),
      globalMana: [15, 15],
      turnTimer: 30,
      speedQueue,
      queueIndex: 0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamp: { defeated: false, buffApplied: false }
      },
      baseHealth: [10, 10],
      matchTimer: 600 // 10 minutes
    };
  });

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState(prev => {
      // Find the active icon (whose turn it is)
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      // Find if there's an icon at this position that belongs to the active player
      const icon = prev.players
        .flatMap(p => p.icons)
        .find(i => 
          i.position.q === coordinates.q && 
          i.position.r === coordinates.r && 
          i.isAlive &&
          activeIcon && i.playerId === activeIcon.playerId
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
    setGameState(prev => {
      const nextQueueIndex = (prev.queueIndex + 1) % prev.speedQueue.length;
      const newTurn = nextQueueIndex === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      
      // Reset action states for the icon whose turn just ended
      const updatedPlayers = prev.players.map(player => ({
        ...player,
        icons: player.icons.map(icon => 
          icon.id === prev.activeIconId 
            ? { ...icon, actionTaken: false, movedThisTurn: false }
            : icon
        )
      }));
      
      return {
        ...prev,
        players: updatedPlayers,
        queueIndex: nextQueueIndex,
        activeIconId: prev.speedQueue[nextQueueIndex],
        currentTurn: newTurn,
        selectedIcon: undefined,
        // Add mana regen every full round
        globalMana: nextQueueIndex === 0 
          ? prev.globalMana.map(mana => Math.min(mana + 3, 20))
          : prev.globalMana,
        board: prev.board.map(tile => ({
          ...tile,
          highlighted: false,
          selectable: false
        }))
      };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState(prev => {
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      if (!activeIcon || activeIcon.actionTaken) return prev;

      // Mark action as taken
      return {
        ...prev,
        players: prev.players.map(player => ({
          ...player,
          icons: player.icons.map(icon => 
            icon.id === activeIcon.id 
              ? { ...icon, actionTaken: true }
              : icon
          )
        }))
      };
    });
  }, []);

  return {
    gameState,
    selectTile,
    endTurn,
    basicAttack,
  };
};

export default useGameState;