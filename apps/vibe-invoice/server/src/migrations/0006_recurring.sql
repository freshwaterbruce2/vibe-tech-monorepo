CREATE TABLE IF NOT EXISTS recurring_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_invoice_id TEXT NOT NULL,
  frequency TEXT NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  next_run_at TEXT NOT NULL,
  end_type TEXT NOT NULL DEFAULT 'never',
  end_date TEXT,
  occurrences_remaining INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(template_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_schedules(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_schedules(user_id);
