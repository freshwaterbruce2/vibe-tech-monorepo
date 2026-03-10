import { z } from 'zod';
import { appSourceSchema } from './base-schemas.js';

// Specific message payloads
export const openFilePayloadSchema = z.object({
    filePath: z.string().min(1, 'File path cannot be empty'),
    line: z.number().optional(),
    column: z.number().optional(),
    context: z.string().optional(),
});

export const openProjectPayloadSchema = z.object({
    projectPath: z.string().min(1, 'Project path cannot be empty'),
    context: z.string().optional(),
});

export const gitStatusPayloadSchema = z.object({
    branch: z.string(),
    modified: z.array(z.string()),
    added: z.array(z.string()),
    deleted: z.array(z.string()),
    untracked: z.array(z.string()),
});

export const learningEventPayloadSchema = z.object({
    eventType: z.enum(['mistake', 'knowledge', 'pattern']),
    data: z.record(z.string(), z.any()),
    source: appSourceSchema,
});

export const errorPayloadSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
});

// Task lifecycle payloads (Agent Mode)
export const taskStartedPayloadSchema = z.object({
    task_id: z.string().min(1, 'task_id is required'),
    task_type: z.string().min(1, 'task_type is required'),
    title: z.string().min(1, 'title is required'),
    context: z.record(z.string(), z.any()).optional(),
});

export const taskStoppedPayloadSchema = z.object({
    task_id: z.string().min(1, 'task_id is required'),
    status: z.enum(['completed', 'paused', 'abandoned', 'error']),
    duration_minutes: z.number().nonnegative().optional(),
    result: z
        .object({
            success: z.boolean(),
            output: z.string().optional(),
            error: z.string().optional(),
        })
        .optional(),
});

export const taskProgressPayloadSchema = z.object({
    task_id: z.string().min(1, 'task_id is required'),
    progress: z.number().min(0).max(100),
    current_step: z.string().optional(),
    steps_completed: z.number().int().nonnegative().optional(),
    total_steps: z.number().int().positive().optional(),
});

export const taskActivityPayloadSchema = z.object({
    task_id: z.string().min(1, 'task_id is required'),
    activity_type: z.enum(['code_edit', 'file_open', 'git_commit', 'test_run', 'command_execute']),
    details: z.record(z.string(), z.any()).optional(),
});

export const taskInsightsPayloadSchema = z.object({
    task_id: z.string().min(1, 'task_id is required'),
    insights: z.record(z.string(), z.any()),
});

// Context update payload
export const contextUpdatePayloadSchema = z.object({
    workspaceRoot: z.string().optional(),
    openFiles: z.array(z.string()).optional(),
    currentFile: z.string().optional(),
    cursorPosition: z
        .object({
            line: z.number().int().nonnegative(),
            column: z.number().int().nonnegative(),
        })
        .optional(),
    selection: z
        .object({
            start: z.object({ line: z.number(), column: z.number() }),
            end: z.object({ line: z.number(), column: z.number() }),
        })
        .optional(),
    diagnostics: z
        .array(
            z.object({
                file: z.string(),
                message: z.string(),
                severity: z.string(),
                line: z.number(),
            })
        )
        .optional(),
});

// File changed payload
export const fileChangedPayloadSchema = z.object({
    filePath: z.string().min(1, 'filePath is required'),
    changeType: z.enum(['created', 'modified', 'deleted']),
    content: z.string().optional(),
});

// Desktop Context Aware Guide payloads
export const activitySyncPayloadSchema = z.object({
    activeWindow: z.string().optional(),
    activeProcess: z.string().optional(),
    timestamp: z.number(),
    workspacePath: z.string().optional(),
});

export const projectCreatePayloadSchema = z.object({
    templateId: z.string().min(1, 'templateId is required'),
    projectName: z.string().min(1, 'projectName is required'),
    targetPath: z.string().min(1, 'targetPath is required'),
    options: z.record(z.string(), z.any()).optional(),
});

export const guidanceRequestPayloadSchema = z.object({
    context: z.record(z.string(), z.any()),
    taskId: z.string().optional(),
});

export const guidanceResponsePayloadSchema = z.object({
    nextSteps: z.array(z.string()),
    doingRight: z.array(z.string()),
    atRisk: z.array(z.string()),
    timestamp: z.number(),
});

export const taskUpdatePayloadSchema = z.object({
    taskId: z.string().min(1, 'taskId is required'),
    status: z.enum(['open', 'in_progress', 'blocked', 'completed']),
    updates: z.record(z.string(), z.any()).optional(),
});

