import type Database from 'better-sqlite3';

export interface DLQJob {
  id: string;
  original_job_id: string;
  type: string;
  payload_json: string;
  last_error: string | null;
  attempts: number;
  failed_at: string;
  resolution: 'unresolved' | 'retried' | 'archived';
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

export function moveJobToDLQ(db: Database.Database, jobId: string, error: string): void {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as any;
  if (!job) return;

  const dlqId = `dlq_${jobId}_${Date.now()}`;

  const insert = db.prepare(`
    INSERT INTO jobs_dlq (
      id, original_job_id, type, payload_json, last_error, attempts, failed_at, resolution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unresolved')
  `);

  insert.run(
    dlqId,
    jobId,
    job.type,
    job.payload_json,
    error,
    job.attempts,
    new Date().toISOString()
  );

  // Remove from active jobs table
  db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
}

export function listDLQJobs(db: Database.Database, limit = 50): DLQJob[] {
  return db.prepare(`
    SELECT * FROM jobs_dlq
    WHERE resolution = 'unresolved'
    ORDER BY failed_at DESC
    LIMIT ?
  `).all(limit) as DLQJob[];
}

export function retryDLQJob(db: Database.Database, dlqId: string): string | null {
  const dlqJob = db.prepare('SELECT * FROM jobs_dlq WHERE id = ?').get(dlqId) as any;
  if (!dlqJob || dlqJob.resolution !== 'unresolved') return null;

  const newJobId = `retry_${dlqJob.original_job_id}_${Date.now()}`;

  const insertJob = db.prepare(`
    INSERT INTO jobs (id, type, payload_json, status, attempts, max_attempts, next_run_at, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 0, ?, datetime('now'), datetime('now'), datetime('now'))
  `);

  insertJob.run(newJobId, dlqJob.type, dlqJob.payload_json, 5); // allow more retries on manual retry

  // Mark DLQ as retried
  db.prepare(`
    UPDATE jobs_dlq
    SET resolution = 'retried', resolved_at = datetime('now')
    WHERE id = ?
  `).run(dlqId);

  return newJobId;
}

export function archiveDLQJob(db: Database.Database, dlqId: string, notes?: string): void {
  db.prepare(`
    UPDATE jobs_dlq
    SET resolution = 'archived', resolved_at = datetime('now'), notes = ?
    WHERE id = ?
  `).run(notes || null, dlqId);
}
