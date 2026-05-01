// Comprehensive achievements.ts reconstruction from committed base
// Adds all missing content from the previous session + current session's reordering
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/achievements.ts');
const raw = fs.readFileSync(filePath, 'utf8');
const hasCRLF = raw.includes('\r\n');
let c = hasCRLF ? raw.replace(/\r\n/g, '\n') : raw;

function rep(content, anchor, replacement, name) {
  if (!content.includes(anchor)) {
    console.error(`FAIL [${name}]: anchor not found`);
    console.error('  First 80 chars:', JSON.stringify(anchor.substring(0, 80)));
    process.exit(1);
  }
  return content.replace(anchor, replacement);
}

// ─── 1. Fix comment header count ────────────────────────────────────────────
c = rep(c, "// Achievement system — 76 achievements across 5 categories",
  "// Achievement system — 107 achievements across 5 categories", '1-header');
console.log('1. Updated achievement count in header');

// ─── 2. Insert 5 echo achievements after The Hajj ────────────────────────────
const afterHajj =
  "    statKey: 'mansa_ultimates', threshold: 50,\n    loreUnlockId: 'echo_mansa',\n  },\n  {\n    id: 'ultimate_power',";
const echoNew =
  "    statKey: 'mansa_ultimates', threshold: 50,\n    loreUnlockId: 'echo_mansa',\n  },\n" +
  "  {\n    id: 'echo_urkael',\n    name: 'Void Signal',\n    description: 'Use Singularity 50 times.',\n    points: 20, category: 'combat', icon: '\u{1F511}',\n    statKey: 'ult_used_urkael', threshold: 50,\n    loreUnlockId: 'echo_urkael',\n  },\n" +
  "  {\n    id: 'echo_musashi',\n    name: 'The Book',\n    description: 'Use Book of Five Rings 50 times.',\n    points: 20, category: 'combat', icon: '\u{1F4DC}',\n    statKey: 'ult_used_musashi', threshold: 50,\n    loreUnlockId: 'echo_musashi',\n  },\n" +
  "  {\n    id: 'echo_cleopatra',\n    name: 'Eternal Kingdom',\n    description: 'Use Eternal Kingdom 50 times.',\n    points: 20, category: 'combat', icon: '\u{1F441}\uFE0F',\n    statKey: 'ult_used_cleopatra', threshold: 50,\n    loreUnlockId: 'echo_cleopatra',\n  },\n" +
  "  {\n    id: 'echo_tesla',\n    name: 'Death Ray Protocol',\n    description: 'Use Death Ray 50 times.',\n    points: 20, category: 'combat', icon: '\u{1F4E1}',\n    statKey: 'ult_used_tesla', threshold: 50,\n    loreUnlockId: 'echo_tesla',\n  },\n" +
  "  {\n    id: 'echo_shaka',\n    name: 'Impondo Zankomo',\n    description: 'Use Impondo Zankomo 50 times.',\n    points: 20, category: 'combat', icon: '\u{1F30A}',\n    statKey: 'ult_used_shaka', threshold: 50,\n    loreUnlockId: 'echo_shaka',\n  },\n" +
  "  {\n    id: 'ultimate_power',";
c = rep(c, afterHajj, echoNew, '2-echo-new-chars');
console.log('2. Added 5 echo achievements after The Hajj');

// ─── 3. Insert kit moment achievements after `legend` ────────────────────────
const afterLegend =
  "    statKey: 'total_wins', threshold: 1000,\n    loreUnlockId: 'transmission_velk',\n  },\n\n  // \u2500\u2500 Clones";
