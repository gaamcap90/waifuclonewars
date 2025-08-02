import { useMemo, useState } from "react";
import { GameState, Coordinates, HexTile as HexTileType } from "@/types/game";
import HexTile from "./HexTile";
import TerrainTooltip from "./TerrainTooltip";

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const GameBoard = ({ gameState, onTileClick }: GameBoardProps) => {
  const hexSize = 40; // Increased size
  const boardWidth = 15;
  const boardHeight = 11;
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    terrain: HexTileType['terrain'] | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    terrain: null,
    position: { x: 0, y: 0 }
  });

  const calculateDistance = (from: Coordinates, to: Coordinates): number => {
    return Math.max(
      Math.abs(to.q - from.q),
      Math.abs(to.r - from.r),
      Math.abs((to.q + to.r) - (from.q + from.r))
    );
  };

  // Convert axial coordinates to pixel coordinates
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (3/2 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  };

  const renderBoard = useMemo(() => {
    const activeIcon = gameState.players
      .flatMap(p => p.icons)
      .find(i => i.id === gameState.activeIconId);

    return gameState.board.map((tile) => {
      const { x, y } = hexToPixel(tile.coordinates.q, tile.coordinates.r);
      const icon = gameState.players
        .flatMap(p => p.icons)
        .find(icon => 
          icon.position.q === tile.coordinates.q && 
          icon.position.r === tile.coordinates.r && 
          icon.isAlive
        );

      const playerColor = icon ? (icon.playerId === 0 ? 'blue' : 'red') : undefined;
      const isActiveIcon = icon?.id === gameState.activeIconId;
      
      // Check if tile is targetable in targeting mode
      const isTargetable = gameState.targetingMode && activeIcon ? 
        calculateDistance(activeIcon.position, tile.coordinates) <= gameState.targetingMode.range : false;

      const handleTerrainHover = (e: React.MouseEvent) => {
        // Only show tooltip if no character on tile and no targeting mode
        if (!icon && !gameState.targetingMode) {
          setTooltipState({
            visible: true,
            terrain: tile.terrain,
            position: { x: e.clientX, y: e.clientY }
          });
        }
      };

      const handleTerrainLeave = () => {
        setTooltipState({
          visible: false,
          terrain: null,
          position: { x: 0, y: 0 }
        });
      };

      return (
        <div
          key={`${tile.coordinates.q}-${tile.coordinates.r}`}
          className="absolute"
          style={{
            left: x + (boardWidth * hexSize * 0.7),
            top: y + (boardHeight * hexSize * 0.7),
          }}
        >
          <div
            onMouseEnter={handleTerrainHover}
            onMouseLeave={handleTerrainLeave}
          >
            <HexTile
              tile={tile}
              onClick={() => onTileClick(tile.coordinates)}
              icon={icon ? icon.name.charAt(0) : undefined}
              size={hexSize}
              playerColor={playerColor}
              isActiveIcon={isActiveIcon}
              isTargetable={isTargetable}
            />
          </div>
        </div>
      );
    });
  }, [gameState.board, gameState.players, gameState.activeIconId, gameState.targetingMode, hexSize]);

  return (
    <div className="relative flex justify-center">
      <div 
        className="relative bg-gradient-to-b from-space-dark via-space-medium to-space-dark border-2 border-alien-green/30 rounded-lg overflow-hidden"
        style={{
          width: '800px',
          height: '600px',
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)
          `,
        }}
        onClick={() => setTooltipState(prev => ({ ...prev, visible: false }))}
      >
        {/* Alien audience background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-4 w-8 h-8 bg-alien-green/20 rounded-full animate-pulse"></div>
          <div className="absolute top-8 right-8 w-6 h-6 bg-purple-400/20 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-4 left-8 w-10 h-10 bg-blue-400/20 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-8 right-4 w-7 h-7 bg-yellow-400/20 rounded-full animate-pulse delay-700"></div>
        </div>
        
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            {renderBoard}
          </div>
        </div>
      </div>
      
      <TerrainTooltip
        visible={tooltipState.visible}
        terrain={tooltipState.terrain!}
        position={tooltipState.position}
      />
    </div>
  );
};

export default GameBoard;