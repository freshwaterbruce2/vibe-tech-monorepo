// Vibe-Justice Desktop Application
// Tauri 2.x library with IPC commands for backend management

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

// Backend process state management
struct BackendState {
    process: Option<tauri_plugin_shell::process::CommandChild>,
    is_running: bool,
}

impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: None,
            is_running: false,
        }
    }
}

struct AppState {
    backend: Mutex<BackendState>,
    settings: Mutex<HashMap<String, serde_json::Value>>,
}

/// Backend status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendStatus {
    running: bool,
    port: u16,
    pid: Option<u32>,
    uptime: Option<u64>,
}

/// Start the Python FastAPI backend process
/// In development: assumes backend runs separately on port 8000
/// In production: spawns backend.exe from resources
#[tauri::command]
async fn start_backend(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Check current state and return early if already running
    {
        let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        if backend_state.is_running {
            return Ok("Backend already running".to_string());
        }
    }

    // Check if we're in development mode
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        // In development, assume backend is running manually
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        backend_state.is_running = true;
        return Ok("Development mode: Backend assumed running on localhost:8000".to_string());
    }

    // In production, spawn the backend sidecar
    let sidecar_command = app.shell().sidecar("backend")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    // Explicitly type the receiver to help type inference
    let (mut rx, child): (tauri::async_runtime::Receiver<CommandEvent>, tauri_plugin_shell::process::CommandChild) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn backend: {}", e))?;

    // Log backend output in background
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[Backend] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[Backend Error] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    println!("[Backend] Process terminated with code: {:?}", payload.code);
                }
                _ => {}
            }
        }
    });

    // Update state with the new process
    {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        backend_state.process = Some(child);
        backend_state.is_running = true;
    }

    // Wait a bit for backend to start (guard is dropped here)
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    Ok("Backend started successfully".to_string())
}

/// Stop the Python FastAPI backend process
#[tauri::command]
async fn stop_backend(state: State<'_, AppState>) -> Result<String, String> {
    // Extract process if running, update state
    let child_opt = {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;

        if !backend_state.is_running {
            return Ok("Backend not running".to_string());
        }

        backend_state.is_running = false;
        backend_state.process.take()
    };

    // Kill process outside of lock
    if let Some(child) = child_opt {
        child.kill().map_err(|e| format!("Failed to kill backend: {}", e))?;
    }

    Ok("Backend stopped".to_string())
}

/// Check if the backend is running
#[tauri::command]
fn is_backend_running(state: State<'_, AppState>) -> Result<bool, String> {
    let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
    Ok(backend_state.is_running)
}

/// Simple IPC ping test - returns "pong"
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Get application version
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get backend health status by checking the API
#[tauri::command]
async fn check_backend_health() -> Result<String, String> {
    let client = reqwest::Client::new();

    match client
        .get("http://localhost:8000/docs")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            Ok("Backend is healthy".to_string())
        }
        Ok(response) => {
            Err(format!("Backend returned status: {}", response.status()))
        }
        Err(e) => {
            Err(format!("Backend health check failed: {}", e))
        }
    }
}

/// Get detailed backend status
#[tauri::command]
fn get_backend_status(state: State<'_, AppState>) -> Result<BackendStatus, String> {
    let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
    let pid = backend_state.process.as_ref().map(|child| child.pid());
    Ok(BackendStatus {
        running: backend_state.is_running,
        port: 8000,
        pid,
        uptime: None,
    })
}

/// Get a setting value
#[tauri::command]
fn settings_get(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<serde_json::Value>, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.get(&key).cloned())
}

/// Set a setting value
#[tauri::command]
fn settings_set(
    state: State<'_, AppState>,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.insert(key, value);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            backend: Mutex::new(BackendState::default()),
            settings: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            is_backend_running,
            ping,
            get_app_version,
            check_backend_health,
            get_backend_status,
            settings_get,
            settings_set,
        ])
        .setup(|app| {
            // Auto-start backend on app launch
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Give the app time to initialize
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                // Try to start the backend
                let state: State<AppState> = handle.state();
                if let Err(e) = start_backend(handle.clone(), state).await {
                    eprintln!("Failed to auto-start backend: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent immediate close; stop backend synchronously before exiting
                api.prevent_close();
                let handle = window.app_handle().clone();
                let window_clone = window.clone();
                tauri::async_runtime::block_on(async move {
                    let state: State<AppState> = handle.state();
                    let _ = stop_backend(state).await;
                });
                // Now safe to close
                let _ = window_clone.destroy();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Ensure backend is terminated on exit
                let state: State<AppState> = app_handle.state();
                tauri::async_runtime::block_on(async {
                    let _ = stop_backend(state).await;
                });
            }
        });
}
