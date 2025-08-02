import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Home } from "lucide-react";

interface VictoryScreenProps {
  isVictory: boolean;
  onBackToMenu: () => void;
}

const VictoryScreen = ({ isVictory, onBackToMenu }: VictoryScreenProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="border-alien-green/50 bg-space-dark/95 max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className={`w-16 h-16 ${isVictory ? "text-yellow-400" : "text-gray-400"}`} />
          </div>
          <CardTitle className={`text-2xl ${isVictory ? "text-alien-green" : "text-red-400"}`}>
            {isVictory ? "VICTORY!" : "DEFEAT!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-300">
            {isVictory 
              ? "The Znyxorgan audience cheers for your tactical brilliance!" 
              : "Better luck next time, Earthling..."}
          </p>
          <Button onClick={onBackToMenu} className="w-full" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VictoryScreen;