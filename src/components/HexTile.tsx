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
          return '/lovable-uploads/493c4d6b-8b5d-4487-a831-66eddfdec6f3.png';
        case 'mountain':
          return '/lovable-uploads/e9086300-33ac-4134-b7fb-6cfb072109b0.png';
        case 'river':
          return '/lovable-uploads/1fa33b45-24b9-4103-8fd2-f124c71352b1.png';
        case 'plain':
          return '/lovable-uploads/4490f506-21ad-4e64-a28f-95b37d50757f.png';
        case 'mana_crystal':
          return '/lovable-uploads/a8428c44-c61f-456c-8137-8c4331725735.png';
        case 'beast_camp':
          return '/lovable-uploads/e310141e-0067-46c5-a9e5-62952395e90d.png';
        case 'base':
          // Use different bases for different teams
          return tile.coordinates.q === -6 && tile.coordinates.r === 5 
            ? '/lovable-uploads/11c0b5c8-e6e9-48ce-885a-677941a39b34.png' // Blue base
            : '/lovable-uploads/e1847c21-e38f-4c86-9b11-552a73df6e42.png'; // Red base
        case 'spawn':
          // Use different spawn zones for different teams
          return tile.coordinates.q < 0 
            ? '/lovable-uploads/109b82ae-12f8-45f5-8f44-bdc6418cef73.png' // Blue spawn
            : '/lovable-uploads/09350478-8e38-48b3-91ed-a7e86107feb5.png'; // Red spawn
        default:
          return null;
      }
    };

    const terrainImage = getTerrainImage();
    if (terrainImage) {
      return (
        <div className="relative w-full h-full">
          <img 
            src={terrainImage} 
            alt={tile.terrain.type}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ 
              zIndex: -1,
            }}
          />
          {/* Beast Camp HP Bar - anchored above tile */}
          {tile.terrain.type === 'beast_camp' && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-gray-700 rounded z-10">
              <div
                className="h-full rounded bg-green-400"
                style={{ width: '100%' }} // This will be updated by game state
              />
            </div>
          )}
        </div>
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