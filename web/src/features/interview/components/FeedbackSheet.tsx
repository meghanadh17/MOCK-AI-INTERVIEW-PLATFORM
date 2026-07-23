import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, BookOpen, Sparkles } from 'lucide-react';

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  score: number;
  feedback: {
    what_was_good?: string;
    critical_gap?: string;
    model_answer_outline?: string;
    keywords_hit?: string[];
    keywords_missed?: string[];
  };
  isLastQuestion: boolean;
}

export function FeedbackSheet({
  isOpen,
  onClose,
  onNext,
  score,
  feedback,
  isLastQuestion
}: FeedbackSheetProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Score count-up animation
  useEffect(() => {
    if (isOpen) {
      setAnimatedScore(0);
      const duration = 800; // ms
      const startTime = performance.now();

      const updateScore = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out cubic curve
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.floor(easeProgress * score));

        if (progress < 1) {
          requestAnimationFrame(updateScore);
        }
      };

      requestAnimationFrame(updateScore);
    }
  }, [isOpen, score]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-14 inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in duration-200">
      {/* Backdrop click closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Sheet panel */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-lg border-l border-zinc-800 flex flex-col relative z-10 h-full text-left overflow-hidden neo-raised"
      >
        {/* Header */}
        <div className="p-6 pb-4 md:p-8 md:pb-4 flex items-center justify-between border-b border-border-subtle shrink-0">
          <div>
            <h3 className="text-base font-heading font-extrabold text-text-prim flex items-center gap-1.5">
              <Sparkles className="size-4 text-zinc-400" />
              AI Evaluation Feedback
            </h3>
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">Real-time coaching report</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-prim transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 md:p-8 md:pt-4 space-y-6">
          {/* Score Counter Card */}
          <div className="flex flex-col items-center py-5 rounded-2xl relative overflow-hidden border border-zinc-950 neo-sunken">
            <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Evaluation Score</span>
            <span className="text-5xl font-mono font-black mt-2 text-zinc-200 tracking-tight">{animatedScore}</span>
            <span className="text-[10px] text-text-disabled uppercase mt-1">out of 100</span>
          </div>

          {/* Expandable Sections */}
          <div className="space-y-4">
            {/* What Worked */}
            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] space-y-2">
              <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="size-4 shrink-0 text-emerald-400" />
                What Worked
              </h4>
              <p className="text-xs text-text-sec leading-relaxed">
                {feedback.what_was_good || 'Good response layout and technical explanations.'}
              </p>
              {feedback.keywords_hit && feedback.keywords_hit.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {feedback.keywords_hit.map((kw, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-mono text-emerald-400">
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Gaps/Improvement */}
            <div className="p-4 rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/[0.01] space-y-2">
              <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                Could Improve
              </h4>
              <p className="text-xs text-text-sec leading-relaxed">
                {feedback.critical_gap || 'Consider explaining transaction isolation levels and trade-offs.'}
              </p>
              {feedback.keywords_missed && feedback.keywords_missed.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {feedback.keywords_missed.map((kw, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded border border-dashed border-rose-500/20 bg-rose-500/10 text-[9px] font-mono text-rose-400">
                      ⚠ {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Model Outline */}
            {feedback.model_answer_outline && (
              <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-900/10 space-y-2">
                <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="size-4 shrink-0 text-indigo-400" />
                  Model Answer Outline
                </h4>
                <p className="text-xs text-text-sec leading-relaxed whitespace-pre-line font-mono text-[10.5px]">
                  {feedback.model_answer_outline}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Next Button Container */}
        <div className="p-6 pt-4 md:p-8 md:pt-4 border-t border-border-subtle shrink-0 bg-bg-overlay">
          <button 
            onClick={onNext}
            className="w-full py-3 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active"
          >
            {isLastQuestion ? 'SUBMIT TEST' : 'Close & Move to Next Question'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}