#[cfg(test)]
use super::db_migrations::run_vibe_studio_migrations;
use super::db_migrations::{configure_connection, run_learning_migrations};
use super::{with_connection, DbState};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

const LEARNING_DB_PATH: &str = r"D:\databases\agent_learning.db";
const MAX_TEXT_BYTES: usize = 64 * 1024;
const MAX_JSON_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEventInput {
    event_id: String,
    event_type: String,
    step_id: Option<String>,
    proposal_id: Option<String>,
    proposal_hash: Option<String>,
    path: Option<String>,
    change_type: Option<String>,
    reason_code: Option<String>,
    details: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTransitionInput {
    task_id: String,
    status: String,
    user_request: String,
    workspace_root: String,
    task_data: String,
    current_step_index: i64,
    model_metadata: String,
    created_at: String,
    updated_at: String,
    event: AgentEventInput,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTerminalInput {
    task_id: String,
    status: String,
    user_request: String,
    workspace_root: String,
    task_data: String,
    current_step_index: i64,
    model_metadata: String,
    changed_files: String,
    validation_summary: String,
    error_message: String,
    summary: String,
    reason_code: String,
    created_at: String,
    updated_at: String,
    terminal_at: String,
    started_at: String,
    completed_at: String,
    execution_time_ms: Option<i64>,
    selected_model: Option<String>,
    tokens_used: Option<i64>,
    event: AgentEventInput,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningOutcome {
    task_id: String,
    outcome: String,
    started_at: String,
    completed_at: String,
    execution_time_ms: Option<i64>,
    error_message: Option<String>,
    metadata: Option<String>,
    selected_model: Option<String>,
    tokens_used: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentChatOutcome {
    task_id: String,
    outcome: String,
    final_report: String,
    changed_files: String,
    validation_summary: String,
    model_metadata: String,
    created_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LearningDeliveryPayload {
    task_id: String,
    outcome: String,
    started_at: String,
    completed_at: String,
    execution_time_ms: Option<i64>,
    error_message: Option<String>,
    metadata: String,
    selected_model: Option<String>,
    tokens_used: Option<i64>,
}

pub fn db_record_agent_transition(
    state: State<'_, DbState>,
    input: AgentTransitionInput,
) -> Result<serde_json::Value, String> {
    with_connection(&state, |conn| record_transition(conn, &input))
}

pub fn db_record_agent_terminal(
    state: State<'_, DbState>,
    input: AgentTerminalInput,
) -> Result<serde_json::Value, String> {
    with_connection(&state, |conn| record_terminal(conn, &input))
}

pub fn db_get_resumable_agent_tasks(
    state: State<'_, DbState>,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    with_connection(&state, |conn| load_resumable(conn, limit.unwrap_or(10)))
}

pub fn db_get_agent_chat_outcomes(
    state: State<'_, DbState>,
    task_id: String,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    with_connection(&state, |conn| {
        load_chat_outcomes(conn, &task_id, limit.unwrap_or(10))
    })
}

pub fn db_flush_agent_learning_outbox(
    state: State<'_, DbState>,
) -> Result<serde_json::Value, String> {
    with_connection(&state, |conn| {
        flush_learning_outbox_to_path(conn, Path::new(LEARNING_DB_PATH))
    })
}

/// Backward-compatible direct learning command. New task terminal writes use the outbox.
pub fn db_record_learning_outcome(outcome: LearningOutcome) -> Result<serde_json::Value, String> {
    validate_terminal_status(&outcome.outcome)?;
    let payload = LearningDeliveryPayload {
        task_id: outcome.task_id,
        outcome: outcome.outcome.clone(),
        started_at: outcome.started_at,
        completed_at: outcome.completed_at,
        execution_time_ms: outcome.execution_time_ms,
        error_message: outcome.error_message,
        metadata: outcome
            .metadata
            .unwrap_or_else(|| serde_json::json!({ "outcome": outcome.outcome }).to_string()),
        selected_model: outcome.selected_model,
        tokens_used: outcome.tokens_used,
    };
    let mut connection = open_learning_connection(Path::new(LEARNING_DB_PATH))?;
    deliver_learning(&mut connection, &payload)?;
    Ok(serde_json::json!({ "success": true }))
}

fn record_transition(
    conn: &mut Connection,
    input: &AgentTransitionInput,
) -> Result<serde_json::Value, String> {
    validate_transition(input)?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let terminal_at: Option<Option<String>> = tx
        .query_row(
            "SELECT terminal_at FROM agent_task_lifecycle WHERE task_id=?1",
            params![input.task_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if terminal_at.flatten().is_some() {
        return Err(format!(
            "task {} is terminal and cannot accept another transition",
            input.task_id
        ));
    }

    tx.execute(
        "INSERT INTO agent_task_lifecycle
         (task_id,status,user_request,workspace_root,task_data,current_step_index,
          model_metadata,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
         ON CONFLICT(task_id) DO UPDATE SET
          status=excluded.status, user_request=excluded.user_request,
          workspace_root=excluded.workspace_root, task_data=excluded.task_data,
          current_step_index=excluded.current_step_index,
          model_metadata=excluded.model_metadata, updated_at=excluded.updated_at",
        params![
            input.task_id,
            input.status,
            input.user_request,
            input.workspace_root,
            input.task_data,
            input.current_step_index,
            input.model_metadata,
            input.created_at,
            input.updated_at,
        ],
    )
    .map_err(|error| error.to_string())?;
    insert_event(
        &tx,
        &input.task_id,
        &input.status,
        &input.updated_at,
        &input.event,
    )?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

fn record_terminal(
    conn: &mut Connection,
    input: &AgentTerminalInput,
) -> Result<serde_json::Value, String> {
    validate_terminal(input)?;
    let learning_payload = build_learning_payload(input)?;
    let serialized_learning = serde_json::to_string(&learning_payload)
        .map_err(|error| format!("failed to serialize learning outcome: {error}"))?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    let existing: Option<(String, Option<String>)> = tx
        .query_row(
            "SELECT status, terminal_at FROM agent_task_lifecycle WHERE task_id=?1",
            params![input.task_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let duplicate = existing
        .as_ref()
        .and_then(|(_, terminal_at)| terminal_at.as_ref())
        .is_some();
    if duplicate
        && existing.as_ref().map(|(status, _)| status.as_str()) != Some(input.status.as_str())
    {
        return Err(format!(
            "task {} is already terminal with a different outcome",
            input.task_id
        ));
    }

    if !duplicate {
        tx.execute(
            "INSERT INTO agent_task_lifecycle
             (task_id,status,user_request,workspace_root,task_data,current_step_index,
              model_metadata,changed_files,validation_summary,error_message,
              created_at,updated_at,terminal_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
             ON CONFLICT(task_id) DO UPDATE SET
              status=excluded.status, user_request=excluded.user_request,
              workspace_root=excluded.workspace_root, task_data=excluded.task_data,
              current_step_index=excluded.current_step_index,
              model_metadata=excluded.model_metadata, changed_files=excluded.changed_files,
              validation_summary=excluded.validation_summary,
              error_message=excluded.error_message, updated_at=excluded.updated_at,
              terminal_at=excluded.terminal_at",
            params![
                input.task_id,
                input.status,
                input.user_request,
                input.workspace_root,
                input.task_data,
                input.current_step_index,
                input.model_metadata,
                input.changed_files,
                input.validation_summary,
                input.error_message,
                input.created_at,
                input.updated_at,
                input.terminal_at,
            ],
        )
        .map_err(|error| error.to_string())?;
        insert_event(
            &tx,
            &input.task_id,
            &input.status,
            &input.terminal_at,
            &input.event,
        )?;
        tx.execute(
            "INSERT INTO agent_chat_outcomes
             (task_id,outcome,summary,changed_files,validation_summary,model_metadata,created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                input.task_id,
                input.status,
                input.summary,
                input.changed_files,
                input.validation_summary,
                input.model_metadata,
                input.terminal_at,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    tx.execute(
        "INSERT INTO agent_learning_outbox
         (task_id,outcome,payload,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?4)
         ON CONFLICT(task_id) DO NOTHING",
        params![
            input.task_id,
            input.status,
            serialized_learning,
            input.terminal_at,
        ],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(serde_json::json!({
        "success": true,
        "duplicate": duplicate,
        "learningDelivery": { "pending": true }
    }))
}

fn load_resumable(conn: &Connection, requested_limit: i64) -> Result<serde_json::Value, String> {
    let limit = requested_limit.clamp(1, 100);
    let mut statement = conn
        .prepare(
            "SELECT task_data FROM agent_task_lifecycle
             WHERE terminal_at IS NULL AND status IN ('executing','awaiting_approval')
             ORDER BY updated_at DESC LIMIT ?1",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![limit], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    let data = rows
        .into_iter()
        .map(|task_data| serde_json::json!({ "taskData": task_data }))
        .collect::<Vec<_>>();
    Ok(serde_json::json!({ "success": true, "data": data }))
}

fn load_chat_outcomes(
    conn: &Connection,
    task_id: &str,
    requested_limit: i64,
) -> Result<serde_json::Value, String> {
    validate_identifier(task_id, "task id")?;
    let limit = requested_limit.clamp(1, 100);
    let mut statement = conn
        .prepare(
            "SELECT task_id,outcome,summary,changed_files,validation_summary,model_metadata,created_at
             FROM agent_chat_outcomes WHERE task_id=?1
             ORDER BY created_at DESC,id DESC LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![task_id, limit], |row| {
            Ok(AgentChatOutcome {
                task_id: row.get(0)?,
                outcome: row.get(1)?,
                final_report: row.get(2)?,
                changed_files: row.get(3)?,
                validation_summary: row.get(4)?,
                model_metadata: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    Ok(serde_json::json!({ "success": true, "data": rows }))
}

fn flush_learning_outbox_to_path(
    main: &mut Connection,
    learning_path: &Path,
) -> Result<serde_json::Value, String> {
    let pending = {
        let mut statement = main
            .prepare(
                "SELECT task_id,payload FROM agent_learning_outbox
                 WHERE delivered_at IS NULL ORDER BY created_at ASC LIMIT 100",
            )
            .map_err(|error| error.to_string())?;
        let rows = statement
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|error| error.to_string())?;
        let collected = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        collected
    };
    if pending.is_empty() {
        return Ok(serde_json::json!({ "delivered": 0, "pending": 0, "failed": 0 }));
    }

    let mut learning = open_learning_connection(learning_path)?;
    let mut delivered = 0_i64;
    let mut failed = 0_i64;
    for (task_id, payload_json) in pending {
        let result = serde_json::from_str::<LearningDeliveryPayload>(&payload_json)
            .map_err(|error| format!("invalid queued learning payload: {error}"))
            .and_then(|payload| deliver_learning(&mut learning, &payload));
        match result {
            Ok(()) => {
                main.execute(
                    "UPDATE agent_learning_outbox
                     SET delivered_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP,
                         attempts=attempts+1, last_error=NULL
                     WHERE task_id=?1 AND delivered_at IS NULL",
                    params![task_id],
                )
                .map_err(|error| error.to_string())?;
                delivered += 1;
            }
            Err(error) => {
                main.execute(
                    "UPDATE agent_learning_outbox
                     SET attempts=attempts+1, last_error=?2, updated_at=CURRENT_TIMESTAMP
                     WHERE task_id=?1 AND delivered_at IS NULL",
                    params![task_id, truncate(&error, 1024)],
                )
                .map_err(|db_error| db_error.to_string())?;
                failed += 1;
            }
        }
    }
    let remaining: i64 = main
        .query_row(
            "SELECT COUNT(*) FROM agent_learning_outbox WHERE delivered_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok(serde_json::json!({
        "delivered": delivered,
        "pending": remaining,
        "failed": failed
    }))
}

fn open_learning_connection(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut connection = Connection::open(path).map_err(|error| error.to_string())?;
    configure_connection(&connection)?;
    run_learning_migrations(&mut connection)?;
    Ok(connection)
}

fn deliver_learning(
    connection: &mut Connection,
    payload: &LearningDeliveryPayload,
) -> Result<(), String> {
    validate_terminal_status(&payload.outcome)?;
    let success = i64::from(payload.outcome == "completed");
    connection
        .execute(
            "INSERT INTO agent_executions
             (execution_id,agent_id,task_type,tools_used,started_at,completed_at,
              success,execution_time_ms,error_message,metadata,context,project_name,
              tokens_used,selected_model,agent_name,execution_time,error_details,created_at)
             VALUES (?1,'vibe-code-studio','agentic_editing','[]',?2,?3,?4,?5,?6,?7,
              NULL,'vibe-code-studio',?8,?9,'vibe-code-studio',?5,?6,unixepoch())
             ON CONFLICT(execution_id) DO UPDATE SET
              completed_at=excluded.completed_at, success=excluded.success,
              execution_time_ms=excluded.execution_time_ms,
              error_message=excluded.error_message, metadata=excluded.metadata,
              tokens_used=excluded.tokens_used, selected_model=excluded.selected_model,
              execution_time=excluded.execution_time, error_details=excluded.error_details",
            params![
                payload.task_id,
                payload.started_at,
                payload.completed_at,
                success,
                payload.execution_time_ms,
                payload.error_message,
                payload.metadata,
                payload.tokens_used,
                payload.selected_model,
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn build_learning_payload(input: &AgentTerminalInput) -> Result<LearningDeliveryPayload, String> {
    let model_metadata = parse_json(&input.model_metadata, "model metadata")?;
    let changed_files = parse_json(&input.changed_files, "changed files")?;
    let validation_summary = parse_json(&input.validation_summary, "validation summary")?;
    let metadata = serde_json::json!({
        "outcome": input.status,
        "summary": input.summary,
        "reasonCode": input.reason_code,
        "modelMetadata": model_metadata,
        "changedFiles": changed_files,
        "validationSummary": validation_summary,
        "eventType": input.event.event_type,
        "stepId": input.event.step_id,
        "proposalId": input.event.proposal_id,
        "proposalHash": input.event.proposal_hash,
        "path": input.event.path,
        "changeType": input.event.change_type,
    })
    .to_string();
    Ok(LearningDeliveryPayload {
        task_id: input.task_id.clone(),
        outcome: input.status.clone(),
        started_at: input.started_at.clone(),
        completed_at: input.completed_at.clone(),
        execution_time_ms: input.execution_time_ms,
        error_message: if input.status == "completed" {
            None
        } else if input.error_message.is_empty() {
            Some(input.summary.clone())
        } else {
            Some(input.error_message.clone())
        },
        metadata,
        selected_model: input.selected_model.clone(),
        tokens_used: input.tokens_used,
    })
}

fn insert_event(
    tx: &Transaction<'_>,
    task_id: &str,
    status: &str,
    created_at: &str,
    event: &AgentEventInput,
) -> Result<(), String> {
    validate_event(event)?;
    tx.execute(
        "INSERT INTO agent_task_events
         (event_id,task_id,status,event_type,step_id,proposal_id,proposal_hash,path,
          change_type,reason_code,details,created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            event.event_id,
            task_id,
            status,
            event.event_type,
            event.step_id,
            event.proposal_id,
            event.proposal_hash,
            event.path,
            event.change_type,
            event.reason_code,
            event.details,
            created_at,
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn validate_transition(input: &AgentTransitionInput) -> Result<(), String> {
    validate_identifier(&input.task_id, "task id")?;
    validate_nonterminal_status(&input.status)?;
    validate_common(
        &input.user_request,
        &input.workspace_root,
        &input.task_data,
        &input.model_metadata,
        input.current_step_index,
    )?;
    validate_timestamp(&input.created_at, "created at")?;
    validate_timestamp(&input.updated_at, "updated at")?;
    validate_event(&input.event)
}

fn validate_terminal(input: &AgentTerminalInput) -> Result<(), String> {
    validate_identifier(&input.task_id, "task id")?;
    validate_terminal_status(&input.status)?;
    validate_common(
        &input.user_request,
        &input.workspace_root,
        &input.task_data,
        &input.model_metadata,
        input.current_step_index,
    )?;
    validate_json(&input.changed_files, "changed files")?;
    validate_json(&input.validation_summary, "validation summary")?;
    validate_text(&input.summary, "summary", MAX_TEXT_BYTES)?;
    if input.status == "completed"
        && matches!(
            input.summary.trim(),
            "Task completed successfully."
                | "Task completed successfully. No workspace file changes were reported."
        )
    {
        return Err("completed task final report cannot be generic completion metadata".into());
    }
    if !input.error_message.is_empty() {
        validate_text(&input.error_message, "error message", MAX_TEXT_BYTES)?;
    }
    validate_reason_code(&input.reason_code)?;
    validate_timestamp(&input.created_at, "created at")?;
    validate_timestamp(&input.updated_at, "updated at")?;
    validate_timestamp(&input.terminal_at, "terminal at")?;
    validate_timestamp(&input.started_at, "started at")?;
    validate_timestamp(&input.completed_at, "completed at")?;
    if input.execution_time_ms.is_some_and(|value| value < 0) {
        return Err("execution time cannot be negative".into());
    }
    if input.tokens_used.is_some_and(|value| value < 0) {
        return Err("tokens used cannot be negative".into());
    }
    if let Some(model) = &input.selected_model {
        validate_text(model, "selected model", 512)?;
    }
    validate_event(&input.event)
}

fn validate_common(
    user_request: &str,
    workspace_root: &str,
    task_data: &str,
    model_metadata: &str,
    current_step_index: i64,
) -> Result<(), String> {
    if current_step_index < 0 {
        return Err("current step index cannot be negative".into());
    }
    validate_text(user_request, "user request", MAX_TEXT_BYTES)?;
    validate_text(workspace_root, "workspace root", 4096)?;
    validate_json(task_data, "task data")?;
    validate_json(model_metadata, "model metadata")
}

fn validate_event(event: &AgentEventInput) -> Result<(), String> {
    validate_identifier(&event.event_id, "event id")?;
    if !matches!(
        event.event_type.as_str(),
        "planning_started"
            | "planning_completed"
            | "execution_started"
            | "execution_resumed"
            | "execution_paused"
            | "checkpoint_saved"
            | "step_completed"
            | "approval_requested"
            | "approval_granted"
            | "approval_rejected"
            | "approval_timed_out"
            | "approval_aborted"
            | "task_completed"
            | "task_failed"
            | "task_cancelled"
    ) {
        return Err(format!(
            "unsupported agent task event: {}",
            event.event_type
        ));
    }
    if let Some(details) = &event.details {
        validate_json(details, "event details")?;
    }
    if let Some(step_id) = &event.step_id {
        validate_identifier(step_id, "event step id")?;
    }
    if let Some(proposal_id) = &event.proposal_id {
        validate_identifier(proposal_id, "event proposal id")?;
    }
    if let Some(hash) = &event.proposal_hash {
        if hash.len() != 64 || !hash.chars().all(|value| value.is_ascii_hexdigit()) {
            return Err("proposal hash must be a 64-character SHA-256 hex value".into());
        }
    }
    if let Some(path) = &event.path {
        validate_text(path, "event path", 4096)?;
    }
    if let Some(change_type) = &event.change_type {
        if !matches!(
            change_type.as_str(),
            "create" | "modify" | "delete" | "create_directory"
        ) {
            return Err(format!("unsupported mutation change type: {change_type}"));
        }
    }
    if let Some(reason_code) = &event.reason_code {
        validate_reason_code(reason_code)?;
    }
    Ok(())
}

fn validate_reason_code(reason_code: &str) -> Result<(), String> {
    if matches!(
        reason_code,
        "completed"
            | "planning_failed"
            | "planning_timeout"
            | "planning_cancelled"
            | "execution_failed"
            | "step_failed"
            | "mutation_failed"
            | "approval_rejected"
            | "approval_timed_out"
            | "approval_aborted"
            | "user_cancelled"
            | "task_replaced"
            | "component_unmounted"
            | "unknown"
    ) {
        Ok(())
    } else {
        Err(format!("unsupported agent task reason code: {reason_code}"))
    }
}

fn validate_timestamp(value: &str, label: &str) -> Result<(), String> {
    validate_text(value, label, 128)
}

fn validate_nonterminal_status(status: &str) -> Result<(), String> {
    if matches!(status, "planning" | "executing" | "awaiting_approval") {
        Ok(())
    } else {
        Err(format!("invalid non-terminal task status: {status}"))
    }
}

fn validate_terminal_status(status: &str) -> Result<(), String> {
    if matches!(status, "completed" | "failed" | "cancelled") {
        Ok(())
    } else {
        Err(format!("invalid terminal task status: {status}"))
    }
}

fn validate_identifier(value: &str, label: &str) -> Result<(), String> {
    validate_text(value, label, 512)?;
    if value.chars().any(|character| character.is_control()) {
        return Err(format!("{label} contains control characters"));
    }
    Ok(())
}

fn validate_json(value: &str, label: &str) -> Result<(), String> {
    validate_text(value, label, MAX_JSON_BYTES)?;
    serde_json::from_str::<serde_json::Value>(value)
        .map(|_| ())
        .map_err(|error| format!("invalid {label}: {error}"))
}

fn parse_json(value: &str, label: &str) -> Result<serde_json::Value, String> {
    validate_json(value, label)?;
    serde_json::from_str(value).map_err(|error| format!("invalid {label}: {error}"))
}

fn validate_text(value: &str, label: &str, max_bytes: usize) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{label} cannot be empty"));
    }
    if value.len() > max_bytes {
        return Err(format!("{label} exceeds {max_bytes} bytes"));
    }
    Ok(())
}

fn truncate(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn event(event_type: &str, suffix: &str) -> AgentEventInput {
        AgentEventInput {
            event_id: format!("event-{suffix}"),
            event_type: event_type.into(),
            step_id: None,
            proposal_id: None,
            proposal_hash: None,
            path: None,
            change_type: None,
            reason_code: None,
            details: None,
        }
    }

    fn transition(status: &str, event_type: &str, suffix: &str) -> AgentTransitionInput {
        AgentTransitionInput {
            task_id: "task-1".into(),
            status: status.into(),
            user_request: "perform the task".into(),
            workspace_root: r"V:\monorepo".into(),
            task_data: r#"{"id":"task-1"}"#.into(),
            current_step_index: 0,
            model_metadata: "{}".into(),
            created_at: "2026-07-11T00:00:00.000Z".into(),
            updated_at: "2026-07-11T00:00:01.000Z".into(),
            event: event(event_type, suffix),
        }
    }

    fn terminal() -> AgentTerminalInput {
        AgentTerminalInput {
            task_id: "task-1".into(),
            status: "completed".into(),
            user_request: "perform the task".into(),
            workspace_root: r"V:\monorepo".into(),
            task_data: r#"{"id":"task-1"}"#.into(),
            current_step_index: 1,
            model_metadata: r#"{"model":"deepseek/deepseek-v4-pro"}"#.into(),
            changed_files: r#"["V:\\monorepo\\a.ts"]"#.into(),
            validation_summary: r#"{"validated":true}"#.into(),
            error_message: String::new(),
            summary: "Inspected the workspace and verified the requested behavior.".into(),
            reason_code: "completed".into(),
            created_at: "2026-07-11T00:00:00.000Z".into(),
            updated_at: "2026-07-11T00:00:02.000Z".into(),
            terminal_at: "2026-07-11T00:00:02.000Z".into(),
            started_at: "2026-07-11T00:00:00.000Z".into(),
            completed_at: "2026-07-11T00:00:02.000Z".into(),
            execution_time_ms: Some(2000),
            selected_model: Some("deepseek/deepseek-v4-pro".into()),
            tokens_used: Some(42),
            event: event("task_completed", "terminal"),
        }
    }

    fn main_connection() -> Connection {
        let mut connection = Connection::open_in_memory().unwrap();
        configure_connection(&connection).unwrap();
        run_vibe_studio_migrations(&mut connection).unwrap();
        connection
    }

    fn test_db_path(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = PathBuf::from(r"D:\data\vibe-code-studio-tests\agent-persistence");
        std::fs::create_dir_all(&directory).unwrap();
        directory.join(format!("{name}-{}-{nonce}.db", std::process::id()))
    }

    #[test]
    fn appends_transitions_and_excludes_terminal_checkpoints() {
        let mut connection = main_connection();
        record_transition(
            &mut connection,
            &transition("planning", "planning_started", "planning"),
        )
        .unwrap();
        record_transition(
            &mut connection,
            &transition("executing", "execution_started", "executing"),
        )
        .unwrap();
        assert_eq!(
            load_resumable(&connection, 10).unwrap()["data"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        record_terminal(&mut connection, &terminal()).unwrap();
        assert_eq!(
            load_resumable(&connection, 10).unwrap()["data"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
        let event_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM agent_task_events", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(event_count, 3);
    }

    #[test]
    fn accepts_all_planning_terminal_reason_codes() {
        for reason_code in ["planning_failed", "planning_timeout", "planning_cancelled"] {
            assert_eq!(validate_reason_code(reason_code), Ok(()));
        }
    }

    #[test]
    fn completed_terminal_requires_a_real_final_report() {
        for summary in [
            "   ",
            "Task completed successfully.",
            "Task completed successfully. No workspace file changes were reported.",
        ] {
            let mut input = terminal();
            input.summary = summary.into();
            assert!(validate_terminal(&input).is_err());
        }
    }

    #[test]
    fn persisted_final_report_reloads_exactly() {
        let mut connection = main_connection();
        let input = terminal();
        record_terminal(&mut connection, &input).unwrap();
        let loaded = load_chat_outcomes(&connection, "task-1", 10).unwrap();
        assert_eq!(loaded["data"][0]["finalReport"], input.summary);
        assert_eq!(loaded["data"][0]["outcome"], "completed");
    }

    #[test]
    fn terminal_record_and_learning_delivery_are_idempotent() {
        let mut connection = main_connection();
        record_transition(
            &mut connection,
            &transition("executing", "execution_started", "executing"),
        )
        .unwrap();
        assert_eq!(
            record_terminal(&mut connection, &terminal()).unwrap()["duplicate"],
            false
        );
        assert_eq!(
            record_terminal(&mut connection, &terminal()).unwrap()["duplicate"],
            true
        );
        let chat_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM agent_chat_outcomes", [], |row| {
                row.get(0)
            })
            .unwrap();
        let outbox_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM agent_learning_outbox", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(chat_count, 1);
        assert_eq!(outbox_count, 1);

        let learning_path = test_db_path("learning-outbox");
        let first = flush_learning_outbox_to_path(&mut connection, &learning_path).unwrap();
        let second = flush_learning_outbox_to_path(&mut connection, &learning_path).unwrap();
        assert_eq!(first["delivered"], 1);
        assert_eq!(second["delivered"], 0);
        let learning = Connection::open(&learning_path).unwrap();
        let learning_count: i64 = learning
            .query_row("SELECT COUNT(*) FROM agent_executions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(learning_count, 1);
        let (success, error_message): (i64, Option<String>) = learning
            .query_row(
                "SELECT success,error_message FROM agent_executions WHERE execution_id=?1",
                params!["task-1"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(success, 1);
        assert_eq!(error_message, None);
        drop(learning);
        let _ = std::fs::remove_file(learning_path);
        let _ = std::fs::remove_dir(r"D:\data\vibe-code-studio-tests\agent-persistence");
        let _ = std::fs::remove_dir(r"D:\data\vibe-code-studio-tests");
    }
}
