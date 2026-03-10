#!/usr/bin/env node

/**
 * MCP Server Adapter for PowerShell
 * 
 * This Node.js script wraps the PowerShell MCP script to ensure proper
 * input/output handling over Stdio, which can be tricky with raw PowerShell.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PS_SCRIPT = path.join(__dirname, 'mcp-server.ps1');

// Process arguments (passed from client)
// This adapter doesn't use the standard MCP SDK class 'Server' because
// it acts as a proxy to the PowerShell script which implements the logic.
// However, to make it work reliably, we might need to actually implement 
// the MCP protocol here and just call PowerShell for the actual work.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create server
const server = new Server(
  { name: 'd-drive-version-control', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Helper to run PowerShell command
async function runPowerShell(command, input = null) {
  return new Promise((resolve, reject) => {
    const args = ['-NoProfile', '-NonInteractive', '-Command', `& '${PS_SCRIPT}' -Command '${command}'`];
    
    const ps = spawn('pwsh', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    if (input) {
      ps.stdin.write(JSON.stringify(input));
      ps.stdin.end();
    }

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code !== 0) {
        // Try to parse error from stderr or stdout
        reject(new Error(`PowerShell exited with code ${code}: ${stderr || stdout}`));
      } else {
        try {
          // Find the JSON part of the output (PowerShell might output other text)
          const match = stdout.match(/{\s*\S[\s\S]*\S\s*}/);
          if (match) {
            resolve(JSON.parse(match[0]));
          } else {
             // Maybe it returned nothing or just text
             resolve(stdout.trim());
          }
        } catch (e) {
          reject(new Error(`Failed to parse JSON output: ${e.message}\nOutput: ${stdout}`));
        }
      }
    });
  });
}

// Register tools by querying the PowerShell script
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const result = await runPowerShell('list_tools');
    return result;
  } catch (error) {
    console.error('Error listing tools:', error);
    return { tools: [] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await runPowerShell('call_tool', {
      name: request.params.name,
      arguments: request.params.arguments
    });
    return result;
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
