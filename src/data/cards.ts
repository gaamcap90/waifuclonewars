import { Card, CardType, CardRarity, EffectValues } from "@/types/game";

// ── Card Definition (template without runtime id) ───────────────────────────

interface CardDef {
  definitionId: string;
  name: string;
  manaCost: number;
  type: CardType;
  rarity: CardRarity;
  description: string;
  exclusiveTo: string | null; // null = shared
  effect: EffectValues;
  terrainBonus?: Partial<Record<string, number>>;
}

// ── Character IDs (must match Icon.name substring) ────────────────────────────
export const CHARACTER_IDS = {
  napoleon: "Napoleon",
  genghis:  "Genghis",
  daVinci:  "Da Vinci",
} as const;

// ── Shared cards copy multipliers ─────────────────────────────────────────────
// How many copies of each shared card go into a deck
const SHARED_COPIES: Record<string, number> = {
  shared_basic_attack: 4,
  shared_quick_move:   3,
  // all others default to 2
};

// ── Card Definitions ─────────────────────────────────────────────────────────

const CARD_DEFS: CardDef[] = [
  // ── Shared cards ────────────────────────────────────────────────────────────
  {
    definitionId: "shared_basic_attack",
    name: "Basic Attack",
    manaCost: 1,
    type: "attack",
    rarity: "common",
    description: "Deal Might damage to a target in attack range.",
    exclusiveTo: null,
    effect: { damage: 1, damageType: 'atk' as const },
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
    description: "+10 Might until the start of your next turn. Amplifies Basic Attack.",
    exclusiveTo: null,
    effect: { atkBonus: 10 },
  },
  {
    definitionId: "shared_def_up",
    name: "DEF +10",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "+10 Defense until the start of your next turn.",
    exclusiveTo: null,
    effect: { defBonus: 10 },
  },
  {
    definitionId: "shared_quick_move",
    name: "Quick Move",
    manaCost: 1,
    type: "movement",
    rarity: "common",
    description: "+1 movement range this turn.",
    exclusiveTo: null,
    effect: { moveBonus: 1 },
  },
  {
    definitionId: "shared_mend",
    name: "Mend",
    manaCost: 1,
    type: "defense",
    rarity: "common",
    description: "Heal a nearby ally for 20 HP.",
    exclusiveTo: null,
    effect: { healing: 20 },
  },
  {
    definitionId: "shared_battle_cry",
    name: "Battle Cry",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "+8 Might this turn. Great before a Basic Attack.",
    exclusiveTo: null,
    effect: { atkBonus: 8 },
  },

  // ── Napoleon exclusives ──────────────────────────────────────────────────────
  {
    definitionId: "napoleon_artillery_barrage",
    name: "Artillery Barrage",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "48 damage at range 4. +20% from mountain.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { damage: 48, range: 4 },
    terrainBonus: { mountain: 0.2 },
  },
  {
    definitionId: "napoleon_grande_armee",
    name: "Grande Armée",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "+20% team damage for 3 turns.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { teamDmgPct: 20, turns: 3 },
  },
  {
    definitionId: "napoleon_final_salvo",
    name: "Final Salvo",
    manaCost: 4,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — 30 damage in a 3-tile line.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { damage: 30, range: 3 },
  },

  // ── Genghis exclusives ───────────────────────────────────────────────────────
  {
    definitionId: "genghis_mongol_charge",
    name: "Mongol Charge",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Rush attack — 48 damage at range 3.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { damage: 48, range: 3 },
  },
  {
    definitionId: "genghis_horde_tactics",
    name: "Horde Tactics",
    manaCost: 3,
    type: "attack",
    rarity: "rare",
    description: "60 damage to a nearby target.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { damage: 60 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 4,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — 24 damage to up to 3 enemies.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { damage: 24, targets: 3 },
  },

  // ── Da Vinci exclusives ───────────────────────────────────────────────────────
  {
    definitionId: "davinci_flying_machine",
    name: "Flying Machine",
    manaCost: 2,
    type: "movement",
    rarity: "rare",
    description: "Teleport to any hex within range 4.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { moveBonus: 0, range: 4 },
  },
  {
    definitionId: "davinci_masterpiece",
    name: "Masterpiece",
    manaCost: 3,
    type: "defense",
    rarity: "rare",
    description: "Heal 45 HP to a nearby ally.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { healing: 45 },
  },
  {
    definitionId: "davinci_vitruvian_guardian",
    name: "Vitruvian Guardian",
    manaCost: 4,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Summon a combat drone for 2 turns.",
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

/**
 * Build a full starting deck for a team given their icon names.
 * - Shared cards: SHARED_COPIES[definitionId] copies (default 2)
 * - Exclusive cards: 1 copy per character present
 */
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

/** Draw up to `count` cards from the draw pile, reshuffling discard if needed. */
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
