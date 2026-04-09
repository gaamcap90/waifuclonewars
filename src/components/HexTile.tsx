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
    river:        "/art/tiles/River_180.png",
    plain:        "/art/tiles/Plains_180.png",
    mana_crystal: "/art/tiles/Mana_Crystal_180.png",
    base_blue:    "/art/tiles/Blue_Base_180.png",
    base_red:     "/art/tiles/Red_Base_180.png",
    spawn_blue:   "/art/tiles/Spawn_Blue_180.png",
    spawn_red:    "/art/tiles/Spawn_Red_180.png",
  };
  let key: string = tile.terrain.type;
  if (key === "base")  key = tile.coordinates.q < 0 ? "base_blue"  : "base_red";
  if (key === "spawn") key = tile.coordinates.q < 0 ? "spawn_blue" : "spawn_red";
  const imgSrc = terrainMap[key] || terrainMap.plain;

  // 2.5D elevation height per terrain
  const elevMap: Record<string, number> = {
    mountain: 4, forest: 3, base_blue: 3, base_red: 3,
    mana_crystal: 3, plain: 2,
    spawn_blue: 2, spawn_red: 2, river: 0,
  };
  const elev = elevMap[key] ?? 4;
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

  return (
    <div
      className="relative cursor-pointer"
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onTerrainClick?.(e); }}
      style={{ width: hexWidth, height: hexHeight }}
    >
      <svg
        className="absolute inset-0 select-none pointer-events-none"
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
          x="0"
          y="0"
          width={hexWidth}
          height={hexHeight}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          style={{ imageRendering: 'high-quality' } as React.CSSProperties}
        />

        {/* 2.5D front face — wall below hex face */}
        {elev > 0 && (
          <>
            {/* Base wall (terrain-tinted) — flat bottom edge drops straight down */}
            <polygon
              points={[
                `${hexWidth / 4},${hexHeight}`,
                `${hexWidth * 3 / 4},${hexHeight}`,
                `${hexWidth * 3 / 4},${hexHeight + elev}`,
                `${hexWidth / 4},${hexHeight + elev}`,
              ].join(" ")}
              fill={elevColor}
            />
            {/* Top-edge catchlight */}
            <polyline
              points={`${hexWidth / 4},${hexHeight} ${hexWidth * 3 / 4},${hexHeight}`}
              stroke="rgba(255,255,255,0.20)"
              strokeWidth={0.75}
              fill="none"
            />
          </>
        )}

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

        {/* Team-coloured ring — thick, glowing, rendered on top of portrait */}
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

      {/* ── Character portrait — hex-clipped, fills tile ── */}
      {icon && (
        <div className="absolute inset-0 z-10" style={{ clipPath: `url(#${clipId})` }}>
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
      )}

      {/* ── Pedestal base — shown below hex for all characters ── */}
      {icon && (
        <div style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          transform: 'translateX(-50%)',
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
