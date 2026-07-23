import { Sparkles, Trophy } from 'lucide-react';

interface StrengthCluster {
  topic: string;
  frequency: number;
}

interface StrengthsListProps {
  strengths?: StrengthCluster[];
}

export function StrengthsList({ strengths = [] }: StrengthsListProps) {
  const displayStrengths = strengths.slice(0, 5);

  if (displayStrengths.length === 0) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-2 select-none shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)]">
        <Sparkles className="size-6 text-text-muted mx-auto animate-pulse" />
        <p className="text-xs text-text-muted">No strength topics highlighted yet. Complete more sessions to analyze skill clusters!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayStrengths.map((item, idx) => (
        <div 
          key={idx} 
          className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-850/80 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all rounded-xl shadow-sm group text-left border-l-[3px] border-l-zinc-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-zinc-850 border border-zinc-750 text-zinc-300 shrink-0 rounded-xl">
              <Trophy className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-text-prim block truncate">{item.topic}</span>
              <span className="text-[10px] text-text-muted block mt-0.5 font-mono">
                Consistently high scores in {item.frequency} {item.frequency === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-extrabold font-mono uppercase bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-lg select-none">
              Top Strength
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}