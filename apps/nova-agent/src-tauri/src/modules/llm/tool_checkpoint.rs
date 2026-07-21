use crate::database;
use crate::database::checkpoints::{digest_value, ActionClaim};
use crate::modules::state::{ChatMessage, ToolCall};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

use super::secure_continuation;
use super::tools::{dispatch_tool_call, record_tool_call_outcome, tool_result_kind};

#[derive(Debug, Deserialize, Serialize)]
pub(super) struct SecureToolContinuation {
    pub tool_call: ToolCall,
    pub result: Option<String>,
}

pub(super) fn load_secure_continuation(reference: &str) -> Result<SecureToolContinuation, String> {
    secure_continuation::load(reference)
}

fn durable_completed_result(reference: &str) -> Result<String, String> {
    load_secure_continuation(reference)?
        .result
        .ok_or_else(|| "completed tool result is unavailable; reconciliation required".to_string())
}

pub(super) async fn execute_checkpointed_tool(
    tool_call: &ToolCall,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
    task_id: Option<&str>,
    conversation: &[ChatMessage],
) -> Result<String, String> {
    let Some(task_id) = task_id else {
        let result = match tokio::time::timeout(
            std::time::Duration::from_secs(30),
            dispatch_tool_call(tool_call, db.clone()),
        )
        .await
        {
            Ok(result) => result,
            Err(_) => format!("Tool '{}' timed out after 30s", tool_call.function.name),
        };
        record_tool_call_outcome(tool_call, &db, &result).await;
        return Ok(result);
    };

    let execution_identity = {
        let guard = db.lock().await;
        let checkpoint = guard
            .as_ref()
            .ok_or_else(|| "Database not available".to_string())?
            .get_checkpoint(task_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Task checkpoint is missing".to_string())?;
        checkpoint
            .content
            .preconditions
            .get("task_definition_digest")
            .and_then(Value::as_str)
            .unwrap_or(&checkpoint.checksum)
            .to_string()
    };
    let base_fingerprint = call_fingerprint(tool_call, &execution_identity);
    let mut fingerprint = base_fingerprint.clone();
    let mut action_id = format!("{task_id}:tool:{}:{base_fingerprint}", tool_call.id);
    let consequential = is_consequential(&tool_call.function.name);

    {
        let guard = db.lock().await;
        let service = guard
            .as_ref()
            .ok_or_else(|| "Database not available".to_string())?;
        let mut checkpoint = service
            .get_checkpoint(task_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Task checkpoint is missing".to_string())?;
        let classification = service.classify_checkpoint_current(task_id)?.classification;
        if matches!(
            classification,
            database::CheckpointClassification::Stale
                | database::CheckpointClassification::Corrupt
                | database::CheckpointClassification::NeedsReview
        ) {
            return Err("CURRENT_WORKSPACE_REVIEW_REQUIRED".to_string());
        }
        if checkpoint
            .content
            .next_action
            .get("kind")
            .and_then(Value::as_str)
            == Some("retry_action")
            && checkpoint
                .content
                .next_action
                .get("previous_fingerprint")
                .and_then(Value::as_str)
                == Some(&base_fingerprint)
        {
            action_id = checkpoint
                .content
                .next_action
                .get("action_id")
                .and_then(Value::as_str)
                .ok_or_else(|| "retry action id is missing".to_string())?
                .to_string();
            fingerprint = checkpoint
                .content
                .next_action
                .get("fingerprint")
                .and_then(Value::as_str)
                .ok_or_else(|| "retry fingerprint is missing".to_string())?
                .to_string();
        }
        let effect_digest =
            service.effect_approval_digest(task_id, &checkpoint.content.plan, &fingerprint)?;
        let secure_reference = secure_continuation::store_pending(
            task_id,
            &action_id,
            &SecureToolContinuation {
                tool_call: tool_call.clone(),
                result: None,
            },
        )?;
        if consequential
            && !service.is_effect_approved(task_id, &checkpoint.content.plan, &fingerprint)
        {
            checkpoint.content.state = "awaiting_approval".to_string();
            checkpoint.content.pending_approval = Some(json!({
                "checkpoint_revision": checkpoint.revision + 1,
                "action_fingerprint": fingerprint,
                "approval_digest": effect_digest,
                "action_kind": tool_call.function.name,
            }));
            checkpoint.content.conversation = scrub_conversation(conversation);
            checkpoint.content.next_action = json!({
                "kind": "approved_tool_retry",
                "action_id": action_id,
                "fingerprint": fingerprint,
                "secure_ref": secure_reference,
            });
            service.save_checkpoint(task_id, checkpoint.revision, &checkpoint.content)?;
            service
                .update_task_status(task_id, "awaiting_approval")
                .map_err(|e| e.to_string())?;
            return Err("TOOL_APPROVAL_REQUIRED".to_string());
        }
        checkpoint.content.state = "running".to_string();
        checkpoint.content.pending_approval = None;
        checkpoint.content.conversation = scrub_conversation(conversation);
        checkpoint.content.next_action = json!({
            "kind": "execute_tool",
            "action_id": action_id,
            "fingerprint": fingerprint,
            "secure_ref": secure_reference,
        });
        let prepared =
            service.save_checkpoint(task_id, checkpoint.revision, &checkpoint.content)?;
        match service.claim_action(
            task_id,
            prepared.revision,
            &action_id,
            &fingerprint,
            &tool_call.function.name,
            consequential,
        )? {
            ActionClaim::Started => {
                service.bind_action_continuation(&action_id, &fingerprint, &secure_reference)?;
            }
            ActionClaim::Completed(_) => {
                return durable_completed_result(&secure_reference);
            }
            ActionClaim::Running => return Err("READ_ONLY_RETRY_REQUIRES_NEW_ACTION".to_string()),
            ActionClaim::Uncertain => {
                return Err("CONSEQUENTIAL_ACTION_REQUIRES_RECONCILIATION".to_string())
            }
        }
    }

    let execution = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        dispatch_tool_call(tool_call, db.clone()),
    )
    .await;
    let timed_out = execution.is_err();
    let result = execution
        .unwrap_or_else(|_| format!("Tool '{}' timed out after 30s", tool_call.function.name));
    record_tool_call_outcome(tool_call, &db, &result).await;
    let summary = result_summary(&tool_call.function.name, &result);
    let success = tool_result_kind(&result) == "success";
    let guard = db.lock().await;
    let service = guard
        .as_ref()
        .ok_or_else(|| "Database not available".to_string())?;
    let secure_reference = match secure_continuation::store(
        task_id,
        &action_id,
        &SecureToolContinuation {
            tool_call: tool_call.clone(),
            result: Some(result.clone()),
        },
    ) {
        Ok(reference) => reference,
        Err(error) => {
            service.fail_action(&action_id, &fingerprint, "continuation_storage_failed")?;
            return Err(format!("TOOL_ACTION_UNCERTAIN: {error}"));
        }
    };
    let mut checkpoint = service
        .get_checkpoint(task_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Task checkpoint is missing".to_string())?;
    if success && !timed_out && consequential {
        if let Err(error) = service.refresh_checkpoint_evidence(task_id, &mut checkpoint.content) {
            service.fail_action(&action_id, &fingerprint, "evidence_refresh_failed")?;
            return Err(format!("TOOL_ACTION_UNCERTAIN: {error}"));
        }
    }
    let mut summaries = checkpoint
        .content
        .tool_results
        .as_array()
        .cloned()
        .unwrap_or_default();
    summaries.push(summary);
    checkpoint.content.tool_results = Value::Array(
        summaries
            .into_iter()
            .rev()
            .take(100)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect(),
    );
    checkpoint.content.conversation = scrub_conversation(conversation);
    checkpoint.content.pending_approval = None;
    checkpoint.content.state = if success && !timed_out {
        "running"
    } else {
        "needs_review"
    }
    .to_string();
    checkpoint.content.next_action = if success && !timed_out {
        json!({"kind":"provider_continue","action_id":action_id,"fingerprint":fingerprint,"secure_ref":secure_reference})
    } else {
        json!({"kind":"reconcile_action","action_id":action_id,"fingerprint":fingerprint,"secure_ref":secure_reference})
    };
    if success && !timed_out {
        service.complete_action_and_checkpoint(
            task_id,
            checkpoint.revision,
            &action_id,
            &fingerprint,
            &summary,
            &checkpoint.content,
        )?;
        Ok(result)
    } else {
        service.fail_action(&action_id, &fingerprint, tool_result_kind(&result))?;
        service.save_checkpoint(task_id, checkpoint.revision, &checkpoint.content)?;
        Err("TOOL_ACTION_FAILED_REVIEW_REQUIRED".to_string())
    }
}

fn canonical_arguments(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| json!({"invalid_json_chars": raw.chars().count()}))
}

fn call_fingerprint(tool_call: &ToolCall, execution_identity: &str) -> String {
    digest_value(&json!({
        "execution": execution_identity,
        "call_id": tool_call.id,
        "tool": tool_call.function.name,
        "arguments": canonical_arguments(&tool_call.function.arguments),
    }))
}

fn is_consequential(tool: &str) -> bool {
    matches!(tool, "write_file" | "execute_code" | "create_task")
}

fn result_summary(tool: &str, result: &str) -> Value {
    json!({
        "tool": tool,
        "outcome": tool_result_kind(result),
        "result_chars": result.chars().count(),
        "result_digest": digest_value(&json!(result)),
    })
}

fn scrub_conversation(messages: &[ChatMessage]) -> Value {
    json!(messages
        .iter()
        .rev()
        .take(50)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|message| {
            json!({
                "role": message.role,
                "content_chars": message.content.as_deref().map(str::chars).map(Iterator::count),
                "tool_calls": message.tool_calls.as_ref().map(|calls| calls.iter().map(|call| json!({
                    "id": call.id,
                    "name": call.function.name,
                    "arguments_digest": digest_value(&canonical_arguments(&call.function.arguments)),
                })).collect::<Vec<_>>()),
                "tool_call_id": message.tool_call_id,
                "name": message.name,
            })
        })
        .collect::<Vec<_>>())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn consequential_tool_allowlist_is_fail_closed() {
        assert!(is_consequential("write_file"));
        assert!(is_consequential("execute_code"));
        assert!(!is_consequential("read_file"));
    }

    #[test]
    fn result_summary_never_contains_raw_result() {
        let summary = result_summary("read_file", "private-token-value").to_string();
        assert!(!summary.contains("private-token-value"));
        assert!(summary.contains("result_digest"));
    }

    #[test]
    fn identical_operations_are_distinct_calls_but_restart_identity_is_stable() {
        let read_one = ToolCall {
            id: "call-read-1".into(),
            r#type: "function".into(),
            function: crate::modules::state::ToolCallFunction {
                name: "read_file".into(),
                arguments: r#"{"path":"same.txt"}"#.into(),
            },
        };
        let restarted = read_one.clone();
        let mut read_two = read_one.clone();
        read_two.id = "call-read-2".into();
        assert_eq!(
            call_fingerprint(&read_one, "generation-1"),
            call_fingerprint(&restarted, "generation-1")
        );
        assert_ne!(
            call_fingerprint(&read_one, "generation-1"),
            call_fingerprint(&read_two, "generation-1")
        );
        assert_ne!(
            call_fingerprint(&read_one, "generation-1"),
            call_fingerprint(&read_one, "generation-2")
        );
    }

    #[test]
    fn completed_replay_returns_original_durable_result_not_summary() {
        let continuation = SecureToolContinuation {
            tool_call: ToolCall {
                id: "completed-call".into(),
                r#type: "function".into(),
                function: crate::modules::state::ToolCallFunction {
                    name: "read_file".into(),
                    arguments: "{}".into(),
                },
            },
            result: Some("original tool payload".into()),
        };
        let reference =
            secure_continuation::store("completed-task", "completed-action", &continuation)
                .unwrap();
        assert_eq!(
            durable_completed_result(&reference).unwrap(),
            "original tool payload"
        );
        secure_continuation::delete(&reference).unwrap();
    }
}
