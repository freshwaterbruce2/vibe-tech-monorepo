use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, State};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Clone, Serialize)]
pub struct AgentStatus {
    id: String,
    status: String,
    pid: Option<u32>,
}

#[derive(Clone, Serialize)]
pub struct AgentLogPayload {
    id: String,
    log: String,
}

pub struct AgentOrchestratorState {
    pub running_agents: Mutex<HashMap<String, u32>>,
}

impl Default for AgentOrchestratorState {
    fn default() -> Self {
        Self {
            running_agents: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn start_agent(
    app: AppHandle,
    state: State<'_, AgentOrchestratorState>,
    id: String,
    cmd: String,
    cwd: String,
) -> Result<u32, String> {
    let mut args: Vec<&str> = cmd.split_whitespace().collect();
    if args.is_empty() {
        return Err("Empty command".to_string());
    }

    let program = args.remove(0);

    // Ensure we run the exact command needed, usually .cmd for Windows
    let program_exec = match program {
        "pnpm" => "pnpm.cmd",
        "cargo" => "cargo.exe",
        "python" => "python.exe",
        "npm" => "npm.cmd",
        _ => program,
    };

    let mut child = Command::new(program_exec)
        .args(args)
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to spawn agent {}: {}", id, e))?;

    let pid = child.id();

    // Handle stdout
    if let Some(stdout) = child.stdout.take() {
        let app_handle_out = app.clone();
        let id_out = id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    let _ = app_handle_out.emit(
                        "agent-log",
                        AgentLogPayload {
                            id: id_out.clone(),
                            log: l,
                        },
                    );
                }
            }
        });
    }

    // Handle stderr
    if let Some(stderr) = child.stderr.take() {
        let app_handle_err = app.clone();
        let id_err = id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    let _ = app_handle_err.emit(
                        "agent-log",
                        AgentLogPayload {
                            id: id_err.clone(),
                            log: format!("ERROR: {}", l),
                        },
                    );
                }
            }
        });
    }

    // Store PID
    if let Ok(mut map) = state.running_agents.lock() {
        map.insert(id.clone(), pid);
    }

    Ok(pid)
}

#[tauri::command]
pub fn stop_agent(state: State<'_, AgentOrchestratorState>, id: String) -> Result<String, String> {
    let pid_opt = {
        let mut map = state.running_agents.lock().unwrap();
        map.remove(&id)
    };

    if let Some(pid) = pid_opt {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        Ok(format!("Agent {} stopped (PID: {})", id, pid))
    } else {
        Err(format!("Agent {} is not running", id))
    }
}

#[tauri::command]
pub fn get_agent_status(state: State<'_, AgentOrchestratorState>) -> Vec<AgentStatus> {
    let map = state.running_agents.lock().unwrap();
    map.iter()
        .map(|(id, pid)| AgentStatus {
            id: id.clone(),
            status: "running".to_string(),
            pid: Some(*pid),
        })
        .collect()
}
