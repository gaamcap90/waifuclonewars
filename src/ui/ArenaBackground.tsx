import React from "react";

/**
 * Full-screen layered background:
 * - Dark gradient base
 * - Subtle radial vignette
 * - Faint hex grid (SVG)
 * - Drifting aurora beams (blurred gradients)
 * - Soft crystal glow at center
 * - Floating particles
 *
 * Purely visual (pointer-events-none) and sits behind everything (-z-10).
 */
export default function ArenaBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,130,255,0.08),transparent_55%)]" />

      {/* Hex grid overlay (very subtle) */}
      <svg
        className="absolute inset-0 opacity-20"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="hexgrid" width="60" height="52" patternUnits="userSpaceOnUse">
            {/* Hexagon path (pointy-top) */}
            <path
              d="M30 0 L60 15 L60 37 L30 52 L0 37 L0 15 Z"
              fill="none"
              stroke="url(#hexstroke)"
              strokeWidth="0.75"
            />
          </pattern>
          <linearGradient id="hexstroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid)" />
      </svg>

      {/* Aurora beams (slow drift) */}
      <div className="absolute -left-1/4 top-1/4 w-[70%] h-40 bg-gradient-to-r from-cyan-400/10 via-fuchsia-400/10 to-purple-400/10 blur-3xl rounded-full animate-drift-slow" />
      <div className="absolute -right-1/3 bottom-1/4 w-[65%] h-32 bg-gradient-to-r from-purple-400/10 via-cyan-400/10 to-fuchsia-400/10 blur-3xl rounded-full animate-drift-slower" />

      {/* Central crystal glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vmin] h-[65vmin] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18)_0%,rgba(34,211,238,0.08)_35%,transparent_70%)] animate-pulse-soft" />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-cyan-300/25 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-float-slower"
          style={{
            width: `${6 + (i % 3) * 3}px`,
            height: `${6 + (i % 3) * 3}px`,
            left: `${10 + (i * 11) % 80}%`,
            top: `${(i * 13) % 90}%`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}