import { GameState, Icon } from "@/types/game";

const isForestAt = (state: GameState, q: number, r: number) =>
  state.board.find(t => t.coordinates.q === q && t.coordinates.r === r)?.terrain.type === "forest";

const isWaterAt = (state: GameState, q: number, r: number) => {
  const type = state.board.find(t => t.coordinates.q === q && t.coordinates.r === r)?.terrain.type;
  return type === "lake" || type === "river";
};

const isOwnBaseAt = (icon: Icon, q: number, r: number) =>
  (icon.playerId === 0 && q === -6 && r === 5) ||
  (icon.playerId === 1 && q === 6 && r === -5);

export function calcEffectiveStats(state: GameState, icon: Icon) {
  const baseMight   = icon.stats.might;
  const basePower   = icon.stats.power;
  const baseDefense = icon.stats.defense;

  const teamMightPct =
    ((state.teamBuffs?.mightBonus ?? [0, 0])[icon.playerId] ?? 0) / 100;
  const teamPowerPct =
    ((state.teamBuffs?.powerBonus ?? [0, 0])[icon.playerId] ?? 0) / 100;

  let might   = baseMight   * (1 + teamMightPct) + (icon.cardBuffAtk ?? 0);
  let power   = basePower   * (1 + teamPowerPct) + (icon.cardBuffPow ?? 0);
  let defense = baseDefense + (icon.cardBuffDef ?? 0);

  // Alien Core item: ability damage +25%
  if (icon.itemPassiveTags?.includes('ability_power_25pct')) {
    power *= 1.25;
  }

  // Genghis Bloodlust passive: +12 Might per kill stack (stacks up to 3)
  if (icon.name.includes("Genghis") && (icon.passiveStacks ?? 0) > 0) {
    might += (icon.passiveStacks ?? 0) * 12;
  }

  // Beethoven Crescendo passive: +2 Power per stack, max 15 (or +3 with Heiligenstadt Score)
  if (icon.name.includes("Beethoven") && (icon.passiveStacks ?? 0) > 0) {
    const perStack = icon.itemPassiveTags?.includes('sig_beethoven_heiligenstadt') ? 3 : 2;
    power += (icon.passiveStacks ?? 0) * perStack;
  }

  // Leonidas Phalanx passive: (6 + level) Defense per adjacency stack (+ Thermopylae Stone: +5 Might per stack)
  if (icon.name.includes("Leonidas") && (icon.passiveStacks ?? 0) > 0) {
    defense += (icon.passiveStacks ?? 0) * (6 + (icon.level ?? 1));
    if (icon.itemPassiveTags?.includes('sig_leonidas_thermopylae')) {
      might += (icon.passiveStacks ?? 0) * 5;
    }
  }

  // 🏰 Base tile buff (+20% Might/Power/Defense on own base)
  if (isOwnBaseAt(icon, icon.position.q, icon.position.r)) {
    might   *= 1.20;
    power   *= 1.20;
    defense *= 1.20;
  }

  // 🌲 Forest defense buff (+20% Defense while on forest)
  const onForest = isForestAt(state, icon.position.q, icon.position.r);
  if (onForest) {
    defense *= 1.20;
  }

  // 🐢 Yi Sun-sin — Turtle Ship passive: on lake or river (water terrain), boost Might/Defense
  if (icon.name.includes("Sun-sin")) {
    const onWater = isWaterAt(state, icon.position.q, icon.position.r);
    if (onWater) {
      might   *= 1.35;
      defense *= 1.30;
      power   *= 0.60;
    }
  }

  // 🧪 Apply active debuffs
  for (const d of icon.debuffs ?? []) {
    switch (d.type) {
      case 'rooted':      break; // Handled in selectTile: blocks movement, not card plays
      case 'armor_break': defense = Math.max(0, defense * (1 - d.magnitude / 100)); break;
      case 'silence':     break; // Blocks ability card use — handled at playCard and AI execution
      case 'blinded':
        // Magnitude > 0 (Flash Bang+): also reduces Might by that %
        if (d.magnitude > 0) might = Math.max(0, might * (1 - d.magnitude / 100));
        break;
      case 'poison':
        might   = Math.max(0, might   - d.magnitude);
        defense = Math.max(0, defense - d.magnitude);
        break;
      case 'mud_throw': // Handled in movement reset — no stat effect here
        break;
    }
  }

  return { might, power, defense };
}
