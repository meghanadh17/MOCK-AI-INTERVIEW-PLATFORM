import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertOctagon, BookOpen } from 'lucide-react';
import { formatTextOrObject } from '@/lib/utils';

interface QuestionFeedback {
  question_id: string;
  question_text: string;
  grade: number; // 0-100 score
  ai_feedback: string;
  ideal_outline: string;
  expected_keywords: string[];
  user_transcript?: string;
  evaluation_feedback?: {
    what_was_good?: string;
    critical_gap?: string;
    model_answer_outline?: string;
    keywords_hit?: string[];
    keywords_missed?: string[];
  };
}

interface QuestionAccordionProps {
  questions: QuestionFeedback[];
}

export function QuestionAccordion({ questions }: QuestionAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-zinc-100 to-zinc-300 text-zinc-950';
    if (score >= 60) return 'from-zinc-400 to-zinc-650 text-zinc-950';
    return 'from-zinc-700 to-zinc-900 text-zinc-300';
  };

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-4 text-left">
      <div>
        <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Per-Question Feedback</h3>
        <p className="text-[10px] text-text-disabled uppercase font-mono mt-0.5">Click rows to review evaluation breakdown</p>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isOpen = openIndex === idx;
          const score = q.grade || 0;
          const feedbackDetails = q.evaluation_feedback || {};

          const whatWorked = feedbackDetails.what_was_good || q.ai_feedback || 'No specific strengths captured.';
          const criticalGap = feedbackDetails.critical_gap || 'No critical gaps identified.';
          const modelAnswer = feedbackDetails.model_answer_outline || q.ideal_outline || 'No model outline generated.';

          return (
            <div 
              key={q.question_id || idx}
              className="rounded-2xl overflow-hidden transition-all duration-200 neo-raised"
            >
              {/* Header Row */}
              <div 
                onClick={() => toggleItem(idx)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/40 transition-colors select-none"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Score badge circle */}
                  <div className={`size-10 rounded-full bg-gradient-to-br ${getScoreGradient(score)} flex items-center justify-center font-mono font-extrabold text-xs shrink-0 select-none shadow-sm`}>
                    {Math.round(score)}
                  </div>
                  
                  {/* Question Text */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-sans text-text-prim leading-relaxed transition-all ${
                      isOpen ? '' : 'line-clamp-2'
                    }`}>
                      {q.question_text}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-text-muted">
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>

              {/* Collapsible expanded details */}
              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-zinc-900 bg-zinc-950/20 space-y-5 animate-fade-in text-left">
                  {/* Candidate Response Transcript if present */}
                  {q.user_transcript && (
                    <div className="p-4 rounded-xl space-y-1.5 border border-zinc-950 neo-sunken">
                      <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-wider block">Your Response</span>
                      <p className="text-xs text-text-sec leading-relaxed italic">
                        "{q.user_transcript}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* What Worked */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-2">
                      <h4 className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850 pb-1.5">
                        <CheckCircle2 className="size-3.5" />
                        What Worked
                      </h4>
                      <p className="text-xs text-text-sec leading-relaxed">
                        {formatTextOrObject(whatWorked)}
                      </p>
                    </div>

                    {/* What Missed / Could Improve */}
                    <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
                      <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850/50 pb-1.5">
                        <AlertOctagon className="size-3.5" />
                        Gaps & Misses
                      </h4>
                      <p className="text-xs text-text-sec leading-relaxed">
                        {formatTextOrObject(criticalGap)}
                      </p>
                    </div>

                    {/* Model Answer Outline */}
                    <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/30 space-y-2">
                      <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850/50 pb-1.5">
                        <BookOpen className="size-3.5" />
                        Model Outline
                      </h4>
                      <p className="text-xs text-text-sec leading-relaxed whitespace-pre-line font-mono text-[10px]">
                        {modelAnswer}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}