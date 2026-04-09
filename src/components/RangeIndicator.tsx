import React from "react";
import { Coordinates, GameState } from "@/types/game";

interface RangeIndicatorProps {
  gameState: GameState;
  activeIconId?: string;
  showMovement?: boolean;
  showAttack?: boolean;
  showAbility?: boolean;
  abilityRange?: number;
}

export const useRangeCalculation = (
  gameState: GameState,
  activeIconId?: string,
  showMovement?: boolean,
  showAttack?: boolean,
  showAbility?: boolean,
  abilityRange?: number
) => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === activeIconId);

  if (!activeIcon) return { movementRange: [], attackRange: [], abilityRange: [] };

  const calculateDistance = (from: Coordinates, to: Coordinates): number => {
    return (Math.abs(from.q - to.q) + Math.abs(from.q + from.r - to.q - to.r) + Math.abs(from.r - to.r)) / 2;
  };

  const isValidHex = (coords: Coordinates): boolean => {
    return gameState.board.some(tile => 
      tile.coordinates.q === coords.q && tile.coordinates.r === coords.r
    );
  };

  const isOccupied = (coords: Coordinates): boolean => {
    return gameState.board.some(tile =>
      tile.coordinates.q === coords.q && 
      tile.coordinates.r === coords.r && 
      tile.occupiedBy
    );
  };

  const getTerrainAt = (coords: Coordinates) => {
    return gameState.board.find(tile =>
      tile.coordinates.q === coords.q && tile.coordinates.r === coords.r
    )?.terrain;
  };

  // Make mana crystal impassable for movement
  const isPassable = (coords: Coordinates): boolean => {
    const tile = gameState.board.find(t =>
      t.coordinates.q === coords.q && t.coordinates.r === coords.r
    );

    // Mana crystal is impassable
    if (tile?.terrain.type === 'mana_crystal') {
      return false;
    }

    // River is impassable unless this is Sun-sin (Turtle Ship passive)
    if (tile?.terrain.type === 'river' && !activeIcon?.name.includes('Sun-sin')) {
      return false;
    }

    // Mountains are always impassable
    if (tile?.terrain.type === 'mountain') {
      return false;
    }
    
    const activePlayerId = gameState.activePlayerId;
    const isOccupied = gameState.players
      .flatMap(p => p.icons)
      .some(icon =>
        icon.position.q === coords.q &&
        icon.position.r === coords.r &&
        icon.isAlive // Dead icons free their tile immediately — consistent with movement logic
      );

    return !isOccupied;
  };

  // Calculate movement range based on remaining movement points
  const movementRange: Coordinates[] = [];
  if (showMovement && activeIcon) {
    const remainingMovement = activeIcon.stats.movement;
    
    if (remainingMovement > 0) {
      for (let q = -7; q <= 7; q++) {
        for (let r = -7; r <= 7; r++) {
          const coords = { q, r };
          if (isValidHex(coords) && isPassable(coords)) {
            const distance = calculateDistance(activeIcon.position, coords);
            if (distance > 0 && distance <= remainingMovement) {
              let movementCost = distance;
              const terrain = getTerrainAt(coords);
              if (terrain?.type === 'forest') movementCost = distance + 1;
              if (movementCost <= remainingMovement) movementRange.push(coords);
            }
          }
        }
      }
    }
  }

  // Calculate attack range — highlights ALL tiles in range (not just tiles with enemies)
  const attackRange: Coordinates[] = [];
  if (showAttack && activeIcon) {
    // If abilityRange is provided (targeting mode active), use it directly — it already has
    // character/terrain-specific adjustments (e.g. Sun-sin range 3 on water, Napoleon forest range 3)
    let baseAttackRange = abilityRange ?? 1;
    if (abilityRange === undefined) {
      if (activeIcon.name.includes("Napoleon") || activeIcon.name.includes("Da Vinci")) baseAttackRange = 2;
      const napoleonOnForest =
        activeIcon.name.includes("Napoleon") &&
        gameState.board.find(t => t.coordinates.q === activeIcon.position.q && t.coordinates.r === activeIcon.position.r)?.terrain.type === "forest";
      if (napoleonOnForest) baseAttackRange = 3;
    }

    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (!isValidHex(coords)) continue;
        const distance = calculateDistance(activeIcon.position, coords);
        if (distance <= baseAttackRange && distance > 0) {
          // Show all reachable tiles; execution filter (must have enemy) is in game logic
          attackRange.push(coords);
        }
      }
    }
  }

  // Calculate ability range - use raw hex distance for indicators
  const abilityRangeCoords: Coordinates[] = [];
  if (showAbility && activeIcon && abilityRange) {
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= abilityRange && distance > 0) {
            abilityRangeCoords.push(coords);
          }
        }
      }
    }
  }

  return {
    movementRange,
    attackRange,
    abilityRange: abilityRangeCoords
  };
};