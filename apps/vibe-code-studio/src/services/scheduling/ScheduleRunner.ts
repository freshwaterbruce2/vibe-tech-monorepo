/**
 * ScheduleRunner — in-app trigger engine for agent schedules.
 *
 * Deviation from spec 16: the spec delegates wake-ups to a monorepo
 * `scheduled-tasks` MCP, but that server does not exist (verified 2026-07-04).
 * Since BackgroundAgentSystem can only execute while VCS runs anyway, the
 * runner uses a 30s in-app tick instead; missed-run policies cover triggers
 * that pass while the app is closed.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { logger } from '../Logger';
import { computeNextRunAt, isRecurring } from './cadence';
import type { ScheduleStore } from './ScheduleStore';
import type {
  ScheduleDefinition,
  ScheduleRunDelivery,
  ScheduleRunRecord,
  ScheduleTaskSubmitter,
} from './types';

export interface ScheduleRunnerDeps {
  store: ScheduleStore;
  submitter: ScheduleTaskSubmitter;
  getWorkspaceRoot: () => string | null;
  /** Surfaced on run completion/failure (in-app notifications) */
  notify: (kind: 'success' | 'error', title: string, message: string) => void;
  /** Settled runs pushed to the Agent Manager Inbox (spec 16 AC #5) */
  deliver?: (delivery: ScheduleRunDelivery) => void;
  /** Called after any schedule mutation so the UI store can re-sync */
  onSchedulesChanged: () => void;
  now?: () => number;
  tickMs?: number;
}

interface FinishedTaskLike {
  id?: string;
  error?: { message?: string };
}

const DEFAULT_TICK_MS = 30_000;

export class ScheduleRunner {
  private readonly deps: ScheduleRunnerDeps;
  private readonly now: () => number;
  private readonly tickMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  /** BackgroundAgentSystem task id → schedule id, for finalizing runs */
  private pendingTasks = new Map<string, string>();
  private readonly onCompleted = (...args: unknown[]): void =>
    this.finalizeRun(args[0] as FinishedTaskLike, 'completed');
  private readonly onFailed = (...args: unknown[]): void =>
    this.finalizeRun(args[0] as FinishedTaskLike, 'failed');

  constructor(deps: ScheduleRunnerDeps) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
    this.tickMs = deps.tickMs ?? DEFAULT_TICK_MS;
  }

  /** Load schedules, resolve missed triggers, then start the tick loop. */
  async start(): Promise<void> {
    if (this.intervalId !== null) return;
    await this.deps.store.load(this.now());
    await this.applyMissedRunPolicies();
    this.deps.submitter.on('completed', this.onCompleted);
    this.deps.submitter.on('failed', this.onFailed);
    await this.check();
    this.intervalId = setInterval(() => {
      void this.check();
    }, this.tickMs);
    this.deps.onSchedulesChanged();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.deps.submitter.off('completed', this.onCompleted);
    this.deps.submitter.off('failed', this.onFailed);
  }

  /** Fire every active schedule whose trigger time has passed. */
  async check(): Promise<void> {
    const nowMs = this.now();
    for (const schedule of this.deps.store.list()) {
      if (schedule.status !== 'active') continue;
      if (schedule.nextRunAtMs === null || schedule.nextRunAtMs > nowMs) continue;
      await this.fire(schedule, nowMs);
    }
  }

  // -- internals ------------------------------------------------------------

  /**
   * A trigger that passed while the app was closed: 'run-on-launch' leaves the
   * stale nextRunAtMs in place (first check() fires it); 'skip' records a
   * skipped run and advances to the next occurrence.
   */
  private async applyMissedRunPolicies(): Promise<void> {
    const nowMs = this.now();
    for (const schedule of this.deps.store.list()) {
      if (schedule.status !== 'active') continue;
      if (schedule.nextRunAtMs === null || schedule.nextRunAtMs > nowMs) continue;
      if (schedule.missedRunPolicy === 'run-on-launch') continue;
      await this.deps.store.recordRun(schedule.id, {
        id: `run-${nowMs}-${schedule.id}`,
        startedAt: new Date(schedule.nextRunAtMs).toISOString(),
        finishedAt: new Date(nowMs).toISOString(),
        status: 'skipped',
        error: 'Missed while app was closed (skipped per policy)',
      });
      await this.advance(schedule, nowMs);
    }
  }

  private async fire(schedule: ScheduleDefinition, nowMs: number): Promise<void> {
    const runId = `run-${nowMs}-${schedule.id}`;
    const workspaceRoot = this.deps.getWorkspaceRoot();
    if (workspaceRoot !== schedule.workspaceRoot) {
      // Never silently retarget another workspace (spec AC #11)
      await this.deps.store.recordRun(schedule.id, {
        id: runId,
        startedAt: new Date(nowMs).toISOString(),
        finishedAt: new Date(nowMs).toISOString(),
        status: 'failed',
        error: `Workspace not open: ${schedule.workspaceRoot}`,
      });
      this.deps.notify(
        'error',
        'Scheduled task skipped',
        `"${schedule.userRequest}" requires workspace ${schedule.workspaceRoot}`
      );
      await this.advance(schedule, nowMs);
      return;
    }

    const taskId = this.deps.submitter.submit(
      schedule.agentId,
      schedule.userRequest,
      schedule.workspaceRoot,
      schedule.parameters,
      schedule.options
    );
    this.pendingTasks.set(taskId, schedule.id);
    logger.debug(`[ScheduleRunner] Fired schedule ${schedule.id} as task ${taskId}`);
    await this.deps.store.recordRun(schedule.id, {
      id: runId,
      startedAt: new Date(nowMs).toISOString(),
      status: 'running',
      taskId,
    });
    await this.advance(schedule, nowMs, /* markLastRun */ true);
  }

  /** Recompute the next trigger; 'once' schedules complete after their run. */
  private async advance(
    schedule: ScheduleDefinition,
    nowMs: number,
    markLastRun = false
  ): Promise<void> {
    const changes: Partial<ScheduleDefinition> = {};
    if (markLastRun) changes.lastRunAt = new Date(nowMs).toISOString();
    if (isRecurring(schedule.cadence)) {
      changes.nextRunAtMs = computeNextRunAt(schedule.cadence, nowMs);
    } else {
      changes.status = 'completed';
      changes.nextRunAtMs = null;
    }
    await this.deps.store.update(schedule.id, changes);
    this.deps.onSchedulesChanged();
  }

  private finalizeRun(task: FinishedTaskLike, status: 'completed' | 'failed'): void {
    const taskId = task?.id;
    if (!taskId) return;
    const scheduleId = this.pendingTasks.get(taskId);
    if (!scheduleId) return; // not a schedule-originated task
    this.pendingTasks.delete(taskId);
    void this.writeRunResult(scheduleId, taskId, status, task.error?.message);
  }

  private async writeRunResult(
    scheduleId: string,
    taskId: string,
    status: 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const schedule = this.deps.store.get(scheduleId);
    if (!schedule) return;
    const running = schedule.runs.find(r => r.taskId === taskId);
    if (!running) return;
    const finishedMs = this.now();
    const startedMs = Date.parse(running.startedAt);
    const finished: ScheduleRunRecord = {
      ...running,
      status,
      finishedAt: new Date(finishedMs).toISOString(),
      durationMs: Number.isNaN(startedMs) ? 0 : finishedMs - startedMs,
      ...(errorMessage !== undefined ? { error: errorMessage } : {}),
    };
    await this.deps.store.recordRun(scheduleId, finished);
    this.deps.onSchedulesChanged();
    if (status === 'completed') {
      this.deps.notify('success', 'Scheduled task completed', schedule.userRequest);
    } else {
      this.deps.notify('error', 'Scheduled task failed', errorMessage ?? schedule.userRequest);
    }
    this.deps.deliver?.({
      runId: finished.id,
      scheduleId,
      taskId,
      status,
      userRequest: schedule.userRequest,
      finishedAtMs: finishedMs,
      ...(errorMessage !== undefined ? { error: errorMessage } : {}),
    });
  }
}
