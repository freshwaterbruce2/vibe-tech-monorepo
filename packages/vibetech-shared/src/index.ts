/**
 * @vibetech/shared - Shared components for NOVA Agent and Vibe Code Studio
 *
 * This package provides common functionality across both desktop applications:
 * - Specialized AI agents
 * - Database services
 * - AI integrations
 * - Learning system
 * - Persistence (DatabaseManager, schema migrations)
 * - Intelligence (ProjectIndexer, AutoUpdateSentinel, AgentLearningRAG)
 * - Abstraction (IAgentAdapter, BaseAgentAdapter)
 * - Common types
 */

// Specialized Agents
export * from './agents';

// Database Services
export * from './database';

// AI Services
export * from './ai';

// Learning System
export * from './learning';

// IPC Bridge
export * from './ipc';

// Common Types
export * from './types';

// Persistence (merged from @nova/core)
export { DatabaseManager } from './persistence/DatabaseManager.js';
export type { DatabaseManagerOptions } from './persistence/DatabaseManager.js';
export { runSchemaMigrations, SCHEMA_MIGRATIONS } from './persistence/schemaMigrations.js';
export type { SchemaMigration } from './persistence/schemaMigrations.js';

// Intelligence (merged from @nova/core)
export { AgentLearningRAG } from './intelligence/AgentLearningRAG.js';
export { ProjectIndexer } from './intelligence/ProjectIndexer.js';
export { AutoUpdateSentinel } from './intelligence/AutoUpdateSentinel.js';

// Abstraction (merged from @nova/core)
export type { IAgentAdapter, ProjectInfo, AgentState, WebSearchResult, ChatMessage } from './abstraction/AgentAdapter.js';
export { BaseAgentAdapter } from './abstraction/AgentAdapter.js';
