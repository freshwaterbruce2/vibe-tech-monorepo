use super::checkpoints::CheckpointContent;
use super::DatabaseService;
use serde_json::json;
use tempfile::tempdir;

fn content(state: &str) -> CheckpointContent {
    CheckpointContent {
        state: state.into(),
        plan: json!(["step"]),
        progress: json!({"completed":[]}),
        tool_results: json!([]),
        pending_approval: None,
        errors: json!([]),
        conversation: json!([]),
        next_action: json!({"kind":"none"}),
        workspace_fingerprint: String::new(),
        preconditions: json!({}),
    }
}

fn service() -> DatabaseService {
    let directory = tempdir().unwrap().keep();
    let service = DatabaseService::new(directory).unwrap();
    service.create_task_table().unwrap();
    service
        .log_task("outcome", "Outcome", "in_progress")
        .unwrap();
    service
}

fn task_status(service: &DatabaseService) -> String {
    service
        .tasks_db
        .query_row(
            "SELECT status FROM task_tasks WHERE id='outcome'",
            [],
            |row| row.get(0),
        )
        .unwrap()
}

fn retirement_pending(service: &DatabaseService) -> i64 {
    service
        .tasks_db
        .query_row(
            "SELECT continuation_retire_pending FROM task_action_ledger
             WHERE action_id='outcome:action'",
            [],
            |row| row.get(0),
        )
        .unwrap()
}

#[test]
fn terminal_outcome_rolls_back_after_each_write_and_real_helper_commits_all_state() {
    let service = service();
    let initial = service
        .save_checkpoint("outcome", 0, &content("running"))
        .unwrap();
    service
        .claim_action(
            "outcome",
            initial.revision,
            "outcome:action",
            "outcome-fingerprint",
            "write_file",
            true,
        )
        .unwrap();
    let reference = format!("continuation:v1:{}", "b".repeat(64));
    service
        .bind_action_continuation("outcome:action", "outcome-fingerprint", &reference)
        .unwrap();
    let terminal = content("completed");

    for boundary in 1..=3 {
        assert!(service
            .transition_task_outcome_with_failure(
                "outcome",
                initial.revision,
                "completed",
                &terminal,
                boundary,
            )
            .is_err());
        assert_eq!(
            service.get_checkpoint("outcome").unwrap().unwrap().revision,
            initial.revision
        );
        assert_eq!(task_status(&service), "in_progress");
        assert_eq!(retirement_pending(&service), 0);
    }

    let committed = service
        .transition_task_outcome("outcome", initial.revision, "completed", &terminal)
        .unwrap();
    assert_eq!(committed.revision, initial.revision + 1);
    assert_eq!(committed.content.state, "completed");
    assert_eq!(task_status(&service), "completed");
    assert_eq!(retirement_pending(&service), 1);
}

#[test]
fn review_outcome_commits_checkpoint_and_status_without_retiring_continuation() {
    let service = service();
    let initial = service
        .save_checkpoint("outcome", 0, &content("running"))
        .unwrap();
    service
        .claim_action(
            "outcome",
            initial.revision,
            "outcome:action",
            "outcome-fingerprint",
            "write_file",
            true,
        )
        .unwrap();
    let reference = format!("continuation:v1:{}", "c".repeat(64));
    service
        .bind_action_continuation("outcome:action", "outcome-fingerprint", &reference)
        .unwrap();

    let committed = service
        .transition_task_outcome(
            "outcome",
            initial.revision,
            "needs_review",
            &content("needs_review"),
        )
        .unwrap();
    assert_eq!(committed.revision, initial.revision + 1);
    assert_eq!(committed.content.state, "needs_review");
    assert_eq!(task_status(&service), "needs_review");
    assert_eq!(retirement_pending(&service), 0);
}

#[test]
fn old_action_ledger_migration_preserves_rows_and_adds_cleanup_defaults() {
    let directory = tempdir().unwrap();
    let service = DatabaseService::new(directory.path().to_path_buf()).unwrap();
    service
        .tasks_db
        .execute_batch(
            "CREATE TABLE task_tasks (
                id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'normal',due_at INTEGER,app_source TEXT NOT NULL,
                created_at INTEGER NOT NULL,updated_at INTEGER,metadata TEXT
             );
             INSERT INTO task_tasks(id,title,status,app_source,created_at)
             VALUES ('legacy','Legacy','in_progress','nova',1);
             CREATE TABLE task_action_ledger (
                action_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL REFERENCES task_tasks(id) ON DELETE CASCADE,
                checkpoint_revision INTEGER NOT NULL,sequence INTEGER NOT NULL,
                fingerprint TEXT NOT NULL,action_kind TEXT NOT NULL,
                consequential INTEGER NOT NULL,status TEXT NOT NULL,result_json TEXT,
                error_summary TEXT,started_at INTEGER NOT NULL,finished_at INTEGER,
                UNIQUE(task_id,fingerprint)
             );
             INSERT INTO task_action_ledger(
                action_id,task_id,checkpoint_revision,sequence,fingerprint,action_kind,
                consequential,status,started_at
             ) VALUES ('legacy:action','legacy',1,1,'legacy-fingerprint','read_file',0,'completed',1);",
        )
        .unwrap();

    service.create_task_table().unwrap();
    let columns: i64 = service
        .tasks_db
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('task_action_ledger')
             WHERE name IN ('continuation_ref','continuation_retire_pending')",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let row: (String, Option<String>, i64) = service
        .tasks_db
        .query_row(
            "SELECT fingerprint,continuation_ref,continuation_retire_pending
             FROM task_action_ledger WHERE action_id='legacy:action'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    let continuation_default: Option<String> = service
        .tasks_db
        .query_row(
            "SELECT dflt_value FROM pragma_table_info('task_action_ledger')
             WHERE name='continuation_ref'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let retirement_default: Option<String> = service
        .tasks_db
        .query_row(
            "SELECT dflt_value FROM pragma_table_info('task_action_ledger')
             WHERE name='continuation_retire_pending'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(columns, 2);
    assert_eq!(row, ("legacy-fingerprint".into(), None, 0));
    assert_eq!(continuation_default, None);
    assert_eq!(retirement_default.as_deref(), Some("0"));
}
