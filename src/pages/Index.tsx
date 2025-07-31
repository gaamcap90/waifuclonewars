import GameBoard from "@/components/GameBoard";
import GameUI from "@/components/GameUI";
import ActionBar from "@/components/ActionBar";
import useGameState from "@/hooks/useGameState";

const Index = () => {
  const { gameState, selectTile, endTurn, basicAttack } = useGameState();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Icons of Theia</h1>
          <p className="text-xl text-muted-foreground">Tactical Hex-Based Strategy Game</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Game Board - Takes up most space */}
          <div className="lg:col-span-4">
            <GameBoard gameState={gameState} onTileClick={selectTile} />
          </div>
          
          {/* Right Sidebar - Game Info and Actions */}
          <div className="lg:col-span-2 space-y-4">
            <ActionBar 
              gameState={gameState} 
              onBasicAttack={basicAttack}
              onEndTurn={endTurn} 
            />
            <GameUI gameState={gameState} onEndTurn={endTurn} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
