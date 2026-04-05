// Sound registry — mapped to files in /public/audio/sfx/ and /public/audio/music/

export const SFX: Record<string, string> = {
  ui_click: '/audio/sfx/ui_click.ogg',
  ui_hover: '/audio/sfx/ui_hover.ogg',
  card_play: '/audio/sfx/card_play.ogg',
  card_draw: '/audio/sfx/card_draw.ogg',
  end_turn: '/audio/sfx/end_turn.ogg',
  turn_start: '/audio/sfx/turn_start.ogg',
  attack_swing: '/audio/sfx/attack_swing.ogg',
  attack_hit: '/audio/sfx/attack_hit.ogg',
  ability_cast: '/audio/sfx/ability_cast.ogg',
  ultimate: '/audio/sfx/ultimate.ogg',
  heal: '/audio/sfx/heal.ogg',
  debuff_apply: '/audio/sfx/debuff_apply.ogg',
  respawn: '/audio/sfx/respawn.ogg',
  base_hit: '/audio/sfx/base_hit.ogg',
  beast_kill: '/audio/sfx/beast_kill.ogg',
  unit_death: '/audio/sfx/unit_death.ogg',
  victory: '/audio/sfx/victory.ogg',
  defeat: '/audio/sfx/defeat.ogg',
};

export const MUSIC: Record<string, string> = {
  menu: '/audio/music/main_theme.mp3',
  battle: '/audio/music/battle_theme.mp3',
};

// Character theme clips: { src, startSec, endSec }
export const CHARACTER_THEMES: Record<string, { src: string; startSec: number; endSec: number }> = {
  napoleon: { src: '/audio/napoleon_theme.webm', startSec: 22, endSec: 80 },
  genghis: { src: '/audio/genghis_theme.mp3', startSec: 56, endSec: 82 },
  leonidas: { src: '/audio/leonidas_theme.mp3', startSec: 181, endSec: 208 },
  davinci: { src: '/audio/leonardo_theme.mp3', startSec: 121.5, endSec: 168 }
};
