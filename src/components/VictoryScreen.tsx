import { useEffect, useState, useRef } from "react";
import { Home, ChevronRight } from "lucide-react";
import { useT } from "@/i18n";

interface CombatStat {
  label: string;
  value: string | number;
  accent?: string;
}

interface CharacterResult {
  name: string;
  portrait?: string;
  hpPct: number; // 0–1
  isAlive: boolean;
}

interface VictoryScreenProps {
  isVictory: boolean;
  onBackToMenu: () => void;
  onPlayAgain: () => void;
  playAgainLabel?: string;
  combatStats?: CombatStat[];
  characterResults?: CharacterResult[];
}

// ── Particle bursts ────────────────────────────────────────────────────────────

const VICTORY_PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2;
  const dist = 80 + Math.random() * 140;
  return {
    px: `${Math.cos(angle) * dist}px`,
    py: `${Math.sin(angle) * dist - 50}px`,
    delay: `${0.22 + (i % 7) * 0.055}s`,
    size: 3 + Math.random() * 6,
    color: ['#22d3ee', '#a78bfa', '#fbbf24', '#34d399', '#f472b6'][i % 5],
  };
});

const DEFEAT_PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const dist = 60 + Math.random() * 110;
  return {
    px: `${Math.cos(angle) * dist}px`,
    py: `${Math.sin(angle) * dist - 30}px`,
    delay: `${0.28 + (i % 5) * 0.07}s`,
    size: 2 + Math.random() * 4,
    color: ['#ef4444', '#dc2626', '#b91c1c', '#f97316', '#7f1d1d'][i % 5],
  };
});

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number | string, active: boolean): number | string {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || typeof target !== 'number') return;
    const start = Date.now();
    const dur = 1100;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = Math.round(eased * target);
      setVal(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setVal(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, target]);

  return typeof target === 'number' ? val : target;
}

// ── Animated stat cell ────────────────────────────────────────────────────────

