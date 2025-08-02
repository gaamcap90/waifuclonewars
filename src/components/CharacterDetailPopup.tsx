import React from "react";
import { Icon } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";

interface CharacterDetailPopupProps {
  character: Icon;
  onClose: () => void;
  position: { x: number; y: number };
}

const CharacterDetailPopup = ({ character, onClose, position }: CharacterDetailPopupProps) => {
  // Close popup when clicking anywhere
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      onClose();
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <>
      {/* Backdrop to close popup */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Popup Card */}
      <div 
        className="absolute z-50 pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-background/95 backdrop-blur-sm border-border shadow-xl min-w-[200px]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                character.playerId === 0 
                  ? "border-blue-400 bg-blue-500/90 text-white" 
                  : "border-red-400 bg-red-500/90 text-white"
              }`}>
                {character.name.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  {character.role === 'dps_ranged' && <><Crosshair className="w-3 h-3" /> Ranged DPS</>}
                  {character.role === 'dps_melee' && <><Sword className="w-3 h-3" /> Melee DPS</>}
                  {character.role === 'support' && <><Heart className="w-3 h-3" /> Support</>}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-semibold mb-1">HP:</div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{character.stats.hp}/{character.stats.maxHp}</span>
                <HPBar currentHP={character.stats.hp} maxHP={character.stats.maxHp} size="medium" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Might:</span>
                <span className="ml-2 text-red-400 font-semibold">{character.stats.might}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Defense:</span>
                <span className="ml-2 text-green-400 font-semibold">{character.stats.defense}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Power:</span>
                <span className="ml-2 text-blue-400 font-semibold">{character.stats.power}</span>
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
    </>
  );
};

export default CharacterDetailPopup;