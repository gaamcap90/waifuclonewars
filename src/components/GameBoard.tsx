import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
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
import { tileKey, reachableWithCosts } from "@/utils/movement";

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
  hoverPreviewExecutorId?: string | null;
  externalIntentRange?: { iconId: string; range: number } | null;
}


const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, onTileHover, animations = [], hoverPreviewRange, hoverPreviewExecutorId, externalIntentRange }) => {
  const { t } = useT();
  // 1) Hex dimensions
  const hexSize = 50;
  const hexWidth = hexSize * 2;                // 100px
  const hexHeight = Math.sqrt(3) * hexSize;     // ~86.6px

  // 2) Pan + hover state (zoom is fixed — no scroll zoom)
  const FIXED_ZOOM = 1.3;
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCoords, setHoveredCoords] = useState<Coordinates | null>(null);
  const [hoveredIntentRange, setHoveredIntentRange] = useState<{ iconId: string; range: number } | null>(null);
  const [showCoordOverlay, setShowCoordOverlay] = useState(false);
  const [inspectedEnemyId, setInspectedEnemyId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Dev overlay — Ctrl+D toggles (q,r) coordinate labels on every hex
  // Escape — clears enemy inspect mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); setShowCoordOverlay(v => !v); }
      if (e.key === 'Escape') setInspectedEnemyId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Clear inspect when player enters any targeting mode
  useEffect(() => {
    if (gameState.targetingMode || (gameState as any).cardTargetingMode) setInspectedEnemyId(null);
  }, [Boolean(gameState.targetingMode), Boolean((gameState as any).cardTargetingMode)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Board bounding box — recomputed whenever the board layout changes
  const boardBounds = useMemo(() => {
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3 / 2 * q),
      y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const tile of gameState.board) {
      const { x, y } = hexToPixel(tile.coordinates.q, tile.coordinates.r);
      if (x          < minX) minX = x;
      if (y          < minY) minY = y;
      if (x + hexWidth  > maxX) maxX = x + hexWidth;
      if (y + hexHeight > maxY) maxY = y + hexHeight;
    }
    return { minX, minY, maxX, maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }, [gameState.board, hexSize, hexWidth, hexHeight]);

  // offsetX/Y place the board center at local origin (0,0).
  // panOffset then translates that origin to the screen center.
  const offsetX = -boardBounds.cx;
  const offsetY = -boardBounds.cy;

  // Center board on mount/phase-change.
  // The inner content div is flex-centered, so its top-left is already at (W/2, H/2).
  // Board center is at element-local (0,0) (offsetX = -boardBounds.cx).
  // After translate(tx,ty) scale(s) from origin (0,0):
  //   screen_x = W/2 + 0*s + tx  → centering requires tx = 0
  // So panOffset={0,0} is the centered position — just reset it on phase change.
  useLayoutEffect(() => {
    if (!gameState.board.length) return;
    setPanOffset({ x: 0, y: 0 });
  }, [gameState.board.length, gameState.phase]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // When targeting mode is active, calculate ranges from the caster (targetingMode.iconId),
  // not from the UI-selected icon — these can differ with multi-char card plays.
  const rangeIconId = gameState.targetingMode?.iconId ?? selectedIconId;

  const { movementRange, attackRange, abilityRange } = useRangeCalculation(
    gameState,
    rangeIconId,
    !gameState.targetingMode && !!selectedIcon && selectedIcon.isAlive,
    gameState.targetingMode?.abilityId === 'basic_attack',
    Boolean(gameState.targetingMode && gameState.targetingMode.abilityId !== 'basic_attack'),
    gameState.targetingMode?.range
  );

  // 5) Card hover range preview — highlights tiles within range of the active executor.
  // Also covers the card-targeting-mode case: once a card is clicked and targeting begins,
  // hoverPreviewRange goes null (mouse left the card) but we still want to show the range.
  const hoverPreviewSet = useMemo((): Set<string> => {
    const cardTargetingModeLocal = (gameState as any).cardTargetingMode as { card: any; executorId: string } | undefined;
    const range = hoverPreviewRange ?? cardTargetingModeLocal?.card?.effect?.range ?? null;
    if (!range || range <= 0) return new Set();
    const allIcons = gameState.players.flatMap(p => p.icons);
    // Priority: cardTargetingMode executor > hoverPreviewExecutorId (card's owner) > selectedIcon
    const executor = cardTargetingModeLocal
      ? allIcons.find(i => i.id === cardTargetingModeLocal.executorId)
      : hoverPreviewExecutorId
        ? allIcons.find(i => i.id === hoverPreviewExecutorId)
        : selectedIcon;
    if (!executor) return new Set();
    const set = new Set<string>();
    for (const tile of gameState.board) {
      const { q, r } = tile.coordinates;
      const d = (Math.abs(q - executor.position.q) + Math.abs(r - executor.position.r) + Math.abs((q + r) - (executor.position.q + executor.position.r))) / 2;
      if (d > 0 && d <= range) set.add(`${q},${r}`);
    }
    return set;
  }, [hoverPreviewRange, hoverPreviewExecutorId, selectedIcon, gameState.board, gameState.players, (gameState as any).cardTargetingMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        let dmg: number;
        if (card.effect.mightMult !== undefined) {
          const atkStats = calcEffectiveStats(gameState, executor);
          const defStats = calcEffectiveStats(gameState, target);
          dmg = Math.max(0.1, atkStats.might * card.effect.mightMult - (defStats.defense ?? 0));
        } else {
          dmg = resolveBasicAttackDamage(gameState, executor, target);
        }
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

    // Ability / basic-attack targeting (Basic Attack+ carries mightMult via cardRefund)
    if (gameState.targetingMode && target) {
      const { abilityId, iconId } = gameState.targetingMode;
      const caster = allIcons.find(i => i.id === iconId);
      if (!caster || target.playerId === caster.playerId) return null;
      if (abilityId === 'basic_attack') {
        const cardMightMult = (gameState.targetingMode as any)?.cardRefund?.card?.effect?.mightMult as number | undefined;
        let dmg: number;
        if (cardMightMult !== undefined) {
          const atkStats = calcEffectiveStats(gameState, caster);
          const defStats = calcEffectiveStats(gameState, target);
          dmg = Math.max(0.1, atkStats.might * cardMightMult - (defStats.defense ?? 0));
        } else {
          dmg = resolveBasicAttackDamage(gameState, caster, target);
        }
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
        let dmg: number;
        if (card.effect.mightMult !== undefined) {
          const atkStats = calcEffectiveStats(gameState, executor);
          const defStats = calcEffectiveStats(gameState, hoveredIcon);
          dmg = Math.max(0, hoveredIcon.stats.hp - (atkStats.might * card.effect.mightMult - (defStats.defense ?? 0)));
          return { iconId: hoveredIcon.id, previewHP: Math.max(0, dmg), isDamage: true };
        }
        dmg = resolveBasicAttackDamage(gameState, executor, hoveredIcon);
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
        const cardMightMult = (gameState.targetingMode as any)?.cardRefund?.card?.effect?.mightMult as number | undefined;
        let dmg: number;
        if (cardMightMult !== undefined) {
          const atkStats = calcEffectiveStats(gameState, caster);
          const defStats = calcEffectiveStats(gameState, hoveredIcon);
          dmg = Math.max(0.1, atkStats.might * cardMightMult - (defStats.defense ?? 0));
        } else {
          dmg = resolveBasicAttackDamage(gameState, caster, hoveredIcon);
        }
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
  const lineHexSet = useMemo((): Set<string> => {
    if (!isLineTargetCard || !hoveredCoords || !cardTargetingMode) return new Set();
    const executor = gameState.players.flatMap(p => p.icons).find(i => i.id === cardTargetingMode.executorId);
    if (!executor) return new Set();
    const range = cardTargetingMode.card?.effect?.range ?? 4;
    const hexes = snapToLineHexes(executor.position, hoveredCoords, range);
    return new Set(hexes.map(h => `${h.q},${h.r}`));
  }, [isLineTargetCard, hoveredCoords, cardTargetingMode, gameState.players]);

  // 5d) AI intent range hover — highlight movement + attack threat using Dijkstra
  //     Also handles externalIntentRange (from sidebar enemy ability hover)
  const intentRangeHighlight = useMemo((): Set<string> => {
    const active = hoveredIntentRange ?? externalIntentRange ?? null;
    if (!active) return new Set();
    const aiIcon = gameState.players.flatMap(p => p.icons).find(i => i.id === active.iconId);
    if (!aiIcon) return new Set();

    // Movement reachable tiles (Dijkstra, respecting terrain and blocking units)
    const moveBudget = aiIcon.stats.moveRange ?? 0;
    const blockedKeys = new Set(
      gameState.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== aiIcon.id && ic.playerId !== aiIcon.playerId)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allyKeys = new Set(
      gameState.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== aiIcon.id && ic.playerId === aiIcon.playerId)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allowRiver = aiIcon.name.includes("Sun-sin");
    const costMap = reachableWithCosts(gameState.board, aiIcon.position, moveBudget, blockedKeys, allowRiver, allyKeys);

    // Attack threat: ability range from every reachable tile (+ current position)
    const atkRange = active.range;
    const set = new Set<string>();
    const allAttackOrigins: Array<{q: number, r: number}> = [
      aiIcon.position,
      ...[...costMap.keys()].map(k => { const [sq, sr] = k.split(','); return { q: parseInt(sq, 10), r: parseInt(sr, 10) }; }),
    ];
    for (const pos of allAttackOrigins) {
      for (const tile of gameState.board) {
        const { q, r } = tile.coordinates;
        const d = (Math.abs(q - pos.q) + Math.abs(r - pos.r) + Math.abs((q + r) - (pos.q + pos.r))) / 2;
        if (d > 0 && d <= atkRange) set.add(`${q},${r}`);
      }
    }
    return set;
  }, [hoveredIntentRange, externalIntentRange, gameState]);

  // 5e) Enemy inspect — movement & attack range for a clicked enemy icon
  const { inspectedMoveSet, inspectedAttackSet } = useMemo(() => {
    const empty = { inspectedMoveSet: new Set<string>(), inspectedAttackSet: new Set<string>() };
    if (!inspectedEnemyId) return empty;
    const enemy = gameState.players.flatMap(p => p.icons).find(ic => ic.id === inspectedEnemyId && ic.isAlive);
    if (!enemy) return empty;

    const budget = enemy.stats.moveRange;
    const blockedKeys = new Set(
      gameState.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== enemy.id && ic.playerId !== enemy.playerId)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allyKeys = new Set(
      gameState.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== enemy.id && ic.playerId === enemy.playerId)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allowRiver = enemy.name.includes("Sun-sin");
    const costMap = reachableWithCosts(gameState.board, enemy.position, budget, blockedKeys, allowRiver, allyKeys);
    const inspectedMoveSet = new Set<string>(costMap.keys());

    const atkRange = enemy.stats.attackRange ?? 1;
    const inspectedAttackSet = new Set<string>();
    // Danger zone: attack threat from current position + all reachable positions
    const allAttackOrigins: Array<{q: number, r: number}> = [
      enemy.position,
      ...[...costMap.keys()].map(k => { const [sq, sr] = k.split(','); return { q: parseInt(sq, 10), r: parseInt(sr, 10) }; }),
    ];
    for (const pos of allAttackOrigins) {
      for (const tile of gameState.board) {
        const { q, r } = tile.coordinates;
        const d = (Math.abs(q - pos.q) + Math.abs(r - pos.r) + Math.abs((q + r) - (pos.q + pos.r))) / 2;
        if (d > 0 && d <= atkRange) inspectedAttackSet.add(tileKey(q, r));
      }
    }
    return { inspectedMoveSet, inspectedAttackSet };
  }, [inspectedEnemyId, gameState.players, gameState.board]);

  // 6a) Derived lookup structures — O(1) icon and range checks inside renderBoard
  // Pre-sorted board (painter's order) — stable unless board layout changes
  const sortedBoard = useMemo(() =>
    [...gameState.board].sort((a, b) => (a.coordinates.q + 2 * a.coordinates.r) - (b.coordinates.q + 2 * b.coordinates.r)),
    [gameState.board]
  );
  // Map from "q,r" → alive icon — replaces per-tile flatMap().find()
  const iconByPos = useMemo(() => {
    const map = new Map<string, (typeof gameState.players)[0]['icons'][0]>();
    for (const p of gameState.players)
      for (const ic of p.icons)
        if (ic.isAlive) map.set(tileKey(ic.position.q, ic.position.r), ic);
    return map;
  }, [gameState.players]);
  // Map from id → icon (all, alive or dead) — for respawn lookup
  const iconById = useMemo(() => {
    const map = new Map<string, (typeof gameState.players)[0]['icons'][0]>();
    for (const p of gameState.players)
      for (const ic of p.icons)
        map.set(ic.id, ic);
    return map;
  }, [gameState.players]);
  // Set versions of range arrays — O(1) per-tile check instead of O(n) .some()
  const movementRangeSet = useMemo(() => new Set(movementRange.map(c => tileKey(c.q, c.r))), [movementRange]);
  const attackRangeSet   = useMemo(() => new Set(attackRange.map(c => tileKey(c.q, c.r))),   [attackRange]);
  const abilityRangeSet  = useMemo(() => new Set(abilityRange.map(c => tileKey(c.q, c.r))),  [abilityRange]);

  // 6b) Memoized board rendering
  const renderBoard = useMemo(() => {
    const hexToPixel = (q: number, r: number) => ({
      x: hexSize * (3 / 2 * q),
      y: hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    });

    return sortedBoard.map(tile => {
      const { q, r } = tile.coordinates;
      const { x, y } = hexToPixel(q, r);
      const tKey = `${q},${r}`;

      // O(1) icon lookup
      const icon = iconByPos.get(tKey);

      const playerColor = icon ? (icon.playerId === 0 ? 'blue' : 'red') : undefined;
      const isActiveIcon = icon?.id === selectedIconId;

      // O(1) range checks
      const inMove    = movementRangeSet.has(tKey);
      const inAttack  = attackRangeSet.has(tKey);
      const inAbility = abilityRangeSet.has(tKey);

      const isTargetable = inAttack || inAbility;
      const isValidMovement = inMove;
      const isRespawnTarget = Boolean(gameState.respawnPlacement && (() => {
        const respawning = iconById.get(gameState.respawnPlacement as string);
        if (!respawning) return false;
        const validZone = respawning.playerId === 0
          ? (q >= -5 && q <= -3 && r >= 3 && r <= 5)
          : (q >= 3 && q <= 5 && r >= -5 && r <= -3);
        return validZone && !iconByPos.has(tKey);
      })());

      const preview = hoverDamagePreview?.q === q && hoverDamagePreview?.r === r ? hoverDamagePreview.text : null;
      const isOnLine = lineHexSet.has(tKey);
      const isIntentRange = intentRangeHighlight.has(tKey);
      const isHoverPreview = hoverPreviewSet.has(tKey);
      const isInspectedUnit = icon?.id === inspectedEnemyId;
      const isInspectedMove = inspectedMoveSet.has(tKey) && !isInspectedUnit;
      const isInspectedAttack = inspectedAttackSet.has(tKey) && !isInspectedMove && !isInspectedUnit;
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

      // Stun indicator — show on unit's hex if stunned
      const isStunned = icon?.isAlive && icon?.debuffs?.some(d => d.type === 'stun');

      // Active debuffs on this tile's unit (for board badge strip)
      const DEBUFF_BADGE: Record<string, { emoji: string; bg: string }> = {
        stun:        { emoji: '⚡', bg: 'rgba(34,211,238,0.88)' },
        poison:      { emoji: '☠', bg: 'rgba(34,197,94,0.88)' },
        silence:     { emoji: '🤫', bg: 'rgba(139,92,246,0.88)' },
        armor_break: { emoji: '🔩', bg: 'rgba(249,115,22,0.88)' },
        rooted:      { emoji: '🌿', bg: 'rgba(134,239,172,0.88)' },
        blinded:     { emoji: '💥', bg: 'rgba(253,224,71,0.88)' },
        mud_throw:   { emoji: '🐾', bg: 'rgba(161,120,38,0.88)' },
        taunted:     { emoji: '📢', bg: 'rgba(234,179,8,0.88)' },
        bleed:       { emoji: '🩸', bg: 'rgba(220,38,38,0.88)' },
      };
      const activeBoardDebuffs = icon?.isAlive
        ? (icon.debuffs ?? []).filter(d => DEBUFF_BADGE[d.type])
        : [];

      // Respawn preview — soft blue glow on valid spawn tiles when a friendly
      // icon is about to respawn next turn (respawnTurns === 1)
      const hasImmientRespawn = gameState.players[0].icons.some(ic => !ic.isAlive && ic.respawnTurns === 1);
      const isRespawnPreview = hasImmientRespawn &&
        !gameState.respawnPlacement && // not already in active respawn mode
        (q >= -5 && q <= -3 && r >= 3 && r <= 5) &&
        !iconByPos.has(tKey);

      // All AI intents for this tile's icon (shown during player's turn)
      const aiIntents: AIIntent[] = (gameState as any).aiIntents ?? [];
      const tileIntents = icon && icon.playerId === 1 ? aiIntents.filter(i => i.iconId === icon.id) : [];

      // Base intents — shown on the enemy base tile during player's turn
      const baseIntents: AIIntent[] = (gameState as any).baseIntents ?? [];
      const isBaseTile = q === 5 && r === -4 && (gameState as any).encounterObjective === 'destroy_base';
      const tileBaseIntents = isBaseTile ? baseIntents : [];

      return (
        <div
          key={`${q}-${r}`}
          className="absolute cursor-pointer"
          style={{
            left: x + offsetX,
            top: y + offsetY,
            width: hexWidth,
            height: hexHeight,
            transformOrigin: 'center center',
          }}
          onMouseEnter={() => { setHoveredCoords({ q, r }); onTileHover?.(tile); }}
          onMouseLeave={() => { setHoveredCoords(null); onTileHover?.(null); }}
        >
          <HexTile
            tile={tile}
            onClick={() => {
              const isEnemy = icon && icon.playerId === 1; // always based on AI player, never own units
              if (isEnemy && !gameState.targetingMode && !(gameState as any).cardTargetingMode) {
                setInspectedEnemyId(id => id === icon.id ? null : icon.id);
              } else {
                setInspectedEnemyId(null);
                onTileClick(tile.coordinates);
              }
            }}
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

          {/* ── Terrain ambient overlays ─────────────────────────── */}

          {/* Mana crystal — pulsing purple radial glow */}
          {tile.terrain.type === 'mana_crystal' && (
            <div className="absolute inset-0 pointer-events-none" style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.65) 0%, rgba(139,92,246,0.28) 45%, transparent 72%)',
              animation: 'anim-crystal-pulse 2.3s ease-in-out infinite',
              zIndex: 5,
            }} />
          )}

          {/* River / lake — light-blue shimmer sweep */}
          {(tile.terrain.type === 'river' || tile.terrain.type === 'lake') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
              zIndex: 5,
            }}>
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                width: '55%',
                background: 'linear-gradient(105deg, transparent 28%, rgba(100,200,255,0.42) 50%, transparent 72%)',
                animation: 'anim-tile-shimmer 3.0s ease-in-out infinite',
              }} />
            </div>
          )}

          {/* Burning forest — animated flicker overlay */}
          {isBurning && (
            <div className="absolute inset-0 pointer-events-none" style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
              background: 'radial-gradient(ellipse at center bottom, rgba(255,100,0,0.72) 0%, rgba(220,50,0,0.48) 45%, transparent 78%)',
              animation: 'anim-fire-flicker 0.38s ease-in-out infinite',
              zIndex: 5,
            }} />
          )}

          {/* Dev overlay — Ctrl+D: show axial (q,r) on every hex */}
          {showCoordOverlay && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.85)',
                textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.9)',
                letterSpacing: 0, lineHeight: 1,
              }}>{q},{r}</span>
            </div>
          )}

          {/* Respawn preview — soft blue tint on valid spawn hexes when respawn is imminent */}
          {isRespawnPreview && (
            <div className="absolute inset-0 pointer-events-none z-10" style={{
              background: "rgba(96,165,250,0.18)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              animation: "pulse 2s ease-in-out infinite",
            }} />
          )}

          {/* Line-targeting hover highlight */}
          {isOnLine && (
            <div className="absolute inset-0 pointer-events-none z-20" style={{
              background: "rgba(255,140,0,0.35)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }} />
          )}

          {/* Card hover range preview — soft cyan tint showing ability reach.
              Stays visible during cardTargetingMode (clicked card, waiting for target).
              Suppressed during pure ability targeting (targetingMode only, no card). */}
          {isHoverPreview && (!gameState.targetingMode || !!(gameState as any).cardTargetingMode) && !isInspectedAttack && !isInspectedMove && (
            <div className="absolute inset-0 pointer-events-none" style={{
              zIndex: 14,
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

          {/* Enemy inspect — movement range (orange tint) — z-11 so intent-range overlay (z-15) wins */}
          {isInspectedMove && (
            <div className="absolute inset-0 pointer-events-none z-11" style={{
              background: "rgba(251,146,60,0.28)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }} />
          )}
          {/* Enemy inspect — attack/danger zone (red tint) — z-11 so intent-range overlay (z-15) wins */}
          {isInspectedAttack && (
            <>
              <div className="absolute inset-0 pointer-events-none z-11" style={{
                background: "rgba(239,68,68,0.22)",
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              }} />
              <svg className="absolute inset-0 pointer-events-none z-12" width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
                <polygon
                  points={[
                    `${hexWidth*3/4},0`,`${hexWidth},${hexHeight/2}`,`${hexWidth*3/4},${hexHeight}`,
                    `${hexWidth/4},${hexHeight}`,`0,${hexHeight/2}`,`${hexWidth/4},0`,
                  ].join(' ')}
                  fill="none" stroke="rgba(239,68,68,0.55)" strokeWidth="2"
                />
              </svg>
            </>
          )}
          {/* Enemy inspect — INSPECT badge above the enemy */}
          {isInspectedUnit && (
            <div className="absolute pointer-events-none z-50"
              style={{ top: -20, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              <span style={{
                fontFamily: 'Orbitron, monospace', fontSize: 8, color: '#fb923c', letterSpacing: 1,
                background: 'rgba(0,0,0,0.85)', borderRadius: 4, padding: '1px 5px',
                border: '1px solid rgba(251,146,60,0.65)',
              }}>INSPECT</span>
            </div>
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ zIndex: 24, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ zIndex: 22, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ zIndex: 23, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>
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

          {/* Burning forest tile indicator — emoji only (flicker glow handled above) */}
          {isBurning && (
            <div className="absolute inset-0 pointer-events-none z-23 flex items-center justify-center">
              <span style={{ fontSize: 18, textShadow: "0 0 10px rgba(255,120,0,0.95)" }}>🔥</span>
            </div>
          )}


          {/* Stun hex overlay — pulsing tint fills the whole tile */}
          {isStunned && (
            <div className="absolute inset-0 pointer-events-none z-[26]"
              style={{
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                background: "rgba(34,211,238,0.18)",
                animation: "pulse 1s ease-in-out infinite",
              }} />
          )}

          {/* Debuff badge strip — shown below the unit portrait, above the pedestal */}
          {activeBoardDebuffs.length > 0 && (
            <div className="absolute pointer-events-none z-[27]"
              style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2 }}>
              {activeBoardDebuffs.map((d, i) => {
                const meta = DEBUFF_BADGE[d.type]!;
                return (
                  <div key={i} title={`${d.type} (${d.turnsRemaining}t)`} style={{
                    width: 16, height: 16,
                    borderRadius: 3,
                    background: meta.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    {meta.emoji}
                  </div>
                );
              })}
            </div>
          )}

          {/* Base intent badges — shown above the enemy base tile during player's turn */}
          {tileBaseIntents.length > 0 && (
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-40">
              <AIIntentBadge
                intents={tileBaseIntents}
                onHoverRange={() => {}}
              />
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
      sortedBoard,
      iconByPos,
      iconById,
      selectedIconId,
      gameState.targetingMode,
      gameState.respawnPlacement,
      movementRangeSet,
      attackRangeSet,
      abilityRangeSet,
      hoverDamagePreview,
      hpPreview,
      lineHexSet,
      intentRangeHighlight,
      inspectedEnemyId,
      inspectedMoveSet,
      inspectedAttackSet,
      (gameState as any).aiIntents,
      offsetX,
      offsetY,
      // Arena event visual state — must be deps or board won't rerender when they change
      (gameState as any).burningForestTiles,
      (gameState as any).pendingFireStartTile,
      (gameState as any).pendingLaserTiles,
      (gameState as any).laserGridStruckIds,
      (gameState as any).activeZones,
      hoverPreviewSet,
      gameState.activePlayerId,
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

  return (
    <div
      ref={boardRef}
      className="absolute inset-0 cursor-grab"
      style={{ background: '#04010f' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
      {/* 4. Dark void outside the arena — softened so crowd panels show through */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 560px 520px at 50% 52%, transparent 52%, rgba(8,2,28,0.30) 70%, rgba(4,1,16,0.55) 84%, rgba(1,0,8,0.75) 96%)",
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
      {/* 8. (removed — square grid conflicted with crowd panels) */}
      {/* 9. Energy drift layer — slow-moving glow streak across floor */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06]" style={{
        background: "radial-gradient(ellipse 300px 120px at 50% 52%, rgba(80,220,255,0.8) 0%, transparent 70%)",
        animation: "arena-energy-drift 8s ease-in-out infinite",
      }} />

      {/* ── CSS ARENA SURROUND ────────────────────────────────────────────────
           Option A: CSS-built colosseum rings — no image assets needed.
           Option D: Warm sand/stone floor beneath the battle pit.
           Wall diameter: 640px. Bleacher rings: 640→950px. Outer blackout: 950px+.
           To slot real art in later: replace the bleacher div with image panels
           and keep the wall ring + floor gradient intact.
      ─────────────────────────────────────────────────────────────────── */}

      {/* D: Sandy battle floor — warm golden oval behind the board */}
      <div className="absolute inset-0 pointer-events-none z-[1]" style={{
        background: 'radial-gradient(ellipse 560px 530px at 50% 50%, rgba(218,182,100,0.18) 0%, rgba(178,142,65,0.12) 42%, rgba(128,96,40,0.07) 68%, transparent 88%)',
      }} />

      {/* A: Bleacher rings — concentric stands via stacked outer box-shadow.
           Pairs alternate: dark seat row → lighter step-edge catchlight. */}
      <div className="absolute pointer-events-none z-[3]" style={{
        width: 640, height: 640,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        boxShadow: [
          '0 0 0  28px rgba(14, 8,32,0.84)',  // tier 1 seats
          '0 0 0  42px rgba(30,18,56,0.38)',  // step catchlight 1
          '0 0 0  68px rgba(16,10,36,0.84)',  // tier 2 seats
          '0 0 0  82px rgba(32,20,60,0.36)',  // step catchlight 2
          '0 0 0 110px rgba(14, 8,30,0.86)',  // tier 3 seats
          '0 0 0 124px rgba(28,16,52,0.38)',  // step catchlight 3
          '0 0 0 158px rgba(12, 6,26,0.88)',  // tier 4 seats
          '0 0 0 172px rgba(24,14,48,0.40)',  // step catchlight 4
          '0 0 0 215px rgba(10, 4,22,0.92)',  // tier 5 seats
          '0 0 0 320px rgba( 4, 1,12,0.98)',  // outer blackout
        ].join(', '),
      }} />

      {/* A: Fan section tints — colour the stands to suggest crowd zones */}
      <div className="absolute inset-0 pointer-events-none z-[4]" style={{
        background: [
          'radial-gradient(ellipse 60% 20% at 50%  2%, rgba(70,22,155,0.38) 0%, transparent 70%)',
          'radial-gradient(ellipse 20% 50% at  2% 50%, rgba(22,70,210,0.30) 0%, transparent 70%)',
          'radial-gradient(ellipse 20% 50% at 98% 50%, rgba(210,22,65,0.30) 0%, transparent 70%)',
          'radial-gradient(ellipse 60% 20% at 50% 98%, rgba(22,65,190,0.30) 0%, transparent 70%)',
        ].join(', '),
      }} />

      {/* A: Arena pit wall — glowing stone/gold ring separating pit from stands */}
      <div className="absolute pointer-events-none z-[5]" style={{
        width: 640, height: 640,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: '3px solid rgba(172,136,68,0.74)',
        boxShadow: [
          '0 0 0 1px rgba(232,196,108,0.28)',
          '0 0 14px rgba(196,156,65,0.68)',
          '0 0 40px rgba(152,118,48,0.36)',
          'inset 0 0 0 2px rgba(98,74,28,0.30)',
          'inset 0 0 60px rgba(0,0,0,0.32)',
        ].join(', '),
      }} />

      {/* A: Crowd lights — torches, glowsticks, holo-screens scattered in stands */}
      {([
        [ 7, 38, 0], [ 7, 50, 1], [ 7, 62, 2],   // left stands
        [93, 38, 1], [93, 50, 2], [93, 62, 0],   // right stands
        [35,  6, 2], [50,  4, 0], [65,  6, 1],   // top stands
        [35, 94, 0], [50, 96, 1], [65, 94, 2],   // bottom stands
        [20, 18, 1], [80, 18, 0], [20, 82, 2], [80, 82, 1], // corners
        [14, 34, 0], [86, 34, 2], [14, 66, 1], [86, 66, 0], // side fill
      ] as [number, number, number][]).map(([l, t, type], i) => {
        const p = [
          { bg: 'rgba(255,200,80,0.95)',  sh: '0 0 7px rgba(255,178,55,0.92), 0 0 22px rgba(255,148,35,0.52)' },
          { bg: 'rgba(80,182,255,0.92)',  sh: '0 0 7px rgba(60,162,255,0.92), 0 0 22px rgba(38,118,255,0.52)' },
          { bg: 'rgba(255,85,168,0.92)',  sh: '0 0 7px rgba(255,62,145,0.92), 0 0 22px rgba(220,38,120,0.52)' },
        ][type];
        return (
          <div key={i} className="absolute pointer-events-none z-[6]" style={{
            left: `${l}%`, top: `${t}%`,
            width: 5, height: 5,
            borderRadius: '50%',
            background: p.bg,
            boxShadow: p.sh,
          }} />
        );
      })}

      {/* ── Full arena image — single piece, parallaxes with board drag ── */}
      <div className="absolute pointer-events-none z-[5]" style={{
        inset: '-8%',
        backgroundImage: "url('/art/arena/arena.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        transform: `translate(${panOffset.x * 0.28}px, ${panOffset.y * 0.28}px)`,
      }} />

      {/* ── Vignette — dark oval frame blending art edges into bg ── */}
      <div className="absolute inset-0 pointer-events-none z-[6]" style={{
        background: [
          'radial-gradient(ellipse 62% 58% at 50% 50%, transparent 48%, rgba(4,1,15,0.35) 62%, rgba(4,1,15,0.75) 80%, rgba(4,1,15,0.97) 100%)',
          'linear-gradient(to bottom, rgba(4,1,15,0.60) 0%, transparent 10%, transparent 84%, rgba(4,1,15,0.65) 100%)',
        ].join(', '),
      }} />
      {/* ── END ARENA SURROUND ── */}

      {/* Enemy inspect legend — shown when an enemy is being inspected */}
      {inspectedEnemyId && (
        <div className="absolute bottom-4 right-4 z-50 pointer-events-none flex flex-col gap-1"
          style={{ background: 'rgba(4,2,18,0.90)', border: '1px solid rgba(251,146,60,0.45)', borderRadius: 8, padding: '6px 10px' }}>
          <div className="font-orbitron text-[9px] tracking-widest text-orange-400 mb-0.5">ENEMY INSPECT</div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, background: 'rgba(251,146,60,0.55)', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Movement range</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, background: 'rgba(239,68,68,0.45)', borderRadius: 2, border: '1px solid rgba(239,68,68,0.55)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Attack range</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Click enemy or press Esc to exit</div>
        </div>
      )}

      {/* Hint shown when not inspecting and not in targeting mode */}
      {!inspectedEnemyId && !gameState.targetingMode && !(gameState as any).cardTargetingMode && gameState.phase === 'combat' && (
        <div className="absolute bottom-4 right-4 z-50 pointer-events-none"
          style={{ background: 'rgba(4,2,18,0.75)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 8px' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace' }}>Click enemy to inspect range</span>
        </div>
      )}

      <div className="relative w-full h-full flex items-center justify-center z-10">
        <div
          className="relative"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${FIXED_ZOOM})`,
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

