// src/components/AchievementToast.tsx
// WoW-style achievement notification — rises from bottom-center, shines, auto-dismisses.

import { useEffect, useState } from 'react';
import type { AchievementToastItem } from '@/hooks/useAchievements';

interface Props {
  queue:      AchievementToastItem[];
  onDismiss:  () => void;
}

const AUTO_DISMISS_MS = 6500;

export function AchievementToast({ queue, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const current = queue[0] ?? null;

  // Slide up when a new achievement arrives; auto-dismiss after timeout
  useEffect(() => {
    if (!current) { setVisible(false); return; }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current?.id]);

  if (!current) return null;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 24px rgba(255,215,80,0.35), 0 8px 48px rgba(0,0,0,0.7); }
          50%       { box-shadow: 0 0 48px rgba(255,215,80,0.65), 0 8px 64px rgba(0,0,0,0.8), 0 0 80px rgba(255,200,50,0.25); }
        }
        .achievement-toast-inner {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .achievement-shine-bar {
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 215, 80, 0.22) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
        }
      `}</style>

      <div
        style={{
          position:        'fixed',
          bottom:          visible ? '8%' : '-160px',
          left:            '50%',
          transform:       'translateX(-50%)',
          zIndex:          9999,
          opacity:         visible ? 1 : 0,
          transition:      'bottom 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
          pointerEvents:   'none',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className="achievement-toast-inner"
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '1rem',
            padding:       '1rem 1.5rem',
            background:    'linear-gradient(135deg, #12122a 0%, #1a1a3e 50%, #0d2a50 100%)',
            border:        '1px solid rgba(255, 215, 80, 0.75)',
            borderRadius:  '8px',
            minWidth:      '340px',
            maxWidth:      '480px',
            position:      'relative',
            overflow:      'hidden',
          }}
        >
          {/* Shimmer sweep overlay */}
          <div
            className="achievement-shine-bar"
            style={{
              position:      'absolute',
              inset:         0,
              borderRadius:  '8px',
              pointerEvents: 'none',
            }}
          />

          {/* Gold corner accent */}
          <div style={{
            position:      'absolute',
            inset:         0,
            borderRadius:  '8px',
            background:    'linear-gradient(135deg, rgba(255,215,80,0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />

          {/* Icon badge */}
          <div style={{
            flexShrink:      0,
            width:           '3.5rem',
            height:          '3.5rem',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            background:      'rgba(255,215,80,0.15)',
            border:          '2px solid rgba(255,215,80,0.55)',
            borderRadius:    '6px',
            fontSize:        '1.85rem',
            position:        'relative',
            zIndex:          1,
          }}>
            {current.icon}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize:       '0.6rem',
              fontFamily:     'monospace',
              textTransform:  'uppercase',
              letterSpacing:  '0.18em',
              color:          '#ffd750',
              marginBottom:   '0.2rem',
              opacity:        0.9,
            }}>
              Achievement Unlocked
            </div>
            <div style={{
              fontSize:     '1.05rem',
              fontWeight:   800,
              color:        '#ffffff',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              textShadow:   '0 1px 8px rgba(0,0,0,0.8)',
            }}>
              {current.name}
            </div>
            <div style={{
              fontSize:   '0.75rem',
              fontWeight: 700,
              color:      '#ffd750',
              marginTop:  '0.15rem',
              textShadow: '0 0 10px rgba(255,215,80,0.6)',
            }}>
              +{current.points} pts
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
