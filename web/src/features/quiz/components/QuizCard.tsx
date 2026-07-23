import { ArrowRight, BookOpen, Layers, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizItem {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  total_questions: number;
  time_limit_s?: number;
  rating: number;
  attempt_count: number;
}

interface QuizCardProps {
  quiz: QuizItem;
  onStart: () => void;
}

export function QuizCard({ quiz, onStart }: QuizCardProps) {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400';
      case 'medium':
        return 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400';
      case 'hard':
        return 'bg-rose-950/30 border-rose-500/20 text-rose-400';
      default:
        return 'bg-purple-950/30 border-purple-500/20 text-purple-400';
    }
  };

  return (
    <div className="relative p-5 rounded-2xl flex flex-col justify-between gap-5 group select-none text-left overflow-hidden w-full neo-raised neo-raised-hover neo-raised-active">
      <div className="space-y-3.5">
        {/* Topic & Difficulty chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase bg-zinc-950 border border-zinc-850 text-text-sec px-2.5 py-1 rounded-lg shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]">
            <BookOpen className="size-2.5 text-indigo-400" />
            {quiz.topic}
          </span>
          <span className={cn('text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-lg border shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]', getDifficultyColor(quiz.difficulty))}>
            {quiz.difficulty}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-text-prim group-hover:text-indigo-400 transition-colors duration-200 leading-snug">
          {quiz.title}
        </h3>

        {/* Details row */}
        <div className="grid grid-cols-3 gap-2.5 pt-1.5 text-[10px] text-text-muted font-mono">
          <div className="space-y-0.5">
            <span className="block opacity-60">QUESTIONS</span>
            <span className="block font-bold text-text-prim flex items-center gap-1.5">
              <Layers className="size-3.5 text-zinc-500" />
              {quiz.total_questions}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="block opacity-60">ATTEMPTS</span>
            <span className="block font-bold text-text-prim flex items-center gap-1.5">
              <Zap className="size-3.5 text-zinc-500" />
              {quiz.attempt_count}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="block opacity-60">RATING</span>
            <span className="block font-bold text-text-prim flex items-center gap-1.5">
              <Star className="size-3.5 text-indigo-400 fill-indigo-400/25" />
              {quiz.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <button
        onClick={onStart}
        className="relative group w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-zinc-300 hover:text-zinc-100 transition-all font-extrabold text-xs neo-raised neo-raised-hover neo-raised-active cursor-pointer"
      >
        <span>Start Practice</span>
        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}