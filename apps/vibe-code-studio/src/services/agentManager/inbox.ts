/**
 * Agent Manager inbox — pure derivation of attention items (spec 10 AC #5/#6)
 * from BackgroundAgentSystem events. Queued replies resolve on delivery;
 * dropped messages and failed tasks need user attention. No I/O here.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import type { BackgroundTask, InjectedMessage } from '../BackgroundAgentSystem';

export type InboxEntryKind = 'queued' | 'dropped' | 'failed';

export interface InboxEntry {
  /** Message id for message-borne entries, `failed-<taskId>` for failures. */
  id: string;
  taskId: string;
  kind: InboxEntryKind;
  summary: string;
  at: number;
}

/** messageQueued → reply-in-flight entry (idempotent per message id). */
export function addQueued(entries: InboxEntry[], message: InjectedMessage): InboxEntry[] {
  if (entries.some(entry => entry.id === message.id)) {
    return entries;
  }
  return [
    ...entries,
    {
      id: message.id,
      taskId: message.taskId,
      kind: 'queued',
      summary: message.body,
      at: message.queuedAt,
    },
  ];
}

/** messageInjected → delivered, entry resolves. */
export function resolveInjected(entries: InboxEntry[], message: InjectedMessage): InboxEntry[] {
  return entries.filter(entry => entry.id !== message.id);
}

/** messageDropped → task finished with the reply undelivered; flag it. */
export function markDropped(entries: InboxEntry[], message: InjectedMessage): InboxEntry[] {
  const existing = entries.find(entry => entry.id === message.id);
  if (!existing) {
    return [
      ...entries,
      {
        id: message.id,
        taskId: message.taskId,
        kind: 'dropped',
        summary: message.body,
        at: message.queuedAt,
      },
    ];
  }
  return entries.map(entry =>
    entry.id === message.id ? { ...entry, kind: 'dropped' as const } : entry
  );
}

/** failed → attention entry for the task (idempotent per task). */
export function addFailed(entries: InboxEntry[], task: BackgroundTask, at: number): InboxEntry[] {
  const id = `failed-${task.id}`;
  if (entries.some(entry => entry.id === id)) {
    return entries;
  }
  return [
    ...entries,
    {
      id,
      taskId: task.id,
      kind: 'failed',
      summary: task.error?.message ?? `${task.agentId} failed`,
      at,
    },
  ];
}

/** cancelled → the task's pending entries are moot (dropped ones already flagged). */
export function clearQueuedForTask(entries: InboxEntry[], taskId: string): InboxEntry[] {
  return entries.filter(entry => entry.taskId !== taskId || entry.kind !== 'queued');
}

/** User dismissal of any entry. */
export function dismissEntry(entries: InboxEntry[], id: string): InboxEntry[] {
  return entries.filter(entry => entry.id !== id);
}
