/**
 * Scheduler integration — wires ScheduleStore + ScheduleRunner to the app's
 * BackgroundAgentSystem, workspace state, and the schedules zustand store.
 * UI surfaces (SchedulePanelHost, useScheduleCommands) call these functions
 * instead of constructing services.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { useSchedulesStore } from '../../stores/schedulesStore';
import { logger } from '../Logger';
import { computeNextRunAt } from './cadence';
import { ScheduleRunner } from './ScheduleRunner';
import { ScheduleStore } from './ScheduleStore';
import type { ScheduleDefinition, ScheduleDraft, ScheduleTaskSubmitter } from './types';

export interface SchedulerInitDeps {
  submitter: ScheduleTaskSubmitter;
  getWorkspaceRoot: () => string | null;
  notify: (kind: 'success' | 'error', title: string, message: string) => void;
}

let storeInstance: ScheduleStore | null = null;
let runnerInstance: ScheduleRunner | null = null;

function syncToUiStore(): void {
  if (!storeInstance) return;
  useSchedulesStore.getState().actions.setSchedules(storeInstance.list());
}

/**
 * Create (once) and start the scheduling engine. Idempotent — repeat calls
 * return the already-running runner, so React re-mounts are safe.
 */
export async function initScheduling(deps: SchedulerInitDeps): Promise<ScheduleRunner> {
  if (runnerInstance) return runnerInstance;
  storeInstance = new ScheduleStore();
  runnerInstance = new ScheduleRunner({
    store: storeInstance,
    submitter: deps.submitter,
    getWorkspaceRoot: deps.getWorkspaceRoot,
    notify: deps.notify,
    onSchedulesChanged: syncToUiStore,
  });
  await runnerInstance.start();
  syncToUiStore();
  return runnerInstance;
}

/** Test seam: stop and clear the singletons */
export function resetSchedulingForTests(): void {
  runnerInstance?.stop();
  runnerInstance = null;
  storeInstance = null;
}

function requireStore(): ScheduleStore {
  if (!storeInstance) throw new Error('Scheduling not initialized — call initScheduling first');
  return storeInstance;
}

export async function createSchedule(draft: ScheduleDraft): Promise<ScheduleDefinition> {
  const created = await requireStore().create(draft, Date.now());
  syncToUiStore();
  return created;
}

export async function pauseSchedule(id: string): Promise<void> {
  await requireStore().update(id, { status: 'paused' });
  syncToUiStore();
}

/** Resuming recomputes the next trigger so a stale one doesn't fire instantly. */
export async function resumeSchedule(id: string): Promise<void> {
  const store = requireStore();
  const schedule = store.get(id);
  if (!schedule) return;
  await store.update(id, {
    status: 'active',
    nextRunAtMs: computeNextRunAt(schedule.cadence, Date.now()),
  });
  syncToUiStore();
}

export async function deleteSchedule(id: string): Promise<void> {
  await requireStore().remove(id);
  syncToUiStore();
}

/** Fire-and-forget scheduler mutation with logged (never thrown) failures */
export function runScheduleAction(action: () => Promise<unknown>, label: string): void {
  void action().catch((err: unknown) => {
    logger.warn(`[Scheduler] ${label} failed`, err);
  });
}

/**
 * Preview step (spec AC #12): exactly what BackgroundAgentSystem.submit will
 * be called with when this draft fires.
 */
export function buildSubmitPreview(draft: ScheduleDraft): string {
  const args = [
    JSON.stringify(draft.agentId),
    JSON.stringify(draft.userRequest),
    JSON.stringify(draft.workspaceRoot),
    JSON.stringify(draft.parameters ?? {}),
    JSON.stringify(draft.options ?? {}),
  ];
  return `BackgroundAgentSystem.submit(\n  ${args.join(',\n  ')}\n)`;
}
