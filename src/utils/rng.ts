// Shared seeded PRNG (LCG — same algorithm used throughout the game for deterministic results)

export function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0;
    return (s >>> 0) / 0xffffffff;
  };
}
