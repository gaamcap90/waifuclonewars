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
  napoleon:  "Napoleon",
  genghis:   "Genghis",
  daVinci:   "Da Vinci",
  leonidas:  "Leonidas",
  sunsin:    "Sun-sin",
  beethoven: "Beethoven",
  huang:     "Huang-chan",
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
    description: "Power×1.2 damage at range 3. Applies Bleed (Power×0.4 per turn, 2 turns).",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 1.2, range: 3, bleedMult: 0.4, debuffDuration: 2 },
  },
  {
    definitionId: "genghis_horde_tactics",
    name: "Horde Tactics",
    manaCost: 3,
    type: "attack",
    rarity: "rare",
    description: "Power×0.5 per enemy in range — damage multiplies by the number of enemies hit. Range 2.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { scalingAoE: true, perEnemyMult: 0.5, range: 2 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Power×1.0 to ALL enemies on a line, range 5. Doubled if target <50% HP.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 1.0, lineTarget: true, range: 5, executeDouble: true },
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
    description: "ULTIMATE (Exhaust) — Power×2 damage to target + Demoralize all adjacent enemies (1t).",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 2.0, range: 3, aoeDemoralize: true },
  },

  // ── Da Vinci ─────────────────────────────────────────────────────────────────
  {
    definitionId: "davinci_flying_machine",
    name: "Flying Machine",
    manaCost: 2,
    type: "movement",
    rarity: "rare",
    description: "Teleport to any unoccupied hex on the board. No range limit.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { teleport: true, range: 999 },
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
    description: "ULTIMATE (Exhaust) — Summon a combat drone. Lasts until defeated. Stats scale with Power (≈HP×1.5, Might×1.0, Def×0.6).",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: {},
  },

  // ── Beethoven ─────────────────────────────────────────────────────────────────
  {
    definitionId: "beethoven_schallwelle",
    name: "Schallwelle",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Sonic wave — Power×0.5 dmg to all enemies in a line up to range 3, pushes each 2 tiles back.",
    exclusiveTo: CHARACTER_IDS.beethoven,
    effect: { powerMult: 0.5, range: 3, lineTarget: true, pushback: 2 },
  },
  {
    definitionId: "beethoven_freudenspur",
    name: "Freudenspur",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "Target a tile within range 3 — that tile and all 6 adjacent tiles become a resonance zone. Allies entering zone tiles gain +2 Movement. Lasts 2 turns.",
    exclusiveTo: CHARACTER_IDS.beethoven,
    effect: { moveZone: true, moveBonus: 2, zoneDuration: 2, range: 3 },
  },
  {
    definitionId: "beethoven_gotterfunken",
    name: "Götterfunken",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Unleash the full Sternensturm. Deal 46 damage and stun all enemies within range 3 for 1 turn.",
    exclusiveTo: CHARACTER_IDS.beethoven,
    effect: { range: 3, allEnemiesInRange: true, debuffType: 'stun', debuffDuration: 1, powerMult: 0.7 },
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

  // ── Huang-chan ─────────────────────────────────────────────────────────────
  {
    definitionId: "huang_terracotta_summon",
    name: "Terracotta Legion",
    manaCost: 2,
    type: "buff",
    rarity: "rare",
    description: "Summon a random Terracotta Warrior (Archer: Might×1.5 range 2 — or Melee: Might×1 range 1) on target hex within range 3. HP 40, scales with your stats. Lasts 2 turns.",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { summonTerracotta: true, range: 3, turns: 2 },
  },
  {
    definitionId: "huang_first_emperor",
    name: "First Emperor's Command",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "Summon a Terracotta Cavalry (Might×1.5, Def×1.5, Power×1, Move 3) on adjacent hex. HP 60, scales with your stats. Lasts 2 turns. Gain 1 free Cavalry Charge card.",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { summonCavalry: true, range: 1, turns: 2 },
  },
  {
    definitionId: "huang_cavalry_charge",
    name: "Cavalry Charge",
    manaCost: 0,
    type: "attack",
    rarity: "rare",
    description: "FREE — Cavalry charges a target at range 3 for Power×1.5 damage. (Appears after First Emperor's Command only.)",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { powerMult: 1.5, range: 3 },
  },
  {
    definitionId: "huang_eternal_army",
    name: "Eternal Army",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Take control of a non-boss enemy within range 3 for 2 turns. You cannot attack them; they attack the nearest non-allied unit and use no abilities.",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { controlEnemy: true, range: 3, controlDuration: 2 },
  },

  // ── Curses (negative cards added to deck by bad events) ────────────────────
  {
    definitionId: "curse_burden",
    name: "Dead Weight",
    manaCost: 1,
    type: "buff",
    rarity: "common",
    description: "A burden that drags on your soul. Costs 1 mana — does nothing.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_malaise",
    name: "Malaise",
    manaCost: 2,
    type: "buff",
    rarity: "common",
    description: "Crushing lethargy seeps into your clones. Wastes 2 mana.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_void_echo",
    name: "Void Echo",
    manaCost: 0,
    type: "buff",
    rarity: "common",
    description: "A hollow resonance of dark energy. Wastes a card play.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_dread",
    name: "Dread",
    manaCost: 3,
    type: "buff",
    rarity: "common",
    description: "An overwhelming sense of doom. Wastes 3 mana.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_chains",
    name: "Chains of Znyxorga",
    manaCost: 1,
    type: "buff",
    rarity: "common",
    description: "Invisible chains bind your clones. Costs 1 mana to discard — does nothing.",
    exclusiveTo: null,
    effect: {},
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
    if (def.definitionId.startsWith('curse_')) continue; // curse cards only enter via roguelike events
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

// ── Ability upgrades ─────────────────────────────────────────────────────────
// Each entry describes what changes when a player upgrades that ability.
export const CARD_UPGRADES: Record<string, {
  upgradedName: string;
  descriptionUpgrade: string; // short "what changed" label for UI
  patch: Partial<Omit<CardDef, 'effect'>> & { effect?: Record<string, unknown> };
}> = {
  // Napoleon
  napoleon_artillery_barrage: {
    upgradedName: 'Artillery Barrage+',
    descriptionUpgrade: 'Power×1.4 → 1.7',
    patch: { description: '~68 damage to a target at range 4. (Scales with Power)', effect: { powerMult: 1.7, range: 4 } },
  },
  napoleon_grande_armee: {
    upgradedName: 'Grande Armée+',
    descriptionUpgrade: '+20% → +30% team buff',
    patch: { description: '+30% Might AND Power to all allies for 2 turns. (No range limit.)', effect: { teamDmgPct: 30, turns: 2 } },
  },
  napoleon_final_salvo: {
    upgradedName: 'Final Salvo+',
    descriptionUpgrade: '3 hits → 5 hits',
    patch: { description: 'ULTIMATE (Exhaust) — 5 random hits of ~28 damage on enemies within range 4. (Scales with Power)', effect: { powerMult: 0.7, multiHit: 5, range: 4, randomTargets: true } },
  },
  // Genghis
  genghis_mongol_charge: {
    upgradedName: 'Mongol Charge+',
    descriptionUpgrade: 'Bleed Power×0.4 → 0.6/turn',
    patch: { description: '~48 damage at range 3. Applies Bleed (~24 HP/turn for 2 turns). (Scales with Power)', effect: { powerMult: 1.2, range: 3, bleedMult: 0.6, debuffDuration: 2 } },
  },
  genghis_horde_tactics: {
    upgradedName: 'Horde Tactics+',
    descriptionUpgrade: 'Range 2 → 3',
    patch: { description: '~20 damage per enemy in range 3 — multiplies by enemy count. (Scales with Power)', effect: { scalingAoE: true, perEnemyMult: 0.5, range: 3 } },
  },
  genghis_riders_fury: {
    upgradedName: "Rider's Fury+",
    descriptionUpgrade: 'Power×1.0 → 1.5 on line',
    patch: { description: 'ULTIMATE (Exhaust) — ~60 damage to all enemies on a line, range 5. Doubled (~120) if target <50% HP. (Scales with Power)', effect: { powerMult: 1.5, lineTarget: true, range: 5, executeDouble: true } },
  },
  // Leonidas
  leonidas_shield_bash: {
    upgradedName: 'Shield Bash+',
    descriptionUpgrade: 'Armor Break 2t → 3t',
    patch: { description: '~30 damage at range 1. Applies Armor Break (−25% Defense for 3 turns). (Scales with Power)', effect: { powerMult: 1.5, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 3 } },
  },
  leonidas_spartan_wall: {
    upgradedName: 'Spartan Wall+',
    descriptionUpgrade: '+20 → +30 Defense',
    patch: { description: '+30 Defense to Leonidas and all allies within range 2.', effect: { teamDefBuff: 30, range: 2 } },
  },
  leonidas_this_is_sparta: {
    upgradedName: 'THIS IS SPARTA!+',
    descriptionUpgrade: 'Power×2 → 3',
    patch: { description: 'ULTIMATE (Exhaust) — ~60 damage to target + Demoralize all adjacent enemies (1t). (Scales with Power)', effect: { powerMult: 3.0, range: 3, aoeDemoralize: true } },
  },
  // Da Vinci
  davinci_flying_machine: {
    upgradedName: 'Flying Machine+',
    descriptionUpgrade: 'Cost 2 → 1 mana',
    patch: { description: 'Teleport to any unoccupied hex on the board. Costs 1 mana.', manaCost: 1, effect: { teleport: true, range: 999 } },
  },
  davinci_masterpiece: {
    upgradedName: 'Masterpiece+',
    descriptionUpgrade: 'Heal Power×1.0 → 1.5',
    patch: { description: 'Heal an ally within range 3 for ~75 HP. (Scales with Power)', effect: { healingMult: 1.5, range: 3 } },
  },
  davinci_vitruvian_guardian: {
    upgradedName: 'Vitruvian Guardian+',
    descriptionUpgrade: 'Drone: 50HP→80HP, 15Might→20Might',
    patch: { description: 'ULTIMATE (Exhaust) — Summon a combat drone: 80 HP, 20 Might, 40 Defense. Lasts until defeated.', effect: {} },
  },
  // Beethoven
  beethoven_schallwelle: {
    upgradedName: 'Schallwelle+',
    descriptionUpgrade: 'Power×0.5→0.7, pushes 3 tiles',
    patch: { description: 'Sonic wave — ~45 damage to all enemies in a line up to range 3, pushes each 3 tiles back. (Scales with Power)', effect: { powerMult: 0.7, range: 3, lineTarget: true, pushback: 3 } },
  },
  beethoven_freudenspur: {
    upgradedName: 'Freudenspur+',
    descriptionUpgrade: 'Zone lasts 3 turns, +3 Movement',
    patch: { description: 'Target a tile within range 3 — that tile and all 6 adjacent tiles become a resonance zone. Allies entering zone tiles gain +3 Movement. Lasts 3 turns.', effect: { moveZone: true, moveBonus: 3, zoneDuration: 3, range: 3 } },
  },
  beethoven_gotterfunken: {
    upgradedName: 'Götterfunken+',
    descriptionUpgrade: 'Stun 1 → 2 turns',
    patch: { description: 'ULTIMATE (Exhaust) — Unleash the full Sternensturm. Deal 46 damage and stun all enemies within range 3 for 2 turns.', effect: { range: 3, allEnemiesInRange: true, debuffType: 'stun', debuffDuration: 2, powerMult: 0.7 } },
  },
  // Yi Sun-sin
  sunsin_hwajeon: {
    upgradedName: 'Hwajeon+',
    descriptionUpgrade: 'Power×1.2 → 1.5, pushes 2 tiles',
    patch: { description: 'Land: ~90 dmg at range 3, pushes target 2 tiles back. Water: ~90 dmg at range 1, pushes 2 tiles back.', effect: { powerMult: 1.5, range: 3, pushback: 2 } },
  },
  sunsin_naval_command: {
    upgradedName: 'Naval Repairs+',
    descriptionUpgrade: '10 HP/turn → 15 HP/turn',
    patch: { description: 'Land: Allies within range 2 heal 15 HP now and 15 HP next turn. Water: ~35 dmg to all enemies in range 3.', effect: { healZone: true, healPerTurn: 15, healDuration: 2, range: 2 } },
  },
  sunsin_chongtong: {
    upgradedName: 'Chongtong Barrage+',
    descriptionUpgrade: 'Power×2.0 → 2.5',
    patch: { description: 'ULTIMATE (Exhaust) — Land: charge 3 hexes, ~75 dmg in path, push sideways. Water: ~113 dmg main target, ~54 dmg adjacents in range 5.', effect: { powerMult: 2.5, range: 5, allEnemiesInRange: true, lineCharge: true, chargeDist: 3, pushSide: true } },
  },
  // Huang-chan
  huang_terracotta_summon: {
    upgradedName: 'Terracotta Legion+',
    descriptionUpgrade: 'Warriors gain +20 HP (HP 40→60)',
    patch: { description: 'Summon a random Terracotta Warrior (Archer: range 2, Warrior: range 1) on target hex within range 3. HP 60, scales with your stats. Lasts 2 turns.', effect: { summonTerracotta: true, range: 3, turns: 2, summonHpBonus: 20 } },
  },
  huang_first_emperor: {
    upgradedName: "First Emperor's Command+",
    descriptionUpgrade: 'Cavalry gains +20 HP (HP 60→80)',
    patch: { description: "Summon Terracotta Cavalry on adjacent hex. HP 80, stats scale with yours. Lasts 2 turns. Gain free Cavalry Charge.", effect: { summonCavalry: true, range: 1, turns: 2, cavalryMightBonus: 20 } },
  },
  huang_eternal_army: {
    upgradedName: 'Eternal Army+',
    descriptionUpgrade: 'Control 2 → 3 turns',
    patch: { description: 'ULTIMATE (Exhaust) — Control a non-boss enemy within range 3 for 3 turns.', effect: { controlEnemy: true, range: 3, controlDuration: 3 } },
  },
};

/** Build a deck from a list of definition IDs (duplicates allowed). Used by roguelike.
 *  Pass upgradedDefIds to apply run upgrades to matching cards. */
export function buildDeckFromIds(cardIds: string[], upgradedDefIds?: Set<string>): Card[] {
  const deck: Card[] = [];
  for (const id of cardIds) {
    let def = CARD_DEFS.find(d => d.definitionId === id);
    if (!def) continue;
    if (upgradedDefIds?.has(id)) {
      const upgrade = CARD_UPGRADES[id];
      if (upgrade) {
        def = { ...def, name: upgrade.upgradedName, ...upgrade.patch } as CardDef;
      }
    }
    deck.push(instantiateCard(def));
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
