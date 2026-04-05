// src/components/RoguelikeMap.tsx
import React, { useState } from "react";
import { RunState, RunNode, CharacterRunState, RunItem, CharacterId } from "@/types/roguelike";
import { CARD_REWARD_POOL } from "@/data/roguelikeData";
import ArenaBackground from "@/ui/ArenaBackground";

interface Props {
  runState: RunState;
  onSelectNode: (nodeId: string) => void;
  onAbandonRun: () => void;
  onAllocateStat?: (characterId: CharacterId, stat: 'hp' | 'might' | 'power' | 'defense') => void;
}

const TOTAL_ROWS = 12; // rows 0–11, row 11 = boss

// 5-column grid — StS style positions
const COL_PCT: Record<number, number> = { 0: 10, 1: 27.5, 2: 50, 3: 72.5, 4: 90 };
function nodeXPct(col: number, _rowCount: number): number {
  return COL_PCT[col] ?? 50;
}

function rowYPct(row: number): number {
  // row 0 = bottom (92%), row 11 = top (4%)
  return 92 - (row / (TOTAL_ROWS - 1)) * 88;
}

const NODE_META: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  enemy:    { icon: '⚔️',  label: 'Enemy',      color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },
  elite:    { icon: '💀',  label: 'Elite',      color: '#f97316', glow: 'rgba(249,115,22,0.6)' },
  campfire: { icon: '🔥',  label: 'Campfire',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
  merchant: { icon: '🛒',  label: 'Merchant',   color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },
  treasure: { icon: '📦',  label: 'Treasure',   color: '#eab308', glow: 'rgba(234,179,8,0.6)' },
  unknown:  { icon: '❓',  label: 'Unknown',    color: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
  boss:     { icon: '💀',  label: 'FINAL BOSS', color: '#f43f5e', glow: 'rgba(244,63,94,1.0)' },
};

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};
const EXCLUSIVE_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b',
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
  const hpPct = char.currentHp / char.maxHp;
  const hpColor = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#f87171';

  if (isDead) {
    return (
      <div className="w-full rounded-xl border border-red-900/40 p-3 opacity-60"
        style={{ background: 'rgba(20,4,4,0.80)' }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img src={char.portrait} alt={char.displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-red-900/50 grayscale" />
            <div className="absolute inset-0 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'rgba(0,0,0,0.55)' }}>💀</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold text-[11px] text-red-400 truncate">{char.displayName}</div>
            <div className="text-[9px] text-red-700 font-orbitron tracking-wider mt-0.5">FALLEN — ITEMS LOST</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3 transition-all hover:bg-purple-900/10"
      style={{
        background: 'rgba(6,3,22,0.80)',
        borderColor: char.pendingStatPoints > 0 ? 'rgba(234,179,8,0.70)' : 'rgba(100,80,160,0.5)',
        boxShadow: char.pendingStatPoints > 0 ? '0 0 14px rgba(234,179,8,0.28)' : 'none',
      }}
    >
      {/* Portrait + name row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="relative shrink-0">
          <img
            src={char.portrait}
            alt={char.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-slate-600/50"
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
          <div className="font-orbitron font-bold text-[11px] text-white truncate">
            {char.displayName.replace('-chan', '')}
            <span className="text-slate-500 font-normal">-chan</span>
          </div>
          <div className="text-[9px] text-purple-400 font-orbitron">Lv {char.level}</div>
        </div>
        {char.pendingStatPoints > 0 && (
          <span className="text-[9px] font-bold text-yellow-400 animate-pulse shrink-0">▲{char.pendingStatPoints}</span>
        )}
      </div>

      {/* HP bar */}
      <div className="mb-1.5">
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct * 100}%`, background: hpColor, boxShadow: `0 0 6px ${hpColor}80` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-slate-500">{char.currentHp}/{char.maxHp} HP</span>
          <span className="text-[9px]" style={{ color: hpColor }}>{Math.round(hpPct * 100)}%</span>
        </div>
      </div>

      {/* Item slots */}
      <div className="flex gap-1 mt-2">
        {char.items.map((item, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs"
            style={{
              background: item ? 'rgba(10,6,30,0.9)' : 'rgba(5,3,15,0.4)',
              borderColor: item ? TIER_COLOR[item.tier] + '60' : 'rgba(60,40,100,0.3)',
            }}
            title={item ? item.name : 'Empty slot'}
          >
            {item ? item.icon : <span className="text-slate-700 text-[10px]">·</span>}
          </div>
        ))}
      </div>
    </button>
  );
}

function DeckOverlay({ deckIds, onClose }: { deckIds: string[]; onClose: () => void }) {
  // Count duplicates
  const counts: Record<string, number> = {};
  for (const id of deckIds) counts[id] = (counts[id] ?? 0) + 1;
  const unique = Object.keys(counts);
  const cardMeta = unique.map(id => {
    const found = CARD_REWARD_POOL.find(c => c.definitionId === id);
    return found ?? { definitionId: id, name: id, icon: '🃏', description: '—', manaCost: 0, exclusiveTo: undefined };
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 rounded-2xl border border-slate-700/60 p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
        style={{ background: 'rgba(4,2,18,0.97)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-orbitron font-black text-xl text-white">Your Deck</h2>
            <p className="text-slate-500 text-[11px] mt-0.5">{deckIds.length} cards total</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {cardMeta.map(card => {
            const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : null;
            return (
              <div key={card.definitionId}
                className="flex items-start gap-3 rounded-xl border border-slate-700/40 p-3"
                style={{ background: 'rgba(8,5,25,0.85)' }}>
                <span className="text-xl shrink-0">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-orbitron font-bold text-[12px] text-white">{card.name}</span>
                    {counts[card.definitionId] > 1 && (
                      <span className="text-[10px] text-cyan-400 font-bold">×{counts[card.definitionId]}</span>
                    )}
                    {exColor && (
                      <span className="text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: exColor, background: exColor + '18', border: `1px solid ${exColor}50` }}>
                        {card.exclusiveTo}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{card.description}</p>
                  <span className="text-[10px] text-cyan-300 font-orbitron">{card.manaCost} Mana</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CharacterDetailOverlay({ char, onClose, onAllocateStat }: {
  char: CharacterRunState;
  onClose: () => void;
  onAllocateStat?: (stat: 'hp' | 'might' | 'power' | 'defense') => void;
}) {
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
            <p className="text-purple-400 text-[11px]">Level {char.level}</p>
            <div className="flex gap-3 mt-1 text-[11px]">
              <span className="text-purple-300">{char.xp}/{char.xpToNext} XP</span>
              {char.pendingStatPoints > 0 && <span className="text-yellow-400 font-bold">▲ {char.pendingStatPoints} stat pts</span>}
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
              ▲ {char.pendingStatPoints} stat point{char.pendingStatPoints > 1 ? 's' : ''} — click a stat to spend
            </p>
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {([
            ['Might',    'might',   char.statBonuses.might,   '+5',  '#f87171'],
            ['Power',    'power',   char.statBonuses.power,   '+5',  '#60a5fa'],
            ['Defense',  'defense', char.statBonuses.defense, '+5',  '#fbbf24'],
            ['HP Bonus', 'hp',      char.statBonuses.hp,      '+8',  '#4ade80'],
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
          <p className="font-orbitron text-[10px] text-slate-500 tracking-[0.3em] mb-3">ITEMS (5 slots)</p>
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none rounded-lg border border-slate-600/60 p-3 w-52"
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
                        · {item.targetCharacter} only
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

function NodeTooltip({ node, side }: { node: RunNode; side: 'left' | 'right' }) {
  const meta = NODE_META[node.type];
  const enc = node.encounter;
  const left = side === 'left' ? '110%' : 'auto';
  const right = side === 'right' ? '110%' : 'auto';
  return (
    <div className="absolute z-50 pointer-events-none rounded-xl border border-slate-600/60 p-3 w-56 shadow-2xl"
      style={{ background: 'rgba(4,2,18,0.97)', top: '50%', transform: 'translateY(-50%)', left, right }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{meta.icon}</span>
        <span className="font-orbitron font-bold text-sm" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      {enc && (
        <>
          <div className="text-[11px] text-slate-400 mb-1">
            <span className="text-slate-500">Objective · </span>{enc.objectiveLabel}
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
      {node.type === 'campfire' && <p className="text-[11px] text-amber-300 leading-relaxed">Rest here to heal 30% HP.</p>}
      {node.type === 'merchant' && <p className="text-[11px] text-green-300 leading-relaxed">Spend gold on cards, items, or healing.</p>}
      {node.type === 'treasure' && <p className="text-[11px] text-yellow-300 leading-relaxed">Discover a free item or card.</p>}
      {node.type === 'unknown' && <p className="text-[11px] text-slate-400 leading-relaxed">Unknown — could be anything.</p>}
    </div>
  );
}

export default function RoguelikeMap({ runState, onSelectNode, onAbandonRun, onAllocateStat }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  const [detailChar, setDetailChar] = useState<CharacterRunState | null>(null);
  const { map, unlockedNodeIds, completedNodeIds, gold, act, characters, deckCardIds, permanentlyDeadIds } = runState as any;

  // Pre-compute positions as percentages
  const getPos = (node: RunNode) => ({
    xPct: nodeXPct(node.col, node.rowCount),
    yPct: rowYPct(node.row),
  });

  // Build connection line data
  const lines = map.flatMap(node => {
    const from = getPos(node);
    return node.connections.map(cid => {
      const target = map.find(n => n.id === cid);
      if (!target) return null;
      const to = getPos(target);
      const pathDone = completedNodeIds.includes(node.id);
      return {
        key: `${node.id}-${cid}`,
        x1: from.xPct, y1: from.yPct,
        x2: to.xPct, y2: to.yPct,
        done: pathDone,
      };
    }).filter(Boolean);
  });

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col">
      <ArenaBackground />

      {/* ── Simplified Header ── */}
      <div className="relative z-20 shrink-0 flex items-center gap-4 px-5 py-2 border-b border-slate-800/60"
        style={{ background: 'rgba(2,4,14,0.94)' }}>
        {/* Act + title */}
        <div className="shrink-0">
          <span className="font-orbitron text-[10px] text-slate-500 tracking-widest">ACT {act}</span>
          <span className="font-orbitron text-[10px] text-slate-600 tracking-widest ml-2">
            · {act === 1 ? 'ZNYXORGA MENAGERIE' : act === 2 ? 'ZNYXORGA ARENA' : "CHAMPION'S GAUNTLET"}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-700/60 mx-1" />

        {/* Spacer — characters are now in left panel */}
        <div className="flex-1" />

        {/* Gold */}
        <span className="font-orbitron text-sm font-bold text-yellow-400 shrink-0">💰 {gold}</span>

        <div className="h-5 w-px bg-slate-700/60 mx-1" />

        {/* Deck count — clickable */}
        <button onClick={() => setShowDeck(true)}
          className="font-orbitron text-[10px] text-slate-400 hover:text-cyan-300 transition-colors shrink-0 border border-slate-700/40 hover:border-cyan-500/40 rounded px-2 py-1">
          🃏 <span className="text-cyan-400 font-bold">{deckCardIds.length}</span> cards
        </button>

        {/* Abandon */}
        <button onClick={onAbandonRun}
          className="font-orbitron text-[9px] text-slate-500 hover:text-red-400 transition-colors tracking-widest border border-slate-700/40 hover:border-red-500/40 rounded px-3 py-1.5 shrink-0">
          ABANDON RUN
        </button>
      </div>

      {/* ── Two-column body ── */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* ── Left Panel — Characters ── */}
        <div
          className="shrink-0 flex flex-col overflow-y-auto py-4 px-3 gap-3"
          style={{
            width: 280,
            background: 'rgba(2,4,14,0.92)',
            borderRight: '1px solid rgba(60,40,100,0.4)',
          }}
        >
          <p className="font-orbitron text-[9px] tracking-[0.45em] text-purple-500 px-1 mb-1">YOUR PARTY</p>
          {characters.map((c: CharacterRunState) => (
            <LeftPanelCharCard
              key={c.id}
              char={c}
              isDead={(permanentlyDeadIds ?? []).includes(c.id)}
              onClick={() => setDetailChar(c)}
            />
          ))}

          {/* Legend at bottom of left panel */}
          <div className="mt-auto pt-4 border-t border-slate-800/60">
            <p className="font-orbitron text-[8px] tracking-[0.35em] text-slate-600 mb-2">NODE TYPES</p>
            <div className="flex flex-col gap-1">
              {Object.entries(NODE_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-[12px] w-5 text-center">{meta.icon}</span>
                  <span className="text-[9px] font-orbitron" style={{ color: meta.color }}>{meta.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel — Map tree ── */}
        <div className="flex-1 flex flex-col pt-3 pb-2 px-4 overflow-hidden">
          <p className="font-orbitron text-[9px] tracking-[0.55em] text-purple-400 mb-2 shrink-0 text-center">CHOOSE YOUR PATH</p>

          {/* Map container — flex-1, no max-width restriction */}
          <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-slate-700/40"
            style={{ background: 'rgba(5,3,18,0.88)' }}>

            {/* Subtle grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {/* SVG connection lines — percentage viewBox */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {lines.map(l => l && (
                <line key={l.key}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.done ? 'rgba(34,211,238,0.80)' : 'rgba(148,100,220,0.55)'}
                  strokeWidth={l.done ? 0.8 : 0.6}
                  strokeDasharray={l.done ? '' : '1.8,1.4'}
                  filter="url(#glow-line)"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {/* Nodes — positioned with percentages */}
            {map.map(node => {
              const { xPct, yPct } = getPos(node);
              const meta = NODE_META[node.type];
              const isUnlocked = unlockedNodeIds.includes(node.id);
              const isDone = completedNodeIds.includes(node.id);
              const isHov = hovered === node.id;
              const isBoss = node.type === 'boss';
              const size = isBoss ? 80 : 34;

              const tooltipSide: 'left' | 'right' = xPct > 60 ? 'right' : 'left';

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    transition: 'transform 0.12s ease',
                    transform: isHov && isUnlocked && !isDone ? 'scale(1.18)' : 'scale(1)',
                    zIndex: isHov ? 30 : isBoss ? 20 : 10,
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => isUnlocked && !isDone && onSelectNode(node.id)}
                >
                  {isBoss ? (
                    /* ── Special boss node ── */
                    <div className="relative w-full h-full flex items-center justify-center select-none"
                      style={{ cursor: isUnlocked && !isDone ? 'pointer' : 'default' }}>
                      {/* Outer hex-ish shape via rotated squares */}
                      {isUnlocked && !isDone && (<>
                        <div className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: 'rgba(244,63,94,0.08)', border: '2px solid rgba(244,63,94,0.5)', animationDuration: '1.4s' }} />
                        <div className="absolute inset-[-8px] rounded-full animate-pulse"
                          style={{ border: '1.5px solid rgba(244,63,94,0.25)' }} />
                      </>)}
                      <div className="w-full h-full rounded-full flex flex-col items-center justify-center"
                        style={{
                          background: isDone
                            ? 'radial-gradient(circle, rgba(20,10,40,0.95) 0%, rgba(8,4,24,0.90) 100%)'
                            : isUnlocked
                              ? 'radial-gradient(circle, rgba(80,10,30,0.98) 0%, rgba(20,4,16,0.98) 100%)'
                              : 'rgba(4,2,12,0.70)',
                          border: isDone
                            ? '3px solid rgba(34,211,238,0.40)'
                            : isUnlocked
                              ? '3px solid #f43f5e'
                              : '2px solid rgba(120,40,60,0.40)',
                          boxShadow: isUnlocked && !isDone
                            ? `0 0 ${isHov ? 40 : 24}px rgba(244,63,94,0.9), inset 0 0 20px rgba(244,63,94,0.15)`
                            : 'none',
                          opacity: isDone ? 0.50 : isUnlocked ? 1 : 0.35,
                        }}>
                        {isDone
                          ? <span style={{ fontSize: '1.8rem' }}>✓</span>
                          : <>
                              <span style={{ fontSize: '2rem', lineHeight: 1 }}>💀</span>
                              <span className="font-orbitron font-black tracking-wider mt-0.5"
                                style={{ fontSize: '8px', color: '#f43f5e', letterSpacing: '0.15em' }}>
                                BOSS
                              </span>
                            </>
                        }
                      </div>
                    </div>
                  ) : (
                    /* ── Regular node ── */
                    <div className="w-full h-full rounded-full flex items-center justify-center relative select-none"
                      style={{
                        background: isDone
                          ? 'rgba(14,10,38,0.90)'
                          : isUnlocked
                            ? 'rgba(8,4,24,0.96)'
                            : 'rgba(4,2,12,0.75)',
                        border: isDone
                          ? '2px solid rgba(34,211,238,0.35)'
                          : isUnlocked
                            ? `2px solid ${meta.color}`
                            : '1.5px solid rgba(80,55,120,0.35)',
                        boxShadow: isUnlocked && !isDone
                          ? `0 0 ${isHov ? 20 : 9}px ${meta.glow}`
                          : 'none',
                        opacity: isDone ? 0.50 : isUnlocked ? 1 : 0.38,
                        cursor: isUnlocked && !isDone ? 'pointer' : 'default',
                        fontSize: '0.95rem',
                      }}>
                      {isDone ? '✓' : meta.icon}
                    </div>
                  )}

                  {/* Hover tooltip */}
                  {isHov && isUnlocked && !isDone && (
                    <NodeTooltip node={node} side={tooltipSide} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deck viewer overlay */}
      {showDeck && <DeckOverlay deckIds={deckCardIds} onClose={() => setShowDeck(false)} />}

      {/* Character detail overlay */}
      {detailChar && (
        <CharacterDetailOverlay
          char={detailChar}
          onClose={() => setDetailChar(null)}
          onAllocateStat={onAllocateStat ? (stat) => {
            onAllocateStat(detailChar.id as CharacterId, stat);
            // Refresh detailChar from characters so stat points update live
            setDetailChar(prev => prev ? { ...prev, pendingStatPoints: prev.pendingStatPoints - 1, statBonuses: { ...prev.statBonuses, [stat]: prev.statBonuses[stat] + (stat === 'hp' ? 8 : 5) }, maxHp: stat === 'hp' ? prev.maxHp + 8 : prev.maxHp, currentHp: stat === 'hp' ? prev.currentHp + 8 : prev.currentHp } : null);
          } : undefined}
        />
      )}
    </div>
  );
}
