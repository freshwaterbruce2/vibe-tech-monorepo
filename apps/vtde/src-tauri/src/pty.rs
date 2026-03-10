use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[derive(serde::Serialize, Clone)]
struct PtyOutputEvent {
    pty_id: u32,
    data: String,
}

#[derive(serde::Serialize, Clone)]
struct PtyExitEvent {
    pty_id: u32,
    reason: String,
}

struct PtySession {
    pty_master: Box<dyn MasterPty + Send>,
    pty_writer: Box<dyn Write + Send>,
    pty_child: Box<dyn Child + Send + Sync>,
}

pub struct PtyState {
    sessions: Arc<Mutex<HashMap<u32, PtySession>>>,
    next_id: AtomicU32,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU32::new(1),
        }
    }
}

fn close_pty_internal(pty_id: u32, state: &PtyState) {
    if let Some(mut session) = state.sessions.lock().unwrap().remove(&pty_id) {
        let _ = session.pty_child.kill();
        let _ = session.pty_child.wait();
        // Dropping writer/master closes PTY handles and unblocks the reader loop.
        drop(session);
    }
}

fn build_shell_cmd(program: &str) -> CommandBuilder {
    let mut cmd = CommandBuilder::new(program);

    // Helps CLI tools decide to emit colors.
    cmd.env("TERM", "xterm-256color");

    if cfg!(target_os = "windows") {
        cmd.arg("-NoLogo");
    }

    cmd
}

#[tauri::command]
pub fn spawn_pty(app: AppHandle, state: State<'_, PtyState>) -> Result<u32, String> {
    let pty_id = state.next_id.fetch_add(1, Ordering::Relaxed);

    let pty_system = native_pty_system();

    let pair = pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("Failed to open PTY: {}", e))?;

    let child = if cfg!(target_os = "windows") {
        // Prefer PowerShell 7, but fall back to the legacy Windows PowerShell if unavailable.
        match pair.slave.spawn_command(build_shell_cmd("pwsh.exe")) {
            Ok(child) => child,
            Err(first_err) => pair
                .slave
                .spawn_command(build_shell_cmd("powershell.exe"))
                .map_err(|second_err| {
                    format!(
                        "Failed to spawn shell: pwsh.exe ({}) and powershell.exe ({})",
                        first_err, second_err
                    )
                })?,
        }
    } else {
        pair.slave
            .spawn_command(build_shell_cmd("bash"))
            .map_err(|e| format!("Failed to spawn command: {}", e))?
    };

    let writer = pair.master.take_writer().map_err(|e| format!("Failed to take writer: {}", e))?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to clone reader: {}", e))?;

    state.sessions.lock().unwrap().insert(
        pty_id,
        PtySession {
            pty_master: pair.master,
            pty_writer: writer,
            pty_child: child,
        },
    );

    let sessions = state.sessions.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; 8192]; // Larger buffer for burst output
        let exit_reason = loop {
            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let data = buf[..n].to_vec();
                    let text = String::from_utf8_lossy(&data).to_string();
                    let _ = app.emit(
                        "pty-output",
                        PtyOutputEvent {
                            pty_id,
                            data: text,
                        },
                    );
                }
                Ok(_) => break "stream closed".to_string(),
                Err(error) => break format!("stream error: {}", error),
            }
        };

        // Clean up on EOF/error in case the frontend never explicitly closes.
        let _ = sessions.lock().unwrap().remove(&pty_id);
        let _ = app.emit(
            "pty-exit",
            PtyExitEvent {
                pty_id,
                reason: exit_reason,
            },
        );
    });

    Ok(pty_id)
}

#[tauri::command]
pub fn close_pty(pty_id: u32, state: State<'_, PtyState>) -> Result<(), String> {
    close_pty_internal(pty_id, &state);
    Ok(())
}

#[tauri::command]
pub fn write_pty(pty_id: u32, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(session) = state.sessions.lock().unwrap().get_mut(&pty_id) {
        session
            .pty_writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write: {}", e))?;
        let _ = session.pty_writer.flush();
    }
    Ok(())
}

#[tauri::command]
pub fn resize_pty(pty_id: u32, rows: u16, cols: u16, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(session) = state.sessions.lock().unwrap().get_mut(&pty_id) {
        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        session
            .pty_master
            .resize(size)
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
    }
    Ok(())
}
