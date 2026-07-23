import React from 'react';
import { UserCheck, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface PostureBarProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  sparkline?: React.ReactNode;
}

export function PostureBar({ score, trend = 'stable', sparkline }: PostureBarProps) {
  const isOptimal = score >= 75;
  const isWeak = score < 65;
  
  const barGradient = isOptimal 
    ? 'from-emerald-600 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' 
    : isWeak 
      ? 'from-rose-600 to-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]' 
      : 'from-amber-600 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]';

  const textColor = isOptimal 
    ? 'text-emerald-400' 
    : isWeak 
      ? 'text-rose-400 font-bold' 
      : 'text-amber-400';

  return (
    <div className={`space-y-2.5 p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 transition-all duration-300 shadow-inner ${isWeak ? 'border-red-500/20 bg-red-500/[0.02]' : ''}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-text-sec">
          <UserCheck className="size-4 text-indigo-400" />
          <span>Posture Alignment</span>
        </div>
        <div className="flex items-center gap-2">
          {sparkline && <div className="opacity-80">{sparkline}</div>}
          <div className="flex items-center gap-0.5">
            <span className={`font-mono font-bold ${textColor}`}>{Math.round(score)}%</span>
            {trend === 'up' && <ArrowUpRight className="size-3.5 text-emerald-400 animate-[bounce_1s_infinite_alternate]" />}
            {trend === 'down' && <ArrowDownRight className="size-3.5 text-rose-400 animate-[bounce_1s_infinite_alternate]" />}
            {trend === 'stable' && <Minus className="size-3.5 text-zinc-500" />}
          </div>
        </div>
      </div>
      
      {/* Outer track */}
      <div className="h-2 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${barGradient}`} 
          style={{ width: `${score}%` }} 
        />
      </div>
      
      <p className="text-[10px] text-text-muted select-none leading-normal">
        {score >= 75 
          ? 'Optimal posture alignment.' 
          : score >= 65 
            ? 'Slight slouch detected. Keep back upright.' 
            : 'Slouching detected. Please sit up straight.'}
      </p>
    </div>
  );
}