import React from "react";

/**
 * Full-screen layered background:
 * - Deep space dark base with dual-tone gradient
 * - Alien atmosphere nebula clouds (radial gradients)
 * - Subtle radial vignette
 * - Faint hex grid (SVG) — two layers at different scales
 * - Drifting aurora beams (blurred gradients)
 * - Central crystal energy glow
 * - Energy ground lines (horizontal scan lines)
 * - Floating particles — two sizes
 * - Corner accent glows
 *
 * Purely visual (pointer-events-none) and sits behind everything (-z-10).
 */
export default function ArenaBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Base gradient — deeper, more alien */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #020318 0%, #050828 35%, #080516 65%, #030212 100%)',
      }} />

      {/* Nebula atmosphere — multiple color clouds */}
      <div className="absolute inset-0" style={{
        background: [
          'radial-gradient(ellipse 80% 50% at 20% 30%, rgba(88,28,135,0.22) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 60% at 80% 20%, rgba(15,35,100,0.30) 0%, transparent 55%)',
          'radial-gradient(ellipse 70% 55% at 50% 85%, rgba(50,5,90,0.18) 0%, transparent 55%)',
          'radial-gradient(ellipse 45% 40% at 85% 70%, rgba(100,10,40,0.15) 0%, transparent 50%)',
          'radial-gradient(ellipse 55% 35% at 10% 75%, rgba(5,40,100,0.18) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Vignette — stronger corners */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(0,0,8,0.70) 100%)',
      }} />

      {/* Hex grid overlay — large scale, very subtle */}
      <svg
        className="absolute inset-0"
        style={{ opacity: 0.12 }}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="hexgrid-lg" width="90" height="78" patternUnits="userSpaceOnUse">
            <path
              d="M45 0 L90 22.5 L90 55.5 L45 78 L0 55.5 L0 22.5 Z"
              fill="none"
              stroke="url(#hexstroke-lg)"
              strokeWidth="0.8"
            />
          </pattern>
          <linearGradient id="hexstroke-lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid-lg)" />
      </svg>

      {/* Hex grid overlay — small scale, even more subtle */}
      <svg
        className="absolute inset-0"
        style={{ opacity: 0.055 }}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="hexgrid-sm" width="28" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M14 0 L28 7 L28 17 L14 24 L0 17 L0 7 Z"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid-sm)" />
      </svg>

      {/* Aurora beams — three layers with varied colors */}
      <div className="absolute -left-1/4 top-1/4 w-[70%] h-48 rounded-full animate-drift-slow"
        style={{ background: 'linear-gradient(to right, rgba(34,211,238,0.09), rgba(139,92,246,0.10), rgba(217,70,239,0.07))', filter: 'blur(48px)' }} />
      <div className="absolute -right-1/3 bottom-1/4 w-[65%] h-36 rounded-full animate-drift-slower"
        style={{ background: 'linear-gradient(to right, rgba(124,58,237,0.10), rgba(34,211,238,0.08), rgba(217,70,239,0.09))', filter: 'blur(44px)' }} />
      <div className="absolute left-1/4 -top-1/4 w-[50%] h-64 rounded-full animate-drift-slow"
        style={{ background: 'linear-gradient(to bottom, rgba(59,130,246,0.12), rgba(139,92,246,0.07), transparent)', filter: 'blur(56px)', animationDelay: '8s' }} />

      {/* Central crystal energy glow — layered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-soft"
        style={{
          width: '75vmin', height: '75vmin',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(34,211,238,0.10) 30%, rgba(217,70,239,0.05) 55%, transparent 72%)',
        }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: '35vmin', height: '35vmin',
          background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
          animation: 'arena-pulse 5s ease-in-out infinite',
        }} />

      {/* Horizontal energy scan lines — 3 bands */}
      <div className="absolute left-0 right-0 h-px" style={{ top: '33%', background: 'linear-gradient(to right, transparent, rgba(34,211,238,0.12), rgba(167,139,250,0.12), transparent)' }} />
      <div className="absolute left-0 right-0 h-px" style={{ top: '66%', background: 'linear-gradient(to right, transparent, rgba(217,70,239,0.10), rgba(34,211,238,0.10), transparent)' }} />
      <div className="absolute left-0 right-0 h-px" style={{ top: '50%', background: 'linear-gradient(to right, transparent 10%, rgba(124,58,237,0.08), transparent 90%)' }} />

      {/* Corner accent glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 70%)' }} />

      {/* Floating particles — two tiers */}
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-float-slower"
          style={{
            width: `${5 + (i % 3) * 3}px`,
            height: `${5 + (i % 3) * 3}px`,
            background: i % 3 === 0 ? 'rgba(34,211,238,0.30)' : i % 3 === 1 ? 'rgba(167,139,250,0.30)' : 'rgba(217,70,239,0.25)',
            boxShadow: i % 3 === 0
              ? '0 0 16px rgba(34,211,238,0.4)'
              : i % 3 === 1
                ? '0 0 14px rgba(167,139,250,0.4)'
                : '0 0 14px rgba(217,70,239,0.35)',
            left: `${8 + (i * 9) % 84}%`,
            top: `${(i * 11) % 88}%`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
      {[...Array(6)].map((_, i) => (
        <span
          key={`sm-${i}`}
          className="absolute rounded-full animate-float-slower"
          style={{
            width: '2px', height: '2px',
            background: '#a78bfa',
            opacity: 0.5,
            left: `${5 + (i * 17) % 90}%`,
            top: `${(i * 19 + 5) % 90}%`,
            animationDelay: `${i * 1.3 + 2}s`,
          }}
        />
      ))}
    </div>
  );
}
