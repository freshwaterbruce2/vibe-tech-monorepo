/**
 * AVGE Backend Server
 *
 * Lightweight Express API that powers the dashboard:
 * - /api/fs/read|write — brain.md and project file I/O
 * - /api/mcp/call     — MCP tool proxy (NotebookLM, etc.)
 * - /api/health       — Health check
 *
 * Port: 3090 (configurable via PORT env)
 */

import cors from 'cors';
import express from 'express';
import { fsRouter } from './routes/fs.js';
import { mcpRouter } from './routes/mcp.js';

const PORT = parseInt(process.env.PORT ?? '3090', 10);
const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

/* ── Routes ── */
app.use('/api/fs', fsRouter);
app.use('/api/mcp', mcpRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'avge-server',
    version: '0.1.0',
    uptime: process.uptime(),
  });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`[AVGE Server] ✅ Running on http://localhost:${PORT}`);
  console.log(`[AVGE Server] Endpoints:`);
  console.log(`  POST /api/fs/read   — Read file from D:\\avge\\`);
  console.log(`  POST /api/fs/write  — Write file to D:\\avge\\`);
  console.log(`  POST /api/mcp/call  — Proxy MCP tool calls`);
  console.log(`  GET  /api/health    — Health check`);
});
