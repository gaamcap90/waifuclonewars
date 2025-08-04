import React, { useState } from "react";
import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Crown, Swords, Zap, Shield, Target, Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
// Use the uploaded character portraits directly

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  currentTurnTimer: number;
}

const HorizontalGameUI = ({ gameState, onBasicAttack, onUseAbility, onEndTurn, onUndoMovement, onRespawn, currentTurnTimer }: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{id: string, position: {x: number, y: number}} | null>(null);
  
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);

  // Close popup when clicking anywhere
  const handleClosePopup = () => {
    setSelectedCharacter(null);
  };

  const getCharacterPortrait = (name: string) => {
    if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
    if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
    if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
    return null;
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
                        <Crown className={`w-4 h-4 ${gameState.objectives.beastCamps.defeated.some(d => d) ? "text-yellow-400" : "text-red-400"}`} />
                        <div>
                          <div className="font-semibold">Beast Camps</div>
                          <div className={gameState.objectives.beastCamps.defeated.some(d => d) ? "text-green-500" : "text-gray-500"}>
                            {gameState.objectives.beastCamps.defeated.every(d => d) ? "All Cleared" : `${gameState.objectives.beastCamps.defeated.filter(d => d).length}/2 Cleared`}
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
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <div className="flex flex-col items-center gap-4">
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
                  const portrait = getCharacterPortrait(icon.name);
                  
                  return (
                    <div key={iconId} className={`relative ${isActive ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 rounded-full" : ""}`}>
                      <div className={`w-14 h-14 rounded-full border-2 transition-all overflow-hidden ${
                        icon.playerId === 0 
                          ? "border-blue-400" 
                          : "border-red-400"
                      } ${isActive ? "scale-110 ring-2 ring-yellow-300" : ""}`}>
                        {portrait ? (
                          <img 
                            src={portrait} 
                            alt={icon.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-blue-500/90 text-white">
                            {icon.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* End Turn Button below Turn Queue */}
          <Button 
            onClick={onEndTurn} 
            size="lg" 
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2 text-lg shadow-lg border-2 border-red-400"
          >
            End Turn
          </Button>
        </div>
      </div>


      {/* Center Left: Player 1 - Same size as Player 2 */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player1">{gameState.players[0].name} (Blue)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[0]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[0]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                {gameState.players[0].icons.filter(icon => icon.isAlive).map(icon => {
                  const portrait = getCharacterPortrait(icon.name);
                  
                  return (
                    <div key={icon.id} className="relative w-14 h-14 mx-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setSelectedCharacter({
                            id: icon.id,
                            position: { x: rect.left + rect.width / 2, y: rect.top }
                          });
                        }}
                        className={`w-full h-full rounded-full border-2 overflow-hidden ${icon.playerId === 0 ? "border-blue-400" : ""} ${
                          icon.playerId === 0 ? "border-blue-400 hover:border-blue-300" : ""
                        } ${icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {portrait ? (
                          <img 
                            src={portrait || fallback}
                            alt={icon.name}
                            className="absolute inset-0 w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold bg-blue-500/90 text-white rounded-full">
                            {icon.name.charAt(0)}
                          </div>
                        )}
                      </button>
                      <div className="text-xs mt-1 text-center">{icon.stats.hp}/{icon.stats.maxHp}</div>
                      <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                    </div>
                  );
                })}
                <RespawnUI 
                  deadCharacters={gameState.players[0].icons.filter(icon => !icon.isAlive)}
                  onRespawn={onRespawn}
                  isMyTurn={gameState.players.flatMap(p => p.icons).find(i => i.id === gameState.activeIconId)?.playerId === 0}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Right: Player 2 - Expanded Width */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-auto z-10">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50 min-w-[280px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-player2">{gameState.players[1].name} (Red)</CardTitle>
            <div className="text-sm">Mana: {gameState.globalMana[1]}/20 (+1/turn)</div>
            <div className="text-sm">Base HP: {gameState.baseHealth[1]}/5</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                {gameState.players[1].icons.filter(icon => icon.isAlive).map(icon => {
                  const portrait = getCharacterPortrait(icon.name);
                  
                  return (
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
                        className={`w-full h-full rounded-full border-2 overflow-hidden ${icon.playerId === 0 ? "border-blue-400" : ""${
                          icon.playerId === 1 ? "border-red-400 hover:border-red-300" : ""
                        } ${icon.id === gameState.activeIconId ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {portrait ? (
                          <img 
                            src={portrait}
                            alt={icon.name}
                            className="absolute inset-0 w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold bg-blue-500/90 text-white rounded-full">
                            {icon.name.charAt(0)}
                          </div>
                        )}
                      </button>
                      <div className="text-xs mt-1 text-center">{icon.stats.hp}/{icon.stats.maxHp}</div>
                      <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
                    </div>
                  );
                })}
                <RespawnUI 
                  deadCharacters={gameState.players[1].icons.filter(icon => !icon.isAlive)}
                  onRespawn={onRespawn}
                  isMyTurn={gameState.players.flatMap(p => p.icons).find(i => i.id === gameState.activeIconId)?.playerId === 1}
                />
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
                  <span className="text-sm">Movement: {activeIcon.stats.movement}/{activeIcon.stats.moveRange}</span>
                  <div className="flex items-center gap-4">
                    {/* Timer next to active character info - made wider */}
                    <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                      <CardContent className="p-3">
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs font-semibold">Timer</div>
                          <div className="text-lg font-bold">{currentTurnTimer}s</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onUndoMovement}
                      disabled={!activeIcon.movedThisTurn || activeIcon.actionTaken}
                    >
                      Undo Movement
                    </Button>
                  </div>
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
                                ability.name.toLowerCase().includes('ultimate') ? "bg-red-600 hover:bg-red-700 text-white" : ""
                              }`}
                            >
                              <IconComponent className="w-4 h-4" />
                              {ability.name.toLowerCase().includes('ultimate') ? 'Ultimate' : ability.name.slice(0, 8)} ({ability.manaCost})
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
            gameState={gameState}
            onClose={handleClosePopup}
            position={selectedCharacter.position}
          />
        );
      })()}
    </>
  );
};

export default HorizontalGameUI;
