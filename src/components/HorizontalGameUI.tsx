import React, { useState, useEffect } from "react";
import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
import { Sparkles, Crown, Swords, Zap, Shield, Target, Undo2 } from "lucide-react";
import { countAlliesAdjacentToCrystal } from "@/engine/turnEngine";
import { TurnQueueBar } from "./TurnQueueBar";

/** Props kept loose because our state carries a few extensions (combatLog, justRespawned, etc.) */
interface HorizontalGameUIProps {
  gameState: any;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  currentTurnTimer: number;
}

/* ===== Helpers (portraits, icons, pill styles) ===== */

const getCharacterPortrait = (name: string) => {
  if (!name) return null;
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis"))  return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null;
};

const abilityIcon = (name: string) => {
  const n = (name || "").toLowerCase();
  if (n.includes("ultimate")) return Target;
  if (n.includes("charge") || n.includes("flying")) return Zap;
  if (n.includes("masterpiece") || n.includes("shield")) return Shield;
  return Shield;
};

// unified pill styles
const pillBase = "h-12 px-4 rounded-md border transition font-medium flex items-center gap-2";
const pillOff  = "bg-white text-slate-900 hover:bg-slate-50";
const pillOn   = "bg-slate-900 text-white ring-2 ring-yellow-400 animate-pulse";

/* ===== Component ===== */

