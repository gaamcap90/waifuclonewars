/**
 * AnimationLayer — renders battle effects (damage numbers, impacts, projectiles, auras)
 * Must be mounted inside GameBoard's transforming div so hex coordinates align automatically.
 */
import React from "react";
import { AnimEvent } from "@/hooks/useAnimations";

interface AnimationLayerProps {
  animations: AnimEvent[];
  offsetX: number;
  offsetY: number;
}

const HEX_SIZE = 50;
const HEX_W = HEX_SIZE * 2;          // 100px
const HEX_H = Math.sqrt(3) * HEX_SIZE; // ~86.6px

function hexCenter(q: number, r: number, ox: number, oy: number) {
  const x = HEX_SIZE * (1.5 * q) + ox + HEX_W / 2;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + oy + HEX_H / 2;
  return { x, y };
}

// ── individual effect renderers ──────────────────────────────────────

function FloatingNumber({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const isDamage = anim.type === 'damage';
  const val = anim.value ?? 0;
  const isBig = isDamage && val >= 30;
  const isMassive = isDamage && val >= 50;
  const isCrit = isDamage && val >= 80;

  const text = isDamage ? (isCrit ? `−${val}!` : `−${val}`) : `+${val}`;
  const color  = isDamage
    ? isCrit ? '#fde047' : isMassive ? '#ff9900' : '#ff4444'
    : '#44ff88';
  const shadow = isDamage
    ? isCrit
      ? '0 0 24px rgba(253,224,71,1.0), 0 0 12px rgba(255,200,0,0.95), 2px 2px 4px #000'
      : isMassive
        ? '0 0 18px rgba(255,140,0,1.0), 0 0 8px rgba(255,60,0,0.8), 2px 2px 4px #000'
        : '0 0 12px rgba(255,60,60,0.95), 1px 1px 3px #000'
    : '0 0 10px rgba(50,255,100,0.9), 1px 1px 3px #000';

  const fontSize = isDamage
    ? val < 10  ? '1.0rem'
    : val < 20  ? '1.25rem'
    : val < 35  ? '1.55rem'
    : val < 50  ? '1.95rem'
    : val < 80  ? '2.4rem'
    :             '2.8rem'
    : '1.05rem';

  // Deterministic horizontal jitter — numbers fan out instead of stacking
  const hashId = anim.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const jitterX = ((hashId % 22) - 11);  // –11 to +11 px

  return (
    <div
      style={{
        position: 'absolute',
        left: c.x - 22 + jitterX,
        top:  c.y - 22,
        pointerEvents: 'none',
        zIndex: 200,
        animation: `${isBig ? 'anim-float-up-big' : 'anim-float-up-fade'} ${isBig ? '1.55s' : '1.35s'} ease-out forwards`,
      }}
    >
      {/* Chip background for readability — scales with damage tier */}
      <div style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        padding: isBig ? '2px 7px' : '1px 5px',
        borderRadius: '6px',
        background: isDamage
          ? isCrit
            ? 'rgba(60,40,0,0.85)'
            : isMassive
              ? 'rgba(40,12,0,0.82)'
              : 'rgba(30,5,5,0.72)'
          : 'rgba(5,30,10,0.72)',
        border: `1px solid ${color}${isCrit ? 'aa' : '55'}`,
        boxShadow: isCrit ? `0 0 22px ${color}90, 0 0 8px ${color}` : isBig ? `0 0 14px ${color}60` : 'none',
      }}>
        <span style={{
          color,
          fontWeight: isBig ? 900 : 700,
          fontSize,
          textShadow: shadow,
          fontFamily: 'var(--font-orbitron, monospace)',
          letterSpacing: isBig ? '0.0em' : '0.03em',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>
          {text}
        </span>
        {/* CRIT badge for huge hits */}
        {isCrit && (
          <span style={{
            position: 'absolute',
            top: '-10px', right: '-12px',
            fontSize: '0.6rem',
            fontWeight: 900,
            color: '#fde047',
            fontFamily: 'var(--font-orbitron, monospace)',
            textShadow: '0 0 8px rgba(253,224,71,1.0)',
            letterSpacing: '0.15em',
            background: 'rgba(60,40,0,0.85)',
            padding: '1px 4px',
            borderRadius: '4px',
            border: '1px solid #fde04788',
          }}>CRIT</span>
        )}
        {/* "!!" badge for massive hits (non-crit) */}
        {isMassive && !isCrit && (
          <span style={{
            position: 'absolute',
            top: '-8px', right: '-6px',
            fontSize: '0.55rem',
            fontWeight: 900,
            color: '#ffaa00',
            fontFamily: 'var(--font-orbitron, monospace)',
            textShadow: '0 0 6px rgba(255,160,0,0.9)',
            letterSpacing: '0.1em',
          }}>!!</span>
        )}
      </div>
    </div>
  );
}

function Impact({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(255,80,30,0.85)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: color,
        animation: 'anim-impact 0.55s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 190,
        filter: 'blur(2px)',
      }}
    />
  );
}

