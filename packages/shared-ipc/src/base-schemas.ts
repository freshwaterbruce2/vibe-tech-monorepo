import { z } from 'zod';

// Message sources/targets
export const appSourceSchema = z.enum(['nova', 'vibe', 'bridge', 'deepcode', 'desktop-commander-v3', 'openclaw', 'antigravity']);
export type AppSource = z.infer<typeof appSourceSchema>;

// Message types enum
export enum IPCMessageType {
    // Connection lifecycle
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    PING = 'ping',
    PONG = 'pong',
    IDENTIFY = 'identify',

    // File operations
    FILE_OPEN = 'file:open',
    FILE_OPENED = 'file:opened',
    FILE_CLOSE = 'file:close',
    FILE_CHANGED = 'file:changed',

    // Learning + project updates
    LEARNING_SYNC = 'learning:sync',
    LEARNING_EVENT = 'learning_event',
    PROJECT_UPDATE = 'project:update',
    PROJECT_OPEN = 'project:open',
    CONTEXT_UPDATE = 'context:update',
    NOTIFICATION = 'notification',

    // Task lifecycle (Agent Mode)
    TASK_STARTED = 'task_started',
    TASK_STOPPED = 'task_stopped',
    TASK_PROGRESS = 'task_progress',
    TASK_ACTIVITY = 'task_activity',
    TASK_INSIGHTS = 'task_insights_ready',
    TASK_UPDATE = 'task:update',

    // Desktop Context Aware Guide
    ACTIVITY_SYNC = 'activity:sync',
    PROJECT_CREATE = 'project:create',
    GUIDANCE_REQUEST = 'guidance:request',
    GUIDANCE_RESPONSE = 'guidance:response',

    // Git operations (legacy support)
    GET_GIT_STATUS = 'get_git_status',
    GIT_STATUS_UPDATE = 'git_status_update',

    // Command routing (Phase 3.2)
    COMMAND_REQUEST = 'command_request',
    COMMAND_EXECUTE = 'command_execute',
    COMMAND_RESULT = 'command_result',
    COMMAND_RESPONSE = 'command_response',
    CODE_EDIT = 'code:edit',

    // Agent communication (OpenClaw ↔ Antigravity)
    AGENT_TASK_DISPATCH = 'agent:task:dispatch',
    AGENT_TASK_RESULT = 'agent:task:result',
    MCP_TOOL_CALL = 'mcp:tool:call',
    MCP_TOOL_RESULT = 'mcp:tool:result',

    // Bridge telemetry
    BRIDGE_STATS = 'bridge_stats',

    // OS Control (Nova Mission Control)
    OS_CLICK = 'os:click',
    OS_TYPE = 'os:type',
    OS_HOTKEY = 'os:hotkey',
    OS_MINIMIZE = 'os:minimize',
    OS_FOCUS = 'os:focus',
    OS_BROWSER_OPEN = 'os:browser_open',

    // Error/ack
    ERROR = 'error',
    ACK = 'ack',
}

// Base message schema
export const baseMessageSchema = z.object({
    messageId: z.string().min(1, 'messageId is required'),
    type: z.nativeEnum(IPCMessageType),
    timestamp: z.number(),
    source: appSourceSchema,
    target: appSourceSchema.optional(),
    version: z.string().default('1.0.0'),
    correlationId: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    id: z.string().uuid().optional(), // Legacy compatibility for older clients
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;
