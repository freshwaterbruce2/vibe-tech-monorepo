/**
 * TaskParser — parses and validates .vcs/tasks.json (VS Code tasks.json schema subset).
 * Never throws on malformed input: returns a typed TaskParseResult instead.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { z } from 'zod';
import type { TaskGroupKind, TaskParseResult, VcsTask } from './types';

const problemPatternSchema = z.object({
  regexp: z.string().min(1),
  file: z.number().int().optional(),
  line: z.number().int().optional(),
  column: z.number().int().optional(),
  severity: z.number().int().optional(),
  code: z.number().int().optional(),
  message: z.number().int().optional(),
  loop: z.boolean().optional(),
});

const problemMatcherSchema = z.union([
  z.string(),
  z.object({
    pattern: z.union([problemPatternSchema, z.array(problemPatternSchema).min(1)]),
  }),
]);

const groupSchema = z.union([
  z.enum(['build', 'test', 'none']),
  z.object({
    kind: z.enum(['build', 'test', 'none']),
    isDefault: z.boolean().optional(),
  }),
]);

const presentationSchema = z.object({
  reveal: z.enum(['always', 'silent', 'never']).optional(),
  panel: z.enum(['shared', 'dedicated', 'new']).optional(),
  clear: z.boolean().optional(),
});

const taskSchema = z.object({
  label: z.string().min(1),
  type: z.enum(['shell', 'process']).default('shell'),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  group: groupSchema.optional(),
  presentation: presentationSchema.optional(),
  problemMatcher: problemMatcherSchema.optional(),
  isBackground: z.boolean().optional(),
  dependsOn: z.union([z.string(), z.array(z.string())]).optional(),
  dependsOrder: z.enum(['sequence', 'parallel']).optional(),
});

const tasksFileSchema = z.object({
  version: z.string(),
  tasks: z.array(taskSchema),
});

/** Copies one string-literal char (with escape lookahead) for stripJsonComments */
function copyStringChar(
  ch: string,
  next: string | undefined
): { text: string; extraConsumed: number; closed: boolean } {
  if (ch === '\\') return { text: ch + (next ?? ''), extraConsumed: 1, closed: false };
  return { text: ch, extraConsumed: 0, closed: ch === '"' };
}

/**
 * Strips // and both-slash block comments from JSONC without corrupting
 * string literals (e.g. "https://..." must survive). Small state machine.
 */
export function stripJsonComments(input: string): string {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] as string;
    const next = input[i + 1];
    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      const step = copyStringChar(ch, next);
      out += step.text;
      i += step.extraConsumed;
      if (step.closed) inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '/' && (next === '/' || next === '*')) {
      inLine = next === '/';
      inBlock = next === '*';
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Parse + validate tasks.json content. Returns typed result, never throws. */
export function parseTasksJson(content: string): TaskParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonComments(content));
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${(err as Error).message}` };
  }
  const result = tasksFileSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue && issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return { ok: false, error: `Schema error at ${path}: ${issue?.message ?? 'unknown'}` };
  }
  const labels = new Set<string>();
  for (const task of result.data.tasks) {
    if (labels.has(task.label)) {
      return { ok: false, error: `Duplicate task label: "${task.label}"` };
    }
    labels.add(task.label);
  }
  return { ok: true, tasks: result.data.tasks };
}

/** Normalized group kind for a task ('none' when unset) */
export function getGroupKind(task: VcsTask): TaskGroupKind {
  if (!task.group) return 'none';
  return typeof task.group === 'string' ? task.group : task.group.kind;
}

/** True when the task is marked `"group": {"kind": <kind>, "isDefault": true}` */
function isDefaultOfKind(task: VcsTask, kind: TaskGroupKind): boolean {
  return (
    typeof task.group === 'object' && task.group.kind === kind && task.group.isDefault === true
  );
}

/** The default task of a group (Ctrl+Shift+B target for 'build') */
export function findDefaultTask(tasks: VcsTask[], kind: TaskGroupKind): VcsTask | undefined {
  const explicit = tasks.find(t => isDefaultOfKind(t, kind));
  if (explicit) return explicit;
  const ofKind = tasks.filter(t => getGroupKind(t) === kind);
  return ofKind.length === 1 ? ofKind[0] : undefined;
}
