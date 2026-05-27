-- Add idempotency support to jobs and recurring schedules

-- Add idempotency_key to jobs (prevents duplicate scheduling)
ALTER TABLE jobs ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON jobs(idempotency_key);

-- Track last successful generation on recurring schedules
ALTER TABLE recurring_schedules ADD COLUMN last_generated_invoice_id TEXT;
ALTER TABLE recurring_schedules ADD COLUMN last_generated_at TEXT;
