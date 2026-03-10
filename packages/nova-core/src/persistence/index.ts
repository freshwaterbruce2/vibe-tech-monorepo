// Persistence module exports
export { DatabaseManager, type DatabaseManagerOptions } from './DatabaseManager.js';
export {
    runSchemaMigrations,
    SCHEMA_MIGRATIONS,
    type SchemaMigration,
} from './schemaMigrations.js';
