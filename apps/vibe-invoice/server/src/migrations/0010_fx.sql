CREATE TABLE IF NOT EXISTS exchange_rates (
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate_date TEXT NOT NULL,
  rate REAL NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY(base, quote, rate_date)
);

ALTER TABLE invoices ADD COLUMN exchange_rate_to_user_currency REAL;
ALTER TABLE invoices ADD COLUMN user_currency_at_issue TEXT;
ALTER TABLE users ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'USD';
