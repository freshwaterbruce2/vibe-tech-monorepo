import { z } from 'zod';
import { baseMessageSchema, IPCMessageType } from './base-schemas.js';
import {
    activitySyncPayloadSchema,
    agentTaskDispatchPayloadSchema,
    agentTaskResultPayloadSchema,
    bridgeStatsPayloadSchema,
    commandExecutePayloadSchema,
    commandRequestPayloadSchema,
    commandResultPayloadSchema,
    contextUpdatePayloadSchema,
    errorPayloadSchema,
    fileChangedPayloadSchema,
    gitStatusPayloadSchema,
    guidanceRequestPayloadSchema,
    guidanceResponsePayloadSchema,
    learningEventPayloadSchema,
    mcpToolCallPayloadSchema,
    mcpToolResultPayloadSchema,
    openFilePayloadSchema,
    openProjectPayloadSchema,
    osCommandPayloadSchema,
    projectCreatePayloadSchema,
    taskActivityPayloadSchema,
    taskInsightsPayloadSchema,
    taskProgressPayloadSchema,
    taskStartedPayloadSchema,
    taskStoppedPayloadSchema,
    taskUpdatePayloadSchema,
} from './payload-schemas.js';

export const openFileMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.FILE_OPEN),
    payload: openFilePayloadSchema,
});

export const openProjectMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.PROJECT_OPEN),
    payload: openProjectPayloadSchema,
});

export const gitStatusMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.GET_GIT_STATUS),
    payload: gitStatusPayloadSchema,
});

export const gitStatusUpdateMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.GIT_STATUS_UPDATE),
    payload: gitStatusPayloadSchema,
});

export const learningEventMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.LEARNING_EVENT),
    payload: learningEventPayloadSchema,
});

export const errorMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.ERROR),
    payload: errorPayloadSchema,
});

export const ackMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.ACK),
    payload: z.object({
        messageId: z.string(),
    }),
});

export const commandRequestMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.COMMAND_REQUEST),
    payload: commandRequestPayloadSchema,
});

export const commandExecuteMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.COMMAND_EXECUTE),
    payload: commandExecutePayloadSchema,
});

export const commandResultMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.COMMAND_RESULT),
    payload: commandResultPayloadSchema,
});

export const commandResponseMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.COMMAND_RESPONSE),
    payload: commandResultPayloadSchema,
});

export const bridgeStatsMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.BRIDGE_STATS),
    payload: bridgeStatsPayloadSchema,
});

export const taskStartedMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_STARTED),
    payload: taskStartedPayloadSchema,
});

export const taskStoppedMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_STOPPED),
    payload: taskStoppedPayloadSchema,
});

export const taskProgressMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_PROGRESS),
    payload: taskProgressPayloadSchema,
});

export const taskActivityMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_ACTIVITY),
    payload: taskActivityPayloadSchema,
});

export const taskInsightsMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_INSIGHTS),
    payload: taskInsightsPayloadSchema,
});

export const contextUpdateMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.CONTEXT_UPDATE),
    payload: contextUpdatePayloadSchema,
});

export const fileChangedMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.FILE_CHANGED),
    payload: fileChangedPayloadSchema,
});

export const activitySyncMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.ACTIVITY_SYNC),
    payload: activitySyncPayloadSchema,
});

export const projectCreateMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.PROJECT_CREATE),
    payload: projectCreatePayloadSchema,
});

export const guidanceRequestMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.GUIDANCE_REQUEST),
    payload: guidanceRequestPayloadSchema,
});

export const guidanceResponseMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.GUIDANCE_RESPONSE),
    payload: guidanceResponsePayloadSchema,
});

export const taskUpdateMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.TASK_UPDATE),
    payload: taskUpdatePayloadSchema,
});

export const codeEditMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.CODE_EDIT),
    payload: z.any(),
});

export const osClickMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_CLICK),
    payload: osCommandPayloadSchema,
});

export const osTypeMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_TYPE),
    payload: osCommandPayloadSchema,
});

export const osHotkeyMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_HOTKEY),
    payload: osCommandPayloadSchema,
});

export const osMinimizeMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_MINIMIZE),
    payload: osCommandPayloadSchema,
});

export const osFocusMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_FOCUS),
    payload: osCommandPayloadSchema,
});

export const osBrowserOpenMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.OS_BROWSER_OPEN),
    payload: osCommandPayloadSchema,
});

