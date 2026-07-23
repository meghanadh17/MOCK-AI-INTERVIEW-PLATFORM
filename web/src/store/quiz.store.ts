import { create } from 'zustand';

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  order_index: number;
}

export interface QuizData {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  total_questions: number;
  time_limit_s?: number;
  questions: QuizQuestion[];
}

interface QuizState {
  currentQuizId: string | null;
  attemptId: string | null;
  quizData: QuizData | null;
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string>; // questionId -> optionText
  submittedAnswers: Record<string, any>; // questionId -> AnswerSubmitResponse
  isFlagged: Record<string, boolean>; // questionId -> boolean
  timeLeft: number;
  rank: number;
  
  // Actions
  startAttemptState: (quizData: QuizData, attemptId: string, timeLimitS: number) => void;
  selectAnswer: (questionId: string, answer: string) => void;
  submitAnswerResponse: (questionId: string, response: any) => void;
  flagQuestion: (questionId: string, flagged: boolean) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  syncTimer: (timeLeft: number, rank?: number) => void;
  resetState: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  currentQuizId: null,
  attemptId: null,
  quizData: null,
  currentQuestionIndex: 0,
  selectedAnswers: {},
  submittedAnswers: {},
  isFlagged: {},
  timeLeft: 0,
  rank: 1,

  startAttemptState: (quizData, attemptId, timeLimitS) => set({
    currentQuizId: quizData.id,
    attemptId,
    quizData,
    timeLeft: timeLimitS,
    currentQuestionIndex: 0,
    selectedAnswers: {},
    submittedAnswers: {},
    isFlagged: {},
    rank: 1
  }),

  selectAnswer: (questionId, answer) => set((state) => ({
    selectedAnswers: {
      ...state.selectedAnswers,
      [questionId]: answer
    }
  })),

  submitAnswerResponse: (questionId, response) => set((state) => ({
    submittedAnswers: {
      ...state.submittedAnswers,
      [questionId]: response
    }
  })),

  flagQuestion: (questionId, flagged) => set((state) => ({
    isFlagged: {
      ...state.isFlagged,
      [questionId]: flagged
    }
  })),

  nextQuestion: () => set((state) => {
    const total = state.quizData?.questions.length ?? 0;
    if (state.currentQuestionIndex < total - 1) {
      return { currentQuestionIndex: state.currentQuestionIndex + 1 };
    }
    return {};
  }),

  prevQuestion: () => set((state) => {
    if (state.currentQuestionIndex > 0) {
      return { currentQuestionIndex: state.currentQuestionIndex - 1 };
    }
    return {};
  }),

  syncTimer: (timeLeft, rank) => set((state) => ({
    timeLeft,
    rank: rank !== undefined ? rank : state.rank
  })),

  resetState: () => set({
    currentQuizId: null,
    attemptId: null,
    quizData: null,
    currentQuestionIndex: 0,
    selectedAnswers: {},
    submittedAnswers: {},
    isFlagged: {},
    timeLeft: 0,
    rank: 1
  })
}));