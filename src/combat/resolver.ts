import { GameState, Icon } from "@/types/game";
import { calcEffectiveStats } from "./buffs";

/** Basic attack: damage = buffed might - target effective defense (floats allowed, min 0.1) */
export function resolveBasicAttackDamage(state: GameState, attacker: Icon, defender: Icon): number {
  const a = calcEffectiveStats(state, attacker);
  const d = calcEffectiveStats(state, defender);
  const raw = a.might - d.defense;
  return Math.max(0.1, raw);
}

/** Ability damage by multiplier on power (if you’re still using multipliers parsed from description) */
export function resolveAbilityDamage(state: GameState, attacker: Icon, defender: Icon, multiplier: number): number {
  const a = calcEffectiveStats(state, attacker);
  const d = calcEffectiveStats(state, defender);
  const raw = (a.power * multiplier) - d.defense;
  return Math.max(0.1, raw);
}
