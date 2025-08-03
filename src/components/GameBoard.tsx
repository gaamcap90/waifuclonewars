import { useMemo, useState, useRef } from "react";
import { GameState, Coordinates, HexTile as HexTileType } from "@/types/game";
import HexTile from "./HexTile";
import HPBar from "./HPBar";
import { useRangeCalculation } from "./RangeIndicator";

const getCharacterPortrait = (name: string) => {
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null;
};

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const GameBoard = ({ gameState, onTileClick }: GameBoardProps) => {
  const hexSize = 50; // Improved size for better spacing and art display
  const boardWidth = 15;
  const boardHeight = 11;
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);

  const calculateDistance = (from: Coordinates, to: Coordinates): number => {
    return Math.max(
      Math.abs(to.q - from.q),
      Math.abs(to.r - from.r),
      Math.abs((to.q + to.r) - (from.q + from.r))
    );
  };

  // Convert axial coordinates to pixel coordinates with better spacing
  const hexToPixel = (q: number, r: number) => {
    const x = hexSize * (1.8 * q); // Improved spacing to prevent hex overlap
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  };

  const renderBoard = useMemo(() => {
    const activeIcon = gameState.players
      .flatMap(p => p.icons)
      .find(i => i.id === gameState.activeIconId);

    // Calculate range indicators
    const { movementRange, attackRange, abilityRange } = useRangeCalculation(
      gameState,
      gameState.activeIconId,
      !gameState.targetingMode && activeIcon && !activeIcon.actionTaken, // Show movement range when not targeting and can move
      gameState.targetingMode?.abilityId === 'basic_attack', // Show attack range when in basic attack mode
      gameState.targetingMode && gameState.targetingMode.abilityId !== 'basic_attack', // Show ability range when using ability
      gameState.targetingMode?.range
    );

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
      
      // Check range indicators
      const isInMovementRange = movementRange.some(coord => 
        coord.q === tile.coordinates.q && coord.r === tile.coordinates.r
      );
      const isInAttackRange = attackRange.some(coord => 
        coord.q === tile.coordinates.q && coord.r === tile.coordinates.r
      );
      const isInAbilityRange = abilityRange.some(coord => 
        coord.q === tile.coordinates.q && coord.r === tile.coordinates.r
      );
      
      // Check if tile is targetable in targeting mode
      const isTargetable = isInAttackRange || isInAbilityRange;

      // Check if tile is valid for movement (only when active icon is selected and no targeting)
      const isValidMovement = isInMovementRange;

      // Check if tile is valid for respawn placement
      const isRespawnTarget = gameState.respawnPlacement ? 
        (() => {
          const respawningIcon = gameState.players.flatMap(p => p.icons).find(i => i.id === gameState.respawnPlacement);
          if (!respawningIcon) return false;
          
          const isValidSpawn = respawningIcon.playerId === 0 
            ? (tile.coordinates.q >= -6 && tile.coordinates.q <= -4 && tile.coordinates.r >= 3 && tile.coordinates.r <= 5)
            : (tile.coordinates.q >= 4 && tile.coordinates.q <= 6 && tile.coordinates.r >= -5 && tile.coordinates.r <= -3);
            
          const occupied = gameState.players
            .flatMap(p => p.icons)
            .some(icon => icon.position.q === tile.coordinates.q && icon.position.r === tile.coordinates.r && icon.isAlive);
            
          return isValidSpawn && !occupied;
        })() : false;

      return (
        <div
          key={`${tile.coordinates.q}-${tile.coordinates.r}`}
          className="absolute"
          style={{
            left: x + (boardWidth * hexSize * 0.7),
            top: y + (boardHeight * hexSize * 0.7),
          }}
        >
          <div>
            <HexTile
              tile={tile}
              onClick={() => {
                console.log('HexTile clicked:', tile.coordinates, 'occupied by:', icon?.name);
                onTileClick(tile.coordinates);
              }}
              icon={icon ? icon.name.charAt(0) : undefined}
              iconPortrait={icon ? getCharacterPortrait(icon.name) : undefined}
              size={hexSize}
              playerColor={playerColor}
              isActiveIcon={isActiveIcon}
              isTargetable={isTargetable}
              isValidMovement={isValidMovement}
              isRespawnTarget={isRespawnTarget}
              isInAttackRange={isInAttackRange}
              isInAbilityRange={isInAbilityRange}
            />
            {/* HP Bar under character */}
            {icon && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10">
                <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [gameState.board, gameState.players, gameState.activeIconId, gameState.targetingMode, gameState.respawnPlacement, hexSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 2));
  };

  return (
    <div 
      ref={boardRef}
      className="absolute inset-0 bg-gradient-to-b from-space-dark via-space-medium to-space-dark cursor-grab"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)
        `,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={(e) => {
        // Close any open character popups when clicking on empty space
        if (e.target === e.currentTarget) {
          window.dispatchEvent(new CustomEvent('closeCharacterPopup'));
        }
      }}
    >
      {/* Alien audience background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-4 w-8 h-8 bg-alien-green/20 rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-8 w-6 h-6 bg-purple-400/20 rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-4 left-8 w-10 h-10 bg-blue-400/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-8 right-4 w-7 h-7 bg-yellow-400/20 rounded-full animate-pulse delay-700"></div>
      </div>
      
      <div className="relative w-full h-full flex items-center justify-center">
        <div 
          className="relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
          }}
        >
          {renderBoard}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;