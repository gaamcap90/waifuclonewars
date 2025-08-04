import { Icon, GameState } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HPBar from "./HPBar";

interface CharacterPanelProps {
  character?: Icon;
  visible: boolean;
  gameState?: GameState;
}

const CharacterPanel = ({ character, visible, gameState }: CharacterPanelProps) => {
  // 🐞 DEBUG LOGS:
  console.log("[CP] visible, character:", visible, character?.name);
  console.log("[CP] gameState.teamBuffs:", gameState?.teamBuffs);
  if (character && gameState) {
    console.log(
      `[CP] player ${character.playerId} raw mightBonus =`,
      gameState.teamBuffs.mightBonus[character.playerId]
    );
  }

  if (!visible || !character) return null;

   // base values
  const baseMight = character.stats.might;
  const basePower = character.stats.power;

  // exact extra from % buffs
  const extraMightRaw = (baseMight * mightBonus) / 100;
  const extraPowerRaw = (basePower * powerBonus) / 100;

  // round to 1 decimal if needed, otherwise show integer
  const extraMight = Number(
    extraMightRaw % 1 === 0 ? extraMightRaw : extraMightRaw.toFixed(1)
  );
  const extraPower = Number(
    extraPowerRaw % 1 === 0 ? extraPowerRaw : extraPowerRaw.toFixed(1)
  );

  // final displayed totals (if you ever need them)
  const buffedMight = baseMight + extraMight;
  const buffedPower = basePower + extraPower;

  return (
    <div className="fixed bottom-4 left-4 w-80 z-40">
      <Card className="bg-card/95 backdrop-blur border-arena-glow/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 font-orbitron">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold
              ${character.playerId === 0 ? 'border-player1 text-player1' : 'border-player2 text-player2'}`}>
              {character.name.charAt(0)}
            </div>
            <div>
              <div className="text-lg">{character.name}</div>
              <div className="text-sm text-muted-foreground capitalize">{character.role.replace('_', ' ')}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">HP:</span>
            <HPBar currentHP={character.stats.hp} maxHP={character.stats.maxHp} size="medium" />
            <span className="text-sm">{character.stats.hp}/{character.stats.maxHp}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Might:</span>
                <span className="text-red-400">
                  {mightBonus > 0 ? (
    <>
      {baseMight} + <span className="text-green-400">{extraMight}</span>
    </>
  ) : (
    baseMight
  )}
</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power:</span>
                <span className="text-blue-400">
  {powerBonus > 0 ? (
    <>
      {basePower} + <span className="text-green-400">{extraPower}</span>
    </>
  ) : (
    basePower
  )}
</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Defense:</span>
                <span className="text-green-400">{character.stats.defense}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed:</span>
                <span className="text-yellow-400">{character.stats.speed}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-alien-purple">Passive:</div>
            <div className="text-xs text-muted-foreground">{character.passive}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CharacterPanel;
