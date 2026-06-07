mod auth;
mod gemini;
pub mod pty;
mod orchestrator;
mod database_explorer;
mod affected;

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::System;

/// Track running app processes so we can kill them on window close.
static RUNNING_APPS: std::sync::LazyLock<Mutex<HashMap<u32, std::process::Child>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));
static RUNNING_WEB_APPS: std::sync::LazyLock<Mutex<HashMap<String, RunningWebApp>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));
static RUNNING_MEMORY_MCP_PID: std::sync::LazyLock<Mutex<Option<u32>>> =
    std::sync::LazyLock::new(|| Mutex::new(None));
static SELF_HEALING_RUN_STATE: std::sync::LazyLock<Mutex<SelfHealingRunState>> =
    std::sync::LazyLock::new(|| Mutex::new(SelfHealingRunState::default()));

const CREATE_NO_WINDOW: u32 = 0x08000000;
const ALLOWED_ROOTS: [&str; 2] = ["C:\\dev", "D:\\databases"];
const DEFAULT_PORT_START: u16 = 8100;
const DEFAULT_PORT_END: u16 = 8999;
const MAX_PORT_CANDIDATES: usize = 200;
const MEMORY_MCP_PORT: u16 = 3200;
const MAX_HEALING_LOG_FILES: usize = 200;
const MAX_HEALING_RESULTS_PER_CYCLE: usize = 250;

#[derive(Clone, Copy)]
struct RunningWebApp {
    pid: u32,
    port: u16,
}

struct SelfHealingRunState {
    child: Option<std::process::Child>,
    mode: Option<String>,
    started_at_ms: Option<u64>,
    last_exit_code: Option<i32>,
}

impl Default for SelfHealingRunState {
    fn default() -> Self {
        Self {
            child: None,
            mode: None,
            started_at_ms: None,
            last_exit_code: None,
        }
    }
}

#[derive(Serialize, Clone)]
pub struct SystemStats {
    pub cpu: f32,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub ram_percent: f32,
    pub disk_used_gb: f32,
    pub disk_total_gb: f32,
    pub disk_percent: f32,
}

#[derive(Serialize, Clone)]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub status: String,
    pub category: String,
    pub icon: String,
    pub launch_cmd: String,
    pub features: Vec<String>,
    pub port: Option<u16>,
    pub app_type: String, // "web" or "native"
}

#[derive(Serialize, Clone)]
pub struct LaunchResult {
    pub url: String,
    pub pid: u32,
    pub app_type: String,
}

#[derive(Serialize, Clone)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub last_modified: u64,
}

#[derive(Serialize, Clone)]
pub struct SelfHealingRunStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub mode: Option<String>,
    pub started_at_ms: Option<u64>,
    pub last_exit_code: Option<i32>,
}

fn canonicalize_existing_path(path: &str) -> Result<PathBuf, String> {
    fs::canonicalize(path).map_err(|e| format!("Invalid path '{}': {}", path, e))
}

fn canonical_allowed_roots() -> Result<Vec<PathBuf>, String> {
    ALLOWED_ROOTS
        .iter()
        .map(|root| fs::canonicalize(root).map_err(|e| format!("Failed to resolve root {}: {}", root, e)))
        .collect()
}

fn ensure_allowed_path(path: &str) -> Result<PathBuf, String> {
    let candidate = canonicalize_existing_path(path)?;
    let allowed_roots = canonical_allowed_roots()?;

    if allowed_roots.iter().any(|root| candidate.starts_with(root)) {
        Ok(candidate)
    } else {
        Err(format!(
            "Path is outside allowed roots ({}): {}",
            ALLOWED_ROOTS.join(", "),
            candidate.display()
        ))
    }
}

fn ensure_allowed_directory(path: &str) -> Result<PathBuf, String> {
    let candidate = ensure_allowed_path(path)?;
    if candidate.is_dir() {
        Ok(candidate)
    } else {
        Err(format!("Path is not a directory: {}", candidate.display()))
    }
}

fn build_port_candidates(preferred: Option<u16>) -> Vec<u16> {
    let mut candidates = Vec::with_capacity(MAX_PORT_CANDIDATES);
    if let Some(port) = preferred {
        candidates.push(port);
    }

    for port in DEFAULT_PORT_START..=DEFAULT_PORT_END {
        if Some(port) == preferred {
            continue;
        }
        candidates.push(port);
        if candidates.len() >= MAX_PORT_CANDIDATES {
            break;
        }
    }

    candidates
}

fn select_available_port_with<F>(preferred: Option<u16>, mut is_available: F) -> Option<u16>
where
    F: FnMut(u16) -> bool,
{
    for port in build_port_candidates(preferred) {
        if is_available(port) {
            return Some(port);
        }
    }
    None
}

fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

fn select_available_port(preferred: Option<u16>) -> Option<u16> {
    select_available_port_with(preferred, is_port_available)
}

