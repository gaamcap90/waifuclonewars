// src/hooks/useMovementHistory.ts - Movement history tracking for undo functionality

import { Coordinates } from "@/types/game";

export interface MovementStep {
  position: Coordinates;
  cost: number;
}

export const useMovementHistory = () => {
  const addMovementStep = (
    history: MovementStep[],
    newPosition: Coordinates,
    movementCost: number
  ): MovementStep[] => {
    return [...history, { position: newPosition, cost: movementCost }];
  };

  const undoLastMovement = (history: MovementStep[]): {
    newHistory: MovementStep[];
    refundedCost: number;
    previousPosition?: Coordinates;
  } => {
    if (history.length === 0) {
      return { newHistory: [], refundedCost: 0 };
    }

    const lastStep = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    // Get previous position (if exists) or return undefined for starting position
    const previousPosition = newHistory.length > 0 
      ? newHistory[newHistory.length - 1].position
      : undefined;

    return {
      newHistory,
      refundedCost: lastStep.cost,
      previousPosition
    };
  };

  const clearHistory = (): MovementStep[] => {
    return [];
  };

  const preventBackAndForthCheat = (
    history: MovementStep[],
    newPosition: Coordinates
  ): boolean => {
    // If less than 2 moves, allow
    if (history.length < 2) return true;

    // Check if the new position matches the position from 2 moves ago
    const twoMovesAgo = history[history.length - 2].position;
    return !(twoMovesAgo.q === newPosition.q && twoMovesAgo.r === newPosition.r);
  };

  return {
    addMovementStep,
    undoLastMovement,
    clearHistory,
    preventBackAndForthCheat
  };
};