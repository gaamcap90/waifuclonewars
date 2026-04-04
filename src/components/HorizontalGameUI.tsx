import React, { useState, useEffect } from "react";
import { GameState, Card as GameCard, Icon } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
import CardHand from "./CardHand";
import { Undo2 } from "lucide-react";
import { TurnQueueBar } from "./TurnQueueBar";
import { calcEffectiveStats } from "@/combat/buffs";

/* ===== Helpers (portraits, icons, pill styles) ===== */
const getCharacterPortrait = (name: string | undefined | null) => {
  if (!name) return null;
  if (name.includes("Napoleon")) return "/art/napoleon_portrait.png";
  if (name.includes("Genghis")) return "/art/genghis_portrait.png";
  if (name.includes("Da Vinci")) return "/art/davinci_portrait.png";
  if (name.includes("Leonidas")) return "/art/leonidas_portrait.png";
  return null;
};


/* ===== Types ===== */
interface RunItemSlot {
  icon: string;
  name: string;
  description: string;
}

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  onPlayCard: (card: GameCard, executorId: string) => void;
  onSelectIcon: (iconId: string) => void;
  hoveredTile?: any;
  currentTurnTimer: number;
  // Items from roguelike run (keyed by character name fragment)
  runItemsByCharacter?: Record<string, RunItemSlot[]>;
}

const HorizontalGameUI = ({
  gameState,
  onEndTurn,
  onUndoMovement,
  onRespawn,
  onPlayCard,
  onSelectIcon,
  hoveredTile,
  currentTurnTimer,
  runItemsByCharacter,
}: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{ id: string; position: { x: number; y: number } } | null>(null);

  const extGameState = gameState as any;
  const selectedIconId: string | undefined = extGameState.selectedIcon;

  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.playerId === gameState.activePlayerId && i.isAlive);

  // ability/attack toggle hint: show “Targeting active” helper while targeting
  const targetingActive = Boolean(gameState.targetingMode);

  // close popup on global event (kept from previous versions)
  useEffect(() => {
    const onGlobalClose = () => setSelectedCharacter(null);
    window.addEventListener("closeCharacterPopup", onGlobalClose);
    return () => window.removeEventListener("closeCharacterPopup", onGlobalClose);
  }, []);

  /* ========= Small UI helpers ========= */
  const Pill = ({
    selected,
    disabled,
    children,
    onClick,
  }: {
    selected?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-4 py-2 rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap",
        // base
        "relative will-change-transform",
        selected
          // selected look: strong contrast + ring + soft shadow + pulse
          ? "bg-foreground text-background border-foreground ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30 animate-pulse"
          // idle look
          : "bg-background/70 text-foreground border-border hover:bg-background",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-0.5 active:translate-y-0",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const ManaPips = ({ current, max }: { current: number; max: number }) => (
    <div className="flex gap-0.5 justify-center flex-wrap max-w-[48px]">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={["w-2 h-2 rounded-full border", i < current ? "bg-blue-400 border-blue-300" : "bg-muted border-border"].join(" ")} />
      ))}
    </div>
  );

  const StatBadge = ({ label, value }: { label: string; value: string }) => (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50">
      <CardContent className="px-4 py-3">
        <div className="text-[11px] font-semibold opacity-70">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  );

