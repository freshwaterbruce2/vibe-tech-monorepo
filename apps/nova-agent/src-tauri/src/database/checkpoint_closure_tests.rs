use super::checkpoints::{ActionClaim, CheckpointContent};
use super::{CheckpointClassification, DatabaseService};
use serde_json::{json, Value};
use std::path::Path;
use tempfile::tempdir;

fn service_at(path: &Path) -> DatabaseService {
    let service = DatabaseService::new(path.to_path_buf()).unwrap();
    service.create_task_table().unwrap();
    service
}

fn content(service: &DatabaseService, task_id: &str) -> CheckpointContent {
    let (workspace, preconditions) = service.trusted_resume_evidence(task_id).unwrap();
    CheckpointContent {
        state: "paused".into(),
        plan: json!(["step"]),
        progress: json!({"completed":[]}),
        tool_results: json!([]),
        pending_approval: None,
        errors: json!([]),
        conversation: json!([]),
        next_action: json!({"kind":"reconcile_action","secure_ref":"continuation:v1:test"}),
        workspace_fingerprint: workspace,
        preconditions,
    }
}

fn uncertain(service: &DatabaseService, task_id: &str) -> String {
    service.log_task(task_id, task_id, "in_progress").unwrap();
    let checkpoint = service
        .save_checkpoint(task_id, 0, &content(service, task_id))
        .unwrap();
    let action = format!("{task_id}:write");
    service
        .claim_action(
            task_id,
            checkpoint.revision,
            &action,
            task_id,
            "write_file",
            true,
        )
        .unwrap();
    service.mark_interrupted_actions().unwrap();
    action
}

