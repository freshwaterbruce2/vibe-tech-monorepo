use crate::database;
use crate::modules::state::ToolCall;
use crate::modules::{execution, filesystem, ml_learning, path_policy, procedural_memory, web};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{error, info};

use super::validation::{
    detect_generic_plan_flags, is_path_token_blocked, parse_task_policy, parse_tool_args,
    sanitize_description, validate_priority, validate_search_query, validate_title, CreateTaskArgs,
    ExecuteCodeArgs, InspectActionArg, PathArg, SearchArg, WriteFileArgs,
};
pub(super) async fn execute_tool_call(
    tool_call: &ToolCall,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> String {
    info!("Executing tool: {}", tool_call.function.name);

    let result = dispatch_tool_call(tool_call, db.clone()).await;
    record_tool_call_outcome(tool_call, &db, &result).await;
    result
}

pub(super) async fn record_tool_call_outcome(
    tool_call: &ToolCall,
    db: &Arc<AsyncMutex<Option<database::DatabaseService>>>,
    result: &str,
) {
    let result_kind = tool_result_kind(result);
    let success = tool_result_succeeded(result);
    let context = format!(
        "tool={} outcome={} result_kind={}",
        tool_call.function.name,
        if success { "success" } else { "failure" },
        result_kind,
    );
    let metadata = json!({
        "tool": tool_call.function.name,
        "success": success,
        "result_kind": result_kind,
        "result_chars": result.chars().count(),
        "args": summarize_tool_args(&tool_call.function.name, &tool_call.function.arguments),
    })
    .to_string();
    let tool_names = [tool_call.function.name.as_str()];

    procedural_memory::record_tool_sequence(db, &tool_names, &context, success, Some(&metadata))
        .await;
}

fn tool_result_succeeded(result: &str) -> bool {
    tool_result_kind(result) == "success"
}

fn tool_result_kind(result: &str) -> &'static str {
    let trimmed = result.trim_start();
    if trimmed.is_empty() {
        "empty"
    } else if trimmed.starts_with("Error parsing arguments") {
        "argument_error"
    } else if trimmed.starts_with("Error")
        || trimmed.starts_with("❌")
        || trimmed.starts_with("Unknown tool")
    {
        "tool_error"
    } else if trimmed.starts_with("Tool '") && trimmed.contains(" timed out ") {
        "timeout"
    } else {
        "success"
    }
}

fn path_summary(path: &str) -> serde_json::Value {
    let extension = std::path::Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_string();

    json!({
        "chars": path.chars().count(),
        "is_absolute": std::path::Path::new(path).is_absolute(),
        "has_traversal_tokens": is_path_token_blocked(path),
        "extension": extension,
    })
}

fn string_char_count(value: Option<&serde_json::Value>) -> Option<usize> {
    value
        .and_then(|v| v.as_str())
        .map(|text| text.chars().count())
}

fn summarize_tool_args(tool_name: &str, raw_args: &str) -> serde_json::Value {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(raw_args) else {
        return json!({
            "valid_json": false,
            "raw_chars": raw_args.chars().count(),
        });
    };

    let Some(obj) = value.as_object() else {
        return json!({
            "valid_json": true,
            "shape": "non_object",
        });
    };

    let mut keys = obj.keys().cloned().collect::<Vec<_>>();
    keys.sort();

    match tool_name {
        "execute_code" => json!({
            "valid_json": true,
            "keys": keys,
            "language": obj.get("language").and_then(|v| v.as_str()).unwrap_or(""),
            "code_chars": string_char_count(obj.get("code")).unwrap_or(0),
            "confirmed": obj.get("confirmed").and_then(|v| v.as_bool()),
        }),
        "read_file" | "list_directory" => json!({
            "valid_json": true,
            "keys": keys,
            "path": obj.get("path").and_then(|v| v.as_str()).map(path_summary),
        }),
        "write_file" => json!({
            "valid_json": true,
            "keys": keys,
            "path": obj.get("path").and_then(|v| v.as_str()).map(path_summary),
            "content_chars": string_char_count(obj.get("content")).unwrap_or(0),
        }),
        "internet_search" => json!({
            "valid_json": true,
            "keys": keys,
            "query_chars": string_char_count(obj.get("query")).unwrap_or(0),
        }),
        "inspect_learning_system" => json!({
            "valid_json": true,
            "keys": keys,
            "action": obj.get("action").and_then(|v| v.as_str()).unwrap_or(""),
        }),
        "create_task" => json!({
            "valid_json": true,
            "keys": keys,
            "title_chars": string_char_count(obj.get("title")).unwrap_or(0),
            "description_chars": string_char_count(obj.get("description")).unwrap_or(0),
            "project_path": obj.get("project_path").and_then(|v| v.as_str()).map(path_summary),
            "priority": obj.get("priority").and_then(|v| v.as_str()),
            "risk": obj.get("risk").and_then(|v| v.as_str()),
            "auto_execute": obj.get("auto_execute").and_then(|v| v.as_bool()),
            "requires_approval": obj.get("requires_approval").and_then(|v| v.as_bool()),
            "max_duration_minutes": obj.get("max_duration_minutes").and_then(|v| v.as_u64()),
        }),
        _ => json!({
            "valid_json": true,
            "keys": keys,
        }),
    }
}

