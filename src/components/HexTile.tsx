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
    forest:       "/uploads/Forest.png",
    mountain:     "/uploads/Mountains.png",
    river:        "/uploads/River.png",
    plain:        "/uploads/Plain.png",
    mana_crystal: "/uploads/Mana_Crystal.png",
    beast_camp:   "/uploads/Beast_Camp.png",
    base_blue:    "/uploads/Blue_Base.png",
    base_red:     "/uploads/Red_Base.png",
    spawn_blue:   "/uploads/Spawn_Blue.png",
    spawn_red:    "/uploads/Spawn_Red.png",
  };
  let key = tile.terrain.type;
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

        {/* Outline & highlight rings */}
        <polygon
          points={pts}
          className={cn(
            "stroke-gray-300 stroke-1 fill-transparent transition-colors",
            tile.highlighted      && "ring-2 ring-primary",
            isTargetable          && "ring-2 ring-destructive bg-red-500/20",
            isValidMovement       && "ring-2 ring-green-400 bg-green-400/20",
            isInAttackRange       && "ring-2 ring-red-400 bg-red-400/20",
            isInAbilityRange      && "ring-2 ring-orange-400 bg-orange-400/20",
            isRespawnTarget       && "ring-2 ring-blue-400 bg-blue-400/20",
            isActiveIcon          && "ring-2 ring-active-turn"
          )}
        />
      </svg>

      {/* Character portrait / icon overlay */}
      {icon && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={cn(
            "w-12 h-12 rounded-full border-2 overflow-hidden",
            playerColor === "blue" ? "border-blue-400" : "border-red-400",
            isActiveIcon && "shadow-lg shadow-active-turn/50 animate-pulse"
          )}>
            {iconPortrait
              ? <img src={iconPortrait} alt={icon} className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center text-white font-bold">
                  {icon}
                </span>
            }
          </div>
        </div>
      )}
    </div>
  );
}
