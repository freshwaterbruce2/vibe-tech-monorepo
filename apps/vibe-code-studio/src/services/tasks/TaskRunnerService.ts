/**
 * TaskRunnerService — thin orchestration over TerminalService for .vcs/tasks.json
 * tasks: resolves dependsOn order, spawns one terminal session per task, pipes
 * output through ProblemMatcherSession, reports lifecycle via injected callbacks.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { ProblemMatcherSession } from './ProblemMatcherEngine';
import { findDefaultTask, parseTasksJson } from './TaskParser';
import type { Diagnostic, TaskParseResult, VcsTask } from './types';

export class TaskRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskRunnerError';
  }
}

/** Minimal terminal surface the runner needs (subset of TerminalService) */
export interface TaskTerminal {
  createSession(cwd?: string): string;
  startShell(
    sessionId: string,
    onData: (data: string) => void,
    onExit: (code: number | null) => void
  ): Promise<void>;
  writeInput(sessionId: string, data: string): void;
  closeSession(sessionId: string): void;
}

export interface TaskRunnerDeps {
  terminal: TaskTerminal;
  readFile: (path: string) => Promise<string>;
  onDiagnostics: (source: string, diagnostics: Diagnostic[]) => void;
  clearDiagnostics: (source: string) => void;
  onOutput?: (label: string, data: string) => void;
  onTaskStart?: (label: string, sessionId: string) => void;
  onTaskEnd?: (label: string, exitCode: number | null) => void;
}

/** Quote an argument for pwsh: single-quote when needed, double embedded quotes */
export function quoteArg(arg: string): string {
  if (arg.length > 0 && !/[\s'"`;&|<>()]/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "''")}'`;
}

/**
 * Builds the line written into the task's pwsh session. `exit $LASTEXITCODE`
 * propagates the command's exit code to the shell process (Windows 11-only
 * target per platform rules — pwsh is TerminalService's win32 default shell).
 */
export function buildCommandLine(task: VcsTask): string {
  const args = (task.args ?? []).map(quoteArg).join(' ');
  const command = args.length > 0 ? `${task.command} ${args}` : task.command;
  return `${command}; exit $LASTEXITCODE\r`;
}

interface RunningEntry {
  sessionId: string;
  settle: (code: number | null) => void;
}

export class TaskRunnerService {
  private tasks: VcsTask[] = [];
  private running = new Map<string, RunningEntry>();

  constructor(private readonly deps: TaskRunnerDeps) {}

  /** Loads .vcs/tasks.json from the workspace. Missing file = zero tasks, ok. */
  async loadTasks(workspaceRoot: string): Promise<TaskParseResult> {
    let content: string;
    try {
      content = await this.deps.readFile(`${workspaceRoot}/.vcs/tasks.json`);
    } catch {
      this.tasks = [];
      return { ok: true, tasks: [] };
    }
    const result = parseTasksJson(content);
    if (result.ok) this.tasks = result.tasks;
    return result;
  }

  getTasks(): VcsTask[] {
    return [...this.tasks];
  }

  getDefaultBuildTask(): VcsTask | undefined {
    return findDefaultTask(this.tasks, 'build');
  }

  isRunning(label: string): boolean {
    return this.running.has(label);
  }

  /**
   * Runs a task, executing its dependsOn chain sequentially first.
   * A cancelled prerequisite (null exit) aborts the rest of the chain.
   */
  async runTask(label: string): Promise<number | null> {
    const order = this.resolveOrder(label);
    let lastCode: number | null = null;
    for (const taskLabel of order) {
      lastCode = await this.runSingle(this.mustGetTask(taskLabel));
      if (lastCode === null) break;
    }
    return lastCode;
  }

  /**
   * Runs a one-off task that is not defined in .vcs/tasks.json (spec 03
   * AC #11: AGENTS.md fenced commands). No dependsOn resolution — the task
   * runs exactly as given, through the same session/lifecycle plumbing.
   */
  runAdHoc(task: VcsTask): Promise<number | null> {
    return this.runSingle(task);
  }

  /**
   * Cancels a running task: settles its pending runTask promise with a null
   * exit code and closes the terminal session. (Session close removes the
   * Tauri exit listeners, so waiting for a natural onExit would leak forever.)
   */
  cancelTask(label: string): boolean {
    const entry = this.running.get(label);
    if (!entry) return false;
    entry.settle(null);
    return true;
  }

  private mustGetTask(label: string): VcsTask {
    const task = this.tasks.find(t => t.label === label);
    if (!task) throw new TaskRunnerError(`Unknown task: "${label}"`);
    return task;
  }

  /** DFS topological order over dependsOn with cycle detection. */
  private resolveOrder(label: string): string[] {
    const order: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (current: string): void => {
      if (visited.has(current)) return;
      if (visiting.has(current)) {
        throw new TaskRunnerError(`Circular dependsOn involving "${current}"`);
      }
      visiting.add(current);
      const task = this.mustGetTask(current);
      const deps = typeof task.dependsOn === 'string' ? [task.dependsOn] : (task.dependsOn ?? []);
      for (const dep of deps) visit(dep);
      visiting.delete(current);
      visited.add(current);
      order.push(current);
    };
    visit(label);
    return order;
  }

  private createMatcherSession(task: VcsTask): ProblemMatcherSession | undefined {
    if (!task.problemMatcher) return undefined;
    return new ProblemMatcherSession(task.problemMatcher, task.label, task.cwd);
  }

  private async runSingle(task: VcsTask): Promise<number | null> {
    if (this.running.has(task.label)) {
      throw new TaskRunnerError(`Task already running: "${task.label}"`);
    }
    this.deps.clearDiagnostics(task.label);
    const sessionId = this.deps.terminal.createSession(task.cwd);
    const matcher = this.createMatcherSession(task);
    let lineBuffer = '';
    const handleData = (data: string): void => {
      this.deps.onOutput?.(task.label, data);
      if (!matcher) return;
      lineBuffer += data;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const diagnostics = matcher.push(line);
        if (diagnostics.length > 0) this.deps.onDiagnostics(task.label, diagnostics);
      }
    };
    return new Promise(resolve => {
      let settled = false;
      const settle = (code: number | null): void => {
        if (settled) return;
        settled = true;
        this.running.delete(task.label);
        this.deps.terminal.closeSession(sessionId);
        this.deps.onTaskEnd?.(task.label, code);
        resolve(code);
      };
      this.running.set(task.label, { sessionId, settle });
      this.deps.onTaskStart?.(task.label, sessionId);
      void this.deps.terminal.startShell(sessionId, handleData, settle).then(() => {
        this.deps.terminal.writeInput(sessionId, buildCommandLine(task));
      });
    });
  }
}
