import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";
import { Trees, Mountain, Waves, Sparkles, Crown, Shield } from "lucide-react";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  icon?: string;
  size?: number;
}

const HexTile = ({ tile, onClick, icon, size = 40 }: HexTileProps) => {
  const getTerrainColor = () => {
    switch (tile.terrain.type) {
      case 'forest':
        return 'fill-green-500 border-green-600';
      case 'mountain':
        return 'fill-amber-600 border-amber-700';
      case 'river':
        return 'fill-cyan-400 border-cyan-500';
      case 'plain':
        return 'fill-yellow-400 border-yellow-500';
      case 'mana_crystal':
        return 'fill-purple-500 border-purple-600 animate-pulse';
      case 'beast_camp':
        return 'fill-red-500 border-red-600';
      case 'base':
        return 'fill-slate-600 border-slate-700';
      case 'spawn':
        return 'fill-slate-400 border-slate-500';
      default:
        return 'fill-gray-600 border-gray-700';
    }
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

  return (
    <div
      className="relative cursor-pointer transform hover:scale-105 transition-transform"
      onClick={onClick}
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
            tile.selectable && 'ring-2 ring-accent'
          )}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {icon ? (
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
            {icon}
          </div>
        ) : (
          getTerrainIcon()
        )}
      </div>
      
      {tile.occupiedBy && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
      )}
    </div>
  );
};

export default HexTile;