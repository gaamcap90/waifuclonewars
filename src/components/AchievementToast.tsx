// src/components/AchievementToast.tsx
// WoW-style achievement notification — rises from bottom-center, shines, auto-dismisses.

import { useEffect, useState } from 'react';
import type { AchievementToastItem } from '@/hooks/useAchievements';

interface Props {
  queue:       AchievementToastItem[];
  onDismiss:   () => void;
  onLoreClick?: () => void;
}

const AUTO_DISMISS_MS = 6500;

export function AchievementToast({ queue, onDismiss, onLoreClick }: Props) {
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

  const isPerk = !!current.isPerk;
  // Perk toasts use a blue/teal scheme; achievement toasts use gold
  const accentColor  = isPerk ? '#60a5fa' : '#ffd750';
  const accentGlow   = isPerk ? 'rgba(96,165,250,0.55)' : 'rgba(255,215,80,0.65)';
  const bgGradient   = isPerk
    ? 'linear-gradient(135deg, #0d1a2a 0%, #0f2040 50%, #061228 100%)'
    : 'linear-gradient(135deg, #12122a 0%, #1a1a3e 50%, #0d2a50 100%)';
  const borderColor  = isPerk ? 'rgba(96,165,250,0.75)' : 'rgba(255,215,80,0.75)';
  const iconBg       = isPerk ? 'rgba(96,165,250,0.15)' : 'rgba(255,215,80,0.15)';
  const iconBorder   = isPerk ? 'rgba(96,165,250,0.55)' : 'rgba(255,215,80,0.55)';
  const shimmerColor = isPerk ? 'rgba(96,165,250,0.18)' : 'rgba(255,215,80,0.22)';
  const headerLabel  = isPerk ? 'Run Perk Unlocked' : 'Achievement Unlocked';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow-gold {
          0%, 100% { box-shadow: 0 0 24px rgba(255,215,80,0.35), 0 8px 48px rgba(0,0,0,0.7); }
          50%       { box-shadow: 0 0 48px rgba(255,215,80,0.65), 0 8px 64px rgba(0,0,0,0.8), 0 0 80px rgba(255,200,50,0.25); }
        }
        @keyframes pulse-glow-blue {
          0%, 100% { box-shadow: 0 0 24px rgba(96,165,250,0.35), 0 8px 48px rgba(0,0,0,0.7); }
          50%       { box-shadow: 0 0 48px rgba(96,165,250,0.55), 0 8px 64px rgba(0,0,0,0.8), 0 0 80px rgba(59,130,246,0.25); }
        }
        .achievement-toast-gold { animation: pulse-glow-gold 2s ease-in-out infinite; }
        .achievement-toast-blue { animation: pulse-glow-blue 2s ease-in-out infinite; }
        .achievement-shine-bar {
          background: linear-gradient(
            105deg,
            transparent 40%,
            ${shimmerColor} 50%,
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
          pointerEvents:   current.hasLore && onLoreClick ? 'auto' : 'none',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className={isPerk ? 'achievement-toast-blue' : 'achievement-toast-gold'}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '1rem',
            padding:       '1rem 1.5rem',
            background:    bgGradient,
            border:        `1px solid ${borderColor}`,
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

          {/* Corner accent */}
          <div style={{
            position:      'absolute',
            inset:         0,
            borderRadius:  '8px',
            background:    `linear-gradient(135deg, ${isPerk ? 'rgba(96,165,250,0.08)' : 'rgba(255,215,80,0.1)'} 0%, transparent 50%)`,
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
            background:      iconBg,
            border:          `2px solid ${iconBorder}`,
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
              color:          accentColor,
              marginBottom:   '0.2rem',
              opacity:        0.9,
            }}>
              {headerLabel}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              {!isPerk && (
                <span style={{
                  fontSize:   '0.75rem',
                  fontWeight: 700,
                  color:      accentColor,
                  textShadow: `0 0 10px ${accentGlow}`,
                }}>
                  +{current.points} pts
                </span>
              )}
              {current.hasLore && (
                <span
                  onClick={onLoreClick}
                  style={{
                    fontSize:      '0.62rem',
                    fontWeight:    700,
                    fontFamily:    'monospace',
                    color:         '#22d3ee',
                    background:    'rgba(34,211,238,0.12)',
                    border:        '1px solid rgba(34,211,238,0.35)',
                    borderRadius:  '4px',
                    padding:       '1px 6px',
                    letterSpacing: '0.06em',
                    textShadow:    '0 0 8px rgba(34,211,238,0.5)',
                    cursor:        onLoreClick ? 'pointer' : 'default',
                    pointerEvents: 'auto',
                  }}>
                  📖 New lore
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
