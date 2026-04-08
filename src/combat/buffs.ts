import { GameState, Icon } from "@/types/game";

const isForestAt = (state: GameState, q: number, r: number) =>
  state.board.find(t => t.coordinates.q === q && t.coordinates.r === r)?.terrain.type === "forest";

const isRiverAt = (state: GameState, q: number, r: number) =>
  state.board.find(t => t.coordinates.q === q && t.coordinates.r === r)?.terrain.type === "river";

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
  let power   = basePower   * (1 + teamPowerPct);
  let defense = baseDefense + (icon.cardBuffDef ?? 0);

  // Alien Core item: ability damage +15%
  if (icon.itemPassiveTags?.includes('ability_power_15pct')) {
    power *= 1.15;
  }

  // Genghis Bloodlust passive: +15 Might per kill stack (stacks up to 3)
  if (icon.name.includes("Genghis") && (icon.passiveStacks ?? 0) > 0) {
    might += (icon.passiveStacks ?? 0) * 15;
  }

  // Leonidas Phalanx passive: +8 Defense per adjacency stack (stacks up to 3)
  if (icon.name.includes("Leonidas") && (icon.passiveStacks ?? 0) > 0) {
    defense += (icon.passiveStacks ?? 0) * 8;
  }

  // 🏰 Base tile buff (+20% Might/Power/Defense on own base)
  if (isOwnBaseAt(icon, icon.position.q, icon.position.r)) {
    might   *= 1.20;
    power   *= 1.20;
    defense *= 1.20;
  }

  // 🌲 Forest defense buff (+25% Defense while on forest; movement costs doubled)
  // Napoleon "Vantage Point" passive: no forest DEF bonus (trade-off for range 3)
  const onForest = isForestAt(state, icon.position.q, icon.position.r);
  if (onForest && !icon.name.includes("Napoleon")) {
    defense *= 1.25;
  }

  // 🐢 Yi Sun-sin — Turtle Ship passive: on river, boost Might/Defense, reduce Power
  if (icon.name.includes("Sun-sin")) {
    const onRiver = isRiverAt(state, icon.position.q, icon.position.r);
    if (onRiver) {
      might   *= 1.40;
      defense *= 1.30;
      power   *= 0.60;
    }
  }

  // 🧪 Apply active debuffs
  for (const d of icon.debuffs ?? []) {
    switch (d.type) {
      case 'demoralize':  break; // Handled at turn start: 50% skip movement + cards
      case 'armor_break': defense = Math.max(0, defense * (1 - d.magnitude / 100)); break;
      case 'silence':     power   = 0; break;
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
