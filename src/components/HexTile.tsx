import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";
import { Trees, Mountain, Waves, Sparkles, Crown, Shield } from "lucide-react";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  size?: number;
  playerColor?: string;
  isActiveIcon?: boolean;
  isTargetable?: boolean;
}

const HexTile = ({ tile, onClick, onTerrainClick, icon, size = 40, playerColor, isActiveIcon, isTargetable }: HexTileProps) => {
  const getTerrainColor = () => {
    switch (tile.terrain.type) {
      case 'forest':
        return 'fill-terrain-forest border-terrain-forest';
      case 'mountain':
        return 'fill-terrain-mountain border-terrain-mountain';
      case 'river':
        return 'fill-terrain-river border-terrain-river';
      case 'plain':
        return 'fill-terrain-plain border-terrain-plain';
      case 'mana_crystal':
        return 'fill-terrain-crystal border-terrain-crystal animate-pulse';
      case 'beast_camp':
        return 'fill-terrain-beast border-terrain-beast';
      case 'base':
        return 'fill-terrain-base border-terrain-base';
      case 'spawn':
        return 'fill-terrain-spawn border-terrain-spawn';
      default:
        return 'fill-terrain-plain border-terrain-plain';
    }
  };

  const getIconColor = () => {
    if (playerColor === 'blue') return 'text-player1-foreground bg-player1';
    if (playerColor === 'red') return 'text-player2-foreground bg-player2';
    return 'text-foreground bg-muted';
  };

  const getTerrainIcon = () => {
    switch (tile.terrain.type) {
      case 'forest':
        return <Trees className="w-4 h-4 text-green-200" />;
      case 'mountain':
        return <Mountain className="w-4 h-4 text-orange-200" />;
      case 'river':
        return <Waves className="w-4 h-4 text-blue-200" />;
      case 'mana_crystal':
        return <Sparkles className="w-4 h-4 text-purple-200" />;
      case 'beast_camp':
        return <Crown className="w-4 h-4 text-red-200" />;
      case 'base':
        return <Shield className="w-4 h-4 text-gray-200" />;
      default:
        return null;
    }
  };

  const hexPath = `M ${size * 0.866} ${size * 0.5} L ${size * 0.866} ${size * 1.5} L 0 ${size * 2} L ${-size * 0.866} ${size * 1.5} L ${-size * 0.866} ${size * 0.5} L 0 0 Z`;

  const handleTerrainClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onTerrainClick?.(e);
  };

  return (
    <div
      className="relative cursor-pointer transform hover:scale-105 transition-transform"
      onClick={icon ? onClick : onTerrainClick}
      onContextMenu={handleTerrainClick}
      style={{
        width: size * 2,
        height: size * 2,
      }}
    >
      <svg
        width={size * 2}
        height={size * 2}
        viewBox={`${-size} 0 ${size * 2} ${size * 2}`}
        className="absolute"
      >
        <path
          d={hexPath}
          className={cn(
            getTerrainColor(),
            'stroke-2 transition-colors',
            tile.highlighted && 'ring-2 ring-primary',
            tile.selectable && 'ring-2 ring-accent',
            isTargetable && 'ring-2 ring-destructive',
            isActiveIcon && 'ring-2 ring-active-turn'
          )}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {icon ? (
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2",
            getIconColor(),
            isActiveIcon && 'border-active-turn animate-pulse',
            !isActiveIcon && 'border-transparent'
          )}>
            {icon}
          </div>
        ) : (
          getTerrainIcon()
        )}
      </div>
    </div>
  );
};

export default HexTile;