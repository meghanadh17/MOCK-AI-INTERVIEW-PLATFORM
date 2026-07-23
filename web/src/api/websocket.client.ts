export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  constructor(url: string) {
    this.url = url;
  }
  connect(onMessage?: (msg: any) => void) {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => console.log('WS Connected');
    if (onMessage) {
      this.ws.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data));
        } catch {
          onMessage(event.data);
        }
      };
    }
  }
  disconnect() {
    this.ws?.close();
  }
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}