import { useMemo } from "react";
import { GameState, Coordinates, HexTile as HexTileType } from "@/types/game";
import HexTile from "./HexTile";

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const GameBoard = ({ gameState, onTileClick }: GameBoardProps) => {
  const hexSize = 30;
  const boardWidth = 15;
  const boardHeight = 11;

  // Convert axial coordinates to pixel coordinates
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (3/2 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  };

  const renderBoard = useMemo(() => {
    return gameState.board.map((tile) => {
      const { x, y } = hexToPixel(tile.coordinates.q, tile.coordinates.r);
      const icon = gameState.players
        .flatMap(p => p.icons)
        .find(icon => 
          icon.position.q === tile.coordinates.q && 
          icon.position.r === tile.coordinates.r && 
          icon.isAlive
        );

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
            icon={icon ? icon.name.charAt(0) : undefined}
            size={hexSize}
          />
        </div>
      );
    });
  }, [gameState.board, gameState.players, hexSize]);

  return (
    <div 
      className="relative bg-gray-900 overflow-auto"
      style={{
        width: '100%',
        height: '600px',
        minWidth: boardWidth * hexSize * 3,
        minHeight: boardHeight * hexSize * 2,
      }}
    >
      {renderBoard}
    </div>
  );
};

export default GameBoard;