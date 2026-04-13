import { useState, useCallback, useRef, useEffect } from "react";

export type AnimType =
  | 'damage'
  | 'heal'
  | 'impact'
  | 'aura'
  | 'cast'
  | 'death'
  | 'projectile'
  | 'shield'
  | 'trail'
  | 'aoe'
  | 'slash'
  | 'heal_ring'
  | 'despawn';

export interface AnimEvent {
  id: string;
  type: AnimType;
  position: { q: number; r: number };
  fromPosition?: { q: number; r: number };
  value?: number;
  color?: string;
  duration?: number;
}

// Durations per type (ms)
const DEFAULT_DURATIONS: Record<AnimType, number> = {
  damage:     1350,
  heal:       1350,
  impact:      550,
  aura:        850,
  cast:        750,
  death:      1300,
  projectile:  420,
  shield:      750,
  trail:       500,
  aoe:         900,
  slash:       380,
  heal_ring:   750,
  despawn:     700,
};

let _counter = 0;
export const nextAnimId = (prefix = 'anim') =>
  `${prefix}-${++_counter}-${Date.now()}`;

export function useAnimations() {
  const [animations, setAnimations] = useState<AnimEvent[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeAnimation = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setAnimations(prev => prev.filter(a => a.id !== id));
  }, []);

  const addAnimation = useCallback((event: AnimEvent) => {
    const duration = event.duration ?? DEFAULT_DURATIONS[event.type] ?? 1000;

    setAnimations(prev => {
      // Cap simultaneous animations per hex to avoid pile-ups
      const atSameTile = prev.filter(
        a => a.position.q === event.position.q && a.position.r === event.position.r
      );
      if (atSameTile.length >= 4) return prev;
      return [...prev, event];
    });

    const timer = setTimeout(() => removeAnimation(event.id), duration);
    timersRef.current.set(event.id, timer);
  }, [removeAnimation]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return { animations, addAnimation };
}