fn probe_http_ready(port: u16, timeout: Duration) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = match TcpStream::connect_timeout(&addr, timeout) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    if stream
        .write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }

    let mut response_head = [0_u8; 16];
    match stream.read(&mut response_head) {
        Ok(bytes_read) => bytes_read > 0,
        Err(_) => false,
    }
}

fn wait_for_http_ready(port: u16, max_wait: Duration) -> bool {
    let start = Instant::now();
    let mut backoff = Duration::from_millis(150);

    while start.elapsed() < max_wait {
        if probe_http_ready(port, Duration::from_millis(500)) {
            return true;
        }
        std::thread::sleep(backoff);
        backoff = std::cmp::min(backoff + Duration::from_millis(150), Duration::from_millis(1_000));
    }

    false
}

fn reap_running_apps() {
    let mut dead_pids = HashSet::new();

    if let Ok(mut processes) = RUNNING_APPS.lock() {
        let tracked: Vec<u32> = processes.keys().copied().collect();
        for pid in tracked {
            let mut should_remove = false;
            if let Some(child) = processes.get_mut(&pid) {
                should_remove = matches!(child.try_wait(), Ok(Some(_)) | Err(_));
            }

            if should_remove {
                dead_pids.insert(pid);
                processes.remove(&pid);
            }
        }
    }

    if !dead_pids.is_empty() {
        if let Ok(mut web_apps) = RUNNING_WEB_APPS.lock() {
            web_apps.retain(|_, app| !dead_pids.contains(&app.pid));
        }
    }
}

fn remove_web_app_by_pid(pid: u32) {
    if let Ok(mut web_apps) = RUNNING_WEB_APPS.lock() {
        web_apps.retain(|_, app| app.pid != pid);
    }
}

fn clear_memory_mcp_pid_if_matches(pid: u32) {
    if let Ok(mut memory_pid) = RUNNING_MEMORY_MCP_PID.lock() {
        if memory_pid.is_some_and(|current| current == pid) {
            *memory_pid = None;
        }
    }
}

fn get_running_memory_mcp_pid() -> Option<u32> {
    let pid = RUNNING_MEMORY_MCP_PID.lock().ok().and_then(|value| *value)?;

    let is_alive = RUNNING_APPS
        .lock()
        .ok()
        .and_then(|mut processes| {
            let child = processes.get_mut(&pid)?;
            Some(matches!(child.try_wait(), Ok(None)))
        })
        .unwrap_or(false);

    if is_alive {
        Some(pid)
    } else {
        clear_memory_mcp_pid_if_matches(pid);
        None
    }
}

fn current_epoch_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn is_allowed_healing_loop(loop_name: &str) -> bool {
    matches!(loop_name, "lint" | "typecheck" | "dependencies" | "staleness")
}

fn refresh_self_healing_run_state(state: &mut SelfHealingRunState) {
    let finished_status = if let Some(child) = state.child.as_mut() {
        match child.try_wait() {
            Ok(Some(status)) => Some(status.code()),
            Ok(None) => None,
            Err(_) => Some(None),
        }
    } else {
        None
    };

    if let Some(exit_code) = finished_status {
        state.child = None;
        state.mode = None;
        state.started_at_ms = None;
        state.last_exit_code = exit_code;
    }
}

fn self_healing_status_from_state(state: &SelfHealingRunState) -> SelfHealingRunStatus {
    SelfHealingRunStatus {
        running: state.child.is_some(),
        pid: state.child.as_ref().map(|child| child.id()),
        mode: state.mode.clone(),
        started_at_ms: state.started_at_ms,
        last_exit_code: state.last_exit_code,
    }
}

#[tauri::command]
fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu = sys.global_cpu_usage();

    let ram_total = sys.total_memory() as f64 / 1_073_741_824.0;
    let ram_used = sys.used_memory() as f64 / 1_073_741_824.0;
    let ram_percent = if ram_total > 0.0 {
        (ram_used / ram_total * 100.0) as f32
    } else {
        0.0
    };

    let mut disk_total: f64 = 0.0;
    let mut disk_used: f64 = 0.0;
    for disk in sysinfo::Disks::new_with_refreshed_list().iter() {
        let total = disk.total_space() as f64 / 1_073_741_824.0;
        let available = disk.available_space() as f64 / 1_073_741_824.0;
        disk_total += total;
        disk_used += total - available;
    }
    let disk_percent = if disk_total > 0.0 {
        (disk_used / disk_total * 100.0) as f32
    } else {
        0.0
    };

    SystemStats {
        cpu,
        ram_used_gb: ram_used as f32,
        ram_total_gb: ram_total as f32,
        ram_percent,
        disk_used_gb: disk_used as f32,
        disk_total_gb: disk_total as f32,
        disk_percent,
    }
}

