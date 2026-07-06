/**
 * agentManagerIntegration — spec 10 Phase 1 wiring. Subscribes the Agent
 * Manager store to BackgroundAgentSystem's lifecycle + injection events
 * (event-driven, replaces polling), and exposes the start/reply/cancel
 * operations the panel uses. Consumes the SHARED injectMessage channel
 * (spec 09 P2) — no second queue. Subscription is idempotent with a
 * disposer safe for React StrictMode double-effects.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { useAgentManagerStore } from '../../stores/agentManagerStore';
import type {
  BackgroundAgentSystem,
  BackgroundTask,
  InjectedMessage,
} from '../BackgroundAgentSystem';
import {
  addFailed,
  addQueued,
  clearQueuedForTask,
  dismissEntry,
  markDropped,
  resolveInjected,
} from './inbox';

const TASK_EVENTS = [
  'submitted',
  'started',
  'progress',
  'stepStart',
  'stepComplete',
  'stepError',
  'completed',
  'failed',
  'cancelled',
] as const;

let subscribedSystem: BackgroundAgentSystem | null = null;
let disposeCurrent: (() => void) | null = null;

const store = () => useAgentManagerStore.getState();

const onTaskEvent = (task: BackgroundTask): void => {
  store().actions.upsertTask(task);
  if (task.status === 'failed') {
    store().actions.setInbox(addFailed(store().inbox, task, Date.now()));
  }
  if (task.status === 'cancelled') {
    store().actions.setInbox(clearQueuedForTask(store().inbox, task.id));
  }
};

const onMessageQueued = (task: BackgroundTask, message: InjectedMessage): void => {
  store().actions.upsertTask(task);
  store().actions.setInbox(addQueued(store().inbox, message));
};

const onMessageInjected = (task: BackgroundTask, message: InjectedMessage): void => {
  store().actions.upsertTask(task);
  store().actions.setInbox(resolveInjected(store().inbox, message));
};

const onMessageDropped = (task: BackgroundTask, message: InjectedMessage): void => {
  store().actions.upsertTask(task);
  store().actions.setInbox(markDropped(store().inbox, message));
};

/**
 * Subscribe the store to a system. Idempotent: re-init against the same
 * system returns the existing disposer; a different system replaces the
 * old subscription. The returned disposer is itself idempotent.
 */
export function initAgentManager(system: BackgroundAgentSystem): () => void {
  if (subscribedSystem === system && disposeCurrent) {
    return disposeCurrent;
  }
  disposeCurrent?.();

  store().actions.setTasks(system.getAllTasks());
  for (const event of TASK_EVENTS) {
    system.on(event, onTaskEvent);
  }
  system.on('messageQueued', onMessageQueued);
  system.on('messageInjected', onMessageInjected);
  system.on('messageDropped', onMessageDropped);

  subscribedSystem = system;
  let disposed = false;
  disposeCurrent = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const event of TASK_EVENTS) {
      system.off(event, onTaskEvent);
    }
    system.off('messageQueued', onMessageQueued);
    system.off('messageInjected', onMessageInjected);
    system.off('messageDropped', onMessageDropped);
    if (subscribedSystem === system) {
      subscribedSystem = null;
      disposeCurrent = null;
    }
  };
  return disposeCurrent;
}

/** The missing UI entry point for submit() (spec 10 AC — start agent). */
export function startAgent(
  system: BackgroundAgentSystem,
  userRequest: string,
  workspaceRoot: string
): string | null {
  const trimmed = userRequest.trim();
  if (!trimmed || !workspaceRoot) {
    return null;
  }
  return system.submit('agent-manager', trimmed, workspaceRoot);
}

/** Reply to a running/pending task via the shared injection channel. */
export function replyToTask(
  system: BackgroundAgentSystem,
  taskId: string,
  body: string
): InjectedMessage | null {
  return system.injectMessage(taskId, body);
}

export function cancelTask(system: BackgroundAgentSystem, taskId: string): boolean {
  return system.cancel(taskId);
}

/** Dismiss an inbox entry (user action). */
export function dismissInboxEntry(id: string): void {
  store().actions.setInbox(dismissEntry(store().inbox, id));
}

/** Test seam. */
export function resetAgentManagerForTests(): void {
  disposeCurrent?.();
  subscribedSystem = null;
  disposeCurrent = null;
  store().actions.reset();
}
