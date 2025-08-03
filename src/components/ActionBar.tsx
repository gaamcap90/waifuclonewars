import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Move, Zap } from "lucide-react";

interface ActionBarProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onEndTurn: () => void;
}

const ActionBar = ({ gameState, onBasicAttack, onEndTurn }: ActionBarProps) => {
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  const activePlayer = activeIcon ? gameState.players.find(p => p.id === activeIcon.playerId) : null;

  // Don't show action bar for AI players (player 1) in singleplayer mode
  if (!activeIcon || !activePlayer || (gameState.gameMode === 'singleplayer' && activeIcon.playerId === 1)) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Actions - {activeIcon.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Movement Status */}
        <div className="flex items-center gap-2 text-sm">
          <Move className="w-4 h-4" />
          <span>Movement: {activeIcon.movedThisTurn ? 'Used' : 'Available'}</span>
        </div>

        {/* Basic Attack */}
        <Button
          onClick={onBasicAttack}
          disabled={activeIcon.actionTaken}
          className="w-full"
          variant={activeIcon.actionTaken ? "secondary" : "outline"}
        >
          <Swords className="w-4 h-4 mr-2" />
          Basic Attack ({activeIcon.stats.might} damage)
        </Button>

        {/* Abilities */}
        <div className="space-y-2">
          {activeIcon.abilities.map((ability) => {
            const canUse = !activeIcon.actionTaken && 
                          gameState.globalMana[activePlayer.id] >= ability.manaCost &&
                          ability.currentCooldown === 0;
            
            // Calculate damage/healing for display
            let displayValue = "";
            if (ability.description.includes("Power × 0.8")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 0.8)} damage`;
            } else if (ability.description.includes("Power × 1.2")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 1.2)} damage`;
            } else if (ability.description.includes("Power × 1.5")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 1.5)} damage`;
            } else if (ability.description.includes("Power × 0.5")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 0.5)} damage`;
            } else if (ability.description.includes("Power × 0.6")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 0.6)} damage`;
            } else if (ability.description.includes("Power × 0.9")) {
              displayValue = `${Math.floor(activeIcon.stats.power * 0.9)} healing`;
            }
            
            return (
              <Button
                key={ability.id}
                disabled={!canUse}
                className="w-full justify-start"
                variant={canUse ? "outline" : "secondary"}
              >
                <Zap className="w-4 h-4 mr-2" />
                <div className="flex-1 text-left">
                  <div className="flex justify-between">
                    <span className={ability.id === "ultimate" ? "text-red-500 font-bold" : ""}>
                      {ability.id === "ultimate" ? "ULTIMATE: " : ""}{ability.name}
                    </span>
                    <span className="text-xs">{ability.manaCost} mana</span>
                  </div>
                  {displayValue && (
                    <div className="text-xs text-muted-foreground">
                      {displayValue}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* End Turn */}
        <Button 
          onClick={onEndTurn} 
          className="w-full" 
          variant="outline" 
          size="lg"
          disabled={gameState.gameMode === 'singleplayer' && activeIcon.playerId === 1}
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

export default ActionBar;