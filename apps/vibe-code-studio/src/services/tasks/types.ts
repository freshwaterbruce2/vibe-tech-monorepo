/**
 * Task Runner types — VS Code tasks.json schema subset (.vcs/tasks.json)
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */

export type TaskType = 'shell' | 'process';
export type TaskGroupKind = 'build' | 'test' | 'none';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface TaskGroup {
  kind: TaskGroupKind;
  isDefault?: boolean;
}

export interface TaskPresentation {
  reveal?: 'always' | 'silent' | 'never';
  panel?: 'shared' | 'dedicated' | 'new';
  clear?: boolean;
}

/** One regex pattern with capture-group indices, VS Code problemMatcher.pattern shape */
export interface ProblemPatternConfig {
  regexp: string;
  file?: number;
  line?: number;
  column?: number;
  severity?: number;
  code?: number;
  message?: number;
  /** Last pattern in a multi-line matcher may loop over consecutive matching lines */
  loop?: boolean;
}

export interface ProblemMatcherConfig {
  pattern: ProblemPatternConfig | ProblemPatternConfig[];
}

/** Either a built-in name ("$tsc", "$eslint-stylish") or an inline matcher config */
export type ProblemMatcherRef = string | ProblemMatcherConfig;

export interface VcsTask {
  label: string;
  type: TaskType;
  command: string;
  args?: string[];
  cwd?: string;
  group?: TaskGroupKind | TaskGroup;
  presentation?: TaskPresentation;
  problemMatcher?: ProblemMatcherRef;
  isBackground?: boolean;
  dependsOn?: string | string[];
  dependsOrder?: 'sequence' | 'parallel';
}

export interface TasksFile {
  version: string;
  tasks: VcsTask[];
}

export type TaskParseResult = { ok: true; tasks: VcsTask[] } | { ok: false; error: string };

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
  code?: string;
  /** Task label (or later: 'lsp', 'debugger') that produced this diagnostic */
  source: string;
}

export interface RunningTaskInfo {
  sessionId: string;
  startedAt: number;
}
