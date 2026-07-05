/**
 * Browser verification types — spec 11 Phase 1 (/browser capability).
 * The agent drives a real browser through the already-registered `playwright`
 * MCP server (see mcp/registry.json + DEPENDENCY_AUDIT.md) via MCPService —
 * no new CDP/Playwright sidecar. Every session is permission-gated: no MCP
 * server spawn happens without an explicit user approval (spec AC #1/#12).
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */

/** Phase 1 hard-coded action allowlist (spec AC #3 — no arbitrary JS) */
export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'snapshot'
  | 'read_console'
  | 'screenshot';

/**
 * Agent-facing action union. `click`/`type` target elements by the
 * accessibility `ref` returned from a prior `snapshot` action (the
 * @playwright/mcp addressing model), plus a human-readable `element`
 * description used for permission/audit logs.
 */
export type BrowserAction =
  | { browserAction: 'navigate'; url: string }
  | { browserAction: 'click'; element: string; ref: string }
  | { browserAction: 'type'; element: string; ref: string; text: string }
  | { browserAction: 'snapshot' }
  | { browserAction: 'read_console' }
  | { browserAction: 'screenshot'; fullPage?: boolean };

export type BrowserErrorCode =
  | 'not_allowed' // action missing/malformed/outside the allowlist
  | 'no_session' // no approved active session for this task
  | 'permission_denied' // user denied (or timed out) the session prompt
  | 'unsupported_environment' // web mode — MCP needs the desktop runtime
  | 'server_error' // the MCP tool reported an error
  | 'protocol_error' // malformed MCP result
  | 'screenshot_too_large'; // image exceeds the artifact embed cap

export interface BrowserConsoleMessage {
  level: string;
  text: string;
}

/**
 * Structured result surfaced to the agent (spec AC #10 — failures are data
 * the agent can react to, never thrown exceptions).
 */
export interface BrowserActionResult {
  ok: boolean;
  action: BrowserActionType | 'unknown';
  /** Page snapshot / tool text output */
  text?: string;
  /** data: URL for screenshot actions */
  imageDataUrl?: string;
  consoleMessages?: BrowserConsoleMessage[];
  /** Artifact id when a screenshot was registered (spec 09 seam, AC #6) */
  artifactId?: string;
  error?: { code: BrowserErrorCode; message: string };
}

/** Pending user consent for a session start (spec AC #1) */
export interface BrowserPermissionRequest {
  id: string;
  taskId: string;
  /** What the agent intends to do, shown verbatim in the prompt */
  intent: string;
  requestedAt: string;
}

export type BrowserSessionEndReason = 'revoked' | 'task_settled' | 'replaced' | 'error';

/** An approved, single-task browser session (spec AC #12 — no "always allow") */
export interface BrowserSession {
  id: string;
  taskId: string;
  intent: string;
  approvedAt: string;
  status: 'active' | 'ended';
  /** Human-readable action audit trail (spec AC #11) */
  actionLog: string[];
  endedReason?: BrowserSessionEndReason;
}

/**
 * Structural view of an MCP tool result (matches the SDK's CallToolResult
 * without importing SDK types into pure adapter logic).
 */
export interface McpToolResultLike {
  isError?: boolean;
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
}

/** Structural slice of MCPService the session service depends on */
export interface McpBrowserClient {
  isAvailable(): boolean;
  connectServer(serverName: string): Promise<void>;
  disconnectServer(serverName: string): Promise<void>;
  isConnected(serverName: string): boolean;
  invokeTool(
    serverName: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<McpToolResultLike>;
}
