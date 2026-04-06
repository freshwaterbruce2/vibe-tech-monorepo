use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

#[derive(Debug, Clone)]
pub struct Config {
    #[allow(dead_code)] // Reserved for future multi-model support
    pub deepseek_api_key: String,
    #[allow(dead_code)]
    pub deepseek_base_url: String,
    #[allow(dead_code)]
    pub deepseek_model: String,
    #[allow(dead_code)]
    pub groq_api_key: String,
    #[allow(dead_code)]
    pub openrouter_api_key: String,
    #[allow(dead_code)]
    pub huggingface_api_key: String,
    #[allow(dead_code)]
    pub huggingface_base_url: String,
    pub kimi_api_key: String,
    pub database_path: String,
    pub workspace_root: String,
    pub deepcode_ws_url: String,
    pub deepcode_ipc_enabled: bool,
    pub trading_data_dir: String,
    pub trading_logs_dir: String,
    #[allow(dead_code)]
    pub chroma_url: String,
    pub lance_db_path: String,
    pub mobile_bridge_token: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        let mut database_path =
            env::var("DATABASE_PATH").unwrap_or_else(|_| "D:\\databases".to_string());

        // Handle case where DATABASE_PATH points to a file (common config error)
        if database_path.to_lowercase().ends_with(".db") {
            let path = std::path::Path::new(&database_path);
            if let Some(parent) = path.parent() {
                database_path = parent.to_string_lossy().to_string();
            }
        }

        Self {
            deepseek_api_key: env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "".to_string()),
            deepseek_base_url: env::var("DEEPSEEK_BASE_URL")
                .unwrap_or_else(|_| "https://api.deepseek.com/v1".to_string()),
            deepseek_model: env::var("DEEPSEEK_MODEL")
                .unwrap_or_else(|_| "deepseek-v3.2".to_string()),
            groq_api_key: env::var("GROQ_API_KEY").unwrap_or_else(|_| "".to_string()),
            openrouter_api_key: env::var("OPENROUTER_API_KEY").unwrap_or_else(|_| "".to_string()),
            huggingface_api_key: env::var("HUGGINGFACE_API_KEY").unwrap_or_else(|_| "".to_string()),
            huggingface_base_url: env::var("HUGGINGFACE_BASE_URL")
                .unwrap_or_else(|_| "https://api-inference.huggingface.co/v1".to_string()),
            kimi_api_key: env::var("KIMI_API_KEY")
                .or_else(|_| env::var("VITE_KIMI_API_KEY"))
                .unwrap_or_else(|_| "".to_string()),
            database_path,
            workspace_root: env::var("WORKSPACE_ROOT").unwrap_or_else(|_| "C:\\dev".to_string()),
            deepcode_ws_url: env::var("DEEPCODE_WS_URL")
                .unwrap_or_else(|_| "ws://127.0.0.1:5004".to_string()),
            deepcode_ipc_enabled: env::var("DEEPCODE_IPC_ENABLED")
                .map(|v| v.to_lowercase() == "true" || v == "1")
                .unwrap_or(false),
            trading_data_dir: env::var("TRADING_DATA_DIR")
                .unwrap_or_else(|_| "D:\\trading_data".to_string()),
            trading_logs_dir: env::var("TRADING_LOGS_DIR")
                .unwrap_or_else(|_| "D:\\trading_logs".to_string()),
            chroma_url: env::var("CHROMA_URL")
                .unwrap_or_else(|_| "http://localhost:8000".to_string()),
            lance_db_path: env::var("LANCE_DB_PATH")
                .unwrap_or_else(|_| "D:\\nova-agent-data\\lance-db".to_string()),
            mobile_bridge_token: env::var("MOBILE_BRIDGE_TOKEN").unwrap_or_else(|_| {
                let token = uuid::Uuid::new_v4().to_string();
                tracing::warn!(
                    "MOBILE_BRIDGE_TOKEN not set. Generated token: {}. Set this in .env or Settings.",
                    token
                );
                token
            }),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentState {
    pub active_conversations: Vec<String>,
    pub memory_count: usize,
    pub capabilities: Vec<String>,
    pub current_project: Option<String>,
    pub ipc_connected: bool,
    pub active_model: String,
    #[serde(default)]
    pub chat_history: Vec<ChatMessage>,
}

impl Default for AgentState {
    fn default() -> Self {
        Self {
            active_conversations: vec![],
            memory_count: 0,
            capabilities: vec![
                "memory".to_string(),
                "filesystem".to_string(),
                "code_execution".to_string(),
                "web_search".to_string(),
                "learning".to_string(),
            ],
            current_project: None,
            ipc_connected: false,
            active_model: std::env::var("NOVA_DEFAULT_MODEL")
                .unwrap_or_else(|_| "kimi-k2.5".to_string()),
            chat_history: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCall {
    pub id: String,
    pub r#type: String,
    pub function: ToolCallFunction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCallFunction {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Kimi K2.5 reasoning content (thinking mode output)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_content: Option<String>,
}

pub type AppState = Arc<AsyncMutex<AgentState>>;
