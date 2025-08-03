import React, { useState, useRef } from 'react';
import { GameHeader } from './components/GameHeader';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { ActionPanel } from './components/ActionPanel';
import { AlienAudience } from './components/AlienAudience';
import { CharacterDetailModal, CharacterStats } from './components/CharacterDetailModal';
export function App() {
  const [activeCharacter, setActiveCharacter] = useState('Da Vinci-chan');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterStats | null>(null);
  const [triggerRef, setTriggerRef] = useState<React.RefObject<HTMLDivElement> | null>(null);
  // Character data with detailed stats
  const blueTeam = [{
    name: 'Napoleon-chan',
    hp: '80/80',
    move: 2,
    speed: 6,
    might: 45,
    defense: 35,
    power: 60,
    passive: 'Tactical Genius',
    passiveDescription: '+1 movement on High Ground',
    role: 'Ranged DPS',
    image: 'https://randomuser.me/api/portraits/women/41.jpg',
    abilities: [{
      name: 'Basic Attack',
      manaCost: null,
      description: 'Range 2, damage = Might (45)'
    }, {
      name: 'Artillery Barrage',
      manaCost: 4,
      description: 'Range 2, 55 damage + destroys terrain'
    }, {
      name: 'Grande Armée',
      manaCost: 6,
      description: 'Range 2, +20% team damage + movement for 3 turns'
    }, {
      name: 'Final Salvo',
      manaCost: 0,
      description: 'Range 3, 30 dmg in a line across 3 tiles',
      isUltimate: true
    }]
  }, {
    name: 'Genghis-chan',
    hp: '90/90',
    move: 2,
    speed: 8,
    might: 70,
    defense: 40,
    power: 40,
    passive: "Conqueror's Fury",
    passiveDescription: '+15% damage per enemy defeated',
    role: 'Melee Fighter',
    image: 'https://randomuser.me/api/portraits/women/42.jpg',
    abilities: [{
      name: 'Basic Attack',
      manaCost: null,
      description: 'Range 1, damage = Might (70)'
    }, {
      name: 'Mongol Charge',
      manaCost: 3,
      description: '60 dmg + bonus per enemy hit'
    }, {
      name: 'Horde Tactics',
      manaCost: 5,
      description: "75 dmg + Fear (enemy can't move next turn)"
    }, {
      name: "Rider's Fury",
      manaCost: 0,
      description: 'Line attack through 3 enemies, 25 dmg each',
      isUltimate: true
    }]
  }, {
    name: 'Da Vinci-chan',
    hp: '65/65',
    move: 2,
    speed: 4,
    might: 30,
    defense: 45,
    power: 80,
    passive: 'Renaissance Mind',
    passiveDescription: '+1 mana when casting near crystals',
    role: 'Support',
    image: 'https://randomuser.me/api/portraits/women/43.jpg',
    abilities: [{
      name: 'Basic Attack',
      manaCost: null,
      description: 'Range 2, damage = Might (30)'
    }, {
      name: 'Flying Machine',
      manaCost: 4,
      description: 'Teleport to tile + flying view for 2 turns'
    }, {
      name: 'Masterpiece',
      manaCost: 7,
      description: '45 healing + shield vs next attack'
    }, {
      name: 'Vitruvian Guardian',
      manaCost: 0,
      description: 'Range 3, summons drone for 2 turns (20 dmg auto)',
      isUltimate: true
    }]
  }];
  const redTeam = [{
    name: 'Caesar-chan',
    hp: '100/100',
    might: 65,
    defense: 25,
    power: 50,
    speed: 5,
    passive: 'Tactical Genius',
    passiveDescription: 'Allies within 2 hexes deal 10% more damage.',
    role: 'Commander',
    image: 'https://randomuser.me/api/portraits/women/44.jpg'
  }, {
    name: 'Tesla-chan',
    hp: '80/80',
    might: 50,
    defense: 12,
    power: 85,
    speed: 5,
    passive: 'Electric Field',
    passiveDescription: 'Enemies that move adjacent take 10 damage.',
    role: 'Area Control',
    image: 'https://randomuser.me/api/portraits/women/45.jpg'
  }, {
    name: 'Cleopatra-chan',
    hp: '110/110',
    might: 55,
    defense: 18,
    power: 70,
    speed: 6,
    passive: 'Royal Command',
    passiveDescription: 'Can grant one ally an extra action per turn.',
    role: 'Support',
    image: 'https://randomuser.me/api/portraits/women/46.jpg'
  }];
  const handleCharacterClick = (character, ref) => {
    setSelectedCharacter(character);
    setTriggerRef(ref);
  };
  return <div className="relative w-full h-screen overflow-hidden bg-indigo-900 font-sans">
      {/* Alien audience background */}
      <AlienAudience />
      <div className="relative z-10 flex flex-col h-full">
        {/* Game header with turn info */}
        <GameHeader />
        {/* Main game content */}
        <div className="flex flex-1">
          {/* Left player panel */}
          <PlayerPanel player="Player 1 (Blue)" mana="18/20 (+1/turn)" baseHp="5/5" team={blueTeam} side="left" onCharacterClick={handleCharacterClick} />
          {/* Center game board */}
          <div className="flex-1 flex items-center justify-center">
            <GameBoard />
          </div>
          {/* Right player panel */}
          <PlayerPanel player="Znyxorgan AI (Red)" mana="20/20 (+1/turn)" baseHp="5/5" team={redTeam} side="right" onCharacterClick={handleCharacterClick} />
        </div>
        {/* Bottom action panel */}
        <ActionPanel character={activeCharacter} movement="2/2" actions={[{
        name: 'Attack',
        cost: null
      }, {
        name: 'Flying Machina',
        cost: 4
      }, {
        name: 'Masterpiece',
        cost: 6
      }, {
        name: 'Vitruvian',
        cost: 8
      }]} />
      </div>
      {/* Character detail modal */}
      <CharacterDetailModal character={selectedCharacter} onClose={() => setSelectedCharacter(null)} triggerRef={triggerRef} />
    </div>;
}