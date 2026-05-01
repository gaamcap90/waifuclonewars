// Shared character portrait resolver used across GameBoard, HorizontalGameUI, RespawnUI, CharacterSelection

// Hero 3D busts — head+shoulder render, used in HUD and Archives
const HERO_3D_BUSTS: Array<[string, string]> = [
  ["Napoleon",    "/art/napoleon_3d.png"],
  ["Genghis",     "/art/genghis_3d.png"],
  ["Da Vinci",    "/art/davinci_3d.png"],
  ["Leonidas",    "/art/leonidas_3d.png"],
  ["Sun-sin",     "/art/sunsin_3d.png"],
  ["Beethoven",   "/art/beethoven_3d.png"],
  ["Huang",       "/art/huang_3d.png"],
  ["Nelson",      "/art/nelson_3d.png"],
  ["Hannibal",    "/art/hannibal_3d.png"],
  ["Picasso",     "/art/picasso_3d.png"],
  ["Teddy",       "/art/teddy_3d.png"],
  ["Mansa",       "/art/mansa_3d.png"],
  ["Vel'thar",    "/art/velthar_3d.png"],
  ["Musashi",     "/art/musashi_3d.png"],
  ["Cleopatra",   "/art/cleopatra_3d.png"],
  ["Tesla",       "/art/tesla_3d.png"],
  ["Shaka",       "/art/shaka_3d.png"],
];

// Hero 3D sprites — full body on pedestal, used on the game board
const HERO_SPRITES: Array<[string, string]> = [
  ["Napoleon",    "/art/napoleon_sprite.png"],
  ["Genghis",     "/art/genghis_sprite.png"],
  ["Da Vinci",    "/art/davinci_sprite.png"],
  ["Leonidas",    "/art/leonidas_sprite.png"],
  ["Sun-sin",     "/art/sunsin_sprite.png"],
  ["Beethoven",   "/art/beethoven_sprite.png"],
  ["Huang",       "/art/huang_sprite.png"],
  ["Nelson",      "/art/nelson_sprite.png"],
  ["Hannibal",    "/art/hannibal_sprite.png"],
  ["Picasso",     "/art/picasso_sprite.png"],
  ["Teddy",       "/art/teddy_sprite.png"],
  ["Mansa",       "/art/mansa_sprite.png"],
  ["Vel'thar",    "/art/velthar_sprite.png"],
  ["Musashi",     "/art/musashi_sprite.png"],
  ["Cleopatra",   "/art/cleopatra_sprite.png"],
  ["Tesla",       "/art/tesla_sprite.png"],
  ["Shaka",       "/art/shaka_sprite.png"],
];

// Hero portraits — 2D art, used in CharacterSelection, VictoryScreen, Archives
const HERO_PORTRAITS: Array<[string, string]> = [
  ["Napoleon",    "/art/napoleon_portrait.png"],
  ["Genghis",     "/art/genghis_portrait.png"],
  ["Da Vinci",    "/art/davinci_portrait.png"],
  ["Leonidas",    "/art/leonidas_portrait.png"],
  ["Sun-sin",     "/art/sunsin_portrait.png"],
  ["Beethoven",   "/art/beethoven_portrait.png"],
  ["Huang",       "/art/huang_portrait.png"],
  ["Nelson",      "/art/nelson_portrait.png"],
  ["Hannibal",    "/art/hannibal_portrait.png"],
  ["Picasso",     "/art/picasso_portrait.png"],
  ["Teddy",       "/art/teddy_portrait.png"],
  ["Mansa",       "/art/mansa_portrait.png"],
  ["Vel'thar",    "/art/velthar_portrait.png"],
  ["Musashi",     "/art/musashi_portrait.png"],
  ["Cleopatra",   "/art/cleopatra_portrait.png"],
  ["Tesla",       "/art/tesla_portrait.png"],
  ["Shaka",       "/art/shaka_portrait.png"],
];

// Summoned unit portraits
const SUMMON_PORTRAITS: Array<[string, string]> = [
  ["Terracotta Cavalry",  "/art/terracotta_cavalry_portrait.png"],
  ["Terracotta Archer",   "/art/terracotta_archer_portrait.png"],
  ["Terracotta Warrior",  "/art/terracotta_warrior_portrait.png"],
  ["Combat Drone",        "/art/vitruvian_guardian_portrait.png"],
];

// Enemy portraits — drop PNGs into public/art/enemies/ and they auto-appear
const ENEMY_PORTRAITS: Array<[string, string]> = [
  ["Glorp Shambler",      "/art/enemies/glorp_shambler_portrait.png"],
  ["Zyx Skitter",         "/art/enemies/zyx_skitter_portrait.png"],
  ["Void Wraith",         "/art/enemies/void_wraith_portrait.png"],
  ["Krath Berserker",     "/art/enemies/krath_berserker_portrait.png"],
  ["Mog Toxin",           "/art/enemies/mog_toxin_portrait.png"],
  ["Qrix Hunter",         "/art/enemies/qrix_hunter_portrait.png"],
  ["Naxion Scout",        "/art/enemies/naxion_scout_portrait.png"],
  ["Vron Crawler",        "/art/enemies/vron_crawler_portrait.png"],
  ["Krath Champion",      "/art/enemies/krath_champion_portrait.png"],
  ["Spore Node",          "/art/enemies/spore_node_portrait.png"],
  ["Vexlar",              "/art/enemies/vexlar_portrait.png"],
  ["Iron Wall",           "/art/enemies/iron_wall_portrait.png"],
  ["Phasewarden",         "/art/enemies/phasewarden_portrait.png"],
  ["Terror Alpha",        "/art/enemies/terror_alpha_portrait.png"],
  ["Terror Beta",         "/art/enemies/terror_beta_portrait.png"],
  ["Znyxorga's Champion", "/art/enemies/znyxorgas_champion_portrait.png"],
  ["Naxion Shieldbearer", "/art/enemies/naxion_shieldbearer_portrait.png"],
  ["Grox Magnetar",       "/art/enemies/grox_magnetar_portrait.png"],
  ["Vrex Mimic",          "/art/enemies/vrex_mimic_portrait.png"],
  ["Crystalline Hive",    "/art/enemies/crystalline_hive_portrait.png"],
];

/** Returns the 3D sprite path for a hero unit (game board), or null if not found. */
export function getCharacterSprite(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [key, path] of HERO_SPRITES) {
    if (name.includes(key)) return path;
  }
  return null;
}

/** Returns the 3D bust path for a hero unit (HUD/Archives), or null if not found. */
export function getCharacter3DBust(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [key, path] of HERO_3D_BUSTS) {
    if (name.includes(key)) return path;
  }
  return null;
}

/** Fire-and-forget: start loading every portrait image so they're in the browser cache. */
export function preloadPortraits(): void {
  const allPaths = [
    ...HERO_3D_BUSTS,
    ...HERO_SPRITES,
    ...HERO_PORTRAITS,
    ...SUMMON_PORTRAITS,
    ...ENEMY_PORTRAITS,
  ].map(([, path]) => path);

  for (const src of allPaths) {
    const img = new Image();
    img.src = src;
  }
}

export function getCharacterPortrait(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [key, path] of SUMMON_PORTRAITS) {
    if (name.includes(key)) return path;
  }
  for (const [key, path] of HERO_PORTRAITS) {
    if (name.includes(key)) return path;
  }
  for (const [key, path] of ENEMY_PORTRAITS) {
    if (name.includes(key)) return path;
  }
  return null;
}
