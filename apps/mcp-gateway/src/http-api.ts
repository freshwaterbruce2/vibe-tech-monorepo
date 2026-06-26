import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@vibetech/logger';
import type { GatewayConfig } from './config.js';
import type { McpClientManager } from './mcp-client.js';

const logger = createLogger('HttpApi');

interface CallBody {
    server: string;
    tool: string;
    args?: Record<string, unknown>;
}

function json(res: ServerResponse, status: number, data: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function parseRoute(url: string): { path: string; segments: string[] } {
    const [path] = (url ?? '/').split('?');
    return { path, segments: path.split('/').filter(Boolean) };
}

async function readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf-8');
}

function sendCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleHealth(res: ServerResponse, config: GatewayConfig): void {
    json(res, 200, {
        status: 'ok',
        service: 'mcp-gateway',
        uptime: process.uptime(),
        servers: Object.keys(config.mcpServers),
    });
}

function handleServers(res: ServerResponse, config: GatewayConfig): void {
    json(res, 200, { servers: Object.keys(config.mcpServers) });
}

async function handleServerTools(
    req: IncomingMessage,
    res: ServerResponse,
    mcpClient: McpClientManager,
    segments: string[],
): Promise<void> {
    const serverName = decodeURIComponent(segments[1]);
    const tools = await mcpClient.listTools(serverName);
    json(res, 200, { server: serverName, tools });
}

async function handleCall(
    req: IncomingMessage,
    res: ServerResponse,
    mcpClient: McpClientManager,
): Promise<void> {
    const raw = await readBody(req);
    let body: CallBody;
    try {
        body = JSON.parse(raw);
    } catch {
        json(res, 400, { error: 'Invalid JSON body' });
        return;
    }

    if (!body.server || !body.tool) {
        json(res, 400, { error: 'Missing required fields: server, tool' });
        return;
    }

    const startMs = performance.now();
    const result = await mcpClient.callTool(body.server, body.tool, body.args ?? {});
    const durationMs = Math.round(performance.now() - startMs);

    json(res, result.success ? 200 : 502, { ...result, durationMs });
}

function checkAuth(req: IncomingMessage, res: ServerResponse, apiKey: string | undefined): boolean {
    if (!apiKey) return true;
    const header = req.headers.authorization ?? '';
    if (header === `Bearer ${apiKey}`) return true;
    json(res, 401, { error: 'Unauthorized' });
    return false;
}

async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    mcpClient: McpClientManager,
    config: GatewayConfig,
): Promise<void> {
    sendCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (!checkAuth(req, res, config.apiKey)) return;

    const { path, segments } = parseRoute(req.url ?? '/');

    try {
        if (req.method === 'GET' && path === '/health') {
            handleHealth(res, config);
            return;
        }

        if (req.method === 'GET' && path === '/servers') {
            handleServers(res, config);
            return;
        }

        if (
            req.method === 'GET' &&
            segments[0] === 'servers' &&
            segments[2] === 'tools' &&
            segments.length === 3
        ) {
            await handleServerTools(req, res, mcpClient, segments);
            return;
        }

        if (req.method === 'POST' && path === '/call') {
            await handleCall(req, res, mcpClient);
            return;
        }

        json(res, 404, { error: `Not found: ${req.method} ${path}` });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Error handling ${req.method} ${path}: ${message}`);
        json(res, 500, { error: message });
    }
}

export function startHttpApi(mcpClient: McpClientManager, config: GatewayConfig) {
    const server = createServer((req, res) => {
        void handleRequest(req, res, mcpClient, config);
    });

    server.listen(config.httpPort, () => {
        logger.info(`HTTP API listening on http://localhost:${config.httpPort}`);
    });

    return server;
}
