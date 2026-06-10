/**
 * @vibetech/shared-utils
 * Shared utilities for Vibetech monorepo
 */

// UI Utilities
export * from './ui';

// Security
export { SecureApiKeyManager } from './security/SecureApiKeyManager';

// Re-export security module
export * from './security';

// Browser Utilities
export * from './browser';

// WebMCP Support
export * from './webmcp';

// Path Registry
export * from './path-registry';

// AI Safety Utilities
export * from './ai';

// Logic types (merged from @vibetech/shared-logic)
export type { LogicPattern, ThoughtBlock, VectorSearchResult } from './logic-types';
