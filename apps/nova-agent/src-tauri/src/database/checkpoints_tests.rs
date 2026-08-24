use super::checkpoints::{ActionClaim, CheckpointContent};
use super::{CheckpointClassification, DatabaseService};
use serde_json::json;
use std::path::Path;
use std::sync::{Arc, Barrier};
use tempfile::tempdir;

fn service_at(path: &Path) -> DatabaseService {
    DatabaseService::new(path.to_path_buf()).unwrap()
}

fn service() -> DatabaseService {
    let dir = tempdir().unwrap().keep();
    let service = DatabaseService::new(dir).unwrap();
    service.create_task_table().unwrap();
    service
        .log_task("task-1", "Resume me", "in_progress")
        .unwrap();
    service
}

fn content() -> CheckpointContent {
    CheckpointContent {
        state: "paused".into(),
        plan: json!(["one", "two"]),
        progress: json!({"completed": ["one"]}),
        tool_results: json!({"token": "secret", "large": "x".repeat(3000)}),
        pending_approval: None,
        errors: json!([]),
        conversation: json!([]),
        next_action: json!({"kind":"step","index":2}),
        workspace_fingerprint: "workspace-a".into(),
        preconditions: json!({"head":"abc"}),
    }
}

#[test]
fn migration_is_fresh_old_and_idempotent() {
    let dir = tempdir().unwrap();
    let service = service_at(dir.path());
    service
        .tasks_db
        .execute_batch(
            "CREATE TABLE task_tasks (
                id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'normal',due_at INTEGER,app_source TEXT NOT NULL,
                created_at INTEGER NOT NULL,updated_at INTEGER,metadata TEXT
             );",
        )
        .unwrap();
    service.create_task_table().unwrap();
    service.create_checkpoint_tables().unwrap();
    let columns: i64 = service.tasks_db.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('task_tasks') WHERE name IN ('next_action','blocked_reason','stop_condition')",
        [], |row| row.get(0)).unwrap();
    assert_eq!(columns, 3);
}

#[test]
fn checkpoint_survives_close_and_reopen() {
    let dir = tempdir().unwrap();
    {
        let service = service_at(dir.path());
        service.create_task_table().unwrap();
        service
            .log_task("restart", "Restart", "in_progress")
            .unwrap();
        service.save_checkpoint("restart", 0, &content()).unwrap();
    }
    let reopened = service_at(dir.path());
    reopened.create_task_table().unwrap();
    let checkpoint = reopened.get_checkpoint("restart").unwrap().unwrap();
    assert_eq!(checkpoint.revision, 1);
    assert_eq!(checkpoint.content.next_action["kind"], "step");
}

#[test]
fn malformed_checkpoint_is_returned_as_minimal_corrupt_candidate() {
    let service = service();
    service.save_checkpoint("task-1", 0, &content()).unwrap();
    service
        .tasks_db
        .execute(
            "UPDATE task_execution_checkpoints SET plan_json='{broken' WHERE task_id='task-1'",
            [],
        )
        .unwrap();
    let candidate = service
        .list_resume_candidates()
        .unwrap()
        .into_iter()
        .find(|candidate| candidate.task_id == "task-1")
        .unwrap();
    assert_eq!(candidate.classification, CheckpointClassification::Corrupt);
    assert_eq!(candidate.revision, 0);
    assert!(candidate.pending_approval.is_none());
}

fn approval_content(
    plan: serde_json::Value,
    effect: &str,
    approval_digest: String,
) -> CheckpointContent {
    CheckpointContent {
        state: "awaiting_approval".into(),
        plan,
        pending_approval: Some(json!({
            "action_fingerprint": effect,
            "approval_digest": approval_digest,
            "action_kind": "write_file",
        })),
        ..content()
    }
}

