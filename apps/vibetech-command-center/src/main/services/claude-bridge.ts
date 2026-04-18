import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ProcessRunner } from './process-runner';
import type {
  ClaudeInvocation,
  ClaudeStreamEvent,
  ClaudeInvocationResult,
  ProcessChunk
} from '../../shared/types';

export interface ClaudeBridgeOptions {
  /**
   * For tests only — pass process.execPath (node in Vitest context).
   * When set, claudeJsPath is ignored and this value is used as the command directly.
   * @deprecated Production code should rely on auto-resolved nodeCommand + claudeJsPath.
   */
  claudeCommand?: string;
  /** Absolute path to the Claude Code cli.js entry point. Defaults to auto-resolved pnpm global install. */
  claudeJsPath?: string;
  /** Absolute path to node.exe. Defaults to auto-resolved system Node (not Electron's own node). */
  nodeCommand?: string;
  defaultTimeoutMs?: number;
}

export class ClaudeBridge extends EventEmitter {
  private readonly opts: ClaudeBridgeOptions;
  private readonly defaultTimeoutMs: number;
  private readonly runner: ProcessRunner;

  constructor(opts: ClaudeBridgeOptions = {}, runner?: ProcessRunner) {
    super();
    this.opts = opts;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 20 * 60 * 1000;
    this.runner = runner ?? new ProcessRunner();
  }

  // Resolved lazily inside invoke() so construction never throws (e.g. in tests that only call buildArgs).
  private resolveSpawnTarget(): { command: string; jsPath: string | null } {
    if (this.opts.claudeCommand !== undefined) {
      return { command: this.opts.claudeCommand, jsPath: null };
    }
    return {
      command: this.opts.nodeCommand ?? resolveNodeExe(),
      jsPath: this.opts.claudeJsPath ?? resolveClaudeJs()
    };
  }

  async invoke(inv: ClaudeInvocation): Promise<ClaudeInvocationResult> {
    const invocationId = inv.invocationId ?? randomUUID();
    const startedAt = Date.now();
    const { command, jsPath } = this.resolveSpawnTarget();
    const builtArgs = this.buildArgs(inv);
    const args = jsPath !== null ? [jsPath, ...builtArgs] : builtArgs;

    let sessionId: string | null = null;
    let resultText: string | null = null;
    let totalCostUsd: number | null = null;
    let numTurns: number | null = null;

    const handle = this.runner.spawn({
      command,
      args,
      cwd: inv.cwd,
      timeoutMs: inv.timeoutMs ?? this.defaultTimeoutMs
    });

    const onChunk = (chunk: ProcessChunk) => {
      if (chunk.processId !== handle.id) return;
      if (chunk.stream !== 'stdout') {
        this.emit('stream', this.makeEvent(invocationId, 'error', 'stderr', { line: chunk.data }));
        return;
      }
      const line = chunk.data.trim();
      if (!line) return;
      try {
        const msg = JSON.parse(line) as {
          type?: string;
          subtype?: string;
          session_id?: string;
          result?: string;
          total_cost_usd?: number;
          num_turns?: number;
        };
        if (msg.session_id && !sessionId) sessionId = msg.session_id;
        if (msg.type === 'result') {
          if (typeof msg.result === 'string') resultText = msg.result;
          if (typeof msg.total_cost_usd === 'number') totalCostUsd = msg.total_cost_usd;
          if (typeof msg.num_turns === 'number') numTurns = msg.num_turns;
        }
        const type = (msg.type ?? 'raw') as ClaudeStreamEvent['type'];
        this.emit('stream', this.makeEvent(invocationId, type, msg.subtype, msg));
      } catch {
        this.emit('stream', this.makeEvent(invocationId, 'raw', undefined, { line }));
      }
    };

    this.runner.on('chunk', onChunk);
    try {
      const exited = await this.runner.waitFor(handle.id, (inv.timeoutMs ?? this.defaultTimeoutMs) + 5_000);
      const durationMs = Date.now() - startedAt;
      return {
        invocationId,
        sessionId,
        success: exited.exitCode === 0,
        exitCode: exited.exitCode,
        resultText,
        durationMs,
        totalCostUsd,
        numTurns,
        error: exited.exitCode === 0 ? undefined : `exit ${exited.exitCode}`
      };
    } finally {
      this.runner.off('chunk', onChunk);
    }
  }

