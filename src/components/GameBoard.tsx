// src/components/GameBoard.tsx
import { useMemo, useState, useRef } from "react";
import { GameState, Coordinates } from "@/types/game";
import HexTile from "./HexTile";
import HPBar from "./HPBar";
import BeastCampHPBar from "./BeastCampHPBar";
import { useRangeCalculation } from "./RangeIndicator";

const getCharacterPortrait = (name: string) => {
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis"))   return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci"))  return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null;
};

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const GameBoard = ({ gameState, onTileClick }: GameBoardProps) => {
  // 1) Hex dimensions & pan/zoom state
  const hexSize   = 50;
  const hexWidth  = hexSize * 2;                // 100px
  const hexHeight = Math.sqrt(3) * hexSize;     // ~86.6px

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);

  // 2) Compute ranges
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  const { movementRange, attackRange, abilityRange } = useRangeCalculation(
    gameState,
    gameState.activeIconId,
    !gameState.targetingMode && activeIcon && !activeIcon.actionTaken,
    gameState.targetingMode?.abilityId === 'basic_attack',
    Boolean(gameState.targetingMode && gameState.targetingMode.abilityId !== 'basic_attack'),
    gameState.targetingMode?.range
  );

  // 3) Build the board
  const renderBoard = useMemo(() => {
    // container dims for centering
    const containerWidth  = boardRef.current?.clientWidth  || 800;
    const containerHeight = boardRef.current?.clientHeight || 600;
    const offsetX = (containerWidth  - hexWidth)  / 2;
    const offsetY = (containerHeight - hexHeight) / 2;

    // axial → pixel
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3/2 * q),
      y: hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r),
    });

    return gameState.board.map(tile => {
      const { q, r } = tile.coordinates;
      const { x, y } = hexToPixel(q, r);

      // find icon on this tile
      const icon = gameState.players
        .flatMap(p => p.icons)
        .find(ic =>
          ic.position.q === q &&
          ic.position.r === r &&
          ic.isAlive
        );

      const playerColor  = icon ? (icon.playerId === 0 ? 'blue' : 'red') : undefined;
      const isActiveIcon = icon?.id === gameState.activeIconId;

      // range checks
      const inMove    = movementRange.some(c => c.q === q && c.r === r);
      const inAttack  = attackRange.some(c => c.q === q && c.r === r);
      const inAbility = abilityRange.some(c => c.q === q && c.r === r);

      const isTargetable    = inAttack || inAbility;
      const isValidMovement = inMove;
      const isRespawnTarget = Boolean(gameState.respawnPlacement && (() => {
        const respawning = gameState.players
          .flatMap(p => p.icons)
          .find(i => i.id === gameState.respawnPlacement);
        if (!respawning) return false;
        const validZone = respawning.playerId === 0
          ? (q >= -6 && q <= -4 && r >= 3 && r <= 5)
          : (q >= 4  && q <= 6 && r >= -5 && r <= -3);
        const occupied = gameState.players
          .flatMap(p => p.icons)
          .some(i => i.position.q === q && i.position.r === r && i.isAlive);
        return validZone && !occupied;
      })());

      return (
        <div
          key={`${q}-${r}`}
          className="absolute cursor-pointer"
          style={{
            left:   x + offsetX,
            top:    y + offsetY,
            width:  hexWidth,
            height: hexHeight,
          }}
          onClick={() => onTileClick(tile.coordinates)}
        >
          <HexTile
            tile={tile}
            onClick={() => onTileClick(tile.coordinates)}
            onTerrainClick={() => {}}
            icon={icon ? icon.name.charAt(0) : undefined}
            iconPortrait={icon ? getCharacterPortrait(icon.name) : undefined}
            size={hexSize}
            playerColor={playerColor}
            isActiveIcon={isActiveIcon}
            isTargetable={isTargetable}
            isValidMovement={isValidMovement}
            isRespawnTarget={isRespawnTarget}
            isInAttackRange={inAttack}
            isInAbilityRange={inAbility}
          />

          {icon && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10">
              <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
            </div>
          )}
        </div>
      );
    });
  },
  [
    gameState.board,
    gameState.players,
    gameState.activeIconId,
    gameState.targetingMode,
    gameState.respawnPlacement,
    movementRange, attackRange, abilityRange,
  ]);

  // 4) Pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.5), 2));
  };

  return (
    <div
      ref={boardRef}
      className="absolute inset-0 bg-gradient-to-b from-space-dark via-space-medium to-space-dark cursor-grab"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={e => {
        if (e.target === e.currentTarget) {
          window.dispatchEvent(new CustomEvent('closeCharacterPopup'));
        }
      }}
    >
      {/* Centered, zoomable board */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {renderBoard}
          <BeastCampHPBar gameState={gameState} />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
