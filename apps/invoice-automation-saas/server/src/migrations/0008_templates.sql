CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  base_template TEXT NOT NULL CHECK (base_template IN ('classic','modern','minimal')),
  config_json TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_user ON invoice_templates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_templates_default
  ON invoice_templates(user_id) WHERE is_default = 1 AND user_id IS NOT NULL;

ALTER TABLE invoices ADD COLUMN template_id TEXT;
ALTER TABLE users ADD COLUMN logo_path TEXT;
