// src/hooks/useOnboardingTips.ts
// One-shot contextual tips for new-player onboarding. Each tip is identified by
// a stable id, shown at most once across all sessions, persisted to localStorage.
//
// Usage: a parent component watches gameState and calls `requestTip(id)` when a
// trigger condition becomes true. The hook coalesces requests so only ONE tip is
// visible at a time — the first one to fire wins until dismissed.

import { useCallback, useEffect, useState } from "react";

export type TipId =
  | 'cards_intro'      // First time the player has a hand
  | 'enemy_intent'     // First time an enemy intent badge appears
  | 'end_turn_ready';  // First time all player chars have acted

const LS_KEY = 'wcw_onboarding_seen_v1';

function loadSeen(): Set<TipId> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr as TipId[]);
  } catch { return new Set(); }
}

function persistSeen(seen: Set<TipId>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...seen]));
  } catch {}
}

export function useOnboardingTips() {
  const [seen, setSeen] = useState<Set<TipId>>(() => loadSeen());
  const [activeTip, setActiveTip] = useState<TipId | null>(null);

  const hasSeen = useCallback((id: TipId) => seen.has(id), [seen]);

  /** Request a tip be shown. No-op if already seen, or if another tip is active. */
  const requestTip = useCallback((id: TipId) => {
    setSeen(prev => {
      if (prev.has(id)) return prev;
      // Only set active if nothing else is showing
      setActiveTip(curr => curr ?? id);
      return prev;
    });
  }, []);

  const dismissTip = useCallback(() => {
    setActiveTip(curr => {
      if (curr) {
        setSeen(prev => {
          if (prev.has(curr)) return prev;
          const next = new Set(prev);
          next.add(curr);
          persistSeen(next);
          return next;
        });
      }
      return null;
    });
  }, []);

  /** Dev/QA helper — clears all seen tips so they re-appear on next trigger. */
  const resetAll = useCallback(() => {
    setSeen(new Set());
    setActiveTip(null);
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  return { activeTip, hasSeen, requestTip, dismissTip, resetAll };
}
