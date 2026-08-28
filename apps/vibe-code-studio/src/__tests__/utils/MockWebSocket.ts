import type { WebSocketLike } from '../../services/lsp/lspClient';

/**
 * Minimal WebSocket fake for LSP client tests. Records sent frames and lets a
 * test drive the lifecycle (open/message/close/error).
 */
export class MockWebSocket implements WebSocketLike {
  static instances: MockWebSocket[] = [];

  url: string;
  sent: string[] = [];
  closed = false;
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  // --- test drivers ---
  open(): void {
    this.onopen?.();
  }

  receive(message: unknown): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.onmessage?.({ data });
  }

  fireError(): void {
    this.onerror?.();
  }

  sentMessages(): Array<Record<string, unknown>> {
    return this.sent.map(frame => JSON.parse(frame) as Record<string, unknown>);
  }

  sentMethods(): string[] {
    return this.sentMessages()
      .map(message => message.method)
      .filter((method): method is string => typeof method === 'string');
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }

  static last(): MockWebSocket {
    const instance = MockWebSocket.instances.at(-1);
    if (!instance) throw new Error('No MockWebSocket created');
    return instance;
  }
}
