import { Home, ChevronRight } from "lucide-react";

interface VictoryScreenProps {
  isVictory: boolean;
  onBackToMenu: () => void;
  onPlayAgain: () => void;
  playAgainLabel?: string;
}

const VictoryScreen = ({ isVictory, onBackToMenu, onPlayAgain, playAgainLabel = "PLAY AGAIN" }: VictoryScreenProps) => {
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
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-[340px]">
          {isVictory
            ? 'The battlefield falls silent. Through brilliance and sacrifice, your clones have carved their names into history.'
            : 'The Empire of Znyxorga claims this sector. Your clones will remember — and return stronger.'}
        </p>

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
