import { IPCMessageType } from '@vibetech/shared-ipc';
import { WebSocket } from 'ws';
import { createLogger } from '@vibetech/logger';
import { listServers, loadConfig } from './config.js';
import { startHttpApi } from './http-api.js';
import { McpClientManager } from './mcp-client.js';
import { TaskHandler } from './task-handler.js';

const logger = createLogger('McpGateway');

const SOURCE = 'antigravity' as const;
const VERSION = '1.0.0';
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(
    type: IPCMessageType,
    payload: Record<string, unknown>,
    correlationId?: string,
) {
    return JSON.stringify({
        messageId: makeId('msg'),
        type,
        timestamp: Date.now(),
        source: SOURCE,
        version: VERSION,
        ...(correlationId ? { correlationId } : {}),
        payload,
    });
}

function sendTaskResult(
    ws: WebSocket,
    correlationId: string,
    payload: Record<string, unknown>,
): void {
    ws.send(createMessage(IPCMessageType.AGENT_TASK_RESULT, payload, correlationId));
}

function sendToolResult(
    ws: WebSocket,
    correlationId: string,
    payload: Record<string, unknown>,
): void {
    ws.send(createMessage(IPCMessageType.MCP_TOOL_RESULT, payload, correlationId));
}

async function handleTaskDispatch(
    ws: WebSocket,
    taskHandler: TaskHandler,
    payload: Record<string, unknown>,
    correlationId: string,
): Promise<void> {
    const taskId = (payload as { taskId: string }).taskId;
    logger.info(`Received AGENT_TASK_DISPATCH: ${taskId}`);
    try {
        const result = await taskHandler.handleTaskDispatch(
            payload as Parameters<typeof taskHandler.handleTaskDispatch>[0],
        );
        sendTaskResult(ws, correlationId, { taskId, ...result });
    } catch {
        sendTaskResult(ws, correlationId, {
            taskId,
            status: 'failed',
            results: [],
            durationMs: 0,
        });
    }
}

async function handleToolCallMessage(
    ws: WebSocket,
    taskHandler: TaskHandler,
    payload: Record<string, unknown>,
    correlationId: string,
): Promise<void> {
    const { server, tool } = payload as { server: string; tool: string };
    logger.info(`Received MCP_TOOL_CALL: ${server}.${tool}`);
    try {
        const result = await taskHandler.handleToolCall(
            payload as Parameters<typeof taskHandler.handleToolCall>[0],
        );
        const callId = (payload as { callId: string }).callId;
        sendToolResult(ws, correlationId, { callId, ...result });
    } catch (err) {
        const callId = (payload as { callId: string }).callId;
        sendToolResult(ws, correlationId, {
            callId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            durationMs: 0,
        });
    }
}

async function handleMessage(
    ws: WebSocket,
    taskHandler: TaskHandler,
    raw: Buffer,
): Promise<void> {
    let msg: Record<string, unknown>;
    try {
        msg = JSON.parse(raw.toString());
    } catch {
        logger.error('Invalid JSON received');
        return;
    }

    const type = msg.type as string;
    const payload = msg.payload as Record<string, unknown>;
    const correlationId = (msg.correlationId as string) ?? (msg.messageId as string);

    switch (type) {
        case IPCMessageType.AGENT_TASK_DISPATCH:
            await handleTaskDispatch(ws, taskHandler, payload, correlationId);
            return;

        case IPCMessageType.MCP_TOOL_CALL:
            await handleToolCallMessage(ws, taskHandler, payload, correlationId);
            return;

        case IPCMessageType.PING:
            ws.send(createMessage(IPCMessageType.PONG, {}, correlationId));
            return;

        default:
            return;
    }
}

function scheduleReconnect(connect: () => void): void {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
    setTimeout(connect, delay);
}

function connectWebSocket(
    config: { ipcBridgeUrl: string },
    servers: string[],
    taskHandler: TaskHandler,
    onDisconnect: () => void,
): WebSocket {
    logger.info(`Connecting to IPC Bridge at ${config.ipcBridgeUrl}...`);
    const ws = new WebSocket(config.ipcBridgeUrl);

    ws.on('open', () => {
        logger.info('Connected to IPC Bridge');
        reconnectAttempts = 0;
        ws.send(
            createMessage(IPCMessageType.IDENTIFY, {
                clientType: SOURCE,
                capabilities: ['mcp_tool_call', 'agent_task_dispatch'],
                availableServers: servers,
            }),
        );
    });

    ws.on('message', (raw) => {
        void handleMessage(ws, taskHandler, raw as Buffer);
    });

    ws.on('close', (code) => {
        logger.info(`Disconnected from IPC Bridge (code: ${code})`);
        onDisconnect();
    });

    ws.on('error', (err) => {
        logger.error(`WebSocket error: ${err.message}`);
    });

    return ws;
}

async function main(): Promise<void> {
    logger.info('Starting MCP Gateway...');

    const config = loadConfig();
    const servers = listServers(config);
    logger.info(`Loaded ${servers.length} MCP server configs: ${servers.join(', ')}`);

    const mcpClient = new McpClientManager(config.mcpServers);
    const taskHandler = new TaskHandler(mcpClient);
    const httpServer = startHttpApi(mcpClient, config);

    function doConnect(): void {
        connectWebSocket(
            config,
            servers,
            taskHandler,
            () => scheduleReconnect(doConnect),
        );
    }

    async function shutdown(): Promise<void> {
        logger.info('Shutting down...');
        httpServer.close();
        await mcpClient.shutdown();
        process.exit(0);
    }

    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });

    doConnect();
}

main().catch((err) => {
    logger.error('Fatal error', undefined, err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
});
