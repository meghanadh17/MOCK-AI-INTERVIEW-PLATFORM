import { Smile, Frown, Shield, Meh, AlertTriangle, Activity } from 'lucide-react';

interface EmotionIndicatorProps {
  emotion: string;
  confidence?: number; // 0 - 100
}

export function EmotionIndicator({ emotion, confidence = 80 }: EmotionIndicatorProps) {
  const norm = emotion.toLowerCase().trim();

  let colorClass = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  let label = 'Neutral';
  let Icon = Meh;
  let emotionBgGlow = 'rgba(99, 102, 241, 0.15)';

  if (norm === 'confident') {
    colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    label = 'Confident';
    Icon = Shield;
    emotionBgGlow = 'rgba(16, 185, 129, 0.15)';
  } else if (norm === 'happy' || norm === 'amber') {
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    label = 'Happy / Engaged';
    Icon = Smile;
    emotionBgGlow = 'rgba(245, 158, 11, 0.15)';
  } else if (norm === 'nervous' || norm === 'anxious' || norm === 'orange') {
    colorClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    label = 'Nervous / Frowning';
    Icon = Frown;
    emotionBgGlow = 'rgba(249, 115, 22, 0.15)';
  } else if (norm === 'fear' || norm === 'rose') {
    colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    label = 'Stressed';
    Icon = AlertTriangle;
    emotionBgGlow = 'rgba(244, 63, 94, 0.15)';
  }

  return (
    <div className="space-y-2.5 p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 shadow-inner">
      <div className="flex justify-between items-center text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-text-sec">
          <Activity className="size-4 text-zinc-400" />
          <span>Emotion Profile</span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          Confidence: {confidence}%
        </span>
      </div>
      
      {/* Key triggers animation on emotion change */}
      <div 
        key={norm}
        className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-xs font-semibold transition-all duration-500 ease-out animate-[scaleIn_0.3s_ease-out] ${colorClass}`}
        style={{
          boxShadow: `0 0 15px ${emotionBgGlow}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 animate-[pulse_2s_infinite]" />
          <span className="capitalize">{label}</span>
        </div>
        
        {/* Simple confidence pill */}
        <div className="px-1.5 py-0.5 rounded bg-zinc-950/40 border border-current/10 font-mono text-[9px]">
          {confidence >= 70 ? 'STABLE' : 'SHIFTING'}
        </div>
      </div>
      
      {/* Inject custom CSS keyframe for scaleIn if not defined, since we want to be safe */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.96); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}