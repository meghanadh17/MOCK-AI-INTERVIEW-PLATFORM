import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionExplanationItem {
  question_id: string;
  question_text: string;
  chosen_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

interface QuestionDetailsItem {
  id: string;
  options: string[];
}

interface QuizReviewAccordionProps {
  breakdown: QuestionExplanationItem[];
  questions: QuestionDetailsItem[];
}

export function QuizReviewAccordion({ breakdown, questions }: QuizReviewAccordionProps) {
  // Map questions to access options easily
  const questionsMap = new Map(questions.map((q) => [q.id, q.options]));

  return (
    <Accordion type="single" collapsible className="w-full space-y-3 border-none">
      {breakdown.map((item, idx) => {
        const options = questionsMap.get(item.question_id) || [];
        const isCorrect = item.is_correct;
        const alphabet = ['A', 'B', 'C', 'D'];

        return (
          <AccordionItem
            key={item.question_id}
            value={item.question_id}
            className="relative rounded-2xl overflow-hidden neo-raised"
          >
            <AccordionTrigger className="hover:no-underline p-4 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-zinc-500 font-bold select-none">
                  {idx + 1}.
                </span>
                <p className="text-xs font-bold text-text-prim truncate flex-1 leading-normal select-text">
                  {item.question_text}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 select-none mr-2">
                {isCorrect ? (
                  <CheckCircle2 className="size-4.5 text-emerald-400" />
                ) : (
                  <XCircle className="size-4.5 text-rose-400" />
                )}
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4 pt-1 bg-zinc-950/40 border-t border-zinc-900">
              <div className="space-y-4">
                {/* Full Question Text */}
                <p className="text-xs text-text-sec leading-relaxed select-text font-medium pt-2">
                  {item.question_text}
                </p>

                {/* Option list */}
                <div className="grid grid-cols-1 gap-2.5">
                  {options.map((opt, optIdx) => {
                    const letter = alphabet[optIdx] || '';
                    const isSelected = opt === item.chosen_answer;
                    const isAnswerCorrect = opt === item.correct_answer;

                    let optionStyle = 'border-zinc-900 bg-zinc-950/60 text-text-muted';
                    let badgeStyle = 'bg-zinc-900 border-zinc-800 text-zinc-500';

                    if (isAnswerCorrect) {
                      optionStyle = 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400';
                      badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-rose-500/35 bg-rose-500/10 text-rose-400';
                      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={cn(
                          'p-3 border rounded-2xl flex items-center gap-3 text-xs font-medium leading-relaxed transition-colors shadow-sm select-text',
                          optionStyle
                        )}
                      >
                        <span
                          className={cn(
                            'size-6 rounded-lg border font-mono text-[10px] font-bold flex items-center justify-center shrink-0 select-none',
                            badgeStyle
                          )}
                        >
                          {letter}
                        </span>
                        <span className="flex-1 whitespace-normal break-words">
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text */}
                {item.explanation && (
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-1.5 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
                    <span className="text-[9px] font-extrabold text-zinc-450 uppercase tracking-widest block font-sans select-none">
                      AI Explanation
                    </span>
                    <p className="text-xs/relaxed text-zinc-400 italic leading-relaxed select-text font-mono">
                      {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}