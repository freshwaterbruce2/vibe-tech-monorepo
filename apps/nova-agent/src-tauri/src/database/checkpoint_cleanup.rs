use super::connection::DatabaseService;
use rusqlite::params;

impl DatabaseService {
    pub(crate) fn mark_task_continuations_for_retirement(
        &self,
        task_id: &str,
    ) -> Result<usize, String> {
        self.tasks_db
            .execute(
                "UPDATE task_action_ledger SET continuation_retire_pending=1
                 WHERE task_id=?1 AND continuation_ref IS NOT NULL",
                params![task_id],
            )
            .map_err(|error| error.to_string())
    }

    pub(crate) fn retry_pending_continuation_cleanup(&self) -> Result<usize, String> {
        self.tasks_db
            .execute(
                "UPDATE task_action_ledger SET continuation_retire_pending=1
             WHERE continuation_ref IS NOT NULL AND task_id IN (
               SELECT id FROM task_tasks WHERE status IN ('completed','abandoned','rejected')
             )",
                [],
            )
            .map_err(|error| error.to_string())?;
        let mut statement = self
            .tasks_db
            .prepare(
                "SELECT DISTINCT continuation_ref FROM task_action_ledger
             WHERE continuation_retire_pending=1 AND continuation_ref IS NOT NULL",
            )
            .map_err(|error| error.to_string())?;
        let references = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| error.to_string())?;
        drop(statement);
        let mut cleaned = 0;
        for reference in references {
            if crate::modules::llm::retire_task_continuation(&reference).is_ok() {
                cleaned += self
                    .tasks_db
                    .execute(
                        "UPDATE task_action_ledger
                         SET continuation_retire_pending=0,continuation_ref=NULL
                      WHERE continuation_ref=?1 AND continuation_retire_pending=1",
                        params![reference],
                    )
                    .map_err(|error| error.to_string())?;
            }
        }
        Ok(cleaned)
    }
}
