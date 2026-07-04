/**
 * Artifact capture — wires BackgroundAgentSystem's existing event stream to
 * the ArtifactStore and mirrors results into the artifacts zustand store.
 * Task-list artifacts are created at task START (spec AC #12) and evolve as
 * steps run: submitted → draft checklist, stepStart → unchecked line,
 * stepComplete → checked line, completed/failed → status 'final'.
 * recordDiffArtifact/recordPlanArtifact are the Phase-1 entry points for
 * diff/plan producers (multi-file flow, spec 05 plan mode).
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import type { FileChange } from '@vibetech/types';
import { useArtifactsStore } from '../../stores/artifactsStore';
import { logger } from '../Logger';
import { ArtifactStore } from './ArtifactStore';
import { checkTaskListLine, encodeDiffContent, taskListLine } from './artifactContent';
import type { Artifact, ArtifactTaskEvents, CapturedStepLike, CapturedTaskLike } from './types';

let storeInstance: ArtifactStore | null = null;
let attachedTo: ArtifactTaskEvents | null = null;
/** BackgroundTask id → task_list artifact id, for incremental updates */
const taskListIds = new Map<string, string>();

function syncToUiStore(): void {
  if (!storeInstance) return;
  useArtifactsStore.getState().actions.setArtifacts(storeInstance.list());
}

function requireStore(): ArtifactStore {
  if (!storeInstance) throw new Error('Artifacts not initialized — call initArtifactCapture');
  return storeInstance;
}

/** Fire-and-forget store mutation with logged (never thrown) failures */
export function runArtifactAction(action: () => Promise<unknown>, label: string): void {
  void action().catch((err: unknown) => {
    logger.warn(`[Artifacts] ${label} failed`, err);
  });
}

async function onSubmitted(task: CapturedTaskLike): Promise<void> {
  if (!task.id) return;
  const content = [`**Request:** ${task.userRequest ?? '(unknown)'}`, '', '## Steps', ''].join(
    '\n'
  );
  const artifact = await requireStore().record({
    taskId: task.id,
    kind: 'task_list',
    title: `Task list — ${(task.userRequest ?? task.id).slice(0, 80)}`,
    content,
    status: 'draft',
  });
  taskListIds.set(task.id, artifact.id);
  syncToUiStore();
}

async function onStepStart(task: CapturedTaskLike, step: CapturedStepLike): Promise<void> {
  const artifactId = task.id ? taskListIds.get(task.id) : undefined;
  const existing = artifactId ? requireStore().get(artifactId) : undefined;
  if (!existing || !step.description) return;
  await requireStore().update(existing.id, {
    content: `${existing.content}\n${taskListLine(step.description, false)}`,
  });
  syncToUiStore();
}

async function onStepComplete(task: CapturedTaskLike, step: CapturedStepLike): Promise<void> {
  const artifactId = task.id ? taskListIds.get(task.id) : undefined;
  const existing = artifactId ? requireStore().get(artifactId) : undefined;
  if (!existing || !step.description) return;
  await requireStore().update(existing.id, {
    content: checkTaskListLine(existing.content, step.description),
  });
  syncToUiStore();
}

async function onFinished(task: CapturedTaskLike, outcome: 'completed' | 'failed'): Promise<void> {
  const artifactId = task.id ? taskListIds.get(task.id) : undefined;
  const existing = artifactId ? requireStore().get(artifactId) : undefined;
  if (!existing) return;
  const footer =
    outcome === 'completed'
      ? '\n\n✅ Task completed.'
      : `\n\n❌ Task failed${task.error?.message ? `: ${task.error.message}` : ''}.`;
  await requireStore().update(existing.id, {
    content: existing.content + footer,
    status: 'final',
  });
  if (task.id) taskListIds.delete(task.id);
  syncToUiStore();
}

const listeners: Record<string, (...args: unknown[]) => void> = {
  submitted: (...args) =>
    runArtifactAction(() => onSubmitted(args[0] as CapturedTaskLike), 'task_list create'),
  stepStart: (...args) =>
    runArtifactAction(
      () => onStepStart(args[0] as CapturedTaskLike, args[1] as CapturedStepLike),
      'task_list step add'
    ),
  stepComplete: (...args) =>
    runArtifactAction(
      () => onStepComplete(args[0] as CapturedTaskLike, args[1] as CapturedStepLike),
      'task_list step check'
    ),
  completed: (...args) =>
    runArtifactAction(() => onFinished(args[0] as CapturedTaskLike, 'completed'), 'finalize'),
  failed: (...args) =>
    runArtifactAction(() => onFinished(args[0] as CapturedTaskLike, 'failed'), 'finalize'),
};

/**
 * Create (once) the store and attach capture listeners. Idempotent — safe
 * across React re-mounts; re-attaches only if the event source changed.
 */
export async function initArtifactCapture(events: ArtifactTaskEvents): Promise<ArtifactStore> {
  storeInstance ??= new ArtifactStore();
  await storeInstance.load();
  if (attachedTo !== events) {
    if (attachedTo) {
      for (const [event, listener] of Object.entries(listeners)) {
        attachedTo.off(event, listener);
      }
    }
    for (const [event, listener] of Object.entries(listeners)) {
      events.on(event, listener);
    }
    attachedTo = events;
  }
  syncToUiStore();
  return storeInstance;
}

/** Test seam: detach listeners and clear singletons */
export function resetArtifactCaptureForTests(): void {
  if (attachedTo) {
    for (const [event, listener] of Object.entries(listeners)) {
      attachedTo.off(event, listener);
    }
  }
  attachedTo = null;
  storeInstance = null;
  taskListIds.clear();
}

/** Record a diff artifact (multi-file flow / future callers) — spec AC #4 */
export async function recordDiffArtifact(
  taskId: string,
  title: string,
  changes: FileChange[],
  estimatedImpact: 'low' | 'medium' | 'high' = 'medium'
): Promise<Artifact> {
  const artifact = await requireStore().record({
    taskId,
    kind: 'diff',
    title,
    content: encodeDiffContent(changes, estimatedImpact),
    status: 'final',
  });
  syncToUiStore();
  return artifact;
}

/** Record a plan artifact (spec 05 plan mode feeds this) — markdown content */
export async function recordPlanArtifact(
  taskId: string,
  title: string,
  markdown: string
): Promise<Artifact> {
  const artifact = await requireStore().record({
    taskId,
    kind: 'plan',
    title,
    content: markdown,
    status: 'final',
  });
  syncToUiStore();
  return artifact;
}

/** Delete an artifact from the panel */
export async function deleteArtifact(id: string): Promise<void> {
  await requireStore().remove(id);
  syncToUiStore();
}
