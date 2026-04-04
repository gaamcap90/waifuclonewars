import { useState, useEffect, useCallback } from 'react';
import { audioEngine, AudioSettings } from '@/audio/AudioEngine';

export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>(audioEngine.getSettings());

  useEffect(() => {
    return audioEngine.subscribe(() => setSettings(audioEngine.getSettings()));
  }, []);

  const playSound   = useCallback((key: string) => audioEngine.playSound(key), []);
  const playMusic   = useCallback((key: string) => audioEngine.playMusic(key), []);
  const stopMusic   = useCallback(() => audioEngine.stopMusic(), []);
  const toggleMute  = useCallback(() => audioEngine.toggleMute(), []);
  const setMusicVolume = useCallback((v: number) => audioEngine.setMusicVolume(v), []);
  const setSfxVolume   = useCallback((v: number) => audioEngine.setSfxVolume(v), []);

  return { settings, playSound, playMusic, stopMusic, toggleMute, setMusicVolume, setSfxVolume };
}
