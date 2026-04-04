import React, { useMemo, useState, useRef } from "react";
import HexTile from "./HexTile";
import HPBar from "./HPBar";
import BeastCampHPBar from "./BeastCampHPBar";
import AIIntentBadge from "./AIIntentBadge";
import { GameState, Coordinates, AIIntent } from "@/types/game";
import { useRangeCalculation } from "./RangeIndicator";
import { resolveBasicAttackDamage, resolveAbilityDamage } from "@/combat/resolver";
import { calcEffectiveStats } from "@/combat/buffs";

/** Snap any offset to the nearest axial hex-line and return the line hexes up to `range`. */
function snapToLineHexes(from: Coordinates, to: Coordinates, range: number): Coordinates[] {
  const dq = to.q - from.q, dr = to.r - from.r;
  if (dq === 0 && dr === 0) return [];
  const dirs: Coordinates[] = [
    { q: 1, r: 0 }, { q: -1, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: -1, r: 1 },
  ];
  const best = dirs.reduce((b, d) => (dq * d.q + dr * d.r) > (dq * b.q + dr * b.r) ? d : b);
  const hexes: Coordinates[] = [];
  for (let i = 1; i <= range; i++) hexes.push({ q: from.q + i * best.q, r: from.r + i * best.r });
  return hexes;
}

interface GameBoardProps {
  gameState: GameState;
  onTileClick: (coordinates: Coordinates) => void;
  onTileHover?: (tile: GameState['board'][number] | null) => void;
}