function AuraRing({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(80,200,255,0.8)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 70,
        height: 70,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        boxShadow: `0 0 14px ${color}`,
        animation: 'anim-aura-ring 0.85s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 195,
      }}
    />
  );
}

// Arcane rune glyphs — alien-looking Unicode characters used as cast symbols
const RUNE_GLYPHS = ['⬡', '⟁', '✦', '◈', '⬢', '⟐'];

function CastBurst({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(255,215,0,0.9)';
  // Pick a deterministic glyph from the anim id
  const glyphIdx = anim.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % RUNE_GLYPHS.length;
  const glyph = RUNE_GLYPHS[glyphIdx];
  return (
    <>
      {/* Outer star burst */}
      <div
        style={{
          position: 'absolute',
          left: c.x - 25,
          top: c.y - 25,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          animation: 'anim-cast-burst 0.75s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 195,
        }}
      />
      {/* Rune glyph flash */}
      <div
        style={{
          position: 'absolute',
          left: c.x - 20,
          top: c.y - 22,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          color,
          textShadow: `0 0 14px ${color}, 0 0 28px ${color}`,
          fontFamily: 'monospace',
          animation: 'anim-cast-burst 0.75s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 197,
        }}
      >
        {glyph}
      </div>
      {/* Expanding hex ring */}
      <div
        style={{
          position: 'absolute',
          left: c.x - 30,
          top: c.y - 30,
          width: 60,
          height: 60,
          borderRadius: '4px',
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          border: `2px solid ${color}`,
          boxShadow: `0 0 12px ${color}`,
          animation: 'anim-aura-ring 0.65s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 196,
        }}
      />
      {/* Inner core flash */}
      <div
        style={{
          position: 'absolute',
          left: c.x - 10,
          top: c.y - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          animation: 'anim-impact 0.3s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 198,
          filter: 'blur(1px)',
        }}
      />
    </>
  );
}

// Death shatter particles — pre-computed burst directions
const DEATH_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + (i % 3) * 0.3; // slightly irregular
  const dist = 38 + (i % 3) * 16; // 38–70px scatter
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    size: 3 + (i % 3) * 2,        // 3–7px
    delay: (i % 4) * 0.04,        // 0–0.12s stagger
    color: i % 3 === 0 ? '#ff4422' : i % 3 === 1 ? '#ff8833' : '#ffcc44',
  };
});

function DeathEffect({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const clipHex = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
  return (
    <>
      {/* Full hex red flash/dissolve */}
      <div
        style={{
          position: 'absolute',
          left: c.x - HEX_W / 2,
          top: c.y - HEX_H / 2,
          width: HEX_W,
          height: HEX_H,
          clipPath: clipHex,
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,60,20,0.90) 40%, rgba(200,10,10,0.70) 100%)',
          animation: 'anim-hex-death-flash 1.1s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 199,
        }}
      />
      {/* Burst sparks */}
      {DEATH_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: c.x - p.size / 2,
            top: c.y - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `anim-death-spark 0.75s ease-out ${p.delay}s forwards`,
            '--spark-x': `${p.x}px`,
            '--spark-y': `${p.y}px`,
            pointerEvents: 'none',
            zIndex: 201,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
      {/* Rising skull */}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          fontSize: '1.8rem',
          animation: 'anim-death-skull 1.3s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 200,
          filter: 'drop-shadow(0 0 10px rgba(255,30,30,0.95))',
        }}
      >
        💀
      </div>
    </>
  );
}

function Projectile({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  if (!anim.fromPosition) return null;
  const from = hexCenter(anim.fromPosition.q, anim.fromPosition.r, ox, oy);
  const to   = hexCenter(anim.position.q,     anim.position.r,     ox, oy);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const color = anim.color ?? 'rgba(255,150,30,0.95)';

  return (
    <div
      style={{
        position: 'absolute',
        left: from.x - 6,
        top:  from.y - 6,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 12px ${color}, 0 0 4px white`,
        animation: 'anim-projectile 0.42s ease-in forwards',
        pointerEvents: 'none',
        zIndex: 198,
        // CSS custom properties drive the keyframe end position
        ['--tx' as string]: `${dx}px`,
        ['--ty' as string]: `${dy}px`,
      } as React.CSSProperties}
    />
  );
}

function MoveTrail({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(120,220,255,0.7)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}`,
        animation: 'anim-move-trail 0.5s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 185,
        filter: 'blur(1px)',
      }}
    />
  );
}

function AoeRing({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const range = anim.value ?? 2;
  const radius = range * HEX_SIZE * 1.75;
  const color = anim.color ?? 'rgba(255,80,30,0.85)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: radius * 2,
        height: radius * 2,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: `3px solid ${color}`,
        boxShadow: `0 0 22px ${color}, inset 0 0 18px ${color}`,
        animation: 'anim-aoe-ring 0.9s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 197,
      }}
    />
  );
}

