import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Crown } from "lucide-react";
import HPBar from "./HPBar";

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
}

const HorizontalGameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn }: HorizontalGameUIProps) => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Top Left: Objectives */}
      <div className="absolute top-20 left-4 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-sm">Objectives</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <Crown className={`w-4 h-4 ${gameState.objectives.beastCamp.defeated ? "text-yellow-400" : "text-red-400"}`} />
                      <div>
                        <div className="font-semibold">Beast Camp</div>
                        <div className={gameState.objectives.beastCamp.defeated ? "text-green-500" : "text-gray-500"}>
                          {gameState.objectives.beastCamp.defeated ? "Cleared" : "Active"}
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

      {/* Top Center: Turn Queue */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg">Turn Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2">
              {gameState.speedQueue.slice(0, 5).map((iconId, index) => {
                const icon = gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
                if (!icon) return null;
                return (
                  <Badge 
                    key={iconId} 
                    variant={index === 0 ? "default" : "secondary"}
                    className={icon.playerId === 0 ? "bg-player1" : "bg-player2"}
                  >
                    {icon.name.charAt(0)}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Right: Timer */}
      <div className="absolute top-20 right-4 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-sm font-semibold">Timer</div>
              <div className="text-lg">{formatTime(gameState.matchTimer)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Left: Player 1 */}
      <div className="absolute bottom-4 left-4 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">Player 1 (Blue)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[0]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameState.players[0].icons.map(icon => (
                <div key={icon.id} className="flex justify-between items-center text-sm">
                  <span className={icon.id === gameState.activeIconId ? "font-bold text-active-turn" : ""}>
                    {icon.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{icon.stats.hp}/{icon.stats.maxHp}</span>
                    <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Right: Player 2 */}
      <div className="absolute bottom-4 right-4 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-player2">Player 2 (Red)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[1]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameState.players[1].icons.map(icon => (
                <div key={icon.id} className="flex justify-between items-center text-sm">
                  <span className={icon.id === gameState.activeIconId ? "font-bold text-active-turn" : ""}>
                    {icon.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{icon.stats.hp}/{icon.stats.maxHp}</span>
                    <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Center: Active Icon Actions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle>Active: {activeIcon?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIcon && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    onClick={onBasicAttack}
                    disabled={activeIcon.actionTaken}
                    size="sm"
                    className="bg-primary"
                  >
                    Basic Attack
                  </Button>
                  <Button onClick={onEndTurn} size="sm" variant="outline" className="bg-primary">
                    End Turn
                  </Button>
                </div>
                <div className="space-y-1">
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
                            className="w-full justify-start"
                          >
                            {ability.name} ({ability.manaCost} mana)
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-semibold">{ability.name}</p>
                            <p className="text-sm">{ability.description}</p>
                            <p className="text-xs mt-1">Range: {ability.range} | Cooldown: {ability.cooldown}</p>
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
    </>
  );
};

export default HorizontalGameUI;