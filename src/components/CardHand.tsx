import React, { useState } from "react";
import { Card, Icon } from "@/types/game";

// ── Colour coding by exclusive character ──────────────────────────────────────
function charColor(card: Card): { border: string; ribbon: string; glow: string } {
  if (!card.exclusiveTo) return { border: "border-gray-500", ribbon: "bg-gray-700", glow: "shadow-gray-400/30" };
  if (card.exclusiveTo.includes("Napoleon")) return { border: "border-purple-500", ribbon: "bg-purple-700", glow: "shadow-purple-500/60" };
  if (card.exclusiveTo.includes("Genghis"))  return { border: "border-red-500",    ribbon: "bg-red-700",    glow: "shadow-red-500/60" };
  if (card.exclusiveTo.includes("Da Vinci")) return { border: "border-green-500",  ribbon: "bg-green-700",  glow: "shadow-green-500/60" };
  return { border: "border-gray-500", ribbon: "bg-gray-700", glow: "shadow-gray-400/30" };
}

function charLabel(card: Card): string | null {
  if (!card.exclusiveTo) return null;
  if (card.exclusiveTo.includes("Napoleon")) return "Napoleon";
  if (card.exclusiveTo.includes("Genghis"))  return "Genghis";
  if (card.exclusiveTo.includes("Da Vinci")) return "Da Vinci";
  return null;
}

function cardTypeIcon(type: Card["type"]): string {
  switch (type) {
    case "attack":   return "⚔️";
    case "defense":  return "🛡️";
    case "buff":     return "⬆️";
    case "movement": return "💨";
    case "ultimate": return "✨";
    default:         return "🃏";
  }
}

function manaCostColor(cost: number): string {
  if (cost === 0) return "bg-gray-700 text-gray-300";
  if (cost <= 2)  return "bg-blue-700 text-blue-100";
  if (cost <= 3)  return "bg-indigo-700 text-indigo-100";
  return "bg-purple-800 text-purple-100";
}

function effectLabel(card: Card, executor: Icon | null): string {
  const e = card.effect;
  if (e.damageType === 'atk') {
    const might = executor?.stats.might ?? 0;
    const buffed = might + (executor?.cardBuffAtk ?? 0);
    return buffed > 0 ? `${buffed} Might dmg` : "Might dmg";
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

function canPlay(card: Card, executor: Icon | null): boolean {
  if (!executor || !executor.isAlive) return false;
  if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) return false;
  const mana = executor.stats.mana ?? 0;
  return mana >= card.manaCost;
}

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
}

const CardTile: React.FC<CardTileProps> = ({ card, executor, isSelected, isExhausted, onSelect }) => {
  const playable = !isExhausted && canPlay(card, executor);
  const isUltimate = card.type === "ultimate";
  const colors = charColor(card);
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
        title={`${card.name} — Exhausted (used once per combat)`}
      >
        <div className="text-xs font-bold text-gray-400 text-center">EXHAUSTED</div>
        <div className="text-lg mt-1">{cardTypeIcon(card.type)}</div>
        <div className="text-[9px] text-gray-500 text-center mt-1">{card.name}</div>
      </div>
    );
  }

  return (
    <button
      onClick={playable ? onSelect : undefined}
      title={card.description}
      className={[
        "relative flex flex-col items-start justify-between",
        "w-20 h-28 rounded-xl border-2 overflow-hidden",
        "transition-all duration-150 select-none",
        isUltimate
          ? "bg-gradient-to-b from-yellow-950 to-gray-900"
          : "bg-gradient-to-b from-gray-800 to-gray-950",
        colors.border,
        isSelected
          ? `shadow-lg ${colors.glow} scale-110 -translate-y-3 z-20`
          : "shadow-sm",
        !playable
          ? "opacity-40 cursor-not-allowed grayscale"
          : "cursor-pointer hover:-translate-y-2 hover:scale-105 hover:z-10",
      ].join(" ")}
    >
      {/* Character ribbon at top */}
      <div className={["w-full px-1 py-0.5 flex items-center justify-between", colors.ribbon].join(" ")}>
        <span className="text-[8px] text-white/80 font-semibold truncate">
          {label ?? "Shared"}
        </span>
        <span className="text-[9px]">{cardTypeIcon(card.type)}</span>
      </div>

      {/* Mana cost pip */}
      <div className={`absolute top-5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${manaCostColor(card.manaCost)} shadow`}>
        {card.manaCost}
      </div>

      {/* Ultimate badge */}
      {isUltimate && (
        <div className="absolute top-5 -right-1.5 text-[8px] bg-yellow-500 text-black rounded-full px-1 font-bold leading-4">
          ULT
        </div>
      )}

      {/* Card name */}
      <div className="px-1 text-white font-semibold leading-tight text-[10px] flex-1 flex items-center">
        {card.name}
      </div>

      {/* Effect summary */}
      <div className="px-1 pb-1.5 text-center text-gray-300 text-[9px] leading-tight w-full">
        {effectLabel(card, executor)}
      </div>
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface CardHandProps {
  cards: Card[];
  executor: Icon | null;
  activeIcons: Icon[];
  cardLockActive: boolean;
  drawPileSize: number;
  discardPileSize: number;
  exhaustedUltimates?: string[];
  onPlayCard: (card: Card, executorId: string) => void;
}

const CardHand: React.FC<CardHandProps> = ({
  cards,
  executor,
  activeIcons,
  drawPileSize,
  discardPileSize,
  exhaustedUltimates = [],
  onPlayCard,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const handleCardClick = (card: Card) => {
    if (selectedCardId === card.id) {
      if (executor && canPlay(card, executor)) {
        onPlayCard(card, executor.id);
        setSelectedCardId(null);
      }
    } else {
      setSelectedCardId(card.id);
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center pointer-events-none">
      {/* ── Per-character mana bars ── */}
      <div className="flex gap-4 mb-2 pointer-events-none">
        {activeIcons.map((icon) => (
          <div key={icon.id} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-gray-400 truncate max-w-[72px]">
              {icon.name.replace("-chan", "")}
            </span>
            <ManaPips current={icon.stats.mana ?? 0} max={icon.stats.maxMana ?? 3} />
          </div>
        ))}
      </div>

      {/* ── Card fan ── */}
      <div className="relative flex items-end justify-center gap-1 pointer-events-auto">
        {/* Discard pile */}
        <div className="absolute -left-12 bottom-0 flex flex-col items-center text-gray-500">
          <div className="w-10 h-14 rounded-lg border border-gray-600 bg-gray-900 flex items-center justify-center text-sm font-bold text-gray-400">
            {discardPileSize}
          </div>
          <span className="text-[9px] mt-0.5">discard</span>
        </div>

        {cards.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            executor={executor}
            isSelected={card.id === selectedCardId}
            isExhausted={card.type === "ultimate" && exhaustedUltimates.includes(card.definitionId)}
            onSelect={() => handleCardClick(card)}
          />
        ))}

        {/* Draw pile */}
        <div className="absolute -right-12 bottom-0 flex flex-col items-center text-gray-500">
          <div className="w-10 h-14 rounded-lg border border-gray-600 bg-gray-900 flex items-center justify-center text-sm font-bold text-gray-400">
            {drawPileSize}
          </div>
          <span className="text-[9px] mt-0.5">draw</span>
        </div>
      </div>

      {/* ── Confirm / cancel hint ── */}
      {selectedCard && (
        <div className="mt-2 text-xs text-yellow-300 animate-pulse pointer-events-none">
          Click again to play &ldquo;{selectedCard.name}&rdquo;
        </div>
      )}
    </div>
  );
};

export default CardHand;
