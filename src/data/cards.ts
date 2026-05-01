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
  /** Path under /public — drop a file here to override the effect-based fallback art */
  cardArt?: string;
}

export const CHARACTER_IDS = {
  napoleon:  "Napoleon",
  genghis:   "Genghis",
  daVinci:   "Da Vinci",
  leonidas:  "Leonidas",
  sunsin:    "Sun-sin",
  beethoven: "Beethoven",
  huang:     "Huang-chan",
  nelson:    "Nelson",
  hannibal:  "Hannibal",
  picasso:   "Picasso",
  teddy:     "Teddy",
  mansa:     "Mansa",
  velthar:    "Vel'thar",
  musashi:   "Musashi",
  cleopatra: "Cleopatra",
  tesla:     "Tesla",
  shaka:     "Shaka",
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
    effect: { range: 2, debuffType: 'poison', debuffMagnitude: 5, debuffDuration: 6 },
  },

  // ── Napoleon ──────────────────────────────────────────────────────────────────
  {
    definitionId: "napoleon_artillery_barrage",
    name: "Artillery Barrage",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "~78 damage at range 4.",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { powerMult: 1.3, range: 4 },
  },
  {
    definitionId: "napoleon_grande_armee",
    name: "Grande Armée",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "+15% Might AND Power to all allies for 2 turns. (No range limit.)",
    exclusiveTo: CHARACTER_IDS.napoleon,
    effect: { teamDmgPct: 15, turns: 2 },
  },
  {
    definitionId: "napoleon_final_salvo",
    name: "Final Salvo",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — 3 random hits of ~42 damage on enemies within range 4.",
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
    description: "~60 damage at range 3. Applies Bleed (~20 HP/turn for 2 turns).",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 1.2, range: 3, bleedMult: 0.4, debuffDuration: 2 },
  },
  {
    definitionId: "genghis_horde_tactics",
    name: "Horde Tactics",
    manaCost: 3,
    type: "attack",
    rarity: "rare",
    description: "All enemies in range 2 take ~28 × (enemy count) damage. More targets = bigger hit.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { scalingAoE: true, perEnemyMult: 0.55, range: 2 },
  },
  {
    definitionId: "genghis_riders_fury",
    name: "Rider's Fury",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — ~75 damage to all enemies on a line (range 5). Doubled if target below 40% HP.",
    exclusiveTo: CHARACTER_IDS.genghis,
    effect: { powerMult: 1.5, lineTarget: true, range: 5, executeDouble: true },
  },

  // ── Leonidas ─────────────────────────────────────────────────────────────────
  {
    definitionId: "leonidas_shield_bash",
    name: "Shield Bash",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "~77 damage at range 1. Applies Armor Break (−25% Defense for 2 turns). Grants Leonidas +20 Defense this turn.",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 1.6, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 2 },
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
    description: "ULTIMATE (Exhaust) — ~120 damage to target (range 3). Roots all adjacent enemies for 2 turns.",
    exclusiveTo: CHARACTER_IDS.leonidas,
    effect: { powerMult: 2.5, range: 3, aoeRooted: true },
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
    description: "Heal an ally within range 3 for ~50 HP.",
    exclusiveTo: CHARACTER_IDS.daVinci,
    effect: { healingMult: 1.0, range: 3 },
  },
  {
    definitionId: "davinci_vitruvian_guardian",
    name: "Vitruvian Guardian",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Summon a combat drone (≈90 HP, ~60 Might, ~30 Def). Stats scale with Power. Lasts until defeated.",
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
    description: "Sonic wave — ~39 damage to all enemies in a line up to range 3, pushes each 2 tiles back.",
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
    description: "ULTIMATE (Exhaust) — ~46 damage and stun all enemies within range 3 for 1 turn.",
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
    description: "Summon a random Terracotta Warrior on target hex within range 3. Archer (≈53 Might, range 2) or Melee (≈35 Might, range 1). HP 40, scales with stats. Lasts 2 turns.",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { summonTerracotta: true, range: 3, turns: 2 },
  },
  {
    definitionId: "huang_first_emperor",
    name: "First Emperor's Command",
    manaCost: 3,
    type: "buff",
    rarity: "rare",
    description: "Summon a Terracotta Cavalry (≈53 Might, ~38 Def, ≈55 Power, Move 3) on adjacent hex. HP 60, scales with stats. Lasts 2 turns. Gain 1 free Cavalry Charge card.",
    exclusiveTo: CHARACTER_IDS.huang,
    effect: { summonCavalry: true, range: 1, turns: 2 },
  },
  {
    definitionId: "huang_cavalry_charge",
    name: "Cavalry Charge",
    manaCost: 0,
    type: "attack",
    rarity: "rare",
    description: "FREE — Cavalry charges a target at range 3 for ~66 damage. (Appears after First Emperor's Command only.)",
    exclusiveTo: "Terracotta Cavalry",
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
    description: "Blind a target at range 3 — attack range reduced to 1 for 1 turn (basic attacks and abilities).",
    exclusiveTo: null,
    effect: { range: 3, debuffType: 'blinded', debuffMagnitude: 0, debuffDuration: 1 },
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
    manaCost: 2,
    type: "buff",
    rarity: "common",
    description: "This unit loses 20% of current HP. All allied units gain +15 Might and +15 Power until end of turn.",
    exclusiveTo: null,
    effect: { selfHpCostPct: 0.2, teamDmgFlat: 15, teamPowerFlat: 15 },
  },
  {
    definitionId: "shared_overcharge",
    name: "Overcharge",
    manaCost: 2,
    type: "buff",
    rarity: "rare",
    description: "The next card played this turn costs 0 Mana. (Still uses a card play.)",
    exclusiveTo: null,
    effect: { overcharge: true },
  },
  {
    definitionId: "shared_retribution",
    name: "Retribution",
    manaCost: 2,
    type: "attack",
    rarity: "uncommon",
    description: "Deal damage equal to HP lost this fight to one enemy. Range 3.",
    exclusiveTo: null,
    effect: { retributionMult: 1.0, range: 3 },
  },

  // ── Nelson ────────────────────────────────────────────────────────────────────
  {
    definitionId: "nelson_crossing_the_t",
    name: "Crossing the T",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Fire a line shot at range 5 — ~65 damage to the first target, ~40 to the second, ~26 to the third+. Damage falls off for each additional target.",
    exclusiveTo: CHARACTER_IDS.nelson,
    effect: { lineScaling: true, range: 5, powerMult: 1.0 },
  },
  {
    definitionId: "nelson_kiss_me_hardy",
    name: "Kiss Me Hardy",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Charge up to 4 hexes in a straight line. Each enemy in the path takes ~55 damage and is pushed sideways 1 hex.",
    exclusiveTo: CHARACTER_IDS.nelson,
    effect: { chargeLinePushSide: true, chargeDmgMult: 0.85, chargeDist: 4, range: 4 },
  },
  {
    definitionId: "nelson_trafalgar_square",
    name: "Trafalgar Square",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — ~130 damage to one target at range 4. If target dies, deal ~50 damage to all adjacent enemies.",
    exclusiveTo: CHARACTER_IDS.nelson,
    effect: { powerMult: 2.0, range: 4 },
  },

  // ── Hannibal ──────────────────────────────────────────────────────────────────
  {
    definitionId: "hannibal_alpine_march",
    name: "Alpine March",
    manaCost: 1,
    type: "movement",
    rarity: "rare",
    description: "Use before moving. Charge up to 6 hexes in a straight line — enemies in path take ~28 damage and are pushed sideways. Consumes all remaining movement.",
    exclusiveTo: CHARACTER_IDS.hannibal,
    effect: { chargeMove: true, chargeDist: 6, range: 6 },
  },
  {
    definitionId: "hannibal_double_envelopment",
    name: "Double Envelopment",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~55 damage to a target at range 3, then ~28 damage to all enemies adjacent to that target.",
    exclusiveTo: CHARACTER_IDS.hannibal,
    effect: { chargeAndPull: true, chargeAndPullHitMult: 1.1, chargeAndPullArrivalMult: 0.55, chargeAndPullArrivalRange: 1, range: 3 },
  },
  {
    definitionId: "hannibal_war_elephant",
    name: "War Elephant",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Summon a War Elephant on an adjacent hex. HP 120, Might 70, Defense 20, Move 2. Basic attacks only. Lasts 2 turns.",
    exclusiveTo: CHARACTER_IDS.hannibal,
    effect: { summonWarElephant: true, range: 1, turns: 2 },
  },

  // ── Picasso ───────────────────────────────────────────────────────────────────
  {
    definitionId: "picasso_guernica",
    name: "Guernica",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~70 damage to ALL enemies within range 2. Apply Armor Break (−25% Defense for 2 turns) to all hit.",
    exclusiveTo: CHARACTER_IDS.picasso,
    effect: { powerMult: 1.0, range: 2, allEnemiesInRange: true, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 2 },
  },
  {
    definitionId: "picasso_cubist_mirror",
    name: "Cubist Mirror",
    manaCost: 2,
    type: "movement",
    rarity: "rare",
    description: "Swap positions with a target within range 4. If the target is an enemy, deal ~35 damage on swap.",
    exclusiveTo: CHARACTER_IDS.picasso,
    effect: { swapEnemyAlly: true, range: 4, powerMult: 0.5 },
  },
  {
    definitionId: "picasso_blue_period",
    name: "Blue Period",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Teleport all units to random positions. Heal all allies for 60 HP and grant them +20 Defense until Picasso's next turn.",
    exclusiveTo: CHARACTER_IDS.picasso,
    effect: { scrambleAll: true, scrambleAllyDefBonus: 20, healing: 60 },
  },

  // ── Teddy ─────────────────────────────────────────────────────────────────────
  {
    definitionId: "teddy_speak_softly",
    name: "Speak Softly",
    manaCost: 2,
    type: "debuff",
    rarity: "rare",
    description: "All enemies within range 2 are Taunted — must target Teddy next turn. Teddy gains +30 Defense until her next turn.",
    exclusiveTo: CHARACTER_IDS.teddy,
    effect: { globalTauntRange: 2, defBonus: 30, range: 2 },
  },
  {
    definitionId: "teddy_big_stick",
    name: "Big Stick",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~87 Might damage at range 1. +50% bonus (~130) if target is Stunned or Taunted.",
    exclusiveTo: CHARACTER_IDS.teddy,
    effect: { damage: 1, damageType: 'atk', mightMult: 1.45, range: 1, executeVsDebuffed: true },
  },
  {
    definitionId: "teddy_rough_riders_rally",
    name: "Rough Riders' Rally",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — All allies gain +25 Might and +2 Movement this turn. Teddy gains +45 Might and teleports to any hex within range 5.",
    exclusiveTo: CHARACTER_IDS.teddy,
    effect: { teamDmgFlat: 25, moveBonus: 2, turns: 2, selfMightBonus: 45, selfTeleportAnywhere: 5 },
  },

  // ── Mansa ─────────────────────────────────────────────────────────────────────
  {
    definitionId: "mansa_salt_road",
    name: "Salt Road",
    manaCost: 1,
    type: "buff",
    rarity: "rare",
    description: "Place a 7-hex zone within range 3. Allied units starting their turn on the zone restore 1 Mana. Lasts 2 turns.",
    exclusiveTo: CHARACTER_IDS.mansa,
    effect: { manaZone: true, zoneDuration: 2, range: 3 },
  },
  {
    definitionId: "mansa_hajj_of_gold",
    name: "Hajj of Gold",
    manaCost: 2,
    type: "defense",
    rarity: "rare",
    description: "Heal all allies for 20% of their max HP. All allies gain +10 Power this turn.",
    exclusiveTo: CHARACTER_IDS.mansa,
    effect: { hajjOfGold: true, hajjHealPct: 0.2, teamPowerFlat: 10, turns: 2 },
  },
  {
    definitionId: "mansa_bounty",
    name: "Mansa's Bounty",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Golden Stasis: all units on the board (allies and enemies) are frozen in golden light and cannot act for 1 turn.",
    exclusiveTo: CHARACTER_IDS.mansa,
    effect: { mansaBounty: true },
  },

  // ── Vel'thar ───────────────────────────────────────────────────────────────────
  {
    definitionId: "velthar_void_lance",
    name: "Toba's Fury",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Melee strike for ~64 damage. At 2+ Bottleneck stacks: also applies Armor Break.",
    exclusiveTo: "Vel'thar",
    effect: { powerMult: 1.1, range: 1, armorBreakAtStacks: 2 },
  },
  {
    definitionId: "velthar_last_rites",
    name: "Last Ember",
    manaCost: 2,
    type: "buff",
    rarity: "rare",
    description: "If Bottleneck is active (≥1 stack): Vel'thar heals 25 HP and gains +15 Defense until next turn. Otherwise: deal ~50 damage to all enemies within range 2.",
    exclusiveTo: "Vel'thar",
    effect: { lastRites: true, selfHealIfLost: 25, selfDefenseIfLost: 15, powerMult: 1.0, range: 2 },
  },
  {
    definitionId: "velthar_singularity",
    name: "Humanity's Last Light",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Deal ~87 damage to all enemies within range 2. Vel'thar heals 30 HP. Bottleneck stacks amplify this via the Power boost already active.",
    exclusiveTo: "Vel'thar",
    effect: { humanitysLastLight: true, powerMult: 1.5, range: 2, selfHeal: 30 },
  },

  // ── Musashi ───────────────────────────────────────────────────────────────────
  {
    definitionId: "musashi_ichi_no_tachi",
    name: "Ichi no Tachi",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~36 damage at range 1. Places Duel on target (2 turns). If target is already Dueled: deal ~63 damage instead and apply Bleed.",
    exclusiveTo: "Musashi",
    effect: { powerMult: 0.8, range: 1, duelApply: true, duelPowerMult: 1.4, duelBleed: true },
  },
  {
    definitionId: "musashi_niten_ichi",
    name: "Niten Ichi-ryu",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Strike twice for ~32 each (~64 total) at range 1. Both hits apply Bleed. If target is Dueled: refresh Duel and deal ~22 splash to an adjacent enemy.",
    exclusiveTo: "Musashi",
    effect: { powerMult: 0.7, multiHit: 2, range: 1, bleedOnHit: true, duelRefresh: true, duelSplashMult: 0.5 },
  },
  {
    definitionId: "musashi_book_of_five",
    name: "Book of Five Rings",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Apply Duel to ALL enemies within range 2 (2 turns). Deal ~38 damage to each. For the rest of this round, Musashi's Duel damage bonus rises from +35% to +65%.",
    exclusiveTo: "Musashi",
    effect: { bookOfFiveRings: true, powerMult: 0.85, range: 2, applyDuelAll: true, duelBonusBoost: 65 },
  },

  // ── Cleopatra ─────────────────────────────────────────────────────────────────
  {
    definitionId: "cleo_asp_kiss",
    name: "Asp's Kiss",
    manaCost: 2,
    type: "debuff",
    rarity: "rare",
    description: "Deal ~46 damage at range 3. Reduce target's Power by 15 for 3 turns.",
    exclusiveTo: "Cleopatra",
    effect: { powerMult: 0.7, range: 3, powerReduction: 15, powerReductionDuration: 3 },
  },
  {
    definitionId: "cleo_royal_decree",
    name: "Royal Decree",
    manaCost: 2,
    type: "debuff",
    rarity: "rare",
    description: "Dual-use (range 3). Enemy: Charm for 1 turn (attacks nearest ally) + applies Poison. Ally: grant +20 Might and +10 Defense for 2 turns.",
    exclusiveTo: "Cleopatra",
    effect: { royalDecree: true, range: 3, charm: true, charmedApplyPoison: true, allyMightBonus: 20, allyDefBonus: 10, allyBuffTurns: 2 },
  },
  {
    definitionId: "cleo_eternal_kingdom",
    name: "Eternal Kingdom",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Apply Poison and Stun (1 turn) to ALL enemies within range 2. Cleopatra becomes Untouchable for 1 turn.",
    exclusiveTo: "Cleopatra",
    effect: { eternalKingdom: true, range: 2, debuffType: 'stunned', debuffDuration: 1, massPoison: true, untouchable: 1 },
  },

  // ── Tesla ─────────────────────────────────────────────────────────────────────
  {
    definitionId: "tesla_arc_bolt",
    name: "Arc Bolt",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~72 damage to target within range 3. At Voltage ≥ 3: chains to ALL adjacent enemies for ~40 each.",
    exclusiveTo: "Tesla",
    effect: { powerMult: 0.9, range: 3, chainAllAdjacent: true, chainThreshold: 3, chainPct: 0.5 },
  },
  {
    definitionId: "tesla_coil_surge",
    name: "Coil Surge",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Place a Tesla Coil zone on target tile (range 3). Enemies who start their turn on it receive −20 Defense and are Stunned 1 turn. Lasts 3 turns. Costs 1 Voltage stack.",
    exclusiveTo: "Tesla",
    effect: { coilZone: true, range: 3, coilDuration: 3, coilDefPenalty: 20, coilStun: true, voltageCost: 1 },
  },
  {
    definitionId: "tesla_death_ray",
    name: "Death Ray",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — Requires Voltage ≥ 1. Fire a beam (range 6) — first target takes ~40 per Voltage stack, each further target takes 50% of the previous. Consumes all Voltage.",
    exclusiveTo: "Tesla",
    effect: { deathRay: true, lineTarget: true, range: 6, voltageRequired: 1, voltagePerStackMult: 0.5, chainFalloffPct: 0.5 },
  },

  // ── Shaka ─────────────────────────────────────────────────────────────────────
  {
    definitionId: "shaka_the_horns",
    name: "The Horns",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Charge at target (up to 2 tiles). Deal ~24 damage. Enemy is knocked sideways (left or right of charge direction). Water: instant lethal. Mountain: Stun 1 turn instead.",
    exclusiveTo: "Shaka",
    effect: { chargeHorns: true, powerMult: 0.6, range: 2, chargePushSideways: true, waterKill: true, mountainStun: true },
  },
  {
    definitionId: "shaka_chest_strike",
    name: "Chest Strike",
    manaCost: 2,
    type: "attack",
    rarity: "rare",
    description: "Deal ~27 damage at range 1. Push target back 1 tile. Applies Armor Break.",
    exclusiveTo: "Shaka",
    effect: { powerMult: 0.7, range: 1, pushBack: 1, debuffType: 'armor_break', debuffMagnitude: 35, debuffDuration: 2 },
  },
  {
    definitionId: "shaka_impondo_zankomo",
    name: "Impondo Zankomo",
    manaCost: 3,
    type: "ultimate",
    rarity: "ultimate",
    description: "ULTIMATE (Exhaust) — War cry: deal ~62 damage to ALL adjacent enemies. All adjacent allies gain +35 Defense for 2 turns. Shaka gains +50 Defense for 2 turns.",
    exclusiveTo: "Shaka",
    effect: { impondo: true, powerMult: 1.5, aoeAdjacent: true, allyDefBonus: 35, allyDefTurns: 2, selfDefBonus: 50, selfDefTurns: 2 },
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
    description: "Pollutes your deck. No end-of-turn penalty — just dead space clogging your hand.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_malaise",
    name: "Malaise",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: each character takes 1 damage per unplayed card remaining in hand (including this).",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_void_echo",
    name: "Void Echo",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "If in hand at start of turn: −2 mana this turn.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_dread",
    name: "Dread",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: each character has a 25% chance to be Stunned next turn.",
    exclusiveTo: null,
    effect: {},
  },
  {
    definitionId: "curse_chains",
    name: "Chains of Znyxorga",
    manaCost: 0,
    type: "curse",
    rarity: "common",
    description: "End of turn: all characters take 10 damage. Every turn it stays in hand costs you.",
    exclusiveTo: null,
    effect: {},
  },
];

