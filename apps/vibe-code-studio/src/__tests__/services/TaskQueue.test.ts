/**
 * TaskQueue Tests
 *
 * Covers enqueueing, priority processing, notifications, retry logic,
 * pause/resume/cancel, stats, history, and persistence round-trips.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskExecutor, TaskNotification, TaskResult } from '@vibetech/types';
import { TaskPriority, TaskStatus, TaskType } from '@vibetech/types';

import { logger } from '../../services/Logger';
import { TaskQueue } from '../../services/TaskQueue';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

type AnyWindow = Record<string, unknown>;

const okExecutor = (result: Partial<TaskResult> = {}): TaskExecutor => ({
  execute: vi.fn(async (_task, onProgress) => {
    onProgress({ current: 50, total: 100, percentage: 50, message: 'halfway' });
    return { success: true, ...result };
  }),
});

describe('TaskQueue', () => {
  let queue: TaskQueue;
  const queues: TaskQueue[] = [];

  const makeQueue = (options: ConstructorParameters<typeof TaskQueue>[0] = {}) => {
    const q = new TaskQueue({ enablePersistence: false, ...options });
    queues.push(q);
    return q;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Force the localStorage persistence path instead of the file-lifetime
    // electron store mock installed by global setup.
    delete (window as unknown as AnyWindow).electron;
    localStorage.removeItem('deepcode_task_queue');
    queue = makeQueue();
  });

  afterEach(() => {
    queues.splice(0).forEach(q => q.destroy());
    vi.useRealTimers();
  });

  describe('addTask', () => {
    it('queues a task with defaults and a UUID-based id', () => {
      const id = queue.addTask(TaskType.CUSTOM, 'Index files');

      expect(id).toMatch(new RegExp(`^task_${UUID_RE}$`));
      const task = queue.getTask(id);
      expect(task).toMatchObject({
        name: 'Index files',
        type: TaskType.CUSTOM,
        status: TaskStatus.QUEUED,
        priority: TaskPriority.NORMAL,
        cancelable: true,
        pausable: true,
        retryCount: 0,
      });
      expect(task?.progress).toEqual({ current: 0, total: 100, percentage: 0 });
    });

    it('notifies subscribers when a task is queued', () => {
      const notifications: TaskNotification[] = [];
      queue.subscribe(n => notifications.push(n));

      const id = queue.addTask(TaskType.BUILD, 'Build app', { description: 'full build' });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        taskId: id,
        taskName: 'Build app',
        type: 'started',
        showToast: false,
      });
      expect(notifications[0].message).toContain('queued');
    });

    it('throws when the queue is full', () => {
      const tiny = makeQueue({ maxQueueSize: 1 });
      tiny.addTask(TaskType.CUSTOM, 'first');

      expect(() => tiny.addTask(TaskType.CUSTOM, 'second')).toThrow('Task queue is full');
    });

    it('logs when the post-add persistence promise rejects', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const q = makeQueue();
      vi.spyOn(
        q as unknown as { persistState: () => Promise<void> },
        'persistState'
      ).mockRejectedValue(new Error('boom'));

      q.addTask(TaskType.CUSTOM, 'doomed persist');
      await vi.advanceTimersByTimeAsync(0);

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to persist state after adding task',
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = queue.subscribe(listener);
      unsubscribe();

      queue.addTask(TaskType.CUSTOM, 'silent');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getTasks filtering', () => {
    beforeEach(() => {
      queue.addTask(TaskType.BUILD, 'Compile bundle', {
        priority: TaskPriority.HIGH,
        description: 'production build',
      });
      queue.addTask(TaskType.TEST, 'Run unit tests', { priority: TaskPriority.LOW });
      queue.addTask(TaskType.CUSTOM, 'Sweep cache');
    });

    it('returns all tasks without a filter', () => {
      expect(queue.getTasks()).toHaveLength(3);
    });

    it('filters by status', () => {
      expect(queue.getTasks({ status: [TaskStatus.QUEUED] })).toHaveLength(3);
      expect(queue.getTasks({ status: [TaskStatus.RUNNING] })).toHaveLength(0);
    });

    it('filters by type', () => {
      const builds = queue.getTasks({ type: [TaskType.BUILD] });
      expect(builds).toHaveLength(1);
      expect(builds[0].name).toBe('Compile bundle');
    });

    it('filters by priority', () => {
      const high = queue.getTasks({ priority: [TaskPriority.HIGH] });
      expect(high).toHaveLength(1);
      expect(high[0].type).toBe(TaskType.BUILD);
    });

    it('filters by search term across name and description', () => {
      expect(queue.getTasks({ searchTerm: 'unit' })).toHaveLength(1);
      expect(queue.getTasks({ searchTerm: 'PRODUCTION' })).toHaveLength(1);
      expect(queue.getTasks({ searchTerm: 'zzz' })).toHaveLength(0);
    });
  });

  describe('task execution', () => {
    it('runs queued tasks, reports progress, and records history', async () => {
      const executor = okExecutor();
      queue.registerExecutor(TaskType.CUSTOM, executor);
      const notifications: TaskNotification[] = [];
      queue.subscribe(n => notifications.push(n));

      const id = queue.addTask(TaskType.CUSTOM, 'Do work');
      await vi.advanceTimersByTimeAsync(600);

      expect(executor.execute).toHaveBeenCalledTimes(1);
      expect(queue.getTask(id)).toBeUndefined(); // moved to history
      const history = queue.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ id, status: TaskStatus.COMPLETED });
      expect(history[0].startedAt).toBeInstanceOf(Date);
      expect(history[0].completedAt).toBeInstanceOf(Date);

      const types = notifications.map(n => n.type);
      expect(types).toContain('progress');
      expect(types).toContain('completed');
      const progress = notifications.find(n => n.type === 'progress');
      expect(progress?.message).toBe('halfway');
    });

    it('runs higher priority tasks first', async () => {
      const order: string[] = [];
      const serial = makeQueue({ maxConcurrentTasks: 1 });
      serial.registerExecutor(TaskType.CUSTOM, {
        execute: async task => {
          order.push(task.name);
          return { success: true };
        },
      });

      serial.addTask(TaskType.CUSTOM, 'low', { priority: TaskPriority.LOW });
      serial.addTask(TaskType.CUSTOM, 'critical', { priority: TaskPriority.CRITICAL });
      await vi.advanceTimersByTimeAsync(1200);

      expect(order).toEqual(['critical', 'low']);
    });

    it('fails a task when no executor is registered', async () => {
      const id = queue.addTask(TaskType.BUILD, 'orphan');
      await vi.advanceTimersByTimeAsync(600);

      const history = queue.getHistory();
      expect(history[0]).toMatchObject({ id, status: TaskStatus.FAILED });
      expect(history[0].result?.error).toContain('No executor registered');
    });

    it('marks tasks failed when the executor resolves unsuccessfully', async () => {
      queue.registerExecutor(TaskType.CUSTOM, {
        execute: async () => ({ success: false, error: 'lint exploded' }),
      });
      const notifications: TaskNotification[] = [];
      queue.subscribe(n => notifications.push(n));

      queue.addTask(TaskType.CUSTOM, 'Lint');
      await vi.advanceTimersByTimeAsync(600);

      expect(queue.getHistory()[0].status).toBe(TaskStatus.FAILED);
      const failed = notifications.find(n => n.type === 'failed');
      expect(failed?.message).toContain('lint exploded');
    });

    it('requeues a throwing task for retry until maxRetries', async () => {
      const execute = vi.fn().mockRejectedValue(new Error('flaky'));
      const retryQueue = makeQueue({ maxRetries: 1, retryFailedTasks: true });
      retryQueue.registerExecutor(TaskType.CUSTOM, { execute });
      const notifications: TaskNotification[] = [];
      retryQueue.subscribe(n => notifications.push(n));

      const id = retryQueue.addTask(TaskType.CUSTOM, 'Flaky job');
      await vi.advanceTimersByTimeAsync(600);

      // First failure: requeued with retryCount 1
      expect(retryQueue.getTask(id)).toMatchObject({
        status: TaskStatus.QUEUED,
        retryCount: 1,
      });
      expect(notifications.some(n => n.message.includes('retrying (1/1)'))).toBe(true);

      await vi.advanceTimersByTimeAsync(600);

      // Second failure: retries exhausted, moved to history
      expect(retryQueue.getTask(id)).toBeUndefined();
      expect(retryQueue.getHistory()[0]).toMatchObject({ id, status: TaskStatus.FAILED });
    });

    it('fails immediately when retries are disabled', async () => {
      const noRetry = makeQueue({ retryFailedTasks: false });
      noRetry.registerExecutor(TaskType.CUSTOM, {
        execute: async () => {
          throw new Error('hard crash');
        },
      });

      const id = noRetry.addTask(TaskType.CUSTOM, 'One shot');
      await vi.advanceTimersByTimeAsync(600);

      expect(noRetry.getHistory()[0]).toMatchObject({ id, status: TaskStatus.FAILED });
      expect(noRetry.getHistory()[0].result?.error).toBe('hard crash');
    });
  });

  describe('cancel / pause / resume', () => {
    it('cancels a queued task and moves it to history', async () => {
      const notifications: TaskNotification[] = [];
      queue.subscribe(n => notifications.push(n));
      const id = queue.addTask(TaskType.CUSTOM, 'Doomed');

      await expect(queue.cancelTask(id)).resolves.toBe(true);

      expect(queue.getTask(id)).toBeUndefined();
      expect(queue.getHistory()[0]).toMatchObject({ id, status: TaskStatus.CANCELED });
      expect(notifications.some(n => n.type === 'canceled')).toBe(true);
    });

    it('returns false when canceling an unknown task', async () => {
      await expect(queue.cancelTask('task_missing')).resolves.toBe(false);
    });

    it('throws when the task is not cancelable', async () => {
      const id = queue.addTask(TaskType.CUSTOM, 'Locked', { cancelable: false });
      await expect(queue.cancelTask(id)).rejects.toThrow('Task is not cancelable');
    });

    it('invokes the executor cancel hook for running tasks', async () => {
      const cancel = vi.fn(async () => {});
      queue.registerExecutor(TaskType.CUSTOM, {
        execute: () => new Promise<TaskResult>(() => {}), // never settles
        cancel,
      });
      const id = queue.addTask(TaskType.CUSTOM, 'Long haul');
      await vi.advanceTimersByTimeAsync(600);
      expect(queue.getTask(id)?.status).toBe(TaskStatus.RUNNING);

      await expect(queue.cancelTask(id)).resolves.toBe(true);
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('pauses a running task and resumes it back to queued', async () => {
      const pause = vi.fn(async () => {});
      queue.registerExecutor(TaskType.CUSTOM, {
        execute: () => new Promise<TaskResult>(() => {}),
        pause,
      });
      const id = queue.addTask(TaskType.CUSTOM, 'Pausable');
      await vi.advanceTimersByTimeAsync(600);
      expect(queue.getTask(id)?.status).toBe(TaskStatus.RUNNING);

      await expect(queue.pauseTask(id)).resolves.toBe(true);
      expect(pause).toHaveBeenCalledTimes(1);
      expect(queue.getTask(id)?.status).toBe(TaskStatus.PAUSED);

      await expect(queue.resumeTask(id)).resolves.toBe(true);
      expect(queue.getTask(id)?.status).toBe(TaskStatus.QUEUED);
    });

    it('refuses to pause tasks that are not running', async () => {
      const id = queue.addTask(TaskType.CUSTOM, 'Still queued');
      await expect(queue.pauseTask(id)).resolves.toBe(false);
      await expect(queue.resumeTask(id)).resolves.toBe(false);
    });

    it('throws when pausing a non-pausable running task', async () => {
      queue.registerExecutor(TaskType.CUSTOM, {
        execute: () => new Promise<TaskResult>(() => {}),
      });
      const id = queue.addTask(TaskType.CUSTOM, 'No pause', { pausable: false });
      await vi.advanceTimersByTimeAsync(600);

      await expect(queue.pauseTask(id)).rejects.toThrow('Task is not pausable');
    });
  });

  describe('stats, history, and cleanup', () => {
    it('reports queue statistics including average completion time', async () => {
      queue.registerExecutor(TaskType.CUSTOM, okExecutor());
      queue.addTask(TaskType.CUSTOM, 'quick');
      queue.addTask(TaskType.BUILD, 'stuck'); // no executor -> failed

      await vi.advanceTimersByTimeAsync(1200);
      queue.addTask(TaskType.TEST, 'waiting'); // still queued (no executor tick yet)

      const stats = queue.getStats();
      expect(stats.queued).toBeGreaterThanOrEqual(1);
      expect(stats.running).toBe(0);
      expect(stats.averageCompletionTime).toBeGreaterThanOrEqual(0);
      expect(queue.getHistory().length).toBeGreaterThanOrEqual(2);
    });

    it('returns zero average completion time with no completed tasks', () => {
      queue.addTask(TaskType.CUSTOM, 'idle');
      expect(queue.getStats()).toMatchObject({
        total: 1,
        queued: 1,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
        averageCompletionTime: 0,
      });
    });

    it('limits history results', async () => {
      queue.registerExecutor(TaskType.CUSTOM, okExecutor());
      queue.addTask(TaskType.CUSTOM, 'a');
      queue.addTask(TaskType.CUSTOM, 'b');
      queue.addTask(TaskType.CUSTOM, 'c');
      // The queue picks one task per 500ms tick, so allow three ticks.
      await vi.advanceTimersByTimeAsync(1600);

      expect(queue.getHistory(2)).toHaveLength(2);
      expect(queue.getHistory().length).toBe(3);
    });

    it('clearCompleted moves restored completed tasks to history', async () => {
      // Persist a completed task, then load it into a fresh queue.
      const completed = {
        id: 'task_done',
        type: TaskType.CUSTOM,
        name: 'already done',
        priority: TaskPriority.NORMAL,
        status: TaskStatus.COMPLETED,
        progress: { current: 100, total: 100, percentage: 100 },
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        cancelable: true,
        pausable: true,
        retryCount: 0,
        maxRetries: 3,
      };
      localStorage.setItem(
        'deepcode_task_queue',
        JSON.stringify({
          tasks: [['task_done', completed]],
          history: [completed],
          timestamp: new Date().toISOString(),
        })
      );

      const restored = makeQueue({ enablePersistence: true });
      await vi.advanceTimersByTimeAsync(1);
      expect(restored.getTask('task_done')?.status).toBe(TaskStatus.COMPLETED);
      expect(restored.getTask('task_done')?.createdAt).toBeInstanceOf(Date);

      restored.clearCompleted();

      expect(restored.getTask('task_done')).toBeUndefined();
      expect(restored.getHistory().some(t => t.id === 'task_done')).toBe(true);
    });

    it('resets previously running tasks to queued on restore', async () => {
      const running = {
        id: 'task_running',
        type: TaskType.CUSTOM,
        name: 'was running',
        priority: TaskPriority.NORMAL,
        status: TaskStatus.RUNNING,
        progress: { current: 10, total: 100, percentage: 10 },
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        cancelable: true,
        pausable: true,
        retryCount: 0,
        maxRetries: 3,
      };
      localStorage.setItem(
        'deepcode_task_queue',
        JSON.stringify({ tasks: [['task_running', running]] })
      );

      const restored = makeQueue({ enablePersistence: true });
      await vi.advanceTimersByTimeAsync(1);

      const task = restored.getTask('task_running');
      expect(task?.status).toBe(TaskStatus.QUEUED);
      expect(task?.startedAt).toBeUndefined();
    });

    it('clearAll cancels running tasks and empties the queue', async () => {
      queue.registerExecutor(TaskType.CUSTOM, {
        execute: () => new Promise<TaskResult>(() => {}),
      });
      queue.addTask(TaskType.CUSTOM, 'running');
      queue.addTask(TaskType.CUSTOM, 'queued extra');
      await vi.advanceTimersByTimeAsync(600);

      queue.clearAll();

      expect(queue.getTasks()).toHaveLength(0);
    });

    it('persists queue state to localStorage when enabled', () => {
      const persistent = makeQueue({ enablePersistence: true });
      persistent.addTask(TaskType.CUSTOM, 'saved task');

      const raw = localStorage.getItem('deepcode_task_queue');
      expect(raw).toBeTruthy();
      const state = JSON.parse(raw as string);
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0][1].name).toBe('saved task');
    });

    it('destroy stops the processing loop', async () => {
      const executor = okExecutor();
      queue.registerExecutor(TaskType.CUSTOM, executor);
      queue.destroy();

      const id = queue.addTask(TaskType.CUSTOM, 'after destroy');
      await vi.advanceTimersByTimeAsync(1200);

      expect(executor.execute).not.toHaveBeenCalled();
      expect(queue.getTask(id)?.status).toBe(TaskStatus.QUEUED);
    });
  });
});
