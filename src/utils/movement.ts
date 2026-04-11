// src/utils/movement.ts
// Shared movement/pathfinding utilities used by both the game engine and UI range indicators.

import { HexTile } from "@/types/game";

export type Qr = { q: number; r: number };

export const tileKey = (q: number, r: number) => `${q},${r}`;

export function neighborsAxial({ q, r }: Qr): Qr[] {
  return [
    { q: q + 1, r: r },
    { q: q + 1, r: r - 1 },
    { q: q, r: r - 1 },
    { q: q - 1, r: r },
    { q: q - 1, r: r + 1 },
    { q: q, r: r + 1 },
  ];
}

/**
 * Movement cost to enter a tile.
 * @param allowLake  Yi Sun-sin's Turtle Ship passive — can enter lake tiles (cost 1)
 *                   AND ignore extra movement cost on river tiles (river costs 1 not 2)
 */
export function movementCostForTile(tile: HexTile, allowLake?: boolean): number {
  if (tile.terrain.effects.movementModifier === -999) {
    // Lake: impassable deep water; only Sun-sin's Turtle Ship can cross (cost 1)
    if (allowLake && tile.terrain.type === 'lake') return 1;
    return Infinity;
  }
  // River: shallow water — Sun-sin ignores the extra cost (her passive), everyone else pays 2
  if (tile.terrain.type === "river") return allowLake ? 1 : 2;
  // Slow terrain — costs 2 movement to enter
  if (
    tile.terrain.type === "desert" ||
    tile.terrain.type === "snow" ||
    tile.terrain.type === "mud"
  ) return 2;
  // Forest costs 1 movement (normal) but grants +40% DEF while standing in it
  // All other passable terrain (plain, forest, ice, ash, ruins, spawn, etc.) costs 1
  return 1;
}

/**
 * Dijkstra pathfinding for hex movement.
 *
 * - `blockedKeys`: tiles that CANNOT be entered at all (enemy icons, impassable terrain).
 * - `allyKeys`:    tiles that CAN be traversed through but CANNOT be stopped on (friendly icons).
 *
 * Returns a map of tileKey → movement cost for every reachable DESTINATION tile
 * (ally-occupied transit tiles are excluded from the result).
 */
export function reachableWithCosts(
  board: HexTile[],
  start: Qr,
  maxBudget: number,
  blockedKeys: Set<string>,
  allowLake?: boolean,
  allyKeys: Set<string> = new Set(),
): Map<string, number> {
  const byKey = new Map(board.map((t) => [tileKey(t.coordinates.q, t.coordinates.r), t]));
  const dist = new Map<string, number>();
  const pq: Array<{ key: string; cost: number }> = [];

  const startKey = tileKey(start.q, start.r);
  dist.set(startKey, 0);
  pq.push({ key: startKey, cost: 0 });

  while (pq.length) {
    let minI = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i].cost < pq[minI].cost) minI = i;
    const { key, cost } = pq.splice(minI, 1)[0];
    if (cost > (dist.get(key) ?? Infinity)) continue;

    const [qStr, rStr] = key.split(",");
    const pos = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };

    for (const nb of neighborsAxial(pos)) {
      const nbKey = tileKey(nb.q, nb.r);
      const nbTile = byKey.get(nbKey);
      if (!nbTile) continue;

      // Hard block: enemies and impassable terrain
      if (nbKey !== startKey && blockedKeys.has(nbKey)) continue;

      const step = movementCostForTile(nbTile, allowLake);
      if (!isFinite(step)) continue;

      const newCost = cost + step;
      if (newCost > maxBudget) continue;

      if (newCost < (dist.get(nbKey) ?? Infinity)) {
        dist.set(nbKey, newCost);
        pq.push({ key: nbKey, cost: newCost });
      }
    }
  }

  // Remove start tile and ally-occupied tiles from destinations
  // (we traversed through allies but you can't land on them)
  dist.delete(startKey);
  for (const key of allyKeys) dist.delete(key);

  return dist;
}
