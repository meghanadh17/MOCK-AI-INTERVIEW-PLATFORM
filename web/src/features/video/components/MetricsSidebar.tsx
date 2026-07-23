import { useState, useEffect } from 'react';
import { useVideoStore } from '@/store/video.store';
import { PostureBar } from './PostureBar';
import { GazeBar } from './GazeBar';
import { EmotionIndicator } from './EmotionIndicator';
import { CircularGauge } from './CircularGauge';
import { Clock, Volume2, Activity } from 'lucide-react';

interface MetricsSidebarProps {
  layout?: 'vertical' | 'horizontal';
}

export function MetricsSidebar({ layout = 'vertical' }: MetricsSidebarProps) {
  const postureScore = useVideoStore((state) => state.postureScore);
  const eyeContactScore = useVideoStore((state) => state.eyeContactScore);
  const dominantEmotion = useVideoStore((state) => state.dominantEmotion);
  const compositeScore = useVideoStore((state) => state.compositeScore);
  const metricsHistory = useVideoStore((state) => state.metricsHistory);
  const speakingPace = useVideoStore((state) => state.speakingPace);
  const confidenceLevel = useVideoStore((state) => state.confidenceLevel);
  const sessionStartTime = useVideoStore((state) => state.sessionStartTime);

  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    if (!sessionStartTime) {
      setDuration('00:00');
      return;
    }
    
    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setDuration(`${m}:${s}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const getTrend = (key: 'posture' | 'eyeContact') => {
    if (metricsHistory.length < 3) return 'stable';
    const last = metricsHistory[metricsHistory.length - 1][key];
    const prev = metricsHistory[metricsHistory.length - 2][key];
    if (last > prev + 1.5) return 'up';
    if (last < prev - 1.5) return 'down';
    return 'stable';
  };

  const renderSparkline = (key: 'posture' | 'eyeContact') => {
    if (metricsHistory.length < 2) return null;
    const recentHistory = metricsHistory.slice(-15);
    const width = 45;
    const height = 12;
    const padding = 1;
    const points = recentHistory.map((h, i) => {
      const x = padding + (i / (recentHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - (h[key] / 100) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const lastScore = recentHistory[recentHistory.length - 1][key];
    const strokeClass = lastScore >= 75 
      ? 'stroke-emerald-400' 
      : lastScore < 60 
        ? 'stroke-rose-400' 
        : 'stroke-amber-400';

    return (
      <svg className="w-12 h-3.5 opacity-80 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          strokeWidth="1.5"
          points={points}
          className={`${strokeClass} transition-all duration-300`}
        />
      </svg>
    );
  };

  const getPaceDetails = (wpm: number) => {
    if (wpm === 0) return { label: 'Silent', color: 'text-text-muted' };
    if (wpm >= 110 && wpm <= 150) return { label: 'Optimal', color: 'text-emerald-400' };
    if (wpm > 150) return { label: 'Fast Pace', color: 'text-amber-400' };
    return { label: 'Slow Pace', color: 'text-amber-400' };
  };

  const paceInfo = getPaceDetails(speakingPace);

  // Horizontal Grid Layout for Split Screens
  if (layout === 'horizontal') {
    return (
      <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xl backdrop-blur select-none relative overflow-hidden">
        {/* Top Neomorphic highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        {/* Composite Score Meter */}
        <div className="flex items-center gap-3 shrink-0 pr-4 md:border-r md:border-zinc-900 w-full md:w-auto justify-center md:justify-start">
          <CircularGauge value={compositeScore} size={70} strokeWidth={6} label="Composite" />
          <div className="space-y-1">
            <h5 className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-wider">Telemetry Duration</h5>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="size-3" />
              {duration}
            </span>
          </div>
        </div>

        {/* Dynamic Metric Tracks (Posture & Gaze) */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <PostureBar 
            score={postureScore} 
            trend={getTrend('posture')} 
            sparkline={renderSparkline('posture')} 
          />
          <GazeBar 
            score={eyeContactScore} 
            trend={getTrend('eyeContact')} 
            sparkline={renderSparkline('eyeContact')} 
          />
        </div>

        {/* Emotion Profile & Speaking Pace */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 md:pl-4 md:border-l md:border-zinc-900 w-full md:w-auto items-stretch">
          <div className="min-w-[130px]">
            <EmotionIndicator 
              emotion={dominantEmotion} 
              confidence={confidenceLevel} 
            />
          </div>
          
          <div className="p-3 rounded-lg border border-zinc-800/40 bg-zinc-900/10 backdrop-blur-sm space-y-1.5 flex flex-col justify-center min-w-[110px]">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-[9px] font-mono text-text-muted uppercase">Pace: {paceInfo.label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-sm font-heading font-bold text-text-prim tabular-nums">{speakingPace}</span>
              <span className="text-[8px] text-text-muted">WPM</span>
            </div>
            <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  speakingPace >= 110 && speakingPace <= 150 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (speakingPace / 200) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between gap-5 text-left shadow-2xl backdrop-blur select-none relative overflow-hidden">
      
      {/* HUD Header */}
      <div className="border-b border-zinc-800/60 pb-3 flex justify-between items-center w-full">
        <h4 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="size-4 text-indigo-400 animate-[pulse_1.5s_infinite]" />
          Analysis HUD
        </h4>
        <div className="flex items-center gap-2">
          {sessionStartTime && (
            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Clock className="size-3" />
              {duration}
            </span>
          )}
          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
            ONLINE
          </span>
        </div>
      </div>

      {/* Main Grid: stacked on mobile, 2 columns on tablet/medium screens, stacked on desktop sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5 w-full items-stretch">
        
        {/* Left Side Grid Item (Gauge & Speaking Pace) */}
        <div className="flex flex-col gap-4 justify-between h-full">
          {/* Live HUD Composite Performance Meter */}
          <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/20 border border-zinc-800/40 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner flex-1 min-h-[160px]">
            <CircularGauge value={compositeScore} size={110} strokeWidth={7} label="Composite" />
          </div>

          {/* Speaking Pace HUD */}
          <div className="p-3 rounded-lg border border-zinc-800/40 bg-zinc-900/10 backdrop-blur-sm space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-text-sec">
                <Volume2 className="size-4 text-indigo-400" />
                <span>Speaking Pace</span>
              </div>
              <span className={`font-mono text-[10px] font-bold ${paceInfo.color}`}>
                {paceInfo.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-heading font-bold text-text-prim tabular-nums">
                {speakingPace}
              </span>
              <span className="text-[10px] text-text-muted">WPM</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  speakingPace >= 110 && speakingPace <= 150 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (speakingPace / 200) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side Grid Item (Metrics list: Posture, Gaze, Emotion) */}
        <div className="flex flex-col justify-between gap-3 h-full">
          <PostureBar 
            score={postureScore} 
            trend={getTrend('posture')} 
            sparkline={renderSparkline('posture')} 
          />
          <GazeBar 
            score={eyeContactScore} 
            trend={getTrend('eyeContact')} 
            sparkline={renderSparkline('eyeContact')} 
          />
          <EmotionIndicator 
            emotion={dominantEmotion} 
            confidence={confidenceLevel} 
          />
        </div>

      </div>

      {/* Footer statistics */}
      <div className="text-[9px] font-mono text-text-muted border-t border-zinc-800/40 pt-3 flex flex-col gap-0.5 select-none leading-relaxed w-full">
        <span>Frame Grabber: 2 FPS</span>
        <span>Telemetry Stream: Active</span>
      </div>
    </div>
  );
}