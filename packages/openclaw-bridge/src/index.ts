import { IPCMessageType } from '@vibetech/shared-ipc';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';

const SOURCE = 'openclaw' as const;
const VERSION = '2.0.0'; // Bridge client version for current OpenClaw gateway releases

export interface BridgeOptions {
    url?: string;
    /** Auto-reconnect on disconnect (default: true) */
    autoReconnect?: boolean;
    /** Reconnect delay in ms (default: 5000) */
    reconnectDelay?: number;
    /** Max reconnect attempts (default: 5, 0 = infinite) */
    maxReconnectAttempts?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}

export interface DispatchOptions {
    taskId?: string;
    description: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    steps: Array<{
        server: string;
        tool: string;
        args: Record<string, unknown>;
    }>;
    timeout?: number;
}

export interface ToolCallOptions {
    callId?: string;
    server: string;
    tool: string;
    args: Record<string, unknown>;
    timeout?: number;
}

export interface TaskResult {
    taskId: string;
    status: 'success' | 'partial' | 'failed' | 'timeout';
    results: Array<{
        stepIndex: number;
        success: boolean;
        data?: unknown;
        error?: string;
        durationMs: number;
    }>;
    durationMs: number;
}

export interface ToolResult {
    callId: string;
    success: boolean;
    data?: unknown;
    error?: string;
    durationMs: number;
}

function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * OpenClaw IPC Bridge Client (v2.0).
 * Connects to the IPC Bridge as 'openclaw' and provides
 * methods to dispatch tasks and tool calls through the gateway bridge.
 *
 * Compatible with current OpenClaw gateway-centric releases.
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Request/response correlation tracking
 * - Timeout handling per operation
 * - Debug logging support
 * - Health check monitoring
 *
 * @example
 * ```ts
 * const bridge = new OpenClawBridge({
 *   url: 'ws://localhost:5004',
 *   autoReconnect: true,
 *   debug: true
 * });
 *
 * await bridge.connect();
 * const result = await bridge.callTool({
 *   server: 'filesystem',
 *   tool: 'read_file',
 *   args: { path: './example.txt' }
 * });
 * ```
 */
