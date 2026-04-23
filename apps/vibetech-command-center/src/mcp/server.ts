import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createServiceContainer, disposeServiceContainer, type ServiceContainer } from '../main/service-container';
import { registerTools, type McpTool } from './tools';

const MONOREPO_ROOT = 'C:\\dev';

async function main(): Promise<void> {
  const log = (msg: string): void => { process.stderr.write(`[mcp-command-center] ${msg}\n`); };

  log('starting');

  const container: ServiceContainer = createServiceContainer({
    monorepoRoot: MONOREPO_ROOT,
    wsPort: 0
  });

  const tools: McpTool[] = registerTools(container);

  const server = new Server(
    { name: 'vibetech-command-center', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }],
        isError: true
      };
    }
    try {
      const result = await tool.handler(req.params.arguments ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log(`tool ${req.params.name} error: ${message}`);
      return {
        content: [{ type: 'text', text: `error: ${message}` }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('ready');

  const shutdown = async (): Promise<void> => {
    log('shutting down');
    try { await server.close(); } catch {}
    try { await disposeServiceContainer(container); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
  process.on('beforeExit', () => { void shutdown(); });
}

void main().catch((err) => {
  process.stderr.write(`[mcp-command-center] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
