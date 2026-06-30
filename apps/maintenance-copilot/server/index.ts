/**
 * Express gateway for the Monorepo Maintenance Co-Pilot (port 8675).
 * Bridges the React/Tauri frontend to live workspace + system health data.
 * In packaged builds this file is compiled to the `gateway` sidecar binary.
 */
import express from 'express';
import cors from 'cors';
import { healthRouter } from './health-adapter.js';
import repairRouter from './server.js';
import { mcpRouter } from './mcp-adapter.js';

const PORT = Number(process.env.GATEWAY_PORT ?? 8675);

// Resilience: a single bad request (e.g. a slow pwsh spawn under concurrent
// panel loads) must never take the whole gateway down — log and keep serving.
process.on('unhandledRejection', (reason) =>
  console.error('[gateway] unhandledRejection:', reason),
);
process.on('uncaughtException', (err) => console.error('[gateway] uncaughtException:', err));

const app = express();
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://tauri.localhost',
      'tauri://localhost',
    ],
  }),
);
app.use(express.json());

app.get('/api/ping', (_req, res) => {
  res.json({
    ok: true,
    service: 'maintenance-copilot-gateway',
    port: PORT,
    ts: new Date().toISOString(),
  });
});

app.use('/api/health', healthRouter);
app.use(repairRouter);
app.use(mcpRouter);

app.listen(PORT, () => {
  console.log(`[gateway] Monorepo Maintenance Co-Pilot listening on http://localhost:${PORT}`);
});
