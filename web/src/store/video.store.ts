import { create } from 'zustand';

interface MetricSnapshot {
  posture: number;
  eyeContact: number;
  composite: number;
  timestamp: number;
}

interface VideoState {
  activeSessionId: string | null;
  postureScore: number;
  eyeContactScore: number;
  dominantEmotion: string;
  coachingTip: string | null;
  currentQuestion: string | null;
  compositeScore: number;
  
  // Enhanced fields
  sessionStartTime: number | null;     // Unix timestamp when session started
  metricsHistory: MetricSnapshot[];    // Rolling history for trend detection
  speakingPace: number;               // Estimated WPM
  confidenceLevel: number;            // 0-100 derived from emotion
  coachTipCount: number;              // Total coaching tips shown
  emotionConfidence: number;          // Raw emotion confidence 0-1
  
  setSessionId: (id: string | null) => void;
  updateMetrics: (metrics: { posture: number; eyeContact: number; emotion: string; composite: number; emotionConfidence?: number }) => void;
  setCoachingTip: (tip: string | null) => void;
  setCurrentQuestion: (question: string | null) => void;
  setSessionStartTime: (time: number) => void;
  updateSpeakingPace: (wpm: number) => void;
  incrementCoachTipCount: () => void;
  resetStore: () => void;
}

const MAX_HISTORY = 30;

export const useVideoStore = create<VideoState>((set, get) => ({
  activeSessionId: null,
  postureScore: 100,
  eyeContactScore: 100,
  dominantEmotion: 'neutral',
  coachingTip: null,
  currentQuestion: null,
  compositeScore: 100,
  sessionStartTime: null,
  metricsHistory: [],
  speakingPace: 0,
  confidenceLevel: 80,
  coachTipCount: 0,
  emotionConfidence: 0.5,
  
  setSessionId: (id) => set({ activeSessionId: id }),
  
  updateMetrics: (metrics) => {
    const state = get();
    const snapshot: MetricSnapshot = {
      posture: metrics.posture,
      eyeContact: metrics.eyeContact,
      composite: metrics.composite,
      timestamp: Date.now(),
    };
    
    // Derive confidence level from emotion
    const positiveEmotions = ['neutral', 'confident', 'happy', 'calm'];
    const emotionBonus = positiveEmotions.includes(metrics.emotion.toLowerCase()) ? 20 : 0;
    const rawConfidence = metrics.emotionConfidence ?? state.emotionConfidence;
    const confidenceLevel = Math.min(100, Math.round(rawConfidence * 70 + emotionBonus));
    
    const newHistory = [...state.metricsHistory, snapshot].slice(-MAX_HISTORY);
    
    set({
      postureScore: metrics.posture,
      eyeContactScore: metrics.eyeContact,
      dominantEmotion: metrics.emotion,
      compositeScore: metrics.composite,
      metricsHistory: newHistory,
      confidenceLevel,
      emotionConfidence: rawConfidence,
    });
  },
  
  setCoachingTip: (tip) => {
    if (tip) {
      set((state) => ({ coachingTip: tip, coachTipCount: state.coachTipCount + 1 }));
    } else {
      set({ coachingTip: tip });
    }
  },
  
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setSessionStartTime: (time) => set({ sessionStartTime: time }),
  updateSpeakingPace: (wpm) => set({ speakingPace: wpm }),
  incrementCoachTipCount: () => set((state) => ({ coachTipCount: state.coachTipCount + 1 })),
  
  resetStore: () => set({
    activeSessionId: null,
    postureScore: 100,
    eyeContactScore: 100,
    dominantEmotion: 'neutral',
    coachingTip: null,
    currentQuestion: null,
    compositeScore: 100,
    sessionStartTime: null,
    metricsHistory: [],
    speakingPace: 0,
    confidenceLevel: 80,
    coachTipCount: 0,
    emotionConfidence: 0.5,
  })
}));