use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, OnceLock},
    time::Duration,
};

use tokio::{process::Command, sync::Semaphore, time::timeout};
use tracing::{error, info};
use uuid::Uuid;

const MAX_OUTPUT_BYTES: usize = 64 * 1024;
const MAX_RUNTIME_SECONDS: u64 = 30;
const MAX_CONCURRENT_EXECUTIONS: usize = 4;
const MAX_CODE_BYTES: usize = 200_000;
const MAX_EXTENDED_CODE_BYTES: usize = 2 * MAX_CODE_BYTES;

fn execution_gate() -> &'static Arc<Semaphore> {
    static EXEC_GATE: OnceLock<Arc<Semaphore>> = OnceLock::new();
    EXEC_GATE.get_or_init(|| Arc::new(Semaphore::new(MAX_CONCURRENT_EXECUTIONS)))
}

#[derive(Debug)]
struct RuntimeProfile {
    program: &'static str,
    extension: &'static str,
    args: fn(&Path) -> Vec<String>,
}

fn runtime_profile(language: &str) -> Option<RuntimeProfile> {
    match language {
        "python" | "python3" => Some(RuntimeProfile {
            program: "python",
            extension: "py",
            args: |path| vec![path.to_string_lossy().to_string()],
        }),
        "javascript" | "node" | "js" => Some(RuntimeProfile {
            program: "node",
            extension: "mjs",
            args: |path| vec![path.to_string_lossy().to_string()],
        }),
        "powershell" | "pwsh" => Some(RuntimeProfile {
            program: "powershell",
            extension: "ps1",
            args: |path| {
                vec![
                    "-NoProfile".to_string(),
                    "-NonInteractive".to_string(),
                    "-ExecutionPolicy".to_string(),
                    "Bypass".to_string(),
                    "-File".to_string(),
                    path.to_string_lossy().to_string(),
                ]
            },
        }),
        "bash" | "sh" => {
            if cfg!(windows) {
                Some(RuntimeProfile {
                    program: "bash",
                    extension: "sh",
                    args: |path| vec![path.to_string_lossy().to_string()],
                })
            } else {
                Some(RuntimeProfile {
                    program: "sh",
                    extension: "sh",
                    args: |path| vec![path.to_string_lossy().to_string()],
                })
            }
        }
        _ => None,
    }
}

fn sanitize_code_payload(code: &str) -> Result<(), String> {
    if code.trim().is_empty() {
        return Err("Code payload cannot be empty".to_string());
    }

    if code.len() > MAX_EXTENDED_CODE_BYTES {
        return Err(format!(
            "Code payload exceeds {} bytes",
            MAX_EXTENDED_CODE_BYTES
        ));
    }

    if code.contains('\u{0}') {
        return Err("Code payload contains invalid NUL bytes".to_string());
    }

    if code.len() > MAX_CODE_BYTES {
        return Err("Code payload too large for hard execution policy".to_string());
    }

    if code.chars().any(|c| c == '\u{007f}') {
        return Err("Code payload contains disallowed control characters".to_string());
    }

    Ok(())
}

fn validate_code_payload(code: &str) -> Result<(), String> {
    sanitize_code_payload(code)
}

fn write_temp_script(code: &str, extension: &str) -> Result<PathBuf, String> {
    let mut path = std::env::temp_dir();
    path.push(format!("nova_exec_{}.{}", Uuid::new_v4(), extension));
    fs::write(&path, code).map_err(|e| format!("Failed to create temporary script: {}", e))?;
    Ok(path)
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

async fn run_command(program: &str, args: Vec<String>) -> Result<std::process::Output, String> {
    let permit = execution_gate()
        .clone()
        .acquire_owned()
        .await
        .map_err(|e| format!("Execution gate unavailable: {}", e))?;

    let output = {
        let mut command = Command::new(program);
        command.args(args);
        command.output()
    };

    let finished = timeout(Duration::from_secs(MAX_RUNTIME_SECONDS), output).await;
    drop(permit);

    match finished {
        Ok(result) => result.map_err(|e| format!("Process execution failed: {}", e)),
        Err(_) => Err(format!(
            "Execution timed out after {} seconds",
            MAX_RUNTIME_SECONDS
        )),
    }
}

fn handle_output(output: std::process::Output) -> Result<String, String> {
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
            "Execution failed:\nStdout: {}\nStderr: {}",
            stdout, stderr
        ))
    }
}

#[tauri::command]
pub async fn execute_code(
    language: String,
    code: String,
    approved: Option<bool>,
) -> Result<String, String> {
    let enabled = std::env::var("NOVA_ENABLE_CODE_EXEC")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !enabled {
        return Err(
            "Code execution is disabled. Set NOVA_ENABLE_CODE_EXEC=true to enable.".to_string(),
        );
    }

    let requires_approval = true;
    if requires_approval && !approved.unwrap_or(false) {
        return Err("Code execution requires explicit confirmation".to_string());
    }

    let sanitized_code = code.trim_end_matches('\u{0}').to_string();
    validate_code_payload(&sanitized_code)?;

    let normalized = language.to_lowercase();
    let profile = runtime_profile(&normalized)
        .ok_or_else(|| format!("Unsupported language: {}", language))?;

    info!("Executing trusted runtime '{}'", profile.program);

    let script_path = write_temp_script(&sanitized_code, profile.extension)?;
    let output_result = run_command(profile.program, (profile.args)(&script_path)).await;

    let _ = fs::remove_file(&script_path);

    match output_result {
        Ok(output) => handle_output(output),
        Err(e) => {
            error!("Process execution error: {}", e);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_code_payload_rejects_empty_and_nul() {
        assert!(validate_code_payload("").is_err());
        assert!(validate_code_payload("print('x')\0").is_err());
    }

    #[tokio::test]
    async fn execute_code_requires_explicit_approval() {
        std::env::set_var("NOVA_ENABLE_CODE_EXEC", "true");

        let result =
            execute_code("python".to_string(), "print('ok')".to_string(), Some(false)).await;

        assert!(result.is_err());
        assert!(result
            .err()
            .unwrap_or_default()
            .contains("requires explicit confirmation"));
    }
}
