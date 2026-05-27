import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import dotenv from 'dotenv';

// Load environment variables relative to the script location
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const port = parseInt(process.env.CC_BRIDGE_PORT || '8743', 10);
const host = process.env.CC_BRIDGE_HOST || '0.0.0.0';
const token = process.env.CC_BRIDGE_TOKEN;
const workspaceRoot = process.env.WORKSPACE_ROOT || 'C:\\dev';

if (!token) {
  console.warn('[Warning] CC_BRIDGE_TOKEN is not defined in the environment. All requests will be accepted.');
}

const fastify = Fastify({
  logger: true
});

// Enable CORS
await fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

// Enable WebSockets
await fastify.register(fastifyWebsocket);

// Authentication helper
const isAuthenticated = (req) => {
  if (!token) return true;
  
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (provided === token) return true;
  }

  // Check query parameter
  const queryToken = req.query?.token;
  if (queryToken === token) return true;

  return false;
};

// -----------------------------------------------------------------------------
// REST Routes
// -----------------------------------------------------------------------------

// Public Health Check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Authenticated Build Endpoint
fastify.post('/build/:project', async (request, reply) => {
  if (!isAuthenticated(request)) {
    reply.status(401);
    return { error: 'Unauthorized' };
  }

  const project = request.params.project;
  if (!project) {
    reply.status(400);
    return { error: 'Project name is required' };
  }

  reply.header('Content-Type', 'text/plain; charset=utf-8');
  reply.header('Transfer-Encoding', 'chunked');

  console.log(`[Build] Starting build for project: ${project}`);
  
  // Use PowerShell 7 to execute pnpm run build:<project> in workspace root
  const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', `pnpm run build:${project}`], {
    cwd: workspaceRoot,
    env: { ...process.env }
  });
  child.stdin.end();

  child.stdout.on('data', (data) => {
    reply.raw.write(data);
  });

  child.stderr.on('data', (data) => {
    reply.raw.write(data);
  });

  child.on('close', (code) => {
    reply.raw.write(`\n[Build Finished] Process exited with code ${code}\n`);
    reply.raw.end();
  });
});

// Alternative POST /build with JSON body
fastify.post('/build', async (request, reply) => {
  if (!isAuthenticated(request)) {
    reply.status(401);
    return { error: 'Unauthorized' };
  }

  const body = request.body || {};
  const project = body.project || request.query?.project;

  if (!project) {
    reply.status(400);
    return { error: 'Project name is required in request body or query parameter' };
  }

  reply.header('Content-Type', 'text/plain; charset=utf-8');
  reply.header('Transfer-Encoding', 'chunked');

  console.log(`[Build] Starting build for project: ${project}`);

  const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', `pnpm run build:${project}`], {
    cwd: workspaceRoot,
    env: { ...process.env }
  });
  child.stdin.end();

  child.stdout.on('data', (data) => {
    reply.raw.write(data);
  });

  child.stderr.on('data', (data) => {
    reply.raw.write(data);
  });

  child.on('close', (code) => {
    reply.raw.write(`\n[Build Finished] Process exited with code ${code}\n`);
    reply.raw.end();
  });
});

// -----------------------------------------------------------------------------
// WebSocket Route
// -----------------------------------------------------------------------------

// WebSockets at /ws
fastify.route({
  method: 'GET',
  url: '/ws',
  handler: async (request, reply) => {
    // Normal HTTP requests to /ws get 400
    reply.status(400).send({ error: 'WebSocket connection expected' });
  },
  wsHandler: (connection, req) => {
    console.log('[WS] Client connecting...');

    // Authenticate WebSocket connection
    const tokenQuery = req.query?.token;
    if (token && tokenQuery !== token) {
      console.log('[WS] Authentication failed: invalid token.');
      connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
      connection.socket.close();
      return;
    }

    connection.socket.send(JSON.stringify({ type: 'info', message: 'Connected and authenticated to Desktop Bridge' }));

    connection.socket.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log(`[WS] Received payload:`, payload);

        if (payload.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (payload.type === 'exec') {
          const command = payload.command;
          if (!command) {
            connection.socket.send(JSON.stringify({ type: 'error', message: 'No command provided' }));
            return;
          }

          console.log(`[WS Exec] Running command: ${command}`);
          const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
            cwd: workspaceRoot,
            env: { ...process.env }
          });

          child.stdout.on('data', (data) => {
            connection.socket.send(JSON.stringify({ type: 'stdout', data: data.toString() }));
          });

          child.stderr.on('data', (data) => {
            connection.socket.send(JSON.stringify({ type: 'stderr', data: data.toString() }));
          });

          child.on('error', (err) => {
            console.error('[WS Exec Error] Failed to start child:', err);
            connection.socket.send(JSON.stringify({ type: 'error', message: `Spawn error: ${err.message}` }));
          });

          child.on('close', (code) => {
            connection.socket.send(JSON.stringify({ type: 'exit', code }));
          });

          child.stdin.write(command);
          child.stdin.end();
        }
      } catch (err) {
        connection.socket.send(JSON.stringify({ type: 'error', message: `Parse error: ${err.message}` }));
      }
    });

    connection.socket.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  }
});

// Start Server
try {
  await fastify.listen({ port, host });
  console.log(`\n[Bridge] 🚀 Server running at http://${host}:${port}`);
  console.log(`[Bridge] Accessible locally via http://localhost:${port}`);
  console.log(`[Bridge] Security token active: ${token ? 'YES' : 'NO'}\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
