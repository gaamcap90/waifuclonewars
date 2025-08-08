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
export function calcEffectiveStats(state: GameState, icon: Icon): EffectiveStats {
  const baseOnOwn = isOwnBaseTile(state, icon) ? 20 : 0;
  const forestPct = isForestTile(state, icon) ? 50 : 0;

  const mightPct = teamMightPct(state, icon.playerId) + baseOnOwn;
  const powerPct = teamPowerPct(state, icon.playerId) + baseOnOwn;
  const defensePct = teamDefensePct(state, icon.playerId) + baseOnOwn + forestPct;

  return {
    might: icon.stats.might * (1 + mightPct / 100),
    power: icon.stats.power * (1 + powerPct / 100),
    defense: icon.stats.defense * (1 + defensePct / 100)
  };
}
