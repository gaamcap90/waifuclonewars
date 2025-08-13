import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GameState, Icon } from "@/types/game";

type Props = {
  character: Icon;
  gameState: GameState;
  position: { x: number; y: number }; // page coordinates we set from the portrait click
  onClose: () => void;
};

const CharacterDetailPopup: React.FC<Props> = ({ character, gameState, position, onClose }) => {
  if (!character) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y, // BELOW the portrait (we already added gap in the caller)
      }}
    >
      {/* Center on X only, sit below on Y */}
      <div className="-translate-x-1/2 mt-1 relative">
        {/* little arrow pointing up to the portrait */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white shadow" />

        <Card className="shadow-xl border">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                <span className="font-bold">{character.name.charAt(0)}</span>
              </div>
              <div className="font-semibold">{character.name}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>HP: <b>{character.stats.hp}/{character.stats.maxHp}</b></div>
              <div>Move: <b>{character.stats.movement}/{character.stats.moveRange}</b></div>
              <div>Might: <b>{character.stats.might}</b></div>
              <div>Power: <b>{character.stats.power}</b></div>
              <div>Defense: <b>{character.stats.defense}</b></div>
              <div>Speed: <b>{character.stats.speed}</b></div>
            </div>

            {character.passive && (
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Passive:</div>
                <div>{character.passive}</div>
              </div>
            )}

            <div className="mt-3 text-right">
              <button
                className="text-xs underline text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharacterDetailPopup;

