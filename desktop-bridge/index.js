/* eslint-disable no-console -- CLI/server entrypoint; stdout logging is intentional */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
// eslint-disable-next-line @nx/enforce-module-boundaries -- external pkg (non-Nx project)
import fastifyWebsocket from '@fastify/websocket';
import dotenv from 'dotenv';

// Load environment variables relative to the script location
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// desktop-bridge lives at <repo-root>/desktop-bridge, so the parent is the repo
// root. Derived from the script location so it stays drive-agnostic.
const REPO_ROOT = path.resolve(__dirname, '..');

// Authentication helper factory. Returns true when no token is configured.
function createAuthChecker(token) {
  return (req) => {
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
}

function registerHealthRoute(app) {
  // Public Health Check
  app.get('/health', () => ({ status: 'ok' }));
}

// Stream a `pnpm run build:<project>` invocation back to the client over the raw
// response. Shared by both /build routes.
function startBuildStream(reply, project, workspaceRoot) {
  reply.header('Content-Type', 'text/plain; charset=utf-8');
  reply.header('Transfer-Encoding', 'chunked');

  console.log(`[Build] Starting build for project: ${project}`);

  // Use PowerShell 7 to execute pnpm run build:<project> in workspace root
  const child = spawn(
    'pwsh',
    ['-NoProfile', '-NonInteractive', '-Command', `pnpm run build:${project}`],
    {
      cwd: workspaceRoot,
      env: { ...process.env },
    },
  );
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
}

function registerBuildRoutes(app, { isAuthenticated, workspaceRoot }) {
  // Authenticated Build Endpoint
  app.post('/build/:project', (request, reply) => {
    if (!isAuthenticated(request)) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { project } = request.params;
    if (!project) {
      reply.status(400).send({ error: 'Project name is required' });
      return;
    }

    startBuildStream(reply, project, workspaceRoot);
  });

  // Alternative POST /build with JSON body
  app.post('/build', (request, reply) => {
    if (!isAuthenticated(request)) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const body = request.body || {};
    const project = body.project || request.query?.project;

    if (!project) {
      reply
        .status(400)
        .send({ error: 'Project name is required in request body or query parameter' });
      return;
    }

    startBuildStream(reply, project, workspaceRoot);
  });
}

// Spawn a PowerShell process for a WS `exec` payload and stream its output back.
function runExec(socket, command, workspaceRoot) {
  console.log(`[WS Exec] Running command: ${command}`);
  const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
    cwd: workspaceRoot,
    env: { ...process.env },
  });

  child.stdout.on('data', (data) => {
    socket.send(JSON.stringify({ type: 'stdout', data: data.toString() }));
  });

  child.stderr.on('data', (data) => {
    socket.send(JSON.stringify({ type: 'stderr', data: data.toString() }));
  });

  child.on('error', (err) => {
    console.error('[WS Exec Error] Failed to start child:', err);
    socket.send(JSON.stringify({ type: 'error', message: `Spawn error: ${err.message}` }));
  });

  child.on('close', (code) => {
    socket.send(JSON.stringify({ type: 'exit', code }));
  });

  child.stdin.write(command);
  child.stdin.end();
}

// Handle a single inbound WS message (ping / exec).
function handleWsMessage(socket, message, workspaceRoot) {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`[WS] Received payload:`, payload);

    if (payload.type === 'ping') {
      socket.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (payload.type === 'exec') {
      const { command } = payload;
      if (!command) {
        socket.send(JSON.stringify({ type: 'error', message: 'No command provided' }));
        return;
      }

      runExec(socket, command, workspaceRoot);
    }
  } catch (err) {
    socket.send(JSON.stringify({ type: 'error', message: `Parse error: ${err.message}` }));
  }
}

function registerWsRoute(app, { token, workspaceRoot }) {
  // WebSockets at /ws
  app.route({
    method: 'GET',
    url: '/ws',
    handler: (_request, reply) => {
      // Normal HTTP requests to /ws get 400
      reply.status(400).send({ error: 'WebSocket connection expected' });
    },
    wsHandler: (socket, req) => {
      console.log('[WS] Client connecting...');

      // Authenticate WebSocket connection
      const tokenQuery = req.query?.token;
      if (token && tokenQuery !== token) {
        console.log('[WS] Authentication failed: invalid token.');
        socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
        socket.close();
        return;
      }

      socket.send(
        JSON.stringify({ type: 'info', message: 'Connected and authenticated to Desktop Bridge' }),
      );

      socket.on('message', (message) => handleWsMessage(socket, message, workspaceRoot));

      socket.on('close', () => {
        console.log('[WS] Client disconnected');
      });
    },
  });
}

/**
 * Build the Fastify instance with cors + websocket + all routes registered,
 * WITHOUT calling `.listen()`. Returns the instance so callers (and tests)
 * control the lifecycle.
 *
 * @param {{ token?: string, workspaceRoot?: string }} opts
 */
export async function buildServer(opts = {}) {
  const token = opts.token ?? process.env.CC_BRIDGE_TOKEN;
  const workspaceRoot = opts.workspaceRoot ?? process.env.WORKSPACE_ROOT ?? REPO_ROOT;

  if (!token) {
    console.warn(
      '[Warning] CC_BRIDGE_TOKEN is not defined in the environment. All requests will be accepted.',
    );
  }

  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Enable WebSockets
  await fastify.register(fastifyWebsocket);

  const isAuthenticated = createAuthChecker(token);

  registerHealthRoute(fastify);
  registerBuildRoutes(fastify, { isAuthenticated, workspaceRoot });
  registerWsRoute(fastify, { token, workspaceRoot });

  return fastify;
}

// Start the server only when this file is executed directly as the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = parseInt(process.env.CC_BRIDGE_PORT || '8743', 10);
  const host = process.env.CC_BRIDGE_HOST || '0.0.0.0';
  const token = process.env.CC_BRIDGE_TOKEN;

  const app = await buildServer();
  try {
    await app.listen({ port, host });
    console.log(`\n[Bridge] 🚀 Server running at http://${host}:${port}`);
    console.log(`[Bridge] Accessible locally via http://localhost:${port}`);
    console.log(`[Bridge] Security token active: ${token ? 'YES' : 'NO'}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
