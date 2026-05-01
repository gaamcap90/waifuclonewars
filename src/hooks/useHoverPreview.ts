// src/hooks/useHoverPreview.ts
//
// Card-hover and enemy-ability-hover preview ranges live here as a module-level
// store, NOT in Index.tsx state. This is a deliberate perf decision: hovering
// over a card fires up to 60 setter calls per second (mousemove etc.). When
// that state lived in Index, every hover change re-rendered Index, which in
// turn re-rendered GameBoard / HorizontalGameUI / CombatLogPanel / every child.
//
// With this pattern, only components that explicitly subscribe via
// `useHoverPreview()` re-render — typically just GameBoard. Index is unaffected.
//
// Built on `useSyncExternalStore` so it integrates with React 18 concurrent
// features (no tearing). The store is a singleton because hover state is
// inherently a single global concern at any given moment.

import { useSyncExternalStore } from "react";

export interface HoverPreviewState {
  range: number | null;
  executorId: string | null;
  intentRange: { iconId: string; range: number } | null;
}

const initial: HoverPreviewState = { range: null, executorId: null, intentRange: null };
let state: HoverPreviewState = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function setHoverRange(range: number | null) {
  if (state.range === range) return;
  state = { ...state, range };
  emit();
}

export function setHoverExecutorId(executorId: string | null) {
  if (state.executorId === executorId) return;
  state = { ...state, executorId };
  emit();
}

export function setHoverIntentRange(intentRange: { iconId: string; range: number } | null) {
  // Object-equality short-circuit: same iconId+range = no re-emit
  const cur = state.intentRange;
  const same = (!cur && !intentRange)
    || (!!cur && !!intentRange && cur.iconId === intentRange.iconId && cur.range === intentRange.range);
  if (same) return;
  state = { ...state, intentRange };
  emit();
}

/** React hook — subscribers re-render when state changes. */
export function useHoverPreview(): HoverPreviewState {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}

/** Module-level read for non-React consumers / debug. */
export function getHoverPreview(): HoverPreviewState {
  return state;
}
