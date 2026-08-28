import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { initSSE } from './events.js';
import { runReflection } from './reflection.js';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT ?? '3085', 10);

// Active jobs: jobId → { task, started }
const jobs = new Map<string, { task: string; started: number }>();

app.use(cors());
app.use(express.json());

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, jobs: jobs.size });
});

app.listen(PORT, () => {
  console.log(`Reflection server → http://localhost:${PORT}`);
});
