import { WebSocketServer, WebSocket } from 'ws';
import type { StreamTopic, StreamMessage } from '../shared/types';

export interface WsHubOptions {
  port: number;
  host?: string;
}

export class WsHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private readonly port: number;
  private readonly host: string;

  constructor(opts: WsHubOptions) {
    this.port = opts.port;
    this.host = opts.host ?? '127.0.0.1';
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: this.host });
      this.wss.once('listening', () => resolve());
      this.wss.once('error', reject);
      this.wss.on('connection', (sock) => {
        this.clients.add(sock);
        sock.on('close', () => this.clients.delete(sock));
        sock.on('error', () => this.clients.delete(sock));
      });
    });
  }

  async stop(): Promise<void> {
    for (const c of this.clients) { try { c.close(); } catch {} }
    this.clients.clear();
    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
    this.wss = null;
  }

  broadcast(topic: StreamTopic, payload: unknown): void {
    if (this.clients.size === 0) return;
    const msg: StreamMessage = { topic, payload, timestamp: Date.now() };
    const json = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(json); } catch { /* ignore */ }
      }
    }
  }

  get clientCount(): number { return this.clients.size; }
}
