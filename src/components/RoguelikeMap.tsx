// src/components/RoguelikeMap.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { RunState, RunNode, CharacterRunState, RunItem, CharacterId } from "@/types/roguelike";
import { CARD_REWARD_POOL } from "@/data/roguelikeData";
import { CARD_UPGRADES, CARD_DEFS } from "@/data/cards";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";

/** Animates a number ticking from previous value to current over ~500ms */
function useAnimatedNumber(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const start = Date.now();
    const dur = 450;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return displayed;
}

interface Props {
  runState: RunState;
  onSelectNode: (nodeId: string) => void;
  onAbandonRun: () => void;
  onSettings?: () => void;
  onAllocateStat?: (characterId: CharacterId, stat: 'hp' | 'might' | 'power' | 'defense') => void;
  onUpgradeAbility?: (characterId: CharacterId, defId: string, isUltimate: boolean) => void;
  onRoswellFound?: () => void;
  fogOfWarTier?: 0 | 1 | 2 | 3 | 4;
  hasExtraItemSlot?: boolean;
}

// ── Horizontal pure-SVG coordinate system ────────────────────────────────────
// Layout: floor 0 = left, floor 14 (boss) = right.
// Tracks 0-4 run top→bottom across the 5 possible vertical positions.
// Both connection paths and node circles share this one coordinate space,
// so connections are ALWAYS pixel-perfect.

const SVG_W = 1500;     // wider to accommodate 15 rows without crowding
const SVG_H = 540;      // shorter → less vertical swing
const MAP_PAD_X = 85;
const MAP_PAD_Y = 95;   // large padding compresses track spread to ~88px between tracks
const MAP_ROWS = 14;    // boss row index (0 = leftmost, 14 = rightmost)

/** X position for a floor/row (0 = leftmost, MAP_ROWS = rightmost) */
function floorX(row: number): number {
  return MAP_PAD_X + (row / MAP_ROWS) * (SVG_W - 2 * MAP_PAD_X);
}

/** Y position for a track/col (0 = top, 4 = bottom) */
function trackY(col: number): number {
  // span = SVG_H - 2*MAP_PAD_Y = 540-190 = 350px across 4 steps → ~88px each
  return MAP_PAD_Y + (col / 4) * (SVG_H - 2 * MAP_PAD_Y);
}

const NODE_R = 22; // regular node radius
const BOSS_R = 40; // boss node radius

