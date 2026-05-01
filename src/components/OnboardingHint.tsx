// src/components/OnboardingHint.tsx
// Small contextual tooltip overlay for first-time player hints. Anchors to a
// CSS selector via getBoundingClientRect so the bubble points at the right
// element regardless of layout. Click anywhere or the X to dismiss.

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TipId } from "@/hooks/useOnboardingTips";
import { useT } from "@/i18n";

interface Props {
  tipId: TipId;
  anchorSelector: string;        // CSS selector for the element to point at
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onDismiss: () => void;
}

interface AnchorRect { x: number; y: number; w: number; h: number }

function readAnchor(selector: string): AnchorRect | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

export function OnboardingHint({ tipId, anchorSelector, placement = 'top', onDismiss }: Props) {
  const { t } = useT();
  const [anchor, setAnchor] = useState<AnchorRect | null>(() => readAnchor(anchorSelector));

  // Re-poll the anchor's position — it can move (panel collapse, animations, etc.)
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const r = readAnchor(anchorSelector);
      setAnchor(prev => {
        if (!r && !prev) return prev;
        if (!r || !prev) return r;
        if (r.x === prev.x && r.y === prev.y && r.w === prev.w && r.h === prev.h) return prev;
        return r;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [anchorSelector]);

  if (!anchor) return null;

  const tipMeta: Record<TipId, { title: string; body: string }> = {
    cards_intro:  {
      title: t.onboarding?.cardsIntro?.title  ?? 'Your hand',
      body:  t.onboarding?.cardsIntro?.body   ?? 'Click a card to play it. Cards costing more mana than you have are greyed out.',
    },
    enemy_intent: {
      title: t.onboarding?.enemyIntent?.title ?? 'Enemy intent',
      body:  t.onboarding?.enemyIntent?.body  ?? 'These badges show what each enemy will do on its next turn — plan around them.',
    },
    end_turn_ready: {
      title: t.onboarding?.endTurnReady?.title ?? 'Turn complete',
      body:  t.onboarding?.endTurnReady?.body  ?? 'All your characters have acted. Click END TURN when you\'re ready.',
    },
  };
  const { title, body } = tipMeta[tipId];

  // Position the bubble relative to the anchor
  const W = 280;
  const H_EST = 110;
  const margin = 14;
  let bubbleX = anchor.x + anchor.w / 2 - W / 2;
  let bubbleY = anchor.y - H_EST - margin;
  let arrowSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  switch (placement) {
    case 'bottom': bubbleY = anchor.y + anchor.h + margin; arrowSide = 'top'; break;
    case 'left':   bubbleX = anchor.x - W - margin; bubbleY = anchor.y + anchor.h / 2 - H_EST / 2; arrowSide = 'right'; break;
    case 'right':  bubbleX = anchor.x + anchor.w + margin; bubbleY = anchor.y + anchor.h / 2 - H_EST / 2; arrowSide = 'left'; break;
    case 'top':
    default:       /* defaults set above */ break;
  }
  // Clamp into viewport
  bubbleX = Math.max(8, Math.min(window.innerWidth - W - 8, bubbleX));
  bubbleY = Math.max(8, Math.min(window.innerHeight - H_EST - 8, bubbleY));

  return createPortal(
    <>
      {/* Click-anywhere catcher — invisible full-screen layer that dismisses on click */}
      <div
        className="fixed inset-0 z-[9998] cursor-pointer"
        onClick={onDismiss}
        style={{ background: 'transparent' }}
      />
      {/* Spotlight ring around the anchored element */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-lg"
        style={{
          left: anchor.x - 6,
          top: anchor.y - 6,
          width: anchor.w + 12,
          height: anchor.h + 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 24px rgba(255,210,80,0.55)',
          border: '2px solid rgba(255,210,80,0.85)',
          animation: 'onboard-ring-pulse 1.2s ease-in-out infinite',
        }}
      />
      {/* The bubble */}
      <div
        className="fixed z-[9999] rounded-xl border p-4 shadow-2xl pointer-events-auto"
        onClick={e => e.stopPropagation()}
        style={{
          left: bubbleX,
          top: bubbleY,
          width: W,
          background: 'rgba(8,6,22,0.98)',
          borderColor: 'rgba(255,210,80,0.55)',
          boxShadow: '0 0 32px rgba(255,210,80,0.35)',
          animation: 'onboard-bubble-in 0.25s ease-out',
        }}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="text-base shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(255,210,80,0.6))' }}>💡</span>
          <div className="flex-1 font-orbitron text-[11px] tracking-wider" style={{ color: '#fbbf24' }}>
            {title}
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-white text-xs leading-none -mt-0.5"
            aria-label="Dismiss"
          >✕</button>
        </div>
        <div className="text-slate-300 text-[12px] leading-relaxed mb-3">
          {body}
        </div>
        <button
          onClick={onDismiss}
          className="font-orbitron text-[10px] tracking-widest px-3 py-1.5 rounded border transition-all hover:scale-105"
          style={{
            background: 'rgba(255,210,80,0.12)',
            borderColor: 'rgba(255,210,80,0.5)',
            color: '#fbbf24',
          }}
        >
          {t.onboarding?.gotIt ?? 'GOT IT'}
        </button>
        {/* Arrow */}
        <span
          className="absolute pointer-events-none"
          style={{
            ...(arrowSide === 'top'    ? { top: -7,   left: '50%', transform: 'translateX(-50%) rotate(45deg)' } : {}),
            ...(arrowSide === 'bottom' ? { bottom: -7, left: '50%', transform: 'translateX(-50%) rotate(45deg)' } : {}),
            ...(arrowSide === 'left'   ? { left: -7,  top: '50%',  transform: 'translateY(-50%) rotate(45deg)' } : {}),
            ...(arrowSide === 'right'  ? { right: -7, top: '50%',  transform: 'translateY(-50%) rotate(45deg)' } : {}),
            width: 12, height: 12,
            background: 'rgba(8,6,22,0.98)',
            borderTop:  arrowSide === 'top'    ? '2px solid rgba(255,210,80,0.55)' : 'none',
            borderLeft: arrowSide === 'top' || arrowSide === 'left' ? '2px solid rgba(255,210,80,0.55)' : 'none',
            borderRight: arrowSide === 'right'  ? '2px solid rgba(255,210,80,0.55)' : 'none',
            borderBottom: arrowSide === 'bottom' || arrowSide === 'right' ? '2px solid rgba(255,210,80,0.55)' : 'none',
          }}
        />
      </div>
    </>,
    document.body,
  );
}
