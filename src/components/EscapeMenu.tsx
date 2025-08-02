import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EscapeMenuProps {
  onMainMenu: () => void;
  onContinue: () => void;
}

const EscapeMenu = ({ onMainMenu, onContinue }: EscapeMenuProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <Card className="bg-background border-border shadow-xl min-w-[300px]">
        <CardHeader>
          <CardTitle className="text-center text-xl">Game Menu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={onMainMenu}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            Main Menu
          </Button>
          <Button 
            onClick={onContinue}
            variant="default"
            className="w-full"
            size="lg"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EscapeMenu;