/** Horizontal S-curve: leaves source going right, arrives at target going right.
 *  Same-track connections (y1 ≈ y2) get a small upward bow so they're never
 *  a flat line hidden under adjacent node circles. */
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  if (Math.abs(y1 - y2) < 10) {
    // Bow upward so the path arcs visibly above node circles (r=22).
    // bow=45 → arc midpoint ≈34px above baseline → arc emerges above circle tops.
    const bow = 45;
    return `M ${x1} ${y1} C ${mx} ${y1 - bow} ${mx} ${y2 - bow} ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}

function svgToScreen(
  svgEl: SVGSVGElement,
  svgX: number,
  svgY: number,
): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const s = pt.matrixTransform(ctm);
  return { x: s.x, y: s.y };
}

const NODE_META: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  enemy:           { icon: 'X', label: 'Enemy',          color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },
  elite:           { icon: 'E', label: 'Elite',          color: '#f97316', glow: 'rgba(249,115,22,0.6)' },
  campfire:        { icon: 'R', label: 'Campfire',       color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
  merchant:        { icon: '$', label: 'Merchant',       color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },
  treasure:        { icon: 'T', label: 'Treasure',       color: '#eab308', glow: 'rgba(234,179,8,0.6)' },
  unknown:         { icon: '?', label: 'Unknown',        color: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
  boss:            { icon: 'B', label: 'FINAL BOSS',     color: '#f43f5e', glow: 'rgba(244,63,94,1.0)' },
  revival_shrine:  { icon: '☥', label: 'Revival Shrine', color: '#a855f7', glow: 'rgba(168,85,247,0.7)' },
};

/** Compute pointy-top hexagon polygon points */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

/** SVG icon paths for each node type (14×14 viewBox, centered at 0,0) */
const NODE_ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  enemy: (color, s) => (
    // Two crossed swords (X shape)
    <g>
      <line x1={-s * 0.42} y1={-s * 0.42} x2={s * 0.42} y2={s * 0.42} stroke={color} strokeWidth={s * 0.18} strokeLinecap="round" />
      <line x1={s * 0.42} y1={-s * 0.42} x2={-s * 0.42} y2={s * 0.42} stroke={color} strokeWidth={s * 0.18} strokeLinecap="round" />
    </g>
  ),
  elite: (color, s) => (
    // Skull-like: circle head + 2 eye dots + teeth line
    <g>
      <circle cx={0} cy={-s * 0.1} r={s * 0.38} fill="none" stroke={color} strokeWidth={s * 0.15} />
      <circle cx={-s * 0.14} cy={-s * 0.14} r={s * 0.08} fill={color} />
      <circle cx={s * 0.14} cy={-s * 0.14} r={s * 0.08} fill={color} />
      <line x1={-s * 0.28} y1={s * 0.28} x2={s * 0.28} y2={s * 0.28} stroke={color} strokeWidth={s * 0.12} strokeLinecap="round" />
    </g>
  ),
  campfire: (color, s) => (
    // Flame shape: diamond with upward point
    <g>
      <polygon
        points={`0,${-s * 0.44} ${s * 0.28},${s * 0.1} 0,${s * 0.28} ${-s * 0.28},${s * 0.1}`}
        fill={color}
        opacity={0.85}
      />
      <polygon
        points={`0,${-s * 0.2} ${s * 0.15},${s * 0.15} 0,${s * 0.28} ${-s * 0.15},${s * 0.15}`}
        fill="rgba(255,255,200,0.7)"
      />
    </g>
  ),
  merchant: (color, s) => (
    // Dollar/coin sign
    <g>
      <circle cx={0} cy={0} r={s * 0.38} fill="none" stroke={color} strokeWidth={s * 0.14} />
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
        fontSize={s * 0.52} fontWeight={900} fill={color}
        fontFamily="monospace" style={{ userSelect: 'none' }}>$</text>
    </g>
  ),
  treasure: (color, s) => (
    // Diamond (rotated square)
    <polygon
      points={`0,${-s * 0.44} ${s * 0.38},0 0,${s * 0.44} ${-s * 0.38},0`}
      fill={color}
      opacity={0.9}
    />
  ),
  unknown: (color, s) => (
    <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
      fontSize={s * 0.7} fontWeight={900} fill={color}
      fontFamily="'Orbitron', monospace" style={{ userSelect: 'none' }}>?</text>
  ),
  revival_shrine: (color, s) => (
    // Ankh-like shrine glyph: vertical pillar + arched top + base
    <g>
      <ellipse cx={0} cy={-s * 0.2} rx={s * 0.18} ry={s * 0.22} fill="none" stroke={color} strokeWidth={s * 0.13} />
      <line x1={0} y1={s * 0.02} x2={0} y2={s * 0.42} stroke={color} strokeWidth={s * 0.16} strokeLinecap="round" />
      <line x1={-s * 0.22} y1={s * 0.18} x2={s * 0.22} y2={s * 0.18} stroke={color} strokeWidth={s * 0.14} strokeLinecap="round" />
    </g>
  ),
  boss: (color, s) => (
    // Crown shape
    <g>
      <polygon
        points={`${-s * 0.42},${s * 0.22} ${-s * 0.42},${-s * 0.18} ${-s * 0.18},${s * 0.04} 0,${-s * 0.36} ${s * 0.18},${s * 0.04} ${s * 0.42},${-s * 0.18} ${s * 0.42},${s * 0.22}`}
        fill={color}
        opacity={0.9}
      />
    </g>
  ),
};

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};
const EXCLUSIVE_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b',
  'Sun-sin': '#06b6d4', Beethoven: '#8b5cf6', 'Huang-chan': '#b45309',
};

// ── Left Panel Character Card ─────────────────────────────────────────────────
function LeftPanelCharCard({
  char,
  isDead,
  onClick,
}: {
  char: CharacterRunState;
  isDead: boolean;
  onClick: () => void;
}) {
  const { t } = useT();
  const hpPct = char.currentHp / char.maxHp;
  const [itemTooltip, setItemTooltip] = useState<{ item: RunItem; rect: DOMRect } | null>(null);
  const hpColor = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#f87171';

  if (isDead) {
    return (
      <div className="w-full rounded-xl border border-red-900/40 p-3 opacity-60"
        style={{ background: 'rgba(20,4,4,0.80)' }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img src={char.portrait} alt={char.displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-red-900/50 grayscale" />
            <div className="absolute inset-0 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'rgba(0,0,0,0.55)' }}>💀</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold text-[12px] text-red-400 truncate">{char.displayName}</div>
            <div className="text-[9px] text-red-700 font-orbitron tracking-wider mt-0.5">{t.roguelike.fallen}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3.5 transition-all hover:bg-purple-900/10"
      style={{
        background: 'rgba(6,3,22,0.80)',
        borderColor: char.pendingStatPoints > 0 ? 'rgba(234,179,8,0.70)' : 'rgba(100,80,160,0.5)',
        boxShadow: char.pendingStatPoints > 0 ? '0 0 14px rgba(234,179,8,0.28)' : 'none',
      }}
    >
      {/* Portrait + name row */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="relative shrink-0">
          <img
            src={char.portrait}
            alt={char.displayName}
            className="w-14 h-14 rounded-full object-cover border-2"
            style={{
              borderColor: hpPct > 0.6 ? 'rgba(74,222,128,0.75)' : hpPct > 0.3 ? 'rgba(251,191,36,0.75)' : 'rgba(248,113,113,0.85)',
              boxShadow: hpPct > 0.6 ? '0 0 8px rgba(74,222,128,0.40)' : hpPct > 0.3 ? '0 0 8px rgba(251,191,36,0.40)' : '0 0 10px rgba(248,113,113,0.55)',
            }}
          />
          {/* Level badge */}
          <div
            className="absolute -bottom-1 -right-1 text-[9px] font-orbitron font-bold rounded-full w-5 h-5 flex items-center justify-center border border-slate-500"
            style={{ background: 'rgba(10,6,30,0.95)', color: '#a78bfa' }}
          >
            {char.level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-orbitron font-bold text-[13px] text-white truncate">
            {char.displayName.replace('-chan', '')}
            <span className="text-slate-500 font-normal text-[11px]">-chan</span>
          </div>
          <div className="text-[9px] text-purple-400 font-orbitron mt-0.5">{t.roguelike.lvShort.replace('{n}', String(char.level))}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {char.pendingStatPoints > 0 && (
            <span className="text-[10px] font-bold text-yellow-400 animate-pulse">▲{char.pendingStatPoints}</span>
          )}
          {char.pendingAbilityUpgrades > 0 && (
            <span className="text-[10px] font-bold text-purple-400 animate-pulse">✦</span>
          )}
          {char.pendingUltimateUpgrade > 0 && (
            <span className="text-[10px] font-bold text-amber-400 animate-pulse">⚡</span>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div className="mb-1.5">
        <div className="flex justify-between mb-0.5">
          <span className="text-[10px] text-slate-500 font-orbitron font-bold">HP</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: hpColor }}>{char.currentHp}/{char.maxHp}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct * 100}%`, background: hpColor, boxShadow: `0 0 6px ${hpColor}80` }}
          />
        </div>
      </div>

      {/* XP bar */}
      {char.level < 8 ? (
        <div className="mb-2">
          <div className="flex justify-between mb-0.5">
            <span className="text-[9px] text-purple-600 font-orbitron font-bold">XP</span>
            <span className="text-[10px] text-purple-400 font-bold font-mono">{char.xp}/{char.xpToNext}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(88,28,135,0.35)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (char.xp / char.xpToNext) * 100)}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                boxShadow: '0 0 4px rgba(168,85,247,0.7)',
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <div className="h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', boxShadow: '0 0 6px rgba(168,85,247,0.5)' }} />
          <div className="text-center mt-0.5">
            <span className="text-[9px] text-purple-400 font-orbitron font-bold tracking-widest">MAX LEVEL</span>
          </div>
        </div>
      )}

      {/* Inventory section */}
      <div className="border-t border-slate-600/50 pt-2 mt-1">
        <p className="font-orbitron text-[8px] tracking-[0.35em] text-slate-500 mb-1.5 font-bold">INVENTORY</p>
        <div className="flex gap-1.5">
          {char.items.map((item, i) => {
            const isSig = item?.isSignature;
            const tc = item ? TIER_COLOR[item.tier] : '';
            return (
              <div
                key={i}
                className="flex-1 h-9 rounded-lg border flex items-center justify-center text-sm relative"
                style={{
                  background: isSig ? 'rgba(40,25,5,0.95)' : item ? 'rgba(10,6,30,0.9)' : 'rgba(8,5,20,0.6)',
                  borderColor: isSig ? '#f59e0b' : item ? tc + '80' : 'rgba(80,55,130,0.40)',
                  boxShadow: isSig ? `0 0 14px rgba(245,158,11,0.55), inset 0 0 8px rgba(245,158,11,0.15)`
                    : item && itemTooltip?.item === item ? `0 0 12px ${tc}70`
                    : item ? `0 0 6px ${tc}35`
                    : 'inset 0 0 8px rgba(80,55,130,0.12)',
                }}
                onMouseEnter={item ? (e) => setItemTooltip({ item, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
                onMouseLeave={() => setItemTooltip(null)}
              >
                {item ? item.icon : <span className="text-slate-700 text-[10px]">—</span>}
                {isSig && <span className="absolute -top-1 -right-1 text-[8px]" style={{ filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.8))' }}>⭐</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item tooltip portal */}
      {itemTooltip && createPortal(
        <div
          className="pointer-events-none z-[9999]"
          style={{
            position: 'fixed',
            left: Math.min(Math.max(itemTooltip.rect.left + itemTooltip.rect.width / 2, 125), (typeof window !== 'undefined' ? window.innerWidth : 1200) - 125),
            top: itemTooltip.rect.top < 220 ? itemTooltip.rect.bottom + 8 : itemTooltip.rect.top - 8,
            transform: itemTooltip.rect.top < 220 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            minWidth: 180,
            maxWidth: 240,
          }}
        >
          <div style={{
            background: 'rgba(6,3,22,0.97)',
            border: `1px solid ${TIER_COLOR[itemTooltip.item.tier]}50`,
            borderRadius: 10,
            padding: '10px 12px',
            boxShadow: `0 0 18px ${TIER_COLOR[itemTooltip.item.tier]}30, 0 4px 24px rgba(0,0,0,0.8)`,
          }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{itemTooltip.item.icon}</span>
              <span className="font-orbitron font-bold text-[12px] text-white">{itemTooltip.item.name}</span>
              <span className="ml-auto text-[9px] font-bold font-orbitron px-1.5 py-0.5 rounded"
                style={{ color: TIER_COLOR[itemTooltip.item.tier], background: TIER_COLOR[itemTooltip.item.tier] + '18', border: `1px solid ${TIER_COLOR[itemTooltip.item.tier]}40` }}>
                {itemTooltip.item.isSignature ? '⭐ SIGNATURE' : itemTooltip.item.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{itemTooltip.item.description}</p>
            {itemTooltip.item.targetCharacter && (
              <p className="text-[9px] mt-1.5 font-orbitron" style={{ color: EXCLUSIVE_COLOR[itemTooltip.item.targetCharacter] ?? '#94a3b8' }}>
                {itemTooltip.item.targetCharacter} exclusive
              </p>
            )}
          </div>
          {/* Arrow */}
          <div style={{
            width: 0, height: 0, margin: '0 auto',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${TIER_COLOR[itemTooltip.item.tier]}50`,
          }} />
        </div>,
        document.body
      )}
    </button>
  );
}

function DeckOverlay({ deckIds, upgradedCardDefIds, onClose }: { deckIds: string[]; upgradedCardDefIds: string[]; onClose: () => void }) {
  const { t } = useT();
  // Count total and upgraded copies per definitionId
  const totalCounts: Record<string, number> = {};
  for (const id of deckIds) totalCounts[id] = (totalCounts[id] ?? 0) + 1;
  const upgCounts: Record<string, number> = {};
  for (const id of upgradedCardDefIds) upgCounts[id] = (upgCounts[id] ?? 0) + 1;
  // Build separate entries for upgraded and non-upgraded copies of the same card
  const entries: Array<{ defId: string; count: number; isUpgraded: boolean }> = [];
  for (const id of Object.keys(totalCounts)) {
    const total = totalCounts[id];
    const upgraded = Math.min(upgCounts[id] ?? 0, total);
    const notUpgraded = total - upgraded;
    if (upgraded > 0) entries.push({ defId: id, count: upgraded, isUpgraded: true });
    if (notUpgraded > 0) entries.push({ defId: id, count: notUpgraded, isUpgraded: false });
  }
  const cardMeta = entries.map(({ defId: id, count, isUpgraded }) => {
    const upgrade = isUpgraded ? CARD_UPGRADES[id] : undefined;
    const isCurse = id.startsWith('curse_');
    const rewardEntry = CARD_REWARD_POOL.find(c => c.definitionId === id);
    const defEntry = !rewardEntry ? CARD_DEFS.find(d => d.definitionId === id) : undefined;
    const base = rewardEntry ?? (defEntry ? {
      definitionId: id,
      name: defEntry.name,
      icon: isCurse ? '💀' : '🃏',
      description: defEntry.description,
      manaCost: defEntry.manaCost,
      exclusiveTo: defEntry.exclusiveTo ?? undefined,
    } : { definitionId: id, name: id, icon: '🃏', description: '—', manaCost: 0, exclusiveTo: undefined });
    return {
      ...base,
      count,
      name: upgrade ? upgrade.upgradedName : base.name,
      description: upgrade ? (upgrade.patch.description ?? base.description) : base.description,
      isUpgraded,
      isCurse,
      upgradeLabel: upgrade?.descriptionUpgrade,
    };
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 rounded-2xl border border-slate-700/60 p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
        style={{ background: 'rgba(4,2,18,0.97)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-orbitron font-black text-xl text-white">{t.roguelike.yourDeck}</h2>
            <p className="text-slate-500 text-[11px] mt-0.5">{t.roguelike.cardsTotal.replace('{n}', String(deckIds.length))}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {cardMeta.map(card => {
            const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : null;
            return (
              <div key={`${card.definitionId}_${card.isUpgraded}`}
                className="flex items-start gap-3 rounded-xl border p-3 relative"
                style={{
                  background: card.isCurse ? 'rgba(60,3,3,0.75)' : card.isUpgraded ? 'rgba(2,20,14,0.92)' : 'rgba(8,5,25,0.85)',
                  borderColor: card.isCurse ? 'rgba(220,40,40,0.70)' : card.isUpgraded ? 'rgba(52,211,153,0.55)' : 'rgba(51,65,85,0.4)',
                  boxShadow: card.isCurse ? '0 0 14px rgba(220,40,40,0.25)' : card.isUpgraded ? '0 0 10px rgba(52,211,153,0.18)' : 'none',
                }}>
                {/* Curse badge */}
                {card.isCurse && (
                  <div className="absolute -top-2 -right-2 z-10 font-orbitron font-black text-[8px] px-1.5 py-0.5 rounded-full"
                    style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)' }}>
                    ☠ CURSE
                  </div>
                )}
                {/* Upgraded badge */}
                {!card.isCurse && card.isUpgraded && (
                  <div className="absolute -top-2 -right-2 z-10 font-orbitron font-black text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: '#065f46', color: '#34d399', border: '1px solid rgba(52,211,153,0.5)', boxShadow: '0 0 8px rgba(52,211,153,0.4)' }}>
                    ✦ +
                  </div>
                )}
                <span className="text-xl shrink-0">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-orbitron font-bold text-[12px]" style={{ color: card.isCurse ? '#fca5a5' : card.isUpgraded ? '#34d399' : '#fff' }}>{card.name}</span>
                    {card.count > 1 && (
                      <span className="text-[10px] text-cyan-400 font-bold">×{card.count}</span>
                    )}
                    {exColor && (
                      <span className="text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: exColor, background: exColor + '18', border: `1px solid ${exColor}50` }}>
                        {card.exclusiveTo}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: card.isCurse ? '#fca5a5aa' : card.isUpgraded ? '#6ee7b7' : '#94a3b8' }}>{card.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-cyan-300 font-orbitron">{t.roguelike.manaLabel.replace('{n}', String(card.manaCost))}</span>
                    {card.isUpgraded && card.upgradeLabel && (
                      <span className="text-[9px] font-orbitron font-bold" style={{ color: '#f87171' }}>▲ {card.upgradeLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CharacterDetailOverlay({ char, onClose, onAllocateStat, hasExtraItemSlot = false }: {
  char: CharacterRunState;
  onClose: () => void;
  onAllocateStat?: (stat: 'hp' | 'might' | 'power' | 'defense') => void;
  hasExtraItemSlot?: boolean;
}) {
  const { t } = useT();
  const [hoveredItem, setHoveredItem] = useState<RunItem | null>(null);
  const hpPct = char.currentHp / char.maxHp;
  const hpColor = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#f87171';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 rounded-2xl border border-slate-700/60 p-6 max-w-lg w-full"
        style={{ background: 'rgba(4,2,18,0.97)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <img src={char.portrait} alt={char.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-slate-600" />
          <div className="flex-1">
            <h2 className="font-orbitron font-black text-xl text-white">{char.displayName}</h2>
            <p className="text-purple-400 text-[11px]">{t.roguelike.levelLabel.replace('{n}', String(char.level))}</p>
            <div className="flex gap-3 mt-1 text-[11px]">
              <span className="text-purple-300">{char.xp}/{char.xpToNext} XP</span>
              {char.pendingStatPoints > 0 && <span className="text-yellow-400 font-bold">▲ {char.pendingStatPoints} {char.pendingStatPoints > 1 ? t.roguelike.statPoints : t.roguelike.statPoint}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        {/* HP */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">HP</span>
            <span style={{ color: hpColor }}>{char.currentHp}/{char.maxHp}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
          </div>
        </div>
        {/* Stat points banner */}
        {char.pendingStatPoints > 0 && (
          <div className="mb-3 rounded-lg border border-yellow-500/40 px-3 py-2 text-center"
            style={{ background: 'rgba(40,25,0,0.70)' }}>
            <p className="text-[11px] text-yellow-400 font-orbitron font-bold">
              {t.roguelike.statPts.replace('{n}', String(char.pendingStatPoints)).replace('{pts}', char.pendingStatPoints > 1 ? t.roguelike.statPoints : t.roguelike.statPoint)}
            </p>
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {([
            [t.roguelike.statLabels.might,   'might',   char.statBonuses.might,   '+5',  '#f87171'],
            [t.roguelike.statLabels.power,   'power',   char.statBonuses.power,   '+5',  '#60a5fa'],
            [t.roguelike.statLabels.defense, 'defense', char.statBonuses.defense, '+5',  '#fbbf24'],
            [t.roguelike.statLabels.hpBonus, 'hp',      char.statBonuses.hp,      '+8',  '#4ade80'],
          ] as [string, string, number, string, string][]).map(([label, statKey, bonus, btnLabel, color]) => {
            const canSpend = char.pendingStatPoints > 0 && !!onAllocateStat;
            return (
              <div key={label}
                className={`rounded-lg border p-2 text-center transition-all select-none ${canSpend ? 'cursor-pointer hover:scale-105' : ''}`}
                style={{
                  background: 'rgba(10,6,30,0.7)',
                  borderColor: canSpend ? 'rgba(234,179,8,0.50)' : 'rgba(51,65,85,0.4)',
                  boxShadow: canSpend ? '0 0 8px rgba(234,179,8,0.18)' : 'none',
                }}
                onClick={() => canSpend && onAllocateStat!(statKey as any)}>
                <p className="text-[9px] text-slate-500 font-orbitron">{label}</p>
                <p className="text-sm font-bold" style={{ color }}>+{bonus}</p>
                {canSpend && <p className="text-[8px] text-yellow-400 font-orbitron mt-0.5">{btnLabel}</p>}
              </div>
            );
          })}
        </div>
        {/* Items */}
        <div>
          <p className="font-orbitron text-[10px] text-slate-500 tracking-[0.3em] mb-3">{t.roguelike.itemSlots.replace('{n}', hasExtraItemSlot ? '7' : '6')}</p>
          <div className="flex gap-2 flex-wrap">
            {char.items.map((item, i) => (
              <div key={i}
                className="relative"
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}>
                <div className="w-12 h-12 rounded-xl border flex items-center justify-center text-xl transition-all"
                  style={{
                    background: item ? 'rgba(10,6,30,0.9)' : 'rgba(5,3,15,0.5)',
                    borderColor: item ? TIER_COLOR[item.tier] + '70' : 'rgba(80,60,120,0.3)',
                    boxShadow: item && hoveredItem === item ? `0 0 10px ${TIER_COLOR[item.tier]}60` : 'none',
                  }}>
                  {item ? item.icon : <span className="text-slate-700 text-base">·</span>}
                </div>
                {/* Tooltip */}
                {item && hoveredItem === item && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none rounded-lg border border-slate-600/60 p-3 w-52"
                    style={{ background: 'rgba(4,2,18,0.97)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{item.icon}</span>
                      <span className="font-orbitron font-bold text-sm text-white">{item.name}</span>
                    </div>
                    <span className="text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: TIER_COLOR[item.tier], background: TIER_COLOR[item.tier] + '18', border: `1px solid ${TIER_COLOR[item.tier]}40` }}>
                      {item.tier.toUpperCase()}
                    </span>
                    {item.targetCharacter && (
                      <span className="ml-1 text-[9px] font-orbitron" style={{ color: EXCLUSIVE_COLOR[item.targetCharacter] ?? '#94a3b8' }}>
                        · {t.roguelike.characterOnly.replace('{name}', item.targetCharacter)}
                      </span>
                    )}
                    <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">{item.description}</p>
                    {item.statBonus && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(item.statBonus).map(([k, v]) => v ? (
                          <span key={k} className="text-[10px] text-green-400">+{v} {k}</span>
                        ) : null)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Character names → card exclusiveTo key mapping ───────────────────────────
const CHAR_TO_EXCLUSIVE: Record<string, string> = {
  napoleon: 'Napoleon', genghis: 'Genghis', davinci: 'Da Vinci',
  leonidas: 'Leonidas', sunsin: 'Sun-sin', beethoven: 'Beethoven', huang: 'Huang-chan',
  nelson: 'Nelson', hannibal: 'Hannibal', picasso: 'Picasso', teddy: 'Teddy', mansa: 'Mansa',
  velthar: "Vel'thar", musashi: 'Musashi', cleopatra: 'Cleopatra', tesla: 'Tesla', shaka: 'Shaka',
};

function AbilityUpgradeOverlay({ char, deckIds, upgradedCardDefIds, isUltimate, onClose, onUpgrade }: {
  char: CharacterRunState;
  deckIds: string[];
  upgradedCardDefIds: string[];
  isUltimate: boolean;
  onClose: () => void;
  onUpgrade?: (defId: string) => void;
}) {
  const exclusiveKey = CHAR_TO_EXCLUSIVE[char.id] ?? '';
  // Count copies in deck for each defId
  const deckCounts: Record<string, number> = {};
  for (const id of deckIds) deckCounts[id] = (deckCounts[id] ?? 0) + 1;

  // Show ALL abilities for this character that have an upgrade and haven't been upgraded yet
  // regardless of whether they're currently in the deck
  const upgradableAbilities = CARD_DEFS.filter(d =>
    d.exclusiveTo === exclusiveKey &&
    CARD_UPGRADES[d.definitionId] &&
    !upgradedCardDefIds.includes(d.definitionId) &&
    (isUltimate ? d.type === 'ultimate' : d.type !== 'ultimate')
  );

  const accentColor = isUltimate ? '#fbbf24' : '#a855f7';
  const accentRgba = isUltimate ? 'rgba(251,191,36,0.5)' : 'rgba(168,85,247,0.5)';
  const glowRgba = isUltimate ? 'rgba(251,191,36,0.2)' : 'rgba(168,85,247,0.2)';
  const TYPE_COLOR: Record<string, string> = { attack: '#f87171', defense: '#4ade80', buff: '#60a5fa', movement: '#a78bfa', ultimate: '#fbbf24' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 rounded-2xl border p-6 max-w-lg w-full"
        style={{ background: 'rgba(4,2,18,0.97)', borderColor: accentRgba, boxShadow: `0 0 60px ${glowRgba}` }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <img src={char.portrait} alt={char.displayName} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
          <div className="flex-1">
            <div className="text-[10px] font-orbitron tracking-[0.3em] mb-0.5" style={{ color: accentColor }}>
              {isUltimate ? '⚡ ULTIMATE UPGRADE' : 'ABILITY UPGRADE'}
            </div>
            <h2 className="font-orbitron font-black text-xl text-white">{char.displayName}</h2>
            <p className="text-[11px] text-slate-400">Level {char.level} · {isUltimate ? 'Upgrade your ultimate' : 'Choose one ability to upgrade'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="text-[10px] text-center mb-4 font-orbitron tracking-widest" style={{ color: accentColor + 'aa' }}>
          ALL COPIES IN YOUR DECK WILL BE UPGRADED
        </div>

        <div className="flex flex-col gap-3">
          {upgradableAbilities.map(def => {
            const upgrade = CARD_UPGRADES[def.definitionId]!;
            const typeColor = TYPE_COLOR[def.type] ?? '#94a3b8';
            const copies = deckCounts[def.definitionId] ?? 0;
            return (
              <button
                key={def.definitionId}
                disabled={!onUpgrade}
                onClick={() => onUpgrade?.(def.definitionId)}
                className="text-left rounded-xl border p-4 transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'rgba(10,6,30,0.8)', borderColor: accentColor + '55', boxShadow: '0 0 0px transparent' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 18px ${accentColor}55`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0px transparent')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-orbitron px-1.5 py-0.5 rounded" style={{ background: typeColor + '22', color: typeColor, border: `1px solid ${typeColor}55` }}>{def.type.toUpperCase()}</span>
                  <span className="font-orbitron font-bold text-white text-[13px]">{def.name}</span>
                  <span className="ml-auto font-bold text-[13px]" style={{ color: accentColor }}>→ {upgrade.upgradedName}</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">{def.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-orbitron" style={{ color: accentColor }}>▲</span>
                    <span className="text-[11px] font-bold" style={{ color: accentColor + 'dd' }}>{upgrade.descriptionUpgrade}</span>
                  </div>
                  <span className="text-[10px] font-orbitron"
                    style={{ color: copies > 0 ? '#22d3ee' : '#475569' }}>
                    {copies > 0 ? `×${copies} in deck` : 'not in deck'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NodeTooltipPortal({
  node, sx, sy, isUnlocked,
}: { node: RunNode; sx: number; sy: number; isUnlocked: boolean }) {
  const { t } = useT();
  const meta = NODE_META[node.type];
  const nodeLabel = (t.roguelike.nodeLabels as Record<string, string>)[node.type] ?? meta.label;
  const enc = node.encounter;

  // Clamp so tooltip stays within viewport
  const W = 224;
  const rawLeft = sx + 18;
  const left = rawLeft + W > window.innerWidth ? sx - W - 18 : rawLeft;
  const top = Math.max(8, Math.min(sy - 60, window.innerHeight - 220));

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none rounded-xl border p-3 shadow-2xl"
      style={{
        background: 'rgba(4,2,18,0.97)',
        borderColor: isUnlocked ? `${meta.color}50` : 'rgba(80,60,100,0.50)',
        width: W, left, top,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{meta.icon}</span>
        <span className="font-orbitron font-bold text-sm" style={{ color: isUnlocked ? meta.color : '#64748b' }}>{nodeLabel}</span>
        {!isUnlocked && (
          <span className="ml-auto text-[8px] font-orbitron px-1.5 py-0.5 rounded"
            style={{ color: '#475569', background: 'rgba(71,85,105,0.18)', border: '1px solid rgba(71,85,105,0.35)' }}>
            LOCKED
          </span>
        )}
      </div>
      {enc && (
        <>
          <div className="text-[11px] text-slate-400 mb-1">
            <span className="text-slate-500">{t.roguelike.objectivePrefix} · </span>{enc.objectiveLabel}
          </div>
          <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            {enc.enemies.map(e => `${e.name} ×${e.count}`).join(' · ')}
          </div>
          <div className="flex gap-3 text-[11px] pt-2 border-t border-slate-700/50">
            <span className="text-yellow-400">💰 {enc.goldReward}</span>
            <span className="text-purple-400">✨ {enc.xpReward} XP</span>
          </div>
        </>
      )}
      {node.type === 'campfire' && <p className="text-[11px] text-amber-300 leading-relaxed">{t.roguelike.nodeTips.campfire}</p>}
      {node.type === 'merchant' && <p className="text-[11px] text-green-300 leading-relaxed">{t.roguelike.nodeTips.merchant}</p>}
      {node.type === 'treasure' && <p className="text-[11px] text-yellow-300 leading-relaxed">{t.roguelike.nodeTips.treasure}</p>}
      {node.type === 'unknown' && <p className="text-[11px] text-slate-400 leading-relaxed">{t.roguelike.nodeTips.unknown}</p>}
    </div>,
    document.body,
  );
}

export default function RoguelikeMap({ runState, onSelectNode, onAbandonRun, onSettings, onAllocateStat, onUpgradeAbility, onRoswellFound, fogOfWarTier = 4, hasExtraItemSlot = false }: Props) {
  const { t } = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ node: RunNode; sx: number; sy: number; isUnlocked: boolean } | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  const [detailChar, setDetailChar] = useState<CharacterRunState | null>(null);
  const [abilityUpgradeChar, setAbilityUpgradeChar] = useState<{ char: CharacterRunState; isUltimate: boolean } | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = runState.runStartTime ?? Date.now();
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [runState.runStartTime]);

  const formatRunTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };
  const { map, unlockedNodeIds, completedNodeIds, gold, act, characters, deckCardIds, permanentlyDeadIds } = runState as any;
  const displayedGold = useAnimatedNumber(gold as number);

  // Auto-open stat point overlay for the first character with pending points
  useEffect(() => {
    if (detailChar) return;
    const charWithPoints = (characters as CharacterRunState[]).find(
      c => c.pendingStatPoints > 0 && !permanentlyDeadIds?.includes(c.id)
    );
    if (charWithPoints) setDetailChar(charWithPoints);
  }, [runState.characters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open ability upgrade overlay once all stat points are spent
  useEffect(() => {
    if (detailChar || abilityUpgradeChar) return;
    const chars = characters as CharacterRunState[];
    const normalChar = chars.find(c => c.pendingAbilityUpgrades > 0 && !permanentlyDeadIds?.includes(c.id));
    if (normalChar) { setAbilityUpgradeChar({ char: normalChar, isUltimate: false }); return; }
    const ultChar = chars.find(c => c.pendingUltimateUpgrade > 0 && !permanentlyDeadIds?.includes(c.id));
    if (ultChar) setAbilityUpgradeChar({ char: ultChar, isUltimate: true });
  }, [runState.characters, detailChar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Roswell Easter Egg: 5% chance per map visit (seeded per battle), small 50s saucer in a corner ──
  const roswellSeed = runState.seed + runState.completedNodeIds.length * 1337;
  const showSaucer = !runState.isTutorialRun && (roswellSeed % 20 === 7); // ~5% per map visit
  const saucerCornerIdx = roswellSeed % 4; // 0=TL 1=TR 2=BL 3=BR
  const SAUCER_CORNERS = [
    { cx: 58,           cy: 44           }, // top-left
    { cx: SVG_W - 72,  cy: 44           }, // top-right
    { cx: 58,           cy: SVG_H - 50  }, // bottom-left
    { cx: SVG_W - 72,  cy: SVG_H - 50  }, // bottom-right
  ];
  const saucerPos = SAUCER_CORNERS[saucerCornerIdx];

  // Build a lookup for fast node position access
  const nodeById = new Map<string, RunNode>((map as RunNode[]).map(n => [n.id, n]));

  // ── Fog of war ──────────────────────────────────────────────────────────────
  // Rows ahead visible per tier: 1 / 2 / 4 / 6 / all
  const FOG_ROWS_AHEAD = [1, 2, 4, 6, MAP_ROWS + 1] as const;
  const fogRowsAhead = FOG_ROWS_AHEAD[fogOfWarTier];
  // Default to 0 so new runs always show row 0 + row 1 (current + next)
  const currentCompletedRow = (completedNodeIds as string[]).reduce(
    (max, id) => Math.max(max, nodeById.get(id)?.row ?? -1), 0
  );
  const maxVisibleRow = currentCompletedRow + fogRowsAhead;
  const isNodeFogged = (node: RunNode): boolean =>
    fogOfWarTier < 4 && node.type !== 'boss' && node.row > maxVisibleRow;

  // Build connection paths with three visual states:
  //   'done'   — source was completed (solid cyan)
  //   'active' — source is currently unlocked/available (bright purple solid)
  //   'locked' — neither (dim gray-purple dashed, still visible)
  const connPaths = (map as RunNode[]).flatMap(node =>
    node.connections.map(cid => {
      const target = nodeById.get(cid);
      if (!target) return null;
      if (isNodeFogged(node) || isNodeFogged(target)) return null;
      const srcDone     = completedNodeIds.includes(node.id);
      const srcUnlocked = unlockedNodeIds.includes(node.id);
      const state: 'done' | 'active' | 'locked' =
        srcDone ? 'done' : srcUnlocked ? 'active' : 'locked';
      return {
        key: `${node.id}-${cid}`,
        d: bezierPath(
          floorX(node.row), trackY(node.col),
          floorX(target.row), trackY(target.col),
        ),
        state,
      };
    }).filter(Boolean)
  );

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col">
      <ArenaBackground />

      {/* ── Header ── */}
      <div className="relative z-20 shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/60"
        style={{ background: 'rgba(2,4,14,0.96)' }}>

        {/* LEFT — gold + deck */}
        <div className="flex items-center gap-4">
          <button onClick={() => {}} className="flex items-center gap-2 group">
            <span className="text-xl">💰</span>
            <span className="font-orbitron font-black text-lg text-yellow-400"
              style={{ textShadow: '0 0 14px rgba(250,200,0,0.55)' }}>
              {displayedGold}
            </span>
          </button>
          <div className="h-6 w-px bg-slate-700/50" />
          <button onClick={() => setShowDeck(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group">
            <span className="text-xl">🃏</span>
            <span className="font-orbitron font-black text-lg text-cyan-400 group-hover:text-cyan-300 transition-colors"
              style={{ textShadow: '0 0 12px rgba(34,211,238,0.45)' }}>
              {deckCardIds.length}
            </span>
            <span className="font-orbitron text-[9px] text-slate-500 tracking-widest hidden sm:block">CARDS</span>
          </button>
        </div>

        {/* CENTER — run timer */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-base">⏱️</span>
            <span className="font-orbitron font-bold text-sm text-slate-300"
              style={{ textShadow: '0 0 10px rgba(148,163,184,0.35)', letterSpacing: '0.05em' }}>
              {formatRunTime(elapsed)}
            </span>
          </div>
        </div>

        {/* RIGHT — settings + abandon */}
        <div className="flex items-center gap-2">
          {onSettings && (
            <button onClick={onSettings}
              className="font-orbitron text-[11px] text-slate-400 hover:text-white transition-colors border border-slate-700/50 hover:border-slate-500 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span>⚙</span>
              <span className="hidden sm:block">Settings</span>
            </button>
          )}
          <button onClick={() => setConfirmAbandon(true)}
            className="font-orbitron text-[11px] font-bold tracking-wide transition-all rounded-lg px-3 py-1.5 flex items-center gap-1.5 border"
            style={{
              color: '#f87171',
              borderColor: 'rgba(239,68,68,0.40)',
              background: 'rgba(239,68,68,0.08)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.65)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.40)'; }}
          >
            <span>✕</span>
            <span>{t.roguelike.abandonRun}</span>
          </button>
        </div>
      </div>

      {/* ── Abandon Run confirm dialog ── */}
      {confirmAbandon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setConfirmAbandon(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative z-10 rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
            style={{
              background: 'rgba(8,3,22,0.98)',
              border: '1px solid rgba(239,68,68,0.45)',
              boxShadow: '0 0 60px rgba(239,68,68,0.18), 0 8px 40px rgba(0,0,0,0.8)',
              minWidth: 340,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.7))' }}>💀</div>
            <div>
              <p className="font-orbitron font-black text-xl text-white mb-1">Abandon Run?</p>
              <p className="text-slate-400 text-sm">All progress will be lost. This cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmAbandon(false)}
                className="flex-1 font-orbitron text-sm py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Keep Fighting
              </button>
              <button
                onClick={onAbandonRun}
                className="flex-1 font-orbitron text-sm font-bold py-2.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(239,68,68,0.18)',
                  border: '1px solid rgba(239,68,68,0.55)',
                  color: '#fca5a5',
                  boxShadow: '0 0 20px rgba(239,68,68,0.15)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.32)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; }}
              >
                Abandon Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* ── Left Panel — Characters ── */}
        <div
          className="shrink-0 flex flex-col overflow-y-auto py-4 px-3 gap-3"
          style={{ width: 310, background: 'rgba(2,4,14,0.92)', borderRight: '1px solid rgba(60,40,100,0.4)' }}
        >
          <p className="font-orbitron text-[8px] tracking-[0.5em] text-purple-500 px-1 mb-0.5 uppercase">{t.roguelike.yourParty}</p>
          {(characters as CharacterRunState[]).map(c => (
            <LeftPanelCharCard
              key={c.id}
              char={c}
              isDead={(permanentlyDeadIds ?? []).includes(c.id)}
              onClick={() => setDetailChar(c)}
            />
          ))}
        </div>

        {/* ── Right Panel — Map ── */}
        <div className="flex-1 flex flex-col pt-3 pb-2 px-4 overflow-hidden">

          <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-slate-700/40"
            style={{ background: 'rgba(3,2,14,0.95)' }}>

            {/* Nebula background */}
            <div className="absolute inset-0 pointer-events-none">
              <div style={{
                position: 'absolute', inset: 0,
                background: [
                  'radial-gradient(ellipse 75% 55% at 28% 38%, rgba(88,28,135,0.28) 0%, transparent 62%)',
                  'radial-gradient(ellipse 55% 65% at 72% 28%, rgba(15,23,90,0.40) 0%, transparent 58%)',
                  'radial-gradient(ellipse 65% 50% at 52% 82%, rgba(50,5,90,0.22) 0%, transparent 55%)',
                  'radial-gradient(ellipse 40% 40% at 85% 65%, rgba(100,10,40,0.18) 0%, transparent 50%)',
                ].join(', '),
              }} />
              {/* Star field */}
              <div className="absolute inset-0 opacity-[0.055]"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
              <div className="absolute inset-0 opacity-[0.035]"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '58px 58px', backgroundPosition: '13px 13px' }} />
            </div>

            {/* Act name — centered at top of the map canvas */}
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-3 pointer-events-none z-10">
              <p className="font-orbitron text-[9px] tracking-[0.45em] text-slate-500 uppercase mb-0.5">
                ACT {act}
              </p>
              <h2 className="font-orbitron font-black text-xl tracking-wider text-white"
                style={{ textShadow: '0 0 28px rgba(168,85,247,0.65), 0 0 60px rgba(88,28,135,0.35)' }}>
                {t.roguelike.actNames[(act as number) - 1] ?? ''}
              </h2>
            </div>

            {/* Node type legend — bottom of map, inside the canvas */}
            <div className="absolute bottom-2 left-3 right-3 pointer-events-none z-10 flex items-center gap-3 flex-wrap">
              {Object.entries(NODE_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-1.5">
                  {/* Mini hex icon */}
                  <svg width="14" height="14" viewBox="-7 -7 14 14" style={{ flexShrink: 0 }}>
                    <polygon
                      points={hexPoints(0, 0, 5.5).split(' ').join(' ')}
                      fill={meta.color + '22'}
                      stroke={meta.color}
                      strokeWidth="1"
                    />
                    <g style={{ pointerEvents: 'none' }}>
                      {(NODE_ICONS[type] ?? NODE_ICONS.unknown)(meta.color, 4.5)}
                    </g>
                  </svg>
                  <span className="font-orbitron text-[7px] tracking-wide" style={{ color: meta.color + 'cc' }}>
                    {(t.roguelike.nodeLabels as Record<string, string>)[type] ?? meta.label}
                  </span>
                </div>
              ))}
            </div>

            <svg
              ref={svgRef}
              data-tut="map_nodes"
              className="w-full h-full"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="map-line-glow" x="-60%" y="-200%" width="220%" height="500%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="map-node-glow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <style>{`
                  @keyframes map-dash-flow {
                    from { stroke-dashoffset: 26; }
                    to   { stroke-dashoffset: 0; }
                  }
                `}</style>
              </defs>

              {/* ── LAYER 1: locked paths — visible but unlit (map structure stays readable) ── */}
              {connPaths.filter(p => p?.state === 'locked').map(p => p && (
                <path
                  key={p.key}
                  d={p.d}
                  fill="none"
                  stroke="rgba(130,85,195,0.50)"
                  strokeWidth="2.5"
                  strokeDasharray="7,6"
                  strokeLinecap="round"
                />
              ))}

              {/* ── LAYER 2: active paths — same unlit style (available but not highlighted) ── */}
              {connPaths.filter(p => p?.state === 'active').map(p => p && (
                <path
                  key={p.key}
                  d={p.d}
                  fill="none"
                  stroke="rgba(130,85,195,0.50)"
                  strokeWidth="2.5"
                  strokeDasharray="7,6"
                  strokeLinecap="round"
                />
              ))}

              {/* ── LAYER 3: done paths — flowing cyan dash (left→right) ── */}
              {connPaths.filter(p => p?.state === 'done').map(p => p && (
                <g key={p.key}>
                  {/* Solid dim base */}
                  <path
                    d={p.d}
                    fill="none"
                    stroke="rgba(34,211,238,0.30)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Animated flowing dash overlay */}
                  <path
                    d={p.d}
                    fill="none"
                    stroke="rgba(34,211,238,0.90)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="13,13"
                    filter="url(#map-line-glow)"
                    style={{ animation: 'map-dash-flow 1.4s linear infinite' }}
                  />
                </g>
              ))}

              {/* ── LAYER 4: Nodes ── */}
              {(map as RunNode[]).map(node => {
                const meta = NODE_META[node.type];
                const isUnlocked = unlockedNodeIds.includes(node.id);
                const isDone = completedNodeIds.includes(node.id);
                const isBoss = node.type === 'boss';
                const isHov = hoveredInfo?.node.id === node.id;
                const cx = floorX(node.row);
                const cy = trackY(node.col);
                const r = isBoss ? BOSS_R : NODE_R;
                const inFog = isNodeFogged(node);

                if (inFog) return <g key={node.id} />;

                // Three opacity tiers — locked nodes are clearly visible now
                const opacity = isDone ? 0.50 : isUnlocked ? 1.0 : 0.58;

                // Stroke: locked uses a visible muted purple instead of near-black
                const strokeColor = isDone
                  ? 'rgba(34,211,238,0.55)'
                  : isUnlocked
                    ? meta.color
                    : 'rgba(120,85,170,0.70)';

                const strokeW = isDone ? 2 : isUnlocked ? (isBoss ? 3.5 : 2.5) : 1.5;

                const fillColor = isDone
                  ? '#07021a'
                  : isUnlocked ? (isBoss ? '#1a040e' : '#08041e') : '#060318';

                return (
                  <g
                    key={node.id}
                    style={{ cursor: isUnlocked && !isDone ? 'pointer' : 'default' }}
                    opacity={opacity}
                    onClick={() => isUnlocked && !isDone && onSelectNode(node.id)}
                    onMouseEnter={() => {
                      if (!svgRef.current || isDone) return;
                      const { x, y } = svgToScreen(svgRef.current, cx, cy);
                      setHoveredInfo({ node, sx: x, sy: y, isUnlocked });
                    }}
                    onMouseLeave={() => setHoveredInfo(null)}
                  >
                    {/* Pulsing availability ring — only for unlocked (available to enter) nodes */}
                    {isUnlocked && !isDone && (
                      <>
                        <circle
                          cx={cx} cy={cy} r={r + 4}
                          fill="none"
                          stroke={meta.color}
                          strokeWidth="1.5"
                          opacity="0"
                          style={{ animation: 'anim-map-available-pulse 2.2s ease-out infinite' }}
                        />
                        <circle
                          cx={cx} cy={cy} r={r + 4}
                          fill="none"
                          stroke={meta.color}
                          strokeWidth="1"
                          opacity="0"
                          style={{ animation: 'anim-map-available-pulse 2.2s ease-out 1.1s infinite' }}
                        />
                      </>
                    )}

                    {/* Glow halo — unlocked only, now breathing */}
                    {isUnlocked && !isDone && (
                      <polygon
                        points={hexPoints(cx, cy, r + (isHov ? 14 : 6))}
                        fill={meta.glow}
                        filter="url(#map-node-glow)"
                        opacity={isHov ? 0.80 : 0.35}
                        style={{ animation: isHov ? 'none' : 'anim-map-node-breathe 2.5s ease-in-out infinite' }}
                      />
                    )}

                    {/* Completed node shimmer — subtle energy ripple */}
                    {isDone && (
                      <polygon
                        points={hexPoints(cx, cy, r + 3)}
                        fill="none"
                        stroke="rgba(34,211,238,0.30)"
                        strokeWidth="1"
                        style={{ animation: 'anim-map-done-shimmer 3s ease-in-out infinite' }}
                      />
                    )}

                    {/* Boss: dim glow when locked — now with menacing throb */}
                    {isBoss && !isUnlocked && !isDone && (
                      <circle cx={cx} cy={cy} r={r + 10}
                        fill="rgba(244,63,94,0.18)"
                        filter="url(#map-node-glow)"
                        style={{ animation: 'anim-map-boss-locked-throb 3s ease-in-out infinite' }}
                      />
                    )}

                    {/* Boss pulse rings (only when unlocked) */}
                    {isBoss && isUnlocked && !isDone && (
                      <>
                        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="rgba(244,63,94,0.60)" strokeWidth="2.5">
                          <animate attributeName="r" from={r + 5} to={r + 22} dur="1.6s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.7" to="0" dur="1.6s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="rgba(244,63,94,0.30)" strokeWidth="1.5">
                          <animate attributeName="r" from={r + 5} to={r + 34} dur="1.6s" begin="0.6s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" begin="0.6s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}

                    {/* Main hex badge */}
                    <polygon
                      points={hexPoints(cx, cy, r)}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                    />
                    {/* Inner hex ring for depth */}
                    {!isDone && (
                      <polygon
                        points={hexPoints(cx, cy, r * 0.72)}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeW * 0.35}
                        opacity={0.35}
                      />
                    )}

                    {/* Icon */}
                    <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
                      {isDone ? (
                        <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
                          fontSize={isBoss ? 22 : 13} fontWeight={900}
                          fill="#22d3ee" fontFamily="'Orbitron', monospace"
                          style={{ userSelect: 'none' }}>✓</text>
                      ) : (
                        (NODE_ICONS[node.type] ?? NODE_ICONS.unknown)(
                          isUnlocked ? meta.color : strokeColor,
                          isBoss ? r * 0.72 : r * 0.68
                        )
                      )}
                    </g>

                    {/* FINAL BOSS label — always shown, dimmer when locked */}
                    {isBoss && !isDone && (
                      <text
                        x={cx} y={cy - r - 13}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={9}
                        fill={isUnlocked ? '#f43f5e' : 'rgba(180,40,60,0.55)'}
                        fontFamily="monospace"
                        letterSpacing="2.5"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        FINAL BOSS
                      </text>
                    )}

                    {/* Boss star-spike ring — 8-point star around the node circle */}
                    {isBoss && isUnlocked && !isDone && (() => {
                      const spikes = 8;
                      const outerR = r + 16;
                      const innerR = r + 6;
                      const pts = Array.from({ length: spikes * 2 }, (_, i) => {
                        const angle = (Math.PI * i) / spikes - Math.PI / 2;
                        const rad = i % 2 === 0 ? outerR : innerR;
                        return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
                      }).join(' ');
                      return (
                        <polygon
                          points={pts}
                          fill="none"
                          stroke="rgba(244,63,94,0.70)"
                          strokeWidth="1.5"
                          style={{ animation: 'anim-map-boss-pulse 1.8s ease-in-out infinite' }}
                        />
                      );
                    })()}


                    {/* Hover ring */}
                    {isHov && isUnlocked && !isDone && (
                      <circle
                        cx={cx} cy={cy} r={r + 6}
                        fill="none"
                        stroke={meta.color}
                        strokeWidth="2.5"
                        opacity="0.75"
                      />
                    )}
                  </g>
                );
              })}

              {/* ── LAYER 5: Roswell Easter Egg — 5% chance per run ── */}
              {showSaucer && (
                <g
                  transform={`translate(${saucerPos.cx}, ${saucerPos.cy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onRoswellFound?.()}
                >
                  {/* Green underlight glow */}
                  <ellipse cx={0} cy={8} rx={40} ry={10} fill="rgba(0,255,100,0.12)" />
                  {/* Saucer body */}
                  <ellipse cx={0} cy={5} rx={36} ry={13} fill="#b8c8b8" stroke="#7a9a7a" strokeWidth="1.2" />
                  {/* Equatorial rim ring */}
                  <ellipse cx={0} cy={5} rx={36} ry={6} fill="none" stroke="rgba(100,200,120,0.55)" strokeWidth="2" />
                  {/* Porthole lights */}
                  <circle cx={-20} cy={5} r={2.8} fill="#00ee77" opacity="0.85" />
                  <circle cx={0}   cy={3} r={2.8} fill="#00ee77" opacity="0.85" />
                  <circle cx={20}  cy={5} r={2.8} fill="#00ee77" opacity="0.85" />
                  {/* Dome */}
                  <ellipse cx={0} cy={-5} rx={15} ry={11} fill="rgba(190,230,255,0.45)" stroke="rgba(160,210,255,0.75)" strokeWidth="1" />
                  {/* Dome highlight */}
                  <ellipse cx={-4} cy={-8} rx={5} ry={3} fill="rgba(255,255,255,0.28)" />
                </g>
              )}
            </svg>

            {/* Portal tooltip for hovered node */}
            {hoveredInfo && (
              <NodeTooltipPortal
                node={hoveredInfo.node}
                sx={hoveredInfo.sx}
                sy={hoveredInfo.sy}
                isUnlocked={hoveredInfo.isUnlocked}
              />
            )}
          </div>
        </div>
      </div>

      {/* Deck viewer overlay */}
      {showDeck && <DeckOverlay deckIds={deckCardIds} upgradedCardDefIds={runState.upgradedCardDefIds} onClose={() => setShowDeck(false)} />}

      {/* Character detail overlay */}
      {detailChar && (
        <CharacterDetailOverlay
          char={detailChar}
          onClose={() => setDetailChar(null)}
          hasExtraItemSlot={hasExtraItemSlot}
          onAllocateStat={onAllocateStat ? (stat) => {
            onAllocateStat(detailChar.id as CharacterId, stat);
            const remaining = detailChar.pendingStatPoints - 1;
            const updated = { ...detailChar, pendingStatPoints: remaining, statBonuses: { ...detailChar.statBonuses, [stat]: detailChar.statBonuses[stat] + (stat === 'hp' ? 8 : 5) }, maxHp: stat === 'hp' ? detailChar.maxHp + 8 : detailChar.maxHp, currentHp: stat === 'hp' ? detailChar.currentHp + 8 : detailChar.currentHp };
            if (remaining > 0) {
              setDetailChar(updated);
            } else {
              // Check if another character still has points
              const next = (characters as CharacterRunState[]).find(
                c => c.id !== detailChar.id && c.pendingStatPoints > 0 && !permanentlyDeadIds?.includes(c.id)
              );
              setDetailChar(next ?? null);
            }
          } : undefined}
        />
      )}

      {/* Ability upgrade overlay */}
      {abilityUpgradeChar && (
        <AbilityUpgradeOverlay
          char={abilityUpgradeChar.char}
          deckIds={deckCardIds}
          upgradedCardDefIds={runState.upgradedCardDefIds}
          isUltimate={abilityUpgradeChar.isUltimate}
          onClose={() => setAbilityUpgradeChar(null)}
          onUpgrade={onUpgradeAbility ? (defId) => {
            const { char: aChar, isUltimate } = abilityUpgradeChar;
            onUpgradeAbility(aChar.id as CharacterId, defId, isUltimate);
            const remainingNormal = isUltimate ? aChar.pendingAbilityUpgrades : aChar.pendingAbilityUpgrades - 1;
            const remainingUlt = isUltimate ? aChar.pendingUltimateUpgrade - 1 : aChar.pendingUltimateUpgrade;
            const updatedChar = { ...aChar, pendingAbilityUpgrades: remainingNormal, pendingUltimateUpgrade: remainingUlt, upgradedAbilityIds: [...aChar.upgradedAbilityIds, defId] };
            if (!isUltimate && remainingNormal > 0) { setAbilityUpgradeChar({ char: updatedChar, isUltimate: false }); return; }
            if (isUltimate && remainingUlt > 0) { setAbilityUpgradeChar({ char: updatedChar, isUltimate: true }); return; }
            const chars = characters as CharacterRunState[];
            const nextNormal = chars.find(c => c.id !== aChar.id && c.pendingAbilityUpgrades > 0 && !permanentlyDeadIds?.includes(c.id));
            if (nextNormal) { setAbilityUpgradeChar({ char: nextNormal, isUltimate: false }); return; }
            const nextUlt = chars.find(c => c.id !== aChar.id && c.pendingUltimateUpgrade > 0 && !permanentlyDeadIds?.includes(c.id));
            setAbilityUpgradeChar(nextUlt ? { char: nextUlt, isUltimate: true } : null);
          } : undefined}
        />
      )}
    </div>
  );
}
