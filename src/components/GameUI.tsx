import { GameState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Heart, Swords } from "lucide-react";

interface GameUIProps {
  gameState: GameState;
  onEndTurn: () => void;
}

const GameUI = ({ gameState, onEndTurn }: GameUIProps) => {
  // Get the active icon (whose turn it is)
  const activeIcon = gameState.players
    .flatMap(p => p.icons)
    .find(i => i.id === gameState.activeIconId);
    
  const activePlayer = activeIcon ? gameState.players.find(p => p.id === activeIcon.playerId) : null;
  
  const selectedIcon = gameState.selectedIcon 
    ? gameState.players
        .flatMap(p => p.icons)
        .find(i => i.id === gameState.selectedIcon)
    : undefined;

  // Get next 3 icons in turn queue for display
  const upcomingTurns = gameState.speedQueue
    .slice(gameState.queueIndex, gameState.queueIndex + 3)
    .concat(gameState.speedQueue.slice(0, Math.max(0, 3 - (gameState.speedQueue.length - gameState.queueIndex))))
    .map(iconId => gameState.players.flatMap(p => p.icons).find(i => i.id === iconId))
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 p-4 bg-card border rounded-lg max-h-screen overflow-y-auto">
      {/* Match Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Match Timer: {Math.floor(gameState.matchTimer / 60)}:{(gameState.matchTimer % 60).toString().padStart(2, '0')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-blue-500" />
              <span>P1 Base: {gameState.baseHealth[0]}/10</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span>P2 Base: {gameState.baseHealth[1]}/10</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>P1 Mana: {gameState.globalMana[0]}/20</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-red-500" />
              <span>P2 Mana: {gameState.globalMana[1]}/20</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Turn */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Active Turn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeIcon && activePlayer && (
            <div className="flex justify-between items-center">
              <span className="font-medium">{activeIcon.name}</span>
              <Badge variant={activePlayer.color === 'blue' ? 'default' : 'destructive'}>
                {activePlayer.name}
              </Badge>
            </div>
          )}
          <div className="text-sm text-muted-foreground">Turn {gameState.currentTurn}</div>
        </CardContent>
      </Card>

      {/* Turn Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Turn Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingTurns.map((icon, index) => {
              if (!icon) return null;
              const player = gameState.players.find(p => p.id === icon.playerId);
              return (
                <div 
                  key={`${icon.id}-${index}`}
                  className={`flex justify-between items-center p-2 rounded text-sm ${
                    index === 0 ? 'bg-primary/20 border border-primary' : 'bg-muted/50'
                  }`}
                >
                  <span className="font-medium">{icon.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Speed: {icon.stats.speed}</span>
                    <Badge 
                      variant={player?.color === 'blue' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {player?.name}
                    </Badge>
                  </div>
                </div>
              );
            })}
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
              <div>Speed: {selectedIcon.stats.speed}</div>
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
                  {ability.damage && (
                    <div className="text-red-600">Damage: {ability.damage}</div>
                  )}
                  {ability.currentCooldown > 0 && (
                    <div className="text-destructive">Cooldown: {ability.currentCooldown}</div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Passive:</strong> {selectedIcon.passive}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Icons for Active Player */}
      {activePlayer && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{activePlayer.name}'s Icons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePlayer.icons.map((icon) => (
                <div 
                  key={icon.id} 
                  className={`p-2 border rounded text-sm ${
                    icon.id === gameState.selectedIcon ? 'border-primary bg-primary/10' : 'border-border'
                  } ${!icon.isAlive ? 'opacity-50' : ''} ${
                    icon.id === gameState.activeIconId ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{icon.name}</span>
                    <div className="text-xs flex gap-2">
                      {icon.id === gameState.activeIconId && (
                        <Badge variant="outline" className="text-xs">ACTIVE</Badge>
                      )}
                      {icon.isAlive ? (
                        <span className="text-green-600">Alive</span>
                      ) : (
                        <span className="text-red-600">Respawn in {icon.respawnTurns}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>HP: {icon.stats.hp}/{icon.stats.maxHp}</span>
                    <span>Speed: {icon.stats.speed}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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