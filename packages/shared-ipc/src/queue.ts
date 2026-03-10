/**
 * IPC Message Queue with Retry Logic
 *
 * Provides reliable message delivery with:
 * - Exponential backoff retry strategy
 * - Dead letter queue for failed messages
 * - Message persistence (optional)
 * - Priority queue support
 * - Automatic cleanup of old messages
 */

import { v4 as uuidv4 } from 'uuid';
import { IPCMessage, ipcMessageSchema } from './schemas.js';

export interface QueuedMessage {
  id: string;
  message: IPCMessage;
  attempts: number;
  maxAttempts: number;
  nextRetryTime: number;
  priority: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface MessageQueueOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  enablePersistence?: boolean;
  deadLetterQueueSize?: number;
}

export interface MessageQueueStats {
  pending: number;
  inFlight: number;
  succeeded: number;
  failed: number;
  deadLetter: number;
}

export class IPCMessageQueue {
  private queue: Map<string, QueuedMessage> = new Map();
  private deadLetterQueue: QueuedMessage[] = [];
  private inFlightMessages: Set<string> = new Set();
  private stats = {
    succeeded: 0,
    failed: 0,
  };

  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly enablePersistence: boolean;
  private readonly deadLetterQueueSize: number;

  private retryTimer: NodeJS.Timeout | null = null;
  private readonly PERSISTENCE_KEY = 'ipc_message_queue';

  constructor(options: MessageQueueOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000; // 1 second
    this.maxDelayMs = options.maxDelayMs ?? 30000; // 30 seconds
    this.enablePersistence = options.enablePersistence ?? false;
    this.deadLetterQueueSize = options.deadLetterQueueSize ?? 100;

    // Load persisted messages if enabled
    if (this.enablePersistence) {
      this.loadFromStorage();
    }

    // Start retry processor
    this.startRetryProcessor();
  }

  /**
   * Enqueue a message for sending
   */
  enqueue(message: IPCMessage, priority = 0): string {
    // Validate message with Zod
    const validationResult = ipcMessageSchema.safeParse(message);
    if (!validationResult.success) {
      throw new Error(`Invalid IPC message: ${validationResult.error.message}`);
    }

    const queuedMessage: QueuedMessage = {
      id: uuidv4(),
      message: validationResult.data,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      nextRetryTime: Date.now(),
      priority,
      createdAt: Date.now(),
    };

    this.queue.set(queuedMessage.id, queuedMessage);

    // Persist if enabled
    if (this.enablePersistence) {
      this.saveToStorage();
    }

    return queuedMessage.id;
  }

  /**
   * Get next message to send (sorted by priority and retry time)
   */
  private getNextMessage(): QueuedMessage | null {
    const now = Date.now();
    const candidates = Array.from(this.queue.values())
      .filter(msg => !this.inFlightMessages.has(msg.id))
      .filter(msg => msg.nextRetryTime <= now)
      .sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Earlier retry time first
        return a.nextRetryTime - b.nextRetryTime;
      });

    return candidates[0] ?? null;
  }

  /**
   * Process a message (attempt to send)
   */
  async processNext(
    sendFn: (message: IPCMessage) => Promise<void>
  ): Promise<boolean> {
    const queuedMessage = this.getNextMessage();
    if (!queuedMessage) {
      return false;
    }

    this.inFlightMessages.add(queuedMessage.id);
    queuedMessage.attempts++;
    queuedMessage.lastAttemptAt = Date.now();

    try {
      // Attempt to send message
      await sendFn(queuedMessage.message);

      // Success - remove from queue
      this.queue.delete(queuedMessage.id);
      this.inFlightMessages.delete(queuedMessage.id);
      this.stats.succeeded++;

      // Persist if enabled
      if (this.enablePersistence) {
        this.saveToStorage();
      }

      return true;
    } catch (error) {
      // Failed - handle retry or move to dead letter queue
      this.inFlightMessages.delete(queuedMessage.id);
      queuedMessage.error = error instanceof Error ? error.message : String(error);

      if (queuedMessage.attempts >= queuedMessage.maxAttempts) {
        // Max attempts reached - move to dead letter queue
        this.moveToDeadLetterQueue(queuedMessage);
        this.queue.delete(queuedMessage.id);
        this.stats.failed++;
      } else {
        // Schedule retry with exponential backoff
        const delay = this.calculateBackoff(queuedMessage.attempts);
        queuedMessage.nextRetryTime = Date.now() + delay;
      }

      // Persist if enabled
      if (this.enablePersistence) {
        this.saveToStorage();
      }

      return false;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempts: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempts - 1);
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.min(delay + jitter, this.maxDelayMs);
  }

  /**
   * Move message to dead letter queue
   */
  private moveToDeadLetterQueue(queuedMessage: QueuedMessage): void {
    this.deadLetterQueue.push(queuedMessage);

    // Trim dead letter queue if it exceeds size limit
    if (this.deadLetterQueue.length > this.deadLetterQueueSize) {
      this.deadLetterQueue.shift();
    }
  }

  /**
   * Start automatic retry processor
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(() => {
      const nextMessage = this.getNextMessage();
      if (nextMessage) {
        // Trigger processing (caller should handle via processNext)
        this.emit('message-ready', nextMessage.id);
      }
    }, 1000); // Check every second
  }

  /**
   * Stop retry processor
   */
  stop(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): MessageQueueStats {
    return {
      pending: this.queue.size,
      inFlight: this.inFlightMessages.size,
      succeeded: this.stats.succeeded,
      failed: this.stats.failed,
      deadLetter: this.deadLetterQueue.length,
    };
  }

  /**
   * Get all pending messages
   */
  getPendingMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): QueuedMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry a message from dead letter queue
   */
  retryDeadLetter(messageId: string): boolean {
    const index = this.deadLetterQueue.findIndex(msg => msg.id === messageId);
    if (index === -1) {
      return false;
    }

    const [message] = this.deadLetterQueue.splice(index, 1);
    if (!message) return false;

    message.attempts = 0;
    message.nextRetryTime = Date.now();
    message.error = undefined;

    this.queue.set(message.id, message);

    if (this.enablePersistence) {
      this.saveToStorage();
    }

    return true;
  }

  /**
   * Clear all messages from queue
   */
  clear(): void {
    this.queue.clear();
    this.inFlightMessages.clear();

    if (this.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];

    if (this.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Save queue state to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const state = {
        queue: Array.from(this.queue.entries()),
        deadLetterQueue: this.deadLetterQueue,
        stats: this.stats,
      };
      localStorage.setItem(this.PERSISTENCE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist message queue:', error);
    }
  }

  /**
   * Load queue state from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.PERSISTENCE_KEY);
      if (!stored) return;

      const state = JSON.parse(stored);
      this.queue = new Map(state.queue);
      this.deadLetterQueue = state.deadLetterQueue ?? [];
      this.stats = state.stats ?? { succeeded: 0, failed: 0 };
    } catch (error) {
      console.error('Failed to load persisted message queue:', error);
    }
  }

  /**
   * Simple event emitter for message-ready events
   */
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      return;
    }
    callbacks.push(callback);
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}
