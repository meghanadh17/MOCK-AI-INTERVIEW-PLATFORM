import { useEffect } from 'react';
import { WebSocketClient } from '../api/websocket.client';
export function useWebSocket(url: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    const ws = new WebSocketClient(url);
    ws.connect(onMessage);
    return () => ws.disconnect();
  }, [url, onMessage]);
}