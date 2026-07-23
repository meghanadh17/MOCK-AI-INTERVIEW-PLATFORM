import { useQuizStore } from '@/store/quiz.store';
import { cn } from '@/lib/utils';

export function QuizTimerBar() {
  const timeLeft = useQuizStore((state) => state.timeLeft);
  const quizData = useQuizStore((state) => state.quizData);
  
  const totalLimit = quizData?.time_limit_s || 300;
  const percentage = Math.max(0, Math.min(100, (timeLeft / totalLimit) * 100));
  
  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Color mappings
  const getColorClass = (pct: number) => {
    if (pct > 50) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    if (pct > 20) return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]';
    return 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
  };

  const isCritical = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className="w-full space-y-2 select-none">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-text-muted uppercase tracking-wider text-[10px] font-bold">Quiz Timer</span>
        <span
          className={cn(
            'font-bold transition-all duration-300',
            timeLeft <= 30 ? 'text-rose-400' : 'text-text-prim',
            isCritical && 'animate-pulse text-lg text-rose-500 font-extrabold'
          )}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      <div className="w-full h-2 bg-zinc-950 border border-zinc-850/80 rounded-full overflow-hidden relative shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            getColorClass(percentage),
            isCritical && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}