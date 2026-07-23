import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { HintPanel } from './HintPanel';

interface QuestionCardProps {
  questionId: string;
  questionText: string;
  orderIndex: number;
  totalQuestions: number;
  difficulty: number;
  type: string;
  hintsUsed: number;
  onHintRequest: () => void;
  hintText?: string;
  isLoadingHint?: boolean;
}

export function QuestionCard({
  questionId,
  questionText,
  orderIndex,
  totalQuestions,
  difficulty,
  type,
  hintsUsed,
  onHintRequest,
  hintText,
  isLoadingHint
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Difficulty label mapping
  const getDifficultyLabel = (val: number) => {
    if (val < 0.4) return 'Easy';
    if (val < 0.75) return 'Medium';
    return 'Expert';
  };

  const getDifficultyColor = (val: number) => {
    if (val < 0.4) return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10';
    if (val < 0.75) return 'border-amber-500/20 text-amber-400 bg-amber-500/10';
    return 'border-dashed border-rose-500/25 text-rose-400 bg-rose-500/10';
  };

  const isLongText = questionText.length > 180;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={questionId}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-6 rounded-2xl relative overflow-hidden text-left neo-raised w-full"
      >
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/[0.02] blur-xl rounded-full pointer-events-none" />

        {/* Top Header info */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[9px] uppercase font-bold rounded-md">
              {type}
            </span>
            <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-900 text-zinc-400 font-mono text-[9px] uppercase font-bold rounded-md">
              Question {orderIndex + 1} of {totalQuestions}
            </span>
          </div>

          <span className={`px-2 py-0.5 border font-mono text-[9px] uppercase font-bold rounded-md ${getDifficultyColor(difficulty)}`}>
            {getDifficultyLabel(difficulty)}
          </span>
        </div>

        {/* Question Text */}
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="size-5.5 text-text-muted mt-0.5 shrink-0" />
            <h3 className={`font-heading font-extrabold text-text-prim leading-relaxed font-sans transition-all duration-300 ${
              isLongText && !isExpanded ? 'line-clamp-3 text-base md:text-lg' : 'text-lg md:text-xl'
            }`}>
              {questionText}
            </h3>
          </div>

          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-text-muted hover:text-text-prim flex items-center gap-1 mt-1 cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> Read full question
                </>
              )}
            </button>
          )}
        </div>

        {/* Hints Panel */}
        <div className="mt-6 border-t border-zinc-900 pt-4 space-y-3">
          <button 
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 hover:underline cursor-pointer transition-colors"
          >
            <Sparkles className="size-3.5" />
            {showHint ? 'Hide Hint Panel' : 'Need a Hint?'}
          </button>
          
          {showHint && (
            <HintPanel 
              hintText={hintText}
              hintsUsed={hintsUsed}
              onHintRequest={onHintRequest}
              isLoading={isLoadingHint}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}