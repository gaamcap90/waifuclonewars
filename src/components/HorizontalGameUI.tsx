import { useState } from "react";
import GameBoard from "./GameBoard";
import { Coordinates } from "@/types/game";
import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Swords, Shield, Sparkles } from "lucide-react";
import HPBar from "./HPBar";
import CharacterPanel from "./CharacterPanel";

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  currentTurnTimer: number;
  onCharacterSelect: (iconId: string) => void;
  onTileClick: (coordinates: Coordinates) => void;
}

const HorizontalGameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn, currentTurnTimer, onCharacterSelect, onTileClick }: HorizontalGameUIProps) => {
  const [selectedPlayer1Character, setSelectedPlayer1Character] = useState<string | null>(null);
  const [selectedPlayer2Character, setSelectedPlayer2Character] = useState<string | null>(null);

  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCharacterSelect = (iconId: string) => {
    const icon = gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
    if (!icon) return;

    if (icon.playerId === 0) {
      setSelectedPlayer1Character(selectedPlayer1Character === iconId ? null : iconId);
    } else {
      setSelectedPlayer2Character(selectedPlayer2Character === iconId ? null : iconId);
    }
    onCharacterSelect(iconId);
  };

  const player1SelectedIcon = selectedPlayer1Character ? 
    gameState.players[0].icons.find(i => i.id === selectedPlayer1Character) : null;
  
  const player2SelectedIcon = selectedPlayer2Character ? 
    gameState.players[1].icons.find(i => i.id === selectedPlayer2Character) : null;

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Top Row */}
      <div className="h-20 flex gap-2 p-2">
        {/* Red Box - Objectives */}
        <div className="w-64 h-full">
          <Card className="h-full border-red-500/50 bg-red-500/10">
            <CardContent className="pt-2 pb-2 h-full flex flex-col justify-center">
              <div className="flex gap-4 text-xs">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-center">
                        <div className="font-semibold text-purple-400 text-xs">Mana Crystal</div>
                        <div className={`text-xs ${gameState.objectives.manaCrystal.controlled ? "text-alien-green" : "text-gray-400"}`}>
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
                        <div className="font-semibold text-red-400 text-xs">Beast Camp</div>
                        <div className={`text-xs ${gameState.objectives.beastCamp.defeated ? "text-alien-green" : "text-gray-400"}`}>
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
        </div>

        {/* Blue Box - Turn Queue */}
        <div className="flex-1 h-full">
          <Card className="h-full border-blue-500/50 bg-blue-500/10">
            <CardContent className="pt-2 pb-2 h-full flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="text-sm text-alien-green font-bold">Turn Queue:</div>
                <div className="flex gap-2">
                  {gameState.speedQueue.slice(0, 8).map((iconId, index) => {
                    const icon = gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
                    if (!icon) return null;
                    return (
                      <div key={iconId} className="relative">
                        <Badge 
                          variant={index === 0 ? "default" : "secondary"}
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${icon.playerId === 0 ? "border border-player1 bg-player1/20" : "border border-player2 bg-player2/20"}
                            ${index === 0 ? "ring-2 ring-white animate-pulse shadow-lg scale-110" : ""}
                          `}
                        >
                          {icon.name.charAt(0)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                
                {/* Timer */}
                <div className="flex items-center gap-2 ml-4">
                  <Clock className="w-4 h-4 text-alien-green" />
                  <div className="text-sm font-bold text-alien-green">
                    {currentTurnTimer}s
                  </div>
                  <Progress 
                    value={(currentTurnTimer / 20) * 100} 
                    className="w-16 h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Middle Row */}
      <div className="flex-1 flex gap-2 p-2">
        {/* Left Side - Player 1 */}
        <div className="w-80 flex flex-col gap-2">
          {/* Yellow Box - Player 1 Character Info */}
          <div className="h-1/2">
            <Card className="h-full border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-2 h-full">
                {player1SelectedIcon ? (
                  <CharacterPanel character={player1SelectedIcon} visible={true} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Click a Player 1 character to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Black Box - Player 1 Team */}
          <div className="h-1/2">
            <Card className="h-full border-gray-700 bg-gray-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-player1 flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  Player 1 (Blue)
                </CardTitle>
                <div className="text-xs">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
                <div className="text-xs flex items-center gap-2">
                  Base HP: 
                  <HPBar currentHP={gameState.baseHealth[0]} maxHP={5} size="small" />
                  {gameState.baseHealth[0]}/5
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-1">
                  {gameState.players[0].icons.map(icon => {
                    if (!icon.isAlive) {
                      return (
                        <div key={icon.id} className="flex justify-between items-center text-xs text-red-400">
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
                      <div key={icon.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs cursor-pointer hover:bg-player1/40 ${
                              selectedPlayer1Character === icon.id 
                                ? "bg-player1/60 border-player1" 
                                : "bg-player1/20 border-player1"
                            }`}
                            onClick={() => handleCharacterSelect(icon.id)}
                          >
                            {icon.name.charAt(0)}
                          </div>
                          <span className={icon.id === gameState.activeIconId ? "font-bold text-alien-green" : ""}>
                            {icon.name} ({icon.stats.hp}/{icon.stats.maxHp})
                          </span>
                        </div>
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Center - Green Box - Game Board */}
        <div className="flex-1">
          <Card className="h-full border-green-500/50 bg-green-500/10">
            <CardContent className="p-2 h-full flex items-center justify-center">
              <GameBoard gameState={gameState} onTileClick={onTileClick} />
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Player 2 */}
        <div className="w-80 flex flex-col gap-2">
          {/* Yellow Box - Player 2 Character Info */}
          <div className="h-1/2">
            <Card className="h-full border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="p-2 h-full">
                {player2SelectedIcon ? (
                  <CharacterPanel character={player2SelectedIcon} visible={true} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Click a Player 2 character to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Black Box - Player 2 Team */}
          <div className="h-1/2">
            <Card className="h-full border-gray-700 bg-gray-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-player2 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4" />
                  Player 2 (Red)
                </CardTitle>
                <div className="text-xs">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
                <div className="text-xs flex items-center gap-2">
                  Base HP: 
                  <HPBar currentHP={gameState.baseHealth[1]} maxHP={5} size="small" />
                  {gameState.baseHealth[1]}/5
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-1">
                  {gameState.players[1].icons.map(icon => {
                    if (!icon.isAlive) {
                      return (
                        <div key={icon.id} className="flex justify-between items-center text-xs text-red-400">
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
                      <div key={icon.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs cursor-pointer hover:bg-player2/40 ${
                              selectedPlayer2Character === icon.id 
                                ? "bg-player2/60 border-player2" 
                                : "bg-player2/20 border-player2"
                            }`}
                            onClick={() => handleCharacterSelect(icon.id)}
                          >
                            {icon.name.charAt(0)}
                          </div>
                          <span className={icon.id === gameState.activeIconId ? "font-bold text-alien-green" : ""}>
                            {icon.name} ({icon.stats.hp}/{icon.stats.maxHp})
                          </span>
                        </div>
                        <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Row - Active Character Actions */}
      {activeIcon && (
        <div className="h-16 p-2">
          <Card className="h-full border-alien-green/30 bg-space-dark/80">
            <CardContent className="pt-2 pb-2 h-full flex items-center justify-between">
              {/* Active Character Info */}
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-alien-green" />
                <span className="text-alien-green font-bold text-sm">
                  Active: {activeIcon.name}
                </span>
                <span className="text-xs text-gray-400">
                  Movement: {activeIcon.stats.movement}/2
                </span>
              </div>

              {/* Actions - Horizontal Layout */}
              <div className="flex items-center gap-2">
                {/* Basic Attack */}
                <Button 
                  onClick={onBasicAttack}
                  disabled={activeIcon.actionTaken}
                  size="sm"
                  variant={gameState.targetingMode?.abilityId === 'basic_attack' ? "default" : "outline"}
                  className="flex items-center gap-1 text-xs"
                >
                  <Swords className="w-3 h-3" />
                  Attack
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
                          className="text-xs"
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
                          className="text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
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

              {/* End Turn Button with background */}
              <Button 
                onClick={onEndTurn} 
                size="sm" 
                className="bg-alien-green hover:bg-alien-green/80 text-black font-bold border-2 border-alien-green/50"
              >
                End Turn
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HorizontalGameUI;