/**
 * Generic interval scheduler for a Fastify app.
 *
 * Purely about lifecycle/timing — it owns no database or business logic.
 * The orchestrator injects the work function via {@link ReminderSchedulerOptions.task}.
 */

/** Minimal logger shape the scheduler depends on (Fastify/pino compatible). */
export interface ReminderLogger {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
}

/** Options for {@link createReminderScheduler}. */
export interface ReminderSchedulerOptions {
  /** The work to run each tick (injected by the orchestrator). */
  task: () => Promise<void>;
  /** Tick interval in milliseconds. Must be > 0. */
  intervalMs: number;
  /** Optional logger for tick lifecycle events and task errors. */
  logger?: ReminderLogger;
  /** When true, invoke the task once immediately on start (non-blocking). Default false. */
  runOnStart?: boolean;
}

/** Public control surface returned by {@link createReminderScheduler}. */
export interface ReminderScheduler {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Build a tick runner with a private re-entrancy guard so overlapping ticks
 * (a slow task still running when the next interval fires) are skipped.
 */
function createTickRunner(
  task: () => Promise<void>,
  logger?: ReminderLogger,
): () => void {
  let inFlight = false;
  return (): void => {
    if (inFlight) {
      logger?.info(
        { event: 'reminder-scheduler:skip' },
        'Skipping tick: previous task still in flight',
      );
      return;
    }

    inFlight = true;
    void task()
      .catch((err: unknown) => {
        logger?.error({ event: 'reminder-scheduler:error', err }, 'Task failed');
      })
      .finally(() => {
        inFlight = false;
      });
  };
}

/**
 * Create an interval scheduler that runs an injected async task on a fixed
 * cadence, with a re-entrancy guard so overlapping ticks are skipped.
 */
export function createReminderScheduler(
  options: ReminderSchedulerOptions,
): ReminderScheduler {
  const { task, intervalMs, logger, runOnStart = false } = options;

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(
      `createReminderScheduler: intervalMs must be a positive number, got ${String(intervalMs)}`,
    );
  }

  let handle: ReturnType<typeof setInterval> | undefined;
  const runTick = createTickRunner(task, logger);

  const start = (): void => {
    if (handle !== undefined) {
      logger?.info(
        { event: 'reminder-scheduler:already-running' },
        'start() ignored: scheduler already running',
      );
      return;
    }

    handle = setInterval(runTick, intervalMs);
    handle.unref();

    if (runOnStart) {
      runTick();
    }
  };

  const stop = (): void => {
    if (handle === undefined) {
      return;
    }
    clearInterval(handle);
    handle = undefined;
  };

  const isRunning = (): boolean => handle !== undefined;

  return { start, stop, isRunning };
}