// ── Card art lookup ───────────────────────────────────────────────────────────
// Maps definitionId → /public path. Add one line here when a new card art drops in.
// Future cards: name the file <definitionId>.png and add it to this map.
const CARD_ART: Record<string, string> = {
  shared_basic_attack:        '/art/cards/attack.png',
  shared_shield:              '/art/cards/shield.png',
  shared_quick_move:          '/art/cards/movement.png',
  shared_mend:                '/art/cards/heal.png',
  shared_battle_cry:          '/art/cards/battle_cry.png',
  shared_gamble:              '/art/cards/gamble.png',
  shared_mud_throw:           '/art/cards/mud_throw.png',
  shared_armor_break:         '/art/cards/armor_break.png',
  shared_silence:             '/art/cards/silence.png',
  shared_poison_dart:         '/art/cards/poison_dart.png',
  davinci_flying_machine:     '/art/cards/flying_machine.png',
  davinci_vitruvian_guardian: '/art/cards/vitruvian_guardian.png',
  huang_terracotta_summon:    '/art/cards/terracotta_warrior.png',
  huang_cavalry_charge:       '/art/cards/terracotta_cavalry.png',
};

/** Returns the specific card art path for a definitionId, or undefined to use the type-based fallback. */
export function getCardArt(definitionId: string): string | undefined {
  return CARD_ART[definitionId];
}

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
    descriptionUpgrade: 'Multiplier 1.3× → 1.6×',
    patch: { description: '~94 damage at range 4.', effect: { powerMult: 1.6, range: 4 } },
  },
  napoleon_grande_armee: {
    upgradedName: 'Grande Armée+',
    descriptionUpgrade: '+15% → +30% team buff',
    patch: { description: '+30% Might AND Power to all allies for 2 turns. (No range limit.)', effect: { teamDmgPct: 30, turns: 2 } },
  },
  napoleon_final_salvo: {
    upgradedName: 'Final Salvo+',
    descriptionUpgrade: '3 hits → 5 hits',
    patch: { description: 'ULTIMATE (Exhaust) — 5 random hits of ~42 damage on enemies within range 4.', effect: { powerMult: 0.7, multiHit: 5, range: 4, randomTargets: true } },
  },
  // Genghis
  genghis_mongol_charge: {
    upgradedName: 'Mongol Charge+',
    descriptionUpgrade: 'Bleed ~20 → ~30 HP/turn',
    patch: { description: '~60 damage at range 3. Applies Bleed (~30 HP/turn for 2 turns).', effect: { powerMult: 1.2, range: 3, bleedMult: 0.6, debuffDuration: 2 } },
  },
  genghis_horde_tactics: {
    upgradedName: 'Horde Tactics+',
    descriptionUpgrade: 'Range 2 → 3',
    patch: { description: '~28 damage per enemy in range 3 — multiplies by enemy count. (Scales with Power)', effect: { scalingAoE: true, perEnemyMult: 0.55, range: 3 } },
  },
  genghis_riders_fury: {
    upgradedName: "Rider's Fury+",
    descriptionUpgrade: 'Line damage ~75 → ~100',
    patch: { description: 'ULTIMATE (Exhaust) — ~100 damage to all enemies on a line (range 5). Doubled if target below 40% HP.', effect: { powerMult: 2.0, lineTarget: true, range: 5, executeDouble: true } },
  },
  // Leonidas
  leonidas_shield_bash: {
    upgradedName: 'Shield Bash+',
    descriptionUpgrade: 'Damage ~77 → ~91, Armor Break 2t → 3t',
    patch: { description: '~91 damage at range 1. Applies Armor Break (−25% Defense for 3 turns). Grants Leonidas +20 Defense this turn.', effect: { powerMult: 1.9, range: 1, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 3 } },
  },
  leonidas_spartan_wall: {
    upgradedName: 'Spartan Wall+',
    descriptionUpgrade: '+20 → +30 Defense',
    patch: { description: '+30 Defense to Leonidas and all allies within range 2.', effect: { teamDefBuff: 30, range: 2 } },
  },
  leonidas_this_is_sparta: {
    upgradedName: 'THIS IS SPARTA!+',
    descriptionUpgrade: 'Damage ~120 → ~144',
    patch: { description: 'ULTIMATE (Exhaust) — ~144 damage to target (range 3). Roots all adjacent enemies for 2 turns.', effect: { powerMult: 3.0, range: 3, aoeRooted: true } },
  },
  // Da Vinci
  davinci_flying_machine: {
    upgradedName: 'Flying Machine+',
    descriptionUpgrade: 'After landing: draw 1 card and gain +20 Defense until end of turn',
    patch: { description: 'Teleport to any unoccupied hex on the board. On arrival, draw 1 card and gain +20 Defense until end of turn.', effect: { teleport: true, range: 999, onArrivalDraw: 1, onArrivalDef: 20 } },
  },
  davinci_masterpiece: {
    upgradedName: 'Masterpiece+',
    descriptionUpgrade: 'Heal ~50 → ~70 HP',
    patch: { description: 'Heal an ally within range 3 for ~70 HP. (Scales with Power)', effect: { healingMult: 1.4, range: 3 } },
  },
  davinci_vitruvian_guardian: {
    upgradedName: 'Vitruvian Guardian+',
    descriptionUpgrade: 'Drone: HP 75→90, Might 50→55, Defense 30→40',
    patch: { description: 'ULTIMATE (Exhaust) — Summon a combat drone: 90 HP, 55 Might, 40 Defense. Lasts until defeated. Stats scale with Power.', effect: { droneHpBonus: 15, droneMightBonus: 5, droneDefBonus: 10 } },
  },
  // Beethoven
  beethoven_schallwelle: {
    upgradedName: 'Schallwelle+',
    descriptionUpgrade: 'Damage ~39 → ~59, pushes 3 tiles',
    patch: { description: 'Sonic wave — ~59 damage to all enemies in a line up to range 3, pushes each 3 tiles back.', effect: { powerMult: 0.9, range: 3, lineTarget: true, pushback: 3 } },
  },
  beethoven_freudenspur: {
    upgradedName: 'Freudenspur+',
    descriptionUpgrade: 'Zone lasts 3 turns, +3 Movement',
    patch: { description: 'Target a tile within range 3 — that tile and all 6 adjacent tiles become a resonance zone. Allies entering zone tiles gain +3 Movement. Lasts 3 turns.', effect: { moveZone: true, moveBonus: 3, zoneDuration: 3, range: 3 } },
  },
  beethoven_gotterfunken: {
    upgradedName: 'Götterfunken+',
    descriptionUpgrade: 'Stun 1 → 2 turns',
    patch: { description: 'ULTIMATE (Exhaust) — ~46 damage and stun all enemies within range 3 for 2 turns.', effect: { range: 3, allEnemiesInRange: true, debuffType: 'stun', debuffDuration: 2, powerMult: 0.7 } },
  },
  // Yi Sun-sin
  sunsin_hwajeon: {
    upgradedName: 'Hwajeon+',
    descriptionUpgrade: 'Damage ~66 → ~83, pushes 2 tiles',
    patch: { description: 'Land: ~90 dmg at range 3, pushes target 2 tiles back. Water: ~90 dmg at range 1, pushes 2 tiles back.', effect: { powerMult: 1.5, range: 3, pushback: 2 } },
  },
  sunsin_naval_command: {
    upgradedName: 'Naval Repairs+',
    descriptionUpgrade: '15 HP/turn → 20 HP/turn',
    patch: { description: 'Land: Allies within range 2 heal 20 HP now and 20 HP next turn. Water: ~35 dmg to all enemies in range 3.', effect: { healZone: true, healPerTurn: 20, healDuration: 2, range: 2 } },
  },
  sunsin_chongtong: {
    upgradedName: 'Chongtong Barrage+',
    descriptionUpgrade: 'Damage ~110 → ~121',
    patch: { description: 'ULTIMATE (Exhaust) — Land: charge 3 hexes, ~66 dmg in path, push sideways. Water: ~99 dmg main target, ~48 dmg adjacents in range 5.', effect: { powerMult: 2.2, range: 5, allEnemiesInRange: true, lineCharge: true, chargeDist: 3, pushSide: true } },
  },
  // New shared cards
  shared_jump: {
    upgradedName: 'Jump+',
    descriptionUpgrade: 'After landing, move 1 additional step freely',
    patch: { description: 'Jump over one tile in a straight line, ignoring rivers and blocking units. After landing, take 1 free movement step.', effect: { jump: true, jumpRange: 2, jumpBonusMove: 1 } },
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
    descriptionUpgrade: 'HP cost 20% → 15%',
    patch: { description: 'This unit loses 15% of current HP. All allied units gain +15 Might and +15 Power until end of turn.', manaCost: 2, effect: { selfHpCostPct: 0.15, teamDmgFlat: 15, teamPowerFlat: 15 } },
  },
  shared_overcharge: {
    upgradedName: 'Overcharge+',
    descriptionUpgrade: 'Mana cost 2 → 1',
    patch: { description: 'The next card played this turn costs 0 Mana. (Still uses a card play.)', manaCost: 1, effect: { overcharge: true } },
  },
  shared_retribution: {
    upgradedName: 'Retribution+',
    descriptionUpgrade: 'Damage 100% → 130% of HP lost, applies Bleed',
    patch: { description: 'Deal 130% of HP lost this fight to one enemy. Apply Bleed (30% of damage dealt per turn, 2 turns). Range 3.', effect: { retributionMult: 1.3, retributionBleed: true, range: 3 } },
  },
  // Shared card upgrades
  shared_basic_attack: {
    upgradedName: 'Basic Attack+',
    descriptionUpgrade: 'Deal +25% bonus Might damage',
    patch: { description: 'Deal 25% bonus Might damage to a target in attack range.', effect: { damageType: 'atk', mightMult: 1.25 } },
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
    descriptionUpgrade: '1 → 2 turns Blinded',
    patch: { description: 'Blind target for 2 turns (attack range reduced to 1). Range 3.', effect: { range: 3, debuffType: 'blinded', debuffMagnitude: 0, debuffDuration: 2 } },
  },
  // Nelson
  nelson_crossing_the_t: {
    upgradedName: 'Crossing the T+',
    descriptionUpgrade: 'Fall-off 60%→80% (second target)',
    patch: { description: 'Line shot at range 5 — ~65 damage to first target, ~52 to second, ~33 to third+.', effect: { lineScaling: true, range: 5, powerMult: 1.0, crossingSecondMult: 0.8 } },
  },
  nelson_kiss_me_hardy: {
    upgradedName: 'Kiss Me Hardy+',
    descriptionUpgrade: 'Pushes enemies sideways 2 hexes',
    patch: { description: 'Charge up to 4 hexes. Each enemy in path takes ~55 damage and is pushed sideways 2 hexes.', effect: { chargeLinePushSide: true, chargeDmgMult: 0.85, chargeDist: 4, range: 4, chargeLinePushDist: 2 } },
  },
  nelson_trafalgar_square: {
    upgradedName: 'Trafalgar Square+',
    descriptionUpgrade: 'AoE kill explosion range 1→2',
    patch: { description: 'ULTIMATE (Exhaust) — ~130 damage to one target at range 4. If target dies, deal ~50 damage to all enemies within range 2.', effect: { powerMult: 2.0, range: 4, trafalgarKillAoeRange: 2 } },
  },
  // Hannibal
  hannibal_alpine_march: {
    upgradedName: 'Alpine March+',
    descriptionUpgrade: 'Charge distance 6→8, trample ~28 → ~39 damage',
    patch: { description: 'Use before moving. Charge up to 8 hexes — enemies in path take ~39 damage and are pushed sideways. Consumes all remaining movement.', effect: { chargeMove: true, chargeDist: 8, chargeTrampleMult: 0.7, range: 8 } },
  },
  hannibal_double_envelopment: {
    upgradedName: 'Double Envelopment+',
    descriptionUpgrade: 'Primary hit ×1.1→×1.4',
    patch: { description: 'Deal ~70 damage to a target at range 3, then ~28 damage to all adjacent enemies.', effect: { chargeAndPull: true, chargeAndPullHitMult: 1.4, chargeAndPullArrivalMult: 0.55, chargeAndPullArrivalRange: 1, range: 3 } },
  },
  hannibal_war_elephant: {
    upgradedName: 'War Elephant+',
    descriptionUpgrade: 'HP 120→150, Might 70→85',
    patch: { description: 'ULTIMATE (Exhaust) — Summon a War Elephant: HP 150, Might 85, Defense 20, Move 2. Lasts 2 turns.', effect: { summonWarElephant: true, range: 1, turns: 2, elephantHpBonus: 30, elephantMightBonus: 15 } },
  },
  // Picasso
  picasso_guernica: {
    upgradedName: 'Guernica+',
    descriptionUpgrade: 'Armor Break 2→3 turns',
    patch: { description: '~70 damage to ALL enemies in range 2. Armor Break (−25% Defense for 3 turns) to all hit.', effect: { powerMult: 1.0, range: 2, allEnemiesInRange: true, debuffType: 'armor_break', debuffMagnitude: 25, debuffDuration: 3 } },
  },
  picasso_cubist_mirror: {
    upgradedName: 'Cubist Mirror+',
    descriptionUpgrade: 'Swap damage ~35 → ~56',
    patch: { description: 'Swap positions with target within range 4. Enemy takes ~56 damage on swap.', effect: { swapEnemyAlly: true, range: 4, powerMult: 0.8 } },
  },
  picasso_blue_period: {
    upgradedName: 'Blue Period+',
    descriptionUpgrade: 'Heal 60→90 HP, +20→+30 Defense',
    patch: { description: 'ULTIMATE (Exhaust) — Scramble all units. Heal all allies for 90 HP and grant +30 Defense until next turn.', effect: { scrambleAll: true, scrambleAllyDefBonus: 30, healing: 90 } },
  },
  // Teddy
  teddy_speak_softly: {
    upgradedName: 'Speak Softly+',
    descriptionUpgrade: 'Taunt range 2→3',
    patch: { description: 'All enemies within range 3 are Taunted — must target Teddy next turn. Teddy gains +30 Defense until her next turn.', effect: { globalTauntRange: 3, defBonus: 30 } },
  },
  teddy_big_stick: {
    upgradedName: 'Big Stick+',
    descriptionUpgrade: 'Applies Stun 1 turn on hit',
    patch: { description: '~100 Might damage at range 1. +50% bonus (~150) vs Stunned or Taunted. Stuns target for 1 turn.', effect: { damage: 1, damageType: 'atk', mightMult: 1.65, range: 1, executeVsDebuffed: true, debuffType: 'stun', debuffDuration: 1, debuffMagnitude: 0 } },
  },
  teddy_rough_riders_rally: {
    upgradedName: "Rough Riders' Rally+",
    descriptionUpgrade: 'Allies +25→+35 Might, Teddy +45→+60 Might',
    patch: { description: 'ULTIMATE (Exhaust) — All allies gain +35 Might and +2 Movement for 2 turns. Teddy gains +60 Might and teleports to any hex within range 5.', effect: { teamDmgFlat: 35, moveBonus: 2, turns: 2, selfMightBonus: 60, selfTeleportAnywhere: 5 } },
  },
  // Mansa
  mansa_salt_road: {
    upgradedName: 'Salt Road+',
    descriptionUpgrade: 'Zone lasts 3 turns',
    patch: { description: 'Place a 7-hex zone within range 3. Allies starting their turn on the zone restore 1 Mana. Lasts 3 turns.', effect: { manaZone: true, zoneDuration: 3, range: 3 } },
  },
  mansa_hajj_of_gold: {
    upgradedName: 'Hajj of Gold+',
    descriptionUpgrade: 'Heal 20%→30% max HP',
    patch: { description: 'Heal all allies for 30% of their max HP. All allies gain +10 Power for 2 turns.', effect: { hajjOfGold: true, hajjHealPct: 0.3, teamPowerFlat: 10, turns: 2 } },
  },
  mansa_bounty: {
    upgradedName: "Mansa's Bounty+",
    descriptionUpgrade: 'Enemies frozen 2 turns instead of 1',
    patch: { description: 'ULTIMATE (Exhaust) — Golden Stasis+: allies are frozen 1 turn, enemies are frozen 2 turns.', effect: { mansaBounty: true, mansaBountyExtra: true } },
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
  // Vel'thar
  velthar_void_lance: {
    upgradedName: "Toba's Fury+",
    descriptionUpgrade: 'Power×1.1 → 1.4, Armor Break threshold 2+ → 1+ stack',
    patch: { description: "Melee strike for ~81 damage. At 1+ Bottleneck stack: also applies Armor Break.", effect: { powerMult: 1.4, range: 1, armorBreakAtStacks: 1 } },
  },
  velthar_last_rites: {
    upgradedName: 'Last Ember+',
    descriptionUpgrade: 'Heal 25 → 40 HP, Defense +15 → +25, AoE ×1.0 → ×1.3',
    patch: { description: "If Bottleneck is active (≥1 stack): Vel'thar heals 40 HP and gains +25 Defense until next turn. Otherwise: deal ~65 damage to all enemies within range 2.", effect: { lastRites: true, selfHealIfLost: 40, selfDefenseIfLost: 25, powerMult: 1.3, range: 2 } },
  },
  velthar_singularity: {
    upgradedName: "Humanity's Last Light+",
    descriptionUpgrade: 'Damage ×1.5 → ×2.0, heal 30 → 50 HP',
    patch: { description: "ULTIMATE (Exhaust) — Deal ~116 damage to all enemies within range 2. Vel'thar heals 50 HP. Bottleneck stacks amplify this via the Power boost already active.", effect: { humanitysLastLight: true, powerMult: 2.0, range: 2, selfHeal: 50 } },
  },
  // Musashi
  musashi_ichi_no_tachi: {
    upgradedName: 'Ichi no Tachi+',
    descriptionUpgrade: 'Base ×0.8 → ×1.0, Dueled version ×1.4 → ×1.75',
    patch: { description: 'Deal ~45 damage at range 1. Places Duel on target (2 turns). If target is already Dueled: deal ~79 damage instead and apply Bleed.', effect: { powerMult: 1.0, range: 1, duelApply: true, duelPowerMult: 1.75, duelBleed: true } },
  },
  musashi_niten_ichi: {
    upgradedName: 'Niten Ichi-ryu+',
    descriptionUpgrade: '×0.7 → ×0.9 per hit, splash ×0.5 → ×0.65',
    patch: { description: 'Strike twice for ~40 each (~81 total) at range 1. Both hits apply Bleed. If Dueled: refresh Duel and deal ~29 splash to an adjacent enemy.', effect: { powerMult: 0.9, multiHit: 2, range: 1, bleedOnHit: true, duelRefresh: true, duelSplashMult: 0.65 } },
  },
  musashi_book_of_five: {
    upgradedName: 'Book of Five Rings+',
    descriptionUpgrade: 'Damage ×0.85 → ×1.1, Duel bonus cap +65% → +80%',
    patch: { description: 'ULTIMATE (Exhaust) — Apply Duel to ALL enemies within range 2 (2 turns). Deal ~49 damage to each. For the rest of this round, Duel damage bonus rises to +80%.', effect: { bookOfFiveRings: true, powerMult: 1.1, range: 2, applyDuelAll: true, duelBonusBoost: 80 } },
  },
  // Cleopatra
  cleo_asp_kiss: {
    upgradedName: "Asp's Kiss+",
    descriptionUpgrade: 'Damage ×0.7 → ×0.9, Power reduction 15 → 20',
    patch: { description: "Deal ~59 damage at range 3. Reduce target's Power by 20 for 3 turns.", effect: { powerMult: 0.9, range: 3, powerReduction: 20, powerReductionDuration: 3 } },
  },
  cleo_royal_decree: {
    upgradedName: 'Royal Decree+',
    descriptionUpgrade: 'Ally buff +20/+10 → +30/+15 Might/Defense',
    patch: { description: 'Dual-use (range 3). Enemy: Charm for 1 turn + applies Poison. Ally: grant +30 Might and +15 Defense for 2 turns.', effect: { royalDecree: true, range: 3, charm: true, charmedApplyPoison: true, allyMightBonus: 30, allyDefBonus: 15, allyBuffTurns: 2 } },
  },
  cleo_eternal_kingdom: {
    upgradedName: 'Eternal Kingdom+',
    descriptionUpgrade: 'Stun 1t → 2t, Untouchable 1t → 2t',
    patch: { description: 'ULTIMATE (Exhaust) — Apply Poison and Stun (2 turns) to ALL enemies within range 2. Cleopatra becomes Untouchable for 2 turns.', effect: { eternalKingdom: true, range: 2, debuffType: 'stunned', debuffDuration: 2, massPoison: true, untouchable: 2 } },
  },
  // Tesla
  tesla_arc_bolt: {
    upgradedName: 'Arc Bolt+',
    descriptionUpgrade: '×0.9 → ×1.2 primary, chain ×0.5 → ×0.7',
    patch: { description: 'Deal ~96 damage to target within range 3. At Voltage ≥ 3: chains to ALL adjacent enemies for ~56 each.', effect: { powerMult: 1.2, range: 3, chainAllAdjacent: true, chainThreshold: 3, chainPct: 0.7 } },
  },
  tesla_coil_surge: {
    upgradedName: 'Coil Surge+',
    descriptionUpgrade: 'Coil lasts 3 → 4 turns, DEF penalty 20 → 25, no longer costs Voltage',
    patch: { description: 'Place a Tesla Coil zone on target tile (range 3). Enemies who start their turn on it receive −25 Defense and are Stunned 1 turn. Lasts 4 turns. No Voltage cost.', effect: { coilZone: true, range: 3, coilDuration: 4, coilDefPenalty: 25, coilStun: true, voltageCost: 0 } },
  },
  tesla_death_ray: {
    upgradedName: 'Death Ray+',
    descriptionUpgrade: 'Per-stack ×0.5 → ×0.6, max falloff chain unchanged',
    patch: { description: 'ULTIMATE (Exhaust) — Requires Voltage ≥ 1. Fire a beam (range 6) — first target takes ~48 per Voltage stack, each further target takes 50% of the previous. Consumes all Voltage.', effect: { deathRay: true, lineTarget: true, range: 6, voltageRequired: 1, voltagePerStackMult: 0.6, chainFalloffPct: 0.5 } },
  },
  // Shaka
  shaka_the_horns: {
    upgradedName: 'The Horns+',
    descriptionUpgrade: 'Damage ×0.6 → ×0.8, charge range 2 → 3',
    patch: { description: 'Charge at target (up to 3 tiles). Deal ~30 damage. Enemy knocked sideways. Water: instant lethal. Mountain: Stun 1 turn.', effect: { chargeHorns: true, powerMult: 0.8, range: 3, chargePushSideways: true, waterKill: true, mountainStun: true } },
  },
  shaka_chest_strike: {
    upgradedName: 'Chest Strike+',
    descriptionUpgrade: 'Damage ×0.7 → ×0.9, Armor Break unchanged',
    patch: { description: 'Deal ~34 damage at range 1. Push target back 1 tile. Applies Armor Break.', effect: { powerMult: 0.9, range: 1, pushBack: 1, debuffType: 'armor_break', debuffMagnitude: 35, debuffDuration: 2 } },
  },
  shaka_impondo_zankomo: {
    upgradedName: 'Impondo Zankomo+',
    descriptionUpgrade: 'Damage ×1.5 → ×1.8, ally DEF 35 → 45, Shaka DEF 50 → 65',
    patch: { description: 'ULTIMATE (Exhaust) — War cry: deal ~75 damage to ALL adjacent enemies. Adjacent allies gain +45 Defense for 2 turns. Shaka gains +65 Defense for 2 turns.', effect: { impondo: true, powerMult: 1.8, aoeAdjacent: true, allyDefBonus: 45, allyDefTurns: 2, selfDefBonus: 65, selfDefTurns: 2 } },
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
