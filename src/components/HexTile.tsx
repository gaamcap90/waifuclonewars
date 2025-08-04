// src/components/HexTile.tsx
import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";
import { Trees, Mountain, Waves, Sparkles, Crown, Shield } from "lucide-react";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  iconPortrait?: string;
  size?: number;           // size from parent (hex “radius”)
  playerColor?: string;
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
  size = 40,
  playerColor,
  isActiveIcon,
  isTargetable,
  isValidMovement,
  isRespawnTarget,
  isInAttackRange,
  isInAbilityRange,
}: HexTileProps) {
  // Map terrain types to your public /uploads filenames
  const terrainImageMap: Record<string, string> = {
    forest:       "/uploads/Forest.png",
    mountain:     "/uploads/Mountains.png",
    river:        "/uploads/River.png",
    plain:        "/uploads/Plains.png",
    mana_crystal: "/uploads/Mana_Crystal.png",
    beast_camp:   "/uploads/Beast_Camp.png",
    base_blue:    "/uploads/Blue_Base.png",
    base_red:     "/uploads/Red_Base.png",
    spawn_blue:   "/uploads/Spawn_Blue.png",
    spawn_red:    "/uploads/Spawn_Red.png",
  };

  // Figure out the exact key for bases & spawns
  let terrainKey = tile.terrain.type;
  if (terrainKey === "base") {
    terrainKey = (tile.coordinates.q === -6 && tile.coordinates.r === 5)
      ? "base_blue"
      : "base_red";
  }
  if (terrainKey === "spawn") {
    terrainKey = tile.coordinates.q < 0
      ? "spawn_blue"
      : "spawn_red";
  }

  // Final URL for the <img>
  const imgSrc = terrainImageMap[terrainKey] || terrainImageMap.plain;

  // Wrapper dimension must match GameBoard’s sizing
  const wrapperSize = size * 1.8;

  // Path for the hex outline (unchanged)
  const hexPath = `
    M ${size * 0.866} ${size * 0.5}
    L ${size * 0.866} ${size * 1.5}
    L 0 ${size * 2}
    L ${-size * 0.866} ${size * 1.5}
    L ${-size * 0.866} ${size * 0.5}
    L 0 0 Z
  `.replace(/\s+/g, " ");

  return (
    <div
      className="relative cursor-pointer transform hover:scale-105 transition-transform"
      onClick={onClick}
      onContextMenu={e => {
        e.preventDefault();
        onTerrainClick?.(e);
      }}
      style={{
        width: wrapperSize,
        height: wrapperSize,
      }}
    >
      {/* -- Terrain Image -- */}
      <img
        src={imgSrc}
        alt={terrainKey}
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />

      {/* -- Hex Outline + Highlight Rings -- */}
      <svg
        width={wrapperSize}
        height={wrapperSize}
        viewBox={`${-size * 0.9} 0 ${wrapperSize} ${wrapperSize}`}
        className="absolute inset-0"
      >
        <path
          d={hexPath}
          className={cn(
            "stroke-gray-300 stroke-1 fill-transparent transition-colors",
            tile.highlighted     && "ring-2 ring-primary",
            isTargetable         && "ring-2 ring-destructive bg-red-500/20",
            isValidMovement      && "ring-2 ring-green-400 bg-green-400/20",
            isInAttackRange      && "ring-2 ring-red-400 bg-red-400/20",
            isInAbilityRange     && "ring-2 ring-orange-400 bg-orange-400/20",
            isRespawnTarget      && "ring-2 ring-blue-400 bg-blue-400/20",
            isActiveIcon         && "ring-2 ring-active-turn"
          )}
        />
      </svg>

      {/* -- Character Portrait / Icon -- */}
      {icon && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={cn(
            "w-12 h-12 rounded-full border-2 overflow-hidden",
            playerColor === "blue" ? "border-blue-400" : "border-red-400",
            isActiveIcon && "shadow-lg shadow-active-turn/50 animate-pulse"
          )}>
            {iconPortrait ? (
              <img
                src={iconPortrait}
                alt={icon}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {icon}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

