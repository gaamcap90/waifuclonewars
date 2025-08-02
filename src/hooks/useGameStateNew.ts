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
        hasUltimate: true,
        ultimateUsed: false,
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
      turnTimer: 20,
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

  // Turn timer countdown
  const [currentTurnTimer, setCurrentTurnTimer] = useState(20);

  // Handle turn timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTurnTimer(prev => {
        if (prev <= 1) {
          endTurn();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.activeIconId]);

  // Reset timer when turn changes
  useEffect(() => {
    setCurrentTurnTimer(20);
  }, [gameState.activeIconId]);

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
    console.log('selectTile called with:', coordinates);
    setGameState(prev => {
      console.log('Current game state:', {
        activeIconId: prev.activeIconId,
        selectedIcon: prev.selectedIcon,
        targetingMode: prev.targetingMode
      });
      console.log('Current game state:', {
        activeIconId: prev.activeIconId,
        selectedIcon: prev.selectedIcon,
        targetingMode: prev.targetingMode
      });
      // Check if we're in targeting mode (ability or basic attack)
      if (prev.targetingMode) {
        const activeIcon = prev.players
          .flatMap(p => p.icons)
          .find(i => i.id === prev.targetingMode!.iconId);
          
        if (activeIcon) {
          const distance = calculateDistance(activeIcon.position, coordinates);
          if (distance <= prev.targetingMode.range) {
            // Execute ability or basic attack
            const targetIcon = prev.players
              .flatMap(p => p.icons)
              .find(icon => 
                icon.position.q === coordinates.q && 
                icon.position.r === coordinates.r && 
                icon.isAlive
              );

            let updatedPlayers = prev.players;
            let updatedBaseHealth = [...prev.baseHealth];

            if (prev.targetingMode.abilityId === 'basic_attack') {
              // Basic attack logic
              const damage = Math.max(1, Math.floor(activeIcon.stats.might * 1.5) - (targetIcon?.stats.defense || 0));
              
              if (targetIcon) {
                // Attack another character
                updatedPlayers = prev.players.map(player => ({
                  ...player,
                  icons: player.icons.map(icon => {
                    if (icon.id === targetIcon.id) {
                      const newHp = Math.max(0, icon.stats.hp - damage);
                      return { 
                        ...icon, 
                        stats: { ...icon.stats, hp: newHp },
                        isAlive: newHp > 0,
                        respawnTurns: newHp <= 0 ? 5 : icon.respawnTurns
                      };
                    }
                    return icon;
                  })
                }));
              } else {
                // Attack base
                const baseTile = prev.board.find(tile => 
                  tile.coordinates.q === coordinates.q && 
                  tile.coordinates.r === coordinates.r && 
                  tile.terrain.type === 'base'
                );
                if (baseTile) {
                  const enemyPlayerId = activeIcon.playerId === 0 ? 1 : 0;
                  updatedBaseHealth[enemyPlayerId] = Math.max(0, updatedBaseHealth[enemyPlayerId] - 1);
                }
              }
            } else {
              // Ability logic
              const ability = activeIcon.abilities.find(a => a.id === prev.targetingMode!.abilityId);
              if (ability && targetIcon) {
                const damage = ability.damage ? Math.max(1, Math.floor(ability.damage + activeIcon.stats.power * 0.5) - targetIcon.stats.defense) : 0;
                const healing = ability.healing || 0;
                
                updatedPlayers = prev.players.map(player => ({
                  ...player,
                  icons: player.icons.map(icon => {
                    if (icon.id === targetIcon.id && damage > 0) {
                      const newHp = Math.max(0, icon.stats.hp - damage);
                      return { 
                        ...icon, 
                        stats: { ...icon.stats, hp: newHp },
                        isAlive: newHp > 0,
                        respawnTurns: newHp <= 0 ? 5 : icon.respawnTurns
                      };
                    }
                    if (icon.id === activeIcon.id && healing > 0) {
                      return { ...icon, stats: { ...icon.stats, hp: Math.min(icon.stats.maxHp, icon.stats.hp + healing) } };
                    }
                    return icon;
                  })
                }));
                
                // Handle ultimate abilities - mark as used
                if (ability.id === 'ultimate') {
                  updatedPlayers = updatedPlayers.map(player => ({
                    ...player,
                    icons: player.icons.map(icon => 
                      icon.id === activeIcon.id 
                        ? { ...icon, ultimateUsed: true }
                        : icon
                    )
                  }));
                }
              }
            }

            const manaCost = prev.targetingMode.abilityId === 'basic_attack' ? 0 : 
              activeIcon.abilities.find(a => a.id === prev.targetingMode!.abilityId)?.manaCost || 0;

            return {
              ...prev,
              targetingMode: undefined,
              players: updatedPlayers.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === activeIcon.id 
                    ? { ...icon, actionTaken: true }
                    : icon
                )
              })),
              baseHealth: updatedBaseHealth,
              globalMana: prev.globalMana.map((mana, index) => 
                index === activeIcon.playerId 
                  ? Math.max(0, mana - manaCost)
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

      // If we're in targeting mode and click on empty space, cancel targeting
      if (prev.targetingMode && !clickedIcon) {
        console.log('Canceling targeting mode');
        return {
          ...prev,
          targetingMode: undefined
        };
      }

      // Try to move the active icon - check if allowed to move
      if (activeIcon && activeIcon.id === prev.activeIconId && !prev.targetingMode && !activeIcon.movedThisTurn) {
        console.log('Active icon details:', {
          id: activeIcon.id,
          name: activeIcon.name,
          movedThisTurn: activeIcon.movedThisTurn,
          actionTaken: activeIcon.actionTaken,
          position: activeIcon.position
        });
        console.log('Attempting movement for activeIcon:', activeIcon.id);
        const distance = calculateDistance(activeIcon.position, coordinates);
        console.log('Movement distance:', distance, 'moveRange:', activeIcon.stats.moveRange);
        
        if (distance <= activeIcon.stats.moveRange) {
          // Check if destination is not occupied
          const allIcons = prev.players.flatMap(p => p.icons).filter(icon => icon.isAlive);
          console.log('All alive icons positions:', allIcons.map(i => ({ id: i.id, name: i.name, pos: i.position })));
          console.log('Target coordinates:', coordinates);
          
          const occupied = allIcons.some(icon => 
            icon.position.q === coordinates.q && 
            icon.position.r === coordinates.r
          );
          
          console.log('Target occupied:', occupied);
          console.log('Icon checking occupied against:', allIcons.find(icon => 
            icon.position.q === coordinates.q && 
            icon.position.r === coordinates.r
          ));
          
          if (!occupied) {
            console.log('MOVING ICON TO:', coordinates);
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
      
      // Check ultimate usage
      if (abilityId === 'ultimate' && activeIcon.ultimateUsed) return prev;
      
      // Check mana cost (ultimates don't cost mana)
      if (abilityId !== 'ultimate' && prev.globalMana[activeIcon.playerId] < ability.manaCost) return prev;
      
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
      
      // Handle respawn countdown and reset movement/actions
      const updatedPlayers = prev.players.map(player => ({
        ...player,
        icons: player.icons.map(icon => {
          if (icon.id === prev.activeIconId) {
            // Reset movement and action for the current icon
            return { ...icon, actionTaken: false, movedThisTurn: false, stats: { ...icon.stats, movement: 2 } };
          }
          
          // Handle respawn countdown on every turn completion
          if (!icon.isAlive && icon.respawnTurns > 0) {
            return { ...icon, respawnTurns: icon.respawnTurns - 1 };
          }
          
          return icon;
        })
      }));

      // Update speed queue to only include alive characters
      const aliveIcons = updatedPlayers.flatMap(p => p.icons).filter(icon => icon.isAlive);
      const newSpeedQueue = aliveIcons
        .sort((a, b) => b.stats.speed - a.stats.speed)
        .map(icon => icon.id);
      
      // Find next valid icon in queue
      let actualNextIndex = nextQueueIndex;
      if (newSpeedQueue.length > 0) {
        while (actualNextIndex < newSpeedQueue.length && !aliveIcons.find(i => i.id === newSpeedQueue[actualNextIndex])) {
          actualNextIndex = (actualNextIndex + 1) % newSpeedQueue.length;
        }
        if (actualNextIndex >= newSpeedQueue.length) actualNextIndex = 0;
      }

      // Check for victory conditions
      const updatedBaseHealth = [...prev.baseHealth];
      const player1Alive = updatedPlayers[0].icons.some(icon => icon.isAlive) || updatedBaseHealth[0] > 0;
      const player2Alive = updatedPlayers[1].icons.some(icon => icon.isAlive) || updatedBaseHealth[1] > 0;
      
      let newPhase = prev.phase;
      let winner = prev.winner;
      
      if (updatedBaseHealth[0] <= 0) {
        newPhase = 'defeat';
        winner = 1;
      } else if (updatedBaseHealth[1] <= 0) {
        newPhase = 'victory';
        winner = 0;
      }
      
      return {
        ...prev,
        players: updatedPlayers,
        speedQueue: newSpeedQueue,
        queueIndex: actualNextIndex,
        activeIconId: newSpeedQueue[actualNextIndex],
        currentTurn: newTurn,
        selectedIcon: undefined,
        targetingMode: undefined,
        phase: newPhase,
        winner,
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

      // Get basic attack range based on character
      let range = 1; // Default melee range for Genghis
      if (activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan") {
        range = 2; // Ranged characters
      }

      // Enter targeting mode for basic attack
      return {
        ...prev,
        targetingMode: {
          abilityId: 'basic_attack',
          iconId: activeIcon.id,
          range: range
        }
      };
    });
  }, []);

  const respawnCharacter = useCallback((iconId: string, coordinates: Coordinates) => {
    setGameState(prev => {
      const icon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === iconId);
        
      if (!icon || icon.isAlive || icon.respawnTurns > 0) return prev;
      
      // Check if coordinates are valid spawn tile
      const tile = prev.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!tile || tile.terrain.type !== 'spawn') return prev;
      
      // Check if tile is occupied
      const occupied = prev.players
        .flatMap(p => p.icons)
        .some(i => i.position.q === coordinates.q && i.position.r === coordinates.r && i.isAlive);
        
      if (occupied) return prev;
      
      return {
        ...prev,
        players: prev.players.map(player => ({
          ...player,
          icons: player.icons.map(i => 
            i.id === iconId 
              ? { 
                  ...i, 
                  isAlive: true, 
                  position: coordinates, 
                  stats: { ...i.stats, hp: i.stats.maxHp, movement: 0 }, // No movement on respawn turn
                  respawnTurns: 0 
                }
              : i
          )
        }))
      };
    });
  }, []);

  const selectIcon = useCallback((iconId: string) => {
    setGameState(prev => ({
      ...prev,
      selectedIcon: iconId
    }));
  }, []);

  return {
    gameState,
    selectTile,
    useAbility,
    endTurn,
    basicAttack,
    respawnCharacter,
    currentTurnTimer,
    selectIcon,
  };
};

export default useGameState;