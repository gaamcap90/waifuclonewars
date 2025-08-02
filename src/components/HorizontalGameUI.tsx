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

      {/* Top Center: Turn Queue and Timer */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <div className="flex items-center gap-4">
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
                      className={`${icon.playerId === 0 ? "bg-player1" : "bg-player2"} ${
                        index === 0 ? "ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50" : ""
                      }`}
                    >
                      {icon.name.charAt(0)}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-background/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-semibold">Timer</div>
                <div className="text-lg">{formatTime(gameState.matchTimer)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* End Turn Button below Turn Queue */}
        <div className="flex justify-center mt-2">
          <Button onClick={onEndTurn} size="sm" variant="outline" className="bg-primary">
            End Turn
          </Button>
        </div>
      </div>


      {/* Center Left: Player 1 */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">Player 1 (Blue)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[0]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameState.players[0].icons.map(icon => (
                <div key={icon.id} className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
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

      {/* Center Right: Player 2 */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-player2">Player 2 (Red)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[1]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameState.players[1].icons.map(icon => (
                <div key={icon.id} className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
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

      {/* Bottom Center: Active Character Panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle>Active: {activeIcon?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIcon && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Movement: {activeIcon.stats.movement}/{activeIcon.stats.movement}</span>
                  <Button size="sm" variant="outline" disabled>Undo Movement</Button>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    onClick={onBasicAttack}
                    disabled={activeIcon.actionTaken}
                    size="sm"
                    className="bg-primary flex-1"
                  >
                    Attack
                  </Button>
                  <TooltipProvider>
                    {activeIcon.abilities.slice(0, 3).map(ability => (
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
                            className="flex-1 text-xs"
                          >
                            {ability.name.slice(0, 3)} ({ability.manaCost})
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-semibold">{ability.name}</p>
                            <p className="text-sm">{ability.description}</p>
                            <p className="text-xs mt-1">Power: {activeIcon.stats.power} | Range: {ability.range}</p>
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