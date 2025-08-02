import React, { useState } from "react";
import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Crown, Swords, Zap, Shield, Target, Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
}

const HorizontalGameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn, onUndoMovement }: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{id: string, position: {x: number, y: number}} | null>(null);
  
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  // Close popup when clicking anywhere
  const handleClosePopup = () => {
    setSelectedCharacter(null);
  };

  const formatTime = (seconds: number) => {
    // Show 30-second countdown per turn
    const turnTimeLeft = 30 - (seconds % 30);
    return turnTimeLeft === 0 ? "30s" : `${turnTimeLeft}s`;
  };

  const getCurrentTurn = () => {
    return Math.floor(gameState.matchTimer / 30) + 1;
  };

  // Listen for global close popup events
  React.useEffect(() => {
    const handleGlobalClose = () => setSelectedCharacter(null);
    window.addEventListener('closeCharacterPopup', handleGlobalClose);
    return () => window.removeEventListener('closeCharacterPopup', handleGlobalClose);
  }, []);

  return (
    <>
      {/* Top Left: Objectives */}
      <div className="absolute top-0 left-0 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 rounded-none rounded-br-lg">
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
         
          {/* Turn Number */}
          <Card className="bg-background/80 backdrop-blur-sm border-border/50 rounded-none rounded-br-lg mt-1">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">Turn {getCurrentTurn()}</div>
              </div>
            </CardContent>
          </Card>
          
          {/* End Turn Button below Turn Number */}
          <div className="flex justify-center mt-2">
            <Button 
              onClick={onEndTurn} 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2 text-lg shadow-lg border-2 border-red-400"
            >
              End Turn
            </Button>
          </div>
       </div>

      {/* Top Center: Turn Queue */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <div className="flex items-center gap-4">
          <Card className="bg-background/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-lg">Turn Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-3">
                {gameState.speedQueue.map((iconId, index) => {
                  const icon = gameState.players.flatMap(p => p.icons).find(i => i.id === iconId);
                  if (!icon) return null;
                  const isActive = icon.id === gameState.activeIconId;
                  return (
                    <div key={iconId} className={`relative ${isActive ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 rounded-full" : ""}`}>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all ${
                        icon.playerId === 0 
                          ? "border-blue-400 bg-blue-500/90 text-white" 
                          : "border-red-400 bg-red-500/90 text-white"
                      } ${isActive ? "scale-110 ring-2 ring-yellow-300" : ""}`}>
                        {icon.name.charAt(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Timer beside Turn Queue */}
          <Card className="bg-background/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-semibold">Timer</div>
                <div className="text-xl font-bold">{formatTime(gameState.matchTimer)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Center Left: Player 1 - Expanded Width */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">Player 1 (Blue)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[0]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                {gameState.players[0].icons.map(icon => (
                  <div key={icon.id} className="text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSelectedCharacter({
                          id: icon.id,
                          position: { x: rect.left + rect.width / 2, y: rect.top }
                        });
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        icon.playerId === 0 ? "border-blue-400 bg-blue-500/90 text-white hover:bg-blue-600/90" : ""
                      } ${icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : ""}`}
                    >
                      {icon.name.charAt(0)}
                    </button>
                    <div className="text-xs mt-1">{icon.stats.hp}/{icon.stats.maxHp}</div>
                    <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Right: Player 2 - Expanded Width */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player2">Player 2 (Red)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[1]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                {gameState.players[1].icons.map(icon => (
                  <div key={icon.id} className="text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSelectedCharacter({
                          id: icon.id,
                          position: { x: rect.left + rect.width / 2, y: rect.top }
                        });
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        icon.playerId === 1 ? "border-red-400 bg-red-500/90 text-white hover:bg-red-600/90" : ""
                      } ${icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : ""}`}
                    >
                      {icon.name.charAt(0)}
                    </button>
                    <div className="text-xs mt-1">{icon.stats.hp}/{icon.stats.maxHp}</div>
                    <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Center: Active Character Panel - Made Wider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[600px]">
          <CardHeader className="pb-2">
            <CardTitle>Active: {activeIcon?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeIcon && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Movement: {activeIcon.movedThisTurn ? 0 : activeIcon.stats.movement}/{activeIcon.stats.movement}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onUndoMovement}
                    disabled={!activeIcon.movedThisTurn || activeIcon.actionTaken}
                  >
                    Undo Movement
                  </Button>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={onBasicAttack}
                          disabled={activeIcon.actionTaken}
                          size="sm"
                          className="bg-primary flex items-center gap-2"
                        >
                          <Swords className="w-4 h-4" />
                          Attack
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Basic Attack - Damage: {activeIcon.stats.power}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {activeIcon.abilities.slice(0, 3).map((ability, index) => {
                    const getAbilityIcon = (abilityName: string) => {
                      if (abilityName.toLowerCase().includes('charge')) return Zap;
                      if (abilityName.toLowerCase().includes('ultimate')) return Target;
                      return Shield;
                    };
                    const IconComponent = getAbilityIcon(ability.name);
                    
                    return (
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
                              className={`flex items-center gap-2 ${
                                ability.name.toLowerCase().includes('ultimate') ? "bg-red-600 hover:bg-red-700" : ""
                              }`}
                            >
                              <IconComponent className="w-4 h-4" />
                              {ability.name.slice(0, 8)} ({ability.manaCost})
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold">{ability.name} {ability.name.toLowerCase().includes('ultimate') ? '(ULTIMATE)' : ''}</p>
                              <p className="text-sm">{ability.description}</p>
                              <p className="text-xs mt-1">Power: {activeIcon.stats.power} | Range: {ability.range}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Character Detail Popup */}
      {selectedCharacter && (() => {
        const character = gameState.players
          .flatMap(p => p.icons)
          .find(icon => icon.id === selectedCharacter.id);
        
        if (!character) return null;
        
        return (
          <CharacterDetailPopup
            character={character}
            onClose={handleClosePopup}
            position={selectedCharacter.position}
          />
        );
      })()}
    </>
  );
};

export default HorizontalGameUI;