import { MessageSquare, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export interface TranscriptSegmentData {
  start_ms: number;
  end_ms: number;
  speaker: string;
  text: string;
}

interface SpeechReportProps {
  wpm: number;
  fillerWordCount: number;
  silenceRatio: number; // e.g. 0.15 representing 15%
  clarityScore: number; // e.g. 88 representing 88%
  transcriptSegments: TranscriptSegmentData[];
}

export function SpeechReport({
  wpm,
  fillerWordCount,
  silenceRatio,
  clarityScore,
  transcriptSegments,
}: SpeechReportProps) {
  
  // WPM rating: 110-150 is good/normal pace. Above 155 is fast, below 110 is slow.
  const getWpmStatus = (val: number) => {
    if (val > 150) return { label: 'Fast Pace', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (val < 110) return { label: 'Slow Pace', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Optimal Pace', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const wpmStatus = getWpmStatus(wpm);

  // Common filler words list to highlight in transcript
  const fillerRegex = /\b(um|uh|like|so|actually|basically|literally|you\sknow)\b/gi;

  const highlightFillerWords = (text: string) => {
    if (!text) return '';
    const parts = text.split(fillerRegex);
    return parts.map((part, i) => {
      if (part.toLowerCase().match(/^(um|uh|like|so|actually|basically|literally|you\sknow)$/)) {
        return (
          <span 
            key={i} 
            className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold select-none cursor-help"
            title="Filler word"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: WPM */}
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2.5 relative overflow-hidden select-none neo-raised">
          <div className="flex justify-between items-start text-text-muted">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Speech Pace</span>
            <MessageSquare className="size-4 opacity-50" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
              {wpm.toFixed(0)} <span className="text-xs font-semibold text-text-muted font-sans">WPM</span>
            </p>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wide ${wpmStatus.color}`}>
              {wpmStatus.label}
            </span>
          </div>
        </div>

        {/* Card 2: Filler Words */}
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2.5 relative overflow-hidden select-none neo-raised">
          <div className="flex justify-between items-start text-text-muted">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Filler Words</span>
            <AlertTriangle className="size-4 opacity-50" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
              {fillerWordCount} <span className="text-xs font-semibold text-text-muted font-sans">caught</span>
            </p>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wide ${
              fillerWordCount > 5 
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {fillerWordCount > 5 ? 'High Usage' : 'Clean Speech'}
            </span>
          </div>
        </div>

        {/* Card 3: Silence Ratio */}
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2.5 relative overflow-hidden select-none neo-raised">
          <div className="flex justify-between items-start text-text-muted">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Silence Ratio</span>
            <AlertCircle className="size-4 opacity-50" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
              {(silenceRatio * 100).toFixed(0)}% <span className="text-xs font-semibold text-text-muted font-sans">pause</span>
            </p>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wide ${
              silenceRatio > 0.25 
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {silenceRatio > 0.25 ? 'Long pauses' : 'Natural flow'}
            </span>
          </div>
        </div>

        {/* Card 4: Clarity Score */}
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2.5 relative overflow-hidden select-none neo-raised">
          <div className="flex justify-between items-start text-text-muted">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Speech Clarity</span>
            <CheckCircle className="size-4 opacity-50" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
              {clarityScore.toFixed(0)}% <span className="text-xs font-semibold text-text-muted font-sans">accuracy</span>
            </p>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wide ${
              clarityScore >= 80 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}>
              {clarityScore >= 80 ? 'Clear articulation' : 'Slight slurring'}
            </span>
          </div>
        </div>

      </div>

      {/* Transcript Text Section */}
      <div className="p-6 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-4 shadow-inner">
        <div className="border-b border-zinc-900 pb-3 flex justify-between items-center select-none">
          <h4 className="text-xs font-semibold text-text-sec uppercase tracking-wider">
            Timestamped Speech Transcript
          </h4>
          <span className="text-[9px] font-mono text-zinc-350 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
            Filler words highlighted
          </span>
        </div>

        {transcriptSegments && transcriptSegments.length > 0 ? (
          <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
            {transcriptSegments.map((seg, idx) => {
              const minutes = Math.floor(seg.start_ms / 60000);
              const seconds = Math.floor((seg.start_ms % 60000) / 1000).toString().padStart(2, '0');
              const timestampStr = `${minutes}:${seconds}`;

              return (
                <div key={idx} className="flex gap-4 items-start text-xs text-text-sec leading-relaxed">
                  <span className="font-mono text-text-muted text-[10px] w-10 shrink-0 pt-0.5">
                    [{timestampStr}]
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-prim block select-none">
                      {seg.speaker}
                    </span>
                    <p className="text-text-sec leading-relaxed">
                      {highlightFillerWords(seg.text)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-muted py-6 text-center select-none">
            No spoken transcript details recorded for this video session.
          </p>
        )}
      </div>

    </div>
  );
}