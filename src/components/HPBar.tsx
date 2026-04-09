interface HPBarProps {
  currentHP: number;
  maxHP: number;
  size?: 'small' | 'medium' | 'large';
  previewHP?: number;   // if set, shows the post-action HP (damage or heal)
  isDamage?: boolean;   // true = damage preview (red drain), false = heal preview (green gain)
}

const HPBar = ({ currentHP, maxHP, size = 'small', previewHP, isDamage = true }: HPBarProps) => {
  const pct     = Math.max(0, (currentHP / maxHP) * 100);
  const prevPct = previewHP !== undefined ? Math.max(0, Math.min(100, (previewHP / maxHP) * 100)) : pct;
  const hasPreview = previewHP !== undefined && previewHP !== currentHP;

  const getHPColor = (percent: number): string => {
    if (percent > 75) return 'bg-green-500';
    if (percent > 50) return 'bg-yellow-500';
    if (percent > 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    small:  'h-2 w-12',
    medium: 'h-3 w-16',
    large:  'h-4 w-20',
  };

  // When damage preview: fill bar up to the post-damage HP, then overlay the drain zone in pulsing red
  // When heal preview  : fill bar at current HP, then overlay the gain zone in pulsing green
  const fillPct   = hasPreview && isDamage ? prevPct : pct;
  const fillColor = getHPColor(fillPct);

  return (
    <div className={`relative overflow-hidden rounded-full border border-border bg-black/40 ${sizeClasses[size]}`}>
      {/* Main HP fill */}
      <div
        className={`h-full rounded-full transition-all duration-150 ${fillColor} ${fillPct <= 25 ? 'hp-critical-flicker' : ''}`}
        style={{ width: `${fillPct}%` }}
      />

      {/* Damage preview — pulsing red drain segment */}
      {hasPreview && isDamage && (
        <div
          className="absolute top-0 h-full animate-pulse rounded-r-full"
          style={{
            left:  `${prevPct}%`,
            width: `${Math.max(0, pct - prevPct)}%`,
            background: 'rgba(239,68,68,0.85)',
          }}
        />
      )}

      {/* Heal preview — pulsing bright-green gain segment */}
      {hasPreview && !isDamage && (
        <div
          className="absolute top-0 h-full animate-pulse rounded-r-full"
          style={{
            left:  `${pct}%`,
            width: `${Math.max(0, prevPct - pct)}%`,
            background: 'rgba(74,222,128,0.85)',
          }}
        />
      )}
    </div>
  );
};

export default HPBar;
