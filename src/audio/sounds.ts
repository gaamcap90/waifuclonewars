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

// Legacy key map (used by Index.tsx playMusic calls)
export const MUSIC: Record<string, string> = {
  menu: '/audio/music/main_theme.mp3',
  battle: '/audio/music/battle_theme.mp3',
};

// Full playlist — order determines auto-advance sequence
export interface TrackDef {
  id: string;
  name: string;
  src: string;
}

export const PLAYLIST: TrackDef[] = [
  { id: 'main_theme', name: 'Main Theme', src: '/audio/music/main_theme.mp3' },
  { id: 'battle', name: 'Welcome to the Arena', src: '/audio/music/battle_theme.mp3' },
  { id: 'napoleon', name: 'Marseillaise Cosmique', src: '/audio/napoleon_theme.mp3' },
  { id: 'sunsin', name: '별빛 아리랑', src: '/audio/sunsin_theme.mp3' },
  { id: 'genghis', name: 'Daughter of the Endless Steppe', src: '/audio/genghis_theme.mp3' },
  { id: 'davinci', name: 'Aria della Mente Infinita', src: '/audio/leonardo_theme.mp3' },
  { id: 'leonidas',  name: 'Ἢ τᾶν',                          src: '/audio/leonidas_theme.mp3' },
  { id: 'beethoven', name: 'Ode an den Sternensturm',         src: '/audio/beethoven_theme.mp3' },
  { id: 'huang',    name: '女皇始令',                         src: '/audio/huang_theme.mp3' },
];

// Character theme clips: { src, startSec, endSec } — used only in Historical Archives preview
export const CHARACTER_THEMES: Record<string, { src: string; startSec: number; endSec: number }> = {
  napoleon:  { src: '/audio/napoleon_theme.mp3',   startSec: 22,  endSec: 80  },
  genghis:   { src: '/audio/genghis_theme.mp3',   startSec: 56,  endSec: 103 },
  leonidas:  { src: '/audio/leonidas_theme.mp3',  startSec: 78,  endSec: 138 },
  davinci:   { src: '/audio/leonardo_theme.mp3',  startSec: 121.5, endSec: 168 },
  sunsin:    { src: '/audio/sunsin_theme.mp3',    startSec: 43,  endSec: 107 },
  beethoven: { src: '/audio/beethoven_theme.mp3', startSec: 0,   endSec: 60  },
  huang:     { src: '/audio/huang_theme.mp3',     startSec: 0,   endSec: 60  },
};
