-- Add timeout support to jobs table
ALTER TABLE jobs ADD COLUMN timeout_ms INTEGER;
ALTER TABLE jobs ADD COLUMN started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_locked_until ON jobs(locked_until);