const BaseHPBar = ({ pid }: { pid: 0 | 1 }) => {
    const hp = gameState.baseHealth[pid];
    const maxHp = 150;
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>Base HP</span>
          <span className="opacity-70">{hp}/{maxHp}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-red-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const GlobalManaBar = ({ pid }: { pid: 0 | 1 }) => {
    const extState = gameState as any;
    const mana: number = extState.globalMana?.[pid] ?? 0;
    const maxMana: number = extState.globalMaxMana?.[pid] ?? 5;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>Mana</span>
          <span className="opacity-70">{mana}/{maxMana}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxMana }).map((_, i) => (
            <div
              key={i}
              className={[
                "flex-1 h-2 rounded-full border transition-colors",
                i < mana ? "bg-blue-400 border-blue-300" : "bg-muted border-border"
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    );
  };

  // ── Party HUD helpers ────────────────────────────────────────────────────
  const DEBUFF_META: Record<string, { icon: string; color: string; label: string }> = {
    mud_throw:   { icon: "🐾", color: "bg-yellow-900/80 border-yellow-600/60 text-yellow-200",  label: "Mud" },
    demoralize:  { icon: "💔", color: "bg-rose-900/80 border-rose-600/60 text-rose-200",         label: "Dem" },
    armor_break: { icon: "🔩", color: "bg-orange-900/80 border-orange-600/60 text-orange-200",   label: "Arm" },
    silence:     { icon: "🤫", color: "bg-purple-900/80 border-purple-600/60 text-purple-200",   label: "Sil" },
    poison:      { icon: "☠️", color: "bg-green-900/80 border-green-600/60 text-green-200",       label: "Psn" },
  };

  const CharacterRow = ({
    icon,
    teamColor,
    canSelect,
  }: { icon: Icon; teamColor: "blue" | "red"; canSelect: boolean }) => {
    const portrait = getCharacterPortrait(icon.name);
    const isSelected = icon.id === selectedIconId;
    const eff = calcEffectiveStats(gameState, icon);
    const borderClass = teamColor === "blue" ? "border-blue-400" : "border-red-400";
    const ringClass = teamColor === "blue" ? "ring-blue-300" : "ring-red-300";
    const bgClass = teamColor === "blue" ? "bg-blue-500/90" : "bg-red-500/90";

    const passiveDesc = (() => {
      if (icon.name.includes("Napoleon")) return "Vantage Point: Forest→Range 3, no DEF bonus";
      if (icon.name.includes("Genghis"))  return "Bloodlust: Kill→+15 Might+1 Mana (×3 max)";
      if (icon.name.includes("Da Vinci")) return "Tinkerer: No ability used→draw +1 card";
      if (icon.name === "Combat Drone")   return "Mechanical unit (expires in 2 turns)";
      return icon.passive ?? "";
    })();

    return (
      <div
        className={[
          "flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-colors",
          icon.isAlive
            ? isSelected
              ? "bg-yellow-950/40 border-yellow-500/50"
              : "bg-background/50 border-border/40 hover:border-border/70"
            : "bg-background/20 border-border/20 opacity-60",
        ].join(" ")}
      >
        {/* Portrait */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canSelect && icon.isAlive) onSelectIcon(icon.id);
            const rect = e.currentTarget.getBoundingClientRect();
            setSelectedCharacter({ id: icon.id, position: { x: rect.left + rect.width / 2, y: rect.bottom } });
          }}
          className={[
            "w-9 h-9 rounded-full border-2 overflow-hidden shrink-0 transition-all",
            borderClass,
            isSelected ? `ring-2 ${ringClass}` : "",
            icon.isAlive ? "cursor-pointer" : "cursor-default grayscale",
          ].join(" ")}
          title={`${icon.name} — click for details`}
        >
          {portrait ? (
            <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${bgClass} text-white`}>
              {icon.name === "Combat Drone" ? "⚙" : icon.name.charAt(0)}
            </div>
          )}
        </button>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-foreground truncate">{icon.name}</span>
            {isSelected && <span className="text-[9px] text-yellow-400 shrink-0">◀ active</span>}
            {!icon.isAlive && (
              <span className="text-[9px] text-gray-500 shrink-0">
                {icon.respawnTurns > 0 ? `💀 ${icon.respawnTurns}t` : "💀 dead"}
              </span>
            )}
          </div>

          {/* HP bar */}
          {icon.isAlive && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
              <span className="text-[10px] text-muted-foreground shrink-0">
                {Math.floor(icon.stats.hp)}/{icon.stats.maxHp}
              </span>
            </div>
          )}

          {/* Stats row */}
          {icon.isAlive && (
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              <span className="text-red-400 font-semibold">ATK {Math.floor(eff.might)}</span>
              <span className="text-blue-400 font-semibold">PWR {Math.floor(eff.power)}</span>
              <span className="text-green-400 font-semibold">DEF {Math.floor(eff.defense)}</span>
              {icon.stats.movement !== undefined && (
                <span className="text-gray-400">MOV {icon.stats.movement}</span>
              )}
            </div>
          )}

          {/* Buff / Debuff icons */}
          {icon.isAlive && (() => {
            const pills: React.ReactNode[] = [];

            // Card buffs this turn
            if ((icon.cardBuffAtk ?? 0) > 0)
              pills.push(
                <span key="atk" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-orange-900/70 border-orange-600/60 text-orange-200" title="+Might from card">
                  ⚔+{icon.cardBuffAtk}
                </span>
              );
            if ((icon.cardBuffDef ?? 0) > 0)
              pills.push(
                <span key="def" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-blue-900/70 border-blue-600/60 text-blue-200" title="+DEF from card">
                  🛡+{icon.cardBuffDef}
                </span>
              );

            // Genghis Bloodlust stacks
            if (icon.name.includes("Genghis") && (icon.passiveStacks ?? 0) > 0)
              pills.push(
                <span key="stacks" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-red-900/70 border-red-600/60 text-red-200" title={`Bloodlust ×${icon.passiveStacks}`}>
                  🩸×{icon.passiveStacks}
                </span>
              );

            // Leonidas Phalanx stacks
            if (icon.name.includes("Leonidas") && (icon.passiveStacks ?? 0) > 0)
              pills.push(
                <span key="phalanx" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-amber-900/70 border-amber-600/60 text-amber-200" title={`Phalanx ×${icon.passiveStacks} (+${(icon.passiveStacks ?? 0) * 8} DEF)`}>
                  🛡×{icon.passiveStacks}
                </span>
              );

            // Active debuffs
            for (const d of icon.debuffs ?? []) {
              const meta = DEBUFF_META[d.type] ?? { icon: "❓", color: "bg-gray-800 border-gray-600 text-gray-300", label: d.type };
              pills.push(
                <span
                  key={`${d.type}-${d.turnsRemaining}`}
                  className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] ${meta.color}`}
                  title={`${meta.label} — ${d.turnsRemaining} turn(s) left`}
                >
                  {meta.icon}{d.turnsRemaining}t
                </span>
              );
            }

            return pills.length > 0 ? (
              <div className="flex flex-wrap gap-0.5 mt-0.5">{pills}</div>
            ) : null;
          })()}

          {/* Passive hint (always shown, dimmed) */}
          <div className="text-[10px] text-muted-foreground/60 mt-0.5 truncate" title={passiveDesc}>
            ✨ {passiveDesc}
          </div>

          {/* Run items equipped */}
          {(() => {
            const nameKey = icon.name.includes("Napoleon") ? "napoleon"
              : icon.name.includes("Genghis") ? "genghis"
              : icon.name.includes("Da Vinci") ? "davinci"
              : icon.name.includes("Leonidas") ? "leonidas"
              : null;
            const items = nameKey ? runItemsByCharacter?.[nameKey]?.filter(Boolean) : null;
            if (!items?.length) return null;
            return (
              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                {items.map((item, i) => (
                  <div key={i} className="relative group">
                    <span className="text-sm cursor-default" title={`${item.name}: ${item.description}`}>
                      {item.icon}
                    </span>
                    <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover:block pointer-events-none">
                      <div className="bg-slate-900/95 border border-slate-600 rounded px-2 py-1.5 text-[10px] whitespace-nowrap shadow-xl max-w-[180px]">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-slate-400 text-wrap">{item.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* TOP: Team turn indicator + timer + End Turn */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <TurnQueueBar gameState={gameState} onEndTurn={onEndTurn} currentTurnTimer={currentTurnTimer} />
      </div>

      {/* LEFT PLAYER PANEL — WoW party HUD style */}
      <div className="absolute top-16 left-3 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 w-[280px]">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-player1 text-sm">{gameState.players[0].name} (Blue)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <BaseHPBar pid={0} />
            <GlobalManaBar pid={0} />
            <div className="space-y-1 pt-1">
              {gameState.players[0].icons.map(icon => (
                <CharacterRow
                  key={icon.id}
                  icon={icon}
                  teamColor="blue"
                  canSelect={gameState.activePlayerId === 0}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Terrain info panel */}
        {hoveredTile && hoveredTile.terrain.type !== 'plain' && hoveredTile.terrain.type !== 'spawn' && (() => {
          const TERRAIN_META: Record<string, { emoji: string; label: string; color: string }> = {
            forest:       { emoji: "🌲", label: "Forest",       color: "border-green-800/60 bg-green-950/80 text-green-300" },
            mountain:     { emoji: "⛰️", label: "Mountain",     color: "border-gray-600/60 bg-gray-900/80 text-gray-300" },
            river:        { emoji: "🌊", label: "River",        color: "border-blue-700/60 bg-blue-950/80 text-blue-300" },
            mana_crystal: { emoji: "💎", label: "Mana Crystal", color: "border-purple-700/60 bg-purple-950/80 text-purple-300" },
            beast_camp:   { emoji: "🐗", label: "Beast Camp",   color: "border-orange-700/60 bg-orange-950/80 text-orange-300" },
            base:         { emoji: "🏰", label: "Base",         color: "border-amber-700/60 bg-amber-950/80 text-amber-300" },
          };
          const TERRAIN_LINES: Record<string, string[]> = {
            forest:       ["+25% Defense", "Movement costs 2 per hex", "Napoleon: Range 3"],
            mountain:     ["Impassable"],
            river:        ["Impassable", "Lethal if displaced onto it"],
            mana_crystal: ["Impassable", "+1 or +2 Mana at end of turn"],
            base:         ["+20% Might, Power & Defense"],
            beast_camp:   (() => {
              const camps = (gameState as any).objectives?.beastCamps;
              if (!camps) return ["Defeat for +15% Might & Power"];
              const idx = hoveredTile.coordinates.q === -2 ? 0 : 1;
              return camps.defeated[idx]
                ? ["✅ Defeated — buffs active"]
                : [`HP: ${camps.hp[idx]}/${camps.maxHp}`, "Defeat for +15% Might & Power"];
            })(),
          };
          const t = hoveredTile.terrain.type as string;
          const meta = TERRAIN_META[t];
          const lines = TERRAIN_LINES[t] ?? [];
          if (!meta) return null;
          return (
            <div className={`mt-1.5 rounded-lg border px-3 py-2 ${meta.color}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{meta.emoji}</span>
                <span className="text-xs font-semibold">{meta.label}</span>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="text-[10px] opacity-80 leading-snug">{l}</div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* RIGHT PLAYER PANEL — WoW party HUD style */}
      <div className="absolute top-16 right-3 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 w-[280px]">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-player2 text-sm">{gameState.players[1].name} (Red)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <BaseHPBar pid={1} />
            {(gameState as any).gameMode !== 'singleplayer' && <GlobalManaBar pid={1} />}
            <div className="space-y-1 pt-1">
              {gameState.players[1].icons.map(icon => (
                <CharacterRow
                  key={icon.id}
                  icon={icon}
                  teamColor="red"
                  canSelect={gameState.activePlayerId === 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIVE BAR */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[720px]">
          <CardHeader className="pb-1">
            <div className="flex items-center gap-3">
              {/* Active character portrait — shows selectedIcon or first alive */}
              {(() => {
                const pid = gameState.activePlayerId;
                const aliveIcons = gameState.players[pid]?.icons.filter(i => i.isAlive) ?? [];
                const displayIcon = aliveIcons.find(i => i.id === selectedIconId) ?? aliveIcons[0] ?? null;
                const portrait = getCharacterPortrait(displayIcon?.name);
                return (
                  <>
                    <div className="w-10 h-10 rounded-full overflow-hidden border ring-2 ring-yellow-400">
                      {portrait ? (
                        <img src={portrait} alt={displayIcon?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-sm font-bold">
                          {displayIcon?.name?.charAt(0) ?? "?"}
                        </div>
                      )}
                    </div>
                    <div className="text-sm opacity-70">Selected</div>
                    <CardTitle className="!mt-0">{displayIcon?.name ?? "—"}</CardTitle>
                    <div className="ml-auto flex items-center gap-3">
                      {/* Movement indicator — pips = max(moveRange, current movement) so Quick Move extras show */}
                      {(() => {
                        const base = displayIcon?.stats.moveRange ?? 2;
                        const current = displayIcon?.stats.movement ?? 0;
                        const totalPips = Math.max(base, current);
                        return (
                          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
                            <span className="text-lg">🦶</span>
                            <div>
                              <div className="text-[10px] font-semibold opacity-60 leading-none mb-0.5">Movement</div>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: totalPips }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={[
                                      "w-3 h-3 rounded-full border-2 transition-colors",
                                      i < current
                                        ? i < base ? "bg-emerald-400 border-emerald-300" : "bg-yellow-400 border-yellow-300"
                                        : "bg-muted border-border",
                                    ].join(" ")}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Card usage pips */}
                      {(() => {
                        const cardsUsed = displayIcon?.cardsUsedThisTurn ?? 0;
                        const maxCards = 3;
                        return (
                          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
                            <span className="text-lg">🃏</span>
                            <div>
                              <div className="text-[10px] font-semibold opacity-60 leading-none mb-0.5">Cards</div>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: maxCards }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={[
                                      "w-3 h-3 rounded-full border-2 transition-colors",
                                      i < cardsUsed ? "bg-amber-400 border-amber-300" : "bg-muted border-border",
                                    ].join(" ")}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <Pill disabled={!displayIcon?.movedThisTurn || !!displayIcon?.cardUsedThisTurn} onClick={onUndoMovement}>
                        <Undo2 className="h-4 w-4" />
                        Undo
                      </Pill>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardHeader>

          <CardContent className="pt-3 pb-4">
            {(() => {
              const extState = gameState as any;
              const pid = gameState.activePlayerId;
              const hand = extState.hands?.[pid];
              const deck = extState.decks?.[pid];
              const activeIcons = gameState.players[pid]?.icons.filter(i => i.isAlive) ?? [];
              // Executor = selectedIcon if set, else first alive
              const executor = activeIcons.find(i => i.id === selectedIconId) ?? activeIcons[0] ?? null;
              // Exhausted ultimates: definitionIds that were played and removed from deck+discard
              const allPlayerCards = [...(hand?.cards ?? []), ...(deck?.drawPile ?? []), ...(deck?.discardPile ?? [])];
              const exhaustedUltimates = ["napoleon_final_salvo", "genghis_riders_fury", "davinci_vitruvian_guardian"].filter(
                defId => !allPlayerCards.some(c => c.definitionId === defId)
              );

              return (
                <div className="space-y-2">
                  {targetingActive && (
                    <div className="text-xs opacity-60">
                      Click a target on the board — or press <strong>ESC</strong> to cancel
                    </div>
                  )}

                  {/* Card hand */}
                  {hand && (
                    <CardHand
                      cards={hand.cards}
                      drawPileCards={deck?.drawPile ?? []}
                      discardPileCards={deck?.discardPile ?? []}
                      executor={executor}
                      activeIcons={activeIcons}
                      cardLockActive={gameState.cardLockActive}
                      drawPileSize={deck?.drawPile.length ?? 0}
                      discardPileSize={deck?.discardPile.length ?? 0}
                      globalMana={(gameState as any).globalMana?.[pid] ?? 0}
                      exhaustedUltimates={exhaustedUltimates}
                      onPlayCard={onPlayCard}
                      gameState={gameState}
                    />
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Character Detail Popup */}
      {selectedCharacter && (() => {
        const character = gameState.players.flatMap(p => p.icons).find(icon => icon.id === selectedCharacter.id);
        if (!character) return null;
        return (
          <CharacterDetailPopup
            character={character}
            gameState={gameState}
            onClose={() => setSelectedCharacter(null)}
            position={selectedCharacter.position}
          />
        );
      })()}
    </>
  );
};

export default HorizontalGameUI;



