use crate::modules::state::ChatMessage;
use serde::{Deserialize, Serialize};
use serde_json::json;
// ==========================================
// Shared Types
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct Tool {
    pub(super) r#type: String,
    pub(super) function: Function,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct Function {
    pub(super) name: String,
    pub(super) description: String,
    pub(super) parameters: serde_json::Value,
}

/// Kimi K2.5 thinking mode configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct ThinkingConfig {
    pub(super) r#type: String, // "enabled" or "disabled"
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct ChatCompletionRequest {
    pub(super) model: String,
    pub(super) messages: Vec<ChatMessage>,
    pub(super) temperature: f32,
    pub(super) max_tokens: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) tools: Option<Vec<Tool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) tool_choice: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) thinking: Option<ThinkingConfig>, // Kimi K2.5 specific
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct ChatCompletionChoice {
    pub(super) message: ChatMessage,
    pub(super) finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct ChatCompletionResponse {
    pub(super) choices: Vec<ChatCompletionChoice>,
}

// ==========================================
// Tools Definition
// ==========================================
pub(super) fn get_tools() -> Vec<Tool> {
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
