import { MonetizedServiceServer } from './mcpServer.js';

// Configure the MCP server to run on port 5400 (seperate from Fastify API on 5300)
process.env.PORT = process.env.MCP_PORT || '5400';

console.log(`Starting Monetized MCP Server on port ${process.env.PORT}...`);
const mcpServer = new MonetizedServiceServer();
await mcpServer.runMonetizeMCPServer();
