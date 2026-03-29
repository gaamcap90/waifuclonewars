import React, { useState } from "react";
import { Card, Icon } from "@/types/game";

// ── Colour coding ─────────────────────────────────────────────────────────────
// Purple = Napoleon, Red = Genghis, Green = Da Vinci, Gray = shared

function cardBorderColor(card: Card): string {
  if (!card.exclusiveTo) return "border-gray-400";
  if (card.exclusiveTo.includes("Napoleon")) return "border-purple-500";
  if (card.exclusiveTo.includes("Genghis"))  return "border-red-500";
  if (card.exclusiveTo.includes("Da Vinci")) return "border-green-500";
  return "border-gray-400";
}

function cardGlowColor(card: Card): string {
  if (!card.exclusiveTo) return "shadow-gray-400/40";
  if (card.exclusiveTo.includes("Napoleon")) return "shadow-purple-500/60";
  if (card.exclusiveTo.includes("Genghis"))  return "shadow-red-500/60";
  if (card.exclusiveTo.includes("Da Vinci")) return "shadow-green-500/60";
  return "shadow-gray-400/40";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Can `executor` play `card`?
 * - Exclusive cards: executor.name must include the exclusiveTo substring
 * - Executor must have enough mana
 */
function canPlay(card: Card, executor: Icon | null, cardLockActive: boolean): boolean {
  if (!executor) return false;
  if (!executor.isAlive) return false;
  if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) return false;
  const mana = executor.stats.mana ?? 0;
  return mana >= card.manaCost;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ManaPipProps {
  current: number;
  max: number;
}

const ManaPips: React.FC<ManaPipProps> = ({ current, max }) => (
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
  cardLockActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

const CardTile: React.FC<CardTileProps> = ({
  card,
  executor,
  cardLockActive,
  isSelected,
  onSelect,
}) => {
  const playable = canPlay(card, executor, cardLockActive);
  const isUltimate = card.type === "ultimate";

  return (
    <button
      onClick={playable ? onSelect : undefined}
      title={card.description}
      className={[
        "relative flex flex-col items-center justify-between",
        "w-20 h-28 rounded-xl border-2 px-1.5 py-1.5",
        "transition-all duration-150 select-none",
        // base bg
        isUltimate
          ? "bg-gradient-to-b from-yellow-950 to-gray-900"
          : "bg-gradient-to-b from-gray-800 to-gray-950",
        // border colour per character
        cardBorderColor(card),
        // glow when selected
        isSelected
          ? `shadow-lg ${cardGlowColor(card)} scale-110 -translate-y-3 z-20`
          : "shadow-sm",
        // disabled: greyed out
        !playable
          ? "opacity-40 cursor-not-allowed grayscale"
          : "cursor-pointer hover:-translate-y-2 hover:scale-105 hover:z-10",
      ].join(" ")}
    >
      {/* Mana cost pip — top-left */}
      <div
        className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${manaCostColor(card.manaCost)}`}
      >
        {card.manaCost}
      </div>

      {/* Ultimate badge */}
      {isUltimate && (
        <div className="absolute -top-2 -right-2 text-xs bg-yellow-500 text-black rounded-full px-1 font-bold leading-4">
          ULT
        </div>
      )}

      {/* Card type icon */}
      <div className="text-xl mt-1">{cardTypeIcon(card.type)}</div>

      {/* Card name */}
      <div className="text-center text-white font-semibold leading-tight text-[10px] px-0.5">
        {card.name}
      </div>

      {/* Effect summary */}
      <div className="text-center text-gray-400 text-[9px] leading-tight px-0.5 truncate w-full">
        {card.effect.damage   ? `${card.effect.damage} dmg`    : ""}
        {card.effect.healing  ? `+${card.effect.healing} HP`   : ""}
        {card.effect.atkBonus ? `+${card.effect.atkBonus} ATK` : ""}
        {card.effect.defBonus ? `+${card.effect.defBonus} DEF` : ""}
        {card.effect.moveBonus ? `+${card.effect.moveBonus} MOV` : ""}
        {card.effect.teamDmgPct ? `+${card.effect.teamDmgPct}% team` : ""}
      </div>
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface CardHandProps {
  /** Cards currently in hand */
  cards: Card[];
  /** The currently selected/active character (executor) */
  executor: Icon | null;
  /** All alive characters for the active player (to show mana pips) */
  activeIcons: Icon[];
  /** Whether a card has already been played this turn (locks movement) */
  cardLockActive: boolean;
  /** Draw pile size — shown bottom-right like Slay the Spire */
  drawPileSize: number;
  /** Discard pile size — shown bottom-left */
  discardPileSize: number;
  /** Called when the player confirms playing a card */
  onPlayCard: (card: Card, executorId: string) => void;
}

const CardHand: React.FC<CardHandProps> = ({
  cards,
  executor,
  activeIcons,
  cardLockActive,
  drawPileSize,
  discardPileSize,
  onPlayCard,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const handleCardClick = (card: Card) => {
    if (selectedCardId === card.id) {
      // Second click on same card = confirm play
      if (executor && canPlay(card, executor, cardLockActive)) {
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
            <ManaPips
              current={icon.stats.mana ?? 0}
              max={icon.stats.maxMana ?? 3}
            />
          </div>
        ))}
      </div>

      {/* ── Card fan ── */}
      <div className="relative flex items-end justify-center gap-1 pointer-events-auto">
        {/* Discard pile counter — bottom-left */}
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
            cardLockActive={cardLockActive}
            isSelected={card.id === selectedCardId}
            onSelect={() => handleCardClick(card)}
          />
        ))}

        {/* Draw pile counter — bottom-right */}
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
          {cardLockActive ? "" : " — movement will lock"}
        </div>
      )}
    </div>
  );
};

export default CardHand;