function ShieldPulse({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(100,180,255,0.85)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 65,
        height: 65,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        boxShadow: `0 0 18px ${color}, inset 0 0 10px ${color}`,
        animation: 'anim-shield-pulse 0.75s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 193,
      }}
    />
  );
}

function MeleeSlash({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(255,220,60,0.95)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 54,
          height: 54,
          borderRadius: '12%',
          background: `conic-gradient(${color} 0deg 80deg, transparent 80deg)`,
          animation: 'anim-slash 0.38s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 196,
          filter: 'blur(0.8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 44,
          height: 3,
          background: `linear-gradient(90deg, white, ${color})`,
          boxShadow: `0 0 8px ${color}`,
          animation: 'anim-slash 0.38s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 197,
        }}
      />
    </>
  );
}

function HealRing({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(80,255,140,0.85)';
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: 62,
        height: 62,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        boxShadow: `0 0 20px ${color}, inset 0 0 14px ${color}`,
        animation: 'anim-heal-ring 0.75s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 194,
      }}
    />
  );
}

function DespawnEffect({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  // Terracotta clay color shards
  return (
    <>
      {/* Central hex crumble flash */}
      <div
        style={{
          position: 'absolute',
          left: c.x - HEX_W / 2,
          top: c.y - HEX_H / 2,
          width: HEX_W,
          height: HEX_H,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          background: 'radial-gradient(ellipse at center, rgba(200,120,50,0.90) 0%, rgba(160,80,20,0.70) 50%, transparent 100%)',
          animation: 'anim-despawn-crumble 0.7s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 199,
        }}
      />
      {/* Shard particles */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: c.x - 4,
            top: c.y - 4,
            width: 8,
            height: 8,
            borderRadius: '2px',
            background: i % 2 === 0 ? '#c87832' : '#a05020',
            boxShadow: '0 0 4px rgba(200,120,50,0.7)',
            animation: `anim-despawn-shard 0.65s ease-out forwards`,
            animationDelay: `${i * 30}ms`,
            pointerEvents: 'none',
            zIndex: 200,
            ['--dx' as string]: `${Math.cos((deg * Math.PI) / 180) * 38}px`,
            ['--dy' as string]: `${Math.sin((deg * Math.PI) / 180) * 38}px`,
          } as React.CSSProperties}
        />
      ))}
      {/* Rising 💀 or crumble emoji */}
      <div
        style={{
          position: 'absolute',
          left: c.x - 12,
          top: c.y - 12,
          fontSize: '1.4rem',
          animation: 'anim-despawn-rise 0.7s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 201,
          filter: 'drop-shadow(0 0 6px rgba(200,120,50,0.9))',
        }}
      >
        🧱
      </div>
    </>
  );
}

function KnockbackBurst({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(100,220,255,0.9)';

  let streakEl: React.ReactNode = null;
  if (anim.fromPosition) {
    const from = hexCenter(anim.fromPosition.q, anim.fromPosition.r, ox, oy);
    const dx = c.x - from.x;
    const dy = c.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const dist = Math.sqrt(dx * dx + dy * dy);
    streakEl = (
      <div
        style={{
          position: 'absolute',
          left: from.x,
          top: from.y - 3,
          width: dist,
          height: 6,
          transformOrigin: '0 50%',
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, transparent 0%, ${color} 100%)`,
          animation: 'anim-knockback-streak 0.5s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 191,
          borderRadius: 3,
          filter: `blur(0.5px) drop-shadow(0 0 4px ${color})`,
        }}
      />
    );
  }

  return (
    <>
      {streakEl}
      {/* Expanding shockwave ring */}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          boxShadow: `0 0 22px ${color}, inset 0 0 10px ${color}40`,
          animation: 'anim-knockback-ring 0.55s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 192,
        }}
      />
      {/* Center flash */}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: `radial-gradient(circle, white 0%, ${color} 45%, transparent 100%)`,
          animation: 'anim-knockback-flash 0.5s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 193,
        }}
      />
    </>
  );
}

// ── main component ───────────────────────────────────────────────────

const AnimationLayer: React.FC<AnimationLayerProps> = ({ animations, offsetX, offsetY }) => {
  if (animations.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 150,
      }}
    >
      {animations.map(anim => {
        switch (anim.type) {
          case 'damage':
          case 'heal':
            return <FloatingNumber key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'impact':
            return <Impact key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'aura':
            return <AuraRing key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'cast':
            return <CastBurst key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'death':
            return <DeathEffect key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'projectile':
            return <Projectile key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'shield':
            return <ShieldPulse key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'trail':
            return <MoveTrail key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'aoe':
            return <AoeRing key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'slash':
            return <MeleeSlash key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'heal_ring':
            return <HealRing key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'despawn':
            return <DespawnEffect key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          case 'knockback':
            return <KnockbackBurst key={anim.id} anim={anim} ox={offsetX} oy={offsetY} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default AnimationLayer;
