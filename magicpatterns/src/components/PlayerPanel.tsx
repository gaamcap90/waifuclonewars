import React, { useRef } from 'react';
import { ShieldIcon, FlameIcon } from 'lucide-react';
export const PlayerPanel = ({
  player,
  mana,
  baseHp,
  team,
  side,
  onCharacterClick
}) => {
  const isLeft = side === 'left';
  return <div className={`w-64 bg-gray-900/80 backdrop-blur-sm text-white p-4 border-${isLeft ? 'r' : 'l'}-2 border-${isLeft ? 'blue' : 'red'}-500/50`}>
      <div className={`flex items-center ${isLeft ? '' : 'flex-row-reverse'} mb-3`}>
        <div className={`w-2 h-12 bg-${isLeft ? 'blue' : 'red'}-500 mr-2`}></div>
        <h2 className="text-xl font-bold">{player}</h2>
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <div className="flex items-center">
            <FlameIcon className="h-4 w-4 mr-1 text-orange-400" />
            <span className="text-gray-300">Mana:</span>
          </div>
          <span className={`text-${isLeft ? 'blue' : 'red'}-300`}>{mana}</span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center">
            <ShieldIcon className="h-4 w-4 mr-1 text-gray-300" />
            <span className="text-gray-300">Base HP:</span>
          </div>
          <span className={`text-${isLeft ? 'blue' : 'red'}-300`}>
            {baseHp}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {team.map((character, index) => {
        // Create a ref for each character portrait
        const characterRef = useRef(null);
        return <div key={index} className="bg-gray-800/60 rounded-md p-2">
              <div className="flex items-center mb-2">
                <div ref={characterRef} className={`w-12 h-12 rounded-full border-2 border-${isLeft ? 'blue' : 'red'}-300 overflow-hidden cursor-pointer hover:border-pink-400 transition-colors`} onClick={() => onCharacterClick(character, characterRef)}>
                  <img src={character.image || `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'women' : 'men'}/${40 + index}.jpg`} alt={character.name} className="w-full h-full object-cover" />
                </div>
                <div className="ml-2">
                  <p className="font-medium text-sm">{character.name}</p>
                  <p className="text-xs text-gray-400">
                    {character.role || 'Ranged DPS'}
                  </p>
                </div>
              </div>
              <div>
                <div className="h-1 bg-gray-700 rounded-full">
                  <div className="h-1 bg-green-500 rounded-full" style={{
                width: '80%'
              }}></div>
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span>HP</span>
                  <span>{character.hp}</span>
                </div>
              </div>
            </div>;
      })}
      </div>
    </div>;
};