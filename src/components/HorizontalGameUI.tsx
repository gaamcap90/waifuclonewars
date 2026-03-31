import React, { useState, useEffect } from "react";
import { GameState, Card as GameCard } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
import CardHand from "./CardHand";
import { Undo2 } from "lucide-react";
import { TurnQueueBar } from "./TurnQueueBar";

/* ===== Helpers (portraits, icons, pill styles) ===== */
const getCharacterPortrait = (name: string | undefined | null) => {
  if (!name) return null;
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null;
};


/* ===== Types ===== */
interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  onPlayCard: (card: GameCard, executorId: string) => void;
  onSelectIcon: (iconId: string) => void;
  currentTurnTimer: number;
}

const HorizontalGameUI = ({
  gameState,
  onEndTurn,
  onUndoMovement,
  onRespawn,
  onPlayCard,
  onSelectIcon,
  currentTurnTimer,
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
    const maxMana = 5;
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

  return (
    <>
      {/* TOP: Team turn indicator + timer + End Turn */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <TurnQueueBar gameState={gameState} onEndTurn={onEndTurn} currentTurnTimer={currentTurnTimer} />
      </div>

      {/* LEFT PLAYER PANEL (click portraits to open popup) */}
      <div className="absolute top-16 left-3 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">{gameState.players[0].name} (Blue)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BaseHPBar pid={0} />
            <GlobalManaBar pid={0} />

            <div className="flex gap-3 justify-center pt-2">
              {gameState.players[0].icons
                .filter(icon => icon.isAlive && (icon.stats?.hp ?? 0) > 0)
                .map(icon => {
                  const portrait = getCharacterPortrait(icon.name);
                  return (
                    <div key={icon.id} className="text-center">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (gameState.activePlayerId === 0) onSelectIcon(icon.id);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSelectedCharacter({ id: icon.id, position: { x: rect.left + rect.width / 2, y: rect.bottom } });
                          }}
                          className={[
                            "w-10 h-10 rounded-full border-2 overflow-hidden transition-all",
                            "border-blue-400 hover:border-blue-300",
                            icon.id === selectedIconId
                              ? "ring-2 ring-yellow-400 scale-110" : "",
                          ].join(" ")}
                          title={icon.name}
                        >
                          {portrait ? (
                            <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-blue-500/90 text-white">
                              {icon.name === "Combat Drone" ? "⚙" : icon.name.charAt(0)}
                            </div>
                          )}
                        </button>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border bg-blue-500 border-blue-300" />
                      </div>
                      <div className="text-[11px] mt-1">
                        {icon.stats.hp}/{icon.stats.maxHp}
                      </div>
                      <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                    </div>
                  );
                })}

              <RespawnUI
                deadCharacters={gameState.players[0].icons.filter(
                  icon => !icon.isAlive && (icon.respawnTurns ?? 0) > 0
                )}
                onRespawn={onRespawn}
                isMyTurn={gameState.activePlayerId === 0}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT PLAYER PANEL */}
      <div className="absolute top-16 right-3 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player2">{gameState.players[1].name} (Red)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BaseHPBar pid={1} />
            <GlobalManaBar pid={1} />

            <div className="flex gap-3 justify-center pt-2">
              {gameState.players[1].icons
                .filter(icon => icon.isAlive && (icon.stats?.hp ?? 0) > 0)
                .map(icon => {
                  const portrait = getCharacterPortrait(icon.name);
                  return (
                    <div key={icon.id} className="text-center">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (gameState.activePlayerId === 1) onSelectIcon(icon.id);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSelectedCharacter({ id: icon.id, position: { x: rect.left + rect.width / 2, y: rect.bottom } });
                          }}
                          className={[
                            "w-10 h-10 rounded-full border-2 overflow-hidden transition-all",
                            "border-red-400 hover:border-red-300",
                            icon.id === selectedIconId ? "ring-2 ring-yellow-400 scale-110" : "",
                          ].join(" ")}
                          title={icon.name}
                        >
                          {portrait ? (
                            <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-red-500/90 text-white">
                              {icon.name.charAt(0)}
                            </div>
                          )}
                        </button>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border bg-red-500 border-red-300" />
                      </div>
                      <div className="text-[11px] mt-1">
                        {icon.stats.hp}/{icon.stats.maxHp}
                      </div>
                      <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                    </div>
                  );
                })}

              <RespawnUI
                deadCharacters={gameState.players[1].icons.filter(
                  icon => !icon.isAlive && (icon.respawnTurns ?? 0) > 0
                )}
                onRespawn={onRespawn}
                isMyTurn={gameState.activePlayerId === 1}
              />

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
                      <StatBadge label="Movement" value={`${displayIcon?.stats.movement ?? 0}/${displayIcon?.stats.moveRange ?? 0}`} />
                      <StatBadge label="Might" value={`${displayIcon?.stats.might ?? 0}`} />
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



