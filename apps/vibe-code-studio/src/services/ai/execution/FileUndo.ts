import type { ActionContext } from './types';

export interface FileUndoSnapshot {
  path: string;
  before: string | null;
  after: string;
}

// Keep file contents out of persisted task results and model context.
const snapshots = new WeakMap<ActionContext['taskState'], Map<string, FileUndoSnapshot[]>>();

export function recordFileUndo(context: ActionContext, snapshot: FileUndoSnapshot): void {
  const owner = context.taskState;
  const byTask = snapshots.get(owner) ?? new Map<string, FileUndoSnapshot[]>();
  const taskId = owner.task?.id ?? '';
  const history = byTask.get(taskId) ?? [];
  history.push(snapshot);
  byTask.set(taskId, history);
  snapshots.set(owner, byTask);
}

export function takeFileUndo(
  context: ActionContext,
  taskId = context.taskState.task?.id ?? ''
): FileUndoSnapshot[] {
  const byTask = snapshots.get(context.taskState);
  const history = byTask?.get(taskId) ?? [];
  byTask?.delete(taskId);
  return history;
}

/** Restore only unchanged agent output, newest write first. */
export async function restoreFileUndo(context: ActionContext, taskId: string) {
  const history = takeFileUndo(context, taskId);
  const handledPaths = new Set(history.map(snapshot => snapshot.path));
  const conflictedPaths = new Set<string>();
  const restoredFiles: string[] = [];
  const errors: string[] = [];
  for (const snapshot of history.reverse()) {
    if (conflictedPaths.has(snapshot.path)) continue;
    try {
      const current = await context.fileSystemService.readFile(snapshot.path);
      if (current !== snapshot.after) throw new Error('File changed after the agent wrote it');
      if (snapshot.before === null) {
        await context.fileSystemService.deleteFile(snapshot.path);
      } else {
        await context.fileSystemService.writeFile(snapshot.path, snapshot.before);
      }
      restoredFiles.push(snapshot.path);
    } catch (error) {
      conflictedPaths.add(snapshot.path);
      errors.push(snapshot.path + ': ' + String(error));
    }
  }
  return { handledPaths, restoredFiles, errors };
}

export interface RollbackResult {
  success: boolean;
  stepsRolledBack: string[];
  filesRestored: string[];
  error?: string;
}
