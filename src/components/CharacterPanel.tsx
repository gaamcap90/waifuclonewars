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

  // Get buffs from gameState
  const mightBonus = gameState?.teamBuffs?.mightBonus?.[character.playerId] || 0;
  const powerBonus = gameState?.teamBuffs?.powerBonus?.[character.playerId] || 0;

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

  const PORTRAIT_MAP: Record<string, string> = {
    Napoleon:   '/art/napoleon_portrait.png',
    Genghis:    '/art/genghis_portrait.png',
    'Da Vinci': '/art/davinci_portrait.png',
    Leonidas:   '/art/leonidas_portrait.png',
    'Sun-sin':  '/art/sunsin_portrait.png',
    Beethoven:  '/art/beethoven_portrait.png',
    Huang:      '/art/huang_portrait.png',
    Nelson:     '/art/nelson_portrait.png',
    Hannibal:   '/art/hannibal_portrait.png',
    Picasso:    '/art/picasso_portrait.png',
    Teddy:      '/art/teddy_portrait.png',
    Mansa:      '/art/mansa_portrait.png',
  };
  const portraitSrc = Object.entries(PORTRAIT_MAP).find(([k]) => character.name.includes(k))?.[1] ?? null;

  const hpPct = character.stats.maxHp > 0 ? character.stats.hp / character.stats.maxHp : 1;
  const hpBorderColor = hpPct > 0.6
    ? (character.playerId === 0 ? '#3b82f6' : '#ef4444')
    : hpPct > 0.3
    ? '#f59e0b'
    : '#ef4444';
  const hpGlow = hpPct > 0.6
    ? (character.playerId === 0 ? 'rgba(59,130,246,0.45)' : 'rgba(239,68,68,0.45)')
    : hpPct > 0.3
    ? 'rgba(245,158,11,0.55)'
    : 'rgba(239,68,68,0.7)';
  const isUrgent = hpPct <= 0.3 && character.stats.hp > 0;

  return (
    <div className="fixed bottom-4 left-4 w-80 z-40">
      <Card className="bg-card/95 backdrop-blur border-arena-glow/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 font-orbitron">
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
              style={{
                border: `2px solid ${hpBorderColor}`,
                boxShadow: `0 0 10px ${hpGlow}`,
                animation: isUrgent ? 'anim-hp-urgent-pulse 1.0s ease-in-out infinite' : undefined,
              }}>
              {portraitSrc ? (
                <img src={portraitSrc} alt={character.name}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 15%', filter: isUrgent ? 'saturate(1.3)' : undefined }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                  style={{ background: 'rgba(80,60,120,0.8)', color: hpBorderColor }}>
                  {character.name.charAt(0)}
                </div>
              )}
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
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-alien-purple">Passive:</div>
            <div className="text-xs text-muted-foreground">{character.passive}</div>
            {(character.passiveStacks ?? 0) > 0 && (() => {
              const stacks = character.passiveStacks ?? 0;
              let label = "";
              let maxStacks = 0;
              if (character.name.includes("Beethoven")) { label = "Crescendo"; maxStacks = 15; }
              else if (character.name.includes("Genghis")) { label = "Bloodlust"; maxStacks = 2 + Math.floor((character.level ?? 1) / 2); }
              else if (character.name.includes("Leonidas")) { label = "Phalanx"; maxStacks = 3; }
              else if (character.name.includes("Teddy")) { label = "Bully!"; maxStacks = 3; }
              if (!label) return null;
              return (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-alien-purple font-medium">{label}:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: maxStacks }).map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{
                        background: i < stacks ? 'rgba(167,139,250,0.85)' : 'rgba(167,139,250,0.15)',
                        border: '1px solid rgba(167,139,250,0.4)',
                      }} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{stacks}/{maxStacks}</span>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CharacterPanel;
