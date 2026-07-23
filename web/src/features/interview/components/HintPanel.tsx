import { HelpCircle, RefreshCw } from 'lucide-react';

interface HintPanelProps {
  hintText?: string;
  hintsUsed: number;
  onHintRequest: () => void;
  isLoading?: boolean;
}

export function HintPanel({ hintText, hintsUsed, onHintRequest, isLoading }: HintPanelProps) {
  return (
    <div className="p-4 rounded-xl text-xs text-text-sec leading-relaxed animate-fade-in space-y-3 border border-zinc-950 bg-zinc-950/20 shadow-inner neo-sunken">
      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
        <span>AI Hints Panel</span>
        <span>{hintsUsed} of 2 hints used</span>
      </div>

      {hintText ? (
        <div className="space-y-2">
          <p className="text-text-prim leading-relaxed">{hintText}</p>
          <p className="text-[9px] font-mono text-text-muted italic">
            * Note: Requesting hints deducts a small score penalty (-1.5 points).
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-text-muted">
            Stuck? Request a structured hint from the AI interviewer.
          </p>
          {hintsUsed >= 2 ? (
            <span className="text-[10px] font-mono text-text-disabled uppercase font-bold shrink-0">
              No hints left
            </span>
          ) : (
            <button
              onClick={onHintRequest}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-xl text-[10px] font-bold font-mono uppercase cursor-pointer transition-all disabled:opacity-50 shrink-0 select-none hover:bg-amber-500/20 active:scale-95"
            >
              {isLoading ? (
                <RefreshCw className="size-3 animate-spin" />
              ) : (
                <HelpCircle className="size-3" />
              )}
              Unlock Hint (-1.5 XP)
            </button>
          )}
        </div>
      )}
    </div>
  );
}