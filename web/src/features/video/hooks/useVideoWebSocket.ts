import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { useVideoStore } from '../../../store/video.store';

export function useVideoWebSocket(sessionId: string | undefined, videoRef: React.RefObject<HTMLVideoElement | null>) {
  const token = useAuthStore((state) => state.token);
  const updateMetrics = useVideoStore((state) => state.updateMetrics);
  const setCoachingTip = useVideoStore((state) => state.setCoachingTip);
  const setCurrentQuestion = useVideoStore((state) => state.setCurrentQuestion);
  
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<{ grade: number; feedback: string } | null>(null);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [questionIndex, setQuestionIndex] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  const wsFramesRef = useRef<WebSocket | null>(null);
  const wsCoachRef = useRef<WebSocket | null>(null);
  const wsQuestionsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<any>(null);

  // Hidden canvas for frame capture
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sendAnswer = useCallback((answerText: string) => {
    if (wsQuestionsRef.current && wsQuestionsRef.current.readyState === WebSocket.OPEN) {
      setIsEvaluatingAnswer(true);
      wsQuestionsRef.current.send(JSON.stringify({ answer: answerText }));
    }
  }, []);

  const requestNextQuestion = useCallback(() => {
    if (wsQuestionsRef.current && wsQuestionsRef.current.readyState === WebSocket.OPEN) {
      wsQuestionsRef.current.send(JSON.stringify({ action: 'next' }));
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;

    // Build WebSocket Base Host URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const baseHost = rawApiUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
    
    // Sockets endpoints
    const framesUrl = `${wsProtocol}//${baseHost}/ws/video-interview/${sessionId}/frames?token=${token}`;
    const coachUrl = `${wsProtocol}//${baseHost}/ws/video-interview/${sessionId}/coach?token=${token}`;
    const questionsUrl = `${wsProtocol}//${baseHost}/ws/video-interview/${sessionId}/questions?token=${token}`;

    // 1. Frames Socket setup
    const wsFrames = new WebSocket(framesUrl);
    wsFramesRef.current = wsFrames;

    wsFrames.onopen = () => {
      console.log('Video Frames WebSocket connected.');
      
      // Start capturing and sending frames every 500ms
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }
      
      frameIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (blob && wsFrames.readyState === WebSocket.OPEN) {
                wsFrames.send(blob);
              }
            }, 'image/jpeg', 0.6); // Compressed JPEG blob
          }
        }
      }, 500);
    };

    wsFrames.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.coaching_alert) {
          setCoachingTip(data.coaching_alert);
        }

        // Get current state to keep unchanged values
        const currentMetrics = useVideoStore.getState();

        let postureVal = currentMetrics.postureScore;
        if (data.posture_score !== null && data.posture_score !== undefined) {
          postureVal = Math.round(data.posture_score * 100);
        } else if (data.posture_feedback) {
          postureVal = data.posture_feedback.toLowerCase().includes('slouched') ? 65 : 88;
        }

        let gazeVal = currentMetrics.eyeContactScore;
        if (data.gaze_score !== null && data.gaze_score !== undefined) {
          gazeVal = Math.round(data.gaze_score * 100);
        } else if (data.gaze_feedback) {
          gazeVal = data.gaze_feedback.toLowerCase().includes('poor') ? 60 : 92;
        }

        let emotionVal = currentMetrics.dominantEmotion;
        if (data.emotion_label) {
          emotionVal = data.emotion_label;
        } else if (data.emotion_feedback) {
          const lower = data.emotion_feedback.toLowerCase();
          if (lower.includes('happy') || lower.includes('smile')) emotionVal = 'happy';
          else if (lower.includes('confident') || lower.includes('positive')) emotionVal = 'confident';
          else if (lower.includes('nervous') || lower.includes('anxious') || lower.includes('frown')) emotionVal = 'nervous';
        }

        const compositeVal = data.composite_score !== undefined && data.composite_score !== null
          ? Math.round(data.composite_score * 10)
          : currentMetrics.compositeScore;

        updateMetrics({
          posture: postureVal,
          eyeContact: gazeVal,
          emotion: emotionVal,
          composite: compositeVal
        });
      } catch (err) {
        console.error('Error parsing frame feedback data:', err);
      }
    };

    wsFrames.onclose = () => {
      console.log('Video Frames WebSocket disconnected.');
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };

    // 2. Coach Socket setup
    const wsCoach = new WebSocket(coachUrl);
    wsCoachRef.current = wsCoach;
    wsCoach.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'coaching_tip') {
          setCoachingTip(data.tip);
        }
      } catch (err) {
        console.error('Error parsing coaching tip:', err);
      }
    };

    // 3. Questions Socket setup
    const wsQuestions = new WebSocket(questionsUrl);
    wsQuestionsRef.current = wsQuestions;
    wsQuestions.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'question') {
          setActiveQuestion(data.question);
          setCurrentQuestion(data.question);
          if (data.index !== undefined) setQuestionIndex(data.index);
          if (data.total !== undefined) setTotalQuestions(data.total);
          setEvaluationFeedback(null);
          setIsEvaluatingAnswer(false);
        } else if (data.type === 'evaluation') {
          setEvaluationFeedback({
            grade: data.grade,
            feedback: data.feedback
          });
          setIsEvaluatingAnswer(false);
        }
      } catch (err) {
        console.error('Error parsing questions event:', err);
      }
    };

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      wsFrames.close();
      wsCoach.close();
      wsQuestions.close();
    };
  }, [sessionId, token, videoRef, updateMetrics, setCoachingTip, setCurrentQuestion]);

  return {
    activeQuestion,
    evaluationFeedback,
    isEvaluatingAnswer,
    questionIndex,
    totalQuestions,
    sendAnswer,
    requestNextQuestion,
  };
}