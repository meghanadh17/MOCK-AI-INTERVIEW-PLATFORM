import { CheckCircle2, MapPin, Briefcase, Award } from 'lucide-react';

interface MatchGaugePanelProps {
  matchScore: number;
  skillsOverlapCount: number;
  skillsTotalCount: number;
  experienceLevel?: string;
  location?: string;
  atsPrediction?: number;
}

export function MatchGaugePanel({
  matchScore,
  skillsOverlapCount,
  skillsTotalCount,
  experienceLevel,
  location,
  atsPrediction,
}: MatchGaugePanelProps) {
  const radius = 50;
  const circumference = Math.PI * radius; // semi-circle: ~157.08
  const offset = circumference - (matchScore / 100) * circumference;

  const getGaugeColor = (score: number) => {
    if (score < 50) return '#f43f5e'; // Rose-500
    if (score < 80) return '#6366f1'; // Indigo-500
    return '#10b981'; // Emerald-500
  };

  const getGaugeBgColorClass = (score: number) => {
    if (score < 50) return 'text-rose-400';
    if (score < 80) return 'text-indigo-400';
    return 'text-emerald-400';
  };

  return (
    <div className="relative p-6 rounded-2xl space-y-6 text-left neo-raised">
      {/* Title */}
      <div>
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
          <Award className="size-3.5 text-indigo-400" />
          AI Compatibility Score
        </h3>
      </div>

      {/* SVG Arc Gauge */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative w-40 h-24 flex items-end justify-center select-none overflow-hidden">
          <svg viewBox="0 0 120 72" className="w-40 h-24 transform rotate-180">
            {/* Background semi-circle */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              className="stroke-zinc-900"
              strokeWidth="7.5"
              fill="transparent"
              strokeLinecap="round"
            />
            {/* Foreground animated path */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              stroke={getGaugeColor(matchScore)}
              strokeWidth="7.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute bottom-0 flex flex-col items-center">
            <span className="font-mono text-2xl font-black text-text-prim leading-none">
              {Math.round(matchScore)}%
            </span>
            <span className="text-[8px] text-text-muted uppercase mt-1 tracking-wider font-bold">
              compatibility index
            </span>
          </div>
        </div>
      </div>

      {/* Metric Breakdown Stats */}
      <div className="space-y-3 pt-3 border-t border-zinc-900">
        {/* Skills overlap row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-sec">
            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
            <span>Skills overlap</span>
          </div>
          <span className="font-mono font-bold text-text-prim">
            {skillsOverlapCount} / {skillsTotalCount}
          </span>
        </div>

        {/* Experience Match row */}
        {experienceLevel && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-text-sec">
              <Briefcase className="size-3.5 text-indigo-400 shrink-0" />
              <span>Target grade</span>
            </div>
            <span className="font-mono font-bold text-text-prim uppercase text-[10px]">
              {experienceLevel}
            </span>
          </div>
        )}

        {/* Location Match row */}
        {location && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-text-sec">
              <MapPin className="size-3.5 text-zinc-400 shrink-0" />
              <span>Location preference</span>
            </div>
            <span className="font-mono font-bold text-text-prim text-[10px]">
              {location}
            </span>
          </div>
        )}

        {/* ATS prediction row */}
        {atsPrediction !== undefined && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[10px] uppercase font-mono text-text-muted font-bold">ATS Score Prediction</span>
            <span className={`font-mono font-extrabold text-sm ${getGaugeBgColorClass(atsPrediction)}`}>
              {atsPrediction}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}