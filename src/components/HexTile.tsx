// src/components/HexTile.tsx
import React, { memo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";

// ── TILE ART TOGGLE — flip to false to instantly revert to original flat tiles ──
const USE_3D_TILES = false;

const TERRAIN_MAP_FLAT: Record<string, string> = {
  forest:       "/art/tiles/Forest_180.png",
  mountain:     "/art/tiles/Mountains.png",
  river:        "/art/tiles/River_180_new.png",
  plain:        "/art/tiles/Plains_180.png",
  mana_crystal: "/art/tiles/Mana_Crystal_180.png",
  base_blue:    "/art/tiles/Blue_Base_180.png",
  base_red:     "/art/tiles/Red_Base_180.png",
  spawn_blue:   "/art/tiles/Spawn_Blue_180.png",
  spawn_red:    "/art/tiles/Spawn_Red_180.png",
  lake:         "/art/tiles/Lake_180.png",
  desert:       "/art/tiles/Desert_180_new.png",
  snow:         "/art/tiles/Snow_180_new.png",
  ice:          "/art/tiles/Ice_180_new.png",
  mud:          "/art/tiles/Mud_180_new.png",
  ash:          "/art/tiles/Plains_180.png",
  ruins:        "/art/tiles/Plains_180.png",
};
const TERRAIN_MAP_3D: Record<string, string> = {
  forest:       "/art/tiles/3d/Forest_3d.png",
  mountain:     "/art/tiles/3d/Mountains_3d.png",
  river:        "/art/tiles/3d/River_3d.png",
  plain:        "/art/tiles/3d/Plains_3d.png",
  mana_crystal: "/art/tiles/3d/Mana_Crystal_3d.png",
  base_blue:    "/art/tiles/3d/Blue_Base_3d.png",
  base_red:     "/art/tiles/3d/Red_Base_3d.png",
  spawn_blue:   "/art/tiles/3d/Spawn_Blue_3d.png",
  spawn_red:    "/art/tiles/3d/Spawn_Red_3d.png",
  lake:         "/art/tiles/3d/Lake_3d.png",
  desert:       "/art/tiles/3d/Desert_3d.png",
  snow:         "/art/tiles/3d/Snow_3d.png",
  ice:          "/art/tiles/3d/Ice_3d.png",
  mud:          "/art/tiles/3d/Mud_3d.png",
  ash:          "/art/tiles/Plains_180.png",
  ruins:        "/art/tiles/Plains_180.png",
};
const TERRAIN_MAP = USE_3D_TILES ? TERRAIN_MAP_3D : TERRAIN_MAP_FLAT;

// Per-character sprite scale overrides (default 1.7)
const SPRITE_SCALE_OVERRIDES: Record<string, number> = {
  Genghis:  1.95,
  Huang:    1.6,
  Teddy:    1.85,
  Leonidas: 1.85,
};

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  iconPortrait?: string;
  iconIsSprite?: boolean;
  iconName?: string;
  spriteAnim?: 'attack' | 'ability' | 'death';
  size?: number;  // hex "radius"
  playerColor?: "blue" | "red";
  isActiveIcon?: boolean;
  isTargetable?: boolean;
  isValidMovement?: boolean;
  isRespawnTarget?: boolean;
  isInAttackRange?: boolean;
  isInAbilityRange?: boolean;
  currentHP?: number;
  maxHP?: number;
  previewHP?: number;
  isHealPreview?: boolean;
}

