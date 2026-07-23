
interface SessionProgressBarProps {
  total: number;
  current: number; // 0-indexed current question
  answered: number;
}

export function SessionProgressBar({ total, current, answered }: SessionProgressBarProps) {
  const answeredPercentage = total > 0 ? (answered / total) * 100 : 0;
  
  return (
    <div className="space-y-2 w-full text-left">
      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
        <span>Session Progress</span>
        <span>{answered} / {total} answered</span>
      </div>

      <div className="h-2 border border-zinc-950 rounded-full overflow-hidden relative neo-sunken">
        {/* Answered progress track */}
        <div 
          className="h-full bg-gradient-to-r from-zinc-800 to-zinc-200 transition-all duration-500 ease-out-quart"
          style={{ width: `${answeredPercentage}%` }}
        />

        {/* Current question indicator (tiny dot or bar overlays if wanted) */}
        {total > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white/40 animate-pulse transition-all duration-500"
            style={{ left: `${(current / total) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}