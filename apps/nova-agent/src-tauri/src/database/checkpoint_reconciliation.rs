use super::checkpoint_transition::update_checkpoint_in_tx;
use super::checkpoints::{bounded_json, content_checksum, digest_value, encoded_content, now};
use super::connection::DatabaseService;
use rusqlite::{params, OptionalExtension, Transaction};
use serde_json::{json, Value};

impl DatabaseService {
    pub(crate) fn is_effect_approved(
        &self,
        task_id: &str,
        plan: &Value,
        effect_fingerprint: &str,
    ) -> bool {
        let task = self.get_task_by_id(task_id).ok().flatten();
        let metadata: Option<Value> = task.and_then(|task| {
            task.metadata
                .as_deref()
                .and_then(|raw| serde_json::from_str(raw).ok())
        });
        let approved = metadata
            .as_ref()
            .and_then(|value| value.get("approved_effect_digests"))
            .and_then(Value::as_array);
        let current = self.effect_approval_digest(task_id, plan, effect_fingerprint);
        current.as_ref().is_ok_and(|digest| {
            approved.is_some_and(|values| values.iter().any(|value| value.as_str() == Some(digest)))
        })
    }

    pub(crate) fn effect_approval_digest(
        &self,
        task_id: &str,
        plan: &Value,
        effect_fingerprint: &str,
    ) -> Result<String, String> {
        let (workspace, evidence) = self.trusted_resume_evidence(task_id)?;
        Ok(digest_value(&json!({
            "plan": plan,
            "effect": effect_fingerprint,
            "workspace": workspace,
            "evidence": evidence,
        })))
    }

    pub fn decide_approval(
        &self,
        task_id: &str,
        revision: i64,
        action_fingerprint: &str,
        approved: bool,
    ) -> Result<(), String> {
        let checkpoint = self
            .get_checkpoint(task_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "checkpoint not found".to_string())?;
        if checkpoint.revision != revision {
            return Err("approval checkpoint revision is stale".to_string());
        }
        let approval = checkpoint
            .content
            .pending_approval
            .as_ref()
            .ok_or_else(|| "checkpoint has no pending approval".to_string())?;
        if approval.get("action_fingerprint").and_then(Value::as_str) != Some(action_fingerprint) {
            return Err("approval action fingerprint mismatch".to_string());
        }
        let approval_digest = approval
            .get("approval_digest")
            .and_then(Value::as_str)
            .ok_or_else(|| "approval digest is missing".to_string())?;
        let action_kind = approval
            .get("action_kind")
            .and_then(Value::as_str)
            .unwrap_or("task_execution");
        let mut content = checkpoint.content.clone();
        content.pending_approval = None;
        content.state = if approved { "paused" } else { "completed" }.to_string();
        if !approved {
            content.next_action = json!({"kind":"none"});
        }
        let encoded = encoded_content(&content);
        let checksum = content_checksum(&content, &encoded);
        let tx = self
            .tasks_db
            .unchecked_transaction()
            .map_err(|e| e.to_string())?;
        update_approval_metadata(&tx, task_id, approved, approval_digest, action_kind)?;
        let changed = tx
            .execute(
                "UPDATE task_execution_checkpoints SET pending_approval_json=NULL,state=?1,
             next_action_json=?2,checksum=?3,revision=revision+1,updated_at=?4,
             completed_at=CASE WHEN ?1='completed' THEN ?4 ELSE completed_at END
             WHERE task_id=?5 AND revision=?6",
                params![
                    content.state,
                    encoded[6],
                    checksum,
                    now(),
                    task_id,
                    revision
                ],
            )
            .map_err(|e| e.to_string())?;
        if changed != 1 {
            return Err("approval checkpoint revision conflict".to_string());
        }
        tx.commit().map_err(|e| e.to_string())
    }

