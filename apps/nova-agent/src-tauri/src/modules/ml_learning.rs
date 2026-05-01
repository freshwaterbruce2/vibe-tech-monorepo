#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};
use tracing::{debug, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionData {
    pub agent_name: String,
    pub task_type: String,
    pub success: bool,
    pub tools_used: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokens_used: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approach: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monorepo_location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools_sequence: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_paths_modified: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct MLResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Call Python ML learning bridge.
/// Returns Err immediately (without spawning Python) when NOVA_ML_BRIDGE_ENABLED != "1".
/// This avoids the 500ms+ process-spawn overhead and "python not on PATH" errors
/// when the Python learning bridge is not in use.
fn call_python_bridge(command: &str, data: Option<&str>) -> Result<MLResponse, String> {
    if std::env::var("NOVA_ML_BRIDGE_ENABLED").as_deref() != Ok("1") {
        return Err(format!(
            "ML bridge disabled (set NOVA_ML_BRIDGE_ENABLED=1 to enable Python learning bridge)"
        ));
    }

    let script_path = std::env::var("NOVA_ML_BRIDGE_PATH")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("src/learning_bridge.py"));

    debug!("Calling ML learning bridge: {}", command);

    let mut child = Command::new("python")
        .arg(&script_path)
        .arg(command)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;

    // Write data to stdin if provided
    if let Some(json_data) = data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(json_data.as_bytes())
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        }
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for Python process: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("ML bridge error: {}", stderr);
        return Err(format!("Python bridge failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse ML bridge response: {}", e))
}

/// Log execution to ML learning system (with active learning filtering)
pub fn log_ml_execution(data: ExecutionData) -> Result<MLResponse, String> {
    let json_data = serde_json::to_string(&data)
        .map_err(|e| format!("Failed to serialize execution data: {}", e))?;

    call_python_bridge("log_execution", Some(&json_data))
}

/// Check for model drift
pub fn check_ml_drift() -> Result<MLResponse, String> {
    call_python_bridge("check_drift", None)
}

/// Get storage efficiency statistics
pub fn get_storage_efficiency() -> Result<MLResponse, String> {
    call_python_bridge("storage_efficiency", None)
}

#[tauri::command]
pub async fn ml_check_drift() -> Result<serde_json::Value, String> {
    match check_ml_drift() {
        Ok(response) => Ok(serde_json::json!({
            "available": response.success,
            "data": response.data,
            "error": response.error,
        })),
        Err(e) => Ok(serde_json::json!({
            "available": false,
            "data": null,
            "error": e,
        })),
    }
}

#[tauri::command]
pub async fn ml_storage_efficiency() -> Result<serde_json::Value, String> {
    match get_storage_efficiency() {
        Ok(response) => Ok(serde_json::json!({
            "available": response.success,
            "data": response.data,
            "error": response.error,
        })),
        Err(e) => Ok(serde_json::json!({
            "available": false,
            "data": null,
            "error": e,
        })),
    }
}
