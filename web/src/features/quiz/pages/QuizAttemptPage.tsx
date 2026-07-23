import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuizAttempt } from '../hooks/useQuizAttempt';
import { QuizTimerBar } from '../components/QuizTimerBar';
import { QuizOptionButton } from '../components/QuizOptionButton';
import { Flag, ArrowLeft, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function QuizAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showExitDialog, setShowExitDialog] = useState(false);

  const {
    isLoading,
    isSubmitting,
    quizTitle,
    questionsCount,
    currentQuestionIndex,
    currentQuestion,
    currentAnswer,
    currentGrade,
    isCurrentFlagged,
    rank,
    handleSelectOption,
    handleNext,
    handlePrev,
    handleToggleFlag
  } = useQuizAttempt(id || '');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-left">
        <Loader2 className="size-8 text-zinc-450 animate-spin" />
        <p className="text-xs text-text-muted">Initializing adaptive quiz session and loading questions...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-8 border border-zinc-850 bg-zinc-900/40 text-center gap-4 max-w-lg mx-auto rounded-xl shadow-sm text-left">
        <p className="text-xs text-text-muted">No questions found in this quiz.</p>
        <button
          onClick={() => navigate('/app/quiz')}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-850 text-text-prim text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          Return to Arena
        </button>
      </div>
    );
  }

  const alphabet = ['A', 'B', 'C', 'D'];
  const isLastQuestion = currentQuestionIndex === questionsCount - 1;

  // Split question text into code block vs normal text if markdown code block syntax is present
  const renderQuestionTextAndCode = (text: string) => {
    const codeRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="text-sm text-text-prim leading-relaxed">
            {text.substring(lastIndex, match.index)}
          </p>
        );
      }
      parts.push(
        <pre
          key={`code-${match.index}`}
          className="p-4 bg-[#0a0e1a] border-l-4 border-zinc-700 rounded-lg font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto select-text shadow-inner"
        >
          <code>{match[1].trim()}</code>
        </pre>
      );
      lastIndex = codeRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <p key={`text-${lastIndex}`} className="text-sm text-text-prim leading-relaxed">
          {text.substring(lastIndex)}
        </p>
      );
    }

    return parts.length > 0 ? (
      <div className="space-y-4">{parts}</div>
    ) : (
      <p className="text-sm text-text-prim leading-relaxed select-text">{text}</p>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16 select-none">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitDialog(true)}
            className="relative group p-2.5 rounded-xl text-text-muted hover:text-text-prim cursor-pointer transition-all active:scale-[0.97] neo-raised neo-raised-hover neo-raised-active"
            title="Exit quiz"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text-prim flex items-center gap-2.5 font-heading uppercase truncate max-w-[180px] sm:max-w-md">
              {quizTitle}
            </h1>
            <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1.5">
              Live Rank: #{rank}
            </p>
          </div>
        </div>

        {/* Flagging Question */}
        <button
          onClick={handleToggleFlag}
          className={cn(
            'relative group flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98]',
            isCurrentFlagged
              ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-400 animate-pulse shadow-[inset_1px_1px_2.5px_rgba(0,0,0,0.4)]'
              : 'text-text-muted hover:text-text-sec neo-raised neo-raised-hover neo-raised-active'
          )}
        >
          <Flag className={cn('size-3.5', isCurrentFlagged && 'fill-indigo-400')} />
          <span>{isCurrentFlagged ? 'Flagged' : 'Flag Question'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timer, Stats & Explanations */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative p-6 rounded-2xl space-y-6 text-left neo-raised">
            {/* Timer */}
            <QuizTimerBar />
            
            {/* Question Progress stats */}
            <div className="space-y-2.5 pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
                <span>Progress Tracker</span>
                <span>{Math.round(((currentQuestionIndex + 1) / questionsCount) * 100)}% Complete</span>
              </div>
              <div className="text-xs font-bold text-text-prim flex items-center justify-between">
                <span>Question Details</span>
                <span className="font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded text-[10px] text-indigo-400">
                  {currentQuestionIndex + 1} / {questionsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Explanations & Grading status */}
          {currentGrade && (
            <div className="relative p-5 rounded-2xl space-y-4 text-left animate-fade-in neo-raised">
              <div className="flex items-center gap-2 text-xs font-bold">
                {currentGrade.is_correct ? (
                  <>
                    <CheckCircle2 className="size-4.5 text-emerald-400" />
                    <span className="text-emerald-400">Correct Answer!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4.5 text-rose-400" />
                    <span className="text-rose-400">Incorrect Answer.</span>
                  </>
                )}
              </div>
              {currentGrade.explanation && (
                <div className="space-y-1.5 border-t border-zinc-900 pt-3">
                  <span className="text-[8px] font-extrabold text-zinc-550 uppercase tracking-widest font-sans select-none block">AI Feedback & Explanation</span>
                  <p className="text-xs/relaxed text-zinc-400 italic leading-relaxed select-text font-mono">
                    {currentGrade.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Question Content & Options selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Question text & code blocks */}
          <div className="relative p-6 rounded-2xl space-y-4 text-left neo-raised">
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-2">
              Question Prompt
            </h3>
            <div className="space-y-4">
              {renderQuestionTextAndCode(currentQuestion.question_text)}
            </div>
          </div>

          {/* Options grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider px-1">
              Select Your Option
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, optIdx) => {
                const letter = alphabet[optIdx] || '';
                const isSelected = opt === currentAnswer;

                let btnVariant: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';

                if (currentGrade) {
                  const isCorrectOption = opt === currentGrade.correct_answer;
                  if (isCorrectOption) {
                    btnVariant = 'correct';
                  } else if (isSelected && !currentGrade.is_correct) {
                    btnVariant = 'incorrect';
                  }
                } else if (isSelected) {
                  btnVariant = 'selected';
                }

                return (
                  <QuizOptionButton
                    key={optIdx}
                    letter={letter}
                    text={opt}
                    variant={btnVariant}
                    disabled={!!currentGrade || isSubmitting}
                    onClick={() => handleSelectOption(opt)}
                  />
                );
              })}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 select-none">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="px-4.5 py-2.5 text-text-sec hover:text-text-prim text-xs font-bold rounded-xl disabled:opacity-40 transition-all cursor-pointer active:scale-[0.98] neo-raised neo-raised-hover neo-raised-active"
            >
              <span>← Previous</span>
            </button>

            {currentGrade ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-5 py-3 text-zinc-300 hover:text-zinc-100 font-extrabold text-xs rounded-xl transition-all active:scale-[0.98] cursor-pointer neo-raised neo-raised-hover neo-raised-active"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isLastQuestion ? (
                  <>
                    <span>Finish Attempt</span>
                    <CheckCircle2 className="size-4 text-emerald-450" />
                  </>
                ) : (
                  <>
                    <span>Next Question</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!currentAnswer || isSubmitting}
                className="px-5 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-xs rounded-xl disabled:opacity-40 transition-all active:scale-[0.98] cursor-pointer shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin text-zinc-650" />
                ) : (
                  <span>Submit Answer →</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 text-text-prim shadow-[8px_8px_24px_rgba(0,0,0,0.6)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading uppercase text-left">Confirm Exit</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-muted text-left">
              Are you sure you want to exit? Your attempt progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-text-sec hover:text-text-prim rounded-xl transition-all cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/app/quiz')}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Exit & Abandon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}