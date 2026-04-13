import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, Icon, GameState } from "@/types/game";
import { calcEffectiveStats } from "@/combat/buffs";
import { useT } from "@/i18n";

// ── Colour coding by exclusive character ──────────────────────────────────────
function charColor(card: Card): { border: string; ribbon: string; glow: string } {
  if (!card.exclusiveTo) return { border: "border-gray-500", ribbon: "bg-gray-700", glow: "shadow-gray-400/30" };
  if (card.exclusiveTo.includes("Napoleon")) return { border: "border-purple-500", ribbon: "bg-purple-700", glow: "shadow-purple-500/60" };
  if (card.exclusiveTo.includes("Genghis"))  return { border: "border-red-500",    ribbon: "bg-red-700",    glow: "shadow-red-500/60" };
  if (card.exclusiveTo.includes("Da Vinci"))  return { border: "border-green-500",  ribbon: "bg-green-700",  glow: "shadow-green-500/60" };
  if (card.exclusiveTo.includes("Leonidas")) return { border: "border-amber-500",  ribbon: "bg-amber-700",  glow: "shadow-amber-500/60" };
  if (card.exclusiveTo.includes("Sun-sin"))  return { border: "border-cyan-500",   ribbon: "bg-cyan-700",   glow: "shadow-cyan-500/60" };
  if (card.exclusiveTo.includes("Beethoven")) return { border: "border-violet-500", ribbon: "bg-violet-700", glow: "shadow-violet-500/60" };
  if (card.exclusiveTo.includes("Huang"))    return { border: "border-orange-700",  ribbon: "bg-orange-900", glow: "shadow-orange-700/60" };
  return { border: "border-gray-500", ribbon: "bg-gray-700", glow: "shadow-gray-400/30" };
}

function charLabel(card: Card): string | null {
  if (!card.exclusiveTo) return null;
  if (card.exclusiveTo.includes("Napoleon")) return "Napoleon";
  if (card.exclusiveTo.includes("Genghis"))  return "Genghis";
  if (card.exclusiveTo.includes("Da Vinci")) return "Da Vinci";
  if (card.exclusiveTo.includes("Leonidas")) return "Leonidas";
  if (card.exclusiveTo.includes("Sun-sin"))  return "Sun-sin";
  if (card.exclusiveTo.includes("Beethoven")) return "Beethoven";
  if (card.exclusiveTo.includes("Huang"))    return "Huang-chan";
  return null;
}

function cardTypeIcon(type: Card["type"]): string {
  switch (type) {
    case "attack":   return "⚔️";
    case "defense":  return "🛡️";
    case "buff":     return "⬆️";
    case "movement": return "💨";
    case "ultimate": return "✨";
    case "debuff":   return "☠️";
    case "curse":    return "💀";
    default:         return "🃏";
  }
}

function cardArtSrc(card: Card): string | null {
  const e = card.effect;
  // Specific summon art
  if (e.summonCavalry)                               return "/art/cards/terracotta_cavalry.png";
  if (e.summonTerracotta)                            return "/art/cards/terracotta_warrior.png";
  // Da Vinci ultimate
  if (card.type === "ultimate" && card.exclusiveTo?.includes("Da Vinci")) return "/art/cards/vitruvian_guardian.png";
  // Generic ultimate
  if (card.type === "ultimate")                      return "/art/cards/ultimate.png";
  // Debuff types — specific art per debuff
  if (e.debuffType === 'armor_break')                return "/art/cards/armor_break.png";
  if (e.debuffType === 'rooted' || e.aoeRooted) return "/art/cards/armor_break.png";
  if (e.debuffType === 'mud_throw')                  return "/art/cards/mud_throw.png";
  if (e.debuffType === 'poison')                     return "/art/cards/poison_dart.png";
  if (e.debuffType === 'silence')                    return "/art/cards/silence.png";
  // Buff cards
  if (e.swapCount)                                   return "/art/cards/gamble.png";
  if (e.atkBonus && !e.teamDmgPct)                   return "/art/cards/battle_cry.png";
  if (e.teamDmgPct)                                  return "/art/cards/attack.png";
  // Defense / heal / movement
  if (e.healing || e.healingMult || e.healZone)      return "/art/cards/heal.png";
  if (e.defBonus || e.teamDefBuff)                   return "/art/cards/defense.png";
  if (e.moveBonus || e.teleport)                     return "/art/cards/movement.png";
  // Attacks
  if (card.type === "attack" || card.type === "debuff") return "/art/cards/attack.png";
  return "/art/cards/heal.png";
}