const kitMoments =
  "    statKey: 'total_wins', threshold: 1000,\n    loreUnlockId: 'transmission_velk',\n  },\n\n" +
  "  // \u2500\u2500 Combat \u2014 original character kit moments \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'mitrailleur',\n    name: 'Mitrailleur',\n    description: 'Win a fight with Napoleon alive after 4 or more enemies were killed.',\n    points: 10, category: 'combat', icon: '\u{1F4A5}',\n    eventKey: 'napoleon_alive_4kills',\n  },\n" +
  "  {\n    id: 'blood_in_water',\n    name: 'Blood in the Water',\n    description: 'Reach 4 Bloodlust stacks in a single fight with Genghis.',\n    points: 10, category: 'combat', icon: '\u{1FA78}',\n    eventKey: 'genghis_bloodlust_4',\n  },\n" +
  "  {\n    id: 'still_standing',\n    name: 'Still Standing',\n    description: \"Win a fight with Da Vinci's Combat Drone still alive.\",\n    points: 10, category: 'combat', icon: '\u{1F916}',\n    eventKey: 'davinci_drone_alive_win',\n  },\n" +
  "  {\n    id: 'wall_of_bronze',\n    name: 'Wall of Bronze',\n    description: 'Reach 3 Phalanx stacks with Leonidas in a single fight.',\n    points: 10, category: 'combat', icon: '\u{1F3DB}\uFE0F',\n    eventKey: 'leonidas_max_phalanx',\n  },\n" +
  "  {\n    id: 'land_and_sea',\n    name: 'Land and Sea',\n    description: 'Win a fight with Yi Sun-sin positioned on a water tile.',\n    points: 10, category: 'combat', icon: '\u{1F422}',\n    eventKey: 'sunsin_wins_on_water',\n  },\n" +
  "  {\n    id: 'fortissimo',\n    name: 'Fortissimo',\n    description: 'Reach 10 Crescendo stacks with Beethoven in a single fight.',\n    points: 10, category: 'combat', icon: '\u{1F3B6}',\n    eventKey: 'beethoven_10_crescendo',\n  },\n" +
  "  {\n    id: 'still_rising',\n    name: 'Still Rising',\n    description: \"Win a fight with at least one of Huang's Terracotta units still alive.\",\n    points: 10, category: 'combat', icon: '\u{1F5FF}',\n    eventKey: 'huang_terracotta_alive_win',\n  },\n" +
  "  {\n    id: 'england_expects',\n    name: 'England Expects',\n    description: 'Win a fight with Nelson at full HP.',\n    points: 10, category: 'combat', icon: '\u2693',\n    eventKey: 'nelson_full_hp_win',\n  },\n" +
  "  {\n    id: 'the_elephant_remembers',\n    name: 'The Elephant Remembers',\n    description: \"Win a fight with Hannibal's War Elephant still alive on the board.\",\n    points: 10, category: 'combat', icon: '\u{1F418}',\n    eventKey: 'hannibal_elephant_alive_win',\n  },\n" +
  "  {\n    id: 'broken_canvas',\n    name: 'Broken Canvas',\n    description: \"Win a fight while an enemy has Armor Break from Picasso's Guernica.\",\n    points: 10, category: 'combat', icon: '\u{1F3A8}',\n    eventKey: 'picasso_guernica_win',\n  },\n" +
  "  {\n    id: 'bull_moose',\n    name: 'Bull Moose',\n    description: \"Reach 3 Bully! stacks with Teddy in a single fight.\",\n    points: 10, category: 'combat', icon: '\u{1F98C}',\n    eventKey: 'teddy_max_bully',\n  },\n" +
  "  {\n    id: 'golden_age',\n    name: 'Golden Age',\n    description: 'Win a fight with Mansa alive and 400+ gold in your treasury.',\n    points: 10, category: 'combat', icon: '\u{1F4B0}',\n    eventKey: 'mansa_treasury_win',\n  },\n\n" +
  "  // \u2500\u2500 Combat \u2014 new character gameplay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'the_bottleneck',\n    name: 'The Bottleneck',\n    description: 'Win a fight with Vel\u2019thar as the last clone standing.',\n    points: 10, category: 'combat', icon: '\u{1F300}',\n    eventKey: 'urkael_solo_win',\n    loreUnlockId: 'classified_urkael',\n  },\n" +
  "  {\n    id: 'volcanic_winter',\n    name: 'Volcanic Winter',\n    description: 'Accumulate 5 Bottleneck Survivor stacks in a single fight.',\n    points: 10, category: 'combat', icon: '\u{1F52E}',\n    eventKey: 'bottleneck_5_stacks',\n  },\n" +
  "  {\n    id: 'ganryujima',\n    name: 'Ganry\u016djima',\n    description: 'Kill 2 enemies in a single turn with Musashi-chan.',\n    points: 10, category: 'combat', icon: '\u2694\uFE0F',\n    eventKey: 'musashi_dual_kill',\n  },\n" +
  "  {\n    id: 'book_mastery',\n    name: 'Book of Five Rings',\n    description: 'Win a fight with Musashi at max Battle Scar stacks (4).',\n    points: 10, category: 'combat', icon: '\u{1F4DC}',\n    eventKey: 'musashi_max_stacks_win',\n    loreUnlockId: 'field_notes_musashi',\n  },\n" +
  "  {\n    id: 'sixty_one',\n    name: 'Sixty-One',\n    description: 'Stun 3 enemies with a single Eternal Kingdom.',\n    points: 10, category: 'combat', icon: '\u{1F451}',\n    eventKey: 'cleo_stun_3',\n  },\n" +
  "  {\n    id: 'nine_languages',\n    name: 'Nine Languages',\n    description: 'Use Royal Decree 5 times in a single run.',\n    points: 10, category: 'combat', icon: '\u{1F338}',\n    statKey: 'cleo_royal_decree_used', threshold: 5,\n  },\n" +
  "  {\n    id: 'the_ptolemaic_court',\n    name: 'The Ptolemaic Court',\n    description: 'Win a fight without Cleopatra taking any damage.',\n    points: 10, category: 'combat', icon: '\u{1F441}\uFE0F',\n    eventKey: 'cleopatra_no_damage_win',\n    loreUnlockId: 'field_notes_cleopatra',\n  },\n" +
  "  {\n    id: 'chain_reaction',\n    name: 'Chain Reaction',\n    description: 'Hit 3 or more enemies with a single Arc Bolt chain.',\n    points: 10, category: 'combat', icon: '\u26A1',\n    eventKey: 'tesla_chain_3',\n  },\n" +
  "  {\n    id: 'the_tower',\n    name: 'The Tower',\n    description: 'Deal 300 or more damage with a single Death Ray.',\n    points: 10, category: 'combat', icon: '\u{1F4E1}',\n    eventKey: 'tesla_death_ray_300',\n  },\n" +
  "  {\n    id: 'resonance_peak',\n    name: 'Resonance Peak',\n    description: 'Reach 5 Voltage stacks with Tesla in a single fight.',\n    points: 10, category: 'combat', icon: '\u{1F52E}',\n    eventKey: 'tesla_max_voltage',\n    loreUnlockId: 'field_notes_tesla',\n  },\n" +
  "  {\n    id: 'into_the_deep',\n    name: 'Into the Deep',\n    description: 'Kill an enemy by pulling them into water with Shaka-chan.',\n    points: 10, category: 'combat', icon: '\u{1F30A}',\n    eventKey: 'shaka_water_kill',\n  },\n" +
  "  {\n    id: 'bull_horn_push',\n    name: 'The Horns Close',\n    description: 'Use Impondo Zankomo to pull 3 or more enemies at once.',\n    points: 10, category: 'combat', icon: '\u{1F3F9}',\n    eventKey: 'shaka_impondo_3',\n  },\n" +
  "  {\n    id: 'formation',\n    name: 'Formation',\n    description: 'Have all 3 allies adjacent to Shaka at the start of a turn.',\n    points: 10, category: 'combat', icon: '\u{1F6E1}\uFE0F',\n    eventKey: 'shaka_full_formation',\n    loreUnlockId: 'field_notes_shaka',\n  },\n\n" +
  "  // \u2500\u2500 Clones";
