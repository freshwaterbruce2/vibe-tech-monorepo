-- DLQ table for permanently failed jobs
CREATE TABLE IF NOT EXISTS jobs_dlq (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  last_error TEXT,
  attempts INTEGER NOT NULL,
  failed_at TEXT NOT NULL,
  resolution TEXT NOT NULL DEFAULT 'unresolved', -- unresolved | retried | archived
  resolved_at TEXT,
  resolved_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_dlq_failed_at ON jobs_dlq(failed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_dlq_resolution ON jobs_dlq(resolution);
