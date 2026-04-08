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
  leonidas: "Leonidas",
  sunsin:   "Sun-sin",
} as const;

// How many copies of each shared card go into a deck (default 2)
const SHARED_COPIES: Record<string, number> = {
  shared_basic_attack:  4,
  shared_quick_move:    3,
  shared_gamble:        1,
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
    name: "Shields Up",
    manaCost: 1,
    type: "defense",
    rarity: "common",
    description: "Gain +10 Defense until the start of your next turn.",
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
    description: "Heal yourself for 20 HP.",
    exclusiveTo: null,
    effect: { healing: 20, selfCast: true },
  },
  {
    definitionId: "shared_battle_cry",
    name: "Battle Cry",
    manaCost: 1,
    type: "buff",
    rarity: "common",
    description: "+10 Might this turn.",
    exclusiveTo: null,
    effect: { atkBonus: 10 },
  },
  {
    definitionId: "shared_gamble",
    name: "Gamble",
    manaCost: 1,
    type: "buff",
    rarity: "common",
    description: "Discard 2 random cards from your hand. Draw 2 new ones.",
    exclusiveTo: null,
    effect: { swapCount: 2 },
  },

  // ── Shared Debuffs ────────────────────────────────────────────────────────────
  {
    definitionId: "shared_mud_throw",
    name: "Mud Throw",
    manaCost: 1,
    type: "debuff",
    rarity: "common",
    description: "Enemy loses 1 movement for 2 turns. Range 3.",
    exclusiveTo: null,
    effect: { range: 3, debuffType: 'mud_throw', debuffMagnitude: 1, debuffDuration: 2 },
  },
  {
    definitionId: "shared_demoralize",
    name: "Demoralize",
    manaCost: 3,
    type: "debuff",
    rarity: "common",
    description: "Target enemy: 50% chance each turn to skip movement & cards. Lasts 2 turns. Range 2.",
    exclusiveTo: null,
    effect: { range: 2, debuffType: 'demoralize', debuffMagnitude: 0, debuffDuration: 2 },
  },
  {
    definitionId: "shared_armor_break",
    name: "Armor Break",
    manaCost: 2,
    type: "debuff",
    rarity: "common",
    description: "Enemy loses 25% Defense for 2 turns. Range 2.",
    exclusiveTo: null,
    effect: { range: 2, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 2 },
  },
  {
    definitionId: "shared_silence",
    name: "Silence",
    manaCost: 3,
    type: "debuff",
    rarity: "common",
    description: "Enemy Power drops to 0 for 1 turn. Range 1.",
    exclusiveTo: null,
    effect: { range: 1, debuffType: 'silence', debuffMagnitude: 0, debuffDuration: 2 },
  },
  {
    definitionId: "shared_poison_dart",
    name: "Poison Dart",
    manaCost: 3,
    type: "debuff",
    rarity: "common",
    description: "Enemy loses 5 Might and 5 Defense each turn. Removed on heal. Range 2.",
    exclusiveTo: null,
    effect: { range: 2, debuffType: 'poison', debuffMagnitude: 5, debuffDuration: 99 },
  },

  // ── Napoleon ──────────────────────────────────────────────────────────────────
  {
    definitionId: "napoleon_artillery_barrage",
    name: "Artillery Barrage",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Power×1.4 damage at range 4.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 1.4, range: 4 },
  },
  {
    definitionId: "napoleon_grande_armee",
    name: "Grande Armée",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "+20% Might AND Power to all allies for 2 turns. (No range limit.)",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { teamDmgPct: 20, turns: 2 },
  },
  {
    definitionId: "napoleon_final_salvo",
    name: "Final Salvo",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — 3 random hits of Power×0.7 on enemies within range 4.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 0.7, multiHit: 3, range: 4, randomTargets: true },
  },

  // ── Genghis ───────────────────────────────────────────────────────────────────
  {
    definitionId: "genghis_mongol_charge",
    name: "Mongol Charge",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Power×1.2 damage at range 3.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 1.2, range: 3 },
  },
  {
    definitionId: "genghis_horde_tactics",
    name: "Horde Tactics",
    manaCost: 3,
    type: "attack",
    rarity: "rare",
    description: "Power×0.8 damage to ALL enemies within range 2.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 0.8, allEnemiesInRange: true, range: 2 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Power×0.7 to ALL enemies on a horizontal line, range 5.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 0.7, lineTarget: true, range: 5 },
  },

  // ── Leonidas ─────────────────────────────────────────────────────────────────
  {
    definitionId: "leonidas_shield_bash",
    name: "Shield Bash",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Power×1.5 damage at range 1. Applies Armor Break (−25% Defense for 2 turns).",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 1.5, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 2 },
  },
  {
    definitionId: "leonidas_spartan_wall",
    name: "Spartan Wall",
    manaCost: 3,
    type: "defense",
    rarity: "rare",
    description: "+20 Defense to Leonidas and all allies within range 2.",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { teamDefBuff: 20, range: 2 },
  },
  {
    definitionId: "leonidas_this_is_sparta",
    name: "THIS IS SPARTA!",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Power×3 damage to target + Demoralize all adjacent enemies (1t).",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 3.0, range: 3, aoeDemoralize: true },
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
    effect: { teleport: true, range: 5 },
  },
  {
    definitionId: "davinci_masterpiece",
    name: "Masterpiece",
    manaCost: 3,
    type: "defense",
    rarity: "rare",
    description: "Heal an ally within range 3 for Power×1.0 HP.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { healingMult: 1.0, range: 3 },
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

  // ── Yi Sun-sin ───────────────────────────────────────────────────────────────
  {
    definitionId: "sunsin_hwajeon",
    name: "Hwajeon / Ramming Speed",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Land: ~72 dmg at range 3, pushes target back. Water: ~72 dmg at range 1, pushes target back.",
    exclusiveTo: CHARACTER_IDS.sunsin,
    effect: { powerMult: 1.2, range: 3, pushback: 1 },
  },
  {
    definitionId: "sunsin_naval_command",
    name: "Naval Repairs / Broadside",
    manaCost: 3,
    type: "defense",
    rarity: "rare",
    description: "Land: Target an area — allies within range 2 heal 10 HP now and 10 HP next turn. Water: ~25 dmg to all enemies in range 3.",
    exclusiveTo: CHARACTER_IDS.sunsin,
    effect: { healZone: true, healPerTurn: 10, healDuration: 2, range: 2 },
  },
  {
    definitionId: "sunsin_chongtong",
    name: "Chongtong Barrage",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Land: charge 3 hexes, ~60 dmg to enemies in path, push them sideways. Water: ~90 dmg main target, ~43 dmg adjacents in range 5.",
    exclusiveTo: CHARACTER_IDS.sunsin,
    effect: { powerMult: 2.0, range: 5, allEnemiesInRange: true, lineCharge: true, chargeDist: 3, pushSide: true },
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

/** Build a deck from a list of definition IDs (duplicates allowed). Used by roguelike. */
export function buildDeckFromIds(cardIds: string[]): Card[] {
  const deck: Card[] = [];
  for (const id of cardIds) {
    const def = CARD_DEFS.find(d => d.definitionId === id);
    if (def) deck.push(instantiateCard(def));
  }
  return shuffle(deck);
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
