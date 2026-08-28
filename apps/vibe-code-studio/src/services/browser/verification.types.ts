/**
 * Autonomous post-edit verification types — spec 11 Phase 2. The pass runs
 * between task settle and walkthrough generation (artifactCapture hook),
 * still behind Phase 1's permission gate: nothing launches until the user
 * approves the session. Dev-server orchestration rides TerminalService.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import type { EnsureSessionResult } from './BrowserSessionService';
import type { BrowserActionResult, BrowserSessionEndReason } from './types';

/** Structural slice of TerminalService the dev-server orchestrator drives */
export interface TerminalLike {
  createSession(cwd?: string): string;
  startShell(
    sessionId: string,
    onData: (data: string) => void,
    onExit: (code: number | null) => void
  ): Promise<void>;
  writeInput(sessionId: string, data: string): void;
  closeSession(sessionId: string): void;
}

export interface DevServerStartOptions {
  /** e.g. `pnpm dev` — resolved from the workspace package.json scripts */
  command: string;
  /** Workspace root the dev command runs in */
  cwd: string;
}

export type DevServerStartResult = { ok: true; url: string } | { ok: false; reason: string };

export type DevServerState = 'idle' | 'starting' | 'ready' | 'stopped' | 'failed';

/** One dev-server lifecycle: start (await readiness) then tear down */
export interface DevServerHandle {
  start(options: DevServerStartOptions): Promise<DevServerStartResult>;
  stop(): void;
}

/** Structural slice of BrowserSessionService the verification pass uses */
export interface VerificationSessionClient {
  ensureSession(taskId: string, intent: string): Promise<EnsureSessionResult>;
  performAction(taskId: string, rawParams: unknown): Promise<BrowserActionResult>;
  endSessionsForTask(taskId: string, reason: BrowserSessionEndReason): void;
}

/** Injectable collaborators for runVerificationPass (all default-wired) */
export interface VerificationDeps {
  session: VerificationSessionClient;
  /** Current workspace root, or null when no folder is open */
  getWorkspaceRoot: () => string | null;
  /** Resolve the workspace's dev command (null → skip verification) */
  resolveCommand: (workspaceRoot: string) => Promise<string | null>;
  /** Fresh dev-server handle per pass */
  createServer: () => DevServerHandle;
}
