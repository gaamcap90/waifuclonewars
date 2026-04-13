// src/utils/movement.ts
// Shared movement/pathfinding utilities used by both the game engine and UI range indicators.

import { HexTile } from "@/types/game";

// ---------------------------------------------------------------------------
// Minimal binary min-heap — used by Dijkstra to avoid O(n²) linear scans.
// ---------------------------------------------------------------------------
class MinHeap<T> {
  private data: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  push(item: T) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }
  pop(): T | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this._down(0); }
    return top;
  }
  get length() { return this.data.length; }
  private _up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.data[p], this.data[i]) <= 0) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  private _down(i: number) {
    const n = this.data.length;
    while (true) {
      let m = i, l = 2 * i + 1, r = l + 1;
      if (l < n && this.cmp(this.data[l], this.data[m]) < 0) m = l;
      if (r < n && this.cmp(this.data[r], this.data[m]) < 0) m = r;
      if (m === i) break;
      [this.data[m], this.data[i]] = [this.data[i], this.data[m]];
      i = m;
    }
  }
}

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
  const pq = new MinHeap<{ key: string; cost: number }>((a, b) => a.cost - b.cost);

  const startKey = tileKey(start.q, start.r);
  dist.set(startKey, 0);
  pq.push({ key: startKey, cost: 0 });

  while (pq.length) {
    const { key, cost } = pq.pop()!;
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