// Agent communication message schemas (OpenClaw ↔ Antigravity)
export const agentTaskDispatchMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.AGENT_TASK_DISPATCH),
    payload: agentTaskDispatchPayloadSchema,
});

export const agentTaskResultMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.AGENT_TASK_RESULT),
    payload: agentTaskResultPayloadSchema,
});

export const mcpToolCallMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.MCP_TOOL_CALL),
    payload: mcpToolCallPayloadSchema,
});

export const mcpToolResultMessageSchema = baseMessageSchema.extend({
    type: z.literal(IPCMessageType.MCP_TOOL_RESULT),
    payload: mcpToolResultPayloadSchema,
});

export const ipcMessageSchema = z.discriminatedUnion('type', [
    openFileMessageSchema,
    openProjectMessageSchema,
    gitStatusMessageSchema,
    gitStatusUpdateMessageSchema,
    learningEventMessageSchema,
    errorMessageSchema,
    ackMessageSchema,
    commandRequestMessageSchema,
    commandExecuteMessageSchema,
    commandResultMessageSchema,
    commandResponseMessageSchema,
    bridgeStatsMessageSchema,
    taskStartedMessageSchema,
    taskStoppedMessageSchema,
    taskProgressMessageSchema,
    taskActivityMessageSchema,
    taskInsightsMessageSchema,
    contextUpdateMessageSchema,
    fileChangedMessageSchema,
    activitySyncMessageSchema,
    projectCreateMessageSchema,
    guidanceRequestMessageSchema,
    guidanceResponseMessageSchema,
    taskUpdateMessageSchema,
    osClickMessageSchema,
    osTypeMessageSchema,
    osHotkeyMessageSchema,
    osMinimizeMessageSchema,
    osFocusMessageSchema,
    osBrowserOpenMessageSchema,
    codeEditMessageSchema,
    agentTaskDispatchMessageSchema,
    agentTaskResultMessageSchema,
    mcpToolCallMessageSchema,
    mcpToolResultMessageSchema,
]);

export type OpenFileMessage = z.infer<typeof openFileMessageSchema>;
export type OpenProjectMessage = z.infer<typeof openProjectMessageSchema>;
export type GitStatusMessage = z.infer<typeof gitStatusMessageSchema>;
export type GitStatusUpdateMessage = z.infer<typeof gitStatusUpdateMessageSchema>;
export type LearningEventMessage = z.infer<typeof learningEventMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type CommandRequestMessage = z.infer<typeof commandRequestMessageSchema>;
export type CommandExecuteMessage = z.infer<typeof commandExecuteMessageSchema>;
export type CommandResultMessage = z.infer<typeof commandResultMessageSchema>;
export type CommandResponseMessage = z.infer<typeof commandResponseMessageSchema>;
export type BridgeStatsMessage = z.infer<typeof bridgeStatsMessageSchema>;
export type CodeEditMessage = z.infer<typeof codeEditMessageSchema>;
export type TaskStartedMessage = z.infer<typeof taskStartedMessageSchema>;
export type TaskStoppedMessage = z.infer<typeof taskStoppedMessageSchema>;
export type TaskProgressMessage = z.infer<typeof taskProgressMessageSchema>;
export type TaskActivityMessage = z.infer<typeof taskActivityMessageSchema>;
export type TaskInsightsMessage = z.infer<typeof taskInsightsMessageSchema>;
export type ContextUpdateMessage = z.infer<typeof contextUpdateMessageSchema>;
export type FileChangedMessage = z.infer<typeof fileChangedMessageSchema>;
export type ActivitySyncMessage = z.infer<typeof activitySyncMessageSchema>;
export type ProjectCreateMessage = z.infer<typeof projectCreateMessageSchema>;
export type GuidanceRequestMessage = z.infer<typeof guidanceRequestMessageSchema>;
export type GuidanceResponseMessage = z.infer<typeof guidanceResponseMessageSchema>;
export type TaskUpdateMessage = z.infer<typeof taskUpdateMessageSchema>;

// Agent communication message types
export type AgentTaskDispatchMessage = z.infer<typeof agentTaskDispatchMessageSchema>;
export type AgentTaskResultMessage = z.infer<typeof agentTaskResultMessageSchema>;
export type McpToolCallMessage = z.infer<typeof mcpToolCallMessageSchema>;
export type McpToolResultMessage = z.infer<typeof mcpToolResultMessageSchema>;

export type IPCMessage = z.infer<typeof ipcMessageSchema>;