#[test]
fn reset_clears_all_approval_bindings_and_requires_fresh_approval() {
    let service = service();
    service.tasks_db.execute(
        "UPDATE task_tasks SET metadata=?1 WHERE id='task-1'",
        [json!({"approved_for_execution":true,"approved_plan_digest":"old","approval_decided_at":1}).to_string()],
    ).unwrap();
    let pending = approval_content(json!(["safe-plan"]), "effect-a", "old".into());
    service.save_checkpoint("task-1", 0, &pending).unwrap();
    service.start_task_over("task-1").unwrap();
    let task = service.get_task_by_id("task-1").unwrap().unwrap();
    let metadata: serde_json::Value =
        serde_json::from_str(task.metadata.as_deref().unwrap()).unwrap();
    assert_eq!(metadata["approved_for_execution"], false);
    assert!(metadata.get("approved_plan_digest").is_none());
    assert!(metadata.get("approval_decided_at").is_none());
    assert_eq!(metadata["execution_generation"], 1);
    assert!(service.get_checkpoint("task-1").unwrap().is_none());
    assert_eq!(task.status, "pending");
}

#[test]
fn changed_plan_or_effect_invalidates_prior_approval() {
    let service = service();
    let plan = json!(["one"]);
    let approval_digest = service
        .effect_approval_digest("task-1", &plan, "effect-a")
        .unwrap();
    let pending = approval_content(plan.clone(), "effect-a", approval_digest);
    service.save_checkpoint("task-1", 0, &pending).unwrap();
    service
        .decide_approval("task-1", 1, "effect-a", true)
        .unwrap();
    assert!(service.is_effect_approved("task-1", &plan, "effect-a"));
    assert!(!service.is_effect_approved("task-1", &json!(["one", "changed"]), "effect-a"));
    assert!(!service.is_effect_approved("task-1", &plan, "effect-b"));
}

#[test]
fn source_or_task_input_change_invalidates_checkpoint_and_approval() {
    let dir = tempdir().unwrap();
    let project = dir.path().join("project");
    std::fs::create_dir(&project).unwrap();
    let source = project.join("input.txt");
    std::fs::write(&source, "first").unwrap();
    let service = service_at(dir.path());
    service.create_task_table().unwrap();
    service.log_task("inputs", "Inputs", "in_progress").unwrap();
    service
        .tasks_db
        .execute(
            "UPDATE task_tasks SET metadata=?1 WHERE id='inputs'",
            [json!({"project_path":project,"description":"first","risk":"high","priority":"urgent","model":"model-a","provider":"provider-a","max_duration_minutes":12,"execution_instructions":"do it"}).to_string()],
        )
        .unwrap();
    let (workspace, preconditions) = service.trusted_resume_evidence("inputs").unwrap();
    let mut checkpoint = content();
    checkpoint.workspace_fingerprint = workspace;
    checkpoint.preconditions = preconditions;
    service.save_checkpoint("inputs", 0, &checkpoint).unwrap();
    std::fs::write(&source, "second").unwrap();
    assert_eq!(
        service
            .classify_checkpoint_current("inputs")
            .unwrap()
            .classification,
        CheckpointClassification::Stale
    );
}

#[test]
fn successful_source_change_refreshes_checkpoint_and_survives_restart() {
    let dir = tempdir().unwrap();
    let project = dir.path().join("project");
    std::fs::create_dir(&project).unwrap();
    let source = project.join("step.txt");
    std::fs::write(&source, "before").unwrap();
    {
        let service = service_at(dir.path());
        service.create_task_table().unwrap();
        service
            .log_task("multi-step", "Multi", "in_progress")
            .unwrap();
        service
            .tasks_db
            .execute(
                "UPDATE task_tasks SET metadata=?1 WHERE id='multi-step'",
                [json!({"project_path":project,"description":"change source"}).to_string()],
            )
            .unwrap();
        let (workspace, preconditions) = service.trusted_resume_evidence("multi-step").unwrap();
        let mut checkpoint = content();
        checkpoint.workspace_fingerprint = workspace;
        checkpoint.preconditions = preconditions;
        let saved = service
            .save_checkpoint("multi-step", 0, &checkpoint)
            .unwrap();
        service
            .claim_action(
                "multi-step",
                saved.revision,
                "write-1",
                "fp-1",
                "write_file",
                true,
            )
            .unwrap();
        std::fs::write(&source, "after").unwrap();
        service
            .refresh_checkpoint_evidence("multi-step", &mut checkpoint)
            .unwrap();
        service
            .complete_action("write-1", "fp-1", &json!({"ok":true}))
            .unwrap();
        service
            .save_checkpoint("multi-step", saved.revision, &checkpoint)
            .unwrap();
    }
    let reopened = service_at(dir.path());
    reopened.create_task_table().unwrap();
    assert_eq!(
        reopened
            .classify_checkpoint_current("multi-step")
            .unwrap()
            .classification,
        CheckpointClassification::Resumable
    );
}