  protected buildArgs(inv: ClaudeInvocation): string[] {
    const args: string[] = [
      '-p', inv.prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--allowedTools', inv.allowedTools.join(',')
    ];
    if (inv.resumeSessionId) args.push('--resume', inv.resumeSessionId);
    if (inv.appendSystemPrompt) args.push('--append-system-prompt', inv.appendSystemPrompt);
    if (inv.permissionMode) args.push('--permission-mode', inv.permissionMode);
    return args;
  }

  private makeEvent(
    invocationId: string,
    type: ClaudeStreamEvent['type'],
    subtype: string | undefined,
    payload: unknown
  ): ClaudeStreamEvent {
    return { invocationId, type, subtype, payload, timestamp: Date.now() };
  }
}

function resolveNodeExe(): string {
  const localAppData = process.env['LOCALAPPDATA'] ?? '';
  const appData = process.env['APPDATA'] ?? '';
  const userProfile = process.env['USERPROFILE'] ?? '';

  const candidates = [
    process.env['NODE_EXE_PATH'],
    // fnm stable alias — APPDATA\fnm (Roaming), not LOCALAPPDATA\fnm
    join(appData, 'fnm', 'aliases', 'default', 'node.exe'),
    join(localAppData, 'fnm', 'aliases', 'default', 'node.exe'),
    // nvm-windows
    process.env['NVM_SYMLINK'],
    join(userProfile, '.nvm', 'current', 'node.exe'),
    // Standard install locations
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'node.exe not found — set NODE_EXE_PATH env var to the full path of node.exe'
  );
}

function resolveClaudeJs(): string {
  if (process.env['CLAUDE_JS_PATH'] && existsSync(process.env['CLAUDE_JS_PATH'])) {
    return process.env['CLAUDE_JS_PATH'];
  }

  const localAppData = process.env['LOCALAPPDATA'] ?? '';

  // pnpm global install: parse the .cmd shim to get the exact versioned path
  const claudeCmd = join(localAppData, 'pnpm', 'claude.CMD');
  if (existsSync(claudeCmd)) {
    const src = readFileSync(claudeCmd, 'utf8');
    // The shim contains: node  "%~dp0\global\5\.pnpm\@anthropic-ai+claude-code@X.Y.Z\...cli.js"
    const m = src.match(/global[/\\]5[/\\]\.pnpm[/\\](@anthropic-ai\+claude-code@[^\\]+)[/\\].*?cli\.js/i);
    if (m && m[1]) {
      const resolved = join(localAppData, 'pnpm', 'global', '5', '.pnpm', m[1],
        'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      if (existsSync(resolved)) return resolved;
    }
  }

  // pnpm global: scan .pnpm dir for any installed version
  const pnpmPnpmDir = join(localAppData, 'pnpm', 'global', '5', '.pnpm');
  if (existsSync(pnpmPnpmDir)) {
    const entries = readdirSync(pnpmPnpmDir)
      .filter((e) => e.startsWith('@anthropic-ai+claude-code@'))
      .sort()
      .reverse(); // prefer newest version
    for (const entry of entries) {
      const p = join(pnpmPnpmDir, entry, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      if (existsSync(p)) return p;
    }
  }

  // npm global fallback
  const npmGlobal = join(process.env['APPDATA'] ?? '', 'npm', 'node_modules',
    '@anthropic-ai', 'claude-code', 'cli.js');
  if (existsSync(npmGlobal)) return npmGlobal;

  throw new Error(
    'Claude Code CLI not found — set CLAUDE_JS_PATH env var to the full path of cli.js, ' +
    'or install Claude Code globally: pnpm add -g @anthropic-ai/claude-code'
  );
}
