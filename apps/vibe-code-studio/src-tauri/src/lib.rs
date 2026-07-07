//! Vibe Code Studio — Tauri Backend
//!
//! Phase 1: Minimal window launch with Tauri 2.
//! The React frontend (Vite) is loaded as the webview content.
//! IPC commands will be added progressively in Phase 2+.

mod commands;
mod db;
mod pty;
mod screenshot;

use commands::greet;

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use window_vibrancy::{apply_blur, apply_mica};

/// Holds the spawned Node backend sidecar so it can be killed on app exit.
/// Only constructed in release builds (dev uses run-tauri.cjs), hence `allow(dead_code)`.
#[allow(dead_code)]
struct BackendSidecar(Mutex<Option<CommandChild>>);

/// Spawn the bundled Node backend (AI proxy + auth + billing) on port 5004.
///
/// Only used by installed/release builds — in dev, `scripts/run-tauri.cjs` starts
/// the backend directly, so spawning here too would fight over port 5004.
///
/// The backend is shipped as:
/// - `binaries/vcs-backend-<triple>.exe` (an ABI-matched `node.exe`, Tauri externalBin)
/// - `resources/sidecar/backend-bundle.mjs` + adjacent `node_modules` (native better-sqlite3)
///
/// Keys (`KIMI_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY`) are inherited from the
/// user environment. `VCS_DATABASE_PATH` pins the canonical DB; `WORKSPACE_ROOT` is left
/// unset so the @vibetech/db-app path-segregation guard stays satisfied.
#[cfg(not(debug_assertions))]
fn vcs_diag(msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("D:\\nx-workspace-data\\ship-logs\\vcs-121\\rust-sidecar.log")
    {
        let _ = writeln!(f, "{msg}");
    }
}

#[cfg(not(debug_assertions))]
fn spawn_backend_sidecar(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_shell::process::CommandEvent;
    use tauri_plugin_shell::ShellExt;

    vcs_diag("spawn_backend_sidecar: enter");
    let resource_dir = app.path().resource_dir()?;
    let script = resource_dir.join("sidecar").join("backend-bundle.mjs");
    // resource_dir comes back as a verbatim path (\\?\C:\...). Node's module
    // resolver cannot handle the \\?\ prefix (EISDIR: lstat 'C:') and the
    // sidecar dies before executing a single line. Strip it.
    let script_arg = {
        let s = script.to_string_lossy().to_string();
        s.strip_prefix(r"\\?\").map(str::to_string).unwrap_or(s)
    };
    vcs_diag(&format!(
        "resource_dir={} script_exists={} arg={script_arg}",
        resource_dir.display(),
        script.exists()
    ));

    let sidecar = app
        .shell()
        .sidecar("vcs-backend")?
        .args([script_arg])
        .env("VCS_DATABASE_PATH", "D:\\databases\\vibe_studio.db")
        .env("NODE_ENV", "production");
    vcs_diag("sidecar command built");

    let (mut rx, child) = sidecar.spawn()?;
    vcs_diag(&format!("spawned pid={}", child.pid()));

    // Drain the sidecar's output so its stdout/stderr pipes never fill and block it.
    // Log the first events so startup failures are visible in the diag log.
    tauri::async_runtime::spawn(async move {
        let mut logged = 0u32;
        while let Some(ev) = rx.recv().await {
            if logged < 60 {
                logged += 1;
                match &ev {
                    CommandEvent::Stdout(b) => {
                        vcs_diag(&format!("sidecar stdout: {}", String::from_utf8_lossy(b)))
                    }
                    CommandEvent::Stderr(b) => {
                        vcs_diag(&format!("sidecar stderr: {}", String::from_utf8_lossy(b)))
                    }
                    CommandEvent::Terminated(t) => {
                        vcs_diag(&format!("sidecar TERMINATED: {t:?}"))
                    }
                    other => vcs_diag(&format!("sidecar event: {other:?}")),
                }
            }
        }
        vcs_diag("sidecar event channel closed");
    });

    app.manage(BackendSidecar(Mutex::new(Some(child))));
    Ok(())
}

/// Configure and run the Tauri application.
///
/// Plugins registered:
/// - `tauri-plugin-shell`: External URL opening, command execution, backend sidecar
/// - `tauri-plugin-dialog`: Native file/folder dialogs
/// - `tauri-plugin-fs`: File system access (scoped)
/// - `tauri-plugin-store`: Persistent key-value storage
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(pty::PtyState::default())
        .manage(db::DbState {
            conn: std::sync::Mutex::new(None),
        })
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                // Try applying Mica, fallback to Blur if unsupported
                let _ = apply_mica(&window, None)
                    .or_else(|_| apply_blur(&window, Some((18, 18, 18, 125))));
            }

            // Start the bundled backend in installed/release builds. Non-fatal: if it
            // fails, the window still opens (landing page) rather than the app bricking.
            #[cfg(not(debug_assertions))]
            {
                vcs_diag("setup: about to spawn sidecar");
                if let Err(e) = spawn_backend_sidecar(app) {
                    vcs_diag(&format!("SPAWN FAILED: {e}"));
                    eprintln!("[vcs] failed to start backend sidecar: {e}");
                }
                vcs_diag("setup: after spawn call");
            }

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        // NOTE: tauri-plugin-updater is intentionally not registered.
        // It will be re-enabled once release-artifact signing is configured
        // (generate keys via `tauri signer generate`, populate
        // plugins.updater.pubkey in tauri.conf.json, and wire signing into CI).
        // Until then, keeping the plugin off ensures no unsigned update can
        // be fetched or installed by `AutoUpdateService` at runtime.
        .invoke_handler(tauri::generate_handler![
            greet,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_dispose,
            db::db_get_patterns,
            db::db_save_pattern,
            db::db_execute_query,
            screenshot::render_html_screenshot
        ])
        .build(tauri::generate_context!())
        .expect("error while building Vibe Code Studio");

    // Kill the backend sidecar when the app exits so port 5004 is released.
    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<BackendSidecar>() {
                if let Some(child) = state.0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        }
    });
}
