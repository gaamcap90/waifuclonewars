// Shared character portrait resolver used across GameBoard, HorizontalGameUI, RespawnUI, CharacterSelection

// Hero portraits
const HERO_PORTRAITS: Array<[string, string]> = [
  ["Napoleon",    "/art/napoleon_portrait.png"],
  ["Genghis",     "/art/genghis_portrait.png"],
  ["Da Vinci",    "/art/davinci_portrait.png"],
  ["Leonidas",    "/art/leonidas_portrait.png"],
  ["Sun-sin",     "/art/sunsin_portrait.png"],
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
];

export function getCharacterPortrait(name: string | undefined | null): string | null {
  if (!name) return null;
  for (const [key, path] of HERO_PORTRAITS) {
    if (name.includes(key)) return path;
  }
  for (const [key, path] of ENEMY_PORTRAITS) {
    if (name.includes(key)) return path;
  }
  return null;
}
