import { useState, useCallback, useEffect } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";
import { toast } from "sonner";

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
      effects: { movementModifier: -999 } // Impassable
    };
  }

  // Player 2 base (top right area)  
  if (q === 6 && r === -5) {
    return {
      type: 'base',
      effects: { movementModifier: -999 } // Impassable
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
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 70, power: 60, defense: 15, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals Power × 0.8 damage.", damage: 0 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal Power × 0.5 damage in a 3-tile line", damage: 0 }
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground"
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack through enemies. Deals Power × 1.2 damage.", damage: 0 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Teleport behind target. Deals Power × 1.5 damage + fear effect.", damage: 0 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Charge through up to 3 enemies, dealing Power × 0.6 damage each", damage: 0 }
      ],
      passive: "Conqueror's Fury: +15% damage for each enemy defeated this match"
    },
    {
      name: "Da Vinci-chan", 
      role: "support" as const,
      stats: { hp: 80, maxHp: 80, moveRange: 2, speed: 4, might: 35, power: 50, defense: 20, movement: 2 },
      abilities: [
        { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Teleport to any hex + gain aerial view for 2 turns.", damage: 0 },
        { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals Power × 0.9 HP + shields allies from next attack.", healing: 0 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 }
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
  
  // Prevent moving onto beast camps (they are impassable)
  if (destinationTile.terrain.type === 'beast_camp') return false;
  
  return true;
};

// Enhanced AI that can attack, use abilities, and target base
const makeAIMove = (gameState: GameState): Partial<GameState> => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  if (!activeIcon || !activeIcon.isAlive || activeIcon.playerId !== 1) {
    return {};
  }

  // Priority 1: Attack enemy characters if in range
  const enemyIcons = gameState.players[0].icons.filter(icon => icon.isAlive);
  for (const enemy of enemyIcons) {
    const distance = calculateDistance(activeIcon.position, enemy.position);
    const attackRange = activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan" ? 2 : 1;
    
    if (distance <= attackRange) {
      return {
        targetingMode: {
          abilityId: 'basic_attack',
          iconId: activeIcon.id,
          range: attackRange
        }
      };
    }
  }

  // Priority 2: Use abilities if available and mana permits
  const usableAbility = activeIcon.abilities.find(ability => 
    ability.currentCooldown === 0 && 
    gameState.globalMana[1] >= ability.manaCost &&
    ability.id !== 'ultimate'
  );
  
  if (usableAbility) {
    // Find target for ability
    for (const enemy of enemyIcons) {
      const distance = calculateDistance(activeIcon.position, enemy.position);
      if (distance <= usableAbility.range) {
        return {
          targetingMode: {
            abilityId: usableAbility.id,
            iconId: activeIcon.id,
            range: usableAbility.range
          }
        };
      }
    }
  }

  // Priority 3: Attack enemy base if in range
  const enemyBase = gameState.board.find(tile => 
    tile.terrain.type === 'base' && 
    tile.coordinates.q === -6 && tile.coordinates.r === 5
  );
  
  if (enemyBase) {
    const distanceToBase = calculateDistance(activeIcon.position, enemyBase.coordinates);
    const attackRange = activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan" ? 2 : 1;
    
    if (distanceToBase <= attackRange) {
      return {
        targetingMode: {
          abilityId: 'basic_attack',
          iconId: activeIcon.id,
          range: attackRange
        }
      };
    }
  }

  // Priority 4: Move towards enemies or base
  const validMoves: Coordinates[] = [];
  for (let q = -7; q <= 7; q++) {
    for (let r = -7; r <= 7; r++) {
      const target = { q, r };
      if (isValidMovement(activeIcon.position, target, activeIcon.stats.moveRange, gameState.board)) {
        const occupied = gameState.players
          .flatMap(p => p.icons)
          .some(icon => icon.position.q === q && icon.position.r === r && icon.isAlive);
        if (!occupied) {
          validMoves.push(target);
        }
      }
    }
  }

  if (validMoves.length > 0 && enemyBase) {
    // Move towards closest enemy or base
    let bestTarget = enemyBase.coordinates;
    let minDistance = calculateDistance(activeIcon.position, bestTarget);
    
    for (const enemy of enemyIcons) {
      const dist = calculateDistance(activeIcon.position, enemy.position);
      if (dist < minDistance) {
        minDistance = dist;
        bestTarget = enemy.position;
      }
    }
    
    const bestMove = validMoves.reduce((best, move) => {
      const currentDistance = calculateDistance(move, bestTarget);
      const bestDistance = calculateDistance(best, bestTarget);
      return currentDistance < bestDistance ? move : best;
    });

    return {
      players: gameState.players.map(player => ({
        ...player,
        icons: player.icons.map(icon => 
          icon.id === activeIcon.id 
            ? { 
                ...icon, 
                position: bestMove, 
                movedThisTurn: true,
                stats: { ...icon.stats, movement: Math.max(0, icon.stats.movement - calculateDistance(activeIcon.position, bestMove)) }
              }
            : icon
        )
      }))
    };
  }

return {
  endTurn();
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
          hp: [75, 75], // Two beast camps with 75 HP each
          maxHp: 75,
          defeated: [false, false]
        }
      },
      teamBuffs: {
        mightBonus: [0, 0], // No buffs initially
        powerBonus: [0, 0]
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

  // Handle AI turns - only in single player mode
  useEffect(() => {
    if (gameState.gameMode === 'singleplayer' && gameState.phase === 'combat') {
      const activeIcon = gameState.players
        .flatMap(p => p.icons)
        .find(i => i.id === gameState.activeIconId);
        
      console.log('AI Turn check:', {
        activeIconId: gameState.activeIconId,
        activeIcon: activeIcon ? {
          id: activeIcon.id,
          name: activeIcon.name,
          playerId: activeIcon.playerId,
          isAlive: activeIcon.isAlive,
          actionTaken: activeIcon.actionTaken,
          movedThisTurn: activeIcon.movedThisTurn
        } : null,
        targetingMode: gameState.targetingMode
      });
        
      if (activeIcon?.playerId === 1 && activeIcon.isAlive) {
        const timer = setTimeout(() => {
          console.log('AI Timer triggered');
          
          // Check if AI is in targeting mode - execute the attack/ability
          if (gameState.targetingMode && gameState.targetingMode.iconId === activeIcon.id) {
            console.log('AI in targeting mode, looking for targets');
            
            // Find best target
            const enemyIcons = gameState.players[0].icons.filter(icon => icon.isAlive);
            const enemyBase = gameState.board.find(tile => 
              tile.terrain.type === 'base' && 
              tile.coordinates.q === -6 && tile.coordinates.r === 5
            );
            
            let target = null;
            
            // Priority: Attack characters first, then base
            for (const enemy of enemyIcons) {
              const distance = calculateDistance(activeIcon.position, enemy.position);
              if (distance <= gameState.targetingMode.range) {
                target = enemy.position;
                console.log('AI targeting enemy:', enemy.name, 'at', target);
                break;
              }
            }
            
            if (!target && enemyBase) {
              const distanceToBase = calculateDistance(activeIcon.position, enemyBase.coordinates);
              if (distanceToBase <= gameState.targetingMode.range) {
                target = enemyBase.coordinates;
                console.log('AI targeting base at', target);
              }
            }
            
            if (target) {
              console.log('AI executing attack on', target);
              selectTile(target);
              return; // The selectTile will handle ending the turn
            }
          }
          
          // Try to move first if not moved
          if (!activeIcon.movedThisTurn && activeIcon.stats.movement > 0) {
            console.log('AI trying to move');
            const aiMove = makeAIMove(gameState);
            console.log('AI move result:', aiMove);
            
            if (Object.keys(aiMove).length > 0) {
              setGameState(prev => ({ ...prev, ...aiMove }));
              
              // Wait then try to attack
              setTimeout(() => {
                if (!activeIcon.actionTaken) {
                  console.log('AI trying basic attack after move');
                  basicAttack();
                  
                  setTimeout(() => {
                    console.log('AI ending turn after attack');
                    endTurn();
                  }, 1000);
                } else {
                  endTurn();
                }
              }, 1000);
              return;
            }
          }
          
          // If can't or won't move, try attack
          if (!activeIcon.actionTaken) {
            console.log('AI trying basic attack');
            basicAttack();
            
            setTimeout(() => {
              console.log('AI ending turn after attack only');
              endTurn();
            }, 1000);
            return;
          }
          
          // End AI turn if nothing to do
          console.log('AI ending turn - nothing to do');
          endTurn();
        }, 1500); // AI thinks for 1.5 seconds
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activeIconId, gameState.gameMode, gameState.targetingMode, gameState.phase]);

  const selectTile = useCallback((coordinates: Coordinates) => {
    console.log('selectTile called with:', coordinates);
    setGameState(prev => {
      console.log('Current game state:', {
        activeIconId: prev.activeIconId,
        selectedIcon: prev.selectedIcon,
        targetingMode: prev.targetingMode,
        respawnPlacement: prev.respawnPlacement
      });

      const currentActiveIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      // Prevent player from controlling AI units
      if (currentActiveIcon?.playerId === 1 && prev.gameMode === 'singleplayer') {
        return prev;
      }

      // Handle respawn placement
      if (prev.respawnPlacement) {
        const respawningIcon = prev.players
          .flatMap(p => p.icons)
          .find(i => i.id === prev.respawnPlacement);
          
        if (respawningIcon) {
          // Check if coordinates are in the correct spawn zone
          const isValidSpawn = respawningIcon.playerId === 0 
            ? (coordinates.q >= -6 && coordinates.q <= -4 && coordinates.r >= 3 && coordinates.r <= 5)
            : (coordinates.q >= 4 && coordinates.q <= 6 && coordinates.r >= -5 && coordinates.r <= -3);
            
          // Check if tile is not occupied
          const occupied = prev.players
            .flatMap(p => p.icons)
            .some(icon => icon.position.q === coordinates.q && icon.position.r === coordinates.r && icon.isAlive);
            
          if (isValidSpawn && !occupied) {
            // Respawn the character
            const updatedPlayers = prev.players.map(player => ({
              ...player,
              icons: player.icons.map(icon => 
                icon.id === prev.respawnPlacement 
                  ? { 
                      ...icon, 
                      position: coordinates,
                      isAlive: true,
                      stats: { ...icon.stats, hp: icon.stats.maxHp, movement: icon.stats.moveRange },
                      respawnTurns: 0
                    }
                  : icon
              )
            }));
            
            // Add back to speed queue
            const aliveIcons = updatedPlayers.flatMap(p => p.icons).filter(icon => icon.isAlive);
            const newSpeedQueue = aliveIcons
              .sort((a, b) => b.stats.speed - a.stats.speed)
              .map(icon => icon.id);
            
            return {
              ...prev,
              players: updatedPlayers,
              speedQueue: newSpeedQueue,
              respawnPlacement: undefined
            };
          } else {
            toast.error("Invalid spawn location!");
            return prev;
          }
        }
      }
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
              // NEW FORMULA: Basic Attack Damage = Might - Target Defense
              const baseDamage = activeIcon.stats.might;
              const targetDefense = targetIcon?.stats.defense || 0;
              const damage = Math.max(1, baseDamage - targetDefense);
              
              if (targetIcon) {
                // Check if trying to attack own team
                if (targetIcon.playerId === activeIcon.playerId) {
                  toast.error("Cannot attack your own character!");
                  return prev;
                }
                
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
                // Check if attacking empty terrain or own base
                const baseTile = prev.board.find(tile => 
                  tile.coordinates.q === coordinates.q && 
                  tile.coordinates.r === coordinates.r && 
                  tile.terrain.type === 'base'
                );
                
                if (baseTile) {
                  // Determine which base this is based on coordinates
                  const isPlayer1Base = coordinates.q === -6 && coordinates.r === 5;
                  const isPlayer2Base = coordinates.q === 6 && coordinates.r === -5;
                  
                  // Check if trying to attack own base
                  if ((activeIcon.playerId === 0 && isPlayer1Base) || (activeIcon.playerId === 1 && isPlayer2Base)) {
                    toast.error("Cannot attack your own base!");
                    return prev;
                  }
                  
                  // Only allow attacking enemy base
                   if ((activeIcon.playerId === 0 && isPlayer2Base) || (activeIcon.playerId === 1 && isPlayer1Base)) {
                     const enemyPlayerId = activeIcon.playerId === 0 ? 1 : 0;
                     updatedBaseHealth[enemyPlayerId] = Math.max(0, updatedBaseHealth[enemyPlayerId] - 1);
                   }
                 } else {
                   // Check if attacking beast camp
                   const beastCampTile = prev.board.find(tile => 
                     tile.coordinates.q === coordinates.q && 
                     tile.coordinates.r === coordinates.r && 
                     tile.terrain.type === 'beast_camp'
                   );
                   
                   if (beastCampTile) {
                     // Determine which beast camp (0 for left, 1 for right)
                     const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : 1;
                     
                     if (!prev.objectives.beastCamps.defeated[campIndex]) {
                       // Attack beast camp
                       const newHp = Math.max(0, prev.objectives.beastCamps.hp[campIndex] - damage);
                       const newHpArray = [...prev.objectives.beastCamps.hp];
                       const newDefeatedArray = [...prev.objectives.beastCamps.defeated];
                       
                       newHpArray[campIndex] = newHp;
                       
                       // Check if camp is defeated
                       if (newHp <= 0 && !newDefeatedArray[campIndex]) {
                         newDefeatedArray[campIndex] = true;
                         
                         // Apply 15% might and power buff to player's team
                         const newMightBonus = [...prev.teamBuffs.mightBonus];
                         const newPowerBonus = [...prev.teamBuffs.powerBonus];
                         newMightBonus[activeIcon.playerId] = 15;
                         newPowerBonus[activeIcon.playerId] = 15;
                         
                         toast.success(`Beast Camp defeated! Team gains +15% might and power!`);
                         
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
                           objectives: {
                             ...prev.objectives,
                             beastCamps: {
                               ...prev.objectives.beastCamps,
                               hp: newHpArray,
                               defeated: newDefeatedArray
                             }
                           },
                           teamBuffs: {
                             mightBonus: newMightBonus,
                             powerBonus: newPowerBonus
                           }
                         };
                       } else {
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
                           objectives: {
                             ...prev.objectives,
                             beastCamps: {
                               ...prev.objectives.beastCamps,
                               hp: newHpArray
                             }
                           }
                         };
                       }
                     }
                   } else {
                     // Attacking empty terrain
                     toast.error("No target to attack!");
                     return prev;
                   }
                 }
              }
            } else {
              // Ability logic with NEW FORMULA: Ability Damage = (Power × multiplier) - Target Defense
              const ability = activeIcon.abilities.find(a => a.id === prev.targetingMode!.abilityId);
              if (ability) {
                // Calculate damage based on ability description multipliers
                let damage = 0;
                let healing = 0;
                
                if (ability.description.includes("Power × 0.8")) {
                  damage = Math.max(1, Math.floor(activeIcon.stats.power * 0.8) - (targetIcon?.stats.defense || 0));
                } else if (ability.description.includes("Power × 1.2")) {
                  damage = Math.max(1, Math.floor(activeIcon.stats.power * 1.2) - (targetIcon?.stats.defense || 0));
                } else if (ability.description.includes("Power × 1.5")) {
                  damage = Math.max(1, Math.floor(activeIcon.stats.power * 1.5) - (targetIcon?.stats.defense || 0));
                } else if (ability.description.includes("Power × 0.5")) {
                  damage = Math.max(1, Math.floor(activeIcon.stats.power * 0.5) - (targetIcon?.stats.defense || 0));
                } else if (ability.description.includes("Power × 0.6")) {
                  damage = Math.max(1, Math.floor(activeIcon.stats.power * 0.6) - (targetIcon?.stats.defense || 0));
                } else if (ability.description.includes("Power × 0.9")) {
                  healing = Math.floor(activeIcon.stats.power * 0.9);
                }
                
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

      const movementActiveIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      // Only allow interacting with the current active icon
      const clickedIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => 
          i && i.position && 
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

      // Prevent controlling AI units in singleplayer mode
      if (prev.gameMode === 'singleplayer' && clickedIcon && clickedIcon.playerId === 1) {
        return prev;
      }

      // Try to move the active icon - check if allowed to move
      if (movementActiveIcon && movementActiveIcon.id === prev.activeIconId && !prev.targetingMode && movementActiveIcon.stats.movement > 0) {
        console.log('Active icon details:', {
          id: movementActiveIcon.id,
          name: movementActiveIcon.name,
          movedThisTurn: movementActiveIcon.movedThisTurn,
          actionTaken: movementActiveIcon.actionTaken,
          position: movementActiveIcon.position,
          movement: movementActiveIcon.stats.movement
        });
        console.log('Attempting movement for activeIcon:', movementActiveIcon.id);
        const distance = calculateDistance(movementActiveIcon.position, coordinates);
        console.log('Movement distance:', distance, 'remaining movement:', movementActiveIcon.stats.movement);
        
        if (distance <= movementActiveIcon.stats.movement && distance <= movementActiveIcon.stats.moveRange) {
          // Check if destination is passable
          const destinationTile = prev.board.find(tile => 
            tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
          );
          
          if (!destinationTile || destinationTile.terrain.effects.movementModifier === -999) {
            console.log('Destination is impassable:', destinationTile?.terrain.type);
            return prev;
          }
          
          // Check if destination is not occupied
          const allIcons = prev.players.flatMap(p => p.icons).filter(icon => icon.isAlive);
          console.log('All alive icons positions:', allIcons.map(i => ({ id: i.id, name: i.name, pos: i.position })));
          console.log('Target coordinates:', coordinates);
          
          const occupied = allIcons.some(icon => 
            icon.position.q === coordinates.q && 
            icon.position.r === coordinates.r
          );
          
          console.log('Target occupied:', occupied);
          
          if (!occupied) {
            console.log('MOVING ICON TO:', coordinates);
            return {
              ...prev,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === movementActiveIcon.id 
                    ? { 
                        ...icon, 
                        position: coordinates, 
                        movedThisTurn: true,
                        stats: { ...icon.stats, movement: Math.max(0, icon.stats.movement - distance) }
                      }
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
      
      // Check mana cost - new system: no cooldowns, only mana
      if (prev.globalMana[activeIcon.playerId] < ability.manaCost) {
        toast.error("Not enough mana!");
        return prev;
      }
      
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
    setCurrentTurnTimer(20); // Reset timer immediately
    setGameState(prev => {
      // Prevent controlling AI units in singleplayer
      const currentActiveIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);
      
      if (currentActiveIcon?.playerId === 1 && prev.gameMode === 'singleplayer') {
        return prev;
      }
      
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
      
      // Check if any player has no alive characters
      const player1AliveCharacters = updatedPlayers[0].icons.some(icon => icon.isAlive);
      const player2AliveCharacters = updatedPlayers[1].icons.some(icon => icon.isAlive);
      
      let newPhase = prev.phase;
      let winner = prev.winner;
      
      // Auto-win if all enemy characters are dead
      if (!player1AliveCharacters && player2AliveCharacters) {
        newPhase = 'defeat';
        winner = 1;
      } else if (!player2AliveCharacters && player1AliveCharacters) {
        newPhase = 'victory';
        winner = 0;
      } else if (updatedBaseHealth[0] <= 0) {
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
          ? prev.globalMana.map((mana, playerIndex) => {
              // Base mana gain
              let manaGain = 1;
              
              // Check if any player character is on mana crystal
              const playerIcons = updatedPlayers[playerIndex].icons.filter(icon => icon.isAlive);
              const hasCharacterOnCrystal = playerIcons.some(icon => 
                icon.position.q === 0 && icon.position.r === 0
              );
              
              if (hasCharacterOnCrystal) {
                manaGain += 2; // +2 bonus from mana crystal
              }
              
              return Math.min(mana + manaGain, 20);
            })
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

  const undoMovement = useCallback(() => {
    setGameState(prev => {
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);

      if (!activeIcon || !activeIcon.movedThisTurn || activeIcon.actionTaken) {
        return prev;
      }

      // Store the previous position in a more robust way
      // For now, we'll implement a single-step undo
      const player1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
      const player2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];
      const iconIndex = parseInt(activeIcon.id.split('-')[1]);
      const spawns = activeIcon.playerId === 0 ? player1Spawns : player2Spawns;
      const originalPosition = spawns[iconIndex];

      return {
        ...prev,
        players: prev.players.map(player => ({
          ...player,
          icons: player.icons.map(icon => 
            icon.id === activeIcon.id 
              ? { 
                  ...icon, 
                  position: originalPosition, 
                  movedThisTurn: false,
                  stats: { ...icon.stats, movement: icon.stats.moveRange }
                }
              : icon
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

  const startRespawnPlacement = useCallback((iconId: string) => {
    setGameState(prev => {
      const icon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === iconId);
        
      if (!icon || icon.isAlive || icon.respawnTurns > 0) {
        return prev;
      }
      
      // Only allow respawning on player's turn
      const activeIcon = prev.players
        .flatMap(p => p.icons)
        .find(i => i.id === prev.activeIconId);
        
      if (activeIcon?.playerId !== icon.playerId) {
        toast.error("You can only respawn on your turn!");
        return prev;
      }
      
      return {
        ...prev,
        respawnPlacement: iconId
      };
    });
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
    undoMovement,
    startRespawnPlacement
  };
};

export default useGameState;
