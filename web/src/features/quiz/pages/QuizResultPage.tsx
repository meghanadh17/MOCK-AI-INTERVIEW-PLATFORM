import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quizApi } from '@/api/quiz.api';
import { QuizResultDonut } from '../components/QuizResultDonut';
import { QuizReviewAccordion } from '../components/QuizReviewAccordion';
import { Loader2, ArrowLeft, RotateCcw, Trophy, Clock, CheckCircle } from 'lucide-react';

export function QuizResultPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const navigate = useNavigate();

  // Queries
  const { data: results, isLoading: isResultsLoading, isError: isResultsError } = useQuery({
    queryKey: ['quiz-results', id, attemptId],
    queryFn: () => quizApi.getAttemptResults(id || '', attemptId || ''),
    enabled: !!id && !!attemptId,
  });

  const { data: quiz, isLoading: isQuizLoading, isError: isQuizError } = useQuery({
    queryKey: ['quiz-details', id],
    queryFn: () => quizApi.getQuizDetails(id || ''),
    enabled: !!id,
  });

  const isLoading = isResultsLoading || isQuizLoading;
  const isError = isResultsError || isQuizError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-left">
        <Loader2 className="size-8 text-zinc-450 animate-spin" />
        <p className="text-xs text-text-muted">Evaluating your answers and compiling results dashboard...</p>
      </div>
    );
  }

  if (isError || !results || !quiz) {
    return (
      <div className="p-8 border border-zinc-850 bg-zinc-900/40 text-center gap-4 max-w-lg mx-auto rounded-xl shadow-sm text-left">
        <p className="text-xs text-text-muted">Failed to retrieve results for this attempt.</p>
        <button
          onClick={() => navigate('/app/quiz')}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-850 text-text-prim text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          Return to Arena
        </button>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getGreeting = (score: number) => {
    if (score >= 90) return '🏆 Flawless Victory!';
    if (score >= 80) return '🎉 Outstanding Performance!';
    if (score >= 50) return '👍 Great Job!';
    return '📚 Keep Reviewing & Practicing!';
  };

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16 select-none">
      {/* Header and back button */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-5">
        <button
          onClick={() => navigate('/app/quiz')}
          className="relative group p-2.5 rounded-xl text-text-muted hover:text-text-prim cursor-pointer transition-all active:scale-[0.97] neo-raised neo-raised-hover neo-raised-active"
          title="Back to Arena"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text-prim flex items-center gap-2.5 font-heading uppercase">
            Quiz Evaluation Report
          </h1>
          <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1.5">
            Quiz ID: {id?.substring(0, 8)}...
          </p>
        </div>
      </div>

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Greeting and Score Card */}
        <div className="lg:col-span-5">
          <div className="relative p-6 rounded-2xl flex flex-col items-center gap-6 overflow-hidden neo-raised">
            
            {/* Donut chart */}
            <div className="w-full flex justify-center py-2 border-b border-zinc-900/60 pb-5">
              <QuizResultDonut
                score={results.score}
                correctCount={results.correct_count}
                totalQuestions={quiz.questions.length}
              />
            </div>

            {/* Stats overview */}
            <div className="space-y-5 w-full">
              <div className="space-y-1 text-center">
                <h2 className="text-base font-extrabold text-text-prim font-heading">
                  {getGreeting(results.score)}
                </h2>
                <p className="text-xs text-text-muted font-medium">
                  You completed the test on <span className="text-text-sec font-semibold">{quiz.title}</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4 font-mono">
                {/* Time Taken */}
                <div className="space-y-1 text-center">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Clock className="size-3.5 text-zinc-500" />
                    Time Taken
                  </span>
                  <span className="text-sm font-bold text-text-prim block">
                    {formatTime(results.time_taken_s)}
                  </span>
                </div>

                {/* Accuracy */}
                <div className="space-y-1 text-center">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <CheckCircle className="size-3.5 text-zinc-500" />
                    Accuracy
                  </span>
                  <span className="text-sm font-bold text-text-prim block">
                    {results.score.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Quick Action Navigation Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => navigate(`/app/quiz/${id}/attempt`)}
                  className="relative group flex items-center justify-center gap-2 px-4 py-2.5 text-text-sec hover:text-text-prim text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-[0.98] w-full neo-raised neo-raised-hover neo-raised-active"
                >
                  <RotateCcw className="size-3.5 text-zinc-500" />
                  <span>Retake Quiz</span>
                </button>
                <button
                  onClick={() => navigate('/app/quiz/leaderboard')}
                  className="relative group flex items-center justify-center gap-2 px-4 py-2.5 text-zinc-300 hover:text-zinc-100 font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98] w-full neo-raised neo-raised-hover neo-raised-active"
                >
                  <Trophy className="size-3.5 text-indigo-400" />
                  <span>Leaderboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Review accordion list */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-mono font-bold text-zinc-450 uppercase tracking-wider px-1">
            Detailed Question Review
          </h3>
          <QuizReviewAccordion
            breakdown={results.breakdown}
            questions={quiz.questions}
          />
        </div>
      </div>
    </div>
  );
}