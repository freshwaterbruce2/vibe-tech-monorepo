use std::process::Command;

use tracing::{error, info};

fn handle_orchestrator_output(
    output_result: std::io::Result<std::process::Output>,
) -> Result<String, String> {
    match output_result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

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
        return Err("Desktop orchestration is disabled. Set NOVA_ENABLE_ORCHESTRATOR=true to enable.".to_string());
    }

    info!("Orchestrate desktop action for prompt: {}", prompt);

    // Invoke the Python sidecar that uses the orchestration harness.
    // This assumes `python` is available on PATH and the tools directory
    // is located at C:\dev\tools.
    let output = Command::new("python")
        .arg("C:\\dev\\tools\\nova_orchestrator.py")
        .arg(&prompt)
        .output();

    handle_orchestrator_output(output)
}

