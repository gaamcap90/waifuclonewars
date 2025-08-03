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
          return '/lovable-uploads/04c976e4-64a9-409a-b803-4510824e88c5.png';
        case 'mountain':
          return '/lovable-uploads/new-mountain-tile.png';
        case 'river':
          return '/lovable-uploads/05c34c82-9e2d-4cbf-ad0f-01232315e270.png';
        case 'plain':
          return '/lovable-uploads/4490f506-21ad-4e64-a28f-95b37d50757f.png';
        case 'mana_crystal':
          return '/lovable-uploads/c5003197-3858-422f-911a-92d0122902c7.png';
        case 'beast_camp':
          return '/lovable-uploads/ed85b6df-3fb1-4f6a-89ce-53010aae0c0f.png';
        case 'base':
          // Use different bases for different teams
          return tile.coordinates.q === -6 && tile.coordinates.r === 5 
            ? '/lovable-uploads/49d9e3e0-76f2-42c5-8126-79023cf5cea2.png' // Blue base
            : '/lovable-uploads/53e73cfa-d834-41d6-a6be-5c7246a07c40.png'; // Red base
        case 'spawn':
          // Use different spawn zones for different teams
          return tile.coordinates.q < 0 
            ? '/lovable-uploads/48b26504-94cd-4656-95ad-a47a067fa509.png' // Blue spawn
            : '/lovable-uploads/6751baaa-0c93-4c53-9aac-987fbdca6626.png'; // Red spawn
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
          className="w-full h-full object-cover absolute inset-0 opacity-90"
          style={{ 
            zIndex: -1,
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
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
            'stroke-1 transition-colors stroke-gray-400 fill-transparent',
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