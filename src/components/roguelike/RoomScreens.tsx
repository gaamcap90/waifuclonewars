// src/components/roguelike/RoomScreens.tsx
import React, { useState, useMemo } from "react";
import { RunState, RunItem, CharacterId, CardReward } from "@/types/roguelike";
import { CARD_REWARD_POOL, pickCardRewards, pickItemReward } from "@/data/roguelikeData";
import { CARD_DEFS, CARD_UPGRADES } from "@/data/cards";
import ArenaBackground from "@/ui/ArenaBackground";

// ── Shared styles ─────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(4,2,18,0.97)',
  border: '1px solid rgba(80,50,140,0.5)',
};

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};

const EXCLUSIVE_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b',
  'Sun-sin': '#06b6d4', Beethoven: '#8b5cf6', 'Huang-chan': '#b45309',
};

function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <ArenaBackground />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4">
        {children}
      </div>
    </div>
  );
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
  return (
    <div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-slate-500">{current}/{max} HP</span>
        <span className="text-[10px]" style={{ color }}>{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

// ── CampfireScreen ────────────────────────────────────────────────────────────

export interface CampfireScreenProps {
  runState: RunState;
  onHealAll: () => void;
  onRemoveCard: (cardId: string) => void;
  onUpgradeSharedCard: (defId: string) => void;
  onLeave: () => void;
}

type CampfirePhase = 'choose' | 'remove_card' | 'upgrade_shared';

export function CampfireScreen({ runState, onHealAll, onRemoveCard, onUpgradeSharedCard, onLeave }: CampfireScreenProps) {
  const [phase, setPhase] = useState<CampfirePhase>('choose');

  // Shared cards in deck that can still be upgraded at campfire — each copy shown separately
  const upgradeableShared = useMemo(() => {
    const result: { id: string; name: string; icon: string; manaCost: number; upgradeLabel: string; copyIndex: number; totalUpgradeable: number }[] = [];
    // Count total copies of each defId in deck
    const totalCopies = new Map<string, number>();
    for (const id of runState.deckCardIds) {
      totalCopies.set(id, (totalCopies.get(id) ?? 0) + 1);
    }
    // Count already-upgraded copies of each defId
    const upgradedCopies = new Map<string, number>();
    for (const id of runState.upgradedCardDefIds) {
      upgradedCopies.set(id, (upgradedCopies.get(id) ?? 0) + 1);
    }
    // For each unique defId, emit one entry per upgradeable copy
    const seenIds = new Set<string>();
    for (const id of runState.deckCardIds) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const def = CARD_DEFS.find(d => d.definitionId === id);
      if (!def || def.exclusiveTo !== null) continue;    // shared only
      const up = CARD_UPGRADES[id];
      if (!up) continue;                                  // must have upgrade
      const total = totalCopies.get(id) ?? 0;
      const upgraded = upgradedCopies.get(id) ?? 0;
      const upgradeable = total - upgraded;
      if (upgradeable <= 0) continue;
      const icon = def.type === 'attack' ? '⚔️' : def.type === 'defense' ? '🛡️' : def.type === 'movement' ? '💨' : def.type === 'debuff' ? '☠️' : '⬆️';
      for (let i = 0; i < upgradeable; i++) {
        result.push({ id, name: def.name, icon, manaCost: def.manaCost, upgradeLabel: up.descriptionUpgrade, copyIndex: i + 1, totalUpgradeable: upgradeable });
      }
    }
    return result;
  }, [runState.deckCardIds, runState.upgradedCardDefIds]);

  // Build grouped deck list: definitionId → { name, manaCost, count }
  const deckList = useMemo(() => {
    const counts: Record<string, { name: string; manaCost: number; icon: string; count: number; isCurse: boolean }> = {};
    for (const id of runState.deckCardIds) {
      if (!counts[id]) {
        const def = CARD_DEFS.find(d => d.definitionId === id);
        counts[id] = {
          name: def?.name ?? id,
          manaCost: def?.manaCost ?? 0,
          icon: def?.type === 'attack' ? '⚔️' : def?.type === 'defense' ? '🛡️' : def?.type === 'movement' ? '💨' : def?.type === 'ultimate' ? '✨' : def?.type === 'debuff' ? '☠️' : '⬆️',
          isCurse: id.startsWith('curse_'),
          count: 0,
        };
      }
      counts[id].count++;
    }
    return Object.entries(counts).map(([id, v]) => ({ id, ...v }));
  }, [runState.deckCardIds]);

  const handleHealAll = () => {
    onHealAll();
    onLeave();
  };

  const handleRemoveCard = (cardId: string) => {
    onRemoveCard(cardId);
    onLeave();
  };

  const handleUpgradeShared = (defId: string) => {
    onUpgradeSharedCard(defId);
    onLeave();
  };

  // ── Phase: choose ──
  if (phase === 'choose') {
    const allFull = runState.characters.every(c => c.currentHp <= 0 || c.currentHp >= c.maxHp);
    const canRemove = runState.deckCardIds.length > 1;
    return (
      <ScreenWrapper>
        <div className="rounded-2xl p-8" style={PANEL_STYLE}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔥</div>
            <h1 className="font-orbitron font-black text-3xl text-white mb-1" style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              CAMPFIRE
            </h1>
            <p className="text-amber-300/70 text-sm">Choose one — then move on</p>
          </div>

          {/* Party HP summary */}
          <div className="flex flex-col gap-2 mb-6">
            {runState.characters.map(char => (
              <div key={char.id} className="rounded-xl border border-slate-700/40 p-2.5 flex items-center gap-3"
                style={{ background: 'rgba(8,5,25,0.80)' }}>
                <img src={char.portrait} alt={char.displayName} className="w-8 h-8 rounded-full object-cover border border-slate-600/50" />
                <div className="flex-1">
                  <p className="font-orbitron font-bold text-[11px] text-white">{char.displayName}</p>
                  <HpBar current={char.currentHp} max={char.maxHp} />
                </div>
              </div>
            ))}
          </div>

          {/* Two mutually exclusive actions */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Heal All */}
            <button
              onClick={handleHealAll}
              disabled={allFull}
              className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02] flex items-center gap-4"
              style={{
                background: allFull ? 'rgba(6,3,18,0.50)' : 'rgba(8,5,25,0.85)',
                borderColor: allFull ? 'rgba(80,80,100,0.25)' : 'rgba(34,197,94,0.55)',
                cursor: allFull ? 'not-allowed' : 'pointer',
                opacity: allFull ? 0.55 : 1,
              }}
            >
              <span className="text-2xl">💊</span>
              <div>
                <p className="font-orbitron font-bold text-[13px] text-green-400">Heal All Clones</p>
                <p className="text-slate-400 text-[11px]">Restore 30% max HP to every living clone.</p>
              </div>
            </button>

            {/* Remove Card */}
            <button
              onClick={() => setPhase('remove_card')}
              disabled={!canRemove}
              className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02] flex items-center gap-4"
              style={{
                background: 'rgba(8,5,25,0.85)',
                borderColor: !canRemove ? 'rgba(80,80,100,0.25)' : 'rgba(234,179,8,0.55)',
                cursor: !canRemove ? 'not-allowed' : 'pointer',
                opacity: !canRemove ? 0.55 : 1,
              }}
            >
              <span className="text-2xl">🗑️</span>
              <div>
                <p className="font-orbitron font-bold text-[13px] text-yellow-400">Remove a Card</p>
                <p className="text-slate-400 text-[11px]">Permanently remove one card from your deck.</p>
              </div>
            </button>

            {/* Upgrade Shared Card */}
            {(() => {
              const canUpgrade = upgradeableShared.length > 0;
              return (
                <button
                  onClick={() => setPhase('upgrade_shared')}
                  disabled={!canUpgrade}
                  className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02] flex items-center gap-4"
                  style={{
                    background: 'rgba(8,5,25,0.85)',
                    borderColor: !canUpgrade ? 'rgba(80,80,100,0.25)' : 'rgba(52,211,153,0.55)',
                    cursor: !canUpgrade ? 'not-allowed' : 'pointer',
                    opacity: !canUpgrade ? 0.55 : 1,
                  }}
                >
                  <span className="text-2xl">✦</span>
                  <div>
                    <p className="font-orbitron font-bold text-[13px] text-emerald-400">Upgrade a Shared Card</p>
                    <p className="text-slate-400 text-[11px]">
                      {canUpgrade
                        ? `${upgradeableShared.length} card${upgradeableShared.length > 1 ? 's' : ''} eligible — permanently upgrade one.`
                        : 'No upgradeable shared cards in your deck.'}
                    </p>
                  </div>
                </button>
              );
            })()}
          </div>

          <button
            onClick={onLeave}
            className="w-full font-orbitron font-bold py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#64748b',
            }}
          >
            Skip →
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  // ── Phase: remove_card ──
  if (phase === 'remove_card') {
    return (
      <ScreenWrapper>
        <div className="rounded-2xl p-8" style={PANEL_STYLE}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🗑️</div>
            <h1 className="font-orbitron font-black text-2xl text-white mb-1">REMOVE A CARD</h1>
            <p className="text-slate-400 text-sm">Select a card to permanently remove from your deck</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
            {deckList.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleRemoveCard(entry.id)}
                className="rounded-xl border p-3 text-left transition-all hover:scale-[1.02]"
                style={{
                  background: entry.isCurse ? 'rgba(127,29,29,0.25)' : 'rgba(8,5,25,0.85)',
                  borderColor: entry.isCurse ? 'rgba(239,68,68,0.55)' : 'rgba(80,50,140,0.45)',
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xl">{entry.icon}</span>
                  <div className="flex gap-1.5 items-center">
                    {entry.isCurse && (
                      <span className="text-[8px] font-orbitron font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
                        CURSE
                      </span>
                    )}
                    {entry.count > 1 && (
                      <span className="text-[9px] font-orbitron text-slate-400">×{entry.count}</span>
                    )}
                  </div>
                </div>
                <p className="font-orbitron font-bold text-[11px] text-white leading-tight">{entry.name}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{entry.manaCost} mana</p>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setPhase('choose')}
              className="font-orbitron text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // ── Phase: upgrade_shared ──
  if (phase === 'upgrade_shared') {
    return (
      <ScreenWrapper>
        <div className="rounded-2xl p-8" style={PANEL_STYLE}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">✦</div>
            <h1 className="font-orbitron font-black text-2xl text-white mb-1">UPGRADE A SHARED CARD</h1>
            <p className="text-slate-400 text-sm">Choose one copy to upgrade — other copies remain unchanged</p>
          </div>

          <div className="flex flex-col gap-3 mb-6 max-h-96 overflow-y-auto pr-1">
            {upgradeableShared.map((entry, idx) => {
              const up = CARD_UPGRADES[entry.id]!;
              return (
                <button
                  key={`${entry.id}-${idx}`}
                  onClick={() => handleUpgradeShared(entry.id)}
                  className="rounded-xl border p-4 text-left transition-all hover:scale-[1.01] flex items-start gap-4"
                  style={{
                    background: 'rgba(6,18,12,0.95)',
                    borderColor: 'rgba(52,211,153,0.35)',
                  }}
                >
                  <span className="text-2xl shrink-0 pt-0.5">{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-orbitron font-bold text-[13px] text-white">{entry.name}</span>
                      {entry.totalUpgradeable > 1 && (
                        <span className="font-orbitron text-[10px] text-slate-500">copy {entry.copyIndex}/{entry.totalUpgradeable}</span>
                      )}
                      <span className="font-orbitron font-bold text-[11px]" style={{ color: '#34d399' }}>→ {up.upgradedName}</span>
                      <span className="ml-auto font-orbitron text-[10px] text-slate-500 shrink-0">{entry.manaCost} Mana</span>
                    </div>
                    <p className="font-orbitron text-[9px] font-bold mb-1" style={{ color: '#34d399' }}>✦ {up.descriptionUpgrade}</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">{up.patch.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setPhase('choose')}
              className="font-orbitron text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Fallthrough (shouldn't happen)
  return null;
}

// ── MerchantScreen ────────────────────────────────────────────────────────────

export interface MerchantScreenProps {
  runState: RunState;
  onBuyCard: (cardId: string, cost: number) => void;
  onBuyHeal: (cost: number) => void;
  onDuplicateItem: (item: RunItem, characterId: CharacterId, slotIndex: number, cost: number) => void;
  onSellItem: (item: RunItem, characterId: CharacterId, slotIndex: number, goldGained: number) => void;
  onMysteryBox: (cost: number) => 'item' | 'gold' | 'damage';
  onLeave: () => void;
}

const HEAL_ALL_COST = 40;
const MYSTERY_BOX_COST = 60;
const DUPLICATE_ITEM_BASE_COST: Record<string, number> = {
  common: 30, uncommon: 50, rare: 80, legendary: 120,
};
const SELL_ITEM_PRICE: Record<string, number> = {
  common: 15, uncommon: 25, rare: 40, legendary: 60,
};

export function MerchantScreen({ runState, onBuyCard, onBuyHeal, onDuplicateItem, onSellItem, onMysteryBox, onLeave }: MerchantScreenProps) {
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [duplicatedIds, setDuplicatedIds] = useState<Set<string>>(new Set());
  const [soldSlots, setSoldSlots] = useState<Set<string>>(new Set()); // "charId:slotIdx"
  const [healPurchased, setHealPurchased] = useState(false);
  const [mysteryResult, setMysteryResult] = useState<'item' | 'gold' | 'damage' | 'curse' | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<RunItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ item: RunItem; x: number; y: number } | null>(null);

  // 3 random cards priced 50–80 gold, stable on mount
  const shopCards = useMemo<{ card: CardReward; price: number }[]>(() => {
    const rng = () => Math.random();
    const runCharIds = runState.characters.map(c => c.id);
    const picks = pickCardRewards(runState.deckCardIds, rng, runCharIds, 'merchant');
    return picks.map(card => ({
      card,
      price: 50 + Math.floor(Math.random() * 31), // 50–80
    }));
  }, []);

  // Collect all non-null items across the party for duplication
  const partyItems = useMemo<{ item: RunItem; charName: string; charPortrait: string }[]>(() => {
    const list: { item: RunItem; charName: string; charPortrait: string }[] = [];
    for (const char of runState.characters) {
      if (char.currentHp <= 0) continue;
      for (const item of char.items) {
        if (item) list.push({ item, charName: char.displayName, charPortrait: char.portrait });
      }
    }
    return list;
  }, [runState.characters]);

  const handleBuyCard = (cardId: string, price: number) => {
    if (runState.gold < price) return;
    onBuyCard(cardId, price);
    setPurchased(prev => new Set([...prev, cardId]));
  };

  const handleBuyHeal = () => {
    if (runState.gold < HEAL_ALL_COST || healPurchased) return;
    onBuyHeal(HEAL_ALL_COST);
    setHealPurchased(true);
  };

  const handleMysteryBox = () => {
    if (runState.gold < MYSTERY_BOX_COST || mysteryResult !== null) return;
    const result = onMysteryBox(MYSTERY_BOX_COST);
    setMysteryResult(result);
  };

  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8" style={PANEL_STYLE}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="font-orbitron font-black text-3xl text-white mb-1" style={{ textShadow: '0 0 30px rgba(34,197,94,0.4)' }}>
            MERCHANT
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-yellow-400 font-orbitron font-bold text-lg">💰 {runState.gold}</span>
            <span className="text-slate-500 text-sm">gold available</span>
          </div>
        </div>

        {/* Cards for sale */}
        <div className="mb-5">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-cyan-400 mb-3">CARDS FOR SALE</p>
          <div className="grid grid-cols-3 gap-4">
            {shopCards.map(({ card, price }) => {
              const bought = purchased.has(card.definitionId);
              const canAfford = runState.gold >= price && !bought;
              const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : '#4b5563';
              // Map card type to art image
              const artMap: Record<string, string> = {
                attack: '/art/cards/attack.png', defense: '/art/cards/defense.png',
                movement: '/art/cards/movement.png', ultimate: '/art/cards/ultimate.png',
                buff: '/art/cards/battle_cry.png', debuff: '/art/cards/poison_dart.png',
              };
              const artSrc = artMap[card.type ?? 'attack'] ?? '/art/cards/attack.png';
              return (
                <div key={card.definitionId} className="flex flex-col items-center"
                  style={{ opacity: bought ? 0.6 : 1 }}>
                  {/* Card frame */}
                  <div className="relative rounded-xl overflow-hidden flex flex-col w-full"
                    style={{
                      background: `linear-gradient(160deg, #0f1118 0%, #060810 100%)`,
                      border: `2px solid ${exColor}55`,
                      boxShadow: canAfford ? `0 0 14px ${exColor}30, 0 4px 16px rgba(0,0,0,0.7)` : '0 2px 8px rgba(0,0,0,0.5)',
                      minHeight: 180,
                    }}>
                    {/* Art */}
                    <div className="relative w-full" style={{ height: 90, overflow: 'hidden' }}>
                      <img src={artSrc} alt="" className="w-full h-full object-cover"
                        style={{ opacity: 0.52, filter: 'brightness(0.9)' }} />
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 40%, rgba(6,3,22,0.92) 100%)`
                      }} />
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(to top, ${exColor}30 0%, transparent 50%)`,
                      }} />
                      {/* Character ribbon */}
                      <div className="absolute top-0 left-0 right-0 px-2 py-1 flex items-center justify-between"
                        style={{ background: `linear-gradient(90deg, ${exColor}cc 0%, ${exColor}55 100%)` }}>
                        <span className="font-orbitron text-[8px] font-bold text-white/90 truncate">
                          {card.exclusiveTo ?? 'SHARED'}
                        </span>
                        <span className="text-[10px]">{card.icon}</span>
                      </div>
                      {/* Inner frame */}
                      <div className="absolute inset-[3px] rounded-lg pointer-events-none"
                        style={{ border: `1px solid ${exColor}30` }} />
                    </div>
                    {/* Text body */}
                    <div className="px-2.5 pt-1.5 pb-2 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-orbitron font-bold text-[11px] text-white leading-tight">{card.name}</p>
                        {card.rarity && (() => {
                          const rc: Record<string,string> = { common:'#94a3b8', uncommon:'#22c55e', rare:'#60a5fa', ultimate:'#f59e0b' };
                          const cl = rc[card.rarity] ?? '#94a3b8';
                          return (
                            <span className="font-orbitron text-[7px] font-bold px-1 py-0.5 rounded ml-1 shrink-0"
                              style={{ color: cl, background: cl + '18' }}>
                              {card.rarity.toUpperCase()}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-slate-400 text-[10px] leading-snug flex-1 mb-2.5">{card.description}</p>
                      <button
                        onClick={() => handleBuyCard(card.definitionId, price)}
                        disabled={!canAfford}
                        className="font-orbitron text-[10px] font-bold py-1.5 rounded-lg border transition-all w-full hover:scale-[1.02] active:scale-95"
                        style={{
                          background: bought ? 'transparent' : canAfford ? `${exColor}18` : 'rgba(20,15,35,0.6)',
                          borderColor: bought ? '#475569' : canAfford ? `${exColor}70` : 'rgba(60,50,80,0.4)',
                          color: bought ? '#475569' : canAfford ? exColor : '#64748b',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          boxShadow: canAfford && !bought ? `0 0 8px ${exColor}25` : 'none',
                        }}
                      >
                        {bought ? '✓ BOUGHT' : `💰 ${price} gold`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services */}
        <div className="mb-5">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-green-400 mb-3">SERVICES</p>
          <div className="flex flex-col gap-3">
            {/* Heal All */}
            <div className="rounded-xl border border-slate-700/40 p-4 flex items-center justify-between"
              style={{ background: 'rgba(6,3,22,0.85)' }}>
              <div>
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">💊 Heal All Clones</p>
                <p className="text-slate-400 text-[11px]">Restore 30% max HP to every living character</p>
              </div>
              <button
                onClick={handleBuyHeal}
                disabled={runState.gold < HEAL_ALL_COST || healPurchased}
                className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-lg border transition-all"
                style={{
                  background: healPurchased ? 'transparent' : runState.gold >= HEAL_ALL_COST ? 'rgba(34,197,94,0.12)' : 'rgba(20,15,35,0.6)',
                  borderColor: healPurchased ? '#475569' : runState.gold >= HEAL_ALL_COST ? 'rgba(34,197,94,0.55)' : 'rgba(60,50,80,0.4)',
                  color: healPurchased ? '#475569' : runState.gold >= HEAL_ALL_COST ? '#4ade80' : '#64748b',
                  cursor: (runState.gold >= HEAL_ALL_COST && !healPurchased) ? 'pointer' : 'not-allowed',
                }}
              >
                {healPurchased ? '✓ DONE' : `💰 ${HEAL_ALL_COST}`}
              </button>
            </div>

            {/* Mystery Box */}
            <div className="rounded-xl border border-slate-700/40 p-4 flex items-center justify-between"
              style={{ background: 'rgba(6,3,22,0.85)' }}>
              <div className="flex-1">
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">🎲 Mystery Box</p>
                <p className="text-slate-400 text-[11px]">Unknown contents — could be great, could be terrible</p>
                {mysteryResult && (
                  <p className="text-[10px] font-orbitron mt-1" style={{
                    color: mysteryResult === 'gold' ? '#fbbf24' : mysteryResult === 'item' ? '#60a5fa' : mysteryResult === 'curse' ? '#f87171' : '#f87171'
                  }}>
                    {mysteryResult === 'gold' ? '✓ +80 gold!'
                      : mysteryResult === 'item' ? '✓ Item acquired!'
                      : mysteryResult === 'curse' ? '☠ Cursed! A curse card enters your deck'
                      : '✗ Backfired! −20 HP all'}
                  </p>
                )}
              </div>
              <button
                onClick={handleMysteryBox}
                disabled={runState.gold < MYSTERY_BOX_COST || mysteryResult !== null}
                className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-lg border transition-all ml-3"
                style={{
                  background: mysteryResult !== null ? 'transparent' : runState.gold >= MYSTERY_BOX_COST ? 'rgba(168,85,247,0.12)' : 'rgba(20,15,35,0.6)',
                  borderColor: mysteryResult !== null ? '#475569' : runState.gold >= MYSTERY_BOX_COST ? 'rgba(168,85,247,0.55)' : 'rgba(60,50,80,0.4)',
                  color: mysteryResult !== null ? '#475569' : runState.gold >= MYSTERY_BOX_COST ? '#c084fc' : '#64748b',
                  cursor: (runState.gold >= MYSTERY_BOX_COST && mysteryResult === null) ? 'pointer' : 'not-allowed',
                }}
              >
                {mysteryResult !== null ? '✓ OPENED' : `💰 ${MYSTERY_BOX_COST}`}
              </button>
            </div>

            {/* Sell Item */}
            {partyItems.length > 0 && (
              <div className="rounded-xl border border-slate-700/40 p-4"
                style={{ background: 'rgba(6,3,22,0.85)' }}>
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">💸 Sell an Item</p>
                <p className="text-slate-400 text-[11px] mb-3">Sell for half price — frees the slot for something better</p>
                <div className="flex flex-wrap gap-2">
                  {runState.characters.map(char =>
                    char.items.map((slotItem, idx) => {
                      if (!slotItem) return null;
                      const slotKey = `${char.id}:${idx}`;
                      const sold = soldSlots.has(slotKey);
                      const price = SELL_ITEM_PRICE[slotItem.tier] ?? 15;
                      return (
                        <button
                          key={slotKey}
                          disabled={sold}
                          onClick={() => {
                            if (sold) return;
                            onSellItem(slotItem, char.id as CharacterId, idx, price);
                            setSoldSlots(prev => new Set([...prev, slotKey]));
                          }}
                          onMouseEnter={e => setHoveredItem({ item: slotItem, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredItem(null)}
                          className="rounded-lg border px-3 py-1.5 text-left transition-all hover:scale-105"
                          style={{
                            background: sold ? 'rgba(20,15,35,0.5)' : 'rgba(234,179,8,0.08)',
                            borderColor: sold ? 'rgba(60,50,80,0.3)' : 'rgba(234,179,8,0.40)',
                            cursor: sold ? 'not-allowed' : 'pointer',
                            opacity: sold ? 0.55 : 1,
                          }}
                        >
                          <span className="mr-1">{slotItem.icon}</span>
                          <span className="font-orbitron text-[10px]" style={{ color: sold ? '#475569' : '#fbbf24' }}>
                            {sold ? `✓ Sold` : slotItem.name}
                          </span>
                          {!sold && <span className="ml-1.5 font-orbitron text-[9px] text-yellow-600">+💰{price}</span>}
                          <span className="ml-1 text-[8px] text-slate-600">({char.displayName.replace('-chan', '')})</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Duplicate Item */}
            {partyItems.length > 0 && (
              <div className="rounded-xl border border-slate-700/40 p-4"
                style={{ background: 'rgba(6,3,22,0.85)' }}>
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">🔁 Duplicate an Item</p>
                <p className="text-slate-400 text-[11px] mb-3">Create a copy of one item from your party</p>
                <div className="flex flex-wrap gap-2">
                  {partyItems.map(({ item, charName }, idx) => {
                    const cost = DUPLICATE_ITEM_BASE_COST[item.tier] ?? 50;
                    const alreadyDuped = duplicatedIds.has(item.id);
                    const canAfford = runState.gold >= cost && !alreadyDuped;
                    return (
                      <button
                        key={idx}
                        onClick={() => canAfford && setPendingDuplicate(item)}
                        disabled={!canAfford}
                        onMouseEnter={e => setHoveredItem({ item, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="rounded-lg border px-3 py-1.5 text-left transition-all hover:scale-105"
                        style={{
                          background: alreadyDuped ? 'rgba(20,15,35,0.5)' : canAfford ? TIER_COLOR[item.tier] + '12' : 'rgba(20,15,35,0.5)',
                          borderColor: alreadyDuped ? 'rgba(60,50,80,0.3)' : canAfford ? TIER_COLOR[item.tier] + '50' : 'rgba(60,50,80,0.3)',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          opacity: canAfford ? 1 : 0.55,
                        }}
                      >
                        <span className="mr-1">{item.icon}</span>
                        <span className="font-orbitron text-[10px]" style={{ color: alreadyDuped ? '#475569' : canAfford ? TIER_COLOR[item.tier] : '#475569' }}>
                          {alreadyDuped ? `✓ ${item.name}` : item.name}
                        </span>
                        {!alreadyDuped && <span className="ml-1.5 font-orbitron text-[9px] text-slate-500">💰{cost}</span>}
                        <span className="ml-1 text-[8px] text-slate-600">({charName.replace('-chan', '')})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave */}
        <div className="flex justify-center">
          <button
            onClick={onLeave}
            className="font-orbitron font-bold px-12 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105"
            style={{
              background: 'rgba(148,163,184,0.08)',
              border: '2px solid rgba(100,116,139,0.4)',
              color: '#94a3b8',
            }}
          >
            LEAVE MERCHANT →
          </button>
        </div>
      </div>

      {/* Item hover tooltip */}
      {hoveredItem && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{ left: hoveredItem.x + 12, top: hoveredItem.y - 8, maxWidth: 220 }}
        >
          <div className="rounded-xl px-3 py-2.5 shadow-2xl"
            style={{ background: 'rgba(4,2,18,0.97)', border: `1px solid ${TIER_COLOR[hoveredItem.item.tier] ?? '#475569'}55` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{hoveredItem.item.icon}</span>
              <span className="font-orbitron font-bold text-[11px] text-white">{hoveredItem.item.name}</span>
              <span className="font-orbitron text-[8px] px-1 rounded ml-auto"
                style={{ color: TIER_COLOR[hoveredItem.item.tier] ?? '#94a3b8', background: (TIER_COLOR[hoveredItem.item.tier] ?? '#94a3b8') + '18' }}>
                {hoveredItem.item.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-400 text-[10px] leading-snug">{hoveredItem.item.description}</p>
          </div>
        </div>
      )}

      {/* Duplicate item — choose who equips it */}
      {pendingDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={PANEL_STYLE}>
            <div className="text-center mb-5">
              <span className="text-3xl">{pendingDuplicate.icon}</span>
              <p className="font-orbitron font-bold text-white text-lg mt-2">{pendingDuplicate.name} — COPY</p>
              <p className="text-slate-400 text-[11px] mt-1">Choose who equips the duplicate</p>
            </div>
            <div className="flex flex-col gap-4">
              {runState.characters
                .filter(c => c.currentHp > 0)
                .map(char => (
                  <div key={char.id} className="rounded-xl border border-slate-700/50 p-4" style={{ background: 'rgba(8,5,25,0.9)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={char.portrait} alt={char.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-600" />
                      <span className="font-orbitron font-bold text-sm text-white">{char.displayName}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {char.items.map((slotItem, idx) => {
                        if (slotItem) return null; // only show empty slots
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const cost = DUPLICATE_ITEM_BASE_COST[pendingDuplicate.tier] ?? 50;
                              onDuplicateItem(pendingDuplicate, char.id as CharacterId, idx, cost);
                              setDuplicatedIds(prev => new Set([...prev, pendingDuplicate.id]));
                              setPendingDuplicate(null);
                            }}
                            className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105"
                            style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                          >
                            + Slot {idx + 1}
                          </button>
                        );
                      })}
                      {char.items.every(s => s !== null) && (
                        <span className="text-[10px] text-slate-600 italic">No empty slots</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <div className="text-center mt-4">
              <button onClick={() => setPendingDuplicate(null)} className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  );
}

// ── TreasureScreen ────────────────────────────────────────────────────────────

export interface TreasureScreenProps {
  runState: RunState;
  onTakeCard: (cardId: string) => void;
  onTakeItem: (item: RunItem, characterId: CharacterId, slotIndex: number) => void;
  onSkip: () => void;
}

export function TreasureScreen({ runState, onTakeCard, onTakeItem, onSkip }: TreasureScreenProps) {
  const [pendingItem, setPendingItem] = useState<RunItem | null>(null);

  // Picks stable on mount; avoids dropping items exclusive to dead characters
  const { tCard, tItem } = useMemo(() => {
    const rng = () => Math.random();
    const runCharIds = runState.characters.map(c => c.id);
    const [card] = pickCardRewards(runState.deckCardIds, rng, runCharIds, 'merchant');
    const deadIds = (runState.permanentlyDeadIds ?? []) as string[];
    let item = pickItemReward('uncommon', rng);
    // Re-roll up to 8× if the item is exclusive to a dead character
    for (let i = 0; i < 8 && item?.targetCharacter && deadIds.includes(item.targetCharacter); i++) {
      item = pickItemReward('uncommon', rng);
    }
    return { tCard: card, tItem: item };
  }, []);

  const exColor = tCard?.exclusiveTo ? EXCLUSIVE_COLOR[tCard.exclusiveTo] ?? '#94a3b8' : null;

  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8" style={PANEL_STYLE}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📦</div>
          <h1 className="font-orbitron font-black text-3xl text-white mb-1" style={{ textShadow: '0 0 30px rgba(234,179,8,0.5)' }}>
            TREASURE FOUND
          </h1>
          <p className="text-yellow-300/70 text-sm">Choose one reward — card or item</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Card choice */}
          {tCard && (
            <div className="rounded-xl border border-slate-700/40 p-5 flex flex-col" style={{ background: 'rgba(8,5,25,0.85)' }}>
              <p className="font-orbitron text-[9px] tracking-[0.4em] text-cyan-400 mb-3">CARD</p>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{tCard.icon}</span>
                {tCard.exclusiveTo && exColor && (
                  <span className="text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: exColor, background: exColor + '18', border: `1px solid ${exColor}50` }}>
                    {tCard.exclusiveTo}
                  </span>
                )}
              </div>
              <p className="font-orbitron font-bold text-sm text-white mb-1">{tCard.name}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed flex-1 mb-4">{tCard.description}</p>
              <span className="text-[10px] text-cyan-300 font-orbitron mb-4">{tCard.manaCost} Mana</span>
              <button
                onClick={() => onTakeCard(tCard.definitionId)}
                className="font-orbitron text-[11px] font-bold py-2.5 rounded-lg border transition-all hover:scale-105"
                style={{
                  background: 'rgba(34,211,238,0.10)',
                  border: '1.5px solid rgba(34,211,238,0.55)',
                  color: '#22d3ee',
                }}
              >
                TAKE CARD
              </button>
            </div>
          )}

          {/* Item choice */}
          {tItem && (
            <div className="rounded-xl border p-5 flex flex-col"
              style={{
                background: 'rgba(8,5,25,0.85)',
                borderColor: TIER_COLOR[tItem.tier] + '50',
              }}>
              <p className="font-orbitron text-[9px] tracking-[0.4em] mb-3" style={{ color: TIER_COLOR[tItem.tier] }}>
                ITEM — {tItem.tier.toUpperCase()}
              </p>
              <span className="text-3xl mb-3">{tItem.icon}</span>
              <p className="font-orbitron font-bold text-sm text-white mb-1">{tItem.name}</p>
              {tItem.targetCharacter && (
                <p className="text-[9px] font-orbitron mb-1" style={{ color: TIER_COLOR[tItem.tier] }}>
                  {tItem.targetCharacter.toUpperCase()} ONLY
                </p>
              )}
              <p className="text-slate-300 text-[11px] leading-relaxed flex-1 mb-4">{tItem.description}</p>
              {tItem.statBonus && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.entries(tItem.statBonus).map(([k, v]) => v ? (
                    <span key={k} className="text-[10px] font-orbitron font-bold" style={{
                      color: k === 'might' ? '#f87171' : k === 'power' ? '#60a5fa' : k === 'defense' ? '#fbbf24' : k === 'hp' ? '#4ade80' : '#c084fc',
                    }}>+{v} {k.toUpperCase()}</span>
                  ) : null)}
                </div>
              )}
              <button
                onClick={() => setPendingItem(tItem)}
                className="font-orbitron text-[11px] font-bold py-2.5 rounded-lg border transition-all hover:scale-105"
                style={{
                  background: TIER_COLOR[tItem.tier] + '15',
                  borderColor: TIER_COLOR[tItem.tier] + '60',
                  color: TIER_COLOR[tItem.tier],
                }}
              >
                TAKE ITEM
              </button>
            </div>
          )}
        </div>

        {/* Skip both */}
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300 text-[11px] font-orbitron transition-colors underline underline-offset-4"
          >
            Skip both — leave empty handed
          </button>
        </div>
      </div>

      {/* Item Equip Picker overlay */}
      {pendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={PANEL_STYLE}>
            <div className="text-center mb-5">
              <span className="text-3xl">{pendingItem.icon}</span>
              <p className="font-orbitron font-bold text-white text-lg mt-2">{pendingItem.name}</p>
              <p className="text-slate-400 text-[11px] mt-1">Choose who equips this item</p>
            </div>
            <div className="flex flex-col gap-4">
              {runState.characters
                .filter(char => !((runState.permanentlyDeadIds ?? []) as string[]).includes(char.id))
                .map(char => (
                <div key={char.id} className="rounded-xl border border-slate-700/50 p-4" style={{ background: 'rgba(8,5,25,0.9)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={char.portrait} alt={char.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                    <span className="font-orbitron font-bold text-sm text-white">{char.displayName}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {char.items.map((slotItem, idx) => {
                      if (slotItem) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => { onTakeItem(pendingItem, char.id as CharacterId, idx); setPendingItem(null); }}
                          className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105"
                          style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                        >
                          + Slot {idx + 1}
                        </button>
                      );
                    })}
                    {char.items.every(s => s !== null) && (
                      <span className="text-[10px] text-slate-600 italic">No empty slots</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <button onClick={() => setPendingItem(null)} className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  );
}

// ── UnknownScreen ─────────────────────────────────────────────────────────────

export type UnknownResult = 'gold' | 'card' | 'damage' | 'heal' | 'skip' | 'item' | 'item_gamble' | 'curse' | 'gold_curse' | 'card_or_damage' | 'heal_or_damage' | 'item_curse' | 'upgrade_curse';

export interface UnknownScreenProps {
  runState: RunState;
  onChoice: (result: UnknownResult) => void;
}

interface EventDef {
  title: string;
  icon: string;
  flavor: string;
  choiceA: { label: string; detail: string; result: UnknownResult };
  choiceB: { label: string; detail: string; result: UnknownResult };
  condition?: (runState: RunState) => boolean;
}

const EVENTS: EventDef[] = [
  {
    title: 'Mysterious Altar',
    icon: '🗿',
    flavor: 'An ancient altar pulses with void energy. Offer something, or take its blessing.',
    choiceA: {
      label: 'Make an offering',
      detail: 'Pay 30 HP to all → gain a random card',
      result: 'card',
    },
    choiceB: {
      label: 'Pray to it',
      detail: 'Receive a minor blessing — heal 15 HP to all',
      result: 'heal',
    },
  },
  {
    title: 'Wounded Clone',
    icon: '🩹',
    flavor: 'A battered clone stumbles toward you, carrying a small cache of gold...',
    choiceA: {
      label: 'Help her',
      detail: 'Lose 20 HP from all characters → gain 60 gold',
      result: 'gold',
    },
    choiceB: {
      label: 'Ignore her',
      detail: 'Ignore her and move on',
      result: 'skip',
    },
  },
  {
    title: 'Unstable Mana Rift',
    icon: '⚡',
    flavor: 'A crackling rift tears open before you. The risk might be worth the reward.',
    choiceA: {
      label: 'Reach into the rift',
      detail: '50% chance: gain a free card OR take 40 damage to all',
      result: 'card_or_damage',
    },
    choiceB: {
      label: 'Walk around it',
      detail: 'Play it safe and avoid the rift',
      result: 'skip',
    },
  },
  {
    title: 'Abandoned Medkit',
    icon: '💊',
    flavor: 'A supply crate lies cracked open on the battlefield. Medical supplies inside.',
    choiceA: {
      label: 'Use the supplies',
      detail: 'Heal 25 HP to every living clone',
      result: 'heal',
    },
    choiceB: {
      label: 'Leave it',
      detail: 'Leave it for someone else',
      result: 'skip',
    },
  },
  {
    title: 'Supply Crate',
    icon: '📦',
    flavor: 'A sealed military crate. The manifest says it contains equipment — if it\'s legitimate.',
    choiceA: {
      label: 'Open the crate',
      detail: 'Find a random item inside',
      result: 'item',
    },
    choiceB: {
      label: 'Leave it',
      detail: 'Could be a trap — walk away',
      result: 'skip',
    },
  },
  {
    title: 'Experimental Serum',
    icon: '🧪',
    flavor: 'Alien vials pulse with an eerie green glow. The effects are... unpredictable.',
    choiceA: {
      label: 'Inject your team',
      detail: 'Heal 20 HP to all — Malaise enters your deck',
      result: 'curse',
    },
    choiceB: {
      label: 'Destroy the vials',
      detail: 'It\'s not worth the risk',
      result: 'skip',
    },
  },
  {
    title: 'Spectral Merchant',
    icon: '👻',
    flavor: 'A translucent figure offers a deal you can barely refuse. Pay with vitality, not gold.',
    choiceA: {
      label: 'Strike a deal',
      detail: 'Pay 30 HP to all → gain a random card',
      result: 'card',
    },
    choiceB: {
      label: 'Dismiss the ghost',
      detail: 'You have no business with spirits',
      result: 'skip',
    },
  },
  {
    title: 'Fallen Warrior\'s Cache',
    icon: '💀',
    flavor: 'The remains of a dead arena champion. Their equipment may still be intact — or cursed.',
    choiceA: {
      label: 'Loot the cache',
      detail: '50% chance: find an item OR disturb something dark — take 35 damage to all',
      result: 'item_gamble',
    },
    choiceB: {
      label: 'Leave with respect',
      detail: 'Honor the fallen and move on',
      result: 'skip',
    },
  },
  {
    title: 'Toxic Bloom',
    icon: '⚗️',
    flavor: 'Alien spores drift through the air. Breathing them in feels... invigorating and terrible.',
    choiceA: {
      label: 'Breathe them in',
      detail: 'Gain 60 gold — but a Curse card is added to your deck',
      result: 'gold_curse',
    },
    choiceB: {
      label: 'Cover up and pass',
      detail: 'Not worth the contamination',
      result: 'skip',
    },
  },
  {
    title: 'Reality Fracture',
    icon: '🌀',
    flavor: 'A shimmering tear in space-time pulses before you. Reach through or stay back.',
    choiceA: {
      label: 'Reach through',
      detail: '50% chance: heal 40 HP to all OR lose 40 HP to all',
      result: 'heal_or_damage',
    },
    choiceB: {
      label: 'Seal the fracture',
      detail: 'Leave the anomaly alone',
      result: 'skip',
    },
  },
  {
    title: 'Void Peddler',
    icon: '🕯️',
    flavor: 'A hooded figure offers a glowing relic — but the price is a piece of your fate.',
    choiceA: {
      label: 'Accept the deal',
      detail: 'Gain a random item — but a Curse card enters your deck',
      result: 'item_curse',
    },
    choiceB: {
      label: 'Refuse the offer',
      detail: 'Walk away from the temptation',
      result: 'skip',
    },
    condition: (rs: RunState) => rs.characters.some(c => c.items.some(s => s !== null)),
  },
  {
    title: 'The Corruptor',
    icon: '📖',
    flavor: 'A tome of forbidden knowledge can upgrade one of your cards — at a price.',
    choiceA: {
      label: 'Read the tome',
      detail: 'Upgrade a random card in your deck — Chains of Znyxorga enters your deck',
      result: 'upgrade_curse',
    },
    choiceB: {
      label: 'Burn the tome',
      detail: 'Knowledge is power, but not at this price',
      result: 'skip',
    },
    condition: (rs: RunState) =>
      rs.deckCardIds.length >= 10 &&
      rs.deckCardIds.some(id => {
        const def = CARD_DEFS.find(d => d.definitionId === id);
        return def && def.exclusiveTo === null && CARD_UPGRADES[id] && !rs.upgradedCardDefIds.includes(id);
      }),
  },
];

export function UnknownScreen({ runState, onChoice }: UnknownScreenProps) {
  // Pick event once on mount, filtered by conditions
  const [event] = useState<EventDef>(() => {
    const eligible = EVENTS.filter(e => !e.condition || e.condition(runState));
    return eligible[(Math.random() * eligible.length) | 0] ?? EVENTS[0];
  });

  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8" style={PANEL_STYLE}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{event.icon}</div>
          <p className="font-orbitron text-[9px] tracking-[0.5em] text-slate-500 mb-2">UNKNOWN EVENT</p>
          <h1 className="font-orbitron font-black text-2xl text-white mb-3"
            style={{ textShadow: '0 0 24px rgba(148,163,184,0.4)' }}>
            {event.title}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">{event.flavor}</p>
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Choice A */}
          <button
            onClick={() => onChoice(event.choiceA.result)}
            className="rounded-xl border border-slate-600/40 p-5 text-left transition-all hover:border-purple-500/60 hover:bg-purple-900/10 group"
            style={{ background: 'rgba(8,5,25,0.80)' }}
          >
            <p className="font-orbitron font-bold text-[13px] text-white mb-1 group-hover:text-purple-300 transition-colors">
              A — {event.choiceA.label}
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">{event.choiceA.detail}</p>
          </button>

          {/* Choice B */}
          <button
            onClick={() => onChoice(event.choiceB.result)}
            className="rounded-xl border border-slate-700/30 p-5 text-left transition-all hover:border-slate-500/50 hover:bg-slate-800/20 group"
            style={{ background: 'rgba(6,3,20,0.70)' }}
          >
            <p className="font-orbitron font-bold text-[13px] text-slate-300 mb-1 group-hover:text-white transition-colors">
              B — {event.choiceB.label}
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">{event.choiceB.detail}</p>
          </button>
        </div>

        {/* Party status summary */}
        <div className="rounded-xl border border-slate-800/60 p-3" style={{ background: 'rgba(4,2,12,0.60)' }}>
          <p className="font-orbitron text-[8px] tracking-[0.4em] text-slate-600 mb-2">PARTY STATUS</p>
          <div className="flex gap-3 flex-wrap">
            {runState.characters.map(char => {
              const pct = char.currentHp / char.maxHp;
              const color = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
              return (
                <div key={char.id} className="flex items-center gap-2">
                  <img src={char.portrait} alt={char.displayName} className="w-6 h-6 rounded-full object-cover" />
                  <div>
                    <p className="font-orbitron text-[9px] text-slate-400">{char.displayName.replace('-chan', '')}</p>
                    <p className="text-[9px]" style={{ color }}>{char.currentHp}/{char.maxHp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

// ── RunDefeatScreen ────────────────────────────────────────────────────────────

export interface RunDefeatScreenProps {
  runState: RunState;
  onBackToMenu: () => void;
}

export function RunDefeatScreen({ runState, onBackToMenu }: RunDefeatScreenProps) {
  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8 text-center" style={PANEL_STYLE}>
        <div className="text-6xl mb-4">💀</div>
        <h1 className="font-orbitron font-black text-4xl mb-2"
          style={{ color: '#ef4444', textShadow: '0 0 40px rgba(239,68,68,0.55)' }}>
          RUN OVER
        </h1>
        <p className="text-slate-400 text-sm mb-8">Your clones have fallen. The Empire of Znyxorga claims victory.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-700/40 p-4" style={{ background: 'rgba(8,5,25,0.80)' }}>
            <div className="text-2xl mb-1">🗺️</div>
            <div className="font-orbitron font-bold text-xl text-white">Act {runState.act}</div>
            <div className="text-slate-500 text-[10px] font-orbitron tracking-wider">REACHED</div>
          </div>
          <div className="rounded-xl border border-slate-700/40 p-4" style={{ background: 'rgba(8,5,25,0.80)' }}>
            <div className="text-2xl mb-1">⚔️</div>
            <div className="font-orbitron font-bold text-xl text-white">{runState.battleCount}</div>
            <div className="text-slate-500 text-[10px] font-orbitron tracking-wider">BATTLES</div>
          </div>
          <div className="rounded-xl border border-slate-700/40 p-4" style={{ background: 'rgba(8,5,25,0.80)' }}>
            <div className="text-2xl mb-1">💰</div>
            <div className="font-orbitron font-bold text-xl text-white">{runState.gold}</div>
            <div className="text-slate-500 text-[10px] font-orbitron tracking-wider">GOLD LEFT</div>
          </div>
        </div>

        {/* Characters */}
        <div className="flex justify-center gap-4 mb-8">
          {runState.characters.map(char => {
            const dead = char.currentHp <= 0;
            return (
              <div key={char.id} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <img src={char.portrait} alt={char.displayName}
                    className="w-14 h-14 rounded-full object-cover border-2"
                    style={{
                      borderColor: dead ? '#ef4444' : '#4ade80',
                      filter: dead ? 'grayscale(1) brightness(0.5)' : 'none',
                    }} />
                  {dead && <div className="absolute inset-0 flex items-center justify-center text-xl">💀</div>}
                </div>
                <span className="font-orbitron text-[9px] text-slate-400">{char.displayName.replace('-chan', '')}</span>
                <span className="text-[9px]" style={{ color: dead ? '#ef4444' : '#4ade80' }}>
                  {dead ? 'FALLEN' : `${char.currentHp}/${char.maxHp} HP`}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onBackToMenu}
          className="font-orbitron font-bold px-14 py-4 rounded-xl text-sm tracking-widest transition-all hover:scale-105"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '2px solid rgba(239,68,68,0.55)',
            color: '#ef4444',
            boxShadow: '0 0 20px rgba(239,68,68,0.15)',
          }}
        >
          RETURN TO MAIN MENU
        </button>
      </div>
    </ScreenWrapper>
  );
}

// ── RunVictoryScreen ───────────────────────────────────────────────────────────

export interface RunVictoryScreenProps {
  runState: RunState;
  onBackToMenu: () => void;
}

export function RunVictoryScreen({ runState, onBackToMenu }: RunVictoryScreenProps) {
  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8 text-center" style={PANEL_STYLE}>
        {/* Header */}
        <div className="text-6xl mb-3" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))' }}>🏆</div>
        <h1
          className="font-orbitron font-black text-5xl mb-1 tracking-wide"
          style={{ color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.7), 0 0 20px rgba(251,191,36,0.4)' }}
        >
          VICTORY
        </h1>
        <p className="text-slate-300 text-sm mb-1">Znyxorga's Greatest Warrior has fallen.</p>
        <p className="text-slate-500 text-xs mb-8">The crowd goes silent. Even gods can bleed.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🗺️', value: 'Act 3', label: 'COMPLETED' },
            { icon: '⚔️', value: String(runState.battleCount), label: 'BATTLES' },
            { icon: '💰', value: String(runState.gold), label: 'GOLD LEFT' },
          ].map(({ icon, value, label }) => (
            <div key={label} className="rounded-xl border p-4"
              style={{ background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.25)' }}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="font-orbitron font-bold text-xl" style={{ color: '#fbbf24' }}>{value}</div>
              <div className="text-slate-500 text-[10px] font-orbitron tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Characters */}
        <div className="flex justify-center gap-4 mb-8">
          {runState.characters.map(char => {
            const dead = char.currentHp <= 0;
            return (
              <div key={char.id} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <img
                    src={char.portrait} alt={char.displayName}
                    className="w-14 h-14 rounded-full object-cover border-2"
                    style={{
                      borderColor: dead ? '#ef4444' : '#fbbf24',
                      filter: dead ? 'grayscale(1) brightness(0.55)' : 'brightness(1.1)',
                      boxShadow: dead ? 'none' : '0 0 18px rgba(251,191,36,0.55)',
                    }}
                  />
                  {dead && <div className="absolute inset-0 flex items-center justify-center text-xl">💀</div>}
                </div>
                <span className="font-orbitron text-[9px] text-slate-400">{char.displayName.replace('-chan', '')}</span>
                <span className="text-[9px]" style={{ color: dead ? '#ef4444' : '#fbbf24' }}>
                  {dead ? 'FALLEN' : `${char.currentHp}/${char.maxHp} HP`}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onBackToMenu}
          className="font-orbitron font-bold px-14 py-4 rounded-xl text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(180,130,0,0.25) 0%, rgba(251,191,36,0.18) 100%)',
            border: '2px solid rgba(251,191,36,0.6)',
            color: '#fbbf24',
            boxShadow: '0 0 30px rgba(251,191,36,0.25)',
          }}
        >
          RETURN TO MAIN MENU
        </button>
      </div>
    </ScreenWrapper>
  );
}
