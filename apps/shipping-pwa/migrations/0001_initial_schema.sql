-- Initial schema for DC8980 Shipping PWA
-- D1 Database Migration

-- Tenants table (multi-tenant support)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  api_key_hash TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON configuration
  subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK(subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  subscription_expires_at TEXT,
  max_users INTEGER DEFAULT 5,
  max_doors INTEGER DEFAULT 20,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_subscription ON tenants(subscription_status, subscription_expires_at);

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin', 'support')),
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive'))
);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_email ON admins(email);

-- Usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  doors_processed INTEGER DEFAULT 0,
  pallets_tracked INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used INTEGER DEFAULT 0, -- in MB
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_tenant ON usage_metrics(tenant_id);
CREATE INDEX idx_usage_timestamp ON usage_metrics(timestamp);
CREATE INDEX idx_usage_tenant_time ON usage_metrics(tenant_id, timestamp);

-- Subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  change_type TEXT CHECK(change_type IN ('upgrade', 'downgrade', 'renewal', 'cancellation')),
  amount REAL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  transaction_id TEXT,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  effective_date TEXT,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_tenant ON subscription_history(tenant_id);
CREATE INDEX idx_subscription_date ON subscription_history(changed_at);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  square_payment_id TEXT,
  square_order_id TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  metadata TEXT, -- JSON additional data
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_tenant ON payment_transactions(tenant_id);
CREATE INDEX idx_payment_status ON payment_transactions(status);
CREATE INDEX idx_payment_date ON payment_transactions(created_at);

-- API keys table (for multiple keys per tenant)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT,
  permissions TEXT, -- JSON array of permissions
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'expired')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_apikeys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_apikeys_status ON api_keys(status);

-- Webhooks table (for tenant webhook configurations)
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TEXT,
  failure_count INTEGER DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(active);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  admin_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Email queue table (for async email processing)
CREATE TABLE IF NOT EXISTS email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT,
  template_data TEXT, -- JSON
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  error_message TEXT
);

CREATE INDEX idx_email_status ON email_queue(status);
CREATE INDEX idx_email_created ON email_queue(created_at);

-- Feature flags table (for gradual rollouts)
CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT 0,
  tenant_whitelist TEXT, -- JSON array of tenant IDs
  percentage_rollout INTEGER DEFAULT 0 CHECK(percentage_rollout >= 0 AND percentage_rollout <= 100),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_features_name ON feature_flags(name);
CREATE INDEX idx_features_enabled ON feature_flags(enabled);

-- Insert default super admin
INSERT INTO admins (id, username, email, password_hash, role, status)
VALUES (
  'admin_default',
  'admin',
  'admin@dc8980shipping.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'super_admin',
  'active'
);

-- Insert default feature flags
INSERT INTO feature_flags (name, description, enabled)
VALUES
  ('voice_commands', 'Enable voice command features', 1),
  ('offline_mode', 'Enable offline mode support', 1),
  ('advanced_analytics', 'Enable advanced analytics dashboard', 0),
  ('api_v2', 'Enable API version 2 endpoints', 0),
  ('multi_warehouse', 'Enable multi-warehouse support', 0);

-- Insert sample free tier tenant (for testing)
INSERT INTO tenants (
  id, name, subdomain, api_key_hash, config,
  subscription_tier, subscription_status, max_users, max_doors
)
VALUES (
  'tenant_demo',
  'Demo Warehouse',
  'demo',
  '$2a$10$DemoHashedApiKey', -- Replace with actual bcrypt hash
  '{"companyName":"Demo Company","warehouseName":"Demo Warehouse","ownerEmail":"demo@example.com"}',
  'free',
  'active',
  5,
  20
);