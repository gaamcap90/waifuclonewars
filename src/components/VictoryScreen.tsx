import { Home, ChevronRight } from "lucide-react";

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

const VictoryScreen = ({ isVictory, onBackToMenu, onPlayAgain, playAgainLabel = "PLAY AGAIN", combatStats, characterResults }: VictoryScreenProps) => {
  const accentColor = isVictory ? '#22d3ee' : '#ef4444';
  const accentGlow  = isVictory ? 'rgba(34,211,238,0.35)' : 'rgba(239,68,68,0.35)';
  const accentDim   = isVictory ? 'rgba(34,211,238,0.08)' : 'rgba(239,68,68,0.08)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)' }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Ambient glow blob */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col items-center text-center mx-4 rounded-2xl"
        style={{
          width: 480,
          background: 'rgba(4,2,18,0.97)',
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 0 60px ${accentGlow}, 0 0 0 1px ${accentColor}15`,
          padding: '48px 40px 40px',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-[20%] right-[20%] h-[2px] rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
        />

        {/* Icon */}
        <div className="text-7xl mb-5 select-none" style={{ filter: `drop-shadow(0 0 20px ${accentColor})` }}>
          {isVictory ? '🏆' : '💀'}
        </div>

        {/* Status label */}
        <p
          className="font-orbitron text-[10px] tracking-[0.5em] mb-2 uppercase"
          style={{ color: accentColor + 'aa' }}
        >
          {isVictory ? '— SECTOR LIBERATED —' : '— LAST CLONE FALLS —'}
        </p>

        {/* Main title */}
        <h1
          className="font-orbitron font-black mb-6"
          style={{
            fontSize: '3.5rem',
            letterSpacing: '-0.02em',
            color: accentColor,
            textShadow: `0 0 40px ${accentGlow}, 0 0 80px ${accentGlow}`,
            lineHeight: 1,
          }}
        >
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {/* Divider */}
        <div
          className="w-full h-px mb-6"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}40, transparent)` }}
        />

        {/* Flavor text */}
        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-[340px]">
          {isVictory
            ? 'The battlefield falls silent. Through brilliance and sacrifice, your clones have carved their names into history.'
            : 'The Empire of Znyxorga claims this sector. Your clones will remember — and return stronger.'}
        </p>

        {/* Combat stats row */}
        {combatStats && combatStats.length > 0 && (
          <div className="w-full flex gap-2 mb-5">
            {combatStats.map((s, i) => (
              <div key={i} className="flex-1 rounded-lg px-2 py-2 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="font-orbitron font-black text-base" style={{ color: s.accent ?? accentColor }}>
                  {s.value}
                </div>
                <div className="font-orbitron text-[8px] tracking-widest text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Character HP results */}
        {characterResults && characterResults.length > 0 && (
          <div className="w-full flex gap-2 mb-5">
            {characterResults.map((c, i) => {
              const hpColor = c.hpPct > 0.5 ? '#4ade80' : c.hpPct > 0.25 ? '#fbbf24' : '#f87171';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                    style={{
                      border: `2px solid ${c.isAlive ? hpColor + '80' : 'rgba(100,100,100,0.3)'}`,
                      filter: c.isAlive ? 'none' : 'grayscale(1) brightness(0.5)',
                    }}>
                    {c.portrait ? (
                      <img src={c.portrait} alt={c.name} className="w-full h-full object-cover" style={{ objectPosition: 'center 10%' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'rgba(80,60,120,0.8)' }}>
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* HP bar */}
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, c.hpPct) * 100}%`, background: hpColor }} />
                  </div>
                  {!c.isAlive && <span className="text-[8px] font-orbitron text-red-500">KIA</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {/* Primary: Next Round / Play Again */}
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
            {playAgainLabel}
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Secondary: Main Menu */}
          <button
            onClick={onBackToMenu}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron font-bold text-sm tracking-wider text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: 'rgba(15,10,40,0.5)',
              border: '1px solid rgba(100,80,160,0.25)',
            }}
          >
            <Home className="w-4 h-4" />
            MAIN MENU
          </button>
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
