// ============================================================================
// Feature Flags Core Types
// ============================================================================

export type Environment = 'dev' | 'staging' | 'prod';

export type FlagType = 'boolean' | 'percentage' | 'variant' | 'kill_switch';

export type KillSwitchPriority = 'critical' | 'high' | 'normal';

// ----------------------------------------------------------------------------
// Flag Value Types
// ----------------------------------------------------------------------------

export interface BooleanFlagValue {
  enabled: boolean;
}

export interface PercentageFlagValue {
  enabled: boolean;
  percentage: number; // 0-100
}

export interface VariantFlagValue {
  enabled: boolean;
  variants: Variant[];
}

export type FlagValue = BooleanFlagValue | PercentageFlagValue | VariantFlagValue;

// ----------------------------------------------------------------------------
// Core Flag Definition
// ----------------------------------------------------------------------------

export interface FeatureFlag {
  id: string;
  key: string;                    // e.g., "trading.new_strategy"
  name: string;
  description: string;
  type: FlagType;
  enabled: boolean;               // Global enabled state
  
  // Environment-specific values
  environments: Record<Environment, FlagValue>;
  
  // Targeting rules (evaluated in order)
  rules: TargetingRule[];
  
  // Kill switch specific config
  killSwitch?: KillSwitchConfig;
  
  // A/B test variants
  variants?: Variant[];
  
  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface KillSwitchConfig {
  priority: KillSwitchPriority;
  notifyOnTrigger: boolean;
  webhookUrl?: string;
  cooldownMs?: number;            // Prevent rapid toggling
}

export interface Variant {
  key: string;
  name: string;
  weight: number;                 // 0-100 (sum of all variants should = 100)
  payload?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Targeting Rules
// ----------------------------------------------------------------------------

export type TargetingOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'in_list'
  | 'not_in_list'
  | 'percentage'
  | 'semver_gt'
  | 'semver_lt'
  | 'semver_eq';

export interface TargetingRule {
  id: string;
  attribute: string;              // e.g., "userId", "environment", "appVersion"
  operator: TargetingOperator;
  value: unknown;
  enabled: boolean;
  
  // If rule matches, return this value (otherwise continue to next rule)
  returnValue?: FlagValue;
}

// ----------------------------------------------------------------------------
// Evaluation Context
// ----------------------------------------------------------------------------

export interface EvaluationContext {
  // Required for consistent bucketing
  userId?: string;
  sessionId?: string;
  
  // Environment
  environment: Environment;
  
  // App-specific
  appName?: string;               // 'nova-agent' | 'deepcode-editor' | 'trading-bot'
  appVersion?: string;
  
  // Custom attributes for targeting
  attributes?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Evaluation Result
// ----------------------------------------------------------------------------

export interface EvaluationResult {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  payload?: Record<string, unknown>;
  reason: EvaluationReason;
  ruleId?: string;
}

export type EvaluationReason = 
  | 'flag_disabled'
  | 'kill_switch_active'
  | 'targeting_rule_match'
  | 'percentage_rollout'
  | 'variant_assignment'
  | 'default_value'
  | 'error';

// ----------------------------------------------------------------------------
// Kill Switch Events
// ----------------------------------------------------------------------------

export interface KillSwitchEvent {
  flagKey: string;
  action: 'activated' | 'deactivated';
  priority: KillSwitchPriority;
  timestamp: string;
  triggeredBy?: string;
  reason?: string;
}

// ----------------------------------------------------------------------------
// API Types
// ----------------------------------------------------------------------------

export interface FlagEvaluationRequest {
  flagKeys?: string[];            // If empty, evaluate all flags
  context: EvaluationContext;
}

export interface FlagEvaluationResponse {
  flags: Record<string, EvaluationResult>;
  timestamp: string;
}

export interface BulkFlagResponse {
  flags: FeatureFlag[];
  hash: string;                   // For caching/invalidation
  timestamp: string;
}

// ----------------------------------------------------------------------------
// SDK Configuration
// ----------------------------------------------------------------------------

export interface FeatureFlagClientConfig {
  serverUrl: string;
  environment: Environment;
  apiKey?: string;
  
  // Polling
  refreshIntervalMs?: number;     // Default: 30000 (30s)
  
  // Real-time
  enableWebSocket?: boolean;      // Default: true for kill switches
  
  // Caching
  enableLocalCache?: boolean;     // Default: true
  cacheMaxAge?: number;           // Default: 300000 (5 min)
  
  // Kill switch handler
  onKillSwitch?: (event: KillSwitchEvent) => void | Promise<void>;
  
  // Error handling
  onError?: (error: Error) => void;
  
  // Logging
  logger?: Logger;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// ----------------------------------------------------------------------------
// WebSocket Messages
// ----------------------------------------------------------------------------

export type WSMessageType = 
  | 'flag_update'
  | 'kill_switch'
  | 'bulk_update'
  | 'ping'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}

export interface WSFlagUpdatePayload {
  flag: FeatureFlag;
}

export interface WSKillSwitchPayload {
  event: KillSwitchEvent;
}
