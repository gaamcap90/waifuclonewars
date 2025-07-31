import GameBoard from "@/components/GameBoard";
import GameUI from "@/components/GameUI";
import useGameState from "@/hooks/useGameState";

const Index = () => {
  const { gameState, selectTile, endTurn } = useGameState();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Icons of Theia</h1>
          <p className="text-xl text-muted-foreground">Tactical Hex-Based Strategy Game</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <GameBoard gameState={gameState} onTileClick={selectTile} />
          </div>
          
          <div className="lg:col-span-1">
            <GameUI gameState={gameState} onEndTurn={endTurn} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
