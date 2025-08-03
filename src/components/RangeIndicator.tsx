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

  // Calculate movement range
  const movementRange: Coordinates[] = [];
  if (showMovement && activeIcon) {
    const maxRange = activeIcon.stats.moveRange;
    
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords) && !isOccupied(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= maxRange && distance > 0) {
            const terrain = getTerrainAt(coords);
            // Forest halves movement range
            const effectiveRange = terrain?.type === 'forest' ? maxRange * 0.5 : maxRange;
            if (distance <= effectiveRange) {
              movementRange.push(coords);
            }
          }
        }
      }
    }
  }

  // Calculate attack range (basic attack range is 1)
  const attackRange: Coordinates[] = [];
  if (showAttack && activeIcon) {
    const baseAttackRange = 1;
    
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= baseAttackRange && distance > 0) {
            const terrain = getTerrainAt(coords);
            // Forest halves range
            const effectiveRange = terrain?.type === 'forest' ? baseAttackRange * 0.5 : baseAttackRange;
            if (distance <= effectiveRange) {
              // Only show if there's an enemy target
              const targetIcon = gameState.players
                .flatMap(p => p.icons)
                .find(icon => 
                  icon.position.q === coords.q && 
                  icon.position.r === coords.r &&
                  icon.playerId !== activeIcon.playerId &&
                  icon.isAlive
                );
              if (targetIcon) {
                attackRange.push(coords);
              }
            }
          }
        }
      }
    }
  }

  // Calculate ability range
  const abilityRangeCoords: Coordinates[] = [];
  if (showAbility && activeIcon && abilityRange) {
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= abilityRange && distance > 0) {
            const terrain = getTerrainAt(coords);
            // Forest halves range
            const effectiveRange = terrain?.type === 'forest' ? abilityRange * 0.5 : abilityRange;
            if (distance <= effectiveRange) {
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