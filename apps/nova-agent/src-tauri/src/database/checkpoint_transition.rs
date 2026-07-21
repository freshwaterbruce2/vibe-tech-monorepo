use super::checkpoints::{
    bounded_json, content_checksum, encoded_content, now, CheckpointContent, TaskCheckpoint,
};
use super::connection::DatabaseService;
use rusqlite::{params, Transaction};
use serde_json::Value;

impl DatabaseService {
    pub(crate) fn complete_action_and_checkpoint(
        &self,
        task_id: &str,
        expected_revision: i64,
        action_id: &str,
        fingerprint: &str,
        result: &Value,
        content: &CheckpointContent,
    ) -> Result<TaskCheckpoint, String> {
        self.complete_action_and_checkpoint_inner(
            task_id,
            expected_revision,
            action_id,
            fingerprint,
            result,
            content,
            false,
        )
    }

    #[cfg(test)]
    pub(crate) fn complete_action_and_checkpoint_with_failure(
        &self,
        task_id: &str,
        expected_revision: i64,
        action_id: &str,
        fingerprint: &str,
        result: &Value,
        content: &CheckpointContent,
    ) -> Result<TaskCheckpoint, String> {
        self.complete_action_and_checkpoint_inner(
            task_id,
            expected_revision,
            action_id,
            fingerprint,
            result,
            content,
            true,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn complete_action_and_checkpoint_inner(
        &self,
        task_id: &str,
        expected_revision: i64,
        action_id: &str,
        fingerprint: &str,
        result: &Value,
        content: &CheckpointContent,
        inject_failure: bool,
    ) -> Result<TaskCheckpoint, String> {
        let timestamp = now();
        let tx = self
            .tasks_db
            .unchecked_transaction()
            .map_err(|error| error.to_string())?;
        let ledger_changed = tx
            .execute(
                "UPDATE task_action_ledger SET status='completed',result_json=?1,finished_at=?2
                 WHERE task_id=?3 AND action_id=?4 AND fingerprint=?5 AND status='running'",
                params![
                    bounded_json(result),
                    timestamp,
                    task_id,
                    action_id,
                    fingerprint
                ],
            )
            .map_err(|error| error.to_string())?;
        if ledger_changed != 1 {
            return Err("action completion conflict".to_string());
        }
        if inject_failure {
            return Err("injected checkpoint transition failure".to_string());
        }
        update_checkpoint_in_tx(&tx, task_id, expected_revision, content)?;
        tx.execute(
            "UPDATE task_tasks SET status=?1,updated_at=?2 WHERE id=?3",
            params![compatible_task_status(&content.state), timestamp, task_id],
        )
        .map_err(|error| error.to_string())?;
        tx.commit().map_err(|error| error.to_string())?;
        self.get_checkpoint(task_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "checkpoint missing after committed transition".to_string())
    }
}

pub(super) fn update_checkpoint_in_tx(
    tx: &Transaction<'_>,
    task_id: &str,
    expected_revision: i64,
    content: &CheckpointContent,
) -> Result<(), String> {
    let encoded = encoded_content(content);
    let checksum = content_checksum(content, &encoded);
    let timestamp = now();
    let changed = tx
        .execute(
            "UPDATE task_execution_checkpoints SET schema_version=1,revision=?1,state=?2,
         plan_json=?3,progress_json=?4,tool_results_json=?5,pending_approval_json=NULLIF(?6,''),
         errors_json=?7,conversation_json=?8,next_action_json=?9,workspace_fingerprint=?10,
         preconditions_json=?11,checksum=?12,updated_at=?13,
         completed_at=CASE WHEN ?2='completed' THEN ?13 ELSE completed_at END
         WHERE task_id=?14 AND revision=?15",
            params![
                expected_revision + 1,
                content.state,
                encoded[0],
                encoded[1],
                encoded[2],
                encoded[3],
                encoded[4],
                encoded[5],
                encoded[6],
                content.workspace_fingerprint,
                encoded[7],
                checksum,
                timestamp,
                task_id,
                expected_revision
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("checkpoint revision conflict".to_string());
    }
    Ok(())
}

pub(super) fn compatible_task_status(checkpoint_state: &str) -> &str {
    match checkpoint_state {
        "completed" => "completed",
        "awaiting_approval" => "awaiting_approval",
        "needs_review" => "needs_review",
        "paused" => "paused",
        _ => "in_progress",
    }
}
