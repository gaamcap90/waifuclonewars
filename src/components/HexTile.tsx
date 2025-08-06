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
    forest:       "/uploads/Forest_180.png",
    mountain:     "/uploads/Mountains_2_180.png",
    river:        "/uploads/River_180.png",
    plain:        "/uploads/Plains_180.png",
    mana_crystal: "/uploads/Mana_Crystal_180.png",
    beast_camp:   "/uploads/Beast_Camp_180.png",
    base_blue:    "/uploads/Blue_Base_180.png",
    base_red:     "/uploads/Red_Base_180.png",
    spawn_blue:   "/uploads/Spawn_Blue_180.png",
    spawn_red:    "/uploads/Spawn_Red_180.png",
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
      className="relative cursor-pointer hover:scale-105 transition-transform"
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
        <polygon
          points={pts}
          className="fill-transparent stroke-black stroke-[2px]"
        />
        
        {/* Outline & highlight rings */}
        <polygon
  points={pts}
  className={cn(
    "fill-transparent transition-colors",
    tile.highlighted      && "stroke-gray-300 stroke-[1px]",
    isTargetable          && "stroke-red-400 stroke-[2px] fill-red-500/20",
    isValidMovement       && "stroke-green-400 stroke-[2px] fill-green-400/20",
    isInAttackRange       && "stroke-red-400 stroke-[2px] fill-red-400/20",
    isInAbilityRange      && "stroke-orange-400 stroke-[2px] fill-orange-400/20",
    isRespawnTarget       && "stroke-blue-400 stroke-[2px] fill-blue-400/20",
    isActiveIcon          && "stroke-active-turn stroke-[2px]"
  )}
/>
      </svg>

      {/* Character portrait / icon overlay - full bleed */}
      {icon && (
        <div 
          className="absolute inset-0 z-10"
          style={{ clipPath: `url(#${clipId})` }}
        >
          {iconPortrait ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={iconPortrait} 
                alt={icon} 
                className="w-4/5 h-4/5 object-cover rounded-sm"
              />
              {/* Team affiliation ring */}
              <div className={cn(
                "absolute inset-0 ring-4 ring-opacity-80",
                playerColor === "blue" ? "ring-blue-400" : "ring-red-400"
              )} style={{ clipPath: `url(#${clipId})` }} />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-4/5 flex items-center justify-center bg-gray-600 text-white font-bold text-lg rounded-sm">
                {icon}
              </div>
              {/* Team affiliation ring for fallback */}
              <div className={cn(
                "absolute inset-0 ring-4 ring-opacity-80",
                playerColor === "blue" ? "ring-blue-400" : "ring-red-400"
              )} style={{ clipPath: `url(#${clipId})` }} />
            </div>
          )}
          
          {/* Player color border overlay */}
          <div className={cn(
            "absolute inset-0 border-2 rounded-none",
            playerColor === "blue" ? "border-blue-400" : "border-red-400",
            isActiveIcon && "shadow-lg shadow-active-turn/50 animate-pulse border-4"
          )} style={{ clipPath: `url(#${clipId})` }} />
        </div>
      )}
    </div>
  );
}