#[tauri::command]
fn get_apps() -> Vec<AppInfo> {
    reap_running_apps();
    let apps_dir = Path::new("C:\\dev\\apps");
    let mut apps = Vec::new();

    if let Ok(entries) = fs::read_dir(apps_dir) {
        for entry in entries.flatten() {
            let dir_name = entry.file_name().to_string_lossy().to_string();
            let vibe_path = entry.path().join("vibe-app.json");

            // Only show apps with vibe-app.json (curated launcher)
            if let Some(info) = read_vibe_app_json(&vibe_path, &dir_name) {
                apps.push(info);
            }
        }
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}

/// Read the VTDE-specific vibe-app.json manifest
fn read_vibe_app_json(path: &Path, dir_name: &str) -> Option<AppInfo> {
    let content = fs::read_to_string(path).ok()?;
    let m: serde_json::Value = serde_json::from_str(&content).ok()?;

    let name = m.get("displayName").and_then(|v| v.as_str()).unwrap_or(dir_name).to_string();
    let description = m.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let version = m.get("version").and_then(|v| v.as_str()).unwrap_or("0.0.0").to_string();
    let category = m.get("category").and_then(|v| v.as_str()).unwrap_or("utility").to_string();
    let icon = m
        .get("icon")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("/app-icons/{}.png", dir_name));
    let launch_cmd = m.get("launch").and_then(|v| v.as_str()).unwrap_or("pnpm dev").to_string();
    let features = m
        .get("features")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    let port = m.get("port").and_then(|v| v.as_u64()).map(|p| p as u16);
    let app_type = m
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| {
            if dir_name.contains("nova-agent") || dir_name.contains("vibe-code-studio") {
                "native"
            } else {
                "web"
            }
        })
        .to_string();

    // Detect build status for web apps
    let status = if app_type == "native" {
        "available".to_string()
    } else {
        let app_dir = path.parent().unwrap_or(Path::new("."));
        if app_dir.join("dist").exists() || app_dir.join("build").exists() || app_dir.join(".next").exists() {
            "ready".to_string()
        } else if app_dir.join("package.json").exists() {
            "unbuilt".to_string()
        } else {
            "available".to_string()
        }
    };

    Some(AppInfo {
        id: dir_name.to_string(),
        name,
        description,
        version,
        status,
        category,
        icon,
        launch_cmd,
        features,
        port,
        app_type,
    })
}

#[derive(Serialize, Clone)]
pub struct AppHealthInfo {
    pub id: String,
    pub has_dist: bool,
    pub has_package_json: bool,
    pub has_build_script: bool,
    pub status: String,
}

#[tauri::command]
fn check_app_health(app_id: String) -> Result<AppHealthInfo, String> {
    let app_dir = resolve_app_dir(&app_id)?;
    let has_dist = app_dir.join("dist").exists() || app_dir.join("build").exists() || app_dir.join(".next").exists();
    let pkg_path = app_dir.join("package.json");
    let has_package_json = pkg_path.exists();

    let has_build_script = if has_package_json {
        fs::read_to_string(&pkg_path)
            .ok()
            .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
            .and_then(|v| v.get("scripts")?.get("build").cloned())
            .is_some()
    } else {
        false
    };

    let status = if has_dist {
        "ready"
    } else if has_package_json && has_build_script {
        "unbuilt"
    } else {
        "available"
    };

    Ok(AppHealthInfo {
        id: app_id,
        has_dist,
        has_package_json,
        has_build_script,
        status: status.to_string(),
    })
}

/// Strip the Windows extended-length path prefix (`\\?\`) that `fs::canonicalize`
/// adds. CMD.exe does not support UNC paths as current directories.
fn strip_unc_prefix(path: PathBuf) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path
    }
}

fn resolve_app_dir(app_id: &str) -> Result<PathBuf, String> {
    if app_id.contains('\\') || app_id.contains('/') || app_id.contains("..") {
        return Err(format!("Invalid app id: {}", app_id));
    }

    let apps_root = strip_unc_prefix(
        fs::canonicalize("C:\\dev\\apps")
            .map_err(|e| format!("Failed to resolve app root C:\\dev\\apps: {}", e))?,
    );
    let app_dir = apps_root.join(app_id);

    if !app_dir.exists() {
        return Err(format!("App directory not found: {}", app_dir.display()));
    }

    let canonical_app_dir = strip_unc_prefix(
        fs::canonicalize(&app_dir).map_err(|e| format!("Failed to resolve app directory: {}", e))?,
    );
    if !canonical_app_dir.starts_with(&apps_root) {
        return Err(format!(
            "Resolved app directory escaped apps root: {}",
            canonical_app_dir.display()
        ));
    }

    Ok(canonical_app_dir)
}

fn spawn_static_server(app_dir: &Path, serve_dir: &str, port: u16) -> Result<std::process::Child, String> {
    std::process::Command::new("cmd")
        .env_remove("VITE_DEV_SERVER_URL")
        .args(["/C", &format!("npx -y serve --cors -s {} -l {}", serve_dir, port)])
        .current_dir(app_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start static server: {}", e))
}

fn reuse_running_web_app(app_id: &str) -> Option<LaunchResult> {
    reap_running_apps();
    let existing = RUNNING_WEB_APPS
        .lock()
        .ok()
        .and_then(|web_apps| web_apps.get(app_id).copied())?;

    let url = format!("http://localhost:{}", existing.port);
    if wait_for_http_ready(existing.port, Duration::from_secs(1)) {
        Some(LaunchResult {
            url,
            pid: existing.pid,
            app_type: "web".into(),
        })
    } else {
        if let Ok(mut processes) = RUNNING_APPS.lock() {
            if let Some(mut child) = processes.remove(&existing.pid) {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &existing.pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        if let Ok(mut web_apps) = RUNNING_WEB_APPS.lock() {
            web_apps.remove(app_id);
        }
        None
    }
}



#[tauri::command]
fn launch_app(app_id: String) -> Result<LaunchResult, String> {
    let app_dir = resolve_app_dir(&app_id)?;
    let app_dir_str = app_dir.to_string_lossy().to_string();

    // Read launch config from vibe-app.json
    let vibe_path = app_dir.join("vibe-app.json");
    let (launch_cmd, fixed_port, app_type) = if let Ok(content) = fs::read_to_string(&vibe_path) {
        if let Ok(m) = serde_json::from_str::<serde_json::Value>(&content) {
            let cmd = m.get("launch").and_then(|v| v.as_str()).unwrap_or("pnpm dev").to_string();
            let port = m.get("port").and_then(|v| v.as_u64()).map(|p| p as u16);
            let atype = m.get("type").and_then(|v| v.as_str()).unwrap_or("web").to_string();
            (cmd, port, atype)
        } else {
            ("pnpm dev".to_string(), None, "web".to_string())
        }
    } else {
        ("pnpm dev".to_string(), None, "web".to_string())
    };

    // Native apps — launch externally (can't iframe Tauri/Electron)
    if app_type == "native" {
        let child = std::process::Command::new("cmd")
            .env_remove("VITE_DEV_SERVER_URL")
            .args([
                "/C",
                "start",
                "cmd",
                "/K",
                &format!("cd /d {} && {}", app_dir_str, launch_cmd),
            ])
            .spawn()
            .map_err(|e| format!("Failed to launch {}: {}", app_id, e))?;
        let pid = child.id();
        return Ok(LaunchResult {
            url: String::new(),
            pid,
            app_type: "native".into(),
        });
    }

    if let Some(existing) = reuse_running_web_app(&app_id) {
        return Ok(existing);
    }

    // Determine the right folder to serve
    let serve_dir = if app_dir.join("dist").exists() {
        "dist"
    } else {
        "." // fallback
    };

    // Try preferred port first, then deterministic fallback candidates.
    let preferred = select_available_port(fixed_port)
        .or_else(|| select_available_port(None))
        .ok_or("No available ports for static app server".to_string())?;
    let mut candidates = build_port_candidates(Some(preferred)).into_iter();
    if let Some(fixed) = fixed_port {
        let mut initial = vec![fixed];
        initial.extend(build_port_candidates(Some(preferred)));
        candidates = initial.into_iter();
    }

    for port in candidates {
        if !is_port_available(port) {
            continue;
        }

        let child = match spawn_static_server(&app_dir, serve_dir, port) {
            Ok(child) => child,
            Err(_) => continue,
        };
        let pid = child.id();

        if let Ok(mut map) = RUNNING_APPS.lock() {
            map.insert(pid, child);
        }
        if let Ok(mut web_apps) = RUNNING_WEB_APPS.lock() {
            web_apps.insert(app_id.clone(), RunningWebApp { pid, port });
        }

        if wait_for_http_ready(port, Duration::from_secs(15)) {
            return Ok(LaunchResult {
                url: format!("http://localhost:{}", port),
                pid,
                app_type: "web".into(),
            });
        }

        if let Ok(mut map) = RUNNING_APPS.lock() {
            if let Some(mut failed_child) = map.remove(&pid) {
                let _ = failed_child.kill();
                let _ = failed_child.wait();
            }
        }
        remove_web_app_by_pid(pid);
    }

    Err(format!(
        "Failed to start static server for {} after trying {} ports",
        app_id, MAX_PORT_CANDIDATES
    ))
}

#[tauri::command]
async fn start_memory_mcp() -> Result<u32, String> {
    if probe_http_ready(MEMORY_MCP_PORT, Duration::from_millis(300)) {
        if let Some(pid) = get_running_memory_mcp_pid() {
            return Ok(pid);
        }
    }

    if let Some(pid) = get_running_memory_mcp_pid() {
        return Ok(pid);
    }

    // Navigate to memory-mcp and run pnpm start
    let child = std::process::Command::new("pnpm")
        .args(["start"])
        .current_dir("c:\\dev\\apps\\memory-mcp")
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start memory MCP: {}", e))?;

    let pid = child.id();

    if let Ok(mut map) = RUNNING_APPS.lock() {
        map.insert(pid, child);
    }
    if let Ok(mut memory_pid) = RUNNING_MEMORY_MCP_PID.lock() {
        *memory_pid = Some(pid);
    }

    if wait_for_http_ready(MEMORY_MCP_PORT, Duration::from_secs(20)) {
        return Ok(pid);
    }

    if let Ok(mut map) = RUNNING_APPS.lock() {
        if let Some(mut failed_child) = map.remove(&pid) {
            let _ = failed_child.kill();
            let _ = failed_child.wait();
        }
    }
    clear_memory_mcp_pid_if_matches(pid);

    Err("Memory MCP started but did not become ready on port 3200".to_string())
}


#[tauri::command]
fn read_directory(path: &str) -> Result<Vec<DirectoryEntry>, String> {
    let allowed_path = ensure_allowed_directory(path)?;
    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&allowed_path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            let metadata = entry.metadata().map_err(|e| e.to_string())?;

            let last_modified = metadata
                .modified()
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                .duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            entries.push(DirectoryEntry {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: path_buf.to_string_lossy().into_owned(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                last_modified,
            });
        }
    }

    // Sort: directories first, then alphabetical
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[tauri::command]
fn read_file_content(path: &str) -> Result<String, String> {
    let allowed_path = ensure_allowed_path(path)?;
    fs::read_to_string(allowed_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn execute_monorepo_action(path: &str, action: &str) -> Result<u32, String> {
    let allowed_path = ensure_allowed_directory(path)?;
    let workspace_root = fs::canonicalize("C:\\dev")
        .map_err(|e| format!("Failed to resolve workspace root C:\\dev: {}", e))?;
    if !allowed_path.starts_with(&workspace_root) {
        return Err(format!(
            "Monorepo actions are restricted to {}",
            workspace_root.display()
        ));
    }
    let mut cmd = std::process::Command::new("cmd");

    match action {
        "pnpm dev" => {
            cmd.args(["/C", "pnpm dev"]);
            // Open in new window for dev server so user can see it
        }
        "code ." => {
            cmd.args(["/C", "code ."]);
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        "explorer ." => {
            cmd.args(["/C", "explorer ."]);
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        _ => return Err(format!("Unsupported action: {}", action)),
    }

    let child = cmd
        .current_dir(allowed_path)
        .spawn()
        .map_err(|e| format!("Failed to execute action: {}", e))?;

    Ok(child.id())
}

#[tauri::command]
fn stop_app(pid: u32) -> Result<String, String> {
    reap_running_apps();

    // Try our tracked processes first
    if let Ok(mut map) = RUNNING_APPS.lock() {
        if let Some(mut child) = map.remove(&pid) {
            let _ = child.kill();
            let _ = child.wait();
            remove_web_app_by_pid(pid);
            clear_memory_mcp_pid_if_matches(pid);
            return Ok(format!("Stopped app (PID {})", pid));
        }
    }

    // Fallback: kill process tree via taskkill (catches child processes)
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();

    remove_web_app_by_pid(pid);
    clear_memory_mcp_pid_if_matches(pid);

    Ok(format!("Killed process tree (PID {})", pid))
}

// ── Healing Dashboard ────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct HealingResult {
    pub timestamp: String,
    pub error_type: String,
    pub project: String,
    pub confidence: f64,
    pub approved: bool,
    pub reason: String,
    pub fix_applied: Option<String>,
    pub verified: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HealingCycle {
    pub timestamp: String,
    pub dry_run: bool,
    pub elapsed_seconds: f64,
    pub ralph_issues: u32,
    pub drift_alerts: u32,
    pub fixable_issues: u32,
    pub fixes_attempted: u32,
    pub fixes_verified: u32,
    pub results: Vec<HealingResult>,
}

#[derive(Serialize, Clone)]
pub struct HealingSummary {
    pub total_cycles: u32,
    pub total_issues: u32,
    pub total_fixes: u32,
    pub total_verified: u32,
    pub last_run: Option<String>,
    pub avg_elapsed: f64,
}

fn parse_u32(value: Option<&serde_json::Value>) -> Option<u32> {
    value.and_then(|raw| {
        raw.as_u64()
            .and_then(|num| u32::try_from(num).ok())
            .or_else(|| {
                raw.as_i64().and_then(|num| {
                    if num >= 0 {
                        u32::try_from(num as u64).ok()
                    } else {
                        None
                    }
                })
            })
            .or_else(|| {
                raw.as_f64().and_then(|num| {
                    if num.is_finite() && num >= 0.0 && num <= (u32::MAX as f64) {
                        Some(num as u32)
                    } else {
                        None
                    }
                })
            })
    })
}

fn parse_f64(value: Option<&serde_json::Value>) -> Option<f64> {
    value.and_then(|raw| {
        raw.as_f64()
            .or_else(|| raw.as_u64().map(|num| num as f64))
            .or_else(|| raw.as_i64().map(|num| num as f64))
    })
}

fn parse_report_cycle(value: &serde_json::Value, file_name: &str) -> Option<HealingCycle> {
    let loops = value.get("loops").and_then(|v| v.as_array())?;
    let summary = value.get("summary");

    let timestamp = value
        .get("timestamp")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| file_name.trim_end_matches(".json").to_string());

    let total_issues_found = parse_u32(summary.and_then(|v| v.get("total_issues_found")))
        .unwrap_or_else(|| loops.iter().map(|loop_entry| parse_u32(loop_entry.get("issues_found")).unwrap_or(0)).sum());
    let total_issues_fixed = parse_u32(summary.and_then(|v| v.get("total_issues_fixed")))
        .unwrap_or_else(|| loops.iter().map(|loop_entry| parse_u32(loop_entry.get("issues_fixed")).unwrap_or(0)).sum());
    let total_issues_blocked = parse_u32(summary.and_then(|v| v.get("total_issues_blocked")))
        .unwrap_or_else(|| loops.iter().map(|loop_entry| parse_u32(loop_entry.get("issues_blocked")).unwrap_or(0)).sum());
    let elapsed_seconds = parse_f64(summary.and_then(|v| v.get("total_duration_seconds"))).unwrap_or_else(|| {
        loops.iter().map(|loop_entry| parse_f64(loop_entry.get("duration_seconds")).unwrap_or(0.0)).sum()
    });

    let dry_run = loops.iter().any(|loop_entry| {
        loop_entry
            .get("status")
            .and_then(|v| v.as_str())
            .map(|status| status.eq_ignore_ascii_case("dry_run"))
            .unwrap_or(false)
            || loop_entry
                .get("details")
                .and_then(|v| v.as_array())
                .map(|details| {
                    details.iter().any(|detail| {
                        detail
                            .get("action")
                            .and_then(|v| v.as_str())
                            .map(|action| action.eq_ignore_ascii_case("dry_run"))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false)
    });

    let ralph_issues: u32 = loops
        .iter()
        .filter(|loop_entry| {
            loop_entry
                .get("loop_name")
                .and_then(|v| v.as_str())
                .map(|loop_name| loop_name.to_ascii_lowercase().contains("ralph"))
                .unwrap_or(false)
        })
        .map(|loop_entry| parse_u32(loop_entry.get("issues_found")).unwrap_or(0))
        .sum();

    let drift_alerts: u32 = loops
        .iter()
        .filter(|loop_entry| {
            loop_entry
                .get("loop_name")
                .and_then(|v| v.as_str())
                .map(|loop_name| loop_name.to_ascii_lowercase().contains("drift"))
                .unwrap_or(false)
        })
        .map(|loop_entry| parse_u32(loop_entry.get("issues_found")).unwrap_or(0))
        .sum();

    let mut results: Vec<HealingResult> = Vec::new();
    for loop_entry in loops {
        let loop_name = loop_entry.get("loop_name").and_then(|v| v.as_str()).unwrap_or("healing_loop");
        let loop_status = loop_entry.get("status").and_then(|v| v.as_str()).unwrap_or("unknown");
        let loop_timestamp = loop_entry
            .get("started_at")
            .and_then(|v| v.as_str())
            .unwrap_or(timestamp.as_str());

        if let Some(details) = loop_entry.get("details").and_then(|v| v.as_array()) {
            for detail in details {
                if results.len() >= MAX_HEALING_RESULTS_PER_CYCLE {
                    break;
                }

                let action = detail
                    .get("action")
                    .and_then(|v| v.as_str())
                    .unwrap_or(loop_status);

                let approved =
                    action.eq_ignore_ascii_case("applied") || action.eq_ignore_ascii_case("fixed");

                results.push(HealingResult {
                    timestamp: detail
                        .get("timestamp")
                        .and_then(|v| v.as_str())
                        .unwrap_or(loop_timestamp)
                        .to_string(),
                    error_type: detail
                        .get("error_type")
                        .and_then(|v| v.as_str())
                        .or_else(|| detail.get("type").and_then(|v| v.as_str()))
                        .unwrap_or(loop_name)
                        .to_string(),
                    project: detail
                        .get("project")
                        .and_then(|v| v.as_str())
                        .or_else(|| detail.get("file").and_then(|v| v.as_str()))
                        .unwrap_or(loop_name)
                        .to_string(),
                    confidence: parse_f64(detail.get("confidence")).unwrap_or(0.5),
                    approved,
                    reason: detail
                        .get("reason")
                        .and_then(|v| v.as_str())
                        .or_else(|| detail.get("message").and_then(|v| v.as_str()))
                        .unwrap_or(loop_status)
                        .to_string(),
                    fix_applied: detail
                        .get("fix_applied")
                        .and_then(|v| v.as_str())
                        .or_else(|| detail.get("fix").and_then(|v| v.as_str()))
                        .map(str::to_string),
                    verified: detail
                        .get("verified")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(approved),
                });
            }
        }

        if results.len() >= MAX_HEALING_RESULTS_PER_CYCLE {
            break;
        }
    }

    Some(HealingCycle {
        timestamp,
        dry_run,
        elapsed_seconds,
        ralph_issues,
        drift_alerts,
        fixable_issues: total_issues_found,
        fixes_attempted: total_issues_fixed,
        fixes_verified: total_issues_fixed.saturating_sub(total_issues_blocked),
        results,
    })
}

fn parse_healing_log_content(content: &str, file_name: &str) -> Option<HealingCycle> {
    if let Ok(cycle) = serde_json::from_str::<HealingCycle>(content) {
        return Some(cycle);
    }

    let value = serde_json::from_str::<serde_json::Value>(content).ok()?;
    parse_report_cycle(&value, file_name)
}

#[tauri::command]
fn get_healing_logs() -> Vec<HealingCycle> {
    let log_dir = Path::new("D:\\logs\\self-healing");
    let mut cycles = Vec::new();
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let is_supported = (name.starts_with("cycle_") || name.starts_with("report_")) && name.ends_with(".json");
            if !is_supported {
                continue;
            }

            let modified = entry
                .metadata()
                .and_then(|metadata| metadata.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

            files.push((modified, path, name));
        }
    }

    files.sort_by(|a, b| b.0.cmp(&a.0));

    for (_, path, name) in files.into_iter().take(MAX_HEALING_LOG_FILES) {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Some(cycle) = parse_healing_log_content(&content, &name) {
                if !cycle.timestamp.is_empty() {
                    cycles.push(cycle);
                }
            }
        }
    }

    cycles.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    cycles
}

#[tauri::command]
fn get_healing_summary() -> HealingSummary {
    let logs = get_healing_logs();
    let total_cycles = logs.len() as u32;
    let total_issues: u32 = logs.iter().map(|c| c.fixable_issues).sum();
    let total_fixes: u32 = logs.iter().map(|c| c.fixes_attempted).sum();
    let total_verified: u32 = logs.iter().map(|c| c.fixes_verified).sum();
    let avg_elapsed = if total_cycles > 0 {
        logs.iter().map(|c| c.elapsed_seconds).sum::<f64>() / total_cycles as f64
    } else {
        0.0
    };
    let last_run = logs.first().map(|c| c.timestamp.clone());

    HealingSummary {
        total_cycles,
        total_issues,
        total_fixes,
        total_verified,
        last_run,
        avg_elapsed,
    }
}

#[tauri::command]
fn get_self_healing_run_status() -> SelfHealingRunStatus {
    if let Ok(mut state) = SELF_HEALING_RUN_STATE.lock() {
        refresh_self_healing_run_state(&mut state);
        self_healing_status_from_state(&state)
    } else {
        SelfHealingRunStatus {
            running: false,
            pid: None,
            mode: None,
            started_at_ms: None,
            last_exit_code: None,
        }
    }
}

#[tauri::command]
fn start_self_healing_run(
    dry_run: Option<bool>,
    skip_notify: Option<bool>,
    loop_name: Option<String>,
) -> Result<SelfHealingRunStatus, String> {
    let dry_run = dry_run.unwrap_or(true);
    let skip_notify = skip_notify.unwrap_or(true);

    if let Some(loop_value) = loop_name.as_deref() {
        if !is_allowed_healing_loop(loop_value) {
            return Err(format!("Unsupported self-healing loop: {}", loop_value));
        }
    }

    let script_path = Path::new("C:\\dev\\scripts\\self-healing-cron.ps1");
    if !script_path.exists() {
        return Err(format!(
            "Self-healing script not found: {}",
            script_path.display()
        ));
    }

    let mut args = vec![
        "-NoLogo".to_string(),
        "-NoProfile".to_string(),
        "-ExecutionPolicy".to_string(),
        "Bypass".to_string(),
        "-File".to_string(),
        script_path.to_string_lossy().to_string(),
    ];

    if dry_run {
        args.push("-DryRun".to_string());
    }
    if skip_notify {
        args.push("-SkipNotify".to_string());
    }
    if let Some(loop_value) = loop_name.as_ref() {
        args.push("-Loop".to_string());
        args.push(loop_value.clone());
    }

    let mut state = SELF_HEALING_RUN_STATE
        .lock()
        .map_err(|_| "Failed to lock self-healing run state".to_string())?;
    refresh_self_healing_run_state(&mut state);

    if state.child.is_some() {
        let status = self_healing_status_from_state(&state);
        return Err(format!(
            "A self-healing run is already active (PID {})",
            status.pid.unwrap_or(0)
        ));
    }

    let spawn_with = |shell: &str| {
        std::process::Command::new(shell)
            .args(args.iter().map(String::as_str))
            .current_dir("C:\\dev")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
    };

    let child = spawn_with("pwsh")
        .or_else(|_| spawn_with("powershell.exe"))
        .map_err(|e| format!("Failed to start self-healing run: {}", e))?;

    let base_mode = if dry_run { "dry_run" } else { "live" };
    let mode = if let Some(loop_value) = loop_name.as_ref() {
        format!("{}:{}", base_mode, loop_value)
    } else {
        base_mode.to_string()
    };

    state.last_exit_code = None;
    state.started_at_ms = Some(current_epoch_ms());
    state.mode = Some(mode);
    state.child = Some(child);

    Ok(self_healing_status_from_state(&state))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_port_candidates_prioritizes_preferred_port() {
        let candidates = build_port_candidates(Some(8450));
        assert!(!candidates.is_empty());
        assert_eq!(candidates[0], 8450);
    }

    #[test]
    fn select_available_port_uses_first_available_candidate() {
        let selected = select_available_port_with(Some(8400), |port| port == 8102);
        assert_eq!(selected, Some(8102));
    }

    #[test]
    fn validates_allowed_self_healing_loop_names() {
        assert!(is_allowed_healing_loop("lint"));
        assert!(is_allowed_healing_loop("typecheck"));
        assert!(!is_allowed_healing_loop("unknown"));
    }

    #[test]
    fn parses_legacy_healing_cycle_json() {
        let legacy = r#"{
          "timestamp":"2026-02-13T04:01:58.689635",
          "dry_run":true,
          "elapsed_seconds":12.5,
          "ralph_issues":2,
          "drift_alerts":1,
          "fixable_issues":7,
          "fixes_attempted":3,
          "fixes_verified":2,
          "results":[]
        }"#;

        let parsed = parse_healing_log_content(legacy, "cycle_20260213_040158.json");
        assert!(parsed.is_some());
        let cycle = parsed.expect("legacy cycle should parse");
        assert!(cycle.dry_run);
        assert_eq!(cycle.fixable_issues, 7);
        assert_eq!(cycle.fixes_attempted, 3);
        assert_eq!(cycle.fixes_verified, 2);
    }

    #[test]
    fn parses_report_healing_json_and_maps_fields() {
        let report = serde_json::json!({
            "timestamp": "2026-02-20T06:42:55.401333",
            "summary": {
                "total_issues_found": 3,
                "total_issues_fixed": 1,
                "total_issues_blocked": 0,
                "total_duration_seconds": 7.95
            },
            "loops": [{
                "loop_name": "dependencies",
                "status": "dry_run",
                "started_at": "2026-02-20T06:42:47.451246",
                "issues_found": 3,
                "issues_fixed": 1,
                "issues_blocked": 0,
                "details": [{
                    "project": "vtde",
                    "type": "version_drift",
                    "message": "dependency mismatch",
                    "action": "dry_run"
                }]
            }]
        });

        let content = serde_json::to_string(&report).expect("report json should serialize");
        let parsed = parse_healing_log_content(&content, "report_20260220_064255.json");
        assert!(parsed.is_some());
        let cycle = parsed.expect("report cycle should parse");
        assert!(cycle.dry_run);
        assert_eq!(cycle.fixable_issues, 3);
        assert_eq!(cycle.fixes_attempted, 1);
        assert_eq!(cycle.results.len(), 1);
        assert_eq!(cycle.results[0].error_type, "version_drift");
        assert_eq!(cycle.results[0].project, "vtde");
    }

    #[test]
    fn allows_dev_root() {
        let result = ensure_allowed_path("C:\\dev");
        assert!(result.is_ok());
    }

    #[test]
    fn rejects_path_outside_allowlist() {
        let result = ensure_allowed_path("C:\\Windows");
        assert!(result.is_err());
    }

    #[test]
    fn rejects_traversal_outside_allowlist() {
        let result = ensure_allowed_path("C:\\dev\\..\\Windows");
        assert!(result.is_err());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(orchestrator::AgentOrchestratorState::default())
        .manage(pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            get_system_stats,
            get_apps,
            launch_app,
            stop_app,
            get_healing_logs,
            get_healing_summary,
            get_self_healing_run_status,
            start_self_healing_run,
            auth::start_oauth,
            auth::get_auth_status,
            auth::logout,
            gemini::chat_gemini,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::close_pty,
            orchestrator::start_agent,
            orchestrator::stop_agent,
            orchestrator::get_agent_status,
            database_explorer::list_databases,
            database_explorer::get_tables,
            database_explorer::get_table_schema,
            database_explorer::execute_query,
            affected::get_affected_graph,
            affected::run_affected_build,
            read_directory,
            read_file_content,
            execute_monorepo_action,
            start_memory_mcp,
            check_app_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
