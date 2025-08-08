import { GameState, Icon } from "@/types/game";

export type EffectiveStats = {
  might: number;
  power: number;
  defense: number;
};

export function isOwnBaseTile(state: GameState, icon: Icon): boolean {
  const { q, r } = icon.position;
  // P1 base: (-6,5); P2 base: (6,-5)
  if (icon.playerId === 0) return q === -6 && r === 5;
  return q === 6 && r === -5;
}

export function isForestTile(state: GameState, iconOrPos: Icon | {q:number;r:number}): boolean {
  const pos = "position" in iconOrPos ? iconOrPos.position : iconOrPos;
  const tile = state.board.find(t => t.coordinates.q === pos.q && t.coordinates.r === pos.r);
  return tile?.terrain.type === "forest";
}

/** Beast Camp provides team might/power only in your current game; defense buff is 0% */
function teamMightPct(state: GameState, playerId: number): number {
  return state.teamBuffs?.mightBonus?.[playerId] ?? 0;
}
function teamPowerPct(state: GameState, playerId: number): number {
  return state.teamBuffs?.powerBonus?.[playerId] ?? 0;
}
function teamDefensePct(_state: GameState, _playerId: number): number {
  return 0; // no beast-camp defense bonus (by design)
}

/** Compute effective stats with stacking buffs (Beast + Base + Forest) */
// types: assume Icon has base stats; state holds board/tiles, team buffs, etc.
export function calcEffectiveStats(state: GameState, icon: Icon) {
  const base = icon.stats;

  // Beast camp team buff: Might/Power +15% per camp (max 2)
  const beastStacks = Math.min(2, state.teamBuffs.beastStacks[icon.playerId] || 0);
  const beastMult = 1 + beastStacks * 0.15;

  // Base tile buff: +20% Might/Power/Defense if on own base
  const onBase = isOwnBaseTile(state, icon);
  const baseMult = onBase ? 1.2 : 1;

  // Forest tile buff: +50% Defense if on forest
  const onForest = isForestTile(state, icon);
  const forestDefMult = onForest ? 1.5 : 1;

  const might = base.might * beastMult * baseMult;
  const power = base.power * beastMult * baseMult;
  const defense = base.defense * baseMult * forestDefMult;

  // Return full-precision; UI can format
  return { might, power, defense, // for UI breakdowns:
           breakdown: {
             beastStacks,
             onBase,
             onForest,
             multipliers: { beastMult, baseMult, forestDefMult }
           } };
}

