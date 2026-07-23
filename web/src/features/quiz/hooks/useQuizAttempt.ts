import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizStore } from '@/store/quiz.store';
import { quizApi } from '@/api/quiz.api';
import { useQuizWebSocket } from './useQuizWebSocket';
import { toast } from 'sonner';

export function useQuizAttempt(quizId: string) {
  const navigate = useNavigate();
  const store = useQuizStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize WebSocket connection using attemptId if available
  const { isConnected: isWsConnected, sendAnswer: sendWsAnswer } = useQuizWebSocket(
    store.attemptId || ''
  );

  // Load quiz details and start attempt on mount
  useEffect(() => {
    let active = true;

    async function initAttempt() {
      if (!quizId) return;
      try {
        setIsLoading(true);
        // 1. Get Quiz details
        const quizDetails = await quizApi.getQuizDetails(quizId);
        
        // 2. Start attempt API call
        const attemptRes = await quizApi.startAttempt(quizId);
        
        if (active) {
          store.startAttemptState(
            quizDetails,
            attemptRes.attempt_id,
            attemptRes.time_limit_s || 300
          );
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize quiz attempt:', err);
        toast.error('Failed to start quiz attempt. Returning to home.');
        if (active) {
          navigate('/app/quiz');
        }
      }
    }

    initAttempt();

    return () => {
      active = false;
    };
  }, [quizId]);

  const currentQuestion = store.quizData?.questions[store.currentQuestionIndex] || null;
  const currentAnswer = currentQuestion ? store.selectedAnswers[currentQuestion.id] || '' : '';
  const currentGrade = currentQuestion ? store.submittedAnswers[currentQuestion.id] || null : null;
  const isCurrentFlagged = currentQuestion ? !!store.isFlagged[currentQuestion.id] : false;

  // Handles choosing an option
  const handleSelectOption = (option: string) => {
    if (currentQuestion && !currentGrade) {
      store.selectAnswer(currentQuestion.id, option);
    }
  };

  // Submit answer for the current question
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentAnswer || currentGrade || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      let response: any = null;

      // Try sending via WebSocket first if connected
      let sentViaWs = false;
      if (isWsConnected) {
        sentViaWs = sendWsAnswer(currentQuestion.id, currentAnswer);
      }

      if (sentViaWs) {
        // Wait briefly for the WS message to trigger the store response update
        let retries = 10;
        while (retries > 0 && !store.submittedAnswers[currentQuestion.id]) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          retries--;
        }
        response = store.submittedAnswers[currentQuestion.id];
      }

      // Fallback to REST if WS wasn't connected, failed, or timed out
      if (!response) {
        response = await quizApi.submitAnswer(quizId, {
          attempt_id: store.attemptId || '',
          question_id: currentQuestion.id,
          selected_answer: currentAnswer
        });
        store.submitAnswerResponse(currentQuestion.id, response);
      }

      setIsSubmitting(false);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      toast.error('Failed to submit answer. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Navigate to Next / Submit
  const handleNext = async () => {
    const questions = store.quizData?.questions || [];
    const isLast = store.currentQuestionIndex === questions.length - 1;

    if (!currentGrade) {
      await handleSubmitAnswer();
    }

    if (isLast) {
      await handleFinish();
    } else {
      store.nextQuestion();
    }
  };

  // Toggle flagging current question
  const handleToggleFlag = () => {
    if (currentQuestion) {
      store.flagQuestion(currentQuestion.id, !isCurrentFlagged);
    }
  };

  // Finishes attempt and navigates to results
  const handleFinish = async () => {
    if (!store.attemptId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await quizApi.finishAttempt(quizId, store.attemptId);
      
      const targetAttemptId = store.attemptId;
      store.resetState();
      
      setIsSubmitting(false);
      navigate(`/app/quiz/${quizId}/result/${targetAttemptId}`);
    } catch (err) {
      console.error('Failed to finish quiz attempt:', err);
      toast.error('Failed to finalize quiz attempt.');
      setIsSubmitting(false);
    }
  };

  return {
    isLoading,
    isSubmitting,
    quizTitle: store.quizData?.title || 'Practice Quiz',
    questionsCount: store.quizData?.questions.length || 0,
    currentQuestionIndex: store.currentQuestionIndex,
    currentQuestion,
    currentAnswer,
    currentGrade,
    isCurrentFlagged,
    timeLeft: store.timeLeft,
    rank: store.rank,
    handleSelectOption,
    handleNext,
    handlePrev: store.prevQuestion,
    handleToggleFlag,
    handleFinish
  };
}