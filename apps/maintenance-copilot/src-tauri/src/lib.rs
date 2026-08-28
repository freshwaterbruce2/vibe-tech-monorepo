use std::sync::Mutex;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Holds the spawned Express gateway child so it can be killed on exit
/// (prevents a zombie process lingering on port 8675).
struct GatewayState(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(GatewayState(Mutex::new(None)))
        .setup(|app| {
            spawn_gateway(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Kill the gateway when the app exits so it doesn't linger on :8675.
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(child) = app_handle.state::<GatewayState>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}

/// Spawn the bundled `gateway` sidecar and stream its output. Logs and continues
/// if the binary is missing (run `pnpm build:gateway`) so the window still opens.
fn spawn_gateway(app: &tauri::AppHandle) {
    let command = match app.shell().sidecar("gateway") {
        Ok(cmd) => cmd,
        Err(e) => {
            eprintln!("[gateway] sidecar not configured ({e}); run `pnpm build:gateway`");
            return;
        }
    };
    let (mut rx, child) = match command.spawn() {
        Ok(pair) => pair,
        Err(e) => {
            eprintln!("[gateway] failed to spawn ({e}); build it with `pnpm build:gateway`");
            return;
        }
    };
    app.state::<GatewayState>().0.lock().unwrap().replace(child);

    // Drain the event stream so the child never blocks on a full stdout buffer.
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => print!("[gateway] {}", String::from_utf8_lossy(&bytes)),
                CommandEvent::Stderr(bytes) => eprint!("[gateway] {}", String::from_utf8_lossy(&bytes)),
                _ => {}
            }
        }
    });
}
