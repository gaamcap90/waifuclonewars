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

/* ===== Helpers (portraits, icons, pill styles) ===== */
const getCharacterPortrait = (name: string | undefined | null) => {
  if (!name) return null;
  if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
  if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
  if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
  return null;
};

const getAbilityIcon = (abilityName: string) => {
  const n = abilityName.toLowerCase();
  if (n.includes("charge")) return Zap;
  if (n.includes("ultimate")) return Target;
  return Shield;
};

// proper axial hex distance (adjacent === 1)
const hexDistance = (a: { q: number; r: number }, b: { q: number; r: number }) => {
  const ax = a.q, az = a.r, ay = -ax - az;
  const bx = b.q, bz = b.r, by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
};

// regen preview (+1 baseline + allies adjacent to crystal, capped at +4)
const manaRegenFor = (state: GameState, playerId: 0 | 1) => {
  const crystal = state.board.find(t => t.terrain.type === "mana_crystal");
  if (!crystal) return 1;
  const adjAllies = state.players[playerId].icons.filter(ic => ic.isAlive && hexDistance(ic.position, crystal.coordinates) === 1).length;
  return Math.min(4, 1 + adjAllies);
};

/* ===== Types ===== */
interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  currentTurnTimer: number;
}

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

  const activeIcon = gameState.players.flatMap(p => p.icons).find(i => i.id === gameState.activeIconId);

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

  const StatBadge = ({ label, value }: { label: string; value: string }) => (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50">
      <CardContent className="px-4 py-3">
        <div className="text-[11px] font-semibold opacity-70">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  const ManaBar = ({ pid }: { pid: 0 | 1 }) => {
    const mana = gameState.globalMana[pid];
    const regen = manaRegenFor(gameState, pid);
    const pct = Math.max(0, Math.min(100, (mana / 20) * 100));
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>Mana</span>
          <span className="opacity-70">
            {mana}/20 <span className="ml-1 text-green-600">(+{regen}/turn)</span>
          </span>
        </div>
        <div className="h-2 w-56 rounded-full bg-muted relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const BaseHPBar = ({ pid }: { pid: 0 | 1 }) => {
    const hp = gameState.baseHealth[pid];
    const pct = Math.max(0, Math.min(100, (hp / 5) * 100));
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>Base HP</span>
          <span className="opacity-70">{hp}/5</span>
        </div>
        <div className="h-2 w-56 rounded-full bg-muted relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-red-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* TOP: Queue + End Turn */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <TurnQueueBar gameState={gameState} onEndTurn={onEndTurn} />
      </div>

      {/* LEFT PLAYER PANEL (click portraits to open popup) */}
      <div className="absolute top-16 left-3 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">{gameState.players[0].name} (Blue)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ManaBar pid={0} />
            <BaseHPBar pid={0} />

            <div className="flex gap-3 justify-center pt-2">
              {gameState.players[0].icons
                .filter(icon => icon.isAlive && (icon.stats?.hp ?? 0) > 0)
                .map(icon => {
                const portrait = getCharacterPortrait(icon.name);
                return (
                  <div key={icon.id} className="text-center">
                    <div className="relative">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
const gap = 8;
const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

setSelectedCharacter({
  id: icon.id,
  position: {
    x: rect.left + rect.width / 2 + scrollX,
    y: rect.bottom + gap + scrollY,
  },
});
                        }}
                        className={[
                          "w-10 h-10 rounded-full border-2 overflow-hidden transition-all",
                          "border-blue-400 hover:border-blue-300",
                          icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : "",
                        ].join(" ")}
                        title={icon.name}
                      >
                        {portrait ? (
                          <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-blue-500/90 text-white">
                            {icon.name.charAt(0)}
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
  isMyTurn={
    gameState.players
      .flatMap(p => p.icons)
      .find(i => i.id === gameState.activeIconId)?.playerId === 0
  }
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
            <ManaBar pid={1} />
            <BaseHPBar pid={1} />

            <div className="flex gap-3 justify-center pt-2">
              {gameState.players[1].icons
  .filter(icon => icon.isAlive && (icon.stats?.hp ?? 0) > 0)
  .map(icon => {
                const portrait = getCharacterPortrait(icon.name);
                return (
                  <div key={icon.id} className="text-center">
                    <div className="relative">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                         const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
const gap = 8;
const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

setSelectedCharacter({
  id: icon.id,
  position: {
    x: rect.left + rect.width / 2 + scrollX,
    y: rect.bottom + gap + scrollY,
  },
});
                        }}
                        className={[
                          "w-10 h-10 rounded-full border-2 overflow-hidden transition-all",
                          "border-red-400 hover:border-red-300",
                          icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : "",
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
  isMyTurn={
    gameState.players
      .flatMap(p => p.icons)
      .find(i => i.id === gameState.activeIconId)?.playerId === 1
  }
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
              <div className="w-10 h-10 rounded-full overflow-hidden border">
                {getCharacterPortrait(activeIcon?.name) ? (
                  <img
                    src={getCharacterPortrait(activeIcon?.name)!}
                    alt={activeIcon?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-sm font-bold">
                    {activeIcon?.name?.charAt(0) ?? "?"}
                  </div>
                )}
              </div>
              <div className="text-sm opacity-70">Active</div>
              <CardTitle className="!mt-0">{activeIcon?.name ?? "—"}</CardTitle>

              <div className="ml-auto flex items-center gap-3">
                <StatBadge label="Movement" value={`${activeIcon?.stats.movement ?? 0}/${activeIcon?.stats.moveRange ?? 0}`} />
                <StatBadge label="Timer" value={`${currentTurnTimer}s`} />
                <Pill disabled={!activeIcon?.movedThisTurn || !!activeIcon?.actionTaken} onClick={onUndoMovement}>
                  <Undo2 className="h-4 w-4" />
                  Undo Movement
                </Pill>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3">
            {activeIcon && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Attack – same style as abilities, toggles when targeting */}
                  <Pill
                    selected={gameState.targetingMode?.abilityId === "basic_attack"}
                    disabled={!!activeIcon.actionTaken}
                    onClick={onBasicAttack}
                  >
                    <Swords className="h-4 w-4" />
                    Attack
                  </Pill>

                  {activeIcon.abilities.slice(0, 3).map(ability => {
                    const Icon = getAbilityIcon(ability.name);
                    const selected = gameState.targetingMode?.abilityId === ability.id;
                    const disabled =
                      !!activeIcon.actionTaken ||
                      (ability.currentCooldown ?? 0) > 0 ||
                      gameState.globalMana[activeIcon.playerId] < (ability.manaCost ?? 0);

                    return (
                      <TooltipProvider key={ability.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Pill selected={selected} disabled={disabled} onClick={() => onUseAbility(ability.id)}>
                                <Icon className="h-4 w-4" />
                                {ability.name}
                                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-orange-500/90 text-[11px] text-white px-1">
                                  {ability.manaCost}
                                </span>
                              </Pill>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <div className="font-semibold">
                                {ability.name} {ability.name.toLowerCase().includes("ultimate") ? "(ULTIMATE)" : ""}
                              </div>
                              <div className="text-sm">{ability.description}</div>
                              <div className="text-xs mt-1">Range: {ability.range}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                {targetingActive && (
                  <div className="mt-3 text-xs opacity-70">
                    Targeting active — click the same action again or press <span className="font-semibold">ESC</span> to cancel.
                  </div>
                )}
              </>
            )}
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



