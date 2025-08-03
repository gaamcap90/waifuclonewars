import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/types/game";

interface CharacterSelectionProps {
  onStartGame: (selectedIcons: Icon[]) => void;
  gameMode: 'singleplayer' | 'multiplayer';
}

const availableCharacters = [
  {
    name: "Napoleon-chan",
    role: "dps_ranged" as const,
    stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 70, power: 60, defense: 15, movement: 2 },
    abilities: [
      { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 48 },
      { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
      { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 30 }
    ],
    passive: "Tactical Genius: +1 movement range when commanding from high ground",
    portrait: "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png"
  },
  {
    name: "Genghis-chan",
    role: "dps_melee" as const,
    stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
    abilities: [
      { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack through enemies. Deals 48 damage.", damage: 48 },
      { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Teleport behind target. Deals 60 damage + fear effect.", damage: 60 },
      { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Charge through up to 3 enemies, dealing 24 damage each", damage: 24 }
    ],
    passive: "Conqueror's Fury: +15% damage for each enemy defeated this match",
    portrait: "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png"
  },
  {
    name: "Da Vinci-chan", 
    role: "support" as const,
    stats: { hp: 80, maxHp: 80, moveRange: 2, speed: 4, might: 35, power: 50, defense: 20, movement: 2 },
    abilities: [
      { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Teleport to any hex + gain aerial view for 2 turns.", damage: 0 },
      { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP + shields allies from next attack.", healing: 45 },
      { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 }
    ],
    passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals",
    portrait: "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png"
  }
];

const CharacterSelection = ({ onStartGame, gameMode }: CharacterSelectionProps) => {
  const handleStartGame = () => {
    // For now, start with all characters selected
    const initialIcons: Icon[] = [];
    
    // Create icons for both players
    const player1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
    const player2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];
    
    for (let playerId = 0; playerId < 2; playerId++) {
      availableCharacters.forEach((template, index) => {
        const spawns = playerId === 0 ? player1Spawns : player2Spawns;
        initialIcons.push({
          id: `${playerId}-${index}`,
          ...template,
          position: spawns[index],
          playerId,
          isAlive: true,
          respawnTurns: 0,
          actionTaken: false,
          movedThisTurn: false,
          hasUltimate: true,
          ultimateUsed: false,
        });
      });
    }
    
    onStartGame(initialIcons);
  };

  return (
    <div className="fixed inset-0 bg-space-dark/95 flex items-center justify-center z-50">
      <Card className="max-w-4xl mx-4 border-alien-green/50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-alien-green">Select Your Team</CardTitle>
          <p className="text-gray-300">Choose your historical champions for battle</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {availableCharacters.map((character) => (
              <Card key={character.name} className="border-alien-green/30 bg-space-medium/50">
                <CardHeader className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden border-2 border-alien-green">
                    <img 
                      src={character.portrait} 
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardTitle className="text-lg text-alien-green">{character.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {character.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>HP:</span>
                      <span className="text-alien-green">{character.stats.hp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Might:</span>
                      <span className="text-alien-green">{character.stats.might}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Power:</span>
                      <span className="text-alien-green">{character.stats.power}</span>
                    </div>
                  </div>
                  <div className="border-t border-alien-green/20 pt-2">
                    <p className="text-xs text-gray-400 font-bold mb-1">KEY ABILITY:</p>
                    <p className="text-xs text-gray-300">{character.abilities[0].name}</p>
                    <p className="text-xs text-gray-400">{character.abilities[0].description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button onClick={handleStartGame} size="lg" className="min-w-48">
              Start Battle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CharacterSelection;