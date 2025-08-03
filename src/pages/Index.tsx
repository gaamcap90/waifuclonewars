// src/pages/Index.tsx
import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import useGameState from "@/hooks/useGameStateNew";
import VictoryScreen from "@/components/VictoryScreen";
import MainMenu from "@/components/MainMenu";
import CharacterSelection from "@/components/CharacterSelection";
import UltimateIndicator from "@/components/UltimateIndicator";

export default function Index() {
  const [gameMode, setGameMode] = useState<"menu"|"characterSelect"|"singleplayer"|"multiplayer">("menu");
  const {
    gameState, selectTile, endTurn,
    basicAttack, useAbility, moveActiveIcon,
    // …
  } = useGameState(gameMode === "menu"||gameMode==="characterSelect" ? "singleplayer" : gameMode);

  if (gameMode === "menu")
    return <MainMenu onStart={() => setGameMode("characterSelect")} />;

  if (gameMode === "characterSelect")
    return ( 
      <CharacterSelection 
        onSelect={(team) => { /*…*/ setGameMode("singleplayer"); }} 
      />
    );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 text-gray-100">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 bg-gray-800 bg-opacity-75 shadow-md">
        <div className="flex items-center space-x-6">
          <h2 className="text-xl font-bold">Turn <span className="text-yellow-400">{gameState.turn}</span></h2>
          <div className="flex -space-x-2">
            {gameState.turnQueue.map((pid, i) => (
              <img key={i}
                src={getPortraitFor(pid)}
                className={`w-8 h-8 rounded-full ring-2 ${
                  pid===gameState.activePlayer
                    ? "ring-yellow-400"
                    : pid===0
                      ? "ring-indigo-500"
                      : "ring-red-500"
                }`}
              />
            ))}
          </div>
        </div>
        <button onClick={endTurn}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg shadow-lg"
        >
          End Turn
        </button>
        <div className="flex items-center space-x-4">
          <StatusBadge icon="⏰" label={`Mana: ${gameState.globalMana[gameState.activePlayer]}/20`} />
          <StatusBadge icon="🐺" label={`Beast Camps: ${gameState.campsCleared}/2`} />
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Player Panel */}
        <aside className="w-1/5 p-6 overflow-y-auto bg-gray-900 bg-opacity-50">
          <PlayerPanel playerId={0} gameState={gameState} />
        </aside>

        {/* Center: Battle Grid */}
        <main className="relative flex-1 p-4">
          {/* Pan/Zoom Controls */}
          <div className="absolute top-2 right-2 flex space-x-2 z-10">
            <button className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600">+</button>
            <button className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600">−</button>
          </div>
          <GameBoard
            className="w-full h-full rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900"
            gameState={gameState}
            onTileClick={selectTile}
          />
        </main>

        {/* Right: AI Panel */}
        <aside className="w-1/5 p-6 overflow-y-auto bg-gray-900 bg-opacity-50">
          <PlayerPanel playerId={1} gameState={gameState} />
        </aside>
      </div>

      {/* FOOTER: Active Icon + Abilities */}
      <footer className="p-6 bg-gray-800 bg-opacity-75 shadow-inner">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Active Character Card */}
          <div className="flex items-center p-4 bg-gray-900 bg-opacity-60 rounded-lg shadow-md">
            <img
              src={getPortraitFor(gameState.activeIcon.playerId)}
              className="w-14 h-14 rounded-full ring-2 ring-white"
            />
            <div className="ml-4 flex-1">
              <h3 className="text-xl font-bold text-pink-400">
                Active: {gameState.activeIcon.name}
              </h3>
              <div className="mt-1 flex items-center space-x-4">
                <span>Movement: <strong>{gameState.activeIcon.movementRemaining}/{gameState.activeIcon.movementMax}</strong></span>
                <button onClick={gameState.undoMovement}
                  className="px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Undo
                </button>
                <span className="px-2 py-1 bg-gray-700 rounded-lg">
                  {gameState.turnTimer}s
                </span>
              </div>
            </div>
          </div>
          {/* Ability Buttons */}
          <div className="flex items-center justify-center space-x-3">
            <ActionButton onClick={basicAttack} label="Attack" />
            {gameState.activeIcon.abilities.map(ab => (
              <ActionButton
                key={ab.id}
                onClick={() => useAbility(ab.id)}
                label={`${ab.name} (${ab.manaCost})`}
                isUltimate={ab.isUltimate}
                disabled={ab.onCooldown || gameState.globalMana[gameState.activeIcon.playerId] < ab.manaCost}
              />
            ))}
          </div>
        </div>
      </footer>

      {/* Victory/Defeat Overlay */}
      {(gameState.phase === "victory" || gameState.phase === "defeat") && (
        <VictoryScreen
          isVictory={gameState.phase === "victory"}
          onBackToMenu={() => setGameMode("menu")}
          onPlayAgain={() => setGameMode("characterSelect")}
        />
      )}

      {/* Ultimate Indicator */}
      <UltimateIndicator targeting={gameState.targetingMode} />
    </div>
  );
}

/** Helper components below… **/

function StatusBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center space-x-1 bg-gray-700 bg-opacity-60 px-3 py-1 rounded-full text-sm">
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}

function ActionButton({
  onClick, label, disabled, isUltimate
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  isUltimate?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-3 font-medium rounded-lg shadow transition
        ${isUltimate ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white text-gray-900 hover:bg-gray-200"}`}
    >
      {label}
    </button>
  );
}

