use serde::Serialize;
use std::path::Path;
use std::process::Command;
use std::time::Instant;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::CREATE_NO_WINDOW;

const COMMAND_CENTER_DIR: &str = "C:\\dev\\apps\\vibetech-command-center";
const MAX_OUTPUT_CHARS: usize = 120_000;

#[derive(Serialize, Clone)]
pub struct CommandCenterDiagnosticResult {
    pub diagnostic: String,
    pub transport: String,
    pub command: String,
    pub cwd: String,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub elapsed_ms: u128,
    pub stdout: String,
    pub stderr: String,
}

fn truncate_output(value: String) -> String {
    if value.len() <= MAX_OUTPUT_CHARS {
        return value;
    }

    let mut truncated = value;
    truncated.truncate(MAX_OUTPUT_CHARS);
    truncated.push_str("\n[vtde] output truncated");
    truncated
}

fn run_command_center_script(script_name: &str) -> Result<CommandCenterDiagnosticResult, String> {
    let cwd = Path::new(COMMAND_CENTER_DIR);
    if !cwd.exists() {
        return Err(format!(
            "Command Center directory not found: {}",
            COMMAND_CENTER_DIR
        ));
    }

    let command_display = if script_name == "probe:mcp" {
        "del tsconfig.mcp.tsbuildinfo; pnpm run build:mcp; pnpm run probe:mcp".to_string()
    } else {
        format!("pnpm run {}", script_name)
    };

    let started = Instant::now();
    let output = if script_name == "probe:mcp" {
        Command::new("cmd")
            .args([
                "/C",
                "if exist tsconfig.mcp.tsbuildinfo del /q tsconfig.mcp.tsbuildinfo & pnpm run build:mcp && pnpm run probe:mcp",
            ])
            .current_dir(cwd)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    } else {
        Command::new("pnpm")
            .args(["run", script_name])
            .current_dir(cwd)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    }
    .map_err(|err| {
        format!(
            "Failed to run Command Center diagnostic '{}': {}",
            script_name, err
        )
    })?;

    Ok(CommandCenterDiagnosticResult {
        diagnostic: script_name.to_string(),
        transport: "process".to_string(),
        command: command_display,
        cwd: COMMAND_CENTER_DIR.to_string(),
        exit_code: output.status.code(),
        success: output.status.success(),
        elapsed_ms: started.elapsed().as_millis(),
        stdout: truncate_output(String::from_utf8_lossy(&output.stdout).to_string()),
        stderr: truncate_output(String::from_utf8_lossy(&output.stderr).to_string()),
    })
}

#[tauri::command]
pub async fn probe_command_center_claude() -> Result<CommandCenterDiagnosticResult, String> {
    tauri::async_runtime::spawn_blocking(|| run_command_center_script("probe:claude"))
        .await
        .map_err(|err| format!("Command Center Claude probe task failed: {}", err))?
}

#[tauri::command]
pub async fn probe_command_center_mcp() -> Result<CommandCenterDiagnosticResult, String> {
    tauri::async_runtime::spawn_blocking(|| run_command_center_script("probe:mcp"))
        .await
        .map_err(|err| format!("Command Center MCP probe task failed: {}", err))?
}
