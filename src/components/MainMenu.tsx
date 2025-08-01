import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MainMenuProps {
  onStartGame: (mode: 'singleplayer' | 'multiplayer') => void;
}

const MainMenu = ({ onStartGame }: MainMenuProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-96">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-foreground">Icons of Theia</CardTitle>
          <p className="text-xl text-muted-foreground">Tactical Hex-Based Strategy Game</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => onStartGame('singleplayer')}
            className="w-full h-12 text-lg"
            variant="default"
          >
            Single Player (vs AI)
          </Button>
          <Button 
            onClick={() => onStartGame('multiplayer')}
            className="w-full h-12 text-lg"
            variant="outline"
          >
            Multiplayer (Local)
          </Button>
          <Button 
            disabled
            className="w-full h-12 text-lg"
            variant="outline"
          >
            Character Management
          </Button>
          <Button 
            disabled
            className="w-full h-12 text-lg"
            variant="outline"
          >
            Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainMenu;