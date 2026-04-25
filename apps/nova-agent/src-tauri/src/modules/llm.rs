use crate::database;
use crate::modules::agents::AgentRegistry;
use crate::modules::credentials::{keys, CredentialStore};
use crate::modules::prompts;
use crate::modules::state::{AppState, ChatMessage, Config, ToolCall};
use crate::modules::system_prompt;
use crate::modules::{execution, filesystem, ml_learning, path_policy, web};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, error, info};

const MAX_TOOL_ARG_BYTES: usize = 20_000;
const MAX_DESCRIPTION_BYTES: usize = 16_384;
const MAX_QUERY_BYTES: usize = 1_024;
const MAX_TASK_DURATION_MINUTES: u64 = 240;
const MAX_TITLE_BYTES: usize = 256;
const MAX_HISTORY_MESSAGES: usize = 40;

#[derive(Debug, Deserialize)]
struct ExecuteCodeArgs {
    language: String,
    code: String,
    #[serde(default)]
    confirmed: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PathArg {
    path: String,
}

#[derive(Debug, Deserialize)]
struct WriteFileArgs {
    path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct SearchArg {
    query: String,
}

#[derive(Debug, Deserialize)]
struct InspectActionArg {
    action: String,
}

#[derive(Debug, Deserialize)]
struct CreateTaskArgs {
    title: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    project_path: Option<String>,
    #[serde(default)]
    priority: Option<String>,
    #[serde(default)]
    auto_execute: Option<bool>,
    #[serde(default)]
    risk: Option<String>,
    #[serde(default)]
    max_duration_minutes: Option<u64>,
    #[serde(default)]
    requires_approval: Option<bool>,
}

fn validate_tool_args(raw: &str) -> Result<serde_json::Value, String> {
    if raw.len() > MAX_TOOL_ARG_BYTES {
        return Err("Tool arguments payload is too large".to_string());
    }
    if raw
        .chars()
        .any(|c| c.is_control() && c != '\n' && c != '\r')
    {
        return Err("Tool arguments contain control characters".to_string());
    }
    serde_json::from_str(raw).map_err(|e| format!("Invalid tool args JSON: {}", e))
}

fn parse_tool_args<T: DeserializeOwned>(raw: &str) -> Result<T, String> {
    let value = validate_tool_args(raw)?;
    serde_json::from_value(value).map_err(|e| format!("Invalid tool args payload: {}", e))
}

fn is_path_token_blocked(path: &str) -> bool {
    let lowered = path.to_lowercase();
    lowered.contains("%2f")
        || lowered.contains("%5c")
        || path.contains("..\\")
        || path.contains("../")
        || path.contains('\0')
}

fn validate_title(title: &str) -> Result<(), String> {
    let trimmed = title.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_TITLE_BYTES {
        return Err("Title is invalid".to_string());
    }
    if trimmed.contains('\u{0}') || trimmed.chars().any(|c| c.is_control()) {
        return Err("Title contains invalid characters".to_string());
    }
    Ok(())
}

fn sanitize_description(text: &str) -> Result<(), String> {
    if text.is_empty() || text.len() > MAX_DESCRIPTION_BYTES {
        return Err("Description is invalid".to_string());
    }
    if text.contains('\u{0}')
        || text
            .chars()
            .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
    {
        return Err("Description contains invalid characters".to_string());
    }
    Ok(())
}

fn validate_search_query(query: &str) -> Result<(), String> {
    let trimmed = query.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_QUERY_BYTES {
        return Err("Search query is invalid".to_string());
    }
    if trimmed.contains('\u{0}')
        || trimmed
            .chars()
            .any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r')
    {
        return Err("Search query contains invalid characters".to_string());
    }
    Ok(())
}

fn validate_priority(priority: &str) -> Result<String, String> {
    let normalized = priority.trim().to_lowercase();
    if ["low", "medium", "high", "urgent"].contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err("Unsupported task priority".to_string())
    }
}

// ==========================================
// Shared Types
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Tool {
    r#type: String,
    function: Function,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Function {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

/// Kimi K2.5 thinking mode configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ThinkingConfig {
    r#type: String, // "enabled" or "disabled"
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Tool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    thinking: Option<ThinkingConfig>, // Kimi K2.5 specific
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionChoice {
    message: ChatMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatCompletionChoice>,
}

// ==========================================
// Tools Definition
// ==========================================
fn get_tools() -> Vec<Tool> {
    vec![
        Tool {
            r#type: "function".to_string(),
                function: Function {
                    name: "execute_code".to_string(),
                    description: "Execute code in a specific language (python, javascript, powershell, bash).".to_string(),
                    parameters: json!({
                        "type": "object",
                        "properties": {
                            "language": { "type": "string", "enum": ["python", "javascript", "bash", "powershell", "sh"] },
                            "code": { "type": "string", "description": "The code to execute" },
                            "confirmed": { "type": "boolean", "description": "Set true only when user has confirmed execution" }
                        },
                        "required": ["language", "code", "confirmed"]
                    }),
                },
            },
        Tool {
            r#type: "function".to_string(),
            function: Function {
                name: "read_file".to_string(),
                description: "Read the contents of a file.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "The absolute path to the file" }
                    },
                    "required": ["path"]
                }),
            },
        },
        Tool {
            r#type: "function".to_string(),
            function: Function {
                name: "write_file".to_string(),
                description: "Write content to a file.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "The absolute path to the file" },
                        "content": { "type": "string", "description": "The content to write" }
                    },
                    "required": ["path", "content"]
                }),
            },
        },
        Tool {
            r#type: "function".to_string(),
            function: Function {
                name: "list_directory".to_string(),
                description: "List contents of a directory (returns name, is_dir, is_file).".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "The absolute path to the directory" }
                    },
                    "required": ["path"]
                }),
            },
        },
        Tool {
            r#type: "function".to_string(),
            function: Function {
                name: "internet_search".to_string(),
                description: "Search the internet for information (avoids collision with native provider tools).".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "The search query" }
                    },
                    "required": ["query"]
                }),
            },
        },
        Tool {
            r#type: "function".to_string(),
            function: Function {
                name: "inspect_learning_system".to_string(),
                description: "Inspect internal learning system status, drift, and recent events.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["check_drift", "storage_efficiency", "recent_events"],
                            "description": "The inspection action to perform"
                        }
                    },
                    "required": ["action"]
                }),
            },
        },
        Tool {
            r#type: "function".to_string(),
                function: Function {
                    name: "create_task".to_string(),
                    description: "Create a new task to work on a project, fix a bug, or implement a feature. A grounded project review must already exist for the target path before the task can be queued.".to_string(),
                    parameters: json!({
                        "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Clear, concise task title (e.g., 'Fix vibeblox compilation errors')"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of what needs to be done, including context and requirements"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "urgent"],
                            "description": "Task priority level"
                        },
                        "auto_execute": {
                            "type": "boolean",
                            "description": "Require explicit approval before running task automatically"
                        },
                        "risk": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "critical"],
                            "description": "Estimated execution risk"
                        },
                        "max_duration_minutes": {
                            "type": "integer",
                            "description": "Maximum runtime allowed for this task in minutes"
                        },
                        "requires_approval": {
                            "type": "boolean",
                            "description": "Whether this task requires manual approval before execution"
                        },
                        "project_path": {
                            "type": "string",
                            "description": "Absolute path to the project (e.g., 'C:\\dev\\apps\\vibeblox')"
                        }
                    },
                    "required": ["title", "description", "project_path"]
                }),
            },
        },
    ]
}

