CREATE TABLE IF NOT EXISTS dunning_policies (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  reminders_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dunning_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  reminder_step INTEGER NOT NULL,
  email_log_id TEXT,
  sent_at TEXT NOT NULL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dunning_step ON dunning_history(invoice_id, reminder_step);
CREATE INDEX IF NOT EXISTS idx_dunning_invoice ON dunning_history(invoice_id);
