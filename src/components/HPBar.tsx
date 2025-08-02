interface HPBarProps {
  currentHP: number;
  maxHP: number;
  size?: 'small' | 'medium' | 'large';
}

const HPBar = ({ currentHP, maxHP, size = 'small' }: HPBarProps) => {
  const percentage = (currentHP / maxHP) * 100;
  
  const getHPColor = (percent: number): string => {
    if (percent > 75) return 'bg-alien-green';
    if (percent > 50) return 'bg-yellow-500';
    if (percent > 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    small: 'h-2 w-12',
    medium: 'h-3 w-16', 
    large: 'h-4 w-20'
  };

  return (
    <div className={`bg-background/30 rounded-full border border-border ${sizeClasses[size]}`}>
      <div 
        className={`h-full rounded-full transition-all duration-300 ${getHPColor(percentage)}`}
        style={{ width: `${Math.max(0, percentage)}%` }}
      />
    </div>
  );
};

export default HPBar;