const HorizontalGameUI = ({
  gameState,
  onBasicAttack,
  onUseAbility,
  onEndTurn,
  onUndoMovement,
  onRespawn,
  currentTurnTimer,
}: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{ id: string; position: { x: number; y: number } } | null>(null);

  const activeIcon = gameState.players.flatMap((p: any) => p.icons).find((i: any) => i.id === gameState.activeIconId);
  const selectedId = gameState.targetingMode?.abilityId as string | undefined;

  // ESC to clear the character popup (not targeting; targeting is toggled by clicking again)
  useEffect(() => {
    const handleGlobalClose = () => setSelectedCharacter(null);
    window.addEventListener("closeCharacterPopup", handleGlobalClose);
    return () => window.removeEventListener("closeCharacterPopup", handleGlobalClose);
  }, []);

  // Convenience flags
  const isUnavailable = !activeIcon?.isAlive || !!activeIcon?.justRespawned;
  const canUndo = !!activeIcon && activeIcon.movedThisTurn && !activeIcon.actionTaken;

  return (
    <>
      {/* Top Center: Turn Queue bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
        <TurnQueueBar gameState={gameState} onEndTurn={onEndTurn} />
      </div>

      {/* Top Left: Turn Number */}
      <div className="absolute top-0 left-0 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 rounded-none rounded-br-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">Turn {gameState.currentTurn}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Right: Objectives */}
      <div className="absolute top-0 right-0 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 rounded-none rounded-bl-lg">
          <CardContent className="p-3">
            <div className="space-y-2 text-xs">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center p-2 rounded border flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${gameState.objectives.manaCrystal.controlled ? "text-purple-400" : "text-gray-500"}`} />
                      <div>
                        <div className="font-semibold">Mana Crystal</div>
                        <div className={gameState.objectives.manaCrystal.controlled ? "text-green-500" : "text-gray-500"}>
                          {gameState.objectives.manaCrystal.controlled ? "Controlled" : "Neutral"}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Control the center crystal for +2 mana regeneration per turn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center p-2 rounded border flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${gameState.objectives.beastCamps.defeated.some((d: boolean) => d) ? "text-yellow-400" : "text-red-400"}`} />
                      <div>
                        <div className="font-semibold">Beast Camps</div>
                        <div
                          className={
                            gameState.objectives.beastCamps.defeated.some((d: boolean) => d) ? "text-green-500" : "text-gray-500"
                          }
                        >
                          {gameState.objectives.beastCamps.defeated.every((d: boolean) => d)
                            ? "All Cleared"
                            : `${gameState.objectives.beastCamps.defeated.filter((d: boolean) => d).length}/2 Cleared`}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Defeat beast camps for permanent team-wide +15% damage buff</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Left: Player 1 panel */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-auto z-10">
        <PlayerPanel
          player={gameState.players[0]}
          activeIconId={gameState.activeIconId}
          side="blue"
          onRespawn={onRespawn}
        />
      </div>

      {/* Center Right: Player 2 panel */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto z-10">
        <PlayerPanel
          player={gameState.players[1]}
          activeIconId={gameState.activeIconId}
          side="red"
          onRespawn={onRespawn}
        />
      </div>

      {/* Bottom Center: NEW Active Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[780px]">
          <CardContent className={`p-4 ${isUnavailable ? "opacity-60" : ""}`}>
            {activeIcon && (
              <div className="space-y-4">
                {/* Row 1: Identity + status */}
                <div className="flex items-center justify-between gap-4">
                  {/* Left: portrait + name */}
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "w-12 h-12 rounded-full overflow-hidden ring-2",
                        activeIcon.playerId === 0 ? "ring-blue-400" : "ring-red-400",
                      ].join(" ")}
                    >
                      {getCharacterPortrait(activeIcon.name) ? (
                        <img
                          src={getCharacterPortrait(activeIcon.name)!}
                          alt={activeIcon.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-700 text-white font-semibold">
                          {activeIcon.name?.charAt(0) ?? "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground leading-tight">Active</div>
                      <div className="text-xl font-semibold">{activeIcon.name}</div>
                    </div>
                  </div>

                  {/* Right: movement, timer, undo */}
                  <div className="flex items-center gap-3">
                    <BadgeBox label="Movement" value={`${activeIcon.stats.movement}/${activeIcon.stats.moveRange}`} />
                    <BadgeBox label="Timer" value={`${currentTurnTimer}s`} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onUndoMovement}
                      disabled={!canUndo || isUnavailable}
                      className="flex items-center gap-2"
                    >
                      <Undo2 className="w-4 h-4" />
                      Undo Movement
                    </Button>
                  </div>
                </div>

                {/* Row 2: Pills */}
                <div className={`flex items-center gap-3 flex-wrap ${isUnavailable ? "pointer-events-none" : ""}`}>
                  {/* Attack pill (toggle) */}
                  <button
                    onClick={onBasicAttack}
                    disabled={activeIcon.actionTaken}
                    aria-pressed={selectedId === "basic_attack"}
                    className={[
                      pillBase,
                      selectedId === "basic_attack" ? pillOn : pillOff,
                      "min-w-[160px]",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    <Swords className="w-4 h-4" />
                    Attack
                  </button>

                  {/* Ability pills */}
                  {(activeIcon.abilities ?? []).slice(0, 3).map((ab: any) => {
                    const Icon = abilityIcon(ab.name);
                    const disabled =
                      activeIcon.actionTaken ||
                      (ab.currentCooldown ?? 0) > 0 ||
                      (gameState.globalMana?.[activeIcon.playerId] ?? 0) < (ab.manaCost ?? 0);
                    const pressed = selectedId === ab.id;

                    return (
                      <button
                        key={ab.id}
                        onClick={() => onUseAbility(ab.id)}
                        disabled={disabled}
                        aria-pressed={pressed}
                        className={[
                          pillBase,
                          pressed ? pillOn : pillOff,
                          "min-w-[200px] justify-between",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        ].join(" ")}
                        title={ab.description}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{ab.name}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs">
                          {(ab.currentCooldown ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-muted">CD {ab.currentCooldown}</span>
                          )}
                          {(ab.manaCost ?? 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600">
                              {ab.manaCost}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tiny hint when targeting any action */}
                {selectedId && (
                  <div className="text-xs text-muted-foreground">
                    Targeting active — click the same action again to cancel.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Character Detail Popup */}
      {selectedCharacter && (() => {
        const character = gameState.players.flatMap((p: any) => p.icons).find((icon: any) => icon.id === selectedCharacter.id);
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

/* ===== Small subcomponents used above ===== */

function BadgeBox({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50">
      <CardContent className="px-3 py-2">
        <div className="text-center min-w-[86px]">
          <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
          <div className="text-base font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerPanel({
  player,
  activeIconId,
  side,
  onRespawn,
}: {
  player: any;
  activeIconId: string;
  side: "blue" | "red";
  onRespawn: (iconId: string) => void;
}) {
  return (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[280px]">
      <CardHeader className="pb-2">
        <CardTitle className={side === "blue" ? "text-player1" : "text-player2"}>
          {player.name} {side === "blue" ? "(Blue)" : "(Red)"}
        </CardTitle>
        <div className="text-sm">Mana: {player.id === 0 ? player.gameState?.globalMana?.[0] : player.gameState?.globalMana?.[1]}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            {player.icons
              .filter((icon: any) => icon.isAlive)
              .map((icon: any) => {
                const portrait = getCharacterPortrait(icon.name);
                return (
                  <div key={icon.id} className="text-center">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          window.dispatchEvent(
                            new CustomEvent("closeCharacterPopup") // just to ensure only one popup lives
                          );
                          // You can hook in a “quick stats” popover here later if you want
                        }}
                        className={[
                          "w-10 h-10 rounded-full border-2 transition-all overflow-hidden",
                          side === "blue" ? "border-blue-400 hover:border-blue-300" : "border-red-400 hover:border-red-300",
                          icon.id === activeIconId ? "ring-2 ring-yellow-400" : "",
                        ].join(" ")}
                        title={icon.name}
                      >
                        {portrait ? (
                          <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className={[
                              "w-full h-full flex items-center justify-center text-sm font-bold",
                              side === "blue" ? "bg-blue-500/90 text-white" : "bg-red-500/90 text-white",
                            ].join(" ")}
                          >
                            {icon.name.charAt(0)}
                          </div>
                        )}
                      </button>
                      {/* Team indicator badge */}
                      <div
                        className={[
                          "absolute -top-1 -right-1 w-3 h-3 rounded-full border",
                          side === "blue" ? "bg-blue-500 border-blue-300" : "bg-red-500 border-red-300",
                        ].join(" ")}
                      />
                    </div>
                    <div className="text-xs mt-1">
                      {icon.stats.hp}/{icon.stats.maxHp}
                    </div>
                    <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                  </div>
                );
              })}
            <RespawnUI
              deadCharacters={player.icons.filter((icon: any) => !icon.isAlive)}
              onRespawn={onRespawn}
              isMyTurn={player.icons.some((i: any) => i.id === activeIconId && i.playerId === player.id)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