const getCharacterPortrait = (name: string) => {
  if (name.includes("Napoleon")) return "/art/napoleon_portrait.png";
  if (name.includes("Genghis")) return "/art/genghis_portrait.png";
  if (name.includes("Da Vinci")) return "/art/davinci_portrait.png";
  if (name.includes("Leonidas")) return "/art/leonidas_portrait.png";
  return null; // Combat Drone uses null → renders initial "C" with gear tint
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, onTileHover }) => {
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
  const [hoveredIntentRange, setHoveredIntentRange] = useState<{ iconId: string; range: number } | null>(null);
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

  const TERRAIN_META: Record<string, { emoji: string; label: string; color: string }> = {
    forest:       { emoji: "🌲", label: "Forest",       color: "border-green-600/60 bg-green-950/90" },
    mountain:     { emoji: "⛰️", label: "Mountain",     color: "border-gray-500/60 bg-gray-900/95" },
    river:        { emoji: "🌊", label: "River",        color: "border-blue-500/60 bg-blue-950/90" },
    plain:        { emoji: "🌾", label: "Plain",        color: "border-slate-600/40 bg-slate-900/90" },
    mana_crystal: { emoji: "💎", label: "Mana Crystal", color: "border-purple-500/60 bg-purple-950/90" },
    beast_camp:   { emoji: "🐗", label: "Beast Camp",   color: "border-orange-600/60 bg-orange-950/90" },
    base:         { emoji: "🏰", label: "Base",         color: "border-amber-500/60 bg-amber-950/90" },
    spawn:        { emoji: "🚩", label: "Spawn Zone",   color: "border-slate-500/40 bg-slate-900/90" },
  };

  function terrainTooltipLines(tile: (typeof gameState.board)[0]): string[] {
    const lines: string[] = [];
    const t = tile.terrain.type;
    if (t === 'forest') { lines.push('+25% Defense'); lines.push('Movement costs doubled (2 per hex)'); }
    if (t === 'mountain') lines.push('Impassable');
    if (t === 'river') { lines.push('Impassable'); lines.push('Lethal if displaced onto it'); }
    if (t === 'mana_crystal') { lines.push('Impassable'); lines.push('+1 or +2 Mana at end of turn'); }
    if (t === 'base') lines.push('+20% Might, Power & Defense');
    if (t === 'beast_camp') {
      const camps = (gameState as any).objectives?.beastCamps;
      if (camps) {
        const idx = gameState.board
          .filter(b => b.terrain.type === 'beast_camp')
          .findIndex(b => b.coordinates.q === tile.coordinates.q && b.coordinates.r === tile.coordinates.r);
        const hp = camps.hp?.[idx] ?? 0;
        const maxHp = camps.maxHp ?? 100;
        const defeated = camps.defeated?.[idx];
        if (defeated) lines.push('Defeated — team has +15% Might & Power');
        else { lines.push(`HP: ${hp}/${maxHp}`); lines.push('Defeat for +15% Might & Power'); }
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

  // 5b) HP bar preview — what will the target's HP look like after this action?
  const hpPreview = useMemo((): { iconId: string; previewHP: number; isDamage: boolean } | null => {
    if (!hoveredCoords) return null;
    const allIcons = gameState.players.flatMap(p => p.icons);
    const hoveredIcon = allIcons.find(i => i.isAlive && i.position.q === hoveredCoords.q && i.position.r === hoveredCoords.r);
    if (!hoveredIcon) return null;

    // --- Card targeting ---
    if (cardTargetingMode) {
      const { card, executorId } = cardTargetingMode;
      const executor = allIcons.find(i => i.id === executorId);
      if (!executor) return null;

      if (card.effect.healing !== undefined && hoveredIcon.playerId === executor.playerId) {
        return { iconId: hoveredIcon.id, previewHP: Math.min(hoveredIcon.stats.maxHp, hoveredIcon.stats.hp + card.effect.healing), isDamage: false };
      }
      if (hoveredIcon.playerId === executor.playerId) return null; // own unit, not a damage target

      if (card.effect.damageType === 'atk') {
        const dmg = resolveBasicAttackDamage(gameState, executor, hoveredIcon);
        return { iconId: hoveredIcon.id, previewHP: Math.max(0, hoveredIcon.stats.hp - dmg), isDamage: true };
      }
      if (card.effect.powerMult !== undefined) {
        const atkStats = calcEffectiveStats(gameState, executor);
        const defStats = calcEffectiveStats(gameState, hoveredIcon);
        const terrainMult = 1; // simplified for preview
        const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult * terrainMult - defStats.defense);
        return { iconId: hoveredIcon.id, previewHP: Math.max(0, hoveredIcon.stats.hp - dmg), isDamage: true };
      }
      if (card.effect.damage !== undefined) {
        return { iconId: hoveredIcon.id, previewHP: Math.max(0, hoveredIcon.stats.hp - card.effect.damage), isDamage: true };
      }
      return null;
    }

    // --- Ability / basic-attack targeting ---
    if (gameState.targetingMode) {
      const { abilityId, iconId } = gameState.targetingMode;
      const caster = allIcons.find(i => i.id === iconId);
      if (!caster) return null;

      if (abilityId === 'basic_attack' && hoveredIcon.playerId !== caster.playerId) {
        const dmg = resolveBasicAttackDamage(gameState, caster, hoveredIcon);
        return { iconId: hoveredIcon.id, previewHP: Math.max(0, hoveredIcon.stats.hp - dmg), isDamage: true };
      }

      const ability = caster.abilities.find(a => a.id === abilityId);
      if (ability) {
        const healing = (ability as any).healing as number | undefined;
        const damage  = (ability as any).damage  as number | undefined;
        if (healing !== undefined && hoveredIcon.playerId === caster.playerId) {
          return { iconId: hoveredIcon.id, previewHP: Math.min(hoveredIcon.stats.maxHp, hoveredIcon.stats.hp + healing), isDamage: false };
        }
        if (damage !== undefined && hoveredIcon.playerId !== caster.playerId) {
          // Use resolveAbilityDamage (includes calcEffectiveStats) for accurate preview
          const defStats = calcEffectiveStats(gameState, hoveredIcon);
          const dmg = damage > 0
            ? Math.max(0.1, damage - defStats.defense)
            : resolveAbilityDamage(gameState, caster, hoveredIcon, 1.0);
          return { iconId: hoveredIcon.id, previewHP: Math.max(0, hoveredIcon.stats.hp - dmg), isDamage: true };
        }
      }
    }

    return null;
  }, [hoveredCoords, cardTargetingMode, gameState]);

  // 5c) Line-targeting hover preview (Rider's Fury / any lineTarget card)
  const isLineTargetCard = Boolean(cardTargetingMode?.card?.effect?.lineTarget);
  const lineHexes = useMemo((): Coordinates[] => {
    if (!isLineTargetCard || !hoveredCoords || !cardTargetingMode) return [];
    const executor = gameState.players.flatMap(p => p.icons).find(i => i.id === cardTargetingMode.executorId);
    if (!executor) return [];
    const range = cardTargetingMode.card?.effect?.range ?? 4;
    return snapToLineHexes(executor.position, hoveredCoords, range);
  }, [isLineTargetCard, hoveredCoords, cardTargetingMode, gameState.players]);
  const lineHexSet = useMemo(() => new Set(lineHexes.map(h => `${h.q},${h.r}`)), [lineHexes]);

  // 5d) AI intent range hover — highlight tiles within that range from the AI icon
  const intentRangeHighlight = useMemo((): Set<string> => {
    if (!hoveredIntentRange) return new Set();
    const aiIntents: AIIntent[] = (gameState as any).aiIntents ?? [];
    const intent = aiIntents.find(i => i.iconId === hoveredIntentRange.iconId);
    if (!intent) return new Set();
    const aiIcon = gameState.players.flatMap(p => p.icons).find(i => i.id === hoveredIntentRange.iconId);
    if (!aiIcon) return new Set();
    const set = new Set<string>();
    // Mark all tiles within intent range
    for (const tile of gameState.board) {
      const { q, r } = tile.coordinates;
      const dist = Math.max(Math.abs(q - aiIcon.position.q), Math.abs(r - aiIcon.position.r), Math.abs((q + r) - (aiIcon.position.q + aiIcon.position.r)));
      if (dist <= hoveredIntentRange.range) set.add(`${q},${r}`);
    }
    return set;
  }, [hoveredIntentRange, gameState]);

  // 6) Memoized board rendering
  const renderBoard = useMemo(() => {
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3 / 2 * q),
      y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    });

    // Sort back-to-front so DOM order gives correct isometric depth (no z-index needed)
    const sorted = [...gameState.board].sort(
      (a, b) => (a.coordinates.r - b.coordinates.r) || (a.coordinates.q - b.coordinates.q)
    );
    return sorted.map(tile => {
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
      const tKey = `${q},${r}`;
      const isOnLine = lineHexSet.has(tKey);
      const isIntentRange = intentRangeHighlight.has(tKey);

      // All AI intents for this tile's icon (shown during player's turn)
      const aiIntents: AIIntent[] = (gameState as any).aiIntents ?? [];
      const tileIntents = icon && icon.playerId === 1 ? aiIntents.filter(i => i.iconId === icon.id) : [];

      // Beast camp intents — shown on beast_camp tiles
      const beastCampIntents: { campQ: number; campR: number; range1Dmg: number; range2Dmg: number }[] =
        (gameState as any).beastCampIntents ?? [];
      const campIntent = tile.terrain.type === 'beast_camp'
        ? beastCampIntents.find(ci => ci.campQ === q && ci.campR === r)
        : undefined;

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
          onMouseEnter={() => { setHoveredCoords({ q, r }); onTileHover?.(tile); }}
          onMouseLeave={() => { setHoveredCoords(null); onTileHover?.(null); }}
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

          {/* Line-targeting hover highlight */}
          {isOnLine && (
            <div className="absolute inset-0 pointer-events-none z-20" style={{
              background: "rgba(255,140,0,0.35)",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }} />
          )}

          {/* AI intent range hover highlight — strong red wash + SVG border ring */}
          {isIntentRange && !isOnLine && (
            <>
              <div className="absolute inset-0 pointer-events-none z-15" style={{
                background: "rgba(220,40,40,0.55)",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }} />
              <svg className="absolute inset-0 pointer-events-none z-16" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth/2},0`,`${hexWidth},${hexHeight/4}`,`${hexWidth},${hexHeight*3/4}`,
                    `${hexWidth/2},${hexHeight}`,`0,${hexHeight*3/4}`,`0,${hexHeight/4}`,
                  ].join(' ')}
                  fill="none" stroke="rgba(255,80,80,0.9)" strokeWidth="3"
                />
              </svg>
            </>
          )}

          {icon && (() => {
            const prev = hpPreview?.iconId === icon.id ? hpPreview : null;
            return (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10">
                <HPBar
                  currentHP={icon.stats.hp}
                  maxHP={icon.stats.maxHp}
                  size="small"
                  previewHP={prev?.previewHP}
                  isDamage={prev?.isDamage ?? true}
                />
              </div>
            );
          })()}

          {/* AI Intent badges (Slay the Spire style) — shown above AI characters during player's turn */}
          {tileIntents.length > 0 && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-40">
              <AIIntentBadge
                intents={tileIntents}
                onHoverRange={(range) => setHoveredIntentRange(range ? { iconId: icon!.id, range } : null)}
              />
            </div>
          )}

          {/* Beast Camp attack intent badge */}
          {campIntent && (
            <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-white text-xs font-bold shadow-lg bg-orange-800/95 border-orange-500 whitespace-nowrap">
                  <span>🐗</span>
                  <span>⚔ {campIntent.range1Dmg}</span>
                </div>
                <div className="text-[9px] text-orange-300 font-orbitron text-center">R1·{campIntent.range1Dmg} / R2·{campIntent.range2Dmg}</div>
              </div>
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
      hpPreview,
      lineHexSet,
      intentRangeHighlight,
      (gameState as any).aiIntents,
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
      className="absolute inset-0 cursor-grab"
      style={{ background: '#070414' }}
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
      {/* ── ARENA BACKDROP ── */}
      {/* 1. Warm arena-floor spotlight — the lit sand/pit in the center */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(circle 480px at 50% 52%, rgba(210,155,55,0.22) 0%, rgba(170,110,30,0.12) 45%, transparent 72%)",
      }} />
      {/* 2. Arena wall ring — visible gold/amber halo at the edge of the pit */}
      <div className="absolute pointer-events-none z-0" style={{
        width: 960, height: 960,
        top: "50%", left: "50%",
        transform: "translate(-50%, -48%)",
        borderRadius: "50%",
        boxShadow: "0 0 0 10px rgba(190,130,40,0.30), 0 0 50px rgba(160,100,25,0.20)",
      }} />
      {/* 3. Dark stands / crowd area outside the arena floor */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(circle 540px at 50% 52%, transparent 58%, rgba(28,10,65,0.55) 72%, rgba(14,4,38,0.82) 84%, rgba(3,1,12,0.97) 96%)",
      }} />
      {/* 4. Purple stadium rim — sci-fi crowd tier suggestion */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 98% 85% at 50% 108%, rgba(80,30,160,0.55) 0%, rgba(45,12,110,0.30) 30%, transparent 55%)",
      }} />
      {/* 5. Top spotlight bars — stadium lights from above */}
      <div className="absolute inset-x-0 top-0 h-36 pointer-events-none z-0" style={{
        background: "linear-gradient(to bottom, rgba(120,70,200,0.18) 0%, transparent 100%)",
      }} />
      {/* 6. Subtle scan-line texture on the floor */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 8px)",
      }} />

<div className="relative w-full h-full flex items-center justify-center z-10">
        <div
          className="relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {renderBoard}
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

