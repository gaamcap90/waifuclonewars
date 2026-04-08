import React, { useState, useEffect } from "react";

interface Props {
  onComplete: () => void;
}

/**
 * Cinematic intro loading screen.
 * Phase -1 → blank
 * Phase  0 → "The Empire of Znyxorga Presents" fades in
 * Phase  1 → presents fades out, "WAIFU CLONE WARS" fades in
 * Phase  2 → whole screen fades out → onComplete
 */
export default function LoadingScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<-1 | 0 | 1 | 2>(-1);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(0), 80);      // trigger fade-in "presents"
    const t1 = setTimeout(() => setPhase(1), 2400);    // switch to title
    const t2 = setTimeout(() => setPhase(2), 4300);    // fade out
    const t3 = setTimeout(onComplete, 5100);           // done
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        opacity: phase < 2 ? 1 : 0,
        transition: "opacity 0.8s ease",
        pointerEvents: "none",
        background: '#000',
      }}
    >
      {/* Arena background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/art/loading_screen.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: phase >= 0 ? 0.85 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* Dark vignette over image so text pops */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Radial glow — blooms when title appears */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, rgba(34,211,238,0.12) 40%, transparent 70%)",
          filter: "blur(60px)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }}
      />

      <div className="relative text-center space-y-5 select-none px-8">
        {/* "PRESENTS" line */}
        <p
          className="font-orbitron text-[11px] tracking-[0.6em] uppercase"
          style={{
            color: "#a78bfa",
            opacity: phase === 0 ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          The Empire of Znyxorga Presents
        </p>

        {/* Main title */}
        <div
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          <h1
            className="font-orbitron font-black text-white leading-none"
            style={{ fontSize: "clamp(2.8rem, 9vw, 6rem)", letterSpacing: "-0.02em" }}
          >
            WAIFU
          </h1>
          <h1
            className="font-orbitron font-black leading-none"
            style={{
              fontSize: "clamp(2.8rem, 9vw, 6rem)",
              letterSpacing: "-0.02em",
              color: "#22d3ee",
              textShadow: "0 0 80px rgba(34,211,238,0.9), 0 0 160px rgba(34,211,238,0.4)",
            }}
          >
            CLONE WARS
          </h1>

          {/* Loading indicator */}
          <div
            className="mt-8 flex items-center gap-3 justify-center"
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transition: "opacity 0.8s ease 0.5s",
            }}
          >
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
