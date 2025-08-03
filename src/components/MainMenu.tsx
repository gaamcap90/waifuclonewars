import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MainMenuProps {
  onStartGame: (mode: 'singleplayer' | 'multiplayer') => void;
}

const MainMenu = ({ onStartGame }: MainMenuProps) => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('/lovable-uploads/ec9e8022-84ce-48c2-8677-1ff35d8f70fc.png')`
      }}
    >
      <Card className="w-96">
        <CardHeader className="text-center space-y-4">
          <div className="text-alien-purple text-sm font-orbitron">The Empire of Znyxorga Presents:</div>
          <CardTitle className="text-5xl font-bold text-arena-glow font-orbitron">WAIFU CLONE WARS</CardTitle>
          <p className="text-lg text-muted-foreground">Historical legends reborn as anime warriors in the galaxy's favorite battle arena!</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => onStartGame('singleplayer')}
            className="w-full h-12 text-lg font-orbitron border-alien-green text-alien-green hover:bg-alien-green/10"
            variant="outline"
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
          <Button 
            onClick={() => window.close()}
            className="w-full h-12 text-lg font-orbitron border-red-500 text-red-500 hover:bg-red-500/10"
            variant="outline"
          >
            🚪 Quit Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainMenu;