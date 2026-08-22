// Vibe-Justice Desktop Application
// Tauri 2.x library with IPC commands for backend management

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

// Backend process state management
struct BackendState {
    process: Option<tauri_plugin_shell::process::CommandChild>,
    is_running: bool,
    is_starting: bool,
    generation: u64,
    observed_pid: Option<u32>,
}

impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: None,
            is_running: false,
            is_starting: false,
            generation: 0,
            observed_pid: None,
        }
    }
}

impl BackendState {
    fn begin_start(&mut self) -> Result<u64, String> {
        if self.is_starting {
            return Err("Backend startup is already in progress".to_string());
        }
        if self.is_running {
            return Err("Backend is already running".to_string());
        }
        self.is_starting = true;
        self.generation = self.generation.wrapping_add(1);
        Ok(self.generation)
    }

    fn clear_if_generation(&mut self, generation: u64) {
        if self.generation == generation {
            self.process = None;
            self.is_running = false;
            self.is_starting = false;
            self.observed_pid = None;
        }
    }

    fn cancel_if_generation(
        &mut self,
        generation: u64,
    ) -> Option<tauri_plugin_shell::process::CommandChild> {
        if self.generation != generation {
            return None;
        }
        self.is_running = false;
        self.is_starting = false;
        self.observed_pid = None;
        self.process.take()
    }

    fn stop_and_invalidate(&mut self) -> Option<tauri_plugin_shell::process::CommandChild> {
        self.generation = self.generation.wrapping_add(1);
        self.is_running = false;
        self.is_starting = false;
        self.observed_pid = None;
        self.process.take()
    }
}

struct AppState {
    backend: Mutex<BackendState>,
    settings: Mutex<HashMap<String, serde_json::Value>>,
    internal_api_key: String,
}

fn fail_start(state: &AppState, generation: u64, error: String) -> String {
    if let Ok(mut backend_state) = state.backend.lock() {
        backend_state.clear_if_generation(generation);
    }
    error
}

fn generate_internal_api_key() -> Result<String, String> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes)
        .map_err(|error| format!("Failed to generate internal API key: {error}"))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

#[derive(Deserialize)]
struct ReadyResponse {
    status: String,
    service: String,
    pid: u32,
    instance_id: String,
}

async fn wait_for_backend_ready(
    api_key: &str,
    expected_instance_id: Option<&str>,
    expected_pid: Option<u32>,
) -> Result<ReadyResponse, String> {
    let client = reqwest::Client::new();
    let url = "http://127.0.0.1:8000/api/ready";
    let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(15);
    loop {
        if let Ok(response) = client
            .get(url)
            .header("X-API-Key", api_key)
            .timeout(std::time::Duration::from_secs(1))
            .send()
            .await
        {
            if response.status().is_success() {
                if let Ok(ready) = response.json::<ReadyResponse>().await {
                    let identity_matches = expected_instance_id
                        .map(|expected| ready.instance_id == expected)
                        .unwrap_or(true);
                    let pid_matches = expected_pid
                        .map(|expected| ready.pid == expected)
                        .unwrap_or(true);
                    if ready.status == "ready"
                        && ready.service == "Vibe-Justice Backend"
                        && identity_matches
                        && pid_matches
                    {
                        return Ok(ready);
                    }
                }
            }
        }
        if tokio::time::Instant::now() >= deadline {
            return Err(
                "Expected authenticated backend instance did not become ready within 15 seconds"
                    .to_string(),
            );
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
    }
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
async fn start_backend(app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let generation = {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        if backend_state.is_running {
            return Ok("Backend already running".to_string());
        }
        backend_state.begin_start()?
    };

    // Check if we're in development mode
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        let ready = wait_for_backend_ready(&state.internal_api_key, None, None).await;
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        backend_state.is_starting = false;
        let ready = ready?;
        backend_state.is_running = true;
        backend_state.observed_pid = Some(ready.pid);
        return Ok("Development backend is healthy on 127.0.0.1:8000".to_string());
    }

    // In production, spawn the backend sidecar
    let app_data_dir = app.path().app_data_dir().map_err(|e| {
        fail_start(
            &state,
            generation,
            format!("Failed to resolve app data directory: {e}"),
        )
    })?;
    let data_dir = app_data_dir.join("data");
    let log_dir = app_data_dir.join("logs");
    let chroma_dir = app_data_dir.join("chroma");
    let internal_api_key = state.internal_api_key.clone();
    let instance_id = uuid::Uuid::new_v4().to_string();
    let sidecar_command = app
        .shell()
        .sidecar("backend")
        .map_err(|e| {
            fail_start(
                &state,
                generation,
                format!("Failed to create sidecar command: {e}"),
            )
        })?
        .env("VIBE_JUSTICE_ENV", "production")
        .env("VIBE_JUSTICE_BIND_HOST", "127.0.0.1")
        .env("VIBE_JUSTICE_ENABLE_DOCS", "false")
        .env("VIBE_JUSTICE_API_KEY", internal_api_key)
        .env("VIBE_JUSTICE_INSTANCE_ID", instance_id.clone())
        .env("VIBE_JUSTICE_DATA_DIR", data_dir)
        .env("VIBE_JUSTICE_LOG_DIR", log_dir)
        .env("VIBE_JUSTICE_CHROMA_DIR", chroma_dir);

    // Explicitly type the receiver to help type inference
    let (mut rx, child): (
        tauri::async_runtime::Receiver<CommandEvent>,
        tauri_plugin_shell::process::CommandChild,
    ) = sidecar_command
        .spawn()
        .map_err(|e| fail_start(&state, generation, format!("Failed to spawn backend: {e}")))?;
    let child_pid = child.pid();

    // Publish the child before listening so an immediate termination cannot leave stale state.
    let mut spawned_child = Some(child);
    {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        if backend_state.generation == generation && backend_state.is_starting {
            backend_state.process = spawned_child.take();
            backend_state.observed_pid = Some(child_pid);
        }
    }
    if let Some(child) = spawned_child {
        let _ = child.kill();
        return Err("Backend startup was cancelled".to_string());
    }

    // Log backend output and clear state when the process exits.
    let event_app = app.clone();
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
                    let state: State<AppState> = event_app.state();
                    if let Ok(mut backend_state) = state.backend.lock() {
                        backend_state.clear_if_generation(generation);
                    }
                }
                _ => {}
            }
        }
    });

    if let Err(error) =
        wait_for_backend_ready(&state.internal_api_key, Some(&instance_id), Some(child_pid)).await
    {
        let child = {
            let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
            backend_state.cancel_if_generation(generation)
        };
        if let Some(child) = child {
            let _ = child.kill();
        }
        return Err(error);
    }

    {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        if backend_state.generation != generation || backend_state.process.is_none() {
            return Err("Backend terminated during readiness validation".to_string());
        }
        backend_state.is_starting = false;
        backend_state.is_running = true;
    }

    Ok("Backend started successfully".to_string())
}

/// Stop the Python FastAPI backend process
#[tauri::command]
async fn stop_backend(state: State<'_, AppState>) -> Result<String, String> {
    let child_opt = {
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        backend_state.stop_and_invalidate()
    };

    // Kill process outside of lock
    if let Some(child) = child_opt {
        child
            .kill()
            .map_err(|e| format!("Failed to kill backend: {}", e))?;
    }

    Ok("Backend stopped or pending startup cancelled".to_string())
}

/// Check if the backend is running
#[tauri::command]
async fn is_backend_running(state: State<'_, AppState>) -> Result<bool, String> {
    let (owned, recorded_pid) = {
        let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        (backend_state.process.is_some(), backend_state.observed_pid)
    };
    if owned {
        return Ok(true);
    }
    let ready = wait_for_backend_ready(&state.internal_api_key, None, recorded_pid).await;
    let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
    backend_state.is_running = ready.is_ok();
    backend_state.observed_pid = ready.ok().map(|response| response.pid);
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
async fn check_backend_health(state: State<'_, AppState>) -> Result<String, String> {
    wait_for_backend_ready(&state.internal_api_key, None, None).await?;
    Ok("Authenticated backend is ready".to_string())
}

#[tauri::command]
fn get_internal_api_key(state: State<'_, AppState>) -> String {
    state.internal_api_key.clone()
}

/// Get detailed backend status
#[tauri::command]
async fn get_backend_status(state: State<'_, AppState>) -> Result<BackendStatus, String> {
    let (owned, recorded_pid) = {
        let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        (backend_state.process.is_some(), backend_state.observed_pid)
    };
    if !owned {
        let ready = wait_for_backend_ready(&state.internal_api_key, None, recorded_pid).await;
        let mut backend_state = state.backend.lock().map_err(|e| e.to_string())?;
        backend_state.is_running = ready.is_ok();
        backend_state.observed_pid = ready.ok().map(|response| response.pid);
    }
    let backend_state = state.backend.lock().map_err(|e| e.to_string())?;
    let pid = backend_state.observed_pid;
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
    let internal_api_key = if cfg!(debug_assertions) {
        std::env::var("VIBE_JUSTICE_API_KEY").unwrap_or_else(|_| {
            generate_internal_api_key()
                .expect("cryptographically secure internal API key generation failed")
        })
    } else {
        generate_internal_api_key()
            .expect("cryptographically secure internal API key generation failed")
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            backend: Mutex::new(BackendState::default()),
            settings: Mutex::new(HashMap::new()),
            internal_api_key,
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            is_backend_running,
            ping,
            get_app_version,
            check_backend_health,
            get_backend_status,
            get_internal_api_key,
            settings_get,
            settings_set,
        ])
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

#[cfg(test)]
mod tests {
    use super::BackendState;

    #[test]
    fn concurrent_starts_are_rejected() {
        let mut state = BackendState::default();
        assert_eq!(state.begin_start().unwrap(), 1);
        assert_eq!(
            state.begin_start().unwrap_err(),
            "Backend startup is already in progress"
        );
    }

    #[test]
    fn stale_termination_cannot_clear_a_new_generation() {
        let mut state = BackendState::default();
        let old_generation = state.begin_start().unwrap();
        state.is_starting = false;
        state.is_running = false;
        let new_generation = state.begin_start().unwrap();
        state.is_starting = false;
        state.is_running = true;
        state.observed_pid = Some(4242);

        state.clear_if_generation(old_generation);
        assert!(state.is_running);
        assert_eq!(state.observed_pid, Some(4242));

        state.clear_if_generation(new_generation);
        assert!(!state.is_running);
        assert_eq!(state.observed_pid, None);
    }

    #[test]
    fn stop_during_start_invalidates_pending_generation() {
        let mut state = BackendState::default();
        let pending_generation = state.begin_start().unwrap();

        assert!(state.stop_and_invalidate().is_none());
        assert!(!state.is_starting);
        assert!(!state.is_running);
        assert_ne!(state.generation, pending_generation);

        state.clear_if_generation(pending_generation);
        assert_eq!(state.generation, pending_generation.wrapping_add(1));
    }
}
