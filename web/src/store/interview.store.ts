import { create } from 'zustand';

interface InterviewState {
  activeSessionId: string | null;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  questions: any[];
  lastFeedback: any | null;
  setSessionId: (id: string | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setAnswers: (answers: Record<string, string>) => void;
  setQuestions: (questions: any[]) => void;
  setLastFeedback: (feedback: any) => void;
  startSession: (sessionId: string, questions: any[]) => void;
  endSession: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  activeSessionId: null,
  currentQuestionIndex: 0,
  answers: {},
  questions: [],
  lastFeedback: null,
  setSessionId: (id) => set({ activeSessionId: id }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setAnswers: (answers) => set({ answers }),
  setQuestions: (questions) => set({ questions }),
  setLastFeedback: (feedback) => set({ lastFeedback: feedback }),
  startSession: (sessionId, questions) => 
    set({ 
      activeSessionId: sessionId, 
      questions, 
      currentQuestionIndex: 0, 
      answers: {}, 
      lastFeedback: null 
    }),
  endSession: () => 
    set({ 
      activeSessionId: null, 
      questions: [], 
      currentQuestionIndex: 0, 
      answers: {}, 
      lastFeedback: null 
    }),
}));