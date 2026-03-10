-- Chat history persistence
CREATE TABLE IF NOT EXISTS deepcode_chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  workspace_path TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER,
  workspace_context TEXT
);

-- Code snippets library
CREATE TABLE IF NOT EXISTS deepcode_code_snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME
);

-- Application settings
CREATE TABLE IF NOT EXISTS deepcode_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics and telemetry
CREATE TABLE IF NOT EXISTS deepcode_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Strategy memory (migrated from localStorage)
CREATE TABLE IF NOT EXISTS deepcode_strategy_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_hash TEXT UNIQUE NOT NULL,
  pattern_data TEXT NOT NULL,
  success_rate REAL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_workspace ON deepcode_chat_history(workspace_path);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON deepcode_chat_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_hash ON deepcode_strategy_memory(pattern_hash);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON deepcode_analytics(event_type);