fn parse_task_policy(payload: &CreateTaskArgs) -> (bool, String, u64, bool) {
    let auto_execute = payload.auto_execute.unwrap_or(false);
    let risk = payload
        .risk
        .as_ref()
        .map(|value| value.to_lowercase())
        .filter(|value| ["low", "medium", "high", "critical"].contains(&value.as_str()))
        .unwrap_or_else(|| "medium".to_string());

    let max_duration_minutes = payload
        .max_duration_minutes
        .unwrap_or(15)
        .min(MAX_TASK_DURATION_MINUTES)
        .max(1);

    let requires_approval = payload
        .requires_approval
        .unwrap_or(risk == "high" || risk == "critical");

    (auto_execute, risk, max_duration_minutes, requires_approval)
}

fn detect_generic_plan_flags(
    description: &str,
    project_path: &str,
    review: &crate::modules::project_review::ProjectReviewSummary,
) -> Vec<String> {
    let mut flags = Vec::new();
    let description_lower = description.to_lowercase();

    let placeholder_patterns = [
        "tbd",
        "to be determined",
        "placeholder",
        "your_project",
        "example project",
        "generic plan",
    ];

    if placeholder_patterns
        .iter()
        .any(|pattern| description_lower.contains(pattern))
    {
        flags.push("placeholder_language".to_string());
    }

    let missing_paths =
        crate::modules::project_review::collect_missing_path_references(description);
    if !missing_paths.is_empty() {
        flags.push(format!(
            "references_missing_paths: {}",
            missing_paths.join(", ")
        ));
    }

    let normalized_project_path = project_path.to_lowercase();
    let evidence_tokens = review
        .evidence_paths
        .iter()
        .filter_map(|path| {
            std::path::Path::new(path)
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.to_lowercase())
        })
        .collect::<Vec<_>>();

    if !evidence_tokens.is_empty()
        && !evidence_tokens
            .iter()
            .any(|token| description_lower.contains(token))
        && !description_lower.contains(&normalized_project_path)
    {
        flags.push("no_review_evidence_reference".to_string());
    }

    flags
}

