import type { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

interface CronJob {
  name: string;
  schedule: string;
  nextRun: string;
  delivery: string;
  status: 'active' | 'paused' | 'draft';
}

export interface PipelineRun {
  taskId: string;
  goal: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: number;
  completedAt: number | null;
}

const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    name: 'Morning workspace pulse',
    schedule: '0 9 * * 1-5',
    nextRun: 'Tomorrow 09:00',
    delivery: 'origin',
    status: 'active',
  },
  {
    name: 'Vibe app health sweep',
    schedule: 'every 6h',
    nextRun: 'In 2h 14m',
    delivery: 'local',
    status: 'active',
  },
  {
    name: 'Docs freshness scan',
    schedule: '0 15 * * Fri',
    nextRun: 'Friday 15:00',
    delivery: 'origin',
    status: 'paused',
  },
  {
    name: 'Pipeline digest',
    schedule: 'draft',
    nextRun: 'Not scheduled',
    delivery: 'origin',
    status: 'draft',
  },
];

const CRON_JOBS_FILE = 'D:\\databases\\hermes_cron_jobs.json';
export const activeRuns = new Map<string, PipelineRun>();

function getCronJobs(): CronJob[] {
  try {
    if (fs.existsSync(CRON_JOBS_FILE)) {
      return JSON.parse(fs.readFileSync(CRON_JOBS_FILE, 'utf8')) as CronJob[];
    }
  } catch (err) {
    // Ignore error and use default
  }
  return DEFAULT_CRON_JOBS;
}

