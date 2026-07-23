import { Calendar, Clock, Download } from 'lucide-react';

interface ReportHeroCardProps {
  role: string;
  type: string;
  score: number;
  duration?: string;
  createdAt?: string;
  onExportPdf?: () => void;
  isExporting?: boolean;
}

export function ReportHeroCard({
  role,
  type,
  score,
  duration = 'N/A',
  createdAt = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
  onExportPdf,
  isExporting = false,
}: ReportHeroCardProps) {
  // SVG circular properties for Score Donut
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreRating = (s: number) => {
    if (s >= 85) return { label: 'Elite Performer', color: 'text-zinc-100', border: 'border-zinc-800', bg: 'bg-zinc-900' };
    if (s >= 70) return { label: 'Strong Competency', color: 'text-zinc-300', border: 'border-zinc-850', bg: 'bg-zinc-900/60' };
    if (s >= 50) return { label: 'Developing Practice', color: 'text-zinc-400', border: 'border-zinc-900', bg: 'bg-zinc-950' };
    return { label: 'Needs Improvement', color: 'text-zinc-550', border: 'border-dashed border-zinc-700', bg: 'bg-zinc-950/20' };
  };

  const rating = getScoreRating(score);

  return (
    <div className="p-6 md:p-8 rounded-2xl relative overflow-hidden text-left neo-raised">
      
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        
        {/* Info Left */}
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] uppercase font-bold rounded-md tracking-wider">
              {type} Mock Session
            </span>
            <span className={`px-2.5 py-0.5 border font-mono text-[9px] uppercase font-bold rounded-md tracking-wider ${rating.color} ${rating.border} ${rating.bg}`}>
              {rating.label}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-heading font-extrabold text-text-prim leading-tight">
              {role}
            </h1>
            <p className="text-xs text-text-sec">
              Comprehensive AI-adaptive dialogue assessment and engineering feedback loop.
            </p>
          </div>

          {/* Timeline & Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-text-muted" />
              <span>{createdAt}</span>
            </div>
            <div className="h-3 w-px bg-zinc-900 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-text-muted" />
              <span>Duration: {duration}</span>
            </div>
          </div>
        </div>

        {/* Score & Export Right */}
        <div className="flex flex-col sm:flex-row items-center gap-6 border-t sm:border-t-0 sm:border-l border-zinc-900 pt-6 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-start shrink-0">
          
          {/* Circular Score Gauge */}
          <div className="relative size-28 shrink-0 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="size-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-zinc-900 fill-none"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-zinc-200 fill-none"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out-quart' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-mono font-black text-text-prim leading-none">{score}</span>
              <span className="text-[8px] font-mono font-bold text-text-muted uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>

          {/* Download Action */}
          {onExportPdf && (
            <button
              onClick={onExportPdf}
              disabled={isExporting}
              className="px-4 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 select-none shrink-0 neo-raised neo-raised-hover neo-raised-active"
            >
              {isExporting ? (
                <>
                  <div className="size-3.5 border-2 border-text-muted border-t-text-prim rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>Export Transcript</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}