/**
 * Tests for IPC Message Queue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IPCMessageQueue } from '../src/queue';
import { IPCMessageType } from '../src/schemas';

describe('IPCMessageQueue', () => {
  let queue: IPCMessageQueue;

  beforeEach(() => {
    queue = new IPCMessageQueue({
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      enablePersistence: false,
    });
  });

  afterEach(() => {
    queue.stop();
  });

  describe('enqueue', () => {
    it('should enqueue a valid message', () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: {
          filePath: '/test.ts',
        },
      };

      const id = queue.enqueue(message);
      expect(id).toBeTruthy();

      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });

    it('should reject invalid message', () => {
      const invalidMessage = {
        messageId: '',  // Invalid: empty string
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'invalid' as any,
        payload: {},
      };

      expect(() => queue.enqueue(invalidMessage as any)).toThrow('Invalid IPC message');
    });

    it('should handle priority ordering', () => {
      const msg1 = {
        messageId: 'low-priority',
        type: IPCMessageType.PING,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: {},
      };

      const msg2 = {
        messageId: 'high-priority',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(msg1, 0); // Low priority
      queue.enqueue(msg2, 10); // High priority

      const pending = queue.getPendingMessages();
      expect(pending).toHaveLength(2);
    });
  });

  describe('processNext', () => {
    it('should successfully process a message', async () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(message);

      const sendFn = vi.fn().mockResolvedValue(undefined);
      const result = await queue.processNext(sendFn);

      expect(result).toBe(true);
      expect(sendFn).toHaveBeenCalledWith(message);

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.succeeded).toBe(1);
    });

    it('should retry failed messages with exponential backoff', async () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(message);

      // Fail first 2 attempts
      const sendFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      // First attempt
      await queue.processNext(sendFn);
      expect(sendFn).toHaveBeenCalledTimes(1);

      const pending1 = queue.getPendingMessages();
      expect(pending1).toHaveLength(1);
      expect(pending1[0].attempts).toBe(1);

      // Wait for retry (needs to exceed nextRetryTime)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second attempt
      await queue.processNext(sendFn);
      expect(sendFn).toHaveBeenCalledTimes(2);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Third attempt (success)
      await queue.processNext(sendFn);
      expect(sendFn).toHaveBeenCalledTimes(3);

      const stats = queue.getStats();
      expect(stats.succeeded).toBe(1);
      expect(stats.pending).toBe(0);
    });

    it('should move to dead letter queue after max attempts', async () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(message);

      const sendFn = vi.fn().mockRejectedValue(new Error('Permanent error'));

      // Attempt 1
      await queue.processNext(sendFn);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Attempt 2
      await queue.processNext(sendFn);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Attempt 3 (final)
      await queue.processNext(sendFn);

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(1);
      expect(stats.deadLetter).toBe(1);

      const deadLetterQueue = queue.getDeadLetterQueue();
      expect(deadLetterQueue).toHaveLength(1);
      expect(deadLetterQueue[0].error).toContain('Permanent error');
    });

    it('should return false when queue is empty', async () => {
      const sendFn = vi.fn();
      const result = await queue.processNext(sendFn);

      expect(result).toBe(false);
      expect(sendFn).not.toHaveBeenCalled();
    });
  });

  describe('retryDeadLetter', () => {
    it('should move message from dead letter queue back to main queue', async () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      const messageId = queue.enqueue(message);

      // Fail all attempts to move to dead letter
      const sendFn = vi.fn().mockRejectedValue(new Error('Error'));
      await queue.processNext(sendFn);
      await new Promise(resolve => setTimeout(resolve, 150));
      await queue.processNext(sendFn);
      await new Promise(resolve => setTimeout(resolve, 300));
      await queue.processNext(sendFn);

      expect(queue.getStats().deadLetter).toBe(1);

      // Retry from dead letter
      const retried = queue.retryDeadLetter(messageId);
      expect(retried).toBe(true);

      expect(queue.getStats().deadLetter).toBe(0);
      expect(queue.getStats().pending).toBe(1);

      // Should succeed this time
      const successFn = vi.fn().mockResolvedValue(undefined);
      await queue.processNext(successFn);

      expect(queue.getStats().succeeded).toBe(1);
    });
  });

  describe('statistics', () => {
    it('should track queue statistics', async () => {
      const msg1 = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test1.ts' },
      };

      const msg2 = {
        messageId: 'test-2',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test2.ts' },
      };

      queue.enqueue(msg1);
      queue.enqueue(msg2);

      const initialStats = queue.getStats();
      expect(initialStats.pending).toBe(2);
      expect(initialStats.succeeded).toBe(0);
      expect(initialStats.failed).toBe(0);

      // Process first (success)
      const successFn = vi.fn().mockResolvedValue(undefined);
      await queue.processNext(successFn);

      const afterSuccess = queue.getStats();
      expect(afterSuccess.pending).toBe(1);
      expect(afterSuccess.succeeded).toBe(1);

      // Process second (fail all attempts)
      const failFn = vi.fn().mockRejectedValue(new Error('Error'));
      await queue.processNext(failFn);
      await new Promise(resolve => setTimeout(resolve, 150));
      await queue.processNext(failFn);
      await new Promise(resolve => setTimeout(resolve, 300));
      await queue.processNext(failFn);

      const finalStats = queue.getStats();
      expect(finalStats.pending).toBe(0);
      expect(finalStats.succeeded).toBe(1);
      expect(finalStats.failed).toBe(1);
      expect(finalStats.deadLetter).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all pending messages', () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(message);
      queue.enqueue(message);
      queue.enqueue(message);

      expect(queue.getStats().pending).toBe(3);

      queue.clear();

      expect(queue.getStats().pending).toBe(0);
    });

    it('should clear dead letter queue', async () => {
      const message = {
        messageId: 'test-1',
        type: IPCMessageType.FILE_OPEN,
        timestamp: Date.now(),
        source: 'nova' as const,
        version: '1.0.0',
        payload: { filePath: '/test.ts' },
      };

      queue.enqueue(message);

      // Move to dead letter
      const failFn = vi.fn().mockRejectedValue(new Error('Error'));
      await queue.processNext(failFn);
      await new Promise(resolve => setTimeout(resolve, 150));
      await queue.processNext(failFn);
      await new Promise(resolve => setTimeout(resolve, 300));
      await queue.processNext(failFn);

      expect(queue.getStats().deadLetter).toBe(1);

      queue.clearDeadLetterQueue();

      expect(queue.getStats().deadLetter).toBe(0);
    });
  });
});