export const commandRequestPayloadSchema = z.object({
    text: z.string().min(1, 'Command text cannot be empty'),
    target: appSourceSchema.optional(),
    context: z.record(z.string(), z.any()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const commandExecutePayloadSchema = z.object({
    commandId: z.string().min(1, 'commandId is required'),
    command: z.string().min(1, 'command is required'),
    args: z.array(z.string()).optional(),
    text: z.string().min(1, 'command text is required'),
    originalSender: z.string().min(1),
});

export const commandResultPayloadSchema = z.object({
    commandId: z.string().min(1, 'commandId is required'),
    success: z.boolean(),
    result: z.any().optional(),
    error: z.string().optional(),
    metrics: z
        .object({
            elapsedMs: z.number().nonnegative().optional(),
            startedAt: z.number().optional(),
            finishedAt: z.number().optional(),
        })
        .optional(),
});

export const bridgeStatsPayloadSchema = z.object({
    server: z.object({
        uptime: z.number(),
        port: z.number(),
    }),
    connections: z.object({
        active: z.number().int(),
        total: z.number().int(),
        disconnections: z.number().int(),
    }),
    messages: z.object({
        total: z.number().int(),
        byType: z.record(z.string(), z.number().int()),
        recentCount: z.number().int(),
    }),
    clients: z.array(
        z.object({
            id: z.string(),
            source: z.string(),
            messageCount: z.number().int(),
            connected: z.number().int(),
        })
    ),
});

export const osCommandPayloadSchema = z.object({
    targetWindow: z.string().optional().default('Vibe Code Studio'),
    x: z.number().optional(),
    y: z.number().optional(),
    text: z.string().optional(),
    keys: z.array(z.string()).optional(),
    url: z.string().optional(),
    action: z.string().optional(),
    coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const codeInsertPayloadSchema = z.object({
    filePath: z.string(),
    code: z.string(),
    line: z.number(),
    column: z.number(),
});

export type OpenFilePayload = z.infer<typeof openFilePayloadSchema>;
export type OpenProjectPayload = z.infer<typeof openProjectPayloadSchema>;
export type GitStatusPayload = z.infer<typeof gitStatusPayloadSchema>;
export type LearningEventPayload = z.infer<typeof learningEventPayloadSchema>;
export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
export type TaskStartedPayload = z.infer<typeof taskStartedPayloadSchema>;
export type TaskStoppedPayload = z.infer<typeof taskStoppedPayloadSchema>;
export type TaskProgressPayload = z.infer<typeof taskProgressPayloadSchema>;
export type TaskActivityPayload = z.infer<typeof taskActivityPayloadSchema>;
export type TaskInsightsPayload = z.infer<typeof taskInsightsPayloadSchema>;
export type ContextUpdatePayload = z.infer<typeof contextUpdatePayloadSchema>;
export type FileChangedPayload = z.infer<typeof fileChangedPayloadSchema>;
export type ActivitySyncPayload = z.infer<typeof activitySyncPayloadSchema>;
export type ProjectCreatePayload = z.infer<typeof projectCreatePayloadSchema>;
export type GuidanceRequestPayload = z.infer<typeof guidanceRequestPayloadSchema>;
export type GuidanceResponsePayload = z.infer<typeof guidanceResponsePayloadSchema>;
export type TaskUpdatePayload = z.infer<typeof taskUpdatePayloadSchema>;
export type CommandRequestPayload = z.infer<typeof commandRequestPayloadSchema>;
export type CommandExecutePayload = z.infer<typeof commandExecutePayloadSchema>;
export type CommandResultPayload = z.infer<typeof commandResultPayloadSchema>;
export type BridgeStatsPayload = z.infer<typeof bridgeStatsPayloadSchema>;
export type OsCommandPayload = z.infer<typeof osCommandPayloadSchema>;
export type CodeInsertPayload = z.infer<typeof codeInsertPayloadSchema>;

// Agent communication payloads (OpenClaw ↔ Antigravity)
export const mcpToolStepSchema = z.object({
    server: z.string().min(1, 'MCP server name is required'),
    tool: z.string().min(1, 'MCP tool name is required'),
    args: z.record(z.string(), z.any()).default({}),
});

export const agentTaskDispatchPayloadSchema = z.object({
    taskId: z.string().min(1, 'taskId is required'),
    type: z.enum(['mcp_tool_call', 'multi_step', 'research']),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    description: z.string().min(1, 'description is required'),
    steps: z.array(mcpToolStepSchema).min(1, 'At least one step is required'),
    timeout: z.number().positive().default(120000),
});

export const agentStepResultSchema = z.object({
    stepIndex: z.number().int().nonnegative(),
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    durationMs: z.number().nonnegative().optional(),
});

export const agentTaskResultPayloadSchema = z.object({
    taskId: z.string().min(1, 'taskId is required'),
    status: z.enum(['success', 'partial', 'failed', 'timeout']),
    results: z.array(agentStepResultSchema),
    durationMs: z.number().nonnegative(),
});

export const mcpToolCallPayloadSchema = z.object({
    callId: z.string().min(1, 'callId is required'),
    server: z.string().min(1, 'MCP server name is required'),
    tool: z.string().min(1, 'MCP tool name is required'),
    args: z.record(z.string(), z.any()).default({}),
    timeout: z.number().positive().default(60000),
});

export const mcpToolResultPayloadSchema = z.object({
    callId: z.string().min(1, 'callId is required'),
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    durationMs: z.number().nonnegative(),
});

export type McpToolStep = z.infer<typeof mcpToolStepSchema>;
export type AgentTaskDispatchPayload = z.infer<typeof agentTaskDispatchPayloadSchema>;
export type AgentStepResult = z.infer<typeof agentStepResultSchema>;
export type AgentTaskResultPayload = z.infer<typeof agentTaskResultPayloadSchema>;
export type McpToolCallPayload = z.infer<typeof mcpToolCallPayloadSchema>;
export type McpToolResultPayload = z.infer<typeof mcpToolResultPayloadSchema>;
