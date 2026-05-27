import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { initSSE } from './events.js';
import { runReflection } from './reflection.js';
import { historyRouter } from './routes/history.js';
import { optimizeRouter } from './routes/optimize.js';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT ?? '3085', 10);

// Active jobs: jobId → { task, started }
const jobs = new Map<string, { task: string; started: number }>();

app.use(cors());
app.use(express.json());

// Rate limiting: 10 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(
      ((res.getHeader('X-RateLimit-Reset') as number) - Date.now()) / 1000,
    );
    res.set('Retry-After', String(retryAfter > 0 ? retryAfter : 60));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: retryAfter > 0 ? retryAfter : 60,
    });
  },
});

// Apply rate limiting only to /api/optimize
app.use('/api/optimize', limiter);

// POST /api/reflect — create a job, return jobId immediately
app.post('/api/reflect', (req, res) => {
  const { task } = req.body as { task?: string };
  if (!task?.trim()) {
    res.status(400).json({ error: 'task is required' });
    return;
  }
  const jobId = uuidv4();
  jobs.set(jobId, { task: task.trim(), started: Date.now() });
  res.json({ jobId });
});

// GET /api/reflect/:jobId/stream — SSE event stream
app.get('/api/reflect/:jobId/stream', async (req, res) => {
  const job = jobs.get(req.params.jobId ?? '');
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  initSSE(res);

  // Clean up job on client disconnect
  req.on('close', () => {
    jobs.delete(req.params.jobId ?? '');
  });

  try {
    await runReflection(res, job.task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
    res.end();
  } finally {
    jobs.delete(req.params.jobId ?? '');
  }
});

// Routes
app.use('/api/optimize', optimizeRouter);
app.use('/api/history', historyRouter);

// Health check with API status
app.get('/api/health', (_req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  res.json({
    status: 'ok',
    ok: true,
    jobs: jobs.size,
    apiConfigured: Boolean(apiKey && apiKey.length > 0),
    timestamp: new Date().toISOString(),
  });
});

// Update API key at runtime (stores in memory for this session)
app.post('/api/settings/apikey', (req, res) => {
  const { apiKey } = req.body;
  if (apiKey && typeof apiKey === 'string') {
    process.env.OPENROUTER_API_KEY = apiKey;
    res.json({ success: true, message: 'API key updated for this session' });
  } else {
    res.status(400).json({ error: 'Invalid API key' });
  }
});

// Legacy health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Prompt Engineer API and Reflection server → http://localhost:${PORT}`);
});
