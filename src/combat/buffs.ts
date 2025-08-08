import { GameState, Icon } from "@/types/game";

// Optional helpers if you want them here
const isForestAt = (state: GameState, q: number, r: number) =>
  state.board.find(t => t.coordinates.q === q && t.coordinates.r === r)?.terrain.type === "forest";

const isOwnBaseAt = (icon: Icon, q: number, r: number) =>
  (icon.playerId === 0 && q === -6 && r === 5) ||
  (icon.playerId === 1 && q === 6 && r === -5);

export function calcEffectiveStats(state: GameState, icon: Icon) {
  const baseMight   = icon.stats.might;
  const basePower   = icon.stats.power;
  const baseDefense = icon.stats.defense;

  // 💪 Make team buffs SAFE even if state.teamBuffs is missing or has wrong shape
  const teamMightPct =
    ((state.teamBuffs?.mightBonus ?? [0, 0])[icon.playerId] ?? 0) / 100;
  const teamPowerPct =
    ((state.teamBuffs?.powerBonus ?? [0, 0])[icon.playerId] ?? 0) / 100;

  let might   = baseMight   * (1 + teamMightPct);
  let power   = basePower   * (1 + teamPowerPct);
  let defense = baseDefense;

  // 🏰 Base tile buff (+20% Might/Power/Defense on own base)
  if (isOwnBaseAt(icon, icon.position.q, icon.position.r)) {
    might   *= 1.20;
    power   *= 1.20;
    defense *= 1.20;
  }

  // 🌲 Forest defense buff (+50% Defense while on forest)
  if (isForestAt(state, icon.position.q, icon.position.r)) {
    defense *= 1.50;
  }

  return { might, power, defense };
}