function HexTile({
  tile,
  onClick,
  onTerrainClick,
  icon,
  iconPortrait,
  iconIsSprite = false,
  iconName,
  spriteAnim,
  size = 50,
  playerColor,
  isActiveIcon,
  isTargetable,
  isValidMovement,
  isRespawnTarget,
  isInAttackRange,
  isInAbilityRange,
  currentHP,
  maxHP,
  previewHP,
  isHealPreview = false,
}: HexTileProps) {
  // ── Internal HP tracking for hit flash + ghost HP bar ──────────────
  const prevHPRef = useRef<number | undefined>(undefined);
  const [flashKey, setFlashKey] = useState(0);
  const [ghostPct, setGhostPct] = useState<number | null>(null);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // ── Sprite hit animation — auto-triggered by HP drop ───────────────
  const [hitAnimKey, setHitAnimKey] = useState(0);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentHP === undefined || maxHP === undefined || maxHP === 0) return;
    const prev = prevHPRef.current;
    if (prev !== undefined && currentHP < prev - 0.5) {
      setFlashKey(k => k + 1);
      setHitAnimKey(k => k + 1);
      const prevPct = Math.max(0, Math.min(100, (prev / maxHP) * 100));
      setGhostPct(prevPct);
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = setTimeout(() => setGhostPct(null), 850);
    }
    prevHPRef.current = currentHP;
  }, [currentHP, maxHP]);

  useEffect(() => {
    return () => {
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    };
  }, []);

  // Resolve which sprite animation is active (hit takes priority)
  const isDead = currentHP !== undefined && currentHP <= 0;
  const activeSpriteAnim: string | null = (() => {
    if (!iconIsSprite) return null;
    if (hitAnimKey > 0 && !isDead) return `anim-sprite-hit-${hitAnimKey}`;
    if (isDead)                     return 'death';
    if (spriteAnim)                 return spriteAnim;
    if (isActiveIcon)               return 'active';
    return null;
  })();

  const isLowHP = currentHP !== undefined && maxHP !== undefined && maxHP > 0
    && currentHP > 0 && (currentHP / maxHP) < 0.25;

  // 1) Resolve terrain image URL
  let key: string = tile.terrain.type;
  if (key === "base")  key = tile.coordinates.q < 0 ? "base_blue"  : "base_red";
  if (key === "spawn") key = tile.coordinates.q < 0 ? "spawn_blue" : "spawn_red";
  const imgSrc = TERRAIN_MAP[key] || TERRAIN_MAP.plain;

  // 2.5D elevation wall height per terrain (px, rendered below hex face)
  const elevMap: Record<string, number> = {
    mountain: 32, forest: 20, base_blue: 18, base_red: 18,
    mana_crystal: 18, plain: 8,
    spawn_blue: 8, spawn_red: 8, river: 0,
    lake: 0, desert: 4, snow: 6, ice: 0, mud: 0, ash: 4, ruins: 10,
  };
  const elev = elevMap[key] ?? 8;
  const elevColorMap: Record<string, string> = {
    mountain:     "rgba(40,32,28,0.92)",
    forest:       "rgba(12,38,12,0.92)",
    base_blue:    "rgba(15,25,80,0.92)",
    base_red:     "rgba(80,12,12,0.92)",
    mana_crystal: "rgba(42,12,72,0.92)",
    plain:        "rgba(42,35,22,0.88)",
    spawn_blue:   "rgba(12,18,58,0.88)",
    spawn_red:    "rgba(58,12,12,0.88)",
    river:        "rgba(4,12,42,0.88)",
    lake:         "rgba(4,18,52,0.92)",
    desert:       "rgba(120,80,10,0.88)",
    snow:         "rgba(180,210,230,0.85)",
    ice:          "rgba(100,160,210,0.88)",
    mud:          "rgba(35,22,10,0.90)",
    ash:          "rgba(60,55,50,0.88)",
    ruins:        "rgba(50,42,65,0.90)",
  };
  const elevColor = elevColorMap[key] ?? "rgba(38,32,28,0.88)";

  // 2) Compute bounding‐box from radius
  const hexWidth  = size * 2;                         // e.g. 100px
  const hexHeight = Math.sqrt(3) * size;              // e.g. ~86.6px

  // 3) Precompute the six points of a flat‐top hex in pixel coords
  //    Flat edges at top & bottom, vertex points on left & right:
  const pts = [
    `${hexWidth * 3 / 4},0`,
    `${hexWidth},${hexHeight / 2}`,
    `${hexWidth * 3 / 4},${hexHeight}`,
    `${hexWidth / 4},${hexHeight}`,
    `0,${hexHeight / 2}`,
    `${hexWidth / 4},0`,
  ].join(" ");

  // Unique clipPath ID per tile
  const clipId = `hex-clip-${tile.coordinates.q}-${tile.coordinates.r}`;

  // Counter-tilt angle — must match the rotateX in GameBoard.tsx
  const BOARD_TILT = 0;
  // Scale factor to compensate for vertical compression from the tilt
  // cos(26°) ≈ 0.899, so we scale Y up by 1/cos to restore original proportions
  const tiltCompensate = 1 / Math.cos((BOARD_TILT * Math.PI) / 180);

  // Only enable 3D compositing when actually tilted (avoids quality degradation at 0°)
  const isTilted = BOARD_TILT > 0;
  const counterRotStyle: React.CSSProperties = isTilted
    ? { transformOrigin: '50% 50%', transform: `rotateX(-${BOARD_TILT}deg) scaleY(${tiltCompensate})` }
    : {};

  return (
    <div
      className="relative cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={e => { e.preventDefault(); onTerrainClick?.(e); }}
      style={{ width: hexWidth, height: hexHeight, ...(isTilted ? { transformStyle: 'preserve-3d' } : {}) }}
    >
      {/* ── Counter-rotated top surface — faces camera despite board tilt ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ ...counterRotStyle, zIndex: 1 }}
      >
        <svg
          className="absolute inset-0 select-none"
          style={{ overflow: 'visible' }}
          width={hexWidth}
          height={hexHeight}
          viewBox={`0 0 ${hexWidth} ${hexHeight}`}
        >
          <defs>
            <clipPath id={clipId}>
              <polygon points={pts} />
            </clipPath>
            {/* Bevel gradient — top-lit surface to give hexes physical depth */}
            <linearGradient id={`${clipId}-bevel`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.13)" />
              <stop offset="35%"  stopColor="rgba(255,255,255,0.03)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
            </linearGradient>
            {/* Occupied ambient gradient — team colour pools at the bottom */}
            {playerColor && (
              <radialGradient id={`${clipId}-occ`} cx="50%" cy="80%" r="60%">
                <stop offset="0%"   stopColor={playerColor === 'blue' ? 'rgba(37,99,235,0.28)' : 'rgba(185,28,28,0.28)'} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            )}
          </defs>
          {/* Terrain image, clipped to exactly the hex */}
          <image
            href={imgSrc}
            x="0" y="0"
            width={hexWidth}
            height={hexHeight}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            style={{ imageRendering: 'high-quality' } as React.CSSProperties}
          />
          {/* Top-lit bevel overlay */}
          <polygon points={pts} fill={`url(#${clipId}-bevel)`} clipPath={`url(#${clipId})`} />
          {/* Occupied ambient colour pool */}
          {playerColor && (
            <polygon points={pts} fill={`url(#${clipId}-occ)`} clipPath={`url(#${clipId})`} />
          )}

          {/* Tile border — slightly warm, not pure black */}
          <polygon points={pts} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={1} />

          {/* Outline & highlight rings */}
          <polygon
            points={pts}
            className={cn(
              "fill-transparent transition-colors",
              tile.highlighted   && "stroke-gray-300 stroke-[1px]",
              isTargetable       && "stroke-red-400 stroke-[2px] fill-red-500/20",
              isValidMovement    && "stroke-green-400 stroke-[2px] fill-green-400/20",
              isInAttackRange    && "stroke-red-400 stroke-[2px] fill-red-400/20",
              isInAbilityRange   && "stroke-orange-400 stroke-[2px] fill-orange-400/20",
              isRespawnTarget    && "stroke-blue-400 stroke-[2px] fill-blue-400/20",
              isActiveIcon       && "stroke-active-turn stroke-[2px]"
            )}
          />

          {/* Team-coloured ring */}
          {playerColor && (
            <polygon
              points={pts}
              fill="none"
              stroke={playerColor === "blue" ? "#60a5fa" : "#f87171"}
              strokeWidth={isActiveIcon ? 5 : 3}
              opacity={0.95}
            />
          )}

          {/* Active-turn animated ring — soft glow + spinning dashes */}
          {isActiveIcon && (
            <>
              {/* Outer blurred glow */}
              <polygon
                points={pts}
                fill="rgba(250,210,0,0.07)"
                stroke="rgba(250,210,0,0.45)"
                strokeWidth={9}
                style={{ filter: 'blur(3px)' }}
              />
              {/* Spinning dashed ring */}
              <polygon
                points={pts}
                fill="none"
                stroke="rgba(250,210,0,0.92)"
                strokeWidth={3}
                strokeDasharray="10 5"
                style={{ animation: 'anim-active-ring-dash 2.0s linear infinite' }}
              />
            </>
          )}
        </svg>
      </div>

      {/* ── Wall SVG — stays in tilted board space (walls only) ── */}
      <svg
        className="absolute inset-0 select-none pointer-events-none"
        style={{ overflow: 'visible', zIndex: 2 }}
        width={hexWidth}
        height={hexHeight}
        viewBox={`0 0 ${hexWidth} ${hexHeight}`}
      >
        <defs>
          <clipPath id={`${clipId}-wall`}>
            <polygon points={pts} />
          </clipPath>
        </defs>

        {/* 2.5D south-facing wall — three faces with shading */}
        {elev > 0 && (() => {
          const H  = elev;
          // Hex bottom vertices
          const bLx = hexWidth / 4,      bRx = hexWidth * 3 / 4, bY  = hexHeight;
          // Hex mid-side vertices
          const mLx = 0,                  mRx = hexWidth,           mY  = hexHeight / 2;

          // Three face polygons (drop straight down by H)
          const centerPts = `${bLx},${bY} ${bRx},${bY} ${bRx},${bY+H} ${bLx},${bY+H}`;
          const leftPts   = `${mLx},${mY} ${bLx},${bY} ${bLx},${bY+H} ${mLx},${mY+H}`;
          const rightPts  = `${bRx},${bY} ${mRx},${mY} ${mRx},${mY+H} ${bRx},${bY+H}`;

          return (
            <>
              {/* Left diagonal — deepest shadow */}
              <polygon points={leftPts}   fill={elevColor} />
              <polygon points={leftPts}   fill="black" opacity={0.50} />
              {/* Center south — most visible, base color */}
              <polygon points={centerPts} fill={elevColor} />
              <polygon points={centerPts} fill="black" opacity={0.15} />
              {/* Right diagonal — lighter, catches ambient */}
              <polygon points={rightPts}  fill={elevColor} />
              <polygon points={rightPts}  fill="black" opacity={0.30} />
              {/* Top edge catchlight along full lower perimeter */}
              <polyline
                points={`${mLx},${mY} ${bLx},${bY} ${bRx},${bY} ${mRx},${mY}`}
                stroke="rgba(255,255,255,0.28)" strokeWidth={1} fill="none"
              />
              {/* Bottom shadow line */}
              <polyline
                points={`${mLx},${mY+H} ${bLx},${bY+H} ${bRx},${bY+H} ${mRx},${mY+H}`}
                stroke="rgba(0,0,0,0.60)" strokeWidth={1} fill="none"
              />
            </>
          );
        })()}

      </svg>

      {/* ── Hover glow for occupied tiles ── */}
      {isHovered && icon && playerColor && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
          <svg
            className="absolute inset-0"
            style={{ overflow: 'visible' }}
            width={hexWidth}
            height={hexHeight}
            viewBox={`0 0 ${hexWidth} ${hexHeight}`}
          >
            <polygon
              points={pts}
              fill={playerColor === 'blue' ? 'rgba(59,130,246,0.18)' : 'rgba(239,68,68,0.18)'}
              stroke={playerColor === 'blue' ? 'rgba(96,165,250,0.8)' : 'rgba(248,113,113,0.8)'}
              strokeWidth={3}
            />
          </svg>
        </div>
      )}

      {/* ── Ground shadow — soft ellipse under sprite feet, outside clip ── */}
      {icon && iconIsSprite && (
        <div className="absolute pointer-events-none" style={{
          zIndex: 9,
          bottom: '4%',
          left: '22%',
          right: '22%',
          height: '20%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 45%, transparent 72%)',
          filter: 'blur(3px)',
        }} />
      )}

      {/* ── Mana crystal ambient pulse — pulsing ring on the strategic center tile ── */}
      {tile.terrain.type === 'mana_crystal' && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
          {/* Expanding ring */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '70%', height: '70%',
            borderRadius: '50%',
            border: '2px solid rgba(139,92,246,0.8)',
            boxShadow: '0 0 10px rgba(139,92,246,0.5), inset 0 0 8px rgba(139,92,246,0.2)',
            animation: 'anim-mana-ring-pulse 2.2s ease-in-out infinite',
          }} />
          {/* Second ring, phase-offset */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '45%', height: '45%',
            borderRadius: '50%',
            border: '1px solid rgba(34,211,238,0.5)',
            animation: 'anim-mana-ring-pulse 2.2s ease-in-out 1.1s infinite',
          }} />
          {/* Core glow */}
          <div style={{
            position: 'absolute',
            inset: '25%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(34,211,238,0.1) 60%, transparent 100%)',
            animation: 'anim-mana-core-glow 2.2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* ── Character portrait — counter-rotated to face camera ── */}
      {icon && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ ...counterRotStyle, zIndex: 10 }}
        >
        <div className="absolute inset-0" style={{ clipPath: `url(#${clipId})` }}>
          {iconPortrait ? (
            <>
              {/* Idle float wrapper — bobs the entire sprite up/down; disabled while dead */}
              <div className="absolute inset-0" style={iconIsSprite && activeSpriteAnim !== 'death' ? (() => {
                const floatDelay = iconName ? `${(iconName.charCodeAt(0) % 8) * 0.35}s` : '0s';
                return { animation: `anim-sprite-idle-float 2.8s ease-in-out ${floatDelay} infinite` };
              })() : undefined}>
              {/* Scale wrapper */}
              <div className="absolute inset-0" style={iconIsSprite ? {
                transform: `scale(${iconName ? (Object.entries(SPRITE_SCALE_OVERRIDES).find(([k]) => iconName.includes(k))?.[1] ?? 1.7) : 1.7})`,
                transformOrigin: 'center 42%',
              } : undefined}>
                {/* Animation wrapper — hit/attack/ability/death/active */}
                <div
                  className="absolute inset-0"
                  key={iconIsSprite && hitAnimKey > 0 ? hitAnimKey : undefined}
                  style={iconIsSprite ? {
                    animation: activeSpriteAnim === `anim-sprite-hit-${hitAnimKey}`
                      ? 'anim-sprite-hit 0.55s ease-out forwards'
                      : activeSpriteAnim === 'attack'
                      ? 'anim-sprite-attack 0.5s ease-out forwards'
                      : activeSpriteAnim === 'ability'
                      ? 'anim-sprite-ability 0.7s ease-out forwards'
                      : activeSpriteAnim === 'death'
                      ? 'anim-sprite-death 1.1s ease-in forwards'
                      : activeSpriteAnim === 'active'
                      ? 'anim-sprite-active 1.8s ease-in-out infinite'
                      : undefined,
                  } : undefined}
                >
                  <img
                    src={iconPortrait}
                    alt={icon}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      objectFit: iconIsSprite ? 'contain' : 'cover',
                      objectPosition: iconIsSprite ? 'center center' : 'center 20%',
                      imageRendering: 'high-quality' as React.CSSProperties['imageRendering'],
                      animation: iconIsSprite ? undefined : 'anim-idle-bob 3s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
              </div>{/* /float wrapper */}
              {/* Dark vignette — lighter for sprites so minifig stays bright */}
              <div className="absolute inset-0" style={{
                background: iconIsSprite
                  ? 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)'
                  : 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
              }} />
              {/* Team colour gradient at bottom for quick ID */}
              <div className="absolute bottom-0 left-0 right-0 h-[30%]" style={{
                background: playerColor === 'blue'
                  ? 'linear-gradient(to top, rgba(37,99,235,0.82), transparent)'
                  : 'linear-gradient(to top, rgba(185,28,28,0.82), transparent)',
              }} />
              {/* Active-turn golden shimmer */}
              {isActiveIcon && (
                <div className="absolute inset-0 animate-pulse" style={{
                  background: 'rgba(250,210,0,0.20)',
                }} />
              )}
              {/* Low HP critical aura */}
              {isLowHP && (
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(239,68,68,0.55) 100%)',
                  animation: 'anim-low-hp-aura 1.1s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              {/* Hit flash white overlay */}
              {flashKey > 0 && (
                <div
                  key={flashKey}
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    animation: 'anim-hit-flash 0.32s ease-out forwards',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{
                background: playerColor === 'blue'
                  ? 'linear-gradient(135deg, rgba(37,99,235,0.82), rgba(15,50,180,0.9))'
                  : 'linear-gradient(135deg, rgba(185,28,28,0.82), rgba(120,10,10,0.9))',
              }}
            >
              <span className="text-white font-bold text-xl drop-shadow select-none"
                style={{ textShadow: '0 0 12px currentColor, 1px 1px 3px rgba(0,0,0,0.8)' }}
              >
                {icon}
              </span>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── Pedestal base — physicalized resin hex base ── */}
      {icon && (
        <div style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          transform: isTilted
            ? `translateX(-50%) rotateX(-${BOARD_TILT}deg) scaleY(${tiltCompensate})`
            : 'translateX(-50%)',
          width: '92%',
          pointerEvents: 'none',
          zIndex: 11,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          {/* Team-colour rim — thin painted edge like a WH40K base edge coat */}
          <div style={{
            width: '100%',
            height: '3px',
            background: playerColor === 'blue'
              ? 'linear-gradient(90deg, #1d4ed8 0%, #60a5fa 50%, #1d4ed8 100%)'
              : 'linear-gradient(90deg, #991b1b 0%, #f87171 50%, #991b1b 100%)',
            borderRadius: '2px 2px 0 0',
            boxShadow: playerColor === 'blue'
              ? '0 0 5px rgba(96,165,250,0.7)'
              : '0 0 5px rgba(248,113,113,0.7)',
          }} />

          {/* Main base body — dark resin with grid texture and bevel */}
          <div style={{
            width: '100%',
            background: '#0f0e1a',
            backgroundImage: [
              'repeating-linear-gradient(0deg,   rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 5px)',
              'repeating-linear-gradient(90deg,  rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 5px)',
            ].join(', '),
            border: '1px solid rgba(255,255,255,0.10)',
            borderTop: 'none',
            borderRadius: '0 0 3px 3px',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.07)',
              'inset 0 -2px 5px rgba(0,0,0,0.75)',
              'inset 1px 0 0 rgba(255,255,255,0.04)',
              'inset -1px 0 0 rgba(255,255,255,0.04)',
              '0 4px 10px rgba(0,0,0,0.95)',
              playerColor === 'blue'
                ? '0 0 8px rgba(37,99,235,0.35)'
                : '0 0 8px rgba(185,28,28,0.35)',
            ].join(', '),
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '4px',
            paddingTop: '1px',
          }}>
            {/* HP bar strip */}
            {currentHP !== undefined && maxHP !== undefined && maxHP > 0 && (() => {
              const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
              const prevPct = previewHP !== undefined ? Math.max(0, Math.min(100, (previewHP / maxHP) * 100)) : pct;
              const hasPreview = previewHP !== undefined && previewHP !== currentHP;
              const fillPct = hasPreview && !isHealPreview ? prevPct : pct;
              const hpColor = fillPct > 75 ? '#22c55e' : fillPct > 50 ? '#eab308' : fillPct > 25 ? '#f97316' : '#ef4444';
              return (
                <div style={{ width: '88%', height: '4px', background: 'rgba(0,0,0,0.7)', borderRadius: '1px', marginTop: '2px', position: 'relative', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', width: `${fillPct}%`, background: hpColor, borderRadius: '1px', transition: 'width 0.15s', boxShadow: `0 0 3px ${hpColor}` }} />
                  {/* Ghost HP drain bar */}
                  {ghostPct !== null && ghostPct > pct && (
                    <div style={{
                      position: 'absolute', top: 0, left: `${pct}%`,
                      width: `${Math.max(0, ghostPct - pct)}%`, height: '100%',
                      background: 'rgba(250,200,0,0.72)',
                      animation: 'anim-hp-ghost-drain 0.85s ease-out forwards',
                      borderRadius: '1px',
                    }} />
                  )}
                  {hasPreview && !isHealPreview && (
                    <div style={{ position: 'absolute', top: 0, left: `${prevPct}%`, width: `${Math.max(0, pct - prevPct)}%`, height: '100%', background: 'rgba(239,68,68,0.85)', animation: 'pulse 1s infinite' }} />
                  )}
                  {hasPreview && isHealPreview && (
                    <div style={{ position: 'absolute', top: 0, left: `${pct}%`, width: `${Math.max(0, prevPct - pct)}%`, height: '100%', background: 'rgba(74,222,128,0.85)', animation: 'pulse 1s infinite' }} />
                  )}
                </div>
              );
            })()}
            {/* Character name — etched into the base */}
            {iconName && (
              <span style={{
                fontSize: '6px',
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: playerColor === 'blue' ? 'rgba(147,197,253,0.92)' : 'rgba(252,165,165,0.92)',
                textShadow: playerColor === 'blue'
                  ? '0 0 4px rgba(96,165,250,0.6)'
                  : '0 0 4px rgba(248,113,113,0.6)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: '90%',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
                fontFamily: 'var(--font-orbitron, monospace)',
                marginTop: '1px',
              }}>
                {iconName}
              </span>
            )}
          </div>

          {/* Cast shadow — wide flat ellipse like a base sitting on a surface */}
          <div style={{
            width: '80%', height: '5px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            filter: 'blur(3px)',
            marginTop: '1px',
          }} />
        </div>
      )}
    </div>
  );
}

export default memo(HexTile, (prev, next) =>
  prev.tile.coordinates.q    === next.tile.coordinates.q    &&
  prev.tile.coordinates.r    === next.tile.coordinates.r    &&
  prev.tile.terrain.type     === next.tile.terrain.type     &&
  prev.tile.highlighted      === next.tile.highlighted      &&
  prev.isActiveIcon          === next.isActiveIcon          &&
  prev.isTargetable          === next.isTargetable          &&
  prev.isValidMovement       === next.isValidMovement       &&
  prev.isRespawnTarget       === next.isRespawnTarget       &&
  prev.isInAttackRange       === next.isInAttackRange       &&
  prev.isInAbilityRange      === next.isInAbilityRange      &&
  prev.playerColor           === next.playerColor           &&
  prev.currentHP             === next.currentHP             &&
  prev.maxHP                 === next.maxHP                 &&
  prev.previewHP             === next.previewHP             &&
  prev.isHealPreview         === next.isHealPreview         &&
  prev.icon                  === next.icon                  &&
  prev.iconPortrait          === next.iconPortrait          &&
  prev.iconIsSprite          === next.iconIsSprite          &&
  prev.spriteAnim            === next.spriteAnim            &&
  prev.iconName              === next.iconName
);
