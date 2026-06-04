import { spawn } from 'node:child_process';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ItTask {
  readonly key: string;
  readonly label: string;
  readonly command: string;
  readonly cwd: string;
  readonly logPath: string;
  readonly historyPath: string;
  readonly timeoutMs: number;
  readonly requiresConfirmation: boolean;
}

export interface TaskOptions {
  readonly workspaceRoot?: string;
  readonly logRoot?: string;
}

interface TaskDefinition {
  readonly label: string;
  readonly command: string;
  readonly requiresConfirmation: boolean;
}

interface ShellResult {
  readonly output: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
}

const defaultWorkspaceRoot = 'C:/dev';
const defaultLogRoot = 'D:/logs/vibe-it-specialist-bot';
const maxOutputChars = 3500;

export const ALLOWLISTED_RUN_TASKS: Record<string, TaskDefinition> = {
  'git-status': { label: 'Git status', command: 'git status --short', requiresConfirmation: false },
  'nx-report': { label: 'Nx report', command: 'pnpm nx report', requiresConfirmation: false },
  diagnose: { label: 'Full monorepo diagnosis', command: 'node -v; pnpm -v; git status --short; pnpm nx report; pnpm nx show projects', requiresConfirmation: false },
  health: { label: 'Workspace health', command: 'pnpm run workspace:health', requiresConfirmation: false },
  'affected-quality': { label: 'Affected quality checks', command: 'pnpm nx affected -t lint typecheck build', requiresConfirmation: false },
  affected: { label: 'Affected quality checks', command: 'pnpm nx affected -t lint typecheck build', requiresConfirmation: false },
  'pnpm-install-check': { label: 'PNPM install check', command: 'pnpm install --frozen-lockfile', requiresConfirmation: false },
  'install-check': { label: 'PNPM install check', command: 'pnpm install --frozen-lockfile', requiresConfirmation: false },
  'nx-reset': {
    label: 'Nx reset',
    command: process.platform === 'win32'
      ? 'pnpm exec nx daemon --stop; powershell -Command "Remove-Item -Path C:/dev/.nx/cache/*, D:/nx-workspace-data/* -Force -Recurse -ErrorAction SilentlyContinue"'
      : 'pnpm nx reset',
    requiresConfirmation: true,
  },
  'pnpm-install': { label: 'PNPM install', command: 'pnpm install', requiresConfirmation: true },
  install: { label: 'PNPM install', command: 'pnpm install', requiresConfirmation: true },
  'pnpm-store-prune': { label: 'PNPM store prune', command: 'pnpm store prune', requiresConfirmation: true },
  'fix-pnpm': { label: 'PNPM repair', command: 'pnpm store prune; pnpm install', requiresConfirmation: true },
  optimize: { label: 'Optimization report', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js', requiresConfirmation: false },
  'optimize-targets': { label: 'Optimization: targets', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js targets', requiresConfirmation: false },
  'optimize-deps': { label: 'Optimization: deps', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js deps', requiresConfirmation: false },
  'optimize-hygiene': { label: 'Optimization: hygiene', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js hygiene', requiresConfirmation: false },
  'optimize-paths': { label: 'Optimization: paths', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js paths', requiresConfirmation: false },
  'optimize-trends': { label: 'Optimization: trends', command: 'node apps/vibe-it-specialist-bot/dist/src/trends.js', requiresConfirmation: false },
  'optimize-cache': { label: 'Optimization: cache', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js cache', requiresConfirmation: false },
  'optimize-report': { label: 'Optimization: report', command: 'node apps/vibe-it-specialist-bot/dist/src/optimization.js report', requiresConfirmation: false },
  status: { label: 'Bot status', command: 'node apps/vibe-it-specialist-bot/dist/src/status.js', requiresConfirmation: false },
  ci: { label: 'Bot CI/CD status', command: 'node apps/vibe-it-specialist-bot/dist/src/ci.js', requiresConfirmation: false },
  incidents: { label: 'Bot incidents report', command: 'node apps/vibe-it-specialist-bot/dist/src/incidents.js', requiresConfirmation: false },
};

export function listTaskKeys(): string[] {
  return Object.keys(ALLOWLISTED_RUN_TASKS).sort();
}

export function buildTask(input: string, now = new Date(), options: TaskOptions = {}): ItTask {
  const trimmed = input.trim();
  const [kind = '', ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ');
  const logRoot = normalizePath(options.logRoot ?? defaultLogRoot);
  const workspaceRoot = normalizePath(options.workspaceRoot ?? defaultWorkspaceRoot);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const key = kind || 'task';
  const base = {
    key,
    cwd: workspaceRoot,
    logPath: `${logRoot}/${stamp}-${sanitizeFilePart(key)}.log`,
    historyPath: `${logRoot}/runs.jsonl`,
    timeoutMs: 10 * 60 * 1000,
  };

  switch (kind) {
    case 'status':
    case 'ci':
    case 'incidents':
    case 'diagnose':
    case 'health':
    case 'affected':
    case 'install':
    case 'fix-pnpm':
      return fromDefinition(kind, base, ALLOWLISTED_RUN_TASKS[kind]);
    case 'typecheck':
    case 'build':
    case 'test': {
      if (!arg) throw new Error(`${kind} requires a project name, for example: ${kind} vibe-tutor`);
      assertSafeProjectName(arg);
      return { ...base, label: `${kind} ${arg}`, command: `pnpm nx ${kind} ${arg}`, requiresConfirmation: false };
    }
    case 'project': {
      const [first, second] = arg.split(/\s+/);
      if (!first || !second) throw new Error('project command requires a project and action, e.g. project vibe-tutor typecheck');
      const actionFirst = isProjectAction(first);
      const action = actionFirst ? first : second;
      const projectName = actionFirst ? second : first;
      if (!isProjectAction(action)) throw new Error(`Invalid project action: ${action}`);
      assertSafeProjectName(projectName);
      return { ...base, label: `${action} ${projectName}`, command: `pnpm nx ${action} ${projectName}`, requiresConfirmation: false };
    }
    case 'git':
      if (arg !== 'status') throw new Error('Only "git status" is allowed for git command.');
      return fromDefinition('git-status', base, ALLOWLISTED_RUN_TASKS['git-status']);
    case 'nx':
      if (arg === 'report') return fromDefinition('nx-report', base, ALLOWLISTED_RUN_TASKS['nx-report']);
      if (arg === 'reset') return fromDefinition('nx-reset', base, ALLOWLISTED_RUN_TASKS['nx-reset']);
      throw new Error(`Unknown nx command: ${arg}`);
    case 'pnpm':
      if (arg === 'install check' || arg === 'install-check') return fromDefinition('install-check', base, ALLOWLISTED_RUN_TASKS['install-check']);
      if (arg === 'store prune' || arg === 'store-prune') return fromDefinition('pnpm-store-prune', base, ALLOWLISTED_RUN_TASKS['pnpm-store-prune']);
      if (arg === 'nx reset' || arg === 'reset' || arg === 'nx-reset') return fromDefinition('nx-reset', base, ALLOWLISTED_RUN_TASKS['nx-reset']);
      if (arg === 'install') return fromDefinition('pnpm-install', base, ALLOWLISTED_RUN_TASKS['pnpm-install']);
      throw new Error(`Unknown pnpm command: ${arg}`);
    case 'optimize': {
      const category = arg.trim().toLowerCase();
      const allowedCategories = ['targets', 'deps', 'hygiene', 'cache', 'paths', 'trends', 'report'];
      if (category && !allowedCategories.includes(category)) {
        throw new Error(`Unknown optimization category: "${category}". Allowed: ${allowedCategories.join(', ')}`);
      }
      
      if (category === 'trends') {
        return {
          ...base,
          label: 'Optimization: trends',
          command: 'node apps/vibe-it-specialist-bot/dist/src/trends.js',
          requiresConfirmation: false,
        };
      }

      return {
        ...base,
        label: `Optimization: ${category || 'full report'}`,
        command: `node apps/vibe-it-specialist-bot/dist/src/optimization.js ${category || ''}`,
        requiresConfirmation: false,
      };
    }
    case 'fix': {
      if (!arg) throw new Error('fix requires a target, for example: fix path-policy, fix typescript-version, fix target-coverage');
      const target = arg.trim().toLowerCase();
      if (target === 'path-policy' || target === 'path_policy') {
        return {
          ...base,
          label: 'Fix Path Policy',
          command: 'node apps/vibe-it-specialist-bot/dist/src/fix-paths.js',
          requiresConfirmation: true,
        };
      }
      if (target === 'typescript-version' || target === 'typescript_version' || target === 'typescript') {
        return {
          ...base,
          label: 'Fix TypeScript Version',
          command: 'node apps/vibe-it-specialist-bot/dist/src/fix-typescript.js',
          requiresConfirmation: true,
        };
      }
      if (target === 'target-coverage' || target === 'target_coverage' || target === 'targets') {
        return {
          ...base,
          label: 'Fix Target Coverage',
          command: 'node apps/vibe-it-specialist-bot/dist/src/fix-targets.js',
          requiresConfirmation: true,
        };
      }
      throw new Error(`Unknown fix target: "${arg}". Allowed: path-policy, typescript-version, target-coverage`);
    }
    case 'cmd':
    case 'shell':
      throw new Error('cmd command is disabled for security. Please use: /it run <allowlisted-task>');
    case 'run': {
      if (!arg) throw new Error(`run requires an allowlisted task. Allowed tasks: ${listTaskKeys().join(', ')}`);
      const taskKey = arg.trim().toLowerCase();
      const allowlisted = ALLOWLISTED_RUN_TASKS[taskKey];
      if (!allowlisted) throw new Error(`Task "${arg}" is not allowlisted. Allowed tasks: ${listTaskKeys().join(', ')}`);
      return fromDefinition(taskKey, base, allowlisted);
    }
    default:
      throw new Error(`Unknown IT task: ${trimmed}`);
  }
}

export function getTaskSafety(task: ItTask): { requiresConfirmation: boolean; reason: string } {
  return {
    requiresConfirmation: task.requiresConfirmation,
    reason: task.requiresConfirmation ? 'This task can mutate workspace state and requires confirmation.' : 'Read-only diagnostic task.',
  };
}

export async function runTask(task: ItTask): Promise<string> {
  const started = Date.now();
  const shellResult = await runShell(task.command, task.cwd, task.timeoutMs);
  const elapsed = Date.now() - started;
  const redacted = redactSensitiveOutput(shellResult.output);
  await mkdir(dirname(task.logPath), { recursive: true });
  await writeFile(task.logPath, redacted, 'utf8');
  await appendHistory(task, started, elapsed, shellResult.exitCode, shellResult.signal);
  const tail = formatOutputTail(redacted);
  return `Task: ${task.label}\nExit code: ${shellResult.exitCode ?? 'null'}\nExit log: ${task.logPath}\nHistory: ${task.historyPath}\nElapsed: ${Math.round(elapsed / 1000)}s\n\n${tail}`;
}

export function telegramSafeText(text: string, limit = 3900): string {
  if (text.length <= limit) return text;
  const prefix = `[Output truncated to fit Telegram limit: showing last ${limit} characters]\n\n`;
  return prefix + text.slice(-(limit - prefix.length));
}

export function redactSensitiveOutput(output: string): string {
  return output
    .replace(/(BOT_TOKEN|PAYMENT_PROVIDER_TOKEN|TELEGRAM_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|SECRET_KEY|AUTH_SECRET|PASSWORD|JWT_SECRET|API_KEY|TOKEN)=([^\s\n\r]+)/gi, '$1=***')
    .replace(/\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g, '***telegram-token***');
}

function fromDefinition(key: string, base: Omit<ItTask, 'label' | 'command' | 'requiresConfirmation'>, definition: TaskDefinition | undefined): ItTask {
  if (!definition) throw new Error(`Unknown allowlisted task: ${key}`);
  return { ...base, key, label: definition.label, command: definition.command, requiresConfirmation: definition.requiresConfirmation };
}

async function appendHistory(task: ItTask, started: number, elapsedMs: number, exitCode: number | null, signal: NodeJS.Signals | null): Promise<void> {
  await mkdir(dirname(task.historyPath), { recursive: true });
  const record = {
    timestamp: new Date(started).toISOString(),
    key: task.key,
    label: task.label,
    command: task.command,
    cwd: task.cwd,
    logPath: normalizePath(task.logPath),
    exitCode,
    signal,
    durationMs: elapsedMs,
    requiresConfirmation: task.requiresConfirmation,
  };
  await appendFile(task.historyPath, `${JSON.stringify(record)}\n`, 'utf8');
}

function formatOutputTail(redacted: string): string {
  if (redacted.length <= maxOutputChars) return redacted;
  return `[Output truncated... showing last ${maxOutputChars} characters]\n\n${redacted.slice(-maxOutputChars)}`;
}

function assertSafeProjectName(project: string): void {
  if (!/^[A-Za-z0-9@/_:.+-]+$/.test(project)) throw new Error(`Unsafe project name: ${project}`);
}

function isProjectAction(action: string): action is 'typecheck' | 'build' | 'test' {
  return action === 'typecheck' || action === 'build' || action === 'test';
}

function sanitizeFilePart(input: string): string {
  return input.replace(/[^A-Za-z0-9_.-]/g, '-');
}

function normalizePath(input: string): string {
  return input.replaceAll('\\', '/');
}

async function runShell(command: string, cwd: string, timeoutMs: number): Promise<ShellResult> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = isWin
      ? spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', command], { cwd, shell: true })
      : spawn('bash', ['-lc', command], { cwd, shell: false });
    let output = `$ ${command}\n`;
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      output += `\n[exit=${code ?? 'null'} signal=${signal ?? 'none'}]\n`;
      resolve({ output, exitCode: code, signal });
    });
  });
}
