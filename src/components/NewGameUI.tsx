import { GameState, Icon } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HPBar from "./HPBar";
import CharacterPanel from "./CharacterPanel";
import { useState } from "react";

interface NewGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
}

const NewGameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn }: NewGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Icon | undefined>();

  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: Turn Queue */}
      <div className="flex justify-center">
        <Card className="bg-card/90 backdrop-blur border-arena-glow/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg font-orbitron text-arena-glow">
              Turn Queue
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex justify-center gap-3">
              {gameState.speedQueue.slice(0, 8).map((iconId, index) => {
                const icon =
                  gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
                if (!icon) return null;

                const isActive = icon.id === gameState.activeIconId && icon.isAlive;
                const isDisabled =
                  !icon.isAlive || icon.justRespawned || icon.stats.movement <= 0;

                return (
                  <TooltipProvider key={iconId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={[
                            "relative w-12 h-12 rounded-full overflow-hidden",
                            "flex items-center justify-center font-bold font-orbitron text-sm",
                            "transition-transform ring-2",
                            isActive
                              ? "ring-active-turn scale-110 shadow-lg shadow-active-turn/50"
                              : icon.playerId === 0
                                ? "ring-player1"
                                : "ring-player2",
                            // full grey-out for dead/disabled
                            isDisabled ? "grayscale opacity-40" : ""
                          ].join(" ")}
                        >
                          {/* portrait if you have one, else initial */}
                          {"portraitUrl" in icon && (icon as any).portraitUrl ? (
                            <img
                              src={(icon as any).portraitUrl}
                              alt={icon.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white">
                              {icon.name.charAt(0)}
                            </span>
                          )}

                          {/* respawn turns badge when dead */}
                          {!icon.isAlive &&
                            typeof icon.respawnTurns === "number" &&
                            icon.respawnTurns > 0 && (
                              <span className="absolute -bottom-1 -right-1 px-1 rounded text-[10px] leading-none bg-black/70 text-white">
                                {icon.respawnTurns}
                              </span>
                            )}
                        </div>
                      </TooltipTrigger>

                      <TooltipContent>
                        <p className="font-orbitron">{icon.name}</p>
                        <p className="text-xs">
                          {icon.isAlive
                            ? `Speed: ${icon.stats.speed}`
                            : icon.respawnTurns > 0
                              ? `Respawns in ${icon.respawnTurns} turn${icon.respawnTurns === 1 ? "" : "s"
                              }`
                              : "Dead"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Objectives */}
      <div className="flex justify-center">
        <Card className="bg-card/90 backdrop-blur border-alien-purple/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-sm font-orbitron text-alien-purple">Arena Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8 text-xs">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center">
                      <div className="font-semibold font-orbitron">💎 Mana Crystal</div>
                      <div className={gameState.objectives.manaCrystal.controlled ? "text-alien-green" : "text-gray-500"}>
                        {gameState.objectives.manaCrystal.controlled ? "Controlled" : "Neutral"}
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
                    <div className="text-center">
                      <div className="font-semibold font-orbitron">👹 Beast Camps</div>
                      <div className={gameState.objectives.beastCamps.defeated.some(d => d) ? "text-alien-green" : "text-gray-500"}>
                        {gameState.objectives.beastCamps.defeated.every(d => d) ? "All Cleared" : `${gameState.objectives.beastCamps.defeated.filter(d => d).length}/2 Cleared`}
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

      {/* Main UI Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Player 1 Team */}
        <div className="col-span-3">
          <Card className="bg-card/90 backdrop-blur border-player1/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-player1 font-orbitron">Team Blue</CardTitle>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span>Mana:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-mana-blue"></div>
                    <span className="text-mana-blue font-bold">{gameState.globalMana[0]}/20</span>
                    <span className="text-muted-foreground">(+1/turn)</span>
                  </div>
                </div>
                <div>Base HP: {gameState.baseHealth[0]}/5</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gameState.players[0].icons.map(icon => (
                  <div
                    key={icon.id}
                    className={`p-2 rounded cursor-pointer border transition-all ${icon.id === gameState.activeIconId ? 'border-active-turn bg-active-turn/10' :
                        selectedCharacter?.id === icon.id ? 'border-player1 bg-player1/10' : 'border-transparent hover:border-player1/50'
                      }`}
                    onClick={() => setSelectedCharacter(icon)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-player1 bg-player1/80 text-white flex items-center justify-center text-sm font-bold font-orbitron">
                        {icon.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{icon.name}</div>
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Area - Active Character + Abilities */}
        <div className="col-span-6 space-y-4">
          {/* Active Character Info */}
          <Card className="bg-card/90 backdrop-blur border-arena-glow/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-center font-orbitron">
                Active: {activeIcon?.name} | Timer: {formatTime(gameState.matchTimer)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeIcon && (
                <div className="space-y-4">
                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={onBasicAttack}
                      disabled={activeIcon.actionTaken}
                      className="font-orbitron bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      ⚔️ Basic Attack
                    </Button>
                  </div>

                  {/* Abilities */}
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      {activeIcon.abilities.map(ability => (
                        <Tooltip key={ability.id}>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onUseAbility(ability.id)}
                              disabled={
                                activeIcon.actionTaken ||
                                ability.currentCooldown > 0 ||
                                gameState.globalMana[activeIcon.playerId] < ability.manaCost
                              }
                              size="sm"
                              variant={gameState.targetingMode?.abilityId === ability.id ? "default" : "outline"}
                              className="h-12 flex flex-col items-center justify-center font-orbitron text-xs"
                            >
                              <div className="font-bold">{ability.name}</div>
                              <div className="text-mana-blue">💧 {ability.manaCost}</div>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div>
                              <p className="font-semibold">{ability.name}</p>
                              <p className="text-sm">{ability.description}</p>
                              <p className="text-xs mt-1">Range: {ability.range} | Cooldown: {ability.cooldown} | Mana: {ability.manaCost}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player 2 Team */}
        <div className="col-span-3">
          <Card className="bg-card/90 backdrop-blur border-player2/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-player2 font-orbitron">Team Red</CardTitle>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span>Mana:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-mana-blue"></div>
                    <span className="text-mana-blue font-bold">{gameState.globalMana[1]}/20</span>
                    <span className="text-muted-foreground">(+1/turn)</span>
                  </div>
                </div>
                <div>Base HP: {gameState.baseHealth[1]}/5</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gameState.players[1].icons.map(icon => (
                  <div
                    key={icon.id}
                    className={`p-2 rounded cursor-pointer border transition-all ${icon.id === gameState.activeIconId ? 'border-active-turn bg-active-turn/10' :
                        selectedCharacter?.id === icon.id ? 'border-player2 bg-player2/10' : 'border-transparent hover:border-player2/50'
                      }`}
                    onClick={() => setSelectedCharacter(icon)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-player2 bg-player2/80 text-white flex items-center justify-center text-sm font-bold font-orbitron">
                        {icon.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{icon.name}</div>
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* End Turn Button - Center Right */}
      <div className="flex justify-center">
        <Button
          onClick={onEndTurn}
          className="px-8 py-3 font-orbitron bg-alien-purple hover:bg-alien-purple/80"
          size="lg"
        >
          🔄 End Turn
        </Button>
      </div>

      {/* Character Panel */}
      <CharacterPanel character={selectedCharacter} visible={!!selectedCharacter} gameState={gameState} />
    </div>
  );
};

export default NewGameUI;