c = rep(c, afterLegend, kitMoments, '3-kit-moments');
console.log('3. Added kit moment achievements and new char gameplay achievements');

// ─── 4. Reorder Clones section ────────────────────────────────────────────────
// Replace everything from "// ── Clones" through legacy_mansa + Arena comment line
const legacyMansaRunPerk = "    runPerk: { id: 'legacy_power_mansa', label: \"+5 Power per act \u2014 Mansa's Legacy\" },";
const mIdx = c.indexOf(legacyMansaRunPerk);
if (mIdx < 0) { console.error('FAIL [4]: legacy_mansa runPerk not found'); process.exit(1); }
const arenaCommentIdx = c.indexOf('\n  // \u2500\u2500 Arena ', mIdx);
if (arenaCommentIdx < 0) { console.error('FAIL [4]: Arena comment not found'); process.exit(1); }
const arenaLineEnd = c.indexOf('\n', arenaCommentIdx + 1);
const arenaLine = c.substring(arenaCommentIdx + 1, arenaLineEnd);

// Find start of clones section
const clonesHeaderIdx = c.indexOf('  // \u2500\u2500 Clones \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
if (clonesHeaderIdx < 0) { console.error('FAIL [4]: Clones header not found'); process.exit(1); }

// Build the new complete clones section
const newClonesSection =
  // Win-3: 12 original chars
  "  // \u2500\u2500 Clones \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'clone_napoleon',\n    name: 'Little Corporal',\n    description: 'Win 3 runs with Napoleon.',\n    points: 25, category: 'clones', icon: '\u{1F396}\uFE0F',\n    statKey: 'napoleon_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_napoleon',\n  },\n" +
  "  {\n    id: 'clone_genghis',\n    name: 'Daughter of the Steppe',\n    description: 'Win 3 runs with Genghis.',\n    points: 25, category: 'clones', icon: '\u{1F3D5}\uFE0F',\n    statKey: 'genghis_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_genghis',\n  },\n" +
  "  {\n    id: 'clone_davinci',\n    name: 'Mente Infinita',\n    description: 'Win 3 runs with Da Vinci.',\n    points: 25, category: 'clones', icon: '\u{1F52D}',\n    statKey: 'davinci_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_davinci',\n  },\n" +
  "  {\n    id: 'clone_leonidas',\n    name: 'Molon Labe',\n    description: 'Win 3 runs with Leonidas.',\n    points: 25, category: 'clones', icon: '\u{1F3DB}\uFE0F',\n    statKey: 'leonidas_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_leonidas',\n  },\n" +
  "  {\n    id: 'clone_sunsin',\n    name: '\u{C5F4}\u{B450} \u{CC99}',\n    description: 'Win 3 runs with Yi Sun-sin.',\n    points: 25, category: 'clones', icon: '\u26F5',\n    statKey: 'sunsin_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_sunsin',\n  },\n" +
  "  {\n    id: 'clone_beethoven',\n    name: 'Sternensturm',\n    description: 'Win 3 runs with Beethoven.',\n    points: 25, category: 'clones', icon: '\u{1F3BC}',\n    statKey: 'beethoven_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_beethoven',\n  },\n" +
  "  {\n    id: 'clone_huang',\n    name: '\u5973\u7687',\n    description: 'Win 3 runs with Huang.',\n    points: 25, category: 'clones', icon: '\u{1F451}',\n    statKey: 'huang_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_huang',\n  },\n" +
  "  {\n    id: 'clone_nelson',\n    name: 'Admiral Eternal',\n    description: 'Win 3 runs with Nelson.',\n    points: 25, category: 'clones', icon: '\u{1F30A}',\n    statKey: 'nelson_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_nelson',\n  },\n" +
  "  {\n    id: 'clone_hannibal',\n    name: 'Ante Portas',\n    description: 'Win 3 runs with Hannibal.',\n    points: 25, category: 'clones', icon: '\u{1F418}',\n    statKey: 'hannibal_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_hannibal',\n  },\n" +
  "  {\n    id: 'clone_picasso',\n    name: 'Cubismo',\n    description: 'Win 3 runs with Picasso.',\n    points: 25, category: 'clones', icon: '\u{1F3A8}',\n    statKey: 'picasso_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_picasso',\n  },\n" +
  "  {\n    id: 'clone_teddy',\n    name: 'Rough Rider',\n    description: 'Win 3 runs with Teddy Roosevelt.',\n    points: 25, category: 'clones', icon: '\u{1F920}',\n    statKey: 'teddy_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_teddy',\n  },\n" +
  "  {\n    id: 'clone_mansa',\n    name: 'Sultan al-Dhahab',\n    description: 'Win 3 runs with Mansa Musa.',\n    points: 25, category: 'clones', icon: '\u{1F4B0}',\n    statKey: 'mansa_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_mansa',\n  },\n" +
  // Win-3: 5 new chars
  "  {\n    id: 'win_3_urkael',\n    name: \"The Last One Standing\",\n    description: 'Win 3 runs with Vel\u2019thar-chan on your squad.',\n    points: 25, category: 'clones', icon: '\u{1F300}',\n    statKey: 'urkael_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_urkael',\n  },\n" +
  "  {\n    id: 'win_3_musashi',\n    name: 'Sword Saint',\n    description: 'Win 3 runs with Musashi-chan on your squad.',\n    points: 25, category: 'clones', icon: '\u2694\uFE0F',\n    statKey: 'musashi_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_musashi',\n  },\n" +
  "  {\n    id: 'win_3_cleopatra',\n    name: \"Queen's Gambit\",\n    description: 'Win 3 runs with Cleopatra-chan on your squad.',\n    points: 25, category: 'clones', icon: '\u{1F451}',\n    statKey: 'cleopatra_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_cleopatra',\n  },\n" +
  "  {\n    id: 'win_3_tesla',\n    name: 'Full Charge',\n    description: 'Win 3 runs with Tesla-chan on your squad.',\n    points: 25, category: 'clones', icon: '\u26A1',\n    statKey: 'tesla_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_tesla',\n  },\n" +
  "  {\n    id: 'win_3_shaka',\n    name: 'Bull Horn',\n    description: 'Win 3 runs with Shaka-chan on your squad.',\n    points: 25, category: 'clones', icon: '\u{1F6E1}\uFE0F',\n    statKey: 'shaka_runs_won', threshold: 3,\n    loreUnlockId: 'acquisition_shaka',\n  },\n\n" +
  // Legacy: 12 original chars
  "  // \u2500\u2500 Character Legacy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'legacy_napoleon',\n    name: \"Vive l'Empereur!\",\n    description: 'Bring Napoleon alive through Act 4. Grants him +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_napoleon',\n    runPerk: { id: 'legacy_might_napoleon', label: \"+5 Might per act \u2014 Napoleon's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_genghis',\n    name: 'Eternal Sky',\n    description: 'Bring Genghis Khan alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_genghis',\n    runPerk: { id: 'legacy_might_genghis', label: \"+5 Might per act \u2014 Genghis's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_davinci',\n    name: 'Maestro Immortale',\n    description: 'Bring Da Vinci alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_davinci',\n    runPerk: { id: 'legacy_power_davinci', label: \"+5 Power per act \u2014 Da Vinci's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_leonidas',\n    name: 'Come and Take It',\n    description: 'Bring Leonidas alive through Act 4. Grants him +5 Defense per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_leonidas',\n    runPerk: { id: 'legacy_defense_leonidas', label: \"+5 Defense per act \u2014 Leonidas's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_sunsin',\n    name: 'Undefeated Admiral',\n    description: 'Bring Yi Sun-sin alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_sunsin',\n    runPerk: { id: 'legacy_power_sunsin', label: \"+5 Power per act \u2014 Sun-sin's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_beethoven',\n    name: 'Ode to Survival',\n    description: 'Bring Beethoven alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_beethoven',\n    runPerk: { id: 'legacy_power_beethoven', label: \"+5 Power per act \u2014 Beethoven's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_huang',\n    name: 'Son of Heaven',\n    description: 'Bring Huang alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_huang',\n    runPerk: { id: 'legacy_might_huang', label: \"+5 Might per act \u2014 Huang's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_nelson',\n    name: 'England Expects',\n    description: 'Bring Nelson alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_nelson',\n    runPerk: { id: 'legacy_might_nelson', label: \"+5 Might per act \u2014 Nelson's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_hannibal',\n    name: 'By Any Means',\n    description: 'Bring Hannibal alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_hannibal',\n    runPerk: { id: 'legacy_might_hannibal', label: \"+5 Might per act \u2014 Hannibal's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_picasso',\n    name: 'Blue Period Legacy',\n    description: 'Bring Picasso alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_picasso',\n    runPerk: { id: 'legacy_power_picasso', label: \"+5 Power per act \u2014 Picasso's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_teddy',\n    name: 'The Lion of San Juan',\n    description: 'Bring Teddy Roosevelt alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_teddy',\n    runPerk: { id: 'legacy_might_teddy', label: \"+5 Might per act \u2014 Teddy's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_mansa',\n    name: 'Empire of Gold',\n    description: 'Bring Mansa Musa alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_mansa',\n    runPerk: { id: 'legacy_power_mansa', label: \"+5 Power per act \u2014 Mansa's Legacy\" },\n  },\n" +
  // Legacy: 5 new chars
  "  {\n    id: 'legacy_urkael',\n    name: 'Signal Persists',\n    description: \"Bring Vel\u2019thar alive through Act 4. Grants her +5 Power per act in all future runs.\",\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_urkael',\n    runPerk: { id: 'legacy_power_urkael', label: \"+5 Power per act \u2014 Vel\u2019thar's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_musashi',\n    name: 'No Second Stroke',\n    description: 'Bring Musashi alive through Act 4. Grants her +5 Might per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_musashi',\n    runPerk: { id: 'legacy_might_musashi', label: \"+5 Might per act \u2014 Musashi's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_cleopatra',\n    name: 'Eternal Court',\n    description: 'Bring Cleopatra alive through Act 4. Grants her +5 Defense per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_cleopatra',\n    runPerk: { id: 'legacy_defense_cleopatra', label: \"+5 Defense per act \u2014 Cleopatra's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_tesla',\n    name: 'Storm Eternal',\n    description: 'Bring Tesla alive through Act 4. Grants her +5 Power per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_tesla',\n    runPerk: { id: 'legacy_power_tesla', label: \"+5 Power per act \u2014 Tesla's Legacy\" },\n  },\n" +
  "  {\n    id: 'legacy_shaka',\n    name: 'Iron Formation',\n    description: 'Bring Shaka alive through Act 4. Grants her +5 Defense per act in all future runs.',\n    points: 10, category: 'clones', icon: '\u{1F3C5}',\n    eventKey: 'legacy_shaka',\n    runPerk: { id: 'legacy_defense_shaka', label: \"+5 Defense per act \u2014 Shaka's Legacy\" },\n  },\n\n" +
  // First run — new clones
  "  // \u2500\u2500 First run \u2014 new clones \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'first_observer',\n    name: 'First Observer',\n    description: 'Win a run with Vel\u2019thar-chan on your squad.',\n    points: 15, category: 'clones', icon: '\u{1F30C}',\n    statKey: 'urkael_runs_won', threshold: 1,\n  },\n" +
  "  {\n    id: 'first_blade',\n    name: 'First Blade',\n    description: 'Win a run with Musashi-chan on your squad.',\n    points: 15, category: 'clones', icon: '\u2694\uFE0F',\n    statKey: 'musashi_runs_won', threshold: 1,\n  },\n" +
  "  {\n    id: 'first_decree',\n    name: 'First Decree',\n    description: 'Win a run with Cleopatra-chan on your squad.',\n    points: 15, category: 'clones', icon: '\u{1F451}',\n    statKey: 'cleopatra_runs_won', threshold: 1,\n  },\n" +
  "  {\n    id: 'first_current',\n    name: 'First Current',\n    description: 'Win a run with Tesla-chan on your squad.',\n    points: 15, category: 'clones', icon: '\u26A1',\n    statKey: 'tesla_runs_won', threshold: 1,\n  },\n" +
  "  {\n    id: 'first_izigodlo',\n    name: 'First Izigodlo',\n    description: 'Win a run with Shaka-chan on your squad.',\n    points: 15, category: 'clones', icon: '\u{1F6E1}\uFE0F',\n    statKey: 'shaka_runs_won', threshold: 1,\n  },\n\n" +
  // Duo runs
  "  // \u2500\u2500 Duo runs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" +
  "  {\n    id: 'clash_of_swords',\n    name: 'Clash of Swords',\n    description: 'Win a run with both Musashi-chan and Leonidas-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u2694\uFE0F',\n    eventKey: 'musashi_leonidas_run_win',\n    loreUnlockId: 'conversation_musashi_leonidas',\n  },\n" +
  "  {\n    id: 'symmetry',\n    name: 'Symmetry',\n    description: 'Win a run with Da Vinci-chan and Beethoven-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u{1F3B5}',\n    eventKey: 'davinci_beethoven_run_win',\n    loreUnlockId: 'conversation_davinci_beethoven',\n  },\n" +
  "  {\n    id: 'the_pass_and_the_angle',\n    name: 'The Pass and the Angle',\n    description: 'Win a run with Leonidas-chan and Hannibal-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u{1F6E1}\uFE0F',\n    eventKey: 'leonidas_hannibal_run_win',\n    loreUnlockId: 'conversation_leonidas_hannibal',\n  },\n" +
  "  {\n    id: 'the_mirror',\n    name: 'The Mirror',\n    description: 'Win a run with Napoleon-chan and Sun-sin-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u2694\uFE0F',\n    eventKey: 'napoleon_sunsin_run_win',\n    loreUnlockId: 'conversation_napoleon_sunsin',\n  },\n" +
  "  {\n    id: 'the_canal_and_the_gold',\n    name: 'The Canal and the Gold',\n    description: 'Win a run with Teddy-chan and Mansa-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u{1F920}',\n    eventKey: 'teddy_mansa_run_win',\n    loreUnlockId: 'conversation_teddy_mansa',\n  },\n" +
  "  {\n    id: 'the_frequencies',\n    name: 'The Frequencies',\n    description: 'Win a run with Tesla-chan and Beethoven-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u26A1',\n    eventKey: 'tesla_beethoven_run_win',\n    loreUnlockId: 'field_notes_tesla',\n  },\n" +
  "  {\n    id: 'the_formation_holds',\n    name: 'The Formation Holds',\n    description: 'Win a run with Shaka-chan and Napoleon-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u{1F6E1}\uFE0F',\n    eventKey: 'shaka_napoleon_run_win',\n    loreUnlockId: 'field_notes_shaka',\n  },\n" +
  "  {\n    id: 'the_court_and_the_general',\n    name: 'The Court and the General',\n    description: 'Win a run with Cleopatra-chan and Hannibal-chan on the same squad.',\n    points: 10, category: 'clones', icon: '\u{1F451}',\n    eventKey: 'cleopatra_hannibal_run_win',\n    loreUnlockId: 'field_notes_cleopatra',\n  },\n\n" +
  // true_commander
  "  {\n    id: 'true_commander',\n    name: 'True Commander',\n    description: 'Win 10 runs with any single character.',\n    points: 25, category: 'clones', icon: '\u{1F451}',\n    eventKey: 'ten_runs_one_char',\n    loreUnlockId: 'echo_genghis',\n  },\n\n" +
  arenaLine;

// Extract the old clones section (from "// ── Clones" through the arena line)
const exactOldSection = c.substring(clonesHeaderIdx, arenaLineEnd);
c = rep(c, exactOldSection, newClonesSection, '4-clones-reorder');
console.log('4. Clones section fully reordered with all entries consolidated');

// ─── 5. Fix arena entries: thral_nor (char_teddy → char_mansa) and vel_zar_thral (char_mansa → char_urkael) ─
// Use loreUnlockId context to make each anchor unique
c = rep(c,
  "    loreUnlockId: 'final_entry',\n    runPerk: { id: 'char_teddy', label: 'Teddy Roosevelt unlocked' },",
  "    loreUnlockId: 'final_entry',\n    runPerk: { id: 'char_mansa', label: 'Mansa Musa unlocked' },",
  '5a-thral_nor-perk');
c = rep(c,
  "    loreUnlockId: 'velzar_log',\n    runPerk: { id: 'char_mansa', label: 'Mansa Musa unlocked' },",
  "    loreUnlockId: 'velzar_log',\n    runPerk: { id: 'char_urkael', label: \"Vel'thar unlocked\" },",
  '5b-vel_zar_thral-perk');
console.log('5. Fixed arena runPerks (Mansa/Urkael unlocks)');

// ─── 6. Add veterans_fury_unlock and emperors_coffers_unlock after vel_zar_thral ─
const afterVelZarThral =
  "    loreUnlockId: 'velzar_log',\n    runPerk: { id: 'char_urkael', label: \"Vel'thar unlocked\" },\n  },\n  {\n    id: 'krath_zyn',";
c = rep(c, afterVelZarThral,
  "    loreUnlockId: 'velzar_log',\n    runPerk: { id: 'char_urkael', label: \"Vel'thar unlocked\" },\n  },\n" +
  "  {\n    id: 'veterans_fury_unlock',\n    name: \"Veteran's Fury\",\n    description: 'Complete Act III. Whenever a clone falls in battle, the survivors permanently gain +15% Might & Power for the rest of that run.',\n    points: 0, category: 'arena', icon: '\u{1F531}',\n    eventKey: 'act_3_complete',\n    runPerk: { id: 'veterans_fury', label: \"+15% Might & Power when a clone falls \u2014 permanent for the run\" },\n  },\n" +
  "  {\n    id: 'emperors_coffers_unlock',\n    name: \"Emperor's Coffers\",\n    description: \"Complete Act IV. The Empire rewards your dominance \u2014 start every run with 150 bonus gold.\",\n    points: 0, category: 'arena', icon: '\u{1FA99}',\n    eventKey: 'act_4_complete',\n    runPerk: { id: 'emperors_coffers', label: \"Start each run with 150 bonus gold\" },\n  },\n" +
  "  {\n    id: 'krath_zyn',",
  '6-arena-additions');
console.log('6. Added veterans_fury_unlock and emperors_coffers_unlock');

// ─── 7. Fix full_roster_view threshold: 12 → 17 ──────────────────────────────
c = rep(c,
  "    statKey: 'characters_viewed', threshold: 12,",
  "    statKey: 'characters_viewed', threshold: 17,",
  '7-roster-threshold');
console.log('7. Fixed full_roster_view threshold to 17');

// ─── 8. Fix thren_vel_nor_thral threshold: 87 → 107 ─────────────────────────
c = rep(c,
  "    statKey: 'lore_entries_read', threshold: 87,",
  "    statKey: 'lore_entries_read', threshold: 107,",
  '8-lore-threshold');
console.log('8. Fixed thren_vel_nor_thral threshold to 107');

// ─── 9. Fix CHARACTER_UNLOCK_THRESHOLDS ──────────────────────────────────────
c = rep(c,
  "  picasso:   550,\n};",
  "  picasso:   550,\n  musashi:   700,\n  cleopatra: 850,\n  shaka:     1000,\n};",
  '9-unlock-thresholds');
console.log('9. Added musashi/cleopatra/shaka unlock thresholds');

// ─── 10. Fix CHARACTER_UNLOCK_EVENTS ─────────────────────────────────────────
c = rep(c,
  "export const CHARACTER_UNLOCK_EVENTS: Record<string, string> = {\n  teddy: 'thral_nor',  // Act III complete\n  mansa: 'vel_zar_thral', // Act IV complete\n};",
  "export const CHARACTER_UNLOCK_EVENTS: Record<string, string> = {\n  tesla:  'vel_nor',       // Act I complete\n  teddy:  'vel_krath',     // Act II complete\n  mansa:  'thral_nor',     // Act III complete\n  urkael: 'vel_zar_thral', // Act IV complete\n};",
  '10-unlock-events');
console.log('10. Updated CHARACTER_UNLOCK_EVENTS');

// Restore CRLF if needed
if (hasCRLF) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, c, 'utf8');
console.log('\nFile written!');

