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
      { id: 'swarm_bite', name: 'Swarm Bite', icon: '🦟', description: 'Leaps onto the closest enemy and deals 40 damage to all enemies within range 1 (DEF applies).', cooldown: 4, effect: { type: 'aoe_damage', range: 1, damage: 40 } },
    ] as EnemyAbilityDef[],
  },
  naxion_scout: {
    id: 'naxion_scout', name: 'Naxion Scout', icon: '👾', count: 1,
    portrait: '/art/enemies/naxion_scout_portrait.png',
    description: "A hired gun from the outer arena circuits. One burning eye, one plasma pistol — it never stops smiling because it knows it's faster than you.",
    stats: { hp: 70, maxHp: 70, might: 30, power: 35, defense: 12, moveRange: 3, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'plasma_shot', name: 'Plasma Shot', icon: '⚡', description: 'Fires a concentrated plasma bolt dealing Power×1.2 damage to a single enemy within range 3.', cooldown: 3, effect: { type: 'aoe_damage', range: 3, multiplier: 1.2, singleTarget: true } },
    ] as EnemyAbilityDef[],
  },
  vron_crawler: {
    id: 'vron_crawler', name: 'Vron Crawler', icon: '🦀', count: 1,
    portrait: '/art/enemies/vron_crawler_portrait.png',
    description: "A living fortress on six legs. Its layered shell makes frontal assaults nearly pointless — wait for it to expose its soft underbelly, or don't attack at all.",
    stats: { hp: 85, maxHp: 85, might: 28, power: 20, defense: 16, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
    abilities: [
      { id: 'shell_harden', name: 'Shell Harden', icon: '🐚', description: 'Retracts into armored shell — gains +18 Defense for 2 turns.', cooldown: 5, effect: { type: 'buff_self', defenseBonus: 18, duration: 2 } },
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
      { id: 'champion_strike', name: "Champion's Strike", icon: '⚔️', description: 'Deals 1× Might damage to the nearest enemy within range 2 (DEF applies).', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 1.0, singleTarget: true, useMight: true } },
    ] as EnemyAbilityDef[],
  },
  spore_cluster: {
    id: 'spore_cluster', name: 'Spore Node', icon: '🔴', count: 3,
    portrait: '/art/enemies/spore_node_portrait.png',
    description: "Three semi-sentient spore heads on a shared fungal body. Sluggish and barely mobile, but the toxic clouds they pump out will rot your armor off in minutes.",
    stats: { hp: 40, maxHp: 40, might: 20, power: 30, defense: 5, moveRange: 1, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'toxic_cloud', name: 'Toxic Cloud', icon: '☣️', description: 'Applies Poison to all enemies within range 2.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'poison', magnitude: 5, duration: 99 } },
      { id: 'spore_burst', name: 'Spore Burst', icon: '💥', description: 'Deals 45 damage to all enemies in range 2 (DEF applies).', cooldown: 2, effect: { type: 'aoe_damage', range: 2, damage: 45 } },
    ] as EnemyAbilityDef[],
  },
  // Act 1 starter — alien beast (first encounter only)
  vexlar: {
    id: 'vexlar', name: 'Vexlar', icon: '🐆', count: 2,
    portrait: '/art/enemies/vexlar_portrait.png',
    description: "Alien apex predators brought in for your opening round. Six-legged and iridescent, they hunt the weakest link with surgical instinct and terrifying speed.",
    stats: { hp: 80, maxHp: 80, might: 25, power: 30, defense: 22, moveRange: 3, attackRange: 1 },
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
    stats: { hp: 200, maxHp: 200, might: 60, power: 50, defense: 20, moveRange: 2, attackRange: 1 },
    ai: 'defensive',
    abilities: [
      { id: 'shield_array', name: 'Shield Array', icon: '🛡️', description: 'Heals self for 35 HP. Triggers once when below 50% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.5, effect: { type: 'heal_self', amount: 35 } },
      { id: 'emp_blast', name: 'EMP Blast', icon: '⚡', description: 'Deals 55 damage to all enemies within range 1 (DEF applies).', cooldown: 3, effect: { type: 'aoe_damage', range: 1, damage: 55 } },
      { id: 'turret_mode', name: 'Turret Mode', icon: '🤖', description: 'Gains +30 Defense for 2 turns.', cooldown: 4, effect: { type: 'buff_self', defenseBonus: 30, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 enemies
  mog_toxin: {
    id: 'mog_toxin', name: 'Mog Toxin', icon: '☣️', count: 1,
    portrait: '/art/enemies/mog_toxin_portrait.png',
    description: 'A bloated sack of corrosive biology that hasn\'t stopped smiling since it learned what fear tastes like. Every tentacle drips acid; every grin means someone\'s armor is already melting.',
    stats: { hp: 95, maxHp: 95, might: 30, power: 45, defense: 10, moveRange: 2, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'acid_spray', name: 'Acid Spray', icon: '🧪', description: 'Launches a corrosive burst — applies Armor Break (−20% DEF) to all enemies within range 1 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'armor_break', magnitude: 20, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  qrix_hunter: {
    id: 'qrix_hunter', name: 'Qrix Hunter', icon: '🏹', count: 1,
    portrait: '/art/enemies/qrix_hunter_portrait.png',
    description: 'A cold-blooded Qrix assassin born to hunt. Its shifting camouflage makes it nearly invisible until the trigger is pulled — and it never misses twice.',
    stats: { hp: 90, maxHp: 90, might: 25, power: 50, defense: 8, moveRange: 3, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'pinning_shot', name: 'Pinning Shot', icon: '📌', description: 'Fires a precision bolt at the closest target — deals Power×1.2 damage to enemies within range 3.', cooldown: 3, effect: { type: 'aoe_damage', range: 3, multiplier: 1.2, singleTarget: true } },
    ] as EnemyAbilityDef[],
  },
  void_wraith: {
    id: 'void_wraith', name: 'Void Wraith', icon: '👻', count: 1,
    portrait: '/art/enemies/void_wraith_portrait.png',
    description: 'A remnant of something that should no longer exist. It phases through walls and armor alike, drawn to the warmth of the living like a moth to flame. Only pain can make it corporeal.',
    stats: { hp: 85, maxHp: 85, might: 40, power: 40, defense: 5, moveRange: 4, attackRange: 1 },
    ai: 'aggressive',
    abilities: [
      { id: 'shadow_step', name: 'Shadow Step', icon: '🌑', description: 'Phases through reality — teleports adjacent to the closest enemy and strikes for 1× Might (DEF applies).', cooldown: 3, effect: { type: 'dash_attack', dashRange: 5, multiplier: 1.0 } },
    ] as EnemyAbilityDef[],
  },
  krath_berserker: {
    id: 'krath_berserker', name: 'Krath Berserker', icon: '💢', count: 1,
    portrait: '/art/enemies/krath_berserker_portrait.png',
    description: 'A Krath warrior who has abandoned all sense of self-preservation. Four bladed arms moving faster than the eye can follow. It doesn\'t fight to win — it fights until nothing is left standing.',
    stats: { hp: 155, maxHp: 155, might: 52, power: 55, defense: 14, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'bloodrage', name: 'Bloodrage', icon: '💢', description: 'Gains +15 Might for 2 turns (but loses 20 Defense).', cooldown: 3, effect: { type: 'buff_self', mightBonus: 15, defenseBonus: -20, duration: 2 } },
      { id: 'savage_leap', name: 'Savage Leap', icon: '🦘', description: 'Teleports adjacent to the closest enemy and deals Might damage on arrival (DEF applies).', cooldown: 2, effect: { type: 'dash_attack', dashRange: 5, multiplier: 1.0 } },
    ] as EnemyAbilityDef[],
  },
  phasewarden: {
    id: 'phasewarden', name: 'Phasewarden', icon: '🔮', count: 1,
    portrait: '/art/enemies/phasewarden_portrait.png',
    description: "A guardian from between dimensions — its crystalline armor flickers between planes of existence. It blinks away, strips your defenses, then closes in when you're most exposed.",
    stats: { hp: 125, maxHp: 125, might: 48, power: 65, defense: 20, moveRange: 4, attackRange: 2 },
    ai: 'ranged',
    abilities: [
      { id: 'dimensional_drain', name: 'Dimensional Drain', icon: '🔮', description: 'Applies Armor Break (−20% Defense) to all enemies within range 2 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'armor_break', magnitude: 20, duration: 2 } },
      { id: 'phase_blink', name: 'Phase Blink', icon: '✨', description: 'Teleports to a position far from all enemies, then attacks the closest from range.', cooldown: 2, effect: { type: 'dash_attack', dashRange: 6, multiplier: 1.0 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 boss
  twin_terror_a: {
    id: 'twin_terror_a', name: 'Terror Alpha', icon: '🗡️', count: 1,
    portrait: '/art/enemies/terror_alpha_portrait.png',
    description: "The aggressive half of the Twin Terror duo. Built for raw speed and kinetic impact — charges at full sprint and hits like a missile. Kill it first or it will never stop coming.",
    stats: { hp: 160, maxHp: 160, might: 60, power: 55, defense: 20, moveRange: 4, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'alpha_rush', name: 'Alpha Rush', icon: '🗡️', description: 'Charges 4 hexes and deals 1.5× Might damage on impact.', cooldown: 2, effect: { type: 'dash_attack', dashRange: 4, multiplier: 1.5 } },
      { id: 'twin_fury', name: 'Twin Fury', icon: '🔥', description: 'Gains +20 Might for 2 turns.', cooldown: 3, effect: { type: 'buff_self', mightBonus: 20, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  twin_terror_b: {
    id: 'twin_terror_b', name: 'Terror Beta', icon: '🛡️', count: 1,
    portrait: '/art/enemies/terror_beta_portrait.png',
    description: "The defensive half of the Twin Terror. Absorbs punishment while Alpha creates chaos, then heals itself when nearly dead. Ignore it and Beta becomes unkillable.",
    stats: { hp: 160, maxHp: 160, might: 50, power: 65, defense: 30, moveRange: 3, attackRange: 2 },
    ai: 'defensive',
    abilities: [
      { id: 'aegis_heal', name: 'Aegis Heal', icon: '💚', description: 'Heals self for 45 HP. Triggers once when below 40% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.4, effect: { type: 'heal_self', amount: 45 } },
      { id: 'mirror_aegis', name: 'Mirror Aegis', icon: '🛡️', description: 'Gains +35 Defense for 2 turns.', cooldown: 3, effect: { type: 'buff_self', defenseBonus: 35, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 3 boss
  znyxorga_champion: {
    id: 'znyxorga_champion', name: "Znyxorga's Champion", icon: '👑', count: 1,
    portrait: '/art/enemies/znyxorgas_champion_portrait.png',
    description: "Znyxorga's ultimate weapon — four arms, six eyes, 400 HP, and the patience of a god. It will annihilate your whole team simultaneously and grow stronger the closer it gets to death.",
    stats: { hp: 400, maxHp: 400, might: 80, power: 80, defense: 40, moveRange: 3, attackRange: 2 },
    ai: 'berserker',
    abilities: [
      { id: 'arena_collapse', name: 'Arena Collapse', icon: '👑', description: 'The arena itself becomes a weapon — deals 15 TRUE damage to ALL player characters (ignores DEF).', cooldown: 3, effect: { type: 'damage_all_enemies', damage: 15, trueDamage: true } },
      { id: 'phase_shift', name: 'Phase Shift', icon: '🛡️', description: 'Becomes invincible for 2 turns and gains +15 Might, +15 Power, and +15 Defense permanently. Triggers ONCE when below 50% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.5, effect: { type: 'buff_self', mightBonus: 15, powerBonus: 15, defenseBonus: 500, duration: 2 } },
      { id: 'champions_will', name: "Champion's Will", icon: '⭐', description: 'Driven by Znyxorga\'s will — gains +20 Might, +20 Power, and +20 Defense permanently. Triggers ONCE when below 30% HP.', cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.30, effect: { type: 'buff_self', mightBonus: 20, defenseBonus: 20, duration: 999 } },
      { id: 'tyrant_strike', name: 'Tyrant Strike', icon: '💥', description: 'Channels Power into a sweeping strike — deals Power×0.6 damage to all enemies within range 2 (DEF applies).', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 0.6 } },
    ] as EnemyAbilityDef[],
  },
  // Act 4 boss
  velzar_will: {
    id: 'velzar_will', name: "Vel'Zar — Emperor's Will", icon: '🌌', count: 1,
    portrait: '/art/enemies/velzar_will_portrait.png',
    description: "The Emperor's final answer — a seven-limbed war construct that survived three hundred gladiatorial seasons without taking a wound. It has Phase Shifted. It has triggered Champion's Will. None of that was ever enough. It has never seen anything like you.",
    stats: { hp: 520, maxHp: 520, might: 100, power: 100, defense: 55, moveRange: 4, attackRange: 2 },
    ai: 'berserker',
    abilities: [
      { id: 'emperors_verdict',  name: "Emperor's Verdict",  icon: '🌌', description: "Channels the Emperor's judgment — deals 25 TRUE damage to ALL player characters simultaneously (ignores DEF).",                                                                                                      cooldown: 3, effect: { type: 'damage_all_enemies', damage: 25, trueDamage: true } },
      { id: 'void_sunder',       name: 'Void Sunder',        icon: '💀', description: 'Tears reality open — applies Armor Break (−25% DEF) to ALL player characters for 2 turns.',                                                                                                                          cooldown: 4, effect: { type: 'debuff_enemies', range: 10, debuffType: 'armor_break', magnitude: 25, duration: 2 } },
      { id: 'imperial_mandate',  name: 'Imperial Mandate',   icon: '⚡', description: "The Emperor's will made flesh — Stuns all player characters within range 1 for 1 turn. Stay spread out.",                                                                                                            cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'stun', magnitude: 0, duration: 1 } },
      { id: 'apex_ascension',    name: 'Apex Ascension',     icon: '👁️', description: 'Transcends physical limits — becomes INVINCIBLE for 2 turns and gains +25 Might and +25 Power permanently. Triggers ONCE when below 60% HP.',                                                                        cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.60, effect: { type: 'buff_self', mightBonus: 25, powerBonus: 25, defenseBonus: 500, duration: 2 } },
      { id: 'total_authority',   name: 'Total Authority',    icon: '⭐', description: "The Emperor's absolute will — gains +30 Might, +30 Power, and +30 Defense permanently. Triggers ONCE when below 25% HP.",                                                                                             cooldown: 0, oncePerFight: true, triggerCondition: 'low_hp', hpThreshold: 0.25, effect: { type: 'buff_self', mightBonus: 30, powerBonus: 30, defenseBonus: 30, duration: 999 } },
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
      { id: 'shield_slam', name: 'Shield Slam', icon: '🛡️', description: 'Crashes its shield into a target — deals 1.1× Might damage (DEF applies) and Roots the target for 1 turn.', cooldown: 2, effect: { type: 'melee_debuff', multiplier: 1.1, debuffType: 'rooted', magnitude: 0, duration: 1 } },
      { id: 'rally_cry', name: 'Rally Cry', icon: '📣', description: 'Braces for impact — gains +25 Defense for 2 turns.', cooldown: 3, effect: { type: 'buff_self', defenseBonus: 25, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  // Act 2 Elite
  grox_magnetar: {
    id: 'grox_magnetar', name: 'Grox Magnetar', icon: '🧲', count: 1,
    portrait: '/art/enemies/grox_magnetar_portrait.png',
    description: "A living electromagnetic anomaly — the Grox Magnetar bends metal, reroutes energy, and silences technology with a thought. It doesn't fight in straight lines; it reshapes the battlefield to make sure nothing else does either.",
    stats: { hp: 130, maxHp: 130, might: 50, power: 60, defense: 25, moveRange: 3, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'magnetic_pull', name: 'Magnetic Pull', icon: '🧲', description: 'Yanks a target 2 hexes closer then deals Power×0.8 damage. Range 3.', cooldown: 2, effect: { type: 'pull_attack', pullRange: 2, range: 3, multiplier: 0.8 } },
      { id: 'emp_surge', name: 'EMP Surge', icon: '⚡', description: 'Releases an electromagnetic pulse — Silences all enemies within range 1 for 1 turn (prevents ability use).', cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'silence', magnitude: 0, duration: 1 } },
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
      { id: 'imitate', name: 'Imitate', icon: '🎭', description: "Mimics the closest enemy — copies their Might and Power, then strikes for 0.5× their Might + 0.5× their Power.", cooldown: 2, effect: { type: 'copy_attack', multiplier: 1.0 } },
      { id: 'disorienting_shift', name: 'Disorienting Shift', icon: '🌀', description: 'Shifts form erratically — Roots the target for 1 turn. Range 2.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'rooted', magnitude: 0, duration: 1 } },
    ] as EnemyAbilityDef[],
  },
  // Act 3 Champions — the best warriors the Empire's member species have to offer
  naxion_warmaster: {
    id: 'naxion_warmaster', name: 'Naxion Warmaster', icon: '🪖', count: 1,
    portrait: '/art/enemies/naxion_warmaster_portrait.png',
    description: "The apex of the Naxion military caste. Where Shieldbearers hold the line, the Warmaster breaks it — charging across the field to lead the assault personally.",
    stats: { hp: 135, maxHp: 135, might: 60, power: 48, defense: 26, moveRange: 3, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'war_decree', name: 'War Decree', icon: '📯', description: 'Issues the order to advance — gains +20 Might for 2 turns.', cooldown: 3, effect: { type: 'buff_self', mightBonus: 20, duration: 2 } },
      { id: 'vanguard_charge', name: 'Vanguard Charge', icon: '🪖', description: 'Leads from the front — charges up to 3 hexes toward the nearest enemy and strikes for 1.1× Might (DEF applies).', cooldown: 2, effect: { type: 'dash_attack', dashRange: 3, multiplier: 1.1 } },
    ] as EnemyAbilityDef[],
  },
  grox_titan: {
    id: 'grox_titan', name: 'Grox Titan', icon: '🌩️', count: 1,
    portrait: '/art/enemies/grox_titan_portrait.png',
    description: "Beyond the Magnetar class — the Grox Titan commands electromagnetic force on a scale that reshapes the battlefield. Everything within range is either pulled, broken, or burning.",
    stats: { hp: 150, maxHp: 150, might: 60, power: 72, defense: 32, moveRange: 2, attackRange: 3 },
    ai: 'ranged',
    abilities: [
      { id: 'graviton_storm', name: 'Graviton Storm', icon: '🌩️', description: 'Releases a graviton pulse — deals Power×0.55 damage to all enemies within range 3 (DEF applies).', cooldown: 3, effect: { type: 'aoe_damage', range: 3, multiplier: 0.55 } },
      { id: 'magnetic_fortress', name: 'Magnetic Fortress', icon: '🛡️', description: 'Converts its own electromagnetic field into a defensive shell — gains +25 Defense for 2 turns.', cooldown: 4, effect: { type: 'buff_self', defenseBonus: 25, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
  velthrak_shadowblade: {
    id: 'velthrak_shadowblade', name: "Vel'thrak Shadowblade", icon: '🗡️', count: 1,
    portrait: '/art/enemies/velthrak_shadowblade_portrait.png',
    description: "An assassin from the Vel'thrak species — the Empire's most feared shadow warriors. It doesn't fight you; it decides which order you die in and then executes the plan.",
    stats: { hp: 95, maxHp: 95, might: 65, power: 60, defense: 12, moveRange: 5, attackRange: 1 },
    ai: 'berserker',
    abilities: [
      { id: 'death_mark', name: 'Death Mark', icon: '☠️', description: "Marks nearby targets for execution — applies Armor Break (−18% DEF) to all enemies within range 1 for 2 turns.", cooldown: 3, effect: { type: 'debuff_enemies', range: 1, debuffType: 'armor_break', magnitude: 18, duration: 2 } },
      { id: 'phantom_execution', name: 'Phantom Execution', icon: '🗡️', description: 'Vanishes and reappears adjacent to the weakest target — deals 0.9× Might damage (DEF applies).', cooldown: 2, effect: { type: 'dash_attack', dashRange: 6, multiplier: 0.9 } },
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
      { id: 'crystal_burst', name: 'Crystal Burst', icon: '💎', description: 'Erupts in razor shards — deals Power×0.8 to all enemies within range 2 (DEF applies).', cooldown: 2, effect: { type: 'aoe_damage', range: 2, multiplier: 0.8 } },
      { id: 'resonance_field', name: 'Resonance Field', icon: '🔶', description: 'Harmonic vibrations weaken armor — applies Armor Break (−15% DEF) to all enemies within range 2 for 2 turns.', cooldown: 3, effect: { type: 'debuff_enemies', range: 2, debuffType: 'armor_break', magnitude: 15, duration: 2 } },
    ] as EnemyAbilityDef[],
  },
};

// ── Item Pool ─────────────────────────────────────────────────────────────────

export const ITEMS: RunItem[] = [
  // COMMON
  { id: 'iron_gauntlets', name: 'Iron Gauntlets', icon: '🥊', tier: 'common',
    description: '+5 Might for this run.',
    statBonus: { might: 5 } },
  { id: 'bone_plate', name: 'Bone Plate', icon: '🦴', tier: 'common',
    description: '+5 Defense for this run.',
    statBonus: { defense: 5 } },
  { id: 'vitality_shard', name: 'Vitality Shard', icon: '💠', tier: 'common',
    description: '+12 max HP for this run.',
    statBonus: { hp: 12 } },
  { id: 'mana_conduit', name: 'Mana Conduit', icon: '🔋', tier: 'common',
    description: '+5 Power for this run.',
    statBonus: { power: 5 } },
  { id: 'swift_wraps', name: 'Swift Wraps', icon: '🩹', tier: 'common',
    description: '+2 extra movement on the first turn of each battle.',
    passiveTag: 'swift_wraps_burst' },
  { id: 'targeting_visor', name: 'Targeting Visor', icon: '🎯', tier: 'common',
    description: '+1 Attack Range for this run.',
    statBonus: { attackRange: 1 } },
  { id: 'adrenaline_injector', name: 'Adrenaline Injector', icon: '💉', tier: 'common',
    description: '+3 Might and +3 Power for this run.',
    statBonus: { might: 3, power: 3 } },
  { id: 'plated_boots', name: 'Plated Boots', icon: '🥾', tier: 'common',
    description: '+8 HP and +2 Defense for this run.',
    statBonus: { hp: 8, defense: 2 } },
  // UNCOMMON
  { id: 'battle_drum', name: 'Battle Drum', icon: '🥁', tier: 'uncommon',
    description: 'After killing an enemy, draw 1 card.',
    passiveTag: 'draw_2_on_kill' },
  { id: 'arena_medkit', name: 'Arena Medkit', icon: '💊', tier: 'uncommon',
    description: 'Heal 25 HP at the start of your turn if below 40% HP.',
    passiveTag: 'regen_low_hp' },
  { id: 'void_shard', name: 'Void Shard', icon: '🔥', tier: 'uncommon',
    description: '+10 Might for this run.',
    statBonus: { might: 10 } },
  { id: 'card_satchel', name: 'Card Satchel', icon: '🎒', tier: 'uncommon',
    description: '+1 starting hand size for this run.',
    passiveTag: 'hand_size_plus_1' },
  { id: 'quick_boots', name: 'Quick Boots', icon: '👟', tier: 'uncommon',
    description: '+1 movement range permanently.',
    passiveTag: 'move_plus_1' },
  { id: 'soul_ember', name: 'Soul Ember', icon: '🕯️', tier: 'uncommon',
    description: 'On kill, restore 20 HP to this character.',
    passiveTag: 'on_kill_heal_15' },
  { id: 'war_trophy', name: 'War Trophy', icon: '💀', tier: 'uncommon',
    description: 'On kill, permanently gain +2 Might and +2 Power for the rest of the run.',
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
  { id: 'chrono_shard', name: 'Chrono Shard', icon: '⏳', tier: 'rare',
    description: '+1 Mana on the first turn of each combat.',
    passiveTag: 'chrono_shard_t1' },
  { id: 'berserker_mark', name: "Berserker's Mark", icon: '🔥', tier: 'rare',
    description: '+15% damage dealt when below 50% HP.',
    passiveTag: 'berserker_mark' },
  { id: 'echo_stone', name: 'Echo Stone', icon: '🪨', tier: 'rare',
    description: 'Draw 1 extra card at the start of each turn.',
    passiveTag: 'echo_stone_draw' },
  // RARE — Napoleon
  { id: 'grand_strategy', name: 'Grand Strategy', icon: '🗺️', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Artillery Barrage hits an additional adjacent target.',
    passiveTag: 'napoleon_barrage_splash' },
  { id: 'emperors_coat', name: "Emperor's Coat", icon: '🪖', tier: 'rare',
    targetCharacter: 'napoleon',
    description: 'Grande Armée also grants +30% Might & Power to all allies.',
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
    description: 'After any Beethoven ability card, deal Power×0.25 to all adjacent enemies.',
    passiveTag: 'beethoven_resonance_aoe' },
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
  // RARE — Nelson-chan
  { id: 'nelsons_spyglass', name: "Nelson's Spyglass", icon: '🔭', tier: 'rare',
    targetCharacter: 'nelson',
    description: 'Crossing the T range extended by 1 (range 6 total).',
    passiveTag: 'nelson_crossing_extend' },
  { id: 'hardy_coat', name: "Hardy's Coat", icon: '🧥', tier: 'rare',
    targetCharacter: 'nelson',
    description: 'After using Kiss Me Hardy, Nelson gains +25 Defense for 2 turns.',
    passiveTag: 'nelson_hardy_coat' },
  // RARE — Hannibal-chan
  { id: 'war_elephant_tusk', name: 'War Elephant Tusk', icon: '🦣', tier: 'rare',
    targetCharacter: 'hannibal',
    description: 'War Elephant is summoned with +40 HP and +20 Might.',
    passiveTag: 'hannibal_elephant_buff' },
  { id: 'carthaginian_ring', name: 'Carthaginian Ring', icon: '💍', tier: 'rare',
    targetCharacter: 'hannibal',
    description: 'Cannae bonus damage increased from 40% to 70%.',
    passiveTag: 'hannibal_cannae_70pct' },
  // RARE — Picasso-chan
  { id: 'blue_canvas', name: 'Blue Canvas', icon: '🎨', tier: 'rare',
    targetCharacter: 'picasso',
    description: 'Armor Break from Guernica lasts 3 turns instead of 2.',
    passiveTag: 'picasso_guernica_extend' },
  { id: 'cubist_lens', name: 'Cubist Lens', icon: '🪟', tier: 'rare',
    targetCharacter: 'picasso',
    description: 'Fractured Perspective free-card triggers every 2nd card instead of every 3rd.',
    passiveTag: 'picasso_perspective_2nd' },
  // RARE — Teddy-chan
  { id: 'big_stick_upgrade', name: 'Carry a Bigger Stick', icon: '🏏', tier: 'rare',
    targetCharacter: 'teddy',
    description: 'Big Stick range increased to 2 and deals +20 bonus Might damage.',
    passiveTag: 'teddy_big_stick_range2' },
  { id: 'rough_rider_badge', name: "Rough Rider's Badge", icon: '🏅', tier: 'rare',
    targetCharacter: 'teddy',
    description: "Rough Riders' Rally also removes all debuffs from allied units.",
    passiveTag: 'teddy_rally_cleanse' },
  // RARE — Mansa-chan
  { id: 'golden_throne', name: 'Golden Throne', icon: '👑', tier: 'rare',
    targetCharacter: 'mansa',
    description: 'After each battle, earn an additional +50% of the gold reward on top of Treasury.',
    passiveTag: 'mansa_treasury_double' },
  { id: 'mali_coffers', name: 'Mali Coffers', icon: '💰', tier: 'rare',
    targetCharacter: 'mansa',
    description: "Mansa's ability card Mana discount increased to 2.",
    passiveTag: 'mansa_discount_2' },
  // LEGENDARY
  { id: 'znyxorgas_eye', name: "Znyxorga's Eye", icon: '👁️', tier: 'legendary',
    description: 'This character has no limit on cards played per turn (normally capped at 3).',
    passiveTag: 'cards_per_turn_unlimited' },
  { id: 'void_armor', name: 'Void Armor', icon: '🛡️', tier: 'legendary',
    description: 'Once per fight, negate a lethal blow — survive at 1 HP instead.',
    passiveTag: 'once_survive_lethal' },
  { id: 'arena_champion', name: 'Arena Champion', icon: '🏆', tier: 'legendary',
    description: '+25 HP, +15 Might, +15 Power, +15 Defense while this character is alive.',
    statBonus: { hp: 25, might: 15, power: 15, defense: 15 } },
  { id: 'warlords_grimoire', name: "Warlord's Grimoire", icon: '📖', tier: 'legendary',
    description: 'On turns 2, 3, and 4 of each fight, draw +2 cards and gain +2 Mana.',
    passiveTag: 'grimoire_early_surge' },
  { id: 'neural_link', name: 'Neural Link', icon: '🧬', tier: 'rare',
    description: 'This character can play 1 extra card per turn (4 max instead of 3).',
    passiveTag: 'cards_per_turn_plus_1' },
  { id: 'battle_drill', name: 'Battle Drill', icon: '⚔️', tier: 'rare',
    description: 'At the start of each turn, add a free Basic Attack card to your hand.',
    passiveTag: 'free_basic_each_turn' },
  { id: 'mana_crystal', name: 'Mana Crystal', icon: '🔷', tier: 'rare',
    description: 'Gain +1 Mana at the start of each turn.',
    passiveTag: 'mana_plus_1_per_turn' },
];

// ── Signature Legendaries ─────────────────────────────────────────────────────
// One per character. Awarded after Act 1 and Act 2 boss kills (player picks which
// character receives theirs). These are NOT in the regular ITEMS pool.

export const SIGNATURE_LEGENDARIES: Record<CharacterId, RunItem> = {
  napoleon: {
    id: 'sig_napoleon', name: "Marshal's Baton", icon: '🏅', tier: 'legendary',
    targetCharacter: 'napoleon', isSignature: true,
    description: 'Artillery Barrage hits ALL enemies within 2 hexes of the target for 30% of the damage dealt.',
    passiveTag: 'sig_napoleon_barrage_splash',
  },
  genghis: {
    id: 'sig_genghis', name: 'Eternal Steppe', icon: '🌾', tier: 'legendary',
    targetCharacter: 'genghis', isSignature: true,
    description: 'Bloodlust stacks no longer cap at 3. Each stack also grants +1 movement.',
    passiveTag: 'sig_genghis_uncapped_bloodlust',
  },
  davinci: {
    id: 'sig_davinci', name: 'Codex Atlanticus', icon: '📜', tier: 'legendary',
    targetCharacter: 'davinci', isSignature: true,
    description: 'Tinkerer draws +1 extra card always (base 2, 3 with Drone). Vitruvian Guardian spawns with +30 HP.',
    passiveTag: 'sig_davinci_codex',
  },
  leonidas: {
    id: 'sig_leonidas', name: 'Thermopylae Stone', icon: '🪨', tier: 'legendary',
    targetCharacter: 'leonidas', isSignature: true,
    description: 'Phalanx stacks also grant +5 Might each. At 3 stacks, basic attacks Taunt the target.',
    passiveTag: 'sig_leonidas_thermopylae',
  },
  sunsin: {
    id: 'sig_sunsin', name: "Admiral's Turtle Helm", icon: '🐢', tier: 'legendary',
    targetCharacter: 'sunsin', isSignature: true,
    description: 'Water form: Regen 10 HP/turn. Land form: basic attack range +1.',
    passiveTag: 'sig_sunsin_turtle_helm',
  },
  beethoven: {
    id: 'sig_beethoven', name: 'Heiligenstadt Score', icon: '🎼', tier: 'legendary',
    targetCharacter: 'beethoven', isSignature: true,
    description: 'Crescendo grants +3 Power per stack instead of +2 (max +45 at 15 stacks). Götterfunken stuns for 2 turns.',
    passiveTag: 'sig_beethoven_heiligenstadt',
  },
  huang: {
    id: 'sig_huang', name: 'Jade Seal', icon: '🟢', tier: 'legendary',
    targetCharacter: 'huang', isSignature: true,
    description: 'Terracotta summons last +2 turns and spawn with +20% stats.',
    passiveTag: 'sig_huang_jade_seal',
  },
  nelson: {
    id: 'sig_nelson', name: "Victory's Pennant", icon: '🚩', tier: 'legendary',
    targetCharacter: 'nelson', isSignature: true,
    description: 'Crossing the T pierces through ALL enemies in the line with no damage decay.',
    passiveTag: 'sig_nelson_no_decay',
  },
  hannibal: {
    id: 'sig_hannibal', name: "Carthage's Oath", icon: '🐘', tier: 'legendary',
    targetCharacter: 'hannibal', isSignature: true,
    description: 'Cannae flanking bonus increased to 70%. War Elephant lasts +1 turn.',
    passiveTag: 'sig_hannibal_carthage',
  },
  picasso: {
    id: 'sig_picasso', name: 'Rose Period Canvas', icon: '🌹', tier: 'legendary',
    targetCharacter: 'picasso', isSignature: true,
    description: 'Fractured Perspective triggers every 2nd card instead of 3rd.',
    passiveTag: 'sig_picasso_rose_period',
  },
  teddy: {
    id: 'sig_teddy', name: 'Bull Moose Heart', icon: '🫀', tier: 'legendary',
    targetCharacter: 'teddy', isSignature: true,
    description: 'Survive lethal damage once per fight (1 HP). Bully! stacks also grant +10 Defense.',
    passiveTag: 'sig_teddy_bull_moose',
  },
  mansa: {
    id: 'sig_mansa', name: 'Infinite Vault', icon: '🏦', tier: 'legendary',
    targetCharacter: 'mansa', isSignature: true,
    description: 'Start each fight with +25 Power (converted from your gold reserves).',
    statBonus: { power: 25 },
    passiveTag: 'sig_mansa_vault',
  },
};

// ── Card Reward Pool ──────────────────────────────────────────────────────────
//
// Card drop rules by encounter type:
//   enemy    — shared cards only (exclusiveTo === null, non-ultimate)
//   elite    — character-exclusive ability cards only (3 choices from party pool)
//   boss     — ultimates only (Act 1: 3 choices, Act 2: 2 choices, Act 3: 1 choice)
//   merchant — all non-ultimate cards (shared + exclusive abilities)

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
  { definitionId: 'shared_silence',         name: 'Silence',          icon: '🔇', manaCost: 3, rarity: 'uncommon', description: 'Silences target — prevents ability use for 2 turns. Range 2.' },
  { definitionId: 'shared_poison_dart',     name: 'Poison Dart',      icon: '☠️', manaCost: 3, rarity: 'uncommon', description: 'Apply Poison — target loses Might/DEF each turn. Range 2.' },
  { definitionId: 'shared_fortify',         name: 'Fortify',          icon: '🏰', manaCost: 2, rarity: 'uncommon', description: 'Cannot move this turn. +25 DEF, +15 Might until end of next turn.' },
  { definitionId: 'shared_taunt',           name: 'Taunt',            icon: '😤', manaCost: 2, rarity: 'uncommon', description: 'Enemy AI focuses this unit 2 turns. This unit gains +15 Defense.' },
  { definitionId: 'shared_decoy',           name: 'Decoy',            icon: '🎭', manaCost: 2, rarity: 'uncommon', description: 'Place a 30 HP decoy. Enemies target it. Explodes for 20 dmg when destroyed.' },
  { definitionId: 'shared_retribution',    name: 'Retribution',      icon: '⚡', manaCost: 2, rarity: 'uncommon', description: 'Deal damage equal to HP lost this fight to one enemy. Range 3.' },
  // ── Rare shared ───────────────────────────────────────────────────────────
  { definitionId: 'shared_blood_price', name: 'Blood Price', icon: '🩸', manaCost: 2, rarity: 'rare', description: 'Lose 20% HP. All allies gain +15 Might and +15 Power this turn.' },
  { definitionId: 'shared_overcharge',  name: 'Overcharge',  icon: '🔋', manaCost: 2, rarity: 'rare', description: 'Next card played this turn costs 0 Mana. (Still uses a card play.)' },
  // ── Rare — Napoleon ───────────────────────────────────────────────────────
  { definitionId: 'napoleon_artillery_barrage', name: 'Artillery Barrage', icon: '💥', manaCost: 2, rarity: 'rare', description: 'Power×1.3 dmg at range 4.', exclusiveTo: 'Napoleon' },
  { definitionId: 'napoleon_grande_armee',      name: 'Grande Armée',      icon: '⚔️', manaCost: 3, rarity: 'rare', description: '+15% Might & Power to all allies for 2 turns.', exclusiveTo: 'Napoleon' },
  // ── Ultimate — Napoleon ───────────────────────────────────────────────────
  { definitionId: 'napoleon_final_salvo', name: 'Final Salvo', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — 3 shots each dealing Power×0.7 to random enemies. Range 4.', exclusiveTo: 'Napoleon' },
  // ── Rare — Genghis ────────────────────────────────────────────────────────
  { definitionId: 'genghis_mongol_charge', name: 'Mongol Charge', icon: '⚡', manaCost: 2, rarity: 'rare', description: 'Power×1.2 dmg at range 3. Applies Bleed (2 turns).', exclusiveTo: 'Genghis' },
  { definitionId: 'genghis_horde_tactics', name: 'Horde Tactics', icon: '🌀', manaCost: 3, rarity: 'rare', description: 'Power×0.6 per enemy in range — hits all enemies in range 2.', exclusiveTo: 'Genghis' },
  // ── Ultimate — Genghis ────────────────────────────────────────────────────
  { definitionId: 'genghis_riders_fury', name: "Rider's Fury", icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Power×1.0 to all enemies on a line, range 5. Doubled if target <40% HP.', exclusiveTo: 'Genghis' },
  // ── Rare — Da Vinci ───────────────────────────────────────────────────────
  { definitionId: 'davinci_flying_machine', name: 'Flying Machine', icon: '✈️', manaCost: 2, rarity: 'rare', description: 'Teleport to any unoccupied hex on the board.', exclusiveTo: 'Da Vinci' },
  { definitionId: 'davinci_masterpiece',    name: 'Masterpiece',    icon: '💚', manaCost: 3, rarity: 'rare', description: 'Heal an ally for Power×1.0 HP. Removes Poison. Range 3.', exclusiveTo: 'Da Vinci' },
  // ── Ultimate — Da Vinci ───────────────────────────────────────────────────
  { definitionId: 'davinci_vitruvian_guardian', name: 'Vitruvian Guardian', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Summon a combat drone (HP 75, Might 50, DEF 30). Lasts until defeated.', exclusiveTo: 'Da Vinci' },
  // ── Rare — Leonidas ───────────────────────────────────────────────────────
  { definitionId: 'leonidas_shield_bash',  name: 'Shield Bash',  icon: '⚡', manaCost: 2, rarity: 'rare', description: 'Power×1.2 dmg at range 1 + Armor Break (−25% DEF, 2t) + counter-stance (+20 DEF this turn).', exclusiveTo: 'Leonidas' },
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
  { definitionId: 'huang_terracotta_summon', name: 'Terracotta Legion',      icon: '🗿', manaCost: 2, rarity: 'rare', description: 'Summon Terracotta Archer or Warrior on a hex. HP 40, scales with stats. Lasts 2 turns.', exclusiveTo: 'Huang' },
  { definitionId: 'huang_first_emperor',    name: "First Emperor's Command", icon: '⚔️', manaCost: 3, rarity: 'rare', description: 'Summon Terracotta Cavalry adjacent. HP 60, scales with stats. Lasts 2 turns. Gain free Cavalry Charge.', exclusiveTo: 'Huang' },
  // ── Ultimate — Huang-chan ─────────────────────────────────────────────────
  { definitionId: 'huang_eternal_army', name: 'Eternal Army', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Control a non-boss enemy for 2 turns. They attack the nearest foe.', exclusiveTo: 'Huang' },
  // ── Rare — Nelson-chan ────────────────────────────────────────────────────
  { definitionId: 'nelson_crossing_the_t', name: 'Crossing the T',  icon: '⚓', manaCost: 2, rarity: 'rare',    description: 'Fire a line shot at range 5 — ~65 dmg 1st, ~40 2nd, ~26 3rd+. Damage falls off 65% each hit.', exclusiveTo: 'Nelson' },
  { definitionId: 'nelson_kiss_me_hardy',  name: 'Kiss Me Hardy',   icon: '💨', manaCost: 2, rarity: 'rare',    description: 'Charge up to 4 hexes in a line. Each enemy in path takes ~55 dmg and is pushed sideways 1 hex.', exclusiveTo: 'Nelson' },
  // ── Ultimate — Nelson-chan ────────────────────────────────────────────────
  { definitionId: 'nelson_trafalgar_square', name: 'Trafalgar Square', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — ~130 dmg to one target at range 4. If target dies, deal ~50 dmg to all adjacent enemies.', exclusiveTo: 'Nelson' },
  // ── Rare — Hannibal-chan ──────────────────────────────────────────────────
  { definitionId: 'hannibal_alpine_march',      name: 'Alpine March',      icon: '🏔️', manaCost: 1, rarity: 'rare',    description: 'Charge up to 6 hexes in a straight line across any terrain.', exclusiveTo: 'Hannibal' },
  { definitionId: 'hannibal_double_envelopment',name: 'Double Envelopment', icon: '🌀', manaCost: 2, rarity: 'rare',    description: '~55 dmg to a target at range 3, then ~28 dmg to all enemies adjacent to that target.', exclusiveTo: 'Hannibal' },
  // ── Ultimate — Hannibal-chan ──────────────────────────────────────────────
  { definitionId: 'hannibal_war_elephant', name: 'War Elephant', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Summon a War Elephant adjacent (HP 120, Might 70, DEF 20, Move 2). Lasts 2 turns.', exclusiveTo: 'Hannibal' },
  // ── Rare — Picasso-chan ───────────────────────────────────────────────────
  { definitionId: 'picasso_guernica',     name: 'Guernica',     icon: '💥', manaCost: 2, rarity: 'rare',    description: '~70 dmg to ALL enemies within range 2. Apply Armor Break (−25% DEF, 2 turns).', exclusiveTo: 'Picasso' },
  { definitionId: 'picasso_cubist_mirror',name: 'Cubist Mirror', icon: '🪞', manaCost: 2, rarity: 'rare',    description: 'Swap positions with any unit in range 4. If an enemy, deal ~35 dmg on swap.', exclusiveTo: 'Picasso' },
  // ── Ultimate — Picasso-chan ───────────────────────────────────────────────
  { definitionId: 'picasso_blue_period', name: 'Blue Period', icon: '⭐', manaCost: 3, rarity: 'ultimate', description: 'ULTIMATE — Scramble all units to random positions. Heal all allies 60 HP, +20 DEF until next turn.', exclusiveTo: 'Picasso' },
  // ── Rare — Teddy-chan ─────────────────────────────────────────────────────
  { definitionId: 'teddy_speak_softly', name: 'Speak Softly', icon: '📣', manaCost: 2, rarity: 'rare',    description: 'All enemies in range 2 are Taunted for 2 turns — must target Teddy. Teddy gains +30 DEF.', exclusiveTo: 'Teddy' },
  { definitionId: 'teddy_big_stick',    name: 'Big Stick',    icon: '🏏', manaCost: 2, rarity: 'rare',    description: '~87 Might dmg at range 1. Doubled (~174) if target is Stunned or Taunted.', exclusiveTo: 'Teddy' },
  // ── Ultimate — Teddy-chan ─────────────────────────────────────────────────
  { definitionId: 'teddy_rough_riders_rally', name: "Rough Riders' Rally", icon: '⭐', manaCost: 3, rarity: 'ultimate', description: "ULTIMATE — Allies gain +25 Might and +2 Move. Teddy gains +45 Might and teleports range 5.", exclusiveTo: 'Teddy' },
  // ── Rare — Mansa-chan ─────────────────────────────────────────────────────
  { definitionId: 'mansa_salt_road',   name: 'Salt Road',    icon: '⚗️', manaCost: 1, rarity: 'rare',    description: 'Place a 7-hex mana zone within range 3. Allies starting their turn on it restore 1 Mana. Lasts 2 turns.', exclusiveTo: 'Mansa' },
  { definitionId: 'mansa_hajj_of_gold',name: 'Hajj of Gold', icon: '✨', manaCost: 2, rarity: 'rare',    description: 'Heal all allies for 20% of max HP. All allies gain +10 Power until end of turn.', exclusiveTo: 'Mansa' },
  // ── Ultimate — Mansa-chan ─────────────────────────────────────────────────
  { definitionId: 'mansa_bounty', name: "Mansa's Bounty", icon: '⭐', manaCost: 2, rarity: 'ultimate', description: "ULTIMATE — Golden Stasis: freeze all units on the board for 1 turn. Use the pause to reposition and plan.", exclusiveTo: 'Mansa' },
];

// ── Encounter Builders ────────────────────────────────────────────────────────

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Grand Finale (Act 4 Boss) ─────────────────────────────────────────────────
// 4-phase fight: Iron Wall → Twin Terrors → Znyxorga's Champion → Vel'Zar
// Each phase spawns fresh when the previous wave is wiped. Mana refills between phases.
export const GRAND_FINALE_ENCOUNTER: EncounterDef = {
  name: "Grand Finale — Emperor's Gauntlet",
  objective: 'defeat_all',
  objectiveLabel: 'Defeat all enemies',
  enemies: [ENEMIES.iron_wall],  // Phase 1
  phases: [
    [ENEMIES.twin_terror_a, ENEMIES.twin_terror_b],  // Phase 2
    [ENEMIES.znyxorga_champion],                      // Phase 3
    [ENEMIES.velzar_will],                            // Phase 4
  ],
  goldReward: 120,
  xpReward: 560,       // 160 × 3.5 (Act 4 scale)
  bonusXpNoHit: 210,   //  60 × 3.5
  bonusXpFast: 140,    //  40 × 3.5
  itemDropChance: 1.0,
  guaranteedItem: true,
};

function buildEncounter(
  type: 'enemy' | 'elite' | 'boss',
  act: 1 | 2 | 3 | 4,
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
  const act2EarlyPool = [ENEMIES.vrex_mimic, ENEMIES.crystalline_hive];
  const act2Pool  = [ENEMIES.naxion_shieldbearer, ENEMIES.grox_magnetar, ENEMIES.vrex_mimic, ENEMIES.crystalline_hive];
  const act2LatePool = [...latePool, ENEMIES.naxion_shieldbearer, ENEMIES.grox_magnetar];
  // Act 3 Champion's Gauntlet: rows 1-3 ease in with Act 2 faces, then empire champions take over
  const act3Pool     = [ENEMIES.naxion_warmaster, ENEMIES.grox_titan, ENEMIES.velthrak_shadowblade];
  const act3LatePool = [ENEMIES.naxion_warmaster, ENEMIES.grox_titan, ENEMIES.velthrak_shadowblade];
  // Act 4: total chaos — every enemy from Acts 1-3 thrown together.
  // Act 1 units are weaker in base stats but the scaleFactor (~1.7-1.9) closes the gap.
  // krath_berserker, phasewarden, and Act 3 champions are elite-tier; kept out of normal pools, elite pool only.
  const act4Pool = [
    // Act 1 originals (familiar faces, now upgraded by scale factor)
    ENEMIES.glorp_shambler, ENEMIES.zyx_skitter,
    ENEMIES.naxion_scout,   ENEMIES.vron_crawler,
    ENEMIES.mog_toxin,      ENEMIES.qrix_hunter,   ENEMIES.void_wraith,
    // Act 2 threats
    ENEMIES.vrex_mimic,     ENEMIES.crystalline_hive,
    // Act 2/3 heavies (normal encounter filler in Act 4)
    ENEMIES.naxion_shieldbearer, ENEMIES.grox_magnetar,
    // Act 3 champions (these hit hard — Act 4 scaleFactor makes them brutal)
    ENEMIES.naxion_warmaster, ENEMIES.grox_titan, ENEMIES.velthrak_shadowblade,
  ];

  const enemyPool = act === 1
    ? (row <= 3 ? earlyPool : row <= 6 ? midPool : latePool)
    : act === 2
      ? (row <= 3 ? act2EarlyPool : row <= 5 ? act2Pool : act2LatePool)
      : act === 3
        ? (row <= 3 ? act2EarlyPool : row <= 6 ? act3Pool : act3LatePool)
        : act4Pool;

  let enemies: EnemyTemplate[];
  let name: string;
  let xp: number;
  let gold: number;
  let dropChance: number;

  // XP scales with act: Act 1 = ×1.0, Act 2 = ×1.5, Act 3 = ×2.5, Act 4 = ×3.5.
  // Designed so chars reach level 4 entering Act 2, level 6 entering Act 3, level 8 mid-Act 4.
  const actXpScale = act === 1 ? 1.0 : act === 2 ? 1.5 : act === 3 ? 2.5 : 3.5;

  if (type === 'boss') {
    if (act === 1)      enemies = [ENEMIES.iron_wall];
    else if (act === 2) enemies = [ENEMIES.twin_terror_a, ENEMIES.twin_terror_b];
    else if (act === 3) enemies = [ENEMIES.znyxorga_champion];
    else                return GRAND_FINALE_ENCOUNTER; // Act 4: 4-phase Grand Finale
    name = `Act ${act} Boss`;
    xp = Math.round(160 * actXpScale); gold = 90 + Math.floor(rng() * 30); dropChance = 1.0;
  } else if (type === 'elite') {
    // Late-row elites (rows 9-10) get the harder pair — doubled enemy count
    const useToughElite = row >= 9;
    // Act 4: any elite from Acts 1-2 can appear (total chaos)
    const act3EliteOptions: EnemyTemplate[][] = [
      [ENEMIES.krath_berserker],
      [ENEMIES.phasewarden],
      [ENEMIES.naxion_warmaster],
      [ENEMIES.grox_titan],
      [ENEMIES.velthrak_shadowblade],
    ];
    const act4EliteOptions: EnemyTemplate[][] = [
      [ENEMIES.krath_champion],
      [ENEMIES.spore_cluster, ENEMIES.spore_cluster, ENEMIES.spore_cluster],
      [ENEMIES.krath_berserker],
      [ENEMIES.phasewarden],
      [ENEMIES.naxion_warmaster],
      [ENEMIES.grox_titan],
      [ENEMIES.velthrak_shadowblade],
      [ENEMIES.naxion_shieldbearer],
      [ENEMIES.grox_magnetar],
    ];
    const baseElites = act === 1
      ? (useToughElite || rng() < 0.5 ? [ENEMIES.krath_champion] : [ENEMIES.spore_cluster, ENEMIES.spore_cluster, ENEMIES.spore_cluster])
      : act === 3
        ? pick(act3EliteOptions, rng)
        : act === 4
          ? pick(act4EliteOptions, rng)
          : (rng() < 0.5 ? [ENEMIES.krath_berserker] : [ENEMIES.phasewarden]);
    // Add extra enemies alongside the elite. Act 3 gets 2 extras from the champion pool.
    const eliteExtraPool = act === 3 ? act3Pool : act === 4 ? act4Pool : latePool;
    const extraCount = act <= 3 ? 2 : 1;
    const extraEnemies = Array.from({ length: extraCount }, () => pick(eliteExtraPool, rng));
    enemies = [...baseElites, ...extraEnemies];
    name = 'Elite Encounter';
    xp = Math.round((60 + row * 2) * actXpScale); gold = 40 + Math.floor(rng() * 25); dropChance = 0.90;
  } else if (act === 4) {
    // Act 4: more enemies than Acts 1-3, but capped to keep fights winnable.
    // krath_berserker and phasewarden only appear in elite fights (too strong for normal pools).
    const act4Count = row <= 3
      ? (rng() < 0.5 ? 4 : 3)
      : row <= 7
        ? (rng() < 0.65 ? 5 : 4)
        : (rng() < 0.70 ? 6 : 5);
    enemies = Array.from({ length: act4Count }, () => pick(act4Pool, rng));
    name = `${act4Count} Enemies`;
    xp = Math.round((40 + row * 3) * actXpScale); gold = 20 + Math.floor(rng() * 22) + row; dropChance = 0.65 + row * 0.02;
  } else {
    // Standard enemy: 2 or 4 enemies (early/mid rows); 3 or 5 enemies (late rows — harder fights)
    // Act 3+ pushes toward the higher count more aggressively
    const isLateRow = (act === 1 && row >= 7) || (act === 2 && row >= 6) || (act >= 3 && row >= 7);
    const highPct = act >= 3
      ? (row <= 3 ? 0.45 : row <= 6 ? 0.65 : 0.85)
      : (row <= 3 ? 0.30 : row <= 6 ? 0.45 : 0.55);
    const baseCount = rng() < highPct ? 2 : 1;
    const count = isLateRow ? baseCount * 2 + 1 : baseCount * 2; // late: 3 or 5; normal: 2 or 4
    enemies = Array.from({ length: count }, () => pick(enemyPool, rng));
    name = `${count} Enemies`;
    xp = Math.round((35 + row * 3) * actXpScale); gold = 18 + Math.floor(rng() * 20) + row; dropChance = 0.60 + row * 0.02;
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
    goldReward: gold, xpReward: xp,
    bonusXpNoHit: Math.round(60 * actXpScale), bonusXpFast: Math.round(40 * actXpScale),
    itemDropChance: dropChance, guaranteedItem: type === 'boss',
  };
}

// ── Node Type Picker ──────────────────────────────────────────────────────────
//
// Non-battle types (elite, campfire, merchant, unknown, treasure) cannot appear
// back-to-back on any connected path. If a direct predecessor node already has
// one of these types, that type is excluded and weights re-normalised.
//
// Design intent:
//   ~Every 2-3 rows is a normal enemy fight (backbone of the game)
//   Elite chance low-to-moderate (10% early → 30% late)
//   Unknown spread across all segments, slightly elevated
//   Campfire & merchant weighted higher (only appear in ~half the map tiles)
//   Treasure small chance in almost every row
//   Row 12 has no campfire (back-to-back with forced campfire at row 13)

const CONSECUTIVE_BANNED: ReadonlySet<NodeType> = new Set(['elite', 'campfire', 'merchant', 'unknown', 'treasure']);

function pickNodeType(
  row: number,
  rng: () => number,
  predecessorTypes?: ReadonlySet<NodeType>,
): NodeType {
  const BASE_TABLES: Record<number, [NodeType, number][]> = {
    //           enemy   elite   camp    merch   unkn    treas
    1:  [['enemy',0.40],                        ['unknown',0.30],['treasure',0.15],['campfire',0.15]],
    2:  [['enemy',0.35],         ['campfire',0.25],              ['unknown',0.25],['treasure',0.15]],
    3:  [['enemy',0.35],['elite',0.10],['merchant',0.25],        ['unknown',0.20],['treasure',0.10]],
    4:  [['enemy',0.30],['elite',0.10],['campfire',0.20],['merchant',0.20],['unknown',0.10],['treasure',0.10]],
    5:  [['enemy',0.35],['elite',0.15],['campfire',0.10],        ['unknown',0.25],['treasure',0.15]],
    6:  [['enemy',0.30],['elite',0.15],['campfire',0.20],['merchant',0.15],['unknown',0.10],['treasure',0.10]],
    7:  [['enemy',0.30],['elite',0.20],['campfire',0.20],['merchant',0.20],                ['treasure',0.10]],
    8:  [['enemy',0.30],['elite',0.20],          ['merchant',0.10],['unknown',0.25],['treasure',0.15]],
    9:  [['enemy',0.35],['elite',0.25],                   ['merchant',0.10],['unknown',0.20],['treasure',0.10]],
    10: [['enemy',0.30],['elite',0.25],['campfire',0.20],        ['unknown',0.15],['treasure',0.10]],
    11: [['enemy',0.35],['elite',0.25],          ['merchant',0.10],['unknown',0.20],['treasure',0.10]],
    12: [['enemy',0.40],['elite',0.30],          ['merchant',0.20],                ['treasure',0.10]],
    // Row 13 forced campfire, Row 14 forced boss — handled in generateActMap
  };

  let table = BASE_TABLES[row] ?? [['enemy', 1.0]];

  // Remove types that exist on any direct predecessor (back-to-back ban)
  if (predecessorTypes && predecessorTypes.size > 0) {
    table = table.filter(([t]) => !(CONSECUTIVE_BANNED.has(t) && predecessorTypes.has(t)));
    const total = table.reduce((s, [, w]) => s + w, 0);
    if (total > 0) table = table.map(([t, w]) => [t, w / total]);
    else table = [['enemy', 1.0]];
  }

  const roll = rng();
  let acc = 0;
  for (const [t, w] of table) {
    acc += w;
    if (roll <= acc) return t;
  }
  return table[table.length - 1]?.[0] ?? 'enemy';
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
// Slay-the-Spire style: 5-column grid, 15 rows. Free-crossing connection graph —
// each node connects to 1-3 nodes in the next row via ±2 column jumps. No
// monotone constraint, so paths can cross, branch, and merge freely. All paths
// converge to the single boss node (row 14, col 2).

export function generateActMap(seed: number, act: 1 | 2 | 3 | 4): RunNode[] {
  const rng = seededRng(seed + act * 997);
  const ROWS = 15; // rows 0–14; row 13 = pre-boss campfire, row 14 = boss
  const COLS = 5;

  // ── Connection-graph generation ───────────────────────────────────────────────
  // Row 0: all 5 columns active. Each active node independently picks 1-3 targets
  // in the next row using ±2 column jumps (shuffled, then take N). Minimum 3
  // active columns guaranteed per non-boss row. Paths can freely cross and merge.

  const nodeConns = new Map<string, Set<string>>();

  // Fisher-Yates shuffle using seeded rng
  const shuffleArr = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let activeCols: number[] = [0, 1, 2, 3, 4];

  for (let row = 0; row < ROWS - 1; row++) {
    const nextCols = new Set<number>();

    if (row === ROWS - 2) {
      // Pre-boss row (13): all campfire nodes converge to single boss node at col 2
      for (const col of activeCols) {
        const fromId = `r${row}c${col}`;
        if (!nodeConns.has(fromId)) nodeConns.set(fromId, new Set());
        nodeConns.get(fromId)!.add(`r${ROWS - 1}c2`);
      }
      nextCols.add(2);
    } else {
      for (const col of activeCols) {
        const fromId = `r${row}c${col}`;
        if (!nodeConns.has(fromId)) nodeConns.set(fromId, new Set());

        // Candidates: col ±2, clamped to [0, COLS-1]
        const candidates: number[] = [];
        for (let dc = -2; dc <= 2; dc++) {
          const nc = col + dc;
          if (nc >= 0 && nc < COLS) candidates.push(nc);
        }
        shuffleArr(candidates);

        // 50% → 1 connection, 45% → 2, 5% → 3 (rarely 3 to avoid web-like chaos)
        const r = rng();
        const numConns = r < 0.50 ? 1 : r < 0.95 ? 2 : 3;
        const chosen = candidates.slice(0, numConns);
        for (const nc of chosen) {
          nodeConns.get(fromId)!.add(`r${row + 1}c${nc}`);
          nextCols.add(nc);
        }
      }

      // Guarantee at least 3 active columns in next row
      while (nextCols.size < 3) {
        const missing = ([0, 1, 2, 3, 4] as number[]).filter(c => !nextCols.has(c));
        if (missing.length === 0) break;
        const pick = missing[Math.floor(rng() * missing.length)];
        nextCols.add(pick);
        // Connect from the nearest already-active source column
        const nearest = activeCols.reduce((best, c) =>
          Math.abs(c - pick) < Math.abs(best - pick) ? c : best
        );
        const fromId = `r${row}c${nearest}`;
        if (!nodeConns.has(fromId)) nodeConns.set(fromId, new Set());
        nodeConns.get(fromId)!.add(`r${row + 1}c${pick}`);
      }
    }

    activeCols = [...nextCols].sort((a, b) => a - b);
  }

  // ── Reverse connection map (toId → Set<fromId>) for predecessor lookups ──────
  const reverseConns = new Map<string, Set<string>>();
  for (const [fromId, toIds] of nodeConns) {
    for (const toId of toIds) {
      if (!reverseConns.has(toId)) reverseConns.set(toId, new Set());
      reverseConns.get(toId)!.add(fromId);
    }
  }

  // ── Collect all node IDs grouped by row ──────────────────────────────────────
  const allNodeIds = new Set<string>(nodeConns.keys());
  for (const conns of nodeConns.values()) conns.forEach(id => allNodeIds.add(id));

  // Group node IDs by row
  const nodeIdsByRow = new Map<number, { key: string; col: number }[]>();
  for (const key of allNodeIds) {
    const m = key.match(/r(\d+)c(\d+)/);
    if (!m) continue;
    const row = parseInt(m[1]);
    const col = parseInt(m[2]);
    if (!nodeIdsByRow.has(row)) nodeIdsByRow.set(row, []);
    nodeIdsByRow.get(row)!.push({ key, col });
  }

  // ── Build node objects ────────────────────────────────────────────────────────
  const nodeMap = new Map<string, RunNode>();

  for (let row = 0; row < ROWS; row++) {
    const entries = nodeIdsByRow.get(row) ?? [];

    for (const { key, col } of entries) {
      let type: NodeType;
      if (row === 0) {
        type = 'enemy';
      } else if (row === ROWS - 1) {
        type = 'boss';
      } else if (row === ROWS - 2) {
        type = 'campfire';
      } else {
        // Collect types of actual predecessor nodes (nodes with a direct connection to this one)
        const predecessorTypes = new Set<NodeType>();
        for (const predId of (reverseConns.get(key) ?? [])) {
          const predNode = nodeMap.get(predId);
          if (predNode) predecessorTypes.add(predNode.type);
        }
        type = pickNodeType(row, rng, predecessorTypes.size > 0 ? predecessorTypes : undefined);
      }

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
  nelson:    'nelson_crossing_the_t',
  hannibal:  'hannibal_double_envelopment',
  picasso:   'picasso_guernica',
  teddy:     'teddy_speak_softly',
  mansa:     'mansa_hajj_of_gold',
};

// ── Starting Characters ───────────────────────────────────────────────────────

export function buildStartingCharacters(itemSlots = 6): CharacterRunState[] {
  const emptyItems = Array(itemSlots).fill(null) as null[];
  return [
    {
      id: 'napoleon', displayName: 'Napoleon-chan', portrait: '/art/napoleon_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'genghis', displayName: 'Genghis-chan', portrait: '/art/genghis_portrait.png',
      currentHp: 120, maxHp: 120, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'davinci', displayName: 'Da Vinci-chan', portrait: '/art/davinci_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'leonidas', displayName: 'Leonidas-chan', portrait: '/art/leonidas_portrait.png',
      currentHp: 130, maxHp: 130, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'sunsin', displayName: 'Sun-sin-chan', portrait: '/art/sunsin_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'beethoven', displayName: 'Beethoven-chan', portrait: '/art/beethoven_portrait.png',
      currentHp: 95, maxHp: 95, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'huang', displayName: 'Huang-chan', portrait: '/art/huang_portrait.png',
      currentHp: 90, maxHp: 90, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'nelson', displayName: 'Nelson-chan', portrait: '/art/nelson_portrait.png',
      currentHp: 95, maxHp: 95, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'hannibal', displayName: 'Hannibal-chan', portrait: '/art/hannibal_portrait.png',
      currentHp: 110, maxHp: 110, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'picasso', displayName: 'Picasso-chan', portrait: '/art/picasso_portrait.png',
      currentHp: 95, maxHp: 95, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'teddy', displayName: 'Teddy-chan', portrait: '/art/teddy_portrait.png',
      currentHp: 140, maxHp: 140, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
    {
      id: 'mansa', displayName: 'Mansa-chan', portrait: '/art/mansa_portrait.png',
      currentHp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100,
      statBonuses: { hp: 0, might: 0, power: 0, defense: 0 }, pendingStatPoints: 0,
      pendingAbilityUpgrades: 0, pendingUltimateUpgrade: 0, upgradedAbilityIds: [],
      items: [...emptyItems],
    },
  ];
}

// XP thresholds per level (index = current level; value = XP needed to reach next level)
// Level cap is 8. Upgrade tokens at levels 2 & 5; ultimate upgrade at level 8.
export const XP_TO_NEXT = [0, 100, 220, 380, 580, 830, 1130, 1490, 9999];

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
  act: 1 | 2 | 3 | 4 = 1,
  merchantCount = 3,
  extraChoiceCount = 0,
): CardReward[] {
  // Block owned ultimates (one per character); filter exclusives by current party
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

  // Shared cards: no exclusiveTo, not ultimate
  const sharedPool = CARD_REWARD_POOL.filter(c => !c.exclusiveTo && c.rarity !== 'ultimate' && eligible(c));

  // Character-exclusive ability cards: has exclusiveTo, not ultimate (these are 'rare' tier)
  const exclusiveAbilities = CARD_REWARD_POOL.filter(c => !!c.exclusiveTo && c.rarity !== 'ultimate' && eligible(c));

  // Ultimates: rarity === 'ultimate', filtered by party + not already owned
  const ultimates = CARD_REWARD_POOL.filter(c => c.rarity === 'ultimate' && eligible(c));

  if (encounterType === 'boss') {
    // Ultimates only — choice count decreases each act: 3 in Act 1, 2 in Act 2, 1 in Acts 3+
    const choiceCount = Math.max(1, 4 - act);
    return shuffle(ultimates).slice(0, choiceCount);
  }

  if (encounterType === 'elite') {
    return shuffle(exclusiveAbilities).slice(0, 3 + extraChoiceCount);
  }

  if (encounterType === 'merchant') {
    return shuffle([...sharedPool, ...exclusiveAbilities]).slice(0, merchantCount);
  }

  // Normal enemy fight: shared cards only
  return shuffle(sharedPool).slice(0, 3 + extraChoiceCount);
}

/**
 * Roll an item tier based on encounter type.
 *
 * Normal:  Common 49% | Uncommon 33% | Rare 14% | Legendary 4%
 * Elite:   Common 12% | Uncommon 50% | Rare 30% | Legendary 8%
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
    if (r < 0.08) return 'legendary';
    if (r < 0.38) return 'rare';
    if (r < 0.88) return 'uncommon';
    return 'common';
  }
  // normal enemy
  if (r < 0.04) return 'legendary';
  if (r < 0.18) return 'rare';
  if (r < 0.51) return 'uncommon';
  return 'common';
}

export function pickItemReward(tier: 'common' | 'uncommon' | 'rare' | 'legendary', rng: () => number, teamCharIds?: string[]): RunItem {
  // Signature legendaries only available once the sig_legendaries run perk is unlocked
  const sigLegendariesUnlocked = (() => {
    try {
      const raw = localStorage.getItem('wcw_run_perks_v1');
      return raw ? (JSON.parse(raw) as string[]).includes('sig_legendaries') : false;
    } catch { return false; }
  })();
  // Strict tier match — character-specific items only if that character is alive on the team
  const pool = ITEMS.filter(i => i.tier === tier).filter(i => {
    if (i.isSignature && !sigLegendariesUnlocked) return false;
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

/** Boss reward: pick one exclusive rare item for a specific character, avoiding already-picked IDs. */
export function pickBossExclusiveItem(charId: string, excludeIds: string[], rng: () => number): RunItem {
  // Try character-specific rare first
  const exclusive = ITEMS.filter(i => i.tier === 'rare' && i.targetCharacter === charId && !excludeIds.includes(i.id));
  if (exclusive.length > 0) return exclusive[Math.floor(rng() * exclusive.length)];
  // Fallback: any rare not already picked
  const anyRare = ITEMS.filter(i => i.tier === 'rare' && !excludeIds.includes(i.id));
  if (anyRare.length > 0) return anyRare[Math.floor(rng() * anyRare.length)];
  // Last resort
  return ITEMS.filter(i => !i.targetCharacter)[0] ?? ITEMS[0];
}
