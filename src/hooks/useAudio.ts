import { useState, useEffect, useCallback } from 'react';
import { audioEngine, AudioSettings } from '@/audio/AudioEngine';

export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>(audioEngine.getSettings());

  useEffect(() => {
    return audioEngine.subscribe(() => setSettings(audioEngine.getSettings()));
  }, []);

  const playSound          = useCallback((key: string)  => audioEngine.playSound(key), []);
  const playMusic          = useCallback((key: string)  => audioEngine.playMusic(key), []);
  const stopMusic          = useCallback(()             => audioEngine.stopMusic(), []);
  const toggleMute         = useCallback(()             => audioEngine.toggleMute(), []);
  const setMusicVolume     = useCallback((v: number)    => audioEngine.setMusicVolume(v), []);
  const setSfxVolume       = useCallback((v: number)    => audioEngine.setSfxVolume(v), []);
  const setVoiceVolume     = useCallback((v: number)    => audioEngine.setVoiceVolume(v), []);
  const setVoiceEnabled    = useCallback((v: boolean)   => audioEngine.setVoiceEnabled(v), []);
  const setDialogueEnabled = useCallback((v: boolean)   => audioEngine.setDialogueEnabled(v), []);
  const playTheme          = useCallback((id: string)   => audioEngine.playTheme(id), []);
  const stopTheme          = useCallback(()             => audioEngine.stopTheme(), []);
  const nextTrack          = useCallback(()             => audioEngine.nextTrack(), []);
  const prevTrack          = useCallback(()             => audioEngine.prevTrack(), []);
  const togglePlayPause    = useCallback(()             => audioEngine.togglePlayPause(), []);
  const playTrackByIndex   = useCallback((i: number)    => audioEngine.playTrackByIndex(i), []);

  return {
    settings,
    playSound, playMusic, stopMusic,
    toggleMute, setMusicVolume, setSfxVolume,
    setVoiceVolume, setVoiceEnabled, setDialogueEnabled,
    playTheme, stopTheme,
    nextTrack, prevTrack, togglePlayPause, playTrackByIndex,
  };
}