async fn execute_tool_call(
    tool_call: &ToolCall,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> String {
    info!("Executing tool: {}", tool_call.function.name);

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

// ==========================================
// Provider Implementations
// ==========================================

async fn call_openai_compatible(
    api_key: &str,
    base_url: &str,
    model: &str,
    user_message: &str,
    history: Vec<ChatMessage>,
    system_prompt: &str,
    supports_tools: bool,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let tools = if supports_tools {
        Some(get_tools())
    } else {
        None
    };
    let tool_choice = if supports_tools {
        Some("auto".to_string())
    } else {
        None
    };

    let mut messages = vec![ChatMessage {
        role: "system".to_string(),
        content: Some(system_prompt.to_string()),
        tool_calls: None,
        tool_call_id: None,
        name: None,
        reasoning_content: None,
    }];

    // Add history (previous conversation)
    // Filter out any assistant messages with empty content (no tool_calls)
    // Moonshot/Kimi K2.5 rejects assistant messages with empty content
    for msg in history {
        let dominated_empty = msg.role == "assistant"
            && msg.tool_calls.is_none()
            && msg.content.as_ref().map_or(true, |c| c.trim().is_empty());
        if !dominated_empty {
            messages.push(msg);
        }
    }

    // Add current user message
    messages.push(ChatMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_calls: None,
        tool_call_id: None,
        name: None,
        reasoning_content: None,
    });

    let max_iterations = 15; // Increased for complex multi-tool tasks

    for _ in 0..max_iterations {
        // Kimi K2.5 Configuration:
        // - Temperature: 0.6 (instant mode) when using tools
        // - Thinking mode disabled for tool calling (avoids reasoning_content requirement)
        // - Max tokens: 32768 (Kimi supports up to 64K output)
        // - Context: 262K tokens
        // See: https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart
        let request = ChatCompletionRequest {
            model: model.to_string(),
            messages: messages.clone(),
            temperature: 0.6, // Instant mode for tool calling
            max_tokens: 32768,
            tools: tools.clone(),
            tool_choice: tool_choice.clone(),
            stream: Some(false),
            thinking: Some(ThinkingConfig {
                r#type: "disabled".to_string(),
            }),
        };

        // Treat `base_url` as an OpenAI-compatible API base (e.g. `.../v1` or `.../openai/v1`).
        // This keeps provider integration consistent across DeepSeek, Groq, and Hugging Face.
        let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

        let response_res = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await;

        let response = match response_res {
            Ok(res) => res,
            Err(e) => return Err(format!("Request failed: {}", e)),
        };

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("API error {}: {}", status, error_text));
        }

        let data: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        if let Some(choice) = data.choices.first() {
            let message = &choice.message;

            messages.push(message.clone());

            // Check if model wants to call tools
            if let Some(tool_calls) = &message.tool_calls {
                if !tool_calls.is_empty() {
                    info!("🔧 Executing {} tool call(s)...", tool_calls.len());
                    for tool_call in tool_calls {
                        let result = tokio::time::timeout(
                            std::time::Duration::from_secs(30),
                            execute_tool_call(tool_call, db.clone()),
                        )
                        .await
                        .unwrap_or_else(|_| {
                            format!("Tool '{}' timed out after 30s", tool_call.function.name)
                        });

                        messages.push(ChatMessage {
                            role: "tool".to_string(),
                            content: Some(result),
                            tool_calls: None,
                            tool_call_id: Some(tool_call.id.clone()),
                            name: Some(tool_call.function.name.clone()),
                            reasoning_content: None,
                        });
                    }
                    continue; // Continue loop to get model's response to tool results
                }
            }

            // No tool calls - return the content
            let final_content = message.content.clone().unwrap_or_default();
            if final_content.trim().is_empty() {
                return Ok("I processed your request but didn't generate a text response. Could you try rephrasing?".to_string());
            }
            return Ok(final_content);
        } else {
            return Err("No response from provider".to_string());
        }
    }

    // Max iterations reached - return last assistant message if available
    info!("⚠️ Max iterations reached, returning last response");
    for msg in messages.iter().rev() {
        if msg.role == "assistant" && msg.content.is_some() {
            return Ok(msg.content.clone().unwrap_or_default());
        }
    }

    Err("Max iterations reached - model stuck in tool loop".to_string())
}