#[test]
fn every_reconciliation_decision_rolls_back_ledger_checkpoint_and_task_together() {
    let dir = tempdir().unwrap();
    let service = service_at(dir.path());
    for (decision, evidence) in [
        ("confirm_completed", Some("ticket")),
        ("retry", None),
        ("abandon", None),
    ] {
        let task_id = format!("rollback-{decision}");
        let action = uncertain(&service, &task_id);
        let before = service.get_checkpoint(&task_id).unwrap().unwrap();
        assert!(service
            .reconcile_action_with_failure(&task_id, &action, decision, evidence)
            .is_err());
        let ledger: String = service
            .tasks_db
            .query_row(
                "SELECT status FROM task_action_ledger WHERE action_id=?1",
                [&action],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(ledger, "uncertain");
        assert_eq!(
            service.get_checkpoint(&task_id).unwrap().unwrap().revision,
            before.revision
        );
        assert_eq!(
            service.get_task_by_id(&task_id).unwrap().unwrap().status,
            "in_progress"
        );
        service
            .reconcile_action(&task_id, &action, decision, evidence)
            .unwrap();
        assert_eq!(
            service.get_checkpoint(&task_id).unwrap().unwrap().revision,
            before.revision + 1
        );
    }
}

#[test]
fn task_plan_and_effect_approvals_survive_restart_as_distinct_bindings() {
    let dir = tempdir().unwrap();
    let plan = json!(["approved-plan"]);
    let plan_binding;
    let effect_binding;
    {
        let service = service_at(dir.path());
        service
            .log_task("approvals", "Approvals", "in_progress")
            .unwrap();
        let mut checkpoint = content(&service, "approvals");
        checkpoint.plan = plan.clone();
        plan_binding = service
            .effect_approval_digest("approvals", &plan, "task-effect")
            .unwrap();
        checkpoint.state = "awaiting_approval".into();
        checkpoint.pending_approval = Some(json!({
            "action_fingerprint":"task-effect",
            "approval_digest":plan_binding.clone(),
            "action_kind":"task_execution"
        }));
        let saved = service
            .save_checkpoint("approvals", 0, &checkpoint)
            .unwrap();
        service
            .decide_approval("approvals", saved.revision, "task-effect", true)
            .unwrap();
        let mut effect_checkpoint = service.get_checkpoint("approvals").unwrap().unwrap();
        effect_binding = service
            .effect_approval_digest("approvals", &plan, "write-effect")
            .unwrap();
        effect_checkpoint.content.state = "awaiting_approval".into();
        effect_checkpoint.content.pending_approval = Some(json!({
            "action_fingerprint":"write-effect",
            "approval_digest":effect_binding.clone(),
            "action_kind":"write_file"
        }));
        let pending = service
            .save_checkpoint(
                "approvals",
                effect_checkpoint.revision,
                &effect_checkpoint.content,
            )
            .unwrap();
        service
            .decide_approval("approvals", pending.revision, "write-effect", true)
            .unwrap();
    }
    let reopened = service_at(dir.path());
    let task = reopened.get_task_by_id("approvals").unwrap().unwrap();
    let metadata: Value = serde_json::from_str(task.metadata.as_deref().unwrap()).unwrap();
    assert_eq!(metadata["approved_plan_digest"], plan_binding);
    assert!(metadata["approved_effect_digests"]
        .as_array()
        .unwrap()
        .contains(&json!(effect_binding)));
    assert!(reopened.is_effect_approved("approvals", &plan, "write-effect"));
}

#[test]
fn approved_retry_is_resumable_and_claims_a_new_ledger_action() {
    let dir = tempdir().unwrap();
    let service = service_at(dir.path());
    let action = uncertain(&service, "retry-resume");
    service
        .reconcile_action("retry-resume", &action, "retry", None)
        .unwrap();
    let pending = service.get_checkpoint("retry-resume").unwrap().unwrap();
    let retry_fp = pending.content.next_action["fingerprint"]
        .as_str()
        .unwrap()
        .to_string();
    let retry_id = pending.content.next_action["action_id"]
        .as_str()
        .unwrap()
        .to_string();
    service
        .decide_approval("retry-resume", pending.revision, &retry_fp, true)
        .unwrap();
    drop(service);
    let reopened = service_at(dir.path());
    assert_eq!(
        reopened
            .classify_checkpoint_current("retry-resume")
            .unwrap()
            .classification,
        CheckpointClassification::Resumable
    );
    let revision = reopened
        .get_checkpoint("retry-resume")
        .unwrap()
        .unwrap()
        .revision;
    assert_eq!(
        reopened
            .claim_action(
                "retry-resume",
                revision,
                &retry_id,
                &retry_fp,
                "write_file",
                true,
            )
            .unwrap(),
        ActionClaim::Started
    );
}

#[test]
fn interrupted_read_only_action_is_retryable_after_restart_without_duplicate_row() {
    let dir = tempdir().unwrap();
    {
        let service = service_at(dir.path());
        service
            .log_task("read-restart", "Read", "in_progress")
            .unwrap();
        let checkpoint = service
            .save_checkpoint("read-restart", 0, &content(&service, "read-restart"))
            .unwrap();
        service
            .claim_action(
                "read-restart",
                checkpoint.revision,
                "read-1",
                "read-fp",
                "read_file",
                false,
            )
            .unwrap();
    }
    let reopened = service_at(dir.path());
    reopened.mark_interrupted_actions().unwrap();
    assert_eq!(
        reopened
            .classify_checkpoint_current("read-restart")
            .unwrap()
            .classification,
        CheckpointClassification::Resumable
    );
    assert_eq!(
        reopened
            .claim_action("read-restart", 1, "read-1", "read-fp", "read_file", false)
            .unwrap(),
        ActionClaim::Started
    );
    let count: i64 = reopened
        .tasks_db
        .query_row(
            "SELECT COUNT(*) FROM task_action_ledger WHERE task_id='read-restart'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn completed_checkpoint_cannot_be_started_over() {
    let dir = tempdir().unwrap();
    let service = service_at(dir.path());
    service.log_task("done", "Done", "completed").unwrap();
    let mut checkpoint = content(&service, "done");
    checkpoint.state = "completed".into();
    service.save_checkpoint("done", 0, &checkpoint).unwrap();
    assert!(service.start_task_over("done").is_err());
    assert!(service.get_checkpoint("done").unwrap().is_some());
}
