import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface GameUIProps {
  gameState: GameState;
  onEndTurn: () => void;
}

const GameUI = ({ gameState, onEndTurn }: GameUIProps) => {
  const currentPlayerData = gameState.players[gameState.currentPlayer];
  const selectedIcon = gameState.selectedIcon 
    ? gameState.players
        .flatMap(p => p.icons)
        .find(i => i.id === gameState.selectedIcon)
    : undefined;

  return (
    <div className="flex flex-col gap-4 p-4 bg-card border rounded-lg">
      {/* Game Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Turn {gameState.currentTurn}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{currentPlayerData.name}'s Turn</span>
            <Badge variant={currentPlayerData.color === 'blue' ? 'default' : 'destructive'}>
              {currentPlayerData.color.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Global Mana:</span>
            <span className="font-bold text-primary">
              {gameState.globalMana[gameState.currentPlayer]}/20
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>P1 Base: {gameState.baseHealth[0]}/10</div>
            <div>P2 Base: {gameState.baseHealth[1]}/10</div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Icon Info */}
      {selectedIcon && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{selectedIcon.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Role:</span>
              <Badge variant="secondary">{selectedIcon.role.replace('_', ' ')}</Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Health:</span>
                <span>{selectedIcon.stats.hp}/{selectedIcon.stats.maxHp}</span>
              </div>
              <Progress value={(selectedIcon.stats.hp / selectedIcon.stats.maxHp) * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Move: {selectedIcon.stats.moveRange}</div>
              <div>Initiative: {selectedIcon.stats.initiative}</div>
            </div>
            
            <div className="space-y-1">
              <div className="font-medium text-sm">Abilities:</div>
              {selectedIcon.abilities.map((ability) => (
                <div key={ability.id} className="text-xs p-2 bg-muted rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">{ability.name}</span>
                    <span className="text-primary">{ability.manaCost} mana</span>
                  </div>
                  <div className="text-muted-foreground">{ability.description}</div>
                  {ability.currentCooldown > 0 && (
                    <div className="text-destructive">Cooldown: {ability.currentCooldown}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Player's Icons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your Icons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentPlayerData.icons.map((icon) => (
              <div 
                key={icon.id} 
                className={`p-2 border rounded text-sm ${
                  icon.id === gameState.selectedIcon ? 'border-primary bg-primary/10' : 'border-border'
                } ${!icon.isAlive ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{icon.name}</span>
                  <div className="text-xs">
                    {icon.isAlive ? (
                      <span className="text-green-600">Alive</span>
                    ) : (
                      <span className="text-red-600">Respawn in {icon.respawnTurns}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>HP: {icon.stats.hp}/{icon.stats.maxHp}</span>
                  <span>Pos: ({icon.position.q}, {icon.position.r})</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Objectives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Mana Crystal:</span>
            <span className={
              gameState.objectives.manaCrystal.controlled 
                ? 'text-green-600' 
                : 'text-muted-foreground'
            }>
              {gameState.objectives.manaCrystal.controlled ? 'Controlled' : 'Neutral'}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span>Beast Camp:</span>
            <span className={
              gameState.objectives.beastCamp.defeated 
                ? 'text-green-600' 
                : 'text-muted-foreground'
            }>
              {gameState.objectives.beastCamp.defeated ? 'Defeated' : 'Active'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onEndTurn} className="w-full" size="lg">
        End Turn
      </Button>
    </div>
  );
};

export default GameUI;