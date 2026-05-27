CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  external_fee REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
