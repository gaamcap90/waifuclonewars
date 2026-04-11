// src/data/roguelikeData.ts
import {
  RunNode, NodeType, EncounterDef, EnemyTemplate,
  RunItem, CardReward, CharacterRunState, EnemyAbilityDef,
} from "@/types/roguelike";
import { seededRng } from "@/utils/rng";

// ── Enemy Templates ───────────────────────────────────────────────────────────

export const ENEMIES: Record<string, EnemyTemplate> = {
  // Act 1 — alien fauna & low-tier gladiators
  glorp_shambler: {
    id: 'glorp_shambler', name: 'Glorp Shambler', icon: '🍄', count: 1,
    portrait: '/art/enemies/glorp_shambler_portrait.png',
    description: 'A lumbering heap of organic rot that leaves trails of toxic spores wherever it drags itself. Slow but relentless — anything caught in its wake starts dissolving.',
    stats: { hp: 60, maxHp: 60, might: 35, power: 25, defense: 8, moveRange: 2, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'spore_release', name: 'Spore Release', icon: '☁️', description: 'Releases toxic spores — applies Poison to all enemies within range 1.', cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'poison', magnitude: 5, duration: 99 } },
    ] as EnemyAbilityDef[],
  },
  zyx_skitter: {
    id: 'zyx_skitter', name: 'Zyx Skitter', icon: '🦟', count: 2,
    portrait: '/art/enemies/zyx_skitter_portrait.png',
    description: 'A hive-mind fragment given a body of jagged chitin and nervous energy. Where one Zyx appears, a dozen more are already behind you.',
    stats: { hp: 30, maxHp: 30, might: 22, power: 15, defense: 4, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'swarm_bite', name: 'Swarm Bite', icon: '🦟', description: 'Leaps onto the closest enemy and deals 20 damage to all enemies within range 1.', cooldown: 4, effect: { type: 'aoe_damage', range: 1, damage: 20 } },
    ] as EnemyAbilityDef[],
  },
  naxion_scout: {
    id: 'naxion_scout', name: 'Naxion Scout', icon: '👾', count: 1,
    portrait: '/art/enemies/naxion_scout_portrait.png',
    description: "A hired gun from the outer arena circuits. One burning eye, one plasma pistol — it never stops smiling because it knows it's faster than you.",
    stats: { hp: 70, maxHp: 70, might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'plasma_shot', name: 'Plasma Shot', icon: '⚡', description: 'Fires a concentrated plasma bolt dealing Power×1.2 damage to a single enemy within range 3.', cooldown: 3, effect: { type: 'aoe_damage', range: 3, multiplier: 1.2 } },
    ] as EnemyAbilityDef[],
  },
  vron_crawler: {
    id: 'vron_crawler', name: 'Vron Crawler', icon: '🦀', count: 1,
    portrait: '/art/enemies/vron_crawler_portrait.png',
    description: "A living fortress on six legs. Its layered shell makes frontal assaults nearly pointless — wait for it to expose its soft underbelly, or don't attack at all.",
    stats: { hp: 85, maxHp: 85, might: 28, power: 20, defense: 16, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
    abilities: [
      { id: 'shell_harden', name: 'Shell Harden', icon: '🐚', description: 'Retracts into armored shell — gains +18 Defense for 2 turns.', cooldown: 4, effect: { type: 'buff_self', defenseBonus: 18, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 1 elites
  krath_champion: {
    id: 'krath_champion', name: 'Krath Champion', icon: '⚔️', count: 1,
    portrait: '/art/enemies/krath_champion_portrait.png',
    description: "A seasoned Krath arena veteran decorated with the skulls of past opponents. Fights dirty, hard, and with a grin that says it's already killed better than you.",
    stats: { hp: 105, maxHp: 105, might: 55, power: 40, defense: 18, moveRange: 3, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'battle_rage', name: 'Battle Rage', icon: '🔥', description: 'Gains +25 Might and +10 Defense for 2 turns.', cooldown: 3, effect: { type: 'buff_self', mightBonus: 25, defenseBonus: 10, duration: 2 } },
      { id: 'champion_strike', name: "Champion's Strike", icon: '⚔️', description: 'Deals 1× Might damage to the nearest enemy within range 2.', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 1.0, singleTarget: true } },
    ] as EnemyAbilityDef[],
  },
  spore_cluster: {
    id: 'spore_cluster', name: 'Spore Node', icon: '🔴', count: 3,
    portrait: '/art/enemies/spore_node_portrait.png',
    description: "Three semi-sentient spore heads on a shared fungal body. Sluggish and barely mobile, but the toxic clouds they pump out will rot your armor off in minutes.",
    stats: { hp: 40, maxHp: 40, might: 20, power: 30, defense: 5, moveRange: 1, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'toxic_cloud', name: 'Toxic Cloud', icon: '☣️', description: 'Applies Poison to all enemies within range 2.', cooldown: 2, effect: { type: 'debuff_enemies', range: 2, debuffType: 'poison', magnitude: 5, duration: 99 } },
      { id: 'spore_burst', name: 'Spore Burst', icon: '💥', description: 'Deals 25 damage to all enemies in range 2.', cooldown: 2, effect: { type: 'aoe_damage', range: 2, damage: 25 } },
    ] as EnemyAbilityDef[],
  },
  // Act 1 starter — alien beast (first encounter only)
  vexlar: {
    id: 'vexlar', name: 'Vexlar', icon: '🐆', count: 2,
    portrait: '/art/enemies/vexlar_portrait.png',
    description: "Alien apex predators brought in for your opening round. Six-legged and iridescent, they hunt the weakest link with surgical instinct and terrifying speed.",
    stats: { hp: 80, maxHp: 80, might: 25, power: 30, defense: 30, moveRange: 3, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'predator_leap', name: 'Predator Leap', icon: '🐆', description: 'Launches at the enemy with the lowest Defense — leaps up to range 4 and delivers a savage basic attack on arrival.', cooldown: 3, effect: { type: 'dash_attack', dashRange: 4, multiplier: 1.0 } },
    ] as EnemyAbilityDef[],
  },
  // Act 1 boss
  iron_wall: {
    id: 'iron_wall', name: 'Iron Wall', icon: '🤖', count: 1,
    portrait: '/art/enemies/iron_wall_portrait.png',
    description: "The Act I gatekeeper — a hulking war mech that heals when wounded, blankets the field with EMP blasts, and becomes an impenetrable turret when cornered. Raw damage alone won't crack it.",
    stats: { hp: 200, maxHp: 200, might: 60, power: 50, defense: 35, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
    abilities: [
      { id: 'shield_array', name: 'Shield Array', icon: '🛡️', description: 'Heals self for 50 HP. Triggers once when below 50% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.5, effect: { type: 'heal_self', amount: 50 } },
      { id: 'emp_blast', name: 'EMP Blast', icon: '⚡', description: 'Deals 40 damage to all enemies within range 1, and silences them for 1 turn.', cooldown: 3, effect: { type: 'aoe_damage', range: 1, damage: 40 } },
      { id: 'turret_mode', name: 'Turret Mode', icon: '🤖', description: 'Gains +40 Defense for 2 turns.', cooldown: 4, effect: { type: 'buff_self', defenseBonus: 40, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 enemies
  mog_toxin: {
    id: 'mog_toxin', name: 'Mog Toxin', icon: '☣️', count: 1,
    portrait: '/art/enemies/mog_toxin_portrait.png',
    description: 'A bloated sack of corrosive biology that hasn\'t stopped smiling since it learned what fear tastes like. Every tentacle drips acid; every grin means someone\'s armor is already melting.',
    stats: { hp: 75, maxHp: 75, might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'acid_spray', name: 'Acid Spray', icon: '🧪', description: 'Launches a corrosive burst — applies Armor Break (−20% DEF) to all enemies within range 1 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'armor_break', magnitude: 20, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  qrix_hunter: {
    id: 'qrix_hunter', name: 'Qrix Hunter', icon: '🏹', count: 1,
    portrait: '/art/enemies/qrix_hunter_portrait.png',
    description: 'A cold-blooded Qrix assassin born to hunt. Its shifting camouflage makes it nearly invisible until the trigger is pulled — and it never misses twice.',
    stats: { hp: 70, maxHp: 70, might: 25, power: 50, defense: 8, moveRange: 3, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'pinning_shot', name: 'Pinning Shot', icon: '📌', description: 'Fires a precision bolt at the closest target — deals Power×1.4 damage to enemies within range 3.', cooldown: 3, effect: { type: 'aoe_damage', range: 3, multiplier: 1.4, singleTarget: true } },
    ] as EnemyAbilityDef[],
  },
  void_wraith: {
    id: 'void_wraith', name: 'Void Wraith', icon: '👻', count: 1,
    portrait: '/art/enemies/void_wraith_portrait.png',
    description: 'A remnant of something that should no longer exist. It phases through walls and armor alike, drawn to the warmth of the living like a moth to flame. Only pain can make it corporeal.',
    stats: { hp: 65, maxHp: 65, might: 45, power: 40, defense: 5, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'shadow_step', name: 'Shadow Step', icon: '🌑', description: 'Phases through reality — teleports adjacent to the closest enemy and strikes for 1× Might (DEF applies).', cooldown: 3, effect: { type: 'dash_attack', dashRange: 5, multiplier: 1.0 } },
    ] as EnemyAbilityDef[],
  },
  krath_berserker: {
    id: 'krath_berserker', name: 'Krath Berserker', icon: '💢', count: 1,
    portrait: '/art/enemies/krath_berserker_portrait.png',
    description: 'A Krath warrior who has abandoned all sense of self-preservation. Four bladed arms moving faster than the eye can follow. It doesn\'t fight to win — it fights until nothing is left standing.',
    stats: { hp: 140, maxHp: 140, might: 60, power: 55, defense: 14, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'bloodrage', name: 'Bloodrage', icon: '💢', description: 'Gains +25 Might for 2 turns (but loses 20 Defense).', cooldown: 3, effect: { type: 'buff_self', mightBonus: 25, defenseBonus: -20, duration: 2 } },
      { id: 'savage_leap', name: 'Savage Leap', icon: '🦘', description: 'Teleports adjacent to the closest enemy and deals 1.5× Might damage on arrival (DEF applies).', cooldown: 2, effect: { type: 'dash_attack', dashRange: 5, multiplier: 1.5 } },
    ] as EnemyAbilityDef[],
  },
  phasewarden: {
    id: 'phasewarden', name: 'Phasewarden', icon: '🔮', count: 1,
    portrait: '/art/enemies/phasewarden_portrait.png',
    description: "A guardian from between dimensions — its crystalline armor flickers between planes of existence. It blinks away, strips your defenses, then closes in when you're most exposed.",
    stats: { hp: 110, maxHp: 110, might: 55, power: 65, defense: 20, moveRange: 4, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'dimensional_drain', name: 'Dimensional Drain', icon: '🔮', description: 'Applies Armor Break (−20% Defense) to all enemies within range 2 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'armor_break', magnitude: 20, duration: 2 } },
      { id: 'phase_blink', name: 'Phase Blink', icon: '✨', description: 'Teleports to a position far from all enemies, then attacks the closest from range.', cooldown: 2, effect: { type: 'dash_attack', dashRange: 6, multiplier: 1.2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 boss
  twin_terror_a: {
    id: 'twin_terror_a', name: 'Terror Alpha', icon: '🗡️', count: 1,
    portrait: '/art/enemies/terror_alpha_portrait.png',
    description: "The aggressive half of the Twin Terror duo. Built for raw speed and kinetic impact — charges at full sprint and hits like a missile. Kill it first or it will never stop coming.",
    stats: { hp: 160, maxHp: 160, might: 70, power: 55, defense: 20, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'alpha_rush', name: 'Alpha Rush', icon: '🗡️', description: 'Charges 4 hexes and deals 1.8× Might damage on impact.', cooldown: 2, effect: { type: 'dash_attack', dashRange: 4, multiplier: 1.8 } },
      { id: 'twin_fury', name: 'Twin Fury', icon: '🔥', description: 'Gains +30 Might for 2 turns.', cooldown: 3, effect: { type: 'buff_self', mightBonus: 30, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  twin_terror_b: {
    id: 'twin_terror_b', name: 'Terror Beta', icon: '🛡️', count: 1,
    portrait: '/art/enemies/terror_beta_portrait.png',
    description: "The defensive half of the Twin Terror. Absorbs punishment while Alpha creates chaos, then heals itself when nearly dead. Ignore it and Beta becomes unkillable.",
    stats: { hp: 160, maxHp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 },
    ai: 'defensive',
    abilities: [
      { id: 'aegis_heal', name: 'Aegis Heal', icon: '💚', description: 'Heals self for 65 HP. Triggers once when below 40% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.4, effect: { type: 'heal_self', amount: 65 } },
      { id: 'mirror_aegis', name: 'Mirror Aegis', icon: '🛡️', description: 'Gains +35 Defense for 2 turns.', cooldown: 3, effect: { type: 'buff_self', defenseBonus: 35, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 3 boss
  znyxorga_champion: {
    id: 'znyxorga_champion', name: "Znyxorga's Champion", icon: '👑', count: 1,
    portrait: '/art/enemies/znyxorgas_champion_portrait.png',
    description: "Znyxorga's ultimate weapon — four arms, six eyes, 450 HP, and the patience of a god. It will annihilate your whole team simultaneously and grow stronger the closer it gets to death.",
    stats: { hp: 450, maxHp: 450, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 },
    ai: 'berserker',
    abilities: [
      { id: 'arena_collapse', name: 'Arena Collapse', icon: '👑', description: 'The arena itself becomes a weapon — deals 55 damage to ALL player characters simultaneously.', cooldown: 3, effect: { type: 'damage_all_enemies', damage: 55 } },
      { id: 'phase_shift', name: 'Phase Shift', icon: '🛡️', description: 'Becomes invincible for 2 turns and gains +15 Might, +15 Power, and +15 Defense permanently. Triggers ONCE when below 50% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.5, effect: { type: 'buff_self', mightBonus: 15, defenseBonus: 500, duration: 2 } },
      { id: 'champions_will', name: "Champion's Will", icon: '⭐', description: 'Driven by Znyxorga\'s will — gains +20 Might, +20 Power, and +20 Defense permanently. Triggers ONCE when below 30% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.30, effect: { type: 'buff_self', mightBonus: 20, defenseBonus: 20, duration: 999 } },
      { id: 'tyrant_strike', name: 'Tyrant Strike', icon: '💥', description: 'Channels Power into a devastating strike — deals Power×1.3 damage to all enemies within range 2.', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 1.3 } },
    ] as EnemyAbilityDef[],
  },
  // ── New Enemies ────────────────────────────────────────────────────────────
  // Act 1 Elite
  naxion_shieldbearer: {
    id: 'naxion_shieldbearer', name: 'Naxion Shieldbearer', icon: '🛡️', count: 1,
    portrait: '/art/enemies/naxion_shieldbearer_portrait.png',
    description: "A walking fortress in the shape of a soldier. The Naxion Shieldbearer absorbs everything you throw at it and hits back twice as hard — and if you think its allies are safe, you're wrong.",
    stats: { hp: 115, maxHp: 115, might: 45, power: 30, defense: 35, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
    abilities: [
      { id: 'shield_slam', name: 'Shield Slam', icon: '🛡️', description: 'Crashes its shield into a target — deals 1.4× Might damage and Roots the target for 1 turn.', cooldown: 2, effect: { type: 'melee_debuff', multiplier: 1.4, debuffType: 'rooted', magnitude: 0, duration: 1 } },
      { id: 'rally_cry', name: 'Rally Cry', icon: '📣', description: 'Braces for impact — gains +25 Defense for 2 turns.', cooldown: 3, effect: { type: 'buff_self', defenseBonus: 25, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 Elite
  grox_magnetar: {
    id: 'grox_magnetar', name: 'Grox Magnetar', icon: '🧲', count: 1,
    portrait: '/art/enemies/grox_magnetar_portrait.png',
    description: "A living electromagnetic anomaly — the Grox Magnetar bends metal, reroutes energy, and silences technology with a thought. It doesn't fight in straight lines; it reshapes the battlefield to make sure nothing else does either.",
    stats: { hp: 130, maxHp: 130, might: 50, power: 70, defense: 25, moveRange: 3, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'magnetic_pull', name: 'Magnetic Pull', icon: '🧲', description: 'Yanks a target 2 hexes closer then deals Power×0.8 damage. Range 3.', cooldown: 2, effect: { type: 'pull_attack', pullRange: 2, range: 3, multiplier: 0.8 } },
      { id: 'emp_surge', name: 'EMP Surge', icon: '⚡', description: 'Releases an electromagnetic pulse — Silences all enemies within range 1 for 1 turn (Power reduced to 0).', cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'silence', magnitude: 0, duration: 1 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 Common
  vrex_mimic: {
    id: 'vrex_mimic', name: 'Vrex Mimic', icon: '🎭', count: 1,
    portrait: '/art/enemies/vrex_mimic_portrait.png',
    description: "Nobody knows what a Vrex Mimic actually looks like — it never stops wearing someone else's face. Adapts its form mid-fight, copying the threat in front of it with unnerving precision.",
    stats: { hp: 90, maxHp: 90, might: 40, power: 40, defense: 15, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'imitate', name: 'Imitate', icon: '🎭', description: 'Mimics the closest enemy — gains their Might and Power values until end of turn, then strikes for 1.2× Might.', cooldown: 2, effect: { type: 'copy_attack', multiplier: 1.2 } },
      { id: 'disorienting_shift', name: 'Disorienting Shift', icon: '🌀', description: 'Shifts form erratically — Roots the target for 1 turn. Range 2.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'rooted', magnitude: 0, duration: 1 } },
    ] as EnemyAbilityDef[],
  },
  // Act 3 Common
  crystalline_hive: {
    id: 'crystalline_hive', name: 'Crystalline Hive', icon: '💎', count: 1,
    portrait: '/art/enemies/crystalline_hive_portrait.png',
    description: "A collective organism grown from shattered crystal — the Hive doesn't think so much as resonate. Its shards fragment in every direction and the longer it stays alive, the more the air itself cuts you.",
    stats: { hp: 85, maxHp: 85, might: 35, power: 60, defense: 20, moveRange: 2, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'crystal_burst', name: 'Crystal Burst', icon: '💎', description: 'Erupts in razor shards — deals Power×1.2 to all enemies within range 2.', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 1.2 } },
      { id: 'resonance_field', name: 'Resonance Field', icon: '🔶', description: 'Harmonic vibrations weaken armor — applies Armor Break (−15% DEF) to all enemies within range 2 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'armor_break', magnitude: 15, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
};

// ── Item Pool ─────────────────────────────────────────────────────────────────

export const ITEMS: RunItem[] = [
  // COMMON
  { id: 'iron_gauntlets', name: 'Iron Gauntlets', icon: '🥊', tier: 'common',
    description: '+10 Might for this run.',
    statBonus: { might: 10 } },
  { id: 'bone_plate', name: 'Bone Plate', icon: '🦴', tier: 'common',
    description: '+5 Defense for this run.',
    statBonus: { defense: 5 } },
  { id: 'vitality_shard', name: 'Vitality Shard', icon: '💠', tier: 'common',
    description: '+25 max HP for this run.',
    statBonus: { hp: 25 } },
  { id: 'mana_conduit', name: 'Mana Conduit', icon: '🔋', tier: 'common',
    description: '+10 Power for this run.',
    statBonus: { power: 10 } },
  // UNCOMMON
  { id: 'battle_drum', name: 'Battle Drum', icon: '🥁', tier: 'uncommon',
    description: 'After killing an enemy, draw 2 cards.',
    passiveTag: 'draw_2_on_kill' },
  { id: 'arena_medkit', name: 'Arena Medkit', icon: '💊', tier: 'uncommon',
    description: 'Heal 25 HP at the start of your turn if below 40% HP.',
    passiveTag: 'regen_low_hp' },
  { id: 'void_shard', name: 'Void Shard', icon: '🔥', tier: 'uncommon',
    description: 'Basic attacks deal +10 bonus damage.',
    passiveTag: 'atk_bonus_10', statBonus: { might: 10 } },
  { id: 'card_satchel', name: 'Card Satchel', icon: '🎒', tier: 'uncommon',
    description: '+1 starting hand size for this run.',
    passiveTag: 'hand_size_plus_1' },
  { id: 'quick_boots', name: 'Quick Boots', icon: '👟', tier: 'uncommon',
    description: '+1 movement range permanently.',
    passiveTag: 'move_plus_1' },
  { id: 'soul_ember', name: 'Soul Ember', icon: '🕯️', tier: 'uncommon',
    description: 'On kill, restore 15 HP to this character.',
    passiveTag: 'on_kill_heal_15' },
  { id: 'war_trophy', name: 'War Trophy', icon: '💀', tier: 'uncommon',
    description: 'On kill, permanently gain +3 Might and +3 Power for the rest of the run.',
    passiveTag: 'on_kill_might_power_plus3' },
  // RARE — general
  { id: 'alien_core', name: 'Alien Core', icon: '🧬', tier: 'rare',
    description: 'All ability damage dealt by this character is increased by 25%.',
    passiveTag: 'ability_power_25pct' },
  { id: 'gladiator_brand', name: "Gladiator's Brand", icon: '⚡', tier: 'rare',
    description: 'First ability each fight costs 0 Mana.',
    passiveTag: 'first_ability_free' },
  { id: 'strategists_case', name: "Strategist's Case", icon: '💼', tier: 'rare',
    description: '+2 starting hand size for this run.',
    passiveTag: 'hand_size_plus_2' },
  { id: 'diamond_shell', name: 'Diamond Shell', icon: '💎', tier: 'rare',
    description: 'The first attack that deals damage to this character each fight is negated (deals 0 damage).',
    passiveTag: 'negate_first_hit' },
  // RARE — Napoleon
  { id: 'grand_strategy', name: 'Grand Strategy', icon: '🗺️', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Artillery Barrage hits an additional adjacent target.',
    passiveTag: 'napoleon_barrage_splash' },
  { id: 'emperors_coat', name: "Emperor's Coat", icon: '🪖', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Grande Armée also grants +30% Might & Power and restores 1 Mana to each buffed ally.',
    passiveTag: 'napoleon_armee_mana' },
  // RARE — Genghis
  { id: 'eternal_hunger', name: 'Eternal Hunger', icon: '🩸', tier: 'rare',
    targetCharacter: 'genghis',
    description: 'Bloodlust kill stacks carry over between fights for the entire run.',
    passiveTag: 'genghis_bloodlust_persist' },
  { id: 'khans_seal', name: "Khan's Seal", icon: '🏹', tier: 'rare',
    targetCharacter: 'genghis',
    description: "Rider's Fury also stuns each hit enemy for 1 turn.",
    passiveTag: 'genghis_fury_stun' },
  // RARE — Da Vinci
  { id: 'aerial_lens', name: 'Aerial Lens', icon: '🔭', tier: 'rare',
    targetCharacter: 'davinci',
    description: 'Flying Machine can swap position with an allied unit.',
    passiveTag: 'davinci_machine_swap' },
  { id: 'life_formula', name: 'Life Formula', icon: '💚', tier: 'rare',
    targetCharacter: 'davinci',
    description: 'Masterpiece heals an additional 25 HP.',
    passiveTag: 'davinci_masterpiece_plus25' },
  // RARE — Leonidas
  { id: 'spartan_shield', name: 'Spartan Shield', icon: '🛡️', tier: 'rare',
    targetCharacter: 'leonidas',
    description: 'Shield Bash also pushes the target back 1 hex and STUNS for 1 turn (stunned unit cannot move, attack, or use abilities).',
    passiveTag: 'leonidas_bash_push_stun' },
  { id: 'phalanx_oath', name: 'Phalanx Oath', icon: '🏛️', tier: 'rare',
    targetCharacter: 'leonidas',
    description: 'Spartan Wall range increased by 1 and DEF bonus increased to +30.',
    passiveTag: 'leonidas_wall_plus' },
  // RARE — Sun-sin
  { id: 'turtle_hull', name: 'Turtle Hull', icon: '🐢', tier: 'rare',
    targetCharacter: 'sunsin',
    description: 'Yi Sun-sin takes 20% less damage from all sources.',
    passiveTag: 'sunsin_dmg_reduce_20pct' },
  { id: 'admirals_banner', name: "Admiral's Banner", icon: '⛵', tier: 'rare',
    targetCharacter: 'sunsin',
    description: 'Naval Repairs / Broadside also grants all nearby allies +30 DEF for 1 turn.',
    passiveTag: 'sunsin_naval_def_aura' },
  // RARE — Beethoven
  { id: 'resonant_crystal', name: 'Resonant Crystal', icon: '🔮', tier: 'rare',
    targetCharacter: 'beethoven',
    description: 'Götterfunken stuns all hit enemies for 2 turns instead of 1.',
    passiveTag: 'beethoven_gotterfunken_stun2' },
  { id: 'composers_baton', name: "Composer's Baton", icon: '🎼', tier: 'rare',
    targetCharacter: 'beethoven',
    description: 'Allies standing on a Freudenspur zone also gain +5 Defense at turn start.',
    passiveTag: 'beethoven_freud_def5' },
  // RARE — Huang-chan
  { id: 'dragon_kiln', name: 'Dragon Kiln', icon: '🏺', tier: 'rare',
    targetCharacter: 'huang',
    description: 'Terracotta units are summoned with +20 HP and +10 Might.',
    passiveTag: 'huang_terra_buff' },
  { id: 'iron_edict', name: 'Iron Edict', icon: '📜', tier: 'rare',
    targetCharacter: 'huang',
    description: 'Eternal Army lasts 3 turns instead of 2.',
    passiveTag: 'huang_control_extend' },
  // LEGENDARY
  { id: 'znyxorgas_eye', name: "Znyxorga's Eye", icon: '👁️', tier: 'legendary',
    description: 'After defeating an enemy, your next 2 cards cost 0 Mana.',
    passiveTag: 'next_2_cards_free_on_kill' },
  { id: 'void_armor', name: 'Void Armor', icon: '🛡️', tier: 'legendary',
    description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.',
    passiveTag: 'once_survive_lethal' },
  { id: 'arena_champion', name: 'Arena Champion', icon: '🏆', tier: 'legendary',
    description: 'All stats +10 while this character is alive.',
    statBonus: { hp: 10, might: 10, power: 10, defense: 10 } },
  { id: 'warlords_grimoire', name: "Warlord's Grimoire", icon: '📖', tier: 'legendary',
    description: 'On turns 2 and 3 of each fight, draw +2 cards and gain +2 Mana.',
    passiveTag: 'grimoire_early_surge' },
  { id: 'battle_drill', name: 'Battle Drill', icon: '⚔️', tier: 'uncommon',
    description: 'At the start of each turn, add a free Basic Attack card to your hand.',
    passiveTag: 'free_basic_each_turn' },
  { id: 'mana_crystal', name: 'Mana Crystal', icon: '🔷', tier: 'rare',
    description: 'Gain +1 Mana at the start of each turn.',
    passiveTag: 'mana_plus_1_per_turn' },
];

// ── Card Reward Pool ──────────────────────────────────────────────────────────
//
// Rarity tiers control when cards can appear as rewards:
//   common   — normal fights, elite, boss, merchant
//   uncommon — normal fights, elite, boss, merchant
//   rare     — elite fights, boss, merchant only (no normal-fight drops)
//   ultimate — elite fights (40% chance one slot), boss (guaranteed ≥1)

export const CARD_REWARD_POOL: CardReward[] = [
  // ── Common shared ─────────────────────────────────────────────────────────
  { definitionId: 'shared_basic_attack', name: 'Basic Attack',   icon: '⚔️', manaCost: 1, rarity: 'common',   description: 'Do a basic attack.' },
  { definitionId: 'shared_shield',       name: 'Shields Up',     icon: '🛡️', manaCost: 1, rarity: 'common',   description: 'Gain +10 DEF until your next turn.' },
  { definitionId: 'shared_mend',         name: 'Mend',           icon: '💚', manaCost: 1, rarity: 'common',   description: 'Restore 20 HP to yourself.' },
  { definitionId: 'shared_battle_cry',   name: 'Battle Cry',     icon: '📣', manaCost: 1, rarity: 'common',   description: '+10 Might this turn.' },
  { definitionId: 'shared_quick_move',   name: 'Quick Move',     icon: '🏃', manaCost: 1, rarity: 'common',   description: '+2 movement this turn.' },
  { definitionId: 'shared_gamble',       name: 'Gamble',         icon: '🎲', manaCost: 1, rarity: 'common',   description: 'Discard 2 cards, draw 2 new ones.' },
  { definitionId: 'shared_mud_throw',    name: 'Mud Throw',      icon: '🪣', manaCost: 1, rarity: 'common',   description: 'Slow target — movement −1 for 2 turns. Range 3.' },
  { definitionId: 'shared_jump',         name: 'Jump',           icon: '🦘', manaCost: 1, rarity: 'common',   description: 'Jump over 1 tile, ignoring rivers and blocking units.' },
  { definitionId: 'shared_flash_bang',   name: 'Flash Bang',     icon: '💥', manaCost: 1, rarity: 'common',   description: 'Blind target at range 3 — attack range reduced to 1 for 2 turns.' },
  // ── Uncommon shared ───────────────────────────────────────────────────────
  { definitionId: 'shared_entangle',        name: 'Entangle',         icon: '🌿', manaCost: 2, rarity: 'uncommon', description: 'Root target enemy — cannot move for 2 turns. Range 2.' },
  { definitionId: 'shared_armor_break',     name: 'Armor Break',      icon: '🔨', manaCost: 2, rarity: 'uncommon', description: 'Target enemy loses 25% Defense for 2 turns. Range 2.' },
  { definitionId: 'shared_silence',         name: 'Silence',          icon: '🔇', manaCost: 3, rarity: 'uncommon', description: 'Target Power drops to 0 for 2 turns. Range 1.' },
  { definitionId: 'shared_poison_dart',     name: 'Poison Dart',      icon: '☠️', manaCost: 3, rarity: 'uncommon', description: 'Apply Poison — target loses Might/DEF each turn. Range 2.' },
  { definitionId: 'shared_suppressive_fire',name: 'Suppressive Fire', icon: '🔫', manaCost: 2, rarity: 'uncommon', description: 'Might×0.3 cone (3 wide, range 3) + Slow −1 move for 1 turn.' },
  { definitionId: 'shared_fortify',         name: 'Fortify',          icon: '🏰', manaCost: 2, rarity: 'uncommon', description: 'Cannot move this turn. +25 DEF, +15 Might until end of next turn.' },
  { definitionId: 'shared_taunt',           name: 'Taunt',            icon: '😤', manaCost: 2, rarity: 'uncommon', description: 'Enemy AI focuses this unit 2 turns. This unit gains +15 Defense.' },
  { definitionId: 'shared_decoy',           name: 'Decoy',            icon: '🎭', manaCost: 2, rarity: 'uncommon', description: 'Place a 30 HP decoy. Enemies target it. Explodes for 20 dmg when destroyed.' },
  // ── Rare shared ───────────────────────────────────────────────────────────
  { definitionId: 'shared_blood_price', name: 'Blood Price', icon: '🩸', manaCost: 3, rarity: 'rare', description: 'Lose 20% HP. All allies gain +15 Might and +15 Power this turn.' },
  // ── Rare — Napoleon ───────────────────────────────────────────────────────
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, rarity: 'rare', description: 'Power×1.3 dmg at range 4.', exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, rarity: 'rare', description: '+20% Might & Power to all allies for 2 turns.', exclusiveTo: 'Napoleon' },
  // ── Ultimate — Napoleon ───────────────────────────────────────────────────
  { definitionId: 'napoleon_final_salvo', name: 'Final Salvo', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — 3 shots each dealing Power×0.7 to random enemies. Range 4.', exclusiveTo: 'Napoleon' },
  // ── Rare — Genghis ────────────────────────────────────────────────────────
  { definitionId: 'genghis_mongol_charge', name: 'Mongol Charge', icon: '⚡', manaCost: 2, rarity: 'rare', description: 'Power×1.2 dmg at range 3. Applies Bleed (2 turns).', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics', name: 'Horde Tactics', icon: '🌀', manaCost: 3, rarity: 'rare', description: 'Power×0.6 per enemy in range — hits all enemies in range 2.', exclusiveTo: 'Genghis' },
  // ── Ultimate — Genghis ────────────────────────────────────────────────────
  { definitionId: 'genghis_riders_fury', name: "Rider's Fury", icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Power×1.0 to all enemies on a line, range 5. Doubled if target <40% HP.', exclusiveTo: 'Genghis' },
  // ── Rare — Da Vinci ───────────────────────────────────────────────────────
  { definitionId: 'davinci_flying_machine', name: 'Flying Machine', icon: '✈️', manaCost: 2, rarity: 'rare', description: 'Teleport to any unoccupied hex on the board.', exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',    name: 'Masterpiece',    icon: '💚', manaCost: 3, rarity: 'rare', description: 'Heal an ally for Power×1.2 HP. Removes Poison. Range 3.', exclusiveTo: 'Da Vinci' },
  // ── Ultimate — Da Vinci ───────────────────────────────────────────────────
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Summon a combat drone (HP 75, Might 50, DEF 30). Lasts until defeated.', exclusiveTo: 'Da Vinci' },
  // ── Rare — Leonidas ───────────────────────────────────────────────────────
  { definitionId: 'leonidas_shield_bash',  name: 'Shield Bash',  icon: '⚡', manaCost: 2, rarity: 'rare', description: 'Power×1.8 dmg at range 1 + Armor Break (−25% DEF, 2t) + counter-stance (+20 DEF this turn).', exclusiveTo: 'Leonidas' },
  { definitionId: 'leonidas_spartan_wall', name: 'Spartan Wall', icon: '🏛️', manaCost: 3, rarity: 'rare', description: '+20 Defense to Leonidas and all allies within range 2.', exclusiveTo: 'Leonidas' },
  // ── Ultimate — Leonidas ───────────────────────────────────────────────────
  { definitionId: 'leonidas_this_is_sparta', name: 'THIS IS SPARTA!', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Power×2.5 dmg to target + Root all adjacent enemies for 2 turns.', exclusiveTo: 'Leonidas' },
  // ── Rare — Sun-sin ────────────────────────────────────────────────────────
  { definitionId: 'sunsin_hwajeon',       name: 'Hwajeon / Ramming Speed',   icon: '🔥', manaCost: 2, rarity: 'rare', description: 'Land: ~72 dmg at range 3, push back. Water: ~72 dmg at range 1, push back.', exclusiveTo: 'Sun-sin' },
  { definitionId: 'sunsin_naval_command', name: 'Naval Repairs / Broadside', icon: '🚢', manaCost: 3, rarity: 'rare', description: 'Land: Heal allies in area 15 HP now + 15 HP next turn. Water: ~25 dmg all enemies range 3.', exclusiveTo: 'Sun-sin' },
  // ── Ultimate — Sun-sin ────────────────────────────────────────────────────
  { definitionId: 'sunsin_chongtong', name: 'Chongtong Barrage', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Land: charge 3 hexes, ~60 dmg + push sideways. Water: ~90 main, ~43 adj, range 5.', exclusiveTo: 'Sun-sin' },
  // ── Rare — Beethoven ──────────────────────────────────────────────────────
  { definitionId: 'beethoven_schallwelle', name: 'Schallwelle',  icon: '🌊', manaCost: 2, rarity: 'rare', description: 'Sonic wave — Power×0.6 dmg on a line, pushes each enemy 2 tiles back. Range 3.', exclusiveTo: 'Beethoven' },
  { definitionId: 'beethoven_freudenspur', name: 'Freudenspur',  icon: '🎶', manaCost: 3, rarity: 'rare', description: 'Place resonance zone (7 tiles). Allies on zone gain +2 Movement at turn start. Lasts 2 turns.', exclusiveTo: 'Beethoven' },
  // ── Ultimate — Beethoven ──────────────────────────────────────────────────
  { definitionId: 'beethoven_gotterfunken', name: 'Götterfunken', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Deal 46 dmg and Stun all enemies within range 3 for 1 turn.', exclusiveTo: 'Beethoven' },
  // ── Rare — Huang-chan ─────────────────────────────────────────────────────
  { definitionId: 'huang_terracotta_summon', name: 'Terracotta Legion',      icon: '🗿', manaCost: 2, rarity: 'rare', description: 'Summon Terracotta Archer or Warrior on a hex. HP 40, scales with stats. Lasts 2 turns.', exclusiveTo: 'Huang-chan' },
  { definitionId: 'huang_first_emperor',    name: "First Emperor's Command", icon: '⚔️', manaCost: 3, rarity: 'rare', description: 'Summon Terracotta Cavalry adjacent. HP 60, scales with stats. Lasts 2 turns. Gain free Cavalry Charge.', exclusiveTo: 'Huang-chan' },
  // ── Ultimate — Huang-chan ─────────────────────────────────────────────────
  { definitionId: 'huang_eternal_army', name: 'Eternal Army', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Control a non-boss enemy for 2 turns. They attack the nearest foe.', exclusiveTo: 'Huang-chan' },
];

// ── Encounter Builders ────────────────────────────────────────────────────────

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildEncounter(
  type: 'enemy' | 'elite' | 'boss',
  act: 1 | 2 | 3,
  rng: () => number,
  row: number = 1,
): EncounterDef {
  // Act 1 enemy pools — scale by row within the act
  // Rows 1-3: early (fragile skirmishers)
  // Rows 4-6: mid (tougher bruisers)
  // Rows 7-9: late (dangerous fighters)
  const earlyPool = [ENEMIES.zyx_skitter, ENEMIES.glorp_shambler];
  const midPool   = [ENEMIES.naxion_scout, ENEMIES.vron_crawler];
  const latePool  = [ENEMIES.mog_toxin, ENEMIES.qrix_hunter, ENEMIES.void_wraith];
  const act2Pool  = [ENEMIES.naxion_shieldbearer, ENEMIES.grox_magnetar, ENEMIES.vrex_mimic, ENEMIES.crystalline_hive];
  const act2LatePool = [...latePool, ENEMIES.naxion_shieldbearer, ENEMIES.grox_magnetar];

  const enemyPool = act === 1
    ? (row <= 3 ? earlyPool : row <= 6 ? midPool : latePool)
    : (row <= 5 ? act2Pool : act2LatePool);

  let enemies: EnemyTemplate[];
  let name: string;
  let xp: number;
  let gold: number;
  let dropChance: number;

  if (type === 'boss') {
    if (act === 1)      enemies = [ENEMIES.iron_wall];
    else if (act === 2) enemies = [ENEMIES.twin_terror_a, ENEMIES.twin_terror_b];
    else                enemies = [ENEMIES.znyxorga_champion];
    name = `Act ${act} Boss`;
    xp = 160; gold = 90 + Math.floor(rng() * 30); dropChance = 1.0;
  } else if (type === 'elite') {
    // Late-row elites (rows 9-10) get the harder pair — doubled enemy count
    const useToughElite = row >= 9;
    const baseElites = act === 1
      ? (useToughElite || rng() < 0.5 ? [ENEMIES.krath_champion] : [ENEMIES.spore_cluster, ENEMIES.spore_cluster, ENEMIES.spore_cluster])
      : (rng() < 0.5 ? [ENEMIES.krath_berserker] : [ENEMIES.phasewarden]);
    // Double up: add one extra enemy from the late pool alongside the elite
    const extraEnemy = pick(latePool, rng);
    enemies = [...baseElites, extraEnemy];
    name = 'Elite Encounter';
    xp = Math.round((60 + row * 2) * 1.25); gold = 40 + Math.floor(rng() * 25); dropChance = 0.90;
  } else {
    // Standard enemy: doubled to 2–4 enemies; later rows more likely to send 4
    const twoPct = row <= 3 ? 0.30 : row <= 6 ? 0.45 : 0.55;
    const baseCount = rng() < twoPct ? 2 : 1;
    const count = baseCount * 2; // always double
    enemies = Array.from({ length: count }, () => pick(enemyPool, rng));
    name = `${count} Enemies`;
    xp = Math.round((35 + row * 3) * 1.25); gold = 18 + Math.floor(rng() * 20) + row; dropChance = 0.60 + row * 0.02;
  }

  // Objective: bosses always destroy_base; elites 50% destroy_base; regular enemies 30% destroy_base, 15% survive
  const objectiveRoll = rng();
  const objective = type === 'boss'
    ? 'defeat_all'
    : type === 'elite'
      ? (objectiveRoll < 0.50 ? 'destroy_base' : 'defeat_all')
      : objectiveRoll < 0.30
        ? 'destroy_base'
        : objectiveRoll < 0.45
          ? 'survive'
          : 'defeat_all';

  const survivalTurns = objective === 'survive' ? 10 + Math.floor(rng() * 3) : undefined; // 10–12 turns

  const objectiveLabels: Record<string, string> = {
    defeat_all: 'Defeat all enemies',
    destroy_base: 'Destroy the enemy base',
    survive: `Survive ${survivalTurns ?? 10} turns`,
    onslaught: 'Hold the line',
  };

  return {
    name, objective, objectiveLabel: objectiveLabels[objective], enemies,
    survivalTurns,
    spawnInterval: objective === 'survive' ? 2 : undefined,
    goldReward: gold, xpReward: xp, bonusXpNoHit: 60, bonusXpFast: 40,
    itemDropChance: dropChance, guaranteedItem: type === 'boss',
  };
}

// ── Node Type Picker ──────────────────────────────────────────────────────────

function pickNodeType(row: number, rng: () => number): NodeType {
  // 12-row map: row 0=start enemies, row 11=boss, rows 1-10 vary
  // Campfire rows 2/3/6 have reduced frequency; rows 4/7 are rest rows; row 10 is guaranteed campfire
  const tables: Record<number, [NodeType, number][]> = {
    1:  [['enemy',0.65],['unknown',0.20],['treasure',0.15]],
    2:  [['enemy',0.60],['campfire',0.15],['unknown',0.25]],
    3:  [['enemy',0.50],['elite',0.15],['campfire',0.10],['merchant',0.25]],
    4:  [['campfire',0.55],['merchant',0.45]],          // convergence row — always rest/shop
    5:  [['enemy',0.40],['elite',0.25],['treasure',0.20],['merchant',0.15]],
    6:  [['enemy',0.45],['elite',0.30],['campfire',0.10],['unknown',0.15]],
    7:  [['campfire',0.50],['merchant',0.50]],          // mid-rest row
    8:  [['enemy',0.35],['elite',0.30],['treasure',0.20],['unknown',0.15]],
    9:  [['enemy',0.25],['elite',0.75]],                // heavy combat before final rest
  };
  const table = tables[row] ?? [['enemy',1.0]];
  const roll = rng();
  let acc = 0;
  for (const [t, w] of table) {
    acc += w;
    if (roll <= acc) return t;
  }
  return 'enemy';
}

// ── First Battle Encounter (Alien Beasts) ─────────────────────────────────────
export const FIRST_ENCOUNTER: EncounterDef = {
  name: 'Alien Beast Pack',
  objective: 'defeat_all',
  objectiveLabel: 'Defeat all beasts',
  enemies: [ENEMIES.vexlar],
  goldReward: 20, xpReward: 40,
  bonusXpNoHit: 60, bonusXpFast: 40,
  itemDropChance: 0.20, guaranteedItem: false,
};

// ── Map Generation ────────────────────────────────────────────────────────────
//
// Slay-the-Spire style: 5-column grid, 12 rows. Dense branching paths that
// converge and expand. Every node is guaranteed at least one incoming connection.

export function generateActMap(seed: number, act: 1 | 2 | 3): RunNode[] {
  const rng = seededRng(seed + act * 997);
  const ROWS = 12; // rows 0–11; row 11 = boss

  // ── 6 sorted paths, monotone-assignment trick ─────────────────────────────────
  // 6 paths across 5 columns (0–4). At each row, each path picks a random step
  // (−1/0/+1). Raw destinations are SORTED and re-assigned in order — this
  // monotone assignment means no two connections can ever cross. Every node
  // belongs to at least one path → zero orphan nodes.
  const pathCols: number[][] = [0, 1, 2, 2, 3, 4].map(c => [c]);

  for (let row = 1; row < ROWS; row++) {
    if (row === ROWS - 1) {
      // Boss: all paths converge to col 2 (center)
      pathCols.forEach(p => p.push(2));
      continue;
    }

    const prevCols = pathCols.map(p => p[p.length - 1]);

    // Each path independently picks a raw next column (equal chance ±1/stay)
    const rawNext = prevCols.map(col => {
      const r = rng();
      if (r < 0.33 && col > 0) return col - 1;
      if (r < 0.67 && col < 4) return col + 1;
      return col;
    });

    // Sort destinations and assign in order → monotone, no crossings
    const sorted = [...rawNext].sort((a, b) => a - b);
    pathCols.forEach((p, i) => p.push(sorted[i]));
  }

  // ── Build connection map from paths ──────────────────────────────────────────
  const nodeConns = new Map<string, Set<string>>();
  for (const path of pathCols) {
    for (let row = 0; row < ROWS - 1; row++) {
      const fromId = `r${row}c${path[row]}`;
      const toId   = `r${row + 1}c${path[row + 1]}`;
      if (!nodeConns.has(fromId)) nodeConns.set(fromId, new Set());
      nodeConns.get(fromId)!.add(toId);
    }
  }

  // ── Collect all node IDs ──────────────────────────────────────────────────────
  const allNodeIds = new Set<string>(nodeConns.keys());
  for (const conns of nodeConns.values()) conns.forEach(id => allNodeIds.add(id));

  // ── Build node objects ────────────────────────────────────────────────────────
  const nodeMap = new Map<string, RunNode>();
  for (const key of allNodeIds) {
    const m = key.match(/r(\d+)c(\d+)/);
    if (!m) continue;
    const row = parseInt(m[1]);
    const col = parseInt(m[2]);

    let type: NodeType;
    if (row === 0)             type = 'enemy';
    else if (row === ROWS - 1) type = 'boss';
    else if (row === ROWS - 2) type = 'campfire';
    else                       type = pickNodeType(row, rng);

    const isCombat = type === 'enemy' || type === 'elite' || type === 'boss';
    const encounter = row === 0 && act === 1
      ? FIRST_ENCOUNTER
      : isCombat ? buildEncounter(
          type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'enemy',
          act, rng, row
        ) : undefined;

    nodeMap.set(key, {
      id: key, row, col, rowCount: 5, type, connections: [], encounter,
    } satisfies RunNode);
  }

  // ── Wire connections ──────────────────────────────────────────────────────────
  for (const [fromId, toIds] of nodeConns) {
    const node = nodeMap.get(fromId);
    if (node) node.connections = [...toIds];
  }

  return [...nodeMap.values()];
}

// ── Starting Deck ─────────────────────────────────────────────────────────────

// Base shared cards (given to everyone); character ability cards are added per selected character in useRunState
export const SHARED_STARTING_CARDS: string[] = [
  'shared_basic_attack', 'shared_basic_attack', 'shared_basic_attack', 'shared_basic_attack',
  'shared_shield',       'shared_shield',        'shared_shield',
  'shared_mend',
  'shared_gamble',
  'shared_quick_move',
  'shared_battle_cry',
];

// One signature ability card per character (added only if that character is selected)
export const CHARACTER_STARTING_CARDS: Record<string, string> = {
  napoleon:  'napoleon_artillery_barrage',
  genghis:   'genghis_mongol_charge',
  davinci:   'davinci_masterpiece',
  leonidas:  'leonidas_shield_bash',
  sunsin:    'sunsin_hwajeon',
  beethoven: 'beethoven_schallwelle',
  huang:     'huang_terracotta_summon',
};

// ── Starting Characters ───────────────────────────────────────────────────────

export function buildStartingCharacters(): CharacterRunState[] {
  return [
    {
      id: 'napoleon', displayName: 'Napoleon-chan', portrait: '/art/napoleon_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'genghis', displayName: 'Genghis-chan', portrait: '/art/genghis_portrait.png',
      currentHp: 120, maxHp: 120, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'davinci', displayName: 'Da Vinci-chan', portrait: '/art/davinci_portrait.png',
      currentHp: 85, maxHp: 85, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'leonidas', displayName: 'Leonidas-chan', portrait: '/art/leonidas_portrait.png',
      currentHp: 130, maxHp: 130, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'sunsin', displayName: 'Sun-sin-chan', portrait: '/art/sunsin_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'beethoven', displayName: 'Beethoven-chan', portrait: '/art/beethoven_portrait.png',
      currentHp: 90, maxHp: 90, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
    {
      id: 'huang', displayName: 'Huang-chan', portrait: '/art/huang_portrait.png',
      currentHp: 90, maxHp: 90, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [null, null, null, null, null],
    },
  ];
}

// XP thresholds per level (cumulative)
export const XP_TO_NEXT = [0, 100, 220, 380, 580, 830, 9999];

// Pick 3 card choices for the reward screen, gated by encounter type:
//   enemy    — common + uncommon only (no rare, no ultimate)
//   elite    — common + uncommon + rare; 40% chance one slot is an ultimate
//   boss     — common + uncommon + rare + ultimate; guarantee ≥1 ultimate
//   merchant — common + uncommon + rare (no ultimates — they must be earned)
//
// characterIds: the id strings of characters in this run (e.g. ['napoleon','genghis'])
export function pickCardRewards(
  currentDeck: string[],
  rng: () => number,
  characterIds: string[] = [],
  encounterType: 'enemy' | 'elite' | 'boss' | 'merchant' = 'enemy',
): CardReward[] {
  // Check character filter + block owned ultimates (can only have one copy per character)
  function eligible(c: CardReward): boolean {
    if (c.exclusiveTo) {
      const norm = c.exclusiveTo.toLowerCase().replace(/[\s-]/g, '');
      if (characterIds.length > 0 && !characterIds.includes(norm)) return false;
    }
    if (c.rarity === 'ultimate' && currentDeck.includes(c.definitionId)) return false;
    return true;
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const byRarity = (r: CardReward['rarity']) =>
    CARD_REWARD_POOL.filter(c => c.rarity === r && eligible(c));

  const commons   = byRarity('common');
  const uncommons = byRarity('uncommon');
  const rares     = byRarity('rare');
  const ultimates = byRarity('ultimate');

  // Non-ultimate base pool for filling remaining slots
  const normalPool   = [...commons, ...uncommons];           // enemy
  const elitePool    = [...commons, ...uncommons, ...rares]; // elite / merchant / boss filler

  if (encounterType === 'boss') {
    // Guarantee exactly 1 ultimate; fill the other 2 from elite pool
    const [ult] = shuffle(ultimates);
    const filler = shuffle(elitePool).slice(0, 2);
    const choices = ult ? shuffle([ult, ...filler]) : shuffle(elitePool).slice(0, 3);
    return choices.slice(0, 3);
  }

  if (encounterType === 'elite') {
    // 40% chance one of the 3 slots is an ultimate
    if (ultimates.length > 0 && rng() < 0.40) {
      const [ult] = shuffle(ultimates);
      const filler = shuffle(elitePool).slice(0, 2);
      return shuffle([ult, ...filler]).slice(0, 3);
    }
    return shuffle(elitePool).slice(0, 3);
  }

  if (encounterType === 'merchant') {
    return shuffle(elitePool).slice(0, 3);
  }

  // Default: normal enemy fight — common + uncommon; 25% chance one slot is rare
  if (rares.length > 0 && rng() < 0.25) {
    const [rare] = shuffle(rares);
    const filler = shuffle(normalPool).slice(0, 2);
    return shuffle([rare, ...filler]).slice(0, 3);
  }
  return shuffle(normalPool).slice(0, 3);
}

/**
 * Roll an item tier based on encounter type.
 *
 * Normal:  Common 55% | Uncommon 33% | Rare 10% | Legendary 2%
 * Elite:   Common 20% | Uncommon 50% | Rare 25% | Legendary 5%
 * Boss:    Uncommon 10% | Rare 65% | Legendary 25%
 */
export function rollItemTier(
  encounterType: 'enemy' | 'elite' | 'boss',
  rng: () => number,
): 'common' | 'uncommon' | 'rare' | 'legendary' {
  const r = rng();
  if (encounterType === 'boss') {
    if (r < 0.25) return 'legendary';
    if (r < 0.90) return 'rare';
    return 'uncommon';
  }
  if (encounterType === 'elite') {
    if (r < 0.05) return 'legendary';
    if (r < 0.30) return 'rare';
    if (r < 0.80) return 'uncommon';
    return 'common';
  }
  // normal enemy
  if (r < 0.02) return 'legendary';
  if (r < 0.12) return 'rare';
  if (r < 0.45) return 'uncommon';
  return 'common';
}

export function pickItemReward(tier: 'common' | 'uncommon' | 'rare' | 'legendary', rng: () => number, teamCharIds?: string[]): RunItem {
  // Strict tier match — character-specific items only if that character is alive on the team
  const pool = ITEMS.filter(i => i.tier === tier).filter(i => {
    if (!i.targetCharacter || !teamCharIds || teamCharIds.length === 0) return true;
    return teamCharIds.some(id => id.toLowerCase().includes(i.targetCharacter!));
  });
  // Fall back: generic items of same tier, then any generic item
  const safePool = pool.length > 0
    ? pool
    : ITEMS.filter(i => i.tier === tier && !i.targetCharacter);
  const finalPool = safePool.length > 0 ? safePool : ITEMS.filter(i => !i.targetCharacter);
  return pick(finalPool, rng);
}
