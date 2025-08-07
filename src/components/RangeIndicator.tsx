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
    
    // Mana crystal is now impassable
    if (tile?.terrain.type === 'mana_crystal') {
      return false;
    }
    
    const isOccupied = gameState.players
      .flatMap(p => p.icons)
      .some(icon => 
        icon.position.q === coords.q && 
        icon.position.r === coords.r && 
        icon.isAlive
      );
    
    return !isOccupied;
  };

  // Calculate movement range based on remaining movement points
  const movementRange: Coordinates[] = [];
  if (showMovement && activeIcon) {
    const remainingMovement = activeIcon.stats.movement; // Use remaining movement points
    
    // If no movement left, show no movement highlights
    if (remainingMovement <= 0) {
      return { movementRange: [], attackRange: [], abilityRange: [] };
    }
    
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords) && isPassable(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance > 0 && distance <= remainingMovement) {
            // Calculate movement cost considering terrain - forest hexes cost 2 movement each
            let movementCost = distance;
            const terrain = getTerrainAt(coords);
            if (terrain?.type === 'forest') {
              movementCost = distance + 1; // Forest adds +1 cost per hex (so 2 total for forest hex)
            }
            
            if (movementCost <= remainingMovement) {
              movementRange.push(coords);
            }
          }
        }
      }
    }
  }

  // Calculate attack range based on character type
  const attackRange: Coordinates[] = [];
  if (showAttack && activeIcon) {
    // Get character-specific attack range
    let baseAttackRange = 1; // Default melee
    if (activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan") {
      baseAttackRange = 2; // Ranged characters
    }

    // If standing in forest, halve all ranges (rounded up)
    const isOnForest = getTerrainAt(activeIcon.position)?.type === 'forest';
    const effectiveRange = Math.ceil(baseAttackRange / (isOnForest ? 2 : 1));
    
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= effectiveRange && distance > 0) {
            // Apply forest cost to attack range
            let movementCost = distance;
            const terrain = getTerrainAt(coords);
            if (terrain?.type === 'forest') {
              movementCost = distance * 2; // Forest costs double for attacks too
            }
            
            if (movementCost <= effectiveRange) {
              // Show if there's an enemy target or attackable structure
              const targetIcon = gameState.players
                .flatMap(p => p.icons)
                .find(icon => 
                  icon.position.q === coords.q && 
                  icon.position.r === coords.r &&
                  icon.playerId !== activeIcon.playerId &&
                  icon.isAlive
                );
              
              const attackableTile = gameState.board.find(tile =>
                tile.coordinates.q === coords.q &&
                tile.coordinates.r === coords.r &&
                (tile.terrain.type === 'base' || tile.terrain.type === 'beast_camp')
              );
              
              if (targetIcon || attackableTile) {
                attackRange.push(coords);
              }
            }
          }
        }
      }
    }
  }

  // Calculate ability range with forest modifiers
  const abilityRangeCoords: Coordinates[] = [];
  if (showAbility && activeIcon && abilityRange) {
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= abilityRange && distance > 0) {
            // Apply forest cost to ability range
            let movementCost = distance;
            const terrain = getTerrainAt(coords);
            if (terrain?.type === 'forest') {
              movementCost = distance * 2; // Forest costs double for abilities too
            }
            
            if (movementCost <= abilityRange) {
              abilityRangeCoords.push(coords);
            }
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