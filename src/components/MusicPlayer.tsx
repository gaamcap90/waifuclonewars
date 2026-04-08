import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import { useAudio } from '@/hooks/useAudio';

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const { settings, nextTrack, prevTrack, togglePlayPause, playTrackByIndex, setMusicVolume, toggleMute } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Poll time from engine ~4× per second for progress bar
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(audioEngine.getCurrentTime());
      setDuration(audioEngine.getDuration());
    }, 250);
    return () => clearInterval(id);
  }, []);

  const playlist = audioEngine.getPlaylist();
  const currentIdx = settings.currentTrackIndex;
  const currentTrack = playlist[currentIdx];
  const isPlaying = settings.isPlaying;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const target = pct * audioEngine.getDuration();
    // Direct DOM access — we don't expose seek in the hook but can reach engine
    (audioEngine as any).currentMusic && ((audioEngine as any).currentMusic.currentTime = target);
  }, []);

  return (
    <div
      className="fixed top-3 z-50 select-none"
      style={{ right: 'calc(280px + 16px)', fontFamily: "'Orbitron', sans-serif" }}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(4,2,18,0.96)',
          border: '1px solid rgba(80,50,140,0.55)',
          boxShadow: '0 4px 32px rgba(80,50,140,0.22), inset 0 1px 0 rgba(120,80,200,0.10)',
          minWidth: 200,
          maxWidth: 240,
        }}
      >
        {/* ── Header bar ── */}
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpanded(v => !v)}
          style={{ borderBottom: expanded ? '1px solid rgba(80,50,140,0.30)' : undefined }}
        >
          <span className="text-purple-400 text-xs shrink-0">{isPlaying ? '♪' : '♩'}</span>
          <span
            className="flex-1 truncate text-slate-200 font-orbitron"
            style={{ fontSize: 10, letterSpacing: '0.08em' }}
          >
            {currentTrack?.name ?? '—'}
          </span>
          <span className="text-slate-500 text-[9px] shrink-0">{fmt(currentTime)}</span>
          <span
            className="text-slate-600 text-[10px] ml-1 shrink-0"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}
          >▾</span>
        </div>

        {/* ── Progress bar (always visible) ── */}
        <div
          className="h-[3px] w-full cursor-pointer"
          style={{ background: 'rgba(80,50,140,0.25)' }}
          onClick={handleSeek}
        >
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, background: 'rgba(167,139,250,0.7)' }}
          />
        </div>

        {/* ── Controls (always visible) ── */}
        <div className="flex items-center justify-between px-3 py-1.5 gap-1">
          {/* Prev */}
          <button
            onClick={prevTrack}
            className="text-slate-400 hover:text-purple-300 transition-colors text-base leading-none"
            title="Previous"
          >⏮</button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-100 hover:text-white transition-colors text-sm"
            style={{ background: 'rgba(120,80,200,0.35)', border: '1px solid rgba(120,80,200,0.50)' }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="text-slate-400 hover:text-purple-300 transition-colors text-base leading-none"
            title="Next"
          >⏭</button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xs ml-1"
            title={settings.muted ? 'Unmute' : 'Mute'}
          >
            {settings.muted ? '🔇' : '🔊'}
          </button>

          {/* Volume slider */}
          <input
            type="range"
            min={0} max={1} step={0.02}
            value={settings.muted ? 0 : settings.musicVolume}
            onChange={e => setMusicVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 cursor-pointer"
            style={{ accentColor: 'rgba(167,139,250,0.8)', maxWidth: 72 }}
            title="Music volume"
          />
        </div>

        {/* ── Expanded track list ── */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(80,50,140,0.25)' }}>
            <div className="px-2 py-1.5 space-y-0.5" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {playlist.map((track, idx) => {
                const isActive = idx === currentIdx;
                return (
                  <div
                    key={track.id}
                    onClick={() => { playTrackByIndex(idx); }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                    style={{
                      background: isActive ? 'rgba(120,80,200,0.18)' : undefined,
                      border: isActive ? '1px solid rgba(120,80,200,0.35)' : '1px solid transparent',
                    }}
                  >
                    <span className="w-3 text-center shrink-0" style={{ fontSize: 10, color: isActive ? '#a78bfa' : '#475569' }}>
                      {isActive ? (isPlaying ? '♪' : '♩') : ''}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        color: isActive ? '#e2e8f0' : '#64748b',
                      }}
                    >
                      {track.name}
                    </span>
                    {isActive && duration > 0 && (
                      <span className="text-slate-600 shrink-0" style={{ fontSize: 9 }}>
                        {fmt(currentTime)} / {fmt(duration)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