    pub fn start_task_over(&self, task_id: &str) -> Result<(), String> {
        if self
            .get_checkpoint(task_id)
            .map_err(|error| error.to_string())?
            .is_some_and(|checkpoint| checkpoint.content.state == "completed")
        {
            return Err("completed checkpoints cannot be started over".to_string());
        }
        let tx = self
            .tasks_db
            .unchecked_transaction()
            .map_err(|e| e.to_string())?;
        let raw: Option<String> = tx
            .query_row(
                "SELECT metadata FROM task_tasks WHERE id=?1",
                params![task_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .flatten();
        let mut metadata: Value = raw
            .as_deref()
            .and_then(|text| serde_json::from_str(text).ok())
            .unwrap_or_else(|| json!({}));
        let object = metadata
            .as_object_mut()
            .ok_or_else(|| "task metadata is not an object".to_string())?;
        object.insert("approved_for_execution".to_string(), json!(false));
        object.remove("approved_plan_digest");
        object.remove("approved_effect_digests");
        object.remove("approval_decided_at");
        tx.execute(
            "DELETE FROM task_execution_checkpoints WHERE task_id=?1",
            params![task_id],
        )
        .map_err(|e| e.to_string())?;
        tx.execute(
            "UPDATE task_tasks SET status='pending',metadata=?1,next_action=NULL,blocked_reason=NULL,
             stop_condition=NULL,updated_at=?2 WHERE id=?3",
            params![metadata.to_string(), now(), task_id],
        ).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    }

    pub fn reconcile_action(
        &self,
        task_id: &str,
        action_id: &str,
        decision: &str,
        evidence: Option<&str>,
    ) -> Result<(), String> {
        self.reconcile_action_inner(task_id, action_id, decision, evidence, false)
    }

    #[cfg(test)]
    pub(crate) fn reconcile_action_with_failure(
        &self,
        task_id: &str,
        action_id: &str,
        decision: &str,
        evidence: Option<&str>,
    ) -> Result<(), String> {
        self.reconcile_action_inner(task_id, action_id, decision, evidence, true)
    }

    fn reconcile_action_inner(
        &self,
        task_id: &str,
        action_id: &str,
        decision: &str,
        evidence: Option<&str>,
        inject_failure: bool,
    ) -> Result<(), String> {
        let (fingerprint, status): (String, String) = self.tasks_db.query_row(
            "SELECT fingerprint,status FROM task_action_ledger WHERE task_id=?1 AND action_id=?2",
            params![task_id, action_id], |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;
        if status != "uncertain" && status != "failed" {
            return Err("action is not eligible for reconciliation".to_string());
        }
        let mut checkpoint = self
            .get_checkpoint(task_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "checkpoint not found".to_string())?;
        self.refresh_checkpoint_evidence(task_id, &mut checkpoint.content)?;
        let transition = prepare_reconciliation(
            self,
            task_id,
            action_id,
            &fingerprint,
            decision,
            evidence,
            checkpoint.revision,
            &mut checkpoint.content,
        )?;
        let tx = self
            .tasks_db
            .unchecked_transaction()
            .map_err(|e| e.to_string())?;
        let changed = tx.execute(
            "UPDATE task_action_ledger SET status=?1,result_json=COALESCE(?2,result_json),finished_at=?3
             WHERE task_id=?4 AND action_id=?5 AND status IN ('uncertain','failed')",
            params![transition.ledger_status, transition.result_json, now(), task_id, action_id],
        ).map_err(|e| e.to_string())?;
        if changed != 1 {
            return Err("reconciliation ledger conflict".to_string());
        }
        if inject_failure {
            return Err("injected reconciliation transition failure".to_string());
        }
        update_checkpoint_in_tx(&tx, task_id, checkpoint.revision, &checkpoint.content)?;
        tx.execute(
            "UPDATE task_tasks SET status=?1,updated_at=?2 WHERE id=?3",
            params![transition.task_status, now(), task_id],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    }
}

fn update_approval_metadata(
    tx: &Transaction<'_>,
    task_id: &str,
    approved: bool,
    approval_digest: &str,
    action_kind: &str,
) -> Result<(), String> {
    let raw: Option<String> = tx
        .query_row(
            "SELECT metadata FROM task_tasks WHERE id=?1",
            params![task_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();
    let mut metadata: Value = raw
        .as_deref()
        .and_then(|value| serde_json::from_str(value).ok())
        .unwrap_or_else(|| json!({}));
    let object = metadata
        .as_object_mut()
        .ok_or_else(|| "task metadata is not an object".to_string())?;
    object.insert("approval_decided_at".to_string(), json!(now()));
    if action_kind == "task_execution" {
        object.insert("approved_for_execution".to_string(), json!(approved));
        if approved {
            object.insert("approved_plan_digest".to_string(), json!(approval_digest));
        } else {
            object.remove("approved_plan_digest");
        }
    } else if approved {
        let bindings = object
            .entry("approved_effect_digests".to_string())
            .or_insert_with(|| json!([]));
        let bindings = bindings
            .as_array_mut()
            .ok_or_else(|| "effect approval bindings are corrupt".to_string())?;
        if !bindings
            .iter()
            .any(|value| value.as_str() == Some(approval_digest))
        {
            bindings.push(json!(approval_digest));
        }
    }
    tx.execute(
        "UPDATE task_tasks SET metadata=?1,status=?2,blocked_reason=NULL,updated_at=?3 WHERE id=?4",
        params![
            metadata.to_string(),
            if approved { "paused" } else { "rejected" },
            now(),
            task_id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

struct ReconciliationTransition {
    ledger_status: &'static str,
    task_status: &'static str,
    result_json: Option<String>,
}

#[allow(clippy::too_many_arguments)]
fn prepare_reconciliation(
    service: &DatabaseService,
    task_id: &str,
    action_id: &str,
    fingerprint: &str,
    decision: &str,
    evidence: Option<&str>,
    revision: i64,
    content: &mut super::checkpoints::CheckpointContent,
) -> Result<ReconciliationTransition, String> {
    match decision {
        "confirm_completed" => {
            let evidence = evidence
                .filter(|v| !v.trim().is_empty())
                .ok_or_else(|| "completion evidence is required".to_string())?;
            content.state = "paused".into();
            content.pending_approval = None;
            content.next_action = json!({"kind":"resume_after_reconciliation"});
            Ok(ReconciliationTransition {
                ledger_status: "completed",
                task_status: "paused",
                result_json: Some(bounded_json(
                    &json!({"confirmed":true,"evidence_digest":digest_value(&json!(evidence))}),
                )),
            })
        }
        "retry" => {
            let secure_ref = content
                .next_action
                .get("secure_ref")
                .and_then(Value::as_str)
                .ok_or_else(|| {
                    "secure retry continuation unavailable; fresh re-plan required".to_string()
                })?
                .to_string();
            let retry_id = format!("{action_id}:retry:{}", revision + 1);
            let retry_fp = digest_value(&json!({"previous":fingerprint,"retry":retry_id}));
            let approval = service.effect_approval_digest(task_id, &content.plan, &retry_fp)?;
            content.state = "awaiting_approval".into();
            content.pending_approval = Some(
                json!({"action_fingerprint":retry_fp,"approval_digest":approval,"action_kind":"explicit_retry"}),
            );
            content.next_action = json!({"kind":"retry_action","previous_fingerprint":fingerprint,"action_id":retry_id,"fingerprint":retry_fp,"secure_ref":secure_ref});
            Ok(ReconciliationTransition {
                ledger_status: "retry_authorized",
                task_status: "awaiting_approval",
                result_json: None,
            })
        }
        "abandon" => {
            content.state = "completed".into();
            content.pending_approval = None;
            content.next_action = json!({"kind":"none","outcome":"abandoned"});
            Ok(ReconciliationTransition {
                ledger_status: "abandoned",
                task_status: "abandoned",
                result_json: None,
            })
        }
        _ => Err("unknown reconciliation decision".to_string()),
    }
}
