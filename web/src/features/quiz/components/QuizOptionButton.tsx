import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const optionButtonVariants = cva(
  'w-full p-4 border rounded-2xl flex items-center justify-between text-xs font-semibold transition-all duration-200 text-left cursor-pointer disabled:cursor-not-allowed select-none gap-3.5 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'neo-raised neo-raised-hover neo-raised-active text-text-prim',
        selected: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]',
        correct: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]',
        incorrect: 'border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface QuizOptionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof optionButtonVariants> {
  letter: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export function QuizOptionButton({
  letter,
  text,
  variant,
  className,
  ...props
}: QuizOptionButtonProps) {
  // Option letter badge style based on variant
  const getBadgeStyle = () => {
    switch (variant) {
      case 'selected':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'correct':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'incorrect':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-zinc-950 text-zinc-400 border-zinc-850 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]';
    }
  };

  return (
    <button
      className={cn(optionButtonVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1 z-10">
        {/* Left Option Letter Badge */}
        <span
          className={cn(
            'size-7 rounded-lg border font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors duration-200',
            getBadgeStyle()
          )}
        >
          {letter}
        </span>
        {/* Wrapping text */}
        <span className="leading-relaxed whitespace-normal break-words flex-1 text-text-prim select-text">
          {text}
        </span>
      </div>
    </button>
  );
}