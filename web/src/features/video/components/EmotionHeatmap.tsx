import { useState } from 'react';
import { Smile, Frown, Shield, Meh, AlertTriangle } from 'lucide-react';

export interface EmotionWindowData {
  start_time_s: number;
  end_time_s: number;
  dominant_emotion: string;
  average_confidence: number;
}

interface EmotionHeatmapProps {
  timeline: EmotionWindowData[];
  dominantEmotion: string;
}

export function EmotionHeatmap({ timeline, dominantEmotion }: EmotionHeatmapProps) {
  const [hoveredWindow, setHoveredWindow] = useState<EmotionWindowData | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-zinc-900/40 border border-border-def rounded-xl text-text-muted text-xs">
        No emotion heatmap timeline data available for this session.
      </div>
    );
  }

  // Get color for emotion
  const getEmotionColor = (emotion: string) => {
    const e = emotion.toLowerCase().trim();
    if (e === 'confident') return 'bg-emerald-500 hover:bg-emerald-400 border-emerald-500/20';
    if (e === 'happy' || e === 'amber') return 'bg-amber-500 hover:bg-amber-400 border-amber-500/20';
    if (e === 'nervous' || e === 'anxious' || e === 'orange') return 'bg-orange-500 hover:bg-orange-400 border-orange-500/20';
    if (e === 'fear' || e === 'rose') return 'bg-rose-500 hover:bg-rose-400 border-rose-500/20';
    return 'bg-indigo-500 hover:bg-indigo-400 border-indigo-500/20'; // neutral
  };

  return (
    <div className="w-full space-y-5 text-left">
      <div className="flex justify-between items-center select-none">
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider">
            Emotion Heatmap Timeline
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            Dominant Session Emotion: <span className="font-bold text-text-prim capitalize">{dominantEmotion}</span>
          </p>
        </div>
        <span className="text-[10px] text-text-muted font-mono">5s Windows</span>
      </div>

      {/* Heatmap Row */}
      <div className="relative">
        <div className="w-full h-12 bg-zinc-900 border border-border-strong rounded-lg flex items-stretch gap-1 p-1 overflow-x-auto shadow-inner select-none">
          {timeline.map((win, idx) => (
            <div
              key={idx}
              className={`flex-1 min-w-[28px] rounded transition-all duration-200 cursor-pointer ${getEmotionColor(win.dominant_emotion)}`}
              onMouseEnter={() => setHoveredWindow(win)}
              onMouseLeave={() => setHoveredWindow(null)}
            />
          ))}
        </div>

        {/* Floating Tooltip Info */}
        <div className="h-16 relative flex items-center justify-center">
          {hoveredWindow ? (
            <div className="absolute top-2 px-4 py-2 bg-zinc-950 border border-border-strong rounded-lg shadow-xl font-mono text-[10px] flex items-center gap-4 animate-fade-in">
              <div>
                <span className="text-text-muted">Window:</span>{' '}
                <span className="text-text-prim">{hoveredWindow.start_time_s.toFixed(0)}s - {hoveredWindow.end_time_s.toFixed(0)}s</span>
              </div>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <div>
                <span className="text-text-muted">Emotion:</span>{' '}
                <span className="text-text-prim capitalize font-bold">{hoveredWindow.dominant_emotion}</span>
              </div>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <div>
                <span className="text-text-muted">Confidence:</span>{' '}
                <span className="text-emerald-400 font-bold">{(hoveredWindow.average_confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-text-muted select-none">Hover over a window block to view analysis details.</p>
          )}
        </div>
      </div>

      {/* Grid Legend below */}
      <div className="border-t border-border-subtle/30 pt-3 flex flex-wrap gap-x-6 gap-y-2 select-none text-[10px] text-text-muted font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-emerald-500" />
          <Shield className="size-3 text-emerald-400 shrink-0" />
          <span>Confident</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-amber-500" />
          <Smile className="size-3 text-amber-400 shrink-0" />
          <span>Happy / Engaged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-indigo-500" />
          <Meh className="size-3 text-indigo-400 shrink-0" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-orange-500" />
          <Frown className="size-3 text-orange-400 shrink-0" />
          <span>Nervous</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-rose-500" />
          <AlertTriangle className="size-3 text-rose-400 shrink-0" />
          <span>Stressed</span>
        </div>
      </div>
    </div>
  );
}