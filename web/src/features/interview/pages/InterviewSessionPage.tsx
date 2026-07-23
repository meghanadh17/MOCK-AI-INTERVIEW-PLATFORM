import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInterviewStore } from '@/store/interview.store';
import { interviewApi } from '@/api/interview.api';
import { 
  useSubmitAnswerMutation, 
  useRequestHintMutation, 
  useSkipQuestionMutation, 
  useEndInterviewMutation 
} from '../hooks/useInterviewQueries';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerTextarea } from '../components/AnswerTextarea';
import { SessionProgressBar } from '../components/SessionProgressBar';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { toast } from 'sonner';
import { Clock, StopCircle, ArrowRight } from 'lucide-react';
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

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand Store values
  const storeQuestions = useInterviewStore((state) => state.questions);
  const setQuestions = useInterviewStore((state) => state.setQuestions);
  const currentQuestionIndex = useInterviewStore((state) => state.currentQuestionIndex);
  const setCurrentQuestionIndex = useInterviewStore((state) => state.setCurrentQuestionIndex);
  const lastFeedback = useInterviewStore((state) => state.lastFeedback);


  // Local state
  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hintText, setHintText] = useState<string | undefined>(undefined);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);

  // Mutations
  const submitAnswerMutation = useSubmitAnswerMutation();
  const requestHintMutation = useRequestHintMutation();
  const skipQuestionMutation = useSkipQuestionMutation();
  const endInterviewMutation = useEndInterviewMutation();

  // 1. Fetch Session Detail
  const { data: session, isLoading: isSessionLoading, error } = useQuery({
    queryKey: ['interview', 'session', id],
    queryFn: async () => {
      if (!id) throw new Error('Session ID is required');
      const res = await interviewApi.getSession(id);
      return res.data;
    },
    enabled: !!id,
  });

  // 2. Set questions to Zustand once fetched
  useEffect(() => {
    if (session && session.questions) {
      setQuestions(session.questions);

      // Find first unanswered question to resume progress
      const firstUnansweredIdx = session.questions.findIndex(
        (q: any) => q.user_transcript === null && !q.is_skipped
      );
      if (firstUnansweredIdx !== -1) {
        setCurrentQuestionIndex(firstUnansweredIdx);
      } else {
        setCurrentQuestionIndex(0);
      }
    }
  }, [session, setQuestions, setCurrentQuestionIndex]);

  // 3. Keep track of elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Start the interview if status is 'created'
  useEffect(() => {
    const autoStart = async () => {
      if (session && session.status === 'created' && id && !isStarting) {
        setIsStarting(true);
        try {
          await interviewApi.startSession(id);
          queryClient.invalidateQueries({ queryKey: ['interview', 'session', id] });
          toast.success('Interview started! Good luck.');
        } catch (err) {
          toast.error('Failed to start interview session.');
        } finally {
          setIsStarting(false);
        }
      }
    };
    autoStart();
  }, [session, id, queryClient, isStarting]);

  if (isSessionLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse text-left py-12">
        <div className="h-6 bg-zinc-900 rounded-xl w-1/4" />
        <div className="h-40 border border-zinc-900 rounded-2xl neo-raised" />
        <div className="h-32 border border-zinc-950 rounded-2xl neo-sunken" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>Failed to load interview session.</p>
        <button onClick={() => navigate('/app/interview')} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer">
          Go back Setup
        </button>
      </div>
    );
  }

  const questions = storeQuestions || [];
  const currentQuestion = questions[currentQuestionIndex];
  
  // Count answered questions
  const answeredCount = questions.filter((q: any) => q.user_transcript !== null).length;

  const handleHintRequest = () => {
    if (!id || !currentQuestion) return;
    requestHintMutation.mutate(
      { id, questionId: currentQuestion.id },
      {
        onSuccess: (data) => {
          setHintText(data.hint || data.hint_text || data.message || 'Focus on explaining modular separation and clean architectural paradigms.');
          setHintsUsedCount((prev) => prev + 1);
          toast.success('AI Hint retrieved.');
        },
        onError: () => {
          toast.error('Could not load hint.');
        }
      }
    );
  };

  const handleSkipQuestion = () => {
    if (!id || !currentQuestion) return;
    setIsSkipConfirmOpen(true);
  };

  const confirmSkipQuestion = () => {
    if (!id || !currentQuestion) return;
    setIsSkipConfirmOpen(false);

    skipQuestionMutation.mutate(
      { id, questionId: currentQuestion.id },
      {
        onSuccess: () => {
          toast.info('Question skipped.');
          setHintText(undefined);
          setHintsUsedCount(0);
          setUserAnswer('');
          
          // Explicitly invalidate session queries to fetch newly generated questions
          queryClient.invalidateQueries({ queryKey: ['interview', 'session', id] });
          
          // Move to next question or complete if it was last
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          } else {
            handleEndSession();
          }
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail || 'Failed to skip question.');
        }
      }
    );
  };

  const handleSubmitAnswer = () => {
    if (!id || !currentQuestion) return;
    if (!userAnswer.trim()) {
      toast.warning('Please enter a response before submitting.');
      return;
    }

    submitAnswerMutation.mutate(
      { id, userTranscript: userAnswer },
      {
        onSuccess: () => {
          // Open the feedback overlay drawer
          setShowFeedbackSheet(true);
        },
        onError: () => {
          toast.error('Failed to submit answer. Please try again.');
        }
      }
    );
  };

  const handleNextQuestion = () => {
    setShowFeedbackSheet(false);
    setUserAnswer('');
    setHintText(undefined);
    setHintsUsedCount(0);

    // Update query cache so that completed question updates display
    queryClient.invalidateQueries({ queryKey: ['interview', 'session', id] });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleEndSession();
    }
  };

  const handleEndSession = () => {
    if (!id) return;
    endInterviewMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Interview session ended successfully.');
        navigate(`/app/interview/${id}/report`);
      },
      onError: () => {
        toast.error('Failed to close interview session.');
      }
    });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left py-4 pb-20 animate-fade-in">
      
      {/* 1. Timer & Close Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-heading font-extrabold text-text-prim uppercase tracking-wider">
            {session.title || 'AI Interactive Session'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 font-mono text-xs font-bold bg-zinc-950 border border-zinc-950 rounded-full text-text-prim flex items-center gap-1.5 select-none neo-sunken">
            <Clock className="size-3.5 text-zinc-400" />
            {formatTimer(elapsedTime)}
          </div>
          <button 
            onClick={() => setIsEndConfirmOpen(true)}
            disabled={endInterviewMutation.isPending}
            className="px-3.5 py-1 text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 select-none neo-raised hover:text-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <StopCircle className="size-3.5" />
            End
          </button>
        </div>
      </div>

      {/* 2. ProgressBar */}
      <div className="p-4 rounded-2xl neo-raised">
        <SessionProgressBar 
          total={questions.length} 
          current={currentQuestionIndex} 
          answered={answeredCount} 
        />
      </div>

      {/* 3. Split Layout: Question Card on Left, Answering Textarea on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Question Details */}
        <div className="lg:col-span-5 flex">
          {currentQuestion ? (
            <div className="w-full flex">
              <QuestionCard
                questionId={currentQuestion.id}
                questionText={currentQuestion.question_text}
                orderIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                difficulty={currentQuestion.difficulty || 0.5}
                type={session.type || 'Technical'}
                hintsUsed={hintsUsedCount}
                onHintRequest={handleHintRequest}
                hintText={hintText}
                isLoadingHint={requestHintMutation.isPending}
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl text-center text-text-muted w-full flex items-center justify-center neo-raised">
              <p>No active question loaded.</p>
            </div>
          )}
        </div>

        {/* Right Side: Textarea Input Card */}
        <div className="lg:col-span-7 p-6 rounded-2xl space-y-4 relative flex flex-col justify-between neo-raised">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-sec">Your Verbal/Written Response</h4>
              <span className="text-[10px] text-text-muted font-mono uppercase">Assessment Box</span>
            </div>

            <AnswerTextarea
              value={userAnswer}
              onChange={setUserAnswer}
              onSubmit={handleSubmitAnswer}
              placeholder="Explain your thought process, architectural choices, and coding implementations in detail..."
              maxLength={1000}
              isDisabled={submitAnswerMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
            <button 
              type="button"
              onClick={handleSkipQuestion}
              disabled={skipQuestionMutation.isPending}
              className="px-4 py-2 text-text-muted hover:text-text-prim font-bold text-xs rounded-xl cursor-none disabled:opacity-50 transition-all neo-raised neo-raised-hover neo-raised-active"
            >
              Skip Question
            </button>
            
            <button 
              type="button"
              onClick={handleSubmitAnswer}
              disabled={submitAnswerMutation.isPending}
              className="px-5 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer select-none disabled:opacity-50 neo-raised neo-raised-hover neo-raised-active"
            >
              {submitAnswerMutation.isPending ? (
                <>
                  <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* 5. Feedback Sheet Bottom/Right Drawer */}
      {showFeedbackSheet && lastFeedback && (
        <FeedbackSheet
          isOpen={showFeedbackSheet}
          onClose={handleNextQuestion}
          onNext={handleNextQuestion}
          score={lastFeedback.score || 0}
          feedback={lastFeedback.feedback || {}}
          isLastQuestion={isLastQuestion}
        />
      )}

      {/* Skip Question Confirmation AlertDialog */}
      <AlertDialog open={isSkipConfirmOpen} onOpenChange={setIsSkipConfirmOpen}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 md:p-8 space-y-6 max-w-md w-full neo-raised">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle className="text-base font-heading font-extrabold text-text-prim">
              Skip Question?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-sec leading-relaxed">
              Are you sure you want to skip this question? This counts towards your session skips limit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 pt-4 border-t border-zinc-900">
            <AlertDialogCancel className="px-4 py-2.5 text-text-muted hover:text-text-prim rounded-xl text-xs font-bold transition-all select-none cursor-pointer neo-raised neo-raised-hover neo-raised-active">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSkipQuestion}
              className="px-5 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active"
            >
              Skip Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Interview Confirmation AlertDialog */}
      <AlertDialog open={isEndConfirmOpen} onOpenChange={setIsEndConfirmOpen}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 md:p-8 space-y-6 max-w-md w-full neo-raised">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle className="text-base font-heading font-extrabold text-text-prim">
              End Practice Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-sec leading-relaxed">
              Are you sure you want to end this interview? You will lose any unanswered questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 pt-4 border-t border-zinc-900">
            <AlertDialogCancel className="px-4 py-2.5 text-text-muted hover:text-text-prim rounded-xl text-xs font-bold transition-all select-none cursor-pointer neo-raised neo-raised-hover neo-raised-active">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsEndConfirmOpen(false);
                handleEndSession();
              }}
              className="px-5 py-2.5 text-zinc-350 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer select-none hover:bg-zinc-800"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}