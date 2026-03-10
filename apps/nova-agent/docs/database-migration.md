# Database Migration Guide

## Overview

Nova Agent uses SQLite databases with an automatic migration system to handle schema evolution. The migration system tracks schema versions and applies updates automatically on startup.

## Database Locations

All production databases are stored on the `D:\` drive:

- **Activity Database**: `D:\databases\nova_agent\nova_activity.db`
- **Tasks Database**: `D:\databases\nova_agent\agent_tasks.db`
- **Learning Database**: `D:\databases\nova_agent\agent_learning.db`

## Schema Version Tracking

Each database maintains a `schema_version` table that tracks:

- `db_name`: Name of the database (e.g., "activity")
- `version`: Current schema version (integer)
- `migrated_at`: Timestamp of the last migration

## Current Schema Versions

### Activity Database (v1)

**Migration v0 → v1**: Added `app_name` column to `deep_work_sessions` table.

The `deep_work_sessions` table schema:

```sql
CREATE TABLE deep_work_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name    TEXT NOT NULL,
    window_title TEXT NOT NULL,
    process_id  INTEGER NOT NULL,
    start_ts    INTEGER NOT NULL,
    end_ts      INTEGER,
    created_at  INTEGER NOT NULL
)
```

## Automatic Migration

Migrations run automatically during application startup:

1. The `DatabaseService` opens connections to all databases
2. For each database, it calls `migrate_database()` from `migration_utils.rs`
3. The migration system checks the current version
4. If an upgrade is needed, it applies migrations sequentially
5. Success/failure is logged to `D:\logs\nova-agent\`

**Log indicators**:

- ✅ Success: `Migration v1 for activity completed successfully`
- ⚠️ Warning: `Activity database migration failed: ... Continuing with current schema`

## Manual Database Reset

If migration fails or you need a fresh start:

### Option 1: Delete Database Files (Safe)

```powershell
# Stop the application first
Remove-Item "D:\databases\nova_agent\*.db" -Force
# Restart the application - fresh databases will be created
```

### Option 2: Delete Specific Database

```powershell
# For activity database only
Remove-Item "D:\databases\nova_agent\nova_activity.db*" -Force
```

**Note**: Database deletions are safe. The application will recreate them with the current schema on next startup.

## Troubleshooting

### Symptom: Repeated Database Errors in Logs

**Example**:

```
WARN nova_agent::activity_monitor: Failed to start deep work session: table deep_work_sessions has no column named app_name
```

**Cause**: Stale database schema (v0) incompatible with current code expecting v1.

**Solution**:

1. Check schema version:

   ```powershell
   sqlite3 D:\databases\nova_agent\nova_activity.db "SELECT * FROM schema_version"
   ```

2. If version is 0 or table doesn't exist, delete the database
3. Restart the application

### Symptom: Migration Fails on Startup

**Log**:

```
Activity database migration failed: ... Continuing with current schema
```

**Solutions**:

1. Check disk space on `D:\` drive
2. Ensure no other process has the database locked
3. Delete and recreate the database (Option 1 above)

### Symptom: "Cannot open database" Error

**Cause**: File permissions or disk issues.

**Solution**:

```powershell
# Check directory exists and is writable
Test-Path "D:\databases\nova_agent\" -PathType Container
# Create if needed
New-Item -ItemType Directory -Path "D:\databases\nova_agent\" -Force
```

## Development Mode

To reduce noise during development, disable the activity monitor:

1. Add to `.env`:

   ```
   DISABLE_ACTIVITY_MONITOR=true
   ```

2. Restart `pnpm tauri dev`

This prevents database operations from the activity monitor while preserving other functionality.

## Schema Evolution Process

When adding new migrations:

1. Update the database module (e.g., `activity.rs`) with new table definitions
2. Increment `CURRENT_SCHEMA_VERSION` in `migration_utils.rs`
3. Add a new migration function (e.g., `migrate_activity_v2`)
4. Register the migration in `apply_migration()` match statement
5. Test with both fresh databases and existing v(N-1) databases

## Data Preservation

The migration system attempts to preserve existing data:

- For column additions via `ALTER TABLE`: Data is preserved
- For table recreation: Old data is copied with placeholder values for new NOT NULL columns
- Backup: The old table is kept as `{table_name}_old` if copy fails

**Recommendation**: For production deployments, manually backup databases before upgrading:

```powershell
Copy-Item "D:\databases\nova_agent\*.db" "D:\databases\backups\$(Get-Date -Format 'yyyy-MM-dd')\"
```

## WAL Mode

All databases use SQLite's Write-Ahead Logging (WAL) mode for better concurrency:

- Multiple readers can access the database while a writer is active
- Reduces locking contention in multi-threaded environments
- Creates `.db-wal` and `.db-shm` files alongside the `.db` file

**Important**: Don't delete `-wal` or `-shm` files while the application is running.
