import type { Logger } from '@vibetech/mcp-core';
import { noopLogger } from '@vibetech/mcp-core';

/**
 * Message type for transport
 */
export interface TransportMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Mock transport options
 */
export interface MockTransportOptions {
  /** Simulate latency in ms */
  latency?: number;
  /** Error rate (0-1) for simulating failures */
  errorRate?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Mock transport for testing MCP communication
 */
export class MockTransport {
  private messageQueue: TransportMessage[] = [];
  private responseHandlers = new Map<string | number, (msg: TransportMessage) => void>();
  private options: Required<MockTransportOptions>;
  private logger: Logger;
  private connected = false;
  private messageId = 0;

  constructor(options: MockTransportOptions = {}) {
    this.options = {
      latency: options.latency ?? 0,
      errorRate: options.errorRate ?? 0,
      logger: options.logger ?? noopLogger,
    };
    this.logger = this.options.logger;
  }

  /**
   * Connect the transport
   */
  async connect(): Promise<void> {
    await this.simulateLatency();
    this.connected = true;
    this.logger.info('Transport connected');
  }

  /**
   * Disconnect the transport
   */
  async disconnect(): Promise<void> {
    await this.simulateLatency();
    this.connected = false;
    this.messageQueue = [];
    this.responseHandlers.clear();
    this.logger.info('Transport disconnected');
  }

  /**
   * Send a message and wait for response
   */
  async send(message: Omit<TransportMessage, 'jsonrpc' | 'id'>): Promise<TransportMessage> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    // Simulate random errors
    if (Math.random() < this.options.errorRate) {
      throw new Error('Simulated transport error');
    }

    const id = ++this.messageId;
    const fullMessage: TransportMessage = {
      jsonrpc: '2.0',
      id,
      ...message,
    };

    await this.simulateLatency();
    
    this.logger.debug('Sending message', { id, method: message.method });
    this.messageQueue.push(fullMessage);

    // Return a promise that resolves when response is received
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(id);
        reject(new Error('Response timeout'));
      }, 30000);

      this.responseHandlers.set(id, (response) => {
        clearTimeout(timeout);
        this.responseHandlers.delete(id);
        resolve(response);
      });
    });
  }

  /**
   * Simulate receiving a response
   */
  receiveResponse(id: string | number, result?: unknown, error?: TransportMessage['error']): void {
    const handler = this.responseHandlers.get(id);
    if (handler) {
      const response: TransportMessage = {
        jsonrpc: '2.0',
        id,
        result,
        error,
      };
      handler(response);
    }
  }

  /**
   * Get pending messages
   */
  getPendingMessages(): TransportMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Clear pending messages
   */
  clearPendingMessages(): void {
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get pending response count
   */
  getPendingResponseCount(): number {
    return this.responseHandlers.size;
  }

  private async simulateLatency(): Promise<void> {
    if (this.options.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.latency));
    }
  }
}

/**
 * Create a pair of connected mock transports (client/server)
 */
export function createTransportPair(options?: MockTransportOptions): {
  client: MockTransport;
  server: MockTransport;
} {
  const client = new MockTransport(options);
  const server = new MockTransport(options);
  return { client, server };
}