function saveCronJobs(jobs: CronJob[]) {
  try {
    const dir = path.dirname(CRON_JOBS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf8');
  } catch (err) {
    // Ignore error
  }
}

export async function registerDashboardRoutes(app: FastifyInstance) {
  // GET /api/dashboard/data
  app.get('/api/dashboard/data', async (_request, _reply) => {
    let episodicCount = 0;
    let semanticCount = 0;
    let proceduralCount = 0;
    let dbSizeBytes = 0;
    let antiPatternsCount = 0;
    const dbPath = 'D:\\databases\\memory.db';

    try {
      if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath, { readonly: true });
        
        try {
          const epRow = db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get() as { count: number };
          episodicCount = epRow?.count ?? 0;
        } catch { /* Table might not exist yet */ }

        try {
          const semRow = db.prepare('SELECT COUNT(*) as count FROM semantic_memory').get() as { count: number };
          semanticCount = semRow?.count ?? 0;
        } catch { /* Table might not exist yet */ }

        try {
          const procRow = db.prepare('SELECT COUNT(*) as count FROM procedural_memory').get() as { count: number };
          proceduralCount = procRow?.count ?? 0;
        } catch { /* Table might not exist yet */ }

        try {
          const cogRow = db.prepare("SELECT COUNT(*) as count FROM cognitive_memory WHERE kind = 'anti_pattern'").get() as { count: number };
          antiPatternsCount = cogRow?.count ?? 0;
        } catch { /* Table might not exist yet */ }

        db.close();
        dbSizeBytes = fs.statSync(dbPath).size;
      }
    } catch (dbErr) {
      app.log.error(dbErr, 'Failed to query memory database stats');
    }

    const antiPatternPenalty = antiPatternsCount * 5;
    const hygieneScore = Math.max(50, 99 - antiPatternPenalty);

    const memorySignals = [
      {
        label: 'User profile',
        value: 'Vibe Tech',
        detail: 'Company identity, naming preferences, and umbrella context are pinned for future builds.',
        tone: 'good' as const,
      },
      {
        label: 'Workspace map',
        value: 'V:/monorepo',
        detail: `Nx + pnpm monorepo patterns. We have ${semanticCount} semantic, ${episodicCount} episodic, and ${proceduralCount} procedural memories active.`,
        tone: 'good' as const,
      },
      {
        label: 'Cognitive load',
        value: `${antiPatternsCount} Anti-patterns`,
        detail: antiPatternsCount > 0 
          ? `Detected ${antiPatternsCount} coding anti-patterns. Refactoring or purging recommended to boost efficiency.`
          : 'Zero coding anti-patterns detected. Guidance systems operating at peak quality.',
        tone: antiPatternsCount > 0 ? ('watch' as const) : ('good' as const),
      },
      {
        label: 'Memory hygiene',
        value: `${hygieneScore}%`,
        detail: `Durable facts should stay compact. Database size: ${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB.`,
        tone: hygieneScore > 85 ? ('good' as const) : hygieneScore > 70 ? ('watch' as const) : ('danger' as const),
      },
    ];

    const cronJobs = getCronJobs();
    const runsList = Array.from(activeRuns.values());

    const pipelineStages = [
      {
        name: 'Intake',
        owner: 'User + Hermes',
        state: 'complete' as const,
        checklist: ['Capture objective', 'Load relevant skills', 'Inspect repo context'],
      },
      {
        name: 'Plan',
        owner: 'Orchestrator',
        state: 'complete' as const,
        checklist: ['Break into stages', 'Identify verification command', 'Confirm data/log path policy'],
      },
      {
        name: 'Build',
        owner: 'Coding agent',
        state: runsList.some(r => r.status === 'running') ? ('running' as const) : ('complete' as const),
        checklist: ['Implement focused changes', 'Keep files below soft limits', 'Preserve Vibe naming'],
      },
      {
        name: 'Verify',
        owner: 'Hermes QA',
        state: runsList.some(r => r.status === 'running')
          ? ('queued' as const)
          : runsList.some(r => r.status === 'failed')
          ? ('review' as const)
          : ('complete' as const),
        checklist: ['Run pnpm build', 'Run target tests', 'Report real output only'],
      },
    ];

    return {
      success: true,
      memorySignals,
      cronJobs,
      pipelineStages,
      activeRuns: runsList.sort((a, b) => b.startedAt - a.startedAt),
    };
  });

  // POST /api/dashboard/cron/toggle
  app.post('/api/dashboard/cron/toggle', async (request, _reply) => {
    const { name } = request.body as { name: string };
    if (!name) {
      return _reply.status(400).send({ error: 'Missing job name' });
    }

    const jobs = getCronJobs();
    const job = jobs.find(j => j.name === name);
    if (!job) {
      return _reply.status(404).send({ error: 'Cron job not found' });
    }

    job.status = job.status === 'active' ? 'paused' : 'active';
    saveCronJobs(jobs);

    return { success: true, cronJobs: jobs };
  });

  // POST /api/dashboard/cron/run
  app.post('/api/dashboard/cron/run', async (request, _reply) => {
    const { name } = request.body as { name: string };
    if (!name) {
      return _reply.status(400).send({ error: 'Missing job name' });
    }

    const jobs = getCronJobs();
    const job = jobs.find(j => j.name === name);
    if (!job) {
      return _reply.status(404).send({ error: 'Cron job not found' });
    }

    job.nextRun = 'Running...';
    saveCronJobs(jobs);

    // Mock background runner
    setTimeout(() => {
      const currentJobs = getCronJobs();
      const target = currentJobs.find(j => j.name === name);
      if (target) {
        target.nextRun = 'Just completed';
        saveCronJobs(currentJobs);
      }
    }, 2000);

    return { success: true, cronJobs: jobs };
  });

  // POST /api/dashboard/pipeline/run
  app.post('/api/dashboard/pipeline/run', async (request, _reply) => {
    const { goal } = request.body as { goal: string };
    if (!goal) {
      return _reply.status(400).send({ error: 'Missing task goal description' });
    }

    const taskId = crypto.randomUUID();
    const run: PipelineRun = {
      taskId,
      goal,
      status: 'running',
      stdout: '',
      stderr: '',
      exitCode: null,
      startedAt: Date.now(),
      completedAt: null,
    };
    activeRuns.set(taskId, run);

    // Spawn agy process
    const agyProcess = spawn('agy', ['agent', 'run', `/goal ${goal}`], {
      shell: true,
      env: { ...process.env },
    });

    agyProcess.stdout.on('data', (data) => {
      run.stdout += data.toString();
    });

    agyProcess.stderr.on('data', (data) => {
      run.stderr += data.toString();
    });

    agyProcess.on('close', (code) => {
      run.status = code === 0 ? 'success' : 'failed';
      run.exitCode = code;
      run.completedAt = Date.now();
    });

    agyProcess.on('error', (err) => {
      run.status = 'failed';
      run.stderr += `\nError spawning agy: ${err.message}`;
      run.completedAt = Date.now();
    });

    return { success: true, taskId, run };
  });

  // GET /api/dashboard/pipeline/status/:taskId
  app.get('/api/dashboard/pipeline/status/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const run = activeRuns.get(taskId);
    if (!run) {
      return reply.status(404).send({ error: 'Task run not found' });
    }
    return { success: true, run };
  });
}
