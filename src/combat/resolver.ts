import { GameState, Icon } from "@/types/game";
import { calcEffectiveStats } from "./buffs";

/** Basic attack: damage = buffed might - target effective defense (floats allowed, min 0.1) */
export function resolveBasicAttackDamage(state: GameState, attacker: Icon, defender: Icon | "ENV" | null) {
  const atk = calcEffectiveStats(state, attacker);
  const def = defender && defender !== "ENV" ? calcEffectiveStats(state, defender) : { defense: 0 };
  const raw = atk.might - (def.defense ?? 0);
  return Math.max(0.1, round2(raw));
}

export function resolveAbilityDamage(
  state: GameState,
  attacker: Icon,
  defender: Icon | "ENV" | null,
  mult = 1 // caller passes skill multiplier if needed
) {
  const atk = calcEffectiveStats(state, attacker);
  const def = defender && defender !== "ENV" ? calcEffectiveStats(state, defender) : { defense: 0 };
  const raw = atk.power * mult - (def.defense ?? 0);
  return Math.max(0.1, round2(raw));
}

function round2(n: number) { return Math.round(n * 100) / 100; }

