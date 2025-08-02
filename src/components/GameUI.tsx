import { useState } from "react";
import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Swords, Shield, Sparkles } from "lucide-react";
import HPBar from "./HPBar";
import CharacterPanel from "./CharacterPanel";

interface GameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  currentTurnTimer: number;
  onCharacterSelect: (iconId: string) => void;
}

const GameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn, currentTurnTimer, onCharacterSelect }: GameUIProps) => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  const selectedIcon = gameState.selectedIcon ? 
    gameState.players
      .flatMap(p => p.icons)
      .find(i => i.id === gameState.selectedIcon) : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Top Row: Turn Timer and Turn Queue */}
      <div className="flex items-center justify-between w-full">
        {/* Neutral Objectives - moved to top left */}
        <Card className="border-alien-green/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-alien-green">Neutral Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-xs">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center">
                      <div className="font-semibold text-purple-400">Mana Crystal</div>
                      <div className={gameState.objectives.manaCrystal.controlled ? "text-alien-green" : "text-gray-400"}>
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
                      <div className="font-semibold text-red-400">Beast Camp</div>
                      <div className={gameState.objectives.beastCamp.defeated ? "text-alien-green" : "text-gray-400"}>
                        {gameState.objectives.beastCamp.defeated ? "Cleared" : "Active"}
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

        {/* Center: Turn Timer and Turn Queue */}
        <div className="flex items-center gap-6">
          {/* Turn Timer */}
          <Card className="border-alien-green/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-alien-green" />
                <div className="text-lg font-bold text-alien-green">
                  {currentTurnTimer}s
                </div>
                <Progress 
                  value={(currentTurnTimer / 20) * 100} 
                  className="w-20 h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Turn Queue */}
          <Card className="border-alien-green/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-lg text-alien-green">Turn Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-2">
                {gameState.speedQueue.slice(0, 6).map((iconId, index) => {
                  const icon = gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
                  if (!icon) return null;
                  return (
                    <div key={iconId} className="relative">
                      <Badge 
                        variant={index === 0 ? "default" : "secondary"}
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                          ${icon.playerId === 0 ? "border-2 border-player1 bg-player1/20" : "border-2 border-player2 bg-player2/20"}
                          ${index === 0 ? "ring-2 ring-white animate-pulse shadow-lg scale-110" : ""}
                        `}
                      >
                        {icon.name.charAt(0)}
                      </Badge>
                      {/* HP Bar under character */}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty space for balance */}
        <div className="w-32"></div>
      </div>

      {/* Bottom Row: Player Info and Actions */}
      <div className="grid grid-cols-12 gap-4">
        {/* Player 1 Column */}
        <div className="col-span-3 space-y-2">
          {/* Character Panel above if P1 character selected */}
          {selectedIcon && selectedIcon.playerId === 0 && (
            <CharacterPanel character={selectedIcon} visible={true} />
          )}
          
          <Card className="border-player1/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-player1 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Player 1 (Blue)
              </CardTitle>
              <div className="text-sm">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
              <div className="text-sm flex items-center gap-2">
                Base HP: 
                <HPBar currentHP={gameState.baseHealth[0]} maxHP={5} size="medium" />
                {gameState.baseHealth[0]}/5
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gameState.players[0].icons.map(icon => {
                  if (!icon.isAlive) {
                    return (
                      <div key={icon.id} className="flex justify-between items-center text-sm text-red-400">
                        <span>
                          {icon.name} - Respawn in {icon.respawnTurns} turns
                        </span>
                        {icon.respawnTurns === 0 && (
                          <span className="text-alien-green cursor-pointer">Click to respawn</span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={icon.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full bg-player1/20 border border-player1 flex items-center justify-center text-xs cursor-pointer hover:bg-player1/40"
                          onClick={() => onCharacterSelect(icon.id)}
                        >
                          {icon.name.charAt(0)}
                        </div>
                        <span className={icon.id === gameState.activeIconId ? "font-bold text-alien-green" : ""}>
                          {icon.name} ({icon.stats.hp}/{icon.stats.maxHp})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Column */}
        <div className="col-span-6">
          {activeIcon && (
            <Card className="border-alien-green/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-alien-green flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Active: {activeIcon.name}
                    <span className="text-sm text-gray-400 ml-2">
                      Movement: {activeIcon.stats.movement}/2
                    </span>
                  </CardTitle>
                  <Button onClick={onEndTurn} size="sm" variant="default" className="bg-alien-green hover:bg-alien-green/80 text-black font-bold">
                    End Turn
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {/* Basic Attack */}
                  <Button 
                    onClick={onBasicAttack}
                    disabled={activeIcon.actionTaken}
                    size="sm"
                    variant={gameState.targetingMode?.abilityId === 'basic_attack' ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    <Swords className="w-4 h-4" />
                    Basic Attack
                  </Button>

                  {/* Abilities */}
                  {activeIcon.abilities.filter(a => a.id !== 'ultimate').map(ability => (
                    <TooltipProvider key={ability.id}>
                      <Tooltip>
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
                            className="justify-start text-xs"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {ability.name} ({ability.manaCost})
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-semibold">{ability.name}</p>
                            <p className="text-sm">{ability.description}</p>
                            <p className="text-xs mt-1">
                              Range: {ability.range} | Mana: {ability.manaCost} | Cooldown: {ability.cooldown}
                            </p>
                            {ability.damage && <p className="text-xs text-red-400">Damage: {ability.damage}</p>}
                            {ability.healing && <p className="text-xs text-green-400">Healing: {ability.healing}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}

                  {/* Ultimate Ability */}
                  {activeIcon.abilities.find(a => a.id === 'ultimate') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => onUseAbility('ultimate')}
                            disabled={activeIcon.ultimateUsed || activeIcon.actionTaken}
                            size="sm"
                            variant="destructive"
                            className="col-span-2 justify-center"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            ULTIMATE
                            {activeIcon.ultimateUsed && " (USED)"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            {activeIcon.abilities.find(a => a.id === 'ultimate') && (
                              <>
                                <p className="font-semibold">{activeIcon.abilities.find(a => a.id === 'ultimate')!.name}</p>
                                <p className="text-sm">{activeIcon.abilities.find(a => a.id === 'ultimate')!.description}</p>
                                <p className="text-xs text-red-400">Damage: {activeIcon.abilities.find(a => a.id === 'ultimate')!.damage}</p>
                              </>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
        </div>

        {/* Player 2 Column */}
        <div className="col-span-3 space-y-2">
          {/* Character Panel above if P2 character selected */}
          {selectedIcon && selectedIcon.playerId === 1 && (
            <CharacterPanel character={selectedIcon} visible={true} />
          )}
          
          <Card className="border-player2/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-player2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Player 2 (Red)
              </CardTitle>
              <div className="text-sm">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
              <div className="text-sm flex items-center gap-2">
                Base HP: 
                <HPBar currentHP={gameState.baseHealth[1]} maxHP={5} size="medium" />
                {gameState.baseHealth[1]}/5
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gameState.players[1].icons.map(icon => {
                  if (!icon.isAlive) {
                    return (
                      <div key={icon.id} className="flex justify-between items-center text-sm text-red-400">
                        <span>
                          {icon.name} - Respawn in {icon.respawnTurns} turns
                        </span>
                        {icon.respawnTurns === 0 && (
                          <span className="text-alien-green cursor-pointer">Click to respawn</span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={icon.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full bg-player2/20 border border-player2 flex items-center justify-center text-xs cursor-pointer hover:bg-player2/40"
                          onClick={() => onCharacterSelect(icon.id)}
                        >
                          {icon.name.charAt(0)}
                        </div>
                        <span className={icon.id === gameState.activeIconId ? "font-bold text-alien-green" : ""}>
                          {icon.name} ({icon.stats.hp}/{icon.stats.maxHp})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GameUI;