export class OpenClawBridge extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string;
    private pending = new Map<string, {
        resolve: (value: unknown) => void;
        reject: (reason: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }>();
    private connected = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly options: Required<BridgeOptions>;

    constructor(options: BridgeOptions | string = {}) {
        super();

        // Support legacy string URL or new options object
        if (typeof options === 'string') {
            options = { url: options };
        }

        this.options = {
            url: options.url ?? 'ws://localhost:5004',
            autoReconnect: options.autoReconnect ?? true,
            reconnectDelay: options.reconnectDelay ?? 5000,
            maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
            debug: options.debug ?? false,
        };

        this.url = this.options.url;
    }

    /** Enable/disable debug logging */
    private log(...args: unknown[]): void {
        if (this.options.debug) {
            console.log('[OpenClawBridge]', ...args);
        }
    }

    /** Log errors (always shown) */
    private logError(...args: unknown[]): void {
        console.error('[OpenClawBridge ERROR]', ...args);
    }

    /** Connect to the IPC Bridge */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.log(`Connecting to ${this.url}...`);
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                this.connected = true;
                this.reconnectAttempts = 0; // Reset on successful connection
                this.log('WebSocket connected, sending identify message...');

                const ws = this.ws;
                if (!ws) {
                    reject(new Error('WebSocket disconnected before identify'));
                    return;
                }

                ws.send(JSON.stringify({
                    messageId: makeId('msg'),
                    type: 'identify',
                    timestamp: Date.now(),
                    source: SOURCE,
                    version: VERSION,
                    payload: {
                        clientType: SOURCE,
                        capabilities: ['task_dispatch', 'tool_call', 'streaming'],
                        openclawVersion: 'gateway-current',
                    },
                }));

                this.emit('connected');
                this.log('Connected successfully');
                resolve();
            });

            this.ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    this.handleMessage(msg);
                } catch (err) {
                    this.logError('Malformed message:', err);
                }
            });

            this.ws.on('close', (code, reason) => {
                this.connected = false;
                this.log(`Connection closed (code: ${code}, reason: ${reason.toString()})`);
                this.emit('disconnected', { code, reason: reason.toString() });

                // Auto-reconnect if enabled
                if (this.options.autoReconnect && !this.reconnectTimer) {
                    this.scheduleReconnect();
                }
            });

            this.ws.on('error', (err) => {
                this.logError('WebSocket error:', err.message);
                if (!this.connected) {
                    reject(err);
                }
                this.emit('error', err);
            });
        });
    }

    /** Schedule a reconnection attempt */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        const maxAttempts = this.options.maxReconnectAttempts;
        if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
            this.logError(`Max reconnect attempts (${maxAttempts}) reached. Giving up.`);
            this.emit('reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.options.reconnectDelay * Math.min(this.reconnectAttempts, 5); // Exponential backoff capped at 5x

        this.log(`Reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);
        this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((err) => {
                this.logError('Reconnect failed:', err.message);
            });
        }, delay);
    }

    /** Dispatch a multi-step task to Gateway */
    async dispatchTask(opts: DispatchOptions): Promise<TaskResult> {
        const taskId = opts.taskId ?? makeId('task');
        const correlationId = makeId('corr');
        const timeout = opts.timeout ?? 120000;

        this.send(IPCMessageType.AGENT_TASK_DISPATCH, {
            taskId,
            type: 'mcp_tool_call',
            priority: opts.priority ?? 'normal',
            description: opts.description,
            steps: opts.steps,
            timeout,
        }, correlationId);

        return this.waitForResponse(correlationId, timeout) as Promise<TaskResult>;
    }

    /** Call a single MCP tool on Gateway */
    async callTool(opts: ToolCallOptions): Promise<ToolResult> {
        const callId = opts.callId ?? makeId('call');
        const correlationId = makeId('corr');
        const timeout = opts.timeout ?? 60000;

        this.send(IPCMessageType.MCP_TOOL_CALL, {
            callId,
            server: opts.server,
            tool: opts.tool,
            args: opts.args,
            timeout,
        }, correlationId);

        return this.waitForResponse(correlationId, timeout) as Promise<ToolResult>;
    }

    /** Disconnect from the IPC Bridge */
    disconnect(): void {
        this.log('Disconnecting...');

        // Clear reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Reject all pending requests
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error('Client disconnected'));
        }
        this.pending.clear();

        // Close WebSocket
        if (this.ws) {
            this.ws.close(1000, 'Client initiated disconnect');
            this.ws = null;
        }

        this.connected = false;
        this.log('Disconnected');
    }

    /** Check if connected to IPC Bridge */
    get isConnected(): boolean {
        return this.connected && this.ws?.readyState === WebSocket.OPEN;
    }

    /** Get current connection state */
    get connectionState(): 'connected' | 'connecting' | 'disconnected' | 'reconnecting' {
        if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
            return 'connected';
        }
        if (this.ws?.readyState === WebSocket.CONNECTING) {
            return 'connecting';
        }
        if (this.reconnectTimer) {
            return 'reconnecting';
        }
        return 'disconnected';
    }

    /** Perform a health check */
    async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
        if (!this.isConnected) {
            return { healthy: false, latencyMs: 0, error: 'Not connected' };
        }

        const start = Date.now();
        try {
            await this.callTool({
                server: 'sequential-thinking',
                tool: 'sequentialthinking',
                args: {
                    thought: 'Health check ping',
                    nextThoughtNeeded: false,
                    thoughtNumber: 1,
                    totalThoughts: 1,
                },
                timeout: 5000,
            });
            const latencyMs = Date.now() - start;
            return { healthy: true, latencyMs };
        } catch (err) {
            const latencyMs = Date.now() - start;
            return {
                healthy: false,
                latencyMs,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    private send(type: IPCMessageType, payload: Record<string, unknown>, correlationId: string): void {
        if (!this.ws || !this.connected) {
            throw new Error('Not connected to IPC Bridge');
        }
        this.ws.send(JSON.stringify({
            messageId: makeId('msg'),
            type,
            timestamp: Date.now(),
            source: SOURCE,
            target: 'gateway',
            version: VERSION,
            correlationId,
            payload,
        }));
    }

    private async waitForResponse(correlationId: string, timeoutMs: number): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(correlationId);
                reject(new Error(`Timeout waiting for response (${timeoutMs}ms)`));
            }, timeoutMs);

            this.pending.set(correlationId, { resolve, reject, timer });
        });
    }

    private handleMessage(msg: Record<string, unknown>): void {
        const type = msg.type as string;
        const correlationId = msg.correlationId as string | undefined;

        // Route responses to pending promises
        if (correlationId) {
            const pending = this.pending.get(correlationId);
            if (!pending) {
                return;
            }
            clearTimeout(pending.timer);
            this.pending.delete(correlationId);
            pending.resolve(msg.payload);
            return;
        }

        // Emit other messages as events
        if (type === 'bridge_stats') return; // ignore stats
        this.emit('message', msg);
    }
}
