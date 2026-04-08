import { SFX, PLAYLIST, CHARACTER_THEMES, TrackDef } from './sounds';

export interface AudioSettings {
  musicVolume: number; // 0–1
  sfxVolume:   number; // 0–1
  muted:       boolean;
  // Playlist state (read-only from UI perspective)
  currentTrackIndex: number;
  isPlaying: boolean;
}

const STORAGE_KEY = 'wcw:audioSettings';

const DEFAULT_SETTINGS: Omit<AudioSettings, 'currentTrackIndex' | 'isPlaying'> = {
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

function loadSettings(): Omit<AudioSettings, 'currentTrackIndex' | 'isPlaying'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Omit<AudioSettings, 'currentTrackIndex' | 'isPlaying'>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

class AudioEngine {
  private settings: Omit<AudioSettings, 'currentTrackIndex' | 'isPlaying'> = loadSettings();

  // Playlist state
  private currentTrackIndex: number = 0;
  private currentMusic: HTMLAudioElement | null = null;

  // Archives pause/resume
  private themeAudio: HTMLAudioElement | null = null;
  private themeStopTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedForTheme: boolean = false; // was music playing before theme?

  private listeners: Set<() => void> = new Set();

  // ── Subscriber pattern ──────────────────────────────────────────────────────

  getSettings(): AudioSettings {
    return {
      ...this.settings,
      currentTrackIndex: this.currentTrackIndex,
      isPlaying: !!(this.currentMusic && !this.currentMusic.paused),
    };
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private updatePersisted(patch: Partial<Omit<AudioSettings, 'currentTrackIndex' | 'isPlaying'>>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    if (this.currentMusic) {
      this.currentMusic.volume = this.settings.muted ? 0 : this.settings.musicVolume;
    }
    if (this.themeAudio) {
      this.themeAudio.volume = this.settings.muted ? 0 : this.settings.musicVolume;
    }
    this.notify();
  }

  setMusicVolume(v: number) { this.updatePersisted({ musicVolume: Math.max(0, Math.min(1, v)) }); }
  setSfxVolume(v: number)   { this.updatePersisted({ sfxVolume: Math.max(0, Math.min(1, v)) }); }
  setMuted(muted: boolean)  { this.updatePersisted({ muted }); }
  toggleMute()              { this.updatePersisted({ muted: !this.settings.muted }); }

  // ── Playlist ─────────────────────────────────────────────────────────────────

  getPlaylist(): TrackDef[] { return PLAYLIST; }

  getCurrentTrack(): TrackDef | null { return PLAYLIST[this.currentTrackIndex] ?? null; }

  /** Get current playback position in seconds */
  getCurrentTime(): number { return this.currentMusic?.currentTime ?? 0; }

  /** Get duration of current track in seconds (0 if not loaded yet) */
  getDuration(): number { return this.currentMusic?.duration ?? 0; }

  playTrackByIndex(idx: number) {
    const clamped = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    this.currentTrackIndex = clamped;
    this._startCurrentTrack();
  }

  playTrackById(id: string) {
    const idx = PLAYLIST.findIndex(t => t.id === id);
    if (idx >= 0) this.playTrackByIndex(idx);
  }

  nextTrack() { this.playTrackByIndex(this.currentTrackIndex + 1); }
  prevTrack() { this.playTrackByIndex(this.currentTrackIndex - 1); }

  togglePlayPause() {
    if (!this.currentMusic) {
      this._startCurrentTrack();
      return;
    }
    if (this.currentMusic.paused) {
      this.currentMusic.play().catch(() => {});
    } else {
      this.currentMusic.pause();
    }
    this.notify();
  }

  private _startCurrentTrack() {
    // Tear down old track
    if (this.currentMusic) {
      this.currentMusic.onended = null;
      this.currentMusic.pause();
      this.currentMusic.src = '';
      this.currentMusic = null;
    }
    const track = PLAYLIST[this.currentTrackIndex];
    if (!track) return;
    try {
      const audio = new Audio(track.src);
      audio.volume = this.settings.muted ? 0 : this.settings.musicVolume;
      audio.loop = false;
      audio.onended = () => { this.nextTrack(); };
      // Notify on timeupdate so UI can show progress (throttled by browser ~4×/s)
      audio.ontimeupdate = () => { this.notify(); };
      audio.play().catch(() => {});
      this.currentMusic = audio;
    } catch { /* ignore */ }
    this.notify();
  }

  // ── Legacy compatibility (called from Index.tsx) ────────────────────────────

  /** 'battle' → jump to battle track. Any other key → ensure playlist is running. */
  playMusic(key: string) {
    if (key === 'battle') {
      // Only switch if not already on battle track
      if (PLAYLIST[this.currentTrackIndex]?.id !== 'battle') {
        this.playTrackById('battle');
      } else if (this.currentMusic?.paused) {
        this.currentMusic.play().catch(() => {});
        this.notify();
      }
    } else {
      // Menu / other: just ensure something is playing
      if (!this.currentMusic || this.currentMusic.paused) {
        if (!this.currentMusic) {
          this._startCurrentTrack();
        } else {
          this.currentMusic.play().catch(() => {});
          this.notify();
        }
      }
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.onended = null;
      this.currentMusic.ontimeupdate = null;
      this.currentMusic.pause();
      this.currentMusic.src = '';
      this.currentMusic = null;
      this.notify();
    }
  }

  // ── Character theme clips (Archives) ────────────────────────────────────────

  /** Play a character's theme clip (startSec → endSec). Background music keeps playing. */
  playTheme(characterId: string) {
    const def = CHARACTER_THEMES[characterId];
    if (!def) return;
    if (this.themeAudio && !this.themeAudio.paused && this.themeAudio.dataset.charId === characterId) return;

    this.stopTheme();

    try {
      const audio = new Audio(def.src);
      audio.dataset.charId = characterId;
      audio.volume = this.settings.muted ? 0 : this.settings.musicVolume;
      audio.currentTime = def.startSec;
      audio.play().catch(() => {});
      this.themeAudio = audio;
      const durationMs = (def.endSec - def.startSec) * 1000;
      this.themeStopTimer = setTimeout(() => {
        if (this.themeAudio) {
          this.themeAudio.pause();
          this.themeAudio.src = '';
          this.themeAudio = null;
        }
        this.themeStopTimer = null;
        this.playTheme(characterId); // loop the clip
      }, durationMs);
    } catch { /* ignore */ }
  }

  /** Stop theme clip. Background music is unaffected. */
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
    this.pausedForTheme = false;
  }

  // ── Sound effects ────────────────────────────────────────────────────────────

  playSound(key: string) {
    if (this.settings.muted || this.settings.sfxVolume === 0) return;
    const src = SFX[key];
    if (!src) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.settings.sfxVolume;
      audio.play().catch(() => {});
    } catch { /* ignore */ }
  }
}

// Singleton
export const audioEngine = new AudioEngine();

// Resume music on first user interaction (browser autoplay policy)
const _resumeOnInteraction = () => {
  const s = audioEngine.getSettings();
  if (!s.isPlaying) {
    (audioEngine as any)._startCurrentTrack?.();
  }
  document.removeEventListener('click',     _resumeOnInteraction);
  document.removeEventListener('keydown',   _resumeOnInteraction);
  document.removeEventListener('touchstart', _resumeOnInteraction);
};
document.addEventListener('click',      _resumeOnInteraction);
document.addEventListener('keydown',    _resumeOnInteraction);
document.addEventListener('touchstart', _resumeOnInteraction);
