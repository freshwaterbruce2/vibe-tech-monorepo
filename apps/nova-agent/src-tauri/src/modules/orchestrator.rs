use std::{path::PathBuf, time::Duration};

use tokio::{process::Command, time::timeout};
use tracing::{error, info};

const DEFAULT_ORCHESTRATOR_SCRIPT: &str = "C:\\dev\\tools\\nova_orchestrator.py";
const MAX_PROMPT_BYTES: usize = 16 * 1024;
const MAX_OUTPUT_BYTES: usize = 64 * 1024;
const MAX_RUNTIME_SECONDS: u64 = 120;

fn validate_prompt(prompt: &str) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Desktop orchestration prompt cannot be empty".to_string());
    }

    if prompt.len() > MAX_PROMPT_BYTES {
        return Err(format!(
            "Desktop orchestration prompt exceeds {} bytes",
            MAX_PROMPT_BYTES
        ));
    }

    if prompt.contains('\u{0}') {
        return Err("Desktop orchestration prompt contains invalid NUL bytes".to_string());
    }

    Ok(())
}

fn orchestrator_script_path() -> PathBuf {
    std::env::var("NOVA_ORCHESTRATOR_SCRIPT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(DEFAULT_ORCHESTRATOR_SCRIPT))
}

fn truncate_output(raw: &str, limit: usize) -> String {
    if raw.len() <= limit {
        return raw.to_string();
    }

    let mut out = raw.chars().take(limit).collect::<String>();
    out.push_str("\n[output truncated]");
    out
}

fn strip_control_chars(input: &str) -> String {
    input
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t' || *c == '\r')
        .collect()
}

fn handle_orchestrator_output(
    output_result: std::io::Result<std::process::Output>,
) -> Result<String, String> {
    match output_result {
        Ok(output) => {
            let stdout = truncate_output(
                &strip_control_chars(&String::from_utf8_lossy(&output.stdout)),
                MAX_OUTPUT_BYTES,
            );
            let stderr = truncate_output(
                &strip_control_chars(&String::from_utf8_lossy(&output.stderr)),
                MAX_OUTPUT_BYTES,
            );

            if output.status.success() {
                if !stderr.is_empty() {
                    Ok(format!("{}\n(stderr): {}", stdout, stderr))
                } else {
                    Ok(stdout)
                }
            } else {
                Err(format!(
                    "Orchestrator failed:\nStdout: {}\nStderr: {}",
                    stdout, stderr
                ))
            }
        }
        Err(e) => {
            error!("Orchestrator process execution error: {}", e);
            Err(format!("Orchestrator process execution failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn orchestrate_desktop_action(prompt: String) -> Result<String, String> {
    let enabled = std::env::var("NOVA_ENABLE_ORCHESTRATOR")
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if !enabled {
        return Err(
            "Desktop orchestration is disabled. Set NOVA_ENABLE_ORCHESTRATOR=true to enable."
                .to_string(),
        );
    }

    validate_prompt(&prompt)?;

    let script_path = orchestrator_script_path();
    if !script_path.is_file() {
        return Err(format!(
            "Desktop orchestrator script not found: {}",
            script_path.display()
        ));
    }

    info!(
        "Orchestrate desktop action requested (prompt_bytes={})",
        prompt.len()
    );

    let python = std::env::var("NOVA_PYTHON").unwrap_or_else(|_| "python".to_string());
    let output = timeout(
        Duration::from_secs(MAX_RUNTIME_SECONDS),
        Command::new(python).arg(script_path).arg(&prompt).output(),
    )
    .await
    .map_err(|_| {
        format!(
            "Desktop orchestrator timed out after {} seconds",
            MAX_RUNTIME_SECONDS
        )
    })?;

    handle_orchestrator_output(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_prompt_rejects_empty_nul_and_large_payloads() {
        assert!(validate_prompt("").is_err());
        assert!(validate_prompt("hello\0").is_err());
        assert!(validate_prompt(&"x".repeat(MAX_PROMPT_BYTES + 1)).is_err());
        assert!(validate_prompt("open the app").is_ok());
    }

    #[test]
    fn output_is_sanitized_and_truncated() {
        let raw = format!("hello\u{0007}{}", "x".repeat(MAX_OUTPUT_BYTES + 10));
        let stripped = strip_control_chars(&raw);
        assert!(!stripped.contains('\u{0007}'));

        let truncated = truncate_output(&stripped, MAX_OUTPUT_BYTES);
        assert!(truncated.ends_with("[output truncated]"));
    }
}
