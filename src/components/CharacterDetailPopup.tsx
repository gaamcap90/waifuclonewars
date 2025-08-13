import React from "react";
import { createPortal } from "react-dom";
import { Icon, GameState } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";
import { useBuffCalculation } from "@/hooks/useBuffCalculation";

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

  const baseMight = character.stats.might;
  const basePower = character.stats.power;
  const baseDefense = character.stats.defense;

  const beastCampMightBonus = (baseMight * buffedStats.beastCampMightBonus) / 100;
  const beastCampPowerBonus = (basePower * buffedStats.beastCampPowerBonus) / 100;
  const homeBaseMightBonus = buffedStats.isOnHomeBase ? (baseMight * 20) / 100 : 0;
  const homeBasePowerBonus = buffedStats.isOnHomeBase ? (basePower * 20) / 100 : 0;
  const homeBaseDefenseBonus = buffedStats.isOnHomeBase ? (baseDefense * 20) / 100 : 0;
  const forestDefenseBonus = buffedStats.isOnForest ? (baseDefense * 50) / 100 : 0;

  const formatBonus = (value: number) => (value % 1 === 0 ? value.toString() : value.toFixed(1));

  const getCharacterPortrait = (name: string) => {
    if (name.includes("Napoleon")) return "/lovable-uploads/7304dbe8-4caf-4418-ba67-d46f5d6e3a19.png";
    if (name.includes("Genghis")) return "/lovable-uploads/9c994306-633b-4289-a5d8-adb5f9a2c4ae.png";
    if (name.includes("Da Vinci")) return "/lovable-uploads/be631aac-8a45-4b6a-abae-75bacdbf2937.png";
    return null;
  };

  return createPortal(
    <>
      {/* Backdrop to close popup */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup (anchored below portrait) */}
      <div
        className="fixed z-50 pointer-events-auto"
        style={{
          left: position.x,
          top: position.y + 8,           // place BELOW the portrait
          transform: "translate(-50%, 0)" // only center horizontally
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

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Might:</span>
                <span className="ml-2 text-red-400 font-semibold">{buffedStats.might}</span>
                {(beastCampMightBonus > 0 || homeBaseMightBonus > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {beastCampMightBonus > 0 && `+${formatBonus(beastCampMightBonus)} (Beast Camp) `}
                    {homeBaseMightBonus > 0 && `+${formatBonus(homeBaseMightBonus)} (Base)`}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Power:</span>
                <span className="ml-2 text-blue-400 font-semibold">{buffedStats.power}</span>
                {(beastCampPowerBonus > 0 || homeBasePowerBonus > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {beastCampPowerBonus > 0 && `+${formatBonus(beastCampPowerBonus)} (Beast Camp) `}
                    {homeBasePowerBonus > 0 && `+${formatBonus(homeBasePowerBonus)} (Base)`}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Defense:</span>
                <span className="ml-2 text-green-400 font-semibold">{buffedStats.defense}</span>
                {(homeBaseDefenseBonus > 0 || forestDefenseBonus > 0) && (
                  <div className="text-xs text-muted-foreground ml-4">
                    {homeBaseDefenseBonus > 0 && `+${formatBonus(homeBaseDefenseBonus)} (Base) `}
                    {forestDefenseBonus > 0 && `+${formatBonus(forestDefenseBonus)} (Forest)`}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Speed:</span>
                <span className="ml-2 text-yellow-400 font-semibold">{character.stats.speed}</span>
              </div>
            </div>

            {character.abilities.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">Passive:</div>
                <div className="text-xs text-muted-foreground">
                  {character.abilities[0]?.description || "No passive ability"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
};

export default CharacterDetailPopup;