// === Verification ===
const norm = c.replace(/\r\n/g, '\n');
console.log('Total lines:', norm.split('\n').length);
const checks = [
  ['Arena section intact', norm.includes("id: 'first_steps'")],
  ['Enemies section intact', norm.includes("id: 'first_contact'")],
  ['Observer section intact', norm.includes("id: 'archivist'")],
  ['Secret section intact', norm.includes("id: 'thren_vel_nor_thral'")],
  ['Echo new chars in combat', norm.includes("id: 'echo_urkael'")],
  ['Kit moments in combat', norm.includes("id: 'mitrailleur'")],
  ['New char gameplay', norm.includes("id: 'the_bottleneck'")],
  ['win_3_urkael 25pts fixed statKey', norm.includes("statKey: 'urkael_runs_won', threshold: 3")],
  ['first_observer fixed statKey', norm.includes("statKey: 'urkael_runs_won', threshold: 1")],
  ['legacy_urkael present', norm.includes("id: 'legacy_urkael'")],
  ['first_blade present', norm.includes("id: 'first_blade'")],
  ['clash_of_swords 10pts', norm.includes("id: 'clash_of_swords'") && norm.includes("points: 10, category: 'clones'")],
  ['true_commander after duo', norm.lastIndexOf("id: 'true_commander'") > norm.lastIndexOf("id: 'the_court_and_the_general'")],
  ['thral_nor has char_mansa', norm.includes("id: 'char_mansa', label: 'Mansa Musa unlocked'")],
  ['vel_zar_thral has char_urkael', norm.includes("id: 'char_urkael'")],
  ['veterans_fury_unlock present', norm.includes("id: 'veterans_fury_unlock'")],
  ['emperors_coffers_unlock present', norm.includes("id: 'emperors_coffers_unlock'")],
  ['full_roster 17', norm.includes("threshold: 17")],
  ['lore threshold 107', norm.includes("threshold: 107")],
  ['musashi unlock threshold', norm.includes("musashi:   700")],
  ['urkael in unlock events', norm.includes("urkael: 'vel_zar_thral'")],
];
let allOk = true;
for (const [label, ok] of checks) { console.log(ok ? '  OK' : '  FAIL', label); if (!ok) allOk = false; }

const ids = [...norm.matchAll(/^\s+id: '([^']+)'/gm)].map(m => m[1]);
const counts = {};
for (const id of ids) counts[id] = (counts[id] || 0) + 1;
const dupes = Object.entries(counts).filter(([,v]) => v > 1);
if (dupes.length) { console.error('DUPLICATE IDs:', dupes); allOk = false; }
else console.log('  OK No duplicate IDs');
if (allOk) console.log('\nAll checks passed!');