#[test]
fn action_and_checkpoint_transition_rolls_back_together_or_commits_together() {
    let service = service();
    let original = service.save_checkpoint("task-1", 0, &content()).unwrap();
    service
        .claim_action(
            "task-1",
            original.revision,
            "atomic-1",
            "fp-atomic",
            "write_file",
            true,
        )
        .unwrap();
    let mut refreshed = original.content.clone();
    refreshed.progress = json!({"completed":["source_change"]});
    assert!(service
        .complete_action_and_checkpoint_with_failure(
            "task-1",
            original.revision,
            "atomic-1",
            "fp-atomic",
            &json!({"ok":true}),
            &refreshed,
        )
        .is_err());
    let status: String = service
        .tasks_db
        .query_row(
            "SELECT status FROM task_action_ledger WHERE action_id='atomic-1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "running");
    assert_eq!(
        service.get_checkpoint("task-1").unwrap().unwrap().revision,
        original.revision
    );
    let committed = service
        .complete_action_and_checkpoint(
            "task-1",
            original.revision,
            "atomic-1",
            "fp-atomic",
            &json!({"ok":true}),
            &refreshed,
        )
        .unwrap();
    assert_eq!(committed.revision, original.revision + 1);
    let status: String = service
        .tasks_db
        .query_row(
            "SELECT status FROM task_action_ledger WHERE action_id='atomic-1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(status, "completed");
}

#[test]
fn independently_computed_review_drift_is_stale() {
    let dir = tempdir().unwrap();
    let project = dir.path().join("project");
    std::fs::create_dir(&project).unwrap();
    let review = dir.path().join("review.json");
    std::fs::write(&review, "version-one").unwrap();
    let service = service_at(dir.path());
    service.create_task_table().unwrap();
    service.log_task("drift", "Drift", "in_progress").unwrap();
    service
        .tasks_db
        .execute(
            "UPDATE task_tasks SET metadata=?1 WHERE id='drift'",
            [
                json!({"project_path":project,"review_artifact_path":review,"review_version":"v1"})
                    .to_string(),
            ],
        )
        .unwrap();
    let (workspace, preconditions) = service.trusted_resume_evidence("drift").unwrap();
    let mut checkpoint = content();
    checkpoint.workspace_fingerprint = workspace;
    checkpoint.preconditions = preconditions;
    service.save_checkpoint("drift", 0, &checkpoint).unwrap();
    std::fs::write(&review, "version-two").unwrap();
    let classified = service.classify_checkpoint_current("drift").unwrap();
    assert_eq!(classified.classification, CheckpointClassification::Stale);
}

#[test]
fn concurrent_exact_claims_create_one_ledger_action() {
    let dir = tempdir().unwrap();
    let setup = service_at(dir.path());
    setup.create_task_table().unwrap();
    setup.log_task("race", "Race", "in_progress").unwrap();
    setup.save_checkpoint("race", 0, &content()).unwrap();
    drop(setup);
    let barrier = Arc::new(Barrier::new(2));
    let handles: Vec<_> = (0..2)
        .map(|_| {
            let path = dir.path().to_path_buf();
            let barrier = Arc::clone(&barrier);
            std::thread::spawn(move || {
                let service = service_at(&path);
                barrier.wait();
                service.claim_action("race", 1, "race:read", "same", "read", false)
            })
        })
        .collect();
    let results: Vec<_> = handles
        .into_iter()
        .map(|handle| handle.join().unwrap())
        .collect();
    assert_eq!(
        results
            .iter()
            .filter(|result| matches!(result, Ok(ActionClaim::Started)))
            .count(),
        1
    );
    let verify = service_at(dir.path());
    let count: i64 = verify
        .tasks_db
        .query_row(
            "SELECT COUNT(*) FROM task_action_ledger WHERE task_id='race'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}

fn uncertain_task(service: &DatabaseService, task_id: &str) -> String {
    service.log_task(task_id, task_id, "in_progress").unwrap();
    let mut checkpoint = content();
    checkpoint.next_action =
        json!({"kind":"reconcile_action","secure_ref":"task_continuation_test"});
    service.save_checkpoint(task_id, 0, &checkpoint).unwrap();
    let action_id = format!("{task_id}:write");
    service
        .claim_action(task_id, 1, &action_id, task_id, "write", true)
        .unwrap();
    service.mark_interrupted_actions().unwrap();
    action_id
}

#[test]
fn reconciliation_confirm_retry_and_abandon_retain_audit_rows() {
    let service = service();
    let confirmed = uncertain_task(&service, "confirmed");
    service
        .reconcile_action(
            "confirmed",
            &confirmed,
            "confirm_completed",
            Some("ticket-42"),
        )
        .unwrap();
    let retried = uncertain_task(&service, "retried");
    service
        .reconcile_action("retried", &retried, "retry", None)
        .unwrap();
    let retry_checkpoint = service.get_checkpoint("retried").unwrap().unwrap();
    assert!(retry_checkpoint.content.pending_approval.is_some());
    assert_eq!(retry_checkpoint.content.next_action["kind"], "retry_action");
    let abandoned = uncertain_task(&service, "abandoned");
    service
        .reconcile_action("abandoned", &abandoned, "abandon", None)
        .unwrap();
    let statuses: Vec<String> = [confirmed, retried, abandoned]
        .iter()
        .map(|action_id| {
            service
                .tasks_db
                .query_row(
                    "SELECT status FROM task_action_ledger WHERE action_id=?1",
                    [action_id],
                    |row| row.get(0),
                )
                .unwrap()
        })
        .collect();
    assert_eq!(statuses, vec!["completed", "retry_authorized", "abandoned"]);
}

#[test]
fn checkpoint_round_trip_cas_integrity_and_bounds() {
    let service = service();
    let first = service.save_checkpoint("task-1", 0, &content()).unwrap();
    assert_eq!(first.revision, 1);
    assert_eq!(first.content.tool_results["token"], "[REDACTED]");
    assert!(first.content.tool_results["large"].as_str().unwrap().len() < 2100);
    assert!(service.save_checkpoint("task-1", 0, &content()).is_err());
    service
        .tasks_db
        .execute(
            "UPDATE task_execution_checkpoints SET checksum='bad' WHERE task_id='task-1'",
            [],
        )
        .unwrap();
    let candidate = service
        .classify_checkpoint("task-1", "workspace-a", &json!({"head":"abc"}))
        .unwrap();
    assert_eq!(candidate.classification, CheckpointClassification::Corrupt);
}

#[test]
fn duplicate_action_executes_once_and_conflicts_fail_closed() {
    let service = service();
    service.save_checkpoint("task-1", 0, &content()).unwrap();
    assert_eq!(
        service
            .claim_action("task-1", 1, "task-1:1", "fp", "write", true,)
            .unwrap(),
        ActionClaim::Started
    );
    service
        .complete_action("task-1:1", "fp", &json!({"ok":true,"password":"no"}))
        .unwrap();
    assert!(matches!(
        service
            .claim_action("task-1", 1, "task-1:1", "fp", "write", true,)
            .unwrap(),
        ActionClaim::Completed(_)
    ));
    assert!(service
        .claim_action("task-1", 1, "task-1:1", "different", "write", true,)
        .is_err());
}

#[test]
fn interrupted_consequential_action_requires_review() {
    let service = service();
    service.save_checkpoint("task-1", 0, &content()).unwrap();
    service
        .claim_action("task-1", 1, "task-1:1", "fp", "write", true)
        .unwrap();
    service.mark_interrupted_actions().unwrap();
    let candidate = service
        .classify_checkpoint("task-1", "workspace-a", &json!({"head":"abc"}))
        .unwrap();
    assert_eq!(
        candidate.classification,
        CheckpointClassification::NeedsReview
    );
}
