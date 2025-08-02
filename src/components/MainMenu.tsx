import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MainMenuProps {
  onStartGame: (mode: 'singleplayer' | 'multiplayer') => void;
}

const MainMenu = ({ onStartGame }: MainMenuProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-96">
        <CardHeader className="text-center space-y-4">
          <div className="text-alien-purple text-sm font-orbitron">The Empire of Znyxorga Presents:</div>
          <CardTitle className="text-5xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</CardTitle>
          <p className="text-lg text-muted-foreground">Historical legends reborn as anime warriors in the galaxy's favorite battle arena!</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => onStartGame('singleplayer')}
            className="w-full h-12 text-lg font-orbitron bg-alien-purple hover:bg-alien-purple/80"
            variant="default"
          >
            🤖 Single Player (vs Znyxorgan AI)
          </Button>
          <Button 
            onClick={() => onStartGame('multiplayer')}
            className="w-full h-12 text-lg font-orbitron border-alien-green text-alien-green hover:bg-alien-green/10"
            variant="outline"
          >
            ⚔️ Local Arena Battle
          </Button>
          <Button 
            disabled
            className="w-full h-12 text-lg font-orbitron opacity-50"
            variant="outline"
          >
            🏛️ Historical Archives (Coming Soon)
          </Button>
          <Button 
            disabled
            className="w-full h-12 text-lg font-orbitron opacity-50"
            variant="outline"
          >
            ⚙️ Arena Settings (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainMenu;