/**
 * BrowserSessionService — permission-gated browser control for agent tasks
 * (spec 11 Phase 1). Exactly one code path can reach a browser: every action
 * goes through here, and nothing talks to the `playwright` MCP server until
 * the user approves a session scoped to a single task (no "always allow").
 * Sessions end on user revoke, task settle, or replacement (spec AC #1/#9/#12).
 * Screenshots are registered as spec-09 `screenshot` artifacts (AC #6).
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { useBrowserSessionStore } from '../../stores/browserSessionStore';
import { recordScreenshotArtifact } from '../artifacts/artifactCapture';
import type { ArtifactTaskEvents } from '../artifacts/types';
import { logger } from '../Logger';
import { MCPService } from '../MCPService';
import {
  describeAction,
  parseBrowserAction,
  parseToolResult,
  toMcpToolCall,
} from './browserMcpAdapter';
import type {
  BrowserActionResult,
  BrowserErrorCode,
  BrowserPermissionRequest,
  BrowserSession,
  BrowserSessionEndReason,
  McpBrowserClient,
} from './types';

export const BROWSER_MCP_SERVER = 'playwright';
export const PERMISSION_TIMEOUT_MS = 120_000;

export type EnsureSessionResult =
  | { ok: true; session: BrowserSession }
  | { ok: false; error: { code: BrowserErrorCode; message: string } };

type ScreenshotRecorder = (
  taskId: string,
  title: string,
  payload: { imageDataUrl: string; capturedAt: string; description?: string }
) => Promise<{ id: string }>;

export interface BrowserSessionServiceDeps {
  mcp: McpBrowserClient;
  serverName?: string;
  recordScreenshot?: ScreenshotRecorder;
  now?: () => number;
  permissionTimeoutMs?: number;
}

interface CapturedTaskIdLike {
  id?: string;
}

export class BrowserSessionService {
  private readonly mcp: McpBrowserClient;
  private readonly serverName: string;
  private readonly recordScreenshot: ScreenshotRecorder;
  private readonly now: () => number;
  private readonly permissionTimeoutMs: number;

  private pendingRequest: BrowserPermissionRequest | null = null;
  private pendingWaiters: Array<(result: EnsureSessionResult) => void> = [];
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSession: BrowserSession | null = null;
  private boundEvents: ArtifactTaskEvents | null = null;
  private readonly onTaskSettled = (...args: unknown[]): void => {
    const taskId = (args[0] as CapturedTaskIdLike | undefined)?.id;
    if (taskId) this.endSessionsForTask(taskId, 'task_settled');
  };

  constructor(deps: BrowserSessionServiceDeps) {
    this.mcp = deps.mcp;
    this.serverName = deps.serverName ?? BROWSER_MCP_SERVER;
    this.recordScreenshot = deps.recordScreenshot ?? defaultScreenshotRecorder;
    this.now = deps.now ?? Date.now;
    this.permissionTimeoutMs = deps.permissionTimeoutMs ?? PERMISSION_TIMEOUT_MS;
  }

  getActiveSession(): BrowserSession | null {
    return this.activeSession;
  }

  getPendingRequest(): BrowserPermissionRequest | null {
    return this.pendingRequest;
  }

  /**
   * Resolve (or request) an approved session for this task. Resolves once
   * the user answers the permission prompt — or immediately when a session
   * for the task is already active. Never spawns anything before approval.
   */
  async ensureSession(taskId: string, intent: string): Promise<EnsureSessionResult> {
    if (this.activeSession?.status === 'active' && this.activeSession.taskId === taskId) {
      return { ok: true, session: this.activeSession };
    }
    if (!this.mcp.isAvailable()) {
      return refusal(
        'unsupported_environment',
        'Browser control requires the desktop runtime (MCP unavailable in web mode)'
      );
    }
    if (this.pendingRequest) {
      if (this.pendingRequest.taskId !== taskId) {
        return refusal('permission_denied', 'Another browser permission request is pending');
      }
      return new Promise<EnsureSessionResult>(resolve => this.pendingWaiters.push(resolve));
    }
    this.pendingRequest = {
      id: `browser-perm-${this.now()}`,
      taskId,
      intent,
      requestedAt: new Date(this.now()).toISOString(),
    };
    this.pendingTimer = setTimeout(
      () => this.settlePermission(false, 'Permission request timed out'),
      this.permissionTimeoutMs
    );
    this.syncStore();
    return new Promise<EnsureSessionResult>(resolve => this.pendingWaiters.push(resolve));
  }

  /** UI entry point: the user approved the pending permission prompt */
  async approvePendingRequest(): Promise<void> {
    await this.settlePermission(true);
  }

  /** UI entry point: the user denied the pending permission prompt */
  denyPendingRequest(): void {
    void this.settlePermission(false, 'User denied browser permission');
  }

  /**
   * Execute one allowlisted browser action for the task's approved session.
   * All failure modes come back as structured results (spec AC #10).
   */
  async performAction(taskId: string, rawParams: unknown): Promise<BrowserActionResult> {
    const action = parseBrowserAction(rawParams);
    if (!action) {
      return {
        ok: false,
        action: 'unknown',
        error: {
          code: 'not_allowed',
          message:
            'browserAction must be one of navigate/click/type/snapshot/read_console/screenshot with its required params',
        },
      };
    }
    const session = this.activeSession;
    if (session?.status !== 'active' || session.taskId !== taskId) {
      return {
        ok: false,
        action: action.browserAction,
        error: { code: 'no_session', message: 'No approved browser session for this task' },
      };
    }
    const { tool, args } = toMcpToolCall(action);
    let result: BrowserActionResult;
    try {
      result = parseToolResult(action, await this.mcp.invokeTool(this.serverName, tool, args));
    } catch (error) {
      result = {
        ok: false,
        action: action.browserAction,
        error: {
          code: 'server_error',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
    this.logAction(session, describeAction(action), result);
    if (result.ok && action.browserAction === 'screenshot' && result.imageDataUrl) {
      result.artifactId = await this.captureScreenshotArtifact(session, result.imageDataUrl);
    }
    return result;
  }

  /** User revoke — immediately ends the session and disconnects (spec AC #9) */
  revokeActiveSession(): void {
    this.endActiveSession('revoked');
  }

  /** Session scope expires with its originating task (spec AC #12) */
  endSessionsForTask(taskId: string, reason: BrowserSessionEndReason): void {
    if (this.activeSession?.taskId === taskId) {
      this.endActiveSession(reason);
    }
  }

  /** Attach task-settled listeners (idempotent, artifactCapture pattern) */
  bindTaskEvents(events: ArtifactTaskEvents): void {
    if (this.boundEvents === events) return;
    if (this.boundEvents) {
      for (const event of SETTLE_EVENTS) this.boundEvents.off(event, this.onTaskSettled);
    }
    for (const event of SETTLE_EVENTS) events.on(event, this.onTaskSettled);
    this.boundEvents = events;
  }

  // -- internals ------------------------------------------------------------

  private async settlePermission(approved: boolean, denyMessage?: string): Promise<void> {
    const request = this.pendingRequest;
    if (!request) return;
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    this.pendingRequest = null;
    const waiters = this.pendingWaiters;
    this.pendingWaiters = [];
    const outcome = approved
      ? await this.startSession(request)
      : refusal('permission_denied', denyMessage ?? 'User denied browser permission');
    this.syncStore();
    for (const waiter of waiters) waiter(outcome);
  }

  private async startSession(request: BrowserPermissionRequest): Promise<EnsureSessionResult> {
    this.endSessionsForTask(request.taskId, 'replaced');
    if (this.activeSession?.status === 'active') {
      this.endActiveSession('replaced');
    }
    try {
      if (!this.mcp.isConnected(this.serverName)) {
        await this.mcp.connectServer(this.serverName);
      }
    } catch (error) {
      return refusal(
        'server_error',
        `Failed to start browser MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    this.activeSession = {
      id: `browser-session-${this.now()}`,
      taskId: request.taskId,
      intent: request.intent,
      approvedAt: new Date(this.now()).toISOString(),
      status: 'active',
      actionLog: [],
    };
    return { ok: true, session: this.activeSession };
  }

  private endActiveSession(reason: BrowserSessionEndReason): void {
    const session = this.activeSession;
    if (session?.status !== 'active') return;
    session.status = 'ended';
    session.endedReason = reason;
    this.activeSession = null;
    this.syncStore();
    void this.mcp.disconnectServer(this.serverName).catch((error: unknown) => {
      logger.warn('[BrowserSession] Failed to disconnect browser MCP server', error);
    });
  }

  private logAction(
    session: BrowserSession,
    description: string,
    result: BrowserActionResult
  ): void {
    const suffix = result.ok ? 'ok' : `failed: ${result.error?.message ?? 'unknown error'}`;
    session.actionLog.push(`${new Date(this.now()).toISOString()} — ${description} — ${suffix}`);
    this.syncStore();
  }

  private async captureScreenshotArtifact(
    session: BrowserSession,
    imageDataUrl: string
  ): Promise<string | undefined> {
    try {
      const artifact = await this.recordScreenshot(
        session.taskId,
        `Screenshot — ${session.intent.slice(0, 60)}`,
        {
          imageDataUrl,
          capturedAt: new Date(this.now()).toISOString(),
          description: session.intent,
        }
      );
      return artifact.id;
    } catch (error) {
      logger.warn('[BrowserSession] Failed to record screenshot artifact', error);
      return undefined;
    }
  }

  private syncStore(): void {
    const { actions } = useBrowserSessionStore.getState();
    actions.setPendingRequest(this.pendingRequest ? { ...this.pendingRequest } : null);
    actions.setActiveSession(
      this.activeSession
        ? { ...this.activeSession, actionLog: [...this.activeSession.actionLog] }
        : null
    );
  }
}

const SETTLE_EVENTS = ['completed', 'failed', 'cancelled'] as const;

function refusal(code: BrowserErrorCode, message: string): EnsureSessionResult {
  return { ok: false, error: { code, message } };
}

const defaultScreenshotRecorder: ScreenshotRecorder = (taskId, title, payload) =>
  recordScreenshotArtifact(taskId, title, payload);

// -- module singleton (artifactCapture pattern) ------------------------------

let instance: BrowserSessionService | null = null;

/** Lazily build the app-wide service against the registered playwright MCP */
export function getBrowserSessionService(): BrowserSessionService {
  instance ??= new BrowserSessionService({ mcp: createDefaultMcpClient() });
  return instance;
}

/** Test seam */
export function setBrowserSessionServiceForTests(service: BrowserSessionService | null): void {
  instance = service;
}

function createDefaultMcpClient(): McpBrowserClient {
  // Config mirrors the registered `playwright` server in mcp/registry.json;
  // npx.cmd (not npx) — Windows MCP spawn rule. MCPService degrades to
  // isAvailable()=false in web mode, which ensureSession surfaces upstream.
  return new MCPService({
    mcpServers: {
      [BROWSER_MCP_SERVER]: { command: 'npx.cmd', args: ['-y', '@playwright/mcp@latest'] },
    },
  });
}
