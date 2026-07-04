/**
 * Task runner integration — wires TaskRunnerService to the app's real
 * terminal, filesystem, and zustand stores. UI surfaces (command palette,
 * ProblemsPanelHost) call these functions instead of constructing services.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { FileSystemService } from '../FileSystemService';
import { terminalService } from '../TerminalService';
import { useProblemsStore } from '../../stores/problemsStore';
import { useTasksStore } from '../../stores/tasksStore';
import { TaskRunnerService } from './TaskRunnerService';
import type { TaskParseResult, VcsTask } from './types';

let runnerInstance: TaskRunnerService | null = null;

function createRunner(): TaskRunnerService {
  const fileSystem = new FileSystemService();
  return new TaskRunnerService({
    terminal: terminalService,
    readFile: path => fileSystem.readFile(path),
    onDiagnostics: (source, diagnostics) =>
      useProblemsStore.getState().actions.append(source, diagnostics),
    clearDiagnostics: source => useProblemsStore.getState().actions.clearSource(source),
    onTaskStart: (label, sessionId) =>
      useTasksStore.getState().actions.markRunning(label, sessionId, Date.now()),
    onTaskEnd: (label, exitCode) => useTasksStore.getState().actions.markStopped(label, exitCode),
  });
}

export function getTaskRunner(): TaskRunnerService {
  runnerInstance ??= createRunner();
  return runnerInstance;
}

/** Test seam: swap or reset the singleton */
export function setTaskRunnerForTests(runner: TaskRunnerService | null): void {
  runnerInstance = runner;
}

/** Reads .vcs/tasks.json and mirrors the result into tasksStore */
export async function loadWorkspaceTasks(workspaceRoot: string): Promise<TaskParseResult> {
  const result = await getTaskRunner().loadTasks(workspaceRoot);
  const { actions } = useTasksStore.getState();
  if (result.ok) {
    actions.setTasks(result.tasks);
  } else {
    actions.setLoadError(result.error);
  }
  return result;
}

/** Runs a task by label; opens the Problems panel when it has a matcher */
export async function runWorkspaceTask(label: string): Promise<number | null> {
  const task = getTaskRunner()
    .getTasks()
    .find((t: VcsTask) => t.label === label);
  if (task?.problemMatcher) {
    useProblemsStore.getState().actions.setPanelOpen(true);
  }
  return getTaskRunner().runTask(label);
}

/** Ctrl+Shift+B: run the default build task if one is defined */
export async function runDefaultBuildTask(): Promise<number | null> {
  const task = getTaskRunner().getDefaultBuildTask();
  if (!task) return null;
  return runWorkspaceTask(task.label);
}

export function cancelWorkspaceTask(label: string): boolean {
  return getTaskRunner().cancelTask(label);
}
