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
      effects: { movementModifier: -999 }  // Impassable
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

// Enhanced AI that prioritizes basic attacks and smart movement
const makeAIMove = (gameState: GameState): Partial<GameState> => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  if (!activeIcon || !activeIcon.isAlive || activeIcon.playerId !== 1) {
    return {};
  }

  const enemyIcons = gameState.players[0].icons.filter(icon => icon.isAlive);
  const attackRange = activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan" ? 2 : 1;

  // PRIORITY 1: Basic attack if enemy is in range NOW
  for (const enemy of enemyIcons) {
    const distance = calculateDistance(activeIcon.position, enemy.position);
    if (distance <= attackRange && !activeIcon.actionTaken) {
      console.log('AI: Enemy in attack range, attacking!');
      return {
        targetingMode: {
          abilityId: 'basic_attack',
          iconId: activeIcon.id,
          range: attackRange
        }
      };
    }
  }

  // PRIORITY 2: Move to get in attack range of enemy and attack immediately
  if (!activeIcon.movedThisTurn && activeIcon.stats.movement > 0) {
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

    // Find move that puts us in attack range of an enemy - then attack immediately
    for (const move of validMoves) {
      for (const enemy of enemyIcons) {
        const distanceAfterMove = calculateDistance(move, enemy.position);
        if (distanceAfterMove <= attackRange) {
          console.log('AI: Moving to attack range and will attack');
          
          // Move AND set targeting mode to attack in the same turn
          const updatedPlayers = gameState.players.map(player => ({
            ...player,
            icons: player.icons.map(icon => 
              icon.id === activeIcon.id 
                ? { 
                    ...icon, 
                    position: move, 
                    movedThisTurn: true,
                    stats: { ...icon.stats, movement: Math.max(0, icon.stats.movement - calculateDistance(activeIcon.position, move)) }
                  }
                : icon
            )
          }));
          
          return {
            players: updatedPlayers,
            targetingMode: {
              abilityId: 'basic_attack',
              iconId: activeIcon.id,
              range: attackRange
            }
          };
        }
      }
    }

    // If no attack move available, move towards closest enemy
    if (validMoves.length > 0 && enemyIcons.length > 0) {
      let closestEnemy = enemyIcons[0];
      let minDistance = calculateDistance(activeIcon.position, closestEnemy.position);
      
      for (const enemy of enemyIcons) {
        const dist = calculateDistance(activeIcon.position, enemy.position);
        if (dist < minDistance) {
          minDistance = dist;
          closestEnemy = enemy;
        }
      }
      
      const bestMove = validMoves.reduce((best, move) => {
        const currentDistance = calculateDistance(move, closestEnemy.position);
        const bestDistance = calculateDistance(best, closestEnemy.position);
        return currentDistance < bestDistance ? move : best;
      });

      console.log('AI: Moving towards enemy');
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
  }

  // PRIORITY 3: Attack enemy base if in range
  const enemyBase = gameState.board.find(tile => 
    tile.terrain.type === 'base' && 
    tile.coordinates.q === -6 && tile.coordinates.r === 5
  );
  
  if (enemyBase && !activeIcon.actionTaken) {
    const distanceToBase = calculateDistance(activeIcon.position, enemyBase.coordinates);
    if (distanceToBase <= attackRange) {
      console.log('AI: Attacking enemy base');
      return {
        targetingMode: {
          abilityId: 'basic_attack',
          iconId: activeIcon.id,
          range: attackRange
        }
      };
    }
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
              
              // Execute the attack immediately instead of calling selectTile
              setGameState(prev => {
  // 1) Compute buffed might & damage
  const mightBonusPct = prev.teamBuffs.mightBonus[activeIcon.playerId] || 0;
  const buffedMight = activeIcon.stats.might * (1 + mightBonusPct / 100);

  // 2) Find the target (character) at the clicked coords
  const targetIcon = prev.players
    .flatMap(p => p.icons)
    .find(icon =>
      icon.position.q === target.q &&
      icon.position.r === target.r &&
      icon.isAlive
    );

  let updatedPlayers = prev.players;
  let updatedBaseHealth = [...prev.baseHealth];

  if (targetIcon) {
    // 3) Calculate damage vs. that target’s defense
    const targetDefense = targetIcon.stats.defense;
    const rawDamage = buffedMight - targetDefense;
    const damage = Math.max(0.1, rawDamage);

    // 4) Apply damage to the target
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
    // 5) If no icon found, attack the base (no defense)
    const rawDamage = buffedMight;
    const damage = Math.max(0.1, rawDamage);
    if (target.q === -6 && target.r === 5) {
      updatedBaseHealth[0] = Math.max(0, prev.baseHealth[0] - damage);
    }
  }

  // 6) Mark AI as acted & advance turn
  const updatedPlayersWithAction = updatedPlayers.map(player => ({
    ...player,
    icons: player.icons.map(icon =>
      icon.id === activeIcon.id
        ? { ...icon, actionTaken: true }
        : icon
    )
  }));

  const aliveIcons = updatedPlayersWithAction
    .flatMap(p => p.icons)
    .filter(icon => icon.isAlive);
  const nextIndex = (prev.queueIndex + 1) % aliveIcons.length;
  const nextIconId = prev.speedQueue[nextIndex] || aliveIcons[0]?.id;

  return {
    ...prev,
    players: updatedPlayersWithAction,
    baseHealth: updatedBaseHealth,
    targetingMode: undefined,
    activeIconId: nextIconId,
    queueIndex: nextIndex
  };
});             
              return;
            }
          }
          
          // Get AI move decision
          const aiMove = makeAIMove(gameState);
          console.log('AI move result:', aiMove);
          
          if (aiMove.targetingMode) {
            // AI wants to attack - set targeting mode
            console.log('AI setting targeting mode for attack');
            setGameState(prev => ({ ...prev, ...aiMove }));
            return;
          } else if (aiMove.players) {
            // AI wants to move
            console.log('AI moving');
            setGameState(prev => ({ ...prev, ...aiMove }));
            return;
          } else {
            // AI can't do anything useful, end turn
            console.log('AI ending turn - no valid actions');
            endTurn();
          }
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
              const mightBonusPct = prev.teamBuffs.mightBonus[activeIcon.playerId] || 0;
              const buffedMight = activeIcon.stats.might * (1 + mightBonusPct / 100);
              const targetDefense = targetIcon?.stats.defense || 0;

              // allow fractional damage
              const rawDamage = buffedMight - targetDefense;
              // ensure you always do at least 0.1 damage so things die
              const damage = Math.max(0.1, rawDamage);
              
              if (targetIcon) {
                const newHp = Math.max(0, targetIcon.stats.hp - damage);
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
                        //Transform the tile into plain grass
                          const updatedBoard = prev.board.map(tile =>
        tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
          ? {
              ...tile,
              terrain: { type: 'plain' as const, effects: {} },
              occupiable: true
            }
          : tile
      );
                         // Apply 15% might and power buff to player's team
                         const newMightBonus = [...prev.teamBuffs.mightBonus];
                         const newPowerBonus = [...prev.teamBuffs.powerBonus];
                         newMightBonus[activeIcon.playerId] = 15;
                         newPowerBonus[activeIcon.playerId] = 15;

                         console.log(
                           "%c[Buffs Applied]",
                        "color: purple; font-weight: bold",
                        { newMightBonus, newPowerBonus }
                           );
                         
                         toast.success(`Beast Camp defeated! Team gains +15% might and power!`);
                         
                         return {
        ...prev,
        board: updatedBoard,
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
        },
        // Mark attacker as having acted
        players: prev.players.map(player => ({
          ...player,
          icons: player.icons.map(icon =>
            icon.id === activeIcon.id
              ? { ...icon, actionTaken: true }
              : icon
          )
        })),
        targetingMode: undefined
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
              // Ability logic using defined damage/healing values with buffs
              const ability = activeIcon.abilities.find(a => a.id === prev.targetingMode!.abilityId);
              if (ability) {
                // Use the power bonus from team buffs for damage abilities
                const powerBonusPct = prev.teamBuffs.powerBonus[activeIcon.playerId] || 0;
                const buffedPower = activeIcon.stats.power * (1 + powerBonusPct / 100);
                
                let damage = 0;
                let healing = 0;
                
                // Use ability's defined damage value if it exists
                if (ability.damage && ability.damage > 0) {
                  // Apply power buff to fixed ability damage
                  damage = Math.max(1, Math.floor(ability.damage * (1 + powerBonusPct / 100)) - (targetIcon?.stats.defense || 0));
                }
                
                // Use ability's defined healing value if it exists
                if (ability.healing && ability.healing > 0) {
                  // Apply power buff to healing
                  healing = Math.floor(ability.healing * (1 + powerBonusPct / 100));
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
          i?.position?.q === coordinates.q && 
          i.position?.r === coordinates.r && 
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
            
            // Calculate movement cost considering terrain
            const destinationTile = prev.board.find(tile => 
              tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
            );
            
            let movementCost = distance;
            if (destinationTile?.terrain.type === 'forest') {
              movementCost = distance * 2; // Forest costs double movement
            }
            
            // Store previous position for undo
            const previousPosition = movementActiveIcon.position;
            
            return {
              ...prev,
              players: prev.players.map(player => ({
                ...player,
                icons: player.icons.map(icon => 
                  icon.id === movementActiveIcon.id 
                    ? { 
                        ...icon, 
                        position: coordinates,
                        previousPosition: previousPosition, // Store for undo
                        movedThisTurn: true,
                        stats: { ...icon.stats, movement: Math.max(0, icon.stats.movement - movementCost) }
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

      // Use the stored previous position instead of going back to spawn
      const previousPosition = (activeIcon as any).previousPosition;
      if (!previousPosition) {
        console.log('No previous position stored for undo');
        return prev;
      }

      return {
        ...prev,
        players: prev.players.map(player => ({
          ...player,
          icons: player.icons.map(icon => 
            icon.id === activeIcon.id 
              ? { 
                  ...icon, 
                  position: previousPosition, 
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
