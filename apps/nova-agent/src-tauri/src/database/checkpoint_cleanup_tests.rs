use super::checkpoints::CheckpointContent;
use super::DatabaseService;
use serde_json::json;
use tempfile::tempdir;

fn service() -> DatabaseService {
    let directory = tempdir().unwrap().keep();
    let service = DatabaseService::new(directory).unwrap();
    service.create_task_table().unwrap();
    service
        .log_task("cleanup", "Cleanup", "in_progress")
        .unwrap();
    service
}

fn content() -> CheckpointContent {
    CheckpointContent {
        state: "running".into(),
        plan: json!(["step"]),
        progress: json!({"completed":[]}),
        tool_results: json!([]),
        pending_approval: None,
        errors: json!([]),
        conversation: json!([]),
        next_action: json!({"kind":"execute_tool"}),
        workspace_fingerprint: String::new(),
        preconditions: json!({}),
    }
}

fn action_with_reference(service: &DatabaseService, reference: &str) {
    let checkpoint = service.save_checkpoint("cleanup", 0, &content()).unwrap();
    service
        .claim_action(
            "cleanup",
            checkpoint.revision,
            "cleanup:action",
            "cleanup-fingerprint",
            "read_file",
            false,
        )
        .unwrap();
    service
        .bind_action_continuation("cleanup:action", "cleanup-fingerprint", reference)
        .unwrap();
}

#[test]
fn cleanup_marker_clears_only_after_successful_idempotent_retirement() {
    let service = service();
    let reference = format!("continuation:v1:{}", "a".repeat(64));
    action_with_reference(&service, &reference);
    service.update_task_status("cleanup", "completed").unwrap();
    assert_eq!(service.retry_pending_continuation_cleanup().unwrap(), 1);
    let (pending, stored_reference): (i64, Option<String>) = service
        .tasks_db
        .query_row(
            "SELECT continuation_retire_pending,continuation_ref FROM task_action_ledger
             WHERE action_id='cleanup:action'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(pending, 0);
    assert_eq!(stored_reference, None);
    assert_eq!(service.retry_pending_continuation_cleanup().unwrap(), 0);
}

#[test]
fn failed_cleanup_remains_pending_and_terminal_discovery_requeues_it() {
    let service = service();
    action_with_reference(&service, "invalid-reference");
    service.update_task_status("cleanup", "completed").unwrap();
    assert_eq!(service.retry_pending_continuation_cleanup().unwrap(), 0);
    let pending: i64 = service
        .tasks_db
        .query_row(
            "SELECT continuation_retire_pending FROM task_action_ledger WHERE action_id='cleanup:action'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(pending, 1);
}

#[test]
fn terminal_transition_uses_latest_checkpoint_revision_after_tool_progress() {
    let service = service();
    let initial = service.save_checkpoint("cleanup", 0, &content()).unwrap();
    let mut tool_progress = initial.content.clone();
    tool_progress.progress = json!({"completed":["tool"]});
    let advanced = service
        .save_checkpoint("cleanup", initial.revision, &tool_progress)
        .unwrap();
    assert!(service
        .save_checkpoint("cleanup", initial.revision, &tool_progress)
        .is_err());
    let mut latest = service.get_checkpoint("cleanup").unwrap().unwrap();
    latest.content.state = "completed".into();
    let terminal = service
        .save_checkpoint("cleanup", latest.revision, &latest.content)
        .unwrap();
    assert_eq!(terminal.revision, advanced.revision + 1);
    assert_eq!(terminal.content.progress, json!({"completed":["tool"]}));
}