// ==========================================
// Tauri Commands
// ==========================================

/// Helper to get API key from credential store with env fallback
fn get_api_key(key_name: &str, env_var: &str, config_value: &str) -> Option<String> {
    // Try credential store first (keys saved via UI)
    if let Ok(Some(key)) = CredentialStore::get_with_fallback(key_name, env_var) {
        if !key.is_empty() {
            return Some(key);
        }
    }
    // Fallback to config (loaded at startup from env)
    if !config_value.is_empty() {
        return Some(config_value.to_string());
    }
    None
}

/// Resolve provider config from the active_model string.
/// Supported prefixes/values:
///   - "openrouter:<model>" or "openrouter/*" → OpenRouter
///   - "kimi-*" or "moonshot-*"               → Moonshot/Kimi
///   - "deepseek-*"                           → DeepSeek
///   - "groq-*" or "groq:<model>"             → Groq
///   - "ollama:<model>"                       → Local Ollama
///   - bare model name                        → defaults to OpenRouter if key available, else Kimi
struct ProviderConfig {
    api_key: String,
    base_url: String,
    model: String,
    supports_tools: bool,
    provider_name: String,
}

fn resolve_provider(active_model: &str, config: &Config) -> Result<ProviderConfig, String> {
    let model_lower = active_model.to_lowercase();

    // --- Ollama (local, no API key needed) ---
    if model_lower.starts_with("ollama:") || model_lower.starts_with("ollama/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("llama3.1")
            .to_string();
        let base_url = std::env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());
        return Ok(ProviderConfig {
            api_key: "ollama".to_string(), // Ollama doesn't need a real key
            base_url,
            model,
            supports_tools: true,
            provider_name: "Ollama (local)".to_string(),
        });
    }

    // --- OpenRouter ---
    if model_lower.starts_with("openrouter:") || model_lower.starts_with("openrouter/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("anthropic/claude-sonnet-4")
            .to_string();
        let api_key = get_api_key(
            keys::OPENROUTER_API_KEY,
            "OPENROUTER_API_KEY",
            &config.openrouter_api_key,
        )
        .ok_or_else(|| {
            "OpenRouter API key not configured. Set OPENROUTER_API_KEY in Settings.".to_string()
        })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            model,
            supports_tools: true,
            provider_name: "OpenRouter".to_string(),
        });
    }

    // --- Moonshot / Kimi ---
    if model_lower.starts_with("kimi") || model_lower.starts_with("moonshot") {
        let model = if model_lower == "kimi" || model_lower == "moonshot" {
            "kimi-k2.5".to_string()
        } else {
            active_model.to_string()
        };
        let api_key = get_api_key(keys::KIMI_API_KEY, "KIMI_API_KEY", &config.kimi_api_key)
            .ok_or_else(|| {
                "Kimi API key not configured. Set KIMI_API_KEY in Settings.".to_string()
            })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.moonshot.ai/v1".to_string(),
            model,
            supports_tools: true,
            provider_name: "Moonshot (Kimi)".to_string(),
        });
    }

    // --- DeepSeek ---
    if model_lower.starts_with("deepseek") {
        let model = active_model.to_string();
        let api_key = get_api_key(
            keys::DEEPSEEK_API_KEY,
            "DEEPSEEK_API_KEY",
            &config.deepseek_api_key,
        )
        .ok_or_else(|| {
            "DeepSeek API key not configured. Set DEEPSEEK_API_KEY in Settings.".to_string()
        })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: config.deepseek_base_url.clone(),
            model,
            supports_tools: true,
            provider_name: "DeepSeek".to_string(),
        });
    }

    // --- Groq ---
    if model_lower.starts_with("groq:") || model_lower.starts_with("groq/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("llama-3.3-70b-versatile")
            .to_string();
        let api_key = get_api_key(keys::GROQ_API_KEY, "GROQ_API_KEY", &config.groq_api_key)
            .ok_or_else(|| {
                "Groq API key not configured. Set GROQ_API_KEY in Settings.".to_string()
            })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.groq.com/openai/v1".to_string(),
            model,
            supports_tools: true,
            provider_name: "Groq".to_string(),
        });
    }

    // --- Default fallback: try OpenRouter first (most flexible), then Kimi ---
    if let Some(api_key) = get_api_key(
        keys::OPENROUTER_API_KEY,
        "OPENROUTER_API_KEY",
        &config.openrouter_api_key,
    ) {
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            model: active_model.to_string(),
            supports_tools: true,
            provider_name: "OpenRouter (default)".to_string(),
        });
    }

    if let Some(api_key) = get_api_key(keys::KIMI_API_KEY, "KIMI_API_KEY", &config.kimi_api_key) {
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.moonshot.ai/v1".to_string(),
            model: "kimi-k2.5".to_string(),
            supports_tools: true,
            provider_name: "Moonshot (Kimi fallback)".to_string(),
        });
    }

    Err(
        "No LLM provider configured. Add an API key in Settings (OpenRouter recommended)."
            .to_string(),
    )
}

