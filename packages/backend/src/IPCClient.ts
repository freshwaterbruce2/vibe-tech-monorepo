import { IPCMessage, type AppSource } from '@vibetech/shared-ipc';
import WebSocket from 'ws';

export class IPCClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private shouldReconnect = true;
  private messageHandler: (message: IPCMessage) => Promise<void>;
  private source: AppSource;

  constructor(source: AppSource, url = 'ws://localhost:5004', messageHandler: (message: IPCMessage) => Promise<void>) {
    this.source = source;
    this.url = url;
    this.messageHandler = messageHandler;
  }

  public connect(): void {
    console.log(`Connecting to IPC Bridge at ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      console.log('Connected to IPC Bridge');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message: IPCMessage = JSON.parse(data.toString());
        void this.messageHandler(message);
      } catch (error) {
        console.error('Failed to parse IPC message', error);
      }
    });

    this.ws.on('close', () => {
      console.log('Disconnected from IPC Bridge');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  public send(message: IPCMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msgWithSource = { ...message, source: this.source };
      this.ws.send(JSON.stringify(msgWithSource));
    } else {
      console.warn('Cannot send message: Disconnected');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Exiting.');
      process.exit(1);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
