use crate::database::connection::DatabaseService;
use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) use super::checkpoint_digest::{
    bounded_json, content_checksum, digest_bytes, digest_value, encoded_content,
};
pub(crate) use super::checkpoint_types::CheckpointInspection;
pub use super::checkpoint_types::{
    ActionClaim, ApprovalSummary, CheckpointClassification, CheckpointContent, ResumeCandidate,
    TaskCheckpoint,
};

const CHECKPOINT_SCHEMA_VERSION: i64 = 1;
const STALE_AFTER_SECONDS: i64 = 7 * 24 * 60 * 60;

pub(crate) fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

impl DatabaseService {
    pub fn save_checkpoint(
        &self,
        task_id: &str,
        expected_revision: i64,
        content: &CheckpointContent,
    ) -> Result<TaskCheckpoint, String> {
        let encoded = encoded_content(content);
        let checksum = content_checksum(content, &encoded);
        let timestamp = now();
        let tx = self
            .tasks_db
            .unchecked_transaction()
            .map_err(|e| e.to_string())?;
        let next_revision = expected_revision + 1;
        let changed = if expected_revision == 0 {
            tx.execute(
                "INSERT INTO task_execution_checkpoints
                 (task_id,schema_version,revision,state,plan_json,progress_json,tool_results_json,
                  pending_approval_json,errors_json,conversation_json,next_action_json,
                  workspace_fingerprint,preconditions_json,checksum,created_at,updated_at,completed_at)
                 VALUES (?1,?2,1,?3,?4,?5,?6,NULLIF(?7,''),?8,?9,?10,?11,?12,?13,?14,?14,
                         CASE WHEN ?3='completed' THEN ?14 ELSE NULL END)",
                params![task_id, CHECKPOINT_SCHEMA_VERSION, content.state, encoded[0], encoded[1],
                    encoded[2], encoded[3], encoded[4], encoded[5], encoded[6],
                    content.workspace_fingerprint, encoded[7], checksum, timestamp],
            )
        } else {
            tx.execute(
                "UPDATE task_execution_checkpoints SET schema_version=?1,revision=?2,state=?3,
                 plan_json=?4,progress_json=?5,tool_results_json=?6,pending_approval_json=NULLIF(?7,''),
                 errors_json=?8,conversation_json=?9,next_action_json=?10,workspace_fingerprint=?11,
                 preconditions_json=?12,checksum=?13,updated_at=?14,
                 completed_at=CASE WHEN ?3='completed' THEN ?14 ELSE completed_at END
                 WHERE task_id=?15 AND revision=?16",
                params![CHECKPOINT_SCHEMA_VERSION, next_revision, content.state, encoded[0], encoded[1],
                    encoded[2], encoded[3], encoded[4], encoded[5], encoded[6],
                    content.workspace_fingerprint, encoded[7], checksum, timestamp, task_id,
                    expected_revision],
            )
        }
        .map_err(|e| e.to_string())?;
        if changed != 1 {
            return Err("checkpoint revision conflict".to_string());
        }
        tx.execute(
            "UPDATE task_tasks SET next_action=?1, blocked_reason=?2, stop_condition=?3,
             updated_at=?4 WHERE id=?5",
            params![
                encoded[6],
                if content.state == "needs_review" {
                    Some("checkpoint requires review")
                } else {
                    None
                },
                if content.state == "completed" {
                    Some("completed")
                } else {
                    None
                },
                timestamp,
                task_id
            ],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        self.get_checkpoint(task_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "checkpoint disappeared after save".to_string())
    }

    pub fn get_checkpoint(&self, task_id: &str) -> rusqlite::Result<Option<TaskCheckpoint>> {
        self.tasks_db.query_row(
            "SELECT task_id,schema_version,revision,state,plan_json,progress_json,tool_results_json,
             pending_approval_json,errors_json,conversation_json,next_action_json,
             workspace_fingerprint,preconditions_json,checksum,created_at,updated_at,completed_at
             FROM task_execution_checkpoints WHERE task_id=?1",
            params![task_id], super::checkpoint_storage::checkpoint_from_row,
        ).optional()
    }

    pub fn list_resume_candidates(&self) -> rusqlite::Result<Vec<ResumeCandidate>> {
        let mut stmt = self.tasks_db.prepare(
            "SELECT task_id FROM task_execution_checkpoints ORDER BY updated_at DESC LIMIT 100",
        )?;
        let ids = stmt
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(ids.into_iter().map(|id| {
            match self.classify_checkpoint_current(&id) {
                Ok(inspection) => {
                    let mut candidate = minimal_candidate(inspection);
                    candidate.uncertain_action_ids = self.tasks_db.prepare(
                        "SELECT action_id FROM task_action_ledger WHERE task_id=?1 AND status IN ('uncertain','failed') ORDER BY sequence",
                    ).and_then(|mut stmt| stmt.query_map(params![candidate.task_id], |row| row.get::<_, String>(0))
                        .and_then(|rows| rows.collect())).unwrap_or_default();
                    candidate
                },
                Err(_) => ResumeCandidate {
                    task_id: id,
                    revision: 0,
                    classification: CheckpointClassification::Corrupt,
                    reason: Some("checkpoint could not be decoded or validated".to_string()),
                    pending_approval: None,
                    uncertain_action_ids: Vec::new(),
                },
            }
        }).collect())
    }

    pub(crate) fn trusted_resume_evidence(&self, task_id: &str) -> Result<(String, Value), String> {
        let task = self
            .get_task_by_id(task_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "task not found".to_string())?;
        super::checkpoint_evidence::trusted_evidence(&task)
    }

    pub(crate) fn refresh_checkpoint_evidence(
        &self,
        task_id: &str,
        content: &mut CheckpointContent,
    ) -> Result<(), String> {
        let (workspace, preconditions) = self.trusted_resume_evidence(task_id)?;
        content.workspace_fingerprint = workspace;
        content.preconditions = preconditions;
        Ok(())
    }

    pub(crate) fn classify_checkpoint_current(
        &self,
        task_id: &str,
    ) -> Result<CheckpointInspection, String> {
        let (workspace, preconditions) = self.trusted_resume_evidence(task_id)?;
        self.classify_checkpoint(task_id, &workspace, &preconditions)
    }

    pub fn classify_checkpoint(
        &self,
        task_id: &str,
        workspace: &str,
        preconditions: &Value,
    ) -> Result<CheckpointInspection, String> {
        let checkpoint = self
            .get_checkpoint(task_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "checkpoint not found".to_string())?;
        if !checkpoint_is_valid(&checkpoint) {
            return Ok(candidate(
                checkpoint,
                CheckpointClassification::Corrupt,
                "checksum or schema validation failed",
            ));
        }
        let uncertain: i64 = self.tasks_db.query_row(
            "SELECT COUNT(*) FROM task_action_ledger WHERE task_id=?1 AND status IN ('running','uncertain')",
            params![task_id], |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        if uncertain > 0 || checkpoint.content.state == "needs_review" {
            return Ok(candidate(
                checkpoint,
                CheckpointClassification::NeedsReview,
                "a consequential action has an unknown outcome",
            ));
        }
        if checkpoint.content.state == "completed" {
            return Ok(candidate(
                checkpoint,
                CheckpointClassification::Completed,
                "task is complete",
            ));
        }
        if checkpoint.updated_at < now() - STALE_AFTER_SECONDS
            || (!workspace.is_empty() && checkpoint.content.workspace_fingerprint != workspace)
            || (!preconditions.is_null() && checkpoint.content.preconditions != *preconditions)
        {
            return Ok(candidate(
                checkpoint,
                CheckpointClassification::Stale,
                "workspace or preconditions changed, or checkpoint is older than seven days",
            ));
        }
        if checkpoint.content.pending_approval.is_some() {
            return Ok(candidate(
                checkpoint,
                CheckpointClassification::AwaitingApproval,
                "approval is still pending",
            ));
        }
        Ok(CheckpointInspection {
            checkpoint,
            classification: CheckpointClassification::Resumable,
            reason: None,
        })
    }

    pub fn claim_action(
        &self,
        task_id: &str,
        revision: i64,
        action_id: &str,
        fingerprint: &str,
        kind: &str,
        consequential: bool,
    ) -> Result<ActionClaim, String> {
        let existing = self
            .tasks_db
            .query_row(
                "SELECT action_id,fingerprint,status,result_json,consequential,action_kind
             FROM task_action_ledger
             WHERE action_id=?1 OR (task_id=?2 AND fingerprint=?3)
             ORDER BY CASE WHEN action_id=?1 THEN 0 ELSE 1 END LIMIT 1",
                params![action_id, task_id, fingerprint],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, i64>(4)?,
                        row.get::<_, String>(5)?,
                    ))
                },
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if let Some((
            _stored_id,
            stored_fingerprint,
            status,
            result,
            stored_consequential,
            stored_kind,
        )) = existing
        {
            if stored_fingerprint != fingerprint
                || stored_consequential != i64::from(consequential)
                || stored_kind != kind
            {
                return Err("action id fingerprint conflict".to_string());
            }
            if status == "retryable" && !consequential {
                let changed = self.tasks_db.execute(
                    "UPDATE task_action_ledger SET status='running',started_at=?1,finished_at=NULL
                     WHERE action_id=?2 AND fingerprint=?3 AND status='retryable'",
                    params![now(), _stored_id, fingerprint],
                ).map_err(|e| e.to_string())?;
                return if changed == 1 {
                    Ok(ActionClaim::Started)
                } else {
                    Ok(ActionClaim::Running)
                };
            }
            return Ok(match status.as_str() {
                "completed" => ActionClaim::Completed(result.unwrap_or_else(|| "null".to_string())),
                "uncertain" => ActionClaim::Uncertain,
                _ if consequential => ActionClaim::Uncertain,
                _ => ActionClaim::Running,
            });
        }
        let sequence: i64 = self
            .tasks_db
            .query_row(
                "SELECT COALESCE(MAX(sequence),0)+1 FROM task_action_ledger WHERE task_id=?1",
                params![task_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        self.tasks_db.execute(
            "INSERT INTO task_action_ledger(action_id,task_id,checkpoint_revision,sequence,fingerprint,
             action_kind,consequential,status,started_at) VALUES (?1,?2,?3,?4,?5,?6,?7,'running',?8)",
            params![action_id, task_id, revision, sequence, fingerprint, kind, consequential, now()],
        ).map_err(|e| e.to_string())?;
        Ok(ActionClaim::Started)
    }

    pub fn complete_action(
        &self,
        action_id: &str,
        fingerprint: &str,
        result: &Value,
    ) -> Result<(), String> {
        let stored = bounded_json(result);
        let changed = self
            .tasks_db
            .execute(
                "UPDATE task_action_ledger SET status='completed',result_json=?1,finished_at=?2
             WHERE action_id=?3 AND fingerprint=?4 AND status='running'",
                params![stored, now(), action_id, fingerprint],
            )
            .map_err(|e| e.to_string())?;
        if changed == 1 {
            Ok(())
        } else {
            Err("action completion conflict".to_string())
        }
    }

    pub(crate) fn bind_action_continuation(
        &self,
        action_id: &str,
        fingerprint: &str,
        reference: &str,
    ) -> Result<(), String> {
        let changed = self
            .tasks_db
            .execute(
                "UPDATE task_action_ledger SET continuation_ref=?1,continuation_retire_pending=0
             WHERE action_id=?2 AND fingerprint=?3 AND status='running'",
                params![reference, action_id, fingerprint],
            )
            .map_err(|error| error.to_string())?;
        if changed == 1 {
            Ok(())
        } else {
            Err("continuation binding conflict".to_string())
        }
    }

    pub fn fail_action(
        &self,
        action_id: &str,
        fingerprint: &str,
        error: &str,
    ) -> Result<(), String> {
        let summary = bounded_json(&json!({
            "error_kind": error.chars().take(64).collect::<String>(),
            "error_chars": error.chars().count(),
            "error_digest": digest_bytes(error.as_bytes()),
        }));
        let changed = self.tasks_db.execute(
            "UPDATE task_action_ledger SET status=CASE WHEN consequential=1 THEN 'uncertain' ELSE 'failed' END,
             error_summary=?1,finished_at=?2
             WHERE action_id=?3 AND fingerprint=?4 AND status='running'",
            params![summary, now(), action_id, fingerprint],
        ).map_err(|e| e.to_string())?;
        if changed == 1 {
            Ok(())
        } else {
            Err("action failure conflict".to_string())
        }
    }

    pub fn mark_interrupted_actions(&self) -> rusqlite::Result<usize> {
        self.tasks_db.execute(
            "UPDATE task_action_ledger
             SET status=CASE WHEN consequential=1 THEN 'uncertain' ELSE 'retryable' END,finished_at=?1
             WHERE status='running'",
            params![now()],
        )
    }
}

fn candidate(
    checkpoint: TaskCheckpoint,
    classification: CheckpointClassification,
    reason: &str,
) -> CheckpointInspection {
    CheckpointInspection {
        checkpoint,
        classification,
        reason: Some(reason.to_string()),
    }
}

fn minimal_candidate(inspection: CheckpointInspection) -> ResumeCandidate {
    let pending_approval = inspection
        .checkpoint
        .content
        .pending_approval
        .as_ref()
        .and_then(|value| {
            Some(ApprovalSummary {
                action_fingerprint: value.get("action_fingerprint")?.as_str()?.to_string(),
                approval_digest: value.get("approval_digest")?.as_str()?.to_string(),
            })
        });
    let uncertain_action_ids = Vec::new();
    ResumeCandidate {
        task_id: inspection.checkpoint.task_id,
        revision: inspection.checkpoint.revision,
        classification: inspection.classification,
        reason: inspection.reason,
        pending_approval,
        uncertain_action_ids,
    }
}

fn checkpoint_is_valid(checkpoint: &TaskCheckpoint) -> bool {
    if checkpoint.schema_version != CHECKPOINT_SCHEMA_VERSION {
        return false;
    }
    let encoded = encoded_content(&checkpoint.content);
    content_checksum(&checkpoint.content, &encoded) == checkpoint.checksum
}
