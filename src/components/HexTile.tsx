import { cn } from "@/lib/utils";
import { HexTile as HexTileType } from "@/types/game";
import { Trees, Mountain, Waves, Sparkles, Crown, Shield } from "lucide-react";

interface HexTileProps {
  tile: HexTileType;
  onClick: () => void;
  onTerrainClick?: (e: React.MouseEvent) => void;
  icon?: string;
  iconPortrait?: string;
  size?: number;
  playerColor?: string;
  isActiveIcon?: boolean;
  isTargetable?: boolean;
  isValidMovement?: boolean;
  isRespawnTarget?: boolean;
  isInAttackRange?: boolean;
  isInAbilityRange?: boolean;
}

const HexTile = ({ tile, onClick, onTerrainClick, icon, iconPortrait, size = 40, playerColor, isActiveIcon, isTargetable, isValidMovement, isRespawnTarget, isInAttackRange, isInAbilityRange }: HexTileProps) => {
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
    const getTerrainImage = () => {
      switch (tile.terrain.type) {
        case 'forest':
          return '/uploads/Forest.png';
        case 'mountain':
          return '/uploads/Mountains.png';
        case 'river':
          return '/uploads/River.png';
        case 'plain':
          return '/uploads/Plain.png';
        case 'mana_crystal':
          return '/uploads/Mana_Crystal.png';
        case 'beast_camp':
          return '/uploads/Beast_Camp.png';
        case 'base':
          // Use different bases for different teams
          return tile.coordinates.q === -6 && tile.coordinates.r === 5 
            ? '/uploads/Blue_Base.png'; // Blue base
            : '/uploads/Red_Base.png'; // Red base
        case 'spawn':
          // Use different spawn zones for different teams
          return tile.coordinates.q < 0 
            ? '/uploads/Spawn_Blue.png'; // Blue spawn
            : '/uploads/Spawn_Red.png'; // Red spawn
        default:
          return null;
      }
    };

    const terrainImage = getTerrainImage();
    if (terrainImage) {
      return (
        <img 
          src={terrainImage} 
          alt={tile.terrain.type}
          className="absolute inset-0"
          style={{ 
            zIndex: -1,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: 'scale(1.1)', // Slight scale to ensure full coverage
          }}
        />
      );
    }

    // Fallback to icons if images don't load
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
      onClick={onClick}
      onContextMenu={handleTerrainClick}
      style={{
        width: size * 1.8,
        height: size * 1.8,
      }}
    >
      <svg
        width={size * 1.8}
        height={size * 1.8}
        viewBox={`${-size * 0.9} 0 ${size * 1.8} ${size * 1.8}`}
        className="absolute"
      >
        <path
          d={hexPath}
          className={cn(
            'stroke-1 transition-colors stroke-gray-300 fill-transparent',
            tile.highlighted && 'ring-2 ring-primary',
            tile.selectable && 'ring-2 ring-accent',
            isTargetable && 'ring-2 ring-destructive bg-red-500/20',
            isValidMovement && 'ring-2 ring-green-400 bg-green-400/20',
            isInAttackRange && 'ring-2 ring-red-400 bg-red-400/20',
            isInAbilityRange && 'ring-2 ring-orange-400 bg-orange-400/20',
            isRespawnTarget && 'ring-2 ring-blue-400 bg-blue-400/20',
            isActiveIcon && 'ring-2 ring-active-turn'
          )}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {getTerrainIcon()}
        {icon && (
          <div className="absolute flex flex-col items-center z-10">
            <div className={cn(
              "w-20 h-20 rounded-full border-4 font-orbitron overflow-hidden",
              playerColor === 'blue' ? 'border-blue-400' : 'border-red-400',
              isActiveIcon && 'border-active-turn shadow-lg shadow-active-turn/50 animate-pulse'
            )}>
              {iconPortrait ? (
                <img 
                  src={iconPortrait} 
                  alt={icon}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={cn(
                  "w-full h-full flex items-center justify-center text-sm font-bold",
                  playerColor === 'blue' ? 'bg-player1/90 text-white' : 'bg-player2/90 text-white'
                )}>
                  {icon}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HexTile;
