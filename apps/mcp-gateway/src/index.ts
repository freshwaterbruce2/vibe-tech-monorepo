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
    correlationId?: string
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

async function main() {
    logger.info('Starting MCP Gateway...');

    // Load config
    const config = loadConfig();
    const servers = listServers(config);
    logger.info(`Loaded ${servers.length} MCP server configs: ${servers.join(', ')}`);

    // Initialize MCP client manager, task handler, and HTTP API
    const mcpClient = new McpClientManager(config.mcpServers);
    const taskHandler = new TaskHandler(mcpClient);
    const httpServer = startHttpApi(mcpClient, config);

    function connect() {
        logger.info(`Connecting to IPC Bridge at ${config.ipcBridgeUrl}...`);
        const ws = new WebSocket(config.ipcBridgeUrl);

        ws.on('open', () => {
            logger.info('Connected to IPC Bridge');
            reconnectAttempts = 0;

            // Identify ourselves
            ws.send(
                createMessage(IPCMessageType.IDENTIFY, {
                    clientType: SOURCE,
                    capabilities: ['mcp_tool_call', 'agent_task_dispatch'],
                    availableServers: servers,
                })
            );
        });

        ws.on('message', async (raw) => {
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
                case IPCMessageType.AGENT_TASK_DISPATCH: {
                    logger.info(`Received AGENT_TASK_DISPATCH: ${(payload as { taskId: string }).taskId}`);
                    try {
                        const result = await taskHandler.handleTaskDispatch(
                            payload as Parameters<typeof taskHandler.handleTaskDispatch>[0]
                        );
                        ws.send(
                            createMessage(
                                IPCMessageType.AGENT_TASK_RESULT,
                                {
                                    taskId: (payload as { taskId: string }).taskId,
                                    ...result,
                                },
                                correlationId
                            )
                        );
                    } catch (err) {
                        ws.send(
                            createMessage(
                                IPCMessageType.AGENT_TASK_RESULT,
                                {
                                    taskId: (payload as { taskId: string }).taskId,
                                    status: 'failed',
                                    results: [],
                                    durationMs: 0,
                                },
                                correlationId
                            )
                        );
                    }
                    break;
                }

                case IPCMessageType.MCP_TOOL_CALL: {
                    logger.info(`Received MCP_TOOL_CALL: ${(payload as { server: string; tool: string }).server}.${(payload as { server: string; tool: string }).tool}`);
                    try {
                        const result = await taskHandler.handleToolCall(
                            payload as Parameters<typeof taskHandler.handleToolCall>[0]
                        );
                        ws.send(
                            createMessage(
                                IPCMessageType.MCP_TOOL_RESULT,
                                {
                                    callId: (payload as { callId: string }).callId,
                                    ...result,
                                },
                                correlationId
                            )
                        );
                    } catch (err) {
                        ws.send(
                            createMessage(
                                IPCMessageType.MCP_TOOL_RESULT,
                                {
                                    callId: (payload as { callId: string }).callId,
                                    success: false,
                                    error: err instanceof Error ? err.message : String(err),
                                    durationMs: 0,
                                },
                                correlationId
                            )
                        );
                    }
                    break;
                }

                case IPCMessageType.PING: {
                    ws.send(createMessage(IPCMessageType.PONG, {}, correlationId));
                    break;
                }

                default:
                    // Ignore messages not targeted at us
                    break;
            }
        });

        ws.on('close', (code) => {
            logger.info(`Disconnected from IPC Bridge (code: ${code})`);
            scheduleReconnect();
        });

        ws.on('error', (err) => {
            logger.error(`WebSocket error: ${err.message}`);
        });
    }

    function scheduleReconnect() {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
        logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
        setTimeout(connect, delay);
    }

    // Graceful shutdown
    async function shutdown() {
        logger.info('Shutting down...');
        httpServer.close();
        await mcpClient.shutdown();
        process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start
    connect();
}

main().catch((err) => {
    logger.error('Fatal error', undefined, err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
});
