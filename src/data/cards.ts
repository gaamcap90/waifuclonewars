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
    definitionId: "shared_entangle",
    name: "Entangle",
    manaCost: 2,
    type: "debuff",
    rarity: "common",
    description: "Target enemy is ROOTED — cannot move for 2 turns. Can still attack and use cards. Range 2.",
    exclusiveTo: null,
    effect: { range: 2, debuffType: 'rooted', debuffMagnitude: 0, debuffDuration: 2 },
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
    description: "Target cannot use abilities for 2 turns. Range 2.",
    exclusiveTo: null,
    effect: { range: 2, debuffType: 'silence', debuffMagnitude: 0, debuffDuration: 2 },
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
    description: "Power×1.3 damage at range 4.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 1.3, range: 4 },
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
    description: "Power×0.6 per enemy in range — damage multiplies by the number of enemies hit. Range 2.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { scalingAoE: true, perEnemyMult: 0.6, range: 2 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Power×1.0 to ALL enemies on a line, range 5. Doubled if target <40% HP.",
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
    description: "Power×1.8 damage at range 1. Applies Armor Break (−25% Defense for 2 turns). Grants Leonidas +20 Defense this turn (counter-stance).",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 1.8, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 2 },
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
    description: "ULTIMATE (Exhaust) — Power×2 damage to target + Root all adjacent enemies for 2 turns.",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 2.0, range: 3, aoeRooted: true },
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
    description: "Heal an ally within range 3 for Power×1.2 HP.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { healingMult: 1.2, range: 3 },
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
    description: "Sonic wave — Power×0.6 dmg to all enemies in a line up to range 3, pushes each 2 tiles back.",
    exclusiveTo: CHARACTER_IDS.beethoven,
    effect: { powerMult: 0.6, range: 3, lineTarget: true, pushback: 2 },
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
    description: "Land: Target an area — allies within range 2 heal 15 HP now and 15 HP next turn. Water: ~25 dmg to all enemies in range 3.",
    exclusiveTo: CHARACTER_IDS.sunsin,
    effect: { healZone: true, healPerTurn: 15, healDuration: 2, range: 2 },
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
    description: "FREE — Cavalry charges a target at range 3 for Power×1.2 damage. (Appears after First Emperor's Command only.)",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { powerMult: 1.2, range: 3 },
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

  // ── New Shared Cards ─────────────────────────────────────────────────────────
  {
    definitionId: "shared_jump",
    name: "Jump",
    manaCost: 1,
    type: "movement",
    rarity: "common",
    description: "Jump over one tile in a straight line, ignoring rivers and blocking units. Costs 1 movement. Cannot land on occupied tiles.",
    exclusiveTo: null,
    effect: { jump: true, range: 2 },
  },
  {
    definitionId: "shared_flash_bang",
    name: "Flash Bang",
    manaCost: 1,
    type: "debuff",
    rarity: "common",
    description: "Blind a target at range 3 — attack range reduced to 1 for 2 turns (basic attacks and abilities).",
    exclusiveTo: null,
    effect: { range: 3, debuffType: 'blinded', debuffMagnitude: 0, debuffDuration: 2 },
  },
  {
    definitionId: "shared_suppressive_fire",
    name: "Suppressive Fire",
    manaCost: 2,
    type: "attack",
    rarity: "common",
    description: "Deal Might×0.3 to all enemies in a cone (3 wide, range 3) and apply Slow (−1 movement) for 1 turn.",
    exclusiveTo: null,
    effect: { coneTarget: true, mightMult: 0.3, range: 3, debuffType: 'mud_throw', debuffMagnitude: 1, debuffDuration: 1 },
  },
  {
    definitionId: "shared_fortify",
    name: "Fortify",
    manaCost: 2,
    type: "defense",
    rarity: "common",
    description: "Cannot move this turn. Gain +25 Defense and +15 Might until end of your next turn.",
    exclusiveTo: null,
    effect: { fortify: true, defBonus: 25, atkBonus: 15, lockMovement: true },
  },
  {
    definitionId: "shared_taunt",
    name: "Taunt",
    manaCost: 2,
    type: "debuff",
    rarity: "common",
    description: "Target enemy within range 3 is Taunted — their AI prioritizes this unit for 2 turns. This unit gains +15 Defense while Taunting.",
    exclusiveTo: null,
    effect: { range: 3, debuffType: 'taunted', debuffMagnitude: 0, debuffDuration: 2, tauntDefBonus: 15 },
  },
  {
    definitionId: "shared_decoy",
    name: "Decoy",
    manaCost: 2,
    type: "buff",
    rarity: "common",
    description: "Place a Decoy (30 HP) on a tile within range 3. Enemy AI treats it as a valid target. When destroyed, it explodes for 20 damage to all enemies within range 2.",
    exclusiveTo: null,
    effect: { placeDecoy: true, decoyHp: 30, decoyExplosion: 20, decoyRange: 2, range: 3 },
  },
  {
    definitionId: "shared_blood_price",
    name: "Blood Price",
    manaCost: 3,
    type: "buff",
    rarity: "common",
    description: "This unit loses 20% of current HP. All allied units gain +15 Might and +15 Power until end of turn.",
    exclusiveTo: null,
    effect: { selfHpCostPct: 0.2, teamDmgFlat: 15, teamPowerFlat: 15 },
  },

  // ── Curses (passive penalties — added to deck by events, not drafted) ────────
  // Curses sit in your deck and hand. Playing one (free) removes it from hand.
  // If left in hand at end of turn, each curse triggers its passive penalty.
  {
    definitionId: "curse_burden",
    name: "Dead Weight",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "Pollutes your deck. Play it to discard (wastes a card action). No end-of-turn penalty — just dead space.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_malaise",
    name: "Malaise",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: each character takes 1 damage per unplayed card remaining in hand (including this). Play it to avoid.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_void_echo",
    name: "Void Echo",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "If in hand at start of turn: −1 mana this turn. Play it to avoid losing that mana.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_dread",
    name: "Dread",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: each character has a 10% chance to be Stunned next turn. Play it to avoid.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_chains",
    name: "Chains of Znyxorga",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: all characters permanently lose 1 to all stats. Play it immediately — every turn it stays costs you.",
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
    descriptionUpgrade: 'Power×1.3 → 1.6',
    patch: { description: '~78 damage to a target at range 4. (Scales with Power)', effect: { powerMult: 1.6, range: 4 } },
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
    patch: { description: '~24 damage per enemy in range 3 — multiplies by enemy count. (Scales with Power)', effect: { scalingAoE: true, perEnemyMult: 0.6, range: 3 } },
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
    patch: { description: '~50 damage at range 1. Applies Armor Break (−25% Defense for 3 turns). Grants Leonidas +20 Defense this turn. (Scales with Power)', effect: { powerMult: 1.8, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 3 } },
  },
  leonidas_spartan_wall: {
    upgradedName: 'Spartan Wall+',
    descriptionUpgrade: '+20 → +30 Defense',
    patch: { description: '+30 Defense to Leonidas and all allies within range 2.', effect: { teamDefBuff: 30, range: 2 } },
  },
  leonidas_this_is_sparta: {
    upgradedName: 'THIS IS SPARTA!+',
    descriptionUpgrade: 'Power×2 → 2.5',
    patch: { description: 'ULTIMATE (Exhaust) — Power×2.5 damage to target + Root all adjacent enemies for 2 turns. (Scales with Power)', effect: { powerMult: 2.5, range: 3, aoeRooted: true } },
  },
  // Da Vinci
  davinci_flying_machine: {
    upgradedName: 'Flying Machine+',
    descriptionUpgrade: 'After landing: draw 1 card and gain +20 Defense until end of turn',
    patch: { description: 'Teleport to any unoccupied hex on the board. On arrival, draw 1 card and gain +20 Defense until end of turn.', effect: { teleport: true, range: 999, onArrivalDraw: 1, onArrivalDef: 20 } },
  },
  davinci_masterpiece: {
    upgradedName: 'Masterpiece+',
    descriptionUpgrade: 'Heal Power×1.2 → 1.8',
    patch: { description: 'Heal an ally within range 3 for ~90 HP. (Scales with Power)', effect: { healingMult: 1.8, range: 3 } },
  },
  davinci_vitruvian_guardian: {
    upgradedName: 'Vitruvian Guardian+',
    descriptionUpgrade: 'Drone: HP 75→90, Might 50→55, Defense 30→40',
    patch: { description: 'ULTIMATE (Exhaust) — Summon a combat drone: 90 HP, 55 Might, 40 Defense. Lasts until defeated. Stats scale with Power.', effect: { droneHpBonus: 15, droneMightBonus: 5, droneDefBonus: 10 } },
  },
  // Beethoven
  beethoven_schallwelle: {
    upgradedName: 'Schallwelle+',
    descriptionUpgrade: 'Power×0.6→0.9, pushes 3 tiles',
    patch: { description: 'Sonic wave — Power×0.9 damage to all enemies in a line up to range 3, pushes each 3 tiles back. (Scales with Power)', effect: { powerMult: 0.9, range: 3, lineTarget: true, pushback: 3 } },
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
    descriptionUpgrade: '15 HP/turn → 20 HP/turn',
    patch: { description: 'Land: Allies within range 2 heal 20 HP now and 20 HP next turn. Water: ~35 dmg to all enemies in range 3.', effect: { healZone: true, healPerTurn: 20, healDuration: 2, range: 2 } },
  },
  sunsin_chongtong: {
    upgradedName: 'Chongtong Barrage+',
    descriptionUpgrade: 'Power×2.0 → 2.2',
    patch: { description: 'ULTIMATE (Exhaust) — Land: charge 3 hexes, ~66 dmg in path, push sideways. Water: ~99 dmg main target, ~48 dmg adjacents in range 5.', effect: { powerMult: 2.2, range: 5, allEnemiesInRange: true, lineCharge: true, chargeDist: 3, pushSide: true } },
  },
  // New shared cards
  shared_jump: {
    upgradedName: 'Jump+',
    descriptionUpgrade: 'After landing, move 1 additional step freely',
    patch: { description: 'Jump over one tile in a straight line, ignoring rivers and blocking units. After landing, take 1 free movement step.', effect: { jump: true, jumpRange: 2, jumpBonusMove: 1 } },
  },
  shared_suppressive_fire: {
    upgradedName: 'Suppressive Fire+',
    descriptionUpgrade: 'Slow duration 1t → 2t',
    patch: { description: 'Deal Might×0.3 to all enemies in a cone (3 wide, range 3) and apply Slow (−1 movement) for 2 turns.', effect: { coneTarget: true, mightMult: 0.3, range: 3, debuffType: 'mud_throw', debuffMagnitude: 1, debuffDuration: 2 } },
  },
  shared_fortify: {
    upgradedName: 'Fortify+',
    descriptionUpgrade: 'Bonus lasts 2 turns',
    patch: { description: 'Cannot move this turn. Gain +25 Defense and +15 Might until end of your second next turn (2 turns total).', effect: { fortify: true, defBonus: 25, atkBonus: 15, lockMovement: true, fortifyDuration: 2 } },
  },
  shared_taunt: {
    upgradedName: 'Taunt+',
    descriptionUpgrade: '+25 Defense while taunting, target takes +20% damage',
    patch: { description: 'Target enemy is Taunted for 2 turns. This unit gains +25 Defense while Taunting. Taunted enemy takes +20% damage from all sources.', effect: { range: 3, debuffType: 'taunted', debuffMagnitude: 20, debuffDuration: 2, tauntDefBonus: 25 } },
  },
  shared_decoy: {
    upgradedName: 'Decoy+',
    descriptionUpgrade: 'Decoy 30 HP → 60 HP',
    patch: { description: 'Place a Decoy (60 HP) on a tile within range 3. Enemy AI treats it as a valid target. When destroyed, explodes for 20 damage to all enemies within range 2.', effect: { placeDecoy: true, decoyHp: 60, decoyExplosion: 20, decoyRange: 2, range: 3 } },
  },
  shared_blood_price: {
    upgradedName: 'Blood Price+',
    descriptionUpgrade: 'Cost 3 → 2 mana',
    patch: { description: 'This unit loses 20% of current HP. All allied units gain +15 Might and +15 Power until end of turn.', manaCost: 2, effect: { selfHpCostPct: 0.2, teamDmgFlat: 15, teamPowerFlat: 15 } },
  },
  // Shared card upgrades
  shared_basic_attack: {
    upgradedName: 'Basic Attack+',
    descriptionUpgrade: 'Damage ×1.2 Might',
    patch: { description: 'Deal Might×1.2 − Defense damage to a target at range 1.', effect: { damageType: 'atk', mightMult: 1.2, range: 1 } },
  },
  shared_shield: {
    upgradedName: 'Shields Up+',
    descriptionUpgrade: '+10 → +15 Defense',
    patch: { description: 'Gain +15 Defense until the start of your next turn.', effect: { defBonus: 15 } },
  },
  shared_quick_move: {
    upgradedName: 'Quick Move+',
    descriptionUpgrade: '+2 → +3 Movement',
    patch: { description: 'Gain +3 Movement this turn.', effect: { moveBonus: 3 } },
  },
  shared_mend: {
    upgradedName: 'Mend+',
    descriptionUpgrade: 'Heal 20 → 30 HP',
    patch: { description: 'Restore 30 HP to this unit.', effect: { healing: 30, selfCast: true } },
  },
  shared_battle_cry: {
    upgradedName: 'Battle Cry+',
    descriptionUpgrade: '+10 → +15 Might',
    patch: { description: 'Grant +15 Might to all allies for 2 turns.', effect: { atkBonus: 15, turns: 2 } },
  },
  shared_gamble: {
    upgradedName: 'Gamble+',
    descriptionUpgrade: 'Cost 1 → 0 Mana',
    patch: { manaCost: 0, description: 'Discard 2 random cards from your hand. Draw 2 new ones. Free.', effect: { swapCount: 2 } },
  },
  shared_mud_throw: {
    upgradedName: 'Mud Throw+',
    descriptionUpgrade: 'Range 3 → 4, Slow −2 Movement',
    patch: { description: 'Slow target by −2 movement for 2 turns. Range 4.', effect: { range: 4, debuffType: 'mud_throw', debuffMagnitude: 2, debuffDuration: 2 } },
  },
  shared_entangle: {
    upgradedName: 'Entangle+',
    descriptionUpgrade: 'Root 2 → 3 turns',
    patch: { description: 'Root target in place for 3 turns. Range 3.', effect: { range: 3, debuffType: 'rooted', debuffMagnitude: 0, debuffDuration: 3 } },
  },
  shared_armor_break: {
    upgradedName: 'Armor Break+',
    descriptionUpgrade: '−25% → −35% DEF, 2 → 3 turns',
    patch: { description: 'Reduce target Defense by 35% for 3 turns. Range 3.', effect: { range: 3, debuffType: 'armor_break', debuffMagnitude: 35, debuffDuration: 3 } },
  },
  shared_silence: {
    upgradedName: 'Silence+',
    descriptionUpgrade: 'Range 2 → 3, 2 → 3 turns',
    patch: { description: 'Target cannot use abilities for 3 turns. Range 3.', effect: { range: 3, debuffType: 'silence', debuffMagnitude: 0, debuffDuration: 3 } },
  },
  shared_poison_dart: {
    upgradedName: 'Poison Dart+',
    descriptionUpgrade: '5 → 8 Might/DEF lost per turn',
    patch: { description: 'Apply Poison to target: −8 Might and −8 Defense per turn for 3 turns. Range 3.', effect: { range: 3, debuffType: 'poison', debuffMagnitude: 8, debuffDuration: 3 } },
  },
  shared_flash_bang: {
    upgradedName: 'Flash Bang+',
    descriptionUpgrade: '2 → 3 turns Blinded',
    patch: { description: 'Blind target for 3 turns (−50% Might, range 0). Range 3.', effect: { range: 3, debuffType: 'blinded', debuffMagnitude: 50, debuffDuration: 3 } },
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
 *  upgradedDefIds may contain duplicate entries — each entry upgrades exactly one copy of that card. */
export function buildDeckFromIds(cardIds: string[], upgradedDefIds?: string[]): Card[] {
  const deck: Card[] = [];
  // Count how many copies of each defId are upgraded
  const upgradeRemaining = new Map<string, number>();
  for (const id of (upgradedDefIds ?? [])) {
    upgradeRemaining.set(id, (upgradeRemaining.get(id) ?? 0) + 1);
  }
  for (const id of cardIds) {
    let def = CARD_DEFS.find(d => d.definitionId === id);
    if (!def) continue;
    const remaining = upgradeRemaining.get(id) ?? 0;
    if (remaining > 0) {
      const upgrade = CARD_UPGRADES[id];
      if (upgrade) {
        // Deep-merge effect so base fields (e.g. damage:1) aren't wiped by the patch
        const mergedEffect = upgrade.patch.effect
          ? { ...def.effect, ...(upgrade.patch.effect as object) }
          : def.effect;
        def = { ...def, name: upgrade.upgradedName, ...upgrade.patch, effect: mergedEffect } as CardDef;
      }
      upgradeRemaining.set(id, remaining - 1);
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
