// src/components/RewardsScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { RunState, CardReward, RunItem, CharacterId, CharacterRunState } from "@/types/roguelike";
import ArenaBackground from "@/ui/ArenaBackground";

interface Props {
  runState: RunState;
  onCollect: (
    chosenCardId: string | null,
    equipItem: { characterId: CharacterId; slotIndex: number; item: RunItem } | null
  ) => void;
}

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};
const TIER_BG: Record<string, string> = {
  common: 'rgba(100,116,139,0.15)', uncommon: 'rgba(34,197,94,0.12)',
  rare: 'rgba(96,165,250,0.12)', legendary: 'rgba(245,158,11,0.15)',
};
const EXCLUSIVE_COLOR: Record<string, string> = {
  Napoleon: '#d946ef',
  Genghis:  '#ef4444',
  'Da Vinci': '#34d399',
  Leonidas: '#f59e0b',
};

// Animated XP bar — starts at old value, animates to new value after mount
function AnimatedXPBar({
  prevXp, gainXp, xpToNext,
}: {
  prevXp: number;
  gainXp: number;
  xpToNext: number;
}) {
  const cappedTarget = Math.min(xpToNext, prevXp + gainXp);
  const startPct = Math.min(100, (prevXp / xpToNext) * 100);
  const targetPct = Math.min(100, (cappedTarget / xpToNext) * 100);
  const [displayPct, setDisplayPct] = useState(startPct);
  const [showFlash, setShowFlash] = useState(false);
  const leveledUp = prevXp + gainXp >= xpToNext;

  useEffect(() => {
    // small delay, then animate bar filling
    const t1 = setTimeout(() => setDisplayPct(leveledUp ? 100 : targetPct), 350);
    // if levelled up, flash and then reset
    const t2 = leveledUp ? setTimeout(() => { setShowFlash(true); setDisplayPct(0); }, 1350) : null;
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, []);

  return (
    <div className="relative h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
      <div className="h-full rounded-full"
        style={{
          width: `${displayPct}%`,
          background: showFlash
            ? 'linear-gradient(90deg, #a78bfa, #22d3ee)'
            : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: displayPct > 0 ? '0 0 8px rgba(167,139,250,0.6)' : 'none',
        }} />
    </div>
  );
}

function CharacterXPCard({
  char, gainXp,
}: {
  char: CharacterRunState;
  gainXp: number;
}) {
  const leveledUp = char.xp + gainXp >= char.xpToNext;
  const newXp = Math.min(char.xpToNext, char.xp + gainXp);

  return (
    <div className="rounded-xl border border-slate-700/40 p-4"
      style={{ background: 'rgba(2,4,14,0.75)' }}>
      <div className="flex items-center gap-3 mb-3">
        <img src={char.portrait} alt={char.displayName}
          className="w-10 h-10 rounded-full object-cover border border-slate-600/50" />
        <div className="flex-1 min-w-0">
          <p className="font-orbitron text-[11px] text-white">{char.displayName}</p>
          <p className="text-[10px] text-purple-400">Level {char.level}</p>
        </div>
        {leveledUp && (
          <span className="text-yellow-400 text-xs font-bold font-orbitron animate-pulse shrink-0">▲ LEVEL UP!</span>
        )}
      </div>
      <AnimatedXPBar prevXp={char.xp} gainXp={gainXp} xpToNext={char.xpToNext} />
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-500">{newXp} / {char.xpToNext} XP</span>
        <span className="text-[10px] text-purple-400">+{gainXp}</span>
      </div>
    </div>
  );
}

export default function RewardsScreen({ runState, onCollect }: Props) {
  const { pendingRewards, characters } = runState;
  if (!pendingRewards) return null;

  const { gold, xp, cardChoices, itemDrop } = pendingRewards;

  const [chosenCard, setChosenCard] = useState<string | null>(null);
  const [selectedCharForItem, setSelectedCharForItem] = useState<CharacterId | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const canEquip = itemDrop && selectedCharForItem !== null && selectedSlot !== null;

  const handleFinish = () => {
    const equipArg = (canEquip && itemDrop && selectedCharForItem !== null && selectedSlot !== null)
      ? { characterId: selectedCharForItem, slotIndex: selectedSlot, item: itemDrop }
      : null;
    onCollect(chosenCard, equipArg);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <ArenaBackground />

      <div className="relative z-10 flex-1 flex flex-col overflow-auto px-8 py-10 max-w-[940px] mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-orbitron text-[10px] tracking-[0.6em] text-purple-400 mb-2">ARENA</p>
          <h1 className="font-orbitron font-black text-5xl text-white"
            style={{ textShadow: '0 0 40px rgba(34,211,238,0.55)' }}>
            VICTORY
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Your clones have conquered this encounter</p>
        </div>

        {/* Gold + XP summary */}
        <div className="flex gap-4 mb-8 justify-center">
          <div className="rounded-xl border border-yellow-600/40 px-8 py-4 text-center"
            style={{ background: 'rgba(40,28,5,0.80)' }}>
            <p className="font-orbitron text-[10px] tracking-wider text-yellow-600 mb-1">GOLD EARNED</p>
            <p className="font-orbitron font-black text-4xl text-yellow-400">+{gold}</p>
          </div>
          <div className="rounded-xl border border-purple-600/40 px-8 py-4 text-center"
            style={{ background: 'rgba(30,10,60,0.80)' }}>
            <p className="font-orbitron text-[10px] tracking-wider text-purple-400 mb-1">XP EARNED</p>
            <p className="font-orbitron font-black text-4xl text-purple-300">+{xp}</p>
          </div>
        </div>

        {/* Character XP progress */}
        <section className="mb-8">
          <h2 className="font-orbitron text-[11px] tracking-[0.4em] text-slate-500 mb-4">CHARACTER PROGRESS</h2>
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
              CHOOSE A CARD <span className="text-slate-500 normal-case tracking-normal font-sans text-[10px]">(or skip)</span>
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {cardChoices.map(card => {
                const selected = chosenCard === card.definitionId;
                const exColor = card.exclusiveTo ? EXCLUSIVE_COLOR[card.exclusiveTo] ?? '#94a3b8' : null;
                return (
                  <button key={card.definitionId}
                    onClick={() => setChosenCard(selected ? null : card.definitionId)}
                    className="rounded-xl border p-4 text-left transition-all duration-150 flex flex-col"
                    style={{
                      background: selected ? 'rgba(34,211,238,0.09)' : 'rgba(2,4,14,0.80)',
                      borderColor: selected ? 'rgba(34,211,238,0.75)' : 'rgba(100,120,150,0.30)',
                      boxShadow: selected ? '0 0 18px rgba(34,211,238,0.18)' : 'none',
                    }}>
                    {/* Exclusive badge */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{card.icon}</span>
                      {card.exclusiveTo ? (
                        <span className="font-orbitron text-[9px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: exColor!,
                            borderColor: exColor! + '60',
                            background: exColor! + '18',
                          }}>
                          {card.exclusiveTo}
                        </span>
                      ) : (
                        <span className="font-orbitron text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-600/40 text-slate-500"
                          style={{ background: 'rgba(100,100,120,0.15)' }}>
                          Shared
                        </span>
                      )}
                    </div>
                    <p className="font-orbitron font-bold text-sm text-white mb-1">{card.name}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed flex-1">{card.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-cyan-300 font-orbitron">{card.manaCost} Mana</span>
                      {selected && (
                        <span className="text-[10px] font-bold text-cyan-400 font-orbitron">✓ SELECTED</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Item drop */}
        {itemDrop && (
          <section className="mb-8">
            <h2 className="font-orbitron text-[11px] tracking-[0.4em] mb-4"
              style={{ color: TIER_COLOR[itemDrop.tier] }}>
              ITEM DROP — {itemDrop.tier.toUpperCase()}
            </h2>
            <div className="rounded-xl border p-5 mb-4 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={e => e.dataTransfer.setData('text', 'item')}
              style={{ borderColor: TIER_COLOR[itemDrop.tier] + '50', background: TIER_BG[itemDrop.tier] }}>
              <div className="flex items-start gap-4">
                <span className="text-3xl">{itemDrop.icon}</span>
                <div>
                  <p className="font-orbitron font-bold text-white text-base">{itemDrop.name}</p>
                  {itemDrop.targetCharacter && (
                    <p className="text-[10px] font-orbitron mt-0.5 mb-1" style={{ color: TIER_COLOR[itemDrop.tier] }}>
                      {itemDrop.targetCharacter.toUpperCase()} ONLY
                    </p>
                  )}
                  <p className="text-slate-300 text-[12px] mt-1 leading-relaxed">{itemDrop.description}</p>
                </div>
              </div>
            </div>

            <p className="font-orbitron text-[10px] text-slate-500 mb-3">EQUIP TO:</p>
            <div className="flex gap-3 flex-wrap">
              {characters
                .filter(c => !itemDrop.targetCharacter || c.id === itemDrop.targetCharacter)
                .map(c => (
                  <div key={c.id} className="rounded-xl border border-slate-700/40 p-3 min-w-[180px]"
                    style={{ background: selectedCharForItem === c.id ? 'rgba(34,211,238,0.08)' : 'rgba(2,4,14,0.80)' }}>
                    <button className="flex items-center gap-2 w-full mb-2"
                      onClick={() => { setSelectedCharForItem(c.id); setSelectedSlot(null); }}>
                      <img src={c.portrait} alt={c.displayName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-orbitron text-[11px] text-white">{c.displayName}</span>
                    </button>
                    <div className="flex gap-1.5 mt-1">
                      {c.items.map((slot, i) => {
                        const dKey = `${c.id}-${i}`;
                        const isDragOver = dragOver === dKey;
                        const isSelected = selectedCharForItem === c.id && selectedSlot === i;
                        return (
                          <button key={i}
                            onClick={() => { setSelectedCharForItem(c.id); setSelectedSlot(i); }}
                            onDragOver={e => { e.preventDefault(); setDragOver(dKey); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={e => { e.preventDefault(); setDragOver(null); setSelectedCharForItem(c.id); setSelectedSlot(i); }}
                            className="w-9 h-9 rounded-lg border text-sm flex items-center justify-center transition-all"
                            style={{
                              background: isSelected || isDragOver ? 'rgba(34,211,238,0.22)' : 'rgba(20,15,40,0.8)',
                              borderColor: isDragOver ? '#22d3ee' : isSelected ? '#22d3ee' : 'rgba(100,80,150,0.4)',
                              boxShadow: isDragOver ? '0 0 12px rgba(34,211,238,0.5)' : 'none',
                            }}>
                            {slot ? slot.icon : '·'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Continue */}
        <div className="flex justify-center mt-6 pb-4">
          <button onClick={handleFinish}
            className="font-orbitron font-bold px-14 py-4 rounded-xl text-sm tracking-widest transition-all duration-150 hover:scale-105"
            style={{
              background: 'rgba(34,211,238,0.12)',
              border: '2px solid rgba(34,211,238,0.65)',
              color: '#22d3ee',
              boxShadow: '0 0 24px rgba(34,211,238,0.18)',
            }}>
            CONTINUE →
          </button>
        </div>
      </div>
    </div>
  );
}
