import { useMemo, useState } from "react";
import { GameState, Coordinates, HexTile as HexTileType } from "@/types/game";
import HexTile from "./HexTile";
import TerrainTooltip from "./TerrainTooltip";

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const GameBoard = ({ gameState, onTileClick }: GameBoardProps) => {
  const hexSize = 30;
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

      const handleRightClick = (e: React.MouseEvent) => {
        setTooltipState({
          visible: true,
          terrain: tile.terrain,
          position: { x: e.clientX, y: e.clientY }
        });
        setTimeout(() => {
          setTooltipState(prev => ({ ...prev, visible: false }));
        }, 3000);
      };

      return (
        <div
          key={`${tile.coordinates.q}-${tile.coordinates.r}`}
          className="absolute"
          style={{
            left: x + (boardWidth * hexSize),
            top: y + (boardHeight * hexSize * 0.5),
          }}
        >
          <HexTile
            tile={tile}
            onClick={() => onTileClick(tile.coordinates)}
            onRightClick={handleRightClick}
            icon={icon ? icon.name.charAt(0) : undefined}
            size={hexSize}
            playerColor={playerColor}
            isActiveIcon={isActiveIcon}
            isTargetable={isTargetable}
          />
        </div>
      );
    });
  }, [gameState.board, gameState.players, gameState.activeIconId, gameState.targetingMode, hexSize]);

  return (
    <div className="relative">
      <div 
        className="relative bg-background border border-border rounded-lg overflow-auto flex items-center justify-center"
        style={{
          width: '100%',
          height: '600px',
          minWidth: boardWidth * hexSize * 3,
          minHeight: boardHeight * hexSize * 2,
        }}
        onClick={() => setTooltipState(prev => ({ ...prev, visible: false }))}
      >
        <div className="relative">
          {renderBoard}
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