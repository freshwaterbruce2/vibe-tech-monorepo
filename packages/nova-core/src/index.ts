// @nova/core - Main barrel export
export { AutoUpdateSentinel } from './intelligence/AutoUpdateSentinel.js';
export { ProjectIndexer } from './intelligence/ProjectIndexer.js';
export { DatabaseManager } from './persistence/DatabaseManager.js';

// Re-export sub-modules
export * from './abstraction/AgentAdapter.js';
export * from './intelligence/index.js';
export * from './persistence/index.js';