function StatCell({ stat, active, accent }: { stat: CombatStat; active: boolean; accent: string }) {
  const displayed = useCountUp(stat.value, active);
  return (
    <div
      className="flex-1 rounded-lg px-2 py-2.5 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="font-orbitron font-black text-base" style={{ color: stat.accent ?? accent }}>
        {displayed}
      </div>
      <div className="font-orbitron text-[8px] tracking-widest text-slate-500 mt-0.5">{stat.label}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const VictoryScreen = ({
  isVictory,
  onBackToMenu,
  onPlayAgain,
  playAgainLabel,
  combatStats,
  characterResults,
}: VictoryScreenProps) => {
  const { t } = useT();
  const resolvedPlayAgainLabel = playAgainLabel ?? t.victory.victoryTitle;
  const accentColor = isVictory ? '#22d3ee' : '#ef4444';
  const accentGlow  = isVictory ? 'rgba(34,211,238,0.35)' : 'rgba(239,68,68,0.35)';
  const accentDim   = isVictory ? 'rgba(34,211,238,0.08)' : 'rgba(239,68,68,0.08)';

  // Animation phases: 0=hidden, 1=panel+overlay, 2=icon+particles, 3=title+content
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 200);
    const t3 = setTimeout(() => setPhase(3), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const particles = isVictory ? VICTORY_PARTICLES : DEFEAT_PARTICLES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Ambient glow blob */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          top: '50%', left: '50%',
          animation: phase >= 1 ? 'anim-victory-glow-pulse 3s ease-in-out infinite' : 'none',
          transform: 'translate(-50%, -50%)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      />

      {/* Particle burst — both victory (bright) and defeat (red shards) */}
      {phase >= 2 && particles.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            top: '50%', left: '50%',
            '--px': p.px, '--py': p.py,
            animation: `anim-victory-particle 0.9s ease-out ${p.delay} forwards`,
            opacity: 0,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          } as React.CSSProperties}
        />
      ))}

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col items-center text-center mx-4 rounded-2xl"
        style={{
          width: 480,
          background: 'rgba(4,2,18,0.97)',
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 0 80px ${accentGlow}, 0 0 0 1px ${accentColor}15`,
          padding: '48px 40px 40px',
          animation: phase >= 1 ? 'anim-victory-panel 0.65s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
          opacity: phase >= 1 ? 1 : 0,
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-[20%] right-[20%] h-[2px] rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
        />

        {/* Horizontal scanline sweep */}
        {phase >= 1 && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden" style={{ zIndex: 0 }}>
            <div style={{
              position: 'absolute', top: 0, left: '-100%', right: '-100%', height: '2px',
              background: `linear-gradient(to right, transparent, ${accentColor}cc, transparent)`,
              animation: 'anim-turn-banner-line 0.7s ease-out 0.1s forwards',
              transformOrigin: 'left center',
            }} />
          </div>
        )}

        {/* Icon */}
        <div
          className="text-7xl mb-5 select-none relative z-10"
          style={{
            filter: `drop-shadow(0 0 24px ${accentColor})`,
            animation: phase >= 2 ? 'anim-victory-icon 0.7s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
            opacity: phase >= 2 ? 1 : 0,
          }}
        >
          {isVictory ? '🏆' : '💀'}
        </div>

        {/* Status label */}
        <p
          className="font-orbitron text-[10px] uppercase relative z-10"
          style={{
            color: accentColor + 'aa',
            animation: phase >= 3 ? 'anim-victory-label 0.5s ease-out forwards' : 'none',
            opacity: phase >= 3 ? 1 : 0,
            marginBottom: '8px',
          }}
        >
          {isVictory ? t.victory.sectorLiberated : t.victory.lastCloneFalls}
        </p>

        {/* Main title */}
        <h1
          className="font-orbitron font-black mb-6 relative z-10"
          style={{
            fontSize: '3.5rem',
            letterSpacing: '-0.02em',
            color: accentColor,
            textShadow: `0 0 40px ${accentGlow}, 0 0 80px ${accentGlow}`,
            lineHeight: 1,
            animation: phase >= 3 ? 'anim-victory-title 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s forwards' : 'none',
            opacity: phase >= 3 ? 1 : 0,
            transformOrigin: 'center',
          }}
        >
          {isVictory ? t.victory.victoryTitle : t.victory.defeatTitle}
        </h1>

        {/* Divider */}
        <div
          className="w-full h-px mb-6 relative z-10"
          style={{
            background: `linear-gradient(to right, transparent, ${accentColor}40, transparent)`,
            animation: phase >= 3 ? 'anim-turn-banner-line 0.5s ease-out 0.15s forwards' : 'none',
            opacity: phase >= 3 ? 1 : 0,
            transformOrigin: 'center',
          }}
        />

        {/* Rest of content */}
        <div
          className="w-full relative z-10"
          style={{
            animation: phase >= 3 ? 'anim-victory-content 0.5s ease-out 0.25s forwards' : 'none',
            opacity: phase >= 3 ? 1 : 0,
          }}
        >
          {/* Flavor text */}
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-[340px] mx-auto">
            {isVictory ? t.victory.victoryFlavor : t.victory.defeatFlavor}
          </p>

          {/* Combat stats — numbers count up from 0 */}
          {combatStats && combatStats.length > 0 && (
            <div className="w-full flex gap-2 mb-5">
              {combatStats.map((s, i) => (
                <StatCell key={i} stat={s} active={phase >= 3} accent={accentColor} />
              ))}
            </div>
          )}

          {/* Character HP results — larger portraits with names */}
          {characterResults && characterResults.length > 0 && (
            <div className="w-full flex gap-3 mb-5 justify-center">
              {characterResults.map((c, i) => {
                const hpColor = c.hpPct > 0.5 ? '#4ade80' : c.hpPct > 0.25 ? '#fbbf24' : '#f87171';
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5" style={{ minWidth: 0, flex: '1 1 0' }}>
                    {/* Portrait — bumped from 40→56px */}
                    <div
                      className="rounded-xl overflow-hidden shrink-0"
                      style={{
                        width: 56, height: 56,
                        border: `2px solid ${c.isAlive ? hpColor + '90' : 'rgba(100,100,100,0.3)'}`,
                        boxShadow: c.isAlive ? `0 0 12px ${hpColor}50` : 'none',
                        filter: c.isAlive ? 'none' : 'grayscale(1) brightness(0.45)',
                        position: 'relative',
                      }}
                    >
                      {c.portrait ? (
                        <img src={c.portrait} alt={c.name} className="w-full h-full object-cover" style={{ objectPosition: 'center 10%' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'rgba(80,60,120,0.8)' }}>
                          {c.name.charAt(0)}
                        </div>
                      )}
                      {/* KIA overlay */}
                      {!c.isAlive && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <span className="font-orbitron text-[9px] font-bold text-red-400 tracking-widest">KIA</span>
                        </div>
                      )}
                    </div>
                    {/* HP bar */}
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(0, c.hpPct) * 100}%`, background: hpColor }} />
                    </div>
                    {/* Name */}
                    <span className="font-orbitron text-[8px] tracking-wide truncate w-full text-center"
                      style={{ color: c.isAlive ? 'rgba(200,210,230,0.75)' : 'rgba(150,150,150,0.5)' }}>
                      {c.name.split(' ')[0].toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onPlayAgain}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-orbitron font-bold text-sm tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: accentDim,
                border: `1px solid ${accentColor}50`,
                color: accentColor,
                boxShadow: `0 0 20px ${accentGlow}`,
              }}
            >
              {resolvedPlayAgainLabel}
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onBackToMenu}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron font-bold text-sm tracking-wider text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'rgba(15,10,40,0.5)',
                border: '1px solid rgba(100,80,160,0.25)',
              }}
            >
              <Home className="w-4 h-4" />
              {t.victory.mainMenu}
            </button>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          className="absolute bottom-0 left-[30%] right-[30%] h-[1px] rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}30, transparent)` }}
        />
      </div>
    </div>
  );
};

export default VictoryScreen;
