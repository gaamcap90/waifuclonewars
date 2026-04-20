// src/components/RewardsScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { RunState, CardReward, RunItem, CharacterId, CharacterRunState } from "@/types/roguelike";
import ArenaBackground from "@/ui/ArenaBackground";
import { useT } from "@/i18n";

interface Props {
  runState: RunState;
  onCollect: (
    chosenCardId: string | null,
    equipItems: Array<{ characterId: CharacterId; slotIndex: number; item: RunItem }>
  ) => void;
}

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};
const TIER_BG: Record<string, string> = {
  common: 'rgba(100,116,139,0.15)', uncommon: 'rgba(34,197,94,0.12)',
  rare: 'rgba(96,165,250,0.12)', legendary: 'rgba(245,158,11,0.15)',
};

const CARD_RARITY_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', ultimate: '#f59e0b',
};
const EXCLUSIVE_COLOR: Record<string, string> = {
  Napoleon: '#d946ef', Genghis: '#ef4444', 'Da Vinci': '#34d399', Leonidas: '#f59e0b',
};

// Animated XP bar
function AnimatedXPBar({ prevXp, gainXp, xpToNext }: { prevXp: number; gainXp: number; xpToNext: number }) {
  const cappedTarget = Math.min(xpToNext, prevXp + gainXp);
  const startPct = Math.min(100, (prevXp / xpToNext) * 100);
  const targetPct = Math.min(100, (cappedTarget / xpToNext) * 100);
  const [displayPct, setDisplayPct] = useState(startPct);
  const [showFlash, setShowFlash] = useState(false);
  const leveledUp = prevXp + gainXp >= xpToNext;

  useEffect(() => {
    const t1 = setTimeout(() => setDisplayPct(leveledUp ? 100 : targetPct), 350);
    const t2 = leveledUp ? setTimeout(() => { setShowFlash(true); setDisplayPct(0); }, 1350) : null;
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, []);

  return (
    <div className="relative h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
      <div className="h-full rounded-full"
        style={{
          width: `${displayPct}%`,
          background: showFlash ? 'linear-gradient(90deg, #a78bfa, #22d3ee)' : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: displayPct > 0 ? '0 0 8px rgba(167,139,250,0.6)' : 'none',
        }} />
    </div>
  );
}

function CharacterXPCard({ char, gainXp }: { char: CharacterRunState; gainXp: number }) {
  const { t } = useT();
  const isDead = char.currentHp <= 0;
  const leveledUp = !isDead && char.xp + gainXp >= char.xpToNext;
  const newXp = isDead ? char.xp : Math.min(char.xpToNext, char.xp + gainXp);

  return (
    <div className="rounded-xl border border-slate-700/40 p-4"
      style={{ background: isDead ? 'rgba(40,5,5,0.75)' : 'rgba(2,4,14,0.75)', opacity: isDead ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 mb-3">
        <img src={char.portrait} alt={char.displayName}
          className={`w-10 h-10 rounded-full object-cover border border-slate-600/50 ${isDead ? 'grayscale' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="font-orbitron text-[11px] text-white">{char.displayName}</p>
          <p className="text-[10px] text-purple-400">{t.rewards.levelLabel.replace('{n}', String(char.level))}</p>
        </div>
        {isDead && <span className="text-red-400 text-xs font-bold font-orbitron shrink-0">{t.rewards.fallen}</span>}
        {leveledUp && <span className="text-yellow-400 text-xs font-bold font-orbitron animate-pulse shrink-0">{t.rewards.levelUp}</span>}
      </div>
      {isDead ? (
        <div className="text-[10px] text-red-400/70 italic">{t.rewards.noXpFallen}</div>
      ) : (
        <>
          <AnimatedXPBar prevXp={char.xp} gainXp={gainXp} xpToNext={char.xpToNext} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-500">{newXp} / {char.xpToNext} XP</span>
            <span className="text-[10px] text-purple-400">+{gainXp}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Single item assignment widget — used for both regular itemDrop and each boss item
function ItemAssignWidget({
  item, characters, assignedTo, assignedSlot, onChange, label,
}: {
  item: RunItem;
  characters: CharacterRunState[];
  assignedTo: CharacterId | null;
  assignedSlot: number | null;
  onChange: (charId: CharacterId | null, slotIdx: number | null) => void;
  label: string;
}) {
  const { t } = useT();
  // Exclude characters who already own this exact item (same id) or who already have it (same item.name as global unique)
  const alreadyOwnsItem = (c: CharacterRunState) => c.items.some(s => s?.id === item.id);
  const eligible = characters.filter(c => c.currentHp > 0 && (!item.targetCharacter || c.id === item.targetCharacter) && !alreadyOwnsItem(c));
  const ineligibleOwner = characters.filter(c => c.currentHp > 0 && alreadyOwnsItem(c));

  return (
    <div className="rounded-xl border p-5 mb-4"
      style={{ borderColor: TIER_COLOR[item.tier] + '50', background: TIER_BG[item.tier] }}>
      {/* Item header */}
      <div className="flex items-start gap-4 mb-4">
        <span className="text-3xl">{item.icon}</span>
        <div>
          <div className="font-orbitron text-[9px] tracking-widest mb-0.5" style={{ color: TIER_COLOR[item.tier] }}>
            {label} — {((t.archives.itemTier as Record<string, string>)[item.tier] ?? item.tier).toUpperCase()}
          </div>
          <p className="font-orbitron font-bold text-white text-base">{(t.items as Record<string, { name: string; description: string }>)[item.id]?.name ?? item.name}</p>
          {item.targetCharacter && (
            <p className="text-[10px] font-orbitron mt-0.5" style={{ color: TIER_COLOR[item.tier] }}>
              {t.rewards.characterOnly.replace('{name}', item.targetCharacter.toUpperCase())}
            </p>
          )}
          <p className="text-slate-300 text-[12px] mt-1 leading-relaxed">{(t.items as Record<string, { name: string; description: string }>)[item.id]?.description ?? item.description}</p>
        </div>
      </div>

      {/* Show if someone already owns it */}
      {ineligibleOwner.length > 0 && (
        <p className="text-[10px] font-orbitron text-red-400 mb-3">
          {t.rewards.alreadyCarries.replace('{names}', ineligibleOwner.map(c => c.displayName).join(', '))}
        </p>
      )}
      {/* Warn when replacing an occupied slot — show stats of item being lost */}
      {assignedTo !== null && assignedSlot !== null && (() => {
        const targetChar = characters.find(c => c.id === assignedTo);
        const slotItem = targetChar?.items[assignedSlot];
        if (!slotItem) return null;
        const b = slotItem.statBonus;
        const statParts: string[] = [];
        if (b?.hp)        statParts.push(`HP +${b.hp}`);
        if (b?.might)     statParts.push(`Might +${b.might}`);
        if (b?.power)     statParts.push(`Power +${b.power}`);
        if (b?.defense)   statParts.push(`Def +${b.defense}`);
        if (b?.moveRange) statParts.push(`Move +${b.moveRange}`);
        return (
          <div className="mb-3 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-orbitron text-[10px] text-red-400 mb-1">⚠ Will replace: <span className="font-bold">{slotItem.name}</span></p>
            {statParts.length > 0 && (
              <p className="font-orbitron text-[9px]" style={{ color: 'rgba(239,68,68,0.6)' }}>Losing: {statParts.join(' · ')}</p>
            )}
            <p className="font-orbitron text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{slotItem.description}</p>
          </div>
        );
      })()}

      {/* Character slot picker */}
      <p className="font-orbitron text-[10px] text-slate-500 mb-3">{t.rewards.equipTo}</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(eligible.length, 3)}, 1fr)` }}>
        {eligible.map(c => (
          <div key={c.id} className="rounded-xl border border-slate-700/40 p-3"
            style={{ background: assignedTo === c.id ? 'rgba(34,211,238,0.08)' : 'rgba(2,4,14,0.80)' }}>
            <div className="flex items-center gap-2 mb-2">
              <img src={c.portrait} alt={c.displayName} className="w-8 h-8 rounded-full object-cover" />
              <span className="font-orbitron text-[11px] text-white">{c.displayName}</span>
            </div>
            <div className="flex gap-1.5 mt-1">
              {c.items.map((slot, i) => {
                const isSelected = assignedTo === c.id && assignedSlot === i;
                const isOccupied = !!slot;
                return (
                  <button key={i}
                    onClick={() => onChange(c.id, i)}
                    title={isOccupied ? `Replace: ${slot!.name}` : t.rewards.slotEmpty.replace('{n}', String(i + 1))}
                    className="w-9 h-9 rounded-lg border text-sm flex items-center justify-center transition-all relative"
                    style={{
                      background: isSelected ? 'rgba(34,211,238,0.22)' : isOccupied ? 'rgba(10,8,25,0.6)' : 'rgba(20,15,40,0.8)',
                      borderColor: isSelected ? '#22d3ee' : isOccupied ? 'rgba(239,68,68,0.45)' : 'rgba(100,80,150,0.4)',
                      boxShadow: isSelected ? '0 0 12px rgba(34,211,238,0.5)' : 'none',
                    }}>
                    {slot ? slot.icon : '·'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {eligible.length === 0 && (
          <p className="text-[11px] text-slate-500 italic">{t.rewards.noEligible}</p>
        )}
      </div>
    </div>
  );
}

/** Count-up from 0 to target over ~800ms on mount */
function useRewardCountUp(target: number): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target <= 0) return;
    const start = Date.now();
    const dur = 800;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  return val;
}

export default function RewardsScreen({ runState, onCollect }: Props) {
  const { t } = useT();
  const { pendingRewards, characters, isTutorialRun } = runState;
  if (!pendingRewards) return null;

  const { gold, xp, cardChoices, itemDrop, bossItems } = pendingRewards;
  const displayGold = useRewardCountUp(gold);
  const displayXP = useRewardCountUp(xp);

  const [chosenCard, setChosenCard] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // itemDrop assignment
  const [dropCharId, setDropCharId] = useState<CharacterId | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  // boss items: array of {charId, slotIndex}
  const bossCount = bossItems?.length ?? 0;
  const [bossAssignments, setBossAssignments] = useState<Array<{ charId: CharacterId | null; slot: number | null }>>(
    () => Array.from({ length: bossCount }, () => ({ charId: null, slot: null }))
  );

  const handleFinish = () => {
    const equipItems: Array<{ characterId: CharacterId; slotIndex: number; item: RunItem }> = [];

    // Regular item drop
    if (itemDrop && dropCharId !== null && dropSlot !== null) {
      equipItems.push({ characterId: dropCharId, slotIndex: dropSlot, item: itemDrop });
    }
    // Boss items
    bossItems?.forEach((item, idx) => {
      const { charId, slot } = bossAssignments[idx];
      if (charId !== null && slot !== null) {
        equipItems.push({ characterId: charId, slotIndex: slot, item });
      }
    });

    onCollect(chosenCard, equipItems);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <ArenaBackground />
      <div className="relative z-10 flex-1 flex flex-col overflow-auto px-8 py-10 max-w-[940px] mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-orbitron text-[10px] tracking-[0.6em] text-purple-400 mb-2">{t.rewards.arena}</p>
          <h1 className="font-orbitron font-black text-5xl text-white"
            style={{ textShadow: '0 0 40px rgba(34,211,238,0.55)' }}>
            {t.rewards.victory}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">{t.rewards.conqueredEncounter}</p>
        </div>

        {/* Gold + XP summary */}
        <div className="flex gap-4 mb-8 justify-center">
          <div className="rounded-xl border border-yellow-600/40 px-8 py-4 text-center"
            style={{ background: 'rgba(40,28,5,0.80)' }}>
            <p className="font-orbitron text-[10px] tracking-wider text-yellow-600 mb-1">{t.rewards.goldEarned}</p>
            <p className="font-orbitron font-black text-4xl text-yellow-400">+{displayGold}</p>
          </div>
          <div className="rounded-xl border border-purple-600/40 px-8 py-4 text-center"
            style={{ background: 'rgba(30,10,60,0.80)' }}>
            <p className="font-orbitron text-[10px] tracking-wider text-purple-400 mb-1">{t.rewards.xpEarned}</p>
            <p className="font-orbitron font-black text-4xl text-purple-300">+{displayXP}</p>
          </div>
        </div>

        {/* Character XP progress */}
        <section className="mb-8">
          <h2 className="font-orbitron text-[11px] tracking-[0.4em] text-slate-500 mb-4">{t.rewards.characterProgress}</h2>
          <div className="grid grid-cols-3 gap-4">
            {characters.map(c => (
              <CharacterXPCard key={c.id} char={c} gainXp={xp} />
            ))}
          </div>
        </section>

        {/* Card choice */}
        {cardChoices.length > 0 && (
          <section className="mb-8">
            <h2 className="font-orbitron text-[11px] tracking-[0.4em] text-cyan-400 mb-4">
              {t.rewards.chooseCard}{!isTutorialRun && <span className="text-slate-500 normal-case tracking-normal font-sans text-[10px]"> {t.rewards.orSkip}</span>}
            </h2>
            <div data-tut="reward_cards" className="grid grid-cols-3 gap-4">
              {cardChoices.map((card, idx) => {
                const selected = chosenCard === card.definitionId;
                const flipped = flippedCards.has(card.definitionId);
                const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : null;
                const tCard = (t.cards as Record<string, { name: string; description: string }>)[card.definitionId];
                const isUltimate = card.rarity === 'ultimate';

                if (!flipped) {
                  return (
                    <button key={card.definitionId}
                      onClick={() => setFlippedCards(prev => { const next = new Set(prev); next.add(card.definitionId); return next; })}
                      className="rounded-xl border p-4 flex flex-col items-center justify-center cursor-pointer"
                      style={{
                        background: 'rgba(4,2,18,0.92)',
                        borderColor: 'rgba(80,50,140,0.45)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
                        minHeight: 160,
                        animation: `anim-reward-card-reveal 0.4s ease-out ${idx * 0.12}s both`,
                      }}>
                      <div style={{ fontSize: 28, opacity: 0.55, color: '#c4b5fd' }}>?</div>
                      <div style={{
                        marginTop: 8, fontSize: 9,
                        fontFamily: 'var(--font-orbitron, monospace)',
                        color: 'rgba(167,139,250,0.65)',
                        letterSpacing: '0.12em',
                      }}>REVEAL</div>
                    </button>
                  );
                }

                return (
                  <button key={card.definitionId}
                    onClick={() => setChosenCard(selected ? null : card.definitionId)}
                    className={`rounded-xl border p-4 text-left transition-all duration-150 flex flex-col card-flip-reveal${isUltimate ? ' card-ult-flash' : ''}`}
                    style={{
                      background: selected ? 'rgba(34,211,238,0.09)' : 'rgba(2,4,14,0.80)',
                      borderColor: selected ? 'rgba(34,211,238,0.75)' : 'rgba(100,120,150,0.30)',
                      boxShadow: selected ? '0 0 18px rgba(34,211,238,0.18)' : undefined,
                    }}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{card.icon}</span>
                      {card.exclusiveTo ? (
                        <span className="font-orbitron text-[9px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: exColor!, borderColor: exColor! + '60', background: exColor! + '18' }}>
                          {card.exclusiveTo}
                        </span>
                      ) : (
                        <span className="font-orbitron text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-600/40 text-slate-500"
                          style={{ background: 'rgba(100,100,120,0.15)' }}>
                          {t.rewards.shared}
                        </span>
                      )}
                    </div>
                    <p className="font-orbitron font-bold text-sm text-white mb-1">{tCard?.name ?? card.name}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed flex-1">{tCard?.description ?? card.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-cyan-300 font-orbitron">{card.manaCost} Mana</span>
                      {card.rarity && (
                        <span className="font-orbitron text-[8px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: CARD_RARITY_COLOR[card.rarity] ?? '#94a3b8', background: (CARD_RARITY_COLOR[card.rarity] ?? '#94a3b8') + '18' }}>
                          {((t.archives.cardRarity as Record<string, string>)[card.rarity] ?? card.rarity).toUpperCase()}
                        </span>
                      )}
                      {selected && <span className="text-[10px] font-bold text-cyan-400 font-orbitron">{t.rewards.selected}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Regular item drop */}
        {itemDrop && (
          <section className="mb-8">
            <h2 className="font-orbitron text-[11px] tracking-[0.4em] mb-4" style={{ color: TIER_COLOR[itemDrop.tier] }}>
              {t.rewards.itemDrop}
            </h2>
            <ItemAssignWidget
              item={itemDrop}
              characters={characters}
              assignedTo={dropCharId}
              assignedSlot={dropSlot}
              onChange={(charId, slot) => { setDropCharId(charId); setDropSlot(slot); }}
              label={t.rewards.itemDropLabel}
            />
          </section>
        )}

        {/* Boss item drops — one per living character */}
        {bossItems && bossItems.length > 0 && (
          <section className="mb-8">
            <h2 className="font-orbitron text-[11px] tracking-[0.4em] text-yellow-400 mb-2">
              {t.rewards.bossRewards}
            </h2>
            <p className="text-slate-400 text-[11px] mb-4">
              {t.rewards.assignItems}
            </p>
            {bossItems.map((item, idx) => (
              <ItemAssignWidget
                key={idx}
                item={item}
                characters={characters}
                assignedTo={bossAssignments[idx].charId}
                assignedSlot={bossAssignments[idx].slot}
                onChange={(charId, slot) => {
                  setBossAssignments(prev => prev.map((a, i) => i === idx ? { charId, slot } : a));
                }}
                label={t.rewards.bossItem.replace('{n}', String(idx + 1))}
              />
            ))}
          </section>
        )}

        {/* Continue */}
        {(() => {
          const mustPickCard = isTutorialRun && cardChoices.length > 0 && !chosenCard;
          return (
            <div className="flex flex-col items-center gap-3 mt-6 pb-4">
              {mustPickCard && (
                <p className="font-orbitron text-[11px] text-yellow-400 tracking-wider animate-pulse">
                  {t.rewards.pickCardPrompt}
                </p>
              )}
              <button
                onClick={mustPickCard ? undefined : handleFinish}
                disabled={mustPickCard}
                className="font-orbitron font-bold px-14 py-4 rounded-xl text-sm tracking-widest transition-all duration-150"
                style={{
                  background: mustPickCard ? 'rgba(34,211,238,0.04)' : 'rgba(34,211,238,0.12)',
                  border: `2px solid ${mustPickCard ? 'rgba(34,211,238,0.20)' : 'rgba(34,211,238,0.65)'}`,
                  color: mustPickCard ? 'rgba(34,211,238,0.30)' : '#22d3ee',
                  boxShadow: mustPickCard ? 'none' : '0 0 24px rgba(34,211,238,0.18)',
                  cursor: mustPickCard ? 'not-allowed' : 'pointer',
                }}>
                {t.rewards.continue}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
