import React from "react";
import { createPortal } from "react-dom";
import { Icon, GameState } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";
import { useBuffCalculation } from "@/hooks/useBuffCalculation";
import { calcEffectiveStats } from "@/combat/buffs";

interface CharacterDetailPopupProps {
  character: Icon;
  gameState: GameState;
  onClose: () => void;
  /** Expect X centered on the portrait, and Y = portrait's bottom (viewport coords) */
  position: { x: number; y: number };
}

const CharacterDetailPopup = ({
  character,
  gameState,
  onClose,
  position
}: CharacterDetailPopupProps) => {
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  const { calculateBuffedStats } = useBuffCalculation();
  const buffedStats = calculateBuffedStats(character, gameState);
  // Use canonical calcEffectiveStats for accuracy (includes debuffs + passives)
  const eff = calcEffectiveStats(gameState, character);

  const baseMight = character.stats.might;
  const basePower = character.stats.power;
  const baseDefense = character.stats.defense;

  const beastCampMightBonus = (baseMight * buffedStats.beastCampMightBonus) / 100;
  const beastCampPowerBonus = (basePower * buffedStats.beastCampPowerBonus) / 100;
  const homeBaseMightBonus = buffedStats.isOnHomeBase ? (baseMight * 20) / 100 : 0;
  const homeBasePowerBonus = buffedStats.isOnHomeBase ? (basePower * 20) / 100 : 0;
  const homeBaseDefenseBonus = buffedStats.isOnHomeBase ? (baseDefense * 20) / 100 : 0;
  // Napoleon doesn't get forest DEF bonus; forest is now +25%
  const forestDefenseBonus = buffedStats.isOnForest && !character.name.includes("Napoleon")
    ? (baseDefense * 25) / 100 : 0;
  const napoleonForestRange = character.name.includes("Napoleon") && buffedStats.isOnForest;

  const formatBonus = (value: number) => (value % 1 === 0 ? value.toString() : value.toFixed(1));

  const DEBUFF_LABELS: Record<string, string> = {
    mud_throw:   "🐾 Mud Throw",
    demoralize:  "💔 Demoralize",
    armor_break: "🔩 Armor Break",
    silence:     "🤫 Silence",
    poison:      "☠️ Poison",
  };

  const passiveText = (() => {
    if (character.name.includes("Napoleon"))
      return `Vantage Point: On forest tile, basic attack range becomes 3, but no DEF bonus.${napoleonForestRange ? " (ACTIVE — Range 3 now)" : ""}`;
    if (character.name.includes("Genghis"))
      return `Bloodlust: Each kill grants +15 Might and restores 1 Mana. Stacks up to 3×.${(character.passiveStacks ?? 0) > 0 ? ` (${character.passiveStacks}/3 stacks active)` : ""}`;
    if (character.name.includes("Da Vinci"))
      return "Tinkerer: At turn start, if no exclusive ability card was played last turn, draw +1 card.";
    return character.passive ?? "No passive";
  })();

  const getCharacterPortrait = (name: string) => {
    if (name.includes("Napoleon")) return "/art/napoleon_portrait.png";
    if (name.includes("Genghis")) return "/art/genghis_portrait.png";
    if (name.includes("Da Vinci")) return "/art/davinci_portrait.png";
    if (name.includes("Leonidas")) return "/art/leonidas_portrait.png";
    return null;
  };

  // Clamp so popup never escapes viewport (popup is ~220px wide)
  const POPUP_W = 230;
  const clampedX = typeof window !== "undefined"
    ? Math.max(POPUP_W / 2 + 8, Math.min(position.x, window.innerWidth - POPUP_W / 2 - 8))
    : position.x;

  return createPortal(
    <>
      {/* Popup (anchored below portrait, clamped to viewport) */}
      <div
        className="fixed z-50 pointer-events-auto"
        style={{
          left: clampedX,
          top: position.y + 8,
          transform: "translate(-50%, 0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-background/95 backdrop-blur-sm border-border shadow-xl min-w-[200px] max-w-[220px]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full border-2 overflow-hidden ${
                  character.playerId === 0 ? "border-blue-400" : "border-red-400"
                }`}
              >
                {getCharacterPortrait(character.name) ? (
                  <img
                    src={getCharacterPortrait(character.name)!}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center text-lg font-bold ${
                      character.playerId === 0 ? "bg-blue-500/90 text-white" : "bg-red-500/90 text-white"
                    }`}
                  >
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  {character.role === "dps_ranged" && (<><Crosshair className="w-3 h-3" /> Ranged DPS</>)}
                  {character.role === "dps_melee" && (<><Sword className="w-3 h-3" /> Melee DPS</>)}
                  {character.role === "support" && (<><Heart className="w-3 h-3" /> Support</>)}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-semibold mb-1">HP:</div>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {character.stats.hp}/{character.stats.maxHp}
                </span>
                <HPBar currentHP={character.stats.hp} maxHP={character.stats.maxHp} size="medium" />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Might:</span>
                <span className="ml-2 text-red-400 font-semibold">{Math.floor(eff.might)}</span>
                {(beastCampMightBonus > 0 || homeBaseMightBonus > 0 || buffedStats.cardBuffAtk > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {beastCampMightBonus > 0 && `+${formatBonus(beastCampMightBonus)} (Beast Camp) `}
                    {homeBaseMightBonus > 0 && `+${formatBonus(homeBaseMightBonus)} (Base) `}
                    {buffedStats.cardBuffAtk > 0 && <span className="text-yellow-300">+{buffedStats.cardBuffAtk} (card)</span>}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Power:</span>
                <span className="ml-2 text-blue-400 font-semibold">{Math.floor(eff.power)}</span>
                {(beastCampPowerBonus > 0 || homeBasePowerBonus > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {beastCampPowerBonus > 0 && `+${formatBonus(beastCampPowerBonus)} (Beast Camp) `}
                    {homeBasePowerBonus > 0 && `+${formatBonus(homeBasePowerBonus)} (Base)`}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Defense:</span>
                <span className="ml-2 text-green-400 font-semibold">{Math.floor(eff.defense)}</span>
                {(homeBaseDefenseBonus > 0 || forestDefenseBonus > 0 || buffedStats.cardBuffDef > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {homeBaseDefenseBonus > 0 && `+${formatBonus(homeBaseDefenseBonus)} (Base) `}
                    {forestDefenseBonus > 0 && `+${formatBonus(forestDefenseBonus)} (Forest) `}
                    {buffedStats.cardBuffDef > 0 && <span className="text-yellow-300">+{buffedStats.cardBuffDef} (card)</span>}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Range:</span>
                <span className="ml-2 text-yellow-400 font-semibold">
                  {napoleonForestRange ? 3 : (character.name.includes("Napoleon") || character.name.includes("Da Vinci")) ? 2 : 1}
                </span>
                {napoleonForestRange && <span className="ml-2 text-[10px] text-green-400">(forest passive)</span>}
              </div>

              {/* Genghis Bloodlust stacks */}
              {(character.passiveStacks ?? 0) > 0 && (
                <div className="text-xs text-red-300 border border-red-500/40 rounded px-2 py-1 bg-red-500/10">
                  🩸 Bloodlust: {character.passiveStacks}/3 stacks (+{(character.passiveStacks ?? 0) * 15} Might)
                </div>
              )}
            </div>

            {/* Active Debuffs */}
            {(character.debuffs ?? []).length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1 text-red-400">Active Debuffs:</div>
                <div className="flex flex-col gap-1">
                  {character.debuffs!.map((d, i) => (
                    <div key={i} className="text-xs flex items-center justify-between bg-red-950/40 border border-red-800/40 rounded px-2 py-0.5">
                      <span>{DEBUFF_LABELS[d.type] ?? d.type}</span>
                      <span className="text-muted-foreground">−{d.magnitude} · {d.turnsRemaining}t left</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passive */}
            <div>
              <div className="text-sm font-semibold mb-1">Passive:</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{passiveText}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
};

export default CharacterDetailPopup;

