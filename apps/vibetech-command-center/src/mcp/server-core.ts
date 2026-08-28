import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { ServiceContainer } from '../main/service-container';
import { registerTools, type McpTool } from './tools';

export type McpLog = (message: string) => void;

export function createCommandCenterMcpServer(container: ServiceContainer, log: McpLog): Server {
  const tools: McpTool[] = registerTools(container);

  const server = new Server(
    { name: 'vibetech-command-center', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((candidate) => candidate.name === req.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }],
        isError: true
      };
    }

    try {
      const result = await tool.handler(req.params.arguments ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`tool ${req.params.name} error: ${message}`);
      return {
        content: [{ type: 'text', text: `error: ${message}` }],
        isError: true
      };
    }
  });

  return server;
}
