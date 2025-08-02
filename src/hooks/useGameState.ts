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
      name: "Napoleon-chan",
      role: "dps_ranged" as const,
      stats: { hp: 80, maxHp: 80, moveRange: 3, speed: 6, might: 45, power: 60, defense: 35, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 2, currentCooldown: 0, range: 2, description: "Long-range bombardment. Deals 55 damage + terrain destruction.", damage: 55 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 4, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns and grants movement bonus." },
        { id: "ultimate", name: "Final Salvo", manaCost: 0, cooldown: 999, currentCooldown: 0, range: 3, description: "Deal 30 damage in a 3-tile line", damage: 30 }
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground"
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 90, maxHp: 90, moveRange: 5, speed: 8, might: 70, power: 40, defense: 40, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 1, currentCooldown: 0, range: 1, description: "Rush attack through multiple enemies. Deals 60 damage + bonus per enemy hit.", damage: 60 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 3, currentCooldown: 0, range: 1, description: "Teleport behind target and strike. 75 damage + fear effect (target can't move next turn).", damage: 75 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 0, cooldown: 999, currentCooldown: 0, range: 1, description: "Charge through up to 3 enemies in a line, dealing 25 damage each", damage: 25 }
      ],
      passive: "Conqueror's Fury: +15% damage for each enemy defeated this match"
    },
    {
      name: "Da Vinci-chan", 
      role: "support" as const,
      stats: { hp: 65, maxHp: 65, moveRange: 3, speed: 4, might: 30, power: 80, defense: 45, movement: 2 },
      abilities: [
        { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 2, currentCooldown: 0, range: 2, description: "Teleport to any visible hex + gain aerial view (see through terrain) for 2 turns." },
        { id: "2", name: "Masterpiece", manaCost: 7, cooldown: 5, currentCooldown: 0, range: 2, description: "Creates a defensive art barrier. Heals 45 HP + shields allies from next attack.", healing: 45 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 0, cooldown: 999, currentCooldown: 0, range: 3, description: "Summons a 2-turn drone that auto-attacks nearby enemies", damage: 20 }
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals"
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
          hasUltimate: true,
          ultimateUsed: false,
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

const useGameState = (gameMode: 'singleplayer' | 'multiplayer' = 'singleplayer') => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialIcons = createInitialIcons();
    const speedQueue = createSpeedQueue(initialIcons);
    
    return {
      currentTurn: 1,
      activeIconId: speedQueue[0],
      phase: 'combat',
      players: [
        { id: 0, name: "Player 1", icons: initialIcons.filter(i => i.playerId === 0), color: "blue", isAI: false },
        { id: 1, name: "Player 2", icons: initialIcons.filter(i => i.playerId === 1), color: "red", isAI: gameMode === 'singleplayer' }
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
      matchTimer: 600, // 10 minutes
      gameMode
    };
  });

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState(prev => {
      console.log('selectTile called with:', coordinates);
      console.log('activeIconId:', prev.activeIconId);
      console.log('selectedIcon:', prev.selectedIcon);
      
      // Find the active icon (whose turn it is)
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      console.log('activeIcon found:', activeIcon);

      // Check if there's any icon at the clicked position
      const iconAtPosition = prev.players
        .flatMap(p => p.icons)
        .find(i => 
          i.position.q === coordinates.q && 
          i.position.r === coordinates.r && 
          i.isAlive
        );

      console.log('iconAtPosition:', iconAtPosition);

      // If clicking on an icon that belongs to the active player, select it
      if (iconAtPosition && activeIcon && iconAtPosition.playerId === activeIcon.playerId) {
        console.log('Selecting icon:', iconAtPosition.id);
        return {
          ...prev,
          selectedIcon: iconAtPosition.id,
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

        console.log('selectedIcon found:', selectedIcon);

        if (selectedIcon && selectedIcon.id === prev.activeIconId) {
          // Check if the target tile is occupied
          const targetOccupied = prev.players
            .flatMap(p => p.icons)
            .some(i => 
              i.position.q === coordinates.q && 
              i.position.r === coordinates.r && 
              i.isAlive
            );

          if (targetOccupied) {
            console.log('Target tile occupied, cannot move');
            return prev;
          }

          // Simple movement validation (within range)
          const distance = Math.max(
            Math.abs(coordinates.q - selectedIcon.position.q),
            Math.abs(coordinates.r - selectedIcon.position.r),
            Math.abs((coordinates.q + coordinates.r) - (selectedIcon.position.q + selectedIcon.position.r))
          );

          console.log('Movement distance:', distance, 'moveRange:', selectedIcon.stats.moveRange);

          if (distance <= selectedIcon.stats.moveRange) {
            console.log('Moving icon to:', coordinates);
            // Move the icon
            return {
              ...prev,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === selectedIcon.id 
                    ? { ...icon, position: coordinates, movedThisTurn: true }
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
          } else {
            console.log('Move out of range');
          }
        } else {
          console.log('Selected icon is not active icon');
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