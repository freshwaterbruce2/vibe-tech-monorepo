/**
 * BackgroundWorker tests
 *
 * Real behavioral tests against the real module in
 * `src/services/BackgroundWorker.ts`. The Worker / IPC boundary is replaced
 * with a controllable fake so we can drive `onmessage` / `onerror` and assert
 * how the real class queues tasks, resolves/rejects, propagates progress, and
 * manages lifecycle. The real class logic runs unchanged.
 *
 * jsdom has no real Worker thread, so cases that genuinely require a separate
 * OS thread (true parallelism / not-blocking-main-thread) are not asserted —
 * we instead verify the observable contract (queueing, message routing).
 */
import type { TaskProgress } from '@vibetech/types';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  BackgroundWorker,
  BackgroundWorkerPool,
  type WorkerMessage,
} from '../../services/BackgroundWorker';

/**
 * Controllable fake Worker. Captures the script url + posted messages and
 * exposes `onmessage` / `onerror` so a test can simulate the worker replying.
 */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static throwOnConstruct = false;

  url: string | URL;
  options: unknown;
  posted: WorkerMessage[] = [];
  terminated = false;
  onmessage: ((event: { data: WorkerMessage }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;

  constructor(url: string | URL, options?: unknown) {
    if (FakeWorker.throwOnConstruct) {
      throw new Error('boom: worker not supported');
    }
    this.url = url;
    this.options = options;
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerMessage): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Drive a message from the "worker" back into the real class. */
  emit(message: WorkerMessage): void {
    this.onmessage?.({ data: message });
  }

  /** Drive a worker-level error into the real class. */
  emitError(message: string): void {
    this.onerror?.({ message });
  }

  static reset(): void {
    FakeWorker.instances = [];
    FakeWorker.throwOnConstruct = false;
  }

  static last(): FakeWorker {
    return FakeWorker.instances[FakeWorker.instances.length - 1];
  }
}

/** The id BackgroundWorker assigned to the most recently sent task. */
function lastTaskId(worker: FakeWorker): string {
  const execMsg = [...worker.posted].reverse().find(m => m.type === 'execute');
  return (execMsg?.payload as { id: string }).id;
}

describe('BackgroundWorker', () => {
  let originalWorker: typeof globalThis.Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    (globalThis as any).Worker = FakeWorker;
    FakeWorker.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).Worker = originalWorker;
    vi.useRealTimers();
  });

  describe('Worker Initialization', () => {
    it('creates a real worker from the script url as an ES module', () => {
      const worker = new BackgroundWorker('worker.js');

      expect(FakeWorker.instances).toHaveLength(1);
      expect(FakeWorker.last().url).toBe('worker.js');
      expect(FakeWorker.last().options).toEqual({ type: 'module' });
      expect(worker.isActive()).toBe(true);
    });

    it('accepts a URL instance as the worker script', () => {
      const url = new URL('https://example.test/w.js');
      new BackgroundWorker(url);

      expect(FakeWorker.last().url).toBe(url);
    });

    it('wraps a worker-construction failure in a descriptive error', () => {
      FakeWorker.throwOnConstruct = true;

      expect(() => new BackgroundWorker('worker.js')).toThrow(
        'Web Workers not supported or worker script not found'
      );
      expect(FakeWorker.instances).toHaveLength(0);
    });

    it('registers an onmessage handler on the underlying worker', () => {
      new BackgroundWorker('worker.js');
      expect(typeof FakeWorker.last().onmessage).toBe('function');
    });
  });

  describe('Task Execution', () => {
    it('posts an execute message carrying task type, data and a generated id', () => {
      const worker = new BackgroundWorker('worker.js');
      void worker.execute('analyze', { file: 'a.ts' });

      const fake = FakeWorker.last();
      expect(fake.posted).toHaveLength(1);
      const msg = fake.posted[0];
      expect(msg.type).toBe('execute');
      const task = msg.payload as { id: string; type: string; data: unknown };
      expect(task.type).toBe('analyze');
      expect(task.data).toEqual({ file: 'a.ts' });
      expect(task.id).toMatch(/^worker_/);
    });

    it('resolves with a successful TaskResult when the worker reports a result', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const promise = worker.execute('analyze', { file: 'a.ts' });
      const id = lastTaskId(fake);

      fake.emit({ type: 'result', payload: { id, value: 42 } });

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id, value: 42 });
    });

    it('resolves with a failed TaskResult (not a throw) for a routed error message', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const promise = worker.execute('analyze', {});
      const id = lastTaskId(fake);

      // A per-task error must carry the id to route, so its payload is an object;
      // the handler therefore reports the generic message (string payloads have
      // no id and would never reach a registered task handler).
      fake.emit({ type: 'error', payload: { id, message: 'parse failed' } });

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown worker error');
    });

    it('falls back to a generic error string when the error payload is not a string', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const promise = worker.execute('analyze', {});
      const id = lastTaskId(fake);

      fake.emit({ type: 'error', payload: { id, code: 500 } });

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown worker error');
    });

    it('throws when executing after the worker has been terminated', async () => {
      const worker = new BackgroundWorker('worker.js');
      worker.terminate();

      await expect(worker.execute('analyze', {})).rejects.toThrow('Worker has been terminated');
    });

    it('routes concurrent tasks to their own handlers by id', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const p1 = worker.execute('a', { n: 1 });
      const id1 = lastTaskId(fake);
      const p2 = worker.execute('b', { n: 2 });
      const id2 = lastTaskId(fake);

      expect(id1).not.toBe(id2);
      expect(fake.posted).toHaveLength(2);

      // Resolve them out of order.
      fake.emit({ type: 'result', payload: { id: id2, out: 'two' } });
      fake.emit({ type: 'result', payload: { id: id1, out: 'one' } });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.data).toEqual({ id: id1, out: 'one' });
      expect(r2.data).toEqual({ id: id2, out: 'two' });
    });
  });

  describe('Message Passing & Progress', () => {
    it('invokes the onProgress callback for progress messages without resolving', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();
      const onProgress = vi.fn();

      const promise = worker.execute('analyze', {}, onProgress);
      const id = lastTaskId(fake);

      const progress: TaskProgress = { current: 1, total: 2, percentage: 50 };
      fake.emit({ type: 'progress', payload: { id, ...progress } });

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, total: 2, percentage: 50 })
      );

      // Progress alone does not settle the promise; a result must follow.
      fake.emit({ type: 'result', payload: { id, done: true } });
      await expect(promise).resolves.toMatchObject({ success: true });
    });

    it('ignores worker messages whose payload carries no matching task id', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();
      const onProgress = vi.fn();

      const promise = worker.execute('analyze', {}, onProgress);
      const id = lastTaskId(fake);

      // No id at all -> dropped by the router.
      fake.emit({ type: 'progress', payload: { current: 9, total: 9, percentage: 100 } });
      // Unknown id -> no registered handler.
      fake.emit({ type: 'result', payload: { id: 'nope', value: 1 } });

      expect(onProgress).not.toHaveBeenCalled();

      // The real task is still pending and can still complete.
      fake.emit({ type: 'result', payload: { id, value: 'ok' } });
      await expect(promise).resolves.toMatchObject({ success: true });
    });

    it('propagates a worker-level onerror to every pending task as a failure', async () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const p1 = worker.execute('a', {});
      const p2 = worker.execute('b', {});

      fake.emitError('worker crashed');

      const r1 = await p1;
      const r2 = await p2;
      expect(r1.success).toBe(false);
      expect(r1.error).toBe('worker crashed');
      expect(r2.success).toBe(false);
      expect(r2.error).toBe('worker crashed');
    });

    it('does not post messages to a terminated worker', () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();
      worker.terminate();

      // private postMessage guards on isTerminated; verify nothing is sent.
      expect(fake.posted).toHaveLength(0);
    });
  });

  describe('Worker Lifecycle', () => {
    it('terminates the underlying worker and reports inactive', () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      expect(worker.isActive()).toBe(true);
      worker.terminate();

      expect(fake.terminated).toBe(true);
      expect(worker.isActive()).toBe(false);
    });

    it('is idempotent: terminating twice does not call worker.terminate again', () => {
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();
      const spy = vi.spyOn(fake, 'terminate');

      worker.terminate();
      worker.terminate();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(worker.isActive()).toBe(false);
    });

    it('re-registering the message handler after termination is a safe no-op', () => {
      const worker = new BackgroundWorker('worker.js');
      worker.terminate();

      // terminate() nulls the underlying worker; the private setup guard must
      // bail out instead of dereferencing it.
      type WithSetup = { setupMessageHandler: () => void };
      expect(() => (worker as unknown as WithSetup).setupMessageHandler()).not.toThrow();
      expect(worker.isActive()).toBe(false);
    });

    it('rejects with a timeout error when no worker response arrives in time', async () => {
      vi.useFakeTimers();
      const worker = new BackgroundWorker('worker.js');

      const promise = worker.execute('slow', {});
      // Attach rejection handler before advancing timers to avoid unhandled rejection.
      const assertion = expect(promise).rejects.toThrow('Task execution timeout');

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      await assertion;
    });

    it('does not reject on timeout once the task has already resolved', async () => {
      vi.useFakeTimers();
      const worker = new BackgroundWorker('worker.js');
      const fake = FakeWorker.last();

      const promise = worker.execute('quick', {});
      const id = lastTaskId(fake);
      fake.emit({ type: 'result', payload: { id, ok: true } });

      await expect(promise).resolves.toMatchObject({ success: true });

      // Advancing past the timeout window must not throw / produce a late rejection.
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    });
  });
});

