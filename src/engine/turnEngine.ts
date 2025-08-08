import { GameState, Coordinates, Icon, HexTile } from "@/types/game";

/** Build a stable speed queue once, sorted by speed desc */
export function initSpeedQueue(icons: Icon[]) {
  return [...icons].sort((a,b) =>
    b.stats.speed - a.stats.speed || a.id.localeCompare(b.id)
  );
}

/** Is this index the round boundary? We tick mana/respawns here. */
export function isRoundBoundary(prevIdx: number, nextIdx: number, queueLen: number) {
  return queueLen > 0 && nextIdx === 0 && prevIdx === queueLen - 1;
}

/** Axial hex distance (matches your existing helper) */
export function hexDistance(a: Coordinates, b: Coordinates): number {
  return Math.max(
    Math.abs(b.q - a.q),
    Math.abs(b.r - a.r),
    Math.abs((b.q + b.r) - (a.q + a.r))
  );
}

/** Count adjacent allied icons to the mana crystal at (0,0) */
export function countAlliesAdjacentToCrystal(state: GameState, playerId: number): number {
  const center = { q: 0, r: 0 };
  return state.players[playerId].icons.filter(i =>
    i.isAlive && hexDistance(i.position, center) === 1
  ).length;
}

/** Any free spawn tile for player (returns first free tile or undefined) */
export function findFreeSpawnTile(board: HexTile[], state: GameState, playerId: number): Coordinates | undefined {
  const inSpawn = (q: number, r: number) => (
    playerId === 0
      ? (q >= -6 && q <= -4 && r >= 3 && r <= 5)
      : (q >= 4 && q <= 6 && r >= -5 && r <= -3)
  );

  const occupied = new Set(
    state.players.flatMap(p => p.icons)
      .filter(i => i.isAlive)
      .map(i => `${i.position.q}:${i.position.r}`)
  );

  for (const tile of board) {
    const { q, r } = tile.coordinates;
    if (inSpawn(q, r) && !occupied.has(`${q}:${r}`)) return { q, r };
  }
  return undefined;
}


