import { useState, useCallback, useEffect } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";

const createInitialBoard = (): HexTile[] => {
  const board: HexTile[] = [];
  
  // Create hex map matching the image pattern
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

  // Mountains (orange/brown hexes with mountain symbols) - IMPASSABLE - reduced amount
  if (Math.abs(q) >= 6 || Math.abs(r) >= 6 || Math.abs(q + r) >= 6) {
    return {
      type: 'mountain',
      effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 } // Impassable
    };
  }

  // Rivers (light blue hexes) - IMPASSABLE - reduced amount
  if ((Math.abs(q + r) === 3 && Math.abs(q) <= 2) || (q === 0 && Math.abs(r) === 4)) {
    return {
      type: 'river',
      effects: { movementModifier: -999 } // Impassable
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
      role: "controller" as const,
      stats: { hp: 80, maxHp: 80, moveRange: 3, speed: 6, might: 45, power: 60, defense: 35 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 2, currentCooldown: 0, range: 5, description: "Long-range bombardment. Deals 55 damage + terrain destruction.", damage: 55 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 4, currentCooldown: 0, range: 3, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns and grants movement bonus." }
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground"
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 90, maxHp: 90, moveRange: 5, speed: 8, might: 70, power: 40, defense: 40 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 1, currentCooldown: 0, range: 3, description: "Rush attack through multiple enemies. Deals 60 damage + bonus per enemy hit.", damage: 60 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 3, currentCooldown: 0, range: 2, description: "Teleport behind target and strike. 75 damage + fear effect (target can't move next turn).", damage: 75 }
      ],
      passive: "Conqueror's Fury: +15% damage for each enemy defeated this match"
    },
    {
      name: "Da Vinci-chan", 
      role: "support" as const,
      stats: { hp: 65, maxHp: 65, moveRange: 3, speed: 4, might: 30, power: 80, defense: 45 },
      abilities: [
        { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 2, currentCooldown: 0, range: 6, description: "Teleport to any visible hex + gain aerial view (see through terrain) for 2 turns." },
        { id: "2", name: "Masterpiece", manaCost: 7, cooldown: 5, currentCooldown: 0, range: 4, description: "Creates a defensive art barrier. Heals 45 HP + shields allies from next attack.", healing: 45 }
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals"
    }
  ];

  const icons: Icon[] = [];
  
  // Create icons for both players - spawn them on plains, not mountains
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
      });
    });
  }

  return icons;
};

const createSpeedQueue = (icons: Icon[]): string[] => {
  return icons
    .filter(icon => icon.isAlive)
    .sort((a, b) => b.stats.speed - a.stats.speed)
    .map(icon => icon.id);
};

const calculateDistance = (from: Coordinates, to: Coordinates): number => {
  return Math.max(
    Math.abs(to.q - from.q),
    Math.abs(to.r - from.r),
    Math.abs((to.q + to.r) - (from.q + from.r))
  );
};

const isValidMovement = (from: Coordinates, to: Coordinates, moveRange: number, board: HexTile[]): boolean => {
  const distance = calculateDistance(from, to);
  if (distance > moveRange) return false;
  
  // Check if destination is passable
  const destinationTile = board.find(tile => tile.coordinates.q === to.q && tile.coordinates.r === to.r);
  if (!destinationTile) return false;
  
  // Check if terrain is impassable
  if (destinationTile.terrain.effects.movementModifier === -999) return false;
  
  return true;
};

