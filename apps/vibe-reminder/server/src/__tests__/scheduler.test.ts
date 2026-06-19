import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createReminderScheduler } from '../scheduler';

describe('createReminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('throws when intervalMs is not positive', () => {
    const task = vi.fn(async () => {});
    expect(() => createReminderScheduler({ task, intervalMs: 0 })).toThrow(
      /intervalMs must be a positive number/,
    );
    expect(() => createReminderScheduler({ task, intervalMs: -5 })).toThrow(
      /intervalMs must be a positive number/,
    );
  });

  it('runs the task on each interval tick', async () => {
    const task = vi.fn(async () => {});
    const scheduler = createReminderScheduler({ task, intervalMs: 1000 });

    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    expect(task).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(3);

    scheduler.stop();
  });

  it('invokes the task immediately when runOnStart is true', async () => {
    const task = vi.fn(async () => {});
    const scheduler = createReminderScheduler({
      task,
      intervalMs: 1000,
      runOnStart: true,
    });

    scheduler.start();
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('does not create a second timer on double start()', async () => {
    const task = vi.fn(async () => {});
    const scheduler = createReminderScheduler({ task, intervalMs: 1000 });

    scheduler.start();
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });

  it('skips a tick when the previous task is still in flight', async () => {
    let resolveTask: (() => void) | undefined;
    const task = vi.fn(
      async () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );
    const info = vi.fn();
    const scheduler = createReminderScheduler({
      task,
      intervalMs: 1000,
      logger: { info, error: vi.fn() },
    });

    scheduler.start();

    // First tick starts the long-running task (still pending).
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);

    // Second tick fires while the first is still in flight — must be skipped.
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'reminder-scheduler:skip' }),
      expect.any(String),
    );

    // Resolve the in-flight task; the next tick runs normally again.
    resolveTask?.();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('logs and continues when a task rejects', async () => {
    const task = vi.fn(async () => {
      throw new Error('boom');
    });
    const error = vi.fn();
    const scheduler = createReminderScheduler({
      task,
      intervalMs: 1000,
      logger: { info: vi.fn(), error },
    });

    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(error).toHaveBeenCalledTimes(1);

    // Timer survived the rejection: next tick still runs.
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('stop() halts further ticks and is safe to call repeatedly', async () => {
    const task = vi.fn(async () => {});
    const scheduler = createReminderScheduler({ task, intervalMs: 1000 });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);

    scheduler.stop();
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);

    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
