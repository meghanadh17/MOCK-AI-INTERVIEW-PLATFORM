import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, BookOpen } from 'lucide-react';
import { ScoreBadge } from '@/components/custom/ScoreBadge';

interface TopicCluster {
  topic: string;
  frequency: number;
  average_score: number;
}

interface WeakAreasListProps {
  weakAreas?: TopicCluster[];
}

export function WeakAreasList({ weakAreas = [] }: WeakAreasListProps) {
  // Show top 3-5 weak areas
  const displayAreas = weakAreas.slice(0, 5);

  if (displayAreas.length === 0) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-2 select-none shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)]">
        <BookOpen className="size-6 text-text-muted mx-auto animate-pulse" />
        <p className="text-xs text-text-muted">No weak areas identified yet! Keep practicing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAreas.map((area, idx) => (
        <div 
          key={idx} 
          className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-850/80 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all rounded-xl shadow-sm group text-left border-l-[3px] border-l-zinc-500"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-zinc-850 border border-zinc-750 text-zinc-400 shrink-0 rounded-xl">
              <ShieldAlert className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-text-prim block truncate">{area.topic}</span>
              <span className="text-[10px] text-text-muted block mt-0.5 font-mono">
                Identified in {area.frequency} {area.frequency === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider font-sans">Avg Score</span>
              <ScoreBadge score={Math.round(area.average_score)} />
            </div>

            <Link
              to={`/app/interview?role=${encodeURIComponent(area.topic)}`}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 transition-all text-[10px] font-bold rounded-lg group/link cursor-pointer shadow-sm"
            >
              Study This
              <ArrowRight className="size-3 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}