// Simple AI that makes random valid moves
const makeAIMove = (gameState: GameState): Partial<GameState> => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  if (!activeIcon || !activeIcon.isAlive || activeIcon.playerId !== 1) {
    return {};
  }

  // Simple AI: Try to move towards enemy base or use basic attack
  const enemyBase = gameState.board.find(tile => 
    tile.terrain.type === 'base' && 
    tile.coordinates.q === -6 && tile.coordinates.r === 5
  );

  if (!enemyBase) return {};

  // Find valid movement positions
  const validMoves: Coordinates[] = [];
  for (let q = -7; q <= 7; q++) {
    for (let r = -7; r <= 7; r++) {
      const target = { q, r };
      if (isValidMovement(activeIcon.position, target, activeIcon.stats.moveRange, gameState.board)) {
        // Check if not occupied
        const occupied = gameState.players
          .flatMap(p => p.icons)
          .some(icon => icon.position.q === q && icon.position.r === r && icon.isAlive);
        if (!occupied) {
          validMoves.push(target);
        }
      }
    }
  }

  if (validMoves.length > 0) {
    // Pick the move that gets closest to enemy base
    const bestMove = validMoves.reduce((best, move) => {
      const currentDistance = calculateDistance(move, enemyBase.coordinates);
      const bestDistance = calculateDistance(best, enemyBase.coordinates);
      return currentDistance < bestDistance ? move : best;
    });

    return {
      players: gameState.players.map(player => ({
        ...player,
        icons: player.icons.map(icon => 
          icon.id === activeIcon.id 
            ? { ...icon, position: bestMove, movedThisTurn: true }
            : icon
        )
      }))
    };
  }

  return {};
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
      baseHealth: [5, 5],
      matchTimer: 600,
      gameMode
    };
  });

  // Handle AI turns
  useEffect(() => {
    if (gameState.gameMode === 'singleplayer') {
      const activeIcon = gameState.players
        .flatMap(p => p.icons)
        .find(i => i.id === gameState.activeIconId);
        
      if (activeIcon?.playerId === 1 && !activeIcon.actionTaken && !activeIcon.movedThisTurn) {
        const timer = setTimeout(() => {
          const aiMove = makeAIMove(gameState);
          if (Object.keys(aiMove).length > 0) {
            setGameState(prev => ({ ...prev, ...aiMove }));
            // End AI turn after move
            setTimeout(() => {
              endTurn();
            }, 1000);
          } else {
            endTurn();
          }
        }, 1000); // AI thinks for 1 second
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activeIconId, gameState.gameMode]);

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState(prev => {
      // Check if we're in targeting mode
      if (prev.targetingMode) {
        const activeIcon = prev.players
          .flatMap(p => p.icons)
          .find(i => i.id === prev.targetingMode!.iconId);
          
        if (activeIcon) {
          const distance = calculateDistance(activeIcon.position, coordinates);
          if (distance <= prev.targetingMode.range) {
            // Execute ability (simplified - just end targeting for now)
            return {
              ...prev,
              targetingMode: undefined,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === activeIcon.id 
                    ? { ...icon, actionTaken: true }
                    : icon
                )
              })),
              globalMana: prev.globalMana.map((mana, index) => 
                index === activeIcon.playerId 
                  ? Math.max(0, mana - activeIcon.abilities.find(a => a.id === prev.targetingMode!.abilityId)!.manaCost)
                  : mana
              )
            };
          }
        }
        return prev;
      }

      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      // Only allow interacting with the current active icon
      const clickedIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => 
          i.position.q === coordinates.q && 
          i.position.r === coordinates.r && 
          i.isAlive
        );

      // If clicking on the active icon, select it
      if (clickedIcon && clickedIcon.id === prev.activeIconId) {
        return {
          ...prev,
          selectedIcon: clickedIcon.id
        };
      }

      // Try to move the active icon (one-click movement)
      if (activeIcon && !activeIcon.movedThisTurn) {
        if (isValidMovement(activeIcon.position, coordinates, activeIcon.stats.moveRange, prev.board)) {
          // Check if destination is not occupied
          const occupied = prev.players
            .flatMap(p => p.icons)
            .some(icon => 
              icon.position.q === coordinates.q && 
              icon.position.r === coordinates.r && 
              icon.isAlive
            );
            
          if (!occupied) {
            return {
              ...prev,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === activeIcon.id 
                    ? { ...icon, position: coordinates, movedThisTurn: true }
                    : icon
                )
              })),
              selectedIcon: undefined
            };
          }
        }
      }

      return prev;
    });
  }, []);

  const useAbility = useCallback((abilityId: string) => {
    setGameState(prev => {
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);
        
      if (!activeIcon || activeIcon.actionTaken) return prev;
      
      const ability = activeIcon.abilities.find(a => a.id === abilityId);
      if (!ability || ability.currentCooldown > 0) return prev;
      
      if (prev.globalMana[activeIcon.playerId] < ability.manaCost) return prev;
      
      // Enter targeting mode
      return {
        ...prev,
        targetingMode: {
          abilityId,
          iconId: activeIcon.id,
          range: ability.range
        }
      };
    });
  }, []);

  const endTurn = useCallback(() => {
    setGameState(prev => {
      const nextQueueIndex = (prev.queueIndex + 1) % prev.speedQueue.length;
      const newTurn = nextQueueIndex === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      
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
        targetingMode: undefined,
        globalMana: nextQueueIndex === 0 
          ? prev.globalMana.map(mana => Math.min(mana + 1, 20)) // 1 mana per turn
          : prev.globalMana
      };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState(prev => {
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      if (!activeIcon || activeIcon.actionTaken) return prev;

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
    useAbility,
    endTurn,
    basicAttack,
  };
};

export default useGameState;