use super::checkpoints::{CheckpointContent, TaskCheckpoint};
use super::connection::DatabaseService;
use serde_json::Value;

impl DatabaseService {
    pub fn create_checkpoint_tables(&self) -> rusqlite::Result<()> {
        self.tasks_db.execute_batch(
            "CREATE TABLE IF NOT EXISTS task_execution_checkpoints (
                task_id TEXT PRIMARY KEY REFERENCES task_tasks(id) ON DELETE CASCADE,
                schema_version INTEGER NOT NULL,
                revision INTEGER NOT NULL CHECK(revision > 0),
                state TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                progress_json TEXT NOT NULL,
                tool_results_json TEXT NOT NULL,
                pending_approval_json TEXT,
                errors_json TEXT NOT NULL,
                conversation_json TEXT NOT NULL,
                next_action_json TEXT NOT NULL,
                workspace_fingerprint TEXT NOT NULL,
                preconditions_json TEXT NOT NULL,
                checksum TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                completed_at INTEGER
             );
             CREATE TABLE IF NOT EXISTS task_action_ledger (
                action_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL REFERENCES task_tasks(id) ON DELETE CASCADE,
                checkpoint_revision INTEGER NOT NULL,
                sequence INTEGER NOT NULL,
                fingerprint TEXT NOT NULL,
                action_kind TEXT NOT NULL,
                consequential INTEGER NOT NULL CHECK(consequential IN (0, 1)),
                status TEXT NOT NULL,
                result_json TEXT,
                error_summary TEXT,
                continuation_ref TEXT,
                continuation_retire_pending INTEGER NOT NULL DEFAULT 0,
                started_at INTEGER NOT NULL,
                finished_at INTEGER,
                UNIQUE(task_id, fingerprint)
             );
             CREATE INDEX IF NOT EXISTS idx_task_checkpoints_state
                ON task_execution_checkpoints(state, updated_at);
             CREATE INDEX IF NOT EXISTS idx_task_action_ledger_task
                ON task_action_ledger(task_id, sequence);",
        )?;
        let has_continuation_ref: i64 = self.tasks_db.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('task_action_ledger') WHERE name='continuation_ref'",
            [],
            |row| row.get(0),
        )?;
        if has_continuation_ref == 0 {
            self.tasks_db.execute(
                "ALTER TABLE task_action_ledger ADD COLUMN continuation_ref TEXT",
                [],
            )?;
        }
        let has_retire_pending: i64 = self.tasks_db.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('task_action_ledger') WHERE name='continuation_retire_pending'",
            [],
            |row| row.get(0),
        )?;
        if has_retire_pending == 0 {
            self.tasks_db.execute(
                "ALTER TABLE task_action_ledger ADD COLUMN continuation_retire_pending INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
        }
        Ok(())
    }
}

pub(super) fn checkpoint_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TaskCheckpoint> {
    let parse = |index| -> rusqlite::Result<Value> {
        let raw: String = row.get(index)?;
        serde_json::from_str(&raw).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                index,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })
    };
    let pending_raw: Option<String> = row.get(7)?;
    Ok(TaskCheckpoint {
        task_id: row.get(0)?,
        schema_version: row.get(1)?,
        revision: row.get(2)?,
        content: CheckpointContent {
            state: row.get(3)?,
            plan: parse(4)?,
            progress: parse(5)?,
            tool_results: parse(6)?,
            pending_approval: pending_raw
                .map(|raw| serde_json::from_str(&raw))
                .transpose()
                .map_err(|error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        7,
                        rusqlite::types::Type::Text,
                        Box::new(error),
                    )
                })?,
            errors: parse(8)?,
            conversation: parse(9)?,
            next_action: parse(10)?,
            workspace_fingerprint: row.get(11)?,
            preconditions: parse(12)?,
        },
        checksum: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
        completed_at: row.get(16)?,
    })
}