function manaCostColor(cost: number): string {
  if (cost === 0) return "bg-gray-700 text-gray-300";
  if (cost <= 2)  return "bg-blue-700 text-blue-100";
  if (cost <= 3)  return "bg-indigo-700 text-indigo-100";
  return "bg-purple-800 text-purple-100";
}

function curseEffectLabel(card: Card): string {
  switch (card.definitionId) {
    case 'curse_burden':    return 'Deck clutter — no penalty, just dead space';
    case 'curse_malaise':   return '⚠ End turn: 1 dmg per unplayed card';
    case 'curse_void_echo': return '⚠ Turn start: −2 mana this turn';
    case 'curse_dread':     return '⚠ End turn: 25% chance to stun each char';
    case 'curse_chains':    return '⚠ End turn: all chars take 10 damage';
    default:                return '⚠ Curse — play to discard';
  }
}

function effectLabel(card: Card, executor: Icon | null, gameState?: GameState): string {
  // Curse cards show their passive penalty instead of an active effect
  if (card.type === 'curse') return curseEffectLabel(card);

  const e = card.effect;
  // Teleport card (Flying Machine)
  if (e.teleport) return `Teleport r${e.range ?? 5}`;
  // Self-cast heal (Mend)
  if (e.selfCast && e.healing) return `+${e.healing} HP (self)`;
  // Debuff cards
  if (e.debuffType) {
    switch (e.debuffType) {
      case 'mud_throw':   return `-${e.debuffMagnitude} MOV (${e.debuffDuration}t)`;
      case 'rooted':      return `Root (${e.debuffDuration}t)`;
      case 'armor_break': return `-${e.debuffMagnitude} DEF (${e.debuffDuration}t)`;
      case 'silence':     return `Silence (${e.debuffDuration}t)`;
      case 'poison':      return `Poison (−${e.debuffMagnitude}/t)`;
    }
  }
  if (e.damageType === 'atk') {
    if (executor && gameState) {
      const eff = calcEffectiveStats(gameState, executor);
      const might = eff.might + (executor.cardBuffAtk ?? 0);
      if (e.mightMult !== undefined) {
        const atk = Math.floor(might * e.mightMult);
        return atk > 0 ? `${atk} atk` : "Might atk";
      }
      const buffed = Math.floor(might);
      return buffed > 0 ? `${buffed} Might dmg` : "Might dmg";
    }
    const might = executor?.stats.might ?? 0;
    if (e.mightMult !== undefined) return "Might atk";
    return might > 0 ? `${might} Might dmg` : "Might dmg";
  }
  if (e.powerMult !== undefined) {
    if (executor && gameState) {
      const eff = calcEffectiveStats(gameState, executor);
      const est = Math.floor(eff.power * e.powerMult);
      const suffix = e.randomTargets ? ` ×${e.multiHit ?? 3} rnd` : e.allEnemiesInRange ? " (AoE)" : e.lineTarget ? " (Line)" : "";
      return `~${est} dmg${suffix}`;
    }
    const power = executor?.stats.power ?? 0;
    const est = Math.floor(power * e.powerMult);
    const suffix = e.randomTargets ? ` ×${e.multiHit ?? 3} rnd` : e.allEnemiesInRange ? " (AoE)" : e.lineTarget ? " (Line)" : "";
    return `~${est} dmg${suffix}`;
  }
  if (e.damage)    return `${e.damage} dmg`;
  if (e.healing)   return `+${e.healing} HP`;
  if (e.atkBonus)  return `+${e.atkBonus} MIGHT`;
  if (e.defBonus)  return `+${e.defBonus} DEF`;
  if (e.moveBonus) return `+${e.moveBonus} MOV`;
  if (e.teamDmgPct) return `+${e.teamDmgPct}% team`;
  return "";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canPlay(card: Card, executor: Icon | null, globalMana: number): boolean {
  if (!executor || !executor.isAlive) return false;
  // Curses are never playable — they linger in hand and can only be removed at a Campfire
  if (card.definitionId.startsWith('curse_')) return false;
  if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) return false;
  // Silenced units cannot use ability cards (exclusiveTo !== null cards are ability cards)
  if (executor.debuffs?.some(d => d.type === 'silence') && card.exclusiveTo !== null) return false;
  // Terracotta units: warriors/archers may only use basic attack; cavalry may also use cavalry charge
  if (executor.name.includes("Terracotta")) {
    const isCavalry = executor.name.includes("Cavalry");
    const allowed = card.definitionId === "shared_basic_attack" ||
      (isCavalry && card.definitionId === "huang_cavalry_charge");
    if (!allowed) return false;
  }
  return globalMana >= card.manaCost;
}

