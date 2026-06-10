import { randomUUID } from 'node:crypto';
import {
  WEBMCP_EXECUTE_REQUEST_CHANNEL,
  type WebMCPToolDescriptor,
  type WebMCPExecuteRequest,
  type WebMCPExecuteResponse,
  type WebMCPGatewayStatus
} from '../../shared/types';

/**
 * Structural subset of Electron's WebContents used by the gateway.
 * Keeps this service free of a hard electron import so the standalone
 * MCP server process can construct the service container headless and
 * unit tests can pass a plain fake.
 */
export interface WebMCPRendererTarget {
  send(channel: string, ...args: unknown[]): void;
  isDestroyed(): boolean;
  once(event: 'destroyed', listener: () => void): unknown;
}

export interface WebMCPGatewayOptions {
  /** Max time to wait for the renderer to answer an execute request. */
  executeTimeoutMs?: number;
}

interface PendingExecution {
  resolve(value: unknown): void;
  reject(reason: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_EXECUTE_TIMEOUT_MS = 15_000;

/**
 * Main-process side of the WebMCP-over-IPC bridge.
 *
 * The renderer registers tools with WebMCPManager (document.modelContext)
 * and publishes their descriptors here. Executions flow the other way:
 * main sends a correlated request over WEBMCP_EXECUTE_REQUEST_CHANNEL and
 * the renderer answers on WEBMCP_EXECUTE_RESULT, which the IPC layer feeds
 * back into handleExecuteResult().
 */
export class WebMCPGatewayService {
  private tools: WebMCPToolDescriptor[] = [];
  private target: WebMCPRendererTarget | null = null;
  private pending = new Map<string, PendingExecution>();
  private lastSyncAt: number | null = null;
  private readonly executeTimeoutMs: number;

  constructor(opts: WebMCPGatewayOptions = {}) {
    this.executeTimeoutMs = opts.executeTimeoutMs ?? DEFAULT_EXECUTE_TIMEOUT_MS;
  }

  /**
   * Replace the bridged tool registry with the renderer's current view.
   * The sender becomes the execution target until it is destroyed or a
   * newer sender syncs.
   */
  syncTools(tools: WebMCPToolDescriptor[], sender: WebMCPRendererTarget): WebMCPGatewayStatus {
    if (!Array.isArray(tools)) throw new Error('invalid webmcp tool list');
    for (const t of tools) {
      if (!t || typeof t.name !== 'string' || t.name.length === 0) {
        throw new Error('invalid webmcp tool descriptor');
      }
    }

    this.tools = tools.map((t) => ({
      name: t.name,
      description: typeof t.description === 'string' ? t.description : '',
      inputSchema: t.inputSchema ?? {},
      type: t.type === 'declarative' ? 'declarative' : 'imperative'
    }));
    this.lastSyncAt = Date.now();

    if (this.target !== sender) {
      this.target = sender;
      sender.once('destroyed', () => {
        if (this.target === sender) this.detachRenderer('renderer destroyed');
      });
    }

    return this.getStatus();
  }

  /** Drop the renderer connection and fail anything still in flight. */
  detachRenderer(reason: string): void {
    this.target = null;
    this.tools = [];
    this.rejectAllPending(new Error(`WebMCP gateway disconnected: ${reason}`));
  }

  listTools(): WebMCPToolDescriptor[] {
    return [...this.tools];
  }

  getStatus(): WebMCPGatewayStatus {
    const connected = this.target !== null && !this.target.isDestroyed();
    return {
      connected,
      toolCount: this.tools.length,
      lastSyncAt: this.lastSyncAt,
      pendingExecutions: this.pending.size
    };
  }

  /**
   * Execute a renderer-registered WebMCP tool from the main process.
   * Resolves with the tool's result or rejects on tool error, timeout,
   * or renderer disconnect.
   */
  async executeTool(name: string, args: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
    if (typeof name !== 'string' || name.length === 0) throw new Error('invalid tool name');
    if (this.target === null || this.target.isDestroyed()) {
      throw new Error('WebMCP renderer not connected');
    }
    if (!this.tools.some((t) => t.name === name)) {
      throw new Error(`WebMCP tool "${name}" is not registered`);
    }

    const request: WebMCPExecuteRequest = {
      requestId: randomUUID(),
      name,
      args: args ?? {}
    };

    const effectiveTimeout = timeoutMs ?? this.executeTimeoutMs;
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.requestId);
        reject(new Error(`WebMCP tool "${name}" timed out after ${effectiveTimeout}ms`));
      }, effectiveTimeout);
      this.pending.set(request.requestId, { resolve, reject, timer });
    });

    this.target.send(WEBMCP_EXECUTE_REQUEST_CHANNEL, request);
    return result;
  }

  /** Called by the IPC layer when the renderer answers an execute request. */
  handleExecuteResult(res: WebMCPExecuteResponse): void {
    if (!res || typeof res.requestId !== 'string') return;
    const entry = this.pending.get(res.requestId);
    if (!entry) return;

    this.pending.delete(res.requestId);
    clearTimeout(entry.timer);
    if (res.ok) {
      entry.resolve(res.result ?? null);
    } else {
      entry.reject(new Error(res.error ?? 'WebMCP tool execution failed'));
    }
  }

  dispose(): void {
    this.detachRenderer('gateway disposed');
  }

  private rejectAllPending(error: Error): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
