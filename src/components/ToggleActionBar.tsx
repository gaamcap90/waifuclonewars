import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Zap } from "lucide-react";
import { useState } from "react";

interface ToggleActionBarProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onAbilitySelect: (abilityId: string) => void;
  onEndTurn: () => void;
}

const ToggleActionBar = ({ gameState, onBasicAttack, onAbilitySelect, onEndTurn }: ToggleActionBarProps) => {
  const [selectedAction, setSelectedAction] = useState<'attack' | string | null>(null);
  
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  const activePlayer = activeIcon ? gameState.players.find(p => p.id === activeIcon.playerId) : null;

  // Don't show action bar for AI players in singleplayer mode
  if (!activeIcon || !activePlayer || (gameState.gameMode === 'singleplayer' && activeIcon.playerId === 1)) return null;

  const handleActionSelect = (actionType: 'attack' | string) => {
    // Toggle behavior: if same action is selected, deselect it
    const newAction = selectedAction === actionType ? null : actionType;
    setSelectedAction(newAction);
    
    if (newAction === 'attack') {
      onBasicAttack();
    } else if (newAction) {
      onAbilitySelect(newAction);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Actions - {activeIcon.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Basic Attack */}
        <Button
          onClick={() => handleActionSelect('attack')}
          disabled={activeIcon.actionTaken}
          className={`w-full justify-start ${selectedAction === 'attack' ? 'bg-black text-white' : 'bg-white text-gray-900 hover:bg-gray-200'}`}
          variant="outline"
        >
          <Swords className="w-4 h-4 mr-2" />
          <div className="flex-1 text-left">
            <div className="flex justify-between">
              <span>Basic Attack</span>
              <span className="text-xs">Free</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Deals {activeIcon.stats.might} damage
            </div>
          </div>
        </Button>

        {/* Abilities */}
        <div className="space-y-2">
          {activeIcon.abilities.map((ability) => {
            const canUse = !activeIcon.actionTaken && 
                          gameState.globalMana[activePlayer.id] >= ability.manaCost &&
                          ability.currentCooldown === 0 &&
                          (ability.id !== 'ultimate' || !activeIcon.ultimateUsed);
            
            const isSelected = selectedAction === ability.id;
            
            return (
              <Button
                key={ability.id}
                onClick={() => handleActionSelect(ability.id)}
                disabled={!canUse}
                 className={`w-full justify-start ${
                   isSelected 
                     ? (ability.id === "ultimate" ? 'bg-red-900 text-white border-red-500' : 'bg-black text-white') 
                     : (ability.id === "ultimate" ? 'bg-red-600 text-white hover:bg-red-700 border-red-700' : 'bg-white text-gray-900 hover:bg-gray-200')
                 }`}
                 variant="outline"
               >
                 <Zap className="w-4 h-4 mr-2" />
                 <div className="flex-1 text-left">
                   <div className="flex justify-between">
                     <span className={ability.id === "ultimate" ? "text-red-400 font-bold" : ""}>
                       {ability.id === "ultimate" ? "ULTIMATE: " : ""}{ability.name}
                     </span>
                     <span className="text-xs">{ability.id === "ultimate" ? 0 : ability.manaCost} mana</span>
                   </div>
                  <div className="text-xs text-muted-foreground">
                    {ability.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Ultimate Indicator */}
        {selectedAction.includes('ultimate') && (
          <div className="text-center p-2 bg-orange-500/20 border border-orange-500/50 rounded animate-pulse">
            <span className="text-orange-400 font-bold text-lg">🌟 ULTIMATE SELECTED 🌟</span>
          </div>
        )}

        {/* End Turn */}
        <Button 
          onClick={onEndTurn} 
          className="w-full" 
          variant="outline" 
          size="lg"
          disabled={gameState.gameMode === 'singleplayer' && activeIcon?.playerId === 1}
        >
          End Turn
        </Button>

        {/* Action Status */}
        <div className="text-xs text-muted-foreground text-center">
          {activeIcon.actionTaken ? 'Action taken this turn' : 'Can still act this turn'}
        </div>
      </CardContent>
    </Card>
  );
};

export default ToggleActionBar;