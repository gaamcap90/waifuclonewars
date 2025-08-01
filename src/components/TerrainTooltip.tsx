import { TerrainType } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TerrainTooltipProps {
  terrain: TerrainType;
  position: { x: number; y: number };
  visible: boolean;
}

const getTerrainDisplayName = (type: string): string => {
  switch (type) {
    case 'forest': return 'Forest';
    case 'mountain': return 'Mountain';
    case 'river': return 'River';
    case 'plain': return 'Plains';
    case 'mana_crystal': return 'Mana Crystal';
    case 'beast_camp': return 'Beast Camp';
    case 'base': return 'Base';
    case 'spawn': return 'Spawn Zone';
    default: return 'Unknown';
  }
};

const getTerrainEffectsText = (terrain: TerrainType): string[] => {
  const effects: string[] = [];
  
  if (terrain.effects.movementModifier) {
    effects.push(`Movement: ${terrain.effects.movementModifier > 0 ? '+' : ''}${terrain.effects.movementModifier}`);
  }
  if (terrain.effects.dodgeBonus) {
    effects.push('Dodge bonus');
  }
  if (terrain.effects.rangeBonus) {
    effects.push('Range bonus');
  }
  if (terrain.effects.stealthBonus) {
    effects.push('Stealth bonus');
  }
  if (terrain.effects.blocksLineOfSight) {
    effects.push('Blocks line of sight');
  }
  if (terrain.effects.manaRegen) {
    effects.push(`Mana regen: +${terrain.effects.manaRegen}/turn`);
  }
  if (terrain.type === 'mountain') {
    effects.push('Impassable terrain');
  }
  if (terrain.type === 'river') {
    effects.push('Impassable terrain');
  }
  
  return effects.length > 0 ? effects : ['No special effects'];
};

const TerrainTooltip = ({ terrain, position, visible }: TerrainTooltipProps) => {
  if (!visible) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      <Card className="w-64 bg-popover border-border shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {getTerrainDisplayName(terrain.type)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground space-y-1">
            {getTerrainEffectsText(terrain).map((effect, index) => (
              <div key={index}>{effect}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TerrainTooltip;