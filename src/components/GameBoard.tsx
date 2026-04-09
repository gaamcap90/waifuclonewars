import React, { useMemo, useState, useRef, useEffect } from "react";
import HexTile from "./HexTile";
import AIIntentBadge from "./AIIntentBadge";
import AnimationLayer from "./AnimationLayer";
import { GameState, Coordinates, AIIntent } from "@/types/game";
import { useRangeCalculation } from "./RangeIndicator";
import { resolveBasicAttackDamage, resolveAbilityDamage } from "@/combat/resolver";
import { calcEffectiveStats } from "@/combat/buffs";
import { useT } from "@/i18n";
import { getCharacterPortrait } from "@/utils/portraits";
import { AnimEvent } from "@/hooks/useAnimations";

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
  animations?: AnimEvent[];
  hoverPreviewRange?: number | null;
  externalIntentRange?: { iconId: string; range: number } | null;
}


const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, onTileHover, animations = [], hoverPreviewRange, externalIntentRange }) => {
  const { t } = useT();
  // 1) Hex dimensions
  const hexSize = 50;
  const hexWidth = hexSize * 2;                // 100px
  const hexHeight = Math.sqrt(3) * hexSize;     // ~86.6px

  // 2) Pan & zoom + hover state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.4);
  const [hoveredCoords, setHoveredCoords] = useState<Coordinates | null>(null);
  const [hoveredIntentRange, setHoveredIntentRange] = useState<{ iconId: string; range: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Center board on mount
  useEffect(() => {
    if (!boardRef.current) return;
    const W = boardRef.current.clientWidth;
    const H = boardRef.current.clientHeight;
    const oX = (W - hexWidth) / 2;
    const oY = (H - hexHeight) / 2;
    setPanOffset({ x: -oX, y: -oY });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) Container size & centering math
  const containerWidth = boardRef.current?.clientWidth ?? 800;
  const containerHeight = boardRef.current?.clientHeight ?? 600;
  const offsetX = (containerWidth - hexWidth) / 2;
  const offsetY = (containerHeight - hexHeight) / 2;

  // 4) Compute ranges for highlighting
  const extState = gameState as any;

  // Use selectedIcon (from ExtState) if set, otherwise first alive icon for active player
  const selectedIconId: string | undefined =
    extState.selectedIcon ??
    gameState.players[gameState.activePlayerId]?.icons.find(i => i.isAlive)?.id;

  // Use the actually-selected icon for all condition checks (not just first-alive)
  const selectedIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === selectedIconId);

  const { movementRange, attackRange, abilityRange } = useRangeCalculation(
    gameState,
    selectedIconId,
    !gameState.targetingMode && !!selectedIcon && selectedIcon.isAlive,
    gameState.targetingMode?.abilityId === 'basic_attack',
    Boolean(gameState.targetingMode && gameState.targetingMode.abilityId !== 'basic_attack'),
    gameState.targetingMode?.range
  );

  // 5) Card hover range preview — highlights tiles within hoverPreviewRange of the active executor
  const hoverPreviewSet = useMemo((): Set<string> => {
    if (!hoverPreviewRange || hoverPreviewRange <= 0 || !selectedIcon) return new Set();
    const set = new Set<string>();
    for (const tile of gameState.board) {
      const { q, r } = tile.coordinates;
      const d = (Math.abs(q - selectedIcon.position.q) + Math.abs(r - selectedIcon.position.r) + Math.abs((q + r) - (selectedIcon.position.q + selectedIcon.position.r))) / 2;
      if (d > 0 && d <= hoverPreviewRange) set.add(`${q},${r}`);
    }
    return set;
  }, [hoverPreviewRange, selectedIcon, gameState.board]);

  // 5b) Hover damage preview when a damage card is selected
  const cardTargetingMode = (gameState as any).cardTargetingMode as { card: any; executorId: string } | undefined;

  // 5a) Terrain tooltip (shown when nothing is being targeted)
  const hoveredTile = hoveredCoords
    ? gameState.board.find(t => t.coordinates.q === hoveredCoords.q && t.coordinates.r === hoveredCoords.r)
    : null;

  const TERRAIN_META: Record<string, { emoji: string; label: string; color: string }> = {
    forest:       { emoji: "🌲", label: t.terrain.forest.label,       color: "border-green-600/60 bg-green-950/90" },
    mountain:     { emoji: "⛰️", label: t.terrain.mountain.label,     color: "border-gray-500/60 bg-gray-900/95" },
    river:        { emoji: "🌊", label: t.terrain.river.label,        color: "border-blue-500/60 bg-blue-950/90" },
    plain:        { emoji: "🌾", label: t.terrain.plain.label,        color: "border-slate-600/40 bg-slate-900/90" },
    mana_crystal: { emoji: "💎", label: t.terrain.mana_crystal.label, color: "border-purple-500/60 bg-purple-950/90" },
    base:         { emoji: "🏰", label: t.terrain.base.label,         color: "border-amber-500/60 bg-amber-950/90" },
    spawn:        { emoji: "🚩", label: t.terrain.spawn.label,        color: "border-slate-500/40 bg-slate-900/90" },
  };

  function terrainTooltipLines(tile: (typeof gameState.board)[0]): string[] {
    const ttype = tile.terrain.type;
    if (ttype === 'forest') return [...t.terrain.forest.lines];
    if (ttype === 'mountain') return [...t.terrain.mountain.lines];
    if (ttype === 'river') return [...t.terrain.river.lines];
    if (ttype === 'mana_crystal') return [...t.terrain.mana_crystal.lines];
    if (ttype === 'base') return [...t.terrain.base.lines];
    if (ttype === 'spawn') return [...t.terrain.spawn.lines];
    if (ttype === 'plain') return [...t.terrain.plain.lines];
    return [];
  }
  const hoverDamagePreview = useMemo(() => {
    if (!hoveredCoords) return null;
    const allIcons = gameState.players.flatMap(p => p.icons);
    const target = allIcons.find(i => i.isAlive && i.position.q === hoveredCoords.q && i.position.r === hoveredCoords.r);

    // Card targeting
    if (cardTargetingMode) {
      const executor = allIcons.find(i => i.id === cardTargetingMode.executorId);
      if (!executor || !target || target.playerId === executor.playerId) return null;
      const card = cardTargetingMode.card;
      if (card.effect.damageType === 'atk') {
        const dmg = resolveBasicAttackDamage(gameState, executor, target);
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `⚔ ${Math.round(dmg)}` };
      }
      if (card.effect.powerMult !== undefined) {
        const dmg = resolveAbilityDamage(gameState, executor, target, card.effect.powerMult);
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `💥 ${Math.round(dmg)}` };
      }
      if (card.effect.damage) {
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `💥 ${card.effect.damage}` };
      }
      if (card.effect.healing) {
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `+${card.effect.healing} HP` };
      }
      return null;
    }

    // Ability / basic-attack targeting
    if (gameState.targetingMode && target) {
      const { abilityId, iconId } = gameState.targetingMode;
      const caster = allIcons.find(i => i.id === iconId);
      if (!caster || target.playerId === caster.playerId) return null;
      if (abilityId === 'basic_attack') {
        const dmg = resolveBasicAttackDamage(gameState, caster, target);
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `⚔ ${Math.round(dmg)}` };
      }
      const ability = caster.abilities.find(a => a.id === abilityId);
      if (ability) {
        const mult = (ability as any).powerMult ?? 1;
        const dmg = resolveAbilityDamage(gameState, caster, target, mult);
        return { q: hoveredCoords.q, r: hoveredCoords.r, text: `💥 ${Math.round(dmg)}` };
      }
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
        const dmg = resolveAbilityDamage(gameState, executor, hoveredIcon, card.effect.powerMult);
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
        const mult = (ability as any).powerMult ?? 1;
        if (healing !== undefined && hoveredIcon.playerId === caster.playerId) {
          return { iconId: hoveredIcon.id, previewHP: Math.min(hoveredIcon.stats.maxHp, hoveredIcon.stats.hp + healing), isDamage: false };
        }
        if (hoveredIcon.playerId !== caster.playerId) {
          const dmg = resolveAbilityDamage(gameState, caster, hoveredIcon, mult);
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
  //     Also handles externalIntentRange (from sidebar enemy ability hover)
  const intentRangeHighlight = useMemo((): Set<string> => {
    const active = hoveredIntentRange ?? externalIntentRange ?? null;
    if (!active) return new Set();
    const aiIcon = gameState.players.flatMap(p => p.icons).find(i => i.id === active.iconId);
    if (!aiIcon) return new Set();
    const set = new Set<string>();
    for (const tile of gameState.board) {
      const { q, r } = tile.coordinates;
      const dist = Math.max(Math.abs(q - aiIcon.position.q), Math.abs(r - aiIcon.position.r), Math.abs((q + r) - (aiIcon.position.q + aiIcon.position.r)));
      if (dist <= active.range) set.add(`${q},${r}`);
    }
    return set;
  }, [hoveredIntentRange, externalIntentRange, gameState]);

  // 6) Memoized board rendering
  const renderBoard = useMemo(() => {
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3 / 2 * q),
      y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    });

    // Sort back-to-front by screen-y (proportional to q/2 + r) for correct isometric painter's order
    const sorted = [...gameState.board].sort(
      (a, b) => (a.coordinates.q + 2 * a.coordinates.r) - (b.coordinates.q + 2 * b.coordinates.r)
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
      const isHoverPreview = hoverPreviewSet.has(tKey);
      const laserGridStruckIds: string[] = (gameState as any).laserGridStruckIds ?? [];
      const isLaserStruck = icon ? laserGridStruckIds.includes(icon.id) : false;
      const burningForestTiles: string[] = (gameState as any).burningForestTiles ?? [];
      const isBurning = tile.terrain.type === 'forest' && burningForestTiles.includes(tKey);
      const pendingFireStartTile: string | undefined = (gameState as any).pendingFireStartTile;
      const isPendingFireStart = pendingFireStartTile === tKey;
      const pendingLaserTiles: string[] = (gameState as any).pendingLaserTiles ?? [];
      const isPendingLaser = pendingLaserTiles.includes(tKey);
      const activeZones: { center: {q:number,r:number}; radius: number }[] = (gameState as any).activeZones ?? [];
      const isInZone = activeZones.some(z => {
        const dist = Math.max(Math.abs(q - z.center.q), Math.abs(r - z.center.r), Math.abs((q + r) - (z.center.q + z.center.r)));
        return dist <= z.radius;
      });

      // All AI intents for this tile's icon (shown during player's turn)
      const aiIntents: AIIntent[] = (gameState as any).aiIntents ?? [];
      const tileIntents = icon && icon.playerId === 1 ? aiIntents.filter(i => i.iconId === icon.id) : [];

      return (
        <div
          key={`${q}-${r}`}
          className="absolute cursor-pointer"
          style={{
            left: x + offsetX,
            top: y + offsetY,
            width: hexWidth,
            height: hexHeight,
            transform: 'scale(0.95)',
            transformOrigin: 'center center',
          }}
          onMouseEnter={() => { setHoveredCoords({ q, r }); onTileHover?.(tile); }}
          onMouseLeave={() => { setHoveredCoords(null); onTileHover?.(null); }}
        >
          <HexTile
            tile={tile}
            onClick={() => onTileClick(tile.coordinates)}
            onTerrainClick={() => { }}
            icon={icon ? (icon.name === "Combat Drone" ? "⚙" : icon.name.charAt(0)) : undefined}
            iconPortrait={icon ? getCharacterPortrait(icon.name) : undefined}
            iconName={icon?.name}
            size={hexSize}
            playerColor={playerColor}
            isActiveIcon={isActiveIcon}
            isTargetable={isTargetable}
            isValidMovement={isValidMovement}
            isRespawnTarget={isRespawnTarget}
            isInAttackRange={inAttack}
            isInAbilityRange={inAbility}
            currentHP={icon?.stats.hp}
            maxHP={icon?.stats.maxHp}
            previewHP={hpPreview && icon && hpPreview.iconId === icon.id ? hpPreview.previewHP : undefined}
            isHealPreview={hpPreview && icon && hpPreview.iconId === icon.id ? !hpPreview.isDamage : false}
          />

          {/* Line-targeting hover highlight */}
          {isOnLine && (
            <div className="absolute inset-0 pointer-events-none z-20" style={{
              background: "rgba(255,140,0,0.35)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }} />
          )}

          {/* Card hover range preview — soft cyan tint showing ability reach */}
          {isHoverPreview && !gameState.targetingMode && (
            <div className="absolute inset-0 pointer-events-none z-14" style={{
              background: "rgba(34,211,238,0.18)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              border: "1px solid rgba(34,211,238,0.40)",
            }} />
          )}

          {/* AI intent range hover highlight — strong red wash + SVG border ring */}
          {isIntentRange && !isOnLine && (
            <>
              <div className="absolute inset-0 pointer-events-none z-15" style={{
                background: "rgba(220,40,40,0.55)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }} />
              <svg className="absolute inset-0 pointer-events-none z-16" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth*3/4},0`,`${hexWidth},${hexHeight/2}`,`${hexWidth*3/4},${hexHeight}`,
                    `${hexWidth/4},${hexHeight}`,`0,${hexHeight/2}`,`${hexWidth/4},0`,
                  ].join(' ')}
                  fill="none" stroke="rgba(255,80,80,0.9)" strokeWidth="3"
                />
              </svg>
            </>
          )}

          {/* Laser Grid struck indicator */}
          {isLaserStruck && (
            <div className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: "rgba(250,200,0,0.30)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }} />
              <span style={{ fontSize: 18, zIndex: 1, textShadow: "0 0 8px rgba(255,220,0,0.9)" }}>⚡</span>
            </div>
          )}

          {/* Pending Laser Grid warning — 1 turn before damage */}
          {isPendingLaser && !isLaserStruck && (
            <div className="absolute inset-0 pointer-events-none z-24 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: "rgba(255,180,0,0.22)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                animation: "pulse 1s ease-in-out infinite",
              }} />
              <svg className="absolute inset-0 pointer-events-none" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth*3/4},0`,`${hexWidth},${hexHeight/2}`,`${hexWidth*3/4},${hexHeight}`,
                    `${hexWidth/4},${hexHeight}`,`0,${hexHeight/2}`,`${hexWidth/4},0`,
                  ].join(' ')}
                  fill="none" stroke="rgba(255,200,0,0.85)" strokeWidth="2" strokeDasharray="4,3"
                />
              </svg>
              <span style={{ fontSize: 14, zIndex: 1, textShadow: "0 0 6px rgba(255,200,0,0.9)" }}>⚠</span>
            </div>
          )}

          {/* Freudenspur resonance zone */}
          {isInZone && (
            <div className="absolute inset-0 pointer-events-none z-22 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: "rgba(100,220,255,0.15)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
              <svg className="absolute inset-0 pointer-events-none" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth*3/4},0`,`${hexWidth},${hexHeight/2}`,`${hexWidth*3/4},${hexHeight}`,
                    `${hexWidth/4},${hexHeight}`,`0,${hexHeight/2}`,`${hexWidth/4},0`,
                  ].join(' ')}
                  fill="none" stroke="rgba(100,220,255,0.55)" strokeWidth="2" strokeDasharray="5,3"
                />
              </svg>
              <span style={{ fontSize: 11, zIndex: 1, textShadow: "0 0 6px rgba(100,220,255,0.9)", opacity: 0.8 }}>♪</span>
            </div>
          )}

          {/* Pending fire start tile warning (before forest fire activates) */}
          {isPendingFireStart && !isBurning && (
            <div className="absolute inset-0 pointer-events-none z-23 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: "rgba(255,120,0,0.25)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                animation: "pulse 1s ease-in-out infinite",
              }} />
              <svg className="absolute inset-0 pointer-events-none" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth*3/4},0`,`${hexWidth},${hexHeight/2}`,`${hexWidth*3/4},${hexHeight}`,
                    `${hexWidth/4},${hexHeight}`,`0,${hexHeight/2}`,`${hexWidth/4},0`,
                  ].join(' ')}
                  fill="none" stroke="rgba(255,140,0,0.80)" strokeWidth="2" strokeDasharray="4,3"
                />
              </svg>
              <span style={{ fontSize: 14, zIndex: 1, textShadow: "0 0 6px rgba(255,120,0,0.9)" }}>🔥</span>
            </div>
          )}

          {/* Burning forest tile indicator */}
          {isBurning && (
            <div className="absolute inset-0 pointer-events-none z-23 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: "rgba(220,80,0,0.40)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }} />
              <span style={{ fontSize: 16, zIndex: 1, textShadow: "0 0 8px rgba(255,120,0,0.9)" }}>🔥</span>
            </div>
          )}


          {/* AI Intent badges (Slay the Spire style) — shown above AI characters during player's turn */}
          {tileIntents.length > 0 && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-40">
              <AIIntentBadge
                intents={tileIntents}
                onHoverRange={(range) => setHoveredIntentRange(range ? { iconId: icon!.id, range } : null)}
              />
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
    setZoom(z => Math.min(Math.max(z * delta, 1.0), 2.5));
  };

  return (
    <div
      ref={boardRef}
      className="absolute inset-0 cursor-grab"
      style={{ background: '#04010f' }}
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
      {/* 1. Deep space base — near-black indigo void */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 120% 90% at 50% 50%, rgba(18,6,48,0.0) 0%, rgba(8,2,28,0.95) 100%)",
      }} />
      {/* 2. Arena floor energy glow — cyan/teal energy conduit under the tiles */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 600px 500px at 50% 52%, rgba(20,120,160,0.18) 0%, rgba(10,60,100,0.10) 45%, transparent 70%)",
      }} />
      {/* 3. Alien arena pit — amber/gold outer ring suggesting an ancient colosseum */}
      <div className="absolute pointer-events-none z-0" style={{
        width: 980, height: 980,
        top: "50%", left: "50%",
        transform: "translate(-50%, -48%)",
        borderRadius: "50%",
        boxShadow: "0 0 0 2px rgba(80,220,255,0.12), 0 0 0 12px rgba(40,100,180,0.18), 0 0 80px rgba(20,80,160,0.25)",
      }} />
      {/* 4. Dark void outside the arena — alien crowd stands */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 560px 520px at 50% 52%, transparent 52%, rgba(8,2,28,0.65) 70%, rgba(4,1,16,0.92) 84%, rgba(1,0,8,0.99) 96%)",
      }} />
      {/* 5. Purple-magenta upper atmosphere — alien sky suggestion */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 100% 55% at 50% 0%, rgba(100,20,200,0.22) 0%, rgba(60,10,140,0.12) 45%, transparent 65%)",
      }} />
      {/* 6. Bottom energy source — deep blue/cyan from below */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 100% 30% at 50% 110%, rgba(0,160,255,0.20) 0%, rgba(0,80,180,0.10) 50%, transparent 70%)",
      }} />
      {/* 7. Side portal lights — two accent columns suggesting spectator archways */}
      <div className="absolute inset-y-0 left-0 w-24 pointer-events-none z-0" style={{
        background: "linear-gradient(to right, rgba(80,20,200,0.20) 0%, transparent 100%)",
      }} />
      <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-0" style={{
        background: "linear-gradient(to left, rgba(80,20,200,0.20) 0%, transparent 100%)",
      }} />
      {/* 8. Fine hex-grid overlay on the floor — animated alien tech pattern */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: "repeating-linear-gradient(0deg, rgba(100,220,255,1) 0px, rgba(100,220,255,1) 1px, transparent 1px, transparent 10px), repeating-linear-gradient(90deg, rgba(100,220,255,1) 0px, rgba(100,220,255,1) 1px, transparent 1px, transparent 10px)",
        animation: "arena-pulse 4s ease-in-out infinite",
      }} />
      {/* 9. Energy drift layer — slow-moving glow streak across floor */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06]" style={{
        background: "radial-gradient(ellipse 300px 120px at 50% 52%, rgba(80,220,255,0.8) 0%, transparent 70%)",
        animation: "arena-energy-drift 8s ease-in-out infinite",
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
          <AnimationLayer
            animations={animations}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;