async fn dispatch_tool_call(
    tool_call: &ToolCall,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> String {
    match tool_call.function.name.as_str() {
        "execute_code" => {
            let args = match parse_tool_args::<ExecuteCodeArgs>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            match execution::execute_code(args.language, args.code, args.confirmed).await {
                Ok(res) => res,
                Err(e) => format!("Error executing code: {}", e),
            }
        }
        "read_file" => {
            let args = match parse_tool_args::<PathArg>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            if is_path_token_blocked(&args.path) {
                return "Error reading file: path contains traversal tokens".to_string();
            }

            match filesystem::read_file(args.path).await {
                Ok(res) => res,
                Err(e) => format!("Error reading file: {}", e),
            }
        }
        "write_file" => {
            let args = match parse_tool_args::<WriteFileArgs>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            if is_path_token_blocked(&args.path) {
                return "Error writing file: path contains traversal tokens".to_string();
            }

            match filesystem::write_file(args.path, args.content).await {
                Ok(result) => {
                    format!(
                        "✅ FILE WRITTEN SUCCESSFULLY\n\
                         Path: {}\n\
                         Bytes written: {}\n\
                         Lines: {}\n\
                         Status: VERIFIED (file size confirmed)",
                        result.path, result.bytes_written, result.line_count
                    )
                }
                Err(e) => format!("❌ Error writing file: {}", e),
            }
        }
        "list_directory" => {
            let args = match parse_tool_args::<PathArg>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            if is_path_token_blocked(&args.path) {
                return "Error listing directory: path contains traversal tokens".to_string();
            }

            match filesystem::list_directory(args.path).await {
                Ok(res) => res,
                Err(e) => format!("Error listing directory: {}", e),
            }
        }
        "internet_search" => {
            let args = match parse_tool_args::<SearchArg>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            if let Err(e) = validate_search_query(&args.query) {
                return format!("Error searching web: {}", e);
            }

            match web::web_search(args.query).await {
                Ok(results) => {
                    let mut summary = String::new();
                    for (i, res) in results.iter().take(3).enumerate() {
                        summary.push_str(&format!(
                            "{}. {} ({})\n{}\n\n",
                            i + 1,
                            res.title,
                            res.link,
                            res.snippet
                        ));
                    }
                    summary
                }
                Err(e) => format!("Error searching web: {}", e),
            }
        }
        "inspect_learning_system" => {
            let args = match parse_tool_args::<InspectActionArg>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            match args.action.as_str() {
                "check_drift" => match ml_learning::check_ml_drift() {
                    Ok(res) => format!(
                        "ML Drift Check: Success={}\nData: {:?}\nError: {:?}",
                        res.success, res.data, res.error
                    ),
                    Err(e) => format!("Error checking drift: {}", e),
                },
                "storage_efficiency" => match ml_learning::get_storage_efficiency() {
                    Ok(res) => format!(
                        "Storage Efficiency: Success={}\nData: {:?}\nError: {:?}",
                        res.success, res.data, res.error
                    ),
                    Err(e) => format!("Error checking storage: {}", e),
                },
                "recent_events" => {
                    let db_guard = db.lock().await;
                    if let Some(service) = db_guard.as_ref() {
                        match service.get_learning_events(Some(5), None) {
                            Ok(events) => {
                                let summary: Vec<_> = events.into_iter().map(|e| {
                                    serde_json::json!({
                                        "timestamp": e.timestamp,
                                        "type": e.event_type,
                                        "context": e.context.as_ref().map(|c| if c.len() > 100 { format!("{}...", &c[..100]) } else { c.clone() }),
                                        "outcome": e.outcome,
                                    })
                                }).collect();
                                serde_json::to_string_pretty(&summary)
                                    .unwrap_or_else(|e| format!("Error serializing: {}", e))
                            }
                            Err(e) => format!("Error fetching events: {}", e),
                        }
                    } else {
                        "Database not available".to_string()
                    }
                }
                _ => format!("Unknown action: {}", args.action),
            }
        }
        "create_task" => {
            let args = match parse_tool_args::<CreateTaskArgs>(&tool_call.function.arguments) {
                Ok(value) => value,
                Err(e) => return format!("Error parsing arguments: {}", e),
            };

            if let Err(e) = validate_title(&args.title) {
                return format!("❌ Error creating task: {}", e);
            }

            let description = args.description.clone().unwrap_or_default();
            if let Err(e) = sanitize_description(&description) {
                return format!("❌ Error creating task: {}", e);
            }

            let project_path = match args.project_path.as_ref() {
                Some(path) if !path.trim().is_empty() => path.clone(),
                _ => return "❌ Error creating task: project_path is required".to_string(),
            };

            if is_path_token_blocked(&project_path) {
                return "❌ Error creating task: project_path contains traversal tokens"
                    .to_string();
            }

            if let Err(e) = path_policy::validate_directory_path(&project_path) {
                return format!("❌ Error creating task: {}", e);
            }

            let priority = match validate_priority(args.priority.as_deref().unwrap_or("medium")) {
                Ok(value) => value,
                Err(e) => return format!("❌ Error creating task: {}", e),
            };

            let review = match crate::modules::project_review::find_latest_review_for_project(&project_path) {
                Ok(Some(review)) => review,
                Ok(None) => {
                    return format!(
                        "❌ Error creating task: no grounded project review found for {}. Run `nova analyze --path {}` first.",
                        project_path,
                        project_path,
                    )
                }
                Err(e) => return format!("❌ Error creating task: {}", e),
            };

            let generic_plan_flags =
                detect_generic_plan_flags(&description, &project_path, &review);
            if !generic_plan_flags.is_empty() {
                return format!(
                    "❌ Error creating task: task is not grounded in the reviewed project. Flags: {}",
                    generic_plan_flags.join(" | "),
                );
            }

            let (auto_execute, risk, max_duration_minutes, requires_approval) =
                parse_task_policy(&args);
            let approved_for_execution = auto_execute && !requires_approval;
            let mut tags = vec![
                format!("project:{}", project_path),
                "ai_created".to_string(),
                format!("risk:{}", risk),
                "grounded_review".to_string(),
            ];

            if auto_execute {
                tags.push("auto_execute_requested".to_string());
            }

            let metadata = serde_json::json!({
                "description": description,
                "project_path": project_path,
                "auto_execute": auto_execute,
                "risk": risk,
                "max_duration_minutes": max_duration_minutes,
                "requires_approval": requires_approval,
                "approved_for_execution": approved_for_execution,
                "created_by": "llm",
                "review_artifact_path": review.artifact_path,
                "review_completed": true,
                "review_target_path": review.reviewed_path,
                "review_evidence_count": review.evidence_count,
                "reviewed_at": review.reviewed_at,
                "review_version": review.review_version,
                "plan_grounded": true,
                "generic_plan_flags": generic_plan_flags,
            });

            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                match service.create_task(
                    &args.title,
                    Some(&description),
                    &priority,
                    Some(&tags),
                    None,
                    Some(max_duration_minutes as i32),
                    Some(metadata),
                ) {
                    Ok(task_id) => {
                        info!("✅ Task created: {} ({})", task_id, args.title);
                        let execution_status = if approved_for_execution {
                            "Task approved for background execution."
                        } else if requires_approval {
                            "Task created and awaiting explicit approval before execution."
                        } else {
                            "Task created with auto-execution disabled by default."
                        };

                        format!(
                            "✅ TASK CREATED SUCCESSFULLY\n\
                             Task ID: {}\n\
                             Title: {}\n\
                             Priority: {}\n\
                             Project: {}\n\
                             Risk: {}\n\
                             Approval Required: {}\n\
                             Status: {}\n\
                             \n\
                             Auto Execute: {}
\
                             Review Artifact: {}",
                            task_id,
                            args.title,
                            priority,
                            project_path,
                            risk,
                            requires_approval,
                            execution_status,
                            auto_execute,
                            review.artifact_path
                        )
                    }
                    Err(e) => {
                        error!("❌ Failed to create task: {}", e);
                        format!("❌ Error creating task: {}", e)
                    }
                }
            } else {
                "❌ Database not available - cannot create task".to_string()
            }
        }
        _ => format!("Unknown tool: {}", tool_call.function.name),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tool_result_kind_classifies_tool_outcomes() {
        assert_eq!(tool_result_kind("ok"), "success");
        assert_eq!(
            tool_result_kind("Error parsing arguments: bad json"),
            "argument_error"
        );
        assert_eq!(
            tool_result_kind("❌ Error writing file: denied"),
            "tool_error"
        );
        assert_eq!(
            tool_result_kind("Tool 'read_file' timed out after 30s"),
            "timeout"
        );
        assert!(!tool_result_succeeded("Unknown tool: nope"));
    }

    #[test]
    fn tool_arg_summary_redacts_large_sensitive_fields() {
        let code_summary = summarize_tool_args(
            "execute_code",
            r#"{"language":"python","code":"print('secret-token')","confirmed":true}"#,
        )
        .to_string();
        assert!(code_summary.contains("code_chars"));
        assert!(code_summary.contains("python"));
        assert!(!code_summary.contains("secret-token"));

        let write_summary = summarize_tool_args(
            "write_file",
            r#"{"path":"C:\\dev\\apps\\nova-agent\\secret.txt","content":"api-key-value"}"#,
        )
        .to_string();
        assert!(write_summary.contains("content_chars"));
        assert!(write_summary.contains("extension"));
        assert!(!write_summary.contains("api-key-value"));
        assert!(!write_summary.contains("secret.txt"));
    }
}
