import { IPCMessage, type AppSource } from '@vibetech/shared-ipc';
import WebSocket from 'ws';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('IPCClient');

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
    logger.info(`Connecting to IPC Bridge at ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      logger.info('Connected to IPC Bridge');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message: IPCMessage = JSON.parse(data.toString());
        void this.messageHandler(message);
      } catch (error) {
        logger.error('Failed to parse IPC message', undefined, error instanceof Error ? error : new Error(String(error)));
      }
    });

    this.ws.on('close', () => {
      logger.info('Disconnected from IPC Bridge');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error:', undefined, error instanceof Error ? error : new Error(String(error)));
    });
  }

  public send(message: IPCMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msgWithSource = { ...message, source: this.source };
      this.ws.send(JSON.stringify(msgWithSource));
    } else {
      logger.warn('Cannot send message: Disconnected');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached. Exiting.');
      process.exit(1);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    logger.info(`Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
