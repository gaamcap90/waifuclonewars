import React, { useMemo } from "react";
import { Coordinates, GameState } from "@/types/game";
import { tileKey, reachableWithCosts } from "@/utils/movement";

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
  // MUST be before any early return — React hooks must be called in the same order every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const boardKeySet = useMemo(() => new Set(gameState.board.map(t => tileKey(t.coordinates.q, t.coordinates.r))), [gameState.board]);

  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === activeIconId);

  if (!activeIcon) return { movementRange: [], attackRange: [], abilityRange: [] };

  const calculateDistance = (from: Coordinates, to: Coordinates): number => {
    return (Math.abs(from.q - to.q) + Math.abs(from.q + from.r - to.q - to.r) + Math.abs(from.r - to.r)) / 2;
  };

  const isValidHex = (coords: Coordinates): boolean => boardKeySet.has(tileKey(coords.q, coords.r));

  const getTerrainAt = (coords: Coordinates) => {
    return gameState.board.find(tile =>
      tile.coordinates.q === coords.q && tile.coordinates.r === coords.r
    )?.terrain;
  };

  // Calculate movement range via proper Dijkstra — same algorithm as the actual movement engine.
  // Allies are transparent (can be traversed through but not stopped on).
  // Enemies are hard blocks.
  const movementRange: Coordinates[] = [];
  if (showMovement && activeIcon) {
    const remainingMovement = activeIcon.stats.movement;

    if (remainingMovement > 0) {
      const myPlayerId = activeIcon.playerId;

      // Enemy icons: hard block
      const blockedKeys = new Set(
        gameState.players.flatMap(p => p.icons)
          .filter(ic => ic.isAlive && ic.id !== activeIcon.id && ic.playerId !== myPlayerId)
          .map(ic => tileKey(ic.position.q, ic.position.r))
      );
      // Ally icons: passable transit, can't stop there
      const allyKeys = new Set(
        gameState.players.flatMap(p => p.icons)
          .filter(ic => ic.isAlive && ic.id !== activeIcon.id && ic.playerId === myPlayerId)
          .map(ic => tileKey(ic.position.q, ic.position.r))
      );

      const allowLake = activeIcon.name.includes("Sun-sin");
      const costMap = reachableWithCosts(
        gameState.board,
        activeIcon.position,
        remainingMovement,
        blockedKeys,
        allowLake,
        allyKeys
      );

      for (const [key] of costMap.entries()) {
        const [qStr, rStr] = key.split(",");
        movementRange.push({ q: parseInt(qStr, 10), r: parseInt(rStr, 10) });
      }
    }
  }

  // Calculate attack range — highlights ALL tiles in range (not just tiles with enemies)
  const attackRange: Coordinates[] = [];
  if (showAttack && activeIcon) {
    const isBlinded = activeIcon.debuffs?.some(d => d.type === 'blinded') ?? false;
    let baseAttackRange = isBlinded ? 1 : (abilityRange ?? 1);
    if (!isBlinded && abilityRange === undefined) {
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
          attackRange.push(coords);
        }
      }
    }
  }

  // Calculate ability range — raw hex distance (no pathfinding; abilities fire in a straight arc)
  const abilityRangeCoords: Coordinates[] = [];
  if (showAbility && activeIcon && abilityRange) {
    for (let q = -7; q <= 7; q++) {
      for (let r = -7; r <= 7; r++) {
        const coords = { q, r };
        if (isValidHex(coords)) {
          const distance = calculateDistance(activeIcon.position, coords);
          if (distance <= abilityRange) {
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