pub async fn dispatch_model_request(
    message: &str,
    history: Vec<ChatMessage>,
    system_prompt: &str,
    active_model: &str,
    config: &Config,
    db: &Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> Result<String, String> {
    let provider = resolve_provider(active_model, config)?;

    info!(
        "LLM Provider: {} | Model: {} | Endpoint: {}",
        provider.provider_name, provider.model, provider.base_url
    );
    info!(
        "API Key: {}...",
        &provider.api_key[..8.min(provider.api_key.len())]
    );

    call_openai_compatible(
        &provider.api_key,
        &provider.base_url,
        &provider.model,
        message,
        history,
        system_prompt,
        provider.supports_tools,
        db.clone(),
    )
    .await
}

#[tauri::command]
pub async fn chat_with_agent(
    message: String,
    _project_id: Option<String>,
    state: State<'_, AppState>,
    config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<String, String> {
    debug!("Received chat message: {}", message);

    let mut agent_state = state.lock().await;

    // Get active model, defaulting to Kimi k2.5 if empty
    let active_model = if agent_state.active_model.trim().is_empty() {
        "kimi-k2.5".to_string()
    } else {
        agent_state.active_model.clone()
    };

    // Update state to reflect what we are using (if it was empty)
    agent_state.active_model = active_model.clone();

    // Load 7-Layer System Prompt from file (with database/fallback)
    let system_prompt_content = system_prompt::load_system_prompt();

    // Use loaded prompt, or fallback to agent registry if file load fails
    let system_prompt = if system_prompt_content.len() > 100 {
        system_prompt_content
    } else {
        let registry = AgentRegistry::new();
        registry
            .get_agent("nova")
            .map(|agent| agent.system_prompt_template.clone())
            .unwrap_or_else(|| prompts::require_system_prompt("nova-core-v1"))
    };

    // Capture history for request
    let history = agent_state.chat_history.clone();

    // Release lock before long-running async call
    drop(agent_state);

    match dispatch_model_request(
        &message,
        history,
        &system_prompt,
        &active_model,
        &config,
        &db,
    )
    .await
    {
        Ok(res) => {
            // Re-acquire lock to update history
            let mut agent_state = state.lock().await;

            // Append User Message
            agent_state.chat_history.push(ChatMessage {
                role: "user".to_string(),
                content: Some(message.clone()),
                tool_calls: None,
                tool_call_id: None,
                name: None,
                reasoning_content: None,
            });

            // Append Assistant Response (only if non-empty to prevent API errors)
            if !res.trim().is_empty() {
                agent_state.chat_history.push(ChatMessage {
                    role: "assistant".to_string(),
                    content: Some(res.clone()),
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                    reasoning_content: None,
                });
            }

            // Keep last 40 messages to prevent unbounded memory growth (~20 turns)
            if agent_state.chat_history.len() > MAX_HISTORY_MESSAGES {
                let drain_count = agent_state.chat_history.len() - MAX_HISTORY_MESSAGES;
                agent_state.chat_history.drain(0..drain_count);
            }

            // Legacy support
            agent_state.active_conversations.push(message);
            Ok(res)
        }
        Err(e) => {
            // Log failure to DB
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.log_activity("System Error: Chat Failed", &e);
            }
            Err(format!("Chat Error: {}", e))
        }
    }
}

#[tauri::command]
pub async fn set_active_model(model: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut agent_state = state.lock().await;
    agent_state.active_model = model.clone();
    info!("Active model set to: {}", model);
    Ok(())
}

#[tauri::command]
pub async fn get_agent_status(
    state: State<'_, AppState>,
    db: State<'_, std::sync::Arc<tokio::sync::Mutex<Option<database::DatabaseService>>>>,
) -> Result<crate::modules::state::AgentState, String> {
    let mut agent_state = state.lock().await;

    if let Some(service) = db.lock().await.as_ref() {
        if let Ok(count) = service.get_memory_count() {
            agent_state.memory_count = count as usize;
        }
    }

    Ok(agent_state.clone())
}

#[tauri::command]
pub async fn update_capabilities(
    capabilities: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut agent_state = state.lock().await;
    agent_state.capabilities = capabilities;
    info!("Updated agent capabilities");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_tool_args_rejects_control_characters() {
        let result = validate_tool_args("{\"query\":\"bad\u{0001}\"}");
        assert!(result.is_err());
    }

    #[test]
    fn task_policy_defaults_to_safe_values() {
        let payload = CreateTaskArgs {
            title: "Review project".to_string(),
            description: Some("Inspect files".to_string()),
            project_path: Some(r"C:\dev\apps\nova-agent".to_string()),
            priority: Some("medium".to_string()),
            auto_execute: None,
            risk: None,
            max_duration_minutes: None,
            requires_approval: None,
        };

        let (auto_execute, risk, max_duration_minutes, requires_approval) =
            parse_task_policy(&payload);

        assert!(!auto_execute);
        assert_eq!(risk, "medium");
        assert_eq!(max_duration_minutes, 15);
        assert!(!requires_approval);
    }

    #[test]
    fn high_risk_tasks_require_approval() {
        let payload = CreateTaskArgs {
            title: "Run dangerous migration".to_string(),
            description: Some("Apply risky change".to_string()),
            project_path: Some(r"C:\dev\apps\nova-agent".to_string()),
            priority: Some("high".to_string()),
            auto_execute: Some(true),
            risk: Some("critical".to_string()),
            max_duration_minutes: Some(999),
            requires_approval: None,
        };

        let (auto_execute, risk, max_duration_minutes, requires_approval) =
            parse_task_policy(&payload);

        assert!(auto_execute);
        assert_eq!(risk, "critical");
        assert_eq!(max_duration_minutes, MAX_TASK_DURATION_MINUTES);
        assert!(requires_approval);
    }

    #[test]
    fn generic_plan_flags_require_review_evidence_references() {
        let review = crate::modules::project_review::ProjectReviewSummary {
            artifact_path: r"D:\databases\nova-agent\reviews\nova-agent.json".to_string(),
            reviewed_path: r"C:\dev\apps\nova-agent".to_string(),
            reviewed_at: "2026-03-09T10:00:00Z".to_string(),
            review_version: "grounded-review-v1".to_string(),
            evidence_count: 2,
            evidence_paths: vec![
                r"C:\dev\apps\nova-agent\package.json".to_string(),
                r"C:\dev\apps\nova-agent\src-tauri\src\task_executor.rs".to_string(),
            ],
        };

        let flags = detect_generic_plan_flags(
            "Create a comprehensive dashboard and write docs later",
            r"C:\dev\apps\nova-agent",
            &review,
        );

        assert!(flags
            .iter()
            .any(|flag| flag == "no_review_evidence_reference"));
    }
}