describe('BackgroundWorkerPool', () => {
  let originalWorker: typeof globalThis.Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    (globalThis as any).Worker = FakeWorker;
    FakeWorker.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).Worker = originalWorker;
    vi.useRealTimers();
  });

  it('spins up the requested number of workers on construction', () => {
    const pool = new BackgroundWorkerPool('worker.js', 3);

    expect(FakeWorker.instances).toHaveLength(3);
    expect(pool.getStats()).toEqual({
      totalWorkers: 3,
      availableWorkers: 3,
      busyWorkers: 0,
    });
  });

  it('defaults to a pool size of 3 when none is given', () => {
    new BackgroundWorkerPool('worker.js');
    expect(FakeWorker.instances).toHaveLength(3);
  });

  it('marks a worker busy while a task runs and releases it on completion', async () => {
    const pool = new BackgroundWorkerPool('worker.js', 2);

    const promise = pool.execute('analyze', { x: 1 });

    // getAvailableWorker resolves a microtask before the worker is checked out
    // and the execute message is posted; let that settle first.
    await Promise.resolve();
    await Promise.resolve();

    // One worker has been checked out; stats reflect it as busy.
    expect(pool.getStats().busyWorkers).toBe(1);
    expect(pool.getStats().availableWorkers).toBe(1);

    // Drive the result on whichever worker received the execute message.
    const busy = FakeWorker.instances.find(w => w.posted.length > 0)!;
    busy.emit({ type: 'result', payload: { id: lastTaskId(busy), value: 7 } });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: lastTaskId(busy), value: 7 });
    expect(pool.getStats()).toEqual({
      totalWorkers: 2,
      availableWorkers: 2,
      busyWorkers: 0,
    });
  });

  it('releases the worker back to the pool even when the task throws', async () => {
    vi.useFakeTimers();
    const pool = new BackgroundWorkerPool('worker.js', 1);

    const promise = pool.execute('slow', {});
    const assertion = expect(promise).rejects.toThrow('Task execution timeout');

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await assertion;

    expect(pool.getStats()).toEqual({
      totalWorkers: 1,
      availableWorkers: 1,
      busyWorkers: 0,
    });
  });

  it('parks a second task in the wait loop until the only worker is released', async () => {
    vi.useFakeTimers();
    const pool = new BackgroundWorkerPool('worker.js', 1);
    const fake = FakeWorker.last();

    const p1 = pool.execute('first', {});
    await vi.advanceTimersByTimeAsync(0); // let task 1 check the worker out

    const p2 = pool.execute('second', {});
    await vi.advanceTimersByTimeAsync(0);

    // Task 2 is stuck in the availability poll: nothing extra was posted yet.
    expect(fake.posted).toHaveLength(1);
    expect(pool.getStats().busyWorkers).toBe(1);

    // Finish task 1; the poll ticks every 100ms before task 2 proceeds.
    fake.emit({ type: 'result', payload: { id: lastTaskId(fake), n: 1 } });
    await expect(p1).resolves.toMatchObject({ success: true });

    await vi.advanceTimersByTimeAsync(100);
    expect(fake.posted).toHaveLength(2);

    fake.emit({ type: 'result', payload: { id: lastTaskId(fake), n: 2 } });
    await expect(p2).resolves.toMatchObject({ success: true });
    expect(pool.getStats().availableWorkers).toBe(1);
  });

  it('terminates every worker and empties the pool', () => {
    const pool = new BackgroundWorkerPool('worker.js', 3);
    const fakes = [...FakeWorker.instances];

    pool.terminate();

    expect(fakes.every(w => w.terminated)).toBe(true);
    expect(pool.getStats()).toEqual({
      totalWorkers: 0,
      availableWorkers: 0,
      busyWorkers: 0,
    });
  });
});