// ── Pile Viewer Modal ─────────────────────────────────────────────────────────

const PileModal: React.FC<{ title: string; cards: Card[]; onClose: () => void }> = ({ title, cards, onClose }) => {
  const { t } = useT();
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-[480px] max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">{title} ({cards.length})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600">✕</button>
        </div>
        {cards.length === 0 ? (
          <div className="text-gray-500 text-xs text-center py-4">{t.game.hud.emptyPile}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {cards.map((c) => {
              const isCurseCard = c.definitionId.startsWith('curse_');
              const colors = isCurseCard
                ? { border: 'border-red-800', ribbon: 'bg-red-950', glow: '' }
                : charColor(c);
              const tCard = (t.cards as Record<string, { name: string; description: string }>)[c.definitionId];
              // Upgraded cards have name ending '+' — use card.name directly; otherwise use translation
              const isUpgraded = c.name.endsWith('+');
              const cardDisplayName = isUpgraded ? c.name : (tCard?.name ?? c.name);
              const cardDisplayDesc = isUpgraded ? c.description : (tCard?.description ?? c.description);
              return (
                <div key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${isCurseCard ? 'bg-red-950/40' : 'bg-gray-800'} ${colors.border}`}>
                  {isCurseCard ? (
                    <span className="text-base w-8 h-8 flex items-center justify-center">☠️</span>
                  ) : (() => {
                    const art = cardArtSrc(c);
                    return art
                      ? <img src={art} alt={c.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      : <span className="text-base w-8 h-8 flex items-center justify-center">{cardTypeIcon(c.type)}</span>;
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: isCurseCard ? '#fca5a5' : isUpgraded ? '#34d399' : 'white' }}>
                      {cardDisplayName}
                      {isCurseCard && <span className="ml-1 text-[8px] text-red-400 font-bold">CURSE</span>}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: isUpgraded ? '#34d399' : '#9ca3af' }}>{cardDisplayDesc}</div>
                  </div>
                  <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${manaCostColor(c.manaCost)}`}>{c.manaCost}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ManaPips: React.FC<{ current: number; max: number }> = ({ current, max }) => (
  <div className="flex gap-0.5 items-center">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 rounded-full border border-blue-400 transition-colors ${
          i < current ? "bg-blue-400" : "bg-blue-950"
        }`}
      />
    ))}
  </div>
);

interface CardTileProps {
  card: Card;
  executor: Icon | null;
  isSelected: boolean;
  isExhausted?: boolean;
  onSelect: () => void;
  gameState?: GameState;
}

const CardTile: React.FC<CardTileProps & { globalMana: number }> = ({ card, executor, isSelected, isExhausted, onSelect, globalMana, gameState }) => {
  const { t } = useT();
  const tCard = (t.cards as Record<string, { name: string; description: string }>)[card.definitionId];
  // Upgraded cards end with '+' — use card.name directly; otherwise prefer translation for localization
  const isUpgraded = card.name.endsWith('+');
  const cardName = isUpgraded ? card.name : (tCard?.name ?? card.name);
  const playable = !isExhausted && canPlay(card, executor, globalMana);
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current || !playable) return;
    const rect = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2))  / (rect.width  / 2);
    const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
    setTilt({ rx: -dy * 7, ry: dx * 10 });
  };

  const handleCardMouseLeave = () => setTilt({ rx: 0, ry: 0 });
  const isUltimate = card.type === "ultimate";
  const isCurse = card.definitionId.startsWith('curse_');
  const colors = isCurse
    ? { border: 'border-red-800', ribbon: 'bg-red-950', glow: 'shadow-red-900/60' }
    : charColor(card);
  const label = charLabel(card);

  if (isExhausted) {
    return (
      <div
        className={[
          "relative flex flex-col items-center justify-center",
          "w-20 h-28 rounded-xl border-2 px-1.5 py-1.5",
          "bg-gradient-to-b from-gray-900 to-black opacity-40 grayscale",
          colors.border,
        ].join(" ")}
        title={`${cardName} — Exhausted (used once per combat)`}
      >
        <div className="text-xs font-bold text-gray-400 text-center">{t.game.hud.exhausted}</div>
        <div className="text-lg mt-1">{cardTypeIcon(card.type)}</div>
        <div className="text-[9px] text-gray-500 text-center mt-1">{cardName}</div>
      </div>
    );
  }

  const art = cardArtSrc(card);

  // Character color as raw hex for inline glow effects
  const glowHex = isCurse ? '#991b1b'
    : isUltimate ? '#ca8a04'
    : !label ? '#4b5563'
    : label === 'Napoleon' ? '#7c3aed'
    : label === 'Genghis'  ? '#b91c1c'
    : label === 'Da Vinci' ? '#15803d'
    : label === 'Leonidas' ? '#b45309'
    : label === 'Sun-sin'  ? '#0e7490'
    : label === 'Beethoven'? '#6d28d9'
    : label === 'Huang-chan'? '#c2410c'
    : '#4b5563';

  return (
    <button
      ref={cardRef}
      onClick={playable ? onSelect : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleCardMouseLeave}
      className={[
        isCurse ? "" : "card-foil-hover",
        "relative flex flex-col items-start justify-between",
        "w-20 h-28 rounded-xl border-2 overflow-hidden",
        "select-none",
        isCurse ? "border-red-700 animate-curse-pulse" : colors.border,
        isSelected
          ? `scale-110 -translate-y-3 z-20`
          : "shadow-sm",
        !playable
          ? "opacity-40 cursor-not-allowed grayscale"
          : "cursor-pointer hover:z-10",
      ].join(" ")}
      style={{
        background: isCurse
          ? 'linear-gradient(160deg, #1f0000 0%, #0a0000 60%, #1a0008 100%)'
          : isUltimate
          ? 'linear-gradient(160deg, #2a1f00 0%, #0d0b00 100%)'
          : 'linear-gradient(160deg, #0f1118 0%, #060810 100%)',
        boxShadow: isCurse
          ? isSelected
            ? '0 0 0 2px #7f1d1d, 0 0 20px #7f1d1daa, 0 8px 24px rgba(0,0,0,0.8)'
            : '0 0 0 1px #7f1d1d66, 0 0 10px #7f1d1d44, 0 2px 8px rgba(0,0,0,0.6)'
          : isSelected
          ? `0 0 0 1px ${glowHex}99, 0 0 18px ${glowHex}66, 0 8px 24px rgba(0,0,0,0.7)`
          : playable
          ? `0 0 0 0px transparent, 0 2px 8px rgba(0,0,0,0.5)`
          : undefined,
        transform: (tilt.rx !== 0 || tilt.ry !== 0)
          ? `perspective(500px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-6px) scale(1.06)`
          : undefined,
        transition: (tilt.rx === 0 && tilt.ry === 0) ? 'transform 0.22s ease-out' : 'transform 0.07s linear',
      }}
    >
      {/* Curse stripe overlay — diagonal warning pattern */}
      {isCurse && (
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden" style={{
          backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(120,0,0,0.12) 6px, rgba(120,0,0,0.12) 8px)',
        }} />
      )}

      {/* Card art — full bleed, fades into card bg (curse: skull art or void) */}
      {art && !isCurse && (
        <>
          <img
            src={art}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.46, pointerEvents: 'none' }}
          />
          {/* Gradient over art — keeps top/bottom readable */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(to bottom,
              rgba(0,0,0,0.55) 0%,
              rgba(0,0,0,0.10) 30%,
              rgba(0,0,0,0.10) 55%,
              rgba(0,0,0,0.75) 100%)`,
          }} />
          {/* Character color tint at bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(to top, ${glowHex}44 0%, transparent 45%)`,
          }} />
        </>
      )}

      {/* Curse: large centered skull */}
      {isCurse && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.13 }}>
          <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>💀</span>
        </div>
      )}

      {/* Foil shimmer — only for non-curse cards */}
      {!isCurse && (
        <div className="card-foil-sheen absolute top-0 bottom-0 pointer-events-none" style={{
          left: '-80%',
          width: '60%',
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          transform: 'skewX(-12deg)',
        }} />
      )}

      {/* Inner frame line — decorative inset border */}
      <div className="absolute inset-[3px] rounded-lg pointer-events-none"
        style={{ border: `1px solid ${isCurse ? '#7f1d1d' : glowHex + '40'}` }} />

      {/* Header ribbon */}
      <div className="relative w-full px-1 py-0.5 flex items-center justify-between"
        style={{ background: isCurse ? 'linear-gradient(90deg, #7f1d1dee 0%, #450a0a88 100%)' : `linear-gradient(90deg, ${glowHex}cc 0%, ${glowHex}55 100%)` }}>
        <span className="text-[8px] font-bold tracking-wider truncate" style={{ color: isCurse ? '#fca5a5' : 'rgba(255,255,255,0.9)' }}>
          {isCurse ? '💀 CURSE' : (label ?? t.game.hud.sharedCard)}
        </span>
        <span className="text-[9px]">{cardTypeIcon(card.type)}</span>
      </div>

      {/* Mana cost gem — curses always 0, shown as dark */}
      <div className={`absolute top-5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isCurse ? 'bg-red-950 text-red-400 border border-red-800' : manaCostColor(card.manaCost)} shadow-lg`}
        style={{ boxShadow: '0 0 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.15) inset' }}>
        {card.manaCost}
      </div>

      {/* Ultimate badge */}
      {isUltimate && (
        <div className="absolute top-5 -right-1.5 text-[8px] bg-yellow-400 text-black rounded-full px-1 font-black leading-4"
          style={{ boxShadow: '0 0 8px rgba(250,210,0,0.70)' }}>
          ULT
        </div>
      )}

      {/* Card name */}
      <div className="relative px-1.5 font-bold leading-tight text-[10px] flex-1 flex items-center"
        style={{ color: isCurse ? '#fca5a5' : isUpgraded ? '#34d399' : 'white', textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)' }}>
        {cardName}
      </div>

      {/* Effect summary bar */}
      <div className="relative px-1.5 pb-1.5 text-center w-full"
        style={{
          background: 'rgba(0,0,0,0.60)',
          borderTop: `1px solid ${glowHex}33`,
        }}>
        <span className="text-[9px] font-semibold leading-tight"
          style={{ color: isUpgraded ? '#34d399' : 'rgba(220,220,240,0.92)', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {effectLabel(card, executor, gameState)}
        </span>
      </div>
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface CardHandProps {
  cards: Card[];
  drawPileCards?: Card[];
  discardPileCards?: Card[];
  executor: Icon | null;
  activeIcons: Icon[];
  cardLockActive: boolean;
  drawPileSize: number;
  discardPileSize: number;
  globalMana: number;
  exhaustedUltimates?: string[];
  onPlayCard: (card: Card, executorId: string) => void;
  onCardHover?: (cost: number | null) => void;
  onCardHoverRange?: (range: number | null) => void;
  onCardHoverExecutorId?: (id: string | null) => void;
  gameState?: GameState;
}

const CardHand: React.FC<CardHandProps> = ({
  cards,
  drawPileCards = [],
  discardPileCards = [],
  executor,
  activeIcons,
  drawPileSize,
  discardPileSize,
  globalMana,
  exhaustedUltimates = [],
  onPlayCard,
  onCardHover,
  onCardHoverRange,
  onCardHoverExecutorId,
  gameState,
}) => {
  const { t } = useT();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pileView, setPileView] = useState<'draw' | 'discard' | null>(null);
  const [flyingCardId, setFlyingCardId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ card: Card; rect: DOMRect } | null>(null);
  const prevCardIdsRef = useRef<Set<string>>(new Set(cards.map(c => c.id)));
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    const currentIds = new Set(cards.map(c => c.id));
    const newIds = new Set<string>();
    currentIds.forEach(id => {
      if (!prevCardIdsRef.current.has(id)) newIds.add(id);
    });
    if (newIds.size > 0) {
      setNewCardIds(newIds);
      const t = setTimeout(() => setNewCardIds(new Set()), 400);
      return () => clearTimeout(t);
    }
    prevCardIdsRef.current = currentIds;
  }, [cards]);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  }, []);
  const SCROLL_THRESHOLD = 8;

  const handleCardClick = (card: Card) => {
    if (!executor || !canPlay(card, executor, globalMana)) return;
    setFlyingCardId(card.id);
    setTimeout(() => setFlyingCardId(null), 420);
    onPlayCard(card, executor.id);
    setSelectedCardId(null);
  };

  return (
    <div className="relative w-full flex flex-col items-center pointer-events-none">
      {/* ── Card fan + piles row ── */}
      <div className="flex items-end justify-center gap-3 pointer-events-auto">
        {/* Discard pile */}
        <button
          onClick={() => setPileView('discard')}
          className="flex flex-col items-center gap-0.5 group flex-shrink-0"
          title="View discard pile"
        >
          <div className="w-12 h-16 rounded-lg border border-orange-700/60 bg-gray-900 flex flex-col items-center justify-center gap-1 group-hover:border-orange-500 transition-colors">
            <span className="text-lg">🗑️</span>
            <span className="text-sm font-bold text-orange-400">{discardPileSize}</span>
          </div>
          <span className="text-[9px] text-gray-500">{t.game.hud.discardLabel}</span>
        </button>

        {/* Cards */}
        {cards.length > SCROLL_THRESHOLD && (
          <button
            onClick={() => scroll(-1)}
            className="flex-shrink-0 w-7 h-10 rounded-lg bg-gray-800/80 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors flex items-center justify-center text-sm font-bold"
          >‹</button>
        )}
        <div
          ref={scrollRef}
          className={`flex items-end gap-1 ${cards.length > SCROLL_THRESHOLD ? 'overflow-x-hidden' : ''}`}
          style={cards.length > SCROLL_THRESHOLD ? { maxWidth: `${SCROLL_THRESHOLD * 84}px` } : undefined}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative${newCardIds.has(card.id) ? ' card-draw-in' : ''}`}
              onMouseEnter={(e) => {
                onCardHover?.(card.manaCost ?? 0);
                // For exclusive cards, use that character as the range-preview executor (not the currently selected character)
                const cardOwner = card.exclusiveTo
                  ? activeIcons.find(i => i.name.includes(card.exclusiveTo as string)) ?? executor
                  : executor;
                // Resolve effective hover range: explicit range, OR basic-attack → use executor's actual attack range
                const explicitRange = typeof card.effect?.range === 'number' ? card.effect.range : null;
                let hoverRange: number | null = explicitRange;
                if (card.definitionId === 'sunsin_hwajeon' && cardOwner) {
                  // Hwajeon on water → Ramming Speed (range 1); on land → Hwajeon (range 3)
                  const ownerTile = gameState?.board?.find(t =>
                    t.coordinates.q === cardOwner.position.q && t.coordinates.r === cardOwner.position.r
                  );
                  hoverRange = ['river', 'lake'].includes(ownerTile?.terrain.type ?? '') ? 1 : 3;
                } else if (!hoverRange && card.definitionId === 'shared_basic_attack' && cardOwner) {
                  const isRanged = cardOwner.name.includes("Napoleon") || cardOwner.name.includes("Da Vinci") || cardOwner.name.includes("Beethoven");
                  const onWaterTile = ['river', 'lake'].includes(gameState?.board?.find(t =>
                    t.coordinates.q === cardOwner.position.q && t.coordinates.r === cardOwner.position.r
                  )?.terrain.type ?? '');
                  const sunsinOnWater = cardOwner.name.includes("Sun-sin") && onWaterTile;
                  hoverRange = sunsinOnWater ? 3 : isRanged ? 2 : (cardOwner.stats.attackRange ?? 1);
                }
                onCardHoverRange?.(hoverRange);
                onCardHoverExecutorId?.(cardOwner?.id ?? null);
                setTooltip({ card, rect: e.currentTarget.getBoundingClientRect() });
              }}
              onMouseLeave={() => {
                onCardHover?.(null);
                onCardHoverRange?.(null);
                onCardHoverExecutorId?.(null);
                setTooltip(null);
              }}
              style={flyingCardId === card.id ? {
                animation: 'anim-card-flyout 0.42s ease-in forwards',
                pointerEvents: 'none',
              } : undefined}
            >
              <CardTile
                card={card}
                executor={executor}
                isSelected={card.id === selectedCardId}
                isExhausted={card.type === "ultimate" && exhaustedUltimates.includes(card.definitionId)}
                onSelect={() => handleCardClick(card)}
                globalMana={globalMana}
                gameState={gameState}
              />
            </div>
          ))}
        </div>
        {cards.length > SCROLL_THRESHOLD && (
          <button
            onClick={() => scroll(1)}
            className="flex-shrink-0 w-7 h-10 rounded-lg bg-gray-800/80 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors flex items-center justify-center text-sm font-bold"
          >›</button>
        )}

        {/* Draw pile */}
        <button
          onClick={() => setPileView('draw')}
          className="flex flex-col items-center gap-0.5 group flex-shrink-0"
          title="View draw pile"
        >
          <div className="w-12 h-16 rounded-lg border border-blue-700/60 bg-gray-900 flex flex-col items-center justify-center gap-1 group-hover:border-blue-500 transition-colors">
            <span className="text-lg">🃏</span>
            <span className="text-sm font-bold text-blue-400">{drawPileSize}</span>
          </div>
          <span className="text-[9px] text-gray-500">{t.game.hud.drawLabel}</span>
        </button>
      </div>

      {/* ── Confirm / cancel hint ── */}
      {selectedCard && (
        <div className="mt-2 text-xs text-yellow-300 animate-pulse pointer-events-none">
          Click again to play &ldquo;{selectedCard.name}&rdquo;
        </div>
      )}

      {/* ── Pile view modals ── */}
      {pileView === 'discard' && (
        <PileModal title={t.game.hud.discardPileTitle} cards={discardPileCards} onClose={() => setPileView(null)} />
      )}
      {pileView === 'draw' && (
        <PileModal title={t.game.hud.drawPileTitle} cards={drawPileCards} onClose={() => setPileView(null)} />
      )}

      {/* ── Card hover tooltip (portal, fixed positioning to escape overflow-hidden) ── */}
      {tooltip && createPortal(
        <div
          className="pointer-events-none z-[9999]"
          style={{
            position: 'fixed',
            left: tooltip.rect.left + tooltip.rect.width / 2,
            top: tooltip.rect.top - 8,
            transform: 'translate(-50%, -100%)',
            minWidth: 200,
            maxWidth: 260,
          }}
        >
          <div className="rounded-xl shadow-2xl px-3 py-2.5"
            style={{ background: "rgba(4,2,18,0.98)", border: "1px solid rgba(100,70,160,0.55)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">{tooltip.card.type === 'ultimate' ? '✨' : tooltip.card.type === 'attack' ? '⚔️' : tooltip.card.type === 'defense' ? '🛡️' : tooltip.card.type === 'debuff' ? '☠️' : '⬆️'}</span>
              <span className="font-orbitron font-bold text-[12px] flex-1" style={{ color: tooltip.card.name.endsWith('+') ? '#34d399' : 'white' }}>
                {tooltip.card.name.endsWith('+') ? tooltip.card.name : ((t.cards as Record<string, { name: string; description: string }>)[tooltip.card.definitionId]?.name ?? tooltip.card.name)}
              </span>
              <span className="font-orbitron font-bold text-[11px] text-blue-300 shrink-0">{tooltip.card.manaCost} 💧</span>
            </div>
            <p className="text-[10px] leading-snug" style={{ color: tooltip.card.name.endsWith('+') ? '#34d399' : '#cbd5e1' }}>
              {tooltip.card.name.endsWith('+') ? tooltip.card.description : ((t.cards as Record<string, { name: string; description: string }>)[tooltip.card.definitionId]?.description ?? tooltip.card.description)}
            </p>
            {tooltip.card.effect?.range && tooltip.card.effect.range < 999 && (
              <div className="mt-1.5 text-[9px] font-orbitron text-cyan-400">◎ Range {tooltip.card.effect.range} hexes</div>
            )}
            {tooltip.card.type === 'ultimate' && (
              <div className="mt-1 text-[9px] font-orbitron text-yellow-400">⚡ EXHAUST — once per combat</div>
            )}
          </div>
          {/* Arrow pointing down */}
          <div className="flex justify-center">
            <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(100,70,160,0.55)' }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CardHand;
