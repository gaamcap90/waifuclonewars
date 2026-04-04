import React from "react";
import { Icon } from "@/types/game";
import { Button } from "@/components/ui/button";

interface RespawnUIProps {
  deadCharacters: Icon[];
  onRespawn: (iconId: string) => void;
  isMyTurn: boolean;
}

const getCharacterPortrait = (name: string) => {
  if (name.includes("Napoleon")) return "/art/napoleon_portrait.png";
  if (name.includes("Genghis")) return "/art/genghis_portrait.png";
  if (name.includes("Da Vinci")) return "/art/davinci_portrait.png";
  return null;
};

const RespawnUI = ({ deadCharacters, onRespawn, isMyTurn }: RespawnUIProps) => {
  return (
    <>
      {deadCharacters.map(character => {
        const portrait = getCharacterPortrait(character.name);
        const canRespawn = character.respawnTurns === 0 && isMyTurn;
        
        return (
          <div key={character.id} className="text-center">
            <div className="relative">
              <button
                onClick={() => canRespawn && onRespawn(character.id)}
                disabled={!canRespawn}
                className={`w-10 h-10 rounded-full border-2 transition-all overflow-hidden opacity-60 ${
                  character.playerId === 0 ? "border-blue-400" : "border-red-400"
                } ${canRespawn ? "hover:opacity-100 cursor-pointer" : "cursor-not-allowed"}`}
              >
                {portrait ? (
                  <img 
                    src={portrait} 
                    alt={character.name}
                    className="w-full h-full object-cover grayscale"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${
                    character.playerId === 0 ? "bg-blue-500/90 text-white" : "bg-red-500/90 text-white"
                  }`}>
                    {character.name.charAt(0)}
                  </div>
                )}
              </button>
              {!canRespawn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/80 text-white text-xs rounded px-1">
                    {character.respawnTurns}
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs mt-1">
              {canRespawn ? "Ready!" : `${character.respawnTurns} turns`}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default RespawnUI;