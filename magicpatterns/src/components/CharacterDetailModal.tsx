import React, { useEffect, useState, useRef } from 'react';
import { X, InfoIcon } from 'lucide-react';
export interface CharacterAbility {
  name: string;
  manaCost: number | null;
  description: string;
  damage?: number;
  range?: number;
  isUltimate?: boolean;
}
export interface CharacterStats {
  name: string;
  hp: string;
  move?: number;
  might: number;
  defense: number;
  power: number;
  speed: number;
  passive: string;
  passiveDescription: string;
  role: string;
  image: string;
  abilities?: CharacterAbility[];
}
interface CharacterDetailModalProps {
  character: CharacterStats | null;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement> | null;
}
export const CharacterDetailModal = ({
  character,
  onClose,
  triggerRef
}: CharacterDetailModalProps) => {
  if (!character) return null;
  const modalRef = useRef<HTMLDivElement>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0
  });
  // Parse HP values for progress bar
  const [current, max] = character.hp.split('/').map(v => parseInt(v, 10));
  const hpPercentage = current / max * 100;
  // Default abilities if not provided
  const defaultAbilities = [{
    name: 'Basic Attack',
    manaCost: null,
    description: `Range ${character.might > 50 ? 1 : 2}, damage = Might (${character.might})`
  }, {
    name: character.might > 60 ? 'Mongol Charge' : character.power > 70 ? 'Flying Machine' : 'Artillery Barrage',
    manaCost: 4,
    description: character.might > 60 ? '60 dmg + bonus per enemy hit' : character.power > 70 ? 'Teleport to tile + flying view for 2 turns' : '55 damage + destroys terrain',
    range: 2
  }, {
    name: character.might > 60 ? 'Horde Tactics' : character.power > 70 ? 'Masterpiece' : 'Grande Armée',
    manaCost: character.power > 70 ? 7 : character.might > 60 ? 5 : 6,
    description: character.might > 60 ? "75 dmg + Fear (enemy can't move next turn)" : character.power > 70 ? '45 healing + shield vs next attack' : '+20% team damage + movement for 3 turns',
    range: character.might > 60 ? 1 : 2
  }, {
    name: character.might > 60 ? "Rider's Fury" : character.power > 70 ? 'Vitruvian Guardian' : 'Final Salvo',
    manaCost: 0,
    description: character.might > 60 ? 'Line attack through 3 enemies, 25 dmg each' : character.power > 70 ? 'Summons drone for 2 turns (20 dmg auto)' : '30 dmg in a line across 3 tiles',
    range: 3,
    isUltimate: true
  }];
  const abilities = character.abilities || defaultAbilities;
  // Position the modal above the trigger element
  useEffect(() => {
    if (modalRef.current && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const modalRect = modalRef.current.getBoundingClientRect();
      // Position above the trigger
      modalRef.current.style.position = 'absolute';
      modalRef.current.style.top = `${triggerRect.top - modalRect.height - 10}px`;
      modalRef.current.style.left = `${triggerRect.left - modalRect.width / 2 + triggerRect.width / 2}px`;
      // Ensure the modal stays within viewport bounds
      if (parseFloat(modalRef.current.style.top) < 10) {
        modalRef.current.style.top = '10px';
      }
      if (parseFloat(modalRef.current.style.left) < 10) {
        modalRef.current.style.left = '10px';
      } else if (parseFloat(modalRef.current.style.left) + modalRect.width > window.innerWidth - 10) {
        modalRef.current.style.left = `${window.innerWidth - modalRect.width - 10}px`;
      }
    }
  }, [character, triggerRef]);
  const handleAbilityHover = (ability: CharacterAbility, e: React.MouseEvent) => {
    setTooltipContent(ability.description);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };
  const handleAbilityLeave = () => {
    setTooltipContent(null);
  };
  return <>
      <div ref={modalRef} className="fixed z-50 w-96 bg-gray-800 border-2 border-pink-500/50 rounded-lg shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 p-3">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full border-2 border-pink-400 overflow-hidden">
              <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
            </div>
            <div className="ml-3">
              <h3 className="text-white font-bold">{character.name}</h3>
              <div className="flex items-center">
                <span className="text-xs px-2 py-0.5 bg-blue-500/30 text-blue-100 rounded-full">
                  {character.role}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Stats */}
        <div className="p-4">
          {/* Character Stats */}
          <div className="mb-3 bg-gray-900/60 p-2 rounded text-sm">
            <div className="grid grid-cols-6 gap-1 text-center">
              <div>
                <div className="text-green-400 font-semibold">HP</div>
                <div className="text-white">{character.hp.split('/')[0]}</div>
              </div>
              <div>
                <div className="text-blue-400 font-semibold">Move</div>
                <div className="text-white">{character.move || 2}</div>
              </div>
              <div>
                <div className="text-yellow-400 font-semibold">Speed</div>
                <div className="text-white">{character.speed}</div>
              </div>
              <div>
                <div className="text-pink-400 font-semibold">Might</div>
                <div className="text-white">{character.might}</div>
              </div>
              <div>
                <div className="text-purple-400 font-semibold">Power</div>
                <div className="text-white">{character.power}</div>
              </div>
              <div>
                <div className="text-gray-300 font-semibold">Def</div>
                <div className="text-white">{character.defense}</div>
              </div>
            </div>
          </div>
          {/* HP Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">HP:</span>
              <span className="text-white">{character.hp}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div className="h-2 bg-green-500 rounded-full" style={{
              width: `${hpPercentage}%`
            }}></div>
            </div>
          </div>
          {/* Abilities */}
          <div className="mb-3">
            <h4 className="text-white font-semibold mb-2">Abilities</h4>
            <div className="space-y-2">
              {abilities.map((ability, index) => <div key={index} className={`bg-gray-900/60 p-2 rounded flex items-center justify-between ${ability.isUltimate ? 'border border-red-500' : ''}`} onMouseEnter={e => handleAbilityHover(ability, e)} onMouseLeave={handleAbilityLeave}>
                  <div className="flex items-center">
                    {ability.manaCost !== null ? <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mr-2 text-xs font-bold">
                        {ability.manaCost}
                      </div> : <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center mr-2 text-xs font-bold">
                        <Swords className="h-3 w-3" />
                      </div>}
                    <span className={`${ability.isUltimate ? 'text-red-400 font-semibold' : 'text-white'}`}>
                      {ability.name}
                      {ability.isUltimate && <span className="ml-1 text-xs">(Ultimate)</span>}
                    </span>
                  </div>
                  <InfoIcon className="h-4 w-4 text-gray-400" />
                </div>)}
            </div>
          </div>
          {/* Passive */}
          <div className="bg-gray-900/60 p-3 rounded">
            <div className="text-yellow-300 font-semibold mb-1">
              Passive: {character.passive}
            </div>
            <div className="text-gray-300 text-sm">
              {character.passiveDescription}
            </div>
          </div>
        </div>
      </div>
      {/* Tooltip */}
      {tooltipContent && <div className="fixed z-50 bg-gray-900 text-white p-2 rounded shadow-lg text-sm max-w-xs" style={{
      top: tooltipPosition.y + 10,
      left: tooltipPosition.x + 10
    }}>
          {tooltipContent}
        </div>}
    </>;
};
// Helper component for icons
const Swords = ({
  className = ''
}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path>
    <path d="M13 19l6-6"></path>
    <path d="M16 16l4 4"></path>
    <path d="M19 21l2-2"></path>
    <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"></path>
    <path d="M5 14L9 6"></path>
    <path d="M7 9l-2 8"></path>
    <path d="M4 4l16 16"></path>
  </svg>;