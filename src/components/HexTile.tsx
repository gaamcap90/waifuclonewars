// src/components/HexTile.tsx
import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  iconPortrait?: string;
  size?: number;  // hex “radius”
  playerColor?: "blue" | "red";
  isActiveIcon?: boolean;
  isTargetable?: boolean;
  isValidMovement?: boolean;
  isRespawnTarget?: boolean;
  isInAttackRange?: boolean;
  isInAbilityRange?: boolean;
}

export default function HexTile({
  tile,
  onClick,
  onTerrainClick,
  icon,
  iconPortrait,
  size = 50,
  playerColor,
  isActiveIcon,
  isTargetable,
  isValidMovement,
  isRespawnTarget,
  isInAttackRange,
  isInAbilityRange,
}: HexTileProps) {
  // 1) Terrain → public URL
  const terrainMap: Record<string,string> = {
    forest:       "/art/tiles/Forest_180.png",
    mountain:     "/art/tiles/Mountains_2_180.png",
    river:        "/art/tiles/River_180.png",
    plain:        "/art/tiles/Plains_180.png",
    mana_crystal: "/art/tiles/Mana_Crystal_180.png",
    beast_camp:   "/art/tiles/Beast_Camp_180.png",
    base_blue:    "/art/tiles/Blue_Base_180.png",
    base_red:     "/art/tiles/Red_Base_180.png",
    spawn_blue:   "/art/tiles/Spawn_Blue_180.png",
    spawn_red:    "/art/tiles/Spawn_Red_180.png",
  };
  let key: string = tile.terrain.type;
  if (key === "base")  key = tile.coordinates.q < 0 ? "base_blue"  : "base_red";
  if (key === "spawn") key = tile.coordinates.q < 0 ? "spawn_blue" : "spawn_red";
  const imgSrc = terrainMap[key] || terrainMap.plain;

  // 2) Compute bounding‐box from radius
  const hexWidth  = size * 2;                         // e.g. 100px
  const hexHeight = Math.sqrt(3) * size;              // e.g. ~86.6px

  // 3) Precompute the six points of a pointy‐top hex in pixel coords
  //    Starting at top center and going clockwise:
  const pts = [
    `${hexWidth  / 2},0`,
    `${hexWidth},${hexHeight / 4}`,
    `${hexWidth},${(hexHeight * 3) / 4}`,
    `${hexWidth  / 2},${hexHeight}`,
    `0,${(hexHeight * 3) / 4}`,
    `0,${hexHeight / 4}`,
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

      {/* Character portrait — fills hex completely */}
      {icon && (
        <div className="absolute inset-0 z-10" style={{ clipPath: `url(#${clipId})` }}>
          {iconPortrait ? (
            <>
              <img
                src={iconPortrait}
                alt={icon}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ imageRendering: "auto" }}
              />
              {/* Subtle dark vignette so portrait edges read cleanly */}
              <div className="absolute inset-0" style={{
                background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)",
              }} />
              {/* Team colour gradient strip at bottom for quick ID */}
              <div className="absolute bottom-0 left-0 right-0 h-[28%]" style={{
                background: playerColor === "blue"
                  ? "linear-gradient(to top, rgba(37,99,235,0.80), transparent)"
                  : "linear-gradient(to top, rgba(185,28,28,0.80), transparent)",
              }} />
              {/* Active-turn pulse glow */}
              {isActiveIcon && (
                <div className="absolute inset-0 animate-pulse" style={{
                  background: "rgba(250,210,0,0.18)",
                }} />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: playerColor === "blue" ? "rgba(37,99,235,0.7)" : "rgba(185,28,28,0.7)" }}
            >
              <span className="text-white font-bold text-lg drop-shadow">{icon}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
