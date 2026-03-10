-- Build History Tracking Database Schema
-- Location: D:\databases\monorepo-automation.db

-- Builds table: tracks all build attempts
CREATE TABLE IF NOT EXISTS builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  build_type TEXT NOT NULL,  -- 'debug', 'release'
  platform TEXT NOT NULL,    -- 'android', 'ios', 'electron', 'tauri', 'web'
  version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,      -- 'in_progress', 'success', 'failed'
  duration_seconds INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Test results table: tracks test execution
CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id INTEGER,
  project TEXT NOT NULL,
  test_type TEXT NOT NULL,   -- 'unit', 'e2e', 'integration'
  total_tests INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  duration_seconds INTEGER,
  started_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (build_id) REFERENCES builds(id)
);

-- Deployments table: tracks service deployments
CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id INTEGER,
  project TEXT NOT NULL,
  environment TEXT NOT NULL,  -- 'local', 'staging', 'production'
  deployed_at TEXT NOT NULL,
  deployed_by TEXT,
  status TEXT NOT NULL,       -- 'success', 'failed', 'rolled_back'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (build_id) REFERENCES builds(id)
);

-- Dependency updates table: tracks package updates
CREATE TABLE IF NOT EXISTS dependency_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  old_version TEXT NOT NULL,
  new_version TEXT NOT NULL,
  update_type TEXT NOT NULL,  -- 'patch', 'minor', 'major'
  updated_at TEXT NOT NULL,
  test_status TEXT NOT NULL,  -- 'passed', 'failed'
  rolled_back INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_started_at ON builds(started_at);
CREATE INDEX IF NOT EXISTS idx_test_results_project ON test_results(project);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project);
CREATE INDEX IF NOT EXISTS idx_dependency_updates_package ON dependency_updates(package_name);
