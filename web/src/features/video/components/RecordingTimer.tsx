import { useState, useEffect } from 'react';

interface RecordingTimerProps {
  isActive: boolean;
}

export function RecordingTimer({ isActive }: RecordingTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive]);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  if (!isActive) return null;

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border border-rose-500/25 rounded-lg backdrop-blur-sm select-none z-10 shadow-lg">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-2.5 rounded-full bg-rose-500 animate-ping opacity-60" />
        <span className="relative size-2.5 rounded-full bg-rose-500" />
      </div>
      <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">
        REC
      </span>
      <div className="w-px h-3.5 bg-zinc-700" />
      <span className="text-xs font-mono font-bold text-text-prim tabular-nums tracking-wide">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
