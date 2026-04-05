import { SFX, MUSIC, CHARACTER_THEMES } from './sounds';

export interface AudioSettings {
  musicVolume: number; // 0–1
  sfxVolume:   number; // 0–1
  muted:       boolean;
}

const STORAGE_KEY = 'wcw:audioSettings';

const DEFAULT_SETTINGS: AudioSettings = {
  musicVolume: 0.5,
  sfxVolume:   0.7,
  muted:       false,
};

// One-time migration: clear any stale muted:true left from broken sessions
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.muted === true) {
      parsed.muted = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  }
} catch { /* ignore */ }

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AudioSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

class AudioEngine {
  private settings: AudioSettings = loadSettings();
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicKey: string | null = null;
  private themeAudio: HTMLAudioElement | null = null;
  private themeStopTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<() => void> = new Set();

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private update(patch: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    // Update live music volume
    if (this.currentMusic) {
      this.currentMusic.volume = this.settings.muted ? 0 : this.settings.musicVolume;
    }
    this.notify();
  }

  setMusicVolume(v: number) { this.update({ musicVolume: Math.max(0, Math.min(1, v)) }); }
  setSfxVolume(v: number)   { this.update({ sfxVolume: Math.max(0, Math.min(1, v)) }); }
  setMuted(muted: boolean)  { this.update({ muted }); }
  toggleMute()              { this.update({ muted: !this.settings.muted }); }

  playSound(key: string) {
    if (this.settings.muted || this.settings.sfxVolume === 0) return;
    const src = SFX[key];
    if (!src) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.settings.sfxVolume;
      audio.play().catch(() => { /* file not found — silent */ });
    } catch { /* ignore */ }
  }

  playMusic(key: string) {
    if (this.currentMusicKey === key && this.currentMusic && !this.currentMusic.paused) return;
    this.stopMusic();
    const src = MUSIC[key];
    if (!src) return;
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.settings.muted ? 0 : this.settings.musicVolume;
      audio.play().catch(() => { /* file not found — silent */ });
      this.currentMusic = audio;
      this.currentMusicKey = key;
    } catch { /* ignore */ }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.src = '';
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  /** Play a character's theme clip (startSec → endSec). Stops any background music first. */
  playTheme(characterId: string) {
    const def = CHARACTER_THEMES[characterId];
    if (!def) return;
    // Don't restart if already playing this theme
    if (this.themeAudio && !this.themeAudio.paused && this.themeAudio.dataset.charId === characterId) return;
    this.stopTheme();
    this.stopMusic(); // stop background music while theme plays
    try {
      const audio = new Audio(def.src);
      audio.dataset.charId = characterId;
      audio.volume = this.settings.muted ? 0 : this.settings.musicVolume;
      audio.currentTime = def.startSec;
      audio.play().catch(() => {});
      this.themeAudio = audio;
      // Loop: when clip reaches endSec, stop it and restart cleanly from startSec
      const durationMs = (def.endSec - def.startSec) * 1000;
      this.themeStopTimer = setTimeout(() => {
        // Pause and discard the current audio element before restarting
        if (this.themeAudio) {
          this.themeAudio.pause();
          this.themeAudio.src = '';
          this.themeAudio = null;
        }
        this.themeStopTimer = null;
        this.playTheme(characterId);
      }, durationMs);
    } catch { /* ignore */ }
  }

  stopTheme() {
    if (this.themeStopTimer !== null) {
      clearTimeout(this.themeStopTimer);
      this.themeStopTimer = null;
    }
    if (this.themeAudio) {
      this.themeAudio.pause();
      this.themeAudio.src = '';
      this.themeAudio = null;
    }
  }
}

// Singleton
export const audioEngine = new AudioEngine();
