import { Card, CardType, CardRarity, EffectValues } from "@/types/game";

interface CardDef {
  definitionId: string;
  name: string;
  manaCost: number;
  type: CardType;
  rarity: CardRarity;
  description: string;
  exclusiveTo: string | null;
  effect: EffectValues;
  terrainBonus?: Partial<Record<string, number>>;
}

export const CHARACTER_IDS = {
  napoleon: "Napoleon",
  genghis:  "Genghis",
  daVinci:  "Da Vinci",
} as const;

// How many copies of each shared card go into a deck (default 2)
const SHARED_COPIES: Record<string, number> = {
  shared_basic_attack: 4,
  shared_quick_move:   3,
  shared_gamble:       1,
};

const CARD_DEFS: CardDef[] = [
  // ── Shared ───────────────────────────────────────────────────────────────────
  {
    definitionId: "shared_basic_attack",
    name: "Basic Attack",
    manaCost: 1,
    type: "attack",
    rarity: "common",
    description: "Deal Might damage to a target in attack range.",
    exclusiveTo: null,
    effect: { damage: 1, damageType: 'atk' },
  },
  {
    definitionId: "shared_shield",
    name: "Shield",
    manaCost: 1,
    type: "defense",
    rarity: "common",
    description: "Gain +10 DEF until the start of your next turn.",
    exclusiveTo: null,
    effect: { defBonus: 10 },
  },
  {
    definitionId: "shared_might_up",
    name: "MIGHT +10",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "+10 Might this turn. Amplifies Basic Attack.",
    exclusiveTo: null,
    effect: { atkBonus: 10 },
  },
  {
    definitionId: "shared_def_up",
    name: "DEF +10",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "+10 Defense this turn.",
    exclusiveTo: null,
    effect: { defBonus: 10 },
  },
  {
    definitionId: "shared_quick_move",
    name: "Quick Move",
    manaCost: 1,
    type: "movement",
    rarity: "common",
    description: "+2 movement this turn.",
    exclusiveTo: null,
    effect: { moveBonus: 2 },
  },
  {
    definitionId: "shared_mend",
    name: "Mend",
    manaCost: 1,
    type: "defense",
    rarity: "common",
    description: "Heal an ally within range 3 for 20 HP.",
    exclusiveTo: null,
    effect: { healing: 20, range: 3 },
  },
  {
    definitionId: "shared_battle_cry",
    name: "Battle Cry",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "+8 Might this turn. Combos with Basic Attack.",
    exclusiveTo: null,
    effect: { atkBonus: 8 },
  },
  {
    definitionId: "shared_gamble",
    name: "Gamble",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "Discard 2 random cards from your hand. Draw 2 new ones.",
    exclusiveTo: null,
    effect: { swapCount: 2 },
  },

  // ── Napoleon ──────────────────────────────────────────────────────────────────
  {
    definitionId: "napoleon_artillery_barrage",
    name: "Artillery Barrage",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Power×0.7 damage at range 4. +20% from mountain.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 0.7, range: 4 },
    terrainBonus: { mountain: 0.2 },
  },
  {
    definitionId: "napoleon_grande_armee",
    name: "Grande Armée",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "+20% Might AND Power to all allies for 2 turns.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { teamDmgPct: 20, turns: 2 },
  },
  {
    definitionId: "napoleon_final_salvo",
    name: "Final Salvo",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — 3 hits of Power×0.35 on one target at range 3.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 0.35, multiHit: 3, range: 3 },
  },

  // ── Genghis ───────────────────────────────────────────────────────────────────
  {
    definitionId: "genghis_mongol_charge",
    name: "Mongol Charge",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Power×0.6 damage at range 3.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 0.6, range: 3 },
  },
  {
    definitionId: "genghis_horde_tactics",
    name: "Horde Tactics",
    manaCost: 3,
    type: "attack",
    rarity: "rare",
    description: "Power×0.4 damage to ALL enemies within range 2.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 0.4, allEnemiesInRange: true, range: 2 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Power×0.35 to ALL enemies on a horizontal line, range 4.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 0.35, lineTarget: true, range: 4 },
  },

  // ── Da Vinci ─────────────────────────────────────────────────────────────────
  {
    definitionId: "davinci_flying_machine",
    name: "Flying Machine",
    manaCost: 2,
    type: "movement",
    rarity: "rare",
    description: "Teleport to any hex within range 5.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { moveBonus: 0, range: 5 },
  },
  {
    definitionId: "davinci_masterpiece",
    name: "Masterpiece",
    manaCost: 3,
    type: "defense",
    rarity: "rare",
    description: "Heal an ally within range 3 for 45 HP.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { healing: 45, range: 3 },
  },
  {
    definitionId: "davinci_vitruvian_guardian",
    name: "Vitruvian Guardian",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Summon a combat drone: 50 HP, 15 Might, 30 Defense.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { turns: 2 },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

let _instanceCounter = 0;
function newInstanceId() {
  return `card_${Date.now()}_${_instanceCounter++}`;
}

export function instantiateCard(def: CardDef): Card {
  return { ...def, id: newInstanceId() };
}

export function buildDeckForTeam(iconNames: string[]): Card[] {
  const deck: Card[] = [];
  for (const def of CARD_DEFS) {
    if (def.exclusiveTo === null) {
      const n = SHARED_COPIES[def.definitionId] ?? 2;
      for (let i = 0; i < n; i++) deck.push(instantiateCard(def));
    } else {
      const inTeam = iconNames.some((n) => n.includes(def.exclusiveTo as string));
      if (inTeam) deck.push(instantiateCard(def));
    }
  }
  return shuffle(deck);
}

export function drawCards(
  drawPile: Card[],
  discardPile: Card[],
  count: number
): { drawn: Card[]; newDraw: Card[]; newDiscard: Card[] } {
  let draw = [...drawPile];
  let discard = [...discardPile];
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break;
      draw = shuffle(discard);
      discard = [];
    }
    drawn.push(draw.shift()!);
  }
  return { drawn, newDraw: draw, newDiscard: discard };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export { CARD_DEFS };
