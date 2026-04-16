// src/components/tutorial/TutorialOverlay.tsx
import React, { useEffect } from 'react';
import { TutorialStep, TutorialTrigger } from '@/data/tutorialData';
import type { TutorialStage } from '@/data/tutorialData';
import { useT } from '@/i18n';
import { getTutorialStepTranslation } from '@/i18n/tutorial-translations';

interface Props {
  step: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  stageId: TutorialStage;   // raw stage id for translation lookup + label
  stageSeed: string;         // changes on stage transition → restarts enter animation
  onNext: () => void;        // fires advanceTutorial('button')
  onSkip: () => void;
  bottomOffset?: number;     // px above bottom edge (default 0); use ~215 in combat to clear card HUD
  placement?: 'top' | 'bottom'; // 'bottom' default; 'top' for screens where bottom is occupied
}

export function TutorialOverlay({ step, stepIndex, totalSteps, stageId, stageSeed, onNext, onSkip, bottomOffset = 0, placement = 'bottom' }: Props) {
  const { t, lang } = useT();

  // Apply body highlight class so targeted elements can glow via CSS
  useEffect(() => {
    // Remove any existing tutorial highlight classes
    const toRemove = Array.from(document.body.classList).filter(c => c.startsWith('tut-hl-'));
    toRemove.forEach(c => document.body.classList.remove(c));

    if (step && step.highlight !== 'none') {
      document.body.classList.add(`tut-hl-${step.highlight}`);
    }

    return () => {
      const toRemove2 = Array.from(document.body.classList).filter(c => c.startsWith('tut-hl-'));
      toRemove2.forEach(c => document.body.classList.remove(c));
    };
  }, [step?.highlight]);

  if (!step) return null;

  const isButtonStep = step.trigger === 'button';
  const stageLabel = (t.tutorial.stageLabels as Record<string, string>)[stageId] ?? stageId;
  const translated = getTutorialStepTranslation(stageId, stepIndex, lang);
  const displayText    = translated?.text    ?? step.text;
  const displaySubtext = translated?.subtext ?? step.subtext;

  return (
    <div
      style={{
        position: 'fixed',
        ...(placement === 'top'
          ? { top: 12, bottom: undefined }
          : { bottom: bottomOffset, top: undefined }),
        left: 0,
        right: 0,
        zIndex: 1200,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: placement === 'top' ? '12px 12px 0' : '0 12px 12px',
      }}
    >
      <div
        key={stageSeed}
        className="tut-panel-enter"
        style={{
          width: '100%',
          maxWidth: 640,
          pointerEvents: 'all',
          background: 'rgba(4,2,18,0.97)',
          border: '1.5px solid rgba(34,211,238,0.45)',
          borderRadius: 14,
          boxShadow: '0 0 48px rgba(34,211,238,0.14), 0 8px 40px rgba(0,0,0,0.65)',
          padding: '16px 20px 14px',
        }}
      >
        {/* Stage label + step counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 9,
            letterSpacing: '0.4em',
            color: '#22d3ee',
            textTransform: 'uppercase',
          }}>
            {stageLabel}
          </span>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i === stepIndex
                    ? '#22d3ee'
                    : i < stepIndex
                      ? 'rgba(34,211,238,0.35)'
                      : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Main text */}
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 14,
          fontWeight: 800,
          color: '#f1f5f9',
          lineHeight: 1.4,
          marginBottom: displaySubtext ? 7 : 0,
        }}>
          {displayText}
        </div>

        {/* Subtext */}
        {displaySubtext && (
          <div style={{
            fontSize: 12,
            color: '#94a3b8',
            lineHeight: 1.6,
          }}>
            {displaySubtext}
          </div>
        )}

        {/* Footer row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={onSkip}
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#334155',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
          >
            {t.tutorial.skipTutorial}
          </button>

          {isButtonStep ? (
            <button
              onClick={onNext}
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, rgba(34,211,238,0.92), rgba(6,182,212,0.88))',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 26px',
                cursor: 'pointer',
                boxShadow: '0 0 18px rgba(34,211,238,0.30)',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            >
              {t.tutorial.next}
            </button>
          ) : (
            <span style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              color: '#38bdf8',
              letterSpacing: '0.06em',
            }}>
              {(t.tutorial.actionHints as Record<string, string>)[step.trigger] ?? ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tutorial Complete overlay ─────────────────────────────────────────────────

interface CompleteProps {
  onStartRun: () => void;
  onReplayTutorial: () => void;
}

export function TutorialCompleteOverlay({ onStartRun, onReplayTutorial }: CompleteProps) {
  const { t } = useT();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'rgba(4,2,18,0.98)',
        border: '2px solid rgba(34,211,238,0.50)',
        borderRadius: 20,
        padding: '40px 48px',
        maxWidth: 500,
        textAlign: 'center',
        boxShadow: '0 0 80px rgba(34,211,238,0.16), 0 0 200px rgba(0,0,0,0.7)',
      }}>
        {/* Trophy */}
        <div style={{ fontSize: 52, marginBottom: 16 }}>🏆</div>

        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 20,
          fontWeight: 900,
          color: '#22d3ee',
          letterSpacing: '0.15em',
          marginBottom: 8,
          textTransform: 'uppercase',
        }}>
          {t.tutorial.complete}
        </div>

        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 12,
          color: '#94a3b8',
          lineHeight: 1.7,
          marginBottom: 28,
        }}>
          {t.tutorial.survivedArena}<br />
          {t.tutorial.realRunDesc}<br />
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.tutorial.ready}</span>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onReplayTutorial}
            style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#64748b', borderRadius: 8,
              padding: '10px 20px', cursor: 'pointer',
            }}
          >
            {t.tutorial.replayTutorial}
          </button>
          <button
            onClick={onStartRun}
            style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.92), rgba(6,182,212,0.88))',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 32px', cursor: 'pointer',
              boxShadow: '0 0 24px rgba(34,211,238,0.35)',
            }}
          >
            {t.tutorial.startRealRun}
          </button>
        </div>
      </div>
    </div>
  );
}
