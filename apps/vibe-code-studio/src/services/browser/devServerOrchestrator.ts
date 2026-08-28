/**
 * Dev-server orchestrator — spec 11 Phase 2. Starts the workspace's dev
 * command through the existing TerminalService PTY, watches its output for a
 * local URL (readiness), and tears the session down when the verification
 * pass ends. State machine: idle → starting → ready | failed → stopped.
 * Every failure resolves as a structured result — nothing throws upward.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import type {
  DevServerHandle,
  DevServerStartOptions,
  DevServerStartResult,
  DevServerState,
  TerminalLike,
} from './verification.types';

export const DEFAULT_READY_TIMEOUT_MS = 60_000;
/** Rolling output window scanned for the ready URL */
const OUTPUT_WINDOW_CHARS = 8_192;

/** Local dev-server URL as printed by Vite/CRA/Next ("Local: http://...") */
const DEV_URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?[/\w#.?=&-]*)/i;

// Built dynamically so the control character never appears in a regex literal
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');

/** Strip ANSI color/cursor codes so URL matching sees plain text */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/** First local dev-server URL in the output window, or null */
export function findDevServerUrl(text: string): string | null {
  return DEV_URL_RE.exec(text)?.[1] ?? null;
}

/**
 * Resolve the workspace's dev command from package.json scripts:
 * `dev` preferred, `start` as fallback, null when neither exists or the
 * manifest is missing/malformed (callers skip verification on null).
 */
export async function resolveDevCommand(
  readFile: (path: string) => Promise<string>,
  workspaceRoot: string
): Promise<string | null> {
  const sep = workspaceRoot.includes('\\') ? '\\' : '/';
  const manifestPath = `${workspaceRoot.replace(/[\\/]+$/, '')}${sep}package.json`;
  try {
    const manifest = JSON.parse(await readFile(manifestPath)) as {
      scripts?: Record<string, unknown>;
    };
    if (typeof manifest.scripts?.['dev'] === 'string') return 'pnpm dev';
    if (typeof manifest.scripts?.['start'] === 'string') return 'pnpm start';
    return null;
  } catch {
    return null;
  }
}

export class DevServerOrchestrator implements DevServerHandle {
  private state: DevServerState = 'idle';
  private sessionId: string | null = null;
  private buffer = '';

  constructor(
    private readonly terminal: TerminalLike,
    private readonly readyTimeoutMs: number = DEFAULT_READY_TIMEOUT_MS
  ) {}

  getState(): DevServerState {
    return this.state;
  }

  /** Start the dev command and resolve once a local URL appears (or fail) */
  async start(options: DevServerStartOptions): Promise<DevServerStartResult> {
    if (this.state !== 'idle') {
      return { ok: false, reason: `orchestrator already used (state: ${this.state})` };
    }
    this.state = 'starting';
    const sessionId = this.terminal.createSession(options.cwd);
    this.sessionId = sessionId;
    return new Promise<DevServerStartResult>(resolve => {
      this.runUntilReady(sessionId, options.command, resolve);
    });
  }

  /** Idempotent teardown: kills the PTY session (and the dev server with it) */
  stop(): void {
    if (this.sessionId) {
      this.terminal.closeSession(this.sessionId);
      this.sessionId = null;
    }
    if (this.state === 'starting' || this.state === 'ready') {
      this.state = 'stopped';
    }
  }

  private runUntilReady(
    sessionId: string,
    command: string,
    resolve: (r: DevServerStartResult) => void
  ): void {
    let settled = false;
    const finish = (result: DevServerStartResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (result.ok) {
        this.state = 'ready';
      } else {
        // Mark failed BEFORE stop() so teardown can't soften it to 'stopped'
        this.state = 'failed';
        this.stop();
      }
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, reason: `dev server not ready within ${this.readyTimeoutMs}ms` }),
      this.readyTimeoutMs
    );
    const onData = (chunk: string): void => {
      this.buffer = (this.buffer + stripAnsi(chunk)).slice(-OUTPUT_WINDOW_CHARS);
      const url = findDevServerUrl(this.buffer);
      if (url) finish({ ok: true, url });
    };
    const onExit = (code: number | null): void => {
      finish({ ok: false, reason: `dev server exited (code ${code ?? 'unknown'}) before ready` });
    };
    this.terminal
      .startShell(sessionId, onData, onExit)
      .then(() => this.terminal.writeInput(sessionId, `${command}\r`))
      .catch((error: unknown) => {
        finish({
          ok: false,
          reason: `failed to start shell: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
  }
}
