import React from 'react';
import { Heart, MapPin, DollarSign, ArrowRight, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    salary_range?: string;
    location?: string;
    experience_level?: string;
  };
  matchScore?: number;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

export function JobCard({ job, matchScore, isSaved = false, onToggleSave, onClick }: JobCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 font-extrabold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]';
    }
    if (score >= 50) {
      return 'bg-amber-950/20 border-amber-500/20 text-amber-400 font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]';
    }
    return 'bg-rose-950/20 border-rose-500/20 text-rose-400 font-medium shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]';
  };

  return (
    <div 
      onClick={onClick}
      className="relative p-5 neo-raised neo-raised-hover neo-raised-active rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 group text-left overflow-hidden w-full select-none h-[210px]"
    >
      <div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider truncate max-w-[180px]">
            {job.company}
          </span>
          
          <div className="flex items-center gap-2 shrink-0">
            {matchScore !== undefined && (
              <span className={cn(
                'text-[9px] font-mono px-2 py-0.5 border rounded-lg uppercase shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]',
                getScoreColor(matchScore)
              )}>
                {Math.round(matchScore)}% match
              </span>
            )}
            
            {onToggleSave && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(e);
                }}
                className="text-zinc-500 hover:text-rose-500 transition-all duration-200 cursor-pointer scale-100 hover:scale-110 active:scale-95 shrink-0"
                title={isSaved ? 'Remove from saved' : 'Save job'}
              >
                <Heart className={cn("size-4 transition-all duration-150", isSaved ? "fill-rose-500 text-rose-500" : "text-zinc-600")} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-sm font-extrabold font-heading text-zinc-100 mt-3 group-hover:text-white transition-colors line-clamp-1 pr-6 uppercase tracking-wide">
          {job.title}
        </h3>

        <div className="flex flex-wrap gap-2 mt-4">
          {job.location && (
            <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-900/60 text-zinc-400 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
              <MapPin className="size-3 text-zinc-600" />
              {job.location}
            </span>
          )}
          {job.salary_range && (
            <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-900/60 text-zinc-400 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
              <DollarSign className="size-3 text-zinc-600" />
              {job.salary_range}
            </span>
          )}
          {job.experience_level && (
            <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-900/60 text-zinc-400 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] uppercase">
              <Briefcase className="size-3 text-zinc-600" />
              {job.experience_level}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-all uppercase tracking-wider font-mono">
        View Details
        <ArrowRight className="size-3.5 ml-1.5 text-zinc-650 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}