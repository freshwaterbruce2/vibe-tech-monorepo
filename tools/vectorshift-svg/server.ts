import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT ?? 3000);
const API_HOST = process.env.VECTORSHIFT_API_HOST ?? '127.0.0.1';
const API_PORT = Number(process.env.VECTORSHIFT_API_PORT ?? 8000);
const API_ORIGIN = `http://${API_HOST}:${API_PORT}`;

let apiProcess: ChildProcessWithoutNullStreams | undefined;

function startVectorApi() {
  if (process.env.VECTORSHIFT_MANAGE_FASTAPI === '0') {
    return;
  }

  const python = process.env.PYTHON ?? 'python';
  apiProcess = spawn(
    python,
    ['-m', 'uvicorn', 'fastapi_backend:app', '--host', API_HOST, '--port', String(API_PORT)],
    {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  apiProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[vector-api] ${chunk}`);
  });

  apiProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[vector-api] ${chunk}`);
  });

  apiProcess.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`Vector API exited unexpectedly with code ${code ?? 'null'}`);
    }
  });
}

function stopVectorApi() {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
  }
}

function proxyApiRequest(req: express.Request, res: express.Response) {
  const targetUrl = new URL(req.originalUrl, API_ORIGIN);
  const headers = { ...req.headers, host: `${API_HOST}:${API_PORT}`, connection: 'close' };

  delete headers['accept-encoding'];

  const proxyReq = http.request(
    targetUrl,
    {
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders.connection;

      res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Vector engine is not available yet.',
        detail: error instanceof Error ? error.message : String(error),
      });
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
}

async function startServer() {
  startVectorApi();

  const app = express();

  app.use('/api', proxyApiRequest);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`VectorShift SVG running on http://127.0.0.1:${PORT}`);
    console.log(`Vector API proxy target: ${API_ORIGIN}`);
  });
}

process.on('SIGINT', () => {
  stopVectorApi();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopVectorApi();
  process.exit(0);
});

startServer().catch((error) => {
  stopVectorApi();
  console.error(error);
  process.exit(1);
});
