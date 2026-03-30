import React, { useMemo, useState, useRef } from "react";
import HexTile from "./HexTile";
import HPBar from "./HPBar";
import BeastCampHPBar from "./BeastCampHPBar";
import { GameState, Coordinates } from "@/types/game";
import { useRangeCalculation } from "./RangeIndicator";
import { resolveBasicAttackDamage } from "@/combat/resolver";

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
}

const getCharacterPortrait = (name: string) => {
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null; // Combat Drone uses null → renders initial "C" with gear tint
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick }) => {
  // 1) Hex dimensions
  const hexSize = 50;
  const hexWidth = hexSize * 2;                // 100px
  const hexHeight = Math.sqrt(3) * hexSize;     // ~86.6px

  // 2) Pan & zoom + hover state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hoveredCoords, setHoveredCoords] = useState<Coordinates | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // 3) Container size & centering math
  const containerWidth = boardRef.current?.clientWidth ?? 800;
  const containerHeight = boardRef.current?.clientHeight ?? 600;
  const offsetX = (containerWidth - hexWidth) / 2;
  const offsetY = (containerHeight - hexHeight) / 2;

  // 4) Compute ranges for highlighting
  const extState = gameState as any;
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.playerId === gameState.activePlayerId && i.isAlive);

  // Use selectedIcon (from ExtState) if set, otherwise first alive icon for active player
  const selectedIconId: string | undefined =
    extState.selectedIcon ??
    gameState.players[gameState.activePlayerId]?.icons.find(i => i.isAlive)?.id;

  const { movementRange, attackRange, abilityRange } = useRangeCalculation(
    gameState,
    selectedIconId,
    !gameState.targetingMode && !!activeIcon && !activeIcon.cardUsedThisTurn,
    gameState.targetingMode?.abilityId === 'basic_attack',
    Boolean(gameState.targetingMode && gameState.targetingMode.abilityId !== 'basic_attack'),
    gameState.targetingMode?.range
  );

  // 5) Hover damage preview when a damage card is selected
  const cardTargetingMode = (gameState as any).cardTargetingMode as { card: any; executorId: string } | undefined;

  // 5a) Terrain tooltip (shown when nothing is being targeted)
  const hoveredTile = hoveredCoords
    ? gameState.board.find(t => t.coordinates.q === hoveredCoords.q && t.coordinates.r === hoveredCoords.r)
    : null;

  const showTerrainTooltip = Boolean(hoveredTile && !cardTargetingMode && !gameState.targetingMode);

  function terrainTooltipLines(tile: (typeof gameState.board)[0]): string[] {
    const lines: string[] = [];
    const t = tile.terrain.type;
    if (t === 'forest') lines.push('+50% Defense');
    if (t === 'mountain') lines.push('Artillery range bonus (+20%)');
    if (t === 'river') lines.push('Movement penalty (-1 MOV)');
    if (t === 'mana_crystal') lines.push('+1 or +2 Mana at end of turn');
    if (t === 'beast_camp') {
      const camps = (gameState as any).objectives?.beastCamps;
      if (camps) {
        const idx = gameState.board
          .filter(b => b.terrain.type === 'beast_camp')
          .findIndex(b => b.coordinates.q === tile.coordinates.q && b.coordinates.r === tile.coordinates.r);
        const hp = camps.hp?.[idx] ?? 0;
        const maxHp = camps.maxHp ?? 100;
        const defeated = camps.defeated?.[idx];
        lines.push(`HP: ${hp}/${maxHp}`);
        if (defeated) lines.push('Defeated — +20% Might & Power to team');
        else lines.push('Defeat for +20% Might & Power bonus');
      } else {
        lines.push('Defeat for team buff');
      }
    }
    if (t === 'base') lines.push('+20% all stats for home team');
    if (t === 'spawn') lines.push('Respawn zone');
    if (t === 'plain') lines.push('No special effects');
    return lines;
  }
  const hoverDamagePreview = useMemo(() => {
    if (!hoveredCoords || !cardTargetingMode) return null;
    const executor = gameState.players.flatMap(p => p.icons).find(i => i.id === cardTargetingMode.executorId);
    const target = gameState.players.flatMap(p => p.icons).find(i =>
      i.isAlive && i.position.q === hoveredCoords.q && i.position.r === hoveredCoords.r
    );
    if (!executor || !target || target.playerId === executor.playerId) return null;
    const card = cardTargetingMode.card;
    if (card.effect.damageType === 'atk') {
      const dmg = resolveBasicAttackDamage(gameState, executor, target);
      return { q: hoveredCoords.q, r: hoveredCoords.r, text: `-${dmg.toFixed(0)}` };
    }
    if (card.effect.damage) {
      return { q: hoveredCoords.q, r: hoveredCoords.r, text: `-${card.effect.damage}` };
    }
    if (card.effect.healing) {
      return { q: hoveredCoords.q, r: hoveredCoords.r, text: `+${card.effect.healing} HP` };
    }
    return null;
  }, [hoveredCoords, cardTargetingMode, gameState]);

  // 6) Memoized board rendering
  const renderBoard = useMemo(() => {
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3 / 2 * q),
      y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
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

      const playerColor = icon ? (icon.playerId === 0 ? 'blue' : 'red') : undefined;
      const isActiveIcon = icon?.id === selectedIconId;

      // ranges
      const inMove = movementRange.some(c => c.q === q && c.r === r);
      const inAttack = attackRange.some(c => c.q === q && c.r === r);
      const inAbility = abilityRange.some(c => c.q === q && c.r === r);

      const isTargetable = inAttack || inAbility;
      const isValidMovement = inMove;
      const isRespawnTarget = Boolean(gameState.respawnPlacement && (() => {
        const respawning = gameState.players
          .flatMap(p => p.icons)
          .find(i => i.id === gameState.respawnPlacement);
        if (!respawning) return false;
        const validZone = respawning.playerId === 0
          ? (q >= -6 && q <= -4 && r >= 3 && r <= 5)
          : (q >= 4 && q <= 6 && r >= -5 && r <= -3);
        const occupied = gameState.players
          .flatMap(p => p.icons)
          .some(i => i.position.q === q && i.position.r === r && i.isAlive);
        return validZone && !occupied;
      })());

      const preview = hoverDamagePreview?.q === q && hoverDamagePreview?.r === r ? hoverDamagePreview.text : null;

      return (
        <div
          key={`${q}-${r}`}
          className="absolute cursor-pointer"
          style={{
            left: x + offsetX,
            top: y + offsetY,
            width: hexWidth,
            height: hexHeight,
          }}
          onClick={() => onTileClick(tile.coordinates)}
          onMouseEnter={() => setHoveredCoords({ q, r })}
          onMouseLeave={() => setHoveredCoords(null)}
        >
          <HexTile
            tile={tile}
            onClick={() => onTileClick(tile.coordinates)}
            onTerrainClick={() => { }}
            icon={icon ? (icon.name === "Combat Drone" ? "⚙" : icon.name.charAt(0)) : undefined}
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

          {/* Damage / healing preview badge */}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <span className={[
                "text-sm font-bold px-2 py-0.5 rounded-full shadow-lg",
                preview.startsWith("+") ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white",
              ].join(" ")}>
                {preview}
              </span>
            </div>
          )}
        </div>
      );
    });
  },
    [
      gameState.board,
      gameState.players,
      selectedIconId,
      gameState.targetingMode,
      gameState.respawnPlacement,
      movementRange,
      attackRange,
      abilityRange,
      hoverDamagePreview,
      offsetX,
      offsetY
    ]);

  // 6) Pan & zoom handlers
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
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {renderBoard}
          {/* Terrain tooltip */}
          {showTerrainTooltip && hoveredTile && hoveredCoords && (() => {
            const lines = terrainTooltipLines(hoveredTile);
            if (lines.length === 0) return null;
            const hexToPixel = (q: number, r: number) => ({
              x: hexSize * (3 / 2 * q),
              y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
            });
            const { x, y } = hexToPixel(hoveredCoords.q, hoveredCoords.r);
            return (
              <div
                className="absolute z-40 pointer-events-none"
                style={{ left: x + offsetX + hexWidth / 2, top: y + offsetY - 8, transform: 'translate(-50%, -100%)' }}
              >
                <div className="bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2 shadow-xl min-w-[180px]">
                  <div className="text-[10px] font-bold text-gray-300 mb-1 uppercase tracking-wide">
                    {hoveredTile.terrain.type.replace('_', ' ')}
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} className="text-[11px] text-gray-400">{l.includes('—') ? l.split('—')[1].trim() : l}</div>
                  ))}
                </div>
              </div>
            );
          })()}
          <BeastCampHPBar
            gameState={gameState}
            hexSize={hexSize}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;

