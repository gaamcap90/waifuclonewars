// src/components/roguelike/SignatureLegendaryPicker.tsx
// Full-screen overlay shown after Act 1/2 boss kills.
// Player picks which of their 3 characters receives their Signature Legendary.
// If that character's item slots are all full, a slot picker forces a replacement choice.

import React, { useState } from "react";
import { CharacterRunState, CharacterId, RunItem } from "@/types/roguelike";
import { SIGNATURE_LEGENDARIES } from "@/data/roguelikeData";
import ArenaBackground from "@/ui/ArenaBackground";

interface Props {
  characters: CharacterRunState[];          // living chars on the team
  alreadyChosen: CharacterId[];             // chars who got theirs in a previous act
  onSelect: (charId: CharacterId, item: RunItem, forceSlotIdx?: number) => void;
}

const ACCENT = '#f59e0b';
const GLOW   = 'rgba(245,158,11,0.35)';

const TIER_COLOR: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#60a5fa', legendary: '#f59e0b',
};

export default function SignatureLegendaryPicker({ characters, alreadyChosen, onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<CharacterId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [swapSlotIdx, setSwapSlotIdx] = useState<number | null>(null);

  // Only offer living chars who haven't already received one
  const eligible = characters.filter(
    c => c.currentHp > 0 && !alreadyChosen.includes(c.id)
  );

  const selectedChar = selectedId ? characters.find(c => c.id === selectedId) : null;
  const needsSwap = selectedChar ? selectedChar.items.every(s => s !== null) : false;

  const handleConfirm = () => {
    if (!selectedId) return;
    const item = SIGNATURE_LEGENDARIES[selectedId];
    if (!item) return;
    if (needsSwap && swapSlotIdx === null) return; // must pick a slot
    onSelect(selectedId, item, needsSwap && swapSlotIdx !== null ? swapSlotIdx : undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <ArenaBackground />
      <div className="absolute inset-0 bg-black/85" />

      <div className="absolute pointer-events-none"
        style={{
          width: 800, height: 800, borderRadius: '50%',
          background: `radial-gradient(circle, ${GLOW} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          animation: 'anim-victory-glow-pulse 3s ease-in-out infinite',
        }} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" style={{ filter: `drop-shadow(0 0 20px ${ACCENT})` }}>⭐</div>
          <p className="font-orbitron text-[10px] tracking-[0.5em] uppercase mb-2"
            style={{ color: `${ACCENT}cc` }}>SIGNATURE LEGENDARY</p>
          <h1 className="font-orbitron font-black text-2xl text-white"
            style={{ textShadow: `0 0 30px ${GLOW}` }}>
            Choose Your Champion
          </h1>
          <p className="text-slate-400 text-[12px] mt-2 max-w-md mx-auto">
            One character receives their legendary artifact. The others will receive rare items instead.
          </p>
        </div>

        {/* Character cards */}
        <div className="flex gap-4 justify-center w-full mb-6">
          {eligible.map(char => {
            const item = SIGNATURE_LEGENDARIES[char.id];
            if (!item) return null;
            const isSelected = selectedId === char.id;
            const allFull = char.items.every(s => s !== null);

            return (
              <button key={char.id}
                onClick={() => { setSelectedId(char.id); setConfirming(false); setSwapSlotIdx(null); }}
                className="flex-1 max-w-[220px] rounded-2xl p-1 transition-all duration-300"
                style={{
                  background: isSelected
                    ? `linear-gradient(160deg, ${ACCENT}30, rgba(4,2,18,0.97))`
                    : 'rgba(4,2,18,0.97)',
                  border: isSelected ? `2px solid ${ACCENT}` : '2px solid rgba(80,50,140,0.35)',
                  boxShadow: isSelected ? `0 0 30px ${GLOW}, 0 0 60px ${GLOW}` : '0 4px 20px rgba(0,0,0,0.5)',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                }}>
                <div className="p-4">
                  <div className="flex flex-col items-center mb-3">
                    <div className="relative mb-2">
                      <img src={char.portrait} alt={char.displayName}
                        className="w-16 h-16 rounded-full object-cover"
                        style={{
                          border: isSelected ? `3px solid ${ACCENT}` : '3px solid rgba(100,80,160,0.4)',
                          boxShadow: isSelected ? `0 0 16px ${GLOW}` : 'none',
                        }} />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                          style={{ background: ACCENT, color: '#000', fontWeight: 900 }}>✓</div>
                      )}
                    </div>
                    <span className="font-orbitron font-bold text-[12px] text-white">{char.displayName}</span>
                    {allFull && (
                      <span className="font-orbitron text-[8px] mt-1 px-2 py-0.5 rounded"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                        SLOTS FULL — WILL REPLACE
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl p-3 mb-2"
                    style={{
                      background: isSelected ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? ACCENT + '40' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-orbitron font-bold text-[11px] leading-tight"
                          style={{ color: isSelected ? ACCENT : '#e2e8f0' }}>{item.name}</p>
                        <span className="font-orbitron text-[7px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: ACCENT, background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
                          SIGNATURE
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-snug">{item.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Slot picker — only shown when selected char has all slots full */}
        {selectedId && needsSwap && selectedChar && (
          <div className="w-full max-w-lg mb-6 p-4 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="font-orbitron text-[10px] text-red-400 mb-3 tracking-wider text-center uppercase">
              All slots full — choose item to replace:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {selectedChar.items.map((slotItem, idx) => {
                if (!slotItem) return null;
                const isChosen = swapSlotIdx === idx;
                return (
                  <button key={idx}
                    onClick={() => setSwapSlotIdx(idx)}
                    className="rounded-xl p-2 text-center transition-all"
                    style={{
                      background: isChosen ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isChosen ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: isChosen ? '0 0 10px rgba(239,68,68,0.25)' : 'none',
                    }}>
                    <div className="text-xl mb-1">{slotItem.icon}</div>
                    <div className="font-orbitron text-[7px] leading-tight text-center" style={{ color: TIER_COLOR[slotItem.tier] }}>
                      {slotItem.name}
                    </div>
                    {isChosen && <div className="text-red-400 text-[8px] mt-1">✓ Replace</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm button */}
        {selectedId && !confirming && (!needsSwap || swapSlotIdx !== null) && (
          <button onClick={() => setConfirming(true)}
            className="font-orbitron font-bold px-10 py-3 rounded-xl text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`,
              border: `2px solid ${ACCENT}80`,
              color: ACCENT,
              boxShadow: `0 0 20px ${GLOW}`,
            }}>
            BESTOW LEGENDARY →
          </button>
        )}

        {selectedId && confirming && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-slate-300 text-[12px] font-orbitron text-center max-w-sm">
              Give <span style={{ color: ACCENT }}>{SIGNATURE_LEGENDARIES[selectedId]?.name}</span> to{' '}
              <span className="text-white font-bold">{characters.find(c => c.id === selectedId)?.displayName}</span>
              {needsSwap && swapSlotIdx !== null && (
                <>, replacing <span className="text-red-400 font-bold">{selectedChar?.items[swapSlotIdx]?.name}</span></>
              )}?
            </p>
            <div className="flex gap-3">
              <button onClick={handleConfirm}
                className="font-orbitron font-bold px-8 py-2.5 rounded-xl text-sm tracking-widest transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT}15)`,
                  border: `2px solid ${ACCENT}`,
                  color: ACCENT,
                  boxShadow: `0 0 24px ${GLOW}`,
                }}>
                CONFIRM
              </button>
              <button onClick={() => setConfirming(false)}
                className="font-orbitron text-[11px] px-6 py-2.5 rounded-xl border border-slate-600/40 text-slate-500 hover:text-slate-300 transition-colors">
                BACK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
