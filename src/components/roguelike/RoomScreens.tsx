// src/components/roguelike/RoomScreens.tsx
import React, { useState, useMemo } from "react";
import { RunState, RunItem, CharacterId, CardReward } from "@/types/roguelike";
import { CARD_REWARD_POOL, pickCardRewards, pickItemReward } from "@/data/roguelikeData";
import { seededRng } from "@/utils/rng";
import { CARD_DEFS, CARD_UPGRADES, getCardArt } from "@/data/cards";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";

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
  const pct = max > 0 ? current / max : 0;
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
  onUpgradeSharedCard: (defId: string) => void;
  onRemoveCard?: (defId: string) => void;
  hasCardRemove?: boolean;
  hasDualUpgrade?: boolean;
  onLeave: () => void;
}

type CampfirePhase = 'choose' | 'upgrade_shared' | 'remove_card';

export function CampfireScreen({ runState, onHealAll, onUpgradeSharedCard, onRemoveCard, hasCardRemove, hasDualUpgrade, onLeave }: CampfireScreenProps) {
  const { t } = useT();
  const [phase, setPhase] = useState<CampfirePhase>('choose');
  const [upgradesUsed, setUpgradesUsed] = useState(0);
  const upgradesAllowed = hasDualUpgrade ? 2 : 1;

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



  const handleHealAll = () => {
    onHealAll();
    onLeave();
  };

  const handleUpgradeShared = (defId: string) => {
    onUpgradeSharedCard(defId);
    const newUsed = upgradesUsed + 1;
    setUpgradesUsed(newUsed);
    if (newUsed >= upgradesAllowed) {
      onLeave();
    } else {
      setPhase('choose');
    }
  };

  // ── Phase: choose ──
  if (phase === 'choose') {
    const allFull = runState.characters.every(c => c.currentHp <= 0 || c.currentHp >= c.maxHp);
    return (
      <ScreenWrapper>
        {/* Campfire warm wash — amber glow over entire screen */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(245,158,11,0.08) 0%, transparent 70%)',
          animation: 'anim-campfire-glow 3s ease-in-out infinite',
        }} />
        {/* Floating embers */}
        {Array.from({ length: 14 }, (_, i) => {
          const left = 20 + ((i * 41 + 13) % 60);
          const sz = 2 + (i % 3);
          const dur = 3 + (i % 4) * 1.2;
          const delay = -(i * 0.7);
          const hue = i % 3 === 0 ? 'rgba(255,160,40,0.9)' : i % 3 === 1 ? 'rgba(255,100,30,0.8)' : 'rgba(255,200,80,0.7)';
          return (
            <div key={`ember-${i}`} className="fixed pointer-events-none z-0" style={{
              left: `${left}%`,
              bottom: '30%',
              width: sz, height: sz,
              borderRadius: '50%',
              background: hue,
              boxShadow: `0 0 ${sz + 3}px ${hue}`,
              animation: `anim-campfire-ember ${dur}s ease-out ${delay}s infinite`,
              opacity: 0,
            }} />
          );
        })}
        <div className="rounded-2xl p-8 relative" style={PANEL_STYLE}>
          {/* Panel flicker overlay */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            boxShadow: 'inset 0 0 60px rgba(245,158,11,0.08)',
            animation: 'anim-campfire-glow 2.2s ease-in-out infinite',
          }} />
          <div className="text-center mb-6">
            <div className="text-5xl mb-3" style={{ animation: 'anim-campfire-glow 1.5s ease-in-out infinite', display: 'inline-block' }}>🔥</div>
            <h1 className="font-orbitron font-black text-3xl text-white mb-1" style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              {t.campfire.title}
            </h1>
            <p className="text-amber-300/70 text-sm">{t.campfire.chooseOne}</p>
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
                <p className="font-orbitron font-bold text-[13px] text-green-400">{t.campfire.healAll}</p>
                <p className="text-slate-400 text-[11px]">{t.campfire.healAllDesc}</p>
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
                    <p className="font-orbitron font-bold text-[13px] text-emerald-400">{t.campfire.upgradeShared}</p>
                    <p className="text-slate-400 text-[11px]">
                      {canUpgrade
                        ? t.campfire.upgradeSharedDesc.replace('{n}', String(upgradeableShared.length)).replace('{s}', upgradeableShared.length > 1 ? 's' : '')
                        : t.campfire.noUpgrades}
                    </p>
                  </div>
                </button>
              );
            })()}

            {/* Remove Card — only visible when perk is active */}
            {hasCardRemove && (
              <button
                onClick={() => setPhase('remove_card')}
                className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02] flex items-center gap-4"
                style={{
                  background: 'rgba(8,5,25,0.85)',
                  borderColor: 'rgba(239,68,68,0.55)',
                }}
              >
                <span className="text-2xl">🗑️</span>
                <div>
                  <p className="font-orbitron font-bold text-[13px] text-red-400">{t.campfire.removeCard}</p>
                  <p className="text-slate-400 text-[11px]">{t.campfire.removeCardDesc}</p>
                </div>
              </button>
            )}
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
            {t.campfire.skip}
          </button>
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
            <h1 className="font-orbitron font-black text-2xl text-white mb-1">{t.campfire.upgradeTitle}</h1>
            <p className="text-slate-400 text-sm">{t.campfire.upgradeSub}</p>
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
                        <span className="font-orbitron text-[10px] text-slate-500">{t.campfire.copyLabel.replace('{i}', String(entry.copyIndex)).replace('{n}', String(entry.totalUpgradeable))}</span>
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
              {t.campfire.back}
            </button>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // ── Phase: remove_card ──
  if (phase === 'remove_card') {
    const removableCards = runState.deckCardIds.map((defId, idx) => {
      const def = CARD_DEFS.find(d => d.definitionId === defId);
      if (!def) return null;
      const icon = def.type === 'attack' ? '⚔️' : def.type === 'defense' ? '🛡️' : def.type === 'movement' ? '💨' : def.type === 'debuff' ? '☠️' : '⬆️';
      return { defId, name: def.name, icon, manaCost: def.manaCost, rarity: def.rarity, idx };
    }).filter(Boolean) as { defId: string; name: string; icon: string; manaCost: number; rarity: string; idx: number }[];

    return (
      <ScreenWrapper>
        <div className="rounded-2xl p-8" style={PANEL_STYLE}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🗑️</div>
            <h1 className="font-orbitron font-black text-2xl text-white mb-1">{t.campfire.removeCardTitle}</h1>
            <p className="text-slate-400 text-sm">{t.campfire.removeCardSub}</p>
          </div>

          <div className="flex flex-col gap-3 mb-6 max-h-96 overflow-y-auto pr-1">
            {removableCards.map((entry) => (
              <button
                key={`remove-${entry.defId}-${entry.idx}`}
                onClick={() => { onRemoveCard?.(entry.defId); onLeave(); }}
                className="rounded-xl border p-4 text-left transition-all hover:scale-[1.01] flex items-center gap-4"
                style={{
                  background: 'rgba(18,6,6,0.95)',
                  borderColor: 'rgba(239,68,68,0.35)',
                }}
              >
                <span className="text-2xl shrink-0">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-orbitron font-bold text-[13px] text-white">{entry.name}</span>
                    <span className="font-orbitron text-[9px] uppercase" style={{
                      color: entry.rarity === 'rare' ? '#f59e0b' : entry.rarity === 'uncommon' ? '#34d399' : '#94a3b8',
                    }}>{entry.rarity}</span>
                    <span className="ml-auto font-orbitron text-[10px] text-slate-500 shrink-0">{entry.manaCost} Mana</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setPhase('choose')}
              className="font-orbitron text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              {t.campfire.back}
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
  nodeId?: string;                 // current node ID — used to seed shop items per-visit
  purchasedCardDefs?: Set<string>; // card defIds bought this visit (persists across remounts)
  onCardPurchased?: (defId: string) => void; // notify parent of card purchase
  onBuyCard: (cardId: string, cost: number) => void;
  onBuyHeal: (cost: number) => void;
  onBuyItem: (item: RunItem, cost: number) => void;
  onDuplicateItem: (item: RunItem, characterId: CharacterId, slotIndex: number, cost: number) => void;
  onSellItem: (item: RunItem, characterId: CharacterId, slotIndex: number, goldGained: number) => void;
  onMysteryBox: (cost: number) => 'item' | 'gold' | 'damage' | 'curse';
  onRemoveCard: (cardId: string, cost: number) => void;
  hasMerchant4th?: boolean;
  hasMerchant4thItem?: boolean;
  hasMysteryBoxFree?: boolean;
  onLeave: () => void;
}

const HEAL_ALL_COST = 60;
const MYSTERY_BOX_COST = 100;
const DUPLICATE_ITEM_BASE_COST: Record<string, number> = {
  common: 60, uncommon: 100, rare: 160, legendary: 240,
};
const SELL_ITEM_PRICE: Record<string, number> = {
  common: 15, uncommon: 25, rare: 40, legendary: 60,
};
// ~2× duplicate cost but intentionally not round numbers
const BUY_ITEM_PRICE: Record<string, number> = {
  common: 115, uncommon: 190, rare: 295, legendary: 460,
};

export function MerchantScreen({ runState, nodeId, purchasedCardDefs, onCardPurchased, onBuyCard, onBuyHeal, onBuyItem, onDuplicateItem, onSellItem, onMysteryBox, onRemoveCard, hasMerchant4th, hasMerchant4thItem, hasMysteryBoxFree, onLeave }: MerchantScreenProps) {
  const { t } = useT();
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [boughtItemIds, setBoughtItemIds] = useState<Set<number>>(new Set()); // shop item indices
  const [duplicatedIds, setDuplicatedIds] = useState<Set<string>>(new Set());
  const [soldSlots, setSoldSlots] = useState<Set<string>>(new Set()); // "charId:slotIdx"
  const [healPurchased, setHealPurchased] = useState(false);
  const [mysteryResult, setMysteryResult] = useState<'item' | 'gold' | 'damage' | 'curse' | null>(null);
  const [removedCard, setRemovedCard] = useState(false);
  const [showRemovePicker, setShowRemovePicker] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<RunItem | null>(null);
  const [pendingSell, setPendingSell] = useState<{ item: RunItem; charId: string; slotIdx: number; price: number } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ item: RunItem; x: number; y: number } | null>(null);

  const removalCost = 75 + (runState.cardRemovalsThisRun ?? 0) * 25;

  // 3 random cards priced by rarity, stable on mount
  const shopCards = useMemo<{ card: CardReward; price: number }[]>(() => {
    const rng = seededRng(runState.seed ^ 0xC0FFEE);
    const runCharIds = runState.characters.map(c => c.id);
    const picks = pickCardRewards(runState.deckCardIds, rng, runCharIds, 'merchant', 1, hasMerchant4th ? 4 : 3);
    const priceRng = seededRng(runState.seed ^ 0xABCDE);
    const BASE_PRICE: Record<string, [number, number]> = {
      common:   [45,  70],
      uncommon: [80,  120],
      rare:     [150, 210],
    };
    return picks.map(card => {
      const [lo, hi] = BASE_PRICE[card.rarity ?? 'common'];
      return { card, price: lo + Math.floor(priceRng() * (hi - lo + 1)) };
    });
  }, []);

  // 3 (or 4) items for sale — seeded per node so different each merchant visit
  const shopItems = useMemo<{ item: RunItem; price: number }[]>(() => {
    const nodeHash = (nodeId ?? '').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    const rng = seededRng((runState.seed ^ 0xDEAD7) ^ nodeHash);
    const deadIds = (runState.permanentlyDeadIds ?? []) as string[];
    const teamCharIds = runState.characters.filter(c => c.currentHp > 0).map(c => c.id);
    const tiers: string[] = hasMerchant4thItem ? ['common', 'uncommon', 'rare', 'legendary'] : ['common', 'uncommon', 'rare'];
    return tiers.map(tier => {
      let item = pickItemReward(tier as 'common' | 'uncommon' | 'rare' | 'legendary', rng, teamCharIds);
      for (let i = 0; i < 6 && item?.targetCharacter && deadIds.includes(item.targetCharacter); i++) {
        item = pickItemReward(tier as 'common' | 'uncommon' | 'rare' | 'legendary', rng, teamCharIds);
      }
      return { item, price: BUY_ITEM_PRICE[tier] ?? 190 };
    });
  }, [hasMerchant4thItem]);

  const handleBuyCard = (cardId: string, price: number, defId: string) => {
    if (runState.gold < price) return;
    onBuyCard(cardId, price);
    setPurchased(prev => new Set([...prev, defId]));
    onCardPurchased?.(defId);
  };

  const handleBuyHeal = () => {
    if (runState.gold < HEAL_ALL_COST || healPurchased) return;
    onBuyHeal(HEAL_ALL_COST);
    setHealPurchased(true);
  };

  const mysteryBoxCost = hasMysteryBoxFree ? 0 : MYSTERY_BOX_COST;
  const handleMysteryBox = () => {
    if (runState.gold < mysteryBoxCost || mysteryResult !== null) return;
    const result = onMysteryBox(mysteryBoxCost);
    setMysteryResult(result);
  };

  // Characters with at least one item equipped (excluding dead)
  const charsWithItems = runState.characters.filter(
    c => c.currentHp > 0 && c.items.some(Boolean)
  );

  return (
    <ScreenWrapper>
      {/* ── Floating coin particles ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const left = 4 + ((i * 19 + 7) % 90);
        const dur  = 2.8 + (i % 5) * 0.6;
        const delay = (i * 0.4) % 3.5;
        return (
          <div key={i} style={{
            position: 'fixed', bottom: -16, left: `${left}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#fbbf24' : '#fcd34d',
            boxShadow: '0 0 6px rgba(245,158,11,0.8), 0 0 12px rgba(245,158,11,0.4)',
            animation: `anim-merchant-coin ${dur}s ease-in-out ${delay}s infinite`,
            pointerEvents: 'none', zIndex: 1,
          }} />
        );
      })}

      <div className="rounded-2xl p-8 relative" style={PANEL_STYLE}>
        {/* Holographic top bar */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
          background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.8), rgba(245,158,11,0.6), transparent)',
          boxShadow: '0 0 10px rgba(34,197,94,0.4)',
          animation: 'anim-holo-banner 3s ease-in-out infinite',
          borderRadius: '0 0 2px 2px',
        }} />
        {/* Subtle inner flicker overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.03) 0%, transparent 50%, rgba(245,158,11,0.02) 100%)',
          animation: 'anim-campfire-glow 4s ease-in-out infinite',
        }} />
        {/* Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="text-5xl mb-3" style={{ filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.7))' }}>🛒</div>
          <h1 className="font-orbitron font-black text-3xl text-white mb-1" style={{ textShadow: '0 0 30px rgba(34,197,94,0.5), 0 0 60px rgba(245,158,11,0.2)' }}>
            {t.merchant.title}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-yellow-400 font-orbitron font-bold text-lg" style={{ textShadow: '0 0 10px rgba(245,158,11,0.6)' }}>💰 {runState.gold}</span>
            <span className="text-slate-500 text-sm">{t.merchant.goldAvailable}</span>
          </div>
        </div>

        {/* Cards for sale */}
        <div className="mb-5">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-cyan-400 mb-3">{t.merchant.cardsForSale}</p>
          <div className="grid grid-cols-3 gap-4">
            {shopCards.map(({ card, price }) => {
              const bought = purchased.has(card.definitionId) || (purchasedCardDefs?.has(card.definitionId) ?? false);
              const canAfford = runState.gold >= price && !bought;
              const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : '#4b5563';
              const artMap: Record<string, string> = {
                attack: '/art/cards/attack.png', defense: '/art/cards/defense.png',
                movement: '/art/cards/movement.png', ultimate: '/art/cards/ultimate.png',
                buff: '/art/cards/battle_cry.png', debuff: '/art/cards/poison_dart.png',
              };
              const artSrc = getCardArt(card.definitionId) ?? artMap[card.type ?? 'attack'] ?? '/art/cards/attack.png';
              return (
                <div key={card.definitionId} className="flex flex-col items-center" style={{ opacity: bought ? 0.6 : 1 }}>
                  <div className="relative rounded-xl overflow-hidden flex flex-col w-full"
                    style={{
                      background: `linear-gradient(160deg, #0f1118 0%, #060810 100%)`,
                      border: `2px solid ${exColor}55`,
                      boxShadow: canAfford ? `0 0 14px ${exColor}30, 0 4px 16px rgba(0,0,0,0.7)` : '0 2px 8px rgba(0,0,0,0.5)',
                      minHeight: 180,
                    }}>
                    <div className="relative w-full" style={{ height: 90, overflow: 'hidden' }}>
                      <img src={artSrc} alt="" className="w-full h-full object-cover" style={{ opacity: 0.52, filter: 'brightness(0.9)' }} />
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 40%, rgba(6,3,22,0.92) 100%)` }} />
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${exColor}30 0%, transparent 50%)` }} />
                      <div className="absolute top-0 left-0 right-0 px-2 py-1 flex items-center justify-between"
                        style={{ background: `linear-gradient(90deg, ${exColor}cc 0%, ${exColor}55 100%)` }}>
                        <span className="font-orbitron text-[8px] font-bold text-white/90 truncate">{card.exclusiveTo ?? 'SHARED'}</span>
                        <span className="text-[10px]">{card.icon}</span>
                      </div>
                      <div className="absolute inset-[3px] rounded-lg pointer-events-none" style={{ border: `1px solid ${exColor}30` }} />
                    </div>
                    <div className="px-2.5 pt-1.5 pb-2 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-orbitron font-bold text-[11px] text-white leading-tight">{card.name}</p>
                        {card.rarity && (() => {
                          const rc: Record<string,string> = { common:'#94a3b8', uncommon:'#22c55e', rare:'#60a5fa', ultimate:'#f59e0b' };
                          const cl = rc[card.rarity] ?? '#94a3b8';
                          return <span className="font-orbitron text-[7px] font-bold px-1 py-0.5 rounded ml-1 shrink-0" style={{ color: cl, background: cl + '18' }}>{card.rarity.toUpperCase()}</span>;
                        })()}
                      </div>
                      <p className="text-slate-400 text-[10px] leading-snug flex-1 mb-2.5">{card.description}</p>
                      <button onClick={() => handleBuyCard(card.definitionId, price, card.definitionId)} disabled={!canAfford}
                        className="font-orbitron text-[10px] font-bold py-1.5 rounded-lg border transition-all w-full hover:scale-[1.02] active:scale-95"
                        style={{
                          background: bought ? 'transparent' : canAfford ? `${exColor}18` : 'rgba(20,15,35,0.6)',
                          borderColor: bought ? '#475569' : canAfford ? `${exColor}70` : 'rgba(60,50,80,0.4)',
                          color: bought ? '#475569' : canAfford ? exColor : '#64748b',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}>
                        {bought ? t.merchant.bought : t.merchant.goldPrice.replace('{n}', String(price))}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items for Sale */}
        <div className="mb-5">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-amber-400 mb-3">{t.merchant.itemsForSale}</p>
          <div className={`grid ${hasMerchant4thItem ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
            {shopItems.map(({ item, price }, i) => {
              const bought = boughtItemIds.has(i);
              const canAfford = runState.gold >= price && !bought;
              const tc = TIER_COLOR[item.tier] ?? '#94a3b8';
              const isRare = item.tier === 'rare';
              return (
                <div key={i} className="rounded-xl flex flex-col"
                  style={{
                    background: isRare ? `rgba(12,6,35,0.96)` : 'rgba(6,3,22,0.92)',
                    border: `${isRare ? 2 : 1}px solid ${tc}${bought ? '22' : isRare ? '70' : '45'}`,
                    boxShadow: bought ? 'none' : isRare
                      ? `0 0 22px ${tc}35, 0 0 8px ${tc}20, 0 6px 18px rgba(0,0,0,0.7)`
                      : canAfford ? `0 0 12px ${tc}18, 0 4px 14px rgba(0,0,0,0.6)` : 'none',
                    opacity: bought ? 0.55 : 1,
                  }}>
                  {/* Tier accent bar — thicker for rare */}
                  <div className={`${isRare ? 'h-[5px]' : 'h-[3px]'} rounded-t-xl`} style={{ background: `linear-gradient(90deg, transparent, ${tc}, transparent)` }} />
                  <div className="px-3 pt-3 pb-2 flex flex-col flex-1">
                    {/* Icon + name row */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-orbitron font-bold text-[11px] text-white leading-tight truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-orbitron text-[7px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: tc, background: tc + '18', border: `1px solid ${tc}30` }}>
                            {item.tier.toUpperCase()}
                          </span>
                          {item.targetCharacter && (
                            <span className="font-orbitron text-[7px] text-slate-500 truncate">
                              {item.targetCharacter}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-snug flex-1 mb-2.5">{item.description}</p>
                    <button
                      onClick={() => {
                        if (!canAfford) return;
                        onBuyItem(item, price);
                        setBoughtItemIds(prev => new Set([...prev, i]));
                      }}
                      disabled={!canAfford}
                      className="font-orbitron text-[10px] font-bold py-1.5 rounded-lg border transition-all w-full hover:scale-[1.02] active:scale-95"
                      style={{
                        background: bought ? 'transparent' : canAfford ? tc + '18' : 'rgba(20,15,35,0.6)',
                        borderColor: bought ? '#475569' : canAfford ? tc + '70' : 'rgba(60,50,80,0.4)',
                        color: bought ? '#475569' : canAfford ? tc : '#64748b',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}>
                      {bought ? t.merchant.purchased : t.merchant.goldPrice.replace('{n}', String(price))}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services */}
        <div className="mb-5">
          <p className="font-orbitron text-[10px] tracking-[0.4em] text-green-400 mb-3">{t.merchant.services}</p>
          <div className="flex flex-col gap-3">
            {/* Heal All */}
            <div className="rounded-xl border border-slate-700/40 p-4 flex items-center justify-between"
              style={{ background: 'rgba(6,3,22,0.85)' }}>
              <div>
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">{t.merchant.healAll}</p>
                <p className="text-slate-400 text-[11px]">{t.merchant.healAllDesc}</p>
              </div>
              <button onClick={handleBuyHeal} disabled={runState.gold < HEAL_ALL_COST || healPurchased}
                className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-lg border transition-all"
                style={{
                  background: healPurchased ? 'transparent' : runState.gold >= HEAL_ALL_COST ? 'rgba(34,197,94,0.12)' : 'rgba(20,15,35,0.6)',
                  borderColor: healPurchased ? '#475569' : runState.gold >= HEAL_ALL_COST ? 'rgba(34,197,94,0.55)' : 'rgba(60,50,80,0.4)',
                  color: healPurchased ? '#475569' : runState.gold >= HEAL_ALL_COST ? '#4ade80' : '#64748b',
                  cursor: (runState.gold >= HEAL_ALL_COST && !healPurchased) ? 'pointer' : 'not-allowed',
                }}>
                {healPurchased ? t.merchant.done : t.merchant.goldPrice.replace('{n}', String(HEAL_ALL_COST))}
              </button>
            </div>

            {/* Mystery Box */}
            <div className="rounded-xl border border-slate-700/40 p-4 flex items-center justify-between"
              style={{ background: 'rgba(6,3,22,0.85)' }}>
              <div className="flex-1">
                <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">{t.merchant.mysteryBox}</p>
                <p className="text-slate-400 text-[11px]">{t.merchant.mysteryBoxDesc}</p>
                {mysteryResult && (
                  <p className="text-[10px] font-orbitron mt-1" style={{ color: mysteryResult === 'gold' ? '#fbbf24' : mysteryResult === 'item' ? '#60a5fa' : '#f87171' }}>
                    {mysteryResult === 'gold' ? '✓ +80 gold!' : mysteryResult === 'item' ? '✓ Item acquired!' : mysteryResult === 'curse' ? '☠ Cursed! A curse card enters your deck' : '✗ Backfired! −20 HP all'}
                  </p>
                )}
              </div>
              <button onClick={handleMysteryBox} disabled={runState.gold < mysteryBoxCost || mysteryResult !== null}
                className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-lg border transition-all ml-3"
                style={{
                  background: mysteryResult !== null ? 'transparent' : runState.gold >= mysteryBoxCost ? 'rgba(168,85,247,0.12)' : 'rgba(20,15,35,0.6)',
                  borderColor: mysteryResult !== null ? '#475569' : hasMysteryBoxFree ? 'rgba(34,211,238,0.55)' : runState.gold >= mysteryBoxCost ? 'rgba(168,85,247,0.55)' : 'rgba(60,50,80,0.4)',
                  color: mysteryResult !== null ? '#475569' : hasMysteryBoxFree ? '#22d3ee' : runState.gold >= mysteryBoxCost ? '#c084fc' : '#64748b',
                  cursor: (runState.gold >= mysteryBoxCost && mysteryResult === null) ? 'pointer' : 'not-allowed',
                }}>
                {mysteryResult !== null ? t.merchant.opened : hasMysteryBoxFree ? '🎁 FREE' : t.merchant.goldPrice.replace('{n}', String(mysteryBoxCost))}
              </button>
            </div>

            {/* Remove Card */}
            {(() => {
              const canRemove = !removedCard && runState.gold >= removalCost && runState.deckCardIds.length > 1;
              return (
                <div className="rounded-xl border border-slate-700/40 p-4 flex items-center justify-between"
                  style={{ background: 'rgba(6,3,22,0.85)' }}>
                  <div>
                    <p className="font-orbitron font-bold text-[12px] text-white mb-0.5">{t.merchant.removeCard}</p>
                    <p className="text-slate-400 text-[11px]">{t.merchant.removeCardDesc}</p>
                  </div>
                  <button onClick={() => canRemove && setShowRemovePicker(true)} disabled={!canRemove}
                    className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-lg border transition-all ml-3"
                    style={{
                      background: removedCard ? 'transparent' : canRemove ? 'rgba(239,68,68,0.12)' : 'rgba(20,15,35,0.6)',
                      borderColor: removedCard ? '#475569' : canRemove ? 'rgba(239,68,68,0.55)' : 'rgba(60,50,80,0.4)',
                      color: removedCard ? '#475569' : canRemove ? '#f87171' : '#64748b',
                      cursor: canRemove ? 'pointer' : 'not-allowed',
                    }}>
                    {removedCard ? t.merchant.done : t.merchant.goldPrice.replace('{n}', String(removalCost))}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Party Inventory — sell & duplicate grouped by character */}
        {charsWithItems.length > 0 && (
          <div className="mb-5">
            <p className="font-orbitron text-[10px] tracking-[0.4em] text-slate-400 mb-3">{t.merchant.partyInventory}</p>
            <div className="flex flex-col gap-3">
              {charsWithItems.map(char => (
                <div key={char.id} className="rounded-xl border border-slate-700/30 overflow-hidden"
                  style={{ background: 'rgba(6,3,22,0.85)' }}>
                  {/* Character header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/30"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <img src={char.portrait} alt={char.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600/60" />
                    <span className="font-orbitron font-bold text-[12px] text-white">{char.displayName}</span>
                    <span className="ml-auto font-orbitron text-[9px] text-slate-500">
                      {char.items.filter(Boolean).length} item{char.items.filter(Boolean).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Item rows */}
                  <div className="divide-y divide-slate-700/20">
                    {char.items.map((slotItem, idx) => {
                      if (!slotItem) return null;
                      const slotKey = `${char.id}:${idx}`;
                      const sold = soldSlots.has(slotKey);
                      const duped = duplicatedIds.has(slotItem.id);
                      const sellPrice = SELL_ITEM_PRICE[slotItem.tier] ?? 15;
                      const dupeCost = DUPLICATE_ITEM_BASE_COST[slotItem.tier] ?? 60;
                      const isLegendaryOrSig = slotItem.tier === 'legendary' || slotItem.isSignature;
                      const canDupe = runState.gold >= dupeCost && !duped && !sold && !isLegendaryOrSig;
                      const tc = TIER_COLOR[slotItem.tier] ?? '#94a3b8';
                      const isSellPending = pendingSell?.item.id === slotItem.id && pendingSell.charId === char.id && pendingSell.slotIdx === idx;

                      return (
                        <div key={slotKey} className="px-4 py-2.5 flex items-center gap-3"
                          style={{ opacity: sold ? 0.45 : 1 }}>
                          {/* Item icon + info */}
                          <span className="text-xl leading-none">{slotItem.icon}</span>
                          <div className="flex-1 min-w-0"
                            onMouseEnter={e => !sold && setHoveredItem({ item: slotItem, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredItem(null)}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-orbitron font-bold text-[11px] text-white truncate">
                                {sold ? `✓ Sold — ${slotItem.name}` : slotItem.name}
                              </span>
                              <span className="font-orbitron text-[7px] px-1 rounded shrink-0"
                                style={{ color: tc, background: tc + '18' }}>
                                {slotItem.tier.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {/* Actions */}
                          {!sold && (
                            <div className="flex items-center gap-2 shrink-0">
                              {isSellPending ? (
                                <>
                                  <span className="font-orbitron text-[9px] text-red-300">{t.merchant.confirm}</span>
                                  <button className="font-orbitron text-[9px] px-2 py-1 rounded border border-green-600/60 text-green-400 hover:bg-green-900/30 transition-colors"
                                    onClick={() => {
                                      onSellItem(slotItem, char.id as CharacterId, idx, sellPrice);
                                      setSoldSlots(prev => new Set([...prev, slotKey]));
                                      setPendingSell(null);
                                    }}>{t.merchant.yes}</button>
                                  <button className="font-orbitron text-[9px] px-2 py-1 rounded border border-slate-600/60 text-slate-400 hover:bg-slate-700/30 transition-colors"
                                    onClick={() => setPendingSell(null)}>{t.merchant.no}</button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setPendingSell({ item: slotItem, charId: char.id, slotIdx: idx, price: sellPrice })}
                                    className="font-orbitron text-[9px] px-2.5 py-1 rounded-lg border transition-all hover:scale-105"
                                    style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.35)', color: '#fbbf24' }}
                                    title={`Sell for 💰${sellPrice}`}>
                                    {t.merchant.sell.replace('{n}', String(sellPrice))}
                                  </button>
                                  <button
                                    onClick={() => canDupe && setPendingDuplicate(slotItem)}
                                    disabled={!canDupe}
                                    className="font-orbitron text-[9px] px-2.5 py-1 rounded-lg border transition-all hover:scale-105"
                                    style={{
                                      background: duped ? 'transparent' : canDupe ? tc + '12' : 'rgba(20,15,35,0.5)',
                                      borderColor: duped ? '#475569' : canDupe ? tc + '50' : 'rgba(60,50,80,0.3)',
                                      color: duped ? '#475569' : canDupe ? tc : '#64748b',
                                      cursor: canDupe ? 'pointer' : 'not-allowed',
                                    }}
                                    title={`Duplicate for 💰${dupeCost}`}>
                                    {duped ? t.merchant.duped : t.merchant.dupe.replace('{n}', String(dupeCost))}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave */}
        <div className="flex justify-center">
          <button onClick={onLeave}
            className="font-orbitron font-bold px-12 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105"
            style={{ background: 'rgba(148,163,184,0.08)', border: '2px solid rgba(100,116,139,0.4)', color: '#94a3b8' }}>
            {t.merchant.leave}
          </button>
        </div>
      </div>

      {/* Item hover tooltip */}
      {hoveredItem && (
        <div className="fixed z-[200] pointer-events-none"
          style={{
            left: hoveredItem.x + 12 + 220 > window.innerWidth ? Math.max(4, hoveredItem.x - 232) : hoveredItem.x + 12,
            top: hoveredItem.y - 8,
            maxWidth: 220,
          }}>
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

      {/* Remove Card picker */}
      {showRemovePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={PANEL_STYLE}>
            <div className="text-center mb-5">
              <span className="text-3xl">🗑️</span>
              <p className="font-orbitron font-bold text-white text-lg mt-2">{t.merchant.removeCardTitle}</p>
              <p className="text-slate-400 text-[11px] mt-1">{t.merchant.removeCardSub}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 max-h-80 overflow-y-auto pr-1">
              {runState.deckCardIds.map((cardId, idx) => {
                const def = CARD_DEFS.find(d => d.definitionId === cardId);
                if (!def) return null;
                const icon = def.type === 'attack' ? '⚔️' : def.type === 'defense' ? '🛡️' : def.type === 'movement' ? '💨' : def.type === 'debuff' ? '☠️' : def.type === 'ultimate' ? '🌟' : '⬆️';
                const exColor = def.exclusiveTo ? EXCLUSIVE_COLOR[def.exclusiveTo] ?? '#94a3b8' : '#4b5563';
                return (
                  <button
                    key={`${cardId}-${idx}`}
                    onClick={() => {
                      onRemoveCard(cardId, removalCost);
                      setRemovedCard(true);
                      setShowRemovePicker(false);
                    }}
                    className="rounded-xl border p-3 text-left transition-all hover:scale-[1.02] hover:border-red-500/60"
                    style={{
                      background: 'rgba(8,5,25,0.90)',
                      borderColor: `${exColor}40`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{icon}</span>
                      <span className="font-orbitron font-bold text-[10px] text-white truncate">{def.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-orbitron text-slate-500">{def.manaCost} Mana</span>
                      {def.exclusiveTo && (
                        <span className="text-[7px] font-orbitron font-bold px-1 py-0.5 rounded"
                          style={{ color: exColor, background: exColor + '18' }}>
                          {def.exclusiveTo}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-center">
              <button onClick={() => setShowRemovePicker(false)} className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline">
                {t.merchant.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate item — choose who equips it */}
      {pendingDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={PANEL_STYLE}>
            <div className="text-center mb-5">
              <span className="text-3xl">{pendingDuplicate.icon}</span>
              <p className="font-orbitron font-bold text-white text-lg mt-2">{pendingDuplicate.name} {t.merchant.copy}</p>
              <p className="text-slate-400 text-[11px] mt-1">{t.merchant.chooseDuplicate}</p>
            </div>
            <div className="flex flex-col gap-4">
              {runState.characters
                .filter(c => c.currentHp > 0)
                .map(char => {
                  const alreadyOwns = char.items.some(s => s?.id === pendingDuplicate.id);
                  return (
                    <div key={char.id} className="rounded-xl border border-slate-700/50 p-4" style={{ background: 'rgba(8,5,25,0.9)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <img src={char.portrait} alt={char.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-600" />
                        <span className="font-orbitron font-bold text-sm text-white">{char.displayName}</span>
                      </div>
                      {alreadyOwns ? (
                        <span className="text-[10px] text-amber-500/70 italic">{t.merchant.alreadyEquipped}</span>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {char.items.map((slotItem, idx) => {
                            if (slotItem) return null;
                            return (
                              <button key={idx}
                                onClick={() => {
                                  const cost = DUPLICATE_ITEM_BASE_COST[pendingDuplicate.tier] ?? 50;
                                  onDuplicateItem(pendingDuplicate, char.id as CharacterId, idx, cost);
                                  setDuplicatedIds(prev => new Set([...prev, pendingDuplicate.id]));
                                  setPendingDuplicate(null);
                                }}
                                className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105"
                                style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}>
                                + Slot {idx + 1}
                              </button>
                            );
                          })}
                          {char.items.every(s => s !== null) && (
                            <span className="text-[10px] text-slate-600 italic">{t.merchant.noEmptySlots}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="text-center mt-4">
              <button onClick={() => setPendingDuplicate(null)} className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline">
                {t.merchant.cancel}
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
  const { t } = useT();
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
            {t.treasure.found}
          </h1>
          <p className="text-yellow-300/70 text-sm">{t.treasure.choose}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Card choice */}
          {tCard && (
            <div className="rounded-xl border border-slate-700/40 p-5 flex flex-col" style={{ background: 'rgba(8,5,25,0.85)' }}>
              <p className="font-orbitron text-[9px] tracking-[0.4em] text-cyan-400 mb-3">{t.treasure.cardLabel}</p>
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
                {t.treasure.takeCard}
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
                {t.treasure.takeItem}
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
            {t.treasure.skipBoth}
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
              <p className="text-slate-400 text-[11px] mt-1">{t.treasure.chooseEquip}</p>
            </div>
            <div className="flex flex-col gap-4">
              {runState.characters
                .filter(char => !((runState.permanentlyDeadIds ?? []) as string[]).includes(char.id))
                .map(char => {
                  const alreadyHasIt = char.items.some(s => s?.id === pendingItem.id);
                  return (
                  <div key={char.id} className="rounded-xl border border-slate-700/50 p-4" style={{ background: 'rgba(8,5,25,0.9)', opacity: alreadyHasIt ? 0.55 : 1 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={char.portrait} alt={char.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                      <span className="font-orbitron font-bold text-sm text-white">{char.displayName}</span>
                      {alreadyHasIt && <span className="text-[9px] text-amber-500/70 font-orbitron ml-auto italic">Already carries this</span>}
                    </div>
                    {!alreadyHasIt && (
                      <div className="flex gap-2 flex-wrap">
                        {char.items.map((slotItem, idx) => {
                          const isReplace = !!slotItem;
                          return (
                            <button
                              key={idx}
                              onClick={() => { onTakeItem(pendingItem, char.id as CharacterId, idx); setPendingItem(null); }}
                              className="font-orbitron text-[10px] py-1.5 px-3 rounded-lg border transition-all hover:scale-105"
                              style={isReplace
                                ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }
                                : { background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}
                            >
                              {isReplace ? `↩ ${slotItem.icon}` : `+ Slot ${idx + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
            </div>
            <div className="text-center mt-4">
              <button onClick={() => setPendingItem(null)} className="text-slate-500 hover:text-slate-300 text-[10px] font-orbitron underline">
                {t.merchant.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  );
}

// ── UnknownScreen ─────────────────────────────────────────────────────────────

export type UnknownResult =
  | 'gold' | 'card' | 'damage' | 'heal' | 'skip' | 'item' | 'item_gamble'
  | 'curse' | 'gold_curse' | 'card_or_damage' | 'heal_or_damage' | 'item_curse' | 'upgrade_curse'
  // New choice-B (and Spectral Merchant A fix) results:
  | 'card_free'        // gain 1 card, no cost
  | 'discard_for_gold' // discard 1 random card from deck → +45 gold
  | 'gold_rift'        // +40 gold, guaranteed safe
  | 'upgrade_hurt'     // upgrade 1 random card, −15 HP all
  | 'gold_serum'       // +55 gold (sell the vials)
  | 'item_hurt'        // −30 HP all → gain uncommon item
  | 'card_pay_gold'    // pay 60 gold → gain 1 random card
  | 'gold_cache'       // +45 gold, guaranteed safe
  | 'gold_bloom'       // +30 gold, no curse
  | 'item_pay_gold'    // pay 70 gold → uncommon item, no curse
  | 'upgrade_pay_gold' // pay 80 gold → upgrade 1 random card, no curse

export interface UnknownScreenProps {
  runState: RunState;
  onChoice: (result: UnknownResult) => void;
}

interface EventDef {
  title: string;
  icon: string;
  flavor: string;
  choiceA: { label: string; detail: string; result: UnknownResult; goldCost?: number };
  choiceB: { label: string; detail: string; result: UnknownResult; goldCost?: number };
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
      detail: 'Receive a blessing — restore 30% max HP to all',
      result: 'heal',
    },
  },
  {
    title: 'Wounded Clone',
    icon: '🩹',
    flavor: 'A battered clone stumbles toward you, carrying a small cache of gold...',
    choiceA: {
      label: 'Help her',
      detail: 'Lose 20 HP from all → gain 60 gold',
      result: 'gold',
    },
    choiceB: {
      label: 'Give her a card',
      detail: 'Discard 1 random card from your deck → she gives you 45 gold',
      result: 'discard_for_gold',
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
      label: 'Siphon it slowly',
      detail: 'Harvest the energy safely — gain 40 gold, no risk',
      result: 'gold_rift',
    },
  },
  {
    title: 'Abandoned Medkit',
    icon: '💊',
    flavor: 'A supply crate lies cracked open on the battlefield. Medical supplies inside.',
    choiceA: {
      label: 'Use the supplies',
      detail: 'Restore 30% max HP to every living clone',
      result: 'heal',
    },
    choiceB: {
      label: 'Salvage for parts',
      detail: 'All take 15 damage — upgrade 1 random card if any are upgradeable',
      result: 'upgrade_hurt',
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
      label: 'Rifle through it',
      detail: 'Dig past the gear — find a random card instead',
      result: 'card_free',
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
      label: 'Sell the vials',
      detail: 'Too risky — offload them for 55 gold',
      result: 'gold_serum',
    },
  },
  {
    title: 'Spectral Merchant',
    icon: '👻',
    flavor: 'A translucent figure offers a deal you can barely refuse. Pay with vitality, not gold.',
    choiceA: {
      label: 'Strike a deal',
      detail: 'Pay 30 HP to all → gain a random item',
      result: 'item_hurt',
    },
    choiceB: {
      label: 'Counter-offer',
      detail: 'Pay 60 gold instead → gain a random card',
      result: 'card_pay_gold',
      goldCost: 60,
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
      label: 'Take just the coins',
      detail: 'Grab only the coin pouch — guaranteed 45 gold, no risk',
      result: 'gold_cache',
    },
  },
  {
    title: 'Toxic Bloom',
    icon: '⚗️',
    flavor: 'Alien spores drift through the air. Breathing them in feels... invigorating and terrible.',
    choiceA: {
      label: 'Breathe them in',
      detail: 'Gain 60 gold — a random Curse enters your deck',
      result: 'gold_curse',
    },
    choiceB: {
      label: 'Harvest carefully',
      detail: 'Collect a small sample — gain 30 gold, no curse',
      result: 'gold_bloom',
    },
  },
  {
    title: 'Reality Fracture',
    icon: '🌀',
    flavor: 'A shimmering tear in space-time pulses before you. Reach through or stay back.',
    choiceA: {
      label: 'Reach through',
      detail: '50% chance: restore 30% max HP to all OR lose 40 HP to all',
      result: 'heal_or_damage',
    },
    choiceB: {
      label: 'Stabilize the tear',
      detail: 'Carefully collapse the fracture — gain a random card, safe',
      result: 'card_free',
    },
  },
  {
    title: 'Void Peddler',
    icon: '🕯️',
    flavor: 'A hooded figure offers a glowing relic — but the price is a piece of your fate.',
    choiceA: {
      label: 'Accept the deal',
      detail: 'Gain a random item — a random Curse enters your deck',
      result: 'item_curse',
    },
    choiceB: {
      label: 'Pay in gold',
      detail: 'Spend 70 gold — gain the item with no curse attached',
      result: 'item_pay_gold',
      goldCost: 70,
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
      label: 'Pay the price',
      detail: 'Spend 80 gold to upgrade a random card — no curse',
      result: 'upgrade_pay_gold',
      goldCost: 80,
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
  const { t } = useT();
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
          <p className="font-orbitron text-[9px] tracking-[0.5em] text-slate-500 mb-2">{t.unknown.eventLabel}</p>
          <h1 className="font-orbitron font-black text-2xl text-white mb-3"
            style={{ textShadow: '0 0 24px rgba(148,163,184,0.4)' }}>
            {event.title}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">{event.flavor}</p>
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Choice A */}
          {(() => {
            const canAffordA = !event.choiceA.goldCost || runState.gold >= event.choiceA.goldCost;
            return (
              <button
                onClick={canAffordA ? () => onChoice(event.choiceA.result) : undefined}
                disabled={!canAffordA}
                className="rounded-xl border border-slate-600/40 p-5 text-left transition-all hover:border-purple-500/60 hover:bg-purple-900/10 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-600/40 disabled:hover:bg-transparent"
                style={{ background: 'rgba(8,5,25,0.80)' }}
              >
                <p className="font-orbitron font-bold text-[13px] text-white mb-1 group-hover:text-purple-300 transition-colors">
                  A — {event.choiceA.label}
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">{event.choiceA.detail}</p>
                {!canAffordA && (
                  <p className="text-red-400 text-[10px] font-orbitron mt-1.5">{t.unknown.needGold.replace('{n}', String(event.choiceA.goldCost)).replace('{have}', String(runState.gold))}</p>
                )}
              </button>
            );
          })()}

          {/* Choice B */}
          {(() => {
            const canAffordB = !event.choiceB.goldCost || runState.gold >= event.choiceB.goldCost;
            return (
              <button
                onClick={canAffordB ? () => onChoice(event.choiceB.result) : undefined}
                disabled={!canAffordB}
                className="rounded-xl border border-slate-700/30 p-5 text-left transition-all hover:border-slate-500/50 hover:bg-slate-800/20 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700/30 disabled:hover:bg-transparent"
                style={{ background: 'rgba(6,3,20,0.70)' }}
              >
                <p className="font-orbitron font-bold text-[13px] text-slate-300 mb-1 group-hover:text-white transition-colors">
                  B — {event.choiceB.label}
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">{event.choiceB.detail}</p>
                {!canAffordB && (
                  <p className="text-red-400 text-[10px] font-orbitron mt-1.5">{t.unknown.needGold.replace('{n}', String(event.choiceB.goldCost)).replace('{have}', String(runState.gold))}</p>
                )}
              </button>
            );
          })()}
        </div>

        {/* Party status summary */}
        <div className="rounded-xl border border-slate-800/60 p-3" style={{ background: 'rgba(4,2,12,0.60)' }}>
          <p className="font-orbitron text-[8px] tracking-[0.4em] text-slate-600 mb-2">{t.unknown.partyStatus}</p>
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

// ── Run timer helper ──────────────────────────────────────────────────────────
function formatRunTime(startTime: number): string {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// ── RunDefeatScreen ────────────────────────────────────────────────────────────

export interface RunDefeatScreenProps {
  runState: RunState;
  onBackToMenu: () => void;
}

export function RunDefeatScreen({ runState, onBackToMenu }: RunDefeatScreenProps) {
  const { t } = useT();
  const rs = runState.runStats ?? { enemiesKilled: 0, itemsObtained: 0, cardsObtained: 0 };
  const stats = [
    { icon: '⏱️', value: formatRunTime(runState.runStartTime ?? Date.now()), label: t.runEnd.statTime },
    { icon: '🗺️', value: t.runEnd.actLabel.replace('{n}', String(runState.act)), label: t.runEnd.statReached },
    { icon: '⚔️', value: String(runState.battleCount), label: t.runEnd.statBattles },
    { icon: '💀', value: String(rs.enemiesKilled), label: t.runEnd.statEnemies },
    { icon: '🃏', value: String(rs.cardsObtained), label: t.runEnd.statCardsGot },
    { icon: '🎒', value: String(rs.itemsObtained), label: t.runEnd.statItemsGot },
    { icon: '💰', value: String(runState.gold), label: t.runEnd.statGoldLeft },
  ];
  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8 text-center" style={PANEL_STYLE}>
        <div className="text-6xl mb-4">💀</div>
        <h1 className="font-orbitron font-black text-4xl mb-2"
          style={{ color: '#ef4444', textShadow: '0 0 40px rgba(239,68,68,0.55)' }}>
          {t.runEnd.runOver}
        </h1>
        <p className="text-slate-400 text-sm mb-8">{t.runEnd.clonesFallen}</p>

        {/* Characters — all shown as fallen */}
        <div className="flex justify-center gap-5 mb-8">
          {runState.characters.map(char => (
            <div key={char.id} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <img src={char.portrait} alt={char.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2"
                  style={{ borderColor: '#ef4444', filter: 'grayscale(1) brightness(0.45)' }} />
                <div className="absolute inset-0 flex items-center justify-center text-xl">💀</div>
              </div>
              <span className="font-orbitron text-[9px] text-slate-400">{char.displayName.replace('-chan', '')}</span>
              <span className="text-[9px] font-orbitron font-bold" style={{ color: '#ef4444' }}>{t.runEnd.fallen}</span>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {stats.map(({ icon, value, label }) => (
            <div key={label} className="rounded-xl border border-slate-700/40 p-3" style={{ background: 'rgba(8,5,25,0.80)' }}>
              <div className="text-xl mb-1">{icon}</div>
              <div className="font-orbitron font-bold text-lg text-white">{value}</div>
              <div className="text-slate-500 text-[9px] font-orbitron tracking-wider">{label}</div>
            </div>
          ))}
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
          {t.runEnd.returnToMenu}
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
  const { t } = useT();
  return (
    <ScreenWrapper>
      <div className="rounded-2xl p-8 text-center" style={PANEL_STYLE}>
        {/* Header */}
        <div className="text-6xl mb-3" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))' }}>🏆</div>
        <h1
          className="font-orbitron font-black text-5xl mb-1 tracking-wide"
          style={{ color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.7), 0 0 20px rgba(251,191,36,0.4)' }}
        >
          {t.runEnd.victory}
        </h1>
        <p className="text-slate-300 text-sm mb-1">{t.runEnd.victoryTagline}</p>
        <p className="text-slate-500 text-xs mb-8">{t.runEnd.victorySubline}</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: '⏱️', value: formatRunTime(runState.runStartTime ?? Date.now()), label: t.runEnd.statTime },
            { icon: '🗺️', value: t.runEnd.act3Label, label: t.runEnd.statCompleted },
            { icon: '⚔️', value: String(runState.battleCount), label: t.runEnd.statBattles },
            { icon: '💰', value: String(runState.gold), label: t.runEnd.statGoldLeft },
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
                  {dead ? t.runEnd.fallen : `${char.currentHp}/${char.maxHp} HP`}
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
          {t.runEnd.returnToMenu}
        </button>
      </div>
    </ScreenWrapper>
  );
}
