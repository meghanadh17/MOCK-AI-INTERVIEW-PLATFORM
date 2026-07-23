interface CircularGaugeProps {
  value: number;         // 0 – 100
  size?: number;         // px
  strokeWidth?: number;
  label?: string;
}

export function CircularGauge({ value, size = 120, strokeWidth = 8, label = 'Score' }: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = (v: number) => {
    if (v >= 75) return { stroke: 'url(#gauge-green)', text: 'text-emerald-400', glow: 'drop-shadow(0 0 6px rgba(52,211,153,0.4))' };
    if (v >= 50) return { stroke: 'url(#gauge-amber)', text: 'text-amber-400', glow: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' };
    return { stroke: 'url(#gauge-red)', text: 'text-rose-400', glow: 'drop-shadow(0 0 6px rgba(251,113,133,0.4))' };
  };
  
  const colors = getColor(progress);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90"
          style={{ filter: colors.glow }}
        >
          <defs>
            <linearGradient id="gauge-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="gauge-amber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="gauge-red" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>
          
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(63,63,70,0.4)"
            strokeWidth={strokeWidth}
          />
          
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-heading font-extrabold ${colors.text} tabular-nums`}>
            {Math.round(progress)}
          </span>
          <span className="text-[8px] font-mono text-text-muted uppercase tracking-wider">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
