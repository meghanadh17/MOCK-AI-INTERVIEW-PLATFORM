import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useQuizStore } from '@/store/quiz.store';

export function useQuizWebSocket(attemptId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((state) => state.token);
  const syncTimer = useQuizStore((state) => state.syncTimer);
  const submitAnswerResponse = useQuizStore((state) => state.submitAnswerResponse);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!attemptId || !token) return;

    const isHttps = window.location.protocol === 'https:';
    const host = window.location.host;
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const backendHost = host.includes('5173') ? host.replace('5173', '8000') : host;
    const wsUrl = `${wsProto}//${backendHost}/ws/quiz/${attemptId}?token=${token}`;

    console.log('Connecting to quiz WS:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Quiz WS Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle timer ticks / rank sync
        if (message.time_left !== undefined) {
          syncTimer(message.time_left, message.rank);
        } else if (message.type === 'answer_result') {
          submitAnswerResponse(message.question_id, {
            question_id: message.question_id,
            is_correct: message.is_correct,
            correct_answer: message.correct_answer,
            explanation: message.explanation
          });
        }
      } catch (err) {
        console.error('Failed to parse quiz WS message:', err, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('Quiz WS Disconnected', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('Quiz WS Error:', err);
    };

    return () => {
      console.log('Closing quiz WS connection');
      ws.close();
      wsRef.current = null;
    };
  }, [attemptId, token, syncTimer, submitAnswerResponse]);

  const sendAnswer = useCallback((questionId: string, selectedAnswer: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'submit_answer',
          question_id: questionId,
          selected_answer: selectedAnswer
        })
      );
      return true;
    }
    console.warn('Cannot send answer, Quiz WS not open');
    return false;
  }, []);

  return {
    isConnected,
    sendAnswer
  };
}