import cors from '@fastify/cors';
import Fastify from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import {
  openAuthDb,
  upsertUser,
  createSessionToken,
  parseSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
} from '@vibetech/auth';

const app = Fastify({ logger: true });

// Port and host configuration
const port = Number(process.env['PORT'] ?? 6400);
const host = process.env['HOST'] ?? '127.0.0.1';

// Register CORS
await app.register(cors, {
  origin: true,
  credentials: true,
});

// Helper to parse cookies from headers
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  for (const pair of cookieHeader.split(';')) {
    const parts = pair.trim().split('=');
    const key = parts[0];
    const value = parts[1];
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  }
  return cookies;
}

// 1. GET /api/auth/login
// Redirects to mock authorization endpoint with generated state to prevent CSRF
app.get('/api/auth/login', async (request, reply) => {
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = (request.query as Record<string, string>)['redirect_uri'] ?? `http://127.0.0.1:${port}/api/auth/callback`;
  
  // Save state in secure HttpOnly cookie (valid for 5 mins)
  const isProduction = process.env['NODE_ENV'] === 'production';
  const stateCookie = `oauth_state=${state}; Path=/; HttpOnly; Max-Age=300; SameSite=Lax${isProduction ? '; Secure' : ''}`;
  reply.header('Set-Cookie', stateCookie);

  // Redirect to Mock OAuth Provider
  const authUrl = `/api/auth/mock-provider?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return reply.redirect(authUrl);
});

// 2. GET /api/auth/mock-provider
// Renders a simple mock login prompt to simulate OAuth Consent page
app.get('/api/auth/mock-provider', async (request, reply) => {
  const { state, redirect_uri } = request.query as Record<string, string>;
  if (!state || !redirect_uri) {
    return reply.status(400).send({ error: 'Missing state or redirect_uri parameters.' });
  }

  reply.type('text/html');
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Mock OAuth Identity Provider</title>
      <style>
        body {
          background-color: #0d0c15;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 32px;
          width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h2 { margin-top: 0; color: #a78bfa; }
        p { color: #9ca3af; margin-bottom: 24px; font-size: 14px; }
        button {
          background: #7c3aed;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        button:hover { background: #6d28d9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Hermes Bridge Login</h2>
        <p>You are authorizing Hermes Bridge to access your VibeTech workspace identity.</p>
        <form action="${redirect_uri}" method="GET">
          <input type="hidden" name="state" value="${state}" />
          <input type="hidden" name="code" value="mock-auth-code-789" />
          <button type="submit">Approve & Sign In</button>
        </form>
      </div>
    </body>
    </html>
  `;
});

// 3. GET /api/auth/callback
// Validates state parameter against cookie and registers user securely
app.get('/api/auth/callback', async (request, reply) => {
  const { state, code } = request.query as Record<string, string>;
  const cookies = parseCookies(request.headers.cookie);
  const savedState = cookies['oauth_state'];

  // CSRF validation
  if (!state || !savedState || state !== savedState) {
    return reply.status(400).send({
      error: 'Security validation failed: State mismatch or missing (CSRF protection activated).',
    });
  }

  // Clear state cookie
  const clearStateCookie = `oauth_state=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`;
  reply.header('Set-Cookie', clearStateCookie);

  if (code !== 'mock-auth-code-789') {
    return reply.status(400).send({ error: 'Invalid authorization code.' });
  }

  // Mock identity returned from OAuth Exchange
  const mockEmail = 'hermes-operator@vibetech.com';
  const mockName = 'Hermes Operator';

  // Securely register the user in the central database
  const db = openAuthDb();
  let user;
  try {
    user = await upsertUser(db, {
      email: mockEmail,
      password: 'hermes-secure-placeholder-password',
      isAdmin: false,
      fullName: mockName,
    });
  } finally {
    db.close();
  }

  // Mint session token using central auth library
  const token = createSessionToken(user);
  
  // Set session cookie
  const isProduction = process.env['NODE_ENV'] === 'production';
  const sessionCookie = `${getSessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${getSessionTtlSeconds()}${isProduction ? '; Secure' : ''}`;
  
  reply.header('Set-Cookie', sessionCookie);
  
  return {
    success: true,
    message: 'Authentication successful. Session established.',
    user,
  };
});

// 4. GET /api/auth/session
// Resolves session from cookie statelessly
app.get('/api/auth/session', async (request, _reply) => {
  const cookies = parseCookies(request.headers.cookie);
  const sessionToken = cookies[getSessionCookieName()];

  if (!sessionToken) {
    return { authenticated: false, user: null };
  }

  try {
    const payload = parseSessionToken(sessionToken);
    if (!payload) {
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin ?? false,
      },
    };
  } catch (err) {
    app.log.error(err, 'Failed to parse session token');
    return { authenticated: false, user: null };
  }
});

// 5. POST /api/auth/logout
// Clears session cookie
app.post('/api/auth/logout', async (_request, reply) => {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const clearSessionCookie = `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`;
  
  reply.header('Set-Cookie', clearSessionCookie);
  return { success: true, message: 'Logged out successfully.' };
});

// WebSocket client connection setup to central IPC Bridge
function connectToIpcBridge() {
  const wsUrl = new URL('ws://127.0.0.1:5004');
  const token = process.env['BRIDGE_SECRET'] ?? process.env['IPC_BRIDGE_SECRET'];
  if (token) {
    wsUrl.searchParams.set('token', token);
  }

  app.log.info(`Connecting to IPC Bridge at ${wsUrl.origin}...`);
  const ws = new WebSocket(wsUrl.toString());

  ws.on('open', () => {
    app.log.info('Connected to central IPC Bridge');
    // Register as desktop-commander-v3 source
    ws.send(JSON.stringify({
      type: 'register',
      source: 'desktop-commander-v3',
      timestamp: Date.now(),
      messageId: `reg-${Date.now()}`,
      payload: {}
    }));
  });

  ws.on('message', (data) => {
    handleMessageAsync(data).catch((err) => {
      app.log.error(err, 'Failed to process message from IPC Bridge');
    });
  });

  async function handleMessageAsync(data: unknown) {
    const message = JSON.parse(String(data));
    if (message.type === 'command_execute') {
      const payload = message.payload;
      const { commandId, command, args, text } = payload;
      app.log.info(`Received command execution request: ${commandId} - ${command}`);

      // Route commands
      if (command === 'run' || command === 'agent' || command === 'agy') {
        await handleAgyCommand(ws, commandId, command, args, text);
      } else {
        sendErrorResponse(ws, commandId, `Command '${command}' is not supported by hermes-bridge`);
      }
    }
  }

  ws.on('close', (code, reason) => {
    app.log.warn(`IPC Bridge connection closed: ${code} - ${reason}. Reconnecting in 5s...`);
    setTimeout(connectToIpcBridge, 5000);
  });

  ws.on('error', (err) => {
    app.log.error(err, 'IPC Bridge connection error');
  });
}

async function handleAgyCommand(ws: WebSocket, commandId: string, command: string, args: string[], text: string) {
  try {
    // 1. Determine correct target repository path
    let repoPath = 'C:\\dev'; // Default path
    const lockPath = process.env['ACTIVE_PROJECT_LOCK_PATH'] ?? 'D:\\active-project\\active-project.json';

    if (fs.existsSync(lockPath)) {
      try {
        const lockContent = fs.readFileSync(lockPath, 'utf8');
        const lockData = JSON.parse(lockContent);
        if (lockData.activeProject) {
          const projectDirApps = path.join('C:\\dev\\apps', lockData.activeProject);
          const projectDirPackages = path.join('C:\\dev\\packages', lockData.activeProject);
          if (fs.existsSync(projectDirApps)) {
            repoPath = projectDirApps;
          } else if (fs.existsSync(projectDirPackages)) {
            repoPath = projectDirPackages;
          }
        }
      } catch (parseErr) {
        app.log.error(parseErr, 'Failed to parse active-project.json');
      }
    }

    app.log.info(`Target repository path for command: ${repoPath}`);

    // 2. Build the agy command arguments
    let agyArgs: string[] = [];
    if (command === 'run') {
      const task = args.join(' ') || text;
      agyArgs = ['agent', 'run', task, '--repo', repoPath];
    } else if (command === 'agent') {
      if (args[0] === 'run') {
        const task = args.slice(1).join(' ');
        agyArgs = ['agent', 'run', task, '--repo', repoPath];
      } else {
        agyArgs = [...args, '--repo', repoPath];
      }
    } else {
      agyArgs = [...args, '--repo', repoPath];
    }

    // 3. Execute agy subprocess
    app.log.info(`Executing: agy ${agyArgs.join(' ')}`);

    const agyProcess = spawn('agy', agyArgs, {
      shell: true,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    agyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    agyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    agyProcess.on('close', (code) => {
      app.log.info(`agy process exited with code ${code}`);
      const success = code === 0;
      
      ws.send(JSON.stringify({
        type: 'command_result',
        source: 'desktop-commander-v3',
        payload: {
          commandId,
          success,
          result: {
            stdout,
            stderr,
            exitCode: code
          },
          error: success ? null : (stderr || `Process exited with code ${code}`)
        },
        timestamp: Date.now(),
        messageId: `resp-${commandId}`
      }));
    });

    agyProcess.on('error', (err) => {
      app.log.error(err, 'Failed to start agy process');
      sendErrorResponse(ws, commandId, err.message);
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    app.log.error(err, 'Error handling agy command');
    sendErrorResponse(ws, commandId, errorMsg);
  }
}

function sendErrorResponse(ws: WebSocket, commandId: string, errorMsg: string) {
  ws.send(JSON.stringify({
    type: 'command_result',
    source: 'desktop-commander-v3',
    payload: {
      commandId,
      success: false,
      result: null,
      error: errorMsg
    },
    timestamp: Date.now(),
    messageId: `resp-${commandId}`
  }));
}

// Start server
const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`Hermes Bridge active at http://${host}:${port}`);
    connectToIpcBridge();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
