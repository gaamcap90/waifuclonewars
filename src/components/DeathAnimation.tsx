import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DeathAnimationProps {
  isTriggered: boolean;
  onComplete: () => void;
  children: React.ReactNode;
}

const DeathAnimation = ({ isTriggered, onComplete, children }: DeathAnimationProps) => {
  const [animationPhase, setAnimationPhase] = useState<'none' | 'shake' | 'fade' | 'complete'>('none');

  useEffect(() => {
    if (isTriggered && animationPhase === 'none') {
      // Start shake animation
      setAnimationPhase('shake');
      
      setTimeout(() => {
        setAnimationPhase('fade');
        
        setTimeout(() => {
          setAnimationPhase('complete');
          onComplete();
        }, 1000); // Fade duration
      }, 500); // Shake duration
    }
  }, [isTriggered, animationPhase, onComplete]);

  if (animationPhase === 'complete') {
    return null; // Character completely removed
  }

  return (
    <div className={cn(
      "transition-all duration-1000",
      animationPhase === 'shake' && "animate-pulse",
      animationPhase === 'fade' && "opacity-0 scale-75 blur-sm"
    )}>
      {children}
    </div>
  );
};

export default DeathAnimation;