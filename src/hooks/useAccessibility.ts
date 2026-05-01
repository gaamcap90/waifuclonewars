// src/hooks/useAccessibility.ts
// Centralizes accessibility / display preferences: fullscreen, text size,
// reduce motion, high contrast. Persisted to localStorage, applied via
// data-attributes on <html> so the CSS can target them globally.
//
// Keys kept small and stable — don't rename without migration.

import { useCallback, useEffect, useState } from "react";

export type TextSize = 'sm' | 'md' | 'lg' | 'xl';

const LS_TEXT_SIZE      = 'wcw_text_size';
const LS_REDUCE_MOTION  = 'wcw_reduce_motion';
const LS_HIGH_CONTRAST  = 'wcw_high_contrast';

function readText(): TextSize {
  try {
    const v = localStorage.getItem(LS_TEXT_SIZE);
    if (v === 'sm' || v === 'md' || v === 'lg' || v === 'xl') return v;
  } catch {}
  return 'md';
}
function readBool(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function applyToDom(textSize: TextSize, reduceMotion: boolean, highContrast: boolean) {
  const html = document.documentElement;
  html.setAttribute('data-text-size', textSize);
  html.setAttribute('data-reduce-motion', reduceMotion ? '1' : '0');
  html.setAttribute('data-high-contrast', highContrast ? '1' : '0');
}

export function useAccessibility() {
  const [textSize, setTextSizeState] = useState<TextSize>(() => readText());
  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => readBool(LS_REDUCE_MOTION));
  const [highContrast, setHighContrastState] = useState<boolean>(() => readBool(LS_HIGH_CONTRAST));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);

  // Apply on mount + whenever a setting changes
  useEffect(() => {
    applyToDom(textSize, reduceMotion, highContrast);
  }, [textSize, reduceMotion, highContrast]);

  // Track fullscreen state (can change from user pressing Esc/F11)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const setTextSize = useCallback((v: TextSize) => {
    setTextSizeState(v);
    try { localStorage.setItem(LS_TEXT_SIZE, v); } catch {}
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    try { localStorage.setItem(LS_REDUCE_MOTION, v ? '1' : '0'); } catch {}
  }, []);

  const setHighContrast = useCallback((v: boolean) => {
    setHighContrastState(v);
    try { localStorage.setItem(LS_HIGH_CONTRAST, v ? '1' : '0'); } catch {}
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      // Browser blocked the request (requires user gesture) or fullscreen not supported.
      // eslint-disable-next-line no-console
      console.warn('[fullscreen] request failed:', (err as Error).message);
    }
  }, []);

  return {
    textSize, setTextSize,
    reduceMotion, setReduceMotion,
    highContrast, setHighContrast,
    isFullscreen, toggleFullscreen,
  };
}

/** Call once from the app root to apply settings on initial mount even before
 *  GameSettings is opened. Reads from localStorage and sets <html> attributes. */
export function applyAccessibilityOnBoot() {
  try {
    applyToDom(readText(), readBool(LS_REDUCE_MOTION), readBool(LS_HIGH_CONTRAST));
  } catch {}
}
