/**
 * WebSocket Bridge
 *
 * Real-time communication bridge between NOVA Agent and Vibe Code Studio
 * Uses WebSocket on port 5004 for bidirectional messaging
 */

import { createLogger } from '@vibetech/logger';
import type { IPCMessage, IPCMessageType } from './messages';
import { isValidIPCMessage } from './messages';

const logger = createLogger('WebSocketBridge');

export type MessageHandler = (message: IPCMessage) => void | Promise<void>;

export interface WebSocketBridgeConfig {
  port: number;
  host?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketBridge {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketBridgeConfig>;
  private handlers = new Map<IPCMessageType, Set<MessageHandler>>();
  private globalHandlers = new Set<MessageHandler>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private appSource: 'nova' | 'vibe';

  constructor(appSource: 'nova' | 'vibe', config: Partial<WebSocketBridgeConfig> = {}) {
    this.appSource = appSource;
    this.config = {
      port: config.port || 5004,
      host: config.host || 'localhost',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
    };
  }

  /**
   * Connect to the WebSocket bridge
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const url = `ws://${this.config.host}:${this.config.port}`;
      logger.info(`Connecting to ${url}...`);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          logger.info('Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', undefined, error instanceof Error ? error : new Error(String(error)));
          if (!this.connected) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          logger.info('Disconnected');
          this.connected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        logger.error('Connection failed', undefined, error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket bridge
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a message through the bridge
   */
  send(message: IPCMessage): void {
    if (!this.isConnected()) {
      logger.warn('Not connected, message not sent', { type: message.type });
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.ws!.send(json);
    } catch (error) {
      logger.error('Failed to send message', undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Register a handler for a specific message type
   */
  on(type: IPCMessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /**
   * Register a global handler for all messages
   */
  onAny(handler: MessageHandler): void {
    this.globalHandlers.add(handler);
  }

  /**
   * Unregister a handler
   */
  off(type: IPCMessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /**
   * Unregister a global handler
   */
  offAny(handler: MessageHandler): void {
    this.globalHandlers.delete(handler);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      if (!isValidIPCMessage(message)) {
        logger.warn('Invalid message received', { message });
        return;
      }

      // Don't process messages from ourselves
      if (message.source === this.appSource) {
        return;
      }

      logger.debug(`Received ${message.type} from ${message.source}`);

      // Call type-specific handlers
      const typeHandlers = this.handlers.get(message.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          try {
            await handler(message);
          } catch (error) {
            logger.error(`Handler error for ${message.type}`, undefined, error instanceof Error ? error : new Error(String(error)));
          }
        }
      }

      // Call global handlers
      for (const handler of this.globalHandlers) {
        try {
          await handler(message);
        } catch (error) {
          logger.error('Global handler error', undefined, error instanceof Error ? error : new Error(String(error)));
        }
      }
    } catch (error) {
      logger.error('Failed to parse message', undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(
      `Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('Reconnection failed', undefined, error instanceof Error ? error : new Error(String(error)));
      });
    }, this.config.reconnectInterval);
  }
}
