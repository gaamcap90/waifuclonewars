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
  const text = isDamage ? `-${anim.value}` : `+${anim.value}`;
  const color = isDamage ? '#ff4444' : '#44ff88';
  const shadow = isDamage
    ? '0 0 10px rgba(255,60,60,0.9), 1px 1px 3px #000'
    : '0 0 10px rgba(50,255,100,0.9), 1px 1px 3px #000';

  const val = anim.value ?? 0;
  const fontSize = isDamage
    ? val < 10  ? '0.95rem'
    : val < 20  ? '1.15rem'
    : val < 35  ? '1.45rem'
    : val < 55  ? '1.8rem'
    :             '2.2rem'
    : '1rem';
  const fontWeight = isDamage && val >= 35 ? 900 : 700;

  return (
    <div
      key={anim.id}
      style={{
        position: 'absolute',
        left: c.x - 18,
        top: c.y - 18,
        color,
        fontWeight,
        fontSize,
        textShadow: shadow,
        animation: 'anim-float-up-fade 1.35s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 200,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-orbitron, monospace)',
        letterSpacing: '0.03em',
      }}
    >
      {text}
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

function CastBurst({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  const color = anim.color ?? 'rgba(255,215,0,0.9)';
  return (
    <>
      {/* Outer star burst */}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          animation: 'anim-cast-burst 0.75s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 195,
        }}
      />
      {/* Inner core flash */}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          animation: 'anim-impact 0.3s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 196,
          filter: 'blur(1px)',
        }}
      />
    </>
  );
}

function DeathEffect({ anim, ox, oy }: { anim: AnimEvent; ox: number; oy: number }) {
  const c = hexCenter(anim.position.q, anim.position.r, ox, oy);
  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        fontSize: '2rem',
        animation: 'anim-death-skull 1.3s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 200,
        filter: 'drop-shadow(0 0 8px rgba(255,30,30,0.9))',
      }}
    >
      💀
    </div>
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
          default:
            return null;
        }
      })}
    </div>
  );
};

export default AnimationLayer;
