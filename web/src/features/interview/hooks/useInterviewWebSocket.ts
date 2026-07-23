import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface WSQuestionPayload {
  question_id: string;
  question_text: string;
  order_index: number;
}

interface WSScoringPayload {
  question_id: string;
  score: number;
  feedback: string;
}

interface WSFinishedPayload {
  message: string;
  overall_score: number;
}

export function useInterviewWebSocket(
  sessionId: string,
  onQuestion: (question: WSQuestionPayload) => void,
  onScoring: (scoring: WSScoringPayload) => void,
  onFinished: (finished: WSFinishedPayload) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((state) => state.token);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId || !token) return;

    // Build absolute WS URL
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.host;
    const wsProto = isHttps ? 'wss:' : 'ws:';
    
    // Fallback support if on local dev port 5173 but backend on 8000
    const backendHost = host.includes('5173') ? host.replace('5173', '8000') : host;
    const wsUrl = `${wsProto}//${backendHost}/ws/interview/${sessionId}?token=${token}`;

    console.log('Connecting to interview WS:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Interview WS Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Interview WS Message:', message);
        
        switch (message.type) {
          case 'question':
            onQuestion(message.payload);
            break;
          case 'scoring':
            onScoring(message.payload);
            break;
          case 'finished':
            onFinished(message.payload);
            break;
          default:
            console.warn('Unhandled WS message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('Interview WS Disconnected', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('Interview WS Error:', err);
    };

    return () => {
      console.log('Cleaning up interview WS connection');
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, token, onQuestion, onScoring, onFinished]);

  const sendAnswer = useCallback((answerText: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'answer',
          payload: {
            answer_text: answerText,
          },
        })
      );
      return true;
    }
    console.warn('Cannot send answer, WS not open');
    return false;
  }, []);

  return {
    isConnected,
    sendAnswer,
  };
}