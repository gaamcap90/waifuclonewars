// src/components/HexTile.tsx
import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  iconPortrait?: string;
  iconName?: string;
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

export default function HexTile({
  tile,
  onClick,
  onTerrainClick,
  icon,
  iconPortrait,
  iconName,
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
  // 1) Terrain → public URL
  const terrainMap: Record<string,string> = {
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
  let key: string = tile.terrain.type;
  if (key === "base")  key = tile.coordinates.q < 0 ? "base_blue"  : "base_red";
  if (key === "spawn") key = tile.coordinates.q < 0 ? "spawn_blue" : "spawn_red";
  const imgSrc = terrainMap[key] || terrainMap.plain;

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

          {/* Tile border */}
          <polygon points={pts} className="fill-transparent stroke-black stroke-[1px]" />

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

      {/* ── Character portrait — counter-rotated to face camera ── */}
      {icon && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ ...counterRotStyle, zIndex: 10 }}
        >
        <div className="absolute inset-0" style={{ clipPath: `url(#${clipId})` }}>
          {iconPortrait ? (
            <>
              <img
                src={iconPortrait}
                alt={icon}
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  imageRendering: 'auto',
                  animation: 'anim-idle-bob 3s ease-in-out infinite',
                }}
              />
              {/* Dark vignette to make edges read cleanly against terrain */}
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
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

      {/* ── Pedestal base — counter-rotated to face camera ── */}
      {icon && (
        <div style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          transform: isTilted
            ? `translateX(-50%) rotateX(-${BOARD_TILT}deg) scaleY(${tiltCompensate})`
            : 'translateX(-50%)',
          width: '72%',
          pointerEvents: 'none',
          zIndex: 11,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          <div style={{
            width: '100%',
            background: playerColor === 'blue'
              ? 'linear-gradient(to bottom, #2563eb, #1e3a8a)'
              : 'linear-gradient(to bottom, #dc2626, #7f1d1d)',
            borderRadius: '2px 2px 4px 4px',
            boxShadow: playerColor === 'blue'
              ? '0 0 10px rgba(59,130,246,0.9), 0 3px 6px rgba(0,0,0,0.8)'
              : '0 0 10px rgba(239,68,68,0.9), 0 3px 6px rgba(0,0,0,0.8)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '2px',
          }}>
            {/* HP bar strip */}
            {currentHP !== undefined && maxHP !== undefined && maxHP > 0 && (() => {
              const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
              const prevPct = previewHP !== undefined ? Math.max(0, Math.min(100, (previewHP / maxHP) * 100)) : pct;
              const hasPreview = previewHP !== undefined && previewHP !== currentHP;
              const fillPct = hasPreview && !isHealPreview ? prevPct : pct;
              const hpColor = fillPct > 75 ? '#22c55e' : fillPct > 50 ? '#eab308' : fillPct > 25 ? '#f97316' : '#ef4444';
              return (
                <div style={{ width: '90%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', marginTop: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${fillPct}%`, background: hpColor, borderRadius: '2px', transition: 'width 0.15s' }} />
                  {hasPreview && !isHealPreview && (
                    <div style={{ position: 'absolute', top: 0, left: `${prevPct}%`, width: `${Math.max(0, pct - prevPct)}%`, height: '100%', background: 'rgba(239,68,68,0.85)', animation: 'pulse 1s infinite' }} />
                  )}
                  {hasPreview && isHealPreview && (
                    <div style={{ position: 'absolute', top: 0, left: `${pct}%`, width: `${Math.max(0, prevPct - pct)}%`, height: '100%', background: 'rgba(74,222,128,0.85)', animation: 'pulse 1s infinite' }} />
                  )}
                </div>
              );
            })()}
            {/* Character name */}
            {iconName && (
              <span style={{
                fontSize: '6px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: playerColor === 'blue' ? 'rgba(210,230,255,0.97)' : 'rgba(255,210,210,0.97)',
                textShadow: playerColor === 'blue'
                  ? '0 0 5px rgba(100,180,255,0.95), 0 1px 2px rgba(0,0,0,0.9)'
                  : '0 0 5px rgba(255,120,120,0.95), 0 1px 2px rgba(0,0,0,0.9)',
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
          <div style={{
            width: '55%', height: '4px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            filter: 'blur(2px)',
            marginTop: '2px',
          }} />
        </div>
      )}
    </div>
  );
}
