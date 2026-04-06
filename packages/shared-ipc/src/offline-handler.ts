/**
 * Offline Mode Handler
 *
 * Handles IPC bridge disconnections gracefully:
 * - Detects online/offline state
 * - Queues messages when offline
 * - Auto-reconnect with exponential backoff
 * - Flushes queue when connection restored
 * - Provides connection status updates
 */

import { createLogger } from '@vibetech/logger';
import { IPCMessage } from './schemas.js';
import { IPCMessageQueue } from './queue.js';

const logger = createLogger('OfflineHandler');

export interface OfflineHandlerOptions {
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  onConnectionChange?: (isConnected: boolean) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onQueuedMessagesChange?: (count: number) => void;
}

export class OfflineHandler {
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: IPCMessageQueue;

  private readonly reconnectIntervalMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly onConnectionChange?: (isConnected: boolean) => void;
  private readonly onReconnecting?: (attempt: number, maxAttempts: number) => void;
  private readonly onQueuedMessagesChange?: (count: number) => void;

  private websocket: WebSocket | null = null;
  private websocketUrl: string | null = null;

  constructor(options: OfflineHandlerOptions = {}) {
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.onConnectionChange = options.onConnectionChange;
    this.onReconnecting = options.onReconnecting;
    this.onQueuedMessagesChange = options.onQueuedMessagesChange;

    // Initialize message queue
    this.messageQueue = new IPCMessageQueue({
      maxAttempts: 5,
      baseDelayMs: 1000,
      enablePersistence: true,
    });

    // Listen for queue changes
    this.messageQueue.on('message-ready', () => {
      if (this.isConnected) {
        void this.flushQueue();
      }
    });
  }

  /**
   * Connect to IPC bridge
   */
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.websocketUrl = url;

      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          logger.info('Connected to IPC bridge');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          if (this.onConnectionChange) {
            this.onConnectionChange(true);
          }

          // Flush any queued messages
          void this.flushQueue();

          resolve();
        };

        this.websocket.onclose = () => {
          logger.info('Disconnected from IPC bridge');
          this.handleDisconnection();
        };

        this.websocket.onerror = (error) => {
          logger.error('WebSocket error', undefined, error instanceof Error ? error : new Error(String(error)));
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    if (!this.isConnected) return; // Already handling disconnection

    this.isConnected = false;
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }

    // Start reconnection attempts
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.calculateReconnectDelay(this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info('Reconnecting', { delayMs: delay, attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });

    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);
    }

    this.reconnectTimer = setTimeout(() => {
      if (this.websocketUrl) {
        this.connect(this.websocketUrl).catch(err => {
          logger.error('Reconnection failed', undefined, err instanceof Error ? err : new Error(String(err)));
          this.scheduleReconnect();
        });
      }
    }, delay);
  }

  /**
   * Calculate reconnect delay with exponential backoff
   */
  private calculateReconnectDelay(attempts: number): number {
    const baseDelay = this.reconnectIntervalMs;
    const delay = Math.min(baseDelay * Math.pow(2, attempts), 60000); // Max 60s
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return delay + jitter;
  }

  /**
   * Send message (queue if offline)
   */
  async sendMessage(message: IPCMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.websocket?.readyState === WebSocket.OPEN) {
        // Send directly
        try {
          this.websocket.send(JSON.stringify(message));
          resolve();
        } catch (error) {
          // Failed to send - queue it
          this.queueMessage(message);
          reject(error);
        }
      } else {
        // Queue for later
        this.queueMessage(message);
        resolve(); // Don't reject - message is queued
      }
    });
  }

  /**
   * Queue message for sending when connection restored
   */
  private queueMessage(message: IPCMessage): void {
    this.messageQueue.enqueue(message);

    if (this.onQueuedMessagesChange) {
      const stats = this.messageQueue.getStats();
      this.onQueuedMessagesChange(stats.pending);
    }
  }

  /**
   * Flush all queued messages
   */
  private async flushQueue(): Promise<void> {
    if (!this.isConnected || !this.websocket) return;

    const sendFn = async (message: IPCMessage) => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(message));
      } else {
        throw new Error('WebSocket not open');
      }
    };

    // Process all queued messages
    while (this.messageQueue.getStats().pending > 0) {
      const success = await this.messageQueue.processNext(sendFn);
      if (!success) {
        break; // Stop if processing failed
      }

      // Update UI
      if (this.onQueuedMessagesChange) {
        const stats = this.messageQueue.getStats();
        this.onQueuedMessagesChange(stats.pending);
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    queuedMessages: number;
    reconnectAttempts: number;
  } {
    const stats = this.messageQueue.getStats();
    return {
      isConnected: this.isConnected,
      queuedMessages: stats.pending,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Get queued messages count
   */
  getQueuedMessagesCount(): number {
    return this.messageQueue.getStats().pending;
  }

  /**
   * Clear all queued messages
   */
  clearQueue(): void {
    this.messageQueue.clear();

    if (this.onQueuedMessagesChange) {
      this.onQueuedMessagesChange(0);
    }
  }

  /**
   * Force disconnect
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
  }

  /**
   * Force reconnect attempt
   */
  reconnect(): void {
    if (this.websocketUrl) {
      this.connect(this.websocketUrl).catch(err => {
        logger.error('Manual reconnect failed', undefined, err instanceof Error ? err : new Error(String(err)));
      });
    }
  }
}
