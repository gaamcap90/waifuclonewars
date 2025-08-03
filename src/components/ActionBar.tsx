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

  if (!activeIcon || !activePlayer) return null;

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
          variant="outline"
        >
          <Swords className="w-4 h-4 mr-2" />
          Basic Attack ({activeIcon.stats.might - 5} damage)
        </Button>

        {/* Abilities */}
        <div className="space-y-2">
          {activeIcon.abilities.map((ability) => {
            const canUse = !activeIcon.actionTaken && 
                          gameState.globalMana[activePlayer.id] >= ability.manaCost &&
                          ability.currentCooldown === 0;
            
            return (
              <Button
                key={ability.id}
                disabled={!canUse}
                className="w-full justify-start"
                variant={canUse ? "default" : "secondary"}
              >
                <Zap className="w-4 h-4 mr-2" />
                <div className="flex-1 text-left">
                  <div className="flex justify-between">
                    <span>{ability.name}{activeIcon.ultimateUsed && ability.id.includes('ultimate') ? ' (ULTIMATE)' : ''}</span>
                    <span className="text-xs">{Math.floor(activeIcon.stats.power * 0.5)} damage • {ability.manaCost} mana</span>
                  </div>
                  {ability.currentCooldown > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Cooldown: {ability.currentCooldown}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* End Turn */}
        <Button onClick={onEndTurn} className="w-full" variant="outline" size="lg">
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