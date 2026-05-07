CREATE TABLE IF NOT EXISTS tax_rates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rate_pct REAL NOT NULL,
  region_code TEXT,
  is_compound INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_user ON tax_rates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tax_rates_default
  ON tax_rates(user_id) WHERE is_default = 1;

ALTER TABLE clients ADD COLUMN default_tax_rate_id TEXT;
ALTER TABLE invoice_items ADD COLUMN tax_rate_id TEXT;
ALTER TABLE invoices ADD COLUMN tax_strategy TEXT NOT NULL DEFAULT 'invoice';
