CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_log_invoice ON